// Debug interativo dos pontos falhando no v32
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || CHROME });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200)); });

  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!(window).__blocos, null, { timeout: 20000 });
  await page.evaluate(() => { (window).__blocos.apagarSave(); (window).__blocos.iniciar("sobrevivencia"); });
  await page.waitForFunction(() => (window).__blocos.captura().fase === "jogando", null, { timeout: 15000 });

  const ar = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    for (const mo of m.gestor.mobs) if (mo.vivo) m.gestor.matar(mo, false);
    m.gestor.mobs = m.gestor.mobs.filter((mo) => mo.vivo);
    m.gestor.cdSpawn = 99999;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) {
      m.mundo.setBloco(fx + dx, fy - 1, fz + dz, 3);
      m.mundo.setBloco(fx + dx, fy - 2, fz + dz, 3);
      for (let dy = 0; dy <= 10; dy++) m.mundo.setBloco(fx + dx, fy + dy, fz + dz, 0);
    }
    b.teleportar(fx + 0.5, fy + 0.02, fz + 0.5);
    b.olhar(0, 0);
    b.pump(3);
    return { fx, fy, fz };
  });
  console.log("arena:", ar);

  // DEBUG 1: comer peixe assado
  const comer = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    b.limparInv(); b.dar(131, 1);
    const slots = b.captura().slots;
    const idx = slots.findIndex((s) => s && s.id === 131);
    b.selecionar(idx);
    b.definirFome(10);
    const antes = { selecao: m.inv.selecao, slot: m.inv.slots[m.inv.selecao], fome: m.fome, fase: m.fase };
    m.comer(); // chamada DIRETA ao método (não o hook de flag)
    b.pump(2);
    return { antes, idx, depois: { fome: m.fome, slot: m.inv.slots[m.inv.selecao] }, slots: slots.slice(0, 3) };
  });
  console.log("DEBUG comer:", JSON.stringify(comer));

  // DEBUG 2: pesca passo a passo
  const pesca1 = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const fx = Math.floor(m.px), fy = Math.floor(m.py), fz = Math.floor(m.pz);
    for (let dx = 2; dx <= 4; dx++) for (let dz = -1; dz <= 1; dz++) m.mundo.setBloco(fx + dx, fy - 1, fz + dz, 6);
    b.limparInv(); b.dar(127, 1);
    const idx = b.captura().slots.findIndex((s) => s && s.id === 127);
    b.selecionar(idx);
    return { idx, selecionado: m.inv.selecionado(), blocosAgua: [m.mundo.getBloco(fx + 3, fy - 1, fz), m.mundo.getBloco(fx + 2, fy - 1, fz)] };
  });
  console.log("DEBUG pesca setup:", JSON.stringify(pesca1));

  const mira = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const dx = ar3 = 0; void dx;
    return { yaw: m.yaw, pitch: m.pitch, py: m.py, px: m.px, pz: m.pz };
  });
  void mira;

  // mirar na água e chamar pescarAcao DIRETAMENTE
  const pesca2 = await page.evaluate(([fx, fy, fz]) => {
    const b = (window).__blocos, m = b.motor;
    const dx = fx + 3.5 - m.px, dy = fy - 0.5 - (m.py + 1.62), dz = fz + 0.5 - m.pz;
    const yaw = Math.atan2(-dx, -dz);
    const horiz = Math.hypot(dx, dz);
    b.olhar(yaw, Math.atan2(dy, horiz));
    const miraAguaDireto = m.miraAgua ? "existe" : "privado";
    b.atacar(); b.pump(3);
    return { yaw: m.yaw, pitch: m.pitch, miraAguaDireto, pesca: b.pesca(), aviso: b.captura().avisos.map((a) => a.texto) };
  }, [ar.fx, ar.fy, ar.fz]);
  console.log("DEBUG pesca cast:", JSON.stringify(pesca2));

  // se não lançou, chamar pescarAcao diretamente para ver o aviso
  const pesca3 = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    if (b.pesca()) return { jaLancada: true };
    m.pescarAcao();
    return { pesca: b.pesca(), aviso: b.captura().avisos.map((a) => a.texto), pos: [m.px, m.py, m.pz] };
  });
  console.log("DEBUG pescarAcao direto:", JSON.stringify(pesca3));

  // DEBUG 3: overflow mobile
  const over = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const wide = [...document.querySelectorAll("*")].filter((el) => el.getBoundingClientRect().right > 376 || el.getBoundingClientRect().left < -1).slice(0, 5).map((el) => `${el.tagName}.${String(el.className).slice(0, 60)} r=${Math.round(el.getBoundingClientRect().right)}`);
    return { scrollW: doc.scrollWidth, wide };
  });
  console.log("DEBUG overflow (viewport 1280, referência):", JSON.stringify(over).slice(0, 600));

  await page.setViewportSize({ width: 375, height: 700 });
  await page.waitForTimeout(800);
  const over375 = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const wide = [...document.querySelectorAll("*")].filter((el) => el.getBoundingClientRect().right > 376 && el.getBoundingClientRect().width > 4).slice(0, 8).map((el) => `${el.tagName} ${String(el.className).slice(0, 70)} r=${Math.round(el.getBoundingClientRect().right)}`);
    return { scrollW: doc.scrollWidth, wide };
  });
  console.log("DEBUG overflow 375:", JSON.stringify(over375, null, 1).slice(0, 1200));

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
