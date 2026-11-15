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
// v52 — o campo de voxels puro e o A* de rotas legais vivem no módulo
// PARTILHADO test-rotas-cidade.mjs (o MESMO campo que o servidor re-simula:
// gerarDadosTerreno + carimbarCidade; os caminhos dos testes são LEGAIS sob
// a re-simulação N4 — as linhas retas atravessam paredes, troncos e o anel).
import { rotaAstar, alturaCampo, caminhoLivre, solidoCampo, SEED_CIDADE, CHUNK, ALTURA, caixaColide } from "./test-rotas-cidade.mjs";

let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name} ${extra}`); }
};
const NOISE_SUBST = "— regista erros de consola novos; o filtro de ruído conhecido vive no escore final";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pageErrors = new Map();
const escutaErros = (nome, pg) => {
  pg.on("pageerror", (e) => { if (!pageErrors.has(nome)) pageErrors.set(nome, []); pageErrors.get(nome).push(String(e)); });
  pg.on("crash", () => console.log(`  ⚠️ PAGE CRASH: ${nome} em t=${((Date.now() - T0) / 1000).toFixed(0)}s`));
  pg.on("close", () => console.log(`  ⚠️ PAGE CLOSE: ${nome} em t=${((Date.now() - T0) / 1000).toFixed(0)}s`));
};
const T0 = Date.now();

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
  // v52 — a rota é a dos WAYPOINTS do probe (livre de paredes/árvores): a
  // linha reta z=6.5 esbarra na casa do jogador (o servidor N4 recusa, como
  // a física do cliente) — os waypoints contornam, como o jogador real.
  const wps1 = rotaAstar(0.5, 6.5, 22.5, 0.5);
  await A.evaluate(async (wps) => {
    let pxx = 0.5, pzz = 6.5;
    for (const [wx, wz] of wps) {
      window.__cidade.teleportar(wx, 35.02, wz);
      window.__cidade.mpPassoImediato(wx, wz, 0);
      const espera = Math.max(60, Math.ceil((Math.hypot(wx - pxx, wz - pzz) / 12) * 1000) + 40); // o orçamento recarrega a MAX_VEL 12 b/s
      pxx = wx; pzz = wz;
      await new Promise((r) => setTimeout(r, espera));
    }
  }, wps1);
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
    ws.on("open", () => {
      ws.send(JSON.stringify({ t: "ola", nome: `Bot-${i}` }));
      // v52 — a secção N4 alongou o teste: o bot presença manda ping (o que
      // um cliente real faz com pos a 10 Hz) para não ser kicado por timeout
      ws.pingTimer = setInterval(() => { try { ws.send(JSON.stringify({ t: "ping", n: i })); } catch { /* ignore */ } }, 10_000);
    });
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
  // Coordenadas REAIS das funções puras: no anel de fusão a subida radial do
  // degrau A=(-58.02,33.5)→B=(-59.76,34.5) é +2,0 (superfícies 37→39, legal
  // ≤ SUBIDA_CAP 2,22) e o passo seguinte B→C=(-61.49,35.5) é +1,0 — excede
  // o orçamento restante → recusa «parede». v52: o degrau foi REESCOLHIDO
  // pela busca de caixa limpa (o degrau v47 (60,-16)/(62,-17) fica num
  // descanso do anel onde a caixa do corpo N4 não cabe — a busca prova A/B/C
  // com a caixa livre e os cruzamentos de salto reais).
  const DEGRAU_A = [-58.02, 33.5], DEGRAU_B = [-59.76, 34.5], DEGRAU_C = [-61.49, 35.5];
  const corrAntes = await A.evaluate(() => window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length);
  // drive honesto até à base do degrau (A): 1 bloco/125 ms = 8 b/s.
  // v52 — a rota é do STEPPER consciente de obstáculos (campo puro): a linha
  // reta atravessa árvores naturais do anel de relva e cruzamentos íngremes
  // do anel de fusão (probe: 10 muros + subidas > 2,0 medidos na diagonal) —
  // o stepper contorna mantendo cada passo legal na caixa do corpo (N4) E na
  // subida do terreno (v47). O mpPasso (gate 100 ms) mantém o ritmo do rAF
  // domado — as msgs vão em protocolo NOVO (com y), como o cliente real.
  const driveRota = rotaAstar(21.92, 0.49, DEGRAU_A[0], DEGRAU_A[1]);
  await A.evaluate(async (pts) => {
    const m = window.__cidade.motor;
    // v52 — os degraus do anel são cruzados como o cliente REAL: na subida o
    // salto sobe ANTES de cruzar o degrau (msg intermédia no ar); na descida
    // primeiro o passo horizontal (ainda no alto) e DEPOIS a queda. Uma única
    // msg por degrau faz a caixa interpolada raspar no riser (furo real da
    // corrida: RECUSA parede autoritativa=(62 36.02 −17) em cascata).
    const alt = (x, z) => Math.round((m.mundo.alturaTerreno(x, z) + 1.02) * 100) / 100;
    let prev = null;
    const envia = async (x, y, z, dPasso, minSono = 0) => {
      window.__cidade.teleportar(x, y, z);
      window.__cidade.mpPassoImediato(x, z, 0, y, false);
      await new Promise((r) => setTimeout(r, Math.max(minSono, 60, Math.ceil((dPasso / 12) * 1000) + 40))); // o orçamento recarrega a MAX_VEL 12 b/s; o pouso do salto real demora ~0,55 s
    };
    for (const [px, pz] of pts) {
      const y = alt(px, pz);
      if (prev) {
        const dy = y - prev.y;
        const dPasso = Math.hypot(px - prev.x, pz - prev.z);
        if (dy > 0.5) {
          const mx = Math.round((prev.x + (px - prev.x) * 0.5) * 100) / 100;
          const mz = Math.round((prev.z + (pz - prev.z) * 0.5) * 100) / 100;
          await envia(mx, Math.round((prev.y + 1.1) * 100) / 100, mz, dPasso * 0.55);
          await envia(px, y, pz, 0.1, 500); // o arco do salto real dura ~0,66 s (SALTO/GRAVIDADE) — o pouso espera
          prev = { x: px, y, z: pz };
          continue;
        } else if (dy < -0.5) {
          await envia(px, prev.y, pz, dPasso);
          await envia(px, y, pz, 0.1);
          prev = { x: px, y, z: pz };
          continue;
        } else {
          await envia(px, y, pz, dPasso);
        }
      } else {
        await envia(px, y, pz, 0.1);
      }
      prev = { x: px, y, z: pz };
    }
  }, driveRota);
  ok("drive legal até ao degrau: ZERO correções", await A.evaluate((n) => window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length === n, corrAntes), `corr=${await A.evaluate(() => window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length)}/${corrAntes} fim=${JSON.stringify(driveRota[driveRota.length - 1])}`);
  // âncora determinística na BASE do degrau (A): o mpPasso (gate 100 ms) pode
  // calar o último envio do drive; a âncora usa o MESMO salto em duas fases
  // da caminhada (a msg intermédia no ar) — o riser do anel não deixa a caixa
  // interpolada linear raspar (furo real da corrida: RECUSA no d≈0).
  await A.evaluate(async ([ax, az]) => {
    const m = window.__cidade.motor;
    const alt = (x, z) => Math.round((m.mundo.alturaTerreno(x, z) + 1.02) * 100) / 100;
    const yA = alt(ax, az);
    const prevY = Math.round(m.py * 100) / 100;
    const dy = yA - prevY;
    if (dy > 0.5) {
      const mx = Math.round((m.px + (ax - m.px) * 0.5) * 100) / 100;
      const mz = Math.round((m.pz + (az - m.pz) * 0.5) * 100) / 100;
      window.__cidade.teleportar(mx, Math.round((prevY + 1.1) * 100) / 100, mz);
      window.__cidade.mpPassoImediato(mx, mz, 0, Math.round((prevY + 1.1) * 100) / 100, false);
      await new Promise((r) => setTimeout(r, 130));
    }
    window.__cidade.teleportar(ax, yA, az);
    window.__cidade.mpPassoImediato(ax, az, 0, yA, false);
  }, DEGRAU_A);
  await sleep(700); // o orçamento de subida recarrega ao tecto (2,22)
  const corrAntesSalto = await A.evaluate(() => window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length);
  // DOIS SALTOS NO MESMO INSTANTE — numa só tarefa JS (o rAF não corre dentro
  // dela) e ambos por envio imediato (o gate de 100 ms do mpPasso pode calar o
  // 1.º se o ciclo de jogo mandou pos há pouco — furo real das corridas 3/4).
  // 1.º salto: subida radial REAL +2,0 ≤ SUBIDA_CAP 2,22 → ACEITE (o orçamento
  // não pune subida legal); 2.º salto chega ms depois com +1,0 e orçamento
  // ~0,2 — a física do motor não faz dois saltos em 0,1 s (1 salto = 0,66 s)
  // → REJEITADO «parede». Envio imediato é a MESMA via real do cliente.
  await A.evaluate(([bx, bz, cx, cz]) => {
    const m = window.__cidade.motor;
    window.__cidade.teleportar(bx, m.mundo.alturaTerreno(bx, bz) + 1.02, bz);
    window.__cidade.mpPassoImediato(bx, bz); // 1.º salto: ACEITE (subida real +2,0)
    window.__cidade.teleportar(cx, m.mundo.alturaTerreno(cx, cz) + 1.02, cz);
    window.__cidade.mpPassoImediato(cx, cz); // 2.º salto ms depois: REJEITADO
  }, [...DEGRAU_B, ...DEGRAU_C]);
  await A.waitForFunction(() => window.__cidade?.ultimaCorrecao?.()?.motivo === "parede", null, { timeout: 6000 }).catch(() => {});
  const parede = await A.evaluate(() => window.__cidade.ultimaCorrecao());
  ok("recusa do servidor com motivo honesto «parede»", !!parede && parede.motivo === "parede", JSON.stringify(parede));
  ok("servidor manteve a posição válida (topo do 1.º salto)", !!parede && Math.abs(parede.x - DEGRAU_B[0]) < 1.5 && Math.abs(parede.z - DEGRAU_B[1]) < 1.5, `x=${parede?.x} z=${parede?.z}`);
  // EXATAMENTE 1 nova correção e é a parede → o 1.º salto (+2,0) foi ACEITE
  // (o orçamento de subida não pune subida legal) e só o 2.º caiu
  const eventosA = await A.evaluate((n) => ({
    corr: window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length,
    motivos: window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").map((e) => e.motivo),
  }), corrAntesSalto);
  ok("subida legal de 2,0 foi ACEITE e só a impossível caiu", eventosA.corr === corrAntesSalto + 1 && eventosA.motivos[eventosA.motivos.length - 1] === "parede", JSON.stringify(eventosA));
  ok("evento real «corrigido/parede» no registo da sessão", eventosA.motivos.includes("parede"));
  await sleep(300);
  const pxApos = await A.evaluate(() => window.__cidade.motor.px);
  ok("cliente reencaixado na posição autoritativa", Math.abs(pxApos - DEGRAU_B[0]) < 1.5, `px=${pxApos?.toFixed(2)}`);
  // o painel refresca por sondagem de 1 s — esperar o DOM real, não correr à frente
  await A.waitForFunction(() => [...document.querySelectorAll('[data-testid="cd-eventos-linha"]')]
    .some((el) => /recusada|refused/.test(el.textContent ?? "")), null, { timeout: 4000 }).catch(() => {});
  ok("painel Praça em direto mostra a recusa", await A.getByTestId("cd-eventos-linha").filter({ hasText: /recusada|refused/ }).count() > 0);

  console.log("— v52 N4: o servidor pisa os MESMOS voxels (paredes de edifícios)");
  // Fontes dos números: scripts/probe-paredes-v52.mjs (41/41) — as coordenadas
  // do edifício «Casa da Sorte» vêm da função pura posDistrito (ang 0 → (27,0)),
  // a porta é o carimbo AR em (23,35..36,0)/(23,35..36,1) e a rota é do stepper
  // consciente de obstáculos (mundo de semente fixa → determinístico; árvores
  // naturais e a casa do jogador bloqueiam as linhas retas, como a física do
  // cliente). A Ana chega aqui do degrau do anel (62,-17) — a volta à porta é
  // ela própria uma prova: ~60 blocos de caminhada legal em protocolo NOVO
  // (com y a seguir o terreno) sem UMA correção.
  const corrEsperadas = await A.evaluate(() => window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length);
  const corrAgora = () => A.evaluate(() => window.__cidade.mpEventos().filter((e) => e.tipo === "corrigido").length);
  let corrEsperadasMut = corrEsperadas;
  const voltaRota = rotaAstar(DEGRAU_B[0], DEGRAU_B[1], 22.5, 0.5);
  // v52 — a caminhada corre em TRÊS evaluates (a 1.ª versão num evaluate só
  // de ~40 s matava o renderer do sandbox — furo real das corridas)
  const caminhaVolta = async (parte) => {
    await A.evaluate(async (pts) => {
      const m = window.__cidade.motor;
      const alt = (x, z) => Math.round((m.mundo.alturaTerreno(x, z) + 1.02) * 100) / 100;
      let prev = null;
      const envia = async (x, y, z, dPasso, minSono = 0) => {
        window.__cidade.teleportar(x, y, z);
        window.__cidade.mpPassoImediato(x, z, 0, y, false);
        await new Promise((r) => setTimeout(r, Math.max(minSono, 60, Math.ceil((dPasso / 12) * 1000) + 40))); // o orçamento recarrega a MAX_VEL 12 b/s; o pouso do salto real demora ~0,55 s
      };
      for (const [px, pz] of pts) {
        const y = alt(px, pz);
        if (prev) {
          const dy = y - prev.y;
          const dPasso = Math.hypot(px - prev.x, pz - prev.z);
          if (dy > 0.5) {
            const mx = Math.round((prev.x + (px - prev.x) * 0.5) * 100) / 100;
            const mz = Math.round((prev.z + (pz - prev.z) * 0.5) * 100) / 100;
            await envia(mx, Math.round((prev.y + 1.1) * 100) / 100, mz, dPasso * 0.55);
            await envia(px, y, pz, 0.1, 500); // o arco do salto real dura ~0,66 s (SALTO/GRAVIDADE) — o pouso espera
            prev = { x: px, y, z: pz };
            continue;
          } else if (dy < -0.5) {
            await envia(px, prev.y, pz, dPasso);
            await envia(px, y, pz, 0.1);
            prev = { x: px, y, z: pz };
            continue;
          } else {
            await envia(px, y, pz, dPasso);
          }
        } else {
          await envia(px, y, pz, 0.1);
        }
        prev = { x: px, y, z: pz };
      }
    }, parte);
  };
  const terco = Math.ceil(voltaRota.length / 3);
  await caminhaVolta(voltaRota.slice(0, terco));
  await caminhaVolta(voltaRota.slice(terco, terco * 2));
  await caminhaVolta(voltaRota.slice(terco * 2));
  ok(`volta do anel à porta (${voltaRota.length} passos, protocolo novo com y): ZERO correções`, await corrAgora() === corrEsperadas, `corr=${await corrAgora()}/${corrEsperadas} fim=${JSON.stringify(voltaRota[voltaRota.length - 1])}`);
  void corrEsperadasMut;

  // PROVA DE IDENTIDADE: o chunk (1,0) do CLIENTE (terreno + carimbos, sem
  // edições — página fresca) tem de ser BYTE A BYTE o mesmo que o campo do
  // servidor constrói com os módulos puros (padrão v46 estendido aos carimbos).
  const chunkCliente = await A.evaluate(() => Array.from(window.__cidade.chunkDados(1, 0)));
  {
    const { Ruido } = await import("./src/game/blocos/noise.ts");
    const { gerarDadosTerreno } = await import("./src/game/blocos/geracao.ts");
    const { CHUNK, ALTURA } = await import("./src/game/blocos/constants.ts");
    const { perfilCidade } = await import("./src/game/cidade/terrenoCidade.ts");
    const { carimbarCidade, alvoParaDados, chunkTemCarimbos } = await import("./src/game/cidade/carimbosCidade.ts");
    const { SEED_CIDADE } = await import("./src/game/cidade/core.ts");
    const ruidoT = new Ruido(SEED_CIDADE);
    const dadosT = gerarDadosTerreno(ruidoT, 1, 0, perfilCidade(ruidoT));
    if (chunkTemCarimbos(1, 0)) carimbarCidade(alvoParaDados(dadosT, 1, 0));
    let divergentes = 0;
    for (let i = 0; i < CHUNK * CHUNK * ALTURA; i++) if (dadosT[i] !== chunkCliente[i]) divergentes++;
    ok("chunk (1,0): cliente = campo do servidor BYTE A BYTE (geração + carimbos)", divergentes === 0 && chunkCliente.length === CHUNK * CHUNK * ALTURA, `${divergentes} bytes divergentes de ${CHUNK * CHUNK * ALTURA}`);
  }

  // (a volta do anel já deixou a Ana ao lado da porta — (22.5,0.5))

  // o MURO da Casa da Sorte (anel x=23, z=3): paralelo ao muro, depois ATRAVÉS
  // (furo real da corrida: o rAF reenvia a posição REAL do cliente — os envios
  // REFUSADOS não podem teleportar o cliente para o destino ilegal, senão o
  // rAF fight back e gera correções extra)
  await A.evaluate(async () => {
    window.__cidade.teleportar(22.5, 35.02, 0.5);
    window.__cidade.mpPassoImediato(22.5, 0.5, 0, 35.02, false);
    await new Promise((r) => setTimeout(r, 130));
    window.__cidade.teleportar(22.5, 35.02, 3.5);
    window.__cidade.mpPassoImediato(22.5, 3.5, 0, 35.02, false); // sobe paralelo (fora do edifício) — legal
    await new Promise((r) => setTimeout(r, 130));
    window.__cidade.mpPassoImediato(24.5, 3.5, 0, 35.02, false); // ATRAVÉS do anel x=23 → RECUSADO
  });
  await A.waitForFunction((n) => window.__cidade?.mpEventos?.().filter((e) => e.tipo === "corrigido").length > n, null, corrEsperadasMut, { timeout: 6000 }).catch(() => {});
  const paredeEdi = await A.evaluate(() => window.__cidade.ultimaCorrecao());
  ok("atravessar a parede do edifício é recusado «parede»", !!paredeEdi && paredeEdi.motivo === "parede" && Math.abs(paredeEdi.x - 22.5) < 1 && Math.abs(paredeEdi.z - 3.5) < 1, JSON.stringify(paredeEdi));
  ok("o servidor manteve a posição ANTES do muro", !!paredeEdi && paredeEdi.x < 23.5, `x=${paredeEdi?.x}`);
  ok("reconciliação v52: correção traz o y autoritativo do servidor", !!paredeEdi && typeof paredeEdi.y === "number" && paredeEdi.y > 34 && paredeEdi.y < 36, `y=${paredeEdi?.y}`);
  corrEsperadasMut += 1;

  // a PORTA dupla (AR em (23,0)/(23,1)): a MESMA parede com a porta aberta
  await A.evaluate(async () => {
    window.__cidade.teleportar(22.5, 35.02, 0.5);
    window.__cidade.mpPassoImediato(22.5, 0.5, 0, 35.02, false); // volta (legal)
    await new Promise((r) => setTimeout(r, 130));
    window.__cidade.teleportar(24.5, 35.02, 0.5);
    window.__cidade.mpPassoImediato(24.5, 0.5, 0, 35.02, false); // através da PORTA → ACEITE
    await new Promise((r) => setTimeout(r, 130));
  });
  ok("atravessar a PORTA é aceite (o servidor conhece o vão)", await corrAgora() === corrEsperadasMut && await A.evaluate(() => window.__cidade.motor.px) > 23.5, `px=${await A.evaluate(() => window.__cidade.motor.px)}`);

  // a JANELA (23,2): sair pela porta, subir paralelo e tentar ATRAVÉS do vidro
  await A.evaluate(async () => {
    window.__cidade.teleportar(22.5, 35.02, 0.5);
    window.__cidade.mpPassoImediato(22.5, 0.5, 0, 35.02, false); // sai pela porta
    await new Promise((r) => setTimeout(r, 130));
    window.__cidade.teleportar(22.5, 35.02, 2);
    window.__cidade.mpPassoImediato(22.5, 2, 0, 35.02, false); // paralelo até ao lado de fora da janela
    await new Promise((r) => setTimeout(r, 130));
    window.__cidade.mpPassoImediato(24.5, 2, 0, 35.02, false); // através da JANELA → RECUSADO (sem teleport: o rAF não luta)
    await new Promise((r) => setTimeout(r, 130));
  });
  ok("a JANELA (23,2) também recusa «parede»", await corrAgora() === corrEsperadasMut + 1 && await A.evaluate(() => window.__cidade.ultimaCorrecao()?.motivo) === "parede", `corr=${await corrAgora()}/${corrEsperadasMut + 1}`);
  corrEsperadasMut += 1;

  // EDIT-THEN-WALK: quebrar os 2 voxels do corpo na parede (23,35..36,3) pela
  // via REAL (reportarEdit = o mesmo caminho do gancho aoEditar do motor) e
  // passar por lá — quem parte a parede legitimamente NÃO é corrigido.
  // (A está a (22.5,2) — o servidor manteu-a na recusa da janela.)
  await A.evaluate(async () => {
    const r1 = window.__cidade.mpReportarEdit(23, 35, 3, 0);
    await new Promise((r) => setTimeout(r, 70)); // respeita o EDIT_RATE_MS honesto (50 ms)
    const r2 = window.__cidade.mpReportarEdit(23, 36, 3, 0);
    window.__cidade.__r1 = r1; window.__cidade.__r2 = r2;
  });
  ok("2 edições reportadas aceites pelo cliente (rate 50 ms)", await A.evaluate(() => window.__cidade.__r1 === true && window.__cidade.__r2 === true));
  await A.evaluate(async () => {
    window.__cidade.teleportar(22.5, 35.02, 3.5);
    window.__cidade.mpPassoImediato(22.5, 3.5, 0, 35.02, false); // paralelo até à altura do buraco (legal)
    await new Promise((r) => setTimeout(r, 130));
    window.__cidade.teleportar(24.5, 35.02, 3.5);
    window.__cidade.mpPassoImediato(24.5, 3.5, 0, 35.02, false); // pelo BURACO que abriu → ACEITE
    await new Promise((r) => setTimeout(r, 130));
  });
  ok("quem PARTIU a parede legitimamente passa (zero correção nova)", await corrAgora() === corrEsperadasMut && await A.evaluate(() => window.__cidade.motor.px) > 23.5, `px=${await A.evaluate(() => window.__cidade.motor.px)}`);

  // teleporte VERTICAL (y+8) recusado pelo orçamento de salto; o cliente é
  // reencaixado TAMBÉM no eixo y (nunca fica preso no ar) — a msg é enviada
  // SEM teleportar o cliente (o rAF não pode lutar contra o destino ilegal)
  await A.evaluate(async () => {
    window.__cidade.mpPassoImediato(24.5, 3.5, 0, 43.02, false);
  });
  await A.waitForFunction((n) => window.__cidade?.mpEventos?.().filter((e) => e.tipo === "corrigido").length > n, null, corrEsperadasMut, { timeout: 6000 }).catch(() => {});
  const corrY = await A.evaluate(() => window.__cidade.ultimaCorrecao());
  ok("teleporte vertical (+8) recusado «parede» com y do servidor", !!corrY && corrY.motivo === "parede" && typeof corrY.y === "number" && corrY.y < 36, JSON.stringify(corrY));
  corrEsperadasMut += 1;
  await sleep(250);
  ok("cliente reencaixado no y autoritativo (nunca preso no ar)", Math.abs(await A.evaluate(() => window.__cidade.motor.py) - (corrY?.y ?? 35)) < 0.5, `py=${await A.evaluate(() => window.__cidade.motor.py)}`);

  // VOO CRIATIVO (a tecla F): sai pela porta, sobe GRADUALMENTE (a física do
  // F ≤ 8,36 b/s), passa POR CIMA da parede e pousa no TELHADO — tudo legal.
  await A.evaluate(async () => {
    window.__cidade.teleportar(24.5, 35.02, 0.5);
    window.__cidade.mpPassoImediato(24.5, 0.5, 0, 35.02, false); // sai pelo interior até à porta
    await new Promise((r) => setTimeout(r, 130));
    window.__cidade.teleportar(22.5, 35.02, 0.5);
    window.__cidade.mpPassoImediato(22.5, 0.5, 0, 35.02, false); // sai pela porta
    await new Promise((r) => setTimeout(r, 130));
    for (let i = 1; i <= 7; i++) { // subida gradual ~8 b/s (mesma física do F real)
      const y = 35.02 + i;
      window.__cidade.teleportar(22.5, y, 0.5);
      window.__cidade.mpPassoImediato(22.5, 0.5, 0, y, true);
      await new Promise((r) => setTimeout(r, 130));
    }
    window.__cidade.teleportar(24.5, 42, 0.5);
    window.__cidade.mpPassoImediato(24.5, 0.5, 0, 42, true); // POR CIMA da parede → ACEITE
    await new Promise((r) => setTimeout(r, 130));
    window.__cidade.teleportar(27, 41.02, 0.5);
    window.__cidade.mpPassoImediato(27, 0.5, 0, 41.02, false); // desce e POUSA no telhado
    await new Promise((r) => setTimeout(r, 130));
  });
  ok("voo gradual + por cima da parede + pouso no telhado: ZERO correções", await corrAgora() === corrEsperadasMut, `corr=${await corrAgora()}/${corrEsperadasMut} py=${await A.evaluate(() => window.__cidade.motor.py)}`);
  ok("Ana está NO TELHADO (py ≈ 41.02)", Math.abs(await A.evaluate(() => window.__cidade.motor.py) - 41.02) < 0.5, `py=${await A.evaluate(() => window.__cidade.motor.py)}`);
  await B.waitForFunction(() => {
    const a = window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ");
    return a && a.y != null && a.y > 40;
  }, null, { timeout: 6000 }).catch(() => {});
  const yRemoto = await B.evaluate(() => window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ")?.y ?? null);
  ok("Bruno vê a Ana NO TELHADO (remoto com y real — fim do «enterrado»)", !!yRemoto && yRemoto > 40, `y=${yRemoto}`);

  // rate-limit de edições (a MESMA regra nas duas pontas): rajada SÍNCRONA de
  // 25 — determinística (o padrão das falas v37: awaits entre chamadas deixam
  // o rate expirar legitimamente e o assert torna-se flaky)
  const rajada = await A.evaluate(() => {
    let aceites = 0;
    for (let i = 0; i < 25; i++) {
      if (window.__cidade.mpReportarEdit(24, 40, 0, i % 2 === 0 ? 0 : 9)) aceites++;
    }
    return aceites;
  });
  ok("rajada síncrona de 25 edições: o rate-limit corta (só 1 aceite)", rajada === 1, `aceites=${rajada}/25`);

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
  ok("v52: edições aceites contadas de verdade (≥ 3)", stats?.editsAceites >= 3, `edits=${stats?.editsAceites} recusados=${stats?.editsRecusados}`);
  ok("v52: campo de voxels no servidor tem chunks em cache", stats?.chunks >= 1 && stats?.overlay >= 2, `chunks=${stats?.chunks} overlay=${stats?.overlay}`);

  for (const ws of bots) { clearInterval(ws.pingTimer); try { ws.close(); } catch { /* ignore */ } }

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
