import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Map } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type WallSet = [boolean, boolean, boolean, boolean]; // top, right, bottom, left
type MazeCell = { walls: WallSet };
type Maze = MazeCell[][];
type Pos = [number, number]; // [row, col]
type GamePhase = "idle" | "playing" | "roundEnd" | "gameOver";

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const TOTAL_ROUNDS = 5;
const MOVE_INTERVAL = 75;
const ROUND_TIMEOUT = 60;
const MAZE_SIZES = [8, 9, 10, 12, 15];
const BASE_SCORE = 20;
const MAX_BONUS_TIME = 30;
const BONUS_MULT = 2;
const TRAIL_LEN = 50;

const P1_HEX = "#22d3ee";
const P1_RGB: [number, number, number] = [34, 211, 238];
const P2_HEX = "#f472b6";
const P2_RGB: [number, number, number] = [244, 114, 182];
const START_HEX = "#10b981";
const EXIT_HEX = "#f59e0b";
const WALL_COLOR = "#475569";
const CANVAS_BG = "#020617";
const CELL_COLOR = "#0f172a";

const GAME_KEYS = new Set([
  "w", "W", "a", "A", "s", "S", "d", "D",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

/* ═══════════════════════════════════════════════════════════════════
   Maze Generation — Recursive Backtracking (iterative DFS)

   1. Create a grid of cells, all walls up
   2. Start at cell (0,0), mark as visited
   3. While there are unvisited neighbours:
      a. Pick random unvisited neighbour
      b. Remove wall between current and neighbour
      c. Move to neighbour, mark as visited
      d. Recurse (via stack)
   4. Start at top-left, exit at bottom-right
   ═══════════════════════════════════════════════════════════════════ */

function generateMaze(rows: number, cols: number): Maze {
  const grid: Maze = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): MazeCell => ({
      walls: [true, true, true, true],
    })),
  );

  const visited = Array.from({ length: rows }, () =>
    Array(cols).fill(false) as boolean[],
  );

  const stack: Pos[] = [[0, 0]];
  visited[0][0] = true;

  const dirs: { dr: number; dc: number; w: number; o: number }[] = [
    { dr: -1, dc: 0, w: 0, o: 2 },
    { dr: 0, dc: 1, w: 1, o: 3 },
    { dr: 1, dc: 0, w: 2, o: 0 },
    { dr: 0, dc: -1, w: 3, o: 1 },
  ];

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];
    const nbrs: { nr: number; nc: number; w: number; o: number }[] = [];

    for (const d of dirs) {
      const nr = cr + d.dr;
      const nc = cc + d.dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        nbrs.push({ nr, nc, w: d.w, o: d.o });
      }
    }

    if (nbrs.length > 0) {
      const ch = nbrs[Math.floor(Math.random() * nbrs.length)];
      grid[cr][cc].walls[ch.w] = false;
      grid[ch.nr][ch.nc].walls[ch.o] = false;
      visited[ch.nr][ch.nc] = true;
      stack.push([ch.nr, ch.nc]);
    } else {
      stack.pop();
    }
  }

  return grid;
}

/* ═══════════════════════════════════════════════════════════════════
   Canvas Drawing Helpers
   ═══════════════════════════════════════════════════════════════════ */

