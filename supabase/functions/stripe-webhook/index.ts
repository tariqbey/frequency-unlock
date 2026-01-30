import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper logging function for debugging
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeSecretKey) {
      logStep("ERROR: Missing STRIPE_SECRET_KEY");
      return new Response("Server configuration error", { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is set
    if (stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logStep("Webhook signature verification failed", { error: message });
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } else {
      // For testing without webhook secret (not recommended for production)
      logStep("WARNING: No webhook secret configured, parsing event without verification");
      event = JSON.parse(body);
    }

    logStep("Processing event", { type: event.type, id: event.id });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const donationId = session.metadata?.donation_id;
      const releaseId = session.metadata?.release_id;
      const userId = session.metadata?.user_id;

      logStep("Checkout session completed", { 
        donationId, 
        releaseId, 
        userId,
        amountTotal: session.amount_total,
        currency: session.currency 
      });

      if (!donationId) {
        logStep("ERROR: No donation_id in session metadata");
        return new Response("Missing donation_id", { status: 400 });
      }

      // Update donation status to paid
      const { error: updateError } = await supabaseClient
        .from("donations")
        .update({ 
          status: "paid",
          stripe_session_id: session.id,
        })
        .eq("id", donationId);

      if (updateError) {
        logStep("Error updating donation", { error: updateError });
        throw updateError;
      }
      logStep("Donation marked as paid", { donationId });

      // Generate download token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      const { error: tokenError } = await supabaseClient
        .from("download_tokens")
        .insert({
          donation_id: donationId,
          token: token,
          expires_at: expiresAt.toISOString(),
          max_downloads: 10,
          downloads_used: 0,
        });

      if (tokenError) {
        logStep("Error creating download token", { error: tokenError });
        throw tokenError;
      }
      logStep("Download token created", { token, expiresAt: expiresAt.toISOString() });

      // Log donation event
      await supabaseClient
        .from("events")
        .insert({
          user_id: userId || null,
          event_type: "donation_paid",
          release_id: releaseId || null,
          metadata: {
            amount_cents: session.amount_total,
            currency: session.currency,
            donation_id: donationId,
          },
        });
      logStep("Donation event logged");

      logStep("Webhook processing complete", { donationId });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR in webhook", { message });
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
