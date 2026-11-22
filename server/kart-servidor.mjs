// ============================================================
// BATEU KART — SERVIDOR DA SALA DE CORRIDAS (WebSocket, v66)
// ────────────────────────────────────────────────────────────
// O MESMO padrão honesto da Arena (v63/v64): o cliente manda
// APENAS INTENÇÃO (`ent` — acelerar/travar/virar/derrapar/usar
// item) e o SERVIDOR simula a corrida com o MESMO núcleo puro do
// modo solo (src/game/kart/core.ts — novaCorridaOnline +
// passoCorridaMulti). Não há posição do cliente para validar:
// anti-batota por DESIGN — ninguém pode teleportar porque ninguém
// manda posição. Bots preenchem a grelha (os MESMOS 12 corredores
// do solo); quem desliga vira piloto-IA no meio da corrida.
//
// Sala ÚNICA, corridas em rondas: lobby (contagem decrescente)
// → corrida (até todos os humanos chegarem ou o teto de tempo)
// → resultados → lobby de novo. Quem entra no MEIO espera a
// próxima ronda — nada finge (padrão de honestidade).
//
// 30 TPS de simulação · snapshots a 10 Hz para TODOS (12 corredores
// é pouco — sem raio de interesse) · cap 12 humanos · reconciliação
// com `corrigido`.
//
// JS PURO (o Node não stripa tipos em .mjs) que importa os módulos
// TS puros (Node ≥22 stripa .ts): node server/kart-servidor.mjs
// (PORT=8767 · KART_ESPERA_S=45 entre corridas · KART_TEMPO_MAX_S=300
// por corrida · KART_PISTA=praia|deserto|vulcao · KART_VOLTAS=4)
// ============================================================
import { WebSocketServer, WebSocket } from "ws";
import {
  MAX_CORREDORES, IDS_PISTAS, pistaPorId, construirPista,
  validaOlaKart, novaCorridaOnline, passoCorridaMulti, entradaParada,
} from "../src/game/kart/core.ts";

// ── Configuração honesta (operador) ────────────────────────────
const PORTA = Number(process.env.PORT || 8767);
const ESPERA_LOBBY_S = Math.max(3, Number(process.env.KART_ESPERA_S || 45)); // entre corridas
const TEMPO_MAX_S = Math.max(30, Number(process.env.KART_TEMPO_MAX_S || 300)); // teto de cada corrida
const PISTA_ID = IDS_PISTAS.includes(process.env.KART_PISTA) ? process.env.KART_PISTA : "praia";
const VOLTAS = Math.max(3, Math.min(5, Number(process.env.KART_VOLTAS || 4)));
const TPS = 30;
const TICK_MS = 1000 / TPS;
const SNAP_MS = 100;            // 10 Hz
const MAX_ENT_MS = 40;          // o cliente só PRECISA mandar ent a ~30 Hz — além disso é spam
const MAX_MSGS_JANELA = 60;     // mensagens por segundo por socket
const TIMEOUT_SILENCIO = 45_000;

const log = (...a) => console.log(new Date().toISOString(), "[kart]", ...a);

const pista = construirPista(pistaPorId(PISTA_ID)); // A MESMA pista determinística de todos

// ── Estado da sala ─────────────────────────────────────────────
let sala = "lobby";                       // lobby | corrida | fim
let proximaCorridaMs = Date.now() + ESPERA_LOBBY_S * 1000;
let corrida = null;                       // EstadoCorrida quando sala === "corrida"|"fim"
let eventosPendentes = [];                // acumulados para a próxima snap
let fimInfo = null;                       // { resultados } da última corrida

// jogadores ligados: id → { id, nome, kart, melhorias, corredorId, ws, ent, ultEntMs, msgs: [], ultMs }
let proximoId = 1;
const jogadores = new Map();

function enviar(j, obj) { if (j.ws.readyState === WebSocket.OPEN) j.ws.send(JSON.stringify(obj)); }
function broadcast(obj) { for (const j of jogadores.values()) enviar(j, obj); }

function presentesNaFila() {
  return Array.from(jogadores.values()).map((j) => ({ nome: j.nome, kart: j.kart }));
}

