// ============================================================
// ARENA DAS LENDAS — SERVIDOR MMO (WebSocket, estilo hordes.io)
// ────────────────────────────────────────────────────────────
// Muitos jogadores em SIMULTÂNEO no MESMO mundo: presença + raio
// de interesse (padrão Veloren estudado na plataforma), mobs
// AUTORITATIVOS (a MESMA simulação simulacao.ts que o modo solo
// corre no cliente — uma só fonte), chat da arena, orçamentos
// anti-abuso com as MESMAS funções do core.ts (dpsTeto,
// orcamentoMovimento, limpaFala, validaGolpe…).
//
// 30 TPS de simulação · snapshots a 10 Hz filtrados por interesse
// · cap honesto de jogadores · reconciliação com `corrigido`
// · zero estado falso: o que não é validado é recusado com motivo.
//
// JS PURO (o Node não stripa tipos em .mjs) que importa os módulos
// TS puros (Node ≥22 stripa .ts): node server/arena-servidor.mjs
// (PORT=8766 por omissão)
// ============================================================
import { WebSocketServer, WebSocket } from "ws";
import {
  RAIO_INTERESSE, POS_BASE, RAIO_REVIVER, NIVEL_MAX,
  MOBS, CAMPEOES, ITENS,
  validaOla, validaGolpe, limpaFala, falaPermitida, FALA_INTERVALO_MS,
  dpsTeto, orcamentoMovimento, dist, dist2, recolherPos, dentroMundo,
  compraValida, nivelDeXp,
} from "../src/game/arena/core.ts";
import { criarMobs, passoMobs, aplicarDanoMob, eventosVazios } from "../src/game/arena/simulacao.ts";

// ── Configuração honesta ───────────────────────────────────────
const PORTA = Number(process.env.PORT || 8766);
const MAX_JOGADORES = 150;                 // padrão hordes.io/Veloren (cap real)
const TPS = 30;
const TICK_MS = 1000 / TPS;
const SNAP_MS = 100;                       // 10 Hz
const TIMEOUT_SILENCIO = 30_000;
const GOLPE_JANELA_MS = 2000;              // janela do orçamento de dano
const SALTO_MIN_INTERVALO = 9_000;         // blink/dash (E) no máximo 1×/9 s
const SALTO_MAX = 9.2;                     // maior dash/blink do jogo = 8,5 + folga
const MAX_ITENS_POR_ID = 3;

const log = (...a) => console.log(new Date().toISOString(), "[arena]", ...a);

// ── Estado do mundo ────────────────────────────────────────────
let proximoIdHeroi = 1;
const jogadores = new Map();
let mobs = criarMobs(Date.now());

function corMobsAgora() { return mobs.filter((m) => m.respawnTs <= 0).length; }

function novoJogador(id, nome, campeao, ws) {
  return {
    id, nome, campeao, ws,
    nivel: 1, xpTotal: 0, essencia: 0, itens: {}, abates: 0,
    x: POS_BASE.x, z: POS_BASE.z, ry: 0,
    hp: 1, hpMax: 1, mp: 0, mpMax: 1,
    anim: "parado", morto: false,
    ultimoMs: Date.now(), ultimoPosMs: 0,
    ultimoFalaMs: 0, ultimoSaltoMs: 0,
    golpeJanela: { ms: 0, gasto: 0 },
  };
}

function comoEstado(j) {
  return {
    id: j.id, nome: j.nome, campeao: j.campeao, nivel: j.nivel,
    x: Math.round(j.x * 10) / 10, z: Math.round(j.z * 10) / 10, ry: Math.round(j.ry * 100) / 100,
    anim: j.anim, hp: Math.max(0, Math.round(j.hp)), hpMax: Math.round(j.hpMax),
    morto: j.morto, abates: j.abates, essencia: j.essencia,
  };
}
function mobEstado(m) {
  return {
    id: m.id, tipo: m.tipo,
    x: Math.round(m.x * 10) / 10, z: Math.round(m.z * 10) / 10,
    ry: Math.round(m.ry * 100) / 100,
    hp: Math.round(m.hp), hpMax: m.hpMax, anim: m.anim,
  };
}

function enviar(j, obj) {
  try { if (j.ws.readyState === WebSocket.OPEN) j.ws.send(JSON.stringify(obj)); } catch { /* fechado a seguir ao tick */ }
}
function broadcast(obj, exceptId = -1) {
  const s = JSON.stringify(obj);
  for (const j of jogadores.values()) {
    if (j.id === exceptId) continue;
    try { if (j.ws.readyState === WebSocket.OPEN) j.ws.send(s); } catch { /* noop */ }
  }
}

