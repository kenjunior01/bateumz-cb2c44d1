import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, Trophy, Gift, Ticket, Star, Zap, Brain, Package } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import TapBattle from "@/components/livegames/TapBattle";
import QuizBattle from "@/components/livegames/QuizBattle";
import MysteryBox from "@/components/livegames/MysteryBox";
import LiveLeaderboard, { LeaderEntry } from "@/components/livegames/LiveLeaderboard";
import LiveGameSettings, { DEFAULT_CONFIG, LiveGameConfig } from "@/components/livegames/LiveGameSettings";

// --- Scratch Card ---
const SCRATCH_PRIZES = [
  { label: "50 Luck Points", chance: 0.3, emoji: "⭐" },
  { label: "100 Luck Points", chance: 0.15, emoji: "🌟" },
  { label: "Bilhete Grátis", chance: 0.1, emoji: "🎫" },
  { label: "Tenta de novo", chance: 0.45, emoji: "😅" },
];

const pickPrize = () => {
  const r = Math.random();
  let cumulative = 0;
  for (const p of SCRATCH_PRIZES) {
    cumulative += p.chance;
    if (r <= cumulative) return p;
  }
  return SCRATCH_PRIZES[SCRATCH_PRIZES.length - 1];
};

const ScratchCard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [prize] = useState(() => pickPrize());
  const [scratched, setScratched] = useState(0);
  const isDrawing = useRef(false);

  const startScratch = () => { isDrawing.current = true; };
  const stopScratch = () => { isDrawing.current = false; };

  const scratch = (clientX: number, clientY: number) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Check scratch coverage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const pct = transparent / (imageData.data.length / 4);
    setScratched(pct);
    if (pct > 0.5 && !revealed) {
      setRevealed(true);
      if (prize.label !== "Tenta de novo") {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }
    }
  };

  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#22c55e");
    gradient.addColorStop(1, "#eab308");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✨ Raspe aqui ✨", canvas.width / 2, canvas.height / 2);
  };

  return (
    <div className="relative w-full max-w-xs mx-auto">
      <div className="aspect-[3/2] rounded-2xl bg-card border-2 border-border overflow-hidden relative flex items-center justify-center">
        {/* Prize underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <span className="text-4xl">{prize.emoji}</span>
          <p className="font-display text-lg font-bold text-foreground">{prize.label}</p>
          {revealed && prize.label !== "Tenta de novo" && (
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm text-primary font-medium">
              🎉 Parabéns!
            </motion.p>
          )}
        </div>
        {/* Scratch overlay */}
        {!revealed && (
          <canvas
            ref={initCanvas}
            width={300}
            height={200}
            className="absolute inset-0 w-full h-full cursor-pointer touch-none"
            onMouseDown={startScratch}
            onMouseUp={stopScratch}
            onMouseLeave={stopScratch}
            onMouseMove={(e) => scratch(e.clientX, e.clientY)}
            onTouchStart={startScratch}
            onTouchEnd={stopScratch}
            onTouchMove={(e) => {
              const t = e.touches[0];
              scratch(t.clientX, t.clientY);
            }}
          />
        )}
      </div>
    </div>
  );
};

// --- Wheel of Fortune ---
const WHEEL_SEGMENTS = [
  { label: "10 pts", color: "#22c55e", textColor: "#fff" },
  { label: "Nada", color: "#334155", textColor: "#94a3b8" },
  { label: "50 pts", color: "#eab308", textColor: "#fff" },
  { label: "Nada", color: "#1e293b", textColor: "#94a3b8" },
  { label: "Bilhete", color: "#8b5cf6", textColor: "#fff" },
  { label: "Nada", color: "#334155", textColor: "#94a3b8" },
  { label: "100 pts", color: "#ef4444", textColor: "#fff" },
  { label: "Nada", color: "#1e293b", textColor: "#94a3b8" },
];

