// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v31 — Cliente Lichess Puzzle API (puzzle diário real)
//
// Fonte: lichess.org/api/puzzle/daily (public-apis → Games & Comics) —
// pública, sem chave, CORS aberto (Access-Control-Allow-Origin: * —
// validado ao vivo em 2026-11-02 com HTTP 200 deste ambiente).
//
// FORMATO CONFIRMADO EMPIRICAMENTE (script scripts/lichess-format-probe2.mjs
// com chess.js): `fen` é a posição DEPOIS da última jogada do adversário
// (somos nós a mover); `lastMove` é apenas informativo (destaque no
// tabuleiro); `solution` é a linha completa em UCI que se repete
// legalmente de ponta a ponta a partir de `fen`.
//
// O puzzle diário muda à meia-noite UTC — cache em localStorage com a
// chave do dia UTC: 1 pedido real por dia por navegador, dedupe em voo e
// fallback stale-on-error (o puzzle de ontem se a rede cair, com aviso).
//
// Princípios da plataforma: ZERO dados inventados (posição, solução,
// rating, jogadores e jogo vêm da Lichess), estados de erro honestos e
// atribuição explícita: "Puzzles © Lichess · CC BY-SA".
// ═══════════════════════════════════════════════════════════════════════

const API_DAILY = "https://lichess.org/api/puzzle/daily";

export const LICHESS_ATTRIBUTION =
  "Puzzles, posições e jogos © Lichess (lichess.org) · licença CC BY-SA";

export class LichessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LichessError";
  }
}

/** Jogador real do jogo de origem do puzzle (nomes e ratings da Lichess). */
export interface JogadorReal {
  name: string;
  rating: number | null;
  color: "white" | "black";
}

export interface PuzzleDiario {
  id: string;
  /** Posição DEPOIS da jogada do adversário — somos nós a mover. */
  fen: string;
  /** Última jogada do adversário em UCI (informativa, para destaque). */
  lastMove: string;
  /** Linha completa da solução em UCI, começando na NOSSA jogada. */
  solution: string[];
  rating: number;
  plays: number;
  themes: string[];
  perfName: string;
  gameId: string;
  jogadores: JogadorReal[];
}

/** Dia UTC atual (o puzzle diário muda à meia-noite UTC). */
export function chaveDiaUtc(agora = new Date()): string {
  return agora.toISOString().slice(0, 10);
}

async function pedirPuzzle(): Promise<PuzzleDiario> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(API_DAILY, { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new LichessError(`Lichess HTTP ${res.status}`);
    const d = (await res.json()) as {
      puzzle?: { id?: string; fen?: string; lastMove?: string; solution?: string[]; rating?: number; plays?: number; themes?: string[] };
      game?: { id?: string; perf?: { name?: string }; players?: { name?: string; rating?: number; color?: string }[] };
    };
    const p = d.puzzle;
    if (!p || !p.id || !p.fen || !Array.isArray(p.solution) || p.solution.length === 0) {
      throw new LichessError("A Lichess devolveu um puzzle incompleto");
    }
    return {
      id: p.id,
      fen: p.fen,
      lastMove: p.lastMove ?? "",
      solution: p.solution,
      rating: typeof p.rating === "number" ? p.rating : 0,
      plays: typeof p.plays === "number" ? p.plays : 0,
      themes: Array.isArray(p.themes) ? p.themes : [],
      perfName: d.game?.perf?.name ?? "",
      gameId: d.game?.id ?? "",
      jogadores: (d.game?.players ?? [])
        .filter((j): j is { name: string; rating?: number; color: string } => Boolean(j?.name))
        .map((j) => ({
          name: j.name,
          rating: typeof j.rating === "number" ? j.rating : null,
          color: j.color === "black" ? "black" : "white",
        })),
    };
  } catch (err) {
    if (err instanceof LichessError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new LichessError("A Lichess demorou demasiado (timeout)");
    }
    throw new LichessError("Sem ligação à Lichess");
  } finally {
    clearTimeout(timer);
  }
}

let emVoo: Promise<PuzzleDiario> | null = null;

const LS_PREFIX = "bateumz.lichess.diario.";

/**
 * Puzzle diário REAL da Lichess: 1 pedido por dia UTC por navegador
 * (cache), dedupe de pedidos em voo e, se a rede cair, o puzzle de ontem
 * é devolvido COM aviso honesto (`deCache: true`).
 */
export async function getPuzzleDiario(): Promise<PuzzleDiario & { deCache?: boolean }> {
  const hoje = chaveDiaUtc();
  const chave = LS_PREFIX + hoje;
  try {
    const guardado = localStorage.getItem(chave);
    if (guardado) {
      const p = JSON.parse(guardado) as PuzzleDiario;
      if (p?.id && p?.fen && Array.isArray(p.solution)) return p;
    }
  } catch { /* localStorage indisponível — segue para a rede */ }

  if (!emVoo) {
    emVoo = pedirPuzzle()
      .then((p) => {
        try { localStorage.setItem(chave, JSON.stringify(p)); } catch { /* quota */ }
        return p;
      })
      .finally(() => { emVoo = null; });
  }
  try {
    return await emVoo;
  } catch (erroRede) {
    // stale-on-error honesto: devolve o de ontem marcado como cache
    for (let i = 1; i <= 7; i++) {
      const dia = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      try {
        const antigo = localStorage.getItem(LS_PREFIX + dia);
        if (antigo) {
          const p = JSON.parse(antigo) as PuzzleDiario;
          if (p?.id && p?.fen) return { ...p, deCache: true };
        }
      } catch { /* segue */ }
    }
    throw erroRede;
  }
}
