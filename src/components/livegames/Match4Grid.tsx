'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, Timer, Sparkles } from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface Cell {
  type: number;
  id: number;
}

interface Popup {
  id: number;
  text: string;
  row: number;
  col: number;
}

interface PlayerState {
  grid: Cell[][];
  score: number;
  nextId: number;
  selected: [number, number] | null;
  phase: 'idle' | 'selected' | 'swapping' | 'removing' | 'falling';
  matchedCells: Set<string>;
  swapFrom: [number, number] | null;
  swapTo: [number, number] | null;
  fallFrom: Map<string, number>;
  gravVer: number;
  cascade: number;
  popups: Popup[];
  popId: number;
  comboShow: number;
  noMatch: boolean;
}

// ============================================================
// Constants
// ============================================================

const ROWS = 6;
const COLS = 6;
const TYPES = 6;
const DURATIONS = [60, 90, 120];
const NAMES = ['Jogador 1', 'Jogador 2'];
const CELL_PITCH = 44; // 40px cell + 4px gap (approximation for w-10)
const CELL_PITCH_SM = 52; // 48px cell + 4px gap (approximation for w-12)

const SHAPES = [
  { bg: 'bg-red-500', sym: '●' },
  { bg: 'bg-blue-500', sym: '■' },
  { bg: 'bg-emerald-500', sym: '◆' },
  { bg: 'bg-yellow-500', sym: '▲' },
  { bg: 'bg-purple-500', sym: '★' },
  { bg: 'bg-orange-500', sym: '⬡' },
];

// ============================================================
// Pure Helpers
// ============================================================

const rnd = () => Math.floor(Math.random() * TYPES);
const CK = (r: number, c: number) => `${r},${c}`;

function mkGrid(): { grid: Cell[][]; nid: number } {
  let nid = 0;
  const grid: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) row.push({ type: rnd(), id: nid++ });
    grid.push(row);
  }
  // Clear any pre-existing matches so both players start clean
  let iter = 0;
  let res = findMatches(grid);
  while (res.matched.size > 0 && iter < 200) {
    const arr = Array.from(res.matched);
    for (let i = 0; i < arr.length; i++) {
      const parts = arr[i].split(',');
      const r = parseInt(parts[0], 10);
      const c = parseInt(parts[1], 10);
      grid[r][c].type = rnd();
    }
    res = findMatches(grid);
    iter++;
  }
  return { grid, nid };
}

function findMatches(grid: Cell[][]): { matched: Set<string>; lines: [number, number][][] } {
  const matched = new Set<string>();
  const lines: [number, number][][] = [];

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let s = 0;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && grid[r][c].type === grid[r][s].type) continue;
      if (c - s >= 4) {
        const ln: [number, number][] = [];
        for (let k = s; k < c; k++) {
          ln.push([r, k]);
          matched.add(CK(r, k));
        }
        lines.push(ln);
      }
      s = c;
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    let s = 0;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && grid[r][c].type === grid[s][c].type) continue;
      if (r - s >= 4) {
        const ln: [number, number][] = [];
        for (let k = s; k < r; k++) {
          ln.push([k, c]);
          matched.add(CK(k, c));
        }
        lines.push(ln);
      }
      s = r;
    }
  }

  return { matched, lines };
}

function calcScore(lines: [number, number][][], cascade: number): number {
  let t = 0;
  for (const l of lines) {
    t += l.length === 4 ? 40 : l.length === 5 ? 100 : 200;
  }
  return Math.floor(t * Math.pow(1.5, cascade));
}

function doGravity(
  grid: Cell[][],
  matched: Set<string>,
  nid: number,
): { g: Cell[][]; nid: number; ff: Map<string, number> } {
  const g: Cell[][] = Array.from({ length: ROWS }, () =>
    new Array<Cell>(COLS).fill(null!),
  );
  const ff = new Map<string, number>();

  for (let c = 0; c < COLS; c++) {
    // Collect surviving cells bottom-to-top
    const surv: { cell: Cell; origR: number }[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!matched.has(CK(r, c))) {
        surv.push({ cell: grid[r][c], origR: r });
      }
    }

    // Place surviving cells from the bottom up
    let wr = ROWS - 1;
    for (const { cell, origR } of surv) {
      g[wr][c] = cell;
      ff.set(CK(wr, c), origR);
      wr--;
    }

    // Fill remaining top rows with new cells
    const numNew = wr + 1;
    for (let r = wr; r >= 0; r--) {
      g[r][c] = { type: rnd(), id: nid++ };
      ff.set(CK(r, c), r - numNew);
    }
  }

  return { g, nid, ff };
}

