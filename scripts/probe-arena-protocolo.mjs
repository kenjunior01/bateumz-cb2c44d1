// Teste rápido do protocolo da arena (2 clientes ws Node)
import { WebSocket } from "ws";

const URL = "ws://localhost:8766";
const esperas = {};
const aguardar = (chave, ms = 4000) => new Promise((r, j) => {
  esperas[chave] = r;
  setTimeout(() => j(new Error("timeout " + chave)), ms);
});

function cliente(nome, campeao) {
  const ws = new WebSocket(URL);
  const state = { ws, nome, id: -1, snaps: 0, falas: [], players: [] };
  ws.on("open", () => ws.send(JSON.stringify({ t: "ola", nome, campeao, nivel: 1, xpTotal: 0, essencia: 0, itens: {}, abates: 0 })));
  ws.on("message", (b) => {
    const m = JSON.parse(String(b));
    if (m.t === "bemvindo") { state.id = m.id; esperas["bemvindo"]?.(m); }
    if (m.t === "snap") { state.snaps++; if (m.j?.length) state.players.push(...m.j.map((j) => j.nome)); esperas["snap1"]?.(m); }
    if (m.t === "fala") state.falas.push(`${m.nome}: ${m.texto}`);
    if (m.t === "fere") esperas["fere"]?.(m);
    if (m.t === "mobmorreu") esperas["mobmorreu"]?.(m);
    if (m.t === "corrigido") esperas["corrigido"]?.(m);
    if (m.t === "entrou") esperas["entrou"]?.(m);
  });
  return state;
}

const A = cliente("TesteA", "kaimu");
const B = cliente("TesteB", "lyra");
await aguardar("bemvindo"); await aguardar("entrou");
await aguardar("snap1");

// A anda para junto de B? Não: A teleporta perto de B e B vê A na snapshot
A.ws.send(JSON.stringify({ t: "pos", x: -74, z: 74, ry: 0, anim: "parado", hp: 660, hpMax: 660, mp: 300, mpMax: 300, nivel: 1, abates: 0, essencia: 0, itens: {}, campeao: "kaimu" }));
B.ws.send(JSON.stringify({ t: "pos", x: -76, z: 76, ry: 0, anim: "parado", hp: 520, hpMax: 520, mp: 430, mpMax: 430, nivel: 1, abates: 0, essencia: 0, itens: {}, campeao: "lyra" }));
await new Promise((r) => setTimeout(r, 500));

// chat A → B
A.ws.send(JSON.stringify({ t: "fala", texto: "olá arena!" }));
await new Promise((r) => setTimeout(r, 300));
console.log("falas em B:", B.falas);

// golpe válido: procura um mob perto de B? Usa um claim de dano num id próximo da pos de B
// (o mob mais próximo do centro: ids 1..20; B está em (-76,76) — camps a >20u → recusa honesta)
B.ws.send(JSON.stringify({ t: "golpe", id: 1, dano: 50, x: -76, z: 76 }));
const corr = await aguardar("corrigido").catch(() => null);
console.log("corrigido (esperado, mob longe):", corr?.motivo ?? "nenhum");

// fala rápida demais → corrigido
B.ws.send(JSON.stringify({ t: "fala", texto: "rapidinho" }));
const corr2 = await aguardar("corrigido", 1500).catch(() => null);
console.log("corrigido fala rápida:", corr2?.motivo ?? "nenhum");

console.log("IDs:", A.id, B.id, "| snaps A:", A.snaps, "| A vê remotos:", A.players);
A.ws.close(); B.ws.close();
process.exit(0);
