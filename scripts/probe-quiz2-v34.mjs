// Probe 2 — fluxo EXATO do E2E: cidade → quiosque → rádio → quiz → comecar
import { chromium } from "playwright";

const BASE = "http://localhost:8099";

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0, 180)); });
  page.on("pageerror", (e) => console.log("PAGE-ERR:", String(e).slice(0, 300)));

  await page.route(/geocoding-api\.open-meteo\.com/, (route) =>
    route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
  await page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
    route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));
  await page.route(/^https:\/\/air-quality-api\.open-meteo\.com\//, (route) => route.fulfill({ json: { current: { european_aqi: 22, pm2_5: 6.4 } } }));
  await page.route(/radio-browser\.info\//, (route) => route.fulfill({ json: [{
    stationuuid: "uuid-mz-1", name: "Rádio Teste MZ 1", url_resolved: "https://stream.teste/MZ-1.mp3", url: "https://stream.teste/MZ-1.mp3",
    favicon: "", homepage: "https://radio.teste/mz", codec: "MP3", bitrate: 128, tags: "pop", votes: 19, countrycode: "MZ",
  }] }));
  await page.route(/stream\.teste\//, (route) => route.abort());
  await page.route(/opentdb\.com\//, (route) => {
    const url = route.request().url();
    console.log("OPENTDB:", url.slice(0, 110));
    if (url.includes("api_token.php")) return route.fulfill({ json: { response_code: 0, token: "tok-v34" } });
    if (url.includes("api.php")) {
      const u = new URL(url);
      const diff = u.searchParams.get("difficulty") ?? "easy";
      const n = parseInt(u.searchParams.get("amount") ?? "0", 10);
      return route.fulfill({ json: { response_code: 0, results: Array.from({ length: n || 2 }, (_, i) => ({
        category: "General Knowledge", type: "multiple", difficulty: diff,
        question: `Pergunta ${diff} ${i + 1}?`,
        correct_answer: `Correta ${diff} ${i + 1}`,
        incorrect_answers: [`Errada A${i + 1}`, `Errada B${i + 1}`, `Errada C${i + 1}`],
      })) } });
    }
    return route.fulfill({ json: { response_code: 1, results: [] } });
  });

  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-entrar").click();
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 });

  // abrir quiosque pelo hook (equivale ao fluxo real do E2E)
  await page.evaluate(() => window.__cidade.abrirQuiosque());
  await page.waitForSelector('[data-testid="cd-modal-quiosque"]', { timeout: 8000 });
  console.log("modal aberto ✓");
  await page.waitForSelector('[data-testid="cd-modal-quiosque"] [data-testid="radios-lista"]', { timeout: 15000 });
  console.log("rádio na lista ✓");

  await page.locator('[data-testid="cd-quiosque-tab-quiz"]').click();
  await page.waitForSelector('[data-testid="cd-quiz-inicio"]', { timeout: 8000 });
  console.log("intro do quiz ✓");
  await page.locator('[data-testid="cd-quiz-comecar"]').click();
  console.log("começar clicado — a esperar…");

  // observar o que aparece nos 25s seguintes
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2500);
    const estado = await page.evaluate(() => {
      const q = (t) => document.querySelector(`[data-testid="${t}"]`);
      const modal = q("cd-modal-quiosque");
      return {
        jogando: !!q("cd-quiz-jogando"),
        loading: !!q("cd-quiz-loading"),
        inicio: !!q("cd-quiz-inicio"),
        erro: !!q("cd-quiz-erro"),
        resultado: !!q("cd-quiz-resultado"),
        modalTexto: modal ? modal.textContent.slice(0, 150) : "(sem modal)",
      };
    });
    console.log(`t=${(i + 1) * 2.5}s`, JSON.stringify(estado));
    if (estado.jogando || estado.erro || estado.resultado) break;
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
