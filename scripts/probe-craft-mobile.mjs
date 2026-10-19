// Probe: por que o botão Guerreiro não é clicável no mobile do BateuCraft
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const exe = process.env.PW_CHROME || undefined;

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));

await page.goto(`${BASE}/lives?game=bateucraft`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
await nameInput.waitFor({ state: "visible", timeout: 40000 }).catch(() => console.log("input não apareceu"));

const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")].filter((b) => b.textContent?.includes("Guerreiro"));
  return btns.slice(0, 3).map((b) => {
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      visible: r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none",
      pointerEvents: cs.pointerEvents,
      topElement: top ? `${top.tagName}.${String(top.className).slice(0, 60)}` : "null",
      topIsSelfOrChild: top ? b.contains(top) || top === b : false,
    };
  });
});
console.log(JSON.stringify(info, null, 2));

// tenta o clique e mede quanto tempo demora / o que acontece
const t0 = Date.now();
await page.locator('button:has-text("Guerreiro")').first().click({ timeout: 8000 })
  .then(() => console.log("clique OK em", Date.now() - t0, "ms"))
  .catch((e) => console.log("clique FALHOU em", Date.now() - t0, "ms →", String(e).split("\n")[0]));

await browser.close();
