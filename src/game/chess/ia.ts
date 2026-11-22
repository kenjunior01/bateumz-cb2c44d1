// ═══════════════════════════════════════════════════════════════
// XADREZ — MOTOR DE IA (v75, 2.ª vaga «IA de elite»)
// ────────────────────────────────────────────────────────────────
// O que a v54 deixou (facil = aleatório · medio = guloso 1-ply ·
// dificil = minimax 2-ply só material) passa a motor de VERDADE:
//
//   • Avaliação: material ×8 + tabelas de posição (PST) por peça,
//     par de bispos, peões dobrados/isolados/passados, escudo do
//     rei, direitos de roque; rei troca para tabela de FIM quando
//     o material não-peão desce.
//   • Busca: negamax alfa-beta com aprofundamento iterativo,
//     ORDENAÇÃO de lances (promo > MVV-LVA > roque > PST) e
//     QUISCÊNCIA (capturas, teto 6) — fim do «horizon effect» que
//     deixava a IA a comer isco defendido.
//   • Teto de NÓS (orçamento) — nenhum lance demora mais que uma
//     respiração no browser, honesto em aparelho fraco.
//   • RNG com semente (mulberry32) — determinística para testes;
//     sem semente usa Math.random (o «facil» erra de propósito).
//
// PURA: sem DOM, sem localStorage, sem rede — o MESMO ficheiro
// corre no browser e no `node test-ia-v75.mjs` (regra da casa).
// ═══════════════════════════════════════════════════════════════

export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type Color = "w" | "b";

export interface Piece {
  type: PieceType;
  color: Color;
  moved: boolean;
}

export type Cell = Piece | null;
export type Board = Cell[][];
export type Difficulty = "facil" | "medio" | "dificil";

export interface Move {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  piece: PieceType;
  captured?: Piece;
  castling?: "K" | "Q";
  enPassant?: boolean;
  promotion?: PieceType;
}

// ── Escala: TUDO em oitavos (P=8, N=24, B=24, R=40, Q=72, K=800)
// para as PST clássicas (-50..+50) entrarem inteiras na conta.
export const PIECE_VALUES: Record<PieceType, number> = {
  P: 8, N: 24, B: 24, R: 40, Q: 72, K: 800,
};

export const MATE = 100_000;

// ── PST (ótica das peças BRANCAS; pretas espelham a linha)
const PST_P = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const PST_N = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const PST_B = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
const PST_R = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
const PST_Q = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
const PST_K_MG = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];
const PST_K_EG = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

const PST: Record<PieceType, number[]> = { P: PST_P, N: PST_N, B: PST_B, R: PST_R, Q: PST_Q, K: PST_K_MG };

const BONUS_PAR_BISPOS = 24;
const PENAL_DOBRADO = -10;
const PENAL_ISOLADO = -14;
const BONUS_PASSADO = [0, 4, 8, 16, 30, 45, 70, 0]; // por linha avançada (0 = casa de origem)
const BONUS_ESCUDO = 8;
const BONUS_ROQUE_DIREITO = 12;
const LIMIAR_FIM = 40; // soma do material não-peão (oitavos) abaixo disto → rei de fim de jogo

// ── RNG determinística ──────────────────────────────────────────
export type Rng = () => number;

export function mulberry32(semente: number): Rng {
  let a = semente >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rngDe = (semente?: number): Rng =>
  semente === undefined ? Math.random : mulberry32(semente);

// ── Tabuleiro ───────────────────────────────────────────────────
export function createInitialBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: backRank[c], color: "b", moved: false };
    b[1][c] = { type: "P", color: "b", moved: false };
    b[6][c] = { type: "P", color: "w", moved: false };
    b[7][c] = { type: backRank[c], color: "w", moved: false };
  }
  return b;
}

export function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((c) => (c ? { ...c } : null)));
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function opponent(color: Color): Color {
  return color === "w" ? "b" : "w";
}

