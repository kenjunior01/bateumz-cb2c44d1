// Isolar artefactos do céu: água on/off, névoa on/off
import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const b = await chromium.launch({ args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: process.env.PW_CHROME || undefined });
const page = await b.newPage({ viewport: { width: 1100, height: 620 } });
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__blocos, null, { timeout: 30000 });
await page.getByTestId("bc-jogar").click();
await page.waitForTimeout(3500);
await page.evaluate(() => {
  const m = window.__blocos.motor;
  m.primeiraPessoa = false;
  m.pitch = -0.05;
});
await page.waitForTimeout(600);
await page.screenshot({ path: "shots/art-base.png" });
await page.evaluate(() => {
  const m = window.__blocos.motor;
  m.mundo.grupo.children.forEach((ch) => { if (ch.material === m.mundo.materialAgua) ch.visible = false; });
});
await page.waitForTimeout(400);
await page.screenshot({ path: "shots/art-sem-agua.png" });
await page.evaluate(() => {
  const m = window.__blocos.motor;
  m.cena.fog = null;
});
await page.waitForTimeout(400);
await page.screenshot({ path: "shots/art-sem-nevoa.png" });
await b.close();
console.log("ok");
