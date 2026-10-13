import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://localhost:8099/tournaments", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(6000);
const btns = await p.locator("nav button, nav [role=button]").allTextContents().catch(() => []);
console.log("NAV BUTTONS:", JSON.stringify(btns.filter(t => t.trim()).slice(0, 20)));
const hasNav = await p.locator("nav").count();
console.log("NAV COUNT:", hasNav);
const biz = p.getByRole("button", { name: /negócio/i }).first();
console.log("BIZ BTN VISIBLE:", await biz.isVisible().catch(() => false));
if (await biz.isVisible().catch(() => false)) {
  await biz.click();
  await p.waitForTimeout(1200);
  console.log("GANHE DINHEIRO APÓS CLICK:", await p.getByText("Ganhe Dinheiro").first().isVisible().catch(() => false));
  const all = await p.getByText("Ganhe Dinheiro").count().catch(() => 0);
  console.log("COUNT:", all);
}
await b.close();
