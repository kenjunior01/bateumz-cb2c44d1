// Screenshots v34 — verificação visual das integrações de APIs públicas
// /lives (rádios) · /community (sabias que) · /wallet (trend) · /cidade (quiosque)
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:8099";
const OUT = "shots-v34";
fs.mkdirSync(OUT, { recursive: true });

const estacao = (cc, n) => ({
  stationuuid: `uuid-${cc.toLowerCase()}-${n}`, name: `Rádio Teste ${cc} ${n}`,
  url_resolved: `https://stream.teste/${cc}-${n}.mp3`, url: `https://stream.teste/${cc}-${n}.mp3`,
  favicon: "", homepage: "https://radio.teste", codec: "MP3", bitrate: 128, tags: "pop,local", votes: 20 - n, countrycode: cc,
});

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // mocks (visual com dados determinísticos)
  await page.route(/radio-browser\.info\//, (route) => {
    const url = route.request().url();
    const cc = url.includes("/MZ?") ? "MZ" : url.includes("/AO?") ? "AO" : url.includes("/CV?") ? "CV" : null;
    return route.fulfill({ json: cc ? [estacao(cc, 1), estacao(cc, 2), estacao(cc, 3)] : [] });
  });
  await page.route(/pt\.wikipedia\.org\/api\/rest_v1\/page\/summary\//, (route) =>
    route.fulfill({ json: {
      title: "Ilha de Moçambique",
      extract: "A Ilha de Moçambique é uma cidade insular de Moçambique, antiga capital colonial e Património Mundial da UNESCO desde 1991, ligada ao continente por uma ponte de 3 km.",
      thumbnail: { source: "https://upload.wikimedia.org/wikipedia/commons/thumb/teste.jpg/250px-teste.jpg" },
      content_urls: { desktop: { page: "https://pt.wikipedia.org/wiki/Ilha_de_Mo%C3%A7ambique" } },
    } }));
  await page.route(/open\.er-api\.com\/v6\/latest\/USD/, (route) =>
    route.fulfill({ json: { result: "success", base_code: "USD", time_last_update_utc: "Mon, 03 Nov 2026 00:02:31 +0000", rates: { USD: 1, EUR: 0.92, AOA: 912.5, MZN: 63.9, BRL: 5.42, ZAR: 18.2 } } }));
  await page.route(/api\.frankfurter\.dev\//, (route) =>
    route.fulfill({ json: { base: "USD", start_date: "2026-10-05", end_date: "2026-11-03", rates: { "2026-10-05": { EUR: 0.9 }, "2026-10-12": { EUR: 0.905 }, "2026-10-19": { EUR: 0.898 }, "2026-10-26": { EUR: 0.912 }, "2026-11-03": { EUR: 0.92 } } } }));

  // 1. /lives com rádios
  await page.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="radios-lista"]', { timeout: 45000 });
  await page.locator('[data-testid="livehub-radios"]').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/01-lives-radios.png` });
  console.log("01-lives-radios ✓");

  // 2. /community com sabias que
  await page.goto(`${BASE}/community`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="sabias-card"]', { timeout: 30000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/02-community-sabias.png` });
  console.log("02-community-sabias ✓");

  // 3. /wallet com trend — sessão fake
  const SB = "sb-ngxrdpplyghlugoowjqj-auth-token";
  await page.addInitScript(([key]) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        access_token: "fake", refresh_token: "fake", token_type: "bearer", expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: "u-v34", aud: "authenticated", role: "authenticated", email: "t@bateu.local",
          app_metadata: { provider: "email" }, user_metadata: { display_name: "Testador" }, created_at: "2026-01-01T00:00:00Z" },
      }));
    } catch { /* noop */ }
  }, [SB]);
  await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-testid="fx-result"]', { timeout: 45000 });
  await page.locator('[data-testid="fx-to"]').click();
  await page.locator('div[role="option"]:has-text("EUR")').first().click();
  await page.waitForSelector('[data-testid="fx-trend-svg"]', { timeout: 15000 });
  await page.locator('[data-testid="fx-converter"]').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/03-wallet-trend.png` });
  console.log("03-wallet-trend ✓");

  // 4. /cidade com quiosque aberto (tab rádio e tab quiz)
  await page.route(/geocoding-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  await page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));
  await page.route(/^https:\/\/air-quality-api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { european_aqi: 22, pm2_5: 6.4 } } }));
  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByTestId("cd-entrar").click();
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 });
  // vista da praça com o quiosque
  await page.evaluate(() => { window.__cidade.teleportar(0.5, 35.02, 8.5); window.__cidade.olhar(-0.35, -0.18); window.__cidade.pump(30); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/04-cidade-praca-quiosque.png` });
  console.log("04-cidade-praca-quiosque ✓");
  await page.evaluate(() => window.__cidade.abrirQuiosque());
  await page.waitForSelector('[data-testid="cd-modal-quiosque"] [data-testid="radios-lista"]', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/05-cidade-quiosque-radio.png` });
  console.log("05-cidade-quiosque-radio ✓");
  await page.locator('[data-testid="cd-quiosque-tab-quiz"]').click();
  await page.waitForSelector('[data-testid="cd-quiz-inicio"]', { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/06-cidade-quiosque-quiz.png` });
  console.log("06-cidade-quiosque-quiz ✓");

  // 5. troféus com AQI
  await page.evaluate(() => { document.querySelector('[data-testid="cd-quiosque-fechar"]')?.click(); });
  await page.waitForTimeout(300);
  await page.getByTestId("cd-trofeus-btn").click();
  await page.waitForSelector('[data-testid="cd-aqi-valor"]', { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/07-cidade-trofeus-aqi.png` });
  console.log("07-cidade-trofeus-aqi ✓");

  // 6. mobile: community
  const mpage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mpage.route(/pt\.wikipedia\.org\/api\/rest_v1\/page\/summary\//, (route) =>
    route.fulfill({ json: {
      title: "Ilha de Moçambique",
      extract: "A Ilha de Moçambique é uma cidade insular de Moçambique, antiga capital colonial e Património Mundial da UNESCO desde 1991.",
      content_urls: { desktop: { page: "https://pt.wikipedia.org/wiki/Ilha_de_Mo%C3%A7ambique" } },
    } }));
  await mpage.goto(`${BASE}/community`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mpage.waitForSelector('[data-testid="sabias-card"]', { timeout: 30000 });
  await mpage.waitForTimeout(600);
  await mpage.screenshot({ path: `${OUT}/08-mobile-community.png` });
  console.log("08-mobile-community ✓");

  await browser.close();
  console.log("Screenshots v34 completas");
}
main().catch((e) => { console.error(e); process.exit(1); });
