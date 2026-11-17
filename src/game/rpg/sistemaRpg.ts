// ============================================================
// BATEU RPG: LENDAS — SISTEMA RPG (v41)
// A camada que transforma o motor voxel partilhado (src/game/blocos)
// num RPG de exploração. Padrões estudados do Veloren (v35/v38):
//  · o `common` partilha regras — as fórmulas vivem em core.ts (isomórfico);
//  · spawn de entidades controlado por sistema (server/entities);
//  · a dificuldade é um diferenciador próprio (o Veloren só tem Hardcore).
// Tudo derivado de atividade REAL do jogador — zero XP de invenção.
// Save honesto: IndexedDB (bateu_rpg_save) + espelho localStorage,
// validador em core.validarPerfilRpg — dados inválidos nunca entram.
// ============================================================

import { Motor } from "../blocos/engine";
import { type Mob, type TipoMob, ehPassivo } from "../blocos/mobs";
import { B, ALTURA, I, VIDA_MAX, CORES } from "../blocos/constants";
// v50: loot como ENTIDADE (padrão Veloren item_drop) — física/magnete/TTL
// puros e isomórficos; as malhas e a recolha (inventário real) vivem aqui.
import { criarItemChao, passoItensChao, aplicarCapItens, ITEM_CAP, ITEM_CHAO_TTL, type ItemChao } from "../blocos/itensChao";
import * as THREE from "three";
import { idbDefinir, idbObter, idbRemover, espelharLS, restaurarLSdeIDB } from "../armazem";
import { MundoRPG } from "./mundoRpg";
import { nomeItem, tituloDiaria, tituloMissao, nomeRegiao, nomePoi, nomeRamo, nomeDificuldade, type LinguaRpg } from "./nomes.ts";
import {
  SEED_RPG, SPAWN_ALDEIA, ALTURA_ALDEIA,
  DIFICULDADES_RPG, ORDEM_DIFICULDADE, type RegrasDificuldadeRpg, type DificuldadeRpg,
  REGIOES, POIS, regiaoEm, poiEm, type Regiao, type Poi, NIVEL_SELVAGEM,
  progressoNivel, NIVEL_MAX, nivelDe, xpParaNivel,
  RAMOS_RPG, NIVEL_MAX_RAMO_RPG, type RamoRpg,
  escalaVelExplorador, raioDescoberta, xpPorKiller, hpInimigo, multDanoHeroi,
  HISTORIA, capituloAtual, aplicarEvento, estadoMissoesInicial, progressoObjetivo,
  diaLocal, missoesDiarias, ESPOLIO_BAUS,
  perfilInicial, validarPerfilRpg, perfilTemProgresso, type PerfilRpg, type RecompensaMissao,
} from "./core";

export const CHAVE_SAVE_RPG = "bateu_rpg_save";

export interface AvisoRpg { texto: string; tipo: "nivel" | "missao" | "descoberta" | "info" | "boss"; t: number }

/** Estado do chefe (Guardião das Ruínas — capítulo final). */
interface BossEstado { vivo: boolean; derrotado: boolean; spawnado: boolean; }

/** v50: item no chão — o dado (ItemChao) + a malha que o representa. */
interface ItemChaoRpg { dado: ItemChao; malha: THREE.Mesh }

const TIPO_KILL: Record<string, "hostil" | "zumbi" | "aranha" | "estourador" | "passivo" | "guardiao"> = {
  zumbi: "zumbi", aranha: "aranha", estourador: "estourador",
};

export class SistemaRPG {
  /** Língua de EXIBIÇÃO dos avisos e textos gerados (v62 — roadmap item 3).
   *  PT por omissão: o motor canónico e os 157 testes do núcleo ficam
   *  intactos; o UI do mundo passa "en" quando a língua da plataforma é EN. */
  lingua: LinguaRpg = "pt";
  perfil: PerfilRpg = perfilInicial("medio");
  private motor: Motor | null = null;
  private avisosRpg: AvisoRpg[] = [];
  private cdSpawn = 0;
  private cdSave = 8;
  private boss: BossEstado = { vivo: false, derrotado: false, spawnado: false };
  private bossMob: Mob | null = null;
  private bossPendente = false;
  private lastDanoT = 0;
  private noiteAntes = false;
  private noiteSobrevivendo = false;
  private andouFrac = 0;
  private posAnterior: [number, number] | null = null;
  private prontoSaveIDB: Promise<PerfilRpg | null> | null = null;
  // ── v50: itens no chão (contadores HONESTOS — nada desaparece sem nota) ──
  private itensChaoRpg: ItemChaoRpg[] = [];
  private recolhidos = 0;      // unidades recolhidas pela mochila
  private expiradosTTL = 0;    // itens que passaram o TTL (ou caíram ao vazio)
  private expiradosCap = 0;    // itens saídos pelo limite de 48 (o mais velho)

  constructor() {
    // v41 — o IDB é o armazém primário: se o localStorage foi limpo pelo
    // browser, o perfil volta do espelho IndexedDB (padrão do progressao.ts)
    this.prontoSaveIDB = restaurarLSdeIDB(CHAVE_SAVE_RPG, CHAVE_SAVE_RPG,
      (v) => validarPerfilRpg(v) !== null,
    ).then(() => {
      this.perfil = this.lerPerfilLS() ?? this.perfil;
      return this.perfil;
    });
  }

