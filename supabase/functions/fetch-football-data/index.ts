import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RAPIDAPI_HOST = Deno.env.get("RAPIDAPI_FOOTBALL_HOST") || "free-api-live-football-data.p.rapidapi.com";
const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY") || "";
const BASE_URL = `https://${RAPIDAPI_HOST}`;
const WORLD_CUP_LEAGUE_ID = Deno.env.get("WORLD_CUP_LEAGUE_ID") || "16";

async function fetchRapid(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
  });
  if (!res.ok) throw new Error(`RapidAPI ${path}: ${res.status}`);
  return res.json();
}

Deno.serve(async (_req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (!RAPIDAPI_KEY) {
      throw new Error("RAPIDAPI_KEY secret not configured");
    }

    const [liveData, leagueData] = await Promise.all([
      fetchRapid("/football-get-live-score").catch(() => null),
      fetchRapid("/football-get-league-matches", {
        leagueid: WORLD_CUP_LEAGUE_ID,
        season: Deno.env.get("FOOTBALL_SEASON") || "2022",
      }).catch(() => null),
    ]);

    const cachePayload = {
      live: liveData,
      world_cup_fixtures: leagueData,
      league_id: WORLD_CUP_LEAGUE_ID,
      fetched_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabaseClient.from("football_api_cache").upsert({
      id: crypto.randomUUID(),
      competition: `WC-${WORLD_CUP_LEAGUE_ID}`,
      raw_data: cachePayload,
      fetched_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        has_live: Boolean(liveData),
        has_fixtures: Boolean(leagueData),
        league_id: WORLD_CUP_LEAGUE_ID,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error in fetch-football-data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    );
  }
});
