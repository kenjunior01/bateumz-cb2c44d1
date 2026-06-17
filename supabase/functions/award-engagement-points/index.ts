import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PointsRequest {
  regionId: string;
  reason: "raffle_participation" | "prediction_made" | "friend_invite" | "social_share" | "contest_entry" | "daily_login" | "achievement";
  relatedId?: string;
}

const POINTS_MAP: Record<string, number> = {
  raffle_participation: 10,
  prediction_made: 5,
  prediction_correct: 25,
  friend_invite: 50,
  social_share: 15,
  contest_entry: 20,
  daily_login: 2,
  achievement: 100,
};

// Verify JWT and get user ID
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // Authenticate user
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { regionId, reason, relatedId }: PointsRequest = await req.json();

    if (!regionId || !reason) {
      return new Response("Missing required fields", { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pointsToAdd = POINTS_MAP[reason];
    if (!pointsToAdd) {
      return new Response("Invalid reason", { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current engagement points
    const { data: currentData, error: currentError } = await supabase
      .from("engagement_points")
      .select("points, total_lifetime_points")
      .eq("user_id", userId)
      .eq("region_id", regionId)
      .single();

    if (currentError && currentError.code !== "PGRST116") {
      throw currentError;
    }

    const currentPoints = currentData?.points || 0;
    const totalLifetimePoints = currentData?.total_lifetime_points || 0;

    // Upsert engagement points
    const { error: upsertError } = await supabase
      .from("engagement_points")
      .upsert(
        {
          user_id: userId,
          region_id: regionId,
          points: currentPoints + pointsToAdd,
          total_lifetime_points: totalLifetimePoints + pointsToAdd,
        },
        { onConflict: "user_id,region_id" }
      );

    if (upsertError) throw upsertError;

    // Log the points change
    const { error: logError } = await supabase
      .from("points_log")
      .insert({
        user_id: userId,
        region_id: regionId,
        reason: reason,
        points: pointsToAdd,
        related_id: relatedId,
        created_at: new Date().toISOString(),
      });

    if (logError) throw logError;

    return new Response(JSON.stringify({ success: true, pointsAwarded: pointsToAdd }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