export function findKing(board: Board, color: Color): [number, number] {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === "K" && board[r][c]?.color === color) return [r, c];
  return [-1, -1];
}

export function isSquareAttacked(board: Board, r: number, c: number, byColor: Color): boolean {
  const pawnDir = byColor === "w" ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir, pc = c + dc;
    if (inBounds(pr, pc) && board[pr][pc]?.type === "P" && board[pr][pc]?.color === byColor) return true;
  }
  const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [dr, dc] of knightMoves) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc]?.type === "N" && board[nr][nc]?.color === byColor) return true;
  }
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc]?.type === "K" && board[nr][nc]?.color === byColor) return true;
    }
  }
  const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of straightDirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc]?.color === byColor && (board[nr][nc]?.type === "R" || board[nr][nc]?.type === "Q")) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  for (const [dr, dc] of diagDirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc]?.color === byColor && (board[nr][nc]?.type === "B" || board[nr][nc]?.type === "Q")) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  return false;
}

export function isInCheck(board: Board, color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  if (kr === -1) return false;
  return isSquareAttacked(board, kr, kc, opponent(color));
}

// ── Geração de lances ───────────────────────────────────────────
export function getRawMoves(board: Board, r: number, c: number, enPassantTarget: [number, number] | null): Move[] {
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
    case "P": {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const promoRow = color === "w" ? 0 : 7;
      const fr = r + dir;
      if (inBounds(fr, c) && !board[fr][c]) {
        if (fr === promoRow) {
          for (const pt of ["Q", "R", "B", "N"] as PieceType[]) moves.push({ fromR: r, fromC: c, toR: fr, toC: c, piece: "P", promotion: pt });
        } else {
          addMove(fr, c);
          if (r === startRow && !board[r + 2 * dir][c]) addMove(r + 2 * dir, c);
        }
      }
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (!inBounds(fr, nc)) continue;
        if (board[fr][nc]?.color === opp) {
          if (fr === promoRow) {
            for (const pt of ["Q", "R", "B", "N"] as PieceType[]) moves.push({ fromR: r, fromC: c, toR: fr, toC: nc, piece: "P", captured: board[fr][nc], promotion: pt });
          } else {
            addMove(fr, nc);
          }
        }
        if (enPassantTarget && enPassantTarget[0] === fr && enPassantTarget[1] === nc) {
          moves.push({ fromR: r, fromC: c, toR: fr, toC: nc, piece: "P", enPassant: true, captured: board[r][nc] });
        }
      }
      break;
    }
    case "N": {
      const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of knightMoves) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) addMove(nr, nc);
      }
      break;
    }
    case "B": addSliding([[-1, -1], [-1, 1], [1, -1], [1, 1]]); break;
    case "R": addSliding([[-1, 0], [1, 0], [0, -1], [0, 1]]); break;
    case "Q": addSliding([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]); break;
    case "K": {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc)) addMove(nr, nc);
        }
      }
      if (!piece.moved && !isInCheck(board, color)) {
        const row = color === "w" ? 7 : 0;
        const rook = board[row][7];
        if (rook && rook.type === "R" && !rook.moved && !board[row][5] && !board[row][6]) {
          if (!isSquareAttacked(board, row, 5, opp) && !isSquareAttacked(board, row, 6, opp)) {
            moves.push({ fromR: r, fromC: c, toR: row, toC: 6, piece: "K", castling: "K" });
          }
        }
        const rookQ = board[row][0];
        if (rookQ && rookQ.type === "R" && !rookQ.moved && !board[row][1] && !board[row][2] && !board[row][3]) {
          if (!isSquareAttacked(board, row, 2, opp) && !isSquareAttacked(board, row, 3, opp)) {
            moves.push({ fromR: r, fromC: c, toR: row, toC: 2, piece: "K", castling: "Q" });
          }
        }
      }
      break;
    }
  }
  return moves;
}

