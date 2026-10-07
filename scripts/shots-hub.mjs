// Screenshots de diagnóstico: /lives e /jogos (desktop + mobile), com e sem sessão
import { chromium } from "playwright";

const BASE = "http://localhost:8099";

async function shot(browser, { path, url, w, h, session }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log(`  [console.error @ ${path}]`, m.text().slice(0, 160)); });
  page.on("pageerror", (e) => console.log(`  [pageerror @ ${path}]`, String(e).slice(0, 200)));
  if (session) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("sb-bateumz-auth-token", JSON.stringify({
          access_token: "demo", refresh_token: "demo", token_type: "bearer",
          user: { id: "demo-user-123", email: "demo@bateu.mz", user_metadata: { display_name: "Demo" } },
        }));
        localStorage.setItem("bw_session_marker", "1");
      } catch {}
    });
  }
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path, fullPage: false });
  console.log("shot:", path);
  await ctx.close();
}

const browser = await chromium.launch();
await shot(browser, { path: "shots/hub-lives-desktop-guest.png", url: "/lives?game=mmorpg", w: 1440, h: 900, session: false });
await shot(browser, { path: "shots/hub-lives-desktop-user.png", url: "/lives?game=mmorpg", w: 1440, h: 900, session: true });
await shot(browser, { path: "shots/hub-lives-mobile-guest.png", url: "/lives?game=mmorpg", w: 390, h: 844, session: false });
await shot(browser, { path: "shots/hub-jogos-desktop-guest.png", url: "/jogos", w: 1440, h: 900, session: false });
await shot(browser, { path: "shots/hub-jogos-mobile-guest.png", url: "/jogos", w: 390, h: 844, session: false });
await shot(browser, { path: "shots/hub-lives-mobile-scroll.png", url: "/lives", w: 390, h: 844, session: false, });
// scroll extra
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "shots/hub-lives-mobile-mmorpg-scrolled.png" });
  console.log("shot: hub-lives-mobile-mmorpg-scrolled.png");
  await ctx.close();
}
await browser.close();
console.log("OK");
