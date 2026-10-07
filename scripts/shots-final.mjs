// Validação visual final: /lives e /jogos com tema light forçado (o caso "ofuscado")
import { chromium } from "playwright";

const browser = await chromium.launch();
async function shot(url, path, w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:8099" + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(11000);
  await page.screenshot({ path });
  // captura cor computada do h1 (prova da correção)
  const h1Color = await page.evaluate(() => {
    const h = document.querySelector("h1");
    return h ? getComputedStyle(h).color + " | fundo: " + getComputedStyle(document.body).backgroundColor : "sem h1";
  });
  console.log(`${url} → ${path} | h1: ${h1Color}`);
  await ctx.close();
}
await shot("/lives?game=mmorpg", "shots/final-lives-light.png");
await shot("/lives?game=mmorpg", "shots/final-lives-mobile-light.png", 390, 844);
await shot("/jogos", "shots/final-jogos-light.png");
await browser.close();
console.log("OK");
