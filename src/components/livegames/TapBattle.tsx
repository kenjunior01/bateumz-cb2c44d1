import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, Users, User, Flame, Swords, Crown, TrendingUp, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";
import { countdownPulse, springBouncy, popIn, shake } from "@/lib/animation-utilities";

// ---- Types ----
interface Props {
  duration?: number;
  onScore?: (name: string, score: number) => void;
}

type Phase = "idle" | "countdown" | "running" | "done";
type Mode = "bot" | "vs";

// ---- Floating +1 particle ----
interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

// ---- Ripple effect ----
interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
  ring?: number;
}


// ---- Tap sound via AudioContext ----
function playTapSound(pitch = 600) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
    setTimeout(() => ctx.close(), 150);
  } catch { /* silent fail */ }
}

function playCountdownBeep(final = false) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(final ? 880 : 440, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (final ? 0.3 : 0.15));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (final ? 0.3 : 0.15));
    setTimeout(() => ctx.close(), 400);
  } catch { /* silent fail */ }
}

// ---- Helper: combo tier label ----
function comboTierLabel(c: number): { label: string; color: string } | null {
  if (c > 10) return { label: "INSANE", color: "text-yellow-300" };
  if (c > 6) return { label: "FRENZY", color: "text-orange-400" };
  if (c > 2) return { label: "COMBO", color: "text-orange-500/70" };
  return null;
}

