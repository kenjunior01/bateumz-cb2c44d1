import { supabase } from "@/integrations/supabase/client";
import { getPublicBaseUrl } from "@/lib/publicUrl";

export type ScheduledLive = {
  id: string;
  business_user_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  source_type: "internal" | "external";
  live_code: string | null;
  external_url: string | null;
  external_platform: string | null;
  scheduled_at: string;
  ends_at: string | null;
  status: "draft" | "scheduled" | "live" | "ended" | "cancelled";
  slug: string;
  template_id: string | null;
};

const SLUG_FALLBACK = (title: string) =>
  title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "live";

export const buildScheduledLiveUrl = (slug: string): string =>
  `${getPublicBaseUrl()}/live-evento/${encodeURIComponent(slug)}`;

export const buildScheduledAmbassadorUrl = (
  businessId: string, refCode: string, scheduledLiveId: string,
): string =>
  `${getPublicBaseUrl()}/e/${encodeURIComponent(businessId)}/${encodeURIComponent(refCode)}?sl=${encodeURIComponent(scheduledLiveId)}`;

export const createScheduledLive = async (input: {
  business_user_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  source_type: "internal" | "external";
  live_code?: string;
  external_url?: string;
  external_platform?: string;
  scheduled_at: string;
  ends_at?: string;
  template_id?: string;
}): Promise<ScheduledLive> => {
  const slugBase = SLUG_FALLBACK(input.title);
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("scheduled_lives")
    .insert({
      business_user_id: input.business_user_id,
      title: input.title,
      description: input.description || null,
      cover_url: input.cover_url || null,
      source_type: input.source_type,
      live_code: input.source_type === "internal" ? (input.live_code || null) : null,
      external_url: input.source_type === "external" ? (input.external_url || null) : null,
      external_platform: input.source_type === "external" ? (input.external_platform || "other") : null,
      scheduled_at: input.scheduled_at,
      ends_at: input.ends_at || null,
      template_id: input.template_id || null,
      status: "scheduled",
      slug,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ScheduledLive;
};

export const listScheduledLives = async (businessUserId: string): Promise<ScheduledLive[]> => {
  const { data } = await supabase
    .from("scheduled_lives")
    .select("*")
    .eq("business_user_id", businessUserId)
    .order("scheduled_at", { ascending: false });
  return (data || []) as ScheduledLive[];
};

export const fetchScheduledLiveBySlug = async (slug: string): Promise<ScheduledLive | null> => {
  const { data } = await supabase
    .from("scheduled_lives").select("*").eq("slug", slug).maybeSingle();
  return (data as ScheduledLive) || null;
};

export const fetchScheduledLiveById = async (id: string): Promise<ScheduledLive | null> => {
  const { data } = await supabase
    .from("scheduled_lives").select("*").eq("id", id).maybeSingle();
  return (data as ScheduledLive) || null;
};

export const updateScheduledLive = async (id: string, patch: Partial<ScheduledLive>) => {
  const { error } = await supabase.from("scheduled_lives").update(patch as any).eq("id", id);
  if (error) throw error;
};

export const cancelScheduledLive = async (id: string) =>
  updateScheduledLive(id, { status: "cancelled" } as any);

export type ScheduledLiveRanking = {
  ambassador_id: string;
  user_id: string;
  display_name: string | null;
  ref_code: string;
  visits: number;
};

export const fetchScheduledLiveRanking = async (
  scheduledLiveId: string,
  opts?: { limit?: number; offset?: number },
): Promise<ScheduledLiveRanking[]> => {
  const { data } = await supabase.rpc("get_scheduled_live_ranking", {
    p_scheduled_live_id: scheduledLiveId,
    p_limit: opts?.limit ?? 50,
    p_offset: opts?.offset ?? 0,
  });
  return ((data || []) as any[]).map((r) => ({
    ambassador_id: r.ambassador_id,
    user_id: r.user_id,
    display_name: r.display_name,
    ref_code: r.ref_code,
    visits: Number(r.visits) || 0,
  }));
};

const ATTEND_KEY = "bateu_pending_attendance";

export const storePendingAttendance = (visitId: string, scheduledLiveId: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ATTEND_KEY, JSON.stringify({ visitId, scheduledLiveId }));
};

export const consumePendingAttendance = (scheduledLiveId: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ATTEND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.scheduledLiveId !== scheduledLiveId) return null;
    return parsed.visitId || null;
  } catch { return null; }
};

export type AttendanceResult = {
  ok: boolean;
  counted?: boolean;
  already?: boolean;
  reason?: "too_early" | "too_late" | "self_referral" | "cancelled" | "no_live" | "live_not_found" | "visit_not_found";
};

export const confirmAttendance = async (visitId: string): Promise<AttendanceResult> => {
  const { data } = await supabase.rpc("confirm_live_attendance", { p_visit_id: visitId });
  return (data as AttendanceResult) || { ok: false };
};

export const clearPendingAttendance = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ATTEND_KEY);
};
