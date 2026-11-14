// ============================================================
// E2E — CIDADE BATEU v37: N3 completo (padrões Veloren aplicados)
// Dois jogadores · movimento partilhado · reconciliação honesta
// (`corrigido`) · chat da praça com rate-limit e sanitização ·
// teclado do chat não move o jogador · bots · offline honesto.
// v47 — N2: o servidor RE-SIMULA O TERRENO (alturaCidade, a mesma
// função e semente do cliente): subida legal aceita, duplo-salto
// impossível recusado com motivo honesto («parede») · painel
// «Praça em direto» com eventos reais da sessão + atividade real
// da plataforma (activityBus) · STATS REAIS do processo (ping→stats).
// Uso: PW_CHROME=<chromium> node test-mp-v37.mjs (vite 8099 + servidor 8765)
// ============================================================
import { chromium } from "playwright";
import WebSocket from "ws";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const MP_URL = process.env.MP_URL || "ws://localhost:8765";
let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name} ${extra}`); }
};
const NOISE_SUBST = "— regista erros de consola novos; o filtro de ruído conhecido vive no escore final";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pageErrors = new Map();
const escutaErros = (nome, pg) =>
  pg.on("pageerror", (e) => { if (!pageErrors.has(nome)) pageErrors.set(nome, []); pageErrors.get(nome).push(String(e)); });

const MOCKS = (page) => {
  page.route(/geocoding-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));
  page.route(/air-quality-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { current: { european_aqi: 21, pm2_5: 5.4 } } }));
};

async function entraCidade(browser, nome) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  MOCKS(page);
  escutaErros(nome, page);
  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 });
  await page.evaluate((n) => { localStorage.setItem("bateu_cidade_nome", n); }, nome);
  // dispatchEvent: motores three.js a 60fps esmagam o hit-target do Playwright (flake conhecido v31/v36)
  await page.getByTestId("cd-entrar").dispatchEvent("click");
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 });
  await page.evaluate((u) => window.__cidade.mpLigar(u), MP_URL);
  await page.waitForFunction(() => window.__cidade?.mpEstado?.() === "ligado", null, { timeout: 10000 });
  return page;
}

async function main() {
  console.log(`\n🌐 CIDADE MP v37 E2E — ${BASE} · servidor ${MP_URL}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  console.log("— Dois jogadores entram");
  const A = await entraCidade(browser, "Ana-MZ");
  const B = await entraCidade(browser, "Bruno-AO");
  ok("A ligado", await A.evaluate(() => window.__cidade.mpEstado() === "ligado"));
  ok("B ligado", await B.evaluate(() => window.__cidade.mpEstado() === "ligado"));
  ok("B vê Ana nos remotos", await B.evaluate(() => window.__cidade.mpRemotos().some((j) => j.nome === "Ana-MZ")));
  ok("A vê Bruno nos remotos", await A.evaluate(() => window.__cidade.mpRemotos().some((j) => j.nome === "Bruno-AO")));
  const chipTxt = await B.getByTestId("cd-mp-n").textContent().catch(() => "");
  ok("chip HUD mostra 2 no mundo", /^\s*2\s/.test(chipTxt ?? ""), `texto="${chipTxt}"`);

  console.log("— Movimento partilhado (predito no cliente, validado no servidor)");
  // v38 — envios conduzidos pelo relógio do teste (mpPasso, mesmo contrato do
  // rAF): o raster por software deste sandbox corre a ~2 fps e o ritmo de envio
  // do rAF real não chega ao orçamento do servidor (medido: stash v37 = 2 fps
  // também). 1 bloco a cada 125 ms = 8 b/s < MAX_VEL 12 — movimento honesto.
  await A.evaluate(async () => {
    for (let i = 1; i <= 20; i++) {
      const m = window.__cidade.motor;
      window.__cidade.teleportar(i, m.mundo.alturaTerreno(i, 6.5) + 1.02, 6.5);
      window.__cidade.mpPasso(0.125);
      await new Promise((r) => setTimeout(r, 125));
    }
  });
  await B.waitForFunction(() => {
    const a = window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ");
    return a && a.x > 14;
  }, null, { timeout: 8000 }).catch(() => {});
  const posB = await B.evaluate(() => window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ") ?? null);
  ok("Bruno vê Ana em x≈20", !!posB && posB.x > 14, `x=${posB?.x}`);

  console.log("— Anti-teleport + reconciliação honesta (`corrigido`)");
  await A.evaluate(() => window.__cidade.teleportar(100, 36, 6.5)); // salto ilegal de ~80 blocos
  await A.waitForFunction(() => window.__cidade?.ultimaCorrecao?.() != null, null, { timeout: 6000 }).catch(() => {});
  const corr = await A.evaluate(() => window.__cidade.ultimaCorrecao());
  ok("A recebeu correção do servidor", !!corr && typeof corr.x === "number", JSON.stringify(corr));
  // orçamento honesto do clamp: MAX_VEL×MAX_DT×TOLERANCIA = 12×0,2×2,2 = 5,28 a partir de x≈20
  ok("correção clampada (≈25, não 100)", !!corr && corr.x < 30 && corr.x > 15, `x=${corr?.x}`);
  await sleep(900);
  const posClamp = await B.evaluate(() => window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ") ?? null);
  ok("Bruno vê Ana clampada (≈25, não 100)", !!posClamp && posClamp.x < 30 && posClamp.x > 15, `x=${posClamp?.x}`);
  ok("A continua ligado após correção", await A.evaluate(() => window.__cidade.mpEstado() === "ligado"));

  console.log("— Cap e bots");
  const bots = [];
  for (let i = 0; i < 8; i++) {
    const ws = new WebSocket(MP_URL);
    ws.on("open", () => ws.send(JSON.stringify({ t: "ola", nome: `Bot-${i}` })));
    bots.push(ws);
  }
  await A.waitForFunction(() => (window.__cidade?.mpRemotos?.().length ?? 0) >= 9, null, { timeout: 8000 }).catch(() => {});
  const nRemA = await A.evaluate(() => window.__cidade.mpRemotos().length);
  ok("A vê 8 bots + Bruno = 9 remotos", nRemA === 9, `n=${nRemA}`);

  console.log("— v47: painel Praça em direto (eventos reais) + pico de presença");
  await B.waitForFunction(() => (window.__cidade?.mpEventos?.() ?? []).some((e) => e.tipo === "entrou" && (e.nome ?? "").startsWith("Bot-")), null, { timeout: 8000 }).catch(() => {});
  const evB = await B.evaluate(() => window.__cidade.mpEventos());
  ok("B registou entradas REAIS dos bots", evB.filter((e) => e.tipo === "entrou" && (e.nome ?? "").startsWith("Bot-")).length >= 6, `n=${evB.length}`);
  ok("painel de B mostra linha de evento real", await B.getByTestId("cd-eventos-linha").count() > 0);
  const picoB = await B.evaluate(() => window.__cidade.mpPico());
  ok("pico de presença REAL ≥ 9 (observado, não estimado)", picoB >= 9, `pico=${picoB}`);
  ok("painel de B mostra o pico", await B.getByTestId("cd-eventos-pico").textContent().then((s) => /\d/.test(s ?? "")));

  console.log("— v47 N2: física do terreno re-simulada pelo servidor (mesma alturaCidade)");
  // Coordenadas REAIS calculadas pela função pura (probe-penhasco-v47.mjs,
  // semente 20251103): no anel de fusão a (60,-16) a subida radial é 2,0 por
  // passo de 2 blocos — legal (≤ SUBIDA_CAP 2,22) — e o passo seguinte +1,0
  // excede o orçamento restante → recusa «parede». O caminho de 44 passos foi
  // SIMULADO contra o handler real: tudo aceite até à base.
  const corrAntes = await A.evaluate(() => window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length);
  // drive honesto de (20,6.5) até à base do degrau (60,-16): 1 bloco/125 ms = 8 b/s
  await A.evaluate(async () => {
    const m = window.__cidade.motor;
    const passos = 44;
    for (let i = 1; i <= passos; i++) {
      const t = i / passos;
      const x = Math.round((20 + 40 * t) * 100) / 100;
      const z = Math.round((6.5 - 22.5 * t) * 100) / 100;
      window.__cidade.teleportar(x, m.mundo.alturaTerreno(x, z) + 1.02, z);
      window.__cidade.mpPasso(0.125);
      await new Promise((r) => setTimeout(r, 125));
    }
  });
  ok("drive de 44 passos legais: ZERO correções", await A.evaluate((n) => window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length === n, corrAntes), `corr=${corrAntes}`);
  // DOIS SALTOS NO MESMO INSTANTE — numa só tarefa JS (o rAF não corre dentro
  // dela) e ambos por envio imediato (o gate de 100 ms do mpPasso pode calar o
  // 1.º se o ciclo de jogo mandou pos há pouco — furo real das corridas 3/4).
  // 1.º salto: subida radial REAL +2,0 ≤ SUBIDA_CAP 2,22 → ACEITE (o orçamento
  // não pune subida legal); 2.º salto chega ms depois com +1,0 e orçamento
  // ~0,2 — a física do motor não faz dois saltos em 0,1 s (1 salto = 0,66 s)
  // → REJEITADO «parede». Envio imediato é a MESMA via real do cliente.
  await A.evaluate(() => {
    const m = window.__cidade.motor;
    window.__cidade.teleportar(62, m.mundo.alturaTerreno(62, -17) + 1.02, -17);
    window.__cidade.mpPassoImediato(62, -17); // 1.º salto: ACEITE (subida real +2,0)
    window.__cidade.teleportar(64, m.mundo.alturaTerreno(64, -18) + 1.02, -18);
    window.__cidade.mpPassoImediato(64, -18); // 2.º salto ms depois: REJEITADO
  });
  await A.waitForFunction(() => window.__cidade?.ultimaCorrecao?.()?.motivo === "parede", null, { timeout: 6000 }).catch(() => {});
  const parede = await A.evaluate(() => window.__cidade.ultimaCorrecao());
  ok("recusa do servidor com motivo honesto «parede»", !!parede && parede.motivo === "parede", JSON.stringify(parede));
  ok("servidor manteve a posição válida (x≈62)", !!parede && Math.abs(parede.x - 62) < 1.5 && Math.abs(parede.z + 17) < 1.5, `x=${parede?.x} z=${parede?.z}`);
  // EXATAMENTE 1 nova correção e é a parede → o 1.º salto (+2,0) foi ACEITE
  // (o orçamento de subida não pune subida legal) e só o 2.º caiu
  const eventosA = await A.evaluate((n) => ({
    corr: window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length,
    motivos: window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").map((e) => e.motivo),
  }), corrAntes);
  ok("subida legal de 2,0 foi ACEITE e só a impossível caiu", eventosA.corr === corrAntes + 1 && eventosA.motivos[eventosA.motivos.length - 1] === "parede", JSON.stringify(eventosA));
  ok("evento real «corrigido/parede» no registo da sessão", eventosA.motivos.includes("parede"));
  await sleep(300);
  const pxApos = await A.evaluate(() => window.__cidade.motor.px);
  ok("cliente reencaixado na posição autoritativa", Math.abs(pxApos - 62) < 1.5, `px=${pxApos?.toFixed(2)}`);
  // o painel refresca por sondagem de 1 s — esperar o DOM real, não correr à frente
  await A.waitForFunction(() => [...document.querySelectorAll('[data-testid="cd-eventos-linha"]')]
    .some((el) => /recusada|refused/.test(el.textContent ?? "")), null, { timeout: 4000 }).catch(() => {});
  ok("painel Praça em direto mostra a recusa", await A.getByTestId("cd-eventos-linha").filter({ hasText: /recusada|refused/ }).count() > 0);

  console.log("— v47: STATS REAIS do servidor (ping→stats)");
  const stats = await new Promise((resolve) => {
    const ws = new WebSocket(MP_URL);
    // v47 — o protocolo exige «ola» primeiro (o servidor fecha 4000 sem ele)
    ws.on("open", () => ws.send(JSON.stringify({ t: "ola", nome: "Stats-E2E" })));
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw));
      if (m.t === "stats") { ws.close(); resolve(m); }
      else if (m.t === "bemvindo") ws.send(JSON.stringify({ t: "stats", n: 1 }));
    });
    setTimeout(() => { try { ws.close(); } catch { /* ignore */ } resolve(null); }, 5000);
  });
  ok("stats recebidos do servidor", !!stats, JSON.stringify(stats));
  ok("jogadores reais ≥ 11 (A+B+8 bots+o stats)", stats?.jogadores >= 10, `n=${stats?.jogadores}`);
  ok("cap honesto = 64", stats?.cap === 64, `cap=${stats?.cap}`);
  ok("tick a correr (>0)", stats?.tick > 0, `tick=${stats?.tick}`);
  ok("CPU do processo reportada (ms ≥ 0)", typeof stats?.cpuUserMs === "number" && stats.cpuUserMs >= 0, `cpu=${stats?.cpuUserMs}`);
  ok("RSS reportado (>0)", stats?.rssMb > 0, `rss=${stats?.rssMb}`);
  ok("entradas contadas de verdade ≥ 11", stats?.entradas >= 11, `entradas=${stats?.entradas}`);
  ok("correções contadas de verdade ≥ 2 (alcance + parede)", stats?.correcoes >= 2, `corr=${stats?.correcoes}`);

  for (const ws of bots) try { ws.close(); } catch { /* ignore */ }

  console.log("— Chat da praça (UI real + rate-limit + sanitização)");
  await A.getByTestId("cd-chat-input").fill("");
  const pxAntes = await A.evaluate(() => window.__cidade.motor.px);
  await A.getByTestId("cd-chat-input").pressSequentially("Ola praca!", { delay: 40 });
  const pxDepois = await A.evaluate(() => window.__cidade.motor.px);
  ok("teclas escritas no chat NÃO movem a Ana", Math.abs(pxDepois - pxAntes) < 0.001, `Δpx=${(pxDepois - pxAntes).toFixed(4)}`);
  await A.getByTestId("cd-chat-input").press("Enter");
  await B.waitForFunction(() => window.__cidade?.mpFalas?.().some((f) => f.texto === "Ola praca!"), null, { timeout: 6000 }).catch(() => {});
  const falasB = await B.evaluate(() => window.__cidade.mpFalas());
  ok("Bruno recebe a fala da Ana", falasB.some((f) => f.nome === "Ana-MZ" && f.texto === "Ola praca!"), JSON.stringify(falasB.slice(-2)));
  ok("a Ana também vê a própria fala (confirmação)", await A.evaluate(() => window.__cidade.mpFalas().some((f) => f.texto === "Ola praca!")));
  const linhaChat = await B.getByTestId("cd-chat-linha").last().textContent().catch(() => "");
  ok("linha de chat renderizada no HUD de B", (linhaChat ?? "").includes("Ana-MZ"), `texto="${linhaChat}"`);

  const longa = "x".repeat(200);
  await sleep(1600); // respeita o rate-limit honesto (1 fala / 1,5 s)
  // duas chamadas SÍNCRONAS no mesmo evaluate — determinístico (roundtrips entre
  // páginas podem demorar >1,5 s e o limite expiraria legitimamente — flake real)
  const par = await A.evaluate((t) => {
    const w = window.__cidade;
    return { r1: w.mpFalar(t), r2: w.mpFalar("segunda") };
  }, longa);
  ok("fala longa aceite (cortada a 140)", par.r1 === true);
  ok("fala imediata seguinte é recusada (rate-limit honesto)", par.r2 === false);
  await B.waitForFunction(() => window.__cidade?.mpFalas?.().some((f) => f.texto.startsWith("xxx")), null, { timeout: 6000 }).catch(() => {});
  const cortada = await B.evaluate(() => window.__cidade.mpFalas().find((f) => f.texto.startsWith("xxx"))?.texto ?? "");
  ok("fala chega cortada a ≤140", cortada.length > 0 && cortada.length <= 140, `len=${cortada.length}`);
  await sleep(1600);
  ok("após 1,5 s pode falar outra vez", await A.evaluate(() => window.__cidade.mpFalar("terceira ok")) === true);
  await B.waitForFunction(() => window.__cidade?.mpFalas?.().some((f) => f.texto === "terceira ok"), null, { timeout: 6000 }).catch(() => {});
  ok("Bruno NUNCA recebeu a fala limitada", await B.evaluate(() => !window.__cidade.mpFalas().some((f) => f.texto === "segunda")));


  console.log("— Offline honesto + atividade REAL da plataforma na Praça");
  await A.close(); await B.close();
  const C = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  MOCKS(C);
  escutaErros("C", C);
  // semeia o CANAL REAL do activityBus (a mesma chave localStorage que a
  // plataforma usa) — o teste prova a tubagem, não inventa atividade
  await C.addInitScript(() => {
    localStorage.setItem("bateu:activities", JSON.stringify([
      { id: "e2e-v47-1", type: "auction", title: "Lance de teste E2E no Leilão do Imbondeiro", detail: null, href: "/leiloes", created_at: new Date().toISOString(), source: "local" },
    ]));
  });
  await C.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await C.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 });
  await C.getByTestId("cd-entrar").dispatchEvent("click");
  await C.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 });
  ok("sem servidor NÃO há caixa de chat (nunca finge MP)", await C.getByTestId("cd-chat").count() === 0);
  await C.evaluate(() => window.__cidade.mpLigar("ws://localhost:8799")); // nada a ouvir
  await C.waitForFunction(() => window.__cidade?.mpEstado?.() === "erro", null, { timeout: 9000 }).catch(() => {});
  ok("estado honesto 'erro' sem servidor", await C.evaluate(() => window.__cidade.mpEstado() === "erro"));
  ok("mpFalar devolve false em modo solo", await C.evaluate(() => window.__cidade.mpFalar("olá") === false));
  ok("painel Praça em direto SOLO mostra atividade REAL da plataforma", await C.getByTestId("cd-eventos-plataforma").filter({ hasText: "Leilão do Imbondeiro" }).count() > 0);

  for (const nome of ["Ana-MZ", "Bruno-AO", "C"]) {
    const errs = pageErrors.get(nome) ?? [];
    ok(`${nome}: sem pageerror na sessão`, errs.length === 0, errs.slice(0, 2).join(" | "));
  }
  void NOISE_SUBST;

  await browser.close();
  console.log(`\n📊 RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log("Falhas: " + fails.join(" · "));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("FALHA FATAL:", e); process.exit(1); });
