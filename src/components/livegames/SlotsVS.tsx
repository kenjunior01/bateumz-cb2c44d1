import { useState, useCallback, useEffect, useRef, useMemo, useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Coins, Star } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface SymbolDef {
  emoji: string;
  name: string;
  payout: number;
  weight: number;
  wild: boolean;
}

interface WinResult {
  matchCount: 0 | 2 | 3;
  symbol: SymbolDef | null;
  multiplier: number;
  isJackpot: boolean;
}

interface ReelData {
  strip: SymbolDef[];
  offset: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CELL_H = 64;
const ROWS = 3;
const RAND_COUNT = 22;
const STOP_MS = [800, 1200, 1600];
const INIT_COINS = 100;
const MAX_SPINS = 20;
const BETS = [10, 25, 50] as const;

const SYMBOLS: SymbolDef[] = [
  { emoji: "🍒", name: "Cereja", payout: 2, weight: 25, wild: false },
  { emoji: "🍋", name: "Limão", payout: 2, weight: 25, wild: false },
  { emoji: "🍊", name: "Laranja", payout: 3, weight: 20, wild: false },
  { emoji: "🍇", name: "Uva", payout: 4, weight: 15, wild: false },
  { emoji: "🔔", name: "Sino", payout: 5, weight: 8, wild: false },
  { emoji: "💎", name: "Diamante", payout: 10, weight: 4, wild: false },
  { emoji: "⭐", name: "Estrela", payout: 8, weight: 3, wild: true },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

/* ------------------------------------------------------------------ */
/*  Utility functions                                                  */
/* ------------------------------------------------------------------ */

function randomSymbol(): SymbolDef {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SYMBOLS[0];
}

function evaluatePayline(payline: SymbolDef[]): WinResult {
  const wilds = payline.filter((s) => s.wild);
  const normals = payline.filter((s) => !s.wild);
  const wildCount = wilds.length;

  if (normals.length === 0) {
    const star = SYMBOLS.find((s) => s.wild)!;
    return { matchCount: 3, symbol: star, multiplier: star.payout, isJackpot: true };
  }

  const freq = new Map<string, { sym: SymbolDef; count: number }>();
  for (const s of normals) {
    const entry = freq.get(s.emoji);
    if (entry) entry.count++;
    else freq.set(s.emoji, { sym: s, count: 1 });
  }

  let best = { sym: normals[0], count: 0 };
  for (const val of freq.values()) {
    if (val.count > best.count || (val.count === best.count && val.sym.payout > best.sym.payout)) {
      best = { sym: val.sym, count: val.count };
    }
  }

  const total = best.count + wildCount;
  if (total >= 3) {
    return {
      matchCount: 3,
      symbol: best.sym,
      multiplier: best.sym.payout,
      isJackpot: best.sym.payout >= 8,
    };
  }
  if (total >= 2) {
    return {
      matchCount: 2,
      symbol: best.sym,
      multiplier: Math.max(1, Math.floor(best.sym.payout / 2)),
      isJackpot: false,
    };
  }
  return { matchCount: 0, symbol: null, multiplier: 0, isJackpot: false };
}

function getWinPositions(payline: SymbolDef[], result: WinResult): boolean[] {
  if (result.matchCount === 0 || !result.symbol) return [false, false, false];
  return payline.map((s) => s.wild || s.emoji === result.symbol!.emoji);
}

function createInitialReels(): ReelData[] {
  return [0, 1, 2].map(() => ({
    strip: [randomSymbol(), randomSymbol(), randomSymbol()],
    offset: 0,
  }));
}

function generateSpinReels(): ReelData[] {
  return [0, 1, 2].map(() => {
    const randoms: SymbolDef[] = Array.from({ length: RAND_COUNT }, () => randomSymbol());
    const top = randomSymbol();
    const center = randomSymbol();
    const bottom = randomSymbol();
    const strip = [...randoms, top, center, bottom];
    return { strip, offset: RAND_COUNT * CELL_H };
  });
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

interface GameState {
  p1Coins: number;
  p2Coins: number;
  bet: number;
  spins: number;
  spinning: boolean;
  gameOver: boolean;
  winner: 0 | 1 | -1 | null;
  p1Win: WinResult | null;
  p2Win: WinResult | null;
  p1WonAmt: number;
  p2WonAmt: number;
}

type GameAction =
  | { type: "SPIN_START" }
  | { type: "SPIN_COMPLETE"; p1Win: WinResult; p2Win: WinResult; p1Amt: number; p2Amt: number }
  | { type: "GAME_OVER"; winner: 0 | 1 | -1 }
  | { type: "SET_BET"; bet: number }
  | { type: "RESET" };

const initialGameState: GameState = {
  p1Coins: INIT_COINS,
  p2Coins: INIT_COINS,
  bet: BETS[0],
  spins: 0,
  spinning: false,
  gameOver: false,
  winner: null,
  p1Win: null,
  p2Win: null,
  p1WonAmt: 0,
  p2WonAmt: 0,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SPIN_START":
      return {
        ...state,
        spinning: true,
        p1Coins: state.p1Coins - state.bet,
        p2Coins: state.p2Coins - state.bet,
        spins: state.spins + 1,
        p1Win: null,
        p2Win: null,
        p1WonAmt: 0,
        p2WonAmt: 0,
      };
    case "SPIN_COMPLETE":
      return {
        ...state,
        spinning: false,
        p1Coins: state.p1Coins + action.p1Amt,
        p2Coins: state.p2Coins + action.p2Amt,
        p1Win: action.p1Win,
        p2Win: action.p2Win,
        p1WonAmt: action.p1Amt,
        p2WonAmt: action.p2Amt,
      };
    case "GAME_OVER":
      return { ...state, gameOver: true, winner: action.winner };
    case "SET_BET":
      return { ...state, bet: action.bet };
    case "RESET":
      return { ...initialGameState };
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  CoinRain sub-component                                             */
/* ------------------------------------------------------------------ */

interface CoinParticle {
  id: number;
  x: number;
  delay: number;
  dur: number;
  size: number;
}

function makeCoinParticles(n: number): CoinParticle[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.9,
    dur: 1.0 + Math.random() * 1.2,
    size: 14 + Math.random() * 14,
  }));
}

function CoinRain({ show }: { show: boolean }) {
  const particles = useMemo(() => makeCoinParticles(28), []);

  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{ left: `${p.x}%`, fontSize: p.size }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{ y: 320, opacity: 0, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.dur, delay: p.delay, ease: "easeIn" }}
            >
              🪙
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  MachinePanel sub-component                                         */
/* ------------------------------------------------------------------ */

interface MachinePanelProps {
  playerName: string;
  coins: number;
  reels: ReelData[];
  win: WinResult | null;
  wonAmount: number;
  spinning: boolean;
  gameOver: boolean;
  canSpin: boolean;
  spinNumber: number;
  reelRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onSpin: () => void;
  accentText: string;
  accentBorder: string;
  hoverClass: string;
}

function MachinePanel({
  reels,
  win,
  wonAmount,
  spinning,
  gameOver,
  canSpin,
  spinNumber,
  reelRefs,
  onSpin,
  coins,
  accentBorder,
  hoverClass,
}: MachinePanelProps) {
  const payline = reels.map((r) => r.strip[r.strip.length - 2]);
  const winPos =
    win && win.matchCount > 0 && win.symbol
      ? getWinPositions(payline, win)
      : [false, false, false];

  return (
    <div className="flex flex-col items-center gap-3 flex-1 max-w-[280px] mx-auto w-full">
      {/* Machine frame */}
      <div
        className={cn(
          "bg-gradient-to-b from-slate-800 to-slate-900 border-2 rounded-2xl p-3 sm:p-4 w-full relative overflow-hidden",
          accentBorder
        )}
      >
        {/* Reel container */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="bg-slate-950 flex relative">
            {reels.map((reel, ri) => (
              <div
                key={ri}
                className="relative overflow-hidden"
                style={{ width: CELL_H, height: ROWS * CELL_H }}
              >
                {/* Spinning strip */}
                <div
                  ref={(el) => {
                    reelRefs.current[ri] = el;
                  }}
                  className="absolute top-0 left-0 w-full will-change-transform"
                >
                  {reel.strip.map((sym, si) => (
                    <div
                      key={si}
                      className="flex items-center justify-center text-3xl select-none"
                      style={{ width: CELL_H, height: CELL_H }}
                    >
                      {sym.emoji}
                    </div>
                  ))}
                </div>

                {/* Win glow on center cell */}
                <AnimatePresence>
                  {winPos[ri] && !spinning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute left-0 right-0 pointer-events-none z-10 rounded-sm"
                      style={{
                        top: CELL_H,
                        height: CELL_H,
                        boxShadow:
                          "0 0 18px rgba(251,191,36,0.6), inset 0 0 18px rgba(251,191,36,0.12)",
                        background: "rgba(251,191,36,0.07)",
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Reel vertical separators */}
            <div className="absolute top-0 bottom-0 left-[33.33%] w-px bg-slate-700/60 z-10" />
            <div className="absolute top-0 bottom-0 left-[66.66%] w-px bg-slate-700/60 z-10" />

            {/* Row horizontal separators */}
            <div className="absolute left-0 right-0 h-px bg-slate-700/40 z-10" style={{ top: CELL_H }} />
            <div className="absolute left-0 right-0 h-px bg-slate-700/40 z-10" style={{ top: 2 * CELL_H }} />

            {/* Payline side indicators */}
            <div
              className="absolute left-0 right-0 pointer-events-none z-20 flex"
              style={{ top: CELL_H, height: CELL_H }}
            >
              <div className="w-1.5 h-full bg-amber-400/60 rounded-r-sm" />
              <div className="flex-1" />
              <div className="w-1.5 h-full bg-amber-400/60 rounded-l-sm" />
            </div>
          </div>
        </div>

        {/* Win / status text */}
        <div className="h-9 flex items-center justify-center mt-2 overflow-hidden">
          <AnimatePresence mode="wait">
            {wonAmount > 0 && !spinning && (
              <motion.div
                key={`win-${spinNumber}`}
                initial={{ y: 12, opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
              >
                {win?.isJackpot ? (
                  <span className="text-yellow-400 font-black text-xl drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]">
                    🎰 JACKPOT! +{wonAmount}
                  </span>
                ) : (
                  <span className="text-yellow-400 font-bold text-base">
                    Ganhou! +{wonAmount} 🪙
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {coins < BETS[0] && !spinning && !gameOver && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 font-bold text-sm animate-pulse"
            >
              Sem moedas!
            </motion.span>
          )}
        </div>

        {/* Coin rain */}
        <CoinRain show={wonAmount > 0 && !spinning && !!win} />

        {/* Jackpot overlay */}
        <AnimatePresence>
          {win?.isJackpot && !spinning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 rounded-2xl"
            >
              <motion.div
                animate={{ scale: [1, 1.18, 1], rotate: [0, 2, -2, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-3xl sm:text-4xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.95)]"
              >
                🎰 JACKPOT! 🎰
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spin button */}
      <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.04 }}>
        <Button
          onClick={onSpin}
          disabled={!canSpin}
          size="lg"
          className={cn(
            "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl text-lg px-8 py-6 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
            hoverClass
          )}
        >
          GIRAR 🎰
        </Button>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main SlotsVS component                                             */
/* ------------------------------------------------------------------ */

export default function SlotsVS({ onScore, liveCode }: Props) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [p1Reels, setP1Reels] = useState<ReelData[]>(() => createInitialReels());
  const [p2Reels, setP2Reels] = useState<ReelData[]>(() => createInitialReels());
  const [showPaytable, setShowPaytable] = useState(false);

  const p1ReelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const p2ReelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const spinGenRef = useRef(0);

  const canSpin =
    !state.spinning &&
    !state.gameOver &&
    state.p1Coins >= state.bet &&
    state.p2Coins >= state.bet &&
    state.spins < MAX_SPINS;

  /* ---- Animate reel refs ---- */
  const animateReels = useCallback(
    (refs: React.MutableRefObject<(HTMLDivElement | null)[]>, reelData: ReelData[]) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refs.current.forEach((ref, i) => {
            if (!ref) return;
            ref.style.transition = "none";
            ref.style.transform = "translateY(0)";
            void ref.offsetHeight;
            ref.style.transition = `transform ${STOP_MS[i]}ms cubic-bezier(0.12, 0.85, 0.32, 1)`;
            ref.style.transform = `translateY(-${reelData[i].offset}px)`;
          });
        });
      });
    },
    []
  );

  /* ---- Spin handler ---- */
  const handleSpin = useCallback(() => {
    const s = stateRef.current;
    if (s.spinning || s.gameOver) return;
    if (s.p1Coins < s.bet || s.p2Coins < s.bet) {
      const w = s.p1Coins > s.p2Coins ? 0 : s.p2Coins > s.p1Coins ? 1 : -1;
      dispatch({ type: "GAME_OVER", winner: w });
      return;
    }
    if (s.spins >= MAX_SPINS) return;

    const gen = ++spinGenRef.current;
    const currentBet = s.bet;
    const currentP1 = s.p1Coins;
    const currentP2 = s.p2Coins;
    const currentSpins = s.spins;

    const newP1 = generateSpinReels();
    const newP2 = generateSpinReels();

    setP1Reels(newP1);
    setP2Reels(newP2);
    dispatch({ type: "SPIN_START" });

    animateReels(p1ReelRefs, newP1);
    animateReels(p2ReelRefs, newP2);

    setTimeout(() => {
      if (gen !== spinGenRef.current) return;

      const p1Payline = newP1.map((r) => r.strip[r.strip.length - 2]);
      const p2Payline = newP2.map((r) => r.strip[r.strip.length - 2]);
      const w1 = evaluatePayline(p1Payline);
      const w2 = evaluatePayline(p2Payline);
      const a1 = w1.multiplier * currentBet;
      const a2 = w2.multiplier * currentBet;

      dispatch({ type: "SPIN_COMPLETE", p1Win: w1, p2Win: w2, p1Amt: a1, p2Amt: a2 });

      const newP1Coins = currentP1 - currentBet + a1;
      const newP2Coins = currentP2 - currentBet + a2;
      const nextSpins = currentSpins + 1;

      if (newP1Coins < BETS[0] || newP2Coins < BETS[0] || nextSpins >= MAX_SPINS) {
        setTimeout(() => {
          if (gen !== spinGenRef.current) return;
          const w = newP1Coins > newP2Coins ? 0 : newP2Coins > newP1Coins ? 1 : -1;
          dispatch({ type: "GAME_OVER", winner: w });
        }, 1800);
      }
    }, Math.max(...STOP_MS) + 250);
  }, [animateReels]);

  /* ---- Reset handler ---- */
  const handleReset = useCallback(() => {
    spinGenRef.current++;
    dispatch({ type: "RESET" });
    const fresh = createInitialReels();
    setP1Reels(fresh);
    setP2Reels(fresh);
    setShowPaytable(false);
    requestAnimationFrame(() => {
      p1ReelRefs.current.forEach((ref) => {
        if (ref) {
          ref.style.transition = "none";
          ref.style.transform = "translateY(0)";
        }
      });
      p2ReelRefs.current.forEach((ref) => {
        if (ref) {
          ref.style.transition = "none";
          ref.style.transform = "translateY(0)";
        }
      });
    });
  }, []);

  /* ---- onScore callback ---- */
  useEffect(() => {
    if (state.gameOver) {
      onScore?.("Jogador 1", state.p1Coins);
      onScore?.("Jogador 2", state.p2Coins);
    }
  }, [state.gameOver, state.p1Coins, state.p2Coins, onScore]);

  /* ---- Render ---- */
  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 space-y-4 text-white select-none">
      {/* ===== SCOREBOARD ===== */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          {/* P1 info */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-cyan-400 font-bold text-sm sm:text-base truncate">Jogador 1</span>
            <Badge variant="outline" className="gap-1 border-cyan-500/30 shrink-0 text-slate-200">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={state.p1Coins}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-bold text-sm"
                >
                  {state.p1Coins}
                </motion.span>
              </AnimatePresence>
              <span className="text-[10px] text-slate-400 hidden sm:inline">moedas</span>
            </Badge>
          </div>

          {/* Title */}
          <h2 className="text-base sm:text-xl font-black text-amber-400 tracking-wider shrink-0">
            CAÇA-NÍQUEIS VS
          </h2>

          {/* P2 info */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end">
            <Badge variant="outline" className="gap-1 border-pink-500/30 shrink-0 text-slate-200">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={state.p2Coins}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-bold text-sm"
                >
                  {state.p2Coins}
                </motion.span>
              </AnimatePresence>
              <span className="text-[10px] text-slate-400 hidden sm:inline">moedas</span>
            </Badge>
            <span className="text-pink-400 font-bold text-sm sm:text-base truncate">Jogador 2</span>
          </div>
        </div>
      </div>

      {/* ===== BET + SPINS ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm font-medium">Apostar:</span>
          {BETS.map((b) => (
            <Button
              key={b}
              variant={state.bet === b ? "default" : "outline"}
              size="sm"
              onClick={() =>
                !state.spinning && !state.gameOver && dispatch({ type: "SET_BET", bet: b })
              }
              disabled={state.spinning || state.gameOver}
              className={cn(
                state.bet === b && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
              )}
            >
              {b}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" />
          <Badge variant="secondary" className="font-mono text-slate-200">
            {state.spins}/{MAX_SPINS}
          </Badge>
        </div>
      </div>

      {/* ===== MACHINES ===== */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-5 md:gap-8">
        {/* P1 Machine */}
        <MachinePanel
          playerName="Jogador 1"
          coins={state.p1Coins}
          reels={p1Reels}
          win={state.p1Win}
          wonAmount={state.p1WonAmt}
          spinning={state.spinning}
          gameOver={state.gameOver}
          canSpin={canSpin}
          spinNumber={state.spins}
          reelRefs={p1ReelRefs}
          onSpin={handleSpin}
          accentText="text-cyan-400"
          accentBorder="border-amber-500/30"
          hoverClass="hover:from-cyan-500 hover:to-cyan-600"
        />

        {/* VS badge */}
        <div className="flex items-center py-1">
          <Badge
            variant="outline"
            className="text-2xl font-black text-amber-400 border-amber-500/30 px-4 py-1.5 shadow-lg shadow-amber-500/10"
          >
            VS
          </Badge>
        </div>

        {/* P2 Machine */}
        <MachinePanel
          playerName="Jogador 2"
          coins={state.p2Coins}
          reels={p2Reels}
          win={state.p2Win}
          wonAmount={state.p2WonAmt}
          spinning={state.spinning}
          gameOver={state.gameOver}
          canSpin={canSpin}
          spinNumber={state.spins}
          reelRefs={p2ReelRefs}
          onSpin={handleSpin}
          accentText="text-pink-400"
          accentBorder="border-amber-500/30"
          hoverClass="hover:from-pink-500 hover:to-pink-600"
        />
      </div>

      {/* ===== CONTROLS ===== */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setShowPaytable((p) => !p)}
          className="flex-1 border-slate-600 text-slate-300 hover:text-white"
        >
          <Star className="w-4 h-4 mr-1.5" />
          Tabela de Prémios {showPaytable ? "▲" : "▼"}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-slate-600 text-slate-300 hover:text-white"
        >
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Reiniciar Tudo
        </Button>
      </div>

      {/* ===== PAYTABLE ===== */}
      <AnimatePresence>
        {showPaytable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-700">
              <h3 className="text-center font-bold text-amber-400 mb-3 text-sm">
                Tabela de Prémios (multiplicador da aposta)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-1.5 pr-3">Símbolo</th>
                      <th className="text-center py-1.5 px-2">3 Iguais</th>
                      <th className="text-center py-1.5 pl-2">2 Iguais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYMBOLS.map((sym) => (
                      <tr key={sym.emoji} className="border-b border-slate-800/60">
                        <td className="py-2 pr-3">
                          <span className="text-2xl mr-2 align-middle">{sym.emoji}</span>
                          <span className="text-slate-300 align-middle">{sym.name}</span>
                          {sym.wild && (
                            <Badge
                              variant="secondary"
                              className="ml-2 text-[10px] px-1.5 py-0 align-middle"
                            >
                              Curinga
                            </Badge>
                          )}
                        </td>
                        <td className="text-center py-2 px-2 text-yellow-400 font-bold">
                          {sym.payout}x
                        </td>
                        <td className="text-center py-2 pl-2 text-yellow-400/70 font-semibold">
                          {Math.max(1, Math.floor(sym.payout / 2))}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 text-center">
                ⭐ Estrela é curinga — combina com qualquer símbolo.
                <br />
                Três iguais = multiplicador total · Dois iguais = metade do multiplicador.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== GAME OVER OVERLAY ===== */}
      <AnimatePresence>
        {state.gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl shadow-amber-500/10"
            >
              <h3 className="text-3xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                Fim de Jogo!
              </h3>

              {state.winner !== null && state.winner !== -1 && (
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-xl font-bold"
                >
                  <span
                    className={cn(
                      state.winner === 0 ? "text-cyan-400" : "text-pink-400"
                    )}
                  >
                    Jogador {state.winner + 1}
                  </span>{" "}
                  venceu! 🏆
                </motion.p>
              )}

              {state.winner === -1 && (
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-xl font-bold text-slate-300"
                >
                  Empate!
                </motion.p>
              )}

              <div className="flex justify-around pt-2">
                <div className="space-y-1">
                  <div className="text-cyan-400 font-bold text-sm">Jogador 1</div>
                  <div className="text-yellow-400 font-black text-2xl">{state.p1Coins}</div>
                  <div className="text-[10px] text-slate-500">moedas</div>
                </div>
                <div className="w-px bg-slate-700" />
                <div className="space-y-1">
                  <div className="text-pink-400 font-bold text-sm">Jogador 2</div>
                  <div className="text-yellow-400 font-black text-2xl">{state.p2Coins}</div>
                  <div className="text-[10px] text-slate-500">moedas</div>
                </div>
              </div>

              <Button
                onClick={handleReset}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl w-full py-5 text-base shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:from-amber-400 hover:to-orange-400 transition-all"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Jogar Novamente
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
