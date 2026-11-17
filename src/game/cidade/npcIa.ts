// ═══════════════════════════════════════════════════════════════════════
// v57 — NPC IA NA PRAÇA (Cidade Bateu) — NÚCLEO PURO ISOMÓRFICO
//
// O passo anotado desde a v54: "a IA dentro da Cidade Bateu (NPC com
// Nemotron)". A BATEU IA vive na Praça do Imbondeiro — uma presença
// flutuante (holograma violeta) a que o jogador chega e fala, com o chat
// REAL da NVIDIA (nvidia/nemotron-3-ultra-550b-a55b) pela MESMA via do
// resto da plataforma: proxy (dev/testes) ou edge (produção) — a chave
// NUNCA vem para o browser.
//
// Padrão isomórfico v46–v56: zero DOM, zero THREE, corre IGUAL no browser
// e no Node (test-ia-v57.mjs importa este ficheiro directamente).
//
// Honestidade declarada:
//   · a posição é FACTO MEDIDO do gerador (SEED_CIDADE=20251103): (3,3)
//     é pavimento da praça (PEDRA/PEDREGULHO carimbado), desocupado a
//     altura de corpo, ao lado do imbondeiro (tronco em (0,0)) — provado
//     no teste A com o módulo puro carimbosCidade;
//   · o contexto da cidade só contém FACTOS que o jogo mediu (distrito
//     próximo, noite/dia, clima real, nome do jogador) — o que não há é
//     OMITIDO (zero «null» no prompt); a IA nunca inventa locais;
//   · a persona tem as MESMAS regras honestas das personas da /ia (v54):
//     nunca inventar resultados de sorteios/vencedores/licenças, jogo
//     responsável, responder na língua do utilizador — com o acréscimo
//     do formato de HUD (respostas curtas, texto simples);
//   · o RAG da v56 NÃO está ligado ao NPC nesta versão: o
//     nemotron-3.5-embed-8b continua 422 no catálogo NVIDIA (SKIP honesto
//     desde a v55) — quando abrir, o NPC pode ler a plataforma com o
//     MESMO índice; passo anotado, não fingido.
// ═══════════════════════════════════════════════════════════════════════

import { ALTURA_PLATEAU, SPAWN_PRACA } from "./core.ts";

/** Nome do NPC (não traduzido — é nome próprio, como os distritos). */
export const NPC_IA_NOME = "Bateu IA";

/** Facto medido do gerador (carimbosCidade.ts): (3,3) fica no pavimento
 *  da Praça do Imbondeiro (PEDRA/PEDREGULHO a y=ALTURA_PLATEAU), a SE do
 *  tronco do imbondeiro (que está em (0,0)), fora do anel das flores e
 *  fora do quiosque (5,-5). A coluna acima está vazia até y=+6 — o corpo
 *  do NPC (holograma ~1,8) cabe sem tocar a copa (folhas só em y=+7).
 *  Provado no teste A do test-ia-v57.mjs com o módulo puro. */
export const POS_NPC_IA: [number, number] = [3, 3];

/** Altura dos pés do NPC: a superfície andável do plateau (core.ts). */
export const NPC_IA_Y = ALTURA_PLATEAU + 1;

/** Raio de interação (padrão WaypointArea dos marcos v38): dentro disto
 *  aparece o prompt «Falar com a Bateu IA». O spawn (0.5, 6.5) fica a
 *  ≈4,3 — o jogador NASCE a ver o prompt. Provado no teste A. */
export const NPC_RAIO_FALAR = 6;

/** Caps do NPC — mais apertados que os da /ia (LIMITES v54): o NPC é um
 *  HUD de jogo, não um laboratório. Declarados no UI. */
