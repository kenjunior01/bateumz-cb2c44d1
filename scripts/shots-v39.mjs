import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: process.env.PW_CHROME });
const shots = [
  { url: "http://localhost:8099/", w: 1280, h: 800, f: "/tmp/shots/v39-home-desktop.png" },
  { url: "http://localhost:8099/", w: 375, h: 740, m: true, f: "/tmp/shots/v39-home-mobile.png" },
  { url: "http://localhost:8099/suporte", w: 1280, h: 800, f: "/tmp/shots/v39-suporte.png" },
  { url: "http://localhost:8099/protecao", w: 1280, h: 800, f: "/tmp/shots/v39-protecao.png" },
];
import { mkdirSync } from "node:fs";
mkdirSync("/tmp/shots", { recursive: true });
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, isMobile: !!s.m, hasTouch: !!s.m, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem("bateu_region", "MZ"));
  await p.goto(s.url, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: s.f });
  await ctx.close();
  console.log("✓", s.f);
}
await browser.close();
