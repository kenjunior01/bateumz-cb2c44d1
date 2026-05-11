import { supabase } from "@/integrations/supabase/client";
import { getPublicBaseUrl } from "@/lib/publicUrl";

const VISITOR_KEY = "bateu_visitor_id";

/** Persistent random visitor ID (used together with IP+UA on the server). */
export const getVisitorId = (): string => {
  if (typeof window === "undefined") return "";
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
};

/** Generates a random short ref code (8 chars). */
export const newRefCode = (): string =>
  Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);

/** Build the public ambassador share URL on the paid domain. */
export const buildAmbassadorUrl = (businessId: string, refCode: string): string =>
  `${getPublicBaseUrl()}/e/${encodeURIComponent(businessId)}/${encodeURIComponent(refCode)}`;

/** Find or create the ambassador row for the current user + business. */
export const ensureAmbassador = async (
  businessUserId: string,
  userId: string,
  displayName?: string,
) => {
  const { data: existing } = await supabase
    .from("live_ambassadors")
    .select("*")
    .eq("business_user_id", businessUserId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("live_ambassadors")
    .insert({
      business_user_id: businessUserId,
      user_id: userId,
      ref_code: newRefCode(),
      display_name: displayName || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

/** Record a visit (called by the redirect page). Safe to call repeatedly. */
export const recordAmbassadorVisit = async (refCode: string, liveCode?: string) => {
  return await supabase.functions.invoke("track-ambassador-visit", {
    body: {
      refCode,
      liveCode: liveCode || "",
      visitorId: getVisitorId(),
      referrer: typeof document !== "undefined" ? document.referrer : "",
    },
  });
};

export type AmbassadorRanking = {
  ambassador_id: string;
  user_id: string;
  display_name: string | null;
  ref_code: string;
  visits: number;
};

/** Aggregated ranking, optionally filtered by live_code. */
export const fetchRanking = async (
  businessUserId: string,
  liveCode?: string,
): Promise<AmbassadorRanking[]> => {
  if (liveCode) {
    // Per-live: use public security-definer RPC (works for anon too).
    const { data } = await supabase.rpc("get_live_ambassador_ranking", { p_live_code: liveCode });
    return ((data || []) as any[])
      .filter((r) => !businessUserId || r.business_user_id === businessUserId)
      .map((r) => ({
        ambassador_id: r.ambassador_id, user_id: r.user_id, display_name: r.display_name,
        ref_code: r.ref_code, visits: Number(r.visits) || 0,
      }));
  }
  // All-time: use precomputed counter.
  const { data } = await supabase
    .from("live_ambassadors")
    .select("id, user_id, display_name, ref_code, total_visits")
    .eq("business_user_id", businessUserId)
    .order("total_visits", { ascending: false })
    .limit(50);
  return (data || []).map((a: any) => ({
    ambassador_id: a.id, user_id: a.user_id, display_name: a.display_name,
    ref_code: a.ref_code, visits: a.total_visits || 0,
  }));
};

/** Channels a user can share on. */
export type ShareChannel = "whatsapp" | "facebook" | "instagram" | "tiktok" | "x" | "telegram" | "copy";

export const buildShareLink = (channel: ShareChannel, url: string, message: string): string => {
  const u = encodeURIComponent(url);
  const m = encodeURIComponent(message);
  switch (channel) {
    case "whatsapp": return `https://wa.me/?text=${m}%20${u}`;
    case "facebook": return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "x": return `https://twitter.com/intent/tweet?text=${m}&url=${u}`;
    case "telegram": return `https://t.me/share/url?url=${u}&text=${m}`;
    // Instagram & TikTok don't support web share intents → fall back to copy.
    case "instagram":
    case "tiktok":
    case "copy":
    default: return url;
  }
};