export function getLegalMoves(board: Board, r: number, c: number, enPassantTarget: [number, number] | null): Move[] {
  const piece = board[r][c];
  if (!piece) return [];
  const raw = getRawMoves(board, r, c, enPassantTarget);
  return raw.filter((m) => {
    const nb = applyMoveToBoard(board, m);
    return !isInCheck(nb, piece.color);
  });
}

export function getAllLegalMoves(board: Board, color: Color, enPassantTarget: [number, number] | null): Move[] {
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

// ── Aplicar lance ───────────────────────────────────────────────
export function applyMoveToBoard(board: Board, move: Move): Board {
  const nb = cloneBoard(board);
  const piece = nb[move.fromR][move.fromC];
  if (!piece) return nb;

  if (move.enPassant) {
    nb[move.fromR][move.toC] = null;
  }

  if (move.castling) {
    const row = move.fromR;
    if (move.castling === "K") {
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

  if (move.promotion) {
    nb[move.toR][move.toC] = { type: move.promotion, color: piece.color, moved: true };
  }

  return nb;
}

export function moveToNotation(move: Move, board: Board): string {
  const files = "abcdefgh";
  const piece = board[move.fromR][move.fromC];
  if (!piece) return "";

  if (move.castling === "K") return "O-O";
  if (move.castling === "Q") return "O-O-O";

  let notation = "";
  if (piece.type !== "P") notation += piece.type;
  if (move.captured) {
    if (piece.type === "P") notation += files[move.fromC];
    notation += "x";
  }
  notation += files[move.toC] + (8 - move.toR);
  if (move.promotion) notation += "=" + move.promotion;
  return notation;
}

// ── Avaliação (ótica das BRANCAS, em oitavos) ───────────────────
export function avaliarPosicao(board: Board): number {
  let score = 0;
  const bispos = { w: 0, b: 0 };
  let materialNaoPeao = { w: 0, b: 0 };
  const rei: Record<Color, [number, number]> = { w: [-1, -1], b: [-1, -1] };
  const direitos = { w: false, b: false };
  const colunasPeoes: Record<Color, Map<number, number[]>> = { w: new Map(), b: new Map() };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sinal = p.color === "w" ? 1 : -1;
      const idx = p.color === "w" ? r * 8 + c : (7 - r) * 8 + c;
      score += sinal * PIECE_VALUES[p.type];
      if (p.type !== "K") score += sinal * PST[p.type][idx];
      if (p.type === "B") bispos[p.color]++;
      if (p.type !== "P" && p.type !== "K") materialNaoPeao[p.color] += PIECE_VALUES[p.type];
      if (p.type === "K") rei[p.color] = [r, c];
      if ((p.type === "K" || p.type === "R") && !p.moved) direitos[p.color] = true;
      if (p.type === "P") {
        const arr = colunasPeoes[p.color].get(c) ?? [];
        arr.push(p.color === "w" ? r : 7 - r); // «linha de avanço» 0..7
        colunasPeoes[p.color].set(c, arr);
      }
    }
  }

  // Rei: tabela de fim de jogo quando quase não resta material móvel
  const fim = materialNaoPeao.w + materialNaoPeao.b < LIMIAR_FIM * 2;
  if (fim) {
    if (rei.w[0] >= 0) score += PST_K_EG[rei.w[0] * 8 + rei.w[1]];
    if (rei.b[0] >= 0) score -= PST_K_EG[(7 - rei.b[0]) * 8 + rei.b[1]];
  }

  if (bispos.w >= 2) score += BONUS_PAR_BISPOS;
  if (bispos.b >= 2) score -= BONUS_PAR_BISPOS;

  // Peões: dobrados / isolados / passados (por coluna, linha de avanço)
  for (const cor of ["w", "b"] as Color[]) {
    const sinal = cor === "w" ? 1 : -1;
    const inimigo = opponent(cor);
    for (const [c, lins] of colunasPeoes[cor]) {
      if (lins.length >= 2) score += sinal * PENAL_DOBRADO * (lins.length - 1);
      const vizinhos = [c - 1, c + 1].some((cc) => (colunasPeoes[cor].get(cc)?.length ?? 0) > 0);
      if (!vizinhos) score += sinal * PENAL_ISOLADO * lins.length;
      for (const lin of lins) {
        const bloqueado = [c - 1, c, c + 1].some((cc) =>
          cc >= 0 && cc < 8 && (colunasPeoes[inimigo].get(cc) ?? []).some((li) => li > lin));
        if (!bloqueado) score += sinal * BONUS_PASSADO[Math.min(lin, 7)];
      }
    }
  }

  // Escudo do rei (abertura) + direito de roque
  if (!fim) {
    for (const cor of ["w", "b"] as Color[]) {
      const sinal = cor === "w" ? 1 : -1;
      const [kr, kc] = rei[cor];
      if (kr < 0) continue;
      const dir = cor === "w" ? -1 : 1;
      let escudo = 0;
      for (const dc of [-1, 0, 1]) {
        const pr = kr + dir, pc = kc + dc;
        if (inBounds(pr, pc) && board[pr][pc]?.type === "P" && board[pr][pc]?.color === cor) escudo++;
      }
      score += sinal * escudo * BONUS_ESCUDO;
    }
    if (direitos.w) score += BONUS_ROQUE_DIREITO;
    if (direitos.b) score -= BONUS_ROQUE_DIREITO;
  }

  return score;
}

// ── Busca ───────────────────────────────────────────────────────
interface Ctx {
  nós: number;
  teto: number;
  abortado: boolean;
}

function ordenarLances(moves: Move[], board: Board): Move[] {
  const pontuar = (m: Move): number => {
    if (m.promotion === "Q") return 9000;
    if (m.promotion) return 8000;
    if (m.captured) return 10 * PIECE_VALUES[m.captured.type] - PIECE_VALUES[m.piece];
    if (m.castling) return 50;
    const p = board[m.fromR][m.fromC];
    if (p) {
      const sinal = p.color === "w" ? 1 : -1;
      const de = PST[p.type][p.color === "w" ? m.fromR * 8 + m.fromC : (7 - m.fromR) * 8 + m.fromC];
      const para = PST[p.type][p.color === "w" ? m.toR * 8 + m.toC : (7 - m.toR) * 8 + m.toC];
      return (para - de) * sinal;
    }
    return 0;
  };
  return moves
    .map((m, i) => ({ m, p: pontuar(m), i }))
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .map((x) => x.m);
}

const novoEp = (m: Move): [number, number] | null =>
  m.piece === "P" && Math.abs(m.toR - m.fromR) === 2 ? [(m.fromR + m.toR) / 2, m.fromC] : null;

function quiescencia(board: Board, cor: Color, alpha: number, beta: number, ep: [number, number] | null, prof: number, ctx: Ctx): number {
  ctx.nós++;
  if (ctx.nós > ctx.teto) { ctx.abortado = true; return avaliarPosicao(board) * (cor === "w" ? 1 : -1); }
  const stand = avaliarPosicao(board) * (cor === "w" ? 1 : -1);
  if (prof === 0) return stand;
  if (stand >= beta) return beta;
  let melhor = Math.max(alpha, stand);
  const capturas = ordenarLances(getAllLegalMoves(board, cor, ep).filter((m) => m.captured || m.promotion), board);
  for (const m of capturas) {
    const nb = applyMoveToBoard(board, m);
    const val = -quiescencia(nb, opponent(cor), -beta, -melhor, novoEp(m), prof - 1, ctx);
    if (val >= beta) return beta;
    if (val > melhor) melhor = val;
    if (ctx.abortado) return melhor;
  }
  return melhor;
}

function negamax(board: Board, prof: number, cor: Color, alpha: number, beta: number, ep: [number, number] | null, ply: number, ctx: Ctx): number {
  ctx.nós++;
  if (ctx.nós > ctx.teto) { ctx.abortado = true; return avaliarPosicao(board) * (cor === "w" ? 1 : -1); }
  const lances = getAllLegalMoves(board, cor, ep);
  if (lances.length === 0) {
    if (isInCheck(board, cor)) return -(MATE - ply); // mate AQUI = pior para quem anda
    return 0; // afogamento
  }
  if (prof === 0) return quiescencia(board, cor, alpha, beta, ep, 6, ctx);

  const ordenados = ordenarLances(lances, board);
  let melhor = -Infinity;
  for (const m of ordenados) {
    const nb = applyMoveToBoard(board, m);
    const val = -negamax(nb, prof - 1, opponent(cor), -beta, -alpha, novoEp(m), ply + 1, ctx);
    if (val > melhor) melhor = val;
    if (melhor > alpha) alpha = melhor;
    if (alpha >= beta) break;
    if (ctx.abortado) break;
  }
  return melhor;
}

export interface EscolhaIA {
  lance: Move | null;
  pontuacao: number; // da ótica de quem joga, em oitavos
  profundidade: number;
  nós: number;
}

const PROFUNDIDADE: Record<Difficulty, number> = { facil: 1, medio: 2, dificil: 3 };
const ERRO_FACIL = 0.35; // o «facil» erra de PROPÓSITO 35% das vezes
const TETO_NÓS: Record<Difficulty, number> = { facil: 8_000, medio: 60_000, dificil: 300_000 };

/** O lance da IA. MESMA assinatura que o componente usava (v54) + semente opcional. */
export function getBestMove(
  board: Board,
  color: Color,
  difficulty: Difficulty,
  epTarget: [number, number] | null,
  semente?: number,
): Move | null {
  return escolherLance(board, color, difficulty, epTarget, semente).lance;
}

export function escolherLance(
  board: Board,
  color: Color,
  difficulty: Difficulty,
  epTarget: [number, number] | null,
  semente?: number,
): EscolhaIA {
  const rng = rngDe(semente);
  const lances = getAllLegalMoves(board, color, epTarget);
  if (lances.length === 0) return { lance: null, pontuacao: 0, profundidade: 0, nós: 0 };

  const ctx: Ctx = { nós: 0, teto: TETO_NÓS[difficulty], abortado: false };
  const profMax = PROFUNDIDADE[difficulty];

  // «facil»: 1-ply com erros de propósito — jogável para principiantes.
  if (difficulty === "facil" && rng() < ERRO_FACIL) {
    const escolhido = lances[Math.floor(rng() * lances.length)];
    return { lance: escolhido, pontuacao: 0, profundidade: 1, nós: ctx.nós };
  }

  // Aprofundamento iterativo com orçamento: cada iteração COMPLETA
  // guarda o melhor (se a seguinte abortar, ficamos com este).
  let melhorLance = lances[0];
  let melhorPonto = -Infinity;
  let profFeita = 0;
  for (let prof = 1; prof <= profMax; prof++) {
    let melhorIter = -Infinity;
    let lanceIter = lances[0];
    const ordenados = ordenarLances(lances, board);
    let alpha = -Infinity;
    for (const m of ordenados) {
      const nb = applyMoveToBoard(board, m);
      const val = -negamax(nb, prof - 1, opponent(color), -Infinity, -alpha, novoEp(m), 1, ctx);
      if (val > melhorIter) { melhorIter = val; lanceIter = m; }
      if (val > alpha) alpha = val;
      if (ctx.abortado) break;
    }
    if (ctx.abortado) break;
    melhorLance = lanceIter;
    melhorPonto = melhorIter;
    profFeita = prof;
    if (melhorIter > MATE / 2) break; // achou mate — parar aqui
  }

  return { lance: melhorLance, pontuacao: melhorPonto, profundidade: profFeita, nós: ctx.nós };
}
