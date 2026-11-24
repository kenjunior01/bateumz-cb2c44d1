// v88 — identificar o(s) elemento(s) que transbordam horizontalmente
import { chromium } from "playwright";

const EXE = "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell";
const ROTAS = ["/lives", "/jogos", "/tournaments"];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const pg = await ctx.newPage();

for (const rota of ROTAS) {
  await pg.goto(`http://localhost:8099${rota}`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  const viloes = await pg.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const bad = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > cw + 1 && r.width > 8) {
        bad.push({
          tag: el.tagName.toLowerCase(),
          testid: el.getAttribute("data-testid") || "",
          cls: String(el.className).slice(0, 110),
          right: Math.round(r.right),
          w: Math.round(r.width),
          texto: (el.textContent || "").trim().slice(0, 40),
        });
      }
    });
    // ficar só com os mais externos (pais de transbordo também contam)
    return bad.slice(0, 14);
  });
  console.log(`\n=== ${rota} (cw=1280) ===`);
  viloes.forEach((v, i) => console.log(`${i}: <${v.tag} testid=${v.testid}> right=${v.right} w=${v.w} cls="${v.cls}" txt="${v.texto}"`));
}
await browser.close();
