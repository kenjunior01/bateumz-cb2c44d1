// Diagnóstico profundo: /jogos e /lives com espera longa, captura de erros
import { chromium } from "playwright";

const BASE = "http://localhost:8099";

async function diag(browser, { url, w = 1440, h = 900, wait = 14000 }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + String(e).slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE: " + m.text().slice(0, 220)); });
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(wait);
  const textLen = await page.evaluate(() => document.body.innerText.length);
  const rootChildren = await page.evaluate(() => document.getElementById("root")?.children.length ?? -1);
  await page.screenshot({ path: `shots/diag-${url.replace(/[^a-z0-9]+/gi, "_")}.png` });
  console.log(`\n=== ${url} (${w}x${h}) ===`);
  console.log("body.innerText length:", textLen, "| #root children:", rootChildren);
  console.log("erros únicos:", [...new Set(errs)].slice(0, 12).join("\n") || "(nenhum)");
  await ctx.close();
}

const browser = await chromium.launch();
await diag(browser, { url: "/jogos" });
await diag(browser, { url: "/lives?game=mmorpg" });
await diag(browser, { url: "/jogos", w: 390, h: 844 });
await browser.close();
