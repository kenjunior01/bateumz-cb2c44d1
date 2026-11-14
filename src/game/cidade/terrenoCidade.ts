// ============================================================
// CIDADE BATEU — TERRENO PURO (v46)
// Plateau e fusão com o terreno natural extraídos da classe para
// módulo NULO-DOM: corridas IGUAIS no main thread (MundoCidade
// delega) e no Web Worker do motor partilhado (perfil "cidade").
// Zero THREE, zero DOM.
// ============================================================

import { ALTURA } from "../blocos/constants.ts";
import { Ruido } from "../blocos/noise.ts";
import { alturaTerrenoBase, type PerfilTerreno } from "../blocos/geracao.ts";
import { ALTURA_PLATEAU } from "./core.ts";

/** Raio do plateau plano (para além disso o terreno natural regressa). */
export const RAIO_PLATEAU = 58;
/** Raio onde o plateau termina de fundir com o terreno natural. */
export const RAIO_FUSAO = 72;

/** Plateau plano da cidade, fundindo suavemente com o terreno natural. */
export function alturaCidade(ruido: Ruido, x: number, z: number): number {
  const dist = Math.hypot(x, z);
  if (dist <= RAIO_PLATEAU) return ALTURA_PLATEAU;
  if (dist < RAIO_FUSAO) {
    const natural = alturaTerrenoBase(ruido, x, z);
    const t = (dist - RAIO_PLATEAU) / (RAIO_FUSAO - RAIO_PLATEAU);
    return Math.max(4, Math.min(ALTURA - 6, Math.round(ALTURA_PLATEAU + (natural - ALTURA_PLATEAU) * t)));
  }
  return alturaTerrenoBase(ruido, x, z);
}

/** Cidade tem sempre clima de planície dentro da fusão; lá fora,
 *  o bioma natural usa a ALTURA DA CIDADE no teste de montanha
 *  (mesma semântica do super.bioma com dispatch dinâmico). */
export function biomaCidade(ruido: Ruido, x: number, z: number): "planicie" | "deserto" | "floresta" | "montanha" {
  if (Math.hypot(x, z) <= RAIO_FUSAO) return "planicie";
  const t = ruido.fbm2(x * 0.005 + 900, z * 0.005 + 900, 3);
  if (alturaCidade(ruido, x, z) > 52) return "montanha";
  if (t < 0.36) return "deserto";
  if (t > 0.62) return "floresta";
  return "planicie";
}

export function perfilCidade(ruido: Ruido): PerfilTerreno {
  return {
    altura: (x, z) => alturaCidade(ruido, x, z),
    bioma: (x, z) => biomaCidade(ruido, x, z),
  };
}
