// Cidade Bateu — servidor de presença partilhada (v37 — N3 · v47 — N2 · v52 — N4 · v53 — N5)
// Padrões estudados do Veloren (docs/REA-veloren-estudo-v36.md, ficheiro:linha):
//   TPS 30 (server-cli/src/main.rs:49) · cap de jogadores (settings/mod.rs:226 = 100)
//   regiões + raio de interesse (presence.rs · region.rs:62) · throttle por distância
//   (sys/entity_sync.rs:123) · msgs nomeadas (common/net/src/msg/server.rs)
// v37 — NÚCLEO ISOMÓRFICO: as regras de validação/sanitização vêm de
// src/game/cidade/core.ts (padrão `common` do Veloren — a MESMA função que o
// cliente usa). Reconciliação: quando o servidor clampa, responde `corrigido`.
// Zero código Veloren — implementação própria em Node. Honestidade: logs reais,
// cap real, validação real; movimento predito no cliente, validado no servidor.
// v47 — N2 (docs/REA-veloren-n3-v37.md §7.1): o servidor RE-SIMULA O TERRENO —
// alturaCidade do terrenoCidade.ts (o MESMO módulo puro que o MundoCidade e o
// worker usam — provado idêntico na v46) com o MESMO SEED_CIDADE: zero segunda
// fonte. Subida impossível (parede/penhasco) é recusada com `corrigido` + motivo
// honesto; as regras de subida derivam da física do motor (core.ts). `ping`
// responde STATS REAIS do processo (cpu/rss/uptime) para o teste de carga.
// v52 — N4 (o passo anotado desde a v47): o servidor pisa os MESMOS VOXELS.
// O campo é construído pelos módulos puros que o cliente usa (gerarDadosTerreno
// + carimbarCidade — terreno provado byte a byte na v46, carimbos extraídos
// verbatim para carimbosCidade.ts) + o OVERLAY das edições que os clientes
// reportam (msg `edit`, rate-limitado — quebrar/colocar é legítimo, a cidade é
// criativo). Cada msg `pos` com y passa por: orçamento horizontal (v37) ·
// orçamento de SUBIDA do terreno (v47) · orçamento VERTICAL do y real
// (salto/voo, física do motor) · CAMINHO DO CORPO (caixa 0,6×0,6×1,8 do motor
// amostrada pelo caminho — paredes de edifícios, árvores e mobiliário recusadas
// com o motivo honesto «parede»). O y entra no protocolo e nos snapshots — os
// avatares remotos deixam de nascer enterrados no terreno (quem está no telhado
// aparece no telhado). Voo criativo (tecla F) é declarado pelo cliente e tem
// orçamento próprio derivado da velocidade real do F (VOO_TAXA no core.ts).
// v53 — N5 (o passo anotado na v52): PARTILHA VISUAL das edições — o mundo
// editável partilhado. A v52 aplicava as edições à VERDADE da colisão mas não
// as DIFUNDIA: o que o jogador A partiu, o B não VIA. Agora: (1) cada edit
// aceite entra no ÍNDICE por região (a grelha REGIAO_TAM que a presença já
// usa) e nos PENDENTES do tick; (2) no tick de snapshot, os pendentes são
// difundidos aos jogadores dentro do RAIO_INTERESSE — SEM devolver ao autor
// (ele já tem a edição no seu mundo — zero eco); (3) quem chega (bemvindo),
// quem CRUZA uma célula de região ou anda > SINC_A_CADA blocos recebe o LOTE
// das edições à sua volta (o motor aplica-as pela génese mesmo para chunks
// longe). Limites honestos: EDIT_SYNC_CAP no lote + contadores nos stats.
// v59 — PRESENÇA DO NPC NO SERVIDOR MP (o passo anotado desde a v57/v58):
// quem está a FALAR com a Bateu IA (holograma da Praça, POS_NPC_IA de
// npcIa.ts — a MESMA âncora isomórfica do cliente) passa a ser estado
// PARTILHADO: msg `npcfala` (claim + heartbeat a 5 s) / `npcfim` (fim),
// broadcast `npc` a TODOS quando o conjunto muda (heartbeat puro não paga
// broadcast), bemvindo ganha npc.conversas (o chegante nasce a ver),
// expiração honesta a NPC_CONVERSA_TIMEOUT_MS sem sinal (aba fechada
// também sai) e contadores nos stats. O CONTEÚDO da conversa continua
// PRIVADO (só id+nome viajam — o chat segue pela via proxy/edge, este
// servidor nunca o vê); a conversa NÃO é exclusiva (dois podem falar ao
// mesmo tempo — a lista reflete a realidade). Regras no npcMp.ts (núcleo
// isomórfico — o MESMO módulo que o cliente sanitiza com).