// ---- Component ----
const TapBattle = ({ duration = 5, onScore }: Props) => {
  const [mode, setMode] = useState<Mode>("bot");
  const [phase, setPhase] = useState<Phase>("idle");
  const [p1Taps, setP1Taps] = useState(0);
  const [p2Taps, setP2Taps] = useState(0);
  const [time, setTime] = useState(duration);
  const [p1Name, setP1Name] = useState("Jogador 1");
  const [p2Name, setP2Name] = useState("Jogador 2");
  const [countdownNum, setCountdownNum] = useState(3);
  const [p1Combos, setP1Combos] = useState(0);
  const [p2Combos, setP2Combos] = useState(0);
  const [floats, setFloats] = useState<FloatingText[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [shakeP1, setShakeP1] = useState(false);
  const [shakeP2, setShakeP2] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [p1Flash, setP1Flash] = useState(false);
  const [p2Flash, setP2Flash] = useState(false);
  const [p1PeakCombo, setP1PeakCombo] = useState(0);
  const [p2PeakCombo, setP2PeakCombo] = useState(0);
  const [prevP1Taps, setPrevP1Taps] = useState(0);
  const [prevP2Taps, setPrevP2Taps] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const botRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const p1ComboTimer = useRef<number | null>(null);
  const p2ComboTimer = useRef<number | null>(null);
  const p1LastTap = useRef(0);
  const p2LastTap = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTime(duration), [duration]);

  // Cleanup
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (botRef.current) clearInterval(botRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (p1ComboTimer.current) clearTimeout(p1ComboTimer.current);
    if (p2ComboTimer.current) clearTimeout(p2ComboTimer.current);
  }, []);

  // Remove old floating texts
  useEffect(() => {
    if (floats.length === 0) return;
    const t = setTimeout(() => {
      setFloats((prev) => prev.filter((f) => Date.now() - f.id < 800));
    }, 800);
    return () => clearTimeout(t);
  }, [floats]);

  // Remove old ripples
  useEffect(() => {
    if (ripples.length === 0) return;
    const t = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => Date.now() - r.id < 600));
    }, 600);
    return () => clearTimeout(t);
  }, [ripples]);

  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    setFloats((prev) => [...prev.slice(-20), { id: Date.now() + Math.random(), x, y, text, color }]);
  }, []);

  const addRipple = useCallback((x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev.slice(-15), { id, x, y, color, ring: 0 }]);
    // second concentric ring slightly delayed
    setTimeout(() => {
      setRipples((prev) => [...prev.slice(-15), { id: id + 0.01, x, y, color, ring: 1 }]);
    }, 60);
  }, []);

  const handleP1Tap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== "running") return;
      setP1Taps((t) => t + 1);

      // Get tap position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let cx: number, cy: number;
      if ("touches" in e) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else {
        cx = e.clientX - rect.left;
        cy = e.clientY - rect.top;
      }

      // Combo detection
      const now = Date.now();
      const gap = now - p1LastTap.current;
      p1LastTap.current = now;
      if (gap < 150) {
        setP1Combos((c) => Math.min(c + 1, 50));
        if (p1ComboTimer.current) clearTimeout(p1ComboTimer.current);
        p1ComboTimer.current = window.setTimeout(() => setP1Combos(0), 400);
      } else {
        setP1Combos(0);
      }

      // Floating +1
      const comboCount = p1Combos;
      const comboText = comboCount > 2 ? `+1 x${comboCount}` : "+1";
      addFloat(cx, cy - 10, comboText, comboCount > 8 ? "#facc15" : comboCount > 5 ? "#f59e0b" : comboCount > 2 ? "#f97316" : "#60a5fa");
      addRipple(cx, cy, "rgba(96, 165, 250, 0.6)");
      setP1Flash(true);
      setTimeout(() => setP1Flash(false), 100);
      if (comboCount > p1PeakCombo) setP1PeakCombo(comboCount);

      // Sound (pitch increases with combo)
      playTapSound(500 + Math.min(comboCount * 30, 400));

      // Shake effect on high combos
      if (comboCount > 3 && comboCount % 3 === 0) {
        setShakeP1(true);
        setTimeout(() => setShakeP1(false), 300);
      }
    },
    [phase, p1Combos, addFloat, addRipple, p1PeakCombo]
  );

  const handleP2Tap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (phase !== "running") return;
      setP2Taps((t) => t + 1);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let cx: number, cy: number;
      if ("touches" in e) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else {
        cx = e.clientX - rect.left;
        cy = e.clientY - rect.top;
      }

      const now = Date.now();
      const gap = now - p2LastTap.current;
      p2LastTap.current = now;
      if (gap < 150) {
        setP2Combos((c) => Math.min(c + 1, 50));
        if (p2ComboTimer.current) clearTimeout(p2ComboTimer.current);
        p2ComboTimer.current = window.setTimeout(() => setP2Combos(0), 400);
      } else {
        setP2Combos(0);
      }

      const comboCount = p2Combos;
      const comboText = comboCount > 2 ? `+1 x${comboCount}` : "+1";
      addFloat(cx, cy - 10, comboText, comboCount > 8 ? "#facc15" : comboCount > 5 ? "#f59e0b" : comboCount > 2 ? "#f97316" : "#fbbf24");
      addRipple(cx, cy, "rgba(251, 191, 36, 0.6)");
      setP2Flash(true);
      setTimeout(() => setP2Flash(false), 100);
      if (comboCount > p2PeakCombo) setP2PeakCombo(comboCount);
      playTapSound(450 + Math.min(comboCount * 30, 400));

      if (comboCount > 3 && comboCount % 3 === 0) {
        setShakeP2(true);
        setTimeout(() => setShakeP2(false), 300);
      }
    },
    [phase, p2Combos, addFloat, addRipple, p2PeakCombo]
  );

  const startCountdown = () => {
    setP1Taps(0);
    setP2Taps(0);
    setPrevP1Taps(0);
    setPrevP2Taps(0);
    setP1Combos(0);
    setP2Combos(0);
    setP1PeakCombo(0);
    setP2PeakCombo(0);
    p1LastTap.current = 0;
    p2LastTap.current = 0;
    setTime(duration);
    setPhase("countdown");
    setCountdownNum(3);

    let count = 3;
    playCountdownBeep(false);

    countdownRef.current = window.setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        playCountdownBeep(false);
      } else if (count === 0) {
        setCountdownNum(0); // GO!
        playCountdownBeep(true);
      } else {
        if (countdownRef.current) clearInterval(countdownRef.current);
        beginGame();
      }
    }, 700);
  };

  const beginGame = () => {
    setPhase("running");
    const startTs = Date.now();

    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, duration - (Date.now() - startTs) / 1000);
      setTime(Number(remaining.toFixed(1)));
      if (remaining <= 0) finish();
    }, 80);

    if (mode === "bot") {
      // Bot with increasing difficulty
      const baseRate = 3 + Math.random() * 2;
      let elapsed = 0;
      botRef.current = window.setInterval(() => {
        elapsed += 16;
        const acceleration = 1 + elapsed / (duration * 500);
        const rate = baseRate * acceleration;
        setP2Taps((o) => o + 1);
      }, 1000 / baseRate);
    }
  };

  const finish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (botRef.current) clearInterval(botRef.current);
    intervalRef.current = null;
    botRef.current = null;
    setPhase("done");

    // Screen flash
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 300);
  };

  // Confetti on winner
  useEffect(() => {
    if (phase !== "done") return;
    if (p1Taps > p2Taps) {
      confetti({ particleCount: 150, spread: 90, origin: { x: 0.3, y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { x: 0.5, y: 0.4 } }), 300);
      onScore?.(p1Name, p1Taps);
    } else if (p2Taps > p1Taps) {
      if (mode === "vs") {
        confetti({ particleCount: 150, spread: 90, origin: { x: 0.7, y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { x: 0.5, y: 0.4 } }), 300);
        onScore?.(p2Name, p2Taps);
      }
    } else {
      // Draw - subtle burst
      confetti({ particleCount: 40, spread: 40, origin: { x: 0.5, y: 0.5 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Derived
  const totalTaps = Math.max(p1Taps + p2Taps, 1);
  const p1Percent = (p1Taps / totalTaps) * 100;
  const p2Percent = (p2Taps / totalTaps) * 100;
  const isDraw = p1Taps === p2Taps;
  const p1Wins = p1Taps > p2Taps;
  const p2Wins = p2Taps > p1Taps;
  const timeProgress = 1 - time / duration;

  const winnerLabel = isDraw
    ? "Empate!"
    : p1Wins
    ? `${p1Name} venceu!`
    : mode === "vs"
    ? `${p2Name} venceu!`
    : "Adversario venceu!";

  return (
    <div
      ref={containerRef}
      className="max-w-md mx-auto flex flex-col items-center gap-4 relative overflow-hidden"
    >
      {/* ---- Dynamic background energy field ---- */}
      {(phase === "running" || phase === "countdown") && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: phase === "running"
              ? "radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%)"
              : "radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.08) 0%, transparent 70%)",
            zIndex: 0,
          }}
          animate={
            phase === "running"
              ? { opacity: [0.5, 1, 0.5], scale: [1, 1.02, 1] }
              : { opacity: [0.6, 1, 0.6] }
          }
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* ---- Screen flash on finish ---- */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white/20 rounded-3xl pointer-events-none"
            style={{ zIndex: 40 }}
          />
        )}
      </AnimatePresence>

      {/* ---- Content layer ---- */}
      <div className="relative z-10 w-full flex flex-col items-center gap-4">
        {/* ---- Mode selector ---- */}
        {phase === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 w-full"
          >
            <button
              onClick={() => setMode("bot")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                mode === "bot"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]"
                  : "bg-card border border-border hover:border-blue-500/30 hover:bg-blue-500/5"
              }`}
            >
              <User className="h-3.5 w-3.5" /> vs Bot
            </button>
            <button
              onClick={() => setMode("vs")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                mode === "vs"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 scale-[1.02]"
                  : "bg-card border border-border hover:border-amber-500/30 hover:bg-amber-500/5"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> 2 Jogadores
            </button>
          </motion.div>
        )}

        {/* ---- Player name inputs ---- */}
        {phase === "idle" && mode === "vs" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-2 w-full"
          >
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500" />
              <input
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Jogador 1"
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
              />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500" />
              <input
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Jogador 2"
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition"
              />
            </div>
          </motion.div>
        )}

        {/* ---- Score cards with VS badge ---- */}
        <div className="w-full flex items-center gap-2">
          {/* Player 1 Score Card */}
          <motion.div
            variants={shake}
            animate={shakeP1 ? "shake" : undefined}
            className={`flex-1 rounded-2xl p-3 text-center transition-all duration-300 relative overflow-hidden ${
              p1Wins && phase === "done"
                ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10"
                : "bg-blue-500/10 border border-blue-500/20"
            }`}
          >
            {/* Glow pulse behind score on change */}
            <AnimatePresence>
              {p1Taps !== prevP1Taps && phase === "running" && (
                <motion.div
                  key={`g1-${p1Taps}`}
                  initial={{ opacity: 0.6, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 1.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl pointer-events-none"
                  onAnimationComplete={() => setPrevP1Taps(p1Taps)}
                />
              )}
            </AnimatePresence>
            <p className="text-[10px] uppercase tracking-wider text-blue-400 font-bold truncate relative z-10">{p1Name}</p>
            <motion.p
              key={p1Taps}
              initial={{ scale: 1.4, color: "#93c5fd" }}
              animate={{ scale: 1, color: "inherit" }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="font-display text-3xl font-black text-foreground relative z-10"
            >
              {p1Taps}
            </motion.p>
            {/* Combo indicator with tier */}
            <AnimatePresence>
              {p1Combos > 2 && (() => {
                const tier = comboTierLabel(p1Combos);
                return tier ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="flex items-center justify-center gap-1 mt-1 relative z-10"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      <Flame className={`h-3.5 w-3.5 ${tier.color}`} />
                    </motion.div>
                    <span className={`text-[10px] font-black tabular-nums ${tier.color}`}>x{p1Combos}</span>
                    <span className={`text-[8px] font-black ${tier.color} uppercase tracking-wider ml-0.5`}>{tier.label}</span>
                  </motion.div>
                ) : null;
              })()}
            </AnimatePresence>
          </motion.div>

          {/* VS Badge */}
          <motion.div
            animate={
              phase === "running"
                ? { scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] }
                : phase === "done"
                ? { scale: [1, 1.1, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 1.5, repeat: phase === "running" || phase === "done" ? Infinity : 0, ease: "easeInOut" }}
            className="relative flex-shrink-0"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${
                phase === "running"
                  ? "bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/30"
                  : phase === "done"
                  ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {phase === "done" ? (
                <Trophy className="h-5 w-5" />
              ) : (
                <Swords className="h-4 w-4" />
              )}
            </div>
            {phase === "done" && !isDraw && (
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.3 }}
                className="absolute -top-1 -right-1"
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${p1Wins ? "bg-blue-500 text-white" : "bg-amber-500 text-white"}`}>
                  <Crown className="h-2.5 w-2.5" />
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Player 2 Score Card */}
          <motion.div
            variants={shake}
            animate={shakeP2 ? "shake" : undefined}
            className={`flex-1 rounded-2xl p-3 text-center transition-all duration-300 relative overflow-hidden ${
              p2Wins && phase === "done"
                ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10"
                : "bg-card border border-border"
            }`}
          >
            <AnimatePresence>
              {p2Taps !== prevP2Taps && phase === "running" && (
                <motion.div
                  key={`g2-${p2Taps}`}
                  initial={{ opacity: 0.6, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 1.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl pointer-events-none"
                  onAnimationComplete={() => setPrevP2Taps(p2Taps)}
                />
              )}
            </AnimatePresence>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate relative z-10">
              {mode === "vs" ? p2Name : "Bot"}
            </p>
            <motion.p
              key={p2Taps}
              initial={{ scale: 1.4, color: "#fde68a" }}
              animate={{ scale: 1, color: "inherit" }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="font-display text-3xl font-black text-foreground relative z-10"
            >
              {p2Taps}
            </motion.p>
            <AnimatePresence>
              {p2Combos > 2 && (() => {
                const tier = comboTierLabel(p2Combos);
                return tier ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="flex items-center justify-center gap-1 mt-1 relative z-10"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      <Flame className={`h-3.5 w-3.5 ${tier.color}`} />
                    </motion.div>
                    <span className={`text-[10px] font-black tabular-nums ${tier.color}`}>x{p2Combos}</span>
                    <span className={`text-[8px] font-black ${tier.color} uppercase tracking-wider ml-0.5`}>{tier.label}</span>
                  </motion.div>
                ) : null;
              })()}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ---- Progress comparison bar ---- */}
        {(phase === "running" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            className="w-full relative"
          >
            <div className="w-full h-3 rounded-full bg-card border border-border overflow-hidden flex relative">
              <motion.div
                className="h-full rounded-l-full relative overflow-hidden"
                style={{ width: `${p1Percent}%`, background: "linear-gradient(90deg, #60a5fa, #3b82f6, #2563eb)" }}
                transition={{ duration: 0.15 }}
              >
                {/* Shimmer sweep on P1 bar */}
                {phase === "running" && p1Taps > 0 && (
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)", backgroundSize: "200% 100%" }}
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </motion.div>
              <motion.div
                className="h-full rounded-r-full relative overflow-hidden"
                style={{ width: `${p2Percent}%`, background: "linear-gradient(90deg, #f59e0b, #f97316, #ea580c)" }}
                transition={{ duration: 0.15 }}
              >
                {phase === "running" && p2Taps > 0 && (
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)", backgroundSize: "200% 100%" }}
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.3 }}
                  />
                )}
              </motion.div>
              {/* Center divider glow */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/20 z-10" />
            </div>
            {/* Glow underneath the bar */}
            <div
              className="h-2 -mt-1 rounded-full blur-sm opacity-40"
              style={{
                background: p1Percent > p2Percent
                  ? "linear-gradient(90deg, rgba(59,130,246,0.6), rgba(59,130,246,0))"
                  : p2Percent > p1Percent
                  ? "linear-gradient(90deg, rgba(245,158,11,0), rgba(245,158,11,0.6))"
                  : "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(245,158,11,0.3))",
              }}
            />
          </motion.div>
        )}

        {/* ---- Timer ---- */}
        <div className="w-full text-center">
          {phase === "countdown" ? (
            <motion.div
              key={countdownNum}
              variants={countdownPulse}
              initial="hidden"
              animate="pulse"
              className="inline-flex"
            >
              <span
                className={`font-display text-6xl font-black ${
                  countdownNum === 0
                    ? "bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent"
                    : "bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"
                }`}
              >
                {countdownNum === 0 ? "GO!" : countdownNum}
              </span>
            </motion.div>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {phase === "running" ? "Tempo restante" : phase === "done" ? "Resultado" : "Preparar"}
              </p>
              <motion.p
                className="font-display text-4xl font-black tabular-nums"
                style={{
                  color: phase === "idle" ? "#3b82f6" : time <= 2 ? "#ef4444" : time <= 3.5 ? "#f59e0b" : "#3b82f6",
                }}
                animate={phase === "running" && time <= 3 ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {phase === "idle" ? `${duration}.0` : time.toFixed(1)}s
              </motion.p>
              {/* Time progress bar */}
              {phase === "running" && (
                <div className="mt-1.5 h-1.5 rounded-full bg-card overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full relative"
                    style={{
                      width: `${timeProgress * 100}%`,
                      background: time <= 2
                        ? "linear-gradient(90deg, #dc2626, #ef4444, #f87171)"
                        : time <= 3.5
                        ? "linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)",
                    }}
                    transition={{ duration: 0.15 }}
                  />
                  {/* Glow pulse at the leading edge */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full blur-sm"
                    style={{
                      left: `${timeProgress * 100}%`,
                      background: time <= 2 ? "#f87171" : time <= 3.5 ? "#fbbf24" : "#60a5fa",
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ---- Tap buttons ---- */}
        {phase === "running" && (
          <div
            className={`w-full grid ${mode === "vs" ? "grid-cols-2" : "grid-cols-1 max-w-[200px] mx-auto"} gap-4 place-items-center relative`}
          >
            {/* Player 1 button */}
            <motion.div
              variants={shake}
              animate={shakeP1 ? "shake" : undefined}
              className="relative"
            >
              {/* Glow ring - intensifies with combo */}
              <motion.div
                className="absolute -inset-3 rounded-full"
                style={{
                  background: p1Combos > 10
                    ? "radial-gradient(circle, rgba(250,204,21,0.5) 0%, transparent 70%)"
                    : p1Combos > 5
                    ? "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
                }}
                animate={p1Combos > 3
                  ? { scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }
                  : { opacity: 0.3 }
                }
                transition={{ duration: 0.4, repeat: p1Combos > 3 ? Infinity : 0 }}
              />
              <motion.button
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                onClick={handleP1Tap}
                onTouchStart={handleP1Tap}
                className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full text-white font-bold text-lg shadow-2xl select-none touch-none overflow-hidden transition-all duration-100 ${
                  p1Combos > 10
                    ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 shadow-orange-500/50 border-4 border-yellow-300/40"
                    : p1Combos > 5
                    ? "bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 shadow-purple-500/40 border-4 border-purple-300/30"
                    : "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/30 border-4 border-white/20"
                }`}
              >
                {/* Flash overlay on tap */}
                <AnimatePresence>
                  {p1Flash && (
                    <motion.div
                      key="p1flash"
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-0 rounded-full bg-white pointer-events-none"
                    />
                  )}
                </AnimatePresence>
                {/* Inner ring animation */}
                <motion.div
                  className="absolute inset-1.5 rounded-full border-2 border-white/15"
                  animate={phase === "running" ? { scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                {/* Outer rotating ring at high combo */}
                {p1Combos > 5 && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-dashed"
                    style={{ borderColor: p1Combos > 10 ? "rgba(250,204,21,0.4)" : "rgba(192,132,252,0.3)" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-1">
                  <Zap className="h-7 w-7 drop-shadow-lg" />
                  <span className="text-sm font-semibold drop-shadow">{p1Name.split(" ")[0]}</span>
                </span>
              </motion.button>
              {/* Ripple effects - concentric rings */}
              {ripples
                .filter((r) => r.color.includes("96, 165"))
                .map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ scale: 0.3, opacity: r.ring === 1 ? 0.5 : 0.8 }}
                    animate={{ scale: r.ring === 1 ? 2.5 : 1.8, opacity: 0 }}
                    transition={{ duration: r.ring === 1 ? 0.6 : 0.45, ease: "easeOut" }}
                    className={`absolute inset-0 rounded-full pointer-events-none ${r.ring === 1 ? "border border-blue-300/30" : "border-2 border-blue-400/50"}`}
                  />
                ))}
            </motion.div>

            {/* Player 2 button (VS mode) */}
            {mode === "vs" && (
              <motion.div
                variants={shake}
                animate={shakeP2 ? "shake" : undefined}
                className="relative"
              >
                <motion.div
                  className="absolute -inset-3 rounded-full"
                  style={{
                    background: p2Combos > 10
                      ? "radial-gradient(circle, rgba(250,204,21,0.5) 0%, transparent 70%)"
                      : p2Combos > 5
                      ? "radial-gradient(circle, rgba(234,88,12,0.4) 0%, transparent 70%)"
                      : "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
                  }}
                  animate={p2Combos > 3
                    ? { scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }
                    : { opacity: 0.3 }
                  }
                  transition={{ duration: 0.4, repeat: p2Combos > 3 ? Infinity : 0 }}
                />
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  onClick={handleP2Tap}
                  onTouchStart={handleP2Tap}
                  className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full text-white font-bold text-lg shadow-2xl select-none touch-none overflow-hidden transition-all duration-100 ${
                    p2Combos > 10
                      ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 shadow-orange-500/50 border-4 border-yellow-300/40"
                      : p2Combos > 5
                      ? "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 shadow-orange-500/40 border-4 border-orange-300/30"
                      : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30 border-4 border-white/20"
                  }`}
                >
                  {/* Flash overlay on tap */}
                  <AnimatePresence>
                    {p2Flash && (
                      <motion.div
                        key="p2flash"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 rounded-full bg-white pointer-events-none"
                      />
                    )}
                  </AnimatePresence>
                  <motion.div
                    className="absolute inset-1.5 rounded-full border-2 border-white/15"
                    animate={phase === "running" ? { scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] } : {}}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  {p2Combos > 5 && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-dashed"
                      style={{ borderColor: p2Combos > 10 ? "rgba(250,204,21,0.4)" : "rgba(234,88,12,0.3)" }}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center gap-1">
                    <Zap className="h-7 w-7 drop-shadow-lg" />
                    <span className="text-sm font-semibold drop-shadow">{p2Name.split(" ")[0]}</span>
                  </span>
                </motion.button>
                {ripples
                  .filter((r) => r.color.includes("251, 191"))
                  .map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ scale: 0.3, opacity: r.ring === 1 ? 0.5 : 0.8 }}
                      animate={{ scale: r.ring === 1 ? 2.5 : 1.8, opacity: 0 }}
                      transition={{ duration: r.ring === 1 ? 0.6 : 0.45, ease: "easeOut" }}
                      className={`absolute inset-0 rounded-full pointer-events-none ${r.ring === 1 ? "border border-amber-300/30" : "border-2 border-amber-400/50"}`}
                    />
                  ))}
              </motion.div>
            )}

            {/* Floating +1 texts */}
            {floats.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -50, scale: 1.3 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute pointer-events-none font-black text-sm"
                style={{
                  left: f.x,
                  top: f.y,
                  color: f.color,
                  textShadow: "0 0 10px currentColor",
                  zIndex: 30,
                }}
              >
                {f.text}
              </motion.div>
            ))}
          </div>
        )}

        {/* ---- Start button ---- */}
        {phase === "idle" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={startCountdown}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-base shadow-xl shadow-purple-500/25 flex items-center gap-2 hover:shadow-purple-500/40 transition-shadow"
          >
            <Zap className="h-5 w-5" /> Comecar Batalha
          </motion.button>
        )}

        {/* ---- Countdown overlay ---- */}
        <AnimatePresence>
          {phase === "countdown" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center rounded-3xl z-30"
              style={{
                background: "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)",
                backdropFilter: "blur(2px)",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={countdownNum}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 300 }}
                >
                  <span
                    className={`font-display text-7xl sm:text-8xl font-black ${
                      countdownNum === 0
                        ? "bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                        : "bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    }`}
                  >
                    {countdownNum === 0 ? "GO!" : countdownNum}
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Winner screen ---- */}
        <AnimatePresence>
          {phase === "done" && (
            <motion.div
              variants={popIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full text-center px-5 py-6 rounded-2xl border overflow-hidden relative"
              style={{
                background: isDraw
                  ? "linear-gradient(135deg, rgba(100,100,100,0.12), rgba(150,150,150,0.08))"
                  : p1Wins
                  ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.08))"
                  : "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(249,115,22,0.08))",
                borderColor: isDraw
                  ? "rgba(150,150,150,0.3)"
                  : p1Wins
                  ? "rgba(59,130,246,0.3)"
                  : "rgba(251,191,36,0.3)",
              }}
            >
              {/* Shimmer overlay */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />

              {/* Trophy with spring-in rotation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                className="inline-block relative"
              >
                <Trophy
                  className={`h-9 w-9 mx-auto ${
                    isDraw ? "text-gray-400" : p1Wins ? "text-blue-400" : "text-amber-400"
                  }`}
                />
              </motion.div>

              {/* Winner label */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`font-black text-xl mt-2 ${
                  isDraw ? "text-gray-300" : p1Wins ? "text-blue-400" : "text-amber-400"
                }`}
              >
                {winnerLabel}
              </motion.p>

              {/* Animated score comparison */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex items-center justify-center gap-3 mt-3"
              >
                <div className="flex flex-col items-center">
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.4 }}
                    className={`text-3xl font-black ${p1Wins ? "text-blue-400" : "text-muted-foreground"}`}
                  >
                    {p1Taps}
                  </motion.span>
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{p1Name.split(" ")[0]}</span>
                </div>
                <div className="flex flex-col items-center px-2">
                  <span className="text-xs text-muted-foreground font-bold">vs</span>
                  <span className="text-[9px] text-muted-foreground/60 mt-0.5">taps</span>
                </div>
                <div className="flex flex-col items-center">
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.5 }}
                    className={`text-3xl font-black ${p2Wins ? "text-amber-400" : "text-muted-foreground"}`}
                  >
                    {p2Taps}
                  </motion.span>
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{mode === "vs" ? p2Name.split(" ")[0] : "Bot"}</span>
                </div>
              </motion.div>

              {/* Animated result bar */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mx-6 mt-3 h-2 rounded-full bg-white/5 overflow-hidden flex"
              >
                <motion.div
                  className="h-full rounded-l-full"
                  style={{
                    width: `${p1Percent}%`,
                    background: "linear-gradient(90deg, #60a5fa, #3b82f6)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${p1Percent}%` }}
                  transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
                />
                <motion.div
                  className="h-full rounded-r-full"
                  style={{
                    width: `${p2Percent}%`,
                    background: "linear-gradient(90deg, #f59e0b, #ea580c)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${p2Percent}%` }}
                  transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
                />
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground"
              >
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{(p1Taps / duration).toFixed(1)} vs {(p2Taps / duration).toFixed(1)} taps/s</span>
                </div>
              </motion.div>

              {/* Peak combo stats */}
              {(p1PeakCombo > 2 || p2PeakCombo > 2) && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                  className="flex items-center justify-center gap-4 mt-1.5 text-[10px]"
                >
                  {p1PeakCombo > 2 && (
                    <div className="flex items-center gap-1 text-orange-400/70">
                      <Flame className="h-3 w-3" />
                      <span className="font-semibold">Pico x{p1PeakCombo}</span>
                    </div>
                  )}
                  {p2PeakCombo > 2 && (
                    <div className="flex items-center gap-1 text-orange-400/70">
                      <Flame className="h-3 w-3" />
                      <span className="font-semibold">Pico x{p2PeakCombo}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Differential */}
              {!isDraw && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.85 }}
                  className="text-[10px] text-muted-foreground/60 mt-1"
                >
                  Diferenca: {Math.abs(p1Taps - p2Taps)} taps
                </motion.p>
              )}

              {/* Play again button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPhase("idle")}
                className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Nova batalha
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TapBattle;