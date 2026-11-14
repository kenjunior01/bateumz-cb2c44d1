// PROBE v47b — penhasco REAL do mundo da cidade com SIMULAÇÃO dos orçamentos
// do servidor (horizontal 12 b/s e subida SUBIDA_CAP/SUBIDA_TAXA do core.ts).
// O caminho do drive E2E (1 bloco/125 ms) tem de ser aceite INTEIRO pelo
// servidor até à base do penhasco — a simulação prova-o antes do teste existir.
import { Ruido } from "../src/game/blocos/noise.ts";
import { alturaCidade, RAIO_PLATEAU, RAIO_FUSAO } from "../src/game/cidade/terrenoCidade.ts";
import { NIVEL_MAR } from "../src/game/blocos/constants.ts";
import { SEED_CIDADE, SUBIDA_CAP, SUBIDA_TAXA, GANHO_SALTO, ORCAMENTO_INICIAL } from "../src/game/cidade/core.ts";

const r = new Ruido(SEED_CIDADE);
const h = (x, z) => alturaCidade(r, x, z);
console.log("SUBIDA_CAP", SUBIDA_CAP.toFixed(2), "TAXA", SUBIDA_TAXA, "GANHO_SALTO", GANHO_SALTO.toFixed(2), "ORC_H", ORCAMENTO_INICIAL);

const inicio = [20, 6.5];

// simula o drive: 1 bloco/125 ms ao longo do caminho amostrado a 0.25
function simularCaminho(bx, bz) {
  const passos = Math.ceil(Math.hypot(bx - inicio[0], bz - inicio[1]));
  let orcH = ORCAMENTO_INICIAL, orcS = SUBIDA_CAP, anterior = h(inicio[0], inicio[1]);
  for (let i = 1; i <= passos; i++) {
    const t = i / passos;
    const x = inicio[0] + (bx - inicio[0]) * t;
    const z = inicio[1] + (bz - inicio[1]) * t;
    const hh = h(x, z);
    orcH = Math.min(6, orcH + 12 * 0.125); orcS = Math.min(SUBIDA_CAP, orcS + SUBIDA_TAXA * 0.125);
    const d = Math.hypot(x - (inicio[0] + (bx - inicio[0]) * (i - 1) / passos), z - (inicio[1] + (bz - inicio[1]) * (i - 1) / passos));
    const sub = hh - anterior;
    if (d > orcH) return { ok: false, porque: "alcance no passo " + i };
    if (sub > 0 && sub > orcS) return { ok: false, porque: "parede no passo " + i + " (sub " + sub.toFixed(2) + ")" };
    orcH -= d; if (sub > 0) orcS -= sub;
    anterior = hh;
  }
  return { ok: true, orcSFinal: orcS };
}

const candidatos = [];
for (let bx = Math.round(RAIO_PLATEAU) - 4; bx <= 120; bx += 1) {
  for (let bz = -60; bz <= 60; bz += 1) {
    const hb = h(bx, bz);
    if (hb < NIVEL_MAR + 2) continue;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (Math.hypot(dx, dz) > 2.5 || (dx === 0 && dz === 0)) continue;
      const tx = bx + dx, tz = bz + dz;
      const ht = h(tx, tz);
      if (ht < NIVEL_MAR + 2) continue;
      const sub = ht - hb;
      if (sub < 3.4) continue; // > SUBIDA_CAP 2.22 → recusa garantida
      const sim = simularCaminho(bx, bz);
      if (!sim.ok) continue;
      const dist = Math.hypot(bx - inicio[0], bz - inicio[1]);
      candidatos.push({ bx, bz, hb, tx, tz, ht, sub: Math.round(sub * 100) / 100, dist: Math.round(dist * 10) / 10, orcSFinal: Math.round((sim.orcSFinal ?? 0) * 100) / 100 });
    }
  }
}

candidatos.sort((a, b) => a.dist - b.dist);
console.log("candidatos:", candidatos.length);
const vistos = new Set();
let n = 0;
for (const c of candidatos) {
  const k = `${c.bx},${c.bz}`;
  if (vistos.has(k)) continue;
  vistos.add(k);
  console.log(JSON.stringify(c));
  if (++n >= 8) break;
}
if (!candidatos.length) console.log("SEM candidato — ampliar mais");
