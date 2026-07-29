import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ComponentType,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Trash2,
  Users,
  Trophy,
  Sliders,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Radio,
  Play,
  Square,
  QrCode,
  Crown,
  Activity,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Zap,
  TrendingUp,
  RotateCcw,
  Medal,
  Share2,
  MessageCircle,
  Send,
  Printer,
  FileJson,
  FileText,
  Clock,
  Flame,
  /* ───── Revolution: cockpit + host tools ───── */
  Volume2,
  VolumeX,
  Target,
  Gauge,
  Maximize2,
  Minimize2,
  Lightbulb,
  Star,
  Award,
  Layers,
  /* ───── Revolution: new feature icons ───── */
  Command,
  Search,
  Rocket,
  Brain,
  Wand2,
  Mic,
  Hand,
  Timer,
  Eye,
  EyeOff,
  Palette,
  Gauge as GaugeIcon,
  BarChart3,
  ChevronUp,
  Pause,
  CircleDot,
  Terminal,
  Cpu,
  Signal,
  ArrowUpRight,
  ArrowRight,
  CircleDollarSign,
  Gift,
  Heart,
  PartyPopper,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeaderEntry } from "./LiveLeaderboard";
import { buildOverlayUrl, getPublicBaseUrl, isOnPublicDomain } from "@/lib/publicUrl";
import { shareTo } from "@/lib/share";
import { fireConfetti } from "@/lib/celebrate";
import {
  playPopSound,
  playWinSound,
  playMilestoneChime,
  playLevelUpSound,
  playSendSound,
} from "@/lib/sounds";

/* ════════════════════════════════════════════════════════════════════════ */
/*  Props — 100% backward compatible with the previous LiveControlPanel.     */
/* ════════════════════════════════════════════════════════════════════════ */

interface Props {
  /** Active live session code (e.g. "AB12CD"). Empty string when no live is running. */
  liveCode: string;
  /** All recorded score entries for the current live. */
  entries: LeaderEntry[];
  /** Clear the leaderboard. */
  onClear: () => void;
  /** Reset game/wheel configuration to defaults. */
  onResetConfig: () => void;
  /** Whether the live session is currently broadcasting. Drives the AO VIVO badge. */
  isLive?: boolean;
  /** Live session elapsed time in seconds. Shown next to the live code. */
  elapsedSec?: number;
  /** Human-readable label of the game currently selected in the studio. */
  activeGameLabel?: string;
  /** Start a new live session. Hides the Iniciar button when omitted. */
  onStartLive?: () => void;
  /** Open the end-live confirmation flow. Hides the Encerrar button when omitted. */
  onEndLive?: () => void;
  /** Broadcast a winner to the overlay + audience. Powers the "Anunciar" button. */
  onBroadcastWinner?: (name: string, meta?: string) => void;
  /** Explicit participant invite URL. Defaults to `${origin}/lives?code=${liveCode}`. */
  inviteUrl?: string;
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  Constants & types                                                         */
/* ════════════════════════════════════════════════════════════════════════ */

const fmtTime = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const fmtTimeLong = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

/** Tailwind gradient classes for the game distribution bars — cycles through 4 brand-safe combos. */
const BAR_GRADIENTS = [
  "bg-gradient-to-r from-primary to-primary/70",
  "bg-gradient-to-r from-accent to-rose-500",
  "bg-gradient-to-r from-emerald-500 to-teal-500",
  "bg-gradient-to-r from-amber-500 to-orange-500",
];

const relTime = (ts: number): string => {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 5) return "agora";
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  return `há ${h}h`;
};

type StatItem = {
  key: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub?: string;
};

type TabKey = "studio" | "share" | "export";

type Highlight = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: "gold" | "fire" | "primary" | "emerald";
};

type Suggestion = {
  icon: ComponentType<{ className?: string }>;
  text: string;
  action?: { label: string; run: () => void };
  tone: "info" | "warn" | "success" | "fire";
};

type Achievement = {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  tone: "gold" | "fire" | "primary" | "emerald";
};

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
  disabled?: boolean;
  group: "Live" | "Partilha" | "Exportar" | "Ações";
  hotkey?: string;
};

type IconType = ComponentType<{ className?: string }>;

/* ════════════════════════════════════════════════════════════════════════ */
/*  Pure helpers — heat, quality, highlights, suggestions, hype, cohorts     */
/* ════════════════════════════════════════════════════════════════════════ */

const computeHeat = (entries: LeaderEntry[], now: number): number => {
  const last60 = entries.filter((e) => e.at >= now - 60_000).length;
  const raw = Math.log2(1 + last60) * 22;
  return Math.max(0, Math.min(100, Math.round(raw)));
};

const heatMeta = (level: number) => {
  if (level >= 80) return { label: "FOGO", tone: "text-rose-600 dark:text-rose-400", ring: "from-rose-500 to-orange-500" };
  if (level >= 55) return { label: "A ferver", tone: "text-orange-600 dark:text-orange-400", ring: "from-orange-500 to-amber-500" };
  if (level >= 30) return { label: "Quente", tone: "text-amber-600 dark:text-amber-400", ring: "from-amber-400 to-yellow-500" };
  if (level >= 12) return { label: "Morno", tone: "text-sky-600 dark:text-sky-400", ring: "from-sky-400 to-cyan-500" };
  return { label: "Frio", tone: "text-blue-600 dark:text-blue-400", ring: "from-blue-500 to-indigo-500" };
};

const computeQuality = (
  players: number,
  plays: number,
  games: number,
  heat: number,
): number => {
  if (plays === 0) return 0;
  const breadth = Math.min(30, players * 6);
  const volume = Math.min(25, plays * 1.5);
  const diversity = Math.min(20, games * 5);
  const momentum = (heat / 100) * 15;
  const retention = Math.min(10, (plays / Math.max(1, players)) * 2);
  return Math.round(breadth + volume + diversity + momentum + retention);
};

const qualityMeta = (score: number) => {
  if (score >= 80) return { label: "Excelente", tone: "text-emerald-600 dark:text-emerald-400", ring: "#10b981" };
  if (score >= 55) return { label: "Boa", tone: "text-lime-600 dark:text-lime-400", ring: "#84cc16" };
  if (score >= 30) return { label: "OK", tone: "text-amber-600 dark:text-amber-400", ring: "#f59e0b" };
  return { label: "Aquecer", tone: "text-rose-600 dark:text-rose-400", ring: "#f43f5e" };
};

const computeHighlights = (entries: LeaderEntry[]): Highlight[] => {
  if (!entries.length) return [];
  const out: Highlight[] = [];

  const top = [...entries].sort((a, b) => b.score - a.score)[0];
  out.push({
    icon: Trophy,
    label: "Maior pontuação",
    value: `${top.score} pts`,
    sub: `${top.name} · ${top.game}`,
    tone: "gold",
  });

  let curName = "";
  let curCount = 0;
  let bestName = "";
  let bestCount = 0;
  for (const e of entries) {
    if (e.name === curName) {
      curCount++;
    } else {
      curName = e.name;
      curCount = 1;
    }
    if (curCount > bestCount) {
      bestCount = curCount;
      bestName = curName;
    }
  }
  if (bestCount >= 2) {
    out.push({
      icon: Flame,
      label: "Sequência",
      value: `${bestCount} jogadas`,
      sub: bestName,
      tone: "fire",
    });
  }

  const gameMap = new Map<string, number>();
  entries.forEach((e) => gameMap.set(e.game, (gameMap.get(e.game) || 0) + 1));
  const [topGame, topGameCount] = [...gameMap.entries()].sort((a, b) => b[1] - a[1])[0];
  out.push({
    icon: Layers,
    label: "Jogo favorito",
    value: topGame,
    sub: `${topGameCount} jogadas`,
    tone: "primary",
  });

  const uniquePlayers = new Set(entries.map((e) => e.name)).size;
  if (uniquePlayers >= 3) {
    out.push({
      icon: Users,
      label: "Audiência",
      value: `${uniquePlayers} jogadores`,
      sub: "únicos nesta sessão",
      tone: "emerald",
    });
  }

  return out;
};

