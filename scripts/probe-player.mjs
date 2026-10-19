// Probe: por que o avatar do jogador não aparece?
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0, 300)));
await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector('[data-testid="bw-name-input"]', { timeout: 40000 });
await page.locator('[data-testid="bw-name-input"]').fill("ProbeX");
await page.locator('[data-testid="bw-class-1"]').click();
await page.locator('[data-testid="bw-faction-0"]').click();
await page.locator('[data-testid="bw-enter"]').click();
await page.waitForSelector('[data-testid="bw-play"]', { timeout: 20000 });
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  const e = (window).__bw.engine;
  const anyE = e;
  // acessa privates via cast
  const pg = anyE["pGroup"], pl = anyE["player"];
  if (!pg) return { err: "sem pGroup" };
  const dumpGroup = (g, depth = 0, max = 3) => {
    if (!g || depth > max) return null;
    return {
      type: g.type, name: g.name || "",
      pos: g.position ? [+g.position.x.toFixed(2), +g.position.y.toFixed(2), +g.position.z.toFixed(2)] : null,
      scale: g.scale ? [+g.scale.x.toFixed(2), +g.scale.y.toFixed(2), +g.scale.z.toFixed(2)] : null,
      visible: g.visible,
      kids: g.children ? g.children.slice(0, 8).map(k => dumpGroup(k, depth + 1, max)) : [],
    };
  };
  const box = new (anyE["scene"].constructor.prototype.constructor ? Object : Object)();
  let bbox = null;
  try {
    const THREE = pl.root.constructor;
    // sem import direto do THREE aqui; usa Box3 via engine scene
  } catch { }
  return {
    pGroupPos: [+pg.position.x.toFixed(2), +pg.position.y.toFixed(2), +pg.position.z.toFixed(2)],
    pGroupVisible: pg.visible,
    pGroupKids: pg.children.map(k => `${k.type}(${k.children?.length || 0} kids, vis=${k.visible})`),
    playerRoot: dumpGroup(pl?.root, 0, 2),
    terrainY: anyE["terrainHeight"] ? +anyE["terrainHeight"](pg.position.x, pg.position.z).toFixed(2) : null,
    py: +anyE["py"].toFixed?.(2) || anyE["py"],
    camMode: anyE["camMode"],
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
