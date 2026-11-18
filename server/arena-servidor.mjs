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
  RAIO_FONTE, REGEN_FONTE_HP, REGEN_FONTE_MP, TEMPO_RESPAWN,
  validaOla, validaGolpe, validaGolpePvp, validaCast, limpaFala, falaPermitida, FALA_INTERVALO_MS,
  dpsTeto, orcamentoMovimento, dist, dist2, recolherPos, dentroMundo, posReviver,
  compraValida, nivelDeXp, xpParaSubir, xpTotalAteNivel,
  statsDe, danoHabilidade, curaHabilidade, reduzArmadura,
  danoAtaqueBasico, recursosAbate, zonaSegura, cadenciaPermitida, JANELA_CAST_MS,
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
    // v64 PvP: o SERVIDOR é a autoridade da vida/mana/progresso
    escudo: 0, escudoAte: 0,
    respawnEm: 0,                    // ms — auto-renascimento autoritativo
    ultimoCastMs: { Q: 0, W: 0, E: 0, R: 0 },
    castAlvos: { Q: null, W: null, E: null, R: null },  // alvo já ferido POR este cast
    ultimoGolpePvpMs: 0,
    ultimoMs: Date.now(), ultimoPosMs: 0,
    ultimoFalaMs: 0, ultimoSaltoMs: 0,
    golpeJanela: { ms: 0, gasto: 0 },
  };
}

function statsJogador(j) { return statsDe(j.campeao, j.nivel, j.itens); }

/** XP entra SÓ pelo servidor (abates de mob e de herói) — o nível é derivado. */
function subirXp(j, xp) {
  j.xpTotal = Math.max(0, Math.floor(j.xpTotal + xp));
  j.nivel = nivelDeXp(j.xpTotal).nivel;
}

function armorDe(j) { return CAMPEOES[j.campeao].armadura + 2 * (j.nivel - 1); }

/** MORTE AUTORITATIVA (PvE ou PvP) — o cliente deixa de declarar a própria morte. */
function morteServidor(j, assassino, agoraMs) {
  j.morto = true;
  j.hp = 0;
  j.mp = 0;
  j.escudo = 0;
  j.respawnEm = agoraMs + TEMPO_RESPAWN * 1000;
  if (assassino && assassino.id !== j.id) {
    const rec = recursosAbate(j.nivel);
    assassino.essencia += rec.essencia;
    subirXp(assassino, rec.xp);
    assassino.abates++;
    enviar(assassino, { t: "abate-pvp", vitima: j.nome, essencia: rec.essencia, xp: rec.xp, abates: assassino.abates });
    log(`${assassino.nome} ABATEU ${j.nome} (+${rec.essencia} essência, +${rec.xp} xp)`);
  } else {
    log(`${j.nome} morreu no mundo`);
  }
  broadcast({ t: "morteheroi", id: j.id, vitima: j.nome, assassino: assassino ? assassino.id : -1, nomeAssassino: assassino ? assassino.nome : "" });
}

function reviverServidor(j, agoraMs) {
  const p = posReviver(j.id % 8);
  j.morto = false;
  j.x = p.x; j.z = p.z; j.ry = 0;
  j.hpMax = hpMaxDe(j); j.hp = j.hpMax;
  j.mpMax = mpMaxDe(j); j.mp = j.mpMax;
  j.escudo = 0;
  j.respawnEm = 0;
  broadcast({ t: "renasceu", id: j.id, x: p.x, z: p.z });
  void agoraMs;
}

/** Dano PvP AUTORITATIVO: valor computado AQUI, escudo absorve, morte declarada aqui. */
function aplicarDanoHeroi(alvo, danoBruto, atacante, agoraMs) {
  let dano = Math.max(1, Math.round(reduzArmadura(danoBruto, armorDe(alvo))));
  if (alvo.escudo > 0) {
    const absorvido = Math.min(alvo.escudo, dano);
    alvo.escudo -= absorvido;
    dano -= absorvido;
  }
  if (dano <= 0) return;
  alvo.hp -= dano;
  enviar(alvo, { t: "fere", dano, x: alvo.x, z: alvo.z });
  const r2 = RAIO_INTERESSE * RAIO_INTERESSE;
  for (const outro of jogadores.values()) {
    if (outro.id === alvo.id) continue;
    if (dist2(outro.x, outro.z, alvo.x, alvo.z) > r2) continue;
    enviar(outro, { t: "golpeheroi", alvoId: alvo.id, dano, x: alvo.x, z: alvo.z, de: atacante.id });
  }
  if (alvo.hp <= 0) morteServidor(alvo, atacante, agoraMs);
}

