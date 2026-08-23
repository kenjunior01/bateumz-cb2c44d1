import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3x3 as GridIcon, Trophy, Clock, Swords, Crown, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Game2048Props { onScore?: (name: string, score: number) => void; liveCode?: string; }

type CellValue = 0 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192;
type Board = CellValue[][];

const SIZE = 4;
const GAME_DURATION = 120;

const TILE_COLORS: Record<number, string> = {
  0: 'bg-secondary/40 border border-border/20',
  2: 'bg-slate-600 text-white',
  4: 'bg-slate-500 text-white',
  8: 'bg-orange-600 text-white',
  16: 'bg-orange-500 text-white',
  32: 'bg-red-500 text-white',
  64: 'bg-red-600 text-white',
  128: 'bg-amber-500 text-white',
  256: 'bg-amber-400 text-white',
  512: 'bg-yellow-400 text-gray-900',
  1024: 'bg-yellow-300 text-gray-900',
  2048: 'bg-yellow-200 text-gray-900 font-bold',
  4096: 'bg-purple-500 text-white',
  8192: 'bg-purple-400 text-white',
};

const TILE_SIZES: Record<number, string> = {
  0: 'text-lg', 2: 'text-2xl', 4: 'text-2xl', 8: 'text-2xl', 16: 'text-2xl',
  32: 'text-2xl', 64: 'text-2xl', 128: 'text-xl', 256: 'text-xl', 512: 'text-xl',
  1024: 'text-base', 2048: 'text-base', 4096: 'text-base', 8192: 'text-base',
};

/* ---------- persistent glow for high-value tiles ---------- */
function getTileGlow(value: number): React.CSSProperties {
  if (value >= 2048) return { boxShadow: '0 0 20px 6px rgba(253,224,71,0.50), 0 0 44px 12px rgba(253,224,71,0.18)' };
  if (value >= 1024) return { boxShadow: '0 0 16px 4px rgba(253,224,71,0.40), 0 0 32px 8px rgba(253,224,71,0.14)' };
  if (value >= 512)  return { boxShadow: '0 0 12px 3px rgba(250,204,21,0.35), 0 0 24px 5px rgba(250,204,21,0.10)' };
  if (value >= 256)  return { boxShadow: '0 0 10px 2px rgba(251,191,36,0.30)' };
  if (value >= 128)  return { boxShadow: '0 0 8px 2px rgba(251,191,36,0.22)' };
  return {};
}

/* ---------- board helpers ---------- */
function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0) as CellValue[]);
}

function addRandomTile(board: Board): { board: Board; pos: [number, number] | null } {
  const empty: [number, number][] = [];
  board.forEach((row, r) => row.forEach((cell, c) => { if (cell === 0) empty.push([r, c]); }));
  if (empty.length === 0) return { board, pos: null };
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return { board: newBoard, pos: [r, c] };
}

function initBoard(): { board: Board; pos1: [number, number]; pos2: [number, number] } {
  const b1 = addRandomTile(createEmptyBoard());
  const b2 = addRandomTile(b1.board);
  return { board: b2.board, pos1: b1.pos!, pos2: b2.pos! };
}

