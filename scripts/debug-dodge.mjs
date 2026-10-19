// Debug: por que bw-dodge não é clicável?
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0, 200)));

await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("DbgLenda");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-1"]').click();
await page.waitForTimeout(300);
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
console.log("mundo aberto");
await page.waitForTimeout(5000);

// replicate test: WASD move
const p0 = await page.evaluate(() => { const s = (window).__bw.engine.getState(); return { x: s.x, z: s.z }; });
await page.keyboard.down("w");
await page.waitForTimeout(2600);
await page.keyboard.up("w");
const p1 = await page.evaluate(() => { const s = (window).__bw.engine.getState(); return { x: s.x, z: s.z }; });
console.log("moveu:", Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2));
await page.keyboard.press("q");
await page.waitForTimeout(400);

const dodge = page.locator('[data-testid="bw-dodge"]');
console.log("dodge count:", await dodge.count());

// inspeciona visibilidade/geometry
const geo = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="bw-dodge"]');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  // qual elemento está no ponto central?
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return {
    found: true,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
    topAtCenter: top ? `${top.tagName}.${top.className}`.slice(0, 120) : "null",
    topIsSelf: top === el || (top && el.contains(top)),
    hudDead: !!(window).__bw?.getChar?.(),
  };
});
console.log("geometria:", JSON.stringify(geo, null, 1));

// tenta clique com timeout curto
try {
  await dodge.click({ timeout: 5000 });
  console.log("CLIQUE OK");
} catch (e) {
  console.log("CLIQUE FALHOU:", String(e).split("\n").slice(0, 4).join(" | "));
  await page.screenshot({ path: "/tmp/dbg-dodge.png" });
}

// agora repetir o fluxo do teste: spawn mob + 10 ataques + pump
await page.evaluate(() => { (window).__bw.engine.spawnTestMobPublic(false); });
const kills0 = (await page.evaluate(() => (window).__bw.getChar().kills)) || 0;
for (let i = 0; i < 10; i++) {
  await page.evaluate(() => { try { (window).__bw.engine["atkT"] = 0; } catch {} });
  await page.locator('[data-testid="bw-attack"]').dispatchEvent("pointerdown");
  await page.waitForTimeout(200);
}
const pump = async (times = 40, dt = 0.05) => page.evaluate(([t, d]) => {
  const e = (window).__bw.engine;
  for (let i = 0; i < t; i++) {
    try { e["updateProjs"](d); e["updateMobs"](d); e["updateTowers"](d); e["updateDuel"](d); e["updateDungeon"](d); e["updateFx"](d); } catch { }
  }
}, [times, dt]);
await pump(90);
const c2 = await page.evaluate(() => { const c = (window).__bw.getChar(); const s = (window).__bw.engine.getState(); return { kills: c.kills, gold: c.gold, hp: c.hp, level: c.level, region: s.region, cds: s.cds }; });
console.log("estado:", JSON.stringify(c2));

// skill 0 e depois dodge (fluxo exato do teste)
await page.locator('[data-testid="bw-skill-0"]').click();
await page.waitForTimeout(300);
const geo2 = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="bw-dodge"]');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return { found: true, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, topAtCenter: top ? `${top.tagName}.${top.className}`.slice(0, 120) : "null", topIsSelf: top === el || (top && el.contains(top)) };
});
console.log("geometria pós-skill:", JSON.stringify(geo2, null, 1));
try {
  await dodge.click({ timeout: 5000 });
  console.log("CLIQUE OK pós-skill");
} catch (e) {
  console.log("CLIQUE FALHOU pós-skill:", String(e).split("\n").slice(0, 6).join(" | "));
  await page.screenshot({ path: "/tmp/dbg-dodge2.png" });
}
await browser.close();
