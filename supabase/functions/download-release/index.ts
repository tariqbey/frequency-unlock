import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DOWNLOAD-RELEASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { download_token, track_id } = await req.json();
    if (!download_token) throw new Error("Download token is required");
    if (!track_id) throw new Error("Track ID is required");
    logStep("Request parsed", { download_token, track_id });

    // Verify download token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("download_tokens")
      .select(`
        *,
        donations!inner (
          user_id,
          release_id,
          status
        )
      `)
      .eq("token", download_token)
      .single();

    if (tokenError || !tokenData) {
      throw new Error("Invalid download token");
    }
    logStep("Token found", { tokenId: tokenData.id });

    // Verify token belongs to user
    if (tokenData.donations.user_id !== user.id) {
      throw new Error("This download token does not belong to you");
    }

    // Verify donation is paid
    if (tokenData.donations.status !== "paid") {
      throw new Error("Donation is not completed");
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      throw new Error("Download token has expired");
    }

    // Check download limit
    if (tokenData.downloads_used >= tokenData.max_downloads) {
      throw new Error("Download limit reached");
    }
    logStep("Token validated");

    // Verify track belongs to the release
    const { data: trackData, error: trackError } = await supabaseClient
      .from("tracks")
      .select("id, title, audio_path, release_id")
      .eq("id", track_id)
      .eq("release_id", tokenData.donations.release_id)
      .single();

    if (trackError || !trackData) {
      throw new Error("Track not found or does not belong to this release");
    }
    logStep("Track verified", { trackId: trackData.id, title: trackData.title });

    // Generate signed URL for the audio file
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient
      .storage
      .from("audio")
      .createSignedUrl(trackData.audio_path, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      throw new Error(`Failed to generate download URL: ${signedUrlError?.message}`);
    }
    logStep("Signed URL generated");

    // Increment download count
    const { error: updateError } = await supabaseClient
      .from("download_tokens")
      .update({ downloads_used: tokenData.downloads_used + 1 })
      .eq("id", tokenData.id);

    if (updateError) {
      console.error("Failed to update download count:", updateError);
      // Don't fail the request, just log it
    }
    logStep("Download count updated", { new_count: tokenData.downloads_used + 1 });

    return new Response(
      JSON.stringify({
        url: signedUrlData.signedUrl,
        filename: `${trackData.title}.mp3`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
