// ============================================================
// ARENA DAS LENDAS — SIMULAÇÃO DE MOBS (pura, isomórfica)
// ────────────────────────────────────────────────────────────
// A IA dos mobs é UMA SÓ: o servidor autoritativo (arena-servidor)
// corre `passoMobs` a 30 TPS; o motor no modo SOLO corre a MESMA
// função no browser; os testes correm-no no Node. Regras idênticas
// em qualquer lado — zero divergência (padrão «common» do repositório).
// ============================================================
import {
  CAMPS, MOBS, dist, dist2, type TipoMob, type AnimMob,
} from "./core.ts";

export type EstadoMob = "vago" | "perseguir" | "atacar" | "voltar";

export interface MobSim {
  id: number;
  tipo: TipoMob;
  camp: string;
  anchorX: number; anchorZ: number;
  x: number; z: number; ry: number;
  hp: number; hpMax: number;
  estado: EstadoMob;
  anim: AnimMob;
  alvoId: number;
  wanderAng: number; wanderFalta: number;
  atkCd: number;
  respawnTs: number;        // >0 = morto, renasce neste instante (ms)
}

export interface HeroiSim {
  id: number;
  x: number; z: number;
  hp: number; armadura: number;
  morto: boolean;
}

export interface EventosSim {
  golpesMob: { mobId: number; alvoId: number; dano: number; x: number; z: number }[];
  mortes: { mobId: number; tipo: TipoMob; assassinoId: number; xp: number; essencia: number; x: number; z: number }[];
}

export function eventosVazios(): EventosSim {
  return { golpesMob: [], mortes: [] };
}

/** Cria o mundo de mobs a partir dos CAMPS (determinístico). */
export function criarMobs(agoraMs: number): MobSim[] {
  const mobs: MobSim[] = [];
  let id = 1;
  for (const c of CAMPS) {
    for (let i = 0; i < c.n; i++) {
      const ang = (i / c.n) * Math.PI * 2;
      mobs.push({
        id: id++, tipo: c.tipo, camp: c.id,
        anchorX: c.x, anchorZ: c.z,
        x: c.x + Math.cos(ang) * 2.4, z: c.z + Math.sin(ang) * 2.4, ry: 0,
        hp: MOBS[c.tipo].hp, hpMax: MOBS[c.tipo].hp,
        estado: "vago", anim: "parado",
        alvoId: -1, wanderAng: ang, wanderFalta: 0, atkCd: 0,
        respawnTs: 0,
      });
    }
  }
  void agoraMs;
  return mobs;
}

function escolherAlvo(mob: MobSim, herois: HeroiSim[]): HeroiSim | null {
  const def = MOBS[mob.tipo];
  let melhor: HeroiSim | null = null;
  let melhorD2 = def.aggro * def.aggro;
  for (const h of herois) {
    if (h.morto || h.hp <= 0) continue;
    const d2 = dist2(mob.x, mob.z, h.x, h.z);
    if (d2 < melhorD2) { melhorD2 = d2; melhor = h; }
  }
  return melhor;
}

function moverPara(mob: MobSim, tx: number, tz: number, vel: number, dt: number): boolean {
  const dx = tx - mob.x, dz = tz - mob.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return true;
  const passo = Math.min(d, vel * dt);
  mob.x += (dx / d) * passo;
  mob.z += (dz / d) * passo;
  mob.ry = Math.atan2(dx, dz);
  mob.anim = "andar";
  return d - passo < 0.15;
}

/** Um passo de simulação (dt em segundos, agoraMs em ms).
 *  Mutação in-place dos mobs + eventos para o chamador aplicar. */
