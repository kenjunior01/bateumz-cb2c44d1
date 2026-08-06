'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, RotateCcw, Bot, Clock, History, ChevronRight, Shield, Swords } from 'lucide-react';

// ===================== TYPES =====================

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Color = 'w' | 'b';

interface Piece {
  type: PieceType;
  color: Color;
  moved: boolean;
}

type Cell = Piece | null;
type Board = Cell[][];
type Difficulty = 'facil' | 'medio' | 'dificil';
type TimerOption = 5 | 10 | 15;
type GamePhase = 'menu' | 'playing' | 'promoting' | 'ended';

interface Move {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  piece: PieceType;
  captured?: Piece;
  castling?: 'K' | 'Q';
  enPassant?: boolean;
  promotion?: PieceType;
}
// ===================== CONSTANTS =====================

const PIECE_SYMBOLS: Record<string, Record<PieceType, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

const PIECE_VALUES: Record<PieceType, number> = {
  P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100,
};

const PIECE_NAMES_PT: Record<PieceType, string> = {
  K: 'Rei', Q: 'Rainha', R: 'Torre', B: 'Bispo', N: 'Cavalo', P: 'Peão',
};

const TIMER_OPTIONS: TimerOption[] = [5, 10, 15];
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
];

// ===================== BOARD HELPERS =====================

function createInitialBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: backRank[c], color: 'b', moved: false };
    b[1][c] = { type: 'P', color: 'b', moved: false };
    b[6][c] = { type: 'P', color: 'w', moved: false };
    b[7][c] = { type: backRank[c], color: 'w', moved: false };
  }
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map(row => row.map(c => c ? { ...c } : null));
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function opponent(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

function findKing(board: Board, color: Color): [number, number] {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'K' && board[r][c]?.color === color) return [r, c];
  return [-1, -1];
}

function isSquareAttacked(board: Board, r: number, c: number, byColor: Color): boolean {
  // Pawn attacks
  const pawnDir = byColor === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir, pc = c + dc;
    if (inBounds(pr, pc) && board[pr][pc]?.type === 'P' && board[pr][pc]?.color === byColor) return true;
  }
  // Knight attacks
  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightMoves) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc]?.type === 'N' && board[nr][nc]?.color === byColor) return true;
  }
  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc]?.type === 'K' && board[nr][nc]?.color === byColor) return true;
    }
  }
  // Sliding pieces (Rook/Queen for straights, Bishop/Queen for diagonals)
  const straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
  const diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of straightDirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc]?.color === byColor && (board[nr][nc]?.type === 'R' || board[nr][nc]?.type === 'Q')) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  for (const [dr, dc] of diagDirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc]?.color === byColor && (board[nr][nc]?.type === 'B' || board[nr][nc]?.type === 'Q')) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  return false;
}

function isInCheck(board: Board, color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  if (kr === -1) return false;
  return isSquareAttacked(board, kr, kc, opponent(color));
}

// ===================== MOVE GENERATION =====================