function iniciarCorrida() {
  const fila = Array.from(jogadores.values()).slice(0, MAX_CORREDORES);
  if (fila.length === 0) return;
  corrida = novaCorridaOnline({
    pista, voltas: VOLTAS,
    jogadores: fila.map((j) => ({ nome: j.nome, kart: j.kart, melhorias: j.melhorias })),
    semente: (Math.random() * 2 ** 31) | 0,
  });
  eventosPendentes = [];
  fimInfo = null;
  sala = "corrida";
  const decorredores = corrida.corredores.map((c) => ({
    id: c.id, nome: c.nome, kart: c.kart, cor: c.cor, eJogador: c.eJogador,
  }));
  for (let slot = 0; slot < fila.length; slot++) {
    const j = fila[slot];
    j.corredorId = corrida.corredores[slot].id; // SLOTS_REDE[slot]
    enviar(j, { t: "inicio", meuId: j.corredorId, pistaId: PISTA_ID, voltas: VOLTAS, corredores: decorredores });
  }
  for (const j of jogadores.values()) {
    if (j.corredorId === undefined) enviar(j, { t: "espectando", motivo: "sala_cheia" });
  }
  log(`CORRIDA começou — ${fila.length} humanos + ${12 - fila.length} bots · pista ${PISTA_ID} · ${VOLTAS} voltas`);
}

function terminarCorrida() {
  if (!corrida) return;
  sala = "fim";
  const resultados = corrida.resultados;
  fimInfo = { resultados, pistaId: PISTA_ID, voltas: VOLTAS };
  broadcast({ t: "fim", resultados, pistaId: PISTA_ID, voltas: VOLTAS });
  log(`CORRIDA terminou — 1º: ${resultados[0]?.nome ?? "?"} (${resultados.length} corredores)`);
  corrida = null;
  proximaCorridaMs = Date.now() + ESPERA_LOBBY_S * 1000;
  sala = "lobby";
}

// ── Tick 30 TPS: a MESMA sim do solo, entradas por corredor ────
setInterval(() => {
  if (sala === "lobby") {
    // o countdown SÓ corre com gente na sala — ninguém espera rondas vazias
    if (jogadores.size === 0) proximaCorridaMs = Date.now() + ESPERA_LOBBY_S * 1000;
    if (Date.now() >= proximaCorridaMs && jogadores.size > 0) iniciarCorrida();
    return;
  }
  if (sala !== "corrida" || !corrida) return;

  // entradas por corredor — LATCH (v67): a ÚLTIMA intenção de movimento PERSISTE até
  // chegar outra. Consumir one-shot aliaseia com o tick de 33 ms (cliente a ~30 Hz:
  // em fases más do beat só 1/3 dos ticks tem acelerador — o kart rasteja; com jitter
  // de rede real, morre a meio da corrida). Latch = o cliente honesto não perde nada
  // e o batoteiro não ganha nada (mantém a MESMA intenção que já mandava).
  // O uso de item continua EDGE: pendente até processável, nunca se repete.
  const entradas = {};
  for (const j of jogadores.values()) {
    if (j.corredorId === undefined) continue;
    if (j.ent) {
      j.entMov = { acelerar: j.ent.acelerar, travar: j.ent.travar, virar: j.ent.virar, derrapar: j.ent.derrapar };
      j.ent = null;
    }
    const mov = j.entMov ?? entradaParada();
    if (j.entUso) {
      const c = corrida.corredores.find((x) => x.id === j.corredorId);
      // o uso fica PENDENTE durante um stun (o piloto não pode usar a girar)
      if (c && c.stun <= 0 && !c.terminou) { entradas[j.corredorId] = { ...mov, usarItem: true }; j.entUso = false; continue; }
    }
    entradas[j.corredorId] = { ...mov, usarItem: false };
  }
  passoCorridaMulti(corrida, entradas, TICK_MS / 1000);
  if (corrida.eventos.length) { eventosPendentes.push(...corrida.eventos); corrida.eventos.length = 0; }
  if (corrida.fase === "fim") terminarCorrida();
  else if (corrida.tempo > TEMPO_MAX_S) {
    // teto honesto: fecha a corrida com a ordem de progresso ATUAL
    corrida.fase = "fim";
    const ordem = [...corrida.corredores].sort((a, b) => b.sTotal - a.sTotal);
    corrida.resultados = ordem.map((c, idx) => ({ id: c.id, nome: c.nome, posicao: idx + 1, tempo: c.terminou ? c.tempoFim : 0 }));
    terminarCorrida();
    log("CORRIDA fechada pelo teto de tempo");
  }
}, TICK_MS);