function slideRow(row: CellValue[]): { newRow: CellValue[]; score: number; mergedIndices: number[] } {
  const filtered = row.filter(v => v !== 0) as CellValue[];
  const merged: CellValue[] = [];
  const mergedIndices: number[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = (filtered[i] * 2) as CellValue;
      merged.push(val);
      mergedIndices.push(merged.length - 1);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { newRow: merged, score, mergedIndices };
}

function moveBoard(
  board: Board,
  direction: 'left' | 'right' | 'up' | 'down',
): { board: Board; score: number; moved: boolean; mergedCells: [number, number][] } {
  let totalScore = 0;
  const b = board.map(r => [...r]);
  let moved = false;
  const mergedCells: [number, number][] = [];

  if (direction === 'left') {
    b.forEach((row, r) => {
      const { newRow, score, mergedIndices } = slideRow(row);
      totalScore += score;
      mergedIndices.forEach(c => mergedCells.push([r, c]));
      if (newRow.some((v, i) => v !== row[i])) moved = true;
      b[r] = newRow;
    });
  } else if (direction === 'right') {
    b.forEach((row, r) => {
      const reversed = [...row].reverse();
      const { newRow, score, mergedIndices } = slideRow(reversed);
      totalScore += score;
      const final = [...newRow].reverse();
      mergedIndices.forEach(idx => mergedCells.push([r, SIZE - 1 - idx]));
      if (final.some((v, i) => v !== row[i])) moved = true;
      b[r] = final;
    });
  } else if (direction === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = b.map(r => r[c]) as CellValue[];
      const { newRow, score, mergedIndices } = slideRow(col);
      totalScore += score;
      mergedIndices.forEach(r => mergedCells.push([r, c]));
      newRow.forEach((v, r) => { b[r][c] = v; });
      if (newRow.some((v, r) => v !== board[r][c])) moved = true;
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const col = b.map(r => r[c]).reverse() as CellValue[];
      const { newRow, score, mergedIndices } = slideRow(col);
      totalScore += score;
      const final = [...newRow].reverse();
      mergedIndices.forEach(idx => mergedCells.push([SIZE - 1 - idx, c]));
      final.forEach((v, r) => { b[r][c] = v; });
      if (final.some((v, r) => v !== board[r][c])) moved = true;
    }
  }

  return { board: b, score: totalScore, moved, mergedCells };
}

function canMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

/* ---------- confetti data for game-over ---------- */
function makeConfetti() {
  return Array.from({ length: 48 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 340,
    y: -(Math.random() * 180 + 80),
    rotate: Math.random() * 720 - 360,
    color: ['#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6'][i % 6],
    w: Math.random() * 8 + 5,
    h: Math.random() * 6 + 3,
    delay: Math.random() * 0.6,
    dur: Math.random() * 1.2 + 1.6,
  }));
}

/* ---------- BoardDisplay ---------- */
interface BoardDisplayProps {
  board: Board;
  label: string;
  score: number;
  scoreKey: number;
  bestTile: number;
  isActive: boolean;
  color: 'blue' | 'pink';
  onMove: (dir: 'left' | 'right' | 'up' | 'down') => void;
  mergedCells: Set<string>;
  newTilePos: string | null;
  moveGen: number;
}