const highlightTone = (tone: Highlight["tone"]) => {
  switch (tone) {
    case "gold":
      return { bg: "from-amber-500/15 to-yellow-500/5", text: "text-amber-600 dark:text-amber-400", ring: "border-amber-500/30" };
    case "fire":
      return { bg: "from-orange-500/15 to-rose-500/5", text: "text-orange-600 dark:text-orange-400", ring: "border-orange-500/30" };
    case "primary":
      return { bg: "from-primary/15 to-primary/5", text: "text-primary", ring: "border-primary/30" };
    case "emerald":
      return { bg: "from-emerald-500/15 to-teal-500/5", text: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-500/30" };
  }
};

const suggestionTone = (tone: Suggestion["tone"]) => {
  switch (tone) {
    case "info":
      return { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/20" };
    case "warn":
      return { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" };
    case "success":
      return { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" };
    case "fire":
      return { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" };
  }
};

/**
 * ★ REVOLUTION: Hype Meter — detects surges in plays over the last 20s vs the
 * previous 20s window. Returns 0-100 representing "is the chat exploding right now".
 */
const computeHype = (entries: LeaderEntry[], now: number): number => {
  if (!entries.length) return 0;
  const recent = entries.filter((e) => e.at >= now - 20_000).length;
  const prior = entries.filter((e) => e.at >= now - 40_000 && e.at < now - 20_000).length;
  if (prior === 0) return recent > 0 ? Math.min(100, recent * 25) : 0;
  const ratio = recent / Math.max(1, prior);
  return Math.max(0, Math.min(100, Math.round((ratio - 1) * 80 + 20)));
};

const hypeMeta = (level: number) => {
  if (level >= 75) return { label: "EXPLOSIVO", tone: "text-rose-600 dark:text-rose-400", glow: "shadow-[0_0_24px_-4px_rgba(244,63,94,0.6)]" };
  if (level >= 45) return { label: "A subir", tone: "text-orange-600 dark:text-orange-400", glow: "shadow-[0_0_16px_-6px_rgba(249,115,22,0.5)]" };
  if (level >= 15) return { label: "Atento", tone: "text-amber-600 dark:text-amber-400", glow: "" };
  return { label: "Calmo", tone: "text-blue-600 dark:text-blue-400", glow: "" };
};

/**
 * ★ REVOLUTION: Player cohort segmentation.
 * Splits participants into tiers by play count: Lendas, Habitues, Curiosos, Novatos.
 */
type Cohort = { label: string; icon: IconType; count: number; tone: string; desc: string };

const computeCohorts = (entries: LeaderEntry[]): Cohort[] => {
  const byPlayer = new Map<string, number>();
  entries.forEach((e) => byPlayer.set(e.name, (byPlayer.get(e.name) || 0) + 1));
  const buckets = { legends: 0, regulars: 0, casuals: 0, newcomers: 0 };
  byPlayer.forEach((count) => {
    if (count >= 8) buckets.legends++;
    else if (count >= 4) buckets.regulars++;
    else if (count >= 2) buckets.casuals++;
    else buckets.newcomers++;
  });
  return [
    { label: "Lendas", icon: Crown, count: buckets.legends, tone: "text-amber-600 dark:text-amber-400", desc: "8+ jogadas" },
    { label: "Habitues", icon: Star, count: buckets.regulars, tone: "text-violet-600 dark:text-violet-400", desc: "4-7 jogadas" },
    { label: "Curiosos", icon: Users, count: buckets.casuals, tone: "text-sky-600 dark:text-sky-400", desc: "2-3 jogadas" },
    { label: "Novatos", icon: Sparkles, count: buckets.newcomers, tone: "text-emerald-600 dark:text-emerald-400", desc: "1 jogada" },
  ];
};

/**
 * ★ REVOLUTION: Trajectory forecast.
 * Predicts projected total plays at the current pace, plus ETA in seconds to reach the goal.
 */
const computeTrajectory = (
  plays: number,
  elapsedSec: number,
  goal: number,
): { projected: number; etaSec: number | null; pacePerMin: number } => {
  if (elapsedSec < 5 || plays === 0) return { projected: plays, etaSec: null, pacePerMin: 0 };
  const pacePerMin = (plays / elapsedSec) * 60;
  const projected = Math.round(plays + (pacePerMin / 60) * Math.max(0, (1800 - elapsedSec))); // project to 30min mark
  if (plays >= goal || pacePerMin <= 0) return { projected, etaSec: null, pacePerMin };
  const remaining = goal - plays;
  const etaSec = Math.round((remaining / pacePerMin) * 60);
  return { projected, etaSec, pacePerMin };
};

/**
 * ★ REVOLUTION: Achievement engine.
 * Unlocks session milestones based on entries, players, heat, and time.
 */
const computeAchievements = (
  entries: LeaderEntry[],
  players: number,
  games: number,
  heat: number,
  elapsedSec: number,
): Achievement[] => {
  const out: Achievement[] = [];
  if (entries.length >= 1)
    out.push({ id: "first-blood", icon: Zap, title: "Primeira Jogada", desc: "A live ganhou vida", tone: "primary" });
  if (players >= 5)
    out.push({ id: "crowd", icon: Users, title: "Pequena Multidão", desc: "5+ jogadores na sessão", tone: "emerald" });
  if (games >= 3)
    out.push({ id: "variety", icon: Layers, title: "Colecionador de Jogos", desc: "3+ jogos diferentes", tone: "primary" });
  if (heat >= 70)
    out.push({ id: "on-fire", icon: Flame, title: "Em Chamas", desc: "Calor ≥ 70", tone: "fire" });
  if (entries.length >= 25)
    out.push({ id: "quarter", icon: Target, title: "Marcador de Bairro", desc: "25+ jogadas", tone: "gold" });
  if (entries.length >= 50)
    out.push({ id: "half-century", icon: Trophy, title: "Meio Século", desc: "50+ jogadas", tone: "gold" });
  if (elapsedSec >= 600 && entries.length > 0)
    out.push({ id: "marathon", icon: Clock, title: "Maratona", desc: "10+ minutos ao vivo", tone: "primary" });
  if (players >= 10)
    out.push({ id: "rising-star", icon: Rocket, title: "Estrela em Ascensão", desc: "10+ jogadores", tone: "fire" });
  return out;
};

const achievementTone = (tone: Achievement["tone"]) => highlightTone(tone);

/* ════════════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                            */
/* ════════════════════════════════════════════════════════════════════════ */

/** Horizontal heat gauge with gradient fill + animated marker. */
const HeatGauge = ({ level }: { level: number }) => {
  const meta = heatMeta(level);
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold inline-flex items-center gap-1.5">
          <Fire className="h-3 w-3" /> Calor
        </span>
        <span className={`text-[11px] font-bold ${meta.tone}`}>{meta.label}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${meta.ring} transition-all duration-700 ease-out`}
          style={{ width: `${Math.max(3, level)}%` }}
        >
          {level >= 55 && <div className="absolute inset-0 bg-white/20 animate-shimmer" />}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>Frio</span>
        <span className="font-mono font-bold text-foreground/70">{level}%</span>
        <span>Fogo</span>
      </div>
    </div>
  );
};

/** Circular SVG progress ring showing the Session Quality Score. */
const QualityRing = ({ score }: { score: number }) => {
  const meta = qualityMeta(score);
  const R = 22;
  const C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-3 flex items-center gap-3 overflow-hidden">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
          <circle cx="28" cy="28" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
          <motion.circle
            cx="28"
            cy="28"
            r={R}
            fill="none"
            stroke={meta.ring}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display text-base font-bold leading-none ${meta.tone}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold inline-flex items-center gap-1.5">
          <Gauge className="h-3 w-3" /> Qualidade
        </p>
        <p className={`text-xs font-bold ${meta.tone}`}>{meta.label}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
          Volume · diversidade · momentum
        </p>
      </div>
    </div>
  );
};

/** Goal tracker — set a plays goal and watch progress fill. */
const GoalTracker = ({
  goal,
  progress,
  reached,
  onAdjust,
}: {
  goal: number;
  progress: number;
  reached: boolean;
  onAdjust: (delta: number) => void;
}) => {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/40 p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold inline-flex items-center gap-1.5">
          <Target className="h-3 w-3" /> Meta da sessão
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAdjust(-5)}
            disabled={goal <= 5}
            className="h-5 w-5 rounded-md bg-muted/60 hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center disabled:opacity-40"
            aria-label="Diminuir meta em 5"
          >
            −
          </button>
          <span className="font-mono font-bold text-xs text-foreground w-8 text-center tabular-nums">
            {goal}
          </span>
          <button
            onClick={() => onAdjust(5)}
            disabled={goal >= 200}
            className="h-5 w-5 rounded-md bg-muted/60 hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center disabled:opacity-40"
            aria-label="Aumentar meta em 5"
          >
            +
          </button>
        </div>
      </div>
      <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${
            reached
              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
              : "bg-gradient-to-r from-primary to-accent"
          }`}
        >
          {reached && <div className="absolute inset-0 bg-white/20 animate-shimmer" />}
        </motion.div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>{Math.round(progress)}% concluída</span>
        {reached ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <Check className="h-2.5 w-2.5" /> Meta atingida!
          </span>
        ) : (
          <span className="font-mono font-bold text-foreground/70">
            {Math.max(0, goal - Math.round((progress / 100) * goal))} restantes
          </span>
        )}
      </div>
    </div>
  );
};

/** Compact card showing a single highlight record. */
const HighlightCard = ({ h }: { h: Highlight }) => {
  const tone = highlightTone(h.tone);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border ${tone.ring} bg-gradient-to-br ${tone.bg} p-2.5 overflow-hidden hover-lift`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <h.icon className={`h-3 w-3 ${tone.text}`} />
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold truncate">
          {h.label}
        </span>
      </div>
      <p className="text-xs font-bold truncate" title={h.value}>
        {h.value}
      </p>
      {h.sub && (
        <p className="text-[9px] text-muted-foreground truncate" title={h.sub}>
          {h.sub}
        </p>
      )}
    </motion.div>
  );
};

/**
 * ★ REVOLUTION: Hype Meter — vertical surge detector with pulsing glow.
 */
const HypeMeter = ({ level }: { level: number }) => {
  const meta = hypeMeta(level);
  const segments = 12;
  const active = Math.round((level / 100) * segments);
  return (
    <div className={`relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-3 overflow-hidden transition-shadow ${meta.glow}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold inline-flex items-center gap-1.5">
          <Rocket className="h-3 w-3" /> Hype agora
        </span>
        <span className={`text-[11px] font-bold ${meta.tone} ${level >= 75 ? "animate-pulse" : ""}`}>
          {meta.label}
        </span>
      </div>
      <div className="flex items-end gap-0.5 h-6">
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < active;
          const color =
            i >= 9 ? "from-rose-500 to-orange-500"
            : i >= 6 ? "from-orange-500 to-amber-500"
            : i >= 3 ? "from-amber-400 to-yellow-500"
            : "from-sky-400 to-cyan-500";
          return (
            <motion.div
              key={i}
              initial={{ height: 4 }}
              animate={{
                height: isActive ? Math.max(6, (i + 1) * 2.2) : 4,
                opacity: isActive ? 1 : 0.25,
              }}
              transition={{ duration: 0.3, delay: i * 0.02 }}
              className={`flex-1 rounded-sm bg-gradient-to-t ${color}`}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>Surge (20s)</span>
        <span className="font-mono font-bold text-foreground/70">{level}%</span>
      </div>
    </div>
  );
};

/**
 * ★ REVOLUTION: Vitals Strip — ultra-compact KPI row that stays visible.
 */
const VitalsStrip = ({
  players,
  plays,
  peak,
  avg,
  heat,
  elapsedSec,
  isLive,
}: {
  players: number;
  plays: number;
  peak: number;
  avg: number;
  heat: number;
  elapsedSec?: number;
  isLive?: boolean;
}) => {
  const items = [
    { icon: Users, value: players, label: "Jog", tone: "text-primary" },
    { icon: Activity, value: plays, label: "Jogd", tone: "text-emerald-600 dark:text-emerald-400" },
    { icon: Trophy, value: peak, label: "Pico", tone: "text-amber-600 dark:text-amber-400" },
    { icon: Zap, value: avg, label: "Méd", tone: "text-violet-600 dark:text-violet-400" },
  ];
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl bg-card/60 border border-border/60 px-1.5 py-1.5 text-center backdrop-blur"
        >
          <it.icon className={`h-2.5 w-2.5 mx-auto ${it.tone} mb-0.5`} />
          <p className="font-mono text-[11px] font-bold leading-none">{it.value}</p>
          <p className="text-[8px] text-muted-foreground mt-0.5 uppercase tracking-wide">{it.label}</p>
        </div>
      ))}
      <div className="rounded-xl bg-card/60 border border-border/60 px-1.5 py-1.5 text-center backdrop-blur">
        <Clock className={`h-2.5 w-2.5 mx-auto mb-0.5 ${isLive ? "text-emerald-500" : "text-muted-foreground"}`} />
        <p className="font-mono text-[11px] font-bold leading-none">
          {typeof elapsedSec === "number" ? fmtTime(elapsedSec) : "—"}
        </p>
        <p className="text-[8px] text-muted-foreground mt-0.5 uppercase tracking-wide">Tempo</p>
      </div>
    </div>
  );
};

