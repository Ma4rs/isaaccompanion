import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STEAM_API_KEY = Deno.env.get("STEAM_API_KEY")!;
const ISAAC_APP_ID = "250900"; // The Binding of Isaac: Rebirth (includes Repentance DLC)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Steam ID from profile
    const { data: profile } = await supabaseAdmin
      .from("ic_profiles")
      .select("steam_id")
      .eq("id", user.id)
      .single();

    const steamId = profile?.steam_id || user.user_metadata?.steam_id;
    if (!steamId) {
      return new Response(
        JSON.stringify({
          error: "No Steam account linked. Sign in with Steam first.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch achievements from Steam API
    const steamRes = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=${ISAAC_APP_ID}&key=${STEAM_API_KEY}&steamid=${steamId}`
    );
    const steamData = await steamRes.json();

    if (!steamData?.playerstats?.success) {
      const errMsg =
        steamData?.playerstats?.error ||
        "Could not fetch Steam achievements. Make sure your Steam profile is public.";
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const achievements = steamData.playerstats.achievements || [];
    const unlocked = achievements.filter(
      (a: { achieved: number }) => a.achieved === 1
    );

    // Load the achievement mapping table
    const { data: mappings } = await supabaseAdmin
      .from("ic_steam_achievement_map")
      .select("*");

    if (!mappings || mappings.length === 0) {
      return new Response(
        JSON.stringify({
          synced: 0,
          total: unlocked.length,
          message:
            "No achievement mappings configured. Add entries to steam_achievement_map table.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build lookup
    const mapByName: Record<
      string,
      { target_type: string; target_id: string; target_value: string | null }
    > = {};
    for (const m of mappings) {
      mapByName[m.steam_achievement_name] = {
        target_type: m.target_type,
        target_id: m.target_id,
        target_value: m.target_value,
      };
    }

    let synced = 0;

    for (const ach of unlocked) {
      const mapping = mapByName[ach.apiname];
      if (!mapping) continue;

      if (mapping.target_type === "challenge") {
        await supabaseAdmin.from("ic_user_challenge_progress").upsert(
          {
            user_id: user.id,
            challenge_id: mapping.target_id,
            completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,challenge_id" }
        );
        synced++;
      } else if (mapping.target_type === "mark") {
        // target_id = character_id, target_value = boss name
        const { data: existing } = await supabaseAdmin
          .from("ic_user_completion_marks")
          .select("completed_bosses")
          .eq("user_id", user.id)
          .eq("character_id", mapping.target_id)
          .single();

        const bosses: string[] = existing?.completed_bosses || [];
        if (mapping.target_value && !bosses.includes(mapping.target_value)) {
          bosses.push(mapping.target_value);
          await supabaseAdmin.from("ic_user_completion_marks").upsert(
            {
              user_id: user.id,
              character_id: mapping.target_id,
              completed_bosses: bosses,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,character_id" }
          );
          synced++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        synced,
        total_unlocked: unlocked.length,
        total_achievements: achievements.length,
        message: `Synced ${synced} achievements from Steam.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Steam sync error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