// ── Snapshots a 10 Hz (12 corredores — TODOS, sem raio) ────────
function snapCorredor(c) {
  return {
    id: c.id, x: Math.round(c.x * 10) / 10, z: Math.round(c.z * 10) / 10,
    ang: Math.round(c.ang * 100) / 100, da: Math.round(c.dirAng * 100) / 100,
    vel: Math.round(c.vel * 10) / 10,
    bo: Math.round(c.boost * 10) / 10, st: Math.round(c.stun * 10) / 10, esc: Math.round(c.escudo * 10) / 10,
    fp: c.foraPista ? 1 : 0, dr: c.derrapando ? 1 : 0, dc: Math.round(c.derivaCarga * 10) / 10,
    vo: c.volta, po: c.posicao, mo: c.moedas, ia: c.iAmostra,
    it: c.item, i3: c.itens3, fin: c.terminou ? 1 : 0, tf: c.terminou ? Math.round(c.tempoFim * 10) / 10 : 0,
    ej: c.eJogador ? 1 : 0,
  };
}

setInterval(() => {
  if (sala === "lobby") {
    const espera = Math.max(0, Math.ceil((proximaCorridaMs - Date.now()) / 1000));
    broadcast({ t: "lobby", espera, presentes: jogadores.size, teto: MAX_CORREDORES });
    return;
  }
  if (!corrida) return;
  const evs = eventosPendentes;
  eventosPendentes = [];
  const snap = {
    t: "snap",
    fase: corrida.fase,
    tempo: Math.round(corrida.tempo * 10) / 10,
    cont: Math.round(corrida.tempoContagem * 10) / 10,
    voltas: corrida.voltas,
    j: corrida.corredores.map(snapCorredor),
    cx: corrida.caixas.map((c) => (c.viva ? 1 : 0)),
    mn: corrida.moedas.map((c) => (c.viva ? 1 : 0)),
    pj: corrida.projeteis.map((p) => ({ i: p.id, tp: p.tipo, x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10, ang: Math.round(p.ang * 100) / 100, do: p.dono })),
    og: corrida.perigos.map((h) => ({ i: h.id, x: Math.round(h.x * 10) / 10, z: Math.round(h.z * 10) / 10, do: h.dono })),
    ev: evs,
  };
  if (corrida.resultados.length) snap.res = corrida.resultados;
  broadcast(snap);
}, SNAP_MS);

// ── WebSocket ──────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORTA, perMessageDeflate: false });
log(`KART-SERVIDOR no ar — porta ${PORTA} · pista ${PISTA_ID} (${Math.round(pista.comprimento)} u) · ${VOLTAS} voltas · espera ${ESPERA_LOBBY_S}s · teto de corrida ${TEMPO_MAX_S}s · cap ${MAX_CORREDORES} · TPS ${TPS}`);

