// v88 — teste interactivo da secção Sorteios na homepage (scroll + wait + clip)
import { chromium } from "playwright";

const EXE = "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell";
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const pg = await ctx.newPage();
await pg.goto("http://localhost:8099/", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
await pg.waitForTimeout(1200);

// rolar SUAVEMENTE até à secção (como um utilizador real)
await pg.evaluate(async () => {
  const el = document.querySelector('[aria-label="Sorteios disponíveis"]') || document.querySelector("main");
  if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
});
await pg.waitForTimeout(2000);

const info = await pg.evaluate(() => {
  const sec = document.querySelector('[aria-label="Sorteios disponíveis"]');
  if (!sec) return { erro: "sem secção" };
  const artigos = sec.querySelectorAll("article");
  const scroller = sec.querySelector("[data-testid]") ;
  const opcs = Array.from(artigos).slice(0, 4).map((a) => {
    const st = getComputedStyle(a);
    const r = a.getBoundingClientRect();
    return { op: st.opacity, w: Math.round(r.width), h: Math.round(r.height), txt: (a.textContent || "").trim().slice(0, 60) };
  });
  return { nArtigos: artigos.length, opcs, secH: Math.round(sec.getBoundingClientRect().height) };
});
console.log(JSON.stringify(info, null, 1));

const el = await pg.$('[aria-label="Sorteios disponíveis"]');
if (el) await el.screenshot({ path: "/tmp/sorteios-scroll.png" });
await browser.close();
