// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

/**
 * Stories 2.0 — Rede Social da Bateu
 * Tipos e helpers para o sistema completo de stories:
 * imagem, vídeo, texto, stickers, filtros, enquetes, quizzes
 * com prémio, ofertas relâmpago, links CTA, música, reações,
 * respostas, visualizações e destaques permanentes.
 */

export type StoryMediaType = "image" | "video" | "text";

export interface StoryPoll {
  question: string;
  options: string[];
}

export interface StoryQuiz {
  question: string;
  options: string[];
  correct: number;
  reward: number; // pontos de sorte
}

export interface StoryFlashDeal {
  label: string;
  discountPct: number;
  code: string;
  expiresAt: string;
}

export interface StoryMusicTrack {
  title: string;
  vibe: string; // preset de visualização (pulso no ritmo)
}

export interface StorySticker {
  emoji: string;
  x: number; // % posição
  y: number;
  size: number; // px
  rotate: number;
}

export interface CaptionStyle {
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "top" | "center" | "bottom";
  weight?: "normal" | "bold";
}

export interface UserStory {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  video_url?: string | null;
  media_type?: StoryMediaType;
  background: string | null;
  caption_style?: CaptionStyle | null;
  filter?: string | null;
  stickers?: StorySticker[] | null;
  poll?: StoryPoll | null;
  quiz?: StoryQuiz | null;
  flash_deal?: StoryFlashDeal | null;
  link_url?: string | null;
  link_label?: string | null;
  music_track?: StoryMusicTrack | null;
  duration_seconds?: number;
  font_family?: string | null;
  text_position?: { x: number; y: number } | null;
  views_count?: number;
  reactions_count?: number;
  replies_count?: number;
  allow_replies?: boolean;
  allow_share?: boolean;
  raffle_id?: string | null;
  business_id?: string | null;
  highlight_id?: string | null;
  created_at: string;
  expires_at: string;
  // enriquecido no cliente
  authorName?: string;
  authorAvatar?: string;
  myReaction?: string | null;
  myVote?: number | null;
  myQuizAnswer?: number | null;
}

export interface StoryHighlight {
  id: string;
  user_id: string;
  title: string;
  cover_image: string | null;
  cover_gradient: string;
  sort_order: number;
  created_at: string;
  stories?: UserStory[];
}

export const STORY_FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Original", css: "none" },
  { id: "vivid", label: "Vívido", css: "saturate(1.5) contrast(1.1)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "warm", label: "Quente", css: "sepia(0.4) saturate(1.3) hue-rotate(-10deg)" },
  { id: "cool", label: "Frio", css: "saturate(1.2) hue-rotate(25deg) brightness(1.05)" },
  { id: "drama", label: "Drama", css: "contrast(1.4) brightness(0.9) saturate(1.2)" },
  { id: "fade", label: "Suave", css: "contrast(0.85) brightness(1.1) saturate(0.8)" },
  { id: "neon", label: "Neon", css: "saturate(2) hue-rotate(90deg) contrast(1.2)" },
];

export const STORY_GRADIENTS = [
  "from-primary to-emerald-400",
  "from-orange-500 via-red-500 to-pink-600",
  "from-yellow-400 via-amber-500 to-orange-600",
  "from-violet-500 via-purple-600 to-fuchsia-600",
  "from-sky-500 via-blue-500 to-indigo-600",
  "from-rose-500 to-pink-500",
  "from-teal-400 to-cyan-600",
  "from-slate-700 to-slate-900",
];

export const STORY_FONTS = [
  { id: "font-display", label: "Display" },
  { id: "font-sans", label: "Sans" },
  { id: "font-serif", label: "Serif" },
  { id: "font-mono", label: "Mono" },
];

export const REACTION_EMOJIS = ["❤️", "🔥", "😂", "😮", "🎉", "👏", "💰", "🤩"];

export const STICKER_PACKS: { name: string; emojis: string[] }[] = [
  { name: "Sorte", emojis: ["🍀", "🎲", "🎯", "💰", "🏆", "💎", "👑", "⭐"] },
  { name: "Festa", emojis: ["🎉", "🎊", "🥳", "✨", "🪅", "🎈", "🎁", "🍾"] },
  { name: "Reações", emojis: ["🔥", "❤️", "😂", "😮", "😭", "🤯", "😱", "🥺"] },
  { name: "Vida", emojis: ["🚗", "🏠", "📱", "💻", "🏀", "⚽", "🎮", "🎵"] },
];

export const MUSIC_VIBES = [
  { id: "pulse", title: "Batida Pulso", vibe: "Energia de jogo ao vivo" },
  { id: "chill", title: "Onda Calma", vibe: "Relax com praia e sol" },
  { id: "epic", title: "Modo Épico", vibe: "Trilha de vitória" },
  { id: "party", title: "Festa Total", vibe: "Kuduro / afro house" },
];

