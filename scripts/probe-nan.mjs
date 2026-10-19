// Probe 2: valores brutos do avatar
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("ProbeY");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-0"]').click();
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
await page.waitForTimeout(3500);
const raw = await page.evaluate(() => {
  const e = (window).__bw.engine;
  const root = e["player"].root;
  const out = [];
  const walk = (g, path, depth) => {
    if (depth > 3) return;
    for (const k of g.children) {
      out.push({
        path: `${path}/${k.type}`,
        pos: [k.position.x, k.position.y, k.position.z].map(v => String(v)),
        scale: [k.scale.x, k.scale.y, k.scale.z].map(v => String(v)),
        rot: [k.rotation.x, k.rotation.y, k.rotation.z].map(v => String(+(+v).toFixed(2))),
        kids: k.children.length,
      });
      walk(k, `${path}/${k.type}`, depth + 1);
    }
  };
  walk(root, "root", 0);
  return { n: out.length, nodes: out.slice(0, 24) };
});
console.log(JSON.stringify(raw, null, 1));
await browser.close();
