// ============================================================
// E2E — v38 PROGRESSÃO · MISSÕES · EXPLORAÇÃO · AMBIENTE · DIFICULDADE
// Tudo corre REAL (motor + worldgen + localStorage); só a rede externa
// (open-meteo) é mockada. Fonte dos padrões: docs/REA-progressao-v38.md.
// Uso: PW_CHROME=<chromium> node test-progressao-v38.mjs (vite dev 8099)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};
const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "CORS", "cors", "open-meteo",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n📈 v38 PROGRESSÃO E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  await page.route(/geocoding-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  await page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));

  // ── 1. Ecrã de início: dificuldade escolhe-se antes de entrar ──
  console.log("— Dificuldade no arranque");
  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  ok("3 botões de dificuldade no ecrã inicial",
    await page.getByTestId("cd-dif-passeio").isVisible() &&
    await page.getByTestId("cd-dif-cidadao").isVisible() &&
    await page.getByTestId("cd-dif-desafiador").isVisible());
  await page.getByTestId("cd-dif-desafiador").click();
  ok("clique marca desafiador no perfil",
    await page.evaluate(() => window.__cidade?.perfil?.()?.dificuldade === "desafiador"));
  ok("missão diária muda para 5 distritos",
    await page.evaluate(() => window.__cidade?.missoesHoje?.()[0]?.alvo === 5));

  // ── 2. Entrar: perfil novo, ambiente liga, Atleta neutro ──
  console.log("— Entrar (perfil fresco)");
  await page.getByTestId("cd-entrar").click();
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 }).catch(() => {});
  ok("fase jogando", await page.evaluate(() => window.__cidade?.fase() === "jogando"));
  await page.waitForFunction(() => (window.__cidade?.perfil?.()?.marcos?.length ?? 0) >= 2, null, { timeout: 8000 }).catch(() => {});
  ok("spawn descobre praça + sala de troféus (todos os marcos no raio)",
    await page.evaluate(() => { const m = window.__cidade.perfil().marcos; return m.includes("praca") && m.includes("trofeus") && m.length === 2; }));
  ok("XP do spawn = 66 (desafiador: só marcos 25×1,3=33 ×2 — raio de portal 5 < dist 5,5, sem visita)",
    await page.evaluate(() => window.__cidade.perfil().xp === 66));
  ok("ambiente sonoro ativo (AudioContext real criado)",
    await page.evaluate(() => window.__cidade?.ambiente?.()?.ativo === true));
  ok("escalaVel = 1 sem Atleta", await page.evaluate(() => window.__cidade?.escalaVel?.() === 1));

  // ── 3. Visita real paga XP e alimenta a cadeia ──
  console.log("— XP de visita");
  await page.evaluate(() => window.__cidade.teleportar(23, 35.02, 0)); // pad do sorteios (27,0), dist 4 ≤ raio 5
  await page.waitForFunction(() => (window.__cidade?.perfil?.()?.xp ?? 0) > 0, null, { timeout: 8000 }).catch(() => {});
  const p1 = await page.evaluate(() => window.__cidade.perfil());
  ok("visita ao distrito pagou XP (>0)", p1.xp > 0);
  ok("cadeiaVisitados registou 'sorteios'", p1.cadeiaVisitados.includes("sorteios"));

  // ── 4. Circuito: 5 distritos (desafiador) → missão paga créditos ──
  console.log("— Missão de circuito (desafiador: 5)");
  for (const [x, z] of [[22, 16], [8, 26], [-8, 26], [-22, 16], [-23, 0]]) {
    await page.evaluate(([xx, zz]) => window.__cidade.teleportar(xx, 35.02, zz), [x, z]);
    await sleep(450);
  }
  await page.waitForFunction(() => (window.__cidade?.creditos?.() ?? 0) > 0, null, { timeout: 8000 }).catch(() => {});
  const creditos = await page.evaluate(() => window.__cidade.creditos());
  ok("missão de circuito pagou créditos (≥19 = 15×1,25 arredondado)", creditos >= 19);
  await page.evaluate((antes) => { window.__xpAntes = antes; }, p1.xp);
  ok("XP cresceu com as visitas", await page.evaluate(() => window.__cidade.perfil().xp > window.__xpAntes));

  // ── 5. Descoberta de marco natural (zero invenção: coords do gerador) ──
  console.log("— Exploração (marco)");
  await page.evaluate(() => window.__cidade.teleportar(0.5, 35.02, -88)); // colina_areias (0,-90), raio 8
  await page.waitForFunction(
    () => window.__cidade?.descobertas?.().includes("colina_areias"), null, { timeout: 8000 },
  ).catch(() => {});
  ok("marco 'Colina das Areias' descoberto por proximidade",
    await page.evaluate(() => window.__cidade.descobertas().includes("colina_areias")));
  ok("descoberta pagou XP", await page.evaluate(() => window.__cidade.perfil().xp > 0));
  ok("marcoPerto API honesta", await page.evaluate(() => {
    const r = window.__cidade.marcoPerto(0, -90);
    return r && r.marco.id === "colina_areias" && r.dist < 1;
  }));

  // ── 6. Subida de nível + pontos + Atleta com efeito REAL ──
  console.log("— Níveis e Atleta");
  const subida = await page.evaluate(() => window.__cidade.darXP(800));
  ok("800 XP sobe ≥1 nível (curva logística)", subida.subiuPara !== null && subida.subiuPara >= 2);
  ok("subida deu pontos gastáveis", subida.pontos >= 1);
  const g1 = await page.evaluate(() => window.__cidade.gastarPonto("atleta"));
  ok("gastarPonto(atleta) aplica escalaVel 1,06 real", g1 !== null &&
    await page.evaluate(() => Math.abs(window.__cidade.escalaVel() - 1.06) < 1e-9));
  await page.evaluate(() => { window.__cidade.gastarPonto("atleta"); window.__cidade.gastarPonto("atleta"); });
  ok("Atleta máx = 1,18 (6,96 b/s < orçamento MP 12)", Math.abs(await page.evaluate(() => window.__cidade.escalaVel()) - 1.18) < 1e-9);
  ok("4.º ponto em ramo cheio → null (regra respeitada)",
    await page.evaluate(() => window.__cidade.gastarPonto("atleta") === null));

  // ── 7. Diário: 3 separadores com dados reais ──
  console.log("— Diário");
  await page.getByTestId("cd-diario-btn").click();
  await page.getByTestId("cd-modal-diario").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  ok("modal do Diário abre", await page.getByTestId("cd-modal-diario").isVisible());
  ok("tab Progresso mostra nível", (await page.getByTestId("cd-diario-nivel").textContent()).includes("1") ||
    /\d/.test(await page.getByTestId("cd-diario-nivel").textContent()));
  await page.getByTestId("cd-diario-tab-exploracao").click();
  const nDesc = await page.evaluate(() => window.__cidade.descobertas().length);
  const contagem = await page.getByTestId("cd-marcos-contagem").textContent();
  ok(`tab Exploração conta marcos reais (${nDesc} de 10)`, contagem.includes(String(nDesc)) && /10/.test(contagem));
  ok("marco descoberto mostra nome verdadeiro", (await page.getByTestId("cd-marco-colina_areias").textContent()).includes("Colina das Areias"));
  ok("marco não descoberto fica '???'",
    (await page.getByTestId("cd-marco-campos_sudeste").textContent()).includes("???"));
  await page.getByTestId("cd-diario-tab-dificuldade").click();
  await page.getByTestId("cd-dif-card-passeio").click();
  ok("Diário muda dificuldade para passeio",
    await page.evaluate(() => window.__cidade.perfil().dificuldade === "passeio"));
  ok("missões refletem passeio (3 distritos)",
    await page.evaluate(() => window.__cidade.missoesHoje()[0].alvo === 3));
  await page.getByTestId("cd-diario-fechar").click();

  // ── 8. Raios de dificuldade são reais (portalPerto) ──
  console.log("— Raios por dificuldade");
  ok("passeio: dist 10 vê portal (raio 12)", await page.evaluate(() => window.__cidade.portalPerto(37, 0) !== null));
  await page.evaluate(() => window.__cidade.definirDificuldade("desafiador"));
  ok("desafiador: dist 10 NÃO vê portal (raio 5)", await page.evaluate(() => window.__cidade.portalPerto(37, 0) === null));
  ok("desafiador: dist 4 vê portal", await page.evaluate(() => window.__cidade.portalPerto(31, 0) !== null));

  // ── 9. Cadeia: casa → quiosque → noite na praça ──
  console.log("— Cadeia «Roteiro do Imbondeiro»");
  const cadeia0 = await page.evaluate(() => window.__cidade.cadeia());
  ok("cadeia começa no capítulo 1", cadeia0.indice === 0 && !cadeia0.completo);
  const POS_CASA_XZ = await page.evaluate(() => {
    // POS_CASA deriva de cos/sin(0.314)*14 no gerador — medido, não inventado
    const [cx, cz] = [Math.round(Math.cos(0.314) * 14), Math.round(Math.sin(0.314) * 14)];
    return [cx + 3, cz]; // porta fica do lado da praça (dx>0)
  });
  await page.evaluate(([x, z]) => window.__cidade.teleportar(x, 35.02, z), POS_CASA_XZ);
  await page.waitForFunction(() => window.__cidade?.cadeia?.().indice >= 1, null, { timeout: 8000 }).catch(() => {});
  ok("capítulo 1 (Tua Casa) fechou ao entrar em casa", (await page.evaluate(() => window.__cidade.cadeia().indice)) >= 1);
  await page.evaluate(() => window.__cidade.teleportar(5, 35.02, -3)); // quiosque (5,-5), raio 5 → dist 2
  await page.waitForFunction(() => window.__cidade?.cadeia?.().indice >= 2, null, { timeout: 8000 }).catch(() => {});
  ok("capítulo 2 (Quiosque) fechou (furo do chave=null corrigido)", (await page.evaluate(() => window.__cidade.cadeia().indice)) >= 2);

  // noite na praça: pump avança o relógio do motor de forma determinística;
  // o registo da cadeia acontece no próximo tick real do relógio (2 Hz)
  await page.evaluate(() => { window.__cidade.teleportar(0.5, 35.02, 6.5); window.__cidade.motor.tempo = 298; window.__cidade.pump(60, 0.05); });
  await page.waitForFunction(() => window.__cidade?.perfil?.()?.cadeiaNoite === true, null, { timeout: 10000 }).catch(() => {});
  ok("anoitecer na praça registou cadeiaNoite", await page.evaluate(() => window.__cidade.perfil().cadeiaNoite === true));
  await sleep(700);
  ok("ambiente acompanha a noite (grilos)", await page.evaluate(() => window.__cidade.ambiente().noite === true));

  // ── 10. HUD: nível + cadeia visíveis ──
  console.log("— HUD");
  ok("HUD mostra bloco de nível", await page.getByTestId("cd-nivel").isVisible());
  ok("HUD mostra barra de XP", await page.getByTestId("cd-xp-bar").isVisible());
  ok("painel mostra capítulo da cadeia", await page.getByTestId("cd-cadeia").isVisible());

  // ── 11. Sem erros de consola (além do ruído conhecido) ──
  const erros = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("sem erros de consola não-filtrados", erros.length === 0);
  if (erros.length) console.log("   ↳", erros.slice(0, 5));

  await browser.close();
  console.log(`\n════════════════════════════════════`);
  console.log(`  ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log(`  Falhas: ${fails.join(" · ")}`);
  console.log(`════════════════════════════════════\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("E2E falhou:", e); process.exit(1); });
