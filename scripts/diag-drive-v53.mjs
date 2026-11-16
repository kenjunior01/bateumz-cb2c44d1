// DIAG v53-temp — replicar o DRIVE do test-mp-v37 em Node puro (sem browser,
// sem rAF): a MESMA rotaAstar(21.92,0.49 → DEGRAU_A), o MESMO envia (teleport
// é client-side — irrelevante para o servidor; só as msgs pos contam), o
// MESMO ritmo. Se as RECUSAS acontecem aqui também → geometria da rota/arco;
// se não → interferência do rAF do cliente (drift do y pela física).
import WebSocket from "ws";
import { spawn } from "node:child_process";
import { rotaAstar } from "../test-rotas-cidade.mjs";

const ok = (n, c, e = "") => console.log(`${c ? "✅" : "❌"} ${n} ${e}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PORT = 8833;
const raiz = new URL("..", import.meta.url).pathname;
const srv = spawn(process.execPath, ["server/cidade-servidor.mjs"], {
  cwd: raiz, env: { ...process.env, PORT: String(PORT), LOG_RECUSAS: "1" }, stdio: ["ignore", "pipe", "pipe"],
});
srv.stdout.on("data", (d) => { const s = String(d); if (s.includes("RECUSA")) process.stdout.write("  [srv] " + s); });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("sem servidor")), 15000);
  srv.stdout.on("data", (d) => { if (String(d).includes("no ar")) { clearTimeout(t); resolve(); } });
});

const ws = new WebSocket(`ws://localhost:${PORT}`);
let correcoes = 0;
ws.on("message", (raw) => { const m = JSON.parse(String(raw)); if (m.t === "corrigido") { correcoes++; console.log("  [cliente] corrigido", JSON.stringify(m)); } });
await new Promise((r) => ws.on("open", r));
ws.send(JSON.stringify({ t: "ola", nome: "Drive-Diag" }));
await sleep(300);

// o MESMO drive do test-mp-v37 (alt = alturaCampo ≡ client alturaTerreno, provado)
// — mas primeiro o jogador tem de CHEGAR ao início da rota legalmente: no E2E
// a secção «Movimento partilhado» já levou a Ana a (22.5, 0.5). Aqui: a MESMA
// rota wps1 do E2E (rotaAstar(0.5,6.5 → 22.5,0.5), 1 bloco por msg, plano).
const DEGRAU_A = [-58.02, 33.5];
const yEmCampo2 = (await import("../test-rotas-cidade.mjs")).yEmCampo;
const chegar = rotaAstar(0.5, 6.5, 22.5, 0.5);
for (const [cx, cz] of chegar) {
  ws.send(JSON.stringify({ t: "pos", x: Math.round(cx * 100) / 100, z: Math.round(cz * 100) / 100, ry: 0, y: 35.02, voando: false }));
  await sleep(130);
}
console.log(`chegada ao início da rota (${chegar.length} passos, corr=${correcoes})`);
const rota = rotaAstar(21.92, 0.49, DEGRAU_A[0], DEGRAU_A[1]);
console.log(`rota: ${rota.length} pontos`);
const alt = (x, z) => Math.round(yEmCampo2(x, z) * 100) / 100;
let prev = null;
const envia = async (x, y, z, dPasso, minSono = 0) => {
  ws.send(JSON.stringify({ t: "pos", x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, ry: 0, y: Math.round(y * 100) / 100, voando: false }));
  await sleep(Math.max(minSono, 60, Math.ceil((dPasso / 12) * 1000) + 40));
};
for (const [px, pz] of rota) {
  const y = alt(px, pz);
  if (prev) {
    const dy = y - prev.y;
    const dPasso = Math.hypot(px - prev.x, pz - prev.z);
    if (dy > 0.5) {
      const mx = Math.round((prev.x + (px - prev.x) * 0.5) * 100) / 100;
      const mz = Math.round((prev.z + (pz - prev.z) * 0.5) * 100) / 100;
      await envia(mx, Math.round((prev.y + 1.1) * 100) / 100, mz, dPasso * 0.55);
      await envia(px, y, pz, 0.1, 500);
      prev = { x: px, y, z: pz };
      continue;
    } else if (dy < -0.5) {
      await envia(px, prev.y, pz, dPasso);
      await envia(px, y, pz, 0.1);
      prev = { x: px, y, z: pz };
      continue;
    } else {
      await envia(px, y, pz, dPasso);
    }
  } else {
    await envia(px, y, pz, 0.1);
  }
  prev = { x: px, y, z: pz };
}
await sleep(500);
ok("drive sem correções (Node puro, sem rAF)", correcoes === 0, `corr=${correcoes}`);
ws.close();
srv.kill("SIGINT");
await sleep(200);
try { srv.kill("SIGKILL"); } catch { /* ignore */ }
process.exit(correcoes ? 1 : 0);
