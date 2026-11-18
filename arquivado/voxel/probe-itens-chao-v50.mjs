// Probe v50 — corre as mesmas asserções Node da parte A do test-rpg-v41
// antes de a bateria E2E existir (padrão probe-v47).
import { realpathSync } from "node:fs";
const root = realpathSync("/home/z/my-project/bateumz-cb2c44d1");
const ct = await import(`${root}/src/game/blocos/constants.ts`);
const core = await import(`${root}/src/game/rpg/core.ts`);
const ic = await import(`${root}/src/game/blocos/itensChao.ts`);

let ok = 0, fail = 0;
const t = (nome, cond) => { if (cond) { ok++; console.log("  ✅", nome); } else { fail++; console.log("  ❌", nome); } };

t("criar pop", (() => {
  const it = ic.criarItemChao(126, 2, 5, 12, 7, Math.PI / 2);
  return it.vy > 3 && it.idade === 0 && !it.noChao && Math.abs(it.vx - 1.6) < 1e-9 && Math.abs(it.vz) < 1e-9;
})());
const chao = (x, y, z) => y < 10;
t("cai e aterra", (() => {
  const it = ic.criarItemChao(105, 1, 5, 13, 5, 0);
  for (let k = 0; k < 200; k++) ic.passoItensChao([it], 0.05, chao, 100, 11, 100);
  return it.noChao && Math.abs(it.y - 10.001) < 0.01 && it.vy === 0;
})());
t("fricção assenta", (() => {
  const it = ic.criarItemChao(105, 1, 5, 10.02, 5, 0);
  for (let k = 0; k < 120; k++) ic.passoItensChao([it], 0.05, chao, 100, 11, 100);
  return Math.hypot(it.vx, it.vz) < 0.01;
})());
t("magnete 2,6→recolha 1,7", (() => {
  const it = ic.criarItemChao(105, 1, 5, 10.001, 5, 0);
  let pegos = null;
  for (let k = 0; k < 400 && !(pegos && pegos.length); k++)
    pegos = ic.passoItensChao([it], 0.05, chao, 7.6, 10.02, 5).pegos;
  return !!pegos && pegos.length === 1 && pegos[0] === it && Math.hypot(it.x - 7.6, it.z - 5) <= ic.ITEM_RAIO_PEGA + 0.15;
})());
t("dHoriz 0 recolhe", (() => {
  const it = ic.criarItemChao(105, 1, 5, 10.001, 5, 0);
  return ic.passoItensChao([it], 0.05, chao, 5, 10.02, 5).pegos.length === 1;
})());
t("pegaT atrasa o largado", (() => {
  const it = ic.criarItemChao(122, 1, 5, 10.001, 5, 0, 1.2);
  let cedo = false;
  for (let k = 0; k < 24; k++) if (ic.passoItensChao([it], 0.05, chao, 5, 10.02, 5).pegos.length) cedo = true; // 1,2 s: ainda não
  return !cedo && ic.passoItensChao([it], 0.05, chao, 5, 10.02, 5).pegos.length === 1; // passou → recolhe
})());
t("TTL + abismo", (() => {
  const velho = ic.criarItemChao(105, 1, 5, 10.001, 5, 0);
  velho.idade = ic.ITEM_CHAO_TTL - 0.05;
  const r1 = ic.passoItensChao([velho], 0.06, chao, 100, 11, 100);
  const abismo = ic.criarItemChao(105, 1, 5, -11, 5, 0);
  const r2 = ic.passoItensChao([abismo], 0.05, chao, 100, 11, 100);
  return r1.expirados.length === 1 && r1.expirados[0] === velho && r2.expirados.length === 1;
})());
t("cap 48 velho primeiro", (() => {
  const itens = [];
  for (let k = 0; k < 50; k++) { const it = ic.criarItemChao(100 + k, 1, k, 10.001, k, 0); it.idade = k; itens.push(it); }
  const fora = ic.aplicarCapItens(itens);
  return fora.length === 2 && fora.every((f) => f.idade >= 48) && ic.aplicarCapItens(itens.slice(0, 48)).length === 0;
})());
const perfilBase = (itensChao) => ({ v: 41, dificuldade: "medio", xp: 1, pontos: 0, skills: { guerreiro: 0, explorador: 0, sabio: 0 }, missoes: { historiaFeitas: [] }, descobertas: { regioes: [], pois: [], baus: [] }, creditos: 0, kills: {}, mortes: 0, blocos: 0, bossDerrotado: false, pos: null, inv: null, invArm: null, itensChao, ts: 0 });
t("validador itensChao", (() => {
  const v1 = core.validarPerfilRpg(perfilBase([{ id: 126, qtd: 2, x: 1.5, y: 32, z: 3.5 }, { id: -1, qtd: 1, x: 0, y: 0, z: 0 }, { id: 126, qtd: 1, x: "x", y: 0, z: 0 }]));
  const v2 = core.validarPerfilRpg(perfilBase(undefined));
  const v3 = core.validarPerfilRpg(perfilBase(Array.from({ length: 60 }, (_, k) => ({ id: 126, qtd: 1, x: k, y: 32, z: k }))));
  return v1 && v1.itensChao.length === 1 && v1.itensChao[0].id === 126 && v2 && v2.itensChao === null && v3 && v3.itensChao.length === 48;
})());

console.log(`\nprobe v50 Node: ${ok} ok · ${fail} falharam`);
process.exit(fail > 0 ? 1 : 0);
