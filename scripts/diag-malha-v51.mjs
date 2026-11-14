// diag-v51 — porque é que o malhador não arranca? (Playwright mínimo)
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleMsgs = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") consoleMsgs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => consoleMsgs.push(`[pageerror] ${e.message}`));

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.getByTestId("rpg-jogar")?.click?.().catch(() => {});
// usar o gancho para iniciar directo
const estado = await page.evaluate(async () => {
  const w = (window).__rpg;
  if (!w) return { erro: "sem __rpg" };
  w.iniciar(false);
  await new Promise((r) => setTimeout(r, 3000));
  const m = w.malha();
  return {
    malha: m,
    chunks: { worker: w.chunks().worker, erroWorker: w.chunks().erroWorker },
    malhadorExiste: !!w.motor.mundo.malhador,
  };
});
console.log(JSON.stringify(estado, null, 2));
console.log("--- consola (erros/avisos) ---");
for (const m of consoleMsgs.slice(0, 25)) console.log(m);
await browser.close();