const SpinWheel = () => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const extraSpins = 5 + Math.random() * 3;
    const targetAngle = extraSpins * 360 + Math.random() * 360;
    setRotation((prev) => prev + targetAngle);

    setTimeout(() => {
      const finalAngle = (rotation + targetAngle) % 360;
      const segmentAngle = 360 / WHEEL_SEGMENTS.length;
      const idx = Math.floor(((360 - finalAngle + segmentAngle / 2) % 360) / segmentAngle) % WHEEL_SEGMENTS.length;
      const won = WHEEL_SEGMENTS[idx];
      setResult(won.label);
      setSpinning(false);
      if (won.label !== "Nada") {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      }
    }, 4000);
  };

  const segmentAngle = 360 / WHEEL_SEGMENTS.length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary" />

        <motion.svg
          width="260"
          height="260"
          viewBox="0 0 260 260"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
          className="drop-shadow-lg"
        >
          {WHEEL_SEGMENTS.map((seg, i) => {
            const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
            const x1 = 130 + 120 * Math.cos(startAngle);
            const y1 = 130 + 120 * Math.sin(startAngle);
            const x2 = 130 + 120 * Math.cos(endAngle);
            const y2 = 130 + 120 * Math.sin(endAngle);
            const largeArc = segmentAngle > 180 ? 1 : 0;
            const midAngle = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180);
            const tx = 130 + 70 * Math.cos(midAngle);
            const ty = 130 + 70 * Math.sin(midAngle);
            const textRotation = (i + 0.5) * segmentAngle;

            return (
              <g key={i}>
                <path
                  d={`M130,130 L${x1},${y1} A120,120 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  fill={seg.textColor}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                >
                  {seg.label}
                </text>
              </g>
            );
          })}
          <circle cx="130" cy="130" r="18" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
          <text x="130" y="130" fill="hsl(var(--primary))" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="central">
            🎯
          </text>
        </motion.svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
      >
        {spinning ? "A girar..." : "Girar a Roda! 🎰"}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`text-center px-6 py-3 rounded-2xl ${result === "Nada" ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}
          >
            <p className="font-bold text-lg">{result === "Nada" ? "😅 Tente de novo!" : `🎉 Ganhou: ${result}`}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main Page ---
const InstantWin = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"scratch" | "wheel" | "tap" | "quiz" | "mystery">("scratch");
  const [scratchKey, setScratchKey] = useState(0);
  const [config, setConfig] = useState<LiveGameConfig>(() => {
    try {
      const stored = localStorage.getItem("liveGameConfig");
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);

  const updateConfig = (c: LiveGameConfig) => {
    setConfig(c);
    try { localStorage.setItem("liveGameConfig", JSON.stringify(c)); } catch {}
  };

  const recordScore = (game: string) => (name: string, score: number) => {
    if (!name) return;
    setLeaderboard((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },
    ]);
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />

      <section className="container mx-auto px-3 sm:px-4 pt-2 md:py-8 pb-4 sm:pb-8">
        {/* Mobile sticky header with game chips */}
        <MobileDiscoveryHeader
          title="Ganho Instantâneo"
          searchValue=""
          onSearchChange={() => {}}
          searchPlaceholder="Procurar prémio..."
          categories={[
            { id: "scratch", label: "Raspadinha", icon: "🎫" },
            { id: "wheel", label: "Roda", icon: "🎰" },
            { id: "tap", label: "Tap Battle", icon: "⚡" },
            { id: "quiz", label: "Quiz", icon: "🧠" },
            { id: "mystery", label: "Caixa", icon: "🎁" },
          ]}
          activeCategory={tab}
          onCategoryChange={(id) => setTab(id as any)}
        />

        {/* Desktop header */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="hidden md:block text-center mb-5 sm:mb-8 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Ganho Instantâneo
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1.5">
            Tente a Sua <span className="text-primary">Sorte!</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto px-2">
            Raspe a raspadinha ou gire a roda para ganhar pontos, bilhetes e prémios instantâneos!
          </p>
        </motion.div>

        {/* Tabs (desktop only — mobile usa chips do header) */}
        <div className="hidden md:flex flex-wrap justify-center gap-2 mb-8">
          {[
            { id: "scratch", label: "Raspadinha", Icon: Ticket },
            { id: "wheel", label: "Roda da Sorte", Icon: RotateCcw },
            { id: "tap", label: "Tap Battle", Icon: Zap },
            { id: "quiz", label: "Quiz Battle", Icon: Brain },
            { id: "mystery", label: "Caixa Misteriosa", Icon: Package },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                tab === id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 md:mt-0" />

        {/* Live engagement banner + settings */}
        <div className="max-w-sm mx-auto mb-5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-3">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📡</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">Live Engagement</p>
              <p className="text-[11px] text-muted-foreground">Empresas podem ativar e configurar estes jogos durante lives.</p>
            </div>
          </div>
          <LiveGameSettings config={config} onChange={updateConfig} />
        </div>

        {/* Game Area */}
        <AnimatePresence mode="wait">
          {tab === "scratch" && (
            <motion.div key={`scratch-${scratchKey}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <ScratchCard />
              <div className="text-center mt-4">
                <button onClick={() => setScratchKey((k) => k + 1)} className="text-sm text-primary font-medium hover:underline">
                  🔄 Nova raspadinha
                </button>
              </div>
            </motion.div>
          )}
          {tab === "wheel" && (
            <motion.div key="wheel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SpinWheel />
            </motion.div>
          )}
          {tab === "tap" && (
            <motion.div key="tap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <TapBattle duration={config.tapDuration} onScore={recordScore("Tap Battle")} />
            </motion.div>
          )}
          {tab === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <QuizBattle totalQuestions={config.quizQuestions} timePerQ={config.quizTimePerQ} onScore={recordScore("Quiz Battle")} />
            </motion.div>
          )}
          {tab === "mystery" && (
            <motion.div key="mystery" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <MysteryBox
                highChance={config.mysteryHigh}
                lowChance={config.mysteryLow}
                noneChance={config.mysteryNone}
                onScore={recordScore("Caixa Misteriosa")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {(tab === "tap" || tab === "quiz" || tab === "mystery") && (
          <div className="mt-8">
            <LiveLeaderboard entries={leaderboard} onClear={() => setLeaderboard([])} />
          </div>
        )}

        {/* Prize Table */}
        <div className="max-w-sm mx-auto mt-10">
          <h3 className="font-display text-sm font-bold text-foreground mb-3 text-center">Tabela de Prémios</h3>
          <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {[
              { emoji: "⭐", label: "10–50 Luck Points", chance: "30%" },
              { emoji: "🌟", label: "100 Luck Points", chance: "15%" },
              { emoji: "🎫", label: "Bilhete Grátis", chance: "10%" },
              { emoji: "🎁", label: "Prémio Especial", chance: "Raro" },
            ].map((p) => (
              <div key={p.label} className="flex items-center gap-3 p-3">
                <span className="text-xl">{p.emoji}</span>
                <span className="flex-1 text-sm text-foreground">{p.label}</span>
                <span className="text-xs text-muted-foreground font-medium">{p.chance}</span>
              </div>
            ))}
          </div>
        </div>

        {!user && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground mb-3">Crie uma conta para guardar os seus prémios!</p>
            <a href="/register" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
              <Gift className="h-4 w-4" /> Criar Conta Grátis
            </a>
          </div>
        )}
      </section>

      <Footer />
      <BottomTabBar />
    </div>
  );
};

export default InstantWin;
