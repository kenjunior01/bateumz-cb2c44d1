// ============================================================
// E2E — v32 (aparado na v41): SABORES DO MUNDO (TheMealDB)
// A parte PESCA+ARANHA foi REFORMADA com o BateuCraft (substituído pelo
// BATEU RPG na v41) — as suas afirmações vivem agora em test-rpg-v41.mjs.
// · Vara de Pesca (receita + fundição de peixe)
// · Pesca: lançar → esperar → picada → fisgar (3 peixes reais)
//   · recolher · escapou · sem água · comer peixe
// · Aranha: hostil à noite (dano + drop fio), NEUTRA de dia,
//   não desaparece ao amanhecer (diferente do zumbi)
// · Conquistas: tecelão + pescador + aracnólogo (+save)
// · Sabores do Mundo: foto real, 4 regiões reais, revelação,
//   link da receita, erro honesto, cache, catálogo LiveHub
// Mocks determinísticos + smoke REAL da TheMealDB (200 + CORS *
// validados com curl antes do código; SKIP honesto se a rede cair).
// Uso: PW_CHROME=<chromium> node test-v32-pesca-sabores.mjs (vite 8099)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0, skipped = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};
const skip = (name) => { skipped++; console.log(`  ⏭️  ${name} (SKIP honesto)`); };

const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "WebGL", "THREE", "shader",
];

// PNG 1×1 para as fotos mockadas
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const AREAS_MOCK = {
  meals: [{ strArea: "Portuguese" }, { strArea: "Japanese" }, { strArea: "Mexican" }, { strArea: "Indian" }, { strArea: "Italian" }, { strArea: "Chinese" }],
};
const MEAL_A = {
  meals: [{ idMeal: "test-1", strMeal: "Prato Mock A (E2E)", strMealThumb: "https://mock.test/a.png", strArea: "Portuguese", strCategory: "Seafood" }],
};
const MEAL_B = {
  meals: [{ idMeal: "test-2", strMeal: "Prato Mock B (E2E)", strMealThumb: "https://mock.test/b.png", strArea: "Japanese", strCategory: "Seafood" }],
};

async function mockMealDB(page) {
  await page.route(/themealdb\.com\/api\/json\/v1\/1\/list\.php\?a=list/, (route) =>
    route.fulfill({ json: AREAS_MOCK }));
  await page.route(/themealdb\.com\/api\/json\/v1\/1\/random\.php/, (route) => {
    const n = Math.floor(page.__mealCount = (page.__mealCount ?? 0) + 1);
    route.fulfill({ json: n % 2 === 1 ? MEAL_A : MEAL_B });
  });
  await page.route(/mock\.test\//, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG_1PX }));
  await page.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));
}

