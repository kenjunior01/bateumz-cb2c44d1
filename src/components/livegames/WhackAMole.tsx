import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Trophy, User, Bot } from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "idle" | "countdown" | "playing" | "done";
type Mode = "bot" | "vs";

type MoleState = "hidden" | "showing" | "hit" | "missed";

interface FloatingScore {
  id: number;
  value: number;
  row: number;
  col: number;
  player: 1 | 2;
  combo: number;
}

interface HitParticle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

const GRID_SIZE = 9; // 3x3
const GAME_DURATION = 30;
const MOLE_SHOW_MIN = 600;
const MOLE_SHOW_MAX = 1400;
const MOLE_INTERVAL_MIN = 400;
const MOLE_INTERVAL_MAX = 900;
const HIT_POINTS = 1;

const MOLE_EMOJIS = ["🐹", "🦁", "🐾", "🦇", "🐯", "🐰"];
const HIT_EMOJIS = ["💥","💥","💥","⚡","🔥","✨"];

const WhackAMole = ({ onScore, liveCode }: Props) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("bot");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState("");
  const [p1Name, setP1Name] = useState("Jogador 1");
  const [p2Name, setP2Name] = useState("Jogador 2");
  const [p1Combo, setP1Combo] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);
  const [lastHit, setLastHit] = useState<"p1" | "p2" | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [hitParticles, setHitParticles] = useState<HitParticle[]>([]);
  const [p1BestCombo, setP1BestCombo] = useState(0);
  const [p2BestCombo, setP2BestCombo] = useState(0);
  const [totalHits, setTotalHits] = useState(0);

  // Each cell: which player's mole is showing (null = empty)
  const [cells, setCells] = useState<(null | { player: 1 | 2; state: MoleState; emoji: string; id: number })[]>(
    Array(GRID_SIZE).fill(null)
  );

  const moleIdRef = useRef(0);
  const timerRef = useRef<number>(0);
  const spawnRef = useRef<number>(0);
  const p2ScoreRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const modeRef = useRef<Mode>("bot");
  const pendingTimeoutsRef = useRef<number[]>([]);
  const floatIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const p1ComboRef = useRef(0);
  const p2ComboRef = useRef(0);
  const totalHitsRef = useRef(0);

  const trackTimeout = useCallback((id: number) => {
    pendingTimeoutsRef.current.push(id);
  }, []);

  const clearAllPendingTimeouts = useCallback(() => {
    pendingTimeoutsRef.current.forEach(clearTimeout);
    pendingTimeoutsRef.current = [];
    clearTimeout(spawnRef.current);
    clearInterval(timerRef.current);
  }, []);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { p2ScoreRef.current = p2Score; }, [p2Score]);

  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 150);
  }, []);

  const spawnFloatingScore = useCallback((row: number, col: number, player: 1 | 2, value: number, combo: number) => {
    const id = ++floatIdRef.current;
    setFloatingScores(prev => [...prev, { id, value, row, col, player, combo }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(f => f.id !== id));
    }, 800);
  }, []);

  const spawnHitParticles = useCallback((row: number, col: number) => {
    const newParticles: HitParticle[] = [];
    for (let i = 0; i < 4; i++) {
      newParticles.push({
        id: ++particleIdRef.current,
        x: col * 33.3 + Math.random() * 33.3,
        y: row * 33.3 + Math.random() * 33.3,
        emoji: HIT_EMOJIS[Math.floor(Math.random() * HIT_EMOJIS.length)],
      });
    }
    setHitParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setHitParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 700);
  }, []);

  const playTapSound = useCallback((combo: number) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 300 + Math.min(combo, 10) * 60;
      osc.type = 'sine';
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }, []);

  const hideMole = useCallback((index: number) => {
    setCells((prev) => {
      const next = [...prev];
      if (next[index] && next[index]!.state === "showing") {
        next[index] = { ...next[index]!, state: "missed" };
        const tid = window.setTimeout(() => {
          setCells((p) => {
            const n = [...p];
            if (n[index] && n[index]!.state === "missed") n[index] = null;
            return n;
          });
        }, 300);
        trackTimeout(tid);
      }
      return next;
    });
  }, [trackTimeout]);

  const spawnMole = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    setCells((prev) => {
      const emptyIndices = prev.reduce<number[]>((acc, c, i) => { if (!c) acc.push(i); return acc; }, []);
      if (emptyIndices.length === 0) return prev;

      const next = [...prev];
      const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      const emoji = MOLE_EMOJIS[Math.floor(Math.random() * MOLE_EMOJIS.length)];
      const id = ++moleIdRef.current;

      next[idx] = { player: 1, state: "showing", emoji, id };

      const showTime = MOLE_SHOW_MIN + Math.random() * (MOLE_SHOW_MAX - MOLE_SHOW_MIN);
      const tid = window.setTimeout(() => hideMole(idx), showTime);
      trackTimeout(tid);

      return next;
    });

    const nextInterval = MOLE_INTERVAL_MIN + Math.random() * (MOLE_INTERVAL_MAX - MOLE_INTERVAL_MIN);
    spawnRef.current = window.setTimeout(spawnMole, nextInterval);
  }, [hideMole, trackTimeout]);

  const botTick = useCallback(() => {
    if (phaseRef.current !== "playing" || modeRef.current !== "bot") return;

    setCells((prev) => {
      const showingIdx = prev.findIndex((c) => c && c.state === "showing" && c.player === 1);
      if (showingIdx === -1) return prev;

      if (Math.random() < 0.6) {
        const next = [...prev];
        next[showingIdx] = { ...next[showingIdx]!, state: "hit" };
        p2ScoreRef.current += 1;
        const row = Math.floor(showingIdx / 3);
        const col = showingIdx % 3;
        spawnHitParticles(row, col);
        spawnFloatingScore(row, col, 2, 1, p2ComboRef.current + 1);
        p2ComboRef.current++;
        if (p2ComboRef.current > 2) setP2BestCombo(prev2 => Math.max(prev2, p2ComboRef.current));
        const tid = window.setTimeout(() => {
          setP2Score(p2ScoreRef.current);
          setP2Combo(p2ComboRef.current);
          setCells((p) => {
            const n = [...p];
            if (n[showingIdx] && n[showingIdx]!.state === "hit") n[showingIdx] = null;
            return n;
          });
        }, 300);
        trackTimeout(tid);
        return next;
      }
      return prev;
    });
  }, [trackTimeout, spawnHitParticles, spawnFloatingScore]);

  useEffect(() => {
    if (phase !== "playing") return;
    const botInterval = window.setInterval(botTick, 700 + Math.random() * 500);
    return () => clearInterval(botInterval);
  }, [phase, botTick]);

  const hitCell = useCallback((index: number, player: 1 | 2) => {
    setCells((prev) => {
      const cell = prev[index];
      if (!cell || cell.state !== "showing") return prev;

      const next = [...prev];
      next[index] = { ...cell, state: "hit" };

      const row = Math.floor(index / 3);
      const col = index % 3;

      if (player === 1) {
        p1ComboRef.current++;
        p2ComboRef.current = 0;
        setP2Combo(0);
        const currentCombo = p1ComboRef.current;
        if (currentCombo > 2) setP1BestCombo(prev1 => Math.max(prev1, currentCombo));
        setP1Combo(currentCombo);
        const bonus = Math.min(Math.floor(currentCombo / 3), 3);
        const points = HIT_POINTS + bonus;
        setP1Score((s) => s + points);
        setLastHit("p1");
        playTapSound(currentCombo);
        spawnFloatingScore(row, col, 1, points, currentCombo);
        if (currentCombo >= 3) triggerShake();
        if (currentCombo >= 5) {
          confetti({ particleCount: 15, spread: 30, origin: { x: 0.2 + col * 0.3, y: 0.4 + row * 0.2 }, colors: ['#3b82f6', '#8b5cf6', '#06b6d4'] });
        }
      } else {
        p2ComboRef.current++;
        p1ComboRef.current = 0;
        setP1Combo(0);
        const currentCombo = p2ComboRef.current;
        if (currentCombo > 2) setP2BestCombo(prev2 => Math.max(prev2, currentCombo));
        setP2Combo(currentCombo);
        setP2Score((s) => s + HIT_POINTS);
        setLastHit("p2");
        spawnFloatingScore(row, col, 2, 1, currentCombo);
      }

      spawnHitParticles(row, col);
      totalHitsRef.current++;
      setTotalHits(totalHitsRef.current);

      const tid = window.setTimeout(() => {
        setCells((p) => {
          const n = [...p];
          if (n[index] && n[index]!.state === "hit") n[index] = null;
          return n;
        });
      }, 300);
      trackTimeout(tid);

      return next;
    });
  }, [trackTimeout, triggerShake, playTapSound, spawnFloatingScore, spawnHitParticles]);

  const startGame = () => {
    clearAllPendingTimeouts();
    setP1Score(0); setP2Score(0);
    setTimeLeft(GAME_DURATION);
    setP1Combo(0); setP2Combo(0);
    p1ComboRef.current = 0; p2ComboRef.current = 0;
    totalHitsRef.current = 0;
    setLastHit(null);
    setWinner("");
    setP1BestCombo(0); setP2BestCombo(0);
    setTotalHits(0);
    setCells(Array(GRID_SIZE).fill(null));
    setFloatingScores([]);
    setHitParticles([]);
    setPhase("countdown");
    setCountdown(3);
  };

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game timer
  useEffect(() => {
    if (phase !== "playing") return;
    const start = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(Number(remaining.toFixed(1)));
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        clearTimeout(spawnRef.current);
        setPhase("done");
      }
    }, 50);

    const firstSpawn = window.setTimeout(spawnMole, 500);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(spawnRef.current);
      clearTimeout(firstSpawn);
    };
  }, [phase, spawnMole]);

  // Determine winner
  useEffect(() => {
    if (phase !== "done") return;
    if (p1Score > p2Score) {
      const w = p1Name;
      setWinner(w);
      onScore?.(w, p1Score);
      confetti({ particleCount: 150, spread: 100, origin: { x: 0.3, y: 0.6 } });
    } else if (p2Score > p1Score) {
      const w = mode === "bot" ? "Bot" : p2Name;
      setWinner(w);
      onScore?.(w, p2Score);
      confetti({ particleCount: 150, spread: 100, origin: { x: 0.7, y: 0.6 } });
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCellVisual = (cell: typeof cells[0]) => {
    if (!cell) return null;
    const colors = cell.player === 1
      ? { bg: "from-blue-500 to-indigo-600", border: "border-blue-400" }
      : { bg: "from-amber-500 to-orange-600", border: "border-amber-400" };
    return { ...cell, colors };
  };

  return (
    <div className={`max-w-lg mx-auto flex flex-col items-center gap-4 transition-transform ${screenShake ? "scale-[0.98]" : ""}`}>
      {phase === "idle" && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-4">
          {/* Epic Header */}
          <div className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent rounded-2xl pointer-events-none" />
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
              <span className="text-6xl block mb-2">🐹</span>
            </motion.div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Whack-a-Mole
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1">Bate nas criaturas o mais rapido que puderes!</p>
            <div className="flex justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">🔥 Combos</span>
              <span className="flex items-center gap-1">⚡ Bonus</span>
              <span className="flex items-center gap-1">🏆 {GAME_DURATION}s</span>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={() => setMode("bot")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === "bot" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border hover:border-primary/40"}`}
            >
              <Bot className="h-4 w-4" /> vs Bot
            </button>
            <button
              onClick={() => setMode("vs")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === "vs" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border hover:border-primary/40"}`}
            >
              <User className="h-4 w-4" /> 2 Jogadores
            </button>
          </div>

          {mode === "vs" && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <input value={p1Name} onChange={(e) => setP1Name(e.target.value)} placeholder="Jogador 1" className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center" />
              <input value={p2Name} onChange={(e) => setP2Name(e.target.value)} placeholder="Jogador 2" className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center" />
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={startGame}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
          >
            <Play className="h-4 w-4 fill-current" /> Começar Jogo
          </motion.button>

          <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Como Jogar</p>
            <p className="text-xs text-muted-foreground">Toque nas criaturas que aparecem o mais rápido possível!</p>
            <p className="text-xs text-muted-foreground mt-1">🔥 Acertos seguidos = combo com bonus de pontos!</p>
            <p className="text-xs text-muted-foreground mt-0.5">{mode === "vs" ? "Cada jogador toca no seu lado" : "Toque rápido antes que o bot alcance!"} | {GAME_DURATION}s</p>
          </div>
        </motion.div>
      )}

      {phase !== "idle" && (
        <div className="w-full flex items-center justify-between px-2">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all ${lastHit === "p1" ? "bg-blue-500/20 border border-blue-500/30 shadow-sm shadow-blue-500/10" : "bg-muted/40 border border-transparent"}`}>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span className="text-xs font-bold text-muted-foreground">{p1Name}</span>
            <span className="font-display text-xl font-bold text-foreground">{p1Score}</span>
            {p1Combo >= 3 && (
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }} className="text-[10px] text-blue-400 font-bold">
                x{p1Combo}🔥
              </motion.span>
            )}
          </div>
          <div className="text-center relative">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Tempo</p>
            <motion.p
              className={`font-mono text-lg font-bold ${timeLeft <= 5 ? "text-red-500" : timeLeft <= 10 ? "text-amber-400" : "text-foreground"}`}
              animate={timeLeft <= 5 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >{timeLeft}s</motion.p>
            <div className="w-20 h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }} transition={{ duration: 0.1 }} />
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all ${lastHit === "p2" ? "bg-amber-500/20 border border-amber-500/30 shadow-sm shadow-amber-500/10" : "bg-muted/40 border border-transparent"}`}>
            {p2Combo >= 3 && (
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }} className="text-[10px] text-amber-400 font-bold">
                x{p2Combo}🔥
              </motion.span>
            )}
            <span className="font-display text-xl font-bold text-foreground">{p2Score}</span>
            <span className="text-xs font-bold text-muted-foreground">{mode === "bot" ? "Bot" : p2Name}</span>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>
        </div>
      )}

      {phase !== "idle" && (
        <div className="relative w-full">
          <AnimatePresence>
            {phase === "countdown" && (
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
              >
                <span className={`font-display text-7xl font-bold ${countdown > 0 ? "text-white" : "text-emerald-400"}`}>{countdown > 0 ? countdown : "GO!"}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating scores overlay */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <AnimatePresence>
              {floatingScores.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 1, y: 0, scale: 1.3 }}
                  animate={{ opacity: 0, y: -50, scale: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="absolute font-black text-lg"
                  style={{
                    left: `${f.col * 33.3 + 16.6}%`,
                    top: `${f.row * 33.3 + 20}%`,
                    color: f.player === 1 ? (f.combo >= 5 ? '#fbbf24' : '#60a5fa') : (f.combo >= 5 ? '#fbbf24' : '#fbbf24'),
                    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  }}
                >
                  +{f.value}{f.combo >= 3 ? ` x${f.combo}` : ''}
                </motion.div>
              ))}
            </AnimatePresence>
            {/* Hit particles */}
            <AnimatePresence>
              {hitParticles.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 1, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 1.5, y: -20 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute text-xl pointer-events-none"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  {p.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {cells.map((cell, i) => {
              const visual = getCellVisual(cell);
              const row = Math.floor(i / 3);
              const col = i % 3;
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: cell ? 0.8 : 1 }}
                  onClick={() => cell && cell.state === "showing" && hitCell(i, cell.player)}
                  className={`relative aspect-square rounded-2xl border-2 transition-all overflow-hidden ${
                    cell
                      ? cell.state === "showing"
                        ? `border-yellow-400 bg-gradient-to-br ${visual?.colors.bg} shadow-lg ${visual?.colors.border}`
                        : cell.state === "hit"
                        ? "border-green-400 bg-green-500/30"
                        : "border-red-400/50 bg-red-500/10"
                      : "border-border bg-muted/30"
                  } ${cell && cell.state === "showing" ? "cursor-pointer" : "cursor-default"}`}
                  disabled={!cell || cell.state !== "showing"}
                >
                  {/* Hole shadow */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-[25%] rounded-[50%] bg-black/30" />

                  <AnimatePresence mode="popLayout">
                    {cell && cell.state === "showing" && (
                      <motion.div
                        initial={{ scale: 0, y: 40, rotate: -10 }}
                        animate={{ scale: 1, y: 0, rotate: 0 }}
                        exit={{ scale: 0, y: -20, rotate: 10 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <motion.span
                          className="text-4xl sm:text-5xl drop-shadow-lg"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {cell.emoji}
                        </motion.span>
                      </motion.div>
                    )}
                    {cell && cell.state === "hit" && (
                      <motion.div
                        initial={{ scale: 1.5, rotate: -15 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <span className="text-3xl">💥</span>
                      </motion.div>
                    )}
                    {cell && cell.state === "missed" && (
                      <motion.div
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{ opacity: 0, scale: 0.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <span className="text-xl opacity-60">❌</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!cell && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-black/15 border-2 border-dashed border-black/10" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 rounded-2xl gap-3"
              >
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.1 }}>
                  <Trophy className="h-12 w-12 text-yellow-400 drop-shadow-[0_0_16px_rgba(250,204,21,0.6)]" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="font-display text-2xl font-black text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                >
                  {winner ? `${winner} venceu!` : "Empate!"}
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-lg font-bold text-white/80">
                  {p1Score} - {p2Score}
                </motion.p>

                {/* Stats grid */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
                    <p className="text-[9px] text-white/50 uppercase">Acertos</p>
                    <p className="text-lg font-bold text-white">{totalHits}</p>
                  </div>
                  <div className="bg-blue-500/20 rounded-lg px-3 py-2 text-center">
                    <p className="text-[9px] text-blue-300/70 uppercase">Melhor Combo P1</p>
                    <p className="text-lg font-bold text-blue-300">{p1BestCombo}</p>
                  </div>
                  <div className="bg-amber-500/20 rounded-lg px-3 py-2 text-center">
                    <p className="text-[9px] text-amber-300/70 uppercase">Melhor Combo P2</p>
                    <p className="text-lg font-bold text-amber-300">{p2BestCombo}</p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex gap-3 mt-2">
                  <button
                    onClick={startGame}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-shadow"
                  >
                    <RotateCcw className="h-4 w-4" /> Jogar Novamente
                  </button>
                  <button
                    onClick={() => setPhase("idle")}
                    className="px-4 py-2.5 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition"
                  >
                    Menu
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default WhackAMole;