function clampN(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function hpMaxDe(j) {
  const c = CAMPEOES[j.campeao];
  let hp = c.hp + c.hpPorNivel * (j.nivel - 1);
  for (const k of Object.keys(j.itens)) hp += (ITENS[k]?.vida ?? 0) * (j.itens[k] ?? 0);
  return Math.round(hp);
}
function mpMaxDe(j) {
  const c = CAMPEOES[j.campeao];
  return c.mp + c.mpPorNivel * (j.nivel - 1);
}
function lerItens(bruto, destino) {
  if (!bruto || typeof bruto !== "object") return;
  for (const k of Object.keys(ITENS)) {
    destino[k] = Math.min(MAX_ITENS_POR_ID, Math.max(0, Math.floor(Number(bruto[k]) || 0)));
  }
}

// ── Orçamento de dano por jogador (janela deslizante honesta) ──
function gastoGolpe(j, dano, agoraMs) {
  const teto = dpsTeto(j.campeao, j.nivel, j.itens);
  if (agoraMs - j.golpeJanela.ms > GOLPE_JANELA_MS) {
    j.golpeJanela = { ms: agoraMs, gasto: 0 };
  }
  const disponivel = Math.max(0, teto * (GOLPE_JANELA_MS / 1000) - j.golpeJanela.gasto);
  const aceito = Math.min(dano, disponivel);
  j.golpeJanela.gasto += aceito;
  return { aceito: Math.round(aceito), recusado: Math.max(0, Math.round(dano - aceito)) };
}

// ── Validação de movimento (padrão v37: predito no cliente, validado aqui) ──
function validarPosicao(j, nx, nz, agoraMs) {
  const dt = Math.min(2, Math.max(0.05, (agoraMs - j.ultimoPosMs) / 1000));
  const orc = orcamentoMovimento(j.campeao, j.nivel, j.itens, dt);
  const d = dist(j.x, j.z, nx, nz);
  if (!dentroMundo(nx, nz)) {
    const c = recolherPos(nx, nz);
    return { x: c.x, z: c.z, motivo: "fora-do-mundo" };
  }
  if (d <= orc) return { x: nx, z: nz, motivo: "" };
  if (d <= SALTO_MAX && agoraMs - j.ultimoSaltoMs >= SALTO_MIN_INTERVALO) {
    j.ultimoSaltoMs = agoraMs;
    return { x: nx, z: nz, motivo: "" };
  }
  const fator = orc / (d || 1);
  const c = recolherPos(j.x + (nx - j.x) * fator, j.z + (nz - j.z) * fator);
  return { x: c.x, z: c.z, motivo: "rapido-demais" };
}

// ── Loop de simulação (30 TPS, a MESMA sim do cliente solo) ────
setInterval(() => {
  const agora = Date.now();
  const ev = eventosVazios();
  const herois = [];
  for (const j of jogadores.values()) {
    herois.push({
      id: j.id, x: j.x, z: j.z, hp: j.hp,
      armadura: CAMPEOES[j.campeao].armadura + 2 * (j.nivel - 1),
      morto: j.morto,
    });
  }
  passoMobs(mobs, herois, TICK_MS / 1000, agora, ev);

  for (const g of ev.golpesMob) {
    const alvo = jogadores.get(g.alvoId);
    if (!alvo || alvo.morto) continue;
    enviar(alvo, { t: "fere", dano: g.dano, x: g.x, z: g.z });
    for (const outro of jogadores.values()) {
      if (outro.id === g.alvoId) continue;
      if (dist2(outro.x, outro.z, g.x, g.z) > RAIO_INTERESSE * RAIO_INTERESSE) continue;
      enviar(outro, { t: "golpemob", alvoId: g.alvoId, dano: g.dano, x: g.x, z: g.z });
    }
  }

  for (const j of Array.from(jogadores.values())) {
    if (agora - j.ultimoMs > TIMEOUT_SILENCIO) {
      try { j.ws.close(4000, "timeout"); } catch { /* noop */ }
      jogadores.delete(j.id);
      broadcast({ t: "saiu", id: j.id });
    }
  }
}, TICK_MS);

// ── Snapshots a 10 Hz, filtradas por RAIO DE INTERESSE ─────────
setInterval(() => {
  const todos = Array.from(jogadores.values());
  const vivos = mobs.filter((m) => m.respawnTs <= 0);
  const r2 = RAIO_INTERESSE * RAIO_INTERESSE;
  for (const j of jogadores.values()) {
    if (j.ws.readyState !== WebSocket.OPEN) continue;
    const jPerto = todos.filter((o) => o.id !== j.id && dist2(j.x, j.z, o.x, o.z) <= r2).map(comoEstado);
    const mPerto = vivos.filter((m) => dist2(j.x, j.z, m.x, m.z) <= r2).map(mobEstado);
    enviar(j, { t: "snap", j: jPerto, m: mPerto });
  }
}, SNAP_MS);

// ── WebSocket ──────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORTA, perMessageDeflate: false });
log(`ARENA-SERVIDOR no ar — porta ${PORTA} · cap ${MAX_JOGADORES} · ${corMobsAgora()} mobs vivos · TPS ${TPS}`);

wss.on("connection", (ws, req) => {
  let jogador = null;
  let registrado = false;
  const ip = req.socket.remoteAddress ?? "?";

  ws.on("message", (bruto) => {
    let m;
    try { m = JSON.parse(String(bruto)); } catch { return; }
    const agora = Date.now();
    const t = m.t;

    if (t === "ola" && !registrado) {
      if (jogadores.size >= MAX_JOGADORES) {
        ws.send(JSON.stringify({ t: "kicked", motivo: "cheio" }));
        try { ws.close(4001, "cheio"); } catch { /* noop */ }
        return;
      }
      const o = validaOla(m);
      if (!o) {
        ws.send(JSON.stringify({ t: "kicked", motivo: "ola-invalido" }));
        try { ws.close(4002); } catch { /* noop */ }
        return;
      }
      const id = proximoIdHeroi++;
      jogador = novoJogador(id, o.nome, o.campeao, ws);
      jogador.xpTotal = Math.max(0, Math.floor(Number(m.xpTotal) || 0));
      jogador.nivel = nivelDeXp(jogador.xpTotal).nivel;
      jogador.essencia = Math.max(0, Math.floor(Number(m.essencia) || 0));
      lerItens(m.itens, jogador.itens);
      jogador.abates = Math.max(0, Math.floor(Number(m.abates) || 0));
      jogador.hpMax = hpMaxDe(jogador); jogador.hp = jogador.hpMax;
      jogador.mpMax = mpMaxDe(jogador); jogador.mp = jogador.mpMax;
      jogadores.set(id, jogador);
      registrado = true;
      const r2 = RAIO_INTERESSE * RAIO_INTERESSE;
      const jPerto = Array.from(jogadores.values())
        .filter((o2) => o2.id !== id && dist2(jogador.x, jogador.z, o2.x, o2.z) <= r2)
        .map(comoEstado);
      const mPerto = mobs.filter((mm) => mm.respawnTs <= 0 && dist2(jogador.x, jogador.z, mm.x, mm.z) <= r2).map(mobEstado);
      enviar(jogador, { t: "bemvindo", id, ti: TICK_MS, jogadores: jogadores.size, jogadoresLista: jPerto, mobsLista: mPerto });
      broadcast({ t: "entrou", id, nome: jogador.nome, campeao: jogador.campeao, nivel: jogador.nivel }, id);
      log(`+ ${jogador.nome} (${jogador.campeao} nv${jogador.nivel}) de ${ip} — ${jogadores.size}/${MAX_JOGADORES} jogadores`);
      return;
    }

    if (!jogador || !registrado) return;
    jogador.ultimoMs = agora;

    if (t === "pos") {
      const x = Number(m.x), z = Number(m.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      const v = validarPosicao(jogador, x, z, agora);
      if (v.motivo) enviar(jogador, { t: "corrigido", motivo: v.motivo });
      jogador.x = v.x; jogador.z = v.z;
      jogador.ry = Number.isFinite(Number(m.ry)) ? Number(m.ry) : jogador.ry;
      jogador.anim = m.anim === "andar" || m.anim === "atacar" || m.anim === "morte" ? m.anim : "parado";
      jogador.ultimoPosMs = agora;
      if (!jogador.morto) {
        jogador.hpMax = Math.max(1, Math.floor(Number(m.hpMax) || jogador.hpMax));
        jogador.hp = clampN(m.hp, 0, jogador.hpMax);
        jogador.mpMax = Math.max(1, Math.floor(Number(m.mpMax) || jogador.mpMax));
        jogador.mp = clampN(m.mp, 0, 99999);
      }
      const nivel = Math.floor(Number(m.nivel) || jogador.nivel);
      if (nivel >= 1 && nivel <= NIVEL_MAX && nivel >= jogador.nivel) jogador.nivel = nivel;
      jogador.abates = Math.max(jogador.abates, Math.floor(Number(m.abates) || 0));
      jogador.essencia = clampN(m.essencia, 0, 999999);
      lerItens(m.itens, jogador.itens);
      const campeao = m.campeao;
      if (campeao === "kaimu" || campeao === "lyra" || campeao === "vex" || campeao === "nara") jogador.campeao = campeao;
      return;
    }

    if (t === "morte") {
      jogador.morto = true;
      jogador.hp = 0;
      return;
    }

    if (t === "renasce") {
      const x = Number(m.x), z = Number(m.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      if (dist(x, z, POS_BASE.x, POS_BASE.z) > RAIO_REVIVER + 2) {
        enviar(jogador, { t: "corrigido", motivo: "renasce-fora-da-base" });
        return;
      }
      jogador.morto = false;
      jogador.x = x; jogador.z = z;
      jogador.hpMax = hpMaxDe(jogador); jogador.hp = jogador.hpMax;
      jogador.mpMax = mpMaxDe(jogador); jogador.mp = jogador.mpMax;
      const nivel = Math.floor(Number(m.nivel) || jogador.nivel);
      if (nivel >= 1 && nivel <= NIVEL_MAX) jogador.nivel = nivel;
      jogador.essencia = clampN(m.essencia, 0, 999999);
      jogador.abates = Math.max(jogador.abates, Math.floor(Number(m.abates) || 0));
      lerItens(m.itens, jogador.itens);
      return;
    }

    if (t === "golpe") {
      const g = validaGolpe(m);
      if (!g) return;
      const mob = mobs.find((mm) => mm.id === g.id && mm.respawnTs <= 0);
      if (!mob) return;
      const alcanceMax = 4 + CAMPEOES[jogador.campeao].alcanceAtaque + (MOBS[mob.tipo].chefe ? 3 : 0);
      if (dist(jogador.x, jogador.z, g.x, g.z) > 3 || dist(g.x, g.z, mob.x, mob.z) > alcanceMax + 2) {
        enviar(jogador, { t: "corrigido", motivo: "golpe-fora-de-alcance" });
        return;
      }
      const orc = gastoGolpe(jogador, g.dano, agora);
      if (orc.recusado > 0) enviar(jogador, { t: "corrigido", motivo: "dano-acima-do-teto" });
      if (orc.aceito <= 0) return;
      const morte = aplicarDanoMob(mob, orc.aceito, jogador.id, agora);
      if (morte) {
        broadcast({
          t: "mobmorreu", id: mob.id, tipo: mob.tipo, assassino: jogador.id,
          xp: morte.xp, essencia: morte.essencia, x: Math.round(mob.x * 10) / 10, z: Math.round(mob.z * 10) / 10,
        });
        log(`${jogador.nome} abateu ${mob.tipo} (+${morte.xp} xp, +${morte.essencia} essência)`);
      }
      return;
    }

    if (t === "fala") {
      const texto = limpaFala(m.texto);
      if (!texto) return;
      if (!falaPermitida(jogador.ultimoFalaMs, agora)) {
        enviar(jogador, { t: "corrigido", motivo: "fala-rapida-demais" });
        return;
      }
      jogador.ultimoFalaMs = agora;
      broadcast({ t: "fala", nome: jogador.nome, texto });
      return;
    }

    if (t === "compra") {
      const item = String(m.item ?? "");
      if (!(item in ITENS)) return;
      const ja = jogador.itens[item] ?? 0;
      const v = compraValida(item, ja, jogador.essencia);
      if (!v.ok) { enviar(jogador, { t: "corrigido", motivo: `compra-${v.motivo}` }); return; }
      jogador.essencia -= v.custo;
      jogador.itens[item] = ja + 1;
      enviar(jogador, { t: "compra-ok", item, custo: v.custo, essencia: jogador.essencia });
      return;
    }

    if (t === "ping") {
      const ts = Number(m.ts);
      if (Number.isFinite(ts)) {
        enviar(jogador, { t: "pong", ts, stats: { jogadores: jogadores.size, mobsVivos: corMobsAgora(), mobs: mobs.length } });
      }
      return;
    }
  });

  ws.on("close", () => {
    if (jogador && registrado) {
      jogadores.delete(jogador.id);
      broadcast({ t: "saiu", id: jogador.id });
      log(`- ${jogador.nome} saiu — ${jogadores.size}/${MAX_JOGADORES} jogadores`);
    }
  });
  ws.on("error", () => { try { ws.close(); } catch { /* noop */ } });
});

// ── Log honesto periódico ──────────────────────────────────────
setInterval(() => {
  const mem = process.memoryUsage();
  log(`tick — ${jogadores.size} jogadores · ${corMobsAgora()}/${mobs.length} mobs · rss ${(mem.rss / 1e6).toFixed(0)} MB`);
}, 60_000);

process.on("SIGINT", () => { log("SIGINT — a desligar"); wss.close(); process.exit(0); });
