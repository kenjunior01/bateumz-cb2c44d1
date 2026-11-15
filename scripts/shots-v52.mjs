// screenshot v52 — N4: o remoto com y REAL (o Bruno vê a Ana NO TELHADO
// da Casa da Sorte — o fim do «remoto enterrado no terreno» da v36)
import { chromium } from "playwright";
import { rotaAstar, yEmCampo } from "../test-rotas-cidade.mjs";

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome" });
const mk = async (nome) => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto("http://localhost:8099/cidade", { waitUntil: "domcontentloaded" });
  await p.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 15000 });
  await p.evaluate((n) => { localStorage.setItem("bateu_cidade_nome", n); }, nome);
  await p.getByTestId("cd-entrar").dispatchEvent("click");
  await p.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 15000 });
  await p.evaluate((u) => window.__cidade.mpLigar(u), "ws://localhost:8765");
  await p.waitForFunction(() => window.__cidade?.mpEstado?.() === "ligado", null, { timeout: 15000 });
  return p;
};
const A = await mk("Ana-MZ");
const B = await mk("Bruno-AO");
// a Ana CAMINHA pela rota legal (o protocolo novo — o servidor pisa os MESMOS
// voxels desde a v52) até à casa e SOBE em voo criativo até ao telhado
const rota = rotaAstar(0.5, 6.5, 22.5, 0.5).map(([px, pz]) => [px, Math.round(yEmCampo(px, pz) * 100) / 100, pz]);
await A.evaluate(async (rota) => {
  let pxx = 0.5, pzz = 6.5;
  for (const [px, py, pz] of rota) {
    window.__cidade.teleportar(px, py, pz);
    window.__cidade.mpPassoImediato(px, pz, 0, py, false);
    const espera = Math.max(60, Math.ceil((Math.hypot(px - pxx, pz - pzz) / 12) * 1000) + 40);
    pxx = px; pzz = pz;
    await new Promise((r) => setTimeout(r, espera));
  }
}, rota);
await A.evaluate(async () => {
  for (let i = 1; i <= 7; i++) {
    window.__cidade.teleportar(22.5, 35.02 + i, 0.5);
    window.__cidade.mpPassoImediato(22.5, 0.5, 0, 35.02 + i, true);
    await new Promise((r) => setTimeout(r, 130));
  }
  window.__cidade.teleportar(26, 42, 2);
  window.__cidade.mpPassoImediato(26, 2, 0, 42, true);
  await new Promise((r) => setTimeout(r, 130));
  window.__cidade.teleportar(27, 41.02, 2);
  window.__cidade.mpPassoImediato(27, 2, 0, 41.02, false);
});
await B.waitForFunction(() => {
  const a = window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ");
  return a && a.y != null && a.y > 40;
}, null, { timeout: 8000 }).catch(() => {});
// o Bruno olha para a Casa da Sorte (a leste do spawn): frente = (−sin(yaw), −cos(yaw))
await B.evaluate(() => window.__cidade.olhar(-Math.PI / 2, 0.15));
await B.waitForTimeout(2500); // o raster por software precisa de 2-3 frames para a cena
await B.screenshot({ path: "shots-v52/telhado-remoto.png" });
const yRemoto = await B.evaluate(() => window.__cidade.mpRemotos().find((j) => j.nome === "Ana-MZ")?.y);
console.log("Ana vista pelo Bruno em y =", yRemoto, "(o telhado da Casa da Sorte fica a ~41)");
await browser.close();
