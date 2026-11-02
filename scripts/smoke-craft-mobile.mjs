// Smoke mobile: VOAR (criativo), COMER (com comida), MERGULHAR (água/voar)
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const exe = process.env.PW_CHROME || undefined;

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e).slice(0, 120)));

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__blocos, null, { timeout: 60000 });

// criativo (tem VOAR)
await page.getByTestId("bc-criativo").click();
await page.waitForFunction(() => window.__blocos?.captura?.()?.fase === "jogando", null, { timeout: 60000 });
await page.waitForTimeout(800);

const voarVisivel = await page.getByTestId("bc-voar").isVisible();
await page.getByTestId("bc-voar").tap().catch(() => {});
await page.waitForTimeout(400);
const voando = await page.evaluate(() => window.__blocos.captura().voando);
const mergulharVisivel = await page.getByTestId("bc-mergulhar").isVisible();
await page.screenshot({ path: "/tmp/craft-mobile-voar.png" });
// desligar o voo outra vez
await page.getByTestId("bc-voar").tap().catch(() => {});
await page.waitForTimeout(300);
const voandoDepois = await page.evaluate(() => window.__blocos.captura().voando);

// COMER: em criativo não há comida; teleporta para água para MERGULHAR
const agua = await page.evaluate(() => {
  const m = window.__blocos.motor;
  // procurar coluna de água perto
  for (let r = 4; r < 60; r += 2) {
    for (let a = 0; a < 12; a++) {
      const x = Math.floor(m.px + Math.cos(a) * r), z = Math.floor(m.pz + Math.sin(a) * r);
      for (let y = 60; y > 20; y--) {
        if (m.mundo.getBloco(x, y, z) === 6) { window.__blocos.teleportar(x + 0.5, y + 0.4, z + 0.5); return true; }
      }
    }
  }
  return false;
});
await page.waitForTimeout(600);
const naAgua = await page.evaluate(() => window.__blocos.captura().naAgua);
const mergulharNaAgua = await page.getByTestId("bc-mergulhar").isVisible();

console.log(JSON.stringify({ voarVisivel, voando, voandoDepois, mergulharVisivel, aguaEncontrada: agua, naAgua, mergulharNaAgua, pageErrors: erros.length }, null, 2));
await browser.close();
