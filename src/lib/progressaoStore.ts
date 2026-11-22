// ============================================================
// PROGRESSÃO BATEU (v78) — STORE DO APARELHO (wrapper fino)
// ────────────────────────────────────────────────────────────
// O núcleo (progressao.ts) é PURO; esta camada só lê/escreve o
// localStorage do aparelho e reage à autenticação. PADRÃO DA CASA
// (regionalBranding v72 → regionalCore v73): mesmas funções do
// núcleo, ZERO lógica própria.
// Honestidade do CONVIDADO: o progresso vive SÓ no aparelho
// (`bateu_progressao_v78`) e o painel declara-o; ao iniciar sessão
// o jogadorId passa a ser o da conta (o histórico de aparelho
// continua a valer no aparelho — nada é apagado).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import {
  EstadoProgressao, estadoPadrao, hidratarProgressao, gerarMissoesDoDia,
  registarEvento, registrarPontosDeJogo, clamarMissao, avisoExpiracao,
  nivelDe, EventoProgressao, JogoCatalogo, Recomendacao, CarteirasVisao, Missao,
} from "./progressao";

const CHAVE = "bateu_progressao_v78";

function ler(): EstadoProgressao {
  try {
    const cru = localStorage.getItem(CHAVE);
    return hidratarProgressao(cru ? JSON.parse(cru) : null);
  } catch { return estadoPadrao(); }
}
function gravar(e: EstadoProgressao): void {
  try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch { /* aparelho cheio → só memória */ }
}

/** Hook do aparelho: estado + ações (todas passam PELO NÚCLEO). */
export function useProgressao(agoraMs: number) {
  const [estado, setEstado] = useState<EstadoProgressao>(() => ler());

  const guardar = useCallback((e: EstadoProgressao) => { setEstado(e); gravar(e); }, []);

  // as missões do dia re-agendam sozinhas a cada tick (determinístico)
  useEffect(() => {
    const e = gerarMissoesDoDia(estado, agoraMs);
    if (e !== estado) guardar(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agoraMs]);

  const jogar = useCallback((jogoId: string) => {
    guardar(registarEvento(estado, { t: "jogo", jogoId }, agoraMs));
  }, [estado, agoraMs, guardar]);

  const vencer = useCallback((jogoId: string) => {
    guardar(registarEvento(estado, { t: "vitoria", jogoId }, agoraMs));
  }, [estado, agoraMs, guardar]);

  const pontosDeJogo = useCallback((jogoId: string, pontos: number, teto: number) => {
    const r = registrarPontosDeJogo(estado, jogoId, pontos, teto, agoraMs);
    guardar(r.estado);
    return r;
  }, [estado, agoraMs, guardar]);

  const reclamar = useCallback((missaoId: string) => {
    const r = clamarMissao(estado, missaoId, agoraMs);
    guardar(r.estado);
    return r;
  }, [estado, agoraMs, guardar]);

  /** UMA partida do jogador → UMA transição de estado atómica:
   *  jogo (+ vitória) → progresso das missões, pontos com o TETO do jogo.
   *  Os jogos chamam isto no fim da partida (o kart no payout). */
  const registrarPartida = useCallback((jogoId: string, opts: { vitoria?: boolean; pontos?: number; teto?: number }) => {
    let e = registarEvento(estado, { t: "jogo", jogoId }, agoraMs);
    if (opts.vitoria) e = registarEvento(e, { t: "vitoria", jogoId }, agoraMs);
    if (typeof opts.pontos === "number" && (opts.teto ?? 0) > 0) {
      e = registrarPontosDeJogo(e, jogoId, opts.pontos, opts.teto!, agoraMs).estado;
    }
    guardar(e);
  }, [estado, agoraMs, guardar]);

  return { estado, nivel: nivelDe(estado.pontos), jogar, vencer, pontosDeJogo, reclamar, registrarPartida, avisoExpiracao };
}
export type { EstadoProgressao, Missao, JogoCatalogo, Recomendacao, CarteirasVisao, EventoProgressao };
