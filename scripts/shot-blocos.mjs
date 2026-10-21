// Screenshot de verificação visual do BateuCraft
import { chromium } from "playwright";

const BASE = "http://localhost:8099";
const b = await chromium.launch({ args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: process.env.PW_CHROME || undefined });
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__blocos, null, { timeout: 30000 });
await page.getByTestId("bc-jogar").click();
await page.waitForTimeout(4000);
// 3ª pessoa para ver o minifig LEGO
await page.evaluate(() => { window.__blocos.motor.primeiraPessoa = false; window.__blocos.motor.pitch = -0.15; });
await page.waitForTimeout(2500);
await page.screenshot({ path: "shots/bateucraft-3pessoa.png" });
// menu
await page.evaluate(() => { window.__blocos.guardar(); });
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.__blocos, null, { timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/bateucraft-menu.png" });
await b.close();
console.log("screenshots ok");
