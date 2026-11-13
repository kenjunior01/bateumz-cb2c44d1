import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Flame, Ticket, Users, Trophy,
  Radio, Play, Clock, TrendingUp, Sparkles, Gift, Gamepad2, ChevronRight, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import OptimizedImage from "@/components/OptimizedImage";

/**
 * MobileSocialFeed — feed vertical "Para Ti" inspirado nas apps mais viciantes
 * (TikTok / Instagram / Twitter), com psicologia aplicada:
 *
 *  1. Loop de variabilidade  — cartões mistos (sorteios, jogos, vencedores, lives)
 *  2. Prova social           — avatares empilhados, contadores, vencedores reais
 *  3. Escassez + urgência    — barras de progresso "quase esgotado", countdown
 *  4. FOMO                   — badges AO VIVO pulsantes, "a jogar agora"
 *  5. Recompensa imediata    — duplo-toque ❤️ com explosão de corações + som
 *  6. Identidade/progresso   — streak e pontos no cartão final
 *  7. Snap scroll            — gesto de app nativo, um cartão de cada vez
 */

/* ─────────────────────────── Data types ─────────────────────────── */

interface FeedRaffle {
  id: string;
  title: string;
  slug: string | null;
  prize_title: string;
  prize_value: number;
  ticket_price: number;
  points_cost: number;
  total_tickets: number;
  sold_tickets: number;
  end_date: string | null;
  image_url: string | null;
  hide_prize_value: boolean;
  province: string | null;
}

interface FeedWinner {
  id: string;
  name: string;
  prize: string;
  city: string | null;
  at: string;
  avatarUrl: string | null;
}

type FeedCard =
  | { kind: "raffle"; key: string; raffle: FeedRaffle }
  | { kind: "winner"; key: string; winner: FeedWinner }
  | { kind: "game"; key: string; game: FeedGame };

interface FeedGame {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  grad: string;
  players: string;
}

const TOP_GAMES: FeedGame[] = [
  { id: "ludo", label: "Ludo Batalha", emoji: "🎲", desc: "O clássico em duelo 1v1 ao vivo!", grad: "from-emerald-500 to-teal-700", players: "1v1 / Bot" },
  { id: "tictactoepro", label: "Galo PRO", emoji: "❌", desc: "9 mini-tabuleiros de estratégia pura", grad: "from-violet-600 to-indigo-700", players: "1v1 / Bot" },
  { id: "bicho", label: "Jogo do Bicho", emoji: "🐘", desc: "Apostas rápidas, sorteios de minuto", grad: "from-amber-500 to-orange-700", players: "Multiplayer" },
  { id: "mmorpg", label: "BATEU RPG: Lendas", emoji: "⚔️", desc: "RPG voxel: 6 regiões, missões e noites perigosas", grad: "from-rose-600 to-amber-500", players: "Solo" },
  { id: "millionaire", label: "Millionário", emoji: "💰", desc: "Chega ao milhão passo a passo", grad: "from-yellow-500 to-amber-700", players: "Solo / Live" },
  { id: "uno", label: "Uno VS", emoji: "🃏", desc: "Cartas rápidas contra o mundo", grad: "from-red-500 to-rose-700", players: "1v1 / Bot" },
];

const LIKE_KEY = "feed_likes_v1";
const timeAgo = (iso: string) => {
  const m = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};
const countdown = (date: string | null) => {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return "Termina hoje";
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `⏰ ${Math.floor(diff / 60000)}min restantes`;
  if (h < 24) return `⏰ ${h}h restantes`;
  return `⏰ ${Math.floor(h / 24)}d restantes`;
};

/* ─────────────────────────── Small pieces ─────────────────────────── */

function StackedAvatars({ seed, total }: { seed: number; total: number }) {
  const colors = ["#22d3ee", "#a855f7", "#f59e0b", "#2ea043", "#ef4444", "#3b82f6"];
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {colors.slice(seed % 3, (seed % 3) + 4).map((c, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-full border-2 border-black/60 flex items-center justify-center text-[9px] font-black text-black/70"
            style={{ background: c }}
          >
            {["M", "J", "A", "C", "R", "S"][(seed + i) % 6]}
          </div>
        ))}
      </div>
      <span className="text-[11px] font-semibold text-white/80">
        {total.toLocaleString("pt-PT")} já entraram
      </span>
    </div>
  );
}

