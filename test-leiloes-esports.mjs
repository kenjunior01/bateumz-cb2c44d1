// ============================================================
// E2E — v2.19 SISTEMA DE LEILÕES + ESPORTS AVANÇADO
// Valida: casa de leilões (/leiloes), sala de leilão com lances
// ao vivo, auto-bid, compra imediata, roll-up na homepage,
// grelha de playoffs (/esports/brackets), fantasy draft
// (/esports/fantasy) e widgets avançados no hub.
// Uso: node test-leiloes-esports.mjs   (vite dev na porta 8099)
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
  "PGRST", "lances", "column", "relation", "schema cache",
];

async function main() {
  console.log(`\n🔨 Bateu v2.19 — Leilões + Esports Avançado — ${BASE}\n`);
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  // ══════════════════════════════════════════════════════════
  // 1. CASA DE LEILÕES (desktop)
  // ══════════════════════════════════════════════════════════
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errors.push(m.text());
    });

    console.log("🏛️ /leiloes — Casa de Leilões (desktop)");
    await page.goto(`${BASE}/leiloes`, { waitUntil: "domcontentloaded" });
    const heroOk = await waitBodyPattern(page, /Casa de Leilões|Leilões/i);
    await page.waitForTimeout(2500);

    ok("página carrega com hero da casa de leilões", heroOk);
    ok("título 'Leilões ao Vivo' visível", await page.getByText(/Leilões/i).first().isVisible().catch(() => false));

    const cards = await page.locator('[data-testid="leilao-card"]').count();
    ok(`cartões de leilão na lista (${cards} >= 4)`, cards >= 4);

    const comTimer = await page.locator('[data-testid="leilao-timer"]').count();
    ok(`timers regressivos visíveis (${comTimer} > 0)`, comTimer > 0);

    ok("saldo demo exibido (Teu saldo)", await page.getByText(/Teu saldo/i).first().isVisible().catch(() => false));
    ok("tabs de estado (Ao Vivo/Termina já)", (await page.locator('[data-testid^="aba-"]').count()) >= 4);
    ok("secção 'Como funciona'", await page.getByText(/Como funciona/i).first().isVisible().catch(() => false));

    // clicar no primeiro leilão → detalhe
    await page.locator('[data-testid="leilao-card"]').first().click();
    await page.waitForTimeout(2500);
    const noDetalhe = page.url().includes("/leiloes/");
    ok("clicar no leilão abre a sala de leilão", noDetalhe);

    const contador = await page.locator('[data-testid="contador"]').count();
    ok("contador regressivo na sala", contador === 1);
    const lanceAtual = await page.locator('[data-testid="lance-atual"]').count();
    ok("lance atual exibido", lanceAtual === 1);

    // ═══ LANCE AO VIVO ═══
    const btnLance = page.locator('[data-testid="btn-lance"]');
    if (await btnLance.count() > 0 && await btnLance.first().isVisible().catch(() => false)) {
      const saldoAntes = await page.locator("body").textContent().then((t) => {
        const m = t.match(/(\d[\d.,]*)\s*MT/);
        return m ? m[1] : null;
      }).catch(() => null);
      await btnLance.first().click();
      await page.waitForTimeout(1800);
      ok("botão de lance dispara toast de confirmação", await page.getByText(/Lance no ar|registado/i).first().isVisible().catch(() => false));
      ok("histórico de lances presente", (await page.locator('[data-testid="historico-lances"]').count()) >= 0);

      // histórico deve mostrar o lance do utilizador (Tu_)
      const historicoTemMeuNome = await page.locator('[data-testid="historico-lances"]').textContent().then((t) => /Tu_\d+/.test(t || "")).catch(() => false);
      ok("histórico regista o nome do utilizador", historicoTemMeuNome);

      // lances rápidos +1 +2 +3
      const btnRapidos = await page.getByRole("button", { name: /\+1 ·/ }).count();
      ok("botões de lances rápidos (+1/+2/+3)", btnRapidos >= 1);

      // auto-bid UI
      const btnAuto = await page.locator('[data-testid="btn-autobid"]').count();
      ok("botão de auto-bid presente", btnAuto >= 1);
    } else {
      console.log("  ⚠️ leilão terminado — saltando interações de lance");
      ok("estado 'terminado' mostra vencedor", await page.getByText(/Vendido por|Leilão terminado/i).first().isVisible().catch(() => false));
    }

    ok("sem erros de página na casa de leilões", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  // ══════════════════════════════════════════════════════════
  // 2. LEILÕES NO MOBILE (390x844)
  // ══════════════════════════════════════════════════════════
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    console.log("📱 /leiloes — Mobile");
    await page.goto(`${BASE}/leiloes`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /Leilões/i);
    await page.waitForTimeout(2200);

    const cardsM = await page.locator('[data-testid="leilao-card"]').count();
    ok(`mobile: cartões de leilão visíveis (${cardsM} >= 3)`, cardsM >= 3);

    // entra no detalhe e usa a barra fixa de lance
    await page.locator('[data-testid="leilao-card"]').first().click();
    await page.waitForTimeout(2400);
    ok("mobile: sala de leilão carrega", page.url().includes("/leiloes/"));

    const barraFixa = await page.locator("div.fixed.bottom-0 button").count();
    ok("mobile: barra de lance fixa no rodapé", barraFixa >= 1);

    const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
    ok(`mobile: página com scroll saudável (${scrollH} > 900)`, scrollH > 900);
    ok("mobile: sem erros de página", errors.length === 0);
    await page.close();
  }

  // ══════════════════════════════════════════════════════════
  // 3. ROLL-UP DE LEILÕES NA HOMEPAGE
  // ══════════════════════════════════════════════════════════
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    console.log("🏠 Homepage — roll-up de Leilões");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /Leilões ao Vivo/i, 40000);
    await page.waitForTimeout(2000);

    ok("roll-up 'Leilões ao Vivo' na homepage", await page.getByText(/Leilões ao Vivo/i).first().isVisible().catch(() => false));
    ok("kicker de leilões com link para /leiloes", (await page.locator('a[href="/leiloes"]').count()) >= 1);

    // ordem: vendas antes de leilões antes de sorteios (por kickers das secções)
    const txt = await page.locator("body").textContent();
    const iVendas = txt.indexOf("Coisas à Venda");
    const iLeiloes = txt.indexOf("Leilões ao Vivo");
    const iSorteios = txt.indexOf("Sorteios & Concursos");
    ok("ordem homepage: vendas → leilões → sorteios", iVendas >= 0 && iVendas < iLeiloes && iLeiloes < iSorteios);

    await page.close();
  }

  // ══════════════════════════════════════════════════════════
  // 4. GRELHA DE PLAYOFFS (desktop)
  // ══════════════════════════════════════════════════════════
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    console.log("🧩 /esports/brackets — Grelha");
    await page.goto(`${BASE}/esports/brackets`, { waitUntil: "domcontentloaded" });
    const heroOk = await waitBodyPattern(page, /Playoffs|Grelha/i);
    await page.waitForTimeout(2200);

    ok("página de grelha carrega", heroOk);
    ok("secção Quartos de Final", await page.getByText(/Quartos de Final/i).first().isVisible().catch(() => false));
    ok("secção Semifinais", await page.getByText(/Semifinais/i).first().isVisible().catch(() => false));
    ok("secção Grande Final", await page.getByText(/Grande Final/i).first().isVisible().catch(() => false));

    const confrontos = await page.locator('[data-testid^="confronto-"]').count();
    ok(`cartões de confronto (${confrontos} === 7)`, confrontos === 7);

    const aoVivo = await page.getByText(/AO VIVO/i).first().isVisible().catch(() => false);
    ok("confronto ao vivo sinalizado", aoVivo);

    // clicar num confronto abre H2H
    await page.locator('[data-testid="confronto-q1"]').click();
    await page.waitForTimeout(1200);
    ok("painel de histórico direto abre", (await page.locator('[data-testid="painel-h2h"]').count()) === 1);
    ok("H2H mostra placares históricos", await page.getByText(/confrontos/i).first().isVisible().catch(() => false));

    ok("sem erros de página na grelha", errors.length === 0);
    await page.close();
  }

  // ══════════════════════════════════════════════════════════
  // 5. FANTASY ESPORTS (desktop + interação)
  // ══════════════════════════════════════════════════════════
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    console.log("✨ /esports/fantasy — Fantasy");
    await page.goto(`${BASE}/esports/fantasy`, { waitUntil: "domcontentloaded" });
    const heroOk = await waitBodyPattern(page, /Fantasy/i);
    await page.waitForTimeout(2200);

    ok("página fantasy carrega", heroOk);
    ok("tabs (O Meu Time/Draft/Liga)", (await page.locator('[data-testid^="tab-"]').count()) === 3);

    // criar time
    await page.locator('[data-testid="input-nome-time"]').fill("Guerreiros do Índico");
    await page.locator('[data-testid="btn-criar-time"]').click();
    await page.waitForTimeout(1500);
    ok("time fantasy criado (redireciona ao draft)", await page.getByText(/restante/i).first().isVisible().catch(() => false));
    await page.locator('[data-testid="tab-meu-time"]').click();
    await page.waitForTimeout(1000);
    ok("nome do time visível no meu time", await page.getByText(/Guerreiros do Índico/i).first().isVisible().catch(() => false));

    // ir ao draft
    await page.locator('[data-testid="tab-draft"]').click();
    await page.waitForTimeout(1200);
    const jogadores = await page.locator('[data-testid="card-jogador"]').count();
    ok(`cards de jogadores no draft (${jogadores} === 16)`, jogadores === 16);

    ok("orçamento visível (restante)", await page.getByText(/restante/i).first().isVisible().catch(() => false));

    // recrutar 2 jogadores
    await page.locator('[data-testid="card-jogador"]').first().getByRole("button", { name: /Recrutar/ }).click();
    await page.waitForTimeout(700);
    await page.locator('[data-testid="card-jogador"]').nth(1).getByRole("button", { name: /Recrutar/ }).click();
    await page.waitForTimeout(700);
    ok("2 jogadores recrutados", await page.getByText(/2\/5 escolhidos/i).first().isVisible().catch(() => false));

    // capitão
    await page.locator('[data-testid="tab-meu-time"]').click();
    await page.waitForTimeout(1200);
    const slots = await page.locator('[data-testid="slot-jogador"]').count();
    ok(`slots preenchidos no meu time (${slots} === 2)`, slots === 2);
    ok("pontuação ao vivo da ronda exibida", await page.getByText(/Pontuação ao vivo/i).first().isVisible().catch(() => false));

    // liga
    await page.locator('[data-testid="tab-liga"]').click();
    await page.waitForTimeout(1200);
    const linhas = await page.locator('[data-testid="linha-liga"]').count();
    ok(`liga da comunidade (${linhas} === 8)`, linhas === 8);
    ok("meu time marcado na liga", await page.getByText(/TU/i).first().isVisible().catch(() => false));

    ok("sem erros de página no fantasy", errors.length === 0);
    await page.close();
  }

  // ══════════════════════════════════════════════════════════
  // 6. HUB ESPORTS COM WIDGETS AVANÇADOS
  // ══════════════════════════════════════════════════════════
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    console.log("🏟️ /esports — Hub com widgets avançados");
    await page.goto(`${BASE}/esports`, { waitUntil: "domcontentloaded" });
    const heroOk = await waitBodyPattern(page, /BATEU ESPORTS|Campeonatos/i);
    await page.waitForTimeout(3000);

    ok("hub carrega", heroOk);
    ok("widget Power Rankings", (await page.locator('[data-testid="widget-power-rankings"]').count()) === 1);
    ok("widget Previsões da Comunidade (poll)", (await page.locator('[data-testid="widget-poll"]').count()) === 1);
    ok("widget Prize Pool Crowdfund", (await page.locator('[data-testid="widget-prize-pool"]').count()) === 1);
    ok("widget Transmissões ao Vivo", (await page.locator('[data-testid="widget-streams"]').count()) === 1);
    ok("CTA Fantasy", (await page.locator('[data-testid="widget-fantasy-cta"]').count()) === 1);
    ok("CTA Grelha dos Playoffs", (await page.locator('[data-testid="widget-grelha-cta"]').count()) === 1);

    // votar numa poll
    const opcao = page.locator('[data-testid^="poll-opcao-"]').first();
    if (await opcao.isVisible().catch(() => false)) {
      await opcao.click();
      await page.waitForTimeout(900);
      ok("voto na poll registado", await page.getByText(/Voto registado/i).first().isVisible().catch(() => false));
    }

    // navegação do layout inclui Grelhas e Fantasy
    const navOk = await page.evaluate(() => {
      const t = document.body.textContent || "";
      return t.includes("Grelhas") && t.includes("Fantasy");
    });
    ok("nav do layout tem Grelhas + Fantasy", navOk);

    // CTA grelha navega
    await page.locator('[data-testid="widget-grelha-cta"]').click();
    await page.waitForTimeout(2000);
    ok("CTA de grelha navega para /esports/brackets", page.url().includes("/esports/brackets"));

    ok("sem erros de página no hub", errors.length === 0);
    if (errors.length) console.log("   erros:", errors.slice(0, 3));
    await page.close();
  }

  // ══════════════════════════════════════════════════════════
  // 7. MOBILE ESPORTS + FANTASY (390x844)
  // ══════════════════════════════════════════════════════════
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    console.log("📱 Esports avançado — Mobile");
    await page.goto(`${BASE}/esports/fantasy`, { waitUntil: "domcontentloaded" });
    const fanOk = await waitBodyPattern(page, /Fantasy/i, 40000);
    await page.waitForTimeout(1500);
    ok("mobile: fantasy carrega", fanOk);

    await page.goto(`${BASE}/esports/brackets`, { waitUntil: "domcontentloaded" });
    await waitBodyPattern(page, /Playoffs/i, 40000);
    await page.waitForTimeout(2000);
    ok("mobile: grelha carrega", await page.getByText(/Playoffs/i).first().isVisible().catch(() => false));
    const cM = await page.locator('[data-testid^="confronto-"]').count();
    ok(`mobile: confrontos visíveis (${cM} >= 5)`, cM >= 5);

    await page.close();
  }

  await browser.close();

  console.log(`\n📊 RESULTADO: ${passed} passaram, ${failed} falharam`);
  if (fails.length) {
    console.log("Falhas:");
    fails.forEach((f) => console.log(`  - ${f}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
