import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Map, Trophy, Timer, Zap, Target, ChevronRight } from "lucide-react";
import ConfettiBurst from "@/components/ui/ConfettiBurst";

/* ═════════════════════════════════════════════════════
   Types
   ═════════════════════════════════════════════════════ */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type WallSet = [boolean, boolean, boolean, boolean]; // top, right, bottom, left
type MazeCell = { walls: WallSet };
type Maze = MazeCell[][];
type Pos = [number, number]; // [row, col]
type GamePhase = "idle" | "playing" | "roundEnd" | "gameOver";

/* ═════════════════════════════════════════════════════
   Constants
   ═════════════════════════════════════════════════════ */

const TOTAL_ROUNDS = 5;
const MOVE_INTERVAL = 75;
const ROUND_TIMEOUT = 60;
const MAZE_SIZES = [8, 9, 10, 12, 15];
const BASE_SCORE = 20;
const MAX_BONUS_TIME = 30;
const BONUS_MULT = 2;
const TRAIL_LEN = 60;

const P1_HEX = "#22d3ee";
const P1_RGB: [number, number, number] = [34, 211, 238];
const P2_HEX = "#f472b6";
const P2_RGB: [number, number, number] = [244, 114, 182];
const START_HEX = "#10b981";
const EXIT_HEX = "#f59e0b";
const WALL_COLOR_A = "#1e3a5f";
const WALL_COLOR_B = "#475569";
const WALL_GLOW = "#3b82f6";
const CANVAS_BG = "#020617";
const CELL_COLOR = "#0a0f1e";
const PATHFIND_ALPHA = 0.12;