function getRawMoves(board: Board, r: number, c: number, enPassantTarget: [number, number] | null): Move[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Move[] = [];
  const color = piece.color;
  const opp = opponent(color);

  const addMove = (tr: number, tc: number, extra?: Partial<Move>) => {
    const captured = board[tr][tc];
    if (captured && captured.color === color) return;
    moves.push({ fromR: r, fromC: c, toR: tr, toC: tc, piece: piece.type, captured: captured ?? undefined, ...extra });
  };

  const addSliding = (dirs: number[][]) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        if (board[nr][nc]) {
          if (board[nr][nc]?.color === opp) addMove(nr, nc);
          break;
        }
        addMove(nr, nc);
        nr += dr; nc += dc;
      }
    }
  };

  switch (piece.type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      const promoRow = color === 'w' ? 0 : 7;
      // Forward
      const fr = r + dir;
      if (inBounds(fr, c) && !board[fr][c]) {
        if (fr === promoRow) {
          for (const pt of ['Q', 'R', 'B', 'N'] as PieceType[]) moves.push({ fromR: r, fromC: c, toR: fr, toC: c, piece: 'P', promotion: pt });
        } else {
          addMove(fr, c);
          // Double move
          if (r === startRow && !board[r + 2 * dir][c]) {
            addMove(r + 2 * dir, c);
          }
        }
      }
      // Captures
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (!inBounds(fr, nc)) continue;
        if (board[fr][nc]?.color === opp) {
          if (fr === promoRow) {
            for (const pt of ['Q', 'R', 'B', 'N'] as PieceType[]) moves.push({ fromR: r, fromC: c, toR: fr, toC: nc, piece: 'P', captured: board[fr][nc], promotion: pt });
          } else {
            addMove(fr, nc);
          }
        }
        // En passant
        if (enPassantTarget && enPassantTarget[0] === fr && enPassantTarget[1] === nc) {
          moves.push({ fromR: r, fromC: c, toR: fr, toC: nc, piece: 'P', enPassant: true, captured: board[r][nc] });
        }
      }
      break;
    }
    case 'N': {
      const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of knightMoves) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) addMove(nr, nc);
      }
      break;
    }
    case 'B': addSliding([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'R': addSliding([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'Q': addSliding([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'K': {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc)) addMove(nr, nc);
        }
      }
      // Castling
      if (!piece.moved && !isInCheck(board, color)) {
        const row = color === 'w' ? 7 : 0;
        const rook = board[row][7];
        if (rook && rook.type === 'R' && !rook.moved && !board[row][5] && !board[row][6]) {
          if (!isSquareAttacked(board, row, 5, opp) && !isSquareAttacked(board, row, 6, opp)) {
            moves.push({ fromR: r, fromC: c, toR: row, toC: 6, piece: 'K', castling: 'K' });
          }
        }
        const rookQ = board[row][0];
        if (rookQ && rookQ.type === 'R' && !rookQ.moved && !board[row][1] && !board[row][2] && !board[row][3]) {
          if (!isSquareAttacked(board, row, 2, opp) && !isSquareAttacked(board, row, 3, opp)) {
            moves.push({ fromR: r, fromC: c, toR: row, toC: 2, piece: 'K', castling: 'Q' });
          }
        }
      }
      break;
    }
  }
  return moves;
}

function getLegalMoves(board: Board, r: number, c: number, enPassantTarget: [number, number] | null): Move[] {
  const piece = board[r][c];
  if (!piece) return [];
  const raw = getRawMoves(board, r, c, enPassantTarget);
  return raw.filter(m => {
    const nb = applyMoveToBoard(board, m);
    return !isInCheck(nb, piece.color);
  });
}

function getAllLegalMoves(board: Board, color: Color, enPassantTarget: [number, number] | null): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        moves.push(...getLegalMoves(board, r, c, enPassantTarget));
      }
    }
  }
  return moves;
}

// ===================== APPLY MOVE =====================

function applyMoveToBoard(board: Board, move: Move): Board {
  const nb = cloneBoard(board);
  const piece = nb[move.fromR][move.fromC];
  if (!piece) return nb;

  // En passant capture
  if (move.enPassant) {
    nb[move.fromR][move.toC] = null;
  }

  // Castling rook
  if (move.castling) {
    const row = move.fromR;
    if (move.castling === 'K') {
      nb[row][5] = nb[row][7];
      nb[row][7] = null;
      if (nb[row][5]) nb[row][5].moved = true;
    } else {
      nb[row][3] = nb[row][0];
      nb[row][0] = null;
      if (nb[row][3]) nb[row][3].moved = true;
    }
  }

  nb[move.toR][move.toC] = piece;
  nb[move.fromR][move.fromC] = null;
  piece.moved = true;

  // Promotion
  if (move.promotion) {
    nb[move.toR][move.toC] = { type: move.promotion, color: piece.color, moved: true };
  }

  return nb;
}

// ===================== MOVE NOTATION =====================

function moveToNotation(move: Move, board: Board): string {
  const files = 'abcdefgh';
  const piece = board[move.fromR][move.fromC];
  if (!piece) return '';

  if (move.castling === 'K') return 'O-O';
  if (move.castling === 'Q') return 'O-O-O';

  let notation = '';
  if (piece.type !== 'P') {
    notation += piece.type;
  }
  if (move.captured) {
    if (piece.type === 'P') notation += files[move.fromC];
    notation += 'x';
  }
  notation += files[move.toC] + (8 - move.toR);
  if (move.promotion) notation += '=' + move.promotion;
  return notation;
}

// ===================== AI =====================

function evaluateBoard(board: Board, color: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[p.type];
      score += p.color === color ? val : -val;
    }
  }
  return score;
}

