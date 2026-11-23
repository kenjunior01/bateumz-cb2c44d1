// ============================================================
// E2E — v14 ECOSSISTEMA EM HARMONIA
// Valida: /negocios (centro de ganhos), calculadora, tabela de
// comissões, roda de harmonia na home (desktop + mobile),
// navegação nova e torneios públicos.
// Uso: node test-ecosystem.mjs   (vite dev na porta 8099)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0;
let failed = 0;
const fails = [];

function ok(name, cond) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
}

/** Espera (polling) até o padrão existir no body — robusto ao preloader/rate-limit em dev */
async function waitBodyPattern(page, regex, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const txt = await page.locator("body").textContent().catch(() => "");
    if (regex.test(txt || "")) return true;
    await page.waitForTimeout(800);
  }
  return false;
}

const NOISE = [
  "navigator.vibrate", "<line> attribute", "validateDOMNesting",
  "two children with the same key", "same key", "Failed to load resource",
  "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "AudioContext", "React Router Future Flag",
  "404", "406", "fetchPriority", "does not recognize", "PGRST301", "JWT",
];

async function main() {
  console.log(`\n💚 Bateu v14 — Ecossistema E2E — ${BASE}\n`);
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  // ---------- 1. Página /negocios (desktop) ----------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errors.push(m.text());
    });

    console.log("🏦 /negocios — Centro de Ganhos");
    await page.goto(`${BASE}/negocios`, { waitUntil: "domcontentloaded" });
    const heroOk = await waitBodyPattern(page, /um único porcento|mensalidade/i);
    await page.waitForTimeout(1500);

    ok("página carrega com hero de rendimento", heroOk);
    ok("badge de mensalidade visível", await page.getByText(/Empresas pagam mensalidade/i).first().isVisible().catch(() => false));
    ok("secção de 5 pilares", await page.getByText(/Cinco pilares/i).first().isVisible().catch(() => false));
    ok("secção de planos (mensalidade)", await page.locator("#planos").isVisible().catch(() => false));
    ok("cartões de plano Grátis/Empresarial/Corporativa", await page.locator("[data-testid='plan-card-free']").isVisible().catch(() => false) && await page.locator("[data-testid='plan-card-business']").isVisible().catch(() => false) && await page.locator("[data-testid='plan-card-corporate']").isVisible().catch(() => false));
    ok("preço Empresarial 1.500 MT", await page.locator("[data-testid='plan-card-business']").getByText(/1.500|1500/i).first().isVisible().catch(() => false));
    ok("calculadora presente", await page.locator("#calculadora").isVisible().catch(() => false));
    ok("tabela de custos com 0%", await page.getByText(/Custos abertos na tabela/i).first().isVisible().catch(() => false) && await page.locator("[data-testid='fee-raffle']").getByText("0%").isVisible().catch(() => false));
    ok("passos do zero ao primeiro ganho", await page.getByText(/Do zero ao primeiro ganho/i).first().isVisible().catch(() => false));

    // calculadora interativa: 0% de comissão sempre + líquido reage ao slider
    const zeroFee = await page.locator("#calculadora").getByText(/Comissão da plataforma \(0%\)/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    ok("calculadora mostra comissão 0%", zeroFee);
    const netBefore = await page.locator("[data-testid='calc-net']").textContent({ timeout: 5000 }).catch(() => null);

    // slider com evento nativo React — o líquido deve mudar (100% vai para o criador)
    await page.locator("#calculadora input[type=range]").first().evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(el, "2000");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }).catch(() => {});
    await page.waitForTimeout(500);
    const netAfter = await page.locator("[data-testid='calc-net']").textContent({ timeout: 5000 }).catch(() => null);
    ok("resultado da simulação reage aos valores", !!netBefore && !!netAfter && netBefore !== netAfter);

    // trocar pilar para Concursos
    await page.locator("#calculadora").getByRole("button", { name: "Concursos" }).click().catch(() => {});
    await page.waitForTimeout(300);
    ok("pilar Concursos selecionável", await page.locator("#calculadora").getByRole("button", { name: "Concursos" }).getAttribute("class").then((c) => c?.includes("bg-emerald-500")).catch(() => false));

    ok("CTA para planos", await page.getByText(/Ver planos e mensalidades/i).first().isVisible().catch(() => false));
    ok("sem erros JS em /negocios", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  // ---------- 2. Home desktop — roda de harmonia ----------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errors.push(m.text());
    });

    console.log("\nwheel 🎡 Home desktop — Ecossistema em Harmonia");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const harmonyOk = await waitBodyPattern(page, /Tudo ligado/i);
    await page.waitForTimeout(1500);

    // v81→v79: a homepage = 5 blocos — o «Ganhe dinheiro» vive no menu Mais e em /negocios
    ok("chamada principal na home", await page.locator("[data-testid='home79-frase']").first().isVisible().catch(() => false));

    // actividade REAL e honesta (4 linhas — mensagens claras quando não há dados)
    ok("linha de actividade: vencedores verificados", await page.locator("[data-testid='home79-ativ-vencedor']").first().isVisible().catch(() => false));
    ok("linha de actividade: próxima live", await page.locator("[data-testid='home79-ativ-live']").first().isVisible().catch(() => false));

    // stories presentes na home desktop
    // v79: os stories vivem na Comunidade (homepage = 5 blocos)
    ok("home sem stories (foram para Comunidade)", !(await page.locator("[data-testid='stories-carousel']").count()));

    // os pilares do ecossistema ficam organizados no menu Mais → Negócios
    await page.click("[data-testid='nav79-desktop-mais']");
    await page.waitForTimeout(400);
    ok("menu Mais tem «Negócios»", await page.getByText("Negócios", { exact: false }).first().isVisible().catch(() => false));
    await page.keyboard.press("Escape");

    // navega para /negocios por URL (o hub de ganhos continua público)
    await page.goto(`${BASE}/negocios`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const neg = (await page.textContent("body").catch(() => "")) || "";
    ok("/negocios abre com conteúdo real", neg.length > 400);

    ok("sem erros JS na home", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  // ---------- 3. Home mobile — banner de ganhos + drawer ----------
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errors.push(m.text());
    });

    console.log("\n📱 Home mobile v79 — Negócios organizados no menu");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /Iniciando|Sorteio|Descoberta|transparência/i);
    // v79: o banner solto saiu da homepage — o caminho real é o menu (hambúrguer)
    const menuBtn = page.locator('[aria-label*="menu" i], [aria-label*="Menu"]').first();
    await menuBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    ok("drawer tem 'Ganhe dinheiro'", await page.getByText("Ganhe dinheiro").first().isVisible().catch(() => false));
    ok("drawer tem Torneios", await page.getByText("Torneios", { exact: true }).first().isVisible().catch(() => false));
    // fecha o drawer e vai por URL directa
    await page.keyboard.press("Escape").catch(() => {});
    await page.goto(`${BASE}/negocios`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    ok("/negocios alcançável no mobile", page.url().includes("/negocios"));

    ok("sem erros JS no mobile", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  // ---------- 4. Torneios públicos ----------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errors.push(m.text());
    });

    console.log("\n⚔️ /tournaments — página pública");
    const res = await page.goto(`${BASE}/tournaments`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /Torneio|torneios|Nenhum|Aquecendo|Iniciando/i);
    await page.waitForTimeout(1500);
    ok("rota /tournaments responde", !!res && res.status() < 500);
    // polling robusto: dev compile + supabase podem demorar alguns segundos
    let bodyLen = 0;
    for (let i = 0; i < 20; i++) {
      bodyLen = (await page.locator("body").textContent().catch(() => "")).length;
      if (bodyLen > 100) break;
      await page.waitForTimeout(1000);
    }
    ok("sem crash (página renderiza corpo)", bodyLen > 100);
    await page.waitForTimeout(800);

    // Navbar v79: Negócios vive no menu «Mais» (sem mega-menus)
    const maisBtn = page.locator("[data-testid='nav79-desktop-mais']").first();
    if (await maisBtn.isVisible().catch(() => false)) {
      await maisBtn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }
    ok("navbar «Mais» tem Negócios", await page.getByText("Negócios", { exact: false }).first().isVisible().catch(() => false));

    ok("sem erros JS em /tournaments", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  await browser.close();
  console.log(`\n══════════════════════════════`);
  console.log(`  PASS: ${passed}  FAIL: ${failed}`);
  if (fails.length) { console.log("  Falhas:"); fails.forEach((f) => console.log(`   - ${f}`)); }
  console.log(`══════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
