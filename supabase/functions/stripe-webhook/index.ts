import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!stripeSecretKey) {
    console.error("Missing STRIPE_SECRET_KEY");
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is set
    if (stripeWebhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
    }

    console.log("Received Stripe event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const donationId = session.metadata?.donation_id;
      const releaseId = session.metadata?.release_id;
      const userId = session.metadata?.user_id;

      if (!donationId) {
        console.error("No donation_id in session metadata");
        return new Response("Missing donation_id", { status: 400 });
      }

      console.log(`Processing donation: ${donationId} for release: ${releaseId}`);

      // Update donation status to paid
      const { error: updateError } = await supabaseClient
        .from("donations")
        .update({ 
          status: "paid",
          stripe_session_id: session.id,
        })
        .eq("id", donationId);

      if (updateError) {
        console.error("Error updating donation:", updateError);
        throw updateError;
      }

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
        console.error("Error creating download token:", tokenError);
        throw tokenError;
      }

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

      console.log(`Donation ${donationId} marked as paid, download token created`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", message);
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