/** Carrega stories ativos agrupados por autor (estilo Instagram). */
export async function loadActiveStories(): Promise<Map<string, { author: { id: string; name: string; avatar?: string }; stories: UserStory[] }>> {
  const cutoff = new Date().toISOString();
  const { data: rows } = await supabase
    .from("user_stories")
    .select("*")
    .gt("expires_at", cutoff)
    .is("highlight_id", null)
    .order("created_at", { ascending: true })
    .limit(150);

  const stories = (rows as unknown as UserStory[]) || [];
  if (stories.length === 0) return new Map();

  // Perfis dos autores — profiles_public é legível por todos (RLS seguro)
  const ids = Array.from(new Set(stories.map((s) => s.user_id)));
  const { data: profs } = await supabase
    .from("profiles_public")
    .select("user_id, display_name, avatar_url")
    .in("user_id", ids);
  const profById: Record<string, any> = {};
  (profs || []).forEach((p: any) => (profById[p.user_id] = p));

  // Minhas interações (enquete e quiz separados — não se confundem)
  const { data: { user } } = await supabase.auth.getUser();
  let myReactions: Record<string, string> = {};
  let myVotes: Record<string, number> = {};
  let myQuizVotes: Record<string, number> = {};
  if (user) {
    const [{ data: reacts }, { data: votes }] = await Promise.all([
      supabase.from("story_reactions").select("story_id, emoji").eq("user_id", user.id).in("story_id", stories.map((s) => s.id)),
      supabase.from("story_interactions").select("story_id, option_index, interaction_type").eq("user_id", user.id).in("story_id", stories.map((s) => s.id)),
    ]);
    (reacts || []).forEach((r: any) => { myReactions[r.story_id] = r.emoji; });
    (votes || []).forEach((v: any) => {
      if (v.interaction_type === "quiz") myQuizVotes[v.story_id] = v.option_index;
      else myVotes[v.story_id] = v.option_index;
    });
  }

  const groups = new Map<string, { author: { id: string; name: string; avatar?: string }; stories: UserStory[] }>();
  for (const s of stories) {
    const prof = profById[s.user_id];
    s.authorName = prof?.display_name || "Utilizador";
    s.authorAvatar = prof?.avatar_url || undefined;
    s.myReaction = myReactions[s.id] || null;
    s.myVote = myVotes[s.id] ?? null;
    s.myQuizAnswer = myQuizVotes[s.id] ?? null;

    let g = groups.get(s.user_id);
    if (!g) {
      g = {
        author: { id: s.user_id, name: s.authorName, avatar: s.authorAvatar },
        stories: [],
      };
      groups.set(s.user_id, g);
    }
    g.stories.push(s);
  }
  // Ordena por mais recente primeiro nos grupos
  return new Map([...groups.entries()].sort((a, b) => {
    const la = a[1].stories[a[1].stories.length - 1]?.created_at || "";
    const lb = b[1].stories[b[1].stories.length - 1]?.created_at || "";
    return lb.localeCompare(la);
  }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marca story como visto (RPC atómico). Ignora stories sintéticos da plataforma. */
export async function markStoryViewed(storyId: string) {
  if (!UUID_RE.test(storyId)) return; // ids "hot-…"/"announcement-…" não existem na BD
  try {
    await supabase.rpc("story_mark_viewed" as any, { p_story_id: storyId } as any);
  } catch { /* silencioso */ }
}

/** Reagir a um story (toggle). */
export async function reactToStory(storyId: string, emoji: string) {
  const { error } = await supabase.rpc("story_react" as any, { p_story_id: storyId, p_emoji: emoji } as any);
  return !error;
}

/** Votar numa enquete ou quiz; devolve pontos ganhos. */
export async function voteStoryInteraction(storyId: string, type: "poll" | "quiz", option: number): Promise<number> {
  const { data, error } = await supabase.rpc("story_vote" as any, {
    p_story_id: storyId, p_type: type, p_option: option,
  } as any);
  if (error) return 0;
  return Number((data as unknown as number) || 0);
}

/** Responder a um story (mensagem direta ao autor). */
export async function replyToStory(storyId: string, message: string, emoji?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão necessária");
  const { error } = await supabase.from("story_replies").insert({
    story_id: storyId,
    sender_id: user.id,
    message,
    emoji: emoji || null,
  });
  return !error;
}

/** Resultados agregados de enquete/quiz. */
export async function getStoryResults(storyId: string): Promise<Record<number, number>> {
  const { data } = await supabase.rpc("story_results" as any, { p_story_id: storyId } as any);
  const out: Record<number, number> = {};
  ((data as unknown as { option: number; votes: number }[]) || []).forEach((r) => {
    out[r.option] = Number(r.votes);
  });
  return out;
}

/** Lista de visualizadores (para o dono do story). */
export async function getStoryViewers(storyId: string) {
  const { data } = await supabase
    .from("story_views")
    .select("viewer_id, viewed_at, profiles_public(display_name, avatar_url)")
    .eq("story_id", storyId)
    .order("viewed_at", { ascending: false })
    .limit(50);
  return (data as unknown as { viewer_id: string; viewed_at: string; profiles_public: { display_name: string | null; avatar_url: string | null } }[]) || [];
}

/** Destaques de um utilizador. */
export async function loadHighlights(userId: string): Promise<StoryHighlight[]> {
  const { data: hl } = await supabase
    .from("story_highlights")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  const highlights = (hl as unknown as StoryHighlight[]) || [];
  if (highlights.length === 0) return [];

  const { data: stories } = await supabase
    .from("user_stories")
    .select("*")
    .in("highlight_id", highlights.map((h) => h.id))
    .order("created_at", { ascending: true });

  (stories as unknown as UserStory[] || []).forEach((s) => {
    const h = highlights.find((x) => x.id === s.highlight_id);
    if (h) {
      h.stories = h.stories || [];
      h.stories.push(s);
    }
  });
  return highlights;
}

/** Utilitário: tempo relativo em PT. */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
