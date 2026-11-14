// Cidade Bateu — servidor de presença partilhada (v37 — N3 completo · v47 — N2)
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

import { WebSocketServer } from "ws";
import {
  TPS, SNAPSHOT_HZ, RAIO_INTERESSE, MAX_JOGADORES, SPAWN_PRACA, SEED_CIDADE,
  ORCAMENTO_INICIAL, proximoOrcamento, FALA_RATE_MS, limpaFala,
  SUBIDA_INICIAL, proximoOrcamentoSubida,
} from "../src/game/cidade/core.ts";
import { alturaCidade } from "../src/game/cidade/terrenoCidade.ts";
import { NIVEL_MAR } from "../src/game/blocos/constants.ts";
import { Ruido } from "../src/game/blocos/noise.ts";

// ===== v47 — o MESMO terreno que o cliente pisa (uma só fonte) =====
// MundoCidade delega em alturaCidade(this.ruido) com ruido = new Ruido(SEED_CIDADE)
// — o servidor constrói o AMOSTRADOR IGUAL. A v46 provou por E2E que este caminho
// (função pura + semente) dá bytes idênticos ao main thread e ao worker.
const ruidoCidade = new Ruido(SEED_CIDADE);
const alturaEm = (x, z) => alturaCidade(ruidoCidade, x, z);

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

const jogadores = new Map(); // id -> {id, nome, x, z, ry, ws, strikes, ultimoMs, ultimoEnvio, orcamento, orcSubida, ultimaFala, contador}
let proximoId = 1;
let tickNo = 0;
// v47 — contadores REAIS da sessão (os stats e o teste de carga consomem-nos)
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
      eu = { id, nome: m.nome.trim().slice(0, 24), x: SPAWN_PRACA[0], z: SPAWN_PRACA[1], ry: 0, ws, strikes: 0, ultimoMs: Date.now(), ultimoEnvio: 0, orcamento: ORCAMENTO_INICIAL, orcSubida: SUBIDA_INICIAL, ultimaFala: 0, contador: 0 };
      jogadores.set(id, eu);
      totalEntradas++;
      const outros = [...jogadores.values()].filter((o) => o.id !== id)
        .map((o) => ({ id: o.id, nome: o.nome, x: o.x, z: o.z, ry: o.ry }));
      ws.send(JSON.stringify({ t: "bemvindo", id, x: eu.x, z: eu.z, jogadores: outros }));
      for (const o of jogadores.values()) if (o.id !== id) try { o.ws.send(JSON.stringify({ t: "entrou", id, nome: eu.nome })); } catch {}
      log("ENTROU", id, eu.nome, "(", jogadores.size, "/", MAX_JOGADORES, ")");
      return;
    }
    eu.ultimoMs = Date.now();
    if (m.t === "pos") {
      const { x, z, ry } = m;
      if (![x, z, ry].every((v) => typeof v === "number" && Number.isFinite(v))) { eu.strikes++; return; }
      const agora = Date.now();
      const dt = (agora - eu.ultimoEnvio) / 1000;
      // v37 — orçamento de movimento: a regra vem do core.ts (padrão `common`).
      // Impossível (d > orçamento) → o servidor NÃO avança, mantém a posição
      // autoritativa e envia `corrigido` (reconciliação honesta).
      eu.orcamento = proximoOrcamento(eu.orcamento, dt);
      // v47 — N2: o orçamento de SUBIDA recarrega na mesma mensagem (mesmo dt)
      eu.orcSubida = proximoOrcamentoSubida(eu.orcSubida, dt);
      const d = dist2(eu.x, eu.z, x, z);
      eu.ultimoEnvio = agora;
      if (d <= eu.orcamento) {
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
        if (!sobreAgua && subida > 0 && subida > eu.orcSubida) {
          totalCorrecoes++;
          try { ws.send(JSON.stringify({ t: "corrigido", motivo: "parede", x: Math.round(eu.x * 100) / 100, z: Math.round(eu.z * 100) / 100 })); } catch {}
          return; // posição autoritativa mantida; orçamentos recarregam em ≤0,5 s
        }
        eu.x = x; eu.z = z; eu.ry = ry;
        eu.orcamento -= d;
        if (!sobreAgua && subida > 0) eu.orcSubida -= subida;
      } else {
        totalCorrecoes++;
        try { ws.send(JSON.stringify({ t: "corrigido", motivo: "alcance", x: Math.round(eu.x * 100) / 100, z: Math.round(eu.z * 100) / 100 })); } catch {}
      }
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
      pacote.push({ id: j.id, nome: j.nome, x: Math.round(j.x * 100) / 100, z: Math.round(j.z * 100) / 100, ry: Math.round(j.ry * 100) / 100 });
    }
    if (pacote.length) try { receptor.ws.send(JSON.stringify({ t: "estado", jogadores: pacote })); } catch {}
  }
  if (Date.now() - ultimoLog > 60_000) {
    ultimoLog = Date.now();
    log("STATS tick", tickNo, "jogadores", jogadores.size);
  }
}, Math.round(DT_TICK * 1000));

log("CIDADE-SERVIDOR v47 no ar — porta", process.env.PORT || 8765,
  "| TPS", TPS, "| snapshot", SNAPSHOT_HZ, "Hz | raio", RAIO_INTERESSE,
  "| cap", MAX_JOGADORES, "| core isomórfico + fala + reconciliação + TERRENO re-simulado (alturaCidade, semente", SEED_CIDADE, ")");

process.on("SIGINT", () => { log("A terminar honestamente…"); clearInterval(heartbeat); wss.close(() => process.exit(0)); });