export function passoMobs(
  mobs: MobSim[],
  herois: HeroiSim[],
  dt: number,
  agoraMs: number,
  eventos: EventosSim,
): void {
  for (const mob of mobs) {
    const def = MOBS[mob.tipo];

    // morto → espera respawn e renasce na âncora
    if (mob.respawnTs > 0) {
      if (agoraMs >= mob.respawnTs) {
        mob.respawnTs = 0;
        mob.hp = mob.hpMax;
        mob.x = mob.anchorX; mob.z = mob.anchorZ;
        mob.estado = "vago"; mob.anim = "parado"; mob.alvoId = -1;
      }
      continue;
    }

    if (mob.estado === "vago") {
      mob.wanderFalta -= dt;
      if (mob.wanderFalta <= 0) {
        mob.wanderAng = Math.random() * Math.PI * 2;
        mob.wanderFalta = 1.6 + Math.random() * 2.4;
      }
      const tx = mob.anchorX + Math.cos(mob.wanderAng) * 3.2;
      const tz = mob.anchorZ + Math.sin(mob.wanderAng) * 3.2;
      if (dist(mob.x, mob.z, mob.anchorX, mob.anchorZ) > 3.6) {
        moverPara(mob, mob.anchorX, mob.anchorZ, def.velocidade * 0.45, dt);
      } else {
        moverPara(mob, tx, tz, def.velocidade * 0.45, dt);
        if (mob.anim !== "andar") mob.anim = "parado";
      }
      const alvo = escolherAlvo(mob, herois);
      if (alvo) { mob.estado = "perseguir"; mob.alvoId = alvo.id; mob.anim = "andar"; }
      continue;
    }

    if (mob.estado === "perseguir") {
      const alvo = herois.find((h) => h.id === mob.alvoId && !h.morto && h.hp > 0);
      if (!alvo) { mob.estado = "voltar"; mob.alvoId = -1; continue; }
      const dAncora = dist(mob.x, mob.z, mob.anchorX, mob.anchorZ);
      if (dAncora > def.leash) { mob.estado = "voltar"; mob.alvoId = -1; continue; }
      const dAlvo = dist(mob.x, mob.z, alvo.x, alvo.z);
      if (dAlvo <= def.alcance) { mob.estado = "atacar"; mob.anim = "atacar"; continue; }
      moverPara(mob, alvo.x, alvo.z, def.velocidade, dt);
      continue;
    }

    if (mob.estado === "atacar") {
      const alvo = herois.find((h) => h.id === mob.alvoId && !h.morto && h.hp > 0);
      if (!alvo) { mob.estado = "voltar"; mob.alvoId = -1; mob.anim = "parado"; continue; }
      const dAlvo = dist(mob.x, mob.z, alvo.x, alvo.z);
      if (dAlvo > def.alcance + 0.8) { mob.estado = "perseguir"; mob.anim = "andar"; continue; }
      mob.ry = Math.atan2(alvo.x - mob.x, alvo.z - mob.z);
      mob.atkCd -= dt;
      if (mob.atkCd <= 0) {
        mob.atkCd = 1 / def.ataquePS;
        mob.anim = "atacar";
        // armadura do alvo aplicada AQUI (a mesma fórmula LoL em todos os lados)
        const dano = Math.max(1, Math.round(def.ad * (100 / (100 + Math.max(0, alvo.armadura)))));
        eventos.golpesMob.push({ mobId: mob.id, alvoId: alvo.id, dano, x: mob.x, z: mob.z });
      }
      continue;
    }

    // voltar: regressa à âncora, regenera (leash honesto — nada de mobs eternamente longe)
    mob.anim = "andar";
    const chegou = moverPara(mob, mob.anchorX, mob.anchorZ, def.velocidade * 0.8, dt);
    mob.hp = Math.min(mob.hpMax, mob.hp + mob.hpMax * 0.08 * dt);
    if (chegou) { mob.estado = "vago"; mob.anim = "parado"; mob.alvoId = -1; }
  }
}

/** Aplica dano a um mob (claim de herói). Devolve a morte (ou null). */
export function aplicarDanoMob(
  mob: MobSim,
  dano: number,
  assassinoId: number,
  agoraMs: number,
): { tipo: TipoMob; xp: number; essencia: number; x: number; z: number } | null {
  if (mob.respawnTs > 0 || dano <= 0) return null;
  mob.hp -= dano;
  if (mob.hp > 0) return null;
  const def = MOBS[mob.tipo];
  mob.respawnTs = agoraMs + respawnMs(mob.tipo);
  mob.hp = 0;
  mob.estado = "vago"; mob.anim = "parado"; mob.alvoId = -1; mob.atkCd = 0;
  return { tipo: mob.tipo, xp: def.xp, essencia: def.essencia, x: mob.x, z: mob.z };
}

/** Tempo de respawn (ms) — chefes demoram muito mais. */
export function respawnMs(tipo: TipoMob): number {
  const camp = CAMPS.find((c) => c.tipo === tipo);
  return (camp?.respawn ?? 28) * 1000;
}
