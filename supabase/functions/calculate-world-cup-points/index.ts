import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface MatchResult {
  id: string;
  team_a_goals: number;
  team_b_goals: number;
  status: string;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { matchId, teamAGoals, teamBGoals } = await req.json();

    if (!matchId || teamAGoals === undefined || teamBGoals === undefined) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Get all predictions for this match
    const { data: predictions, error: predictionsError } = await supabase
      .from("world_cup_predictions")
      .select("id, user_id, region_id, predicted_team_a_goals, predicted_team_b_goals")
      .eq("match_id", matchId);

    if (predictionsError) throw predictionsError;

    // Calculate points for each prediction
    const updates = predictions.map((pred) => {
      let points = 0;

      // Exact score match
      if (
        pred.predicted_team_a_goals === teamAGoals &&
        pred.predicted_team_b_goals === teamBGoals
      ) {
        points = 25;
      }
      // Correct winner
      else if (
        (teamAGoals > teamBGoals && pred.predicted_team_a_goals > pred.predicted_team_b_goals) ||
        (teamBGoals > teamAGoals && pred.predicted_team_b_goals > pred.predicted_team_a_goals) ||
        (teamAGoals === teamBGoals && pred.predicted_team_a_goals === pred.predicted_team_b_goals)
      ) {
        points = 10;
      }

      return {
        id: pred.id,
        user_id: pred.user_id,
        region_id: pred.region_id,
        points,
      };
    });

    // Update predictions with points
    for (const update of updates) {
      if (update.points > 0) {
        const { error: updateError } = await supabase
          .from("world_cup_predictions")
          .update({ points: update.points })
          .eq("id", update.id);

        if (updateError) throw updateError;

        // Add to engagement points
        const { data: engagementData, error: engagementError } = await supabase
          .from("engagement_points")
          .select("points")
          .eq("user_id", update.user_id)
          .eq("region_id", update.region_id)
          .single();

        if (engagementError && engagementError.code !== "PGRST116") {
          throw engagementError;
        }

        const currentPoints = engagementData?.points || 0;

        // Upsert engagement points
        const { error: upsertError } = await supabase
          .from("engagement_points")
          .upsert(
            {
              user_id: update.user_id,
              region_id: update.region_id,
              points: currentPoints + update.points,
              total_lifetime_points: (engagementData?.total_lifetime_points || 0) + update.points,
            },
            { onConflict: "user_id,region_id" }
          );

        if (upsertError) throw upsertError;

        // Log the points change
        const { error: logError } = await supabase
          .from("engagement_points_log")
          .insert({
            user_id: update.user_id,
            region_id: update.region_id,
            points_change: update.points,
            reason: "prediction_correct",
            related_id: matchId,
          });

        if (logError) throw logError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Points calculated for ${updates.length} predictions`,
        updates,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
