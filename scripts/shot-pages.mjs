// Valida multi-páginas mobile após redesign
import { chromium } from "playwright";

const PAGES = [
  ["/", "/tmp/pg-home.png"],
  ["/marketplace", "/tmp/pg-market.png"],
  ["/jogos", "/tmp/pg-jogos.png"],
  ["/lives", "/tmp/pg-lives.png"],
  ["/concursos", "/tmp/pg-concursos.png"],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await ctx.newPage();
for (const [path, out] of PAGES) {
  await page.goto("http://localhost:8099" + path, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await page.waitForSelector(".mob-bottom-bar", { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(path === "/" ? 3500 : 5000);
  await page.screenshot({ path: out });
  console.log("shot", path);
}
// scroll da home para ver secções abaixo
await page.goto("http://localhost:8099/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
await page.waitForSelector('[data-testid="mh-quick"]', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
await page.waitForTimeout(1000);
await page.screenshot({ path: "/tmp/pg-home-mid.png" });
console.log("shot home-mid");
await browser.close();
