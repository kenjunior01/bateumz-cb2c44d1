// Probe 2: reproduzir a corrida do teste i18n EN (captura imediata após waitForSelector, N vezes)
import { chromium } from "playwright";

const BASE = "http://localhost:8099";
const CHROME = "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell";

const br = await chromium.launch({ executablePath: CHROME, headless: true });

for (let i = 0; i < 6; i++) {
  const pg = await br.newPage({ viewport: { width: 1280, height: 900 } });
  // simular o estado do suite: navegou muito antes, agora muda para EN
  await pg.goto(`${BASE}/tournaments`, { waitUntil: "domcontentloaded" });
  await pg.evaluate(() => localStorage.setItem("bateu_lang_explicit", "1"));
  await pg.evaluate(() => localStorage.setItem("bateu_lang", "en"));
  await pg.goto(`${BASE}/tournaments/criar`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="torneio-form-nome"]', { timeout: 30_000 });
  const htmlCriar = await pg.content();
  const chavesCruas = htmlCriar.match(/esport\.[a-zA-Z.]+|kart\.forma\.[a-zA-Z.]+/g);
  const tituloEn = await pg.locator("h1").first().innerText();
  console.log(`run ${i + 1}: cruas=${chavesCruas ? Array.from(new Set(chavesCruas)).join(",") : "0"} | h1="${tituloEn}"`);
  await pg.close();
}
await br.close();
