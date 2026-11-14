const core = await import(new URL("../src/game/rpg/core.ts", import.meta.url).href);
const ct = await import(new URL("../src/game/blocos/constants.ts", import.meta.url).href);
let falhas = 0;
for (const [chave, lista] of Object.entries(core.ESPOLIO_BAUS)) {
  for (const e of lista) {
    const emItens = !!ct.ITENS[e.id];
    const emBlocos = e.id < 100 && !!ct.BLOCOS[e.id];
    if (!emItens && !emBlocos) { console.log(`  FALHA ${chave}: id ${e.id} não é ITENS nem BLOCOS · NOMES=${ct.NOMES[e.id]}`); falhas++; }
  }
}
console.log("falhas:", falhas);
console.log("pão id:", ct.I.PAO, "· maçã id:", ct.I.MACA, "· NOMES pão:", ct.NOMES[ct.I.PAO]);
console.log("texto:", core.textoEspolio("poi:aldeia:1", ct.NOMES));
