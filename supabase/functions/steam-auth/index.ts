import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STEAM_API_KEY = Deno.env.get("STEAM_API_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const redirectUrl = url.searchParams.get("redirect_url") || url.origin;

  // ── Step 1: Redirect user to Steam login ──────────────────
  if (action === "login") {
    const callbackUrl = `${SUPABASE_URL}/functions/v1/steam-auth?action=callback&redirect_url=${encodeURIComponent(redirectUrl)}`;
    const steamUrl = new URL("https://steamcommunity.com/openid/login");
    steamUrl.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
    steamUrl.searchParams.set("openid.mode", "checkid_setup");
    steamUrl.searchParams.set("openid.return_to", callbackUrl);
    steamUrl.searchParams.set("openid.realm", SUPABASE_URL);
    steamUrl.searchParams.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select");
    steamUrl.searchParams.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select");

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: steamUrl.toString() },
    });
  }

  // ── Step 2: Handle callback from Steam ────────────────────
  if (action === "callback") {
    try {
      // Verify the OpenID response with Steam
      const verifyParams = new URLSearchParams();
      for (const [key, value] of url.searchParams.entries()) {
        if (key.startsWith("openid.")) {
          verifyParams.set(key, value);
        }
      }
      verifyParams.set("openid.mode", "check_authentication");

      const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyParams.toString(),
      });
      const verifyText = await verifyRes.text();

      if (!verifyText.includes("is_valid:true")) {
        return new Response("Steam authentication failed", {
          status: 401,
          headers: corsHeaders,
        });
      }

      // Extract Steam ID from claimed_id
      const claimedId = url.searchParams.get("openid.claimed_id") || "";
      const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
      if (!steamIdMatch) {
        return new Response("Could not extract Steam ID", {
          status: 400,
          headers: corsHeaders,
        });
      }
      const steamId = steamIdMatch[1];

      // Fetch Steam display name
      let displayName = `Steam User ${steamId}`;
      try {
        const profileRes = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
        );
        const profileData = await profileRes.json();
        const player = profileData?.response?.players?.[0];
        if (player?.personaname) {
          displayName = player.personaname;
        }
      } catch { /* use default */ }

      // Find or create user by steam email convention
      const steamEmail = `steam_${steamId}@steam.isaaccompanion.app`;

      // Check if user exists with this steam_id in profiles
      const { data: existingProfile } = await supabaseAdmin
        .from("ic_profiles")
        .select("id")
        .eq("steam_id", steamId)
        .single();

      let userId: string;

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: steamEmail,
          email_confirm: true,
          user_metadata: {
            steam_id: steamId,
            display_name: displayName,
            provider: "steam",
          },
        });
        if (createError) throw createError;
        userId = newUser.user.id;

        // Profile is auto-created by the trigger, but update display name
        await supabaseAdmin
          .from("ic_profiles")
          .update({ display_name: displayName, steam_id: steamId })
          .eq("id", userId);
      }

      // Generate a magic link for the user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: steamEmail,
      });
      if (linkError) throw linkError;

      // Extract the token from the link
      const linkUrl = new URL(linkData.properties.action_link);
      const token = linkUrl.searchParams.get("token") || linkUrl.hash;

      // Redirect back to the app with the verification link
      const appRedirect = new URL(redirectUrl);
      // Pass through the full Supabase verification URL so the client can complete login
      const verificationUrl = linkData.properties.action_link;

      return new Response(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${verificationUrl}"></head><body>Redirecting...</body></html>`,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        }
      );
    } catch (err) {
      console.error("Steam auth error:", err);
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Unknown action", {
    status: 400,
    headers: corsHeaders,
  });
});
