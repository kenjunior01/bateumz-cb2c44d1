// Probe: apanhar o warning de key duplicada com stack completa
import { chromium } from "playwright";
const exe = process.env.PW_CHROME || undefined;
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", async (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  if (t.includes("same key")) {
    console.log("=== DUP KEY WARNING ===");
    console.log(t.slice(0, 3000));
  }
});
await page.goto("http://localhost:8099/arena", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
await browser.close();
console.log("fim");