function BoardDisplay({ board, label, score, scoreKey, bestTile, isActive, color, onMove, mergedCells, newTilePos, moveGen }: BoardDisplayProps) {
  const borderColor = color === 'blue' ? 'border-blue-500/40 ring-blue-500/20' : 'border-pink-500/40 ring-pink-500/20';
  const bgColor = color === 'blue' ? 'bg-blue-500/5' : 'bg-pink-500/5';
  const accentColor = color === 'blue' ? 'text-blue-400' : 'text-pink-400';
  const accentFrom = color === 'blue' ? 'from-blue-500' : 'from-pink-500';
  const accentTo   = color === 'blue' ? 'to-cyan-500' : 'to-rose-500';
  const badgeBg = color === 'blue'
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : 'bg-pink-500/20 text-pink-400 border-pink-500/30';

  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); onMove(dir); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, onMove]);

  return (
    <div className={`rounded-2xl border-2 p-3 transition-all duration-200 ${isActive ? `${borderColor} ring-2 ${bgColor}` : 'border-border/50 opacity-60'}`}>
      {/* Header with score pop */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center text-xs font-bold text-white`}>
            {label[0]}
          </div>
          <span className="text-sm font-bold">{label}</span>
          {isActive && <Badge className={`${badgeBg} text-[10px]`}>A jogar</Badge>}
        </div>
        <div className="text-right">
          {/* Score with pop animation */}
          <motion.p
            key={scoreKey}
            className={`text-lg font-bold font-mono ${accentColor}`}
            initial={{ scale: 1.35, y: -4 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            {score}
          </motion.p>
          {bestTile >= 2048 && <Crown className={`h-4 w-4 ${accentColor} ml-auto`} />}
        </div>
      </div>

      {/* Grid with enhanced tiles */}
      <div className="grid grid-cols-4 gap-1.5">
        {board.flat().map((cell, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          const posKey = `${r},${c}`;
          const isMerged = mergedCells.has(posKey);
          const isNew = newTilePos === posKey;
          /* force re-mount on merge or spawn so the initial animation fires */
          const animKey = (isMerged || isNew) ? `${i}-g${moveGen}` : `${i}`;
          const glow = getTileGlow(cell);

          return (
            <motion.div
              key={animKey}
              layout
              initial={
                isMerged
                  ? { scale: 1.35, boxShadow: '0 0 28px 10px rgba(255,255,255,0.55)' }
                  : isNew
                    ? { scale: 0, opacity: 0 }
                    : false
              }
              animate={{ scale: 1, opacity: 1, boxShadow: (glow.boxShadow as string) ?? 'none' }}
              transition={{
                type: 'spring',
                stiffness: isMerged ? 420 : 500,
                damping: isMerged ? 16 : 22,
              }}
              style={cell > 0 ? glow : undefined}
              className={`aspect-square rounded-xl flex items-center justify-center font-bold select-none ${TILE_COLORS[cell] || 'bg-purple-600 text-white'} ${TILE_SIZES[cell] || 'text-base'}`}
            >
              {cell > 0 ? cell : ''}
            </motion.div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        {isActive ? 'WASD ou setas para mover' : 'A aguardar vez...'}
      </p>
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function Game2048({ onScore, liveCode }: Game2048Props) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [p1Name, setP1Name] = useState('Jogador 1');
  const [p2Name, setP2Name] = useState('Jogador 2');
  const [p1Board, setP1Board] = useState<Board>(createEmptyBoard());
  const [p2Board, setP2Board] = useState<Board>(createEmptyBoard());
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Best, setP1Best] = useState(0);
  const [p2Best, setP2Best] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [movesCount, setMovesCount] = useState([0, 0]);

  /* Animation tracking state */
  const [p1Merged, setP1Merged] = useState<Set<string>>(new Set());
  const [p2Merged, setP2Merged] = useState<Set<string>>(new Set());
  const [p1NewTile, setP1NewTile] = useState<string | null>(null);
  const [p2NewTile, setP2NewTile] = useState<string | null>(null);
  const [p1MoveGen, setP1MoveGen] = useState(0);
  const [p2MoveGen, setP2MoveGen] = useState(0);
  const [p1ScoreKey, setP1ScoreKey] = useState(0);
  const [p2ScoreKey, setP2ScoreKey] = useState(0);

  const updateBestTile = (board: Board, setter: (v: number) => void) => {
    setter(Math.max(...board.flat()));
  };

  const handleMove = useCallback((player: 1 | 2, dir: 'left' | 'right' | 'up' | 'down') => {
    if (phase !== 'playing' || currentPlayer !== player) return;
    const board = player === 1 ? p1Board : p2Board;
    const { board: newBoard, score, moved, mergedCells } = moveBoard(board, dir);
    if (!moved) return;

    const { board: finalBoard, pos } = addRandomTile(newBoard);
    const mergedSet = new Set(mergedCells.map(([r, c]) => `${r},${c}`));
    const newTileStr = pos ? `${pos[0]},${pos[1]}` : null;

    if (player === 1) {
      setP1Board(finalBoard);
      setP1Score(s => s + score);
      setMovesCount(m => { const n = [...m]; n[0]++; return n; });
      updateBestTile(finalBoard, setP1Best);
      setP1Merged(mergedSet);
      setP1NewTile(newTileStr);
      setP1MoveGen(g => g + 1);
      if (score > 0) setP1ScoreKey(k => k + 1);
    } else {
      setP2Board(finalBoard);
      setP2Score(s => s + score);
      setMovesCount(m => { const n = [...m]; n[1]++; return n; });
      updateBestTile(finalBoard, setP2Best);
      setP2Merged(mergedSet);
      setP2NewTile(newTileStr);
      setP2MoveGen(g => g + 1);
      if (score > 0) setP2ScoreKey(k => k + 1);
    }

    if (!canMove(finalBoard)) {
      const otherBoard = player === 1 ? p2Board : p1Board;
      if (canMove(otherBoard)) {
        setCurrentPlayer(player === 1 ? 2 : 1);
      } else {
        clearInterval(timerRef.current);
        setPhase('done');
      }
    }
  }, [phase, currentPlayer, p1Board, p2Board]);

  const handleP1Move = useCallback((dir: 'left' | 'right' | 'up' | 'down') => handleMove(1, dir), [handleMove]);
  const handleP2Move = useCallback((dir: 'left' | 'right' | 'up' | 'down') => handleMove(2, dir), [handleMove]);

  const startGame = useCallback(() => {
    const { board: b1, pos1, pos2 } = initBoard();
    const b2res = addRandomTile(createEmptyBoard());
    const b2final = addRandomTile(b2res.board);
    setP1Board(b1); setP2Board(b2final.board);
    setP1Score(0); setP2Score(0);
    setP1Best(0); setP2Best(0);
    setMovesCount([0, 0]);
    setTimeLeft(GAME_DURATION);
    setCurrentPlayer(1);
    setPhase('playing');
    /* init animation state */
    setP1Merged(new Set()); setP2Merged(new Set());
    setP1NewTile(null); setP2NewTile(null);
    setP1MoveGen(1); setP2MoveGen(1);
    setP1ScoreKey(0); setP2ScoreKey(0);
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setPhase('done');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') {
      const winner = p1Score > p2Score ? p1Name : p2Score > p1Score ? p2Name : 'Empate';
      onScore?.(winner, Math.max(p1Score, p2Score));
    }
  }, [phase]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const winner = p1Score > p2Score ? p1Name : p2Score > p1Score ? p2Name : 'Empate';
  const timerPercent = (timeLeft / GAME_DURATION) * 100;
  const timerColor = timeLeft > 30 ? 'bg-primary' : timeLeft > 10 ? 'bg-amber-500' : 'bg-red-500';
  const isTie = winner === 'Empate';

  const confetti = useMemo(() => makeConfetti(), []);

  /* ===================== SETUP SCREEN ===================== */
  if (phase === 'setup') {
    return (
      <Card className="border-2 border-dashed border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><GridIcon className="h-5 w-5 text-amber-400" /> 2048 VS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Dois jogadores competem em boards separados. Quem fizer mais pontos em {GAME_DURATION}s vence! Controles: WASD ou setas.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Jogador 1 (Azul)</label><input value={p1Name} onChange={e => setP1Name(e.target.value)} className="w-full rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Jogador 2 (Rosa)</label><input value={p2Name} onChange={e => setP2Name(e.target.value)} className="w-full rounded-lg border border-pink-500/30 bg-pink-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50" /></div>
          </div>
          <Button onClick={startGame} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"><Swords className="h-4 w-4 mr-2" /> Iniciar 2048 VS</Button>
        </CardContent>
      </Card>
    );
  }

  /* ===================== PLAYING / DONE SCREEN ===================== */
  return (
    <div className="space-y-4">
      {/* Timer */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <motion.span
            key={timeLeft}
            className={`font-mono text-lg font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-foreground'}`}
            animate={timeLeft <= 10 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {fmt(timeLeft)}
          </motion.span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div className={`h-full rounded-full ${timerColor}`} animate={{ width: `${timerPercent}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* VS Scoreboard with pop scores */}
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{p1Name}</p>
          <motion.p
            key={p1ScoreKey}
            className="text-xl font-bold font-mono text-blue-400"
            initial={{ scale: 1.3, y: -3 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            {p1Score}
          </motion.p>
          <p className="text-[10px] text-muted-foreground">{movesCount[0]} mov.</p>
        </div>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">VS</span>
          <motion.p
            key={currentPlayer}
            className={`text-sm font-bold ${currentPlayer === 1 ? 'text-blue-400' : 'text-pink-400'}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {currentPlayer === 1 ? p1Name : p2Name}
          </motion.p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{p2Name}</p>
          <motion.p
            key={p2ScoreKey}
            className="text-xl font-bold font-mono text-pink-400"
            initial={{ scale: 1.3, y: -3 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            {p2Score}
          </motion.p>
          <p className="text-[10px] text-muted-foreground">{movesCount[1]} mov.</p>
        </div>
      </div>

      {/* Boards */}
      <div className="grid grid-cols-2 gap-3">
        <BoardDisplay
          board={p1Board} label={p1Name} score={p1Score} scoreKey={p1ScoreKey}
          bestTile={p1Best} isActive={currentPlayer === 1} color="blue" onMove={handleP1Move}
          mergedCells={p1Merged} newTilePos={p1NewTile} moveGen={p1MoveGen}
        />
        <BoardDisplay
          board={p2Board} label={p2Name} score={p2Score} scoreKey={p2ScoreKey}
          bestTile={p2Best} isActive={currentPlayer === 2} color="pink" onMove={handleP2Move}
          mergedCells={p2Merged} newTilePos={p2NewTile} moveGen={p2MoveGen}
        />
      </div>

      {/* ===================== ENHANCED GAME OVER OVERLAY ===================== */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            {/* Confetti particles */}
            {confetti.map(p => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: p.y, opacity: 1, rotate: 0 }}
                animate={{
                  y: p.y + 500,
                  x: p.x + (Math.random() - 0.5) * 100,
                  opacity: [1, 1, 0],
                  rotate: p.rotate,
                }}
                transition={{
                  duration: p.dur,
                  delay: p.delay,
                  ease: 'easeIn',
                }}
                className="absolute rounded-sm pointer-events-none"
                style={{
                  width: p.w,
                  height: p.h,
                  backgroundColor: p.color,
                  top: '40%',
                  left: '50%',
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
              className="relative w-full max-w-sm rounded-3xl border border-white/10 p-6 text-center overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(120,53,15,0.95) 0%, rgba(146,64,14,0.95) 50%, rgba(154,52,18,0.95) 100%)',
              }}
            >
              {/* Radial glow behind trophy */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(253,224,71,0.8) 0%, transparent 70%)' }} />
              </div>

              {/* Pulsing trophy */}
              <motion.div
                animate={{
                  scale: [1, 1.12, 1],
                  rotate: [0, 3, -3, 0],
                }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="relative z-10 mb-2"
              >
                <Trophy className="h-14 w-14 text-yellow-400 mx-auto drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(253,224,71,0.6))' }} />
              </motion.div>

              {/* Winner title */}
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="relative z-10 text-2xl font-extrabold text-white mb-1 tracking-tight"
              >
                {isTie ? 'Empate!' : `${winner} Venceu!`}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="relative z-10 text-amber-300/70 text-xs mb-5"
              >
                Jogo concluido
              </motion.p>

              {/* Score comparison with stagger */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="relative z-10 flex justify-center gap-8 mb-5"
              >
                <div className="flex flex-col items-center">
                  <p className="text-[11px] text-amber-300/80 mb-1">{p1Name}</p>
                  <motion.p
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                    className="text-3xl font-black text-white font-mono"
                  >
                    {p1Score}
                  </motion.p>
                  <p className="text-[10px] text-amber-400/60 mt-0.5">{movesCount[0]} mov.</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <span className="text-amber-500/50 font-bold text-sm">VS</span>
                </div>

                <div className="flex flex-col items-center">
                  <p className="text-[11px] text-amber-300/80 mb-1">{p2Name}</p>
                  <motion.p
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
                    className="text-3xl font-black text-white font-mono"
                  >
                    {p2Score}
                  </motion.p>
                  <p className="text-[10px] text-amber-400/60 mt-0.5">{movesCount[1]} mov.</p>
                </div>
              </motion.div>

              {/* Score bar comparison */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                className="relative z-10 mb-4 h-3 rounded-full overflow-hidden bg-white/10 flex"
              >
                {p1Score + p2Score > 0 && (
                  <>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(p1Score / (p1Score + p2Score)) * 100}%` }}
                      transition={{ delay: 0.7, duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-blue-400"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(p2Score / (p1Score + p2Score)) * 100}%` }}
                      transition={{ delay: 0.7, duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-pink-400"
                    />
                  </>
                )}
              </motion.div>

              {/* 2048 achievement (no emoji) */}
              {(p1Best >= 2048 || p2Best >= 2048) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.65 }}
                  className="relative z-10 flex items-center justify-center gap-1.5 mb-4 text-amber-300 text-sm font-semibold"
                >
                  <Star className="h-4 w-4" style={{ fill: 'rgba(253,224,71,0.8)' }} />
                  <span>2048 atingido!</span>
                  <Star className="h-4 w-4" style={{ fill: 'rgba(253,224,71,0.8)' }} />
                </motion.div>
              )}

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="relative z-10 flex gap-2"
              >
                <Button onClick={() => setPhase('setup')} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10 hover:text-white">
                  Novo Jogo
                </Button>
                <Button onClick={startGame} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                  Revanche
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
