// Sonda solo: mesma fórmula do piloto de teste, core direto — compara com o caminho ONLINE
const core = await import(`${process.cwd()}/src/game/kart/core.ts`);
const pista = core.construirPista(core.pistaPorId("deserto"));
const m = pista.amostras.length;
const e = core.novaCorridaOnline({ pista, voltas: 3, semente: 99, jogadores: [{ nome: "Sonda", kart: "viralata", melhorias: {} }] });
// contagem → corrida
for (let i = 0; i < 180; i++) core.passoCorridaMulti(e, {}, 1 / 30);
console.log("fase:", e.fase);
const j = e.corredores.find((c) => c.id === 6);
for (let i = 0; i < 300; i++) {
  const look = 12 + Math.floor(j.vel * 0.35);
  const alvo = pista.amostras[(j.iAmostra + look) % m];
  const dif = Math.atan2(alvo.x - j.x, alvo.z - j.z) - j.ang;
  const difN = Math.atan2(Math.sin(dif), Math.cos(dif));
  const af = Math.abs(difN);
  const ent = { acelerar: af < 0.55 || j.vel < 10, travar: af > 0.55 && j.vel > 12, virar: Math.max(-1, Math.min(1, difN * 2.5)), derrapar: af > 0.4 && j.vel > 16, usarItem: false };
  core.passoCorridaMulti(e, { [6]: ent }, 1 / 30);
  if (i % 30 === 0) console.log(`solo passo ${i}: fase=${e.fase} term=${j.terminou ? 1 : 0} sTotal=${Math.round(j.sTotal)} volta=${j.volta} vel=${j.vel.toFixed(1)} ia=${j.iAmostra} x=${Math.round(j.x)} z=${Math.round(j.z)} fora=${j.foraPista ? 1 : 0} lat=${j.lateralPerto.toFixed(1)} po=${j.posicao} stun=${j.stun.toFixed(2)}`);
}
process.exit(0);
