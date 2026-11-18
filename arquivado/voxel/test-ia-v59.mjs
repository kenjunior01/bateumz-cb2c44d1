// ============================================================
// E2E — BATEU IA v59: PRESENÇA DO NPC NO SERVIDOR MP
// (o passo anotado desde a v57/v58: «presença própria do NPC no
// servidor MP continua anotada»)
//
// A) NÚCLEO ISOMÓRFICO npcMp.ts (browser E Node): juntar/sair/expirar
//    conversas sem mutar entrada · cap com despejo do sinal mais antigo
//    · heartbeat puro NÃO muda o conjunto · pacote do fio só id+nome ·
//    validarPacoteNpc descarta linhas podres MESMO vindo do servidor.
// B) SERVIDOR REAL (cidade-servidor.mjs v59, spawn com timeout curto por
//    env): bemvindo.npc · broadcast `npc` a TODOS só quando o conjunto
//    muda · heartbeat puro sem difusão · gate NPC_FALA_GATE_MS (SPAM
//    recusado nos stats) · expiração honesta (aba fechada sai) · queda
//    de ligação limpa a conversa · cap 8 · stats com contadores reais.
// C) E2E BROWSER: /cidade?mp=… (página A real) + cliente ws Node (B):
//    A abre o painel do NPC → B recebe o claim; B fala → A vê o rótulo
//    «Bateu IA · B» + evento «está a falar com a Bateu IA» no Praça em
//    direto; A fecha → B recebe lista vazia. Zero erros de consola.
//    Solo (sem ?mp=) continua 100% local como na v57 — nada finge MP.
//
// Uso: PW_CHROME=<chromium> node test-ia-v59.mjs   (vite 8099 + servidor 8796)
//      node test-ia-v59.mjs --sem-e2e              (só A + B)
// ============================================================
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, realpathSync } from "node:fs";
import WebSocket from "ws";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url))));
const PORTA_SRV = 8796;
const URL_SRV = `ws://127.0.0.1:${PORTA_SRV}`;
const BASE = process.env.BASE_URL || "http://localhost:8099";
const SEM_E2E = process.argv.includes("--sem-e2e");

let passed = 0, failed = 0;
const fails = [];
const t = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name} ${extra}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── cliente ws de teste: cola de mensagens por tipo + espera honesta ──
function clienteWs(nome, porta = PORTA_SRV) {
  const c = { nome, ws: null, msgs: [], bemvindo: null, aberto: false, url: `ws://127.0.0.1:${porta}` };
  c.ligar = () => new Promise((res, rej) => {
    const ws = new WebSocket(c.url);
    c.ws = ws;
    ws.on("open", () => { c.aberto = true; res(); });
    ws.on("error", rej);
    ws.on("close", () => { c.aberto = false; });
    ws.on("message", (cru) => {
      try {
        const m = JSON.parse(String(cru));
        c.msgs.push(m);
        if (m.t === "bemvindo") c.bemvindo = m;
      } catch {}
    });
  });
  c.enviar = (m) => { try { c.ws.send(JSON.stringify(m)); return true; } catch { return false; } };
  /** Espera até `teste` ser true para alguma msg NOVA do tipo pedido
   *  (a partir de `de` — msgs antigas não contam), com prazo honesto. */
  c.esperarMsg = async (tipo, teste, ms = 6000, de = 0) => {
    const fim = Date.now() + ms;
    let i = de;
    while (Date.now() < fim) {
      for (; i < c.msgs.length; i++) {
        const m = c.msgs[i];
        if (m.t === tipo && (!teste || teste(m))) return { m, indice: i + 1 };
      }
      await sleep(80);
    }
    return null;
  };
  c.fechar = () => { try { c.ws.close(); } catch {} };
  return c;
}

