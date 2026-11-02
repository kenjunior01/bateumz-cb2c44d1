import { useState, useCallback, useEffect, useRef } from "react";
import { Chess, type Square } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { RotateCcw, AlertTriangle, Loader2, ExternalLink, Crown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPuzzleDiario, LICHESS_ATTRIBUTION, type PuzzleDiario } from "@/lib/lichessPuzzle";

// ═══════════════════════════════════════════════════════════════════════
// PUZZLE DE XADREZ DO DIA — dados REAIS da Lichess (v31)
//
// · A posição, a solução, o rating, o nº de jogadas e o jogo de origem
//   (jogadores e ratings reais) vêm da API pública da Lichess — nada
//   inventado, nenhum puzzle fabricado por nós.
// · As regras do xadrez são aplicadas pelo chess.js (motor real): só é
//   aceita a jogada da solução; jogadas legais mas erradas contam como
//   tentativa errada (sem revelar nada).
// · Formato da API confirmado empiricamente: fen = posição DEPOIS da
//   jogada do adversário (somos nós a mover), solution = linha UCI.
// · Peças: símbolos Unicode de xadrez (U+2654–265F) — os glifos padrão
//   de xadrez, não imitações desenhadas.
// · Erro honesto: Lichess em baixo → mensagem real + tentar novamente.
// ═══════════════════════════════════════════════════════════════════════

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "loading" | "pronta" | "resolvido" | "error";

const GLIFO: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const ARQUIVOS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** SAN da linha completa (replay real com chess.js — para mostrar no fim). */
function linhaSan(fen: string, uci: string[]): string[] {
  try {
    const g = new Chess();
    g.load(fen);
    const sans: string[] = [];
    for (const m of uci) {
      const mv = g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] as "q" | undefined });
      if (!mv) return [];
      sans.push(mv.san);
    }
    return sans;
  } catch {
    return [];
  }
}