import { WebSocketServer } from "ws";
import {
  TPS, SNAPSHOT_HZ, RAIO_INTERESSE, MAX_JOGADORES, SPAWN_PRACA, SEED_CIDADE,
  ORCAMENTO_INICIAL, proximoOrcamento, FALA_RATE_MS, limpaFala,
  SUBIDA_INICIAL, proximoOrcamentoSubida,
  VOO_INICIAL, proximoOrcamentoVoo,
  caminhoLivre,
  EDIT_RATE_MS, EDIT_OVERLAY_CAP,
} from "../src/game/cidade/core.ts";
// v59 — as REGRAS da presença do NPC vêm do núcleo isomórfico (o cliente
// valida os pacotes com as MESMAS funções — padrão `common` do Veloren).
import {
  NPC_FALA_GATE_MS, NPC_CONVERSA_TIMEOUT_MS,
  juntarConversa, sairConversa, limparConversasExpiradas, pacoteConversas,
} from "../src/game/cidade/npcMp.ts";
import { alturaCidade, perfilCidade } from "../src/game/cidade/terrenoCidade.ts";
import { gerarDadosTerreno } from "../src/game/blocos/geracao.ts";
import { carimbarCidade, alvoParaDados, chunkTemCarimbos } from "../src/game/cidade/carimbosCidade.ts";
import { solidoId, validaEdit, CHUNK, ALTURA, NIVEL_MAR } from "../src/game/blocos/constants.ts";
import { Ruido } from "../src/game/blocos/noise.ts";

// ===== v47/v52 — o MESMO mundo que o cliente pisa (uma só fonte) =====
// MundoCidade delega em alturaCidade(this.ruido) e carimbarCidade(alvo) — o
// servidor constrói o AMOSTRADOR E OS CARIMBOS IGUAIS (a v46 provou por E2E
// que este caminho dá bytes idênticos; a v52 estende a prova aos carimbos).
const ruidoCidade = new Ruido(SEED_CIDADE);
const perfilC = perfilCidade(ruidoCidade);
const alturaEm = (x, z) => alturaCidade(ruidoCidade, x, z);

// ===== v52 — o CAMPO DE VOXELS (cache de chunks + overlay de edições) =====
const CHUNCKS_CAP = 256;                 // ~5 MB de voxels (20 KB/chunk)
const chunksCache = new Map();           // "cx,cz" -> Uint8Array
function dadosChunk(cx, cz) {
  const k = `${cx},${cz}`;
  let d = chunksCache.get(k);
  if (!d) {
    d = gerarDadosTerreno(ruidoCidade, cx, cz, perfilC);
    if (chunkTemCarimbos(cx, cz)) carimbarCidade(alvoParaDados(d, cx, cz));
    chunksCache.set(k, d);
    if (chunksCache.size > CHUNCKS_CAP) {
      const maisVelho = chunksCache.keys().next().value;
      chunksCache.delete(maisVelho);
    }
  }
  return d;
}
const editsOverlay = new Map();          // "x,y,z" -> id (0 = quebrado)
let editsAceites = 0, editsRecusados = 0;
// ===== v53 — PARTILHA VISUAL: índice por região + pendentes + lotes =====
const editsIndex = new Map();            // "rx,rz" -> Map("x,y,z" -> {x,y,z,id,por})
const editsPendentes = [];               // aceites deste tick (difusão no tick de snapshot)
let editsDifundidos = 0;                 // edições entregues por DIFUSÃO (por receptor)
let editsSincronizados = 0;              // edições entregues por LOTES de sincronização
const EDIT_SYNC_CAP = 3000;              // cap honesto do lote (mineração contínua de multidões)
function editarNaRegiao(x, z, raio) {
  const lista = [];
  const cx = Math.floor(x / REGIAO_TAM), cz = Math.floor(z / REGIAO_TAM);
  const cr = Math.ceil(raio / REGIAO_TAM);
  for (let dx = -cr; dx <= cr; dx++) for (let dz = -cr; dz <= cr; dz++) {
    const cel = editsIndex.get(`${cx + dx},${cz + dz}`);
    if (!cel) continue;
    for (const e of cel.values()) {
      if (Math.hypot(e.x - x, e.z - z) <= raio) lista.push(e);
      if (lista.length >= EDIT_SYNC_CAP) return lista; // cap do lote (raro — declarado)
    }
  }
  return lista;
}
/** Lote de sincronização: TODAS as edições dentro do raio de interesse da
 *  posição actual (bemvindo · cruzamento de região · SINC_A_CADA blocos andados),
 *  SEM as do próprio autor (ele já as tem no seu mundo — o MESMO zero eco da
 *  difusão; o guarda getBloco do motor seria idempotente, mas a rede não paga). */