wss.on("connection", (ws) => {
  const id = proximoId++;
  const jogador = { id, nome: "", kart: null, melhorias: {}, corredorId: undefined, ws, ent: null, entUso: false, ultEntMs: 0, msgsTs: [] };
  let registrado = false;
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (bytes) => {
    if (jogador.msgsTs.length >= MAX_MSGS_JANELA) {
      const agora = Date.now();
      jogador.msgsTs = jogador.msgsTs.filter((ts) => agora - ts < 1000);
      if (jogador.msgsTs.length >= MAX_MSGS_JANELA) return; // spam silenciosamente recusado
    }
    jogador.msgsTs.push(Date.now());

    let m;
    try { m = JSON.parse(String(bytes)); } catch { return; }
    if (typeof m !== "object" || m === null) return;
    const t = m.t;

    if (t === "ola") {
      if (registrado) return;
      const o = validaOlaKart(m);
      if (!o) { enviar(jogador, { t: "corrigido", motivo: "ola-invalido" }); return; }
      if (jogadores.size >= MAX_CORREDORES + 8) { enviar(jogador, { t: "sala_cheia" }); try { ws.close(4001, "sala cheia"); } catch { /* noop */ } return; }
      jogador.nome = o.nome;
      jogador.kart = o.kart;
      jogador.melhorias = o.melhorias;
      jogadores.set(id, jogador);
      registrado = true;
      const espera = Math.max(0, Math.ceil((proximaCorridaMs - Date.now()) / 1000));
      enviar(jogador, {
        t: "bemvindo", id,
        sala, pistaId: PISTA_ID, voltas: VOLTAS,
        espera, presentes: jogadores.size,
        comprimento: Math.round(pista.comprimento),
        jogando: jogador.corredorId !== undefined,
      });
      log(`+ ${o.nome} entrou (${o.kart}) — ${jogadores.size} ligados`);
      return;
    }

    if (!registrado) return;

    if (t === "ent") {
      // INTENÇÃO, não posição: nada aqui é fisicamente confiável — o servidor simula
      if (m.u) jogador.entUso = true; // uso por ent (vestigial) unifica com o EDGE "uso"
      jogador.ent = {
        acelerar: !!m.a,
        travar: !!m.t2,
        virar: Math.max(-1, Math.min(1, Number(m.v) || 0)),
        derrapar: !!m.d,
      };
      jogador.ultEntMs = Date.now();
      return;
    }

    if (t === "uso") {
      // uso de item EDGE-triggered (mandado 1× por clique — o passo consome)
      if (jogador.entUso) return;
      jogador.entUso = true;
      jogador.ultEntMs = Date.now();
      return;
    }

    if (t === "sair") {
      jogadores.delete(id);
      if (jogador.corredorId !== undefined && corrida) {
        const c = corrida.corredores.find((x) => x.id === jogador.corredorId);
        if (c && c.eJogador) {
          // o corredor continua como PILOTO-IA (a corrida não para por quem sai)
          c.eJogador = false;
          c.iaOffset = (Math.random() - 0.5) * pista.def.largura * 1.1;
          c.iaSkill = 0.7 + Math.random() * 0.27; // v75: leque largo (o core decide com ele)
          c.iaItemTimer = 2 + Math.random() * 4;
          c.iaFrenagem = 0.6 + Math.random() * 0.5;
          c.iaDesvio = 0; c.iaLargada = 0; // v75: piloto-IA a meio da corrida — largada imediata, desvio limpo
          broadcast({ t: "saiu-corredor", id: jogador.corredorId, nome: jogador.nome });
          log(`${jogador.nome} saiu — corredor ${jogador.corredorId} virou piloto-IA`);
        }
      }
      enviar(jogador, { t: "tchau" });
      try { ws.close(1000, "tchau"); } catch { /* noop */ }
      return;
    }

    if (t === "ping") {
      const ts = Number(m.ts);
      if (Number.isFinite(ts)) enviar(jogador, { t: "pong", ts, sala, presentes: jogadores.size, espera: Math.max(0, Math.ceil((proximaCorridaMs - Date.now()) / 1000)) });
      return;
    }
  });

  ws.on("close", () => {
    if (registrado) {
      jogadores.delete(id);
      if (jogador.corredorId !== undefined && corrida) {
        // os ids de corredor NÃO são índices do array (SLOTS_REDE) — procurar por id
        const c = corrida.corredores.find((x) => x.id === jogador.corredorId);
        if (c && c.eJogador) {
          c.eJogador = false;
          c.iaOffset = (Math.random() - 0.5) * pista.def.largura * 1.1;
          c.iaSkill = 0.7 + Math.random() * 0.27; // v75: leque largo (o core decide com ele)
          c.iaItemTimer = 2 + Math.random() * 4;
          c.iaFrenagem = 0.6 + Math.random() * 0.5;
          c.iaDesvio = 0; c.iaLargada = 0; // v75: piloto-IA a meio da corrida — largada imediata, desvio limpo
          broadcast({ t: "saiu-corredor", id: jogador.corredorId, nome: jogador.nome });
        }
      }
      log(`- ${jogador.nome || "?"} saiu — ${jogadores.size} ligados`);
    }
  });
  ws.on("error", () => { try { ws.close(); } catch { /* noop */ } });
});

// limpeza de sockets mortos (padrão arena) — o ping do SERVIDOR é que dá
// significado ao isAlive (clientes ws respondem pong automaticamente)
setInterval(() => {
  for (const j of jogadores.values()) {
    try { j.ws.ping(); } catch { /* noop */ }
  }
}, 15_000);

setInterval(() => {
  const agora = Date.now();
  for (const j of Array.from(jogadores.values())) {
    if (!j.ws.isAlive) { try { j.ws.terminate(); } catch { /* noop */ } continue; }
    j.ws.isAlive = false;
    if (agora - j.ultEntMs > TIMEOUT_SILENCIO && agora - (j.msgsTs[j.msgsTs.length - 1] || agora) > TIMEOUT_SILENCIO) {
      try { j.ws.close(4000, "timeout"); } catch { /* noop */ }
    }
  }
}, 30_000);

process.on("SIGINT", () => { log("SIGINT — a desligar"); wss.close(); process.exit(0); });
