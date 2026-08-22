
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Crown, RotateCcw, Bot, Clock, History, Shield, Swords } from 'lucide-react';

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
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-6xl drop-shadow-lg"
        >{PIECE_SYMBOLS.w.K}</motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-bold"
        >Xadrez</motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col gap-3 w-64"
        >
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
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Button size="lg" onClick={startGame} className="gap-2 mt-2">
            <Swords className="w-5 h-5" /> Jogar contra Bot
          </Button>
        </motion.div>
      </div>
    );
  }

  // ===================== RENDER: PROMOTION =====================
  if (phase === 'promoting') {
    const promoTypes: PieceType[] = ['Q', 'R', 'B', 'N'];
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <motion.h3
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold"
        >Promover peão</motion.h3>
        <div className="flex gap-3">
          {promoTypes.map((pt, i) => (
            <motion.button
              key={pt}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 250, damping: 20 }}
              whileHover={{ scale: 1.15, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 flex items-center justify-center text-4xl bg-card border-2 border-border rounded-xl hover:border-primary hover:shadow-[0_0_16px_rgba(99,102,241,0.3)] transition-shadow cursor-pointer"
              onClick={() => handlePromotion(pt)}
            >
              {PIECE_SYMBOLS.w[pt]}
            </motion.button>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-muted-foreground"
        >Escolha a peça para promoção</motion.p>
      </div>
    );
  }

  // ===================== RENDER: GAME / ENDED =====================
  const whiteKingPos = findKing(board, 'w');
  const blackKingPos = findKing(board, 'b');
  const whiteInCheck = checkState === 'w';
  const blackInCheck = checkState === 'b';
  const coordFiles = 'abcdefgh';
  const sortedCapturedW = [...capturedByWhite].sort((a, b) => PIECE_VALUES[b.type] - PIECE_VALUES[a.type]);
  const sortedCapturedB = [...capturedByBlack].sort((a, b) => PIECE_VALUES[b.type] - PIECE_VALUES[a.type]);
  const materialAdv = capturedByWhite.reduce((s, p) => s + PIECE_VALUES[p.type], 0)
    - capturedByBlack.reduce((s, p) => s + PIECE_VALUES[p.type], 0);

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 p-4 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        {/* Black player bar */}
        <motion.div
          animate={turn === 'b' && phase === 'playing' ? { boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 8px rgba(99,102,241,0.4)', '0 0 0px rgba(99,102,241,0)'] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-card border border-border"
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Pretas (Bot)</span>
            {turn === 'b' && phase === 'playing' && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-block w-2 h-2 rounded-full bg-primary"
              />
            )}
          </div>
          <div className={cn(
            'flex items-center gap-1 text-sm font-mono px-2 py-1 rounded-md',
            blackInCheck ? 'bg-red-500/20 text-red-500 font-bold' : 'bg-muted/50'
          )}>
            <Clock className="w-3 h-3" />
            {formatTime(blackTime)}
          </div>
        </motion.div>

        {/* Captured by black (white pieces lost) */}
        {sortedCapturedB.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-0.5 px-2 min-h-[24px] flex-wrap"
          >
            {sortedCapturedB.map((p, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="text-lg leading-none opacity-70"
              >
                {PIECE_SYMBOLS[p.color][p.type]}
              </motion.span>
            ))}
            {materialAdv < 0 && (
              <span className="text-xs font-bold text-red-400 ml-1">+{-materialAdv}</span>
            )}
          </motion.div>
        )}

        <div className="relative border-2 border-border rounded-lg overflow-hidden shadow-xl">
          {Array.from({ length: 8 }, (_, r) => (
            <div key={r} className="flex">
              {Array.from({ length: 8 }, (_, c) => {
                const isLight = (r + c) % 2 === 0;
                const piece = board[r][c];
                const isSelected = selected?.[0] === r && selected?.[1] === c;
                const isValidTarget = validMoveTargets.some(m => m.toR === r && m.toC === c);
                const isLastMoveFrom = lastMove != null && lastMove.fromR === r && lastMove.fromC === c;
                const isLastMoveTo = lastMove != null && lastMove.toR === r && lastMove.toC === c;
                const isKingInCheck = (whiteInCheck && whiteKingPos[0] === r && whiteKingPos[1] === c) ||
                  (blackInCheck && blackKingPos[0] === r && blackKingPos[1] === c);
                const canInteract = phase === 'playing' && turn === 'w' && piece?.color === 'w';

                return (
                  <motion.button
                    key={c}
                    whileHover={canInteract ? { scale: 1.08 } : {}}
                    whileTap={isValidTarget || canInteract ? { scale: 0.92 } : {}}
                    className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl relative transition-all duration-150 outline-none',
                      isLight ? 'bg-amber-100' : 'bg-amber-800',
                      isSelected && 'bg-emerald-400/70 ring-2 ring-inset ring-emerald-300 shadow-[inset_0_0_12px_rgba(52,211,153,0.5)]',
                      isLastMoveTo && !isSelected && (isLight ? 'bg-yellow-200/80' : 'bg-yellow-600/60'),
                      isLastMoveFrom && !isSelected && (isLight ? 'bg-yellow-200/50' : 'bg-yellow-700/40'),
                      isKingInCheck && 'bg-red-500/50',
                      isValidTarget && 'cursor-pointer',
                      canInteract && 'cursor-pointer',
                      !piece && !isValidTarget && !canInteract && 'cursor-default',
                    )}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {isValidTarget && !piece && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="w-3 h-3 rounded-full bg-black/25"
                      />
                    )}
                    {isValidTarget && piece && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="absolute inset-0.5 border-[3px] border-black/25 rounded-full"
                      />
                    )}
                    {isKingInCheck && (
                      <motion.div
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                        className="absolute inset-0 rounded-sm bg-red-500/40"
                      />
                    )}
                    {piece && (
                      <motion.span
                        key={`${piece.type}-${piece.color}-${r}-${c}`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        className={cn(
                          'select-none leading-none relative z-10',
                          piece.color === 'w'
                            ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                            : 'drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]',
                          isSelected && 'drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]',
                        )}
                      >
                        {PIECE_SYMBOLS[piece.color][piece.type]}
                      </motion.span>
                    )}
                    {r === 7 && (
                      <span className={cn(
                        'absolute bottom-0 right-0.5 text-[9px] font-mono leading-none pointer-events-none',
                        isLight ? 'text-amber-800/50' : 'text-amber-100/50'
                      )}>{coordFiles[c]}</span>
                    )}
                    {c === 0 && (
                      <span className={cn(
                        'absolute top-0 left-0.5 text-[9px] font-mono leading-none pointer-events-none',
                        isLight ? 'text-amber-800/50' : 'text-amber-100/50'
                      )}>{8 - r}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Captured by white (black pieces taken) */}
        {sortedCapturedW.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-0.5 px-2 min-h-[24px] flex-wrap"
          >
            {sortedCapturedW.map((p, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="text-lg leading-none opacity-70"
              >
                {PIECE_SYMBOLS[p.color][p.type]}
              </motion.span>
            ))}
            {materialAdv > 0 && (
              <span className="text-xs font-bold text-emerald-400 ml-1">+{materialAdv}</span>
            )}
          </motion.div>
        )}

        {/* White player bar */}
        <motion.div
          animate={turn === 'w' && phase === 'playing' ? { boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 8px rgba(99,102,241,0.4)', '0 0 0px rgba(99,102,241,0)'] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-card border border-border"
        >
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Brancas (Você)</span>
            {turn === 'w' && phase === 'playing' && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-block w-2 h-2 rounded-full bg-primary"
              />
            )}
          </div>
          <div className={cn(
            'flex items-center gap-1 text-sm font-mono px-2 py-1 rounded-md',
            whiteInCheck ? 'bg-red-500/20 text-red-500 font-bold' : 'bg-muted/50'
          )}>
            <Clock className="w-3 h-3" />
            {formatTime(whiteTime)}
          </div>
        </motion.div>
      </div>

      {/* Side panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 w-64"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(h => !h)} className="gap-1">
            <History className="w-4 h-4" /> Histórico
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setPhase('menu'); if (timerRef.current) clearInterval(timerRef.current); }} className="gap-1">
            <RotateCcw className="w-4 h-4" /> Menu
          </Button>
        </div>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border rounded-lg overflow-hidden"
            >
              <div ref={historyRef} className="max-h-60 overflow-y-auto p-2 text-xs">
                {moveHistory.length === 0 && (
                  <p className="text-muted-foreground text-center py-2">Nenhum movimento</p>
                )}
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => {
                  const whiteMove = moveHistory[i * 2];
                  const blackMove = moveHistory[i * 2 + 1];
                  const whiteNotation = whiteMove
                    ? moveToNotation(whiteMove, moveHistory.slice(0, i * 2).reduce((b, mv) => applyMoveToBoard(b, mv), createInitialBoard()))
                    : '';
                  const boardAfterWhite = whiteMove
                    ? applyMoveToBoard(moveHistory.slice(0, i * 2).reduce((b, mv) => applyMoveToBoard(b, mv), createInitialBoard()), whiteMove)
                    : null;
                  const blackNotation = blackMove && boardAfterWhite
                    ? moveToNotation(blackMove, boardAfterWhite)
                    : '';
                  const isLastPair = i === Math.ceil(moveHistory.length / 2) - 1;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        'flex gap-1 px-2 py-1 rounded',
                        isLastPair && 'bg-primary/10 font-medium',
                        !isLastPair && i % 2 === 0 && 'bg-muted/30',
                      )}
                    >
                      <span className="text-muted-foreground w-6 text-right shrink-0">{i + 1}.</span>
                      <span className="w-14 shrink-0">{whiteNotation}</span>
                      {blackMove ? (
                        <span className="w-14">{blackNotation}</span>
                      ) : (
                        <span className="w-14 text-muted-foreground">...</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-card border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4" />
            Status
          </div>
          {phase === 'playing' && (
            <div className="text-sm space-y-1">
              <p>Vez: {turn === 'w' ? 'Brancas' : 'Pretas'}</p>
              {checkState && (
                <motion.p
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-red-500 font-bold flex items-center gap-1"
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >Xeque!</motion.span>
                </motion.p>
              )}
              <p className="text-xs text-muted-foreground">Dificuldade: {DIFFICULTY_OPTIONS.find(d => d.value === difficulty)?.label}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Game over overlay */}
      <AnimatePresence>
        {phase === 'ended' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-card border rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl"
            >
              <motion.div
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
                className="text-6xl"
              >{PIECE_SYMBOLS.w.K}</motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-bold"
              >Fim de Jogo</motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-muted-foreground text-lg"
              >{gameResult}</motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-muted-foreground"
              >{moveHistory.length} movimentos jogados</motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-3 justify-center"
              >
                <Button onClick={startGame} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Jogar Novamente
                </Button>
                <Button variant="outline" onClick={() => setPhase('menu')}>
                  Menu
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
