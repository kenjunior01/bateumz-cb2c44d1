// ============================================================
// BATEU RPG — TERRENO PURO (v46)
// As fórmulas de altura/bioma do RPG extraídas da classe para
// módulo NULO-DOM: corridas IGUAIS no main thread (MundoRPG
// delega) e no Web Worker do motor partilhado (perfil "rpg").
// Padrão Veloren: o crate `world` é determinístico e partilhável.
// Zero THREE, zero DOM.
// ============================================================

import { ALTURA } from "../blocos/constants";
import { Ruido } from "../blocos/noise";
import { alturaTerrenoBase, type PerfilTerreno } from "../blocos/geracao";
import { ALTURA_ALDEIA, REGIOES, POIS } from "./core";

/** Alturas fixas dos padins dos POIs (o terreno funde para estas alturas). */
export const PAD_POI: Record<string, number> = {
  aldeia: ALTURA_ALDEIA,     // 32 — planície da aldeia (é o próprio centro)
  torre: ALTURA_ALDEIA,      // dentro da planície plana
  cacadores: 34,
  ruinas: 32,
  cova: 32,
  baoba: 32,
  porto: 31,                 // praia (NIVEL_MAR=30 → areia a h<31)
  forja: 33,
};

/** Alvos de altura por região + ruído próprio (terreno com sabor). */
const ALVO_REGIAO: Record<string, { base: number; ruga: number }> = {
  aldeia:   { base: 32, ruga: 1.2 },
  planalto: { base: 36, ruga: 2.5 },
  miombo:   { base: 33, ruga: 2.2 },
  costa:    { base: 31, ruga: 1.8 },   // z>72 desce ao mar
  serra:    { base: 42, ruga: 7 },
  cinzas:   { base: 35, ruga: 3 },
};

/** Peso (0..1) da influência de uma região em (x, z). */
export function pesoRegiao(x: number, z: number): { regiao: string; w: number } {
  let melhor = "", melhorW = 0;
  for (const r of REGIOES) {
    const d = Math.hypot(x - r.cx, z - r.cz);
    const w = Math.max(0, Math.min(1, (r.raio * 1.25 - d) / (r.raio * 0.7)));
    if (w > melhorW) { melhorW = w; melhor = r.id; }
  }
  return { regiao: melhor, w: melhorW };
}

/** Terreno do RPG: regiões com sabor, padins planos nos POIs.
 *  Excepcionalmente aceita o ruido por parâmetro para correr
 *  igual no worker (mesma instância lógica = mesma semente). */
export function alturaRpg(ruido: Ruido, x: number, z: number): number {
  const natural = alturaTerrenoBase(ruido, x, z);
  const { regiao, w } = pesoRegiao(x, z);
  let h = natural;
  if (w > 0) {
    const alvo = ALVO_REGIAO[regiao] ?? { base: 30, ruga: 2 };
    let alvoH = alvo.base + ruido.n2(x * 0.02, z * 0.02) * alvo.ruga;
    // costa: a sul (z>72) o mar — terrain below sea level
    if (regiao === "costa" && z > 72) alvoH = 27 + ruido.n2(x * 0.02, z * 0.02) * 1.6;
    // serra: picos com o mesmo ruído de montanha do motor base
    if (regiao === "serra") alvoH += Math.max(0, ruido.fbm2(x * 0.006 + 500, z * 0.006 + 500, 3) - 0.45) * 26;
    h = natural * (1 - w) + alvoH * w;
  }
  // padins planos dos POIs (o terreno funde para a altura fixa)
  for (const p of POIS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < 14) {
      const pw = Math.max(0, Math.min(1, (10 - d) / 5));
      const padY = PAD_POI[p.id] ?? ALTURA_ALDEIA;
      h = h * (1 - pw) + padY * pw;
    }
  }
  return Math.max(4, Math.min(ALTURA - 6, Math.floor(h)));
}

/** Biomas por região: miombo = floresta densa, serra = montanha. */
export function biomaRpg(ruido: Ruido, x: number, z: number): "planicie" | "deserto" | "floresta" | "montanha" {
  const { regiao, w } = pesoRegiao(x, z);
  if (w > 0.45) {
    if (regiao === "miombo") return "floresta";
    if (regiao === "serra") return "montanha";
    return "planicie";
  }
  const t = ruido.fbm2(x * 0.005 + 900, z * 0.005 + 900, 3);
  if (alturaRpg(ruido, x, z) > 52) return "montanha";
  if (t < 0.36) return "deserto";
  if (t > 0.62) return "floresta";
  return "planicie";
}

export function perfilRpg(ruido: Ruido): PerfilTerreno {
  return {
    altura: (x, z) => alturaRpg(ruido, x, z),
    bioma: (x, z) => biomaRpg(ruido, x, z),
  };
}