function comoEstado(j) {
  return {
    id: j.id, nome: j.nome, campeao: j.campeao, nivel: j.nivel,
    x: Math.round(j.x * 10) / 10, z: Math.round(j.z * 10) / 10, ry: Math.round(j.ry * 100) / 100,
    anim: j.anim, hp: Math.max(0, Math.round(j.hp)), hpMax: Math.round(j.hpMax),
    morto: j.morto, abates: j.abates, essencia: j.essencia,
  };
}
/** Estado AUTORITATIVO do próprio herói (a UI deixa de confiar em predição local). */
function estadoEu(j) {
  const r = nivelDeXp(j.xpTotal);
  return {
    hp: Math.max(0, Math.round(j.hp)), hpMax: hpMaxDe(j),
    mp: Math.round(j.mp), mpMax: mpMaxDe(j),
    morto: j.morto, escudo: Math.round(j.escudo),
    essencia: Math.round(j.essencia), abates: j.abates,
    nivel: j.nivel, xpNoNivel: r.xpNoNivel, xpParaSubir: xpParaSubir(j.nivel),
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
  const dt = TICK_MS / 1000;
  const ev = eventosVazios();
  const herois = [];
  for (const j of jogadores.values()) {
    herois.push({
      id: j.id, x: j.x, z: j.z, hp: j.hp,
      armadura: armorDe(j),
      morto: j.morto,
    });
  }
  passoMobs(mobs, herois, dt, agora, ev);

  // v64: regeneração AUTORITATIVA (fonte acelera; fora dela o regen do campeão)
  for (const j of jogadores.values()) {
    if (j.morto) continue;
    const st = statsJogador(j);
    if (dist(j.x, j.z, POS_BASE.x, POS_BASE.z) <= RAIO_FONTE) {
      j.hp = Math.min(hpMaxDe(j), j.hp + REGEN_FONTE_HP * dt);
      j.mp = Math.min(mpMaxDe(j), j.mp + REGEN_FONTE_MP * dt);
    } else {
      j.hp = Math.min(hpMaxDe(j), j.hp + st.regenHP * dt);
      j.mp = Math.min(mpMaxDe(j), j.mp + st.regenMP * dt);
    }
    if (j.escudo > 0 && agora >= j.escudoAte) j.escudo = 0;
  }

  // v64: o dano dos mobs é APLICADO pelo servidor (PvE também é autoritativo)
  for (const g of ev.golpesMob) {
    const alvo = jogadores.get(g.alvoId);
    if (!alvo || alvo.morto) continue;
    alvo.hp -= g.dano;
    enviar(alvo, { t: "fere", dano: g.dano, x: g.x, z: g.z });
    for (const outro of jogadores.values()) {
      if (outro.id === g.alvoId) continue;
      if (dist2(outro.x, outro.z, g.x, g.z) > RAIO_INTERESSE * RAIO_INTERESSE) continue;
      enviar(outro, { t: "golpemob", alvoId: g.alvoId, dano: g.dano, x: g.x, z: g.z });
    }
    if (alvo.hp <= 0) morteServidor(alvo, null, agora);
  }

  // v64: auto-renascimento AUTORITATIVO após TEMPO_RESPAWN
  for (const j of Array.from(jogadores.values())) {
    if (j.morto && j.respawnEm > 0 && agora >= j.respawnEm) reviverServidor(j, agora);
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
    enviar(j, { t: "snap", j: jPerto, m: mPerto, eu: estadoEu(j) });
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
      enviar(jogador, { t: "bemvindo", id, ti: TICK_MS, jogadores: jogadores.size, jogadoresLista: jPerto, mobsLista: mPerto, eu: estadoEu(jogador) });
      broadcast({ t: "entrou", id, nome: jogador.nome, campeao: jogador.campeao, nivel: jogador.nivel }, id);
      log(`+ ${jogador.nome} (${jogador.campeao} nv${jogador.nivel}) de ${ip} — ${jogadores.size}/${MAX_JOGADORES} jogadores`);
      return;
    }

    if (!jogador || !registrado) return;
    jogador.ultimoMs = agora;

    if (t === "pos") {
      const x = Number(m.x), z = Number(m.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      if (jogador.morto) return;   // morto não anda — o servidor comanda o renascimento
      const v = validarPosicao(jogador, x, z, agora);
      if (v.motivo) enviar(jogador, { t: "corrigido", motivo: v.motivo });
      jogador.x = v.x; jogador.z = v.z;
      jogador.ry = Number.isFinite(Number(m.ry)) ? Number(m.ry) : jogador.ry;
      jogador.anim = m.anim === "andar" || m.anim === "atacar" || m.anim === "morte" ? m.anim : "parado";
      jogador.ultimoPosMs = agora;
      // v64: hp/mp/nivel/essencia/itens do cliente são PREVISÕES — o servidor
      // é a autoridade (reconciliação via `eu` nas snapshots). Nada é aceite aqui.
      return;
    }

    if (t === "morte") {
      // compat v63: o cliente pode anunciar a própria morte (o servidor confirma);
      // desde a v64 o servidor declara a morte quando hp ≤ 0
      if (!jogador.morto) morteServidor(jogador, null, agora);
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
      jogador.respawnEm = 0;
      jogador.x = x; jogador.z = z;
      jogador.hpMax = hpMaxDe(jogador); jogador.hp = jogador.hpMax;
      jogador.mpMax = mpMaxDe(jogador); jogador.mp = jogador.mpMax;
      // v64: essencia/nivel/abates/itens são do servidor — campos do cliente ignorados
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
        // v64: as RECOMPENSAS entram pelo servidor (o cliente também as soma
        // localmente ao receber o evento — as duas contas convergem)
        jogador.essencia += morte.essencia;
        subirXp(jogador, morte.xp);
        broadcast({
          t: "mobmorreu", id: mob.id, tipo: mob.tipo, assassino: jogador.id,
          xp: morte.xp, essencia: morte.essencia, x: Math.round(mob.x * 10) / 10, z: Math.round(mob.z * 10) / 10,
        });
        log(`${jogador.nome} abateu ${mob.tipo} (+${morte.xp} xp, +${morte.essencia} essência)`);
      }
      return;
    }

    // ── v64 PvP ────────────────────────────────────────────────
    if (t === "cast") {
      const c = validaCast(m);
      if (!c || jogador.morto) return;
      const def = CAMPEOES[jogador.campeao].habilidades[c.slot];
      if (!cadenciaPermitida(jogador.ultimoCastMs[c.slot], agora, def.cd)) {
        enviar(jogador, { t: "corrigido", motivo: "cast-cd" });
        return;
      }
      if (jogador.mp < def.mana) {
        enviar(jogador, { t: "corrigido", motivo: "cast-mana" });
        return;
      }
      jogador.ultimoCastMs[c.slot] = agora;
      jogador.castAlvos[c.slot] = new Set();   // novo cast → novos alvos válidos
      jogador.mp -= def.mana;
      const st = statsJogador(jogador);
      if (def.escudo) {
        jogador.escudo = Math.max(jogador.escudo, Math.round(curaHabilidade(def, jogador.nivel, st.poder)));
        jogador.escudoAte = agora + Math.max(1, def.durLentidao ?? 3) * 1000;
      } else if (def.cura) {
        const cura = Math.round(curaHabilidade(def, jogador.nivel, st.poder));
        jogador.hp = Math.min(hpMaxDe(jogador), jogador.hp + cura);
      }
      return;
    }

    if (t === "golpepvp") {
      const c = validaGolpePvp(m);
      if (!c || jogador.morto) return;
      const alvo = jogadores.get(c.alvoId);
      if (!alvo || alvo.id === jogador.id || alvo.morto) return;
      // regra LoL: a fonte é zona segura para AMBOS os lados
      if (zonaSegura(alvo.x, alvo.z) || zonaSegura(jogador.x, jogador.z)) {
        enviar(jogador, { t: "corrigido", motivo: "zona-segura" });
        return;
      }
      const st = statsJogador(jogador);
      let danoBruto, alcance;
      if (c.hab === "") {
        if (!cadenciaPermitida(jogador.ultimoGolpePvpMs, agora, 1 / st.ataquePS)) {
          enviar(jogador, { t: "corrigido", motivo: "golpepvp-rapido" });
          return;
        }
        jogador.ultimoGolpePvpMs = agora;
        danoBruto = danoAtaqueBasico(jogador.campeao, jogador.nivel, jogador.itens);
        alcance = st.alcanceAtaque;
      } else {
        const def = CAMPEOES[jogador.campeao].habilidades[c.hab];
        if (def.dano <= 0) return;              // habilidade sem dano (cura/suporte)
        if (agora - jogador.ultimoCastMs[c.hab] > JANELA_CAST_MS || !(jogador.castAlvos[c.hab] instanceof Set)) {
          enviar(jogador, { t: "corrigido", motivo: "golpepvp-sem-cast" });
          return;
        }
        if (jogador.castAlvos[c.hab].has(c.alvoId)) {
          enviar(jogador, { t: "corrigido", motivo: "cast-usado" });
          return;
        }
        jogador.castAlvos[c.hab].add(c.alvoId);
        danoBruto = danoHabilidade(def, jogador.nivel, st.poder);
        alcance = def.alcance > 0 ? def.alcance : (def.area ?? 5);
      }
      if (dist(jogador.x, jogador.z, alvo.x, alvo.z) > alcance + 2.5) {
        enviar(jogador, { t: "corrigido", motivo: "golpepvp-fora-de-alcance" });
        return;
      }
      const orc = gastoGolpe(jogador, danoBruto, agora);
      if (orc.recusado > 0) enviar(jogador, { t: "corrigido", motivo: "dano-acima-do-teto" });
      if (orc.aceito <= 0) return;
      aplicarDanoHeroi(alvo, orc.aceito, jogador, agora);
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
      // v64: a vida BÓNUS do item entra no hp corrente (o servidor é a autoridade)
      jogador.hp = Math.min(hpMaxDe(jogador), jogador.hp + (ITENS[item].vida ?? 0));
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
