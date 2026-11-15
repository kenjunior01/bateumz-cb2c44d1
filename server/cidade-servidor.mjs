// Cidade Bateu — servidor de presença partilhada (v37 — N3 · v47 — N2 · v52 — N4)
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

import { WebSocketServer } from "ws";
import {
  TPS, SNAPSHOT_HZ, RAIO_INTERESSE, MAX_JOGADORES, SPAWN_PRACA, SEED_CIDADE,
  ORCAMENTO_INICIAL, proximoOrcamento, FALA_RATE_MS, limpaFala,
  SUBIDA_INICIAL, proximoOrcamentoSubida,
  VOO_INICIAL, proximoOrcamentoVoo,
  caminhoLivre,
  EDIT_RATE_MS, EDIT_OVERLAY_CAP,
} from "../src/game/cidade/core.ts";
import { alturaCidade, perfilCidade } from "../src/game/cidade/terrenoCidade.ts";
import { gerarDadosTerreno } from "../src/game/blocos/geracao.ts";
import { carimbarCidade, alvoParaDados, chunkTemCarimbos } from "../src/game/cidade/carimbosCidade.ts";
import { solidoId, ehBloco, BLOCOS, CHUNK, ALTURA, NIVEL_MAR } from "../src/game/blocos/constants.ts";
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

const jogadores = new Map(); // id -> {id, nome, x, y, z, ry, voando, ws, strikes, ultimoMs, ultimoEnvio, orcamento, orcSubida, orcVoo, ultimaFala, ultimoEdit, contador}
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
function recusar(eu, motivo) {
  totalCorrecoes++;
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
      eu = { id, nome: m.nome.trim().slice(0, 24), x: SPAWN_PRACA[0], y: ySpawn, z: SPAWN_PRACA[1], ry: 0, voando: false, ws, strikes: 0, ultimoMs: Date.now(), ultimoEnvio: 0, orcamento: ORCAMENTO_INICIAL, orcSubida: SUBIDA_INICIAL, orcVoo: VOO_INICIAL, ultimaFala: 0, ultimoEdit: 0, contador: 0 };
      jogadores.set(id, eu);
      totalEntradas++;
      const outros = [...jogadores.values()].filter((o) => o.id !== id)
        .map((o) => ({ id: o.id, nome: o.nome, x: o.x, z: o.z, ry: o.ry, y: round2(o.y) }));
      ws.send(JSON.stringify({ t: "bemvindo", id, x: eu.x, y: round2(eu.y), z: eu.z, jogadores: outros }));
      for (const o of jogadores.values()) if (o.id !== id) try { o.ws.send(JSON.stringify({ t: "entrou", id, nome: eu.nome, x: eu.x, z: eu.z, y: round2(eu.y) })); } catch {}
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
      if (d > eu.orcamento) { recusar(eu, "alcance"); return; }
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
      if (!sobreAgua && subida > 0 && subida > eu.orcSubida) { recusar(eu, "parede"); return; }
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
        return;
      }
      // ===== v52 — N4: protocolo novo (com y) =====
      // 1. orçamento VERTICAL sobre o y REAL (física do motor: o salto sobe
      //    ≤ GANHO_SALTO por arco — o orçamento SUBIDA recarrega a 2,6 b/s;
      //    o voo criativo (tecla F) tem o orçamento do F real — VOO_TAXA).
      const dy = m.y - eu.y;
      if (dy > 0) {
        const orcVertical = voando ? eu.orcVoo : eu.orcSubida;
        if (dy > orcVertical) { recusar(eu, "parede"); return; }
        if (voando) eu.orcVoo -= dy; else eu.orcSubida -= dy;
      }
      // 2. o CAMINHO DO CORPO: a caixa 0,6×0,6×1,8 do motor (colideEm)
      //    amostrada ao longo do segmento contra o campo de voxels completo
      //    (terreno + carimbos + edições reportadas). Parede de edifício,
      //    tronco de árvore, mobiliário — tudo o que o motor do cliente
      //    também bloqueia. O voo criativo NÃO está isento: a caixa segue o
      //    y reportado (voar POR CIMA da parede é livre; voar ATRAVÉS dela
      //    é recusado, como no cliente).
      if (!caminhoLivre(solidoEm, eu.x, eu.y, eu.z, x, m.y, z)) { recusar(eu, "parede"); return; }
      // aceites: a posição autoritativa ganha o eixo vertical
      eu.x = x; eu.y = m.y; eu.z = z; eu.ry = ry; eu.voando = voando;
      eu.orcamento -= d;
      if (!sobreAgua && subida > 0) eu.orcSubida -= subida;
    } else if (m.t === "edit") {
      // v52 — N4: a VERDADE da colisão segue as edições legítimas. A cidade é
      // criativo: quebrar/colocar faz parte do jogo. O cliente reporta cada
      // edição real (gancho aoEditar do motor); o servidor aplica ao overlay
      // que a re-simulação consulta — quem partiu a parede pode passar por lá.
      // Limites honestos: rate EDIT_RATE_MS nas duas pontas + cap do overlay.
      const { x, y, z, id } = m;
      const agora = Date.now();
      const editValida = [x, y, z, id].every((v) => Number.isInteger(v))
        && y >= 0 && y < ALTURA && Math.abs(x) < 100_000 && Math.abs(z) < 100_000
        && (id === 0 || (ehBloco(id) && BLOCOS[id] !== undefined));
      if (!editValida) {
        eu.strikes++;
        if (eu.strikes >= STRIKES_MAX) { log("KIQUE edit malformado", eu.id); ws.terminate(); }
        return;
      }
      if (agora - eu.ultimoEdit < EDIT_RATE_MS) { editsRecusados++; return; } // calado até poder (o cliente também limita)
      if (editsOverlay.size >= EDIT_OVERLAY_CAP) { editsRecusados++; log("OVERLAY cheio — edit recusado de", eu.id); return; }
      eu.ultimoEdit = agora;
      editsOverlay.set(`${x},${y},${z}`, id);
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
      })); } catch {}
    } else {
      eu.strikes++;
      if (eu.strikes >= STRIKES_MAX) { log("KIQUE msg inválida", eu.id); ws.terminate(); }
    }
  });
  ws.on("close", () => {
    if (eu) {
      jogadores.delete(eu.id);
      for (const o of jogadores.values()) try { o.ws.send(JSON.stringify({ t: "saiu", id: eu.id })); } catch {}
      log("SAIU", eu.id, eu.nome, "(", jogadores.size, "/", MAX_JOGADORES, ")");
    }
  });
  ws.on("error", () => { try { ws.terminate(); } catch {} });
});

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
  if (Date.now() - ultimoLog > 60_000) {
    ultimoLog = Date.now();
    log("STATS tick", tickNo, "jogadores", jogadores.size, "chunks", chunksCache.size, "edits", editsOverlay.size);
  }
}, Math.round(DT_TICK * 1000));

log("CIDADE-SERVIDOR v52 no ar — porta", process.env.PORT || 8765,
  "| TPS", TPS, "| snapshot", SNAPSHOT_HZ, "Hz | raio", RAIO_INTERESSE,
  "| cap", MAX_JOGADORES, "| core isomórfico + fala + reconciliação + TERRENO (v47) + VOXELS COMPLETOS (v52: carimbos + edições + caixa do corpo, semente", SEED_CIDADE, ")");

process.on("SIGINT", () => { log("A terminar honestamente…"); clearInterval(heartbeat); wss.close(() => process.exit(0)); });
