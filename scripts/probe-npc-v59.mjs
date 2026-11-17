// probe v59 — rastrear difusões npc no servidor com timeout PADRÃO
// sequência do teste de pureza: claim A → B claim → B fim → pausas → npcfala
import WebSocket from "ws";

const URL = process.argv[2] || "ws://127.0.0.1:8794";
const T0 = Date.now();
const stamp = () => `+${((Date.now() - T0) / 1000).toFixed(2)}s`;

function cli(nome) {
  const c = { nome, msgs: [], ws: null };
  c.ligar = () => new Promise((res) => {
    const ws = new WebSocket(URL);
    c.ws = ws;
    ws.on("open", () => { console.log(`${stamp()} ${nome}: aberto`); ws.send(JSON.stringify({ t: "ola", nome: c.nome })); res(); });
    ws.on("message", (cru) => {
      const m = JSON.parse(String(cru));
      if (m.t === "npc" || m.t === "bemvindo") console.log(`${stamp()} ${nome} ← ${m.t}: ${JSON.stringify(m.npc ?? m.conversas ?? { id: m.id })}`);
      c.msgs.push(m);
    });
    ws.on("close", () => console.log(`${stamp()} ${nome}: fechado`));
  });
  c.enviar = (m) => { console.log(`${stamp()} ${nome} → ${JSON.stringify(m)}`); try { c.ws.send(JSON.stringify(m)); } catch (e) { console.log(`  erro: ${e.message}`); } };
  return c;
}

const A = cli("A"), B = cli("B");
await A.ligar();
await new Promise((r) => setTimeout(r, 300));
await B.ligar();
await new Promise((r) => setTimeout(r, 400));

console.log("--- claim A");
A.enviar({ t: "npcfala" });
await new Promise((r) => setTimeout(r, 400));
console.log("--- claim B");
B.enviar({ t: "npcfala" });
await new Promise((r) => setTimeout(r, 400));
console.log("--- fim B");
B.enviar({ t: "npcfim" });
await new Promise((r) => setTimeout(r, 900));

console.log("--- pureza: A npcfala (pode ser recusado pelo gate)");
A.enviar({ t: "npcfala" });
await new Promise((r) => setTimeout(r, 300));
console.log("--- janela: sleep 3400");
await new Promise((r) => setTimeout(r, 3400));
console.log("--- A npcfala de novo (deve ser aceito, sem difusão)");
A.enviar({ t: "npcfala" });
await new Promise((r) => setTimeout(r, 900));
console.log("--- fim do probe");
A.ws.close(); B.ws.close();
setTimeout(() => process.exit(0), 300);
