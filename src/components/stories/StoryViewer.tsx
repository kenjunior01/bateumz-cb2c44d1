import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X, ChevronLeft, ChevronRight, Send, Trash2, Eye,
  Link as LinkIcon, Music2, Copy, PartyPopper, BarChart3, Users, Play, Pause,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OptimizedImage from "@/components/OptimizedImage";
import {
  REACTION_EMOJIS, STORY_FILTERS, markStoryViewed, reactToStory,
  replyToStory, voteStoryInteraction, getStoryResults, getStoryViewers,
  timeAgo, type UserStory,
} from "@/lib/stories";

export interface StoryAuthorGroup {
  author: { id: string; name: string; avatar?: string };
  stories: UserStory[];
}

interface Props {
  groups: StoryAuthorGroup[];
  startGroup: number;
  onClose: () => void;
  onDeleted?: () => void;
}

const FILTER_CSS: Record<string, string> = {};
STORY_FILTERS.forEach((f) => (FILTER_CSS[f.id] = f.css));

const StoryViewer = ({ groups, startGroup, onClose, onDeleted }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groupIdx, setGroupIdx] = useState(startGroup);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<{ viewer_id: string; profiles_public: { display_name: string | null; avatar_url: string | null } }[]>([]);
  const [pollResults, setPollResults] = useState<Record<number, number> | null>(null);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
  const [quizWon, setQuizWon] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [floatEmojis, setFloatEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const emojiIdRef = useRef(0);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  // Reset interações ao mudar de story
  useEffect(() => {
    setPollResults(null);
    setQuizAnswered(story?.myQuizAnswer ?? null);
    setQuizWon(false);
    setShowReplies(false);
    setShowReactions(false);
    setShowViewers(false);
    elapsedRef.current = 0;
    setProgress(0);
    if (story) markStoryViewed(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  // Loop de progresso
  useEffect(() => {
    if (!story || paused || showReplies) return;
    const duration = (story.duration_seconds || 5) * 1000;
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = elapsedRef.current + (Date.now() - startRef.current);
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct);
      if (pct < 1) {
        timerRef.current = setTimeout(tick, 50);
      } else {
        goNext();
      }
    };
    timerRef.current = setTimeout(tick, 50);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      elapsedRef.current += Date.now() - startRef.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx, paused, showReplies, story?.id]);

  const goNext = useCallback(() => {
    const g = groups[groupIdx];
    if (!g) return onClose();
    if (storyIdx < g.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [groups, groupIdx, storyIdx, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1);
      setStoryIdx(0);
    }
    elapsedRef.current = 0;
    setProgress(0);
  }, [groupIdx, storyIdx]);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  const handleReact = async (emoji: string) => {
    if (!story || !user) return toast.error("Inicie sessão para reagir");
    setShowReactions(false);
    const id = ++emojiIdRef.current;
    setFloatEmojis((f) => [...f, { id, emoji, x: 50 + (Math.random() * 40 - 20) }]);
    setTimeout(() => setFloatEmojis((f) => f.filter((e) => e.id !== id)), 1800);
    await reactToStory(story.id, emoji);
  };

  const handleSendReply = async () => {
    if (!story || !replyText.trim()) return;
    try {
      const ok = await replyToStory(story.id, replyText.trim());
      if (ok) {
        toast.success("Resposta enviada ao autor! 💌");
        setReplyText("");
        setShowReplies(false);
      } else {
        toast.error("Não foi possível responder");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao responder";
      toast.error(msg);
    }
  };

  const handlePollVote = async (option: number) => {
    if (!story?.poll) return;
    if ((story.myVote ?? null) !== null) return;
    await voteStoryInteraction(story.id, "poll", option);
    story.myVote = option;
    const results = await getStoryResults(story.id);
    setPollResults(results);
  };

  const handleQuizAnswer = async (option: number) => {
    if (!story?.quiz || quizAnswered !== null) return;
    setQuizAnswered(option);
    const pts = await voteStoryInteraction(story.id, "quiz", option);
    if (pts > 0) {
      setQuizWon(true);
      toast.success(`🎉 Acertou! +${pts} pontos de sorte!`);
    } else {
      toast.error(`Errado! A resposta certa era "${story.quiz.options[story.quiz.correct]}"`);
    }
  };

  const handleViewers = async () => {
    if (!story) return;
    if (showViewers) return setShowViewers(false);
    const list = await getStoryViewers(story.id);
    setViewers(list as unknown as typeof viewers);
    setShowViewers(true);
  };

  const handleDelete = async () => {
    if (!story || !user || story.user_id !== user.id) return;
    if (!confirm("Apagar este story?")) return;
    await supabase.from("user_stories").delete().eq("id", story.id);
    toast.success("Story apagado");
    onDeleted?.();
    onClose();
  };

  const copyDealCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success(`Código ${code} copiado!`);
  };

  const sendQuickReply = async (emoji: string) => {
    try {
      const ok = await replyToStory(story.id, emoji, emoji);
      if (ok) { toast.success("Enviado!"); setShowReplies(false); }
      else toast.error("Não foi possível enviar");
    } catch {
      toast.error("Inicie sessão para responder");
      setShowReplies(false);
    }
  };

  if (!group || !story) return null;

  const isOwner = user?.id === story.user_id;
  const filterCss = FILTER_CSS[story.filter || "none"] || "none";
  const captionAlign = story.caption_style?.align || "center";
  const captionColor = story.caption_style?.color || "#ffffff";
  const captionSize =
    story.caption_style?.size === "xl" ? "text-3xl" :
    story.caption_style?.size === "lg" ? "text-2xl" :
    story.caption_style?.size === "sm" ? "text-base" : "text-xl";
  const stickers = story.stickers || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none"
    >
      {/* Barras de progresso — respeitam o notch */}
      <div className="absolute left-3 right-3 flex gap-1 z-20" style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}>
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: i < storyIdx ? "100%" : i === storyIdx ? `${progress * 100}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute left-4 right-4 z-20 flex items-center justify-between" style={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 1.5rem)"}}>
        <div className="flex items-center gap-2.5 min-w-0">
          {group.author.avatar ? (
            <OptimizedImage src={group.author.avatar} alt="" optimizeWidth={80} className="h-9 w-9 rounded-full ring-2 ring-white/60 object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center text-white text-sm font-bold">
              {group.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate drop-shadow">{group.author.name}</p>
            <p className="text-white/70 text-[11px]">{timeAgo(story.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {story.music_track && (
            <motion.div
              animate={paused ? {} : { scale: [1, 1.08, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-[11px]"
            >
              <Music2 className="h-3 w-3" /> {story.music_track.title}
            </motion.div>
          )}
          {isOwner && (
            <>
              <button onClick={handleViewers} className="p-2 rounded-full bg-white/15 backdrop-blur text-white" aria-label="Visualizações">
                <Eye className="h-4 w-4" />
              </button>
              <button onClick={handleDelete} className="p-2 rounded-full bg-white/15 backdrop-blur text-white" aria-label="Apagar">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button onClick={onClose} className="p-2 rounded-full bg-white/15 backdrop-blur text-white" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Painel de visualizadores */}
      <AnimatePresence>
        {showViewers && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-[70px] right-4 z-30 w-64 rounded-2xl bg-black/85 backdrop-blur border border-white/15 p-3 max-h-64 overflow-y-auto"
          >
            <p className="text-white/80 text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {story.views_count || viewers.length} visualizações
            </p>
            {viewers.length === 0 ? (
              <p className="text-white/50 text-xs">Ainda sem visualizações</p>
            ) : (
              viewers.map((v) => (
                <div key={v.viewer_id} className="flex items-center gap-2 py-1">
                  {v.profiles_public?.avatar_url ? (
                    <img src={v.profiles_public.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-white/20" />
                  )}
                  <span className="text-white text-xs truncate">{v.profiles_public?.display_name || "Utilizador"}</span>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTEÚDO — altura limitada por dvh (não transborda em ecrãs baixos) */}
      <div
        className="relative w-full max-w-[min(400px,calc((100dvh-4rem)*9/16))] aspect-[9/16] overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 to-black shadow-2xl"
        onPointerDown={(e) => { if (e.pointerType === "touch") setPaused(true); }}
        onPointerUp={(e) => { if (e.pointerType === "touch") setPaused(false); }}
      >
        {story.media_type === "video" && story.video_url && !videoFailed ? (
          <video
            src={story.video_url}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: filterCss }}
            autoPlay
            muted
            playsInline
            loop
            onError={() => setVideoFailed(true)}
          />
        ) : story.image_url && story.media_type !== "video" ? (
          <OptimizedImage
            src={story.image_url}
            alt=""
            optimizeWidth={840}
            priority
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: filterCss }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${story.background || "from-primary to-emerald-400"}`}>
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.4, 0.25] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/20 blur-2xl"
            />
            <motion.div
              animate={{ scale: [1.1, 1, 1.1] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-black/25 blur-3xl"
            />
          </div>
        )}

        {/* Stickers */}
        {stickers.map((st, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: st.rotate }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 + i * 0.08 }}
            className="absolute z-10 cursor-default drop-shadow-lg"
            style={{ left: `${st.x}%`, top: `${st.y}%`, fontSize: st.size }}
          >
            {st.emoji}
          </motion.span>
        ))}

        {/* Música — barras de pulso */}
        {story.music_track && (
          <div className="absolute bottom-24 left-4 z-10 flex items-end gap-0.5">
            {[0.3, 0.5, 0.4, 0.6, 0.35, 0.5].map((h, i) => (
              <motion.span
                key={i}
                animate={paused ? { scaleY: 0.4 } : { scaleY: [0.4, h * 1.6, 0.4] }}
                transition={{ duration: 0.7 + i * 0.1, repeat: Infinity }}
                className="w-1 h-6 rounded-full bg-white/80 origin-bottom"
              />
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

        {/* Zonas de navegação */}
        <button className="absolute left-0 top-0 bottom-0 w-1/3 z-[5]" onClick={goPrev} aria-label="Anterior" />
        <button className="absolute right-0 top-0 bottom-0 w-1/3 z-[5]" onClick={goNext} aria-label="Seguinte" />

        {/* Caption */}
        {story.content && (
          <div
            className={`absolute left-4 right-4 z-10 text-center ${
              captionAlign === "top" ? "top-16" : captionAlign === "bottom" ? "bottom-40" : "top-1/2 -translate-y-1/2"
            }`}
          >
            <p
              className={`${captionSize} font-bold whitespace-pre-wrap leading-snug drop-shadow-lg ${story.font_family || "font-display"}`}
              style={{ color: captionColor }}
            >
              {story.content}
            </p>
          </div>
        )}

        {/* OFERTA RELÂMPAGO */}
        {story.flash_deal && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-10 w-[85%] rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 p-3 text-center shadow-xl"
          >
            <p className="text-white text-xs font-semibold uppercase tracking-wide">⚡ Oferta Relâmpago</p>
            <p className="text-white font-display text-2xl font-black">-{story.flash_deal.discountPct}%</p>
            <p className="text-white/90 text-xs">{story.flash_deal.label}</p>
            <button
              onClick={() => copyDealCode(story.flash_deal!.code)}
              className="mt-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/25 backdrop-blur text-white text-xs font-bold border border-white/30"
            >
              <Copy className="h-3 w-3" /> {story.flash_deal.code}
            </button>
          </motion.div>
        )}

        {/* ENQUETE */}
        {story.poll && (
          <div className="absolute bottom-32 left-4 right-4 z-10 space-y-2">
            <p className="text-white text-sm font-semibold drop-shadow text-center">{story.poll.question}</p>
            {story.poll.options.map((opt, i) => {
              const votes = pollResults?.[i] || 0;
              const totalVotes = pollResults ? Object.values(pollResults).reduce((s, v) => s + v, 0) : 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const mine = story.myVote === i;
              const voted = pollResults !== null || story.myVote !== null;
              return (
                <button
                  key={i}
                  onClick={() => handlePollVote(i)}
                  disabled={voted}
                  className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                    voted ? "border-white/30" : "border-white/40 hover:bg-white/15 active:scale-95"
                  } ${mine ? "ring-2 ring-primary" : ""}`}
                >
                  {voted && (
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-y-0 left-0 bg-white/25"
                    />
                  )}
                  <span className="relative flex justify-between text-white">
                    <span>{opt} {mine && "✓"}</span>
                    {voted && <span>{pct}%</span>}
                  </span>
                </button>
              );
            })}
            <p className="text-white/60 text-[10px] text-center flex items-center justify-center gap-1">
              <BarChart3 className="h-3 w-3" /> {pollResults ? Object.values(pollResults).reduce((s, v) => s + v, 0) : 0} votos
            </p>
          </div>
        )}

        {/* QUIZ — separado da enquete (nunca se sobrepõem) */}
        {story.quiz && !story.poll && (
          <div className="absolute bottom-32 left-4 right-4 z-10 space-y-2">
            <p className="text-white text-sm font-semibold drop-shadow text-center">{story.quiz.question}</p>
            <div className="grid grid-cols-2 gap-2">
              {story.quiz.options.map((opt, i) => {
                const answered = quizAnswered !== null;
                const isCorrect = i === story.quiz!.correct;
                return (
                  <button
                    key={i}
                    onClick={() => handleQuizAnswer(i)}
                    disabled={answered}
                    className={`rounded-xl border px-2.5 py-2 text-xs font-medium text-white transition-all ${
                      answered
                        ? isCorrect
                          ? "bg-emerald-500/80 border-emerald-300"
                          : i === quizAnswered
                          ? "bg-red-500/80 border-red-300"
                          : "bg-white/10 border-white/20 opacity-60"
                        : "border-white/40 hover:bg-white/15 active:scale-95"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {quizWon && (
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-center text-emerald-300 text-xs font-bold flex items-center justify-center gap-1"
              >
                <PartyPopper className="h-3.5 w-3.5" /> +{story.quiz.reward} pontos de sorte!
              </motion.p>
            )}
            {quizAnswered === null && (
              <p className="text-center text-white/60 text-[10px]">Responda e ganhe {story.quiz.reward} pontos 🎁</p>
            )}
          </div>
        )}

        {/* LINK CTA */}
        {story.link_url && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => {
              if (story.link_url?.startsWith("/")) navigate(story.link_url);
              else window.open(story.link_url!, "_blank");
            }}
            className="absolute bottom-40 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-black text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            {story.link_label || "Ver mais"}
          </motion.button>
        )}

        {/* Emojis flutuantes */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          {floatEmojis.map((f) => (
            <motion.span
              key={f.id}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -500, opacity: 0, scale: 1.8, rotate: Math.random() * 60 - 30 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute text-4xl"
              style={{ left: `${f.x}%`, bottom: 100 }}
            >
              {f.emoji}
            </motion.span>
          ))}
        </div>

        {/* Rodapé */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-5">
          {story.allow_replies !== false && !isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReplies(true)}
                className="flex-1 flex items-center px-4 py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/25 text-white/80 text-sm"
              >
                Responder...
              </button>
              <button
                onClick={() => setShowReactions((v) => !v)}
                className="h-10 w-10 rounded-full bg-white/10 backdrop-blur border border-white/25 flex items-center justify-center text-xl active:scale-90 transition-transform"
                aria-label="Reagir"
              >
                {story.myReaction || "😊"}
              </button>
            </div>
          )}
          {isOwner && (
            <div className="flex items-center justify-center gap-4 text-white/80 text-xs">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {story.views_count || 0}</span>
              <span>❤️ {story.reactions_count || 0}</span>
              <span>💬 {story.replies_count || 0}</span>
              <button
                onClick={() => setPaused((p) => !p)}
                className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Barra de reações */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.9 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex gap-1 px-3 py-2 rounded-full bg-black/70 backdrop-blur border border-white/15"
            >
              {REACTION_EMOJIS.map((e, i) => (
                <motion.button
                  key={e}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.4 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleReact(e)}
                  className="text-2xl"
                >
                  {e}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resposta rápida */}
        <AnimatePresence>
          {showReplies && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 right-0 z-40 bg-black/85 backdrop-blur p-4 pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/80 text-xs mb-2">Responder a <strong>{group.author.name}</strong></p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                  placeholder="Escreva a sua resposta..."
                  maxLength={500}
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white text-sm outline-none focus:border-primary/60"
                />
                <button
                  onClick={handleSendReply}
                  className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white active:scale-90 transition-transform"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {["❤️", "🔥", "😂", "😮", "🎉"].map((e) => (
                  <button
                    key={e}
                    onClick={() => sendQuickReply(e)}
                    className="shrink-0 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-xl hover:bg-white/20"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navegação desktop */}
      {groupIdx > 0 && (
        <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white p-2 hidden sm:block">
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white p-2 hidden sm:block">
        <ChevronRight className="h-8 w-8" />
      </button>
    </motion.div>
  );
};

export default StoryViewer;
