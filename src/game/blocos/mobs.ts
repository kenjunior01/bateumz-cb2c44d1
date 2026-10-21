// ============================================================
// BATEUCRAFT — Mobs com IA: Porco (passivo), Zumbi (noturno),
// Estourador (explosivo). Física simples + colisão com o mundo.
// ============================================================

import * as THREE from "three";
import { Mundo } from "./world";
import { Aleatorio } from "./noise";
import { B, GRAVIDADE } from "./constants";
import { criarZumbi, criarPorco, criarEstourador } from "./lego";

export type TipoMob = "porco" | "zumbi" | "estourador";

export interface Mob {
  tipo: TipoMob;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; hp: number; hpMax: number;
  vivo: boolean; noChao: boolean;
  estado: "vagar" | "perseguir" | "fugir" | "fundir";
  temporizador: number; // muda direção / fuse
  atacarCd: number;
 GrupoObjeto: THREE.Group;
  pernas?: THREE.Mesh[];
  bracos?: THREE.Mesh[];
  corpo?: THREE.Object3D;
  tempoAndar: number;
  piscaDano: number;
}

const PERFIS: Record<TipoMob, { hp: number; vel: number; dano: number; altura: number }> = {
  porco: { hp: 10, vel: 1.4, dano: 0, altura: 0.9 },
  zumbi: { hp: 20, vel: 2.1, dano: 3, altura: 1.7 },
  estourador: { hp: 20, vel: 2.4, dano: 0, altura: 1.6 },
};

export class GestorMobs {
  mobs: Mob[] = [];
  rnd: Aleatorio;
  private cdSpawn = 0;
  explosaoPendente: { x: number; y: number; z: number } | null = null;

  constructor(private mundo: Mundo, semente: number) {
    this.rnd = new Aleatorio(semente * 977 + 13);
  }

  spawnar(tipo: TipoMob, x: number, y: number, z: number): Mob {
    const perfil = PERFIS[tipo];
    let g: THREE.Group;
    let bracos: THREE.Mesh[] | undefined;
    if (tipo === "zumbi") {
      const a = criarZumbi();
      g = a.grupo; bracos = [a.bracoE, a.bracoD];
    } else if (tipo === "porco") { g = criarPorco(); }
    else { g = criarEstourador(); }
    const mob: Mob = {
      tipo, x, y, z, vx: 0, vy: 0, vz: 0, yaw: this.rnd.proximo() * Math.PI * 2,
      hp: perfil.hp, hpMax: perfil.hp, vivo: true, noChao: false,
      estado: "vagar", temporizador: this.rnd.intervalo(1, 4), atacarCd: 0,
      GrupoObjeto: g, pernas: (g as any).__pernas, bracos, tempoAndar: 0, piscaDano: 0,
    };
    this.mundo.grupo.add(g);
    this.mobs.push(mob);
    return mob;
  }

  contar(tipo: TipoMob) { return this.mobs.filter((m) => m.vivo && m.tipo === tipo).length; }

  /** Spawns naturais: zumbis à noite, porcos de dia, estourador ocasional */
  tentarSpawns(segundos: number, noite: boolean, px: number, pz: number) {
    this.cdSpawn -= segundos;
    if (this.cdSpawn > 0) return;
    this.cdSpawn = 2;
    const tentar = (tipo: TipoMob) => {
      const ang = this.rnd.proximo() * Math.PI * 2;
      const dist = this.rnd.intervalo(18, 28);
      const x = Math.floor(px + Math.cos(ang) * dist) + 0.5;
      const z = Math.floor(pz + Math.sin(ang) * dist) + 0.5;
      // encontrar chão
      for (let y = 78; y > 2; y--) {
        if (this.mundo.solido(x, y, z) && !this.mundo.solido(x, y + 1, z) && !this.mundo.solido(x, y + 2, z)) {
          const id = this.mundo.getBloco(Math.floor(x), y, Math.floor(z));
          if (id === B.AGUA) return;
          this.spawnar(tipo, x, y + 1.05, z);
          return;
        }
      }
    };
    if (noite && this.contar("zumbi") < 8) tentar("zumbi");
    if (!noite && this.contar("porco") < 6 && this.rnd.chance(0.5)) tentar("porco");
    if (this.contar("estourador") < 2 && this.rnd.chance(0.12)) tentar("estourador");
  }

