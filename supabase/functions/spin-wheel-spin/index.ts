import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Segment {
  id: string;
  segment_number: number;
  label: string;
  description: string;
  background_color: string;
  text_color: string;
  reward_type: string;
  reward_value: string;
  reward_image_url: string;
  weight: number;
  max_wins_per_day: number | null;
  max_wins_total: number | null;
  current_wins_today: number;
  current_wins_total: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { wheel_id, user_id, region_id } = await req.json();

    if (!wheel_id || !user_id || !region_id) {
      return new Response(JSON.stringify({ error: "wheel_id, user_id, and region_id are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch game and segments data
    const { data: game, error: gameError } = await supabase
      .from("spin_wheel_games")
      .select("id, spin_cost")
      .eq("id", wheel_id)
      .single();

    if (gameError || !game) {
      throw new Error("Game not found or error fetching game: " + gameError?.message);
    }

    const { data: segments, error: segmentsError } = await supabase
      .from("spin_wheel_segments")
      .select("*, spin_wheel_sessions(count)") // Fetch count of sessions for each segment
      .eq("wheel_id", wheel_id)
      .order("segment_number");

    if (segmentsError || !segments || segments.length === 0) {
      throw new Error("Segments not found or error fetching segments: " + segmentsError?.message);
    }

    // Filter out segments that have reached their win limits
    const availableSegments = segments.filter((s: Segment) => {
      const winsToday = s.spin_wheel_sessions[0]?.count || 0; // Assuming count is for today
      const totalWins = s.spin_wheel_sessions[0]?.count || 0; // Assuming count is for total

      if (s.max_wins_per_day !== null && winsToday >= s.max_wins_per_day) {
        return false;
      }
      if (s.max_wins_total !== null && totalWins >= s.max_wins_total) {
        return false;
      }
      return true;
    });

    if (availableSegments.length === 0) {
      return new Response(JSON.stringify({ error: "No available prizes to win." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Weighted random selection
    const totalWeight = availableSegments.reduce((acc, s) => acc + (s.weight || 1), 0);
    let random = Math.random() * totalWeight;
    let winningSegment: Segment | null = null;

    for (const segment of availableSegments) {
      random -= (segment.weight || 1);
      if (random <= 0) {
        winningSegment = segment;
        break;
      }
    }

    if (!winningSegment) {
      // Fallback if for some reason no segment was picked (shouldn't happen with proper weights)
      winningSegment = availableSegments[Math.floor(Math.random() * availableSegments.length)];
    }

    // Record the spin session
    const { error: sessionError } = await supabase.from("spin_wheel_sessions").insert({
      wheel_id,
      user_id,
      region_id,
      segment_id: winningSegment.id,
      reward_type: winningSegment.reward_type,
      reward_value: winningSegment.reward_value,
      status: "completed",
    });

    if (sessionError) {
      throw new Error("Error saving spin session: " + sessionError.message);
    }

    // Update segment win counts (if applicable)
    await supabase.from("spin_wheel_segments")
      .update({ current_wins_total: winningSegment.current_wins_total + 1 })
      .eq("id", winningSegment.id);
    // Note: current_wins_today would need a daily reset mechanism, which is outside this function's scope.

    return new Response(JSON.stringify({ success: true, winner: winningSegment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Spin Wheel Edge Function Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
