import { supabase } from "@/integrations/supabase/client";

export type EngagementReason =
  | "raffle_participation"
  | "prediction_made"
  | "friend_invite"
  | "social_share"
  | "contest_entry"
  | "daily_login"
  | "achievement";

export async function awardEngagementPoints(
  regionId: string,
  reason: EngagementReason,
  relatedId?: string,
): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("award-engagement-points", {
      body: { regionId, reason, relatedId },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, pointsAwarded: data?.pointsAwarded };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