  /** Update de todos os mobs; devolve dano recebido pelo jogador neste passo */
  atualizar(dt: number, px: number, py: number, pz: number, noite: boolean): { dano: number; fonte: string } {
    let dano = 0, fonte = "";
    for (const mob of this.mobs) {
      if (!mob.vivo) continue;
      const dx = px - mob.x, dz = pz - mob.z, dy = py - mob.y;
      const dist = Math.hypot(dx, dz);
      mob.temporizador -= dt;
      mob.atacarCd -= dt;
      if (mob.piscaDano > 0) {
        mob.piscaDano -= dt;
        mob.GrupoObjeto.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial;
          if (m && "emissive" in m) m.emissive?.setScalar(mob.piscaDano > 0 ? 0.35 : 0);
        });
      }

      const perfil = PERFIS[mob.tipo];
      // ── Decidir estado ──
      if (mob.estado === "fundir") { /* fundição em curso — não perturbar */ }
      else if (mob.tipo === "zumbi" && dist < 18) mob.estado = "perseguir";
      else if (mob.tipo === "estourador" && dist < 12) mob.estado = "perseguir";
      else if (mob.tipo === "porco" && mob.estado === "fugir" && mob.temporizador > 0) { /* mantém */ }
      else if (mob.temporizador <= 0) {
        mob.estado = "vagar";
        mob.temporizador = this.rnd.intervalo(2, 5);
        mob.yaw = this.rnd.proximo() * Math.PI * 2;
      }

      // ── Mover ──
      let vel = perfil.vel;
      let dirYaw = mob.yaw;
      if (mob.estado === "perseguir") {
        dirYaw = Math.atan2(dx, dz);
        vel *= 1.15;
        if (mob.tipo === "estourador" && dist < 2.6) { mob.estado = "fundir"; mob.temporizador = 1.4; }
        if (mob.tipo === "zumbi" && dist < 1.5 && Math.abs(dy) < 2.2 && mob.atacarCd <= 0) {
          dano += perfil.dano; fonte = "zumbi"; mob.atacarCd = 1.1;
        }
      } else if (mob.estado === "fugir") {
        dirYaw = Math.atan2(-dx, -dz);
        vel *= 1.8;
      } else if (mob.estado === "fundir") {
        vel = 0;
        if (mob.temporizador <= 0) {
          this.explosaoPendente = { x: mob.x, y: mob.y + 0.8, z: mob.z };
          this.matar(mob, false);
          continue;
        }
      }
      if (mob.estado !== "fundir") {
        mob.vx = Math.sin(dirYaw) * vel;
        mob.vz = Math.cos(dirYaw) * vel;
        mob.yaw = dirYaw;
      } else { mob.vx = 0; mob.vz = 0; }

      // ── Física ──
      mob.vy -= GRAVIDADE * dt;
      if (mob.vy < -30) mob.vy = -30;

      const alturaMeia = perfil.altura / 2;
      const moverEixo = (eixo: "x" | "z") => {
        const nx = mob.x + (eixo === "x" ? mob.vx * dt : 0);
        const nz = mob.z + (eixo === "z" ? mob.vz * dt : 0);
        const colide =
          this.mundo.solido(nx + Math.sign(mob.vx || (eixo === "x" ? 0.01 : 0)) * 0.25, mob.y + alturaMeia, nz + Math.sign(mob.vz) * 0.25 * (eixo === "z" ? 1 : 0)) ||
          this.mundo.solido(nx, mob.y + 0.2, nz) || this.mundo.solido(nx, mob.y + alturaMeia, nz);
        if (!colide) { if (eixo === "x") mob.x = nx; else mob.z = nz; }
        else if (mob.noChao) mob.vy = 7.2; // salto automático de 1 bloco
      };
      moverEixo("x"); moverEixo("z");

