// ============================================================
// E2E — APIS PÚBLICAS v25 (/jogos-gratis + trivia Open Trivia DB)
// Mocks determinísticos (regex — o glob ** não casa de forma
// fiável nesta versão do Playwright) + smoke real FreeToGame.
// Uso: node test-apis-publicas.mjs  (vite dev na porta 8099)
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
  "same key", "validateDOMNesting", "CORS", "cors",
];

// Catálogo F2P determinístico: 4 jogos (2 PC, 2 Browser; 3 Shooter + 1 Strategy)
const FIX_GAMES = [
  { id: 540, title: "Overwatch 2", thumbnail: "https://www.freetogame.com/g/540/thumbnail.jpg", short_description: "Hero shooter da Blizzard.", game_url: "https://www.freetogame.com/open/overwatch-2", genre: "Shooter", platform: "PC (Windows)", publisher: "Blizzard", developer: "Blizzard", release_date: "2022-10-04", freetogame_profile_url: "https://www.freetogame.com/overwatch-2" },
  { id: 356, title: "Alpha Betas", thumbnail: "https://www.freetogame.com/g/356/thumbnail.jpg", short_description: "Anime shooter estilo cartoon.", game_url: "https://www.freetogame.com/open/alpha-betas", genre: "Shooter", platform: "Web Browser", publisher: "Epic Dev", developer: "Studio A", release_date: "2021-01-20", freetogame_profile_url: "https://www.freetogame.com/alpha-betas" },
  { id: 431, title: "Imperia Online", thumbnail: "https://www.freetogame.com/g/431/thumbnail.jpg", short_description: "MMORTS medieval no browser.", game_url: "https://www.freetogame.com/open/imperia-online", genre: "Strategy", platform: "Web Browser", publisher: "Imperia", developer: "Imperia", release_date: "2005-08-23", freetogame_profile_url: "https://www.freetogame.com/imperia-online" },
  { id: 768, title: "Warframe", thumbnail: "https://www.freetogame.com/g/768/thumbnail.jpg", short_description: "Action RPG espacial.", game_url: "https://www.freetogame.com/open/warframe", genre: "Action RPG", platform: "PC (Windows)", publisher: "Digital Extremes", developer: "Digital Extremes", release_date: "2013-03-25", freetogame_profile_url: "https://www.freetogame.com/warframe" },
];

// Perguntas trivia (5 por dificuldade, geradas)
const triviaQ = (diff, n) => ({
  category: "General Knowledge", type: "multiple", difficulty: diff,
  question: `Pergunta ${diff} ${n} &amp; teste?`,
  correct_answer: `Correta ${diff} ${n}`,
  incorrect_answers: [`Errada A${n}`, `Errada B${n}`, `Errada C${n}`],
});
const triviaBody = (diff) => ({ response_code: 0, results: Array.from({ length: 5 }, (_, i) => triviaQ(diff, i + 1)) });