async function main() {
  console.log(`\n🍤 v32 (aparado v41) — SABORES DO MUNDO — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); // usada só pelos mocks partilhados

  // ═══════════════ PARTE B — SABORES DO MUNDO (TheMealDB) ═══════════════
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs2 = [];
  page2.on("pageerror", (e) => errs2.push(String(e)));
  page2.on("console", (m) => { if (m.type() === "error") errs2.push(m.text()); });
  await mockMealDB(page2);

  await page2.goto(`${BASE}/lives?game=sabores`, { waitUntil: "domcontentloaded" });
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-stage"], [data-testid="sabores-error"], [data-testid="sabores-loading"]'), null, { timeout: 20000 });
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-options"]'), null, { timeout: 15000 });
  console.log("\n🍤 Sabores do Mundo — ronda 1");

  ok("foto real renderizada (naturalWidth > 0)", await page2.evaluate(() => {
    const img = document.querySelector('[data-testid="sabores-photo"]');
    return !!img && img.naturalWidth > 0;
  }));
  const opcoes = await page2.evaluate(() =>
    [...document.querySelectorAll('[data-testid="sabores-options"] button')].map((b) => b.textContent.trim()));
  ok("4 opções de regiões", opcoes.length === 4);
  ok("exatamente 1 opção correta (Portuguese)", opcoes.filter((o) => o === "Portuguese").length === 1);
  ok("marcador de pontos visível", await page2.evaluate(() => !!document.querySelector('[data-testid="sabores-scorebar"]')));

  // acertar
  await page2.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-testid="sabores-options"] button')];
    btns.find((b) => b.textContent.trim() === "Portuguese")?.click();
  });
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-reveal"]'), null, { timeout: 8000 });
  const revela1 = await page2.evaluate(() => ({
    texto: document.querySelector('[data-testid="sabores-reveal"]')?.textContent ?? "",
    link: document.querySelector('[data-testid="sabores-receita"]')?.getAttribute("href") ?? "",
    atribuicao: document.querySelector('[data-testid="sabores-attribution"]')?.textContent ?? "",
  }));
  ok("revelação: Acertou! com nome do prato", revela1.texto.includes("Acertou") && revela1.texto.includes("Prato Mock A"));
  ok("link da receita oficial (meal.php?i=test-1)", revela1.link.includes("themealdb.com/meal.php?i=test-1"));
  ok("atribuição TheMealDB visível", revela1.atribuicao.includes("TheMealDB"));
  const pontos1 = await page2.evaluate(() => document.querySelector('[data-testid="sabores-scorebar"]')?.textContent ?? "");
  ok("pontos acumulam no acerto", /Pontos\s*([1-9]\d*)/.test(pontos1));

  // próxima ronda (meal B) e errar de propósito
  await page2.evaluate(() => document.querySelector('[data-testid="sabores-next"]')?.click());
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-options"]'), null, { timeout: 10000 });
  const opcoes2 = await page2.evaluate(() =>
    [...document.querySelectorAll('[data-testid="sabores-options"] button')].map((b) => b.textContent.trim()));
  const errada = opcoes2.find((o) => o !== "Japanese");
  await page2.evaluate((e) => {
    const btns = [...document.querySelectorAll('[data-testid="sabores-options"] button')];
    btns.find((b) => b.textContent.trim() === e)?.click();
  }, errada);
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-reveal"]'), null, { timeout: 8000 });
  const revela2 = await page2.evaluate(() => document.querySelector('[data-testid="sabores-reveal"]')?.textContent ?? "");
  ok("erro honesto na resposta errada (Era Japanese!)", revela2.includes("Era Japanese!"));
  const seqZero = await page2.evaluate(() => document.querySelector('[data-testid="sabores-scorebar"]')?.textContent ?? "");
  ok("sequência zera no erro", /Sequência\s*0/.test(seqZero));

  // erro honesto de rede + recuperação (abort instalado ANTES do clique — sem corrida)
  await page2.unroute(/themealdb\.com\/api\/json\/v1\/1\/random\.php/);
  await page2.route(/themealdb\.com\/api\/json\/v1\/1\/random\.php/, (route) => route.abort("connectionrefused"));
  await page2.evaluate(() => document.querySelector('[data-testid="sabores-next"]')?.click());
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-error"]'), null, { timeout: 15000 });
  const erroTxt = await page2.evaluate(() => document.querySelector('[data-testid="sabores-error"]')?.textContent ?? "");
  ok("erro honesto de rede com Tentar novamente", erroTxt.includes("indisponível") && erroTxt.includes("Tentar novamente"));
  await page2.unroute(/themealdb\.com\/api\/json\/v1\/1\/random\.php/);
  await mockMealDB(page2);
  // recuperação com tolerância a corrida do abort em voo (até 3 tentativas)
  let recuperou = false;
  for (let i = 0; i < 3 && !recuperou; i++) {
    await page2.waitForTimeout(400); // deixa a promessa abortada assentar
    await page2.evaluate(() => document.querySelector('[data-testid="sabores-error"] button')?.click());
    try {
      await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-options"]'), null, { timeout: 8000 });
      recuperou = true;
    } catch { /* tentar de novo */ }
  }
  ok("recuperação após Tentar novamente", recuperou);

  // cache local do prato visto (honestidade da fonte)
  ok("cache local bateu-meals-v1:test-1", await page2.evaluate(() => !!localStorage.getItem("bateu-meals-v1:test-1")));

  // catálogo LiveHub mostra o jogo
  await page2.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(1200);
  const catalogo = await page2.evaluate(() => document.body.textContent.includes("Sabores do Mundo"));
  ok("catálogo LiveHub lista Sabores do Mundo", catalogo);

  // mobile 375 sem overflow no jogo
  await page2.setViewportSize({ width: 375, height: 700 });
  await page2.goto(`${BASE}/lives?game=sabores`, { waitUntil: "domcontentloaded" });
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-options"], [data-testid="sabores-error"]'), null, { timeout: 15000 });
  const overflowW2 = await page2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("mobile 375 px sem overflow no Sabores", overflowW2 <= 2);

  const errs2Reais = errs2.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("sem erros de consola reais (parte B)", errs2Reais.length === 0);
  if (errs2Reais.length) console.log("   ⚠️", errs2Reais.slice(0, 3));

  // ── Smoke REAL da TheMealDB (sem mocks) ──
  const page3 = await browser.newPage({ viewport: { width: 900, height: 600 } });
  try {
    const smoke = await Promise.race([
      page3.evaluate(async () => {
        const r1 = await fetch("https://www.themealdb.com/api/json/v1/1/random.php", { cache: "no-store" });
        const j1 = await r1.json();
        const r2 = await fetch("https://www.themealdb.com/api/json/v1/1/list.php?a=list", { cache: "no-store" });
        const j2 = await r2.json();
        return { prato: j1?.meals?.[0]?.strMeal ?? "", areas: (j2?.meals ?? []).length };
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000)),
    ]);
    if (smoke.prato && smoke.areas >= 20) {
      ok(`smoke REAL TheMealDB: prato "${smoke.prato.slice(0, 30)}" + ${smoke.areas} regiões`, true);
    } else {
      skip(`smoke REAL TheMealDB (resposta inesperada: ${JSON.stringify(smoke).slice(0, 60)})`);
    }
  } catch (e) {
    skip(`smoke REAL TheMealDB (${String(e).slice(0, 50)})`);
  }
  await page3.close();

  await page2.close();
  await browser.close();

  console.log(`\n══════════════════════════════════════`);
  console.log(`✅ ${passed} passaram · ❌ ${failed} falharam · ⏭️ ${skipped} skip`);
  if (fails.length) console.log("FALHAS:\n - " + fails.join("\n - "));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
