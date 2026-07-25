import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3x3 as GridIcon, RotateCcw, Trophy, Clock, Swords, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Game2048Props { onScore?: (name: string, score: number) => void; liveCode?: string; }

type CellValue = 0 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192;
type Board = CellValue[][];

const SIZE = 4;
const GAME_DURATION = 120; // seconds

const TILE_COLORS: Record<number, string> = {
  0: 'bg-secondary/40 border-border/30',
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

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0) as CellValue[]);
}

function addRandomTile(board: Board): Board {
  const empty: [number, number][] = [];
  board.forEach((row, r) => row.forEach((cell, c) => { if (cell === 0) empty.push([r, c]); }));
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function initBoard(): Board {
 let b = createEmptyBoard();
  b = addRandomTile(b);
  b = addRandomTile(b);
  return b;
}

function slideRow(row: CellValue[]): { newRow: CellValue[]; score: number } {
  const filtered = row.filter(v => v !== 0) as CellValue[];
  const merged: CellValue[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = (filtered[i] * 2) as CellValue;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { newRow: merged, score };
}

function moveBoard(board: Board, direction: 'left' | 'right' | 'up' | 'down'): { board: Board; score: number; moved: boolean } {
  let totalScore = 0;
  const b = board.map(r => [...r]);
  let moved = false;

  const processRows = (getRows: () => CellValue[][], setRows: (rows: CellValue[][]) => void) => {
    const rows = getRows();
    const newRows = rows.map(row => {
      const r = direction === 'right' ? [...row].reverse() : [...row];
      const { newRow, score } = slideRow(r);
      totalScore += score;
      const final = direction === 'right' ? newRow.reverse() : newRow;
      if (final.some((v, i) => v !== row[i])) moved = true;
      return final;
    });
    setRows(newRows);
  };

  if (direction === 'left' || direction === 'right') {
    processRows(() => b.map(r => [...r]), (rows) => rows.forEach((row, i) => { b[i] = row; }));
  } else {
    processRows(
      () => b[0].map((_, c) => b.map(r => r[c]) as CellValue[]),
      (cols) => cols.forEach((col, c) => b.forEach((row, r) => { b[r][c] = col[r]; }))
    );
  }

  return { board: b, score: totalScore, moved };
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

interface BoardDisplayProps {
  board: Board;
  label: string;
  score: number;
  bestTile: number;
  isActive: boolean;
 color: 'blue' | 'pink';
 onMove: (dir: 'left' | 'right' | 'up' | 'down') => void;
}

function BoardDisplay({ board, label, score, bestTile, isActive, color, onMove }: BoardDisplayProps) {
  const borderColor = color === 'blue' ? 'border-blue-500/40 ring-blue-500/20' : 'border-pink-500/40 ring-pink-500/20';
  const bgColor = color === 'blue' ? 'bg-blue-500/5' : 'bg-pink-500/5';
  const accentColor = color === 'blue' ? 'text-blue-400' : 'text-pink-400';
  const badgeBg = color === 'blue' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-pink-500/20 text-pink-400 border-pink-500/30';

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
    <div className={`rounded-2xl border-2 p-3 transition-all ${isActive ? `${borderColor} ring-2 ${bgColor}` : 'border-border/50 opacity-60'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${color === 'blue' ? 'from-blue-500 to-cyan-500' : 'from-pink-500 to-rose-500'} flex items-center justify-center text-xs font-bold text-white`}>
            {label[0]}
          </div>
          <span className="text-sm font-bold">{label}</span>
          {isActive && <Badge className={`${badgeBg} text-[10px]`}>A jogar</Badge>}
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold font-mono ${accentColor}`}>{score}</p>
          {bestTile >= 2048 && <Crown className={`h-4 w-4 ${accentColor} ml-auto`} />}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {board.flat().map((cell, i) => (
          <motion.div
            key={i}
            layout
            initial={false}
            animate={{ scale: cell > 0 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.15 }}
            className={`aspect-square rounded-xl flex items-center justify-center font-bold ${TILE_COLORS[cell] || 'bg-purple-600 text-white'} ${TILE_SIZES[cell] || 'text-base'}`}
          >
            {cell > 0 ? cell : ''}
          </motion.div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        {isActive ? 'WASD ou setas para mover' : 'A aguardar vez...'}
      </p>
    </div>
  );
}

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

  const updateBestTile = (board: Board, setter: (v: number) => void) => {
    const max = Math.max(...board.flat());
    setter(max);
  };

  const handleMove = useCallback((player: 1 | 2, dir: 'left' | 'right' | 'up' | 'down') => {
    if (phase !== 'playing' || currentPlayer !== player) return;
    const board = player === 1 ? p1Board : p2Board;
    const { board: newBoard, score, moved } = moveBoard(board, dir);
    if (!moved) return;

    const finalBoard = addRandomTile(newBoard);
    if (player === 1) {
      setP1Board(finalBoard);
      setP1Score(s => s + score);
      setMovesCount(m => { const n = [...m]; n[0]++; return n; });
      updateBestTile(finalBoard, setP1Best);
    } else {
      setP2Board(finalBoard);
      setP2Score(s => s + score);
      setMovesCount(m => { const n = [...m]; n[1]++; return n; });
      updateBestTile(finalBoard, setP2Best);
    }

    // Check if this player is stuck
    if (!canMove(finalBoard)) {
      // Switch to other player if they can still play
      const otherBoard = player === 1 ? p2Board : p1Board;
      if (canMove(otherBoard)) {
        setCurrentPlayer(player === 1 ? 2 : 1);
      } else {
        // Both stuck — end game
        clearInterval(timerRef.current);
        setPhase('done');
      }
    }
  }, [phase, currentPlayer, p1Board, p2Board]);

  const handleP1Move = useCallback((dir: 'left' | 'right' | 'up' | 'down') => handleMove(1, dir), [handleMove]);
  const handleP2Move = useCallback((dir: 'left' | 'right' | 'up' | 'down') => handleMove(2, dir), [handleMove]);

  const startGame = useCallback(() => {
    const b1 = initBoard(), b2 = initBoard();
    setP1Board(b1); setP2Board(b2);
    setP1Score(0); setP2Score(0);
    setP1Best(0); setP2Best(0);
    setMovesCount([0, 0]);
    setTimeLeft(GAME_DURATION);
    setCurrentPlayer(1);
    setPhase('playing');
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

  return (
    <div className="space-y-4">
      {/* Timer bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={`font-mono text-lg font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-foreground'}`}>{fmt(timeLeft)}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div className={`h-full rounded-full ${timerColor}`} animate={{ width: `${timerPercent}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>

      {/* Score comparison */}
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{p1Name}</p>
          <p className="text-xl font-bold font-mono text-blue-400">{p1Score}</p>
          <p className="text-[10px] text-muted-foreground">{movesCount[0]} mov.</p>
        </div>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">VS</span>
          <p className={`text-sm font-bold ${currentPlayer === 1 ? 'text-blue-400' : 'text-pink-400'}`}>
            {currentPlayer === 1 ? p1Name : p2Name}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{p2Name}</p>
          <p className="text-xl font-bold font-mono text-pink-400">{p2Score}</p>
          <p className="text-[10px] text-muted-foreground">{movesCount[1]} mov.</p>
        </div>
      </div>

      {/* Boards */}
      <div className="grid grid-cols-2 gap-3">
        <BoardDisplay
          board={p1Board} label={p1Name} score={p1Score} bestTile={p1Best}
          isActive={currentPlayer === 1} color="blue" onMove={handleP1Move}
        />
        <BoardDisplay
          board={p2Board} label={p2Name} score={p2Score} bestTile={p2Best}
          isActive={currentPlayer === 2} color="pink" onMove={handleP2Move}
        />
      </div>

      {/* Winner overlay */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-amber-900 to-orange-900 border border-white/10 p-6 text-center">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-white mb-2">{winner === 'Empate' ? 'Empate!' : `${winner} Venceu!`}</h2>
              <div className="flex justify-center gap-6 mb-4">
                <div><p className="text-xs text-amber-300">{p1Name}</p><p className="text-2xl font-bold text-white font-mono">{p1Score}</p></div>
                <div className="text-amber-400 self-center font-bold">VS</div>
                <div><p className="text-xs text-amber-300">{p2Name}</p><p className="text-2xl font-bold text-white font-mono">{p2Score}</p></div>
              </div>
              {(p1Best >= 2048 || p2Best >= 2048) && <p className="text-amber-300 text-sm mb-3">2048 atingido! 🎉</p>}
              <div className="flex gap-2">
                <Button onClick={() => setPhase('setup')} variant="outline" className="flex-1 border-white/20 text-white">Novo Jogo</Button>
                <Button onClick={startGame} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600">Revanche</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}