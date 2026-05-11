import { supabase } from "@/integrations/supabase/client";
import { getPublicBaseUrl } from "@/lib/publicUrl";

export type LivePlatform = "instagram" | "tiktok" | "youtube" | "facebook" | "x" | "kwai" | "other";

export type LiveLink = {
  id: string;
  scheduled_live_id: string;
  platform: LivePlatform;
  url: string;
  label: string | null;
  is_primary: boolean;
};

export type LivePoll = {
  id: string;
  scheduled_live_id: string;
  question: string;
  options: string[];
  is_open: boolean;
  created_at: string;
  closed_at: string | null;
};

export type LivePollVote = {
  id: string;
  poll_id: string;
  option_index: number;
  voter_hash: string;
};

export type LiveAnnouncement = {
  id: string;
  scheduled_live_id: string;
  message: string;
  kind: string;
  created_at: string;
};

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

export const DEFAULT_CHECKLIST: { key: string; label: string }[] = [
  { key: "title_ok", label: "Título e descrição prontos" },
  { key: "platforms_ok", label: "Links das plataformas adicionados" },
  { key: "prizes_ok", label: "Prémios definidos" },
  { key: "ambassadors_ok", label: "Embaixadores ativados" },
  { key: "promo_post_ok", label: "Post de aviso publicado" },
  { key: "overlay_ok", label: "Overlay testado no streaming" },
];

// ===== Links =====
export const listLiveLinks = async (id: string): Promise<LiveLink[]> => {
  const { data } = await supabase.from("scheduled_live_links" as any).select("*").eq("scheduled_live_id", id).order("created_at");
  return (data || []) as any;
};
export const addLiveLink = async (input: Omit<LiveLink, "id">) => {
  const { error } = await supabase.from("scheduled_live_links" as any).insert(input as any);
  if (error) throw error;
};
export const removeLiveLink = async (id: string) => {
  await supabase.from("scheduled_live_links" as any).delete().eq("id", id);
};

// ===== Polls =====
export const listPolls = async (liveId: string): Promise<LivePoll[]> => {
  const { data } = await supabase.from("live_polls" as any).select("*").eq("scheduled_live_id", liveId).order("created_at", { ascending: false });
  return (data || []).map((p: any) => ({ ...p, options: Array.isArray(p.options) ? p.options : [] }));
};
export const createPoll = async (liveId: string, question: string, options: string[]) => {
  const { data, error } = await supabase.from("live_polls" as any).insert({ scheduled_live_id: liveId, question, options } as any).select("*").single();
  if (error) throw error;
  return data as any;
};
export const closePoll = async (id: string) => {
  await supabase.from("live_polls" as any).update({ is_open: false, closed_at: new Date().toISOString() } as any).eq("id", id);
};
export const deletePoll = async (id: string) => {
  await supabase.from("live_polls" as any).delete().eq("id", id);
};
export const listPollVotes = async (pollId: string): Promise<LivePollVote[]> => {
  const { data } = await supabase.from("live_poll_votes" as any).select("id, poll_id, option_index, voter_hash").eq("poll_id", pollId);
  return (data || []) as any;
};

const getVoterHash = (): string => {
  if (typeof window === "undefined") return "ssr";
  let h = localStorage.getItem("bateu_voter_hash");
  if (!h) {
    h = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + "-" + Date.now();
    localStorage.setItem("bateu_voter_hash", h);
  }
  return h;
};
export const castPollVote = async (pollId: string, optionIndex: number) => {
  const { data } = await supabase.rpc("cast_live_poll_vote" as any, {
    p_poll_id: pollId,
    p_voter_hash: getVoterHash(),
    p_option_index: optionIndex,
  } as any);
  return data as { ok: boolean; counted?: boolean; already?: boolean; reason?: string };
};

// ===== Announcements =====
export const listAnnouncements = async (liveId: string, limit = 20): Promise<LiveAnnouncement[]> => {
  const { data } = await supabase.from("live_announcements" as any).select("*").eq("scheduled_live_id", liveId).order("created_at", { ascending: false }).limit(limit);
  return (data || []) as any;
};
export const postAnnouncement = async (liveId: string, message: string, kind: string = "info") => {
  const { error } = await supabase.from("live_announcements" as any).insert({ scheduled_live_id: liveId, message, kind } as any);
  if (error) throw error;
};

// ===== Checklist =====
export const listChecklist = async (liveId: string): Promise<ChecklistItem[]> => {
  const { data } = await supabase.from("live_studio_checklist" as any).select("item_key, done").eq("scheduled_live_id", liveId);
  const map = new Map<string, boolean>((data || []).map((d: any) => [d.item_key, d.done]));
  return DEFAULT_CHECKLIST.map((c) => ({ key: c.key, label: c.label, done: !!map.get(c.key) }));
};
export const setChecklistItem = async (liveId: string, key: string, done: boolean) => {
  await supabase.from("live_studio_checklist" as any).upsert({
    scheduled_live_id: liveId,
    item_key: key,
    done,
    updated_at: new Date().toISOString(),
  } as any, { onConflict: "scheduled_live_id,item_key" });
};

// ===== Studio summary =====
export type StudioSummary = {
  visits_total: number;
  attendance_total: number;
  polls_count: number;
  announcements_count: number;
  prizes_total: number;
  prizes_awarded: number;
};
export const getStudioSummary = async (liveId: string): Promise<StudioSummary> => {
  const { data } = await supabase.rpc("get_live_studio_summary" as any, { p_scheduled_live_id: liveId } as any);
  const d = (data as any) || {};
  return {
    visits_total: Number(d.visits_total) || 0,
    attendance_total: Number(d.attendance_total) || 0,
    polls_count: Number(d.polls_count) || 0,
    announcements_count: Number(d.announcements_count) || 0,
    prizes_total: Number(d.prizes_total) || 0,
    prizes_awarded: Number(d.prizes_awarded) || 0,
  };
};

export const buildOverlayUrl = (liveId: string, view: "ranking" | "prizes" | "countdown" | "announcement"): string =>
  `${getPublicBaseUrl()}/overlay/live/${encodeURIComponent(liveId)}?view=${view}`;

export const PLATFORM_META: Record<LivePlatform, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "from-pink-500 to-orange-500" },
  tiktok: { label: "TikTok", color: "from-black to-pink-500" },
  youtube: { label: "YouTube", color: "from-red-600 to-red-500" },
  facebook: { label: "Facebook", color: "from-blue-600 to-blue-500" },
  x: { label: "X / Twitter", color: "from-zinc-700 to-black" },
  kwai: { label: "Kwai", color: "from-orange-400 to-yellow-500" },
  other: { label: "Outra", color: "from-slate-500 to-slate-700" },
};