  /** Lê e valida o espelho localStorage (null = ausente/corrompido). */
  private lerPerfilLS(): PerfilRpg | null {
    try {
      const raw = localStorage.getItem(CHAVE_SAVE_RPG);
      if (!raw) return null;
      return validarPerfilRpg(JSON.parse(raw));
    } catch { return null; }
  }

  get dif(): RegrasDificuldadeRpg { return DIFICULDADES_RPG[this.perfil.dificuldade]; }

  // ── ANTES de cada motor.iniciar ─────────────────────────────
  /** Define o mundo e o spawn (a altura da planície é determinística). */
  preparar(motor: Motor) {
    this.motor = motor;
    motor.fabricaMundo = () => new MundoRPG();
    motor.spawnFixo = [SPAWN_ALDEIA[0], ALTURA_ALDEIA + 1.02, SPAWN_ALDEIA[1]];
    motor.spawnProprio = [SPAWN_ALDEIA[0], ALTURA_ALDEIA + 1.02, SPAWN_ALDEIA[1]]; // renascer na Aldeia
    motor.escalaVel = escalaVelExplorador(this.perfil.skills.explorador);
    // nova sessão: o Guardião volta a dormir e o relógio de spawns repõe
    this.boss = { vivo: false, derrotado: false, spawnado: false };
    this.bossMob = null;
    this.bossPendente = false;
    this.cdSpawn = 0;
    this.noiteAntes = false;
    this.noiteSobrevivendo = false;
    this.posAnterior = null;
    // v50: nova sessão = chão vazio (as malhas antigas morrem com o mundo)
    this.limparItensChao();
    this.recolhidos = 0;
    this.expiradosTTL = 0;
    this.expiradosCap = 0;
  }

  /** DEPOIS de cada motor.iniciar — o gestor de mobs é NOVO a cada iniciar
   *  (os wraps do gestor re-aplicam sempre; os do MOTOR aplicam uma única
   *  vez, guardados no próprio motor, para nunca empilharem multiplicadores). */
  ligarAposIniciar() {
    const m = this.motor;
    if (!m || !m.gestor) return;
    const g = m.gestor;

    // kit inicial honesto: espada de madeira, pão, maçãs, tochas
    // v48 — SÓ quando NÃO há mochila guardada: com save, a mochila do motor
    // volta INTEIRA (espólio dos baús incluído — o baú já aberto não volta a
    // pagar; perder os itens seria perda silenciosa, furo fechado).
    const invSalva = this.perfil.inv;
    if (invSalva && invSalva.some((s) => s)) {
      m.inv.limpar();
      for (let i = 0; i < 36 && i < invSalva.length; i++) {
        const s = invSalva[i];
        if (s) m.inv.slots[i] = { id: s.id, qtd: s.qtd };
      }
      if (this.perfil.invArm) m.inv.armadura = { id: this.perfil.invArm.id, qtd: 1 };
      const idxEspadaSalva = m.inv.slots.findIndex((sl) => sl && sl.id === I.ESPADA_MADEIRA);
      if (idxEspadaSalva >= 0) m.inv.selecao = idxEspadaSalva;
    } else {
      m.inv.adicionar(I.ESPADA_MADEIRA, 1);
      m.inv.adicionar(I.PAO, 3);
      m.inv.adicionar(I.MACA, 2);
      m.inv.adicionar(B.TOCHA, 10);
      // o herói desperta com a espada NA MÃO (a espada pode não cair no slot 0)
      const idxEspada = m.inv.slots.findIndex((sl) => sl && sl.id === I.ESPADA_MADEIRA);
      if (idxEspada >= 0) m.inv.selecao = idxEspada;
    }

    // ── spawns RPG: população viva por região/noite/dificuldade ──
    g.tentarSpawns = (segundos: number, noite: boolean, px: number, pz: number) => {
      this.cdSpawn -= segundos * this.dif.freqSpawn * (noite ? 1.4 : 1);
      if (this.cdSpawn > 0) return;
      this.cdSpawn = 2.8;
      const regiao = regiaoEm(px, pz);
      const capPassivo = 6;
      const passivos = g.contar("porco") + g.contar("vaca") + g.contar("galinha");
      if (passivos < capPassivo) this.tentarSpawnPassivo(g, px, pz);
      const hostis = g.contar("zumbi") + g.contar("aranha") + g.contar("estourador");
      const capHostis = noite ? 9 : 4;
      if (hostis < capHostis) this.tentarSpawnHostil(g, px, pz, noite, regiao?.id);
    };

    // ── HP escalado por região × dificuldade (nascimento) ────────
    const origSpawnar = g.spawnar.bind(g);
    g.spawnar = (tipo: TipoMob, x: number, y: number, z: number): Mob => {
      const mob = origSpawnar(tipo, x, y, z);
      if (!ehPassivo(tipo)) {
        const regiao = regiaoEm(x, z);
        const nivel = regiao?.nivel ?? NIVEL_SELVAGEM;
        mob.hp = mob.hpMax = hpInimigo(mob.hpMax, nivel, this.dif);
      }
      if (this.bossPendente) {
        this.bossPendente = false;
        mob.hp = mob.hpMax = Math.round(mob.hpMax * 3);
        (mob as any).__boss = true;
        this.boss.vivo = true;
        this.boss.spawnado = true;
        this.bossMob = mob;
      }
      return mob;
    };

    // ── kill → XP + missões (comDrop=true = morto pelo herói) ────
    const origMatar = g.matar.bind(g);
    g.matar = (mob: Mob, comDrop: boolean) => {
      // O Guardião das Ruínas SÓ cai por combate: queima de dia, despawn
      // por distância e quedas não o removem (o chefe não foge da lenda).
      if ((mob as any).__boss && !comDrop) return;
      origMatar(mob, comDrop);
      if (comDrop) this.registarKill(mob);
    };

    // ── dano do herói escalado por nível + guerreiro ─────────────
    const origAtacarG = g.atacar.bind(g);
    g.atacar = (px: number, py: number, pz: number, yaw: number, alcance: number, dano: number): Mob | null => {
      const escala = multDanoHeroi(nivelDe(this.perfil.xp), this.perfil.skills.guerreiro);
      return origAtacarG(px, py, pz, yaw, alcance, dano * escala);
    };

    // ── baú de tesouro: o RPG recompensa directamente ────────────
    const anyM = m as any;
    if (!anyM.__rpgLigado) {
      anyM.__rpgLigado = true;
      const origAtacar = m.atacar.bind(m);
      m.atacar = (): Mob | null => {
        if (m.fase === "jogando" && m.mira && m.mira.id === B.BAU) {
          this.abrirTesouro(m.mira.x, m.mira.y, m.mira.z);
          return null;
        }
        return origAtacar();
      };

      // ── dano recebido × dificuldade ──────────────────────────
      const origReceber = m.receberDano.bind(m);
      m.receberDano = (qtd: number, causa: string) => {
        this.lastDanoT = Date.now();
        if (this.dif.multDanoMob !== 1) qtd = Math.max(1, Math.round(qtd * this.dif.multDanoMob));
        origReceber(qtd, causa);
      };

      // ── morte contada + noite quebrada ─────────────────────
      const origRenascer = m.renascer.bind(m);
      m.renascer = () => {
        origRenascer();
        this.perfil.mortes++;
        this.noiteSobrevivendo = false;
        if (this.boss.vivo) {
          // o Guardião volta a dormir (despawna pelo matar ORIGINAL — o wrap
          // de imunidade bloquearia o despawn do chefe)
          if (this.bossMob) origMatar(this.bossMob, false);
          this.boss.vivo = false;
          this.boss.spawnado = false;
          this.bossMob = null;
        }
        this.aviso(this.txt(`Renasceste na Aldeia Inicial (${this.perfil.mortes}ª morte) — o progresso RPG fica.`, `You respawned at the Starting Village (death #${this.perfil.mortes}) — RPG progress stays.`), "info", 4);
      };
    }

    // posição guardada (CONTINUAR) — o mundo regenera igual (semente fixa)
    if (this.perfil.pos) {
      const [x, y, z] = this.perfil.pos;
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        m.px = x; m.py = y + 0.02; m.pz = z;
      }
    }