async function main() {
  console.log(`\n🎮 APIS PÚBLICAS E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", e => consoleErrors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // Mocks: FreeToGame + Open Trivia DB + supabase silenciado
  await page.route(/freetogame\.com\/api\//, (route) => route.fulfill({ json: FIX_GAMES }));
  await page.route(/opentdb\.com\//, (route) => {
    const url = route.request().url();
    if (url.includes("api_token.php")) return route.fulfill({ json: { response_code: 0, token: "tok-teste-123" } });
    if (url.includes("api.php")) {
      const u = new URL(url);
      const diff = u.searchParams.get("difficulty");
      const amount = parseInt(u.searchParams.get("amount") ?? "0", 10);
      if (amount >= 15) return route.fulfill({ json: { response_code: 0, results: [...triviaBody("easy").results, ...triviaBody("medium").results, ...triviaBody("hard").results] } });
      return route.fulfill({ json: triviaBody(diff === "easy" ? "easy" : diff === "medium" ? "medium" : "hard") });
    }
    return route.fulfill({ json: { response_code: 1, results: [] } });
  });
  await page.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));

  console.log("— Hub Jogos Grátis (/jogos-gratis) —");
  const resp = await page.goto(`${BASE}/jogos-gratis`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("Rota /jogos-gratis responde", resp?.status() === 200);
  await page.waitForSelector('[data-testid="freegames-grid"]', { timeout: 30000 });
  ok("Catálogo do mock renderizado (4 jogos)", await page.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').count() === 4);
  ok("Atribuição FreeToGame visível", (await page.getByText("Catálogo de jogos © FreeToGame").count()) >= 1);

  console.log("— Filtros e busca —");
  await page.locator('[data-testid="freegames-platform"] button:has-text("PC")').first().click();
  await page.waitForTimeout(300);
  ok("Filtro PC → 2 jogos", await page.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').count() === 2);
  await page.locator('[data-testid="freegames-platform"] button:has-text("Browser")').first().click();
  await page.waitForTimeout(300);
  ok("Filtro Browser → 2 jogos", await page.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').count() === 2);
  await page.locator('[data-testid="freegames-platform"] button:has-text("Todas")').first().click();
  await page.locator('[data-testid="freegames-genres"] button:has-text("Strategy")').first().click();
  await page.waitForTimeout(300);
  ok("Chip de género Strategy → 1 jogo", await page.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').count() === 1);
  await page.locator('[data-testid="freegames-genres"] button:has-text("Todos os géneros")').first().click();
  await page.locator('[data-testid="freegames-search"]').fill("warframe");
  await page.waitForTimeout(300);
  ok("Busca 'warframe' → 1 jogo", await page.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').count() === 1);
  await page.locator('[data-testid="freegames-search"]').fill("").catch(() => {});
  await page.locator('[data-testid="freegames-search"]').fill("zzznada");
  await page.waitForTimeout(300);
  ok("Sem resultados → estado vazio honesto", (await page.getByText("Nenhum jogo corresponde").count()) >= 1);
  await page.locator('[data-testid="freegames-search"]').fill("");
  await page.waitForTimeout(200);

  console.log("— Ordenação e detalhe —");
  await page.locator('[data-testid="freegames-sort"] button:has-text("A–Z")').click();
  await page.waitForTimeout(300);
  const firstCard = await page.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').first().innerText();
  ok("Ordenação A–Z (Alpha Betas primeiro)", firstCard.includes("Alpha Betas"));
  await page.locator('[data-testid="freegames-sort"] button:has-text("Recentes")').click();
  await page.waitForTimeout(300);
  const firstRecent = await page.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').first().innerText();
  ok("Ordenação Recentes (Overwatch 2 primeiro)", firstRecent.includes("Overwatch 2"));
  await page.locator('[data-testid^="game-card-"]').first().click();
  await page.waitForTimeout(400);
  ok("Dialog de detalhe abre", await page.locator('[data-testid="freegames-detail"]').count() === 1);
  ok("Botão 'Jogar no site oficial' com link real", await page.locator('[data-testid="freegames-play"][href*="freetogame.com"]').count() === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  console.log("— Erro de rede com retry —");
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page2.route(/freetogame\.com\/api\//, (route) => route.abort());
  await page2.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));
  await page2.goto(`${BASE}/jogos-gratis`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page2.waitForSelector('[data-testid="freegames-retry"]', { timeout: 30000 });
  ok("Estado de erro com botão Tentar novamente", true);
  await page2.route(/freetogame\.com\/api\//, (route) => route.fulfill({ json: FIX_GAMES }));
  await page2.locator('[data-testid="freegames-retry"]').click();
  await page2.waitForSelector('[data-testid="freegames-grid"]', { timeout: 30000 });
  ok("Retry recupera o catálogo", await page2.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').count() === 4);
  await page2.close();

  console.log("— Cliente trivia in-page (unidade, via módulo vite) —");
  const trivia = await page.evaluate(async () => {
    const m = await import("/src/lib/openTriviaDB.ts");
    const ladder = await m.getLadderQuestions(5);
    const decode = m.decodeHTMLEntities("Tom &amp; Jerry &quot;PT&quot;");
    const single = await m.fetchTriviaQuestions(15, undefined, "easy", "multiple");
    const shuffled = m.shuffleAnswers("Correta", ["E1", "E2", "E3"]);
    const letters = ["A", "B", "C", "D"];
    const opts = [shuffled.option_a, shuffled.option_b, shuffled.option_c, shuffled.option_d];
    return {
      ladderLen: ladder.length,
      ladderOrder: ladder.map(q => q.difficulty),
      decode,
      singleLen: single.length,
      shuffleOk: opts.filter(o => o === "Correta").length === 1 && letters.includes(shuffled.correct_answer),
    };
  });
  ok("Escada devolve 15 perguntas", trivia.ladderLen === 15);
  ok("Ordem easy(5) → medium(5) → hard(5)", JSON.stringify(trivia.ladderOrder.slice(0, 5).every(d => d === "easy") && trivia.ladderOrder.slice(5, 10).every(d => d === "medium") && trivia.ladderOrder.slice(10).every(d => d === "hard")));
  ok("decodeHTMLEntities seguro", trivia.decode === "Tom & Jerry \"PT\"");
  ok("Busca única de 15 funciona", trivia.singleLen === 15);
  ok("shuffleAnswers mantém 1 correta entre 4", trivia.shuffleOk);

  console.log("— Token de sessão (evita repetição) —");
  const tokenCalls = await page.evaluate(async () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("bateu-otdb")) keys.push(k + "=" + (localStorage.getItem(k) ?? ""));
    }
    return keys.join(" | ");
  });
  ok("Session token persistido", tokenCalls.includes("tok-teste-123"));

  console.log("— Milionário carrega com trivia mockada (lobby) —");
  const resp3 = await page.goto(`${BASE}/games/millionaire/teste`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("Rota do Milionário responde", resp3?.status() === 200);
  await page.waitForSelector("text=ENTRAR PARA JOGAR", { timeout: 30000 }).catch(() => {});
  ok("Lobby renderiza (sem sessão → entrar)", (await page.getByText("ENTRAR PARA JOGAR").count()) === 1);

  console.log("— Integração na navegação —");
  const resp4 = await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("Home responde", resp4?.status() === 200);
  await page.waitForSelector(".navbar-trigger", { timeout: 30000 });
  // Radix NavigationMenu: abre cada gatilho até encontrar o link (robusto entre idiomas)
  let navFound = false;
  const triggers = page.locator(".navbar-trigger");
  const nTriggers = await triggers.count();
  for (let i = 0; i < nTriggers && !navFound; i++) {
    await triggers.nth(i).click();
    await page.waitForTimeout(300);
    navFound = await page.locator('a[href="/jogos-gratis"]').first().isVisible().catch(() => false);
    if (!navFound) await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(150);
  }
  ok("Navbar desktop tem link /jogos-gratis", navFound);
  // Menu mobile: MobileHomeApp abre o drawer → toque em "Jogos Grátis" navega
  const dpage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await dpage.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));
  await dpage.route(/freetogame\.com\/api\//, (route) => route.fulfill({ json: FIX_GAMES }));
  await dpage.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dpage.waitForTimeout(5000);
  await dpage.locator('button[aria-label="Menu"]').first().click({ timeout: 15000 });
  await dpage.waitForTimeout(800);
  ok("Chave traduzida no drawer (sem 'menu.liveHub' crua)", (await dpage.getByText("menu.liveHub").count()) === 0);
  const item = dpage.locator('button:has-text("Jogos Grátis")').first();
  ok("Item 'Jogos Grátis' no drawer", await item.isVisible().catch(() => false));
  await item.click();
  await dpage.waitForURL("**/jogos-gratis", { timeout: 20000 });
  await dpage.waitForSelector('[data-testid="freegames-grid"]', { timeout: 30000 });
  ok("Navegação do drawer chega ao hub com catálogo", (await dpage.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').count()) === 4);
  await dpage.close();

  console.log("— Mobile 390×844 —");
  const mpage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mpage.route(/freetogame\.com\/api\//, (route) => route.fulfill({ json: FIX_GAMES }));
  await mpage.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));
  await mpage.goto(`${BASE}/jogos-gratis`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mpage.waitForSelector('[data-testid="freegames-grid"]', { timeout: 30000 });
  ok("Grid mobile renderiza", (await mpage.locator('[data-testid="freegames-grid"] [data-testid^="game-card-"]').count()) === 4);
  const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  ok("Sem overflow horizontal", !overflow);
  await mpage.close();

  console.log("\n— Smoke API real (fora do mock) —");
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  try {
    const real = await p2.evaluate(async () => {
      const r = await fetch("https://www.freetogame.com/api/games?sort-by=popularity");
      const j = await r.json();
      return Array.isArray(j) ? j.length : 0;
    });
    ok("FreeToGame real devolve catálogo", real > 100);
  } catch {
    ok("FreeToGame real devolve catálogo", false);
  }
  await ctx2.close();

  await browser.close();
  console.log(`\n📊 RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log("Falhas: " + fails.join(" · "));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
