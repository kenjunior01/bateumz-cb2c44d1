// v88 — encontrar o conteúdo mais largo dentro da coluna do jogo no LiveHub
import { chromium } from "playwright";

const EXE = "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell";
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const pg = await ctx.newPage();
await pg.goto("http://localhost:8099/lives", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
await pg.waitForTimeout(1500);

const res = await pg.evaluate(() => {
  const area = document.getElementById("game-content-area");
  if (!area) return { erro: "sem #game-content-area" };
  const coluna = area.parentElement; // coluna 1fr é filho directo? — na verdade área é o grid; filhos são as colunas
  const linhas = [];
  area.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 910) {
      linhas.push({
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid") || "",
        id: el.id || "",
        w: Math.round(r.width),
        sw: el.scrollWidth,
        cls: String(el.className).slice(0, 90),
      });
    }
  });
  return { colunaW: coluna?.getBoundingClientRect().width, n: linhas.length, linhas: linhas.slice(0, 20) };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
