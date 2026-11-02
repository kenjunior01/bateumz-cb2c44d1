// Probe: o que está a intercetar o clique no RENASCER?
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const exe = process.env.PW_CHROME || undefined;

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => !!window.__blocos, null, { timeout: 60000 });
await page.getByTestId("bc-jogar").click();
await page.waitForFunction(() => window.__blocos?.captura?.()?.fase === "jogando", null, { timeout: 60000 });

await page.evaluate(() => { const b = window.__blocos; b.definirVida(5); b.motor.receberDano(10, "queda"); });
await page.waitForTimeout(600);

const info = await page.evaluate(() => {
  const btn = document.querySelector('[data-testid="bc-renascer"]');
  const r = btn.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const stack = document.elementsFromPoint(cx, cy).slice(0, 6).map((el) => {
    const cs = getComputedStyle(el);
    return `${el.tagName}[${String(el.className).slice(0, 60)}] pe=${cs.pointerEvents} op=${cs.opacity}`;
  });
  return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, stack };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