export default function ChessPuzzle({ onScore }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [puzzle, setPuzzle] = useState<PuzzleDiario | null>(null);
  const [deCache, setDeCache] = useState(false);

  const jogoRef = useRef<Chess | null>(null);
  const idxRef = useRef(0); // índice na solution[] (0 = nossa 1.ª jogada)
  const [turno, setTurno] = useState<"w" | "b">("w");
  const [versao, setVersao] = useState(0); // força re-render do tabuleiro
  const [selecionado, setSelecionado] = useState<Square | null>(null);
  const [errado, setErrado] = useState(false); // flash de jogada errada
  const [erros, setErros] = useState(0);
  const [comAjuda, setComAjuda] = useState(false);
  const [pontosDados, setPontosDados] = useState(false);
  const autoT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async () => {
    setPhase("loading");
    setErrMsg("");
    try {
      const p = await getPuzzleDiario();
      const g = new Chess();
      g.load(p.fen); // lança em FEN inválido — erro real, não escondemos
      jogoRef.current = g;
      idxRef.current = 0;
      setPuzzle(p);
      setDeCache(Boolean(p.deCache));
      setTurno(g.turn());
      setSelecionado(null);
      setErros(0);
      setComAjuda(false);
      setPontosDados(false);
      setVersao((v) => v + 1);
      setPhase("pronta");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Sem ligação à Lichess");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    carregar();
    return () => { if (autoT.current) clearTimeout(autoT.current); };
  }, [carregar]);

  /** Posição do tabuleiro: linhas já viradas para quem joga (index-based, sem referências frágeis). */
  const jogo = jogoRef.current;
  const linhas: { casa: Square; peca?: { type: string; color: "w" | "b" } }[][] = [];
  if (jogo && (phase === "pronta" || phase === "resolvido")) {
    const raw = jogo.board(); // raw[0] = rank 8 (a8..h8) · raw[7] = rank 1
    // brancas em baixo: linha i mostra rank 8-i, coluna j mostra ficheiro j
    // negras em baixo: linha i mostra rank i+1, coluna j mostra ficheiro 7-j (giro de 180°)
    for (let i = 0; i < 8; i++) {
      const l: { casa: Square; peca?: { type: string; color: "w" | "b" } }[] = [];
      for (let j = 0; j < 8; j++) {
        const rankNum = turno === "b" ? i + 1 : 8 - i;
        const fileIdx = turno === "b" ? 7 - j : j;
        const peca = raw[8 - rankNum][fileIdx];
        l.push({ casa: (ARQUIVOS[fileIdx] + rankNum) as Square, peca: peca ?? undefined });
      }
      linhas.push(l);
    }
  }

  const alvosLegais = useCallback((): Set<string> => {
    if (!jogo || !selecionado) return new Set();
    return new Set(
      jogo
        .moves({ square: selecionado, verbose: true })
        .map((m) => m.to as string),
    );
  }, [jogo, selecionado]);

  const tocarCasa = useCallback((casa: Square) => {
    if (phase !== "pronta" || !jogo) return;
    const peca = jogo.get(casa);
    if (selecionado) {
      if (casa === selecionado) { setSelecionado(null); return; }
      const esperado = puzzle?.solution[idxRef.current];
      // promoção: se a solução pede peça específica, procuramos essa variante
      const promos = esperado && esperado.slice(0, 4) === selecionado + casa && esperado[4]
        ? [esperado[4]]
        : undefined;
      const legal = jogo
        .moves({ square: selecionado, verbose: true })
        .find((m) => m.to === casa && (!m.promotion || !promos || promos.includes(m.promotion)));
      if (!legal) {
        // tocar noutra peça nossa muda a seleção; caso contrário, ignorado
        if (peca && peca.color === jogo.turn()) { setSelecionado(casa); return; }
        return;
      }
      setSelecionado(null);
      // UCI da tentativa — comparado ANTES de aplicar: jogada legal mas errada
      // NUNCA toca no tabuleiro (lição do E2E: aplicar e depois rejeitar sujava o tabuleiro)
      const uciTentativa = selecionado + casa + (legal.promotion ?? "");
      if (esperado && uciTentativa === esperado) {
        try { jogo.move({ from: selecionado, to: casa, promotion: legal.promotion }); } catch { return; }
        idxRef.current += 1;
        setVersao((v) => v + 1);
        const fim = idxRef.current >= (puzzle?.solution.length ?? 0);
        if (fim) {
          setPhase("resolvido");
          if (!pontosDados) {
            setPontosDados(true);
            const pts = comAjuda ? 1 : Math.max(2, 10 - erros * 2);
            onScore?.("Xadrez Puzzle", pts);
            if (!comAjuda) confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
          }
        } else {
          // resposta real do adversário: a próxima jogada da linha oficial
          const resposta = puzzle?.solution[idxRef.current];
          autoT.current = setTimeout(() => {
            if (!resposta) return;
            try {
              jogo.move({ from: resposta.slice(0, 2), to: resposta.slice(2, 4), promotion: resposta[4] as "q" | undefined });
              idxRef.current += 1;
              setTurno(jogo.turn());
              setVersao((v) => v + 1);
            } catch { /* linha incoerente da fonte — nunca devia acontecer */ }
          }, 480);
        }
      } else {
        // legal mas errada: contador honesto, nada revelado
        setErros((e) => e + 1);
        setErrado(true);
        setTimeout(() => setErrado(false), 420);
      }
      return;
    }
    if (peca && peca.color === jogo.turn()) setSelecionado(casa);
  }, [phase, jogo, selecionado, puzzle, erros, comAjuda, pontosDados, onScore]);

  /** Ver a solução (após 2+ erros): repete a linha oficial no tabuleiro. */
  const verSolucao = useCallback(() => {
    if (!jogo || !puzzle || phase !== "pronta") return;
    setComAjuda(true);
    const g = new Chess();
    g.load(puzzle.fen);
    jogoRef.current = g;
    idxRef.current = puzzle.solution.length;
    let i = 0;
    const passo = () => {
      if (i >= puzzle.solution.length) {
        setTurno(g.turn());
        setVersao((v) => v + 1);
        setPhase("resolvido");
        if (!pontosDados) { setPontosDados(true); onScore?.("Xadrez Puzzle", 1); }
        return;
      }
      try { g.move({ from: puzzle.solution[i].slice(0, 2), to: puzzle.solution[i].slice(2, 4), promotion: puzzle.solution[i][4] as "q" | undefined }); } catch { /* — */ }
      i += 1;
      setTurno(g.turn());
      setVersao((v) => v + 1);
      autoT.current = setTimeout(passo, 700);
    };
    passo();
  }, [jogo, puzzle, phase, pontosDados, onScore]);

  const alvos = alvosLegais();
  const ultimaJogada = puzzle?.lastMove
    ? { de: puzzle.lastMove.slice(0, 2), para: puzzle.lastMove.slice(2, 4) }
    : null;
  const reiEmXeque = jogo?.inCheck();
  const casaRei = (() => {
    if (!jogo || !reiEmXeque) return null;
    for (const linha of jogo.board()) for (const cel of linha) {
      if (cel && cel.type === "k" && cel.color === jogo.turn()) return cel.square;
    }
    return null;
  })();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Crown className="h-6 w-6 text-emerald-300" /> Puzzle de Xadrez do Dia
        </h2>
        <p className="text-xs text-muted-foreground">
          O puzzle real da Lichess — o mesmo para o mundo inteiro, muda à meia-noite UTC
        </p>
      </div>

      {phase === "error" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-center space-y-2" data-testid="chesspuzzle-error">
          <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Lichess indisponível</p>
          <p className="text-xs text-muted-foreground">{errMsg}</p>
          <Button onClick={carregar} variant="outline" size="sm" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10" data-testid="chesspuzzle-retry">
            <RotateCcw className="h-4 w-4 mr-1" /> Tentar novamente
          </Button>
        </div>
      )}

      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="chesspuzzle-loading">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-xs font-bold text-muted-foreground">A pedir o puzzle real à Lichess…</p>
        </div>
      )}

      {puzzle && (phase === "pronta" || phase === "resolvido") && (
        <>
          {deCache && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center font-bold" data-testid="chesspuzzle-decache">
              Rede indisponível — a mostrar o puzzle guardado de ontem (cache honesta)
            </p>
          )}

          {/* contexto REAL da fonte: rating, jogadas, tipo de jogo */}
          <div className="flex items-center justify-center gap-3 text-[11px] font-bold flex-wrap" data-testid="chesspuzzle-contexto">
            <span className="text-muted-foreground">Rating do puzzle <span className="text-foreground tabular-nums" data-testid="chesspuzzle-rating">{puzzle.rating}</span></span>
            <span className="text-muted-foreground">Jogado <span className="text-foreground tabular-nums">{puzzle.plays.toLocaleString("pt-PT")}</span>× no mundo</span>
            {puzzle.perfName && <span className="text-muted-foreground">Jogo <span className="text-foreground">{puzzle.perfName}</span></span>}
          </div>

          {/* tabuleiro real 8×8 */}
          <div
            className={cn("mx-auto w-full max-w-[min(92vw,420px)] select-none", errado && "chesspuzzle-shake")}
            data-testid="chesspuzzle-board"
          >
            <div className="grid grid-cols-8 rounded-lg overflow-hidden shadow-lg border border-black/20 aspect-square">
              {linhas.flatMap((linha, li) =>
                linha.map((cel, ci) => {
                  const escura = (li + ci) % 2 === 1;
                  const sel = selecionado === cel.casa;
                  const alvo = alvos.has(cel.casa);
                  const destaqueUltima = ultimaJogada && (cel.casa === ultimaJogada.de || cel.casa === ultimaJogada.para);
                  const xeque = casaRei === cel.casa;
                  const peca = cel.peca;
                  return (
                    <button
                      key={cel.casa + li + ci}
                      onClick={() => tocarCasa(cel.casa)}
                      data-testid={`chesspuzzle-sq-${cel.casa}`}
                      aria-label={cel.casa}
                      className={cn(
                        "relative flex items-center justify-center touch-manipulation",
                        escura ? "bg-[#779556]" : "bg-[#ebecd0]",
                        destaqueUltima && "bg-[#f6f669]",
                        xeque && "bg-gradient-to-br from-[#eeb] to-[#e66]",
                        sel && "bg-amber-400/70",
                      )}
                    >
                      {li === 7 && (
                        <span className={cn("absolute bottom-0 right-0.5 text-[8px] font-bold", escura ? "text-[#ebecd0]" : "text-[#779556]")}>{cel.casa[0]}</span>
                      )}
                      {ci === 0 && (
                        <span className={cn("absolute top-0 left-0.5 text-[8px] font-bold", escura ? "text-[#ebecd0]" : "text-[#779556]")}>{cel.casa[1]}</span>
                      )}
                      {alvo && !peca && (
                        <span className="absolute w-[26%] h-[26%] rounded-full bg-black/25" data-testid={`chesspuzzle-alvo-${cel.casa}`} />
                      )}
                      {alvo && peca && (
                        <span className="absolute inset-1 rounded-full ring-4 ring-inset ring-black/25" data-testid={`chesspuzzle-alvo-${cel.casa}`} />
                      )}
                      {peca && (
                        <span
                          className={cn(
                            "leading-none font-bold",
                            peca.color === "w"
                              ? "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]"
                              : "text-zinc-900 [text-shadow:0_1px_1px_rgba(255,255,255,0.25)]",
                          )}
                          style={{ fontSize: "clamp(20px, 7.2vw, 40px)" }}
                        >
                          {GLIFO[peca.type]}
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          {/* estado — calmo, sem pulso decorativo (skill motion) */}
          <div className="text-center min-h-[28px]" data-testid="chesspuzzle-status">
            {phase === "pronta" && (
              <p className="text-sm font-bold">
                {turno === "w" ? "Jogam as BRANCAS" : "Jogam as NEGRAS"} — encontra a melhor jogada
                {erros > 0 && <span className="text-rose-500"> · {erros} tentativa{erros > 1 ? "s" : ""} errada{erros > 1 ? "s" : ""}</span>}
              </p>
            )}
            <AnimatePresence>
              {phase === "resolvido" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2" data-testid="chesspuzzle-solved">
                  <p className={cn("text-lg font-black", comAjuda ? "text-amber-500" : "text-emerald-500")}>
                    {comAjuda ? "Resolvido com ajuda — vale 1 ponto" : `✅ Resolvido! ${erros === 0 ? "Sem nenhum erro — 10 pontos" : `${erros} erro(s) — ${Math.max(2, 10 - erros * 2)} pontos`}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Linha oficial: <span className="font-bold text-foreground">{linhaSan(puzzle.fen, puzzle.solution).join(" · ")}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Volta amanhã — o puzzle seguinte é o mesmo para todos no mundo.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* jogo de origem REAL (jogadores e ratings da Lichess) */}
          {puzzle.jogadores.length === 2 && (
            <p className="text-center text-[11px] text-muted-foreground" data-testid="chesspuzzle-jogadores">
              Do jogo real{" "}
              <span className="font-bold text-foreground">
                {puzzle.jogadores.find((j) => j.color === "white")?.name}
                {puzzle.jogadores[0].rating ? ` (${puzzle.jogadores[0].rating})` : ""}
              </span>{" "}
              vs{" "}
              <span className="font-bold text-foreground">
                {puzzle.jogadores.find((j) => j.color === "black")?.name}
                {puzzle.jogadores[1].rating ? ` (${puzzle.jogadores[1].rating})` : ""}
              </span>
            </p>
          )}

          {phase === "pronta" && erros >= 2 && (
            <Button onClick={verSolucao} variant="outline" size="sm" className="w-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10" data-testid="chesspuzzle-ver-solucao">
              <Eye className="h-4 w-4 mr-1" /> Ver a solução (vale 1 ponto)
            </Button>
          )}

          {phase === "resolvido" && (
            <Button onClick={carregar} variant="outline" className="w-full h-11 font-bold" data-testid="chesspuzzle-rever">
              <RotateCcw className="h-4 w-4 mr-1" /> Rever o puzzle de hoje
            </Button>
          )}
        </>
      )}

      <p className="text-center text-[10px] text-muted-foreground/70 flex items-center justify-center gap-1" data-testid="chesspuzzle-attribution">
        <ExternalLink className="h-3 w-3" /> {LICHESS_ATTRIBUTION}
      </p>
    </div>
  );
}
