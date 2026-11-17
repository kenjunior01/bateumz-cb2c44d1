// ═══════════════════════════════════════════════════════════════════════
// v59 — PRESENÇA DO NPC NO SERVIDOR MP — NÚCLEO PURO ISOMÓRFICO
//
// O passo anotado desde a v57/v58 ("presença própria do NPC no servidor
// MP continua anotada"): até aqui o holograma da Bateu IA era 100%
// client-local — cada jogador via o SEU holograma e ninguém sabia quem
// estava a conversar. Agora o estado "quem está a falar com a Bateu IA"
// vive no servidor de presença (cidade-servidor.mjs) e chega a TODOS os
// jogadores do mundo partilhado — a praça vê a conversa acontecer.
//
// Honestidade declarada (o que esta versão NÃO faz):
//   · o CONTEÚDO da conversa continua PRIVADO — o que viaja é só a
//     presença (id + nome), nunca a pergunta nem a resposta (o chat do
//     NPC segue pela via proxy/edge, o servidor MP não o vê);
//   · a conversa NÃO é exclusiva — duas pessoas podem falar com o NPC ao
//     MESMO tempo (cada uma tem o seu painel e a sua resposta); a lista
//     reflete a realidade, não inventa fila;
//   · sem MP, tudo continua a funcionar como na v57 — o envio é no-op
//     honesto (zero pedidos) e o holograma segue local.
//
// Padrão isomórfico v37–v58: zero DOM, zero THREE, zero ws — corre IGUAL
// no browser (multijogador.ts) e no Node (cidade-servidor.mjs importa
// directamente + test-ia-v59.mjs prova aqui).
// ═══════════════════════════════════════════════════════════════════════

/** Quanto tempo uma conversa fica na lista sem heartbeat — 3 sinais
 *  perdidos (o cliente re-signala a 5 s). Depois disso o servidor limpa
 *  e avisa o mundo: quem fechou a aba sem dizer adeus também sai. */
export const NPC_CONVERSA_TIMEOUT_MS = 15_000;

/** Gate do servidor para `npcfala`: um claim aceitável a cada 3 s. O
 *  cliente sinaliza a 5 s — o gate só corta SPAM, nunca o heartbeat
 *  normal (15 s de timeout ≫ 3 s de gate + 5 s de intervalo). */
export const NPC_FALA_GATE_MS = 3_000;

/** Cap honesto da lista difundida: quando cheio, o sinal MAIS ANTIGO
 *  sai para entrar o novo (self-healing — se ainda estiver a falar, o
 *  próximo heartbeat re-adiciona). 8 conversas visíveis na praça. */
export const NPC_CONVERSAS_CAP = 8;

/** Uma conversa na lista do servidor: quem (id MP + nome sanitizado no
 *  `ola`) e o ÚLTIMO sinal (ms — a base da expiração). */
export interface ConversaNpc {
  id: number;
  nome: string;
  sinal: number;
}

/** O que viaja no fio (bemvindo.npc.conversas e pacote `npc`): só id +
 *  nome — o sinal é estado interno do servidor, nunca segredo mas
 *  também não serve ao cliente (a expiração visual é dele). */
export interface ConversaNpcFio {
  id: number;
  nome: string;
}

/** Junta (claim ou heartbeat) sem mutar a entrada — padrão
 *  carimbarMensagens v58. Devolve { lista, mudou }: `mudou` é true só
 *  quando o CONJUNTO de ids mudou (entrou alguém ou alguém foi
 *  despejado pelo cap) — o heartbeat puro (sinal refrescado) NÃO muda
 *  o fio, e o servidor não paga um broadcast por ele. */