function sincEdits(eu) {
  const lista = editarNaRegiao(eu.x, eu.z, RAIO_INTERESSE).filter((e) => e.por !== eu.id);
  if (!lista.length) return;
  editsSincronizados += lista.length;
  try { eu.ws.send(JSON.stringify({ t: "edicoes", lista, sinc: true })); } catch {}
}
/** Regra de disparo do lote: cruza uma célula da grelha OU andou > SINC_A_CADA
 *  desde o último ponto de sincronização (afrouxamento DECLARADO: um jogador
 *  parado perto do limite do raio pode precisar de um passo para receber
 *  edições antigas; a reconciliação `corrigido` mantém o mundo honesto
 *  entretanto — o delta-ACK completo é overkill para a presença da cidade). */
const SINC_A_CADA = 24; // blocos (< RAIO_INTERESSE 40 — o lote cobre o raio no ponto novo)
function cruzaRegiao(eu, x, z) {
  const regNova = regiao(x, z);
  const andou = Math.hypot(x - eu.ultimaSinc[0], z - eu.ultimaSinc[1]);
  if (regNova !== eu.regiaoAtual || andou > SINC_A_CADA) {
    eu.regiaoAtual = regNova;
    eu.ultimaSinc = [x, z];
    sincEdits(eu);
  }
}
const solidoEm = (x, y, z) => {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (y < 0 || y >= ALTURA) return false;
  const k = `${x},${y},${z}`;
  if (editsOverlay.has(k)) return solidoId(editsOverlay.get(k));
  const d = dadosChunk(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
  return solidoId(d[(y * CHUNK + lz) * CHUNK + lx]);
};
// a superfície ANDÁVEL da coluna no campo (o servidor deriva o y inicial do
// PRÓPRIO campo — nunca do cliente): o voxel sólido mais alto com 2 de ar
// acima (a caixa do jogador cabe).
function superficieAndavel(x, z) {
  for (let y = ALTURA - 3; y >= 0; y--) {
    if (solidoEm(x, y, z) && !solidoEm(x, y + 1, z) && !solidoEm(x, y + 2, z)) return y;
  }
  return 0;
}

// ===== v59 — presença do NPC (estado do servidor, regras do núcleo) =====
// override honesto para testes (documentado no log de boot; mínimo 1 s)
const NPC_TIMEOUT_MS = Math.max(1000, Number(process.env.NPC_CONVERSA_TIMEOUT_MS) || NPC_CONVERSA_TIMEOUT_MS);
let npcConversas = [];                 // ConversaNpc[] (núcleo npcMp.ts)
let npcAvisos = 0;                     // claims aceites (npcfala que entraram)
let npcRecusados = 0;                  // npcfala cortados pelo gate NPC_FALA_GATE_MS
let npcExpirados = 0;                  // conversas limpas por falta de heartbeat
/** Broadcast `npc` a TODOS (estado partilhado converge em todos os
 *  clientes — o autor também recebe e o display exclui o próprio nome;
 *  pacote minúsculo, só quando o CONJUNTO de ids muda). */
function difundirNpc() {
  const pacote = JSON.stringify({ t: "npc", conversas: pacoteConversas(npcConversas, Date.now(), NPC_TIMEOUT_MS) });
  for (const o of jogadores.values()) if (o.ws.readyState === 1) try { o.ws.send(pacote); } catch {}
}

// ===== constantes de transporte (topologia própria, não simulação) =====
const DT_TICK = 1 / TPS;
const SNAPSHOT_EVERY = Math.max(1, Math.round(TPS / SNAPSHOT_HZ));
const REGIAO_TAM = 32;               // grelha de regiões (padrão region.rs, escala menor)
const CELULAS_RAIO = Math.ceil(RAIO_INTERESSE / REGIAO_TAM);
const STRIKES_MAX = 5;               // mensagens malformadas até kique
const TIMEOUT_MS = 60_000;           // sem mensagens → kique honesto

const regiao = (x, z) => `${Math.floor(x / REGIAO_TAM)},${Math.floor(z / REGIAO_TAM)}`;
const dentro = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2 <= RAIO_INTERESSE ** 2;
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const round2 = (v) => Math.round(v * 100) / 100;

const jogadores = new Map(); // id -> {id, nome, x, y, z, ry, voando, ws, strikes, ultimoMs, ultimoEnvio, orcamento, orcSubida, orcVoo, ultimaFala, ultimoEdit, contador, regiaoAtual, ultimaSinc}
let proximoId = 1;
let tickNo = 0;
// v47/v52 — contadores REAIS da sessão (os stats e o teste de carga consomem-nos)
let totalCorrecoes = 0;
let totalEntradas = 0;

const wss = new WebSocketServer({ port: Number(process.env.PORT || 8765) });

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// grelha de regiões -> ids de jogadores (padrão region.rs, simplificado)
function rebuildRegioes() {
  const g = new Map();
  for (const j of jogadores.values()) {
    const k = regiao(j.x, j.z);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(j.id);
  }
  return g;
}

function vizinhosDe(x, z, grelha) {
  const cx = Math.floor(x / REGIAO_TAM), cz = Math.floor(z / REGIAO_TAM);
  const ids = new Set();
  for (let dx = -CELULAS_RAIO; dx <= CELULAS_RAIO; dx++)
    for (let dz = -CELULAS_RAIO; dz <= CELULAS_RAIO; dz++) {
      const cel = grelha.get(`${cx + dx},${cz + dz}`);
      if (cel) for (const id of cel) ids.add(id);
    }
  return ids;
}

// v52 — recusa de movimento vertical/caminho: mantém a posição AUTORITATIVA
// (x, y e z) e responde `corrigido` com o motivo honesto + o y do servidor
// (a reconciliação honesta da v37 estendida ao eixo vertical).
function recusar(eu, motivo, alvo) {
  totalCorrecoes++;
  if (process.env.LOG_RECUSAS) log("RECUSA", motivo, "jogador", eu.id, "de", eu.x.toFixed(2), eu.y?.toFixed(2), eu.z.toFixed(2), "para", alvo ? `${alvo.x} ${alvo.y} ${alvo.z}` : "-"); // diagnóstico honesto sob LOG_RECUSAS=1 (apanhou o furo do drive v53)
  const pacote = { t: "corrigido", motivo, x: round2(eu.x), z: round2(eu.z) };
  if (typeof eu.y === "number") pacote.y = round2(eu.y);
  try { eu.ws.send(JSON.stringify(pacote)); } catch {}
}

wss.on("connection", (ws, req) => {
  let eu = null;
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch { if (eu) { eu.strikes++; if (eu.strikes >= STRIKES_MAX) { log("KIQUE malformado", eu.id); ws.terminate(); } } return; }
    if (eu === null) {
      if (m?.t !== "ola" || typeof m.nome !== "string" || !m.nome.trim()) { ws.close(4000, "ola primeiro"); return; }
      if (jogadores.size >= MAX_JOGADORES) { ws.send(JSON.stringify({ t: "rejeitado", motivo: "cheio" })); ws.close(4001, "cheio"); log("RECUSADO cheio"); return; }
      const id = proximoId++;
      // v37 — spawn IGUAL ao do cliente (SPAWN_PRACA do core — fonte única)
      // v52 — o y inicial vem DO CAMPO do servidor (nunca do cliente)
      const ySpawn = superficieAndavel(SPAWN_PRACA[0], SPAWN_PRACA[1]) + 1.001;
      eu = { id, nome: m.nome.trim().slice(0, 24), x: SPAWN_PRACA[0], y: ySpawn, z: SPAWN_PRACA[1], ry: 0, voando: false, ws, strikes: 0, ultimoMs: Date.now(), ultimoEnvio: 0, orcamento: ORCAMENTO_INICIAL, orcSubida: SUBIDA_INICIAL, orcVoo: VOO_INICIAL, ultimaFala: 0, ultimoEdit: 0, ultimoNpcFala: 0, contador: 0, regiaoAtual: regiao(SPAWN_PRACA[0], SPAWN_PRACA[1]), ultimaSinc: [SPAWN_PRACA[0], SPAWN_PRACA[1]] };
      jogadores.set(id, eu);
      totalEntradas++;
      const outros = [...jogadores.values()].filter((o) => o.id !== id)
        .map((o) => ({ id: o.id, nome: o.nome, x: o.x, z: o.z, ry: o.ry, y: round2(o.y) }));
      // v59 — o chegante nasce a ver quem já conversa com a Bateu IA
      ws.send(JSON.stringify({ t: "bemvindo", id, x: eu.x, y: round2(eu.y), z: eu.z, jogadores: outros, npc: { conversas: pacoteConversas(npcConversas, Date.now(), NPC_TIMEOUT_MS) } }));
      for (const o of jogadores.values()) if (o.id !== id) try { o.ws.send(JSON.stringify({ t: "entrou", id, nome: eu.nome, x: eu.x, z: eu.z, y: round2(eu.y) })); } catch {}
      // v53 — quem CHEGA recebe o mundo editado: o lote das edições dentro do
      // raio de interesse do spawn (a génese do cliente aplica mesmo para
      // chunks que ainda não existem — mundo.edits).
      sincEdits(eu);
      log("ENTROU", id, eu.nome, "(", jogadores.size, "/", MAX_JOGADORES, ")");
      return;
    }
    eu.ultimoMs = Date.now();
    if (m.t === "pos") {
      const { x, z, ry } = m;
      const temY = typeof m.y === "number" && Number.isFinite(m.y);
      const voando = m.voando === true;
      if (![x, z, ry].every((v) => typeof v === "number" && Number.isFinite(v)) || (temY && (m.y < 0 || m.y > ALTURA + 8))) { eu.strikes++; return; }
      const agora = Date.now();
      const dt = (agora - eu.ultimoEnvio) / 1000;
      // v37 — orçamento de movimento: a regra vem do core.ts (padrão `common`).
      // Impossível (d > orçamento) → o servidor NÃO avança, mantém a posição
      // autoritativa e envia `corrigido` (reconciliação honesta).
      eu.orcamento = proximoOrcamento(eu.orcamento, dt);
      // v47 — N2: os orçamentos de SUBIDA (terreno e voo) recarregam na mesma
      // mensagem (mesmo dt) — cada um com o tecto da sua física real.
      eu.orcSubida = proximoOrcamentoSubida(eu.orcSubida, dt);
      eu.orcVoo = proximoOrcamentoVoo(eu.orcVoo, dt);
      const d = dist2(eu.x, eu.z, x, z);
      eu.ultimoEnvio = agora;
      if (d > eu.orcamento) { recusar(eu, "alcance", m); return; }
      // v47 — N2: re-simulação do TERRENO (o que o Veloren faz no phys/):
      // a superfície sob os pés vem de alturaCidade — A MESMA função e
      // semente do cliente. Subida maior do que um salto com o orçamento
      // vazio = penhasco teleportado → recusa COM MOTIVO honesto. Descidas
      // são legais sempre (cair é física do motor); na água o vertical é
      // do nado (afrouxamento declarado no core.ts).
      const hs = alturaEm(eu.x, eu.z);
      const hn = alturaEm(x, z);
      const subida = hn - hs;
      const sobreAgua = hs < NIVEL_MAR || hn < NIVEL_MAR;
      if (!sobreAgua && subida > 0 && subida > eu.orcSubida) { recusar(eu, "parede", m); return; }
      if (!temY) {
        // protocolo v37 (sem y): só as regras do terreno — comportamento v47 EXACTO.
        // v52 — o y autoritativo é derivado DO CAMPO (nunca do cliente): quem
        // anda pelo protocolo antigo está no chão; sem isto o y fica STALE
        // (furo real da corrida: o reencaixe y punha o cliente DENTRO do
        // terreno e o rAF era recusado para sempre).
        eu.x = x; eu.z = z; eu.ry = ry; eu.voando = false;
        eu.y = alturaEm(x, z) + 1.001;
        eu.orcamento -= d;
        if (!sobreAgua && subida > 0) eu.orcSubida -= subida;
        cruzaRegiao(eu, x, z); // v53 — lote de sincronização (célula nova / SINC_A_CADA)
        return;
      }
      // ===== v52 — N4: protocolo novo (com y) =====
      // 1. orçamento VERTICAL sobre o y REAL (física do motor: o salto sobe
      //    ≤ GANHO_SALTO por arco — o orçamento SUBIDA recarrega a 2,6 b/s;
      //    o voo criativo (tecla F) tem o orçamento do F real — VOO_TAXA).
      const dy = m.y - eu.y;
      if (dy > 0) {
        const orcVertical = voando ? eu.orcVoo : eu.orcSubida;
        if (dy > orcVertical) { recusar(eu, "parede", m); return; }
        if (voando) eu.orcVoo -= dy; else eu.orcSubida -= dy;
      }
      // 2. o CAMINHO DO CORPO: a caixa 0,6×0,6×1,8 do motor (colideEm)
      //    amostrada ao longo do segmento contra o campo de voxels completo
      //    (terreno + carimbos + edições reportadas). Parede de edifício,
      //    tronco de árvore, mobiliário — tudo o que o motor do cliente
      //    também bloqueia. O voo criativo NÃO está isento: a caixa segue o
      //    y reportado (voar POR CIMA da parede é livre; voar ATRAVÉS dela
      //    é recusado, como no cliente).
      if (!caminhoLivre(solidoEm, eu.x, eu.y, eu.z, x, m.y, z)) { recusar(eu, "parede", m); return; }
      // aceites: a posição autoritativa ganha o eixo vertical
      eu.x = x; eu.y = m.y; eu.z = z; eu.ry = ry; eu.voando = voando;
      eu.orcamento -= d;
      if (!sobreAgua && subida > 0) eu.orcSubida -= subida;
      cruzaRegiao(eu, x, z); // v53 — lote de sincronização (célula nova / SINC_A_CADA)
    } else if (m.t === "edit") {
      // v52 — N4: a VERDADE da colisão segue as edições legítimas. A cidade é
      // criativo: quebrar/colocar faz parte do jogo. O cliente reporta cada
      // edição real (gancho aoEditar do motor); o servidor aplica ao overlay
      // que a re-simulação consulta — quem partiu a parede pode passar por lá.
      // Limites honestos: rate EDIT_RATE_MS nas duas pontas + cap do overlay.
      const { x, y, z, id } = m;
      const agora = Date.now();
      // v53 — a MESMA regra das três pontas (validaEdit em constants.ts —
      // o cliente sanitiza também o que lhe chega; probe prova no Node).
      const editValida = validaEdit(x, y, z, id);
      if (!editValida) {
        eu.strikes++;
        if (eu.strikes >= STRIKES_MAX) { log("KIQUE edit malformado", eu.id); ws.terminate(); }
        return;
      }
      if (agora - eu.ultimoEdit < EDIT_RATE_MS) { editsRecusados++; return; } // calado até poder (o cliente também limita)
      if (editsOverlay.size >= EDIT_OVERLAY_CAP) { editsRecusados++; log("OVERLAY cheio — edit recusado de", eu.id); return; }
      eu.ultimoEdit = agora;
      editsOverlay.set(`${x},${y},${z}`, id);
      // v53 — o índice por região (a MESMA grelha da presença) alimenta os
      // lotes de sincronização; os pendentes alimentam a difusão do tick.
      const regEdit = regiao(x, z);
      if (!editsIndex.has(regEdit)) editsIndex.set(regEdit, new Map());
      editsIndex.get(regEdit).set(`${x},${y},${z}`, { x, y, z, id, por: eu.id });
      editsPendentes.push({ x, y, z, id, por: eu.id });
      editsAceites++;
    } else if (m.t === "fala") {
      // v37 — chat da praça: sanitização com core.limpaFala + rate limit honesto
      const texto = limpaFala(m.texto);
      if (!texto) { eu.strikes++; if (eu.strikes >= STRIKES_MAX) { log("KIQUE fala vazia", eu.id); ws.terminate(); } return; }
      const agora = Date.now();
      if (agora - eu.ultimaFala < FALA_RATE_MS) return; // calado até poder (cliente também limita)
      eu.ultimaFala = agora;
      const pacote = JSON.stringify({ t: "fala", id: eu.id, nome: eu.nome, texto });
      for (const o of jogadores.values()) if (o.ws.readyState === 1) try { o.ws.send(pacote); } catch {}
    } else if (m.t === "npcfala") {
      // v59 — claim/heartbeat: «estou a falar com a Bateu IA». Sem texto
      // (presença só), gate NPC_FALA_GATE_MS (corta SPAM, nunca o
      // heartbeat normal), broadcast SÓ quando o conjunto muda — o
      // heartbeat puro (sinal refrescado) não paga difusão.
      const agora = Date.now();
      if (agora - eu.ultimoNpcFala < NPC_FALA_GATE_MS) { npcRecusados++; return; }
      eu.ultimoNpcFala = agora;
      const r = juntarConversa(npcConversas, eu.id, eu.nome, agora);
      npcConversas = r.lista;
      npcAvisos++;
      if (r.mudou) difundirNpc();
    } else if (m.t === "npcfim") {
      // v59 — «parei de falar»: só sai se estava na lista; broadcast só se
      // mudou (npcfim sem claim anterior é um no-op honesto).
      const r = sairConversa(npcConversas, eu.id);
      npcConversas = r.lista;
      if (r.mudou) difundirNpc();
    } else if (m.t === "ping") {
      try { ws.send(JSON.stringify({ t: "pong", n: m.n })); } catch {}
    } else if (m.t === "stats") {
      // v47 — STATS REAIS do processo (o teste de carga mede CPU/memória sem
      // inventar nada: são os contadores do próprio servidor).
      const cpu = process.cpuUsage();
      const mem = process.memoryUsage();
      try { ws.send(JSON.stringify({
        t: "stats", n: m.n ?? 0,
        jogadores: jogadores.size, cap: MAX_JOGADORES, tick: tickNo,
        cpuUserMs: cpu.user / 1000, cpuSysMs: cpu.system / 1000,
        rssMb: Math.round((mem.rss / (1024 * 1024)) * 10) / 10,
        uptimeS: Math.round(process.uptime()),
        correcoes: totalCorrecoes, entradas: totalEntradas,
        editsAceites, editsRecusados, chunks: chunksCache.size, overlay: editsOverlay.size,
        editsDifundidos, editsSincronizados,
        npcConversas: npcConversas.length, npcAvisos, npcRecusados, npcExpirados,
      })); } catch {}
    } else {
      eu.strikes++;
      if (eu.strikes >= STRIKES_MAX) { log("KIQUE msg inválida", eu.id); ws.terminate(); }
    }
  });
  ws.on("close", () => {
    if (eu) {
      jogadores.delete(eu.id);
      // v59 — quem cai da ligação também sai da conversa do NPC (a aba
      // fechada sem adeus não deixa a presença presa para sempre)
      const r = sairConversa(npcConversas, eu.id);
      npcConversas = r.lista;
      if (r.mudou) difundirNpc();
      for (const o of jogadores.values()) try { o.ws.send(JSON.stringify({ t: "saiu", id: eu.id })); } catch {}
      log("SAIU", eu.id, eu.nome, "(", jogadores.size, "/", MAX_JOGADORES, ")");
    }
  });
  ws.on("error", () => { try { ws.terminate(); } catch {} });
});

