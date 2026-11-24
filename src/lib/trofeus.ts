// =============================================================
// NÚCLEO TROFÉUS (v87 «TROFÉUS QUE SE MOSTRAM») — padrão esport
// v86/desbloqueios v80: ZERO React, Node-safe com ls guardado.
// ─────────────────────────────────────────────────────────────
// Deriva a VITRINE DE TROFÉUS do perfil a partir da store REAL do
// e-sport (bateu_esport_v1): só campeonatos/ligas FECHADOS com o
// jogador «eu» em 1.º lugar viram troféu. Nada é inventado:
//   · campeão = vencedorId/campeaoId === "eu" E 1.º na ordem por
//     pontos/vitórias (as duas fontes têm de BATER CERTO — se os
//     dados ficarem incoerentes, NÃO há troféu);
//   · pódio = 2.º/3.º em campeonato/liga terminada (eliminatória
//     eliminado NÃO é pódio — não há jogo de 3.º lugar);
//   · competições = torneios/ligas onde «eu» esteve inscrito.
// PURO DE VERDADE: NÃO chama expirarPendentes nem grava nada —
// derivar não pode mutar a store (byte-a-byte igual antes/depois).
// =============================================================
import { lerEsport, jogoEsport, type OrganizadorEsport } from "./esport";

export interface TrofeuEsport {
  id: string;        // id de origem com prefixo («torneio-*» / «liga-*»)
  tipo: "torneio" | "liga";
  nome: string;
  jogoId: string;
  jogoLabel: string;
  organizador: OrganizadorEsport;
  premioPontos: number;
  formato: "campeonato" | "eliminatoria" | "liga";
  fechadoEm: number; // 1.º evento do histórico acima do fim, ou fallback terminaEm/criadoEm
}

export interface ResumoTrofeus {
  trofeus: TrofeuEsport[];
  podios: number;
  competicoes: number;
}

const EU = "eu";

type Linha = { id: string; pontos: number; vitorias: number };
type Fechavel = { historico?: { em: number }[]; terminaEm: number; criadoEm: number };

/** Data honesta de fecho: o 1.º evento do histórico com `em` ≥ terminaEm
 *  é o «Janela/Temporada fechada — campeão: …» que o núcleo esport escreve;
 *  se o histórico não a tiver, fica terminaEm (dia agendado do fecho). */
function fechadoEmDe(f: Fechavel): number {
  const hs = Array.isArray(f.historico) ? f.historico : [];
  let melhor = -1;
  for (const h of hs) {
    if (h && Number.isFinite(h.em) && h.em >= f.terminaEm && (melhor === -1 || h.em < melhor)) melhor = h.em;
  }
  return melhor !== -1 ? melhor : f.terminaEm;
}

function organizadorPodre(o: unknown): boolean {
  if (!o || typeof o !== "object") return true;
  const x = o as Partial<OrganizadorEsport>;
  return typeof x.nome !== "string" || typeof x.cor !== "string" || typeof x.iniciais !== "string";
}

/** Ordem honesta: pontos desc, vitórias desc (a MESMA regra do núcleo
 *  esport usa para coroar — a vitrine nunca contradiz o campeão). */
function ordemDe(linhas: Linha[]): Linha[] {
  return [...linhas]
    .filter((p) => p && typeof p.id === "string" && Number.isFinite(p.pontos))
    .sort((a, b) => b.pontos - a.pontos || (b.vitorias ?? 0) - (a.vitorias ?? 0));
}

export function trofeusDoAparelho(_agoraMs = Date.now()): ResumoTrofeus {
  const e = lerEsport();
  const trofeus: TrofeuEsport[] = [];
  let podios = 0;
  let competicoes = 0;

  for (const t of e.torneios) {
    // anti-podre: entrada corrupta NUNCA quebra a vitrine nem entra por engano
    if (!t || typeof t.id !== "string" || typeof t.nome !== "string" || !Array.isArray(t.participantes)) continue;
    if (organizadorPodre(t.organizador)) continue;
    const eu = t.participantes.find((p) => p && p.id === EU);
    if (eu) competicoes += 1;
    if (t.estado !== "terminado") continue;
    const ordem = ordemDe(t.participantes);
    const posEu = ordem.findIndex((p) => p.id === EU);
    const eCampeao = t.vencedorId === EU && posEu === 0;
    if (eCampeao) {
      trofeus.push({
        id: `torneio-${t.id}`,
        tipo: "torneio",
        nome: t.nome,
        jogoId: t.jogo,
        jogoLabel: jogoEsport(t.jogo)?.label ?? t.jogo,
        organizador: t.organizador,
        premioPontos: t.premioPontos,
        formato: t.formato,
        fechadoEm: fechadoEmDe(t),
      });
    } else if (t.formato === "campeonato" && (posEu === 1 || posEu === 2)) {
      podios += 1; // eliminatória eliminada não é pódio (não há jogo de 3.º lugar)
    }
  }

  for (const l of e.ligas) {
    if (!l || typeof l.id !== "string" || typeof l.nome !== "string" || !Array.isArray(l.pontuacao)) continue;
    if (organizadorPodre(l.organizador)) continue;
    const eu = l.pontuacao.find((p) => p && p.id === EU);
    if (eu) competicoes += 1;
    if (l.estado !== "terminado") continue;
    const ordem = ordemDe(l.pontuacao);
    const posEu = ordem.findIndex((p) => p.id === EU);
    if (l.campeaoId === EU && posEu === 0) {
      trofeus.push({
        id: `liga-${l.id}`,
        tipo: "liga",
        nome: l.nome,
        jogoId: l.jogo,
        jogoLabel: jogoEsport(l.jogo)?.label ?? l.jogo,
        organizador: l.organizador,
        premioPontos: l.premioPontos,
        formato: "liga",
        fechadoEm: fechadoEmDe(l),
      });
    } else if (posEu === 1 || posEu === 2) {
      podios += 1;
    }
  }

  trofeus.sort((a, b) => b.fechadoEm - a.fechadoEm);
  return { trofeus, podios, competicoes };
}