    // ── v50: LOOT NO CHÃO ──────────────────────────────────────
    // O gancho do MOTOR encaminha os drops de mob morto pelo herói para o
    // chão (nascem onde o mob caiu, com o pop físico). Sem o gancho — craft
    // e cidade — os drops continuam a entrar DIRECTO na mochila como sempre.
    m.aoDroparChao = (id, qtd, x, y, z) => this.adicionarItemChao(id, qtd, x, y, z);
    // itens no chão do SAVE voltam ao sítio: mundo de semente fixa, as
    // coordenadas continuam válidas — sem isto seria perda silenciosa no
    // CONTINUAR (o mesmo furo que a v48 fechou para a mochila).
    if (this.perfil.itensChao?.length) {
      for (const e of this.perfil.itensChao) this.adicionarItemChao(e.id, e.qtd, e.x, e.y, e.z);
    }

    this.noiteAntes = m.noite;
    this.aviso(this.txt(`BATEU RPG: Lendas — dificuldade ${this.dif.nome}. O mundo é o mesmo para todos (semente ${SEED_RPG}).`, `BATEU RPG: Legends — difficulty ${nomeDificuldade(this.dif.id, this.lingua)}. The world is the same for everyone (seed ${SEED_RPG}).`), "info", 5);
  }

  // ── spawns auxiliares ─────────────────────────────────────────
  private tentarSpawnPassivo(g: NonNullable<Motor["gestor"]>, px: number, pz: number) {
    const tipo = (["porco", "vaca", "galinha"] as const)[Math.floor(this.rnd01() * 3)];
    const p = this.posicaoSpawn(px, pz, 12, 22);
    if (p) g.spawnar(tipo, p[0], p[1], p[2]);
  }

  private tentarSpawnHostil(g: NonNullable<Motor["gestor"]>, px: number, pz: number, noite: boolean, regiaoId?: string) {
    let tipo: TipoMob;
    const r = this.rnd01();
    if (noite) {
      tipo = r < 0.52 ? "zumbi" : r < 0.84 ? "aranha" : "estourador";
    } else {
      // de dia: aranhas (neutras) e — só em Cinzas/Selvagem — estouradores
      const agressivoDia = regiaoId === "cinzas" || regiaoId === undefined;
      if (r < 0.45) tipo = "aranha";
      else if (agressivoDia && r < 0.62) tipo = "estourador";
      else return;
    }
    const p = this.posicaoSpawn(px, pz, 16, 26);
    if (p) g.spawnar(tipo, p[0], p[1], p[2]);
  }

  /** PRNG local do sistema (não partilhado — só para escolher posições). */
  private rndSemente = 0x7ea1;
  private rnd01(): number {
    this.rndSemente = (this.rndSemente * 1664525 + 1013904223) >>> 0;
    return this.rndSemente / 4294967296;
  }

  /** Acha chão sólido num anel à volta do jogador (null = sem chão válido). */
  private posicaoSpawn(px: number, pz: number, dMin: number, dMax: number): [number, number, number] | null {
    const m = this.motor!;
    if (!m.mundo) return null;
    const ang = this.rnd01() * Math.PI * 2;
    const dist = dMin + this.rnd01() * (dMax - dMin);
    const x = Math.floor(px + Math.cos(ang) * dist) + 0.5;
    const z = Math.floor(pz + Math.sin(ang) * dist) + 0.5;
    for (let y = ALTURA - 1; y > 2; y--) {
      if (m.mundo.solido(Math.floor(x), y, Math.floor(z)) && !m.mundo.solido(Math.floor(x), y + 1, Math.floor(z)) && !m.mundo.solido(Math.floor(x), y + 2, Math.floor(z))) {
        return [x, y + 1.05, z];
      }
    }
    return null;
  }

  // ── baú de tesouro ────────────────────────────────────────────
  /** v48: público — o E2E pode abrir um baú pelo CAMINHO REAL (mesma função
   *  da mira/ataque) sem depender de mirar pixel-perfeito no canvas. */
  abrirTesouro(x: number, y: number, z: number) {
    for (const p of POIS) {
      for (const b of p.baus) {
        if (b.x === x && b.y === y && b.z === z) {
          if (this.perfil.descobertas.baus.includes(b.chave)) {
            this.aviso(this.txt("Este baú já está vazio — o tesouro foi levado.", "This chest is already empty — the treasure was taken."), "info", 2.5);
            return;
          }
          this.perfil.descobertas.baus.push(b.chave);
          const xp = Math.round(40 * this.dif.multXP);
          const cred = Math.round(6 * this.dif.multCred);
          this.ganharXP(xp, false);
          this.perfil.creditos += cred;
          // v48 — espólio REAL do baú (mesma mesa determinística para todos:
          // core.ESPOLIO_BAUS). O inventário é o do motor partilhado — o que
          // não couber é contado HONESTAMENTE (o baú abriu; não há chute).
          let espolioTxt = "";
          let perdidos = 0;
          const esp = ESPOLIO_BAUS[b.chave];
          if (esp && this.motor) {
            const partes: string[] = [];
            for (const e of esp) {
              const guardado = this.motor.inv.adicionar(e.id, e.qtd);
              if (guardado > 0) partes.push(`${guardado}× ${nomeItem(e.id, this.lingua)}`);
              if (guardado < e.qtd) perdidos += e.qtd - guardado;
            }
            espolioTxt = partes.length ? (this.lingua === "en" ? ` · loot: ${partes.join(", ")}` : ` · espólio: ${partes.join(", ")}`) : "";
            if (perdidos > 0) this.aviso(this.txt(`Mochila cheia — ${perdidos} item(ns) do espólio não couberam (perdidos: o baú abriu).`, `Backpack full — ${perdidos} loot item(s) didn't fit (lost: the chest opened).`), "info", 4);
          }
          this.aviso(this.txt(`Baú de tesouro aberto: +${xp} XP, +${cred} créditos${espolioTxt}.`, `Treasure chest opened: +${xp} XP, +${cred} credits${espolioTxt}.`), "descoberta", 3.5);
          this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "abrirBaus", qtd: 1, dia: diaLocal(), dif: this.dif }));
          return;
        }
      }
    }
    this.aviso(this.txt("Baú sem tesouro — o mundo guarda os seus segredos noutros baús.", "Chest without treasure — the world keeps its secrets in other chests."), "info", 2.5);
  }

  // ── v50: ITENS NO CHÃO — gestor (malhas + recolha) ─────────────────
  /** Malha do item: cubo pequeno com a cor REAL do item (CORES do motor). */
  private malhaItemChao(id: number): THREE.Mesh {
    const c = CORES[id] ?? ["#999999", "#666666"];
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      new THREE.MeshLambertMaterial({ color: c[0] }),
    );
  }

  private adicionarItemChao(id: number, qtd: number, x: number, y: number, z: number, pegaT = 0) {
    const m = this.motor;
    if (!m || !m.mundo) return;
    const dado = criarItemChao(id, qtd, x, y, z, this.rnd01() * Math.PI * 2, pegaT);
    const malha = this.malhaItemChao(id);
    malha.position.set(dado.x, dado.y, dado.z);
    m.mundo.grupo.add(malha);
    this.itensChaoRpg.push({ dado, malha });
    // cap honesto (48): o mais VELHO sai primeiro — contado, nunca escondido
    for (const fora of aplicarCapItens(this.itensChaoRpg.map((i) => i.dado))) {
      const idx = this.itensChaoRpg.findIndex((i) => i.dado === fora);
      if (idx >= 0) { this.removerItemChao(idx); this.expiradosCap++; }
    }
  }

  private removerItemChao(idx: number) {
    const ic = this.itensChaoRpg[idx];
    if (!ic) return;
    if (this.motor?.mundo) this.motor.mundo.grupo.remove(ic.malha);
    ic.malha.geometry.dispose();
    (ic.malha.material as THREE.Material).dispose();
    this.itensChaoRpg.splice(idx, 1);
  }

  private limparItensChao() {
    if (this.motor?.mundo) for (const ic of this.itensChaoRpg) this.motor.mundo.grupo.remove(ic.malha);
    for (const ic of this.itensChaoRpg) {
      ic.malha.geometry.dispose();
      (ic.malha.material as THREE.Material).dispose();
    }
    this.itensChaoRpg = [];
  }

  /** Lista REAL do chão (HUD, ganchos E2E) — distâncias ao herói incluídas. */
  listaItensChao() {
    const m = this.motor;
    const px = m?.px ?? 0, pz = m?.pz ?? 0;
    return {
      itens: this.itensChaoRpg.map((i) => ({
        id: i.dado.id, qtd: i.dado.qtd, x: i.dado.x, y: i.dado.y, z: i.dado.z,
        dist: Math.round(Math.hypot(i.dado.x - px, i.dado.z - pz) * 10) / 10,
      })),
      total: this.itensChaoRpg.length,
      recolhidos: this.recolhidos,
      expiradosTTL: this.expiradosTTL,
      expiradosCap: this.expiradosCap,
      cap: ITEM_CAP,
      ttl: ITEM_CHAO_TTL,
    };
  }

  /** v50: Q / botão LARGAR — 1 unidade do slot selecionado vai para o chão
   *  à frente do herói (convenção do motor: frente = −sin(yaw), −cos(yaw)).
   *  O gasto passa pelo consumirSelecionado REAL do motor. */
  largarSelecionado(): boolean {
    const m = this.motor;
    if (!m || m.fase !== "jogando") return false;
    const s = m.inv.selecionado();
    if (!s) return false;
    const id = s.id;
    m.inv.consumirSelecionado(1);
    const x = m.px - Math.sin(m.yaw) * 1.1;
    const z = m.pz - Math.cos(m.yaw) * 1.1;
    // pegaT 1,2 s: o item largado não volta para a mochila no segundo
    // seguinte (o magnete devolveria o Q no mesmo instante — padrão do
    // item_drop do Minecraft/Veloren, 1,2 s declarado)
    this.adicionarItemChao(id, 1, x, m.py + 1.2, z, 1.2);
    this.aviso(this.txt(`Largaste 1× ${nomeItem(id, this.lingua)} — fica no chão (aproxima-te para recolher).`, `Dropped 1× ${nomeItem(id, this.lingua)} — it stays on the ground (walk close to pick it up).`), "info", 2.5);
    return true;
  }

  // ── kill → XP + missões ───────────────────────────────────────
  private registarKill(mob: Mob) {
    const m = this.motor!;
    const regiao = regiaoEm(m.px, m.pz);
    const nivel = regiao?.nivel ?? NIVEL_SELVAGEM;

    // Guardião das Ruínas (capítulo final)
    if ((mob as any).__boss) {
      this.boss.vivo = false;
      this.boss.derrotado = true;
      this.perfil.bossDerrotado = true;
      this.bossMob = null;
      this.perfil.kills.guardiao++;
      this.perfil.kills.hostil++;
      const xp = Math.round(150 * this.dif.multXP * (1 + this.perfil.skills.sabio * 0.05));
      this.ganharXP(xp, false);
      this.aviso(this.txt(`O GUARDIÃO caiu! +${xp} XP — as Ruínas dormem em paz.`, `The GUARDIAN fell! +${xp} XP — the Ruins sleep in peace.`), "boss", 5);
      this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "matar", alvo: "guardiao", dia: diaLocal(), dif: this.dif }));
      return;
    }

    const tipoKill = TIPO_KILL[mob.tipo];
    if (!tipoKill) {
      // passivo: XP pequeno, sem contar como "hostil"
      this.perfil.kills.passivo++;
      this.ganharXP(xpPorKiller("passivo", nivel, this.dif, this.perfil.skills.sabio), false);
      return;
    }

    this.perfil.kills[tipoKill]++;
    this.perfil.kills.hostil++;
    const xp = xpPorKiller(tipoKill as "zumbi" | "aranha" | "estourador", nivel, this.dif, this.perfil.skills.sabio);
    this.ganharXP(xp, false);
    this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "matar", alvo: tipoKill, dia: diaLocal(), dif: this.dif }));
  }

  // ── XP / níveis ───────────────────────────────────────────────
  private ganharXP(qtd: number, comAviso: boolean) {
    if (qtd <= 0) return;
    const antes = nivelDe(this.perfil.xp);
    this.perfil.xp = Math.min(xpParaNivel(NIVEL_MAX) + 1, this.perfil.xp + qtd);
    const depois = nivelDe(this.perfil.xp);
    if (depois > antes) {
      this.perfil.pontos += depois - antes;
      this.aviso(this.txt(`NÍVEL ${depois}! +${depois - antes} ponto${depois - antes > 1 ? "s" : ""} de habilidade.`, `LEVEL ${depois}! +${depois - antes} skill point${depois - antes > 1 ? "s" : ""}.`), "nivel", 4);
    } else if (comAviso) {
      this.aviso(`+${qtd} XP`, "info", 1.6);
    }
  }

  private processarRecompensas(recompensas: RecompensaMissao[]) {
    for (const r of recompensas) {
      this.ganharXP(r.xp, false);
      this.perfil.creditos += r.creditos;
      const tituloLingua = r.diaria ? tituloDiaria(r.titulo, this.lingua) : (HISTORIA.find((h) => h.id === r.id) ? tituloMissao(HISTORIA.find((h) => h.id === r.id)!, this.lingua) : r.titulo);
      this.aviso(this.txt(`${r.diaria ? "Diária" : "Capítulo"} concluída — ${tituloLingua}: +${r.xp} XP, +${r.creditos} créditos.`, `${r.diaria ? "Daily" : "Chapter"} complete — ${tituloLingua}: +${r.xp} XP, +${r.creditos} credits.`), "missao", 4.5);
    }
  }

  private aviso(texto: string, tipo: AvisoRpg["tipo"], t: number) {
    this.avisosRpg.push({ texto, tipo, t });
    if (this.avisosRpg.length > 6) this.avisosRpg.splice(0, this.avisosRpg.length - 6);
  }

  /** Texto de aviso na língua de exibição (v62): PT canónico, EN traduzido. */
  private txt(pt: string, en: string): string {
    return this.lingua === "en" ? en : pt;
  }

  // ── tick (chamado pelo loop do componente, a cada passo) ──────
  tick(dt: number) {
    const m = this.motor;
    if (!m || m.fase !== "jogando") return;

    // avisos expiram
    for (const a of this.avisosRpg) a.t -= dt;
    this.avisosRpg = this.avisosRpg.filter((a) => a.t > 0);

    // descoberta de região
    const regiao = regiaoEm(m.px, m.pz);
    if (regiao && !this.perfil.descobertas.regioes.includes(regiao.id)) {
      this.perfil.descobertas.regioes.push(regiao.id);
      const xp = Math.round(25 * this.dif.multXP);
      this.ganharXP(xp, false);
      this.aviso(this.txt(`Região descoberta — ${nomeRegiao(regiao, this.lingua)}! +${xp} XP`, `Region discovered — ${nomeRegiao(regiao, this.lingua)}! +${xp} XP`), "descoberta", 4);
      this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "descobrirRegiao", alvo: regiao.id, dia: diaLocal(), dif: this.dif }));
    }

    // descoberta de POI
    const poi = poiEm(m.px, m.pz, raioDescoberta(this.dif, this.perfil.skills.explorador));
    if (poi && !this.perfil.descobertas.pois.includes(poi.id)) {
      this.perfil.descobertas.pois.push(poi.id);
      const xp = Math.round(40 * this.dif.multXP);
      this.ganharXP(xp, false);
      this.aviso(this.txt(`Local descoberto — ${nomePoi(poi, this.lingua)}! +${xp} XP`, `Place discovered — ${nomePoi(poi, this.lingua)}! +${xp} XP`), "descoberta", 4);
      this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "chegarPoi", alvo: poi.id, dia: diaLocal(), dif: this.dif }));
    }

    // caminhado → missão "andar"
    if (this.posAnterior) {
      const d = Math.hypot(m.px - this.posAnterior[0], m.pz - this.posAnterior[1]);
      this.andouFrac += d;
      if (this.andouFrac >= 10) {
        const blocos = Math.floor(this.andouFrac);
        this.perfil.blocos += blocos;
        this.andouFrac -= blocos;
        this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "andar", qtd: blocos, dia: diaLocal(), dif: this.dif }));
      }
    }
    this.posAnterior = [m.px, m.pz];

    // sobreviver à noite
    if (m.noite && !this.noiteAntes) this.noiteSobrevivendo = true;
    if (!m.noite && this.noiteAntes && this.noiteSobrevivendo) {
      this.noiteSobrevivendo = false;
      this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "sobreviverNoite", dia: diaLocal(), dif: this.dif }));
      this.aviso(this.txt("Sobreviveste à noite. O imbondeiro conta a tua história.", "You survived the night. The baobab tells your story."), "info", 3.5);
    }
    this.noiteAntes = m.noite;

    // Guardião: acorda quando o capítulo final está ativo e o herói chega às ruínas
    const cap = capituloAtual(this.perfil.missoes);
    if (cap?.id === "h6" && !this.boss.spawnado && !this.boss.derrotado) {
      const ruinas = POIS.find((p) => p.id === "ruinas");
      if (ruinas && Math.hypot(m.px - ruinas.x, m.pz - ruinas.z) < 16 && m.gestor && m.mundo) {
        this.bossPendente = true;
        // acha o chão real das ruínas (sem inventar alturas)
        let y = 34;
        for (let yy = ALTURA - 1; yy > 2; yy--) {
          if (m.mundo.solido(ruinas.x, yy, ruinas.z)) { y = yy + 1; break; }
        }
        m.gestor.spawnar("zumbi", ruinas.x + 0.5, y + 0.05, ruinas.z + 0.5);
        this.aviso(this.txt("O GUARDIÃO das Ruínas acordou!", "The Guardian of the Ruins has awakened!"), "boss", 4);
      }
    }

    // regeneração do Sábio (fora de combate)
    const agora = Date.now();
    if (this.perfil.skills.sabio > 0 && m.vida > 0 && m.vida < VIDA_MAX && agora - this.lastDanoT > 8000) {
      m.vida = Math.min(VIDA_MAX, m.vida + this.perfil.skills.sabio * 0.4 * dt);
    }

    // ── v50: itens no chão — física REAL + magnete + recolha pelo inventário ──
    if (this.itensChaoRpg.length && m.mundo) {
      const r = passoItensChao(
        this.itensChaoRpg.map((i) => i.dado), dt,
        (x, y, z) => m.mundo!.solido(x, y, z),
        m.px, m.py, m.pz,
      );
      for (const item of r.pegos) {
        // recolha pelo inventário REAL do motor — o que não couber FICA no
        // chão (o item encolhe; nada desaparece por decisão silenciosa)
        const guardado = m.inv.adicionar(item.id, item.qtd);
        if (guardado > 0) {
          this.recolhidos += guardado;
          this.aviso(this.txt(`+${guardado}× ${nomeItem(item.id, this.lingua)} — recolhido do chão.`, `+${guardado}× ${nomeItem(item.id, this.lingua)} — picked up from the ground.`), "info", 2);
          item.qtd -= guardado;
        }
        if (item.qtd <= 0) {
          const idx = this.itensChaoRpg.findIndex((i) => i.dado === item);
          if (idx >= 0) this.removerItemChao(idx);
        } else if (item.avisoCheiaT <= 0) {
          item.avisoCheiaT = 8;
          this.aviso(this.txt("Mochila cheia — o item fica no chão até caber.", "Backpack full — the item stays on the ground until it fits."), "info", 3);
        }
      }
      for (const item of r.expirados) {
        const idx = this.itensChaoRpg.findIndex((i) => i.dado === item);
        if (idx >= 0) { this.removerItemChao(idx); this.expiradosTTL++; }
      }
      // malhas seguem a física + giro/bob (visual; a posição é a do dado)
      for (const ic of this.itensChaoRpg) {
        ic.malha.position.set(ic.dado.x, ic.dado.y + 0.16 + Math.sin(ic.dado.idade * 3) * 0.05, ic.dado.z);
        ic.malha.rotation.y += dt * 2.2;
      }
    }

    // save periódico honesto
    this.cdSave -= dt;
    if (this.cdSave <= 0) { this.cdSave = 8; void this.guardar(); }
  }

  // ── ações da UI ───────────────────────────────────────────────
  gastarPonto(ramo: RamoRpg): boolean {
    if (this.perfil.pontos < 1 || this.perfil.skills[ramo] >= NIVEL_MAX_RAMO_RPG) return false;
    this.perfil.pontos -= 1;
    this.perfil.skills[ramo] += 1;
    if (this.motor && ramo === "explorador") this.motor.escalaVel = escalaVelExplorador(this.perfil.skills.explorador);
    this.aviso(this.txt(`${nomeRamo(ramo, this.lingua)} nível ${this.perfil.skills[ramo]}.`, `${nomeRamo(ramo, this.lingua)} level ${this.perfil.skills[ramo]}.`), "nivel", 3);
    void this.guardar();
    return true;
  }

  definirDificuldade(d: DificuldadeRpg): boolean {
    if (!DIFICULDADES_RPG[d]) return false;
    this.perfil.dificuldade = d;
    void this.guardar();
    return true;
  }

  // ── save / load honesto (padrão do armazem.ts + progressao.ts) ─
  async guardar(): Promise<{ ok: boolean; onde: "idb+ls" | "ls" | "idb" | "nenhum"; erro?: string }> {
    if (!this.motor) return { ok: false, onde: "nenhum", erro: "motor não ligado" };
    this.perfil.pos = [Math.round(this.motor.px * 10) / 10, Math.round(this.motor.py * 10) / 10, Math.round(this.motor.pz * 10) / 10];
    // v48: a mochila guarda-se com a lenda (espólio incluído — sem perda silenciosa)
    this.perfil.inv = this.motor.inv.slots.map((s) => (s ? { id: s.id, qtd: s.qtd } : null));
    this.perfil.invArm = this.motor.inv.armadura ? { id: this.motor.inv.armadura.id, qtd: 1 } : null;
    // v50: o chão guarda-se com a lenda — loot largado/não recolhido não
    // evapora no CONTINUAR (coords arredondadas a cm, o validador corta lixo)
    this.perfil.itensChao = this.itensChaoRpg.map((i) => ({
      id: i.dado.id, qtd: i.dado.qtd,
      x: Math.round(i.dado.x * 100) / 100, y: Math.round(i.dado.y * 100) / 100, z: Math.round(i.dado.z * 100) / 100,
    }));
    this.perfil.ts = Date.now();
    const ls = espelharLS(CHAVE_SAVE_RPG, this.perfil);
    const idb = await idbDefinir(CHAVE_SAVE_RPG, this.perfil);
    const ok = idb.ok || ls.ok;
    if (!ok) this.aviso(this.txt("Save falhou (sem espaço?): o progresso corre risco.", "Save failed (out of space?): progress is at risk."), "info", 4);
    return { ok, onde: idb.ok && ls.ok ? "idb+ls" : idb.ok ? "idb" : ls.ok ? "ls" : "nenhum" };
  }

  async apagarSave(): Promise<void> {
    try { localStorage.removeItem(CHAVE_SAVE_RPG); } catch { /* ignore */ }
    await idbRemover(CHAVE_SAVE_RPG);
    this.perfil = perfilInicial(this.perfil.dificuldade);
    this.boss = { vivo: false, derrotado: false, spawnado: false };
    this.bossMob = null;
    // v50: novo jogo = chão vazio (contadores repostos)
    this.limparItensChao();
    this.recolhidos = 0;
    this.expiradosTTL = 0;
    this.expiradosCap = 0;
  }

  /** Espera o IDB e devolve o perfil carregado (para o botão CONTINUAR). */
  quandoSavePronto(): Promise<PerfilRpg> {
    return this.prontoSaveIDB ?? Promise.resolve(this.perfil);
  }

  temSave(): boolean {
    try {
      const raw = localStorage.getItem(CHAVE_SAVE_RPG);
      if (raw && validarPerfilRpg(JSON.parse(raw))) return true;
    } catch { /* ignore */ }
    return this.perfilTemProgresso();
  }

  private perfilTemProgresso(): boolean {
    return perfilTemProgresso(this.perfil);
  }

  /** Novo jogo: apaga o save RPG e repõe o perfil virgem. */
  async novoJogo(dif: DificuldadeRpg): Promise<void> {
    await this.apagarSave();
    this.perfil = perfilInicial(dif);
  }

  // ── captura para o HUD (o espelho do Captura do motor) ────────
  captura() {
    const p = this.perfil;
    const prog = progressoNivel(p.xp);
    const cap = capituloAtual(p.missoes);
    const dia = diaLocal();
    const diarias = missoesDiarias(dia, this.dif, this.lingua);
    const feitasDia = p.missoes.diarias.dia === dia ? p.missoes.diarias.feitas : [];

    // objetivo de bússola: primeiro objetivo inacabado do capítulo
    let objetivo: { texto: string; x: number; z: number } | null = null;
    if (cap) {
      for (const o of cap.objetivos) {
        const prog = progressoObjetivo(p.missoes, cap.id, o);
        if (prog >= o.qtd) continue;
        if (o.tipo === "chegarPoi") {
          const poi = POIS.find((q) => q.id === o.alvo);
          if (poi) objetivo = { texto: o.texto, x: poi.x, z: poi.z };
        } else if (o.tipo === "descobrirRegiao") {
          const r = REGIOES.find((q) => q.id === o.alvo);
          if (r) objetivo = { texto: o.texto, x: r.cx, z: r.cz };
        } else if (o.tipo === "abrirBaus") {
          const livre = POIS.flatMap((q) => q.baus).find((b) => !p.descobertas.baus.includes(b.chave));
          if (livre) objetivo = { texto: o.texto, x: livre.x, z: livre.z };
        } else if (o.tipo === "matar") {
          objetivo = { texto: o.texto, x: NaN, z: NaN }; // sem bússola — caça livre
        }
        break;
      }
    }

    return {
      nivel: prog.nivel,
      xpAtual: prog.atual,
      xpFalta: prog.falta,
      pontos: p.pontos,
      skills: { ...p.skills },
      dificuldade: this.dif,
      regiao: regiaoEm(this.motor?.px ?? 0, this.motor?.pz ?? 0),
      capitulo: cap ? {
        id: cap.id, titulo: cap.titulo,
        objetivos: cap.objetivos.map((o) => ({ texto: o.texto, prog: progressoObjetivo(p.missoes, cap.id, o), qtd: o.qtd })),
      } : null,
      historiaFeita: !cap,
      diarias: diarias.map((d) => ({
        id: d.id, titulo: d.titulo, texto: d.objetivo.texto, xp: d.xp, creditos: d.creditos,
        prog: p.missoes.diarias.dia === dia ? Math.min(d.objetivo.qtd, p.missoes.diarias.prog[d.id] ?? 0) : 0,
        qtd: d.objetivo.qtd, feita: feitasDia.includes(d.id),
      })),
      creditos: p.creditos,
      kills: { ...p.kills },
      mortes: p.mortes,
      blocos: p.blocos,
      boss: {
        vivo: this.boss.vivo,
        derrotado: this.boss.derrotado || this.perfil.bossDerrotado,
        spawnado: this.boss.spawnado,
        hp: this.bossMob?.vivo ? Math.max(0, Math.round(this.bossMob.hp)) : undefined,
        hpMax: this.bossMob?.vivo ? this.bossMob.hpMax : undefined,
      },
      descobertas: { regioes: p.descobertas.regioes.length, pois: p.descobertas.pois.length, baus: p.descobertas.baus.length },
      totalRegioes: REGIOES.length,
      totalPois: POIS.length,
      totalBaus: POIS.reduce((n, q) => n + q.baus.length, 0),
      // v50: chão honesto — o HUD mostra o que está mesmo lá (e o que saiu)
      itensChao: {
        total: this.itensChaoRpg.length,
        recolhidos: this.recolhidos,
        expiradosTTL: this.expiradosTTL,
        expiradosCap: this.expiradosCap,
        cap: ITEM_CAP,
        ttl: ITEM_CHAO_TTL,
      },
      avisos: this.avisosRpg.map((a) => ({ ...a })),
      objetivo,
    };
  }
}

export type CapturaRpg = ReturnType<SistemaRPG["captura"]>;
