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
  Maximize2,
  Crown,
  Flame,
  Target,
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
              >
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

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
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">Últimas 2h</span>
                    </div>
                    <SparklineChart data={sparkData} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`${glassCard} p-4 flex flex-col items-center`}>
                    <QualityRing score={qualityScore} />
                  </div>
                  <div className={`${glassCard} p-4 flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Objectivo
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
      </AnimatePresence>
    </div>
  );
};

export default LiveControlPanel;
