// PROBE v64: porquê que B não morre? hp de B após cada golpe + corrigidos de A
import { WebSocket } from "ws";

const PORTA = 8766;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function cliente(nome, campeao, xpTotal = 0, essencia = 0) {
  const ws = new WebSocket(`ws://127.0.0.1:${PORTA}`);
  const st = { ws, nome, id: -1, fere: [], corr: [], eu: null, morte: [], snaps: [] };
  ws.on("open", () => ws.send(JSON.stringify({ t: "ola", nome, campeao, nivel: 1, xpTotal, essencia, itens: {}, abates: 0 })));
  ws.on("message", (b) => {
    let m; try { m = JSON.parse(String(b)); } catch { return; }
    if (m.t === "bemvindo") { st.id = m.id; st.eu = m.eu; }
    if (m.t === "snap") { st.eu = m.eu; st.snaps.push(m); }
    if (m.t === "fere") st.fere.push(m.dano);
    if (m.t === "corrigido") st.corr.push(m.motivo);
    if (m.t === "morteheroi") st.morte.push(m);
  });
  st.enviar = (o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
  return st;
}

async function andar(st, tx, tz) {
  const ox = st.x ?? -78, oz = st.z ?? 78;
  const dx = tx - ox, dz = tz - oz;
  const d = Math.hypot(dx, dz);
  const passos = Math.ceil(d);
  for (let i = 1; i <= passos; i++) {
    const f = i / passos;
    const x = ox + dx * f, z = oz + dz * f;
    st.x = x; st.z = z;
    st.enviar({ t: "pos", x, z, ry: 0, anim: "andar" });
    await dormir(14);
  }
}

const A = cliente("Kaimu-P", "kaimu", 8100, 500);
await dormir(400);
const B = cliente("Vex-P", "vex");
await dormir(400);
console.log("A eu:", A.eu);
console.log("B eu:", B.eu);
console.log("ids:", A.id, B.id);

await andar(B, -70, 62);
await dormir(400);
await andar(A, -71, 64);
await dormir(400);
console.log(`d(A,B) = ${Math.hypot(A.x - B.x, A.z - B.z).toFixed(2)}`);

const esperado = Math.round(162 * 100 / (100 + 16));
console.log("dano esperado por golpe:", esperado, "→ golpes p/ morrer:", Math.ceil(510 / esperado));

for (let i = 1; i <= 8; i++) {
  await dormir(1300);
  A.enviar({ t: "golpepvp", alvoId: B.id, hab: "" });
  await dormir(250);
  console.log(`golpe ${i}: A.corr=${JSON.stringify(A.corr)} B.fere=${JSON.stringify(B.fere)} B.eu.hp=${B.eu?.hp} morto=${B.eu?.morto}`);
  A.corr.length = 0;
}
console.log("B.morte:", JSON.stringify(B.morte));
process.exit(0);
