// probe-v61.mjs — diagnóstico: o que se passa na página /lives a frio
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const PW = process.env.PW_CHROME || undefined;
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: PW });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const msgs = [];
page.on("console", (m) => msgs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on("pageerror", (e) => msgs.push(`[pageerror] ${String(e).slice(0, 300)}`));
const t0 = Date.now();
await page.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => console.log("goto:", String(e).slice(0, 200)));
for (let i = 1; i <= 12; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const tem = await page.evaluate(() => ({
    banner: !!document.querySelector('[data-testid="livehub-convidado"]'),
    destaque: !!document.querySelector('[data-testid="livehub-destaque-bateu-world"]'),
    root: document.getElementById("root")?.innerHTML.length ?? -1,
    titulo: document.title,
  })).catch((e) => ({ erro: String(e).slice(0, 150) }));
  console.log(`t+${Math.round((Date.now() - t0) / 1000)}s`, JSON.stringify(tem));
  if (tem.banner || tem.destaque) break;
}
console.log("--- consola (últimas 15) ---");
for (const m of msgs.slice(-15)) console.log(" ", m);
await page.screenshot({ path: "/tmp/probe-v61.png" }).catch(() => {});
await browser.close().catch(() => {});