export const LIMITES_NPC = {
  /** Mensagens de histórico enviadas ao modelo (6 pares user/assistente). */
  MENSAGENS_CAP: 12,
  /** Caracteres máximos de UMA pergunta do jogador. */
  ENTRADA_CAP: 500,
  /** Caracteres máximos guardados de UMA resposta do NPC. */
  RESPOSTA_CAP: 4_000,
  /** max_tokens do corpo (respostas curtas de HUD — cap do núcleo é 16384). */
  MAX_TOKENS: 1024,
  /** Portão de rate do cliente NPC: 10 chamadas/min com 1,2 s de intervalo. */
  PORTAO_POR_MIN: 10,
  PORTAO_JANELA_MS: 60_000,
  PORTAO_INTERVALO_MS: 1_200,
  /** Chave localStorage da conversa do NPC (cap MENSAGENS_CAP). */
  CHAVE_STORAGE: "bateu.cidade.npc.v57",
} as const;

/** Distância do jogador (x,z) ao NPC. */
export function distanciaNpcIa(x: number, z: number): number {
  return Math.hypot(x - (POS_NPC_IA[0] + 0.5), z - (POS_NPC_IA[1] + 0.5));
}

/** Distância do SPAWN ao NPC — o teste A prova que é < NPC_RAIO_FALAR. */
export function distanciaSpawnNpcIa(): number {
  return Math.hypot(SPAWN_PRACA[0] - (POS_NPC_IA[0] + 0.5), SPAWN_PRACA[1] - (POS_NPC_IA[1] + 0.5));
}

/** NPC no raio de fala? (padrão `marcoPerto` v38 — null = fora). */
export function npcIaPerto(x: number, z: number, raio: number = NPC_RAIO_FALAR): { dist: number } | null {
  const dist = distanciaNpcIa(x, z);
  return dist <= raio ? { dist } : null;
}

// ── Contexto da cidade (factos medidos — nunca inventados) ──────────────

export interface ContextoNpc {
  /** Nome do portal/estrutura mais próxima (portalPerto do jogo) — ou null. */
  distrito?: string | null;
  /** Noite na cidade? (Motor.noite) — undefined = sem dados. */
  noite?: boolean | null;
  /** Clima REAL (Open-Meteo) já resumido pelo chamador — ou null. */
  clima?: string | null;
  /** Nome do jogador (MP) — ou null. */
  jogador?: string | null;
}

/** Bloco de factos da cidade para o system do chat — o MESMO padrão do
 *  contexto RAG da v56: cabeçalho [CIDADE …], linhas só com factos que
 *  EXISTEM (zero «null»), rodapé com a regra anti-invenção. */
export function contextoCidade(c: ContextoNpc): string {
  const linhas: string[] = ["[CIDADE BATEU — FACTOS MEDIDOS AGORA]"];
  if (typeof c.distrito === "string" && c.distrito.trim()) {
    linhas.push(`Estrutura/distrito mais próxima do jogador: ${c.distrito.trim()}`);
  }
  if (c.noite === true) linhas.push("Hora na cidade: noite (o sol já pôs na cidade)");
  if (c.noite === false) linhas.push("Hora na cidade: dia");
  if (typeof c.clima === "string" && c.clima.trim()) {
    linhas.push(`Clima real (Open-Meteo): ${c.clima.trim()}`);
  }
  if (typeof c.jogador === "string" && c.jogador.trim()) {
    linhas.push(`Nome do jogador: ${c.jogador.trim()}`);
  }
  if (linhas.length === 1) linhas.push("(sem factos extra medidos agora)");
  linhas.push(
    "Usa SÓ estes factos sobre a cidade — se um facto não estiver aqui, " +
    "não o inventes e diz honestamente que não o sabes.",
  );
  return linhas.join("\n");
}

/** Persona do NPC — o system do chat. As regras são as MESMAS família das
 *  personas da /ia (CONTEXTO_PLATAFORMA v54) com o acréscimo do formato de
 *  HUD. Determinística (teste A compara byte a byte com o mesmo ctx). */
