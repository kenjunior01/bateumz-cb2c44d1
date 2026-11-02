// ============================================================
// E2E — v30 DESIGN + APIS PÚBLICAS NOVAS
// · Blackjack 21 (baralho real: deckofcardsapi.com)
// · Quem é esse Pokémon? (pokeapi.co)
// · Conversor de Moedas (open.er-api.com)
// · Fundação de design v30 (tokens de motion, focus universal)
// Mocks determinísticos por cenário + smoke REAL das 3 APIs
// (as 3 respondem 200 + CORS * a partir deste ambiente — validado
// com curl; se a rede cair, o smoke é marcado SKIP com honestidade).
// Uso: PW_CHROME=<chromium> node test-v30-apis-design.mjs (vite 8099)
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
  "same key", "validateDOMNesting", "CORS", "cors", "net::ERR",
];

// ── Mocks determinísticos ────────────────────────────────────────────────

const IMG = {
  AS: "https://deckofcardsapi.com/static/img/AS.png",
  KD: "https://deckofcardsapi.com/static/img/KD.png",
  "5H": "https://deckofcardsapi.com/static/img/5H.png",
  "9C": "https://deckofcardsapi.com/static/img/9C.png",
  "2D": "https://deckofcardsapi.com/static/img/2D.png",
  KH: "https://deckofcardsapi.com/static/img/KH.png",
};
const card = (code) => {
  const map = { AS: ["ACE", "SPADES"], KD: ["KING", "DIAMONDS"], "5H": ["5", "HEARTS"], "9C": ["9", "CLUBS"], "2D": ["2", "DIAMONDS"], KH: ["KING", "HEARTS"] };
  const [value, suit] = map[code];
  return { code, image: IMG[code], images: { svg: IMG[code], png: IMG[code] }, value, suit };
};

// Cenários de baralho (cada navegação reinicia a fila de compras)
const DEAL_SCENARIOS = {
  lose16v19: ["AS", "KD", "5H", "9C"],        // jogador [AS,5H]=16 · banca [KD,9C]=19
  hit18: ["AS", "KD", "5H", "9C", "2D"],       // +hit 2D → 18 · banca 19 vence
  bust: ["5H", "KD", "9C", "2D", "KD"],        // jogador [5H,9C]=14 · +hit KD → 24 estoura (sem ás)
  natural: ["AS", "KD", "KH", "9C"],           // jogador [AS,KH]=21 blackjack 3:2
};
let drawQueue = [];