export function juntarConversa(
  lista: ConversaNpc[],
  id: number,
  nome: string,
  agora: number,
  cap: number = NPC_CONVERSAS_CAP,
): { lista: ConversaNpc[]; mudou: boolean } {
  const existia = lista.some((c) => c.id === id);
  const atualizada = lista
    .filter((c) => c.id !== id)
    .concat([{ id, nome, sinal: agora }]);
  if (existia) return { lista: atualizada, mudou: false };
  // cap: o sinal mais antigo sai (self-healing — o próximo heartbeat
  // de quem foi despejado re-adiciona, com o cap a decidir de novo)
  if (atualizada.length > cap) {
    let idxMaisVelho = 0;
    for (let i = 1; i < atualizada.length; i++) {
      if (atualizada[i].sinal < atualizada[idxMaisVelho].sinal) idxMaisVelho = i;
    }
    // o recém-chegado nunca se auto-despeja (tem o sinal mais novo por
    // construção) — o despejo só atinge os antigos
    const semVelho = atualizada.filter((_, i) => i !== idxMaisVelho);
    return { lista: semVelho, mudou: true };
  }
  return { lista: atualizada, mudou: true };
}

/** Sai da conversa (npcfim ou ligação caiu) — sem mutar; `mudou` diz ao
 *  servidor se vale um broadcast. */
export function sairConversa(
  lista: ConversaNpc[],
  id: number,
): { lista: ConversaNpc[]; mudou: boolean } {
  const ficam = lista.filter((c) => c.id !== id);
  return { lista: ficam, mudou: ficam.length !== lista.length };
}

/** Expira conversas sem heartbeat — pure; o servidor corre no interval
 *  de 3 s, o cliente usa ao ler. `timeoutMs` é parâmetro (o servidor
 *  aceita override por env NPC_CONVERSA_TIMEOUT_MS para testes —
 *  declarado no log de boot, nunca escondido). */
export function limparConversasExpiradas(
  lista: ConversaNpc[],
  agora: number,
  timeoutMs: number = NPC_CONVERSA_TIMEOUT_MS,
): { lista: ConversaNpc[]; sairam: number } {
  const vivas = lista.filter((c) => agora - c.sinal <= timeoutMs);
  return { lista: vivas, sairam: lista.length - vivas.length };
}

/** O fio: lista viva (expiração aplicada) em formato {id, nome}, cap
 *  aplicado por quem construiu. Determinística. */
export function pacoteConversas(
  lista: ConversaNpc[],
  agora: number,
  timeoutMs: number = NPC_CONVERSA_TIMEOUT_MS,
): ConversaNpcFio[] {
  return limparConversasExpiradas(lista, agora, timeoutMs).lista.map((c) => ({
    id: c.id,
    nome: c.nome,
  }));
}

/** Nomes vivos para mostrar (rótulo do holograma) — limpa expirados,
 *  corta ao `max` e conta os restantes para o sufixo "+N". */
export function nomesConversa(
  lista: ConversaNpc[],
  agora: number,
  max: number = 2,
  timeoutMs: number = NPC_CONVERSA_TIMEOUT_MS,
): { nomes: string[]; mais: number } {
  const vivas = limparConversasExpiradas(lista, agora, timeoutMs).lista;
  const nomes = vivas.slice(0, max).map((c) => c.nome);
  return { nomes, mais: Math.max(0, vivas.length - nomes.length) };
}

/** Valida um pacote `npc` (ou `bemvindo`.npc) CHEGADO ao cliente — o
 *  MESMO padrão da validaEdit/limpaFala: sanitiza MESMO vindo da fonte.
 *  Devolve ConversaNpc[] com sinal=agora; linhas podres descartadas em
 *  silêncio HONESTO (presença nunca derruba a ligação). */
export function validarPacoteNpc(
  m: unknown,
  agora: number,
  cap: number = NPC_CONVERSAS_CAP,
): ConversaNpc[] {
  const raiz = (m as { conversas?: unknown } | null | undefined)?.conversas;
  if (!Array.isArray(raiz)) return [];
  const vivas: ConversaNpc[] = [];
  for (const bruto of raiz.slice(0, cap)) {
    if (!bruto || typeof bruto !== "object") continue;
    const id = Number((bruto as { id?: unknown }).id);
    const nome = (bruto as { nome?: unknown }).nome;
    if (!Number.isFinite(id) || id <= 0) continue;
    if (typeof nome !== "string" || !nome.trim()) continue;
    vivas.push({ id: Math.floor(id), nome: nome.slice(0, 24), sinal: agora });
  }
  return vivas;
}