function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: Pos[],
  pad: number,
  cw: number,
  ch: number,
  rgb: [number, number, number],
) {
  const len = trail.length;
  if (len < 2) return;
  for (let i = 0; i < len - 1; i++) {
    const t = (i + 1) / len;
    const alpha = t * 0.32;
    const radius = Math.max(1, Math.min(cw, ch) * (0.04 + t * 0.09));
    const [r, c] = trail[i];
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    ctx.beginPath();
    ctx.arc(pad + (c + 0.5) * cw, pad + (r + 0.5) * ch, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayerShape(
  ctx: CanvasRenderingContext2D,
  pos: Pos,
  dir: number,
  pad: number,
  cw: number,
  ch: number,
  hex: string,
  finished: boolean,
  now: number,
) {
  const [r, c] = pos;
  const cx = pad + (c + 0.5) * cw;
  const cy = pad + (r + 0.5) * ch;
  const sz = Math.min(cw, ch) * 0.32;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dir);
  ctx.shadowColor = hex;
  ctx.shadowBlur = finished ? 8 + 5 * Math.sin(now / 200) : 14;
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.moveTo(sz, 0);
  ctx.lineTo(-sz * 0.55, -sz * 0.55);
  ctx.lineTo(-sz * 0.25, 0);
  ctx.lineTo(-sz * 0.55, sz * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export default function MazeRace({ onScore, liveCode }: Props) {
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [dispP1T, setDispP1T] = useState(0);
  const [dispP2T, setDispP2T] = useState(0);
  const [roundWinner, setRoundWinner] = useState<1 | 2 | 0>(0);
  const [lastBonus, setLastBonus] = useState(0);
  const [lastPts, setLastPts] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cvSize = useRef(500);
  const mazeRef = useRef<Maze | null>(null);
  const mzSz = useRef(8);
  const p1Pos = useRef<Pos>([0, 0]);
  const p2Pos = useRef<Pos>([0, 0]);
  const p1Trail = useRef<Pos[]>([[0, 0]]);
  const p2Trail = useRef<Pos[]>([[0, 0]]);
  const p1Dir = useRef(0);
  const p2Dir = useRef(0);
  const p1Done = useRef(false);
  const p2Done = useRef(false);
  const rStart = useRef(0);
  const p1FT = useRef(0);
  const p2FT = useRef(0);
  const lp1m = useRef(0);
  const lp2m = useRef(0);
  const keysDown = useRef(new Set<string>());
  const phRef = useRef<GamePhase>("idle");
  const rRef = useRef(1);
  const scRef = useRef({ p1: 0, p2: 0 });
  const rEnded = useRef(false);
  const animId = useRef(0);
  const onScRef = useRef(onScore);
  onScRef.current = onScore;
  const tmoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUI = useRef(0);

  useEffect(() => {
    mazeRef.current = generateMaze(8, 8);
    mzSz.current = 8;
  }, []);

  useEffect(() => {
    const sync = () => {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      cvSize.current = w;
      const c = canvasRef.current;
      if (c) {
        const dpr = window.devicePixelRatio || 1;
        c.width = w * dpr;
        c.height = w * dpr;
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.key)) { e.preventDefault(); keysDown.current.add(e.key); }
    };
    const ku = (e: KeyboardEvent) => keysDown.current.delete(e.key);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  useEffect(() => {
    return () => { if (tmoRef.current) clearTimeout(tmoRef.current); };
  }, []);

  const tryMove = useCallback((player: 1 | 2, dr: number, dc: number): boolean => {
    const maze = mazeRef.current;
    if (!maze) return false;
    const pos = player === 1 ? p1Pos.current : p2Pos.current;
    const [r, c] = pos;
    let wi: number;
    if (dr === -1) wi = 0;
    else if (dc === 1) wi = 1;
    else if (dr === 1) wi = 2;
    else wi = 3;
    if (maze[r][c].walls[wi]) return false;
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= maze.length || nc < 0 || nc >= maze[0].length) return false;
    const np: Pos = [nr, nc];
    if (player === 1) {
      p1Pos.current = np;
      p1Trail.current = [...p1Trail.current, np].slice(-TRAIL_LEN);
      p1Dir.current = Math.atan2(dr, dc);
    } else {
      p2Pos.current = np;
      p2Trail.current = [...p2Trail.current, np].slice(-TRAIL_LEN);
      p2Dir.current = Math.atan2(dr, dc);
    }
    const er = maze.length - 1;
    const ec = maze[0].length - 1;
    if (nr === er && nc === ec) {
      const t = (Date.now() - rStart.current) / 1000;
      if (player === 1) { p1Done.current = true; p1FT.current = t; }
      else { p2Done.current = true; p2FT.current = t; }
    }
    return true;
  }, []);

  const startRound = useCallback((rn: number) => {
    const size = MAZE_SIZES[Math.min(rn - 1, MAZE_SIZES.length - 1)];
    mzSz.current = size;
    mazeRef.current = generateMaze(size, size);
    p1Pos.current = [0, 0];
    p2Pos.current = [0, 0];
    p1Trail.current = [[0, 0]];
    p2Trail.current = [[0, 0]];
    p1Dir.current = 0;
    p2Dir.current = 0;
    p1Done.current = false;
    p2Done.current = false;
    rStart.current = Date.now();
    p1FT.current = 0;
    p2FT.current = 0;
    lp1m.current = 0;
    lp2m.current = 0;
    rEnded.current = false;
    keysDown.current.clear();
    setRound(rn);
    rRef.current = rn;
    setDispP1T(0);
    setDispP2T(0);
    setRoundWinner(0);
    setLastBonus(0);
    setLastPts(0);
    setPhase("playing");
    phRef.current = "playing";
  }, []);

  const endRound = useCallback((winner: 1 | 2 | 0) => {
    if (rEnded.current) return;
    rEnded.current = true;
    const ft = winner === 1 ? p1FT.current : winner === 2 ? p2FT.current : 0;
    const bonus = winner !== 0 ? Math.max(0, Math.floor((MAX_BONUS_TIME - ft) * BONUS_MULT)) : 0;
    const pts = winner !== 0 ? BASE_SCORE + bonus : 0;
    setRoundWinner(winner);
    setLastBonus(bonus);
    setLastPts(pts);
    phRef.current = "roundEnd";
    setPhase("roundEnd");
    if (winner === 1) { scRef.current.p1 += pts; setScores({ ...scRef.current }); }
    else if (winner === 2) { scRef.current.p2 += pts; setScores({ ...scRef.current }); }
    tmoRef.current = setTimeout(() => {
      if (rRef.current >= TOTAL_ROUNDS) {
        phRef.current = "gameOver";
        setPhase("gameOver");
        const s = scRef.current;
        if (s.p1 > s.p2) onScRef.current?.("Jogador 1", s.p1);
        else if (s.p2 > s.p1) onScRef.current?.("Jogador 2", s.p2);
        else onScRef.current?.("Empate", s.p1);
      } else {
        startRound(rRef.current + 1);
      }
    }, 2500);
  }, [startRound]);

  const startGame = useCallback(() => {
    scRef.current = { p1: 0, p2: 0 };
    setScores({ p1: 0, p2: 0 });
    rRef.current = 1;
    startRound(1);
  }, [startRound]);

  const resetAll = useCallback(() => {
    if (tmoRef.current) clearTimeout(tmoRef.current);
    phRef.current = "idle";
    setPhase("idle");
    scRef.current = { p1: 0, p2: 0 };
    setScores({ p1: 0, p2: 0 });
    setRound(1);
    rRef.current = 1;
    setDispP1T(0);
    setDispP2T(0);
    setRoundWinner(0);
    mazeRef.current = generateMaze(8, 8);
    mzSz.current = 8;
    p1Pos.current = [0, 0];
    p2Pos.current = [0, 0];
    p1Trail.current = [[0, 0]];
    p2Trail.current = [[0, 0]];
    keysDown.current.clear();
  }, []);

  /* ═══════════════════════════════════════════════════════════════════
     Game Loop (requestAnimationFrame)
     ═══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const loop = () => {
      const now = Date.now();
      const canvas = canvasRef.current;
      if (!canvas) { animId.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { animId.current = requestAnimationFrame(loop); return; }

      if (phRef.current === "playing" && !rEnded.current) {
        const elapsed = (now - rStart.current) / 1000;
        if (now - lastUI.current >= 80) {
          lastUI.current = now;
          setDispP1T(p1Done.current ? p1FT.current : elapsed);
          setDispP2T(p2Done.current ? p2FT.current : elapsed);
        }
        if (elapsed >= ROUND_TIMEOUT) {
          if (p1Done.current && !p2Done.current) endRound(1);
          else if (p2Done.current && !p1Done.current) endRound(2);
          else if (p1Done.current && p2Done.current) endRound(p1FT.current <= p2FT.current ? 1 : 2);
          else endRound(0);
        } else {
          if (!p1Done.current && now - lp1m.current >= MOVE_INTERVAL) {
            const k = keysDown.current;
            let m = false;
            if (k.has("w") || k.has("W")) m = tryMove(1, -1, 0);
            else if (k.has("s") || k.has("S")) m = tryMove(1, 1, 0);
            else if (k.has("a") || k.has("A")) m = tryMove(1, 0, -1);
            else if (k.has("d") || k.has("D")) m = tryMove(1, 0, 1);
            if (m) lp1m.current = now;
          }
          if (!p2Done.current && now - lp2m.current >= MOVE_INTERVAL) {
            const k = keysDown.current;
            let m = false;
            if (k.has("ArrowUp")) m = tryMove(2, -1, 0);
            else if (k.has("ArrowDown")) m = tryMove(2, 1, 0);
            else if (k.has("ArrowLeft")) m = tryMove(2, 0, -1);
            else if (k.has("ArrowRight")) m = tryMove(2, 0, 1);
            if (m) lp2m.current = now;
          }
          if (p1Done.current && !rEnded.current) endRound(1);
          else if (p2Done.current && !rEnded.current) endRound(2);
        }
      }

      /* ── Canvas rendering ── */
      const dpr = window.devicePixelRatio || 1;
      const S = cvSize.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, S, S);

      const maze = mazeRef.current;
      if (!maze) { animId.current = requestAnimationFrame(loop); return; }
      const rows = maze.length;
      const cols = maze[0].length;
      const pad = Math.max(8, S * 0.025);
      const area = S - pad * 2;
      const cellW = area / cols;
      const cellH = area / rows;

      ctx.fillStyle = CELL_COLOR;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillRect(pad + c * cellW, pad + r * cellH, cellW, cellH);
        }
      }

      const mr = Math.min(cellW, cellH) * 0.2;
      ctx.save();
      ctx.shadowColor = START_HEX;
      ctx.shadowBlur = 10;
      ctx.fillStyle = START_HEX;
      ctx.beginPath();
      ctx.arc(pad + cellW * 0.5, pad + cellH * 0.5, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const pulse = 0.5 + 0.5 * Math.sin(now / 300);
      ctx.save();
      ctx.shadowColor = EXIT_HEX;
      ctx.shadowBlur = 8 + 14 * pulse;
      ctx.fillStyle = `rgba(245,158,11,${(0.5 + 0.5 * pulse).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(pad + (cols - 0.5) * cellW, pad + (rows - 0.5) * cellH, mr * (0.8 + 0.3 * pulse), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (phRef.current !== "idle") {
        drawTrail(ctx, p1Trail.current, pad, cellW, cellH, P1_RGB);
        drawTrail(ctx, p2Trail.current, pad, cellW, cellH, P2_RGB);
      }

      ctx.strokeStyle = WALL_COLOR;
      ctx.lineWidth = Math.max(1.5, Math.min(cellW, cellH) * 0.06);
      ctx.lineCap = "round";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = pad + c * cellW;
          const y = pad + r * cellH;
          const w = maze[r][c].walls;
          if (w[0]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellW, y); ctx.stroke(); }
          if (w[1]) { ctx.beginPath(); ctx.moveTo(x + cellW, y); ctx.lineTo(x + cellW, y + cellH); ctx.stroke(); }
          if (w[2]) { ctx.beginPath(); ctx.moveTo(x, y + cellH); ctx.lineTo(x + cellW, y + cellH); ctx.stroke(); }
          if (w[3]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellH); ctx.stroke(); }
        }
      }

      if (phRef.current !== "idle") {
        drawPlayerShape(ctx, p1Pos.current, p1Dir.current, pad, cellW, cellH, P1_HEX, p1Done.current, now);
        drawPlayerShape(ctx, p2Pos.current, p2Dir.current, pad, cellW, cellH, P2_HEX, p2Done.current, now);
      }

      animId.current = requestAnimationFrame(loop);
    };
    animId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId.current);
  }, [tryMove, endRound]);

  const mkDpad = (key: string, arrow: string, bg: string, tc: string) => (
    <button
      key={key}
      type="button"
      className={cn("w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-transform select-none border text-lg font-bold", bg, tc)}
      onTouchStart={(e) => { e.preventDefault(); keysDown.current.add(key); }}
      onTouchEnd={(e) => { e.preventDefault(); keysDown.current.delete(key); }}
      onTouchCancel={() => keysDown.current.delete(key)}
      onMouseDown={(e) => { e.preventDefault(); keysDown.current.add(key); }}
      onMouseUp={() => keysDown.current.delete(key)}
      onMouseLeave={() => keysDown.current.delete(key)}
    >
      {arrow}
    </button>
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 p-2">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-2xl px-4 py-3 flex items-center justify-between"
      >
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-[11px] text-cyan-400/70 uppercase tracking-wide">Jogador 1</span>
          <span className="text-cyan-400 font-bold text-xl tabular-nums">{scores.p1}</span>
        </div>
        <div className="text-center flex-1 mx-2">
          <h2 className="text-white font-bold text-base sm:text-xl tracking-wider">CORRIDA NO LABIRINTO</h2>
          {phase !== "idle" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-center mt-1 flex-wrap">
              <Badge variant="outline" className="border-slate-600 text-slate-300 text-[11px] px-2">Round {round}/{TOTAL_ROUNDS}</Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300 text-[11px] px-2">{mzSz.current}x{mzSz.current}</Badge>
            </motion.div>
          )}
          {phase === "playing" && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-400 text-xs mt-1">Encontre a saída!</motion.p>
          )}
        </div>
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-[11px] text-pink-400/70 uppercase tracking-wide">Jogador 2</span>
          <span className="text-pink-400 font-bold text-xl tabular-nums">{scores.p2}</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {(phase === "playing" || phase === "roundEnd") && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex justify-center gap-6 text-sm overflow-hidden">
            <span className="text-cyan-400 font-mono tabular-nums">Jogador 1: {dispP1T.toFixed(1)}s</span>
            <span className="text-pink-400 font-mono tabular-nums">Jogador 2: {dispP2T.toFixed(1)}s</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="w-full max-w-[500px] aspect-square mx-auto">
        <canvas ref={canvasRef} className="w-full h-full rounded-2xl border border-slate-800 bg-slate-950" />
      </div>

      <AnimatePresence>
        {phase === "roundEnd" && (
          <motion.div key="rr" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center py-1">
            {roundWinner === 0 ? (
              <p className="text-yellow-400 text-xl sm:text-2xl font-bold">Empate!</p>
            ) : (
              <p className={cn("text-xl sm:text-2xl font-bold", roundWinner === 1 ? "text-cyan-400" : "text-pink-400")}>
                {roundWinner === 1 ? "Jogador 1" : "Jogador 2"} Chegou!
                <span className="text-sm ml-2 text-slate-400">+{lastPts} pts{lastBonus > 0 ? ` (bonus ${lastBonus})` : ""}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden md:flex justify-center gap-8 text-xs text-slate-500">
        <span>Jogador 1: WASD</span>
        <span>Jogador 2: Setas</span>
      </div>

      <div className="flex md:hidden justify-center gap-10">
        <div>
          <p className="text-cyan-400 text-xs text-center mb-1 font-medium">Jogador 1</p>
          <div className="grid grid-cols-3 gap-1">
            <div />
            {mkDpad("w", "\u25B2", "bg-cyan-500/15 border-cyan-500/25", "text-cyan-400")}
            <div />
            {mkDpad("a", "\u25C4", "bg-cyan-500/15 border-cyan-500/25", "text-cyan-400")}
            <div className="w-12 h-12" />
            {mkDpad("d", "\u25BA", "bg-cyan-500/15 border-cyan-500/25", "text-cyan-400")}
            <div />
            {mkDpad("s", "\u25BC", "bg-cyan-500/15 border-cyan-500/25", "text-cyan-400")}
            <div />
          </div>
        </div>
        <div>
          <p className="text-pink-400 text-xs text-center mb-1 font-medium">Jogador 2</p>
          <div className="grid grid-cols-3 gap-1">
            <div />
            {mkDpad("ArrowUp", "\u25B2", "bg-pink-500/15 border-pink-500/25", "text-pink-400")}
            <div />
            {mkDpad("ArrowLeft", "\u25C4", "bg-pink-500/15 border-pink-500/25", "text-pink-400")}
            <div className="w-12 h-12" />
            {mkDpad("ArrowRight", "\u25BA", "bg-pink-500/15 border-pink-500/25", "text-pink-400")}
            <div />
            {mkDpad("ArrowDown", "\u25BC", "bg-pink-500/15 border-pink-500/25", "text-pink-400")}
            <div />
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {phase === "idle" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button onClick={startGame} size="lg" className="gap-2"><Map className="h-4 w-4" />Iniciar Jogo</Button>
          </motion.div>
        )}
        {phase === "playing" && (
          <Button onClick={resetAll} variant="outline" size="sm" className="gap-1 border-slate-700 text-slate-400 hover:text-slate-200">
            <RotateCcw className="h-3 w-3" />Reiniciar Tudo
          </Button>
        )}
        {phase === "gameOver" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button onClick={resetAll} size="lg" className="gap-2"><RotateCcw className="h-4 w-4" />Reiniciar Tudo</Button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {phase === "gameOver" && (
          <motion.div key="go" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-3 py-4">
            <h3 className="text-2xl font-bold text-white">Jogo Finalizado!</h3>
            <div className="flex justify-center gap-10">
              <div className="text-center">
                <span className="block text-3xl font-bold text-cyan-400 tabular-nums">{scores.p1}</span>
                <span className="text-sm text-cyan-400/70">Jogador 1</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl font-bold text-pink-400 tabular-nums">{scores.p2}</span>
                <span className="text-sm text-pink-400/70">Jogador 2</span>
              </div>
            </div>
            <p className={cn("text-xl font-bold", scores.p1 > scores.p2 ? "text-cyan-400" : scores.p2 > scores.p1 ? "text-pink-400" : "text-yellow-400")}>
              {scores.p1 > scores.p2 ? "Jogador 1 Venceu!" : scores.p2 > scores.p1 ? "Jogador 2 Venceu!" : "Empate!"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
