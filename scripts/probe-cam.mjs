// Sonda da câmara: 1ª vs 3ª pessoa
import { chromium } from "playwright";
const BASE = "http://localhost:8099";
const b = await chromium.launch({ args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: process.env.PW_CHROME || undefined });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__blocos, null, { timeout: 30000 });
await page.getByTestId("bc-jogar").click();
await page.waitForTimeout(3000);
console.log("1ª pessoa:", JSON.stringify(await page.evaluate(() => {
  const m = window.__blocos.motor;
  return { px: m.px.toFixed(1), py: m.py.toFixed(1), pz: m.pz.toFixed(1), yaw: m.yaw.toFixed(2), pitch: m.pitch.toFixed(2), primeiraPessoa: m.primeiraPessoa, cam: m.camara.position.toArray().map((v) => +v.toFixed(1)), fps: m.fps };
})));
await page.evaluate(() => { window.__blocos.motor.primeiraPessoa = false; });
await page.waitForTimeout(800);
console.log("3ª pessoa:", JSON.stringify(await page.evaluate(() => {
  const m = window.__blocos.motor;
  return { px: m.px.toFixed(1), py: m.py.toFixed(1), pz: m.pz.toFixed(1), yaw: m.yaw.toFixed(2), primeiraPessoa: m.primeiraPessoa, cam: m.camara.position.toArray().map((v) => +v.toFixed(1)), avatarVis: m.avatar?.grupo.visible, avatarPos: m.avatar?.grupo.position.toArray().map((v) => +v.toFixed(1)) };
})));
await page.screenshot({ path: "shots/probe-3p.png" });
await b.close();
