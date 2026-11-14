// ============================================================
// BATEUCRAFT — ITENS NO CHÃO (v50): o loot é uma ENTIDADE do mundo
// ============================================================
// Padrão estudado do Veloren (v35/v38): os drops de inimigos são
// entidades com física própria e recolha magnética (o herói passa
// perto e o item desliza até ele) — nunca «o mob morre e a mochila
// enche por magia». A FORMA vem do estudo; o código é próprio e o
// dado é todo do motor partilhado (IDs reais, NOMES reais).
//
// v50 fecha a nota honesta da v48: «não há drop de itens no chão à
// veloren/minecraft». O escopo segue o Veloren: drops de MOB morto
// pelo herói + largar (Q) pelo herói. Blocos quebrados e baús (v48,
// aviso honesto «o que não coube») continuam a entregar DIRECTO —
// decisão de casa, anotada.
//
// ISOMÓRFICO (padrão v47/v49): corre IGUAL no browser e no Node —
// zero THREE, zero DOM, import com extensão .ts explícita. A física,
// o magnete, o TTL e o cap são PUROS; as malhas vivem no sistema RPG
// (sistemaRpg.ts), que também é o dono da recolha (inventário real).
// ============================================================

import { GRAVIDADE } from "./constants.ts";

export interface ItemChao {
  id: number;         // ID real do motor (BLOCOS <100 ou ITENS ≥100)
  qtd: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  idade: number;      // s — expira ao TTL (o mundo não é um armazém)
  noChao: boolean;
  /** cooldown do aviso «mochila cheia — o item fica no chão» (sem spam) */
  avisoCheiaT: number;
  /** atraso de recolha (s): o largado pelo PRÓPRIO herói não volta para a
   *  mochila no instante seguinte (padrão Minecraft/Veloren — sem pegaT, o
   *  Q largaria e o magnete devolveria no mesmo segundo). Drops de mob: 0. */
  pegaT: number;
}

/** Tempo de vida no chão (s). Regra da casa, declarada na ajuda. */
export const ITEM_CHAO_TTL = 120;
/** Recolha automática (raio horizontal, m). */
export const ITEM_RAIO_PEGA = 1.7;
/** Magnete: dentro deste raio o item ESCORREGA até ao herói (m). */
export const ITEM_RAIO_IMA = 3.0;
/** Limite honesto de itens no mundo — o mais VELHO sai primeiro. */
export const ITEM_CAP = 48;

/** Nasce com um pequeno salto na direção `ang` (o «pop» do loot).
 *  O ângulo vem de fora (PRNG local do sistema) — nada de Math.random
 *  escondido: corridas repetem-se. `pegaT` > 0 só no largar do herói. */
export function criarItemChao(id: number, qtd: number, x: number, y: number, z: number, ang: number, pegaT = 0): ItemChao {
  return {
    id, qtd, x, y, z,
    vx: Math.sin(ang) * 1.6, vy: 3.2, vz: Math.cos(ang) * 1.6,
    idade: 0, noChao: false, avisoCheiaT: 0, pegaT,
  };
}

export interface PassoItensChao { pegos: ItemChao[]; expirados: ItemChao[] }

/** Um passo de física + magnete + recolha para TODOS os itens.
 *  `solido` é a função REAL do mundo (Mundo.solido) — o Node passa
 *  a sua (testes). MUTA os itens in-place; devolve os detetados para
 *  recolha (o chamador decide com o inventário REAL do motor: recolhe
 *  tudo, parcial ou nada — o que não couber FICA no chão) e os
 *  expirados por TTL ou queda ao vazio (y < −10, como os mobs). */
export function passoItensChao(
  itens: ItemChao[], dt: number,
  solido: (x: number, y: number, z: number) => boolean,
  px: number, py: number, pz: number,
): PassoItensChao {
  const pegos: ItemChao[] = [];
  const expirados: ItemChao[] = [];
  for (const it of itens) {
    it.idade += dt;
    it.avisoCheiaT = Math.max(0, it.avisoCheiaT - dt);
    if (it.idade >= ITEM_CHAO_TTL || it.y < -10) { expirados.push(it); continue; }

    // distância ao herói (centro do corpo ≈ py + 0.9) — usada pelo magnete
    // E pela fricção (fora do alcance, o item assenta em vez de deslizar)
    const dx = px - it.x, dz = pz - it.z, dy = (py + 0.9) - it.y;
    const dHoriz = Math.hypot(dx, dz);
    // ── magnete + recolha ──
    // o largado pelo próprio herói espera o pegaT — não volta de imediato
    let imaNestePasso = false;
    if (it.pegaT > 0) { it.pegaT = Math.max(0, it.pegaT - dt); }
    else if (dHoriz < ITEM_RAIO_IMA && Math.abs(dy) < 2.2) {
      if (dHoriz <= ITEM_RAIO_PEGA) { pegos.push(it); continue; } // em cima do item também recolhe (dHoriz 0)
      // escorrega NA DIREÇÃO do herói — no chão, sem voar para cima dele
      const vel = Math.min(3.2, 0.8 + dHoriz * 0.8);
      it.vx = (dx / dHoriz) * vel;
      it.vz = (dz / dHoriz) * vel;
      imaNestePasso = true;
    }

    // ── física (a mesma GRAVIDADE do motor — não duplicada) ──
    it.vy -= GRAVIDADE * dt;
    if (it.vy < -30) it.vy = -30;
    // fricção no chão: quando o magnete NÃO está puxando neste passo, o
    // item assenta (o «pop» do largado morre em ~0,3 s em vez de deslizar
    // para sempre — e o TTL de espera do pegaT acontece AONDE ele caiu)
    if (it.noChao && !imaNestePasso) {
      const f = Math.max(0, 1 - 10 * dt);
      it.vx *= f; it.vz *= f;
    }
    // horizontal com colisão simples (parede = para, como os mobs)
    const nx = it.x + it.vx * dt;
    if (!solido(nx, it.y + 0.15, it.z)) it.x = nx; else it.vx = 0;
    const nz = it.z + it.vz * dt;
    if (!solido(it.x, it.y + 0.15, nz)) it.z = nz; else it.vz = 0;
    // vertical: cai, aterra (idêntico aos mobs), teto para
    const ny = it.y + it.vy * dt;
    if (it.vy <= 0 && (solido(it.x, ny, it.z) || solido(it.x, ny - 0.1, it.z))) {
      it.y = Math.floor(ny) + 1.001;
      it.vy = 0; it.noChao = true;
    } else if (it.vy > 0 && solido(it.x, ny + 0.15, it.z)) {
      it.vy = 0;
    } else {
      it.y = ny; it.noChao = false;
    }
  }
  return { pegos, expirados };
}

/** Aplica o cap: devolve os itens REMOVIDOS (o mais velho primeiro —
 *  o mundo não guarda lixo antigo para sempre; contador honesto no
 *  sistema: expiradosTTL + expiradosCap são declarados, nunca escondidos). */
export function aplicarCapItens(itens: ItemChao[], cap: number = ITEM_CAP): ItemChao[] {
  if (itens.length <= cap) return [];
  const ordenados = [...itens].sort((a, b) => b.idade - a.idade);
  return ordenados.slice(0, itens.length - cap);
}