      const ny = mob.y + mob.vy * dt;
      if (mob.vy < 0 && (this.mundo.solido(mob.x, ny, mob.z) || this.mundo.solido(mob.x, ny + 0.1, mob.z))) {
        mob.y = Math.floor(ny) + 1.001; mob.vy = 0; mob.noChao = true;
      } else if (mob.vy > 0 && this.mundo.solido(mob.x, ny + perfil.altura, mob.z)) {
        mob.vy = 0;
      } else { mob.y = ny; mob.noChao = false; }
      if (mob.y < -10) this.matar(mob, false);

      // ── Visual ──
      const g = mob.GrupoObjeto;
      g.position.set(mob.x, mob.y, mob.z);
      g.rotation.y = mob.yaw;
      const aAndar = Math.hypot(mob.vx, mob.vz) > 0.3;
      if (aAndar) mob.tempoAndar += dt * 8;
      const balanco = aAndar ? Math.sin(mob.tempoAndar) * 0.55 : 0;
      if (mob.pernas) {
        if (mob.pernas.length === 2) { mob.pernas[0].rotation.x = balanco; mob.pernas[1].rotation.x = -balanco; }
        else { for (let i = 0; i < mob.pernas.length; i++) mob.pernas[i].rotation.x = Math.sin(mob.tempoAndar + i * Math.PI / 2) * 0.4; }
      }
      if (mob.bracos) { mob.bracos[0].rotation.z = 0.06; mob.bracos[1].rotation.z = -0.06; }
      if (mob.estado === "fundir") {
        const pulsar = 1 + Math.sin(mob.tempoAndar * 8) * 0.12;
        g.scale.set(pulsar, 1 / pulsar, pulsar);
        g.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial;
          if (m && "emissive" in m) m.emissive?.setRGB(0.5, 0.1, 0);
        });
      } else g.scale.set(1, 1, 1);
    }
    // zumbis desfazem-se ao amanhecer
    if (!noite) {
      for (const mob of this.mobs) {
        if (mob.vivo && mob.tipo === "zumbi") { this.matar(mob, false); }
      }
    }
    return { dano, fonte };
  }

  /** Ataque do jogador ao mob mais próximo na direção do olhar */
  atacar(px: number, py: number, pz: number, yaw: number, alcance: number, dano: number): Mob | null {
    let melhor: Mob | null = null, melhorD = alcance;
    for (const mob of this.mobs) {
      if (!mob.vivo) continue;
      const dx = mob.x - px, dz = mob.z - pz, dy = (mob.y + 0.8) - py;
      const d = Math.hypot(dx, dz);
      if (d > melhorD + 0.6) continue;
      const ang = Math.atan2(dx, dz);
      // frente do jogador = yaw + π (convenção dir = -sin(yaw), -cos(yaw))
      let diff = Math.abs(ang - yaw - Math.PI);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff > 1.1) continue;
      melhor = mob; melhorD = d;
      void dy;
    }
    if (melhor) {
      melhor.hp -= dano;
      melhor.piscaDano = 0.18;
      // knockback
      melhor.vx += Math.sin(yaw) * 4; melhor.vz += Math.cos(yaw) * 4; melhor.vy = 3;
      if (melhor.tipo === "porco") { melhor.estado = "fugir"; melhor.temporizador = 4; }
      if (melhor.hp <= 0) this.matar(melhor, true);
    }
    return melhor;
  }

  matar(mob: Mob, comDrop: boolean) {
    mob.vivo = false;
    this.mundo.grupo.remove(mob.GrupoObjeto);
    mob.GrupoObjeto.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    if (comDrop) (mob as any).__drop = true;
  }

  limparDistante(px: number, pz: number) {
    for (const mob of this.mobs) {
      if (mob.vivo && Math.hypot(mob.x - px, mob.z - pz) > 60) this.matar(mob, false);
    }
  }

  dropDoMob(tipo: TipoMob, rnd: Aleatorio): { id: number; qtd: number }[] {
    if (tipo === "porco") return [{ id: 105, qtd: rnd.inteiro(1, 2) }]; // carne crua
    if (tipo === "estourador") return rnd.chance(0.6) ? [{ id: 101, qtd: rnd.inteiro(1, 2) }] : []; // carvão
    if (tipo === "zumbi") return rnd.chance(0.35) ? [{ id: 100, qtd: rnd.inteiro(1, 2) }] : []; // gravetos
    return [];
  }
}
