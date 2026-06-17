import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FOOTBALL_DATA_API_KEY = "00f91a01ba774a019ac9f61633838fa2";
const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. Fetch competitions (World Cup 2026 - let's first check available)
    const competitionsResponse = await fetch(`${FOOTBALL_DATA_BASE_URL}/competitions`, {
      headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY }
    });
    
    if (!competitionsResponse.ok) {
      throw new Error(`Failed to fetch competitions: ${competitionsResponse.statusText}`);
    }
    
    const competitionsData = await competitionsResponse.json();
    console.log("Competitions loaded:", competitionsData);
    
    // 2. For now, let's fetch matches and player stats for a competition
    // In the future, you can filter for World Cup 2026 specifically
    const premierLeagueResponse = await fetch(`${FOOTBALL_DATA_BASE_URL}/competitions/PL/matches`, {
      headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY }
    });
    
    if (!premierLeagueResponse.ok) {
      throw new Error(`Failed to fetch matches: ${premierLeagueResponse.statusText}`);
    }
    
    const matchesData = await premierLeagueResponse.json();
    console.log("Matches loaded:", matchesData);

    // 3. Store raw data in our database
    const { error: insertError } = await supabaseClient
      .from("football_api_cache")
      .upsert({
        id: crypto.randomUUID(),
        competition: "PL", // Change this to World Cup 2026 code when available
        raw_data: matchesData,
        fetched_at: new Date().toISOString(),
      })
      .select();

    if (insertError) {
      throw insertError;
    }

    // 4. Update our fantasy players with real stats
    // For now, log the data - we'll enhance this as we get more
    return new Response(
      JSON.stringify({ 
        success: true, 
        competitions_count: competitionsData.count,
        matches_count: matchesData.matches?.length || 0,
        data: matchesData 
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in fetch-football-data:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