function minimax(board: Board, depth: number, color: Color, maximizing: boolean, epTarget: [number, number] | null, alpha: number, beta: number): number {
  if (depth === 0) return evaluateBoard(board, color);

  const currentColor = maximizing ? color : opponent(color);
  const moves = getAllLegalMoves(board, currentColor, epTarget);

  if (moves.length === 0) {
    if (isInCheck(board, currentColor)) return maximizing ? -999 + (3 - depth) : 999 - (3 - depth);
    return 0;
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const nb = applyMoveToBoard(board, m);
      const newEp: [number, number] | null = (m.piece === 'P' && Math.abs(m.toR - m.fromR) === 2) ? [(m.fromR + m.toR) / 2, m.fromC] : null;
      const ev = minimax(nb, depth - 1, color, false, newEp, alpha, beta);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const nb = applyMoveToBoard(board, m);
      const newEp: [number, number] | null = (m.piece === 'P' && Math.abs(m.toR - m.fromR) === 2) ? [(m.fromR + m.toR) / 2, m.fromC] : null;
      const ev = minimax(nb, depth - 1, color, true, newEp, alpha, beta);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestMove(board: Board, color: Color, difficulty: Difficulty, epTarget: [number, number] | null): Move | null {
  const moves = getAllLegalMoves(board, color, epTarget);
  if (moves.length === 0) return null;

  if (difficulty === 'facil') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (difficulty === 'medio') {
    let bestMove = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const nb = applyMoveToBoard(board, m);
      const score = evaluateBoard(nb, color);
      if (score > bestScore) { bestScore = score; bestMove = m; }
    }
    return bestMove;
  }

  // dificil: 2-ply minimax
  let bestMove = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const nb = applyMoveToBoard(board, m);
    const newEp: [number, number] | null = (m.piece === 'P' && Math.abs(m.toR - m.fromR) === 2) ? [(m.fromR + m.toR) / 2, m.fromC] : null;
    const score = minimax(nb, 1, color, false, newEp, -Infinity, Infinity);
    if (score > bestScore) { bestScore = score; bestMove = m; }
  }
  return bestMove;
}

// ===================== COMPONENT =====================

