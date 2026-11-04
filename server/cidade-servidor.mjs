// Cidade Bateu — servidor de presença partilhada (PoC N3, v36)
// Padrões estudados do Veloren (docs/REA-veloren-estudo-v36.md, ficheiros referenciados):
//   TPS 30 (server-cli/src/main.rs:49) · cap de jogadores (settings/mod.rs:226 = 100)
//   regiões + raio de interesse (presence.rs · region.rs:62) · throttle por distância
//   (sys/entity_sync.rs:123) · msgs nomeadas (common/net/src/msg/server.rs)
// Zero código Veloren — implementação própria em Node. Honestidade: logs reais, cap real,
// validação real; sem física completa no PoC (movimento próprio continua no cliente).

import { WebSocketServer } from "ws";

// ===== constantes (fonte de cada padrão no doc) =====
const TPS = 30;                      // Veloren: server-cli/src/main.rs:49
const DT_TICK = 1 / TPS;
const MAX_DT = 0.2;                  // Veloren: common/src/clock.rs:53 (1/5 s)
const SNAPSHOT_HZ = 10;              // posições a 10 Hz (browsers: throttle de raiz)
const SNAPSHOT_EVERY = Math.max(1, Math.round(TPS / SNAPSHOT_HZ));
const RAIO_INTERESSE = 40;           // blocos — cidade tem ~116 de diâmetro
const REGIAO_TAM = 32;               // grelha de regiões (padrão region.rs, escala menor)
const CELULAS_RAIO = Math.ceil(RAIO_INTERESSE / REGIAO_TAM);
const MAX_JOGADORES = 64;            // Veloren usa 100; a nossa cidade é menor
const MAX_VEL = 12;                  // blocos/s — correr honesto do motor (clamp)
const TOLERANCIA = 2.2;              // margem por snapshot antes de clamp
const STRIKES_MAX = 5;               // mensagens malformadas até kique
const TIMEOUT_MS = 60_000;           // sem mensagens → kique honesto

const regiao = (x, z) => `${Math.floor(x / REGIAO_TAM)},${Math.floor(z / REGIAO_TAM)}`;
const dentro = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2 <= RAIO_INTERESSE ** 2;
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

const jogadores = new Map(); // id -> {id, nome, x, z, ry, ws, strikes, ultimoMs, ultimoEnvio, contador}
let proximoId = 1;
let tickNo = 0;

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
      eu = { id, nome: m.nome.trim().slice(0, 24), x: 0, z: 0, ry: 0, ws, strikes: 0, ultimoMs: Date.now(), ultimoEnvio: 0, contador: 0 };
      jogadores.set(id, eu);
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
      const dt = Math.min(MAX_DT, Math.max(0.001, (agora - eu.ultimoEnvio) / 1000));
      // validação honesta (padrão autoritativo simplificado): clamp de velocidade
      const d = dist2(eu.x, eu.z, x, z);
      const maxD = MAX_VEL * dt * TOLERANCIA;
      if (d > maxD) {
        const f = maxD / (d || 1);
        eu.x += (x - eu.x) * f; eu.z += (z - eu.z) * f;
      } else { eu.x = x; eu.z = z; }
      eu.ry = ry;
      eu.ultimoEnvio = agora;
    } else if (m.t === "ping") {
      try { ws.send(JSON.stringify({ t: "pong", n: m.n })); } catch {}
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

log("CIDADE-SERVIDOR v36 no ar — porta", process.env.PORT || 8765,
  "| TPS", TPS, "| snapshot", SNAPSHOT_HZ, "Hz | raio", RAIO_INTERESSE,
  "| cap", MAX_JOGADORES, "| padrões: Veloren estudo v36 (TPS30, regiões, throttle por distância)");

process.on("SIGINT", () => { log("A terminar honestamente…"); clearInterval(heartbeat); wss.close(() => process.exit(0)); });