export function promptSistemaNpc(ctx: ContextoNpc): string {
  return (
    "És a BATEU IA — a inteligência artificial oficial da plataforma Bateu " +
    "(sorteios verificados, desporto real, lives, marketplace, leilões esports, " +
    "jogos e a Cidade Bateu 3D). Vives na Praça do Imbondeiro, no coração da " +
    "Cidade Bateu — um mundo voxel partilhado — flutuando junto ao grande " +
    "imbondeiro, onde chegam viajantes de Moçambique, Angola e Cabo Verde. " +
    "REGRAS QUE NUNCA QUEBRAS: " +
    "(1) Nunca inventas resultados de sorteios, vencedores, valores de prémios, " +
    "probabilidades, dados legais ou licenças — se não souberes, dizes " +
    "honestamente e apontas a secção certa (Transparência, Como Funciona, Suporte). " +
    "(2) Só falas da cidade o que estiver no bloco [CIDADE BATEU — FACTOS MEDIDOS] " +
    "que te é dado em mensagens system — nunca inventas locais, eventos ou " +
    "coordenadas que não estejam aí. " +
    "(3) Respostas CURTAS (máximo ~80 palavras), texto simples, sem títulos nem " +
    "tabelas — estás num HUD de jogo, não numa página de chat. " +
    "(4) Jogo responsável sempre: a diversão vem primeiro, nunca aconselhas " +
    "gastar mais do que a pessoa pode. " +
    "(5) Responde SEMPRE na língua da mensagem do utilizador. " +
    "(6) Se te pedirem dados em tempo real (resultados, preços, bilhetes), dizes " +
    "honestamente que para valores ao segundo a secção certa da plataforma é a " +
    "fonte — nunca estimas. " +
    contextoCidade(ctx)
  );
}

// ── Histórico do NPC (dados puros — a persistência é do chamador) ────────

export interface MsgNpc {
  role: "user" | "assistant";
  content: string;
  // ── v58: meta de sincronização do histórico no servidor (iaHistorico.ts) ──
  // NUNCA chega ao modelo: o cliente valida o fio com validarMensagens,
  // que corta para {role, content}.
  chave?: string;    // chave determinística do histórico sincronizado
  criadoEm?: number; // ms desde epoch — ordena o merge entre dispositivos
}

/** Valida/limpa o histórico persistido do NPC: só user|assistant, corta ao
 *  cap (o MAIS RECENTE fica), corta tamanhos (user ≤ ENTRADA_CAP,
 *  assistant ≤ RESPOSTA_CAP), descarta o inválido em silêncio HONESTO —
 *  o histórico é cache local, dados podres não matam a conversa.
 *  v58: a meta de sincronização (chave/criadoEm) passa VALIDADA — a chave
 *  é carimbada UMA vez e persistida; nunca recalculada depois. */
export function validarHistoricoNpc(entrada: unknown): MsgNpc[] {
  if (!Array.isArray(entrada)) return [];
  const bruto = entrada
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-LIMITES_NPC.MENSAGENS_CAP)
    .map((m: any) => {
      const limpa: MsgNpc = {
        role: m.role as "user" | "assistant",
        content:
          m.role === "user"
            ? String(m.content).slice(0, LIMITES_NPC.ENTRADA_CAP)
            : String(m.content).slice(0, LIMITES_NPC.RESPOSTA_CAP),
      };
      // v58: meta de sincronização passa VALIDADA (chave carimbada uma vez;
      // criadoEm só aceita ms plausíveis — dados podres viram «sem meta»)
      if (typeof m.chave === "string" && m.chave && m.chave.length <= 140) limpa.chave = m.chave;
      const criado = Number(m.criadoEm);
      if (Number.isFinite(criado) && criado > 0) limpa.criadoEm = Math.floor(criado);
      return limpa;
    })
    .filter((m) => m.content.trim().length > 0);
  return bruto;
}