// v59 — expiração da conversa do NPC: interval de 3 s (≪ timeout — o
// mundo fica a saber até 3 s depois da última vez; o heartbeat do cliente
// é de 5 s e o timeout de 15 s, logo 3 sinais perdidos expiram aqui)
setInterval(() => {
  if (!npcConversas.length) return;
  const antes = npcConversas.length;
  npcConversas = limparConversasExpiradas(npcConversas, Date.now(), NPC_TIMEOUT_MS).lista;
  const sairam = antes - npcConversas.length;
  if (sairam > 0) {
    npcExpirados += sairam;
    difundirNpc();
  }
}, 3000).unref?.();

// ===== tick principal (padrão server-cli/main.rs: loop com dt fixo) =====
const heartbeat = setInterval(() => {
  for (const j of jogadores.values()) {
    if (j.ws.isAlive === false) { log("KIQUE sem resposta", j.id); try { j.ws.terminate(); } catch {} continue; }
    j.ws.isAlive = false;
    try { j.ws.ping(); } catch {}
    if (Date.now() - j.ultimoMs > TIMEOUT_MS) { log("KIQUE timeout", j.id); try { j.ws.terminate(); } catch {} }
  }
}, 15_000);

let ultimoLog = Date.now();
setInterval(() => {
  tickNo++;
  const deveEnviar = tickNo % SNAPSHOT_EVERY === 0;
  if (!deveEnviar) return;
  const grelha = rebuildRegioes();
  const todos = [...jogadores.values()];
  for (const receptor of todos) {
    if (receptor.ws.readyState !== 1) continue;
    receptor.contador++;
    const viz = vizinhosDe(receptor.x, receptor.z, grelha);
    const pacote = [];
    for (const j of todos) {
      if (j.id === receptor.id) continue;
      if (!viz.has(j.id) || !dentro(receptor.x, receptor.z, j.x, j.z)) continue; // interest management
      // throttle por distância (padrão entity_sync.rs:123): perto 10 Hz · médio 5 Hz · longe 2 Hz
      const d = dist2(receptor.x, receptor.z, j.x, j.z);
      const k = d < 12 ? 1 : d < 25 ? 2 : 5;
      if (receptor.contador % k !== 0) continue;
      const p = { id: j.id, nome: j.nome, x: round2(j.x), z: round2(j.z), ry: round2(j.ry), y: round2(j.y) };
      pacote.push(p);
    }
    if (pacote.length) try { receptor.ws.send(JSON.stringify({ t: "estado", jogadores: pacote })); } catch {}
  }
  // v53 — DIFUSÃO das edições aceites neste tick (10 Hz): dentro do raio de
  // interesse, SEM devolver ao autor (ele já tem a edição — zero eco). A
  // lista de cada receptor é filtrada POR ELE (a gestão de interesse é
  // individual, como a dos snapshots de presença).
  if (editsPendentes.length) {
    for (const receptor of todos) {
      if (receptor.ws.readyState !== 1) continue;
      const lista = editsPendentes.filter((e) => e.por !== receptor.id && dentro(receptor.x, receptor.z, e.x, e.z));
      if (lista.length) {
        editsDifundidos += lista.length;
        try { receptor.ws.send(JSON.stringify({ t: "edicoes", lista })); } catch {}
      }
    }
    editsPendentes.length = 0;
  }
  if (Date.now() - ultimoLog > 60_000) {
    ultimoLog = Date.now();
    log("STATS tick", tickNo, "jogadores", jogadores.size, "chunks", chunksCache.size, "edits", editsOverlay.size);
  }
}, Math.round(DT_TICK * 1000));

log("CIDADE-SERVIDOR v59 no ar — porta", process.env.PORT || 8765,
  "| TPS", TPS, "| snapshot", SNAPSHOT_HZ, "Hz | raio", RAIO_INTERESSE,
  "| cap", MAX_JOGADORES, "| core isomórfico + TERRENO (v47) + VOXELS COMPLETOS (v52) + PARTILHA VISUAL DAS EDIÇÕES (v53: difusão + lotes de sincronização, semente", SEED_CIDADE, ")",
  "| NPC NO MP (v59: presença da conversa da Bateu IA partilhada — conteúdo privado, timeout", NPC_TIMEOUT_MS, "ms, gate", NPC_FALA_GATE_MS, "ms, cap", 8, ")");

process.on("SIGINT", () => { log("A terminar honestamente…"); clearInterval(heartbeat); wss.close(() => process.exit(0)); });