/**
 * ★ REVOLUTION: Cohorts panel — segments players by engagement tier.
 */
const CohortsPanel = ({ cohorts }: { cohorts: Cohort[] }) => {
  const total = cohorts.reduce((s, c) => s + c.count, 0) || 1;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2.5">
        <Users className="h-3 w-3 text-primary" /> Segmentação de audiência
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cohorts.map((c) => {
          const pct = Math.round((c.count / total) * 100);
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-muted/30 border border-border/60 p-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                  <c.icon className={`h-3 w-3 ${c.tone}`} /> {c.label}
                </span>
                <span className={`font-mono text-xs font-bold ${c.tone}`}>{c.count}</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                />
              </div>
              <p className="text-[8px] text-muted-foreground mt-1">{c.desc} · {pct}%</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * ★ REVOLUTION: Trajectory forecast — projected plays + ETA to goal.
 */
const TrajectoryPanel = ({
  trajectory,
  goal,
  plays,
}: {
  trajectory: ReturnType<typeof computeTrajectory>;
  goal: number;
  plays: number;
}) => {
  const willHitGoal = trajectory.projected >= goal;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2">
        <TrendingUp className="h-3 w-3 text-primary" /> Projeção & ETA
        <span className="ml-auto text-[9px] font-mono text-muted-foreground/70">{trajectory.pacePerMin.toFixed(1)}/min</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/30 border border-border/60 p-2">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold mb-0.5">Projetado (30min)</p>
          <p className={`font-display text-lg font-bold ${willHitGoal ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
            {trajectory.projected}
          </p>
          <p className="text-[9px] text-muted-foreground">jogadas estimadas</p>
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/60 p-2">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold mb-0.5">Meta em</p>
          {plays >= goal ? (
            <p className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
              <Check className="h-4 w-4" /> Feita
            </p>
          ) : trajectory.etaSec === null ? (
            <p className="font-display text-lg font-bold text-muted-foreground">—</p>
          ) : (
            <p className="font-display text-lg font-bold text-amber-600 dark:text-amber-400">
              {fmtTimeLong(trajectory.etaSec)}
            </p>
          )}
          <p className="text-[9px] text-muted-foreground">ao ritmo atual</p>
        </div>
      </div>
    </div>
  );
};

/**
 * ★ REVOLUTION: Achievements grid — unlocked session badges.
 */
const AchievementsGrid = ({ achievements }: { achievements: Achievement[] }) => {
  if (!achievements.length) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2.5">
        <Award className="h-3 w-3 text-amber-500" /> Conquistas
        <span className="ml-auto text-[9px] font-mono text-muted-foreground/70">{achievements.length} desbloqueadas</span>
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {achievements.map((a, i) => {
          const tone = achievementTone(a.tone);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 18 }}
              className={`group relative rounded-xl border ${tone.ring} bg-gradient-to-br ${tone.bg} p-2 flex flex-col items-center text-center cursor-default hover-lift`}
              title={`${a.title} — ${a.desc}`}
            >
              <a.icon className={`h-4 w-4 ${tone.text} mb-1`} />
              <span className="text-[8px] font-bold leading-tight">{a.title}</span>
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                <Check className="h-2 w-2 text-white" />
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * ★ REVOLUTION: Quick Dock — floating circular action cluster.
 */
const QuickDock = ({
  onCrown,
  onShare,
  onCopyCode,
  onToggleSound,
  soundOn,
  disabledCrown,
}: {
  onCrown: () => void;
  onShare: () => void;
  onCopyCode: () => void;
  onToggleSound: () => void;
  soundOn: boolean;
  disabledCrown: boolean;
}) => {
  const actions = [
    { icon: Crown, label: "Coroar", onClick: onCrown, tone: "from-amber-400 to-yellow-600 text-white", disabled: disabledCrown },
    { icon: Share2, label: "Partilhar", onClick: onShare, tone: "from-emerald-500 to-teal-600 text-white", disabled: false },
    { icon: Copy, label: "Código", onClick: onCopyCode, tone: "from-primary to-primary/70 text-primary-foreground", disabled: false },
    { icon: soundOn ? Volume2 : VolumeX, label: soundOn ? "Som on" : "Som off", onClick: onToggleSound, tone: soundOn ? "from-violet-500 to-fuchsia-600 text-white" : "from-slate-500 to-slate-600 text-white", disabled: false },
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-2.5 backdrop-blur">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2 px-1">
        <Zap className="h-3 w-3 text-accent" /> Dock rápido
      </p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            whileHover={{ scale: a.disabled ? 1 : 1.08, y: a.disabled ? 0 : -2 }}
            whileTap={{ scale: a.disabled ? 1 : 0.92 }}
            onClick={a.onClick}
            disabled={a.disabled}
            className={`relative h-12 rounded-xl bg-gradient-to-br ${a.tone} flex flex-col items-center justify-center gap-0.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-shadow hover:shadow-glow`}
            title={a.label}
            aria-label={a.label}
          >
            <a.icon className="h-4 w-4" />
            <span className="text-[8px] font-bold uppercase tracking-wide">{a.label}</span>
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-card border border-border text-[8px] font-mono font-bold flex items-center justify-center text-foreground/60">
              {i + 1}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

/**
 * ★ REVOLUTION: Command Palette (⌘K) — type to execute any panel action.
 */
const CommandPalette = ({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}) => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q) ||
        it.hint?.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((it) => {
      if (!map.has(it.group)) map.set(it.group, []);
      map.get(it.group)!.push(it);
    });
    return [...map.entries()];
  }, [filtered]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[active];
      if (it && !it.disabled) {
        it.run();
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-background/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Pesquisar ação... (ex: coroar, exportar, copiar)"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground">
                ESC
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="py-8 text-center">
                  <Search className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhuma ação encontrada para "{query}"</p>
                </div>
              ) : (
                groups.map(([group, gItems]) => (
                  <div key={group} className="mb-1.5">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold px-2 py-1">
                      {group}
                    </p>
                    {gItems.map((it) => {
                      const idx = filtered.indexOf(it);
                      const isActive = idx === active;
                      return (
                        <button
                          key={it.id}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => {
                            if (!it.disabled) {
                              it.run();
                              onClose();
                            }
                          }}
                          disabled={it.disabled}
                          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50 text-foreground"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <it.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs font-medium flex-1 truncate">{it.label}</span>
                          {it.hint && (
                            <span className="text-[9px] text-muted-foreground font-mono">{it.hint}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="px-3 py-1.5 border-t border-border/60 flex items-center justify-between text-[9px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Command className="h-3 w-3" /> Atalhos: ↑↓ navegar · Enter executar
              </span>
              <span className="font-mono">{filtered.length} ações</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ════════════════════════════════════════════════════════════════════════ */
/*  Main component                                                            */
/* ════════════════════════════════════════════════════════════════════════ */

const LiveControlPanel = ({
  liveCode,
  entries,
  onClear,
  onResetConfig,
  isLive,
  elapsedSec,
  activeGameLabel,
  onStartLive,
  onEndLive,
  onBroadcastWinner,
  inviteUrl,
}: Props) => {
  /* ───── Clipboard / UI state ───── */
  const [copiedOverlay, setCopiedOverlay] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [tab, setTab] = useState<TabKey>("studio");
  const [now, setNow] = useState<number>(Date.now());

  /* ───── Host preferences (persisted) ───── */
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try { return localStorage.getItem("lcp.soundOn") !== "0"; } catch { return true; }
  });
  const [compact, setCompact] = useState<boolean>(() => {
    try { return localStorage.getItem("lcp.compact") === "1"; } catch { return false; }
  });
  const [playsGoal, setPlaysGoal] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem("lcp.playsGoal"));
      return v >= 5 && v <= 200 ? v : 25;
    } catch { return 25; }
  });

  /* ───── REVOLUTION: command palette ───── */
  const [paletteOpen, setPaletteOpen] = useState(false);

  const prevPlayersRef = useRef<number>(0);
  const prevEntriesLenRef = useRef<number>(0);
  const prevAchievementsRef = useRef<Set<string>>(new Set());

  // Tick once per second so relative timestamps + connection freshness stay live.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Persist host prefs
  useEffect(() => {
    try { localStorage.setItem("lcp.soundOn", soundOn ? "1" : "0"); } catch {}
  }, [soundOn]);
  useEffect(() => {
    try { localStorage.setItem("lcp.compact", compact ? "1" : "0"); } catch {}
  }, [compact]);
  useEffect(() => {
    try { localStorage.setItem("lcp.playsGoal", String(playsGoal)); } catch {}
  }, [playsGoal]);

  /* ───── Sound on new entry ───── */
  useEffect(() => {
    if (!soundOn || !isLive) return;
    if (entries.length > prevEntriesLenRef.current && prevEntriesLenRef.current !== 0) {
      playPopSound();
    }
    prevEntriesLenRef.current = entries.length;
  }, [entries.length, soundOn, isLive]);

  /* ───── Milestone detection (5 / 10 / 25 / 50 / 100 unique players) ───── */
  const uniquePlayers = useMemo(() => new Set(entries.map((e) => e.name)).size, [entries]);
  useEffect(() => {
    const prev = prevPlayersRef.current;
    const milestones = [5, 10, 25, 50, 100];
    const crossed = milestones.find((m) => prev < m && uniquePlayers >= m);
    if (crossed && prev > 0) {
      if (soundOn) playMilestoneChime();
      fireConfetti({ intensity: crossed >= 25 ? "high" : "medium" });
      toast.success(`🎉 ${crossed} jogadores únicos!`, {
        description: "A audiência está a crescer — mantém o ritmo!",
      });
    }
    prevPlayersRef.current = uniquePlayers;
  }, [uniquePlayers, soundOn]);

  // ----- Derived stats ---------------------------------------------------------
  const stats = useMemo(() => {
    const players = new Set(entries.map((e) => e.name));
    const games = new Set(entries.map((e) => e.game));
    const plays = entries.length;
    const top = [...entries].sort((a, b) => b.score - a.score)[0];
    const peak = entries.reduce((m, e) => Math.max(m, e.score), 0);
    const avg = plays > 0 ? Math.round(entries.reduce((s, e) => s + e.score, 0) / plays) : 0;
    return { players: players.size, games: games.size, plays, top, peak, avg };
  }, [entries]);

  const statCards: StatItem[] = [
    { key: "players", icon: Users, label: "Jogadores", value: stats.players, sub: `${stats.games} jogos` },
    { key: "plays", icon: Activity, label: "Jogadas", value: stats.plays, sub: "total" },
    { key: "peak", icon: Trophy, label: "Pico", value: stats.peak, sub: "pontuação" },
    { key: "avg", icon: Zap, label: "Média", value: stats.avg, sub: "por jogada" },
  ];

  // ----- Heat, quality, highlights, suggestions, hype, cohorts, trajectory ----
  const heat = useMemo(() => computeHeat(entries, now), [entries, now]);
  const quality = useMemo(
    () => computeQuality(stats.players, stats.plays, stats.games, heat),
    [stats.players, stats.plays, stats.games, heat],
  );
  const highlights = useMemo(() => computeHighlights(entries), [entries]);
  const hype = useMemo(() => computeHype(entries, now), [entries, now]);
  const cohorts = useMemo(() => computeCohorts(entries), [entries]);
  const trajectory = useMemo(
    () => computeTrajectory(stats.plays, elapsedSec || 0, playsGoal),
    [stats.plays, elapsedSec, playsGoal],
  );
  const achievements = useMemo(
    () => computeAchievements(entries, stats.players, stats.games, heat, elapsedSec || 0),
    [entries, stats.players, stats.games, heat, elapsedSec],
  );

  /* ───── REVOLUTION: achievement unlock toast ───── */
  useEffect(() => {
    const current = new Set(achievements.map((a) => a.id));
    const newlyUnlocked = [...current].filter((id) => !prevAchievementsRef.current.has(id));
    if (prevAchievementsRef.current.size > 0 && newlyUnlocked.length > 0) {
      const a = achievements.find((x) => x.id === newlyUnlocked[0]);
      if (a) {
        if (soundOn) playLevelUpSound();
        fireConfetti({ intensity: "medium" });
        toast.success(`🏆 Conquista desbloqueada: ${a.title}`, {
          description: a.desc,
        });
      }
    }
    prevAchievementsRef.current = current;
  }, [achievements, soundOn]);

  const goalProgress = playsGoal > 0 ? (stats.plays / playsGoal) * 100 : 0;
  const goalReached = stats.plays >= playsGoal && playsGoal > 0;

  // Fire a toast + sound when the goal is first reached
  const prevGoalReachedRef = useRef<boolean>(false);
  useEffect(() => {
    if (goalReached && !prevGoalReachedRef.current) {
      if (soundOn) playWinSound();
      fireConfetti({ intensity: "high" });
      toast.success("🎯 Meta atingida!", {
        description: `${stats.plays} jogadas registadas. Podes aumentar a meta ou continuar.`,
      });
    }
    prevGoalReachedRef.current = goalReached;
  }, [goalReached, stats.plays, soundOn]);

  // ----- Top 3 podium ---------------------------------------------------------
  const podium = useMemo(() => {
    const byPlayer = new Map<string, number>();
    entries.forEach((e) => byPlayer.set(e.name, Math.max(byPlayer.get(e.name) || 0, e.score)));
    return [...byPlayer.entries()]
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [entries]);

  // ----- Game distribution (top 4 by plays) -----------------------------------
  const gameStats = useMemo(() => {
    const m = new Map<string, number>();
    entries.forEach((e) => m.set(e.game, (m.get(e.game) || 0) + 1));
    return [...m.entries()]
      .map(([game, count]) => ({ game, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [entries]);
  const maxGameCount = gameStats[0]?.count || 1;

  // ----- Engagement timeline (plays per minute, last 10 buckets) -------------
  const timeline = useMemo(() => {
    if (!entries.length) return [] as { t: string; plays: number }[];
    const bucketMs = 60_000;
    const nowTs = Date.now();
    const buckets: { t: string; plays: number }[] = [];
    for (let i = 9; i >= 0; i--) {
      const start = nowTs - i * bucketMs;
      const end = start + bucketMs;
      const plays = entries.filter((e) => e.at >= start && e.at < end).length;
      const d = new Date(start);
      buckets.push({
        t: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
        plays,
      });
    }
    return buckets;
  }, [entries, now]);
  const peakPlays = timeline.reduce((m, b) => Math.max(m, b.plays), 0);

  // ----- Recent activity feed (last 5, newest first) ------------------------
  const recent = useMemo(
    () => [...entries].sort((a, b) => b.at - a.at).slice(0, 5),
    [entries],
  );

  // ----- Connection freshness (time since last entry) -----------------------
  const lastEntryAt = entries.length ? Math.max(...entries.map((e) => e.at)) : 0;
  const staleSec = lastEntryAt ? Math.floor((now - lastEntryAt) / 1000) : Infinity;
  const connection =
    !isLive
      ? "idle"
      : staleSec < 30
        ? "live"
        : staleSec < 90
          ? "warm"
          : "stale";
  const connMeta = {
    live: { dot: "bg-emerald-500", label: "Tempo real", color: "text-emerald-600 dark:text-emerald-400" },
    warm: { dot: "bg-amber-500", label: "Aquecendo", color: "text-amber-600 dark:text-amber-400" },
    stale: { dot: "bg-rose-500", label: "Inativo", color: "text-rose-600 dark:text-rose-400" },
    idle: { dot: "bg-slate-400", label: "Em espera", color: "text-muted-foreground" },
  }[connection];

  // ----- URLs -----------------------------------------------------------------
  const overlayUrl = buildOverlayUrl(liveCode);
  const baseUrl = getPublicBaseUrl();
  const onPublic = isOnPublicDomain();
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const participantUrl =
    inviteUrl ||
    (liveCode ? `${currentOrigin || baseUrl}/lives?code=${encodeURIComponent(liveCode)}` : "");

  // ----- QR code (regenerates when participantUrl changes) --------------------
  useEffect(() => {
    if (!showQR || !participantUrl) {
      setQrUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(participantUrl, {
      width: 256,
      margin: 1,
      color: { dark: "#0b1220", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [showQR, participantUrl]);

  // ----- Actions --------------------------------------------------------------
  const exportCSV = useCallback(() => {
    if (!entries.length) {
      toast.error("Sem jogadores para exportar.");
      return;
    }
    const header = "name,score,game,timestamp\n";
    const rows = entries
      .map((e) => `"${e.name}",${e.score},"${e.game}",${new Date(e.at).toISOString()}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-${liveCode || "session"}-participantes.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${entries.length} participantes exportados (CSV).`);
  }, [entries, liveCode]);

  const exportJSON = useCallback(() => {
    if (!entries.length) {
      toast.error("Sem jogadores para exportar.");
      return;
    }
    const payload = {
      liveCode,
      exportedAt: new Date().toISOString(),
      stats: { players: stats.players, plays: stats.plays, peak: stats.peak, avg: stats.avg, quality, heat, hype, trajectory },
      podium,
      gameDistribution: gameStats,
      highlights,
      achievements,
      entries: entries.map((e) => ({ ...e, atISO: new Date(e.at).toISOString() })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-${liveCode || "session"}-relatorio.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório JSON exportado.");
  }, [entries, liveCode, stats, quality, heat, hype, trajectory, podium, gameStats, highlights, achievements]);

  const printReport = useCallback(() => {
    if (!entries.length) {
      toast.error("Sem jogadores para imprimir.");
      return;
    }
    const rows = [...entries]
      .sort((a, b) => b.score - a.score)
      .map(
        (e, i) =>
          `<tr><td>${i + 1}</td><td>${e.name.replace(/[<>&]/g, "")}</td><td>${e.game.replace(/[<>&]/g, "")}</td><td>${e.score}</td><td>${new Date(e.at).toLocaleString("pt-MZ")}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Live ${liveCode} — Relatório</title>
      <style>
        body{font-family:Inter,system-ui,sans-serif;padding:32px;color:#0b1220}
        h1{font-family:'Space Grotesk',sans-serif;margin:0 0 4px}
        .muted{color:#64748b;font-size:13px;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .stat{border:1px solid #e2e8f0;border-radius:12px;padding:12px}
        .stat .l{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;font-weight:700}
        .stat .v{font-size:24px;font-weight:700;font-family:'Space Grotesk',sans-serif}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0}
        th{background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
        .podium{display:flex;gap:8px;margin-bottom:24px}
        .pod{flex:1;border-radius:12px;padding:12px;border:1px solid #e2e8f0}
        .pod.g{background:#fef3c7;border-color:#fbbf24}
        .pod.s{background:#f1f5f9;border-color:#94a3b8}
        .pod.b{background:#fed7aa;border-color:#fb923c}
        .pod .r{font-size:10px;text-transform:uppercase;font-weight:700;color:#64748b}
        .pod .n{font-weight:700;margin-top:4px}
        .pod .s{font-size:18px;font-weight:700;font-family:'Space Grotesk',sans-serif}
      </style></head>
      <body>
        <h1>Relatório da Live ${liveCode || ""}</h1>
        <div class="muted">Exportado em ${new Date().toLocaleString("pt-MZ")} · ${entries.length} jogadas · ${stats.players} jogadores únicos · qualidade ${quality}/100</div>
        <div class="grid">
          <div class="stat"><div class="l">Jogadores</div><div class="v">${stats.players}</div></div>
          <div class="stat"><div class="l">Jogadas</div><div class="v">${stats.plays}</div></div>
          <div class="stat"><div class="l">Pico</div><div class="v">${stats.peak}</div></div>
          <div class="stat"><div class="l">Média</div><div class="v">${stats.avg}</div></div>
        </div>
        <div class="podium">
          ${podium[0] ? `<div class="pod g"><div class="r">🥇 1º</div><div class="n">${podium[0].name}</div><div class="s">${podium[0].score} pts</div></div>` : ""}
          ${podium[1] ? `<div class="pod s"><div class="r">🥈 2º</div><div class="n">${podium[1].name}</div><div class="s">${podium[1].score} pts</div></div>` : ""}
          ${podium[2] ? `<div class="pod b"><div class="r">🥉 3º</div><div class="n">${podium[2].name}</div><div class="s">${podium[2].score} pts</div></div>` : ""}
        </div>
        <table><thead><tr><th>#</th><th>Jogador</th><th>Jogo</th><th>Pontos</th><th>Quando</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Bloqueador de pop-ups ativo. Permita pop-ups para imprimir.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  }, [entries, liveCode, stats, quality, podium]);

  const copyAsMarkdown = useCallback(async () => {
    if (!entries.length) {
      toast.error("Sem jogadores para copiar.");
      return;
    }
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    const md = [
      `# Leaderboard da Live ${liveCode || ""}`,
      "",
      `> ${entries.length} jogadas · ${stats.players} jogadores · qualidade ${quality}/100 · exportado em ${new Date().toLocaleString("pt-MZ")}`,
      "",
      "| # | Jogador | Jogo | Pontos |",
      "| --- | --- | --- | --- |",
      ...sorted.map((e, i) => `| ${i + 1} | ${e.name} | ${e.game} | ${e.score} |`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 1500);
      toast.success("Tabela Markdown copiada!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }, [entries, liveCode, stats, quality]);

  const copyOverlay = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopiedOverlay(true);
      setTimeout(() => setCopiedOverlay(false), 1500);
      toast.success("URL do overlay copiada!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }, [overlayUrl]);

  const copyInvite = useCallback(async () => {
    if (!participantUrl) {
      toast.error("Inicie a live para gerar o link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(participantUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 1500);
      toast.success("Link de participação copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }, [participantUrl]);

  const copyCode = useCallback(async () => {
    if (!liveCode) {
      toast.error("Sem código ativo.");
      return;
    }
    try {
      await navigator.clipboard.writeText(liveCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
      if (soundOn) playSendSound();
      toast.success("Código copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }, [liveCode, soundOn]);

  const crownLeader = useCallback(() => {
    if (!stats.top) {
      toast.error("Sem líder para coroar.");
      return;
    }
    fireConfetti({ intensity: "high" });
    if (soundOn) playWinSound();
    onBroadcastWinner?.(stats.top.name, `Coroado como líder · ${stats.top.score} pts em ${stats.top.game}`);
    toast.success(`"${stats.top.name}" coroado como vencedor!`);
  }, [stats.top, onBroadcastWinner, soundOn]);

  const shareText = `Estou ao vivo no Bateu! Entra na live ${liveCode ? `com o código ${liveCode} ` : ""}e joga comigo 🎮🔥`;

  const confirmClear = useCallback(() => {
    if (!entries.length) return;
    onClear();
    toast.success("Leaderboard limpo.");
  }, [entries.length, onClear]);

  const podiumTone = (i: number) =>
    i === 0
      ? "from-amber-400 to-yellow-600 text-white"
      : i === 1
        ? "from-slate-300 to-slate-500 text-white"
        : "from-amber-700 to-orange-800 text-white";

  const adjustGoal = useCallback((delta: number) => {
    setPlaysGoal((g) => Math.max(5, Math.min(200, g + delta)));
  }, []);

  const goToShare = useCallback(() => setTab("share"), []);
  const goToExport = useCallback(() => setTab("export"), []);
  const goToStudio = useCallback(() => setTab("studio"), []);

  /* ───── REVOLUTION: command palette items ───── */
  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    if (onStartLive && !isLive)
      items.push({ id: "start-live", label: "Iniciar Live", icon: Play, run: () => onStartLive(), group: "Live", hotkey: "L" });
    if (onEndLive && isLive)
      items.push({ id: "end-live", label: "Encerrar Live", icon: Square, run: () => onEndLive(), group: "Live", hotkey: "E" });
    if (stats.top && onBroadcastWinner)
      items.push({ id: "crown", label: "Coroar líder atual", icon: Crown, run: crownLeader, group: "Live", hotkey: "1" });
    items.push({ id: "copy-code", label: "Copiar código da live", icon: Copy, run: copyCode, disabled: !liveCode, group: "Partilha", hotkey: "C" });
    items.push({ id: "copy-invite", label: "Copiar link de participação", icon: Share2, run: copyInvite, disabled: !participantUrl, group: "Partilha" });
    items.push({ id: "copy-overlay", label: "Copiar URL do overlay (OBS)", icon: ExternalLink, run: copyOverlay, group: "Partilha" });
    items.push({ id: "toggle-qr", label: showQR ? "Ocultar QR code" : "Mostrar QR participante", icon: QrCode, run: () => { setShowQR((v) => !v); setTab("share"); }, group: "Partilha" });
    items.push({ id: "share-wa", label: "Partilhar no WhatsApp", icon: MessageCircle, run: () => { setTab("share"); if (participantUrl) shareTo("whatsapp", { title: "Bateu Live", text: shareText, url: participantUrl }); }, disabled: !participantUrl, group: "Partilha" });
    items.push({ id: "share-fb", label: "Partilhar no Facebook", icon: Share2, run: () => { setTab("share"); if (participantUrl) shareTo("facebook", { title: "Bateu Live", text: shareText, url: participantUrl }); }, disabled: !participantUrl, group: "Partilha" });
    items.push({ id: "export-csv", label: "Exportar participantes (CSV)", icon: FileText, run: exportCSV, disabled: !entries.length, group: "Exportar" });
    items.push({ id: "export-json", label: "Exportar relatório (JSON)", icon: FileJson, run: exportJSON, disabled: !entries.length, group: "Exportar" });
    items.push({ id: "export-print", label: "Imprimir / PDF", icon: Printer, run: printReport, disabled: !entries.length, group: "Exportar" });
    items.push({ id: "export-md", label: "Copiar tabela Markdown", icon: Copy, run: copyAsMarkdown, disabled: !entries.length, group: "Exportar" });
    items.push({ id: "tab-studio", label: "Ir para o Estúdio", icon: Activity, run: goToStudio, group: "Ações", hotkey: "S" });
    items.push({ id: "tab-share", label: "Ir para Partilha", icon: Share2, run: goToShare, group: "Ações", hotkey: "P" });
    items.push({ id: "tab-export", label: "Ir para Exportar", icon: Download, run: goToExport, group: "Ações", hotkey: "X" });
    items.push({ id: "toggle-sound", label: soundOn ? "Silenciar efeitos sonoros" : "Ativar efeitos sonoros", icon: soundOn ? VolumeX : Volume2, run: () => setSoundOn((v) => !v), group: "Ações", hotkey: "M" });
    items.push({ id: "toggle-compact", label: compact ? "Modo detalhado" : "Modo compacto", icon: compact ? Maximize2 : Minimize2, run: () => setCompact((v) => !v), group: "Ações", hotkey: "K" });
    items.push({ id: "goal-up", label: "Aumentar meta em 5", icon: Target, run: () => adjustGoal(5), group: "Ações" });
    items.push({ id: "goal-down", label: "Diminuir meta em 5", icon: Target, run: () => adjustGoal(-5), group: "Ações" });
    items.push({ id: "clear-board", label: "Limpar leaderboard", icon: Trash2, run: confirmClear, disabled: !entries.length, group: "Ações" });
    items.push({ id: "reset-config", label: "Repor configurações do jogo", icon: RotateCcw, run: onResetConfig, group: "Ações" });
    return items;
  }, [
    onStartLive, onEndLive, onBroadcastWinner, isLive, stats.top, crownLeader,
    copyCode, copyInvite, copyOverlay, liveCode, participantUrl, showQR,
    shareText, exportCSV, exportJSON, printReport, copyAsMarkdown, entries.length,
    goToStudio, goToShare, goToExport, soundOn, compact, adjustGoal, confirmClear, onResetConfig,
  ]);

  /* ───── REVOLUTION: keyboard shortcuts ───── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K opens the palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      // Don't trigger hotkeys when typing in inputs or when palette is open
      const target = e.target as HTMLElement;
      if (paletteOpen) return;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      switch (k) {
        case "1":
          if (stats.top && onBroadcastWinner) { e.preventDefault(); crownLeader(); }
          break;
        case "c":
          if (liveCode) { e.preventDefault(); copyCode(); }
          break;
        case "s":
          e.preventDefault(); setTab("studio"); break;
        case "p":
          e.preventDefault(); setTab("share"); break;
        case "x":
          e.preventDefault(); setTab("export"); break;
        case "m":
          e.preventDefault(); setSoundOn((v) => !v); break;
        case "l":
          if (onStartLive && !isLive) { e.preventDefault(); onStartLive(); }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen, stats.top, onBroadcastWinner, crownLeader, liveCode, copyCode, onStartLive, isLive]);

  /* ───── REVOLUTION: smart suggestions with action buttons ───── */
  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = [];
    if (!isLive) {
      out.push({
        icon: Play,
        text: "Inicia a live para começar a registar pontuações e gerar o código de participação.",
        action: onStartLive ? { label: "Iniciar", run: onStartLive } : undefined,
        tone: "info",
      });
      return out;
    }
    if (stats.players < 3) {
      out.push({
        icon: Share2,
        text: "Convida mais participantes — partilha o código ou o QR no WhatsApp e Facebook.",
        action: { label: "Partilhar", run: goToShare },
        tone: "info",
      });
    }
    if (stats.games <= 1 && entries.length > 3) {
      out.push({
        icon: Layers,
        text: "Alternar jogos mantém a audiência envolvida. Experimenta um Quiz Battle ou Tap Battle.",
        tone: "warn",
      });
    }
    if (heat >= 70) {
      out.push({
        icon: Crown,
        text: "Está a pegar fogo! Coroa o líder atual para capitalizar o momento.",
        action: onBroadcastWinner && stats.top ? { label: "Coroar", run: crownLeader } : undefined,
        tone: "fire",
      });
    } else if (heat < 20 && entries.length > 0) {
      out.push({
        icon: Zap,
        text: "Engajamento baixo. Faz uma pergunta ao chat ou lança um desafio rápido.",
        tone: "warn",
      });
    }
    if ((elapsedSec || 0) >= 600 && entries.length > 0) {
      out.push({
        icon: Award,
        text: "Já vais em 10 min. Considera anunciar um prémio para reter a audiência.",
        tone: "success",
      });
    }
    if (hype >= 60) {
      out.push({
        icon: Rocket,
        text: `Hype a ${hype}%! Momento perfeito para um desafio surpresa ou rodada bónus.`,
        tone: "fire",
      });
    }
    if (entries.length === 0) {
      out.push({
        icon: Lightbulb,
        text: "Sem jogadas ainda. Partilha o código e joga uma rodada rápida para aquecer.",
        action: { label: "Partilhar", run: goToShare },
        tone: "info",
      });
    }
    return out.slice(0, 4);
  }, [isLive, stats.players, stats.games, stats.top, entries.length, heat, hype, elapsedSec, onStartLive, onBroadcastWinner, crownLeader, goToShare]);

  // ===========================================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="premium-card gradient-border rounded-3xl overflow-hidden relative"
    >
      <div className="absolute inset-0 mesh-gradient-animated opacity-60 pointer-events-none" />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commandItems} />

      <div className="relative px-4 py-3.5 border-b border-border/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sliders className="h-4 w-4 text-primary" />
            {isLive && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 pulse-live ring-2 ring-card" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold leading-tight truncate flex items-center gap-1.5">
              Painel da Live
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[8px] font-mono px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                <Cpu className="h-2 w-2" /> v2
              </span>
            </h3>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Cockpit do streamer · co-piloto IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setPaletteOpen(true)}
            className="h-7 px-2 rounded-lg flex items-center justify-center gap-1 bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
            aria-label="Abrir paleta de comandos (⌘K)"
            title="Paleta de comandos (⌘K / Ctrl+K)"
          >
            <Command className="h-3.5 w-3.5" />
            <kbd className="text-[9px] font-mono font-bold hidden sm:inline">⌘K</kbd>
          </button>
          <button
            onClick={() => setSoundOn((v) => !v)}
            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
              soundOn
                ? "bg-primary/15 text-primary hover:bg-primary/25"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
            aria-label={soundOn ? "Silenciar efeitos" : "Ativar efeitos sonoros"}
            title={soundOn ? "Efeitos sonoros ativos (M)" : "Efeitos sonoros desativados (M)"}
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setCompact((v) => !v)}
            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
              compact
                ? "bg-primary/15 text-primary hover:bg-primary/25"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
            aria-label={compact ? "Modo detalhado" : "Modo compacto"}
            title={compact ? "Modo compacto ativo" : "Modo detalhado"}
          >
            {compact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
          {isLive && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold"
              title={`Última jogada há ${lastEntryAt ? relTime(lastEntryAt) : "—"}`}
            >
              <span className={`relative flex h-2 w-2 ${connMeta.dot}`}>
                {connection === "live" && (
                  <span className={`absolute inline-flex h-full w-full rounded-full ${connMeta.dot} opacity-60 animate-ping`} />
                )}
              </span>
              <span className={connMeta.color + " hidden sm:inline"}>{connMeta.label}</span>
            </span>
          )}
          {isLive ? (
            <span className="badge-premium inline-flex items-center gap-1 text-[10px] font-bold">
              <Radio className="h-3 w-3 pulse-live" /> AO VIVO
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground font-medium">Em espera</span>
          )}
        </div>
      </div>

      <div className="relative p-4 space-y-3.5">
        <VitalsStrip
          players={stats.players}
          plays={stats.plays}
          peak={stats.peak}
          avg={stats.avg}
          heat={heat}
          elapsedSec={elapsedSec}
          isLive={isLive}
        />

        <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-border/60 p-3 flex items-center gap-3">
          <button
            onClick={copyCode}
            disabled={!liveCode}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold text-base shrink-0 hover:opacity-90 disabled:opacity-40 transition-opacity"
            title="Copiar código (C)"
          >
            {liveCode ? liveCode.charAt(0).toUpperCase() : "—"}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold leading-tight">
              Código da Live
            </p>
            <p className="font-mono font-bold text-sm truncate">{liveCode || "Sem código"}</p>
          </div>
          {isLive && typeof elapsedSec === "number" && (
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold leading-tight flex items-center gap-1 justify-end">
                <Clock className="h-2.5 w-2.5" /> Duração
              </p>
              <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {fmtTime(elapsedSec)}
              </p>
            </div>
          )}
          <button
            onClick={copyInvite}
            disabled={!participantUrl}
            className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-40"
            aria-label="Copiar link de participação"
          >
            {copiedInvite ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {(onStartLive || onEndLive) && (
          <div className="flex flex-wrap gap-2">
            {isLive ? (
              onEndLive && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onEndLive}
                  className="btn-premium flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold"
                >
                  <Square className="h-3.5 w-3.5 fill-current" /> Encerrar Live
                </motion.button>
              )
            ) : (
              onStartLive && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onStartLive}
                  className="btn-premium flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Iniciar Live
                </motion.button>
              )
            )}
            {stats.top && onBroadcastWinner && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={crownLeader}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 text-white text-xs font-bold shadow-glow"
                title="Coroar líder e disparar confetes (1)"
              >
                <Crown className="h-3.5 w-3.5" /> Coroar
              </motion.button>
            )}
            {activeGameLabel && (
              <div className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-secondary text-foreground text-[11px] font-medium max-w-[60%]">
                <Activity className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate" title={activeGameLabel}>
                  {activeGameLabel}
                </span>
              </div>
            )}
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
          <TabsList className="grid grid-cols-3 h-9 w-full bg-muted/50 p-1">
            <TabsTrigger value="studio" className="text-[11px] gap-1">
              <Activity className="h-3 w-3" /> Estúdio
            </TabsTrigger>
            <TabsTrigger value="share" className="text-[11px] gap-1">
              <Share2 className="h-3 w-3" /> Partilha
            </TabsTrigger>
            <TabsTrigger value="export" className="text-[11px] gap-1">
              <Download className="h-3 w-3" /> Exportar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="studio" className="mt-3 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <HeatGauge level={heat} />
              <HypeMeter level={hype} />
              <QualityRing score={quality} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {statCards.map((s, i) => (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-3 relative overflow-hidden hover-lift"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
                      {s.label}
                    </span>
                  </div>
                  <motion.p
                    key={s.value}
                    initial={{ scale: 0.7, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="font-display text-2xl font-bold text-gradient-primary leading-none"
                  >
                    {s.value}
                  </motion.p>
                  {s.sub && <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>}
                </motion.div>
              ))}
            </div>

            <GoalTracker
              goal={playsGoal}
              progress={goalProgress}
              reached={goalReached}
              onAdjust={adjustGoal}
            />

            {!compact && entries.length > 0 && (
              <TrajectoryPanel trajectory={trajectory} goal={playsGoal} plays={stats.plays} />
            )}

            {entries.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-primary" /> Engajamento (10 min)
                  </p>
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Flame className="h-3 w-3 text-accent" /> pico {peakPlays}/min
                  </span>
                </div>
                <div className="h-16 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="t" hide />
                      <RTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 11,
                          padding: "4px 8px",
                        }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        formatter={(v: number) => [`${v} jogadas`, "Engajamento"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="plays"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#engagementGradient)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {!compact && entries.length > 0 && (
              <CohortsPanel cohorts={cohorts} />
            )}

            {!compact && podium.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2.5">
                  <Medal className="h-3 w-3 text-amber-500" /> Pódio
                </p>
                <div className="grid grid-cols-3 gap-2 items-end">
                  {[
                    { p: podium[1], rank: 2, h: "h-12", icon: "🥈" },
                    { p: podium[0], rank: 1, h: "h-16", icon: "🥇" },
                    { p: podium[2], rank: 3, h: "h-10", icon: "🥉" },
                  ].map(({ p, rank, h, icon }) =>
                    p ? (
                      <motion.div
                        key={rank}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: rank * 0.05 }}
                        className="flex flex-col items-center gap-1"
                      >
                        <span className="text-base leading-none">{icon}</span>
                        <span className="text-[11px] font-bold truncate max-w-full" title={p.name}>
                          {p.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{p.score} pts</span>
                        <div
                          className={`w-full ${h} rounded-t-lg bg-gradient-to-t ${podiumTone(rank - 1)} flex items-start justify-center pt-1.5`}
                        >
                          <span className="font-display text-[10px] font-bold opacity-80">#{rank}</span>
                        </div>
                      </motion.div>
                    ) : (
                      <div key={rank} />
                    ),
                  )}
                </div>
              </div>
            )}

            {!compact && achievements.length > 0 && (
              <AchievementsGrid achievements={achievements} />
            )}

            <AnimatePresence>
              {stats.top && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="relative rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-transparent p-3 overflow-hidden"
                >
                  <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
                  <div className="relative flex items-center gap-3">
                    <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-display font-bold text-lg shadow-lg shrink-0">
                      {stats.top.name.charAt(0).toUpperCase()}
                      <Crown className="absolute -top-2 -right-1 h-4 w-4 text-amber-500 drop-shadow" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
                        <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-bold">
                          Líder atual
                        </p>
                      </div>
                      <p className="text-sm font-bold truncate">{stats.top.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {stats.top.score} pts · {stats.top.game}
                      </p>
                    </div>
                    {onBroadcastWinner && (
                      <button
                        onClick={() =>
                          onBroadcastWinner(
                            stats.top!.name,
                            `Líder atual · ${stats.top!.score} pts em ${stats.top!.game}`,
                          )
                        }
                        className="px-2.5 py-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 inline-flex items-center gap-1 shrink-0 transition-colors"
                        aria-label="Anunciar líder no overlay"
                      >
                        <Zap className="h-3 w-3" /> Anunciar
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!compact && highlights.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2">
                  <Star className="h-3 w-3 text-amber-500" /> Momentos da sessão
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {highlights.map((h, i) => (
                    <HighlightCard key={`${h.label}-${i}`} h={h} />
                  ))}
                </div>
              </div>
            )}

            {!compact && gameStats.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-primary" /> Distribuição de jogos
                  </p>
                  <span className="text-[10px] text-muted-foreground">{entries.length} jogadas</span>
                </div>
                <div className="space-y-1.5">
                  {gameStats.map((g, i) => (
                    <div key={g.game} className="flex items-center gap-2">
                      <span className="text-[11px] text-foreground truncate w-24 shrink-0" title={g.game}>
                        {g.game}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(g.count / maxGameCount) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
                          className={`h-full rounded-full ${BAR_GRADIENTS[i % BAR_GRADIENTS.length]}`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">
                        {g.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recent.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2">
                  <Activity className="h-3 w-3 text-primary" /> Atividade recente
                </p>
                <ul className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {recent.map((e, i) => (
                      <motion.li
                        key={e.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="font-medium text-foreground truncate flex-1">{e.name}</span>
                        <span className="text-muted-foreground truncate max-w-[80px]" title={e.game}>
                          {e.game}
                        </span>
                        <span className="font-mono font-bold text-primary">{e.score}</span>
                        <span className="text-[9px] text-muted-foreground w-12 text-right shrink-0">
                          {relTime(e.at)}
                        </span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card/40 to-accent/5 p-3 space-y-1.5 overflow-hidden">
                <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
                <p className="text-[10px] uppercase tracking-wider text-primary font-bold flex items-center gap-1.5 mb-1">
                  <Brain className="h-3 w-3" /> Co-Piloto IA
                  <span className="ml-auto text-[9px] font-mono text-muted-foreground/70 normal-case tracking-normal">
                    {suggestions.length} sugestões
                  </span>
                </p>
                <AnimatePresence initial={false}>
                  {suggestions.map((s, i) => {
                    const tone = suggestionTone(s.tone);
                    return (
                      <motion.div
                        key={`sug-${i}-${s.text.slice(0, 20)}`}
                        layout
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                        className={`flex items-start gap-2 rounded-lg ${tone.bg} ${tone.border} border px-2.5 py-2`}
                      >
                        <s.icon className={`h-3.5 w-3.5 ${tone.text} shrink-0 mt-0.5`} />
                        <p className="text-[11px] text-foreground leading-relaxed flex-1">{s.text}</p>
                        {s.action && (
                          <button
                            onClick={s.action.run}
                            className={`shrink-0 px-2 py-1 rounded-md bg-background/80 ${tone.text} text-[10px] font-bold border ${tone.border} hover:bg-background transition-colors inline-flex items-center gap-0.5`}
                          >
                            {s.action.label}
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            <QuickDock
              onCrown={crownLeader}
              onShare={() => { setTab("share"); if (participantUrl) shareTo("whatsapp", { title: "Bateu Live", text: shareText, url: participantUrl }); }}
              onCopyCode={copyCode}
              onToggleSound={() => setSoundOn((v) => !v)}
              soundOn={soundOn}
              disabledCrown={!stats.top || !onBroadcastWinner}
            />

            {entries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Sem jogadas ainda. Inicia a live e partilha o código para começar!
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-2 inline-flex items-center gap-1 justify-center">
                  <Command className="h-3 w-3" /> Dica: prime <kbd className="font-mono px-1 py-0.5 rounded bg-muted/60 border border-border">⌘K</kbd> para abrir a paleta de comandos
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="share" className="mt-3 space-y-2.5">
            <a
              href={overlayUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-premium group flex items-center justify-between w-full px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold"
            >
              <span className="inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Abrir Overlay (OBS)
              </span>
              <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                  URL do overlay (OBS)
                </p>
                <button
                  onClick={copyOverlay}
                  className="text-[10px] font-bold inline-flex items-center gap-1 text-primary hover:opacity-80"
                >
                  {copiedOverlay ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copiar
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] font-mono break-all text-foreground/80 mt-0.5">{overlayUrl}</p>
            </div>

            {participantUrl && (
              <div className="rounded-xl bg-muted/40 border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">
                    Link de participação
                  </p>
                  <button
                    onClick={copyInvite}
                    className="text-[10px] font-bold inline-flex items-center gap-1 text-primary hover:opacity-80"
                  >
                    {copiedInvite ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copiar
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-mono break-all text-foreground/80 mt-0.5">{participantUrl}</p>
              </div>
            )}

            <button
              onClick={() => setShowQR((v) => !v)}
              className={`flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-[11px] font-medium transition-colors ${
                showQR ? "bg-primary/15 text-primary" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
              aria-expanded={showQR}
            >
              <QrCode className="h-3.5 w-3.5" /> {showQR ? "Ocultar QR" : "Mostrar QR participante"}
            </button>

            <AnimatePresence>
              {showQR && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-border bg-white p-3 flex flex-col items-center gap-2">
                    {qrUrl ? (
                      <img src={qrUrl} alt="QR Code de participação" className="w-40 h-40" />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-muted-foreground">
                        <QrCode className="h-8 w-8 animate-pulse" />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground text-center max-w-[240px]">
                      Aponte a câmara para participar na live{" "}
                      <span className="font-mono font-bold text-foreground">{liveCode || "—"}</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {participantUrl && (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2">
                  <Share2 className="h-3 w-3 text-primary" /> Partilhar convite
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => shareTo("whatsapp", { title: "Bateu Live", text: shareText, url: participantUrl })}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    aria-label="Partilhar no WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-[9px] font-bold">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => shareTo("telegram", { title: "Bateu Live", text: shareText, url: participantUrl })}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
                    aria-label="Partilhar no Telegram"
                  >
                    <Send className="h-4 w-4" />
                    <span className="text-[9px] font-bold">Telegram</span>
                  </button>
                  <button
                    onClick={() => shareTo("facebook", { title: "Bateu Live", text: shareText, url: participantUrl })}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 transition-colors"
                    aria-label="Partilhar no Facebook"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="text-[9px] font-bold">Facebook</span>
                  </button>
                  <button
                    onClick={() => shareTo("native", { title: "Bateu Live", text: shareText, url: participantUrl })}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    aria-label="Partilha nativa"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="text-[9px] font-bold">Mais</span>
                  </button>
                </div>
                {copiedCode && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 text-center mt-2 inline-flex items-center gap-1 w-full justify-center">
                    <Check className="h-3 w-3" /> Código copiado!
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="mt-3 space-y-2.5">
            <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2">
                <Download className="h-3 w-3 text-primary" /> Formatos de exportação
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportCSV}
                  disabled={!entries.length}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-bold">CSV</span>
                  <span className="text-[9px] text-muted-foreground">Excel/Sheets</span>
                </button>
                <button
                  onClick={exportJSON}
                  disabled={!entries.length}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  <FileJson className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-[10px] font-bold">JSON</span>
                  <span className="text-[9px] text-muted-foreground">Relatório completo</span>
                </button>
                <button
                  onClick={printReport}
                  disabled={!entries.length}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  <Printer className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span className="text-[10px] font-bold">Imprimir</span>
                  <span className="text-[9px] text-muted-foreground">PDF/Papel</span>
                </button>
                <button
                  onClick={copyAsMarkdown}
                  disabled={!entries.length}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  {copiedMd ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  )}
                  <span className="text-[10px] font-bold">Markdown</span>
                  <span className="text-[9px] text-muted-foreground">Copiar tabela</span>
                </button>
              </div>
              {!entries.length && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  As exportações ficam disponíveis após a primeira jogada.
                </p>
              )}
            </div>

            {entries.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card/40 to-accent/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2">
                  <BarChart3 className="h-3 w-3 text-primary" /> Resumo da sessão
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-display text-base font-bold text-gradient-primary">{quality}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Qualidade</p>
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-orange-600 dark:text-orange-400">{heat}%</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Calor</p>
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-rose-600 dark:text-rose-400">{hype}%</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Hype</p>
                  </div>
                </div>
                {achievements.length > 0 && (
                  <p className="text-[9px] text-muted-foreground text-center mt-2">
                    {achievements.length} conquistas desbloqueadas · {cohorts[0].count} lendas · {cohorts[1].count} habitues
                  </p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-card/30 overflow-hidden">
              <button
                onClick={() => setDangerOpen((o) => !o)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
                aria-expanded={dangerOpen}
              >
                <span className="text-[11px] font-bold text-muted-foreground inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Zona de gestão
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${dangerOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {dangerOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-border/60"
                  >
                    <div className="p-3 space-y-2">
                      <button
                        onClick={confirmClear}
                        disabled={!entries.length}
                        className="w-full px-3 py-2 rounded-full bg-destructive/10 text-destructive text-[11px] font-bold inline-flex items-center justify-center gap-1.5 hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" /> Limpar leaderboard ({entries.length})
                      </button>
                      <button
                        onClick={onResetConfig}
                        className="w-full px-3 py-2 rounded-full bg-secondary text-foreground text-[11px] font-bold inline-flex items-center justify-center gap-1.5 hover:bg-secondary/80 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" /> Repor configurações
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>
        </Tabs>

        {!onPublic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 flex gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Abra o Live Hub em {baseUrl}
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                O overlay sincroniza via Supabase Realtime em qualquer domínio, mas para o cache
                local funcionar use <span className="font-mono break-all">{baseUrl}</span>. Está em{" "}
                <span className="font-mono break-all">{currentOrigin}</span>.
              </p>
            </div>
          </motion.div>
        )}

        <div className="flex items-start gap-2 px-1">
          <Sparkles className="h-3 w-3 text-accent shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Cole o URL como <strong>Browser Source</strong> no OBS / Streamlabs (1280×720,
            transparente). Os participantes entram via QR ou código.{" "}
            <span className="text-primary font-medium">Prime ⌘K para a paleta de comandos.</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveControlPanel;
