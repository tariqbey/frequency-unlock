import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper logging function for debugging
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-DONATION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify Stripe secret key is configured
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    logStep("Stripe key verified");

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("Auth error", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { amount_cents, release_id } = await req.json();
    logStep("Request body parsed", { amount_cents, release_id });

    if (!amount_cents || amount_cents < 100) {
      throw new Error("Amount must be at least $1 (100 cents)");
    }

    if (!release_id) {
      throw new Error("Release ID is required");
    }

    // Verify release exists
    const { data: release, error: releaseError } = await supabaseClient
      .from("releases")
      .select("id, title")
      .eq("id", release_id)
      .single();

    if (releaseError || !release) {
      logStep("Release not found", { releaseError });
      throw new Error("Release not found");
    }
    logStep("Release verified", { releaseId: release.id, title: release.title });

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      logStep("No existing Stripe customer, will create on checkout");
    }

    // Create donation record in pending state
    const { data: donation, error: donationError } = await supabaseClient
      .from("donations")
      .insert({
        user_id: user.id,
        release_id: release_id,
        amount_cents: amount_cents,
        currency: "usd",
        status: "pending",
      })
      .select()
      .single();

    if (donationError) {
      logStep("Error creating donation record", { error: donationError });
      throw new Error("Failed to create donation record");
    }
    logStep("Donation record created", { donationId: donation.id });

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create Stripe checkout session with custom price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Donation for "${release.title}"`,
              description: "Unlock high-quality downloads and support the artist",
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/release/${release_id}?donation=success`,
      cancel_url: `${origin}/release/${release_id}?donation=cancelled`,
      metadata: {
        donation_id: donation.id,
        release_id: release_id,
        user_id: user.id,
      },
    });
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update donation with stripe session ID
    await supabaseClient
      .from("donations")
      .update({ stripe_session_id: session.id })
      .eq("id", donation.id);

    logStep("Donation updated with session ID");

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
