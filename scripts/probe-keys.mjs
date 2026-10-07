// Captura warning completo de key duplicada com stack de componentes
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const msgs = [];
page.on("console", (m) => {
  const t = m.text();
  if (t.includes("same key") || t.includes("validateDOMNesting")) msgs.push(t.slice(0, 2600));
});
await page.goto("http://localhost:8099/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(12000);
console.log("==== WARNINGS (" + msgs.length + ") ====");
console.log([...new Set(msgs)].join("\n\n").slice(0, 6000));
await browser.close();