function mkPlayer(): PlayerState {
  const { grid, nid } = mkGrid();
  return {
    grid,
    score: 0,
    nextId: nid,
    selected: null,
    phase: 'idle',
    matchedCells: new Set(),
    swapFrom: null,
    swapTo: null,
    fallFrom: new Map(),
    gravVer: 0,
    cascade: 0,
    popups: [],
    popId: 0,
    comboShow: 0,
    noMatch: false,
  };
}

// ============================================================
// Component
// ============================================================

export default function Match4Grid({ onScore, liveCode }: Props) {
  /* ---- state ---- */
  const [p, setP] = useState<[PlayerState, PlayerState]>([mkPlayer(), mkPlayer()]);
  const pref = useRef(p);
  pref.current = p;

  const [time, setTime] = useState(90);
  const [dur, setDur] = useState(90);
  const [active, setActive] = useState(false);
  const [over, setOver] = useState(false);
  const [gen, setGen] = useState(0);
  const genRef = useRef(0);
  const timers = useRef<number[]>([]);
  const activeRef = useRef(false);
  const overRef = useRef(false);
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  activeRef.current = active;
  overRef.current = over;

  // Force re-render (shallow clone so React sees new ref)
  const upd = useCallback(
    () => setP((x) => [x[0], x[1]] as [PlayerState, PlayerState]),
    [],
  );

  // Schedule a callback that is cancelled on restart / unmount
  const sched = useCallback((fn: () => void, ms: number) => {
    const g = genRef.current;
    const id = window.setTimeout(() => {
      if (genRef.current !== g) return; // stale generation
      fn();
    }, ms);
    timers.current.push(id);
  }, []);

  const clearT = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  /* ---- countdown timer ---- */
  useEffect(() => {
    if (!active || over) return;
    const iv = setInterval(() => {
      if (genRef.current !== gen) {
        clearInterval(iv);
        return;
      }
      setTime((t) => {
        if (t <= 1) {
          clearInterval(iv);
          setActive(false);
          setOver(true);
          activeRef.current = false;
          overRef.current = true;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [active, over, gen]);

  /* ---- fire onScore when game ends ---- */
  useEffect(() => {
    if (!over) return;
    const pp = pref.current;
    onScoreRef.current?.('Jogador 1', pp[0].score);
    onScoreRef.current?.('Jogador 2', pp[1].score);
  }, [over]);

  /* ---- cleanup on unmount ---- */
  useEffect(() => () => clearT(), [clearT]);

  /* ============================================================
     Game logic (reads / mutates pref.current, then calls upd)
     ============================================================ */

  const processMatches = useCallback(
    (
      pi: number,
      matched: Set<string>,
      lines: [number, number][][],
      cascade: number,
    ) => {
      const pl = pref.current[pi];
      const pts = calcScore(lines, cascade);
      pl.score += pts;
      pl.cascade = cascade;

      // Score popup at the centre of the first match line
      if (lines.length > 0) {
        const ln = lines[0];
        const mid = ln[Math.floor(ln.length / 2)];
        const pid = pl.popId++;
        pl.popups.push({
          id: pid,
          text: `+${pts}`,
          row: mid[0],
          col: mid[1],
        });
        sched(() => {
          pl.popups = pl.popups.filter((pp) => pp.id !== pid);
          upd();
        }, 1100);
      }

      if (cascade > 0) pl.comboShow = cascade + 1;

      // Phase: removing
      pl.phase = 'removing';
      pl.matchedCells = matched;
      upd();

      sched(() => {
        const pl2 = pref.current[pi];
        if (overRef.current) {
          pl2.phase = 'idle';
          pl2.matchedCells = new Set();
          upd();
          return;
        }

        // Apply gravity
        const { g, nid, ff } = doGravity(pl2.grid, matched, pl2.nextId);
        pl2.grid = g;
        pl2.nextId = nid;
        pl2.fallFrom = ff;
        pl2.gravVer++;
        pl2.matchedCells = new Set();
        pl2.phase = 'falling';
        upd();

        sched(() => {
          const pl3 = pref.current[pi];
          if (overRef.current) {
            pl3.phase = 'idle';
            pl3.fallFrom = new Map();
            upd();
            return;
          }

          pl3.fallFrom = new Map();
          const res = findMatches(pl3.grid);
          if (res.matched.size > 0) {
            processMatches(pi, res.matched, res.lines, cascade + 1);
          } else {
            pl3.phase = 'idle';
            pl3.cascade = 0;
            pl3.comboShow = 0;
            upd();
          }
        }, 480);
      }, 420);
    },
    [sched, upd],
  );

  const doSwap = useCallback(
    (pi: number, r1: number, c1: number, r2: number, c2: number) => {
      const pl = pref.current[pi];
      pl.phase = 'swapping';
      pl.swapFrom = [r1, c1];
      pl.swapTo = [r2, c2];
      pl.selected = null;
      upd();

      sched(() => {
        const pl2 = pref.current[pi];
        if (overRef.current) {
          pl2.phase = 'idle';
          pl2.swapFrom = null;
          pl2.swapTo = null;
          upd();
          return;
        }

        // Perform the swap in data
        const tmp = pl2.grid[r1][c1];
        pl2.grid[r1][c1] = pl2.grid[r2][c2];
        pl2.grid[r2][c2] = tmp;
        pl2.swapFrom = null;
        pl2.swapTo = null;
        upd();

        const { matched, lines } = findMatches(pl2.grid);

        if (matched.size === 0) {
          // No match – revert with animation
          pl2.noMatch = true;
          pl2.phase = 'swapping';
          pl2.swapFrom = [r2, c2];
          pl2.swapTo = [r1, c1];
          upd();

          sched(() => {
            const pl3 = pref.current[pi];
            const tmp2 = pl3.grid[r1][c1];
            pl3.grid[r1][c1] = pl3.grid[r2][c2];
            pl3.grid[r2][c2] = tmp2;
            pl3.swapFrom = null;
            pl3.swapTo = null;
            pl3.phase = 'idle';
            pl3.noMatch = false;
            upd();
          }, 320);
          return;
        }

        processMatches(pi, matched, lines, 0);
      }, 260);
    },
    [sched, upd, processMatches],
  );

  /* ---- click handler ---- */
  const handleClick = useCallback(
    (pi: number, r: number, c: number) => {
      if (!activeRef.current || overRef.current) return;
      const pl = pref.current[pi];
      if (pl.phase !== 'idle' && pl.phase !== 'selected') return;

      if (!pl.selected) {
        pl.selected = [r, c];
        pl.phase = 'selected';
        upd();
        return;
      }

      const [sr, sc] = pl.selected;

      // Clicked same cell → deselect
      if (sr === r && sc === c) {
        pl.selected = null;
        pl.phase = 'idle';
        upd();
        return;
      }

      // Adjacent → swap
      if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
        doSwap(pi, sr, sc, r, c);
        return;
      }

      // Non-adjacent → re-select
      pl.selected = [r, c];
      upd();
    },
    [doSwap, upd],
  );

  /* ---- controls ---- */
  const bumpGen = useCallback(() => {
    clearT();
    genRef.current++;
    const g = genRef.current;
    setGen(g);
  }, [clearT]);

  const restart = useCallback(() => {
    bumpGen();
    setP([mkPlayer(), mkPlayer()]);
    setTime(dur);
    setOver(false);
    setActive(false);
  }, [dur, bumpGen]);

  const start = useCallback(() => {
    bumpGen();
    setP([mkPlayer(), mkPlayer()]);
    setTime(dur);
    setOver(false);
    setActive(true);
  }, [dur, bumpGen]);

  const changeDur = useCallback(
    (d: number) => {
      setDur(d);
      if (!active) setTime(d);
    },
    [active],
  );

  /* ============================================================
     Render
     ============================================================ */

  const renderGrid = (pi: number) => {
    const pl = p[pi];
    const borderC = pi === 0 ? 'border-cyan-500/30' : 'border-pink-500/30';
    const interactive = active && !over;

    return (
      <div className="relative">
        <div
          className={cn(
            'relative bg-slate-900/50 border border-slate-800 rounded-2xl p-2',
            borderC,
            !interactive && 'opacity-60',
          )}
        >
          <div className="grid grid-cols-6 gap-1">
            {pl.grid.map((row, r) =>
              row.map((cell, c) => {
                const isSel =
                  pl.selected !== null &&
                  pl.selected[0] === r &&
                  pl.selected[1] === c;
                const isMat = pl.matchedCells.has(CK(r, c));
                const isSF =
                  pl.swapFrom !== null &&
                  pl.swapFrom[0] === r &&
                  pl.swapFrom[1] === c;
                const isST =
                  pl.swapTo !== null &&
                  pl.swapTo[0] === r &&
                  pl.swapTo[1] === c;
                const foff = pl.fallFrom.get(CK(r, c));
                const shape = SHAPES[cell.type];

                // Swap animation offsets
                let ax = 0;
                let ay = 0;
                if (pl.phase === 'swapping') {
                  if (isSF && pl.swapTo && pl.swapFrom) {
                    ax = (pl.swapTo[1] - pl.swapFrom[1]) * CELL_PITCH;
                    ay = (pl.swapTo[0] - pl.swapFrom[0]) * CELL_PITCH;
                  } else if (isST && pl.swapFrom && pl.swapTo) {
                    ax = (pl.swapFrom[1] - pl.swapTo[1]) * CELL_PITCH;
                    ay = (pl.swapFrom[0] - pl.swapTo[0]) * CELL_PITCH;
                  }
                }

                const fallInitial =
                  foff !== undefined
                    ? { y: (foff - r) * CELL_PITCH, opacity: 0.2, scale: 0.7 }
                    : false;

                return (
                  <motion.div
                    key={`${cell.id}-v${pl.gravVer}`}
                    initial={fallInitial}
                    animate={{
                      scale: isMat ? 0 : isSel ? 1.15 : 1,
                      opacity: isMat ? 0 : 1,
                      x: ax,
                      y: 0,
                    }}
                    transition={
                      pl.phase === 'falling'
                        ? {
                            type: 'spring',
                            bounce: 0.35,
                            stiffness: 260,
                            damping: 18,
                          }
                        : pl.phase === 'swapping'
                          ? { duration: 0.22, ease: 'easeInOut' }
                          : pl.phase === 'removing'
                            ? { duration: 0.35, ease: 'easeIn' }
                            : { duration: 0.15 }
                    }
                    className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center select-none transition-shadow duration-150',
                      shape.bg,
                      interactive ? 'cursor-pointer' : 'cursor-default',
                      isSel &&
                        'ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.4)] z-10',
                    )}
                    onClick={() => handleClick(pi, r, c)}
                    whileTap={
                      interactive && !isMat
                        ? { scale: 0.88 }
                        : undefined
                    }
                  >
                    <span className="text-white/90 text-[10px] sm:text-xs font-bold leading-none select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                      {shape.sym}
                    </span>
                  </motion.div>
                );
              }),
            )}
          </div>

          <AnimatePresence>
            {pl.popups.map((pop) => (
              <motion.div
                key={pop.id}
                initial={{ opacity: 1, y: 0, scale: 0.6 }}
                animate={{ opacity: 0, y: -44, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="absolute pointer-events-none z-30 font-extrabold text-white text-base sm:text-lg"
                style={{
                  left: `calc(0.5rem + ${pop.col} * (100% - 1rem) / 6 + (100% - 1rem) / 12)`,
                  top: `calc(0.5rem + ${pop.row} * (100% - 1rem) / 6 + (100% - 1rem) / 12 - 0.25rem)`,
                  transform: 'translateX(-50%)',
                  textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                }}
              >
                {pop.text}
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {pl.comboShow > 0 && (
              <motion.div
                key={`cb-${pl.comboShow}-${pi}`}
                initial={{ scale: 0, opacity: 0, rotate: -15 }}
                animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: 15 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
              >
                <span className="bg-yellow-500/90 text-black font-extrabold text-base sm:text-xl px-4 py-1.5 rounded-xl shadow-lg shadow-yellow-500/40">
                  x{pl.comboShow} Combo!
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {pl.noMatch && (
              <motion.div
                key="nomatch"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <span className="bg-red-600/85 text-white font-bold text-xs sm:text-sm px-3 py-1 rounded-lg shadow-lg">
                  Sem combinação!
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {!interactive && (
            <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center pointer-events-none z-10" />
          )}
        </div>
      </div>
    );
  };

  /* ---- colour helpers ---- */
  const timeColor =
    time <= 10
      ? 'text-red-400'
      : time <= 30
        ? 'text-yellow-400'
        : 'text-white';

  /* ============================================================
     JSX
     ============================================================ */
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-4xl mx-auto px-2 py-4 select-none">
      <div className="w-full bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-2xl px-3 sm:px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-cyan-400 font-bold text-sm sm:text-lg truncate">
            <Sparkles className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1 shrink-0" />
            <span className="hidden xs:inline">{NAMES[0]}:</span>
            <span className="xs:hidden">P1:</span>{' '}
            {p[0].score}
          </div>

          <Badge
            variant="outline"
            className="text-[10px] sm:text-base px-2 sm:px-4 py-0.5 sm:py-1 border-yellow-500/50 text-yellow-400 font-bold tracking-wide shrink-0"
          >
            COMBINA 4
          </Badge>

          <div className="text-pink-400 font-bold text-sm sm:text-lg truncate">
            {p[1].score}{' '}
            <span className="hidden xs:inline">: {NAMES[1]}</span>
            <span className="xs:hidden">: P2</span>
            <Sparkles className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 shrink-0" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
        <div
          className={cn(
            'flex items-center gap-1.5 font-mono text-xl sm:text-2xl font-bold tabular-nums',
            timeColor,
          )}
        >
          <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className={cn(time <= 10 && active && 'animate-pulse')}>
            {time}s
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
          Duração:{' '}
          {DURATIONS.map((d) => (
            <Button
              key={d}
              variant={dur === d ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => changeDur(d)}
              disabled={active}
            >
              {d}s
            </Button>
          ))}
        </div>
      </div>

      <div className="h-10 flex items-center justify-center">
        {over ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="text-2xl sm:text-3xl font-extrabold text-yellow-400">
              Tempo!
            </div>
            <div className="text-sm sm:text-base text-white mt-0.5">
              {p[0].score > p[1].score
                ? `${NAMES[0]} venceu!`
                : p[1].score > p[0].score
                  ? `${NAMES[1]} venceu!`
                  : 'Empate!'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {p[0].score} vs {p[1].score}
            </div>
          </motion.div>
        ) : active ? (
          <span className="text-slate-400 text-xs sm:text-sm">
            Selecione duas peças adjacentes
          </span>
        ) : (
          <span className="text-slate-500 text-xs sm:text-sm">
            Escolha a duração e pressione Iniciar
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start overflow-x-auto w-full justify-center pb-1">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-cyan-400 font-semibold text-xs sm:text-sm tracking-wide">
            {NAMES[0]}
          </span>
          {renderGrid(0)}
        </div>

        <div className="flex items-center justify-center py-2 sm:py-8">
          <span className="text-slate-600 font-extrabold text-xl sm:text-3xl select-none">
            VS
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-pink-400 font-semibold text-xs sm:text-sm tracking-wide">
            {NAMES[1]}
          </span>
          {renderGrid(1)}
        </div>
      </div>

      <div className="flex gap-3 mt-1">
        {!active && !over && (
          <Button
            onClick={start}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            Iniciar
          </Button>
        )}
        {over && (
          <Button
            onClick={start}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            Jogar Novamente
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={restart}
          className="text-slate-300"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reiniciar Tudo
        </Button>
      </div>
    </div>
  );
}