const GAME_KEYS = new Set([
  "w", "W", "a", "A", "s", "S", "d", "D",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

/* ═════════════════════════════════════════════════════
   Maze Generation — Recursive Backtracking (iterative DFS)
   ═════════════════════════════════════════════════════ */

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

/* ═════════════════════════════════════════════════════
   BFS Pathfinding from goal (reverse) — precompute once per maze
   Returns a 2D grid of distances from every cell to the goal,
   plus a "came_from" grid to reconstruct the path.
   ═════════════════════════════════════════════════════ */

interface PathfindData {
  dist: number[][];
  cameFrom: (Pos | null)[][];
}

function computePathfind(maze: Maze): PathfindData {
  const rows = maze.length;
  const cols = maze[0].length;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const cameFrom = Array.from({ length: rows }, () =>
    Array(cols).fill(null) as (Pos | null)[],
  );

  const goalR = rows - 1;
  const goalC = cols - 1;
  dist[goalR][goalC] = 0;

  // Directions: top, right, bottom, left with wall index
  const dirs = [
    { dr: -1, dc: 0, w: 0 }, // move up: need no top wall
    { dr: 0, dc: 1, w: 1 },  // move right: need no right wall
    { dr: 1, dc: 0, w: 2 },  // move down: need no bottom wall
    { dr: 0, dc: -1, w: 3 }, // move left: need no left wall
  ];

  const queue: Pos[] = [[goalR, goalC]];
  let head = 0;

  while (head < queue.length) {
    const [cr, cc] = queue[head++];
    for (const d of dirs) {
      // Check if we can move FROM (cr,cc) in direction d
      // Since we're doing reverse BFS from goal, moving from cr,cc to nr,nc
      // means the path from nr,nc to goal goes through cr,cc.
      // We need to check the wall of (cr,cc) in direction d.
      if (maze[cr][cc].walls[d.w]) continue;
      const nr = cr + d.dr;
      const nc = cc + d.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (dist[nr][nc] <= dist[cr][cc] + 1) continue;
      dist[nr][nc] = dist[cr][cc] + 1;
      cameFrom[nr][nc] = [cr, cc];
      queue.push([nr, nc]);
    }
  }

  return { dist, cameFrom };
}

function tracePath(
  from: Pos,
  cameFrom: (Pos | null)[][],
): Pos[] {
  const path: Pos[] = [from];
  let cur: Pos | null = from;
  const seen = new Set<string>();
  while (cur) {
    const key = `${cur[0]},${cur[1]}`;
    if (seen.has(key)) break;
    seen.add(key);
    const next = cameFrom[cur[0]][cur[1]];
    if (!next) break;
    path.push(next);
    cur = next;
  }
  return path;
}

/* ═════════════════════════════════════════════════════
   Canvas Drawing Helpers
   ═════════════════════════════════════════════════════ */

/** Draw trail with connected glow line + fading dots */
function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: Pos[],
  pad: number,
  cw: number,
  ch: number,
  rgb: [number, number, number],
  now: number,
) {
  const len = trail.length;
  if (len < 1) return;

  // Connected glow line
  if (len >= 2) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < len - 1; i++) {
      const t = (i + 1) / len;
      const alpha = t * 0.18;
      const width = Math.max(1, Math.min(cw, ch) * (0.03 + t * 0.12));
      const [r1, c1] = trail[i];
      const [r2, c2] = trail[i + 1];
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.lineWidth = width;
      ctx.shadowColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.6})`;
      ctx.shadowBlur = width * 2;
      ctx.beginPath();
      ctx.moveTo(pad + (c1 + 0.5) * cw, pad + (r1 + 0.5) * ch);
      ctx.lineTo(pad + (c2 + 0.5) * cw, pad + (r2 + 0.5) * ch);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Fading dots
  for (let i = 0; i < len; i++) {
    const t = (i + 1) / len;
    const alpha = t * 0.28;
    const radius = Math.max(1, Math.min(cw, ch) * (0.03 + t * 0.06));
    const [r, c] = trail[i];
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    ctx.beginPath();
    ctx.arc(pad + (c + 0.5) * cw, pad + (r + 0.5) * ch, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright tip on the last position
  if (len >= 1) {
    const [r, c] = trail[len - 1];
    const tipR = Math.max(2, Math.min(cw, ch) * 0.12);
    const tipPulse = 0.5 + 0.5 * Math.sin(now / 150);
    ctx.save();
    ctx.shadowColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.8)`;
    ctx.shadowBlur = tipR * (2 + tipPulse);
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.3 + 0.15 * tipPulse})`;
    ctx.beginPath();
    ctx.arc(pad + (c + 0.5) * cw, pad + (r + 0.5) * ch, tipR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Draw player arrow with enhanced glow ring */
function drawPlayerShape(
  ctx: CanvasRenderingContext2D,
  pos: Pos,
  dir: number,
  pad: number,
  cw: number,
  ch: number,
  hex: string,
  rgb: [number, number, number],
  finished: boolean,
  now: number,
) {
  const [r, c] = pos;
  const cx = pad + (c + 0.5) * cw;
  const cy = pad + (r + 0.5) * ch;
  const sz = Math.min(cw, ch) * 0.32;

  // Outer glow ring
  const ringPulse = finished ? 0.6 + 0.4 * Math.sin(now / 150) : 0.3 + 0.15 * Math.sin(now / 400);
  ctx.save();
  ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${ringPulse * 0.35})`;
  ctx.lineWidth = Math.max(1, sz * 0.15);
  ctx.shadowColor = hex;
  ctx.shadowBlur = finished ? 20 : 10;
  ctx.beginPath();
  ctx.arc(cx, cy, sz * (finished ? 1.4 + 0.2 * Math.sin(now / 200) : 1.1), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Arrow body
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dir);
  ctx.shadowColor = hex;
  ctx.shadowBlur = finished ? 10 + 6 * Math.sin(now / 200) : 16;
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.moveTo(sz, 0);
  ctx.lineTo(-sz * 0.55, -sz * 0.55);
  ctx.lineTo(-sz * 0.25, 0);
  ctx.lineTo(-sz * 0.55, sz * 0.55);
  ctx.closePath();
  ctx.fill();

  // Inner bright core
  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,255,255,${finished ? 0.5 + 0.3 * Math.sin(now / 200) : 0.35})`;
  ctx.beginPath();
  ctx.arc(0, 0, sz * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw gradient walls with subtle blue glow */
function drawWalls(
  ctx: CanvasRenderingContext2D,
  maze: Maze,
  pad: number,
  cellW: number,
  cellH: number,
  rows: number,
  cols: number,
) {
  const lw = Math.max(1.5, Math.min(cellW, cellH) * 0.07);

  // Pre-build wall gradient
  const grad = ctx.createLinearGradient(pad, pad, pad + cols * cellW, pad + rows * cellH);
  grad.addColorStop(0, WALL_COLOR_A);
  grad.addColorStop(0.5, WALL_COLOR_B);
  grad.addColorStop(1, WALL_COLOR_A);

  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.shadowColor = WALL_GLOW;
  ctx.shadowBlur = 3;

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
  ctx.restore();
}

/** Draw goal with layered radial glow + pulsing rings */
function drawGoal(
  ctx: CanvasRenderingContext2D,
  pad: number,
  cellW: number,
  cellH: number,
  rows: number,
  cols: number,
  now: number,
) {
  const cx = pad + (cols - 0.5) * cellW;
  const cy = pad + (rows - 0.5) * cellH;
  const baseR = Math.min(cellW, cellH) * 0.22;
  const pulse = 0.5 + 0.5 * Math.sin(now / 300);

  // Outer radial glow
  ctx.save();
  const outerR = baseR * (3 + pulse);
  const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
  radGrad.addColorStop(0, `rgba(245,158,11,${(0.18 + 0.08 * pulse).toFixed(3)})`);
  radGrad.addColorStop(0.4, `rgba(245,158,11,${(0.06 + 0.04 * pulse).toFixed(3)})`);
  radGrad.addColorStop(1, "rgba(245,158,11,0)");
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Pulsing ring 1
  ctx.save();
  const ringR1 = baseR * (1.6 + 0.5 * pulse);
  ctx.strokeStyle = `rgba(245,158,11,${(0.15 + 0.15 * pulse).toFixed(3)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Pulsing ring 2 (offset phase)
  const pulse2 = 0.5 + 0.5 * Math.sin(now / 300 + 1.5);
  ctx.save();
  const ringR2 = baseR * (2.0 + 0.4 * pulse2);
  ctx.strokeStyle = `rgba(251,191,36,${(0.08 + 0.08 * pulse2).toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Core circle
  ctx.save();
  ctx.shadowColor = EXIT_HEX;
  ctx.shadowBlur = 10 + 16 * pulse;
  ctx.fillStyle = `rgba(245,158,11,${(0.6 + 0.4 * pulse).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * (0.8 + 0.25 * pulse), 0, Math.PI * 2);
  ctx.fill();
  // White hot center
  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,255,255,${(0.4 + 0.3 * pulse).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw start marker with subtle glow */
function drawStart(
  ctx: CanvasRenderingContext2D,
  pad: number,
  cellW: number,
  cellH: number,
  now: number,
) {
  const cx = pad + cellW * 0.5;
  const cy = pad + cellH * 0.5;
  const mr = Math.min(cellW, cellH) * 0.2;
  const pulse = 0.5 + 0.5 * Math.sin(now / 500);

  ctx.save();
  ctx.shadowColor = START_HEX;
  ctx.shadowBlur = 8 + 4 * pulse;
  ctx.fillStyle = `rgba(16,185,129,${(0.5 + 0.2 * pulse).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,255,255,${(0.2 + 0.1 * pulse).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, mr * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw pathfinding visualization (dotted path from player to goal) */
function drawPathfindVis(
  ctx: CanvasRenderingContext2D,
  path: Pos[],
  pad: number,
  cw: number,
  ch: number,
  rgb: [number, number, number],
  now: number,
  isDone: boolean,
) {
  if (path.length < 2 || isDone) return;
  const len = path.length;

  ctx.save();
  ctx.setLineDash([cw * 0.15, cw * 0.2]);
  ctx.lineDashOffset = -now / 80;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, Math.min(cw, ch) * 0.06);
  ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${PATHFIND_ALPHA})`;
  ctx.beginPath();
  const [r0, c0] = path[0];
  ctx.moveTo(pad + (c0 + 0.5) * cw, pad + (r0 + 0.5) * ch);
  for (let i = 1; i < len; i++) {
    const [r, c] = path[i];
    ctx.lineTo(pad + (c + 0.5) * cw, pad + (r + 0.5) * ch);
  }
  ctx.stroke();
  ctx.restore();

  // Distance indicator dots at intervals
  const step = Math.max(1, Math.floor(len / 6));
  for (let i = 0; i < len; i += step) {
    const t = i / len;
    const [r, c] = path[i];
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${PATHFIND_ALPHA * (0.5 + t * 0.5)})`;
    ctx.beginPath();
    ctx.arc(pad + (c + 0.5) * cw, pad + (r + 0.5) * ch, Math.max(1.5, Math.min(cw, ch) * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ═════════════════════════════════════════════════════
   Component
   ═════════════════════════════════════════════════════ */

export default function MazeRace({ onScore, liveCode }: Props) {
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [dispP1T, setDispP1T] = useState(0);
  const [dispP2T, setDispP2T] = useState(0);
  const [roundWinner, setRoundWinner] = useState<1 | 2 | 0>(0);
  const [lastBonus, setLastBonus] = useState(0);
  const [lastPts, setLastPts] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [prevScores, setPrevScores] = useState({ p1: 0, p2: 0 });

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
  const pathfindRef = useRef<PathfindData | null>(null);
  const p1PathRef = useRef<Pos[]>([]);
  const p2PathRef = useRef<Pos[]>([]);
  const lastPathUpdate = useRef(0);

  // Score delta tracking for animation
  const scoreP1Delta = scores.p1 - prevScores.p1;
  const scoreP2Delta = scores.p2 - prevScores.p2;

  useEffect(() => {
    const maze = generateMaze(8, 8);
    mazeRef.current = maze;
    mzSz.current = 8;
    pathfindRef.current = computePathfind(maze);
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

  // Track previous scores for delta animation
  useEffect(() => {
    const t = setTimeout(() => setPrevScores({ ...scores }), 800);
    return () => clearTimeout(t);
  }, [scores]);

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
    const maze = generateMaze(size, size);
    mazeRef.current = maze;
    pathfindRef.current = computePathfind(maze);
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
    lastPathUpdate.current = 0;
    p1PathRef.current = [];
    p2PathRef.current = [];
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
        setShowConfetti(true);
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
    setPrevScores({ p1: 0, p2: 0 });
    rRef.current = 1;
    startRound(1);
  }, [startRound]);

  const resetAll = useCallback(() => {
    if (tmoRef.current) clearTimeout(tmoRef.current);
    phRef.current = "idle";
    setPhase("idle");
    setShowConfetti(false);
    scRef.current = { p1: 0, p2: 0 };
    setScores({ p1: 0, p2: 0 });
    setPrevScores({ p1: 0, p2: 0 });
    setRound(1);
    rRef.current = 1;
    setDispP1T(0);
    setDispP2T(0);
    setRoundWinner(0);
    const maze = generateMaze(8, 8);
    mazeRef.current = maze;
    mzSz.current = 8;
    pathfindRef.current = computePathfind(maze);
    p1Pos.current = [0, 0];
    p2Pos.current = [0, 0];
    p1Trail.current = [[0, 0]];
    p2Trail.current = [[0, 0]];
    p1PathRef.current = [];
    p2PathRef.current = [];
    keysDown.current.clear();
  }, []);

  // Timer progress (0..1)
  const timerProgress = useMemo(() => {
    if (phase !== "playing") return 1;
    return Math.max(0, 1 - dispP1T / ROUND_TIMEOUT);
  }, [phase, dispP1T]);

  // Determine winner for game over
  const finalWinner = useMemo(() => {
    if (scores.p1 > scores.p2) return 1 as const;
    if (scores.p2 > scores.p1) return 2 as const;
    return 0 as const;
  }, [scores]);

  /* ═════════════════════════════════════════════════════
     Game Loop (requestAnimationFrame)
     ═════════════════════════════════════════════════════ */
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

      // Update pathfinding visualization paths periodically
      if (phRef.current === "playing" && !rEnded.current && pathfindRef.current) {
        if (now - lastPathUpdate.current >= 150) {
          lastPathUpdate.current = now;
          if (!p1Done.current) {
            p1PathRef.current = tracePath(p1Pos.current, pathfindRef.current.cameFrom);
          } else {
            p1PathRef.current = [];
          }
          if (!p2Done.current) {
            p2PathRef.current = tracePath(p2Pos.current, pathfindRef.current.cameFrom);
          } else {
            p2PathRef.current = [];
          }
        }
      }

      /* ── Canvas rendering ── */
      const dpr = window.devicePixelRatio || 1;
      const S = cvSize.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background with subtle vignette
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, S, S);
      const vigGrad = ctx.createRadialGradient(S / 2, S / 2, S * 0.25, S / 2, S / 2, S * 0.7);
      vigGrad.addColorStop(0, "rgba(2,6,23,0)");
      vigGrad.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, S, S);

      const maze = mazeRef.current;
      if (!maze) { animId.current = requestAnimationFrame(loop); return; }
      const rows = maze.length;
      const cols = maze[0].length;
      const pad = Math.max(8, S * 0.025);
      const area = S - pad * 2;
      const cellW = area / cols;
      const cellH = area / rows;

      // Cell fills with subtle grid pattern
      ctx.fillStyle = CELL_COLOR;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillRect(pad + c * cellW + 0.5, pad + r * cellH + 0.5, cellW - 1, cellH - 1);
        }
      }

      // Goal (behind everything)
      drawGoal(ctx, pad, cellW, cellH, rows, cols, now);

      // Start marker
      drawStart(ctx, pad, cellW, cellH, now);

      // Pathfinding visualization
      if (phRef.current !== "idle") {
        drawPathfindVis(ctx, p1PathRef.current, pad, cellW, cellH, P1_RGB, now, p1Done.current);
        drawPathfindVis(ctx, p2PathRef.current, pad, cellW, cellH, P2_RGB, now, p2Done.current);
      }

      // Trails
      if (phRef.current !== "idle") {
        drawTrail(ctx, p1Trail.current, pad, cellW, cellH, P1_RGB, now);
        drawTrail(ctx, p2Trail.current, pad, cellW, cellH, P2_RGB, now);
      }

      // Gradient walls
      drawWalls(ctx, maze, pad, cellW, cellH, rows, cols);

      // Players
      if (phRef.current !== "idle") {
        drawPlayerShape(ctx, p1Pos.current, p1Dir.current, pad, cellW, cellH, P1_HEX, P1_RGB, p1Done.current, now);
        drawPlayerShape(ctx, p2Pos.current, p2Dir.current, pad, cellW, cellH, P2_HEX, P2_RGB, p2Done.current, now);
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
      {/* ── Header Score Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-pink-950/60 border border-slate-700/50 rounded-2xl px-4 py-3 flex items-center justify-between"
      >
        {/* Subtle animated bg shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />

        <div className="flex flex-col items-center min-w-[70px] relative z-10">
          <span className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-medium">Jogador 1</span>
          <motion.span
            key={scores.p1}
            initial={scoreP1Delta > 0 ? { scale: 1.4, color: "#67e8f9" } : {}}
            animate={{ scale: 1, color: P1_HEX }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="font-extrabold text-2xl tabular-nums"
          >
            {scores.p1}
          </motion.span>
          {scoreP1Delta > 0 && (
            <motion.span
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.8 }}
              className="text-cyan-300 text-xs font-bold absolute -top-1"
            >
              +{scoreP1Delta}
            </motion.span>
          )}
        </div>

        <div className="text-center flex-1 mx-3 relative z-10">
          <h2 className="text-white font-bold text-sm sm:text-lg tracking-[0.15em] bg-gradient-to-r from-cyan-300 via-white to-pink-300 bg-clip-text text-transparent">
            CORRIDA NO LABIRINTO
          </h2>
          {phase !== "idle" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-center mt-1.5 flex-wrap">
              <Badge variant="outline" className="border-slate-600/60 text-slate-400 text-[10px] px-2 py-0 bg-slate-800/40">
                Round {round}/{TOTAL_ROUNDS}
              </Badge>
              <Badge variant="outline" className="border-slate-600/60 text-slate-400 text-[10px] px-2 py-0 bg-slate-800/40">
                {mzSz.current}x{mzSz.current}
              </Badge>
            </motion.div>
          )}
          {phase === "playing" && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-500 text-[11px] mt-1 flex items-center justify-center gap-1.5">
              <Target className="h-3 w-3" />
              <span>Encontre a saída!</span>
            </motion.p>
          )}
        </div>

        <div className="flex flex-col items-center min-w-[70px] relative z-10">
          <span className="text-[10px] text-pink-400/60 uppercase tracking-widest font-medium">Jogador 2</span>
          <motion.span
            key={scores.p2}
            initial={scoreP2Delta > 0 ? { scale: 1.4, color: "#f9a8d4" } : {}}
            animate={{ scale: 1, color: P2_HEX }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="font-extrabold text-2xl tabular-nums"
          >
            {scores.p2}
          </motion.span>
          {scoreP2Delta > 0 && (
            <motion.span
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.8 }}
              className="text-pink-300 text-xs font-bold absolute -top-1"
            >
              +{scoreP2Delta}
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* ── Timer Bar with Progress ── */}
      <AnimatePresence>
        {(phase === "playing" || phase === "roundEnd") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-1">
              {/* P1 timer */}
              <div className="flex items-center gap-2 min-w-[120px]">
                <Timer className="h-3.5 w-3.5 text-cyan-400/70" />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[10px] text-cyan-400/60 uppercase tracking-wide">P1</span>
                    <span className={cn(
                      "font-mono text-xs tabular-nums",
                      p1Done.current ? "text-cyan-300" : dispP1T > ROUND_TIMEOUT * 0.8 ? "text-red-400" : "text-cyan-400/80",
                    )}>
                      {dispP1T.toFixed(1)}s
                    </span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (dispP1T / ROUND_TIMEOUT) * 100)}%`,
                        background: p1Done.current
                          ? "#22d3ee"
                          : dispP1T > ROUND_TIMEOUT * 0.8
                            ? "linear-gradient(90deg, #ef4444, #f97316)"
                            : "linear-gradient(90deg, #0e7490, #22d3ee)",
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              </div>

              {/* Center: round info + bonus potential */}
              <div className="text-center flex-shrink-0">
                {phase === "playing" && (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Tempo</span>
                    <span className={cn(
                      "font-mono text-sm font-bold tabular-nums",
                      ROUND_TIMEOUT - dispP1T < 10 ? "text-red-400" : "text-slate-300",
                    )}>
                      {Math.max(0, ROUND_TIMEOUT - Math.ceil(dispP1T))}s
                    </span>
                    {lastPts === 0 && !p1Done.current && !p2Done.current && (
                      <span className="text-[9px] text-amber-400/60 flex items-center gap-0.5 mt-0.5">
                        <Zap className="h-2.5 w-2.5" />
                        bonus até 30s
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* P2 timer */}
              <div className="flex items-center gap-2 min-w-[120px] justify-end">
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[10px] text-pink-400/60 uppercase tracking-wide text-right">P2</span>
                    <span className={cn(
                      "font-mono text-xs tabular-nums",
                      p2Done.current ? "text-pink-300" : dispP2T > ROUND_TIMEOUT * 0.8 ? "text-red-400" : "text-pink-400/80",
                    )}>
                      {dispP2T.toFixed(1)}s
                    </span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (dispP2T / ROUND_TIMEOUT) * 100)}%`,
                        background: p2Done.current
                          ? "#f472b6"
                          : dispP2T > ROUND_TIMEOUT * 0.8
                            ? "linear-gradient(90deg, #ef4444, #f97316)"
                            : "linear-gradient(90deg, #be185d, #f472b6)",
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
                <Timer className="h-3.5 w-3.5 text-pink-400/70" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Canvas ── */}
      <div ref={containerRef} className="w-full max-w-[500px] aspect-square mx-auto relative">
        <canvas ref={canvasRef} className="w-full h-full rounded-2xl border border-slate-700/50" style={{ boxShadow: "0 0 40px rgba(59,130,246,0.08), inset 0 0 60px rgba(0,0,0,0.3)" }} />
      </div>

      {/* ── Round End Banner ── */}
      <AnimatePresence>
        {phase === "roundEnd" && (
          <motion.div
            key="rr"
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "mx-auto max-w-sm rounded-xl border px-5 py-3 text-center",
              roundWinner === 0
                ? "bg-yellow-950/40 border-yellow-500/30"
                : roundWinner === 1
                  ? "bg-cyan-950/40 border-cyan-500/30"
                  : "bg-pink-950/40 border-pink-500/30",
            )}
          >
            {roundWinner === 0 ? (
              <div>
                <p className="text-yellow-400 text-lg sm:text-xl font-bold">Empate!</p>
                <p className="text-yellow-400/50 text-xs mt-1">Tempo esgotado</p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <div>
                  <p className={cn(
                    "text-lg sm:text-xl font-bold",
                    roundWinner === 1 ? "text-cyan-400" : "text-pink-400",
                  )}>
                    Jogador {roundWinner} Chegou!
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <ChevronRight className={cn("h-3.5 w-3.5", roundWinner === 1 ? "text-cyan-400/60" : "text-pink-400/60")} />
                    <span className={cn(
                      "text-sm font-mono font-bold tabular-nums",
                      roundWinner === 1 ? "text-cyan-300" : "text-pink-300",
                    )}>
                      +{lastPts} pts
                    </span>
                    {lastBonus > 0 && (
                      <span className="text-amber-400/80 text-[11px] font-medium">
                        (velocidade +{lastBonus})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Keyboard Hints ── */}
      <div className="hidden md:flex justify-center gap-8 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            {"WASD".split("").map((k) => (
              <kbd key={k} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-cyan-400/70 font-mono">{k}</kbd>
            ))}
          </span>
          Jogador 1
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            {["\u2191", "\u2193", "\u2190", "\u2192"].map((k) => (
              <kbd key={k} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-pink-400/70 font-mono">{k}</kbd>
            ))}
          </span>
          Jogador 2
        </span>
      </div>

      {/* ── Mobile D-Pads ── */}
      <div className="flex md:hidden justify-center gap-10">
        <div>
          <p className="text-cyan-400/70 text-[10px] text-center mb-1 font-medium uppercase tracking-wider">P1</p>
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
          <p className="text-pink-400/70 text-[10px] text-center mb-1 font-medium uppercase tracking-wider">P2</p>
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

      {/* ── Action Buttons ── */}
      <div className="flex justify-center gap-3">
        {phase === "idle" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button
              onClick={startGame}
              size="lg"
              className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20"
            >
              <Map className="h-4 w-4" />Iniciar Jogo
            </Button>
          </motion.div>
        )}
        {phase === "playing" && (
          <Button onClick={resetAll} variant="outline" size="sm" className="gap-1 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600">
            <RotateCcw className="h-3 w-3" />Reiniciar
          </Button>
        )}
        {phase === "gameOver" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button
              onClick={resetAll}
              size="lg"
              className="gap-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-bold shadow-lg"
            >
              <RotateCcw className="h-4 w-4" />Jogar Novamente
            </Button>
          </motion.div>
        )}
      </div>

      {/* ── Enhanced Game Over Screen ── */}
      <AnimatePresence>
        {phase === "gameOver" && (
          <motion.div
            key="go"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative overflow-hidden rounded-2xl border border-slate-700/50 mx-auto max-w-md"
          >
            <ConfettiBurst
              active={showConfetti}
              colors={finalWinner === 1
                ? ["#22d3ee", "#06b6d4", "#67e8f9", "#a5f3fc", "#ffffff"]
                : finalWinner === 2
                  ? ["#f472b6", "#ec4899", "#f9a8d4", "#fbcfe8", "#ffffff"]
                  : ["#f59e0b", "#fbbf24", "#fde68a", "#fef3c7", "#ffffff"]
              }
              particleCount={100}
            />

            <div className="relative z-10 bg-slate-950/90 backdrop-blur-sm px-6 py-6 text-center space-y-5">
              {/* Trophy */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 15 }}
              >
                <Trophy className={cn(
                  "h-12 w-12 mx-auto",
                  finalWinner === 1 ? "text-cyan-400" : finalWinner === 2 ? "text-pink-400" : "text-amber-400",
                )} style={{ filter: "drop-shadow(0 0 12px currentColor)" }} />
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-black text-white tracking-wide"
              >
                Jogo Finalizado!
              </motion.h3>

              {/* Score Cards */}
              <div className="flex justify-center gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className={cn(
                    "rounded-xl border px-5 py-4 min-w-[100px]",
                    finalWinner === 1
                      ? "bg-cyan-950/50 border-cyan-500/40 ring-1 ring-cyan-400/20"
                      : "bg-slate-900/50 border-slate-700/50",
                  )}
                >
                  <span className="block text-3xl font-black text-cyan-400 tabular-nums">{scores.p1}</span>
                  <span className="text-[11px] text-cyan-400/60 uppercase tracking-wider font-medium mt-1 block">Jogador 1</span>
                  {finalWinner === 1 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 }}
                      className="inline-block mt-1.5 text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30"
                    >
                      VENCEDOR
                    </motion.span>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className={cn(
                    "rounded-xl border px-5 py-4 min-w-[100px]",
                    finalWinner === 2
                      ? "bg-pink-950/50 border-pink-500/40 ring-1 ring-pink-400/20"
                      : "bg-slate-900/50 border-slate-700/50",
                  )}
                >
                  <span className="block text-3xl font-black text-pink-400 tabular-nums">{scores.p2}</span>
                  <span className="text-[11px] text-pink-400/60 uppercase tracking-wider font-medium mt-1 block">Jogador 2</span>
                  {finalWinner === 2 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 }}
                      className="inline-block mt-1.5 text-[10px] font-bold text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded-full border border-pink-500/30"
                    >
                      VENCEDOR
                    </motion.span>
                  )}
                </motion.div>
              </div>

              {/* Winner declaration */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={cn(
                  "text-xl font-black tracking-wide",
                  finalWinner === 1
                    ? "text-cyan-400"
                    : finalWinner === 2
                      ? "text-pink-400"
                      : "text-amber-400",
                )}
              >
                {finalWinner === 1
                  ? "Jogador 1 Venceu!"
                  : finalWinner === 2
                    ? "Jogador 2 Venceu!"
                    : "Empate!"}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}