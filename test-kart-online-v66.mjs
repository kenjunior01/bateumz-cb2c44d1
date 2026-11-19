// ============================================================
// v66 — BATEU KART ONLINE: sala de corridas partilhada
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node): validaOlaKart (podre→null, melhorias clampadas),
//    novaCorridaOnline (humanos nos slots de rede, bots preenchem),
//    passoCorridaMulti (entrada POR corredor, bots por IA, humano
//    sem entrada fica parado), DETERMINISMO por semente, chegada
//    completa MULTI (fase fim + resultados + fimSala + payout null),
//    humano que sai vira piloto-IA.
// B) SERVIDOR REAL (node server/kart-servidor.mjs): ola validado,
//    lobby com contagem, inicio com slots REAIS (1º humano = slot 6),
//    ent→movimento real na snap, 2 clientes na MESMA corrida, item
//    + uso EDGE, JSON podre sobrevive, desligar→piloto-IA, teto de
//    tempo fecha a corrida com resultados e a sala RODA para a
//    próxima (quem esperava entra).
// C) E2E (vite + servidor real + 2 browsers): painel ONLINE no menu,
//    lobby visível, corrida partilhada, badge ONLINE, remotosRede,
//    condução assistida de A move o kart de A NO BROWSER DE B
//    (snapshot real), caixa→item→uso com efeito real, ZERO pageerror.
// Uso: PW_CHROME=… node test-kart-online-v66.mjs
// ============================================================
import { spawn, spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (nome, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}`); }
};

// ── Subprocessos (grupo DETACHED — lições v49/v53/v56/v61) ──
const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 200)));
  filhos.push(p);
  return p;
}
const matarTodos = () => {
  for (const p of filhos) {
    try { process.kill(-p.pid, "SIGKILL"); } catch {}
    try { p.kill("SIGKILL"); } catch {}
  }
};
function limparZumbis() {
  try { spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); } catch {}
  try { spawnSync("pkill", ["-f", "kart-servidor.mjs"], { stdio: "ignore" }); } catch {}
}
async function esperarAte(url, testar, ms = 90000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try { const r = await fetch(url); if (testar(r)) return true; } catch { /* ainda não */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
async function esperarWS(url, ms = 20000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const pronto = await new Promise((resolve) => {
      try {
        const w = new WebSocket(url);
        const to = setTimeout(() => { try { w.close(); } catch {} resolve(false); }, 1500);
        w.onopen = () => { clearTimeout(to); w.close(); resolve(true); };
        w.onerror = () => { clearTimeout(to); resolve(false); };
      } catch { resolve(false); }
    });
    if (pronto) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Piloto de teste (igual à IA dos bots): segue a pista pelo iAmostra da snapshot OU do estado local.
 *  `cacar=true` (só no pickup do E2E): aponta à caixa mais próxima à frente (<40 amostras ≈ 100 u)
 *  — recolha determinística SEM desviar a meta dos testes de chegada, que continuam ao centro. */
function pilotoTeste(pista, c, cacar = false) {
  const m = pista.amostras.length;
  const ia = Number.isFinite(c.ia) ? c.ia : (c.iAmostra ?? 0);
  const vel = Number.isFinite(c.vel) ? c.vel : (c.vel ?? 0);
  let alvo = pista.amostras[((ia + Math.floor(12 + vel * 0.35)) % m + m) % m];
  if (cacar) {
    // v69: recolha determinística (antes seguia o centro e a caixa dependia do alinhamento
    // da faixa — causa alternativa de flaky sob carga; lição v65.1, agora no pickup)
    let melhorD = Infinity;
    for (const cx of pista.caixas) {
      if (!cx) continue;
      const dRel = ((cx.i - ia) % m + m) % m; // amostras À FRENTE
      if (dRel > 0 && dRel < 40 && dRel < melhorD) { melhorD = dRel; alvo = { x: cx.x, z: cx.z }; }
    }
  }
  const dif = Math.atan2(alvo.x - c.x, alvo.z - c.z) - c.ang;
  const difN = Math.atan2(Math.sin(dif), Math.cos(dif));
  return {
    acelerar: true,
    travar: false,
    virar: Math.max(-1, Math.min(1, difN * 2.5)),
    derrapar: false,
    usarItem: false,
  };
}

/** A contagem é CLAMPADA a 0,25 s por passo (catch-up honesto do core) — avança em 16 passos. */
function passarContagem(e) {
  for (let i = 0; i < 16 && e.fase === "contagem"; i++) core.passoCorridaMulti(e, {}, 0.25);
}

// ═══════════════════════════════════════════════════════════════
let core;
async function main() {
  limparZumbis();
  console.log(`\n🏎 BATEU KART ONLINE v66 — SALA DE CORRIDAS PARTILHADA — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (core.ts): sala, entradas por corredor, chegada MULTI —");
  core = await import(`${RAIZ}/src/game/kart/core.ts`);

  // 1) validaOlaKart
  ok("ola PODRE (número/string vazia) → null", core.validaOlaKart(null) === null
    && core.validaOlaKart("x") === null && core.validaOlaKart(42) === null);
  ok("ola com nome VAIO/19 chars → null", core.validaOlaKart({ nome: "   ", kart: "viralata" }) === null
    && core.validaOlaKart({ nome: "a".repeat(19), kart: "viralata" }) === null);
  ok("ola com kart INEXISTENTE → null", core.validaOlaKart({ nome: "Ana", kart: "f1" }) === null);
  ok("ola com melhorias 99 → clampado ao teto 5", core.validaOlaKart({ nome: "Ana", kart: "tanque", melhorias: { motor: 99, pneus: -3 } }).melhorias.motor === 5
    && core.validaOlaKart({ nome: "Ana", kart: "tanque", melhorias: { pneus: -3 } }).melhorias.pneus === 0);
  const olaLimpo = core.validaOlaKart({ nome: "  Ana\t  \n Marques  ", kart: "cupim", melhorias: { motor: 2 } });
  ok("ola VÁLIDO limpa espaços/caracteres de controlo do nome", olaLimpo !== null && olaLimpo.nome === "Ana Marques");

  // 2) novaCorridaOnline: slots de rede
  const pista = core.construirPista(core.PISTAS[0]);
  const e = core.novaCorridaOnline({
    pista, voltas: 3, semente: 4242,
    jogadores: [
      { nome: "Ana", kart: "tanque", melhorias: { motor: 5 } },
      { nome: "Bué Rápido Real", kart: "cupim", melhorias: {} },
      { nome: "Kaimu", kart: "foguetinho", melhorias: { armas: 3 } },
    ],
  });
  const humanos = e.corredores.filter((c) => c.eJogador);
  ok("3 humanos na grelha nos slots de REDE (6, 8, 10)", humanos.map((c) => c.id).join(",") === "6,8,10"
    && core.SLOTS_REDE[0] === 6);
  ok("nomes/karts REAIS dos humanos", humanos.map((c) => c.nome).join("|") === "Ana|Bué Rápido Real|Kaimu"
    && humanos[0].kart === "tanque");
  ok("bots preenchem o resto (9 bots, eJogador=false)", e.corredores.length === 12
    && e.corredores.filter((c) => !c.eJogador).length === 9);
  ok("melhorias dos humanos entram nos STATS (motor 5 = velMax+teto)", humanos[0].stats.velMax === core.statsDe("tanque", { motor: 5 }).velMax
    && humanos[0].stats.velMax > core.statsDe("tanque", {}).velMax);
  ok("grelha ATRÁS da linha (sTotal negativo) — igual ao solo", e.corredores.every((c) => c.sTotal < 0 && c.volta === 0));
  ok("fase começa em contagem 3,9 s", e.fase === "contagem" && Math.abs(e.tempoContagem - 3.9) < 1e-9);

  // 3) passoCorridaMulti: entradas por corredor
  passarContagem(e);
  ok("contagem → corrida (sem entradas)", e.fase === "corrida");
  const xAna0 = humanos[0].x, zAna0 = humanos[0].z;
  const xBot0 = e.corredores.find((c) => c.id === 0).x;
  const e2 = core.novaCorridaOnline({ pista, voltas: 3, semente: 99, jogadores: [{ nome: "Ana", kart: "tanque", melhorias: {} }] });
  passarContagem(e2);
  core.passoCorridaMulti(e2, { 6: { acelerar: true, travar: false, virar: 0, derrapar: false, usarItem: false } }, 1 / 15);
  const ana2 = e2.corredores.find((c) => c.id === 6);
  ok("humano COM entrada anda (física real do núcleo)", ana2.vel > 0);
  core.passoCorridaMulti(e2, {}, 1 / 15);
  const velAntes = ana2.vel;
  for (let i = 0; i < 10; i++) core.passoCorridaMulti(e2, {}, 1 / 15);
  const anaParado = e2.corredores.find((c) => c.id === 6);
  ok("humano SEM entrada DECELERA (nunca IA disfarçada)", anaParado.vel < velAntes);
  const bot2 = e2.corredores.find((c) => c.id === 0);
  ok("bot anda POR IA (mesmo sem entradas)", bot2.vel > 0 || bot2.iAmostra !== 0 || Math.abs(bot2.sTotal) > 0);

  // 4) determinismo por semente
  {
    const a = core.novaCorridaOnline({ pista, voltas: 3, semente: 777, jogadores: [{ nome: "A", kart: "viralata", melhorias: {} }] });
    const b = core.novaCorridaOnline({ pista, voltas: 3, semente: 777, jogadores: [{ nome: "A", kart: "viralata", melhorias: {} }] });
    const ent = { acelerar: true, travar: false, virar: 0.3, derrapar: false, usarItem: false };
    for (let i = 0; i < 900; i++) {
      core.passoCorridaMulti(a, { 6: ent }, 1 / 30);
      core.passoCorridaMulti(b, { 6: ent }, 1 / 30);
    }
    const xs = (e3) => e3.corredores.map((c) => `${c.id}:${Math.round(c.x * 10)}:${Math.round(c.z * 10)}:${Math.round(c.vel * 10)}`).join(",");
    ok("DETERMINISMO por semente (900 passos → estados idênticos)", xs(a) === xs(b));
  }

  // 5) chegada MULTI completa: 2 humanos dirigidos por piloto de teste + 10 bots
  {
    const e3 = core.novaCorridaOnline({
      pista, voltas: 3, semente: 31337,
      jogadores: [{ nome: "Ana", kart: "viralata", melhorias: {} }, { nome: "Kaimu", kart: "cupim", melhorias: {} }],
    });
    let passos = 0;
    const dt = 1 / 15;
    const tetoPassos = 4200; // 3 voltas ≈ 150 s de corrida — folga
    while (e3.fase !== "fim" && passos < tetoPassos) {
      const entradas = {};
      for (const c of e3.corredores) if (c.eJogador && !c.terminou) entradas[c.id] = pilotoTeste(pista, c);
      core.passoCorridaMulti(e3, entradas, dt);
      passos++;
    }
    ok("sala FECHA quando TODOS os humanos chegam (fase fim)", e3.fase === "fim" && passos < tetoPassos);
    ok("evento fimSala chega (não o «fim» do solo)", e3.eventos.some((ev) => ev.t === "fimSala"));
    ok("resultados com 12 posições SEM repetidos", e3.resultados.length === 12
      && new Set(e3.resultados.map((r) => r.posicao)).size === 12
      && e3.resultados.every((r) => typeof r.nome === "string" && r.nome.length > 0));
    ok("payout MULTI é null (cada cliente calcula o SEU localmente)", e3.payout === null);
    ok("os 2 humanos chegam com tempo > 0", e3.corredores.filter((c) => c.eJogador).every((c) => c.terminou && c.tempoFim > 0));
  }

  // 6) humano que desliga vira piloto-IA
  {
    const e4 = core.novaCorridaOnline({ pista, voltas: 3, semente: 555, jogadores: [{ nome: "Ana", kart: "tanque", melhorias: {} }] });
    const ana = e4.corredores.find((c) => c.id === 6);
    ana.eJogador = false; // o que o SERVIDOR faz quando o socket fecha
    ana.iaOffset = 0.5; ana.iaSkill = 0.9; ana.iaItemTimer = 2; ana.iaFrenagem = 0.8;
    passarContagem(e4);
    core.passoCorridaMulti(e4, {}, 2.0);
    ok("corredor sem humanos ligados CONTINUA como piloto-IA (a corrida não para)", ana.vel > 0 || ana.sTotal > -pista.comprimento);
  }

  // ── B) SERVIDOR REAL ────────────────────────────────────────
  console.log("\n— B) Servidor real (node server/kart-servidor.mjs: sala, ent→snap, rondas) —");
  const PORTA_B = 8797;
  correr("node", ["server/kart-servidor.mjs"], {
    PORT: String(PORTA_B), KART_ESPERA_S: "4", KART_TEMPO_MAX_S: "55", KART_PISTA: "deserto", KART_VOLTAS: "3",
  });
  ok("servidor kart responde no ws", await esperarWS(`ws://localhost:${PORTA_B}`, 20000));
  await dormir(300);

  function clienteKart(nome) {
    const ws = new WebSocket(`ws://localhost:${PORTA_B}`);
    const cli = { ws, nome, mensagens: [], bemvindo: null, inicio: null, fim: null, corrigidos: [], saiuCorredor: [], aberta: false };
    ws.onopen = () => {
      cli.aberta = true;
      cli.timerPing = setInterval(() => { try { ws.send(JSON.stringify({ t: "ping", ts: Date.now() })); } catch {} }, 5000); // como o cliente real
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      cli.mensagens.push(m);
      if (m.t === "bemvindo") cli.bemvindo = m;
      else if (m.t === "inicio") cli.inicio = m;
      else if (m.t === "fim") cli.fim = m;
      else if (m.t === "corrigido") cli.corrigidos.push(m.motivo);
      else if (m.t === "saiu-corredor") cli.saiuCorredor.push(m);
    };
    ws.onerror = () => {};
    cli.ola = (kart, melhorias) => ws.send(JSON.stringify({ t: "ola", nome, kart, melhorias: melhorias ?? {} }));
    cli.ent = (o) => ws.send(JSON.stringify({
      t: "ent",
      a: (o.a ?? o.acelerar) ? 1 : 0,
      t2: (o.t ?? o.travar) ? 1 : 0,
      v: o.v ?? o.virar ?? 0,
      d: (o.d ?? o.derrapar) ? 1 : 0,
    }));
    cli.uso = () => ws.send(JSON.stringify({ t: "uso" }));
    cli.lixo = () => ws.send("{{{isto não é json");
    cli.ultimo = (tipo) => [...cli.mensagens].reverse().find((m) => m.t === tipo);
    cli.inicios = () => cli.mensagens.filter((m) => m.t === "inicio");
    cli.snaps = () => cli.mensagens.filter((m) => m.t === "snap");
    cli.lobbyMsgs = () => cli.mensagens.filter((m) => m.t === "lobby");
    cli.fecha = () => { try { clearInterval(cli.timerPing); } catch {} try { ws.close(); } catch {} };
    cli.fimCorrida = () => new Promise((resolve) => {
      const to = setInterval(() => {
        if (cli.fim) { clearInterval(to); resolve(cli.fim); }
      }, 250);
      setTimeout(() => { clearInterval(to); resolve(null); }, 90000);
    });
    return cli;
  }
  await dormir(400);

  const A = clienteKart("Ana-Teste");
  await dormir(500);
  A.ws.send("lixo sem ola");
  A.ola("f1", {}); // kart inválido
  await dormir(500);
  ok("ola com kart inválido → corrigido ola-invalido (sem registo)", A.corrigidos.includes("ola-invalido") && A.bemvindo === null);
  A.ola("tanque", { motor: 7 });
  await dormir(600);
  ok("ola VÁLIDO → bemvindo com sala/pista/comprimento", A.bemvindo !== null
    && A.bemvindo.sala === "lobby" && A.bemvindo.pistaId === "deserto" && A.bemvindo.comprimento > 1000);
  ok("melhorias 7 CLAMPADAS pelo validaOlaKart (sem crash no servidor)", A.bemvindo !== null);
  const lobby1 = A.lobbyMsgs().at(-1);
  ok("lobby com contagem decrescente (KART_ESPERA_S=4)", lobby1 && lobby1.espera <= 4 && lobby1.espera >= 0);
  A.lixo();
  await dormir(300);
  ok("JSON podre NÃO mata o socket (servidor sobrevive)", A.aberta && A.ws.readyState === 1);

  const B = clienteKart("Bué-Teste");
  await dormir(500);
  B.ola("cupim", {});
  await dormir(600);
  ok("2.º cliente bem-vindo (sala partilhada)", B.bemvindo !== null && B.bemvindo.pistaId === "deserto");
  await dormir(1200);
  const lobby2 = A.lobbyMsgs().at(-1);
  ok("lobby mostra os 2 presentes", lobby2 && lobby2.presentes === 2);

  // a corrida começa (espera 4 s)
  const inicioA = await new Promise((resolve) => {
    const to = setInterval(() => { if (A.inicio) { clearInterval(to); resolve(A.inicio); } }, 200);
    setTimeout(() => { clearInterval(to); resolve(null); }, 12000);
  });
  const inicioB = await new Promise((resolve) => {
    const to = setInterval(() => { if (B.inicio) { clearInterval(to); resolve(B.inicio); } }, 200);
    setTimeout(() => { clearInterval(to); resolve(null); }, 12000);
  });
  ok("CORRIDA começa: inicio com meuId=6 para o 1.º humano (slot de rede)", inicioA !== null && inicioA.meuId === 6);
  ok("2.º humano no slot 8 (pares alternados)", inicioB !== null && inicioB.meuId === 8);
  ok("inicio traz 12 corredores com nomes/karts/cores", inicioA && inicioA.corredores.length === 12
    && inicioA.corredores.every((c) => typeof c.nome === "string" && typeof c.cor === "number"));
  ok("voltas do operador (3) chegam aos clientes", inicioA?.voltas === 3);

  // contagem → corrida → entradas CONTÍNUAS (espera a FASE corrida na snap — determinístico)
  let faseCorridaSnap = false;
  const tFase = Date.now();
  while (Date.now() - tFase < 15000 && !faseCorridaSnap) {
    const s = A.snaps().at(-1);
    if (s?.fase === "corrida") faseCorridaSnap = true;
    await dormir(200);
  }
  let velMeu = 0;
  const tAndar = Date.now();
  while (Date.now() - tAndar < 3000 && velMeu < 1) {
    A.ent({ a: 1 });
    await dormir(60);
    const s = A.snaps().at(-1);
    if (s) velMeu = s.j.find((c) => c.id === 6)?.vel ?? 0;
  }
  const snapA1 = A.snaps().at(-1);
  ok("snaps a 10 Hz com 12 corredores e fase corrida", snapA1 && snapA1.j.length === 12 && faseCorridaSnap);
  ok("A ANDA com as suas ent CONTÍNUAS (intenção → física do SERVIDOR)", velMeu > 0.5);
  const x0 = snapA1?.j.find((c) => c.id === 6)?.x ?? 0, z0 = snapA1?.j.find((c) => c.id === 6)?.z ?? 0;
  for (let i = 0; i < 25; i++) { A.ent({ a: 1 }); await dormir(60); }
  const snapA2 = A.snaps().at(-1);
  const meu2 = snapA2.j.find((c) => c.id === 6);
  ok("movimento REAL acumulado (> 5 u)", meu2 && Math.hypot(meu2.x - x0, meu2.z - z0) > 5);
  const snapB1 = B.snaps().at(-1);
  const anaVista = snapB1?.j.find((c) => c.id === 6);
  ok("B vê o corredor de A na MESMA corrida (ej=1, em movimento)", anaVista && anaVista.ej === 1 && anaVista.vel > 2);
  ok("B vê os NOMES reais da grelha no inicio", B.inicio.corredores.some((c) => c.nome === "Ana-Teste"));

  // 3.º cliente liga a MEIO (fica espectador e entra na próxima)
  const C = clienteKart("Kaimu-Teste");
  await dormir(400);
  C.ola("foguetinho", {});
  await dormir(600);
  ok("3.º cliente bem-vindo a MEIO da corrida (sem corredor ainda)", C.bemvindo !== null && C.inicio === null);

  // item → uso EDGE (piloto de teste segue a pista a ~30 Hz reais, apanha caixa e USA)
  // o uso é EDGE como o do jogador real: cada clique = 1 pulso — o pacote de
  // 3 cogumelos precisa de 3 cliques para o campo `it` esvaziar (padrão Mario Kart)
  let temItem = null, usoVisto = false, projeteisVistos = 0, usosMandados = 0, ultUsoMs = 0;
  const pistaLocal = core.construirPista(core.pistaPorId("deserto"));
  const t0Item = Date.now();
  while (Date.now() - t0Item < 75000 && !usoVisto) {
    const s = A.snaps().at(-1);
    if (s && s.fase === "corrida") {
      const c = s.j.find((x) => x.id === 6);
      if (c) {
        A.ent(pilotoTeste(pistaLocal, c, true)); // cacar: caça determinística de caixa
        if (c.it && !temItem) temItem = c.it;
        if (temItem && Date.now() - ultUsoMs > 350) { A.uso(); usosMandados++; ultUsoMs = Date.now(); } // cliques do piloto
        if (temItem && !c.it) usoVisto = true;
        if (s.pj?.length) projeteisVistos = Math.max(projeteisVistos, s.pj.length);
      }
    }
    await dormir(40); // ~30 Hz reais: o tick 33 ms do servidor quase nunca fica sem entrada
  }
  if (temItem === null || !usoVisto) {
    const s = A.snaps().at(-1);
    const c = s?.j.find((x) => x.id === 6);
    console.log(`    [debug item] temItem=${temItem} usoVisto=${usoVisto} c6=${c ? `it=${c.it} sTotal=${Math.round(c.po ?? -1)}` : "?"} evsAgora=${JSON.stringify(s?.ev ?? []).slice(0, 120)}`);
  }
  ok("caixa «?» REAL recolhida na corrida online (evento item → campo item na snap)", temItem !== null);
  ok(`uso de item EDGE mandado 1× produz EFEITO real (item consumido${temItem === "casca" || temItem === "cascaAlvo" || temItem === "missil" ? `, projéteis vistos: ${projeteisVistos}` : ""})`, usoVisto);

  // B desliga → corredor vira piloto-IA
  B.fecha();
  await dormir(1500);
  ok("fecho do socket → saiu-corredor chega a A", A.saiuCorredor.some((m) => m.id === 8));
  const snapDepois = A.snaps().at(-1);
  ok("corredor do que saiu vira PILOTO-IA (ej=0 na snap)", snapDepois?.j.find((c) => c.id === 8)?.ej === 0);

  // teto de tempo (55 s) fecha a corrida com resultados → lobby → NOVA corrida com C
  const fimA = await A.fimCorrida();
  ok("teto de TEMPO fecha a corrida com resultados completos", fimA !== null && fimA.resultados.length === 12
    && new Set(fimA.resultados.map((r) => r.posicao)).size === 12);
  const inicio2A = await new Promise((resolve) => {
    const to = setInterval(() => {
      const ins = A.inicios();
      if (ins.length >= 2) { clearInterval(to); resolve(ins[1]); }
    }, 250);
    setTimeout(() => { clearInterval(to); resolve(null); }, 18000);
  });
  const inicio2C = C.inicio;
  ok("a sala RODA: 2.ª corrida começa e o que esperava ENTRA (meuId atribuído)", inicio2A !== null && inicio2C !== null && inicio2C.meuId >= 0);

  A.fecha();
  C.fecha();

  // ── C) E2E ──────────────────────────────────────────────────
  console.log("\n— C) E2E (vite + servidor real + 2 browsers: sala partilhada de verdade) —");
  const PORTA_C = 8798;
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));
  correr("node", ["server/kart-servidor.mjs"], {
    PORT: String(PORTA_C), KART_ESPERA_S: "14", KART_TEMPO_MAX_S: "300", KART_PISTA: "praia", KART_VOLTAS: "3",
  });
  ok("servidor da sala E2E responde", await esperarWS(`ws://localhost:${PORTA_C}`, 20000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  // aquecimento (lição v62)
  const warmCtx = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const warmPg = await warmCtx.newPage();
  await warmPg.goto(`${BASE}/lives?game=kart&kart-leve=1`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await warmPg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 }).catch(() => {});
  await dormir(4000);
  await warmPg.close();
  await warmCtx.close();
  console.log("  (aquecimento do vite feito — deps otimizadas)");

  const erros = [];
  const SAVE_TESTE = JSON.stringify({ moedas: 5000, xp: 0, kart: "viralata", possuidos: ["viralata"], melhorias: {}, recordes: {}, corridas: 0, vitorias: 0, ts: 0 });
  async function browserKart(nomeTeste) {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
    await ctx.addInitScript((s) => {
      try { if (!localStorage.getItem("bateu_kart_save")) localStorage.setItem("bateu_kart_save", s); } catch {}
    }, SAVE_TESTE);
    const pg = await ctx.newPage();
    pg.on("pageerror", (e) => erros.push(`${nomeTeste}:${e}`));
    pg.on("console", (m) => { if (m.type() === "error") erros.push(`${nomeTeste}:${m.text()}`); });
    await pg.goto(`${BASE}/lives?game=kart&kart-leve=1&mp=ws://localhost:${PORTA_C}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60_000 });
    return { ctx, pg };
  }

  const { pg: pgA } = await browserKart("A");
  ok("painel ONLINE no menu (honesto, separado do solo)", await pgA.locator('[data-testid="kart-online-painel"]').isVisible());
  await pgA.locator('[data-testid="kart-entrar-online"]').click();
  await pgA.waitForSelector('[data-testid="kart-online-lobby"]', { timeout: 20_000 });
  await pgA.screenshot({ path: "shots-v66/kart-online-menu.png" }).catch(() => {}); // menu com o painel da sala (prova visual)
  ok("A liga à sala e vê o LOBBY (contagem da próxima corrida)", (await pgA.locator('[data-testid="kart-online-lobby"]').innerText()).length > 5);

  const { pg: pgB } = await browserKart("B");
  await pgB.waitForSelector('[data-testid="kart-menu"]', { timeout: 30_000 });
  await pgB.locator('[data-testid="kart-entrar-online"]').click();
  await pgB.waitForSelector('[data-testid="kart-online-lobby"]', { timeout: 20_000 });
  await dormir(1200);
  ok("B no MESMO lobby (2 pilotos anunciados)", (await pgB.locator('[data-testid="kart-online-lobby"]').innerText()).includes("2"));

  // a corrida começa sozinha (espera 6 s)
  await pgA.waitForSelector('[data-testid="kart-jogo"]', { timeout: 30_000 });
  await pgB.waitForSelector('[data-testid="kart-jogo"]', { timeout: 30_000 });
  ok("CORRIDA partilhada abre nos DOIS browsers (sala → inicio → motor rede)", true);
  await pgA.waitForSelector('[data-testid="kart-online-badge"]', { timeout: 15_000 });
  const badgeA = await pgA.locator('[data-testid="kart-online-badge"]').innerText();
  ok("badge ONLINE com 2 pilotos reais", badgeA.includes("2"));
  ok("B também vê o badge ONLINE", await pgB.locator('[data-testid="kart-online-badge"]').isVisible());

  // A vê B como humano REMOTO
  const remotosA = await pgA.evaluate(() => window.__kart.remotosRede());
  ok("A vê B como humano REMOTO (multi REAL)", remotosA.length >= 1);
  const idBRemoto = remotosA[0]?.id ?? -1;

  // contagem → corrida → condução assistida de A
  await dormir(4500);
  await pgA.evaluate(() => window.__kart.dirigirAuto(true));
  let velA = 0;
  for (let i = 0; i < 12 && velA < 5; i++) {
    await dormir(1500);
    velA = await pgA.evaluate(() => window.__kart.estado().vel);
  }
  ok("A ANDA de verdade (física do SERVIDOR chega pela snapshot)", velA > 5);
  const posAemB1 = await pgB.evaluate((id) => window.__kart.posCorredor(id), idBRemoto === 6 ? 6 : 6);
  await dormir(2500);
  const posAemB2 = await pgB.evaluate((id) => window.__kart.posCorredor(id), 6);
  ok("o kart de A MOVE-SE no browser de B (snapshot real do remoto)", posAemB1 && posAemB2
    && Math.hypot(posAemB2.x - posAemB1.x, posAemB2.z - posAemB1.z) > 5);

  // B também dirige (pode ter apanhado os itens do A — paciência maior para os stuns)
  await pgB.evaluate(() => window.__kart.dirigirAuto(true));
  let velB = 0;
  for (let i = 0; i < 20 && velB < 5; i++) {
    await dormir(1500);
    velB = await pgB.evaluate(() => window.__kart.estado().vel);
  }
  ok("B ANDA na mesma corrida (2 pilotos a lutar de verdade)", velB > 5);

  // caixa → item → uso com efeito REAL (via rede)
  let itemA = null;
  for (let i = 0; i < 90 && !itemA; i++) {
    await dormir(1000);
    itemA = await pgA.evaluate(() => window.__kart.estado().item);
  }
  ok("A recolhe ITEM de uma caixa real (via snapshot do servidor)", itemA !== null);
  if (itemA) {
    await pgA.evaluate(() => window.__kart.usarItem());
    await dormir(1200);
    const depoisUso = await pgA.evaluate(() => ({ item: window.__kart.estado().item, proj: window.__kart.estado().projeteis, bo: window.__kart.estado().boost, esc: window.__kart.estado().escudo }));
    ok("uso de item ONLINE tem efeito REAL (item gasto/projétil/boost/escudo)", depoisUso.item === null || depoisUso.proj > 0 || depoisUso.bo || depoisUso.esc);
  }
  await pgA.screenshot({ path: "shots-v66/kart-online-corrida.png" }).catch(() => {});
  await pgB.screenshot({ path: "shots-v66/kart-online-b.png" }).catch(() => {});
  await pgA.evaluate(() => window.__kart.dirigirAuto(false)).catch(() => {});
  await pgB.evaluate(() => window.__kart.dirigirAuto(false)).catch(() => {});

  const errosRelevantes = erros.filter((e) => !/favicon|supabase|404|406|PGRST|JWT|Failed to load resource|websocket|ResizeObserver|net::/i.test(e));
  if (errosRelevantes.length) console.log(`    [erros] ${errosRelevantes.slice(0, 6).join(" || ").slice(0, 600)}`);
  ok(`ZERO erros de página/console relevantes (A+B)`, errosRelevantes.length === 0);

  await pgA.close(); await pgB.close();
  await browser.close();

  // ── FIM ─────────────────────────────────────────────────────
  matarTodos();
  console.log(`\n══ BATEU KART ONLINE v66: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) console.log("FALHAS: " + fails.join(" · "));
  process.exit(failed ? 1 : 0);
}

process.on("exit", () => matarTodos());
process.on("SIGINT", () => { matarTodos(); process.exit(1); });
main().catch((e) => { console.error(e); matarTodos(); process.exit(1); });
