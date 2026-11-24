// Probe: diagnosticar o furo i18n EN em /tournaments/criar
import { chromium } from "playwright";

const BASE = "http://localhost:8099";
const CHROME = "/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell";

const br = await chromium.launch({ executablePath: CHROME, headless: true });
const pg = await br.newPage({ viewport: { width: 1280, height: 900 } });

await pg.goto(`${BASE}/tournaments/criar`, { waitUntil: "domcontentloaded" });
await pg.evaluate(() => localStorage.setItem("bateu_lang_explicit", "1"));
await pg.evaluate(() => localStorage.setItem("bateu_lang", "en"));
await pg.goto(`${BASE}/tournaments/criar`, { waitUntil: "domcontentloaded" });
await pg.waitForSelector('[data-testid="torneio-form-nome"]', { timeout: 30_000 });
await new Promise((r) => setTimeout(r, 800));

const info = await pg.evaluate(() => {
  const h1 = document.querySelector("h1");
  const html = document.documentElement.outerHTML;
  const cruas = html.match(/esport\.[a-zA-Z.]+|kart\.forma\.[a-zA-Z.]+/g) || [];
  // filtrar ocorrências dentro de atributos data-i18n-key ou comentários do React
  return {
    h1: h1 ? h1.innerText : "(sem h1)",
    lang: document.documentElement.lang,
    cruasUnicas: Array.from(new Set(cruas)).slice(0, 20),
    contextoCruas: cruasUnicas2(cruas, html),
  };
  function cruasUnicas2(arr, html2) {
    const out = [];
    for (const k of arr.slice(0, 5)) {
      const i = html2.indexOf(k);
      if (i >= 0) out.push(html2.slice(Math.max(0, i - 120), i + k.length + 60).replace(/\s+/g, " "));
    }
    return out;
  }
});
console.log(JSON.stringify(info, null, 2));

await br.close();
