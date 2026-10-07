// Inspeciona estilos computados dos títulos na /lives
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:8099/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(12000);

const info = await page.evaluate(() => {
  const out = [];
  const probe = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName, cls: (el.className || "").toString().slice(0, 90),
      color: cs.color, bg: cs.backgroundColor, fontSize: cs.fontSize, opacity: cs.opacity,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      html: el.outerHTML.slice(0, 120),
    };
  };
  // h1 do hero
  document.querySelectorAll("h1").forEach((h) => out.push({ where: "h1", ...probe(h) }));
  // título do card destaque
  const feat = document.querySelector('[data-testid="livehub-destaque-bateu-world"]');
  if (feat) out.push({ where: "feat-card", ...probe(feat) });
  // primeiro card da grelha desktop
  const gridCard = document.querySelector("#game-content-area");
  if (gridCard) out.push({ where: "game-content-area", ...probe(gridCard) });
  // html/body classes (tema)
  out.push({ where: "html-class", value: document.documentElement.className });
  out.push({ where: "body-bg", color: getComputedStyle(document.body).backgroundColor });
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