// PokéAPI: lista completa (não precisamos dos 1025 — mock tem 8 reais) + alvo fixo
const POKEMON_LIST = ["bulbasaur", "charmander", "squirtle", "pikachu", "eevee", "snorlax", "gyarados", "dragonite"].map((name, i) => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon/${i + 1 === 4 ? 25 : i + 1}/`,
}));
const FX_RATES = { USD: 1, EUR: 0.896073, AOA: 922.949217, MZN: 63.66384, BRL: 5.436971, ZAR: 16.694252 };

async function realSmoke() {
  console.log("\n— Smoke REAL (rede aberta validada com curl) —");
  const probe = async (name, url, shape) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return skip(`${name} — HTTP ${res.status}`);
      const data = await res.json();
      ok(`${name} — resposta real válida`, shape(data));
    } catch {
      skip(`${name} — rede indisponível neste momento`);
    }
  };
  await probe("Deck of Cards shuffle real", "https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1",
    (d) => d.success === true && typeof d.deck_id === "string" && d.remaining === 52);
  await probe("PokéAPI pikachu real", "https://pokeapi.co/api/v2/pokemon/25/",
    (d) => d.name === "pikachu" && !!d.sprites?.other?.["official-artwork"]?.front_default);
  await probe("ExchangeRate USD real", "https://open.er-api.com/v6/latest/USD",
    (d) => d.result === "success" && typeof d.rates?.MZN === "number" && d.rates.MZN > 10);
}

async function main() {
  console.log(`\n🎨 v30 DESIGN + APIS E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // ── Rotas mockadas ──
  await page.route(/deckofcardsapi\.com\/api\/deck\/new\/shuffle/, (route) =>
    route.fulfill({ json: { success: true, deck_id: "deck-v30-teste", remaining: 312, shuffled: true } }));
  await page.route(/deckofcardsapi\.com\/api\/deck\/[^/]+\/draw/, (route) => {
    const n = parseInt(new URL(route.request().url()).searchParams.get("count") ?? "1", 10);
    const codes = drawQueue.splice(0, n);
    if (codes.length < n) codes.push(...Array(n - codes.length).fill("AS"));
    route.fulfill({ json: { success: true, deck_id: "deck-v30-teste", cards: codes.map(card), remaining: 312 - codes.length } });
  });
  await page.route(/deckofcardsapi\.com\/api\/deck\/[^/]+\/shuffle\/$/, (route) =>
    route.fulfill({ json: { success: true, deck_id: "deck-v30-teste", remaining: 312, shuffled: true } }));
  await page.route(/pokeapi\.co\/api\/v2\/pokemon\/\?/, (route) =>
    route.fulfill({ json: { count: 8, next: null, previous: null, results: POKEMON_LIST } }));
  await page.route(/pokeapi\.co\/api\/v2\/pokemon\/\d+\/?$/, (route) => {
    const id = parseInt(new URL(route.request().url()).pathname.match(/(\d+)\/?$/)[1], 10);
    route.fulfill({ json: {
      id, name: "pikachu",
      sprites: { other: { "official-artwork": { front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" } } },
      types: [{ type: { name: "electric" } }],
      height: 4, weight: 60,
    } });
  });
  await page.route(/open\.er-api\.com\/v6\/latest\/USD/, (route) =>
    route.fulfill({ json: { result: "success", base_code: "USD", time_last_update_utc: "Mon, 02 Nov 2026 00:02:31 +0000", rates: FX_RATES } }));
  await page.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));

  const gotoGame = async (id) => {
    await page.goto(`${BASE}/lives?game=${id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  };

  // ══════════════ BLACKJACK ══════════════
  console.log("— Blackjack 21 (baralho real mockado) —");
  drawQueue = [...DEAL_SCENARIOS.lose16v19];
  await gotoGame("blackjack");
  await page.waitForSelector('[data-testid="blackjack-table"]', { timeout: 45000 });
  ok("Mesa renderiza com sapateiro", (await page.locator('[data-testid="blackjack-shoe"]').innerText()).includes("cartas no sapateiro"));
  await page.locator('[data-testid="blackjack-main-btn"]').click();
  await page.waitForSelector('[data-testid="blackjack-hit"]', { timeout: 20000 });
  ok("4 cartas reais distribuídas (imagens da API)", await page.locator('[data-testid="blackjack-card"] img').count() >= 3);
  ok("Carta da banca tapada (vale fechado)", await page.locator('[data-testid="blackjack-hidden-card"]').count() === 1);
  const shoeAfter = await page.locator('[data-testid="blackjack-shoe"]').innerText();
  ok("Sapateiro contabiliza cartas tiradas (312−4)", shoeAfter.includes("308"));

  // Pedir carta (2D → 18) e manter (banca 19 vence)
  drawQueue = ["2D"];
  await page.locator('[data-testid="blackjack-hit"]').click();
  await page.waitForTimeout(900);
  ok("Hit: jogador vai a 18 (pode manter)", (await page.getByText("podes levantar").count()) === 1);
  drawQueue = [];
  await page.locator('[data-testid="blackjack-stand"]').click();
  await page.waitForSelector('[data-testid="blackjack-outcome"]', { timeout: 25000 });
  ok("Banca puxa até 17+ e resolve (19 > 18 → derrota)", (await page.locator('[data-testid="blackjack-outcome"]').innerText()).includes("Perdeste"));
  ok("Atribuição Deck of Cards visível", (await page.getByText("© Deck of Cards API").count()) === 1);

  // Natural 3:2
  drawQueue = [...DEAL_SCENARIOS.natural];
  await page.locator('[data-testid="blackjack-main-btn"]').click(); // nova ronda
  await page.locator('[data-testid="blackjack-main-btn"]').click(); // distribuir
  await page.waitForSelector('[data-testid="blackjack-outcome"]', { timeout: 25000 });
  const bjTxt = await page.locator('[data-testid="blackjack-outcome"]').innerText();
  ok("Blackjack natural paga 3:2 (2,5× aposta)", bjTxt.includes("3:2") && bjTxt.includes("125"));

  // Estouro honesto
  drawQueue = [...DEAL_SCENARIOS.bust];
  await page.locator('[data-testid="blackjack-main-btn"]').click(); // nova ronda
  await page.locator('[data-testid="blackjack-main-btn"]').click(); // distribuir
  await page.waitForSelector('[data-testid="blackjack-hit"]', { timeout: 20000 });
  drawQueue = ["KD"];
  await page.locator('[data-testid="blackjack-hit"]').click();
  await page.waitForSelector('[data-testid="blackjack-outcome"]', { timeout: 25000 });
  ok("Estourar (24) termina a ronda", (await page.locator('[data-testid="blackjack-outcome"]').innerText()).includes("Tepestes"));

  // Erro honesto A MEIO DO JOGO: API em baixo ao tirar cartas → aposta devolvida
  drawQueue = [...DEAL_SCENARIOS.lose16v19];
  await page.locator('[data-testid="blackjack-main-btn"]').click(); // nova ronda
  await page.locator('[data-testid="blackjack-main-btn"]').click(); // distribuir
  await page.waitForSelector('[data-testid="blackjack-hit"]', { timeout: 20000 });
  await page.route(/deckofcardsapi\.com\/api\/deck\/[^/]+\/draw/, (route) => route.abort());
  drawQueue = [];
  await page.locator('[data-testid="blackjack-hit"]').click();
  await page.waitForSelector('[data-testid="blackjack-error"]', { timeout: 20000 });
  ok("API em baixo a meio → erro HONESTO + aposta devolvida", (await page.locator('[data-testid="blackjack-error"]').innerText()).includes("devolvida"));
  await page.unroute(/deckofcardsapi\.com\/api\/deck\/[^/]+\/draw/);

  // Erro no BOOT (API em baixo desde o início): sem aposta, sem promessa de devolução
  await page.route(/deckofcardsapi\.com\/api\/deck\/new\/shuffle/, (route) => route.abort());
  drawQueue = [...DEAL_SCENARIOS.lose16v19];
  await page.locator('[data-testid="blackjack-error"] button').click(); // tentar novamente
  await page.waitForSelector('[data-testid="blackjack-error"]', { timeout: 20000 });
  ok("Boot sem API → erro honesto com retry", (await page.locator('[data-testid="blackjack-error"]').innerText()).includes("Tentar novamente") || (await page.locator('[data-testid="blackjack-error"] button').count()) === 1);
  await page.unroute(/deckofcardsapi\.com\/api\/deck\/new\/shuffle/);

  // ══════════════ POKÉMON ══════════════
  console.log("— Quem é esse Pokémon? (PokéAPI mockada) —");
  await gotoGame("pokemon");
  await page.waitForSelector('[data-testid="pokemon-silhouette"]', { timeout: 45000 });
  ok("Silhueta da arte oficial renderiza", (await page.locator('[data-testid="pokemon-silhouette"]').getAttribute("src")).includes("official-artwork"));
  ok("4 opções com nomes reais", await page.locator('[data-testid="pokemon-options"] button').count() === 4);
  await page.locator('[data-testid="pokemon-options"] button', { hasText: "pikachu" }).click();
  await page.waitForSelector('[data-testid="pokemon-reveal"]', { timeout: 15000 });
  ok("Acerto revela nome + tipo real", (await page.locator('[data-testid="pokemon-reveal"]').innerText()).includes("Elétrico"));
  ok("Estatísticas reais da Pokédex (0,4 m · 6,0 kg)", (await page.locator('[data-testid="pokemon-reveal"]').innerText()).includes("0,4 m"));
  ok("Atribuição PokéAPI visível", (await page.getByText("© PokéAPI").count()) === 1);

  await page.locator('[data-testid="pokemon-next"]').click();
  await page.waitForSelector('[data-testid="pokemon-silhouette"]', { timeout: 30000 });
  // errar de propósito (clicar numa opção ≠ pikachu)
  const wrongBtn = page.locator('[data-testid="pokemon-options"] button').filter({ hasNotText: "pikachu" }).first();
  if (await wrongBtn.count() > 0) {
    await wrongBtn.click();
    await page.waitForSelector('[data-testid="pokemon-reveal"]', { timeout: 15000 });
    ok("Erro revela a resposta certa em cinzento", (await page.locator('[data-testid="pokemon-reveal"]').innerText()).includes("Era Pikachu"));
  }

  // Erro honesto da PokéAPI
  const p3 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p3.route(/pokeapi\.co\//, (route) => route.abort());
  await p3.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));
  await p3.goto(`${BASE}/lives?game=pokemon`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p3.waitForSelector('[data-testid="pokemon-error"]', { timeout: 30000 });
  ok("PokéAPI em baixo → erro honesto + retry", (await p3.locator('[data-testid="pokemon-error"]').innerText()).toLowerCase().includes("indisponível"));
  await p3.close();

  // ══════════════ CONVERSOR DE MOEDAS ══════════════
  console.log("— Conversor de Moedas (taxas reais mockadas) —");
  // /wallet é rota protegida — semeamos uma sessão supabase fake no localStorage
  // (a plataforma aceita-a sem rede porque expires_at está no futuro)
  const SB = "sb-ngxrdpplyghlugoowjqj-auth-token";
  await page.addInitScript(([key]) => {
    const session = {
      access_token: "fake-access-v30", refresh_token: "fake-refresh-v30",
      token_type: "bearer", expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "test-user-v30", aud: "authenticated", role: "authenticated",
        email: "testador@bateu.local",
        app_metadata: { provider: "email" },
        user_metadata: { display_name: "Testador" },
        created_at: "2026-01-01T00:00:00Z",
      },
    };
    try { localStorage.setItem(key, JSON.stringify(session)); } catch { /* noop */ }
  }, [SB]);
  await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="fx-converter"]', { timeout: 45000 });
  await page.waitForSelector('[data-testid="fx-result"]', { timeout: 20000 });
  const resultTxt = await page.locator('[data-testid="fx-result"]').innerText();
  ok("100 USD → MZN com taxa real (6 366)", /6[ \u00a0,.]?366/.test(resultTxt) && resultTxt.includes("MZN"));
  ok("Data REAL da taxa exibida (Mon, 02 Nov)", (await page.locator('[data-testid="fx-meta"]').innerText()).includes("Mon, 02 Nov"));
  ok("Atribuição ExchangeRate-API visível", (await page.getByText("© ExchangeRate-API").count()) === 1);
  // troca de moedas: MZN → USD
  await page.locator('[data-testid="fx-swap"]').click();
  await page.waitForTimeout(400);
  const swapped = await page.locator('[data-testid="fx-result"]').innerText();
  ok("Trocar moedas converte MZN → USD", swapped.includes("USD") && /1[,.]?57/.test(swapped)); // 100/63.66384 = 1,5708
  // inverter taxa correta: 100 MZN → USD = 1,57
  await page.locator('[data-testid="fx-amount"]').fill("63.66");
  await page.waitForTimeout(300);
  ok("63,66 MZN → ~1 USD", (await page.locator('[data-testid="fx-result"]').innerText()).startsWith("1 USD") || /1[,.]00/.test(await page.locator('[data-testid="fx-result"]').innerText()));

  // ══════════════ FUNDAÇÃO DE DESIGN v30 ══════════════
  console.log("— Fundação de design (tokens + foco) —");
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      durBase: cs.getPropertyValue("--dur-base").trim(),
      ease: cs.getPropertyValue("--ease-standard").trim(),
    };
  });
  ok("Tokens de motion no :root (--dur-base 240ms)", tokens.durBase === "240ms");
  ok("Curva standard definida", tokens.ease.includes("cubic-bezier"));

  // foco visível por teclado num botão cru (grelha de jogos)
  await page.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  const focusOutline = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.offsetParent !== null && !b.disabled);
    if (!btn) return null;
    btn.focus();
    btn.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    return getComputedStyle(btn).outlineStyle;
  });
  // o foco programático pode não ativar :focus-visible em todos os browsers;
  // o teste honesto: a REGRA existe na folha (CSSOM) — a prova visual fica nas screenshots
  const ruleExists = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      try {
        for (const r of sheet.cssRules) {
          if (r.selectorText && r.selectorText.includes(":focus-visible")) return true;
        }
      } catch { /* folha cross-origin */ }
    }
    return false;
  });
  ok("Regra :focus-visible universal presente no CSS", ruleExists || focusOutline === "solid");

  // ══════════════ CONSOLE LIMPO ══════════════
  const relevant = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("Sem erros de console relevantes", relevant.length === 0);
  if (relevant.length) console.log("   →", relevant.slice(0, 5).join("\n   → "));

  // ══════════════ SCREENSHOTS 3 LARGURAS (skill taste) ══════════════
  console.log("— Screenshots 375 / 768 / 1440 —");
  drawQueue = [...DEAL_SCENARIOS.lose16v19];
  await gotoGame("blackjack");
  await page.waitForSelector('[data-testid="blackjack-table"]', { timeout: 45000 });
  for (const w of [375, 768, 1440]) {
    await page.setViewportSize({ width: w, height: w === 375 ? 720 : 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/v30-blackjack-${w}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoGame("pokemon");
  await page.waitForSelector('[data-testid="pokemon-silhouette"]', { timeout: 45000 });
  await page.screenshot({ path: "/tmp/v30-pokemon-1280.png" });
  await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="fx-result"]', { timeout: 30000 });
  await page.screenshot({ path: "/tmp/v30-wallet-fx.png" });
  ok("Screenshots capturadas (blackjack ×3, pokemon, wallet)", true);

  await browser.close();
  await realSmoke();

  console.log(`\n══════════ RESULTADO v30: ${passed} ✅ · ${failed} ❌ · ${skipped} ⏭️  ══════════`);
  if (fails.length) { console.log("Falhas:"); fails.forEach((f) => console.log("  · " + f)); process.exit(1); }
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