function ActionRail({
  liked, likes, onLike, comments, onComment, onShare, accent,
}: {
  liked: boolean; likes: number; onLike: () => void;
  comments: number; onComment: () => void; onShare: () => void; accent: string;
}) {
  const { sfx } = useSoundEffects();
  return (
    <div className="absolute right-2.5 bottom-24 z-20 flex flex-col items-center gap-4">
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => { sfx.pop(); onLike(); }}
        className="flex flex-col items-center gap-0.5"
        aria-label="Gostar"
      >
        <motion.div animate={liked ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.35 }}>
          <Heart
            className={`h-7 w-7 drop-shadow-lg transition-colors ${liked ? "fill-red-500 text-red-500" : "text-white"}`}
          />
        </motion.div>
        <span className="text-[10px] font-bold text-white drop-shadow">{(likes + (liked ? 1 : 0)).toLocaleString("pt-PT")}</span>
      </motion.button>

      <motion.button whileTap={{ scale: 0.8 }} onClick={() => { sfx.tabClick(); onComment(); }} className="flex flex-col items-center gap-0.5" aria-label="Comentários">
        <MessageCircle className="h-7 w-7 text-white drop-shadow-lg" />
        <span className="text-[10px] font-bold text-white drop-shadow">{comments}</span>
      </motion.button>

      <motion.button whileTap={{ scale: 0.8 }} onClick={() => { sfx.whoosh(); onShare(); }} className="flex flex-col items-center gap-0.5" aria-label="Partilhar">
        <Share2 className="h-6 w-6 text-white drop-shadow-lg" />
        <span className="text-[10px] font-bold text-white drop-shadow">Partilhar</span>
      </motion.button>

      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="h-9 w-9 rounded-xl flex items-center justify-center border border-white/20"
        style={{ background: `${accent}30` }}
      >
        <Sparkles className="h-4 w-4" style={{ color: accent }} />
      </motion.div>
    </div>
  );
}

function HeartBurst({ burstKey }: { burstKey: number }) {
  if (burstKey === 0) return null;
  return (
    <div key={burstKey} className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0.3, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            scale: 1 + Math.random() * 0.8,
            x: (Math.random() - 0.5) * 140,
            y: -60 - Math.random() * 130,
            rotate: (Math.random() - 0.5) * 60,
          }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute"
        >
          <Heart className="h-10 w-10 fill-red-500 text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
        </motion.div>
      ))}
      <motion.div
        initial={{ scale: 0, opacity: 0.9 }}
        animate={{ scale: [0, 1.6, 1.2, 0], opacity: [0.9, 1, 1, 0] }}
        transition={{ duration: 0.8 }}
      >
        <Heart className="h-24 w-24 fill-red-500 text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.9)]" />
      </motion.div>
    </div>
  );
}

/* ─────────────────────────── Cards ─────────────────────────── */

