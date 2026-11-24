// v88 — diagnóstico visual: capturas FULL PAGE do desktop actual a 1280px
import { chromium } from "playwright";

const EXE = "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell";
const OUT = "/tmp/diag88";
const PAGES = [
  ["home", "/"],
  ["jogos", "/jogos"],
  ["tournaments", "/tournaments"],
  ["lives", "/lives"],
  ["desporto", "/desporto"],
  ["perfil", "/profile"],
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
const erros = [];
pg.on("pageerror", (e) => erros.push(String(e)));

for (const [nome, rota] of PAGES) {
  try {
    await pg.goto(`http://localhost:8099${rota}`, { waitUntil: "networkidle", timeout: 45000 });
    await pg.waitForTimeout(1800);
    await pg.screenshot({ path: `${OUT}-${nome}.png`, fullPage: true });
    const body = await pg.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      sh: document.documentElement.scrollHeight,
    }));
    console.log(`${nome}: sw=${body.sw} cw=${body.cw} sh=${body.sh} ${body.sw > body.cw ? "⚠️ OVERFLOW" : "ok"}`);
  } catch (e) {
    console.log(`${nome}: ERRO ${String(e).slice(0, 120)}`);
  }
}
console.log("pageerrors:", erros.length ? erros.slice(0, 5) : "nenhum");
await browser.close();
