import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Trophy, User, Bot, Flame, Zap, Target, Crown, Star } from "lucide-react";
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

interface HitRing {
  id: number;
  row: number;
  col: number;
  player: 1 | 2;
}

const GRID_SIZE = 9; // 3x3
const GAME_DURATION = 30;
const MOLE_SHOW_MIN = 600;
const MOLE_SHOW_MAX = 1400;
const MOLE_INTERVAL_MIN = 400;
const MOLE_INTERVAL_MAX = 900;
const HIT_POINTS = 1;

const MOLE_EMOJIS = ["\u{1F439}", "\u{1F981}", "\u{1F43E}", "\u{1F987}", "\u{1F42F}", "\u{1F430}"];
const HIT_EMOJIS = ["\u{1F4A5}", "\u{1F4A5}", "\u{1F4A5}", "\u26A1", "\u{1F525}", "\u2728"];

const HAMMER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect x='14' y='16' width='5' height='14' rx='2' fill='%23a16207'/%3E%3Crect x='4' y='2' width='24' height='15' rx='4' fill='%2371717a'/%3E%3Crect x='6' y='4' width='20' height='11' rx='3' fill='%23a1a1aa'/%3E%3C/svg%3E") 16 2, crosshair`;

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
  const [hitRings, setHitRings] = useState<HitRing[]>([]);
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
  const ringIdRef = useRef(0);
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
    }, 900);
  }, []);

  const spawnHitParticles = useCallback((row: number, col: number) => {
    const newParticles: HitParticle[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const spread = 8 + Math.random() * 10;
      newParticles.push({
        id: ++particleIdRef.current,
        x: col * 33.3 + 16.6 + Math.cos(angle) * spread,
        y: row * 33.3 + 16.6 + Math.sin(angle) * spread,
        emoji: HIT_EMOJIS[Math.floor(Math.random() * HIT_EMOJIS.length)],
      });
    }
    setHitParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setHitParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 700);
  }, []);

  const spawnHitRing = useCallback((row: number, col: number, player: 1 | 2) => {
    const id = ++ringIdRef.current;
    setHitRings(prev => [...prev, { id, row, col, player }]);
    setTimeout(() => {
      setHitRings(prev => prev.filter(r => r.id !== id));
    }, 600);
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
        }, 400);
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
        spawnHitRing(row, col, 2);
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
  }, [trackTimeout, spawnHitParticles, spawnHitRing, spawnFloatingScore]);

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
        spawnHitRing(row, col, 1);
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
        spawnHitRing(row, col, 2);
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
  }, [trackTimeout, triggerShake, playTapSound, spawnFloatingScore, spawnHitParticles, spawnHitRing]);

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
    setHitRings([]);
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

  // Timer gradient based on remaining time
  const timerGradient = useMemo(() => {
    if (timeLeft <= 5) return "from-red-500 to-rose-600";
    if (timeLeft <= 10) return "from-amber-500 to-orange-500";
    if (timeLeft <= 15) return "from-yellow-500 to-amber-500";
    return "from-emerald-500 to-cyan-500";
  }, [timeLeft]);

  // Rank for game over screen
  const rank = useMemo(() => {
    const maxScore = Math.max(p1Score, p2Score);
    const ratio = maxScore / GAME_DURATION;
    if (ratio >= 1.0) return { letter: "S", gradient: "from-yellow-400 via-amber-400 to-orange-500", shadow: "shadow-yellow-500/40" };
    if (ratio >= 0.6) return { letter: "A", gradient: "from-emerald-400 to-green-500", shadow: "shadow-emerald-500/30" };
    if (ratio >= 0.35) return { letter: "B", gradient: "from-blue-400 to-indigo-500", shadow: "shadow-blue-500/30" };
    if (ratio >= 0.15) return { letter: "C", gradient: "from-purple-400 to-violet-500", shadow: "shadow-purple-500/30" };
    return { letter: "D", gradient: "from-zinc-400 to-zinc-500", shadow: "shadow-zinc-500/20" };
  }, [p1Score, p2Score]);

  return (
    <div className={`max-w-lg mx-auto flex flex-col items-center gap-4 transition-transform ${screenShake ? "scale-[0.98]" : ""}`}>
      {phase === "idle" && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-4">
          {/* Epic Header */}
          <div className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent rounded-2xl pointer-events-none" />
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
              <span className="text-6xl block mb-2">{MOLE_EMOJIS[0]}</span>
            </motion.div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Whack-a-Mole
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1">Bate nas criaturas o mais rapido que puderes!</p>
            <div className="flex justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" /> Combos</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-400" /> Bonus</span>
              <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-400" /> {GAME_DURATION}s</span>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("bot")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === "bot" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border hover:border-primary/40"}`}
            >
              <Bot className="h-4 w-4" /> vs Bot
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("vs")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === "vs" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border hover:border-primary/40"}`}
            >
              <User className="h-4 w-4" /> 2 Jogadores
            </motion.button>
          </div>

          {mode === "vs" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-2 w-full overflow-hidden">
              <input value={p1Name} onChange={(e) => setP1Name(e.target.value)} placeholder="Jogador 1" className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center" />
              <input value={p2Name} onChange={(e) => setP2Name(e.target.value)} placeholder="Jogador 2" className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center" />
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={startGame}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
          >
            <Play className="h-4 w-4 fill-current" /> Come\u00e7ar Jogo
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl bg-muted/40 border border-border p-3 text-center"
          >
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Como Jogar</p>
            <p className="text-xs text-muted-foreground">Toque nas criaturas que aparecem o mais r\u00e1pido poss\u00edvel!</p>
            <p className="text-xs text-muted-foreground mt-1"><Flame className="h-3 w-3 inline text-orange-400" /> Acertos seguidos = combo com bonus de pontos!</p>
            <p className="text-xs text-muted-foreground mt-0.5">{mode === "vs" ? "Cada jogador toca no seu lado" : "Toque r\u00e1pido antes que o bot alcance!"} | {GAME_DURATION}s</p>
          </motion.div>
        </motion.div>
      )}

      {phase !== "idle" && (
        <>
          {/* Score Bar */}
          <div className="w-full flex items-center justify-between px-1">
            {/* P1 Score Panel */}
            <motion.div
              layout
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all duration-200 border ${
                lastHit === "p1"
                  ? "bg-blue-500/20 border-blue-500/40 shadow-lg shadow-blue-500/20"
                  : "bg-muted/40 border-transparent"
              }`}
            >
              <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 ring-2 ring-blue-500/20 flex-shrink-0" />
              <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[54px]">{p1Name}</span>
              <motion.span
                key={`p1s-${p1Score}`}
                initial={{ scale: 1.5, y: -4, color: '#60a5fa' }}
                animate={{ scale: 1, y: 0, color: 'inherit' }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="font-display text-xl font-black text-foreground tabular-nums"
              >
                {p1Score}
              </motion.span>
              <AnimatePresence>
                {p1Combo >= 2 && (
                  <motion.div
                    initial={{ scale: 0, x: -8, opacity: 0 }}
                    animate={{
                      scale: 1, x: 0, opacity: 1,
                      ...(p1Combo >= 5 ? { rotate: [0, -3, 3, 0] } : {}),
                    }}
                    exit={{ scale: 0, x: -8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${
                      p1Combo >= 7 ? 'bg-gradient-to-r from-amber-500/30 to-red-500/30 text-amber-300 ring-1 ring-amber-400/50' :
                      p1Combo >= 5 ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/30' :
                      p1Combo >= 3 ? 'bg-blue-500/25 text-blue-300' :
                      'bg-blue-500/15 text-blue-400'
                    }`}
                  >
                    {p1Combo >= 3 && <Flame className="h-2.5 w-2.5" />}
                    x{p1Combo}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Timer */}
            <div className="text-center relative flex-shrink-0 mx-2">
              <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Tempo</p>
              <motion.p
                key={`t-${Math.floor(timeLeft)}`}
                className={`font-mono text-2xl font-black tabular-nums leading-none ${
                  timeLeft <= 3
                    ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                    : timeLeft <= 5
                    ? "text-red-400"
                    : timeLeft <= 10
                    ? "text-amber-400"
                    : "text-foreground"
                }`}
                animate={
                  timeLeft <= 3
                    ? { scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }
                    : timeLeft <= 5
                    ? { scale: [1, 1.08, 1] }
                    : {}
                }
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
              >
                {timeLeft < 10 ? timeLeft.toFixed(1) : Math.ceil(timeLeft)}
              </motion.p>
              <div className="w-20 h-1.5 rounded-full bg-muted/80 mt-1 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${timerGradient}`}
                  animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>
            </div>

            {/* P2 Score Panel */}
            <motion.div
              layout
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all duration-200 border ${
                lastHit === "p2"
                  ? "bg-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/20"
                  : "bg-muted/40 border-transparent"
              }`}
            >
              <AnimatePresence>
                {p2Combo >= 2 && (
                  <motion.div
                    initial={{ scale: 0, x: 8, opacity: 0 }}
                    animate={{
                      scale: 1, x: 0, opacity: 1,
                      ...(p2Combo >= 5 ? { rotate: [0, 3, -3, 0] } : {}),
                    }}
                    exit={{ scale: 0, x: 8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${
                      p2Combo >= 7 ? 'bg-gradient-to-r from-amber-500/30 to-red-500/30 text-amber-300 ring-1 ring-amber-400/50' :
                      p2Combo >= 5 ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/30' :
                      p2Combo >= 3 ? 'bg-amber-500/25 text-amber-300' :
                      'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    x{p2Combo}
                    {p2Combo >= 3 && <Flame className="h-2.5 w-2.5" />}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.span
                key={`p2s-${p2Score}`}
                initial={{ scale: 1.5, y: -4, color: '#fbbf24' }}
                animate={{ scale: 1, y: 0, color: 'inherit' }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="font-display text-xl font-black text-foreground tabular-nums"
              >
                {p2Score}
              </motion.span>
              <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[54px]">{mode === "bot" ? "Bot" : p2Name}</span>
              <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 ring-2 ring-amber-500/20 flex-shrink-0" />
            </motion.div>
          </div>

          {/* Game Board */}
          <div className="relative w-full">
            <AnimatePresence>
              {phase === "countdown" && (
                <motion.div
                  key={countdown}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl"
                >
                  <motion.span
                    className={`font-display text-8xl font-black drop-shadow-2xl ${countdown > 0 ? "text-white" : "text-emerald-400"}`}
                    animate={countdown === 0 ? { scale: [0.5, 1.3, 1], rotate: [-10, 5, 0] } : {}}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    {countdown > 0 ? countdown : "GO!"}
                  </motion.span>
                  {countdown > 0 && (
                    <motion.div
                      className="absolute w-24 h-24 rounded-full border-4 border-white/20"
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating scores, particles, and hit rings overlay */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Hit Rings */}
              <AnimatePresence>
                {hitRings.map(ring => (
                  <motion.div
                    key={`ring-${ring.id}`}
                    initial={{ scale: 0.3, opacity: 0.9, borderWidth: 3 }}
                    animate={{ scale: 3, opacity: 0, borderWidth: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute w-10 h-10 rounded-full pointer-events-none"
                    style={{
                      left: `calc(${ring.col * 33.3 + 16.6}% - 20px)`,
                      top: `calc(${ring.row * 33.3 + 16.6}% - 20px)`,
                      border: `3px solid ${ring.player === 1 ? '#60a5fa' : '#fbbf24'}`,
                      boxShadow: `0 0 16px ${ring.player === 1 ? 'rgba(96,165,250,0.5)' : 'rgba(251,191,36,0.5)'}, inset 0 0 8px ${ring.player === 1 ? 'rgba(96,165,250,0.2)' : 'rgba(251,191,36,0.2)'}`,
                    }}
                  />
                ))}
              </AnimatePresence>

              {/* Floating scores */}
              <AnimatePresence>
                {floatingScores.map(f => (
                  <motion.div
                    key={`fs-${f.id}`}
                    initial={{ opacity: 1, y: 0, scale: f.combo >= 5 ? 1.8 : f.combo >= 3 ? 1.5 : 1.3 }}
                    animate={{ opacity: 0, y: -60, scale: f.combo >= 5 ? 0.6 : 0.7 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute font-black text-center whitespace-nowrap"
                    style={{
                      left: `${f.col * 33.3 + 16.6}%`,
                      top: `${f.row * 33.3 + 15}%`,
                      transform: 'translateX(-50%)',
                      fontSize: f.combo >= 5 ? '1.5rem' : f.combo >= 3 ? '1.25rem' : '1.1rem',
                      color: f.combo >= 7 ? '#fbbf24' : f.combo >= 5 ? '#c084fc' : f.combo >= 3 ? '#60a5fa' : f.player === 1 ? '#93c5fd' : '#fde68a',
                      textShadow: `0 2px 12px rgba(0,0,0,0.9), 0 0 ${f.combo >= 5 ? '20' : '8'}px ${f.player === 1 ? 'rgba(96,165,250,0.6)' : 'rgba(251,191,36,0.6)'}`,
                    }}
                  >
                    +{f.value}
                    {f.combo >= 3 && (
                      <motion.span
                        className="ml-0.5"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        x{f.combo}
                      </motion.span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Hit particles */}
              <AnimatePresence>
                {hitParticles.map(p => {
                  const dx = (p.x - 16.6) / 16.6;
                  const dy = (p.y - 16.6) / 16.6;
                  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                  const endX = (dx / dist) * 45;
                  const endY = (dy / dist) * 45 - 15;
                  return (
                    <motion.div
                      key={`hp-${p.id}`}
                      initial={{ opacity: 1, scale: 0.2, x: 0, y: 0, rotate: 0 }}
                      animate={{ opacity: 0, scale: [0.2, 1.6, 0.6], x: endX, y: endY, rotate: [0, 180, 360] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="absolute text-lg pointer-events-none drop-shadow-lg"
                      style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    >
                      {p.emoji}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Grid */}
            <motion.div
              layout
              style={{ cursor: phase === "playing" ? HAMMER_CURSOR : undefined }}
              className="grid grid-cols-3 gap-2"
            >
              {cells.map((cell, i) => {
                const visual = getCellVisual(cell);
                const row = Math.floor(i / 3);
                const col = i % 3;
                return (
                  <motion.button
                    key={i}
                    whileTap={cell && cell.state === "showing" ? { scale: 0.75, rotate: -2 } : { scale: 0.95 }}
                    onClick={() => cell && cell.state === "showing" && hitCell(i, cell.player)}
                    className={`relative aspect-square rounded-2xl border-2 transition-colors duration-150 overflow-hidden ${
                      cell
                        ? cell.state === "showing"
                          ? `border-yellow-400/80 bg-gradient-to-br ${visual?.colors.bg} shadow-lg ${visual?.colors.border}`
                          : cell.state === "hit"
                          ? "border-green-400/60 bg-green-500/20"
                          : "border-red-400/30 bg-red-500/5"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                    } ${cell && cell.state === "showing" ? "cursor-pointer" : "cursor-default"}`}
                    disabled={!cell || cell.state !== "showing"}
                  >
                    {/* Hole shadow */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-[25%] rounded-[50%] bg-black/30" />

                    {/* Cell glow for active moles */}
                    {cell && cell.state === "showing" && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: cell.player === 1
                            ? 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
                        }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}

                    <AnimatePresence mode="popLayout">
                      {cell && cell.state === "showing" && (
                        <motion.div
                          key={`mole-${cell.id}`}
                          initial={{ scale: 0, y: 50, rotate: -15, opacity: 0 }}
                          animate={{
                            scale: [0, 1.3, 0.9, 1],
                            y: [50, -8, 3, 0],
                            rotate: [-15, 5, -2, 0],
                            opacity: [0, 1, 1, 1],
                          }}
                          exit={{
                            scale: [1, 0.4, 0],
                            y: [0, -15, -30],
                            rotate: [0, 20, -10],
                            opacity: [1, 0.5, 0],
                          }}
                          transition={{
                            initial: { duration: 0.4, ease: "easeOut" },
                            exit: { duration: 0.3, ease: "easeIn" },
                          }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <motion.span
                            className="text-4xl sm:text-5xl drop-shadow-lg select-none"
                            animate={{ y: [0, -5, 0], rotate: [0, -3, 3, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.2 }}
                          >
                            {cell.emoji}
                          </motion.span>
                        </motion.div>
                      )}
                      {cell && cell.state === "hit" && (
                        <motion.div
                          key="hit"
                          initial={{ scale: 2.5, rotate: -30, opacity: 0 }}
                          animate={{ scale: [2.5, 1.2, 0.8], rotate: [-30, 10, 0], opacity: [0, 1, 0.6] }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <span className="text-4xl drop-shadow-lg">{HIT_EMOJIS[0]}</span>
                        </motion.div>
                      )}
                      {cell && cell.state === "missed" && (
                        <motion.div
                          key="missed"
                          initial={{ scale: 1, y: 0, rotate: 0 }}
                          animate={{ scale: 0.3, y: 35, rotate: 10, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4, ease: "easeIn" }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <span className="text-xl opacity-60">{"\u274C"}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Empty hole indicator */}
                    {!cell && (
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="h-10 w-10 rounded-full bg-black/10 border-2 border-dashed border-black/8" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Game Over Overlay */}
            <AnimatePresence>
              {phase === "done" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-2xl gap-1.5 p-6"
                >
                  {/* Animated sparkle border */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      border: '2px solid transparent',
                      backgroundClip: 'padding-box',
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      animate={{
                        boxShadow: [
                          'inset 0 0 30px rgba(250,204,21,0.05), 0 0 15px rgba(250,204,21,0.1)',
                          'inset 0 0 30px rgba(250,204,21,0.15), 0 0 25px rgba(250,204,21,0.2)',
                          'inset 0 0 30px rgba(250,204,21,0.05), 0 0 15px rgba(250,204,21,0.1)',
                        ],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>

                  {/* Rank Badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.1, stiffness: 200, damping: 12 }}
                    className="relative"
                  >
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${rank.gradient} flex items-center justify-center shadow-2xl ${rank.shadow}`}>
                      <span className="text-5xl font-black text-white drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{rank.letter}</span>
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-2 rounded-3xl border-2 border-dashed border-yellow-400/20"
                    />
                    {/* Rank stars */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {[...Array(rank.letter === 'S' ? 5 : rank.letter === 'A' ? 4 : rank.letter === 'B' ? 3 : rank.letter === 'C' ? 2 : 1)].map((_, si) => (
                        <motion.div
                          key={si}
                          initial={{ scale: 0, y: 5 }}
                          animate={{ scale: 1, y: 0 }}
                          transition={{ delay: 0.3 + si * 0.08, type: "spring", stiffness: 400 }}
                        >
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Trophy */}
                  <motion.div
                    initial={{ scale: 0, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", delay: 0.25, stiffness: 300, damping: 15 }}
                    className="mt-1"
                  >
                    <Trophy className="h-10 w-10 text-yellow-400 drop-shadow-[0_0_24px_rgba(250,204,21,0.5)]" />
                  </motion.div>

                  {/* Winner Text */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="font-display text-2xl font-black text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                  >
                    {winner ? `${winner} venceu!` : "Empate!"}
                  </motion.p>

                  {/* Score Display */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.45, type: "spring", stiffness: 300 }}
                    className="flex items-center gap-4 mt-1"
                  >
                    <div className="text-center">
                      <p className="text-[9px] text-blue-300/70 uppercase font-bold">{p1Name}</p>
                      <motion.span
                        className="text-3xl font-black text-blue-400 tabular-nums"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
                      >{p1Score}</motion.span>
                    </div>
                    <span className="text-xl font-bold text-white/30">vs</span>
                    <div className="text-center">
                      <p className="text-[9px] text-amber-300/70 uppercase font-bold">{mode === "bot" ? "Bot" : p2Name}</p>
                      <motion.span
                        className="text-3xl font-black text-amber-400 tabular-nums"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.55, type: "spring", stiffness: 400 }}
                      >{p2Score}</motion.span>
                    </div>
                  </motion.div>

                  {/* Stats Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-3 gap-2 mt-2 w-full"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65 }}
                      className="bg-white/[0.07] rounded-xl px-2 py-2.5 text-center backdrop-blur-sm border border-white/[0.06]"
                    >
                      <Target className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-0.5" />
                      <p className="text-[8px] text-white/40 uppercase font-bold">Acertos</p>
                      <p className="text-lg font-black text-white tabular-nums">{totalHits}</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.72 }}
                      className="bg-blue-500/[0.12] rounded-xl px-2 py-2.5 text-center backdrop-blur-sm border border-blue-500/[0.08]"
                    >
                      <Flame className="h-3.5 w-3.5 text-blue-400 mx-auto mb-0.5" />
                      <p className="text-[8px] text-blue-300/60 uppercase font-bold">Melhor Combo</p>
                      <p className="text-lg font-black text-blue-300 tabular-nums">{p1BestCombo}</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.79 }}
                      className="bg-amber-500/[0.12] rounded-xl px-2 py-2.5 text-center backdrop-blur-sm border border-amber-500/[0.08]"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-400 mx-auto mb-0.5" />
                      <p className="text-[8px] text-amber-300/60 uppercase font-bold">Hits/s</p>
                      <p className="text-lg font-black text-amber-300 tabular-nums">{(totalHits / GAME_DURATION).toFixed(1)}</p>
                    </motion.div>
                  </motion.div>

                  {/* Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex gap-3 mt-2"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startGame}
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-shadow"
                    >
                      <RotateCcw className="h-4 w-4" /> Jogar Novamente
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPhase("idle")}
                      className="px-4 py-2.5 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition border border-white/10"
                    >
                      Menu
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

export default WhackAMole;
