import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.route(/geocoding-api\.open-meteo\.com/, (r) => r.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", latitude: -25.97, longitude: 32.58 }] } }));
await page.route(/^https:\/\/api\.open-meteo\.com\//, (r) => r.fulfill({ json: { current: { temperature_2m: 24.8, weather_code: 0, wind_speed_10m: 9 } } }));
await page.goto("http://localhost:8099/cidade", { waitUntil: "domcontentloaded" });
await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: "shots-v33/cidade-inicio.png" });
await page.getByTestId("cd-entrar").click();
await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "shots-v33/cidade-praca-primeira.png" });
// 3ª pessoa na praça
await page.evaluate(() => { window.__cidade.motor.definirCamara("terceira"); window.__cidade.olhar(Math.PI * 0.75, -0.32); window.__cidade.teleportar(4.5, 35.02, 9.5); });
await page.waitForTimeout(1800);
await page.screenshot({ path: "shots-v33/cidade-praca-terceira.png" });
// vista de distrito (Estádio Imbondeiro, ang 72° → (8, 26))
await page.evaluate(() => { window.__cidade.teleportar(14, 35.02, 19); window.__cidade.olhar(Math.PI * 0.62, -0.28); });
await page.waitForTimeout(2200);
await page.screenshot({ path: "shots-v33/cidade-distrito.png" });
// vista aérea do plateau (topo)
await page.evaluate(() => { window.__cidade.motor.definirCamara("topo"); window.__cidade.teleportar(0, 55, 0); });
await page.waitForTimeout(2200);
await page.screenshot({ path: "shots-v33/cidade-aerea.png" });
console.log("shots ok");
await browser.close();