// ── Helpers de subprocessos (lição v49/v53/v56: GRUPO, nunca só o pai) ──
const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 160)));
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
  for (const padrao of ["vite --port 8099 --strictPort", "cidade-servidor.mjs"]) {
    try { spawnSync("pkill", ["-f", padrao], { stdio: "ignore" }); } catch {}
  }
}
async function esperarAte(url, testar, ms = 30000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try {
      const r = await fetch(url);
      if (!testar || testar(r)) return true;
    } catch {}
    await sleep(300);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🤖🌐 BATEU IA v59 — PRESENÇA DO NPC NO SERVIDOR MP — ${RAIZ}\n`);
  limparZumbis();

  // ════════════════ A) NÚCLEO ISOMÓRFICO npcMp ════════════════
  console.log("— A) Núcleo npcMp (Node)");
  const {
    NPC_CONVERSA_TIMEOUT_MS, NPC_FALA_GATE_MS, NPC_CONVERSAS_CAP,
    juntarConversa, sairConversa, limparConversasExpiradas, pacoteConversas,
    nomesConversa, validarPacoteNpc,
  } = await import(`${RAIZ}/src/game/cidade/npcMp.ts`);

  t("constantes honestas: timeout 15 s > heartbeat 5 s > gate 3 s",
    NPC_CONVERSA_TIMEOUT_MS === 15_000 && NPC_FALA_GATE_MS === 3_000 && NPC_CONVERSA_TIMEOUT_MS >= 3 * 5_000,
    `timeout=${NPC_CONVERSA_TIMEOUT_MS} gate=${NPC_FALA_GATE_MS}`);
  t("cap declarado = 8 conversas visíveis", NPC_CONVERSAS_CAP === 8, String(NPC_CONVERSAS_CAP));

  const agora0 = 1_000_000;
  const vazio = [];
  const r1 = juntarConversa(vazio, 7, "Ana", agora0);
  t("claim novo entra e MUDA o conjunto", r1.mudou === true && r1.lista.length === 1 && r1.lista[0].id === 7 && r1.lista[0].nome === "Ana");
  t("entrada NUNCA é mutada (padrão carimbarMensagens v58)", vazio.length === 0);

  const r2 = juntarConversa(r1.lista, 7, "Ana", agora0 + 1000);
  t("heartbeat (mesmo id) refresca o sinal e NÃO muda o conjunto", r2.mudou === false && r2.lista[0].sinal === agora0 + 1000);

  const base = [
    { id: 1, nome: "A", sinal: 100 },
    { id: 2, nome: "B", sinal: 300 },
    { id: 3, nome: "C", sinal: 200 },
  ];
  const r3 = juntarConversa(base, 9, "D", 400, 4);
  t("4.ª conversa com cap 4: todos ficam", r3.mudou === true && r3.lista.length === 4);
  const r4 = juntarConversa(base, 9, "D", 400, 3);
  t("cap 3 cheio: o sinal MAIS ANTIGO (A, sinal 100) sai e o novo entra",
    r4.mudou === true && r4.lista.length === 3 && r4.lista.some((c) => c.id === 9) && !r4.lista.some((c) => c.id === 1),
    JSON.stringify(r4.lista));
  const r5 = juntarConversa(r4.lista, 9, "D", 500, 3);
  t("recém-chegado nunca se auto-despeja (heartbeat dele = sinal mais novo)",
    r5.mudou === false && r5.lista.length === 3 && r5.lista.some((c) => c.id === 9));

  const s1 = sairConversa(base, 2);
  t("npcfim de quem estava: sai e muda", s1.mudou === true && s1.lista.length === 2 && !s1.lista.some((c) => c.id === 2));
  const s2 = sairConversa(base, 99);
  t("npcfim de quem NÃO estava: no-op honesto (sem broadcast)", s2.mudou === false && s2.lista.length === 3);

  const exp = limparConversasExpiradas(
    [{ id: 1, nome: "viva", sinal: agora0 }, { id: 2, nome: "podre", sinal: agora0 - 20_000 }],
    agora0,
  );
  t("expiração: só a sem heartbeat há >15 s sai; contadas em `sairam`",
    exp.lista.length === 1 && exp.lista[0].id === 1 && exp.sairam === 1);
  const exp2 = limparConversasExpiradas([{ id: 1, nome: "x", sinal: agora0 - 900 }], agora0, 1000);
  t("timeout é parâmetro (override honesto do servidor para testes)", exp2.lista.length === 1);

  const pac = pacoteConversas(
    [{ id: 1, nome: "Ana", sinal: agora0 }, { id: 2, nome: "Podre", sinal: agora0 - 20_000 }],
    agora0,
  );
  t("fio: só {id, nome} — o sinal é interno e a expiração é aplicada",
    pac.length === 1 && pac[0].id === 1 && pac[0].nome === "Ana" && !("sinal" in pac[0]));

  const nomes = nomesConversa(
    [{ id: 1, nome: "Ana", sinal: agora0 }, { id: 2, nome: "Bruno", sinal: agora0 }, { id: 3, nome: "Carla", sinal: agora0 }],
    agora0,
  );
  t("nomesConversa: max 2 + contagem honesta do resto (+N)", nomes.nomes.join(",") === "Ana,Bruno" && nomes.mais === 1);

  const vp = validarPacoteNpc({ conversas: [{ id: 5, nome: "OK" }, { id: -1, nome: "neg" }, { id: 0, nome: "zero" }, { id: 6, nome: "" }, { id: 7 }, { id: 8, nome: 42 }, null, "lixo"] }, agora0);
  t("validarPacoteNpc: 1 viva de 8 podres (id>0 + nome string não vazio)", vp.length === 1 && vp[0].id === 5 && vp[0].nome === "OK", JSON.stringify(vp));
  t("validarPacoteNpc: sinal = agora da chegada (expiração local funciona)", vp[0]?.sinal === agora0);
  t("validarPacoteNpc: sem conversas / não-array → [] (nunca rebenta)",
    validarPacoteNpc(undefined, agora0).length === 0 && validarPacoteNpc({ conversas: "x" }, agora0).length === 0 && validarPacoteNpc({ conversas: [] }, agora0).length === 0);
  const vCap = validarPacoteNpc({ conversas: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, nome: `n${i}` })) }, agora0);
  t("validarPacoteNpc: cap aplicado na chegada (20 → 8)", vCap.length === NPC_CONVERSAS_CAP);
  const vNome = validarPacoteNpc({ conversas: [{ id: 3, nome: "x".repeat(60) }] }, agora0);
  t("validarPacoteNpc: nome cortado a 24 (o MESMO corte do `ola`)", vNome[0].nome.length === 24);

  // ════════════════ B) SERVIDOR REAL (fio provado) ════════════════
  console.log("— B) Servidor real v59 (cidade-servidor.mjs, timeout PADRÃO 15 s)");
  const srv = correr("node", ["server/cidade-servidor.mjs"], { PORT: String(PORTA_SRV) });
  // esperar o porto abrir (o servidor é WS — um ping HTTP falha rápido; ligamos com retry)
  let srvPronto = false;
  for (let i = 0; i < 40 && !srvPronto; i++) {
    try { await new Promise((res, rej) => { const w = new WebSocket(URL_SRV); w.on("open", () => { w.close(); res(); }); w.on("error", rej); }); srvPronto = true; } catch { await sleep(250); }
  }
  t("servidor v59 no ar na porta de teste", srvPronto);

  const A = clienteWs("Ana"), B = clienteWs("Bruno"), C = clienteWs("Carla");
  await A.ligar(); A.enviar({ t: "ola", nome: "Ana" });
  await B.ligar(); B.enviar({ t: "ola", nome: "Bruno" });
  await sleep(500);
  t("bemvindo de A traz id", typeof A.bemvindo?.id === "number" && A.bemvindo.id > 0);
  t("bemvindo traz npc.conversas VAZIO (ninguém a falar)", Array.isArray(A.bemvindo?.npc?.conversas) && A.bemvindo.npc.conversas.length === 0, JSON.stringify(A.bemvindo?.npc));

  A.enviar({ t: "npcfala" });
  const bNpc1 = await B.esperarMsg("npc", (m) => m.conversas?.some((c) => c.nome === "Ana"), 4000);
  t("A fala com o NPC → B recebe broadcast `npc` com Ana", !!bNpc1 && bNpc1.m.conversas.length === 1 && bNpc1.m.conversas[0].nome === "Ana", JSON.stringify(bNpc1?.m));
  const aNpc1 = await A.esperarMsg("npc", (m) => m.conversas?.length === 1, 4000, bNpc1 ? bNpc1.indice - 1 : 0);
  t("o AUTOR também recebe (estado partilhado converge — o display exclui o próprio)", !!aNpc1, JSON.stringify(A.msgs.map((m) => m.t)));

  const idxBase = Math.max(A.msgs.length, B.msgs.length);
  B.enviar({ t: "npcfala" });
  const aNpc2 = await A.esperarMsg("npc", (m) => m.conversas?.length === 2, 4000, idxBase);
  t("B também fala → lista com OS DOIS (a conversa NÃO é exclusiva)", !!aNpc2 && aNpc2.m.conversas.map((c) => c.nome).join(",") === "Ana,Bruno", JSON.stringify(aNpc2?.m));

  const idxBase2 = Math.max(A.msgs.length, B.msgs.length);
  B.enviar({ t: "npcfim" });
  const aNpc3 = await A.esperarMsg("npc", (m) => m.conversas?.length === 1, 4000, idxBase2);
  t("npcfim de B → Ana permanece na lista difundida", !!aNpc3 && aNpc3.m.conversas[0].nome === "Ana");
  const idxBase3 = Math.max(A.msgs.length, B.msgs.length);
  C.ligar(); C.enviar({ t: "ola", nome: "Carla" }); await sleep(400);
  C.enviar({ t: "npcfim" }); // no-op honesto: não estava na lista
  await sleep(700);
  t("npcfim SEM claim anterior: zero broadcast (no-op honesto)", !A.msgs.slice(idxBase3).some((m) => m.t === "npc"), JSON.stringify(A.msgs.slice(idxBase3).map((m) => m.t)));
  C.fechar();

  // heartbeat puro NÃO paga difusão (timeout PADRÃO 15 s neste servidor —
  // nada expira dentro da janela; a expiração tem servidor próprio abaixo)
  A.enviar({ t: "npcfala" }); // garante Ana na lista (aceite; difunde só se ela tinha saído)
  await sleep(300);
  const idxNpcCount = A.msgs.filter((m) => m.t === "npc").length;
  await sleep(3400); // > gate 3 s — timeout 15 s, zero expirações no intervalo
  A.enviar({ t: "npcfala" }); // aceite, Ana já está → mudou=false → ZERO difusão
  await sleep(900);
  const npcDepois = A.msgs.filter((m) => m.t === "npc").length;
  t("heartbeat puro: 2 npcfala aceites, ZERO difusões novas (só o conjunto muda difunde)", npcDepois === idxNpcCount, `antes=${idxNpcCount} depois=${npcDepois}`);

  // rate gate: SPAM → recusado nos contadores
  for (let i = 0; i < 6; i++) A.enviar({ t: "npcfala" }); // todos < 3 s do último → gate
  A.enviar({ t: "stats", n: 591 });
  const st1 = await A.esperarMsg("stats", (m) => typeof m.npcAvisos === "number", 4000);
  t("stats v59: contadores npc presentes (npcConversas/npcAvisos/npcRecusados/npcExpirados)",
    !!st1 && ["npcConversas", "npcAvisos", "npcRecusados", "npcExpirados"].every((k) => k in st1.m), JSON.stringify(st1?.m));
  t("gate NPC_FALA_GATE_MS: SPAM de 6 recusado nos contadores reais", st1?.m.npcRecusados >= 6, `recusados=${st1?.m.npcRecusados}`);

  // queda de ligação limpa a conversa
  await C.ligar(); C.enviar({ t: "ola", nome: "Carla" }); await sleep(400);
  const idxBase5 = Math.max(A.msgs.length, B.msgs.length);
  C.enviar({ t: "npcfala" });
  await A.esperarMsg("npc", (m) => m.conversas?.some((c) => c.nome === "Carla"), 4000, idxBase5);
  const idxBase6 = Math.max(A.msgs.length, B.msgs.length);
  C.fechar();
  const fimC = await A.esperarMsg("npc", (m) => !m.conversas?.some((c) => c.nome === "Carla"), 4000, idxBase6);
  t("aba fechada SEM adeus (ws cai) → conversa sai da lista difundida", !!fimC);

  // cap 8: 9 clientes reclamam → o fio nunca passa de 8
  const idxBase7 = A.msgs.length;
  const multidao = [];
  for (let i = 0; i < 9; i++) {
    const c = clienteWs(`m${i}`);
    await c.ligar(); c.enviar({ t: "ola", nome: `m${i}` });
    multidao.push(c);
    await sleep(120);
  }
  for (const c of multidao) c.enviar({ t: "npcfala" });
  await sleep(1200);
  const ultimoNpc = [...A.msgs.slice(idxBase7)].reverse().find((m) => m.t === "npc");
  t("cap honesto: mesmo com 9 a falar, o fio difunde ≤ 8", !!ultimoNpc && ultimoNpc.conversas.length <= NPC_CONVERSAS_CAP, `len=${ultimoNpc?.conversas.length}`);
  for (const c of multidao) c.fechar();
  await sleep(600);

  A.fechar(); B.fechar();
  await sleep(300); // os eventos close chegam async — sem isto o aberto do A pode ainda estar true
  t("servidor 1 ainda de pé depois de tudo (fechar clientes não o derruba)", srv.exitCode === null, `exitCode=${srv.exitCode}`);

  // ═══ B2) EXPIRAÇÃO — servidor PRÓPRIO com timeout 1,2 s (env honesto,
  // documentado no log de boot): sem heartbeat, o mundo fica a saber ≤ 3 s
  // depois (interval de 3 s ≪ gate dos testes de fio) e o contador real sobe.
  console.log("— B2) Expiração honesta (servidor 2, NPC_CONVERSA_TIMEOUT_MS=1200)");
  const PORTA_SRV2 = PORTA_SRV + 1;
  const srv2 = correr("node", ["server/cidade-servidor.mjs"], { PORT: String(PORTA_SRV2), NPC_CONVERSA_TIMEOUT_MS: "1200" });
  const X = clienteWs("Xavier", PORTA_SRV2);
  let srv2Pronto = false;
  for (let i = 0; i < 40 && !srv2Pronto; i++) {
    try { await new Promise((res, rej) => { const w = new WebSocket(X.url); w.on("open", () => { w.close(); res(); }); w.on("error", rej); }); srv2Pronto = true; } catch { await sleep(250); }
  }
  t("servidor 2 no ar (timeout curto para expirar rápido)", srv2Pronto);
  await X.ligar(); X.enviar({ t: "ola", nome: "Xavier" }); await sleep(400);
  X.enviar({ t: "npcfala" });
  await X.esperarMsg("npc", (m) => m.conversas?.some((c) => c.nome === "Xavier"), 4000);
  const expX = await X.esperarMsg("npc", (m) => m.conversas?.length === 0, 9000);
  t("sem heartbeat (timeout 1,2 s) → o próprio recebe a lista VAZIA difundida", !!expX, JSON.stringify(X.msgs.filter((m) => m.t === "npc")));
  X.enviar({ t: "stats", n: 593 });
  const st3 = await X.esperarMsg("stats", (m) => m.n === 593, 4000);
  t("expiração contada no servidor próprio (npcExpirados ≥ 1)", (st3?.m.npcExpirados ?? 0) >= 1, `expirados=${st3?.m.npcExpirados}`);
  X.fechar();
  t("servidor 2 ainda de pé", srv2.exitCode === null);

  if (SEM_E2E) {
    console.log("\n— C) E2E browser: SKIPPED (--sem-e2e)");
    matarTodos();
    escore();
    return;
  }

  // ════════════════ C) E2E BROWSER (página real + ws Node) ════════════════
  console.log("— C) E2E browser: /cidade?mp=… + cliente ws Node");
  const { chromium } = await import("playwright");
  mkdirSync(`${RAIZ}/shots-v59`, { recursive: true });

  // vite dev (8099) para a página real
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  const vitePronto = await esperarAte(`${BASE}/`, (r) => r.ok, 45000);
  t("vite 8099 no ar", vitePronto);

  const NOISE = [
    "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
    "ERR_", "net::", "ResizeObserver", "AudioContext", "React Router Future Flag", "404", "406",
    "fetchPriority", "PGRST", "JWT", "permission", "AbortError", "play() failed", "user gesture",
    "401", "same key", "validateDOMNesting", "CORS", "cors", "open-meteo", "apikey", "Auth",
    "Failed to fetch", "TypeError", "NetworkError", "pointer", "three", "THREE", "WebGL",
  ];
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const consoleErros = [];
  page.on("pageerror", (e) => consoleErros.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) consoleErros.push(m.text()); });

  // clima REAL mockado (determinístico — o mesmo padrão da v57)
  await page.route(/geocoding-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  await page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));
  await page.route(/air-quality-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { current: { european_aqi: 21, pm2_5: 5.4 } } }));

  await page.goto(`${BASE}/cidade?mp=${encodeURIComponent(URL_SRV)}`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await page.getByTestId("cd-entrar").click();
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 25000 }).catch(() => {});
  t("fase jogando", await page.evaluate(() => window.__cidade?.fase() === "jogando"));
  await page.waitForFunction(() => window.__cidade?.mpEstado?.() === "ligado", null, { timeout: 10000 }).catch(() => {});
  t("MP ligado (?mp= real)", await page.evaluate(() => window.__cidade?.mpEstado?.() === "ligado"));

  const npcMp0 = await page.evaluate(() => window.__cidade?.npcMp?.());
  t("hook npcMp: lista vazia ao nascer (ninguém a falar)", Array.isArray(npcMp0?.conversas) && npcMp0.conversas.length === 0 && npcMp0?.meuId > 0, JSON.stringify(npcMp0));

  // 1) OUTRO jogador (ws Node) fala com o NPC → a PÁGINA vê
  const D = clienteWs("Diana");
  await D.ligar(); D.enviar({ t: "ola", nome: "Diana" }); await sleep(400);
  const idxD = D.msgs.length;
  D.enviar({ t: "npcfala" });
  await page.waitForFunction(() => (window.__cidade?.npcMp?.().outros ?? []).length === 1, null, { timeout: 6000 }).catch(() => {});
  const npcMp1 = await page.evaluate(() => window.__cidade?.npcMp?.());
  t("B (Node) fala com o NPC → a página A recebe o nome", npcMp1?.outros?.[0] === "Diana", JSON.stringify(npcMp1));
  await page.evaluate(() => window.__cidade.pump(30));
  await sleep(900); // rótulos a ~8 Hz
  const rotNpc1 = await page.evaluate(() => (window.__cidade?.rotulos?.() ?? []).find((r) => r.id === "__npcia__"));
  t("rótulo do holograma mostra QUEM fala: «Bateu IA · Diana»", !!rotNpc1 && /Bateu IA · Diana/.test(rotNpc1.nome), rotNpc1?.nome);

  // evento no Praça em direto (painel refresca a 1 Hz)
  await page.waitForFunction(() => {
    const linhas = [...document.querySelectorAll("[data-testid=cd-eventos-linha]")].map((l) => l.textContent ?? "");
    return linhas.some((x) => x.includes("Diana"));
  }, null, { timeout: 6000 }).catch(() => {});
  const ev1 = await page.evaluate(() => [...document.querySelectorAll("[data-testid=cd-eventos-linha]")].map((l) => l.textContent ?? ""));
  t("Praça em direto: evento real «Diana · está a falar com a Bateu IA»", ev1.some((x) => /Diana/.test(x) && /falar|talking|conversando|hablando|parle/.test(x)), JSON.stringify(ev1));

  // 2) Diana para → evento de fim + rótulo limpo
  const idxD2 = D.msgs.length;
  D.enviar({ t: "npcfim" });
  await page.waitForFunction(() => (window.__cidade?.npcMp?.().outros ?? []).length === 0, null, { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => window.__cidade.pump(30));
  await sleep(900);
  const rotNpc2 = await page.evaluate(() => (window.__cidade?.rotulos?.() ?? []).find((r) => r.id === "__npcia__"));
  t("fim da conversa: rótulo volta a «Bateu IA» puro", !!rotNpc2 && !rotNpc2.nome.includes("Diana"), rotNpc2?.nome);
  const evFim = await page.waitForFunction(() => {
    const linhas = [...document.querySelectorAll("[data-testid=cd-eventos-linha]")].map((l) => l.textContent ?? "");
    return linhas.some((x) => x.includes("Diana") && /parou|stopped|dejó|arrêt|बंद/.test(x));
  }, null, { timeout: 6000 }).then(() => true).catch(() => false);
  t("Praça em direto: evento «parou a conversa» chega pelo MESMO fio", evFim === true);

  // 3) A abre o painel do NPC → Diana (Node) recebe o claim de A
  const meuIdPagina = npcMp1?.meuId ?? (await page.evaluate(() => window.__cidade?.npcMp?.().meuId));
  const idxD3 = D.msgs.length;
  await page.evaluate(() => window.__cidade.npcAbrir());
  await page.waitForFunction(() => window.__cidade?.npcIa?.().painelAberto === true, null, { timeout: 6000 }).catch(() => {});
  t("painel do NPC aberto (A a conversar)", await page.evaluate(() => window.__cidade?.npcIa?.().painelAberto === true));
  const dNpc = await D.esperarMsg("npc", (m) => m.conversas?.some((c) => c.id === meuIdPagina), 6000, idxD3);
  t("abrir o painel ANUNCIA a conversa ao mundo (Diana recebe o claim do id real da página)", !!dNpc, `meuId=${meuIdPagina} ${JSON.stringify(D.msgs.slice(idxD3).map((m) => m.t))}`);
  // o próprio NÃO se vê no rótulo (display exclui o próprio nome)
  await page.evaluate(() => window.__cidade.pump(30));
  await sleep(900);
  const npcMp2 = await page.evaluate(() => window.__cidade?.npcMp?.());
  t("o AUTOR não aparece na sua própria lista (outros=[] — npcFim/nome próprio filtrados)", (npcMp2?.outros ?? []).length === 0, JSON.stringify(npcMp2));

  // 4) A fecha → Diana recebe lista vazia
  const idxD4 = D.msgs.length;
  await page.getByTestId("cd-npc-fechar").click();
  await page.waitForFunction(() => window.__cidade?.npcIa?.().painelAberto === false, null, { timeout: 6000 }).catch(() => {});
  t("fechar o painel (X) fecha a sério", await page.evaluate(() => window.__cidade?.npcIa?.().painelAberto === false));
  await D.esperarMsg("npc", (m) => m.conversas?.length === 0, 6000, idxD4);
  t("fechar o painel DESANUNCIA (Diana recebe lista vazia)", D.msgs.slice(idxD4).some((m) => m.t === "npc" && m.conversas?.length === 0), JSON.stringify(D.msgs.slice(idxD4).map((m) => [m.t, m.conversas?.length])));

  D.fechar();
  await page.screenshot({ path: `${RAIZ}/shots-v59/npc-mp-praca.png` });

  const erros = consoleErros.filter((e) => !NOISE.some((n) => e.includes(n)));
  t("zero erros de consola na página (fora do ruído conhecido)", erros.length === 0, JSON.stringify(erros.slice(0, 3)));
  await browser.close();

  matarTodos();
  escore();
}

function escore() {
  console.log(`\n${"═".repeat(50)}\n  PASSOU: ${passed}  FALHOU: ${failed}\n${"═".repeat(50)}`);
  if (fails.length) console.log("  FALHAS:\n   - " + fails.join("\n   - "));
  process.exit(failed ? 1 : 0);
}

process.on("exit", () => { matarTodos(); });
main().catch((e) => { console.error("ERRO FATAL:", e); matarTodos(); process.exit(1); });
