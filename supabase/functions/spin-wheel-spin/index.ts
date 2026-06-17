import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { wheel_id, region_id } = await req.json();

    if (!wheel_id || !region_id) {
      return new Response(JSON.stringify({ error: "wheel_id and region_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      .select("*")
      .eq("wheel_id", wheel_id)
      .order("segment_number");

    if (segmentsError || !segments || segments.length === 0) {
      throw new Error("Segments not found or error fetching segments: " + segmentsError?.message);
    }

    const availableSegments = segments.filter((s) => {
      if (s.max_wins_per_day !== null && (s.current_wins_today || 0) >= s.max_wins_per_day) return false;
      if (s.max_wins_total !== null && (s.current_wins_total || 0) >= s.max_wins_total) return false;
      return true;
    });

    if (availableSegments.length === 0) {
      return new Response(JSON.stringify({ error: "No available prizes to win." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalWeight = availableSegments.reduce((acc, s) => acc + (s.weight || 1), 0);
    let random = Math.random() * totalWeight;
    let winningSegment = availableSegments[0];

    for (const segment of availableSegments) {
      random -= segment.weight || 1;
      if (random <= 0) {
        winningSegment = segment;
        break;
      }
    }

    const { error: sessionError } = await supabase.from("spin_wheel_sessions").insert({
      wheel_id,
      user_id: userId,
      region_id,
      segment_id: winningSegment.id,
      reward_type: winningSegment.reward_type,
      reward_value: winningSegment.reward_value,
      status: "completed",
    });

    if (sessionError) {
      throw new Error("Error saving spin session: " + sessionError.message);
    }

    await supabase
      .from("spin_wheel_segments")
      .update({ current_wins_total: (winningSegment.current_wins_total || 0) + 1 })
      .eq("id", winningSegment.id);

    return new Response(JSON.stringify({
      success: true,
      winner: {
        ...winningSegment,
        segment_number: winningSegment.segment_number,
      },
      data: {
        winner: {
          ...winningSegment,
          segment_number: winningSegment.segment_number,
        },
      },
    }), {
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
