import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Volume2,
  VolumeX,
  Minimize2,
<<<<<<< HEAD
  Maximize2,
  Crown,
  Flame,
  Target,
=======
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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
  Mic,
  Radio,
  Share2,
  FileDown,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import { LeaderEntry } from "./LiveLeaderboard";
import { buildOverlayUrl, getPublicBaseUrl, isOnPublicDomain } from "@/lib/publicUrl";

interface Props {
  liveCode: string;
  entries: LeaderEntry[];
  onClear: () => void;
  onResetConfig: () => void;
}

const TAB_ITEMS = [
  { id: "studio", label: "Estúdio", icon: Radio },
  { id: "share", label: "Partilhar", icon: Share2 },
  { id: "export", label: "Exportar", icon: FileDown },
] as const;

const TAB_TYPE = TAB_ITEMS.map((t) => t.id);
type TabId = (typeof TAB_TYPE)[number];

const PODIUM_COLORS = ["text-yellow-400", "text-slate-300", "text-amber-600"];
const PODIUM_BG = [
  "from-yellow-500/20 to-yellow-600/5 border-yellow-500/30",
  "from-slate-400/20 to-slate-500/5 border-slate-400/30",
  "from-amber-600/20 to-amber-700/5 border-amber-600/30",
];
const PODIUM_HEIGHTS = ["h-20", "h-16", "h-14"];
const PODIUM_ORDER = [1, 0, 2];

const sparklineFromEntries = (entries: LeaderEntry[]): number[] => {
  const now = Date.now();
  const buckets = new Array(24).fill(0);
  for (const e of entries) {
    const age = now - e.at;
    if (age > 7200000) continue;
    const idx = Math.min(23, 23 - Math.floor(age / 300000));
    buckets[idx] += 1;
  }
  return buckets;
};

const computeQualityScore = (entries: LeaderEntry[]): number => {
  if (entries.length === 0) return 0;
  const players = new Set(entries.map((e) => e.name)).size;
  const games = new Set(entries.map((e) => e.game)).size;
  const engagement = Math.min(100, Math.round((entries.length / Math.max(1, players)) * 25));
  const diversity = Math.min(100, Math.round(games * 20));
  const activity = Math.min(100, Math.round(players * 10));
  return Math.round((engagement * 0.4 + diversity * 0.3 + activity * 0.3));
};

