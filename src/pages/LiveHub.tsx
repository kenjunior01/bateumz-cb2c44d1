import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Zap, Brain, Package, RotateCcw, Sparkles, Trophy, Users, Plus, Copy, Check, Search, Vote, Play, Square, Lock, Loader2, Gamepad2, Target, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import TapBattle from "@/components/livegames/TapBattle";
import QuizBattle from "@/components/livegames/QuizBattle";
import MysteryBox from "@/components/livegames/MysteryBox";
import KeywordHunt from "@/components/livegames/KeywordHunt";
import EmojiBattle from "@/components/livegames/EmojiBattle";
import PrizeWheel, { DEFAULT_WHEEL_PRIZES, WheelPrize } from "@/components/livegames/PrizeWheel";
import FantasyFootball from "@/components/livegames/FantasyFootball";
import PenaltyShootout from "@/components/livegames/PenaltyShootout";
import WorldCupPredictor from "@/components/livegames/WorldCupPredictor";
import EnhancedMillionaireGame from "@/components/livegames/EnhancedMillionaireGame";
import LiveLeaderboard, { LeaderEntry } from "@/components/livegames/LiveLeaderboard";
import LiveControlPanel from "@/components/livegames/LiveControlPanel";
import LiveGameSettings, { DEFAULT_CONFIG, LiveGameConfig, CompanyBranding, DEFAULT_BRANDING } from "@/components/livegames/LiveGameSettings";
import { publish, subscribe, readLatest } from "@/lib/liveBus";
import { appendHistory } from "@/lib/liveHistory";
import { useToast } from "@/hooks/use-toast";
import AmbassadorPanel from "@/components/ambassadors/AmbassadorPanel";
import { useAuth } from "@/contexts/AuthContext";
import { getGameManagerPath } from "@/lib/game-manager-paths";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type GameId = "wheel" | "tap" | "quiz" | "mystery" | "keyword" | "emoji" | "football" | "penalty" | "worldcup" | "millionaire";

interface SavedWheelGame {
  id: string;
  name: string;
  is_published?: boolean;
  segment_count?: number;
  rotation_duration?: number;
  wheel_background_color?: string;
  wheel_border_color?: string;
  spin_cost?: number;
  sound_enabled?: boolean;
  particle_effects?: boolean;
  background_image_url?: string;
  background_color?: string;
  company_logo_url?: string;
  company_slogan?: string;
  default_effect?: string;
}

const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string }[] = [
  { id: "wheel", label: "Roda de Prémios", icon: RotateCcw, emoji: "🎰", desc: "Sorteie prémios reais com probabilidades configuráveis.", grad: "from-violet-500 to-fuchsia-500" },
  { id: "keyword", label: "Caça à Palavra", icon: Search, emoji: "🔎", desc: "Audiência adivinha a palavra-chave secreta.", grad: "from-amber-500 to-orange-500" },
  { id: "emoji", label: "Batalha de Emojis", icon: Vote, emoji: "💥", desc: "Vote ao vivo, vencedores entram no sorteio.", grad: "from-pink-500 to-rose-500" },
  { id: "tap", label: "Tap Battle", icon: Zap, emoji: "⚡", desc: "Batalha de toques: 1v1 ou contra o bot.", grad: "from-amber-500 to-orange-500" },
  { id: "quiz", label: "Quiz Battle", icon: Brain, emoji: "🧠", desc: "Trivia ao vivo, sozinho ou com convidado.", grad: "from-sky-500 to-blue-500" },
  { id: "mystery", label: "Caixa Misteriosa", icon: Package, emoji: "🎁", desc: "4 caixas, prémios escondidos.", grad: "from-emerald-500 to-teal-500" },
  { id: "football", label: "Fantasy Football", icon: Gamepad2, emoji: "⚽", desc: "Gerencie sua equipe, escolha jogadores, ganhe pontos!", grad: "from-green-500 to-emerald-500" },
  { id: "penalty", label: "Penalty Shootout", icon: Target, emoji: "🎯", desc: "Batalha de pênaltis - chute e defenda para ganhar!", grad: "from-yellow-500 to-orange-500" },
  { id: "worldcup", label: "World Cup Predictor", icon: Globe, emoji: "🌍", desc: "Adivinhe os resultados do Mundial e ganhe pontos!", grad: "from-blue-500 to-cyan-500" },
  { id: "millionaire", label: "Quem Quer Ser Milionário?", icon: Trophy, emoji: "💰", desc: "Perguntas e respostas para ganhar o prêmio máximo!", grad: "from-purple-500 to-violet-500" },
];

const genCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

const LiveHub = () => {
  const { toast: uiToast } = useToast();
  const { user, role } = useAuth();
  const spinWheelManagerPath = getGameManagerPath(role, "spin-wheel");
  const [active, setActive] = useState<GameId>(() => {
    try { return (localStorage.getItem("liveActiveGame") as GameId) || "wheel"; } catch { return "wheel"; }
  });
  const [config, setConfig] = useState<LiveGameConfig>(() => {
    try {
      const s = localStorage.getItem("liveGameConfig");
      return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    try {
      const s = localStorage.getItem("liveBranding");
      return s ? { ...DEFAULT_BRANDING, ...JSON.parse(s) } : DEFAULT_BRANDING;
    } catch { return DEFAULT_BRANDING; }
  });
  const [wheelPrizes, setWheelPrizes] = useState<WheelPrize[]>(() => {
    try {
      const s = localStorage.getItem("liveWheelPrizes");
      return s ? JSON.parse(s) : DEFAULT_WHEEL_PRIZES;
    } catch { return DEFAULT_WHEEL_PRIZES; }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>(() => {
    try {
      const s = localStorage.getItem("liveLeaderboard");
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [savedGames, setSavedGames] = useState<SavedWheelGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loadingGames, setLoadingGames] = useState(false);

  // Persist branding to localStorage
  useEffect(() => {
    localStorage.setItem("liveBranding", JSON.stringify(branding));
  }, [branding]);

  // Apply branding to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', branding.primaryColor);
    root.style.setProperty('--theme-secondary', branding.secondaryColor);
    root.style.setProperty('--theme-accent', branding.accentColor);
    root.style.setProperty('--theme-background', branding.backgroundColor);
    root.style.setProperty('--theme-text', branding.textColor);
  }, [branding]);

  // Load saved games from database
  useEffect(() => {
    if (!user) return;

    const loadSavedGames = async () => {
      setLoadingGames(true);
      try {
        const { data, error } = await supabase
          .from("spin_wheel_games")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setSavedGames(data || []);
      } catch (error) {
        console.error("Error loading saved games:", error);
        toast.error("Erro ao carregar jogos salvos");
      } finally {
        setLoadingGames(false);
      }
    };

    loadSavedGames();
  }, [user]);

  // Live session lifecycle
  const [isLive, setIsLive] = useState<boolean>(() => {
    try { return localStorage.getItem("liveActive") === "1"; } catch { return false; }
  });
  const [liveCode, setLiveCode] = useState<string>(() => {
    try { return localStorage.getItem("liveCurrentCode") || ""; } catch { return ""; }
  });
  const [startedAt, setStartedAt] = useState<number>(() => {
    try { return Number(localStorage.getItem("liveStartedAt") || 0); } catch { return 0; }
  });
  const winnersRef = useRef<{ name: string; meta?: string; at: number }[]>([]);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Session timer
  useEffect(() => {
    if (!isLive || !startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [isLive, startedAt]);

  // Persist & broadcast
  useEffect(() => {
    try { localStorage.setItem("liveGameConfig", JSON.stringify(config)); } catch {}
    publish({ type: "config", payload: config });
  }, [config]);
  useEffect(() => {
    try { localStorage.setItem("liveWheelPrizes", JSON.stringify(wheelPrizes)); } catch {}
    publish({ type: "wheelPrizes", payload: wheelPrizes });
  }, [wheelPrizes]);
  useEffect(() => {
    try { localStorage.setItem("liveLeaderboard", JSON.stringify(leaderboard)); } catch {}
    publish({ type: "leaderboard", payload: leaderboard });
    if (isLive) {
      const myScore = leaderboard.filter((e) => e.game === active).reduce((a, b) => a + b.score, 0);
      publish({
        type: "roundState",
        payload: { game: active, phase: "running", timeLeft: 0, score: myScore, at: Date.now() },
      });
    }
  }, [leaderboard, isLive, active]);
  useEffect(() => {
    try { localStorage.setItem("liveActiveGame", active); } catch {}
    publish({ type: "activeGame", payload: active });
    if (isLive) publish({ type: "roundState", payload: { game: active, phase: "running", timeLeft: 0, at: Date.now() } });
  }, [active, isLive]);

  // Listen for active-game changes from the dashboard tab
  useEffect(() => {
    const unsub = subscribe((evt) => {
      if (evt.type === "activeGame" && (evt.payload as GameId) !== active) {
        setActive(evt.payload as GameId);
      }
    });
    // Hydrate latest from bus
    const latest = readLatest<string>("activeGame");
    if (latest && latest !== active) setActive(latest as GameId);
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const recordScore = (game: string) => (name: string, score: number) => {
    if (!name || !isLive) return;
    setLeaderboard((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },
    ]);
  };

  const broadcastWinner = (name: string, meta?: string) => {
    if (!isLive) return;
    const w = { name, meta, at: Date.now() };
    winnersRef.current = [...winnersRef.current, w];
    publish({ type: "winner", payload: w });
  };

  const resetConfig = () => { setConfig(DEFAULT_CONFIG); setWheelPrizes(DEFAULT_WHEEL_PRIZES); };

  const startLive = () => {
    const code = genCode();
    const now = Date.now();
    setLiveCode(code);
    setStartedAt(now);
    setIsLive(true);
    setLeaderboard([]);
    winnersRef.current = [];
    try {
      localStorage.setItem("liveCurrentCode", code);
      localStorage.setItem("liveStartedAt", String(now));
      localStorage.setItem("liveActive", "1");
    } catch {}
    publish({ type: "liveCode", payload: code });
    publish({ type: "liveStarted", payload: { code, at: now } });
    publish({ type: "roundState", payload: { game: active, phase: "running", timeLeft: 0, at: now } });
    toast({ title: "Live iniciada", description: `Código gerado: ${code}` });
  };

  const [endOpen, setEndOpen] = useState(false);
  const [endCountdown, setEndCountdown] = useState(3);
  const [ending, setEnding] = useState(false);

  // Countdown timer for end-live confirmation
  useEffect(() => {
    if (!endOpen) return;
    setEndCountdown(3);
    const t = setInterval(() => {
      setEndCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [endOpen]);

  const requestEndLive = () => {
    if (!isLive || !liveCode || ending) return;
    setEndOpen(true);
  };

  const confirmEndLive = () => {
    if (ending || endCountdown > 0) return;
    setEnding(true);
    const endedAt = Date.now();
    appendHistory({
      code: liveCode,
      startedAt: startedAt || endedAt,
      endedAt,
      durationSec: Math.max(1, Math.floor((endedAt - (startedAt || endedAt)) / 1000)),
      activeGame: active,
      winners: winnersRef.current,
      leaderboard,
    });
    publish({ type: "liveEnded", payload: { code: liveCode, at: endedAt } });
    publish({ type: "roundState", payload: { game: active, phase: "ended", timeLeft: 0, at: endedAt } });
    publish({ type: "liveCode", payload: "" });
    setIsLive(false);
    setLiveCode("");
    setStartedAt(0);
    setElapsed(0);
    try {
      localStorage.removeItem("liveCurrentCode");
      localStorage.removeItem("liveStartedAt");
      localStorage.setItem("liveActive", "0");
    } catch {}
    toast({ title: "Live encerrada", description: "Vencedores e ranking guardados no histórico." });
    setEndOpen(false);
    setEnding(false);
  };

  const copyCode = async () => {
    if (!liveCode) return;
    await navigator.clipboard.writeText(`${window.location.origin}/lives?code=${liveCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const activeMeta = GAMES.find((g) => g.id === active);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />

      {/* Hero — live engagement only */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10" />
        <div className="relative container mx-auto px-4 py-6 md:py-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold mb-3">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              LIVE ENGAGEMENT
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">
              Jogos para a sua <span className="text-primary">Live</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-4">
              Plataforma dedicada para empresas animarem lives com roda de prémios, batalhas, quizzes e caixas misteriosas — tudo configurável.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {isLive ? (
                <>
                  <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">AO VIVO · {fmtTime(elapsed)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Código:</span>
                    <span className="font-mono text-sm font-bold text-primary">{liveCode}</span>
                    <button onClick={copyCode} className="p-1 rounded hover:bg-secondary" aria-label="Copiar">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button onClick={requestEndLive} disabled={ending} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 disabled:opacity-50">
                    <Square className="h-3.5 w-3.5 fill-current" /> Encerrar Live
                  </button>
                </>
              ) : (
                <>
                  <button onClick={startLive} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-shadow">
                    <Play className="h-4 w-4 fill-current" /> Iniciar Live
                  </button>
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-muted-foreground text-[11px] font-medium">
                    <Lock className="h-3 w-3" /> Sem código ativo
                  </div>
                </>
              )}
              <LiveGameSettings 
                config={config} 
                onChange={setConfig} 
                branding={branding}
                onBrandingChange={setBranding}
              />
              <Link
                to="/dashboard/raffles/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Criar Sorteio Vinculado
              </Link>
            </div>

            {/* Host summary banner — what dashboard set as active */}
            {activeMeta && (
              <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-2.5">
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${activeMeta.grad} flex items-center justify-center text-lg`}>{activeMeta.emoji}</div>
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Jogo ativo no painel</p>
                  <p className="text-sm font-bold leading-tight">{activeMeta.label}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLive ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {isLive ? "transmitindo" : "em espera"}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {!isLive && (
        <div className="container mx-auto px-3 sm:px-4 pt-3">
          <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
            🔒 Pontuações e vencedores só são contabilizados depois de <strong>iniciar a live</strong>. Configure os jogos no painel da empresa.
          </div>
        </div>
      )}

      <section className="container mx-auto px-3 sm:px-4 pt-2 md:py-8 pb-4 sm:pb-8">
        {/* Mobile chips */}
        <MobileDiscoveryHeader
          title="Jogos da Live"
          searchValue=""
          onSearchChange={() => {}}
          searchPlaceholder="Procurar jogo..."
          categories={GAMES.map((g) => ({ id: g.id, label: g.label, icon: g.emoji }))}
          activeCategory={active}
          onCategoryChange={(id) => setActive(id as GameId)}
        />

        {/* Desktop game cards */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 mt-4">
          {GAMES.map((g) => {
            const isActive = active === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setActive(g.id)}
                className={`text-left rounded-2xl border-2 p-4 transition-all ${
                  isActive ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${g.grad} mb-2`}>
                  <g.icon className="h-5 w-5 text-white" />
                </div>
                <p className="font-display text-sm font-bold mb-1">{g.label}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{g.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Game area */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-4 lg:mt-0">
          <div>
            <AnimatePresence mode="wait">
              {active === "wheel" && (
                <motion.div key="wheel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Saved Games Selector */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Gamepad2 className="w-5 h-5" />
                        {selectedGameId ? "Jogo Selecionado" : "Escolha um Jogo Salvo"}
                      </h3>
                      <Link
                        to={spinWheelManagerPath}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                      >
                        <Plus className="h-3.5 w-3.5" /> Criar/Editar Jogo
                      </Link>
                    </div>
                    
                    {loadingGames ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : savedGames.length === 0 ? (
                      <div className="text-center py-8 bg-card border border-dashed border-border rounded-2xl">
                        <p className="text-muted-foreground mb-4">Ainda não tens nenhum jogo salvo!</p>
                        <Link
                          to={spinWheelManagerPath}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                        >
                          <Plus className="h-3.5 w-3.5" /> Criar Primeiro Jogo
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <button
                          onClick={() => setSelectedGameId(null)}
                          className={`p-4 rounded-2xl border-2 transition-all text-left ${
                            !selectedGameId ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <p className="font-bold">Modo Rápido</p>
                          <p className="text-xs text-muted-foreground">Edita prêmios diretamente aqui</p>
                        </button>

                        {savedGames.map(game => (
                          <button
                            key={game.id}
                            onClick={() => setSelectedGameId(game.id)}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${
                              selectedGameId === game.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <p className="font-bold">{game.name}</p>
                              {game.is_published ? (
                                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-bold">
                                  Publicado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold">
                                  Rascunho
                                </span>
                              )}
                            </div>
                            {game.company_slogan && <p className="text-xs text-muted-foreground mt-1">{game.company_slogan}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <PrizeWheel 
                    prizes={wheelPrizes} 
                    onChange={setWheelPrizes} 
                    gameId={selectedGameId || undefined}
                    branding={branding}
                  />
                </motion.div>
              )}
              {active === "tap" && (
                <motion.div key="tap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TapBattle duration={config.tapDuration} onScore={recordScore("Tap Battle")} />
                </motion.div>
              )}
              {active === "quiz" && (
                <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <QuizBattle totalQuestions={config.quizQuestions} timePerQ={config.quizTimePerQ} onScore={recordScore("Quiz Battle")} />
                </motion.div>
              )}
              {active === "mystery" && (
                <motion.div key="mystery" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <MysteryBox
                    highChance={config.mysteryHigh}
                    lowChance={config.mysteryLow}
                    noneChance={config.mysteryNone}
                    onScore={recordScore("Caixa Misteriosa")}
                  />
                </motion.div>
              )}
              {active === "keyword" && (
                <motion.div key="keyword" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <KeywordHunt
                    liveCode={liveCode}
                    onScore={recordScore("Caça à Palavra")}
                    onWinner={(name, kw) => broadcastWinner(name, `Caça à Palavra · "${kw}"`)}
                  />
                </motion.div>
              )}
              {active === "emoji" && (
                <motion.div key="emoji" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <EmojiBattle
                    onScore={recordScore("Batalha de Emojis")}
                    onWinner={(label, votes) => broadcastWinner(label, `Batalha de Emojis · ${votes} votos`)}
                  />
                </motion.div>
              )}
              {active === "football" && (
                <motion.div key="football" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <FantasyFootball />
                </motion.div>
              )}
              {active === "penalty" && (
                <motion.div key="penalty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <PenaltyShootout onScore={recordScore("Penalty Shootout")} />
                </motion.div>
              )}
              {active === "worldcup" && (
                <motion.div key="worldcup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <WorldCupPredictor onScore={recordScore("World Cup Predictor")} />
                </motion.div>
              )}
              {active === "millionaire" && (
                <motion.div key="millionaire" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <EnhancedMillionaireGame />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="space-y-4">
            <LiveControlPanel
              liveCode={liveCode}
              entries={leaderboard}
              onClear={() => setLeaderboard([])}
              onResetConfig={resetConfig}
            />
            <LiveLeaderboard entries={leaderboard} onClear={() => setLeaderboard([])} />
            {user && (
              <AmbassadorPanel
                businessUserId={user.id}
                businessName={user.email?.split("@")[0] || "esta empresa"}
                liveCode={liveCode}
                compact
              />
            )}

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold">Dicas para a sua Live</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Configure os prémios e probabilidades antes de começar.</li>
                <li>Partilhe o código da live para os participantes.</li>
                <li>Use o leaderboard para coroar o vencedor no fim.</li>
                <li>Vincule um sorteio para distribuir prémios reais.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold">Modo Multi-jogador</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Tap Battle e Quiz Battle suportam 1v1 ou contra bot — perfeito para desafios entre o anfitrião e convidados.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
      <BottomTabBar />

      <AnimatePresence>
        {endOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !ending && setEndOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center">
                  <Square className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Encerrar a Live?</h3>
                  <p className="text-xs text-muted-foreground">O código <span className="font-mono font-bold text-foreground">{liveCode}</span> será invalidado e o ranking será arquivado no histórico.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-muted/40 border border-border p-4 mb-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Confirmação disponível em</p>
                <p className={`font-mono text-3xl font-bold ${endCountdown === 0 ? "text-destructive" : "text-primary"}`}>
                  {endCountdown > 0 ? `${endCountdown}s` : "Pronto"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => !ending && setEndOpen(false)}
                  disabled={ending}
                  className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-foreground text-sm font-bold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmEndLive}
                  disabled={endCountdown > 0 || ending}
                  className="flex-1 px-4 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ending ? "A encerrar…" : "Encerrar Live"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveHub;