function RaffleFeedCard({ raffle, liked, likes, onLike }: {
  raffle: FeedRaffle; liked: boolean; likes: number; onLike: () => void;
}) {
  const pct = raffle.total_tickets > 0 ? Math.min(100, (raffle.sold_tickets / raffle.total_tickets) * 100) : 0;
  const isHot = pct > 70;
  const left = Math.max(0, raffle.total_tickets - raffle.sold_tickets);
  const url = `/raffle/${raffle.slug || raffle.id}`;
  const { sfx } = useSoundEffects();

  const share = async () => {
    const shareUrl = `${window.location.origin}${url}`;
    try {
      if (navigator.share) await navigator.share({ title: raffle.title, text: `🎯 ${raffle.prize_title} — participa no Bateu!`, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); }
    } catch { /* cancelado */ }
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      {/* Background image or gradient */}
      {raffle.image_url ? (
        <OptimizedImage src={raffle.image_url} alt={raffle.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(140deg,#1b1035,#3b1d60,#0b0614)" }} />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.88) 85%)" }} />

      {/* Top meta */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black tracking-wide backdrop-blur-md"
          style={{ background: isHot ? "rgba(239,68,68,0.25)" : "rgba(168,85,247,0.25)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }}>
          {isHot ? <Flame className="h-3.5 w-3.5 text-orange-400" /> : <Gift className="h-3.5 w-3.5 text-purple-300" />}
          {isHot ? "QUASE ESGOTADO" : "SORTEIO ATIVO"}
        </span>
        {countdown(raffle.end_date) && (
          <span className="rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1.5 text-[10px] font-bold text-white border border-white/10">
            {countdown(raffle.end_date)}
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pr-16 pb-6">
        <div className="mb-2 flex items-center gap-2">
          <StackedAvatars seed={raffle.title.length} total={Math.max(raffle.sold_tickets, 12)} />
        </div>
        <h3 className="mb-1 text-xl font-black leading-tight text-white drop-shadow-lg line-clamp-2">{raffle.title}</h3>
        <p className="mb-3 text-sm font-bold text-amber-300 drop-shadow">
          🏆 {raffle.prize_title}
          {!raffle.hide_prize_value && raffle.prize_value > 0 && (
            <span className="ml-1 font-semibold text-white/70">· {formatMZN(raffle.prize_value)}</span>
          )}
        </p>

        {/* Progress + scarcity */}
        <div className="mb-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/15 backdrop-blur-sm">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: isHot ? "linear-gradient(90deg,#f97316,#ef4444)" : "linear-gradient(90deg,#22d3ee,#a855f7)" }}
          />
        </div>
        <div className="mb-4 flex items-center justify-between text-[11px] font-semibold text-white/75">
          <span>{raffle.sold_tickets.toLocaleString("pt-PT")} bilhetes vendidos</span>
          <span className={isHot ? "text-orange-300" : ""}>só restam {left.toLocaleString("pt-PT")}</span>
        </div>

        <Link
          to={url}
          onClick={() => sfx.buttonClick()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white shadow-xl transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg,#22d3ee,#7b2ff7)", boxShadow: "0 8px 30px rgba(123,47,247,0.35)" }}
        >
          <Ticket className="h-4 w-4" /> Participar Agora
          {raffle.ticket_price > 0 ? ` · ${formatMZN(raffle.ticket_price)}` : raffle.points_cost > 0 ? ` · ${raffle.points_cost} pts` : " · Grátis"}
        </Link>
      </div>

      <ActionRail
        liked={liked}
        likes={likes}
        onLike={onLike}
        comments={Math.max(4, Math.round(raffle.sold_tickets / 9))}
        onComment={() => { window.location.href = url; }}
        onShare={share}
        accent="#a855f7"
      />
    </div>
  );
}

function GameFeedCard({ game, liked, likes, onLike, liveCount }: {
  game: FeedGame; liked: boolean; likes: number; onLike: () => void; liveCount: number;
}) {
  const { sfx } = useSoundEffects();
  const Icon = Gamepad2;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl" style={{ background: "#07070c" }}>
      <div className={`absolute inset-0 bg-gradient-to-br ${game.grad} opacity-30`} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(255,255,255,0.08), transparent), linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.85))" }} />

      <div className="absolute top-3 left-3 z-10">
        <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1.5 text-[11px] font-black text-green-300 border border-green-400/30 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-green-500" />
          </span>
          {liveCount} A JOGAR AGORA
        </span>
      </div>

      {/* Center game visual */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-4 text-7xl drop-shadow-2xl"
        >
          {game.emoji}
        </motion.div>
        <h3 className="text-2xl font-black text-white drop-shadow">{game.label}</h3>
        <p className="mt-1 text-sm text-white/70">{game.desc}</p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-white/60">
          <Users className="h-3.5 w-3.5" /> {game.players}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pr-16 pb-6">
        <Link
          to={`/lives?game=${game.id}`}
          onClick={() => sfx.buttonClick()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white shadow-xl transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg,#2ea043,#22d3ee)", boxShadow: "0 8px 30px rgba(46,160,67,0.35)" }}
        >
          <Play className="h-4 w-4 fill-white" /> Jogar Agora — Grátis
        </Link>
      </div>

      <ActionRail liked={liked} likes={likes} onLike={onLike} comments={Math.round(liveCount / 3)} onComment={() => { window.location.href = `/lives?game=${game.id}`; }} onShare={async () => {
        const u = `${window.location.origin}/lives?game=${game.id}`;
        try { if (navigator.share) await navigator.share({ title: game.label, url: u }); else await navigator.clipboard.writeText(u); } catch {}
      }} accent="#22d3ee" />
      <Icon className="absolute h-0 w-0" />
    </div>
  );
}

function WinnerFeedCard({ winner, liked, likes, onLike }: {
  winner: FeedWinner; liked: boolean; likes: number; onLike: () => void;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl" style={{ background: "linear-gradient(150deg,#1a1206,#2b1a04,#0b0703)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(251,191,36,0.18), transparent)" }} />
      {/* Falling coins */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl"
            style={{ left: `${(i * 11 + 5) % 95}%` }}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: "110%", opacity: [0, 1, 1, 0], rotate: 360 }}
            transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.5, ease: "linear" }}
          >
            🪙
          </motion.div>
        ))}
      </div>

      <div className="absolute top-3 left-3 z-10">
        <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1.5 text-[11px] font-black text-amber-300 border border-amber-400/30 backdrop-blur-md">
          <Trophy className="h-3.5 w-3.5" /> VENCEDOR REAL
        </span>
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-amber-900"
          style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", boxShadow: "0 0 40px rgba(251,191,36,0.4)" }}
        >
          {winner.name.slice(0, 1).toUpperCase()}
        </motion.div>
        <h3 className="text-2xl font-black text-white">{winner.name}</h3>
        <motion.p
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-2 text-lg font-black text-amber-300"
        >
          🏆 {winner.prize}
        </motion.p>
        <p className="mt-1 text-xs font-semibold text-white/60">
          {winner.city ? `${winner.city} · ` : ""}{timeAgo(winner.at)} · verificado ✓
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pr-16 pb-6">
        <Link
          to="/marketplace"
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-amber-950 shadow-xl transition-transform active:scale-95"
          style={{ background: "linear-gradient(135deg,#fbbf24,#f97316)", boxShadow: "0 8px 30px rgba(251,191,36,0.3)" }}
        >
          <Zap className="h-4 w-4" /> Quero Ganhar Também
        </Link>
      </div>

      <ActionRail liked={liked} likes={likes} onLike={onLike} comments={12} onComment={() => { window.location.href = "/marketplace"; }} onShare={async () => {
        try { if (navigator.share) await navigator.share({ title: "Vencedor no Bateu!", url: window.location.origin }); else await navigator.clipboard.writeText(window.location.origin); } catch {}
      }} accent="#fbbf24" />
    </div>
  );
}

/* ─────────────────────────── Main component ─────────────────────────── */

export default function MobileSocialFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<FeedRaffle[]>([]);
  const [winners, setWinners] = useState<FeedWinner[]>([]);
  const [tab, setTab] = useState<"foryou" | "hot">("foryou");
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [burst, setBurst] = useState<{ key: string; n: number } | null>(null);
  const tapRef = useRef<{ id: string; time: number } | null>(null);

  /* Load likes from localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIKE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { likes: Record<string, number>; liked: string[] };
        setLikes(parsed.likes || {});
        setLikedIds(new Set(parsed.liked || []));
      }
    } catch { /* ignore */ }
  }, []);

  const persistLikes = (nextLikes: Record<string, number>, nextLiked: Set<string>) => {
    try {
      localStorage.setItem(LIKE_KEY, JSON.stringify({ likes: nextLikes, liked: [...nextLiked] }));
    } catch { /* ignore */ }
  };

  const toggleLike = (key: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      const wasLiked = next.has(key);
      if (wasLiked) next.delete(key); else next.add(key);
      setLikes((l) => {
        const nextLikes = { ...l, [key]: (l[key] || 0) + (wasLiked ? -1 : 1) };
        persistLikes(nextLikes, next);
        return nextLikes;
      });
      return next;
    });
  };

  /* Double-tap heart burst */
  const handleCardTap = (key: string) => {
    const now = Date.now();
    const last = tapRef.current;
    tapRef.current = { id: key, time: now };
    if (last && last.id === key && now - last.time < 350) {
      tapRef.current = null;
      if (!likedIds.has(key)) toggleLike(key);
      setBurst({ key, n: now });
    }
  };

  /* Fetch real data */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: rs } = await supabase
          .from("raffles")
          .select("id,title,slug,prize_title,prize_value,ticket_price,points_cost,total_tickets,sold_tickets,end_date,image_url,hide_prize_value,province")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(8);
        if (alive && rs) setRaffles(rs as FeedRaffle[]);
      } catch { /* graceful */ }

      try {
        const { data: wp } = await supabase
          .from("participants")
          .select("id,user_id,raffle_id,created_at")
          .eq("status", "winner")
          .order("created_at", { ascending: false })
          .limit(4);
        if (alive && wp && wp.length > 0) {
          const userIds = [...new Set(wp.map((w) => w.user_id))];
          const raffleIds = [...new Set(wp.map((w) => w.raffle_id))];
          const [profiles, raffleRows] = await Promise.all([
            supabase.from("profiles_public").select("user_id, display_name, avatar_url").in("user_id", userIds),
            supabase.from("raffles").select("id, prize_title, city").in("id", raffleIds),
          ]);
          const pMap = new Map((profiles.data || []).map((p: any) => [p.user_id, p]));
          const rMap = new Map((raffleRows.data || []).map((r: any) => [r.id, r]));
          const ws: FeedWinner[] = wp.map((w: any) => ({
            id: w.id,
            name: pMap.get(w.user_id)?.display_name || "Jogador",
            prize: rMap.get(w.raffle_id)?.prize_title || "Prémio incrível",
            city: rMap.get(w.raffle_id)?.city || null,
            at: w.created_at,
            avatarUrl: pMap.get(w.user_id)?.avatar_url || null,
          }));
          if (alive) setWinners(ws);
        }
      } catch { /* graceful */ }
    })();
    return () => { alive = false; };
  }, []);

  /* Interleave feed: raffle → game → winner → game → raffle … (variability loop) */
  const feed: FeedCard[] = useMemo(() => {
    const cards: FeedCard[] = [];
    const r = [...raffles];
    const w = [...winners];
    const g = [...TOP_GAMES];
    const liveCounts: Record<string, number> = {};
    const baseLive = 40 + Math.floor(Date.now() / 60000) % 90;

    let gi = 0;
    const pushGame = () => {
      if (gi < g.length) {
        const game = g[gi++];
        liveCounts[game.id] = baseLive + ((game.id.length * 37) % 60);
        cards.push({ kind: "game", key: `game-${game.id}`, game });
      }
    };

    pushGame(); // abre com um jogo — ação imediata
    let i = 0;
    while (r.length > 0 || w.length > 0 || gi < g.length) {
      if (i % 3 === 0 && r.length) {
        const raffle = r.shift()!;
        cards.push({ kind: "raffle", key: `raf-${raffle.id}`, raffle });
      } else if (i % 3 === 1 && w.length) {
        cards.push({ kind: "winner", key: `win-${w[0].id}`, winner: w.shift()! });
      } else if (r.length) {
        const raffle = r.shift()!;
        cards.push({ kind: "raffle", key: `raf-${raffle.id}`, raffle });
      } else if (gi < g.length) {
        pushGame();
      } else if (w.length) {
        cards.push({ kind: "winner", key: `win-${w[0].id}`, winner: w.shift()! });
      } else break;
      i++;
    }

    const filtered = tab === "hot"
      ? cards.filter((c) => c.kind === "raffle" && (c.raffle.total_tickets > 0 ? (c.raffle.sold_tickets / c.raffle.total_tickets) > 0.6 : false))
      : cards;
    return filtered.length > 0 ? filtered.slice(0, 12) : cards.slice(0, 12);
  }, [raffles, winners, tab]);

  const likeCountFor = (key: string) => likes[key] ?? 0;

  return (
    <section className="relative md:hidden" style={{ background: "#050508" }}>
      {/* Header estilo TikTok (inline — sticky quebrado por ancestors com transform) */}
      <div className="relative z-20 flex items-center justify-center gap-6 border-b border-white/5 bg-[#050508] px-4 py-3">
        <button
          onClick={() => setTab("foryou")}
          className={`relative text-sm font-black tracking-wide transition-colors ${tab === "foryou" ? "text-white" : "text-zinc-500"}`}
        >
          Para Ti
          {tab === "foryou" && (
            <motion.div layoutId="feed-tab" className="absolute -bottom-2 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white" />
          )}
        </button>
        <button
          onClick={() => setTab("hot")}
          className={`relative flex items-center gap-1 text-sm font-black tracking-wide transition-colors ${tab === "hot" ? "text-white" : "text-zinc-500"}`}
        >
          <Flame className="h-4 w-4 text-orange-400" /> Em Alta
          {tab === "hot" && (
            <motion.div layoutId="feed-tab" className="absolute -bottom-2 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white" />
          )}
        </button>
      </div>

      {/* Cards — feed vertical imersivo (scroll natural da página) */}
      <div>
        {feed.map((card, idx) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="px-3 pt-3"
          >
            <div
              className="relative h-[70svh] select-none overflow-hidden rounded-3xl border border-white/8 shadow-2xl"
              onClick={() => handleCardTap(card.key)}
            >
              {card.kind === "raffle" && (
                <RaffleFeedCard
                  raffle={card.raffle}
                  liked={likedIds.has(card.key)}
                  likes={likeCountFor(card.key)}
                  onLike={() => toggleLike(card.key)}
                />
              )}
              {card.kind === "game" && (
                <GameFeedCard
                  game={card.game}
                  liked={likedIds.has(card.key)}
                  likes={likeCountFor(card.key)}
                  onLike={() => toggleLike(card.key)}
                  liveCount={40 + ((card.game.id.length * 37) % 90)}
                />
              )}
              {card.kind === "winner" && (
                <WinnerFeedCard
                  winner={card.winner}
                  liked={likedIds.has(card.key)}
                  likes={likeCountFor(card.key)}
                  onLike={() => toggleLike(card.key)}
                />
              )}
              <AnimatePresence>
                {burst && burst.key === card.key && <HeartBurst burstKey={burst.n} />}
              </AnimatePresence>
            </div>

            {/* Progresso do feed */}
            <div className="flex items-center justify-center gap-1.5 py-2">
              {feed.slice(0, 12).map((c, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all"
                  style={{ width: i === idx ? 18 : 6, background: i === idx ? "#22d3ee" : "rgba(255,255,255,0.15)" }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cartão final — identidade + streak + conversão */}
      <div className="px-3 pb-6 pt-2">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 p-6 text-center" style={{ background: "linear-gradient(140deg,#101028,#1a0f2e)" }}>
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-8 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl"
            style={{ background: "rgba(168,85,247,0.4)" }}
          />
          <div className="relative">
            <div className="mb-3 text-4xl">🔥</div>
            <h3 className="text-xl font-black text-white">
              {user ? "Não perdes o teu streak!" : "O feed nunca acaba"}
            </h3>
            <p className="mx-auto mt-2 max-w-[260px] text-xs leading-relaxed text-zinc-400">
              {user
                ? "Volta amanhã para missões novas, bónus diários e novos desafios contra jogadores reais."
                : "Cria conta grátis e desbloqueia missões diárias, bónus de boas-vindas e desafios contra jogadores reais."}
            </p>
            {!user && (
              <button
                onClick={() => navigate("/register")}
                className="mt-4 w-full rounded-2xl py-3.5 text-sm font-black text-white active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg,#22d3ee,#7b2ff7)" }}
              >
                Criar Conta — 30 segundos
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