export default function ChessGame({ onScore, liveCode }: Props) {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medio');
  const [timerMinutes, setTimerMinutes] = useState<TimerOption>(10);
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [turn, setTurn] = useState<Color>('w');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [capturedByWhite, setCapturedByWhite] = useState<Piece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<Piece[]>([]);
  const [enPassantTarget, setEnPassantTarget] = useState<[number, number] | null>(null);
  const [checkState, setCheckState] = useState<Color | null>(null);
  const [gameResult, setGameResult] = useState<string>('');
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ fromR: number; fromC: number; toR: number; toC: number } | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      setTurn(prev => {
        if (prev === 'w') {
          setWhiteTime(t => {
            if (t <= 1) {
              setPhase('ended');
              setGameResult('Tempo esgotado! Pretas vencem!');
              onScore?.('Xadrez (Pretas)', 100);
              return 0;
            }
            return t - 1;
          });
        } else {
          setBlackTime(t => {
            if (t <= 1) {
              setPhase('ended');
              setGameResult('Tempo esgotado! Brancas vencem!');
              onScore?.('Xadrez (Brancas)', 100);
              return 0;
            }
            return t - 1;
          });
        }
        return prev;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, onScore]);

  // Auto scroll history
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Bot move
  useEffect(() => {
    if (phase !== 'playing' || turn !== 'b') return;
    const timeout = setTimeout(() => {
      const move = getBestMove(board, 'b', difficulty, enPassantTarget);
      if (!move) return;
      executeMove(move);
    }, 500);
    return () => clearTimeout(timeout);
  }, [phase, turn, board, difficulty, enPassantTarget]);

  const executeMove = useCallback((move: Move) => {
    const notation = moveToNotation(move, board);
    const nb = applyMoveToBoard(board, move);
    const captured = move.captured;
    const newCapturedW = [...capturedByWhite];
    const newCapturedB = [...capturedByBlack];
    if (captured) {
      if (turn === 'w') newCapturedW.push(captured);
      else newCapturedB.push(captured);
    }

    let newEp: [number, number] | null = null;
    if (move.piece === 'P' && Math.abs(move.toR - move.fromR) === 2) {
      newEp = [(move.fromR + move.toR) / 2, move.fromC];
    }

    setBoard(nb);
    setEnPassantTarget(newEp);
    setCapturedByWhite(newCapturedW);
    setCapturedByBlack(newCapturedB);
    setLastMove(move);
    setSelected(null);
    setValidMoves([]);

    const fullMove: Move = { ...move };
    setMoveHistory(prev => [...prev, fullMove]);

    const nextTurn = opponent(turn);
    setTurn(nextTurn);

    const nextMoves = getAllLegalMoves(nb, nextTurn, newEp);
    const inCheck = isInCheck(nb, nextTurn);
    setCheckState(inCheck ? nextTurn : null);

    if (nextMoves.length === 0) {
      setPhase('ended');
      if (inCheck) {
        const winner = nextTurn === 'w' ? 'Pretas' : 'Brancas';
        const result = `Xeque-mate! ${winner} vencem!`;
        setGameResult(result);
        onScore?.(`Xadrez (${winner})`, 100);
      } else {
        setGameResult('Afogamento! Empate!');
      }
    }
  }, [board, turn, capturedByWhite, capturedByBlack, onScore]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (phase !== 'playing' || turn !== 'w') return;

    // If a piece is selected, try to move
    if (selected) {
      const move = validMoves.find(m => m.toR === r && m.toC === c && !m.promotion);
      if (move) {
        executeMove(move);
        return;
      }
      // Check if it's a promotion move
      const promoMoves = validMoves.filter(m => m.toR === r && m.toC === c && m.promotion);
      if (promoMoves.length > 0) {
        setPendingPromotion({ fromR: selected[0], fromC: selected[1], toR: r, toC: c });
        setPhase('promoting');
        return;
      }
    }

    // Select a piece
    const piece = board[r][c];
    if (piece && piece.color === 'w') {
      setSelected([r, c]);
      const moves = getLegalMoves(board, r, c, enPassantTarget);
      setValidMoves(moves);
    } else {
      setSelected(null);
      setValidMoves([]);
    }
  }, [phase, turn, selected, validMoves, board, enPassantTarget, executeMove]);

  const handlePromotion = useCallback((type: PieceType) => {
    if (!pendingPromotion) return;
    const move = validMoves.find(m => m.toR === pendingPromotion.toR && m.toC === pendingPromotion.toC && m.promotion === type);
    if (move) {
      setPhase('playing');
      setPendingPromotion(null);
      executeMove(move);
    }
  }, [pendingPromotion, validMoves, executeMove]);

  const startGame = useCallback(() => {
    setBoard(createInitialBoard());
    setTurn('w');
    setSelected(null);
    setValidMoves([]);
    setMoveHistory([]);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setEnPassantTarget(null);
    setCheckState(null);
    setGameResult('');
    setWhiteTime(timerMinutes * 60);
    setBlackTime(timerMinutes * 60);
    setShowHistory(false);
    setPendingPromotion(null);
    setLastMove(null);
    setPhase('playing');
  }, [timerMinutes]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const validMoveTargets = validMoves.filter((m, i, arr) =>
    arr.findIndex(a => a.toR === m.toR && a.toC === m.toC) === i
  );

  // ===================== RENDER: MENU =====================
  if (phase === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 p-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl">♔</motion.div>
        <h2 className="text-2xl font-bold">Xadrez</h2>
        <div className="flex flex-col gap-3 w-64">
          <div className="text-sm font-medium text-muted-foreground">Dificuldade</div>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(d => (
              <Button key={d.value} variant={difficulty === d.value ? 'default' : 'outline'} size="sm" onClick={() => setDifficulty(d.value)}>
                {d.label}
              </Button>
            ))}
          </div>
          <div className="text-sm font-medium text-muted-foreground mt-2">Tempo</div>
          <div className="flex gap-2">
            {TIMER_OPTIONS.map(t => (
              <Button key={t} variant={timerMinutes === t ? 'default' : 'outline'} size="sm" onClick={() => setTimerMinutes(t)}>
                {t} min
              </Button>
            ))}
          </div>
        </div>
        <Button size="lg" onClick={startGame} className="gap-2 mt-2">
          <Swords className="w-5 h-5" /> Jogar contra Bot
        </Button>
      </div>
    );
  }

  // ===================== RENDER: PROMOTION =====================
  if (phase === 'promoting') {
    const promoTypes: PieceType[] = ['Q', 'R', 'B', 'N'];
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <h3 className="text-xl font-bold">Promover peão</h3>
        <div className="flex gap-3">
          {promoTypes.map(pt => (
            <motion.button
              key={pt}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 flex items-center justify-center text-4xl bg-card border-2 border-border rounded-xl hover:border-primary transition-colors cursor-pointer"
              onClick={() => handlePromotion(pt)}
            >
              {PIECE_SYMBOLS.w[pt]}
            </motion.button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Escolha a peça para promoção</p>
      </div>
    );
  }

  // ===================== RENDER: GAME / ENDED =====================
  const whiteKingPos = findKing(board, 'w');
  const blackKingPos = findKing(board, 'b');
  const whiteInCheck = checkState === 'w';
  const blackInCheck = checkState === 'b';

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 p-4 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="text-sm font-medium">Pretas (Bot)</span>
            {turn === 'b' && phase === 'playing' && <Badge variant="default" className="text-xs">Vez</Badge>}
          </div>
          <div className={cn("flex items-center gap-1 text-sm font-mono px-2 py-1 rounded", blackInCheck && "bg-red-500/20 text-red-500")}>
            <Clock className="w-3 h-3" />
            {formatTime(blackTime)}
          </div>
        </div>

        <div className="relative border-2 border-border rounded-lg overflow-hidden shadow-xl">
          {Array.from({ length: 8 }, (_, r) => (
            <div key={r} className="flex">
              {Array.from({ length: 8 }, (_, c) => {
                const isLight = (r + c) % 2 === 0;
                const piece = board[r][c];
                const isSelected = selected?.[0] === r && selected?.[1] === c;
                const isValidTarget = validMoveTargets.some(m => m.toR === r && m.toC === c);
                const isLastMove = lastMove && ((lastMove.fromR === r && lastMove.fromC === c) || (lastMove.toR === r && lastMove.toC === c));
                const isKingInCheck = (whiteInCheck && whiteKingPos[0] === r && whiteKingPos[1] === c) ||
                  (blackInCheck && blackKingPos[0] === r && blackKingPos[1] === c);

                return (
                  <motion.button
                    key={c}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl relative transition-colors",
                      isLight ? "bg-amber-100" : "bg-amber-800",
                      isSelected && "bg-emerald-400/60",
                      isLastMove && !isSelected && "bg-yellow-300/50",
                      isKingInCheck && "bg-red-500/50",
                      isValidTarget && "cursor-pointer",
                      !piece && !isValidTarget && "cursor-default",
                    )}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {isValidTarget && !piece && (
                      <div className="w-3 h-3 rounded-full bg-black/20" />
                    )}
                    {isValidTarget && piece && (
                      <div className="absolute inset-0 border-4 border-black/20 rounded-full" />
                    )}
                    {piece && (
                      <motion.span
                        key={`${piece.type}-${piece.color}-${r}-${c}`}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          "select-none leading-none",
                          piece.color === 'w' ? "drop-shadow-sm" : "drop-shadow-md",
                        )}
                      >
                        {PIECE_SYMBOLS[piece.color][piece.type]}
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">Brancas (Você)</span>
            {turn === 'w' && phase === 'playing' && <Badge variant="default" className="text-xs">Vez</Badge>}
          </div>
          <div className={cn("flex items-center gap-1 text-sm font-mono px-2 py-1 rounded", whiteInCheck && "bg-red-500/20 text-red-500")}>
            <Clock className="w-3 h-3" />
            {formatTime(whiteTime)}
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">Capturadas:</span>
            {capturedByWhite.map((p, i) => (
              <span key={i}>{PIECE_SYMBOLS[p.color][p.type]}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-64">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(h => !h)} className="gap-1">
            <History className="w-4 h-4" /> Histórico
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setPhase('menu'); if (timerRef.current) clearInterval(timerRef.current); }} className="gap-1">
            <RotateCcw className="w-4 h-4" /> Menu
          </Button>
        </div>

        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-card border rounded-lg p-3">
            <div ref={historyRef} className="max-h-60 overflow-y-auto text-xs space-y-1">
              {moveHistory.map((m, i) => {
                const notation = moveToNotation(m, moveHistory.slice(0, i).reduce((b, mv) => applyMoveToBoard(b, mv), createInitialBoard()));
                const moveNum = Math.floor(i / 2) + 1;
                return (
                  <div key={i} className={cn("flex gap-2", i % 2 === 0 && "font-medium")}>
                    {i % 2 === 0 && <span className="text-muted-foreground w-6">{moveNum}.</span>}
                    <span>{notation}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="bg-card border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4" />
            Status
          </div>
          {phase === 'playing' && (
            <div className="text-sm space-y-1">
              <p>Vez: {turn === 'w' ? 'Brancas' : 'Pretas'}</p>
              {checkState && <p className="text-red-500 font-bold animate-pulse">Xeque!</p>}
              <p className="text-xs text-muted-foreground">Dificuldade: {DIFFICULTY_OPTIONS.find(d => d.value === difficulty)?.label}</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {phase === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border rounded-2xl p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="text-5xl">♔</div>
              <h3 className="text-xl font-bold">Fim de Jogo</h3>
              <p className="text-muted-foreground">{gameResult}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={startGame} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Jogar Novamente
                </Button>
                <Button variant="outline" onClick={() => setPhase('menu')}>
                  Menu
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