<<<<<<< HEAD
=======
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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
const QualityRing = ({ score }: { score: number }) => {
  const radius = 40;
  const stroke = 6;
  const normalized = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  const colorClass =
    normalized >= 75 ? "text-emerald-500" : normalized >= 50 ? "text-yellow-500" : "text-orange-500";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" className="stroke-border/40" strokeWidth={stroke} />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className={colorClass}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <motion.span
          className={`text-2xl font-bold tabular-nums ${colorClass}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {normalized}
        </motion.span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Qualidade</span>
      </div>
    </div>
  );
};

const SparklineChart = ({ data }: { data: number[] }) => {
  const maxVal = Math.max(1, ...data);
  const width = 200;
  const height = 48;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / maxVal) * height;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  const areaD = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaD}
        fill="url(#sparkGrad)"
        className="text-primary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={pathD}
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
};

const PodiumCard = ({
  entry,
  rank,
  heightClass,
  colorClass,
  bgClass,
}: {
  entry: LeaderEntry;
  rank: number;
  heightClass: string;
  colorClass: string;
  bgClass: string;
}) => (
  <motion.div
    className={`flex flex-col items-center flex-1 min-w-0`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: rank * 0.15, duration: 0.5 }}
  >
    <motion.div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${bgClass} border-2 flex items-center justify-center mb-1.5 ${colorClass}`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      {rank === 0 ? (
        <Crown className="w-5 h-5" />
      ) : (
        <Trophy className="w-4 h-4" />
      )}
    </motion.div>
    <p className="text-[11px] font-bold text-foreground truncate w-full text-center">{entry.name}</p>
    <p className={`text-[10px] font-bold tabular-nums ${colorClass}`}>{entry.score} pts</p>
    <div
      className={`w-full mt-2 rounded-t-lg bg-gradient-to-b ${bgClass} border border-t border-x ${heightClass}`}
    />
  </motion.div>
);

const LiveControlPanel = ({ liveCode, entries, onClear, onResetConfig }: Props) => {
  const [activeTab, setActiveTab] = useState<TabId>("studio");
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [compact, setCompact] = useState(false);
  const [goalTarget, setGoalTarget] = useState(50);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const players = new Set(entries.map((e) => e.name));
    const games = new Set(entries.map((e) => e.game));
    const top = [...entries].sort((a, b) => b.score - a.score)[0];
    return { players: players.size, games: games.size, plays: entries.length, top };
  }, [entries]);

  const topThree = useMemo(() => {
    return [...entries].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [entries]);

  const sparkData = useMemo(() => sparklineFromEntries(entries), [entries]);
  const qualityScore = useMemo(() => computeQualityScore(entries), [entries]);
  const goalProgress = Math.min(100, Math.round((entries.length / Math.max(1, goalTarget)) * 100));

  const exportCSV = useCallback(() => {
    const header = "name,score,game,timestamp\n";
    const rows = entries
      .map((e) => `"${e.name}",${e.score},"${e.game}",${new Date(e.at).toISOString()}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-${liveCode}-participants.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ficheiro CSV exportado com sucesso!");
  }, [entries, liveCode]);

  const overlayUrl = buildOverlayUrl(liveCode);
  const baseUrl = getPublicBaseUrl();
  const onPublic = isOnPublicDomain();

  const copyOverlay = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      toast.success("URL copiada para o clipboard!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Erro ao copiar URL");
    }
  }, [overlayUrl]);

  const handleClear = useCallback(() => {
    onClear();
    toast.success("Leaderboard limpo!");
  }, [onClear]);

  const handleResetConfig = useCallback(() => {
    onResetConfig();
    toast.success("Configurações repostas!");
  }, [onResetConfig]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape" && cmdPaletteOpen) {
        setCmdPaletteOpen(false);
      }
    },
    [cmdPaletteOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const cmdPaletteActions = useMemo(
    () => [
      { label: "Abrir Overlay (OBS)", action: () => window.open(overlayUrl, "_blank") },
      { label: "Copiar URL do Overlay", action: copyOverlay },
      { label: "Exportar CSV", action: exportCSV },
      { label: "Limpar Leaderboard", action: handleClear },
      { label: "Repor Configurações", action: handleResetConfig },
      { label: "Ativar Som", action: () => setSoundOn(true) },
      { label: "Desativar Som", action: () => setSoundOn(false) },
      { label: compact ? "Modo Expandido" : "Modo Compacto", action: () => setCompact((p) => !p) },
    ],
    [overlayUrl, copyOverlay, exportCSV, handleClear, handleResetConfig, compact]
  );

  const runAction = useCallback((action: () => void) => {
    action();
    setCmdPaletteOpen(false);
  }, []);

  const glassBase =
    "backdrop-blur-xl bg-white/[0.06] dark:bg-white/[0.03] border border-white/[0.12] dark:border-white/[0.08]";

  const glassCard =
    "backdrop-blur-lg bg-white/[0.04] dark:bg-white/[0.02] border border-white/[0.10] dark:border-white/[0.06] rounded-2xl";

  const glassHover = "hover:bg-white/[0.08] dark:hover:bg-white/[0.05] hover:border-white/[0.18] transition-all duration-200";

<<<<<<< HEAD
  if (compact) {
    return (
      <div ref={panelRef} className="w-full">
        <motion.div
          className={`${glassBase} rounded-2xl overflow-hidden`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <motion.div
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="font-display text-sm font-bold text-foreground">Live</span>
              <span className="text-[10px] font-mono text-muted-foreground">{liveCode}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span className="font-bold text-foreground">{stats.players}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Trophy className="w-3.5 h-3.5" />
                <span className="font-bold text-foreground">{stats.plays}</span>
              </div>
              <button
                onClick={() => setCompact(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Modo expandido"
=======
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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
              >
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

<<<<<<< HEAD
  return (
    <div ref={panelRef} className="w-full max-w-lg mx-auto">
      <motion.div
        className={`${glassBase} rounded-3xl overflow-hidden shadow-2xl shadow-black/20`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="relative px-5 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Mic className="w-5 h-5 text-primary-foreground" />
                </div>
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-background"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
=======
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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Painel da Live</h3>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wide">{liveCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSoundOn((p) => !p)}
                className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.12] transition-colors"
                aria-label={soundOn ? "Desativar som" : "Ativar som"}
              >
                {soundOn ? (
                  <Volume2 className="w-4 h-4 text-foreground" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setCompact(true)}
                className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.12] transition-colors"
                aria-label="Modo compacto"
              >
                <Minimize2 className="w-4 h-4 text-foreground" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setCmdPaletteOpen(true)}
                className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.12] transition-colors"
                aria-label="Atalhos de teclado"
              >
                <Keyboard className="w-4 h-4 text-foreground" />
              </motion.button>
            </div>
          </div>

<<<<<<< HEAD
          <div className="absolute bottom-1.5 right-5">
            <span className="text-[9px] text-muted-foreground/50 font-mono">⌘K</span>
          </div>
        </div>

        <div className="px-5 pt-3 pb-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Users, label: "Jogadores", value: stats.players, accent: "text-blue-400" },
              { icon: Trophy, label: "Jogadas", value: stats.plays, accent: "text-emerald-400" },
              { icon: Sliders, label: "Jogos", value: stats.games, accent: "text-purple-400" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className={`${glassCard} p-3 text-center`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
              >
                <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.accent}`} />
                <motion.p
                  className="font-display text-xl font-bold text-foreground"
                  key={s.value}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {s.value}
                </motion.p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="px-5 pt-2 pb-0">
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-primary"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 min-h-[280px]">
          <AnimatePresence mode="wait">
            {activeTab === "studio" && (
              <motion.div
                key="studio"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className={glassCard}>
                  <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Atividade ao Vivo
                        </span>
=======
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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">Últimas 2h</span>
                    </div>
                    <SparklineChart data={sparkData} />
                  </div>
<<<<<<< HEAD
=======
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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
                </div>

<<<<<<< HEAD
                <div className="grid grid-cols-2 gap-3">
                  <div className={`${glassCard} p-4 flex flex-col items-center`}>
                    <QualityRing score={qualityScore} />
                  </div>
                  <div className={`${glassCard} p-4 flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Objectivo
=======
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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-2xl font-bold font-display text-foreground">
                        {entries.length}
                        <span className="text-sm text-muted-foreground font-normal">/{goalTarget}</span>
                      </p>
                      <div className="w-full h-2.5 rounded-full bg-white/[0.08] mt-2 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                          initial={{ width: 0 }}
                          animate={{ width: `${goalProgress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] text-muted-foreground">{goalProgress}%</span>
                        <button
                          onClick={() => setGoalTarget((p) => Math.max(10, p + 10))}
                          className="text-[9px] text-primary hover:text-primary/80 font-semibold"
                        >
                          +10 meta
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {topThree.length > 0 && (
                  <div className={`${glassCard} p-4`}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Crown className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Pódio dos Campeões
                      </span>
                    </div>
<<<<<<< HEAD
                    <div className="flex items-end gap-2 px-2">
                      {PODIUM_ORDER.map((origRank) => {
                        const entry = topThree[origRank];
                        if (!entry) return null;
                        return (
                          <PodiumCard
                            key={entry.id}
                            entry={entry}
                            rank={origRank}
                            heightClass={PODIUM_HEIGHTS[origRank]}
                            colorClass={PODIUM_COLORS[origRank]}
                            bgClass={PODIUM_BG[origRank]}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "share" && (
              <motion.div
                key="share"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
=======
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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
              >
                <motion.a
                  href={overlayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 ${glassHover}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Overlay (OBS)
                </motion.a>

                <div className={`${glassCard} p-3`}>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    URL do overlay
                  </p>
                  <p className="text-[11px] font-mono break-all text-foreground/80 leading-relaxed">
                    {overlayUrl}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={copyOverlay}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold ${glassCard} ${glassHover}`}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-foreground" />
                  )}
                  {copied ? "Copiado!" : "Copiar URL do overlay"}
                </motion.button>

                {!onPublic && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${glassCard} p-3 border-amber-500/30 bg-amber-500/[0.06]`}
                  >
                    <div className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          Abra o Live Hub em {baseUrl}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          O overlay sincroniza com o Live Hub apenas quando ambos estão abertos no mesmo domínio
                          público ({baseUrl}). Está actualmente em{" "}
                          <span className="font-mono">
                            {typeof window !== "undefined" ? window.location.origin : ""}
                          </span>
                          , então o OBS não receberá as actualizações em tempo real.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

<<<<<<< HEAD
                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  Cole o URL do overlay como <strong className="text-foreground/80">Browser Source</strong> no
                  OBS / Streamlabs (1280×720, transparente).
                </p>
              </motion.div>
            )}

            {activeTab === "export" && (
              <motion.div
                key="export"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportCSV}
                  disabled={!entries.length}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold ${glassCard} ${glassHover} disabled:opacity-40 disabled:pointer-events-none`}
                >
                  <Download className="w-4 h-4" />
                  Exportar Participantes (CSV)
                </motion.button>

                <div className={`${glassCard} p-4`}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                    Resumo dos dados
                  </p>
                  <div className="space-y-1.5">
                    {[
                      { label: "Total de registos", value: entries.length },
                      { label: "Jogadores únicos", value: stats.players },
                      { label: "Jogos diferentes", value: stats.games },
                      { label: "Pontuação máxima", value: stats.top ? `${stats.top.score} pts` : "—" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-bold text-foreground tabular-nums">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClear}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-semibold hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Leaderboard
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResetConfig}
                    className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-[11px] font-semibold ${glassCard} ${glassHover}`}
                  >
                    Repor Configurações
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <span className="text-[10px] text-muted-foreground">Transmissão activa</span>
            </div>
            <span className="text-[9px] text-muted-foreground/40 font-mono">bateu.live</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {cmdPaletteOpen && (
=======
        {!onPublic && (
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setCmdPaletteOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className={`relative w-full max-w-sm ${glassBase} rounded-2xl shadow-2xl overflow-hidden`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Paleta de Comandos
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {cmdPaletteActions.map((cmd, i) => (
                  <motion.button
                    key={cmd.label}
                    onClick={() => runAction(cmd.action)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.08] transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 4 }}
                  >
                    <span className="text-sm text-foreground font-medium">{cmd.label}</span>
                  </motion.button>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-white/[0.08] flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground/50">ESC para fechar</span>
              </div>
            </motion.div>
          </motion.div>
        )}
<<<<<<< HEAD
      </AnimatePresence>
    </div>
=======

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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
  );
};

export default LiveControlPanel;
