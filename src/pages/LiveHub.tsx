import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Zap, Brain, Package, RotateCcw, Sparkles, Trophy, Users, Plus, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import TapBattle from "@/components/livegames/TapBattle";
import QuizBattle from "@/components/livegames/QuizBattle";
import MysteryBox from "@/components/livegames/MysteryBox";
import PrizeWheel, { DEFAULT_WHEEL_PRIZES, WheelPrize } from "@/components/livegames/PrizeWheel";
import LiveLeaderboard, { LeaderEntry } from "@/components/livegames/LiveLeaderboard";
import LiveGameSettings, { DEFAULT_CONFIG, LiveGameConfig } from "@/components/livegames/LiveGameSettings";

type GameId = "wheel" | "tap" | "quiz" | "mystery";

const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string }[] = [
  { id: "wheel", label: "Roda de Prémios", icon: RotateCcw, emoji: "🎰", desc: "Sorteie prémios reais com probabilidades configuráveis.", grad: "from-violet-500 to-fuchsia-500" },
  { id: "tap", label: "Tap Battle", icon: Zap, emoji: "⚡", desc: "Batalha de toques: 1v1 ou contra o bot.", grad: "from-amber-500 to-orange-500" },
  { id: "quiz", label: "Quiz Battle", icon: Brain, emoji: "🧠", desc: "Trivia ao vivo, sozinho ou com convidado.", grad: "from-sky-500 to-blue-500" },
  { id: "mystery", label: "Caixa Misteriosa", icon: Package, emoji: "🎁", desc: "4 caixas, prémios escondidos.", grad: "from-emerald-500 to-teal-500" },
];

const LiveHub = () => {
  const [active, setActive] = useState<GameId>("wheel");
  const [config, setConfig] = useState<LiveGameConfig>(() => {
    try {
      const s = localStorage.getItem("liveGameConfig");
      return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });
  const [wheelPrizes, setWheelPrizes] = useState<WheelPrize[]>(() => {
    try {
      const s = localStorage.getItem("liveWheelPrizes");
      return s ? JSON.parse(s) : DEFAULT_WHEEL_PRIZES;
    } catch { return DEFAULT_WHEEL_PRIZES; }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [liveCode] = useState(() => Math.random().toString(36).slice(2, 7).toUpperCase());
  const [copied, setCopied] = useState(false);

  useEffect(() => { try { localStorage.setItem("liveGameConfig", JSON.stringify(config)); } catch {} }, [config]);
  useEffect(() => { try { localStorage.setItem("liveWheelPrizes", JSON.stringify(wheelPrizes)); } catch {} }, [wheelPrizes]);

  const recordScore = (game: string) => (name: string, score: number) => {
    if (!name) return;
    setLeaderboard((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },
    ]);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/lives?code=${liveCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
              <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-2">
                <span className="text-[11px] text-muted-foreground">Código da Live:</span>
                <span className="font-mono text-sm font-bold text-primary">{liveCode}</span>
                <button onClick={copyCode} className="p-1 rounded hover:bg-secondary" aria-label="Copiar">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <LiveGameSettings config={config} onChange={setConfig} />
              <Link
                to="/dashboard/raffles/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Criar Sorteio Vinculado
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

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
                  <PrizeWheel prizes={wheelPrizes} onChange={setWheelPrizes} />
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
            </AnimatePresence>
          </div>

          <aside className="space-y-4">
            <LiveLeaderboard entries={leaderboard} onClear={() => setLeaderboard([])} />

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
    </div>
  );
};

export default LiveHub;
