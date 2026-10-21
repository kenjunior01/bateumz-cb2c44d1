// ═══════════════════════════════════════════════════════════════════
// HORDAS DE BATEU — motor 3D (three.js) com paridade de mecânica REA
// Mundo aberto por zonas, mobs com placas de nome/vida, aggro/leash,
// auto-ataque + skills com GCD 1.5s, cast bar, projéteis, AoE, loot,
// XP/level (+8 HP/nível), bots vivos, NPCs, ciclo dia/noite, minimapa.
// Implementação 100% original — sem assets ou código do jogo de referência.
// ═══════════════════════════════════════════════════════════════════
import * as THREE from "three";
import {
  CLASSES, MOBS, ZONAS, zonaEm, xpParaNivel, NIVEL_MAX,
  SKILLS, nomeAleatorio, rollRaridade, nomePeca, type MobDef,
} from "./hordesData";

// ── util ──
let _seed = 1337;
const rnd = (): number => { _seed = (_seed * 1664525 + 1013904223) % 4294967296; return _seed / 4294967296; };
const rr = (a: number, b: number): number => a + rnd() * (b - a);
const rint = (a: number, b: number): number => Math.floor(rr(a, b + 1));
const escolhe = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const now = (): number => performance.now() / 1000;

export interface HudAlvo { nome: string; nivel: number; hp: number; hpMax: number; raridade: number; dist: number; }
export interface HudState {
  hp: number; hpMax: number; mp: number; mpMax: number; xp: number; xpProx: number;
  nivel: number; ouro: number; vivo: boolean; zona: string; x: number; z: number;
  alvo: HudAlvo | null; cast: { nome: string; t: number; total: number } | null;
  cds: number[]; gcd: number; buffs: string[]; classe: number; nome: string;
  combos: number; morteT: number | null; pocoes: number;
}
export interface CharInfo {
  nome: string; classe: number; faccao: number;
}

interface Ent {
  id: number; kind: "mob" | "player" | "bot" | "npc" | "pet";
  nome: string; nivel: number; classe: number; faccao: number;
  mob?: MobDef; hp: number; hpMax: number; vivo: boolean;
  mp: number; mpMax: number;
  pos: THREE.Vector3; yaw: number; speed: number;
  mesh: THREE.Group; placa: THREE.Sprite; placaTex: THREE.CanvasTexture;
  placaCv: HTMLCanvasElement; placaCv2d: CanvasRenderingContext2D; placaHp: number;
  alvo: Ent | null; atkCd: number; wanderT: number; wanderAlvo: THREE.Vector3;
  aggroT: number; leashT: number; respawnT: number; spawn: THREE.Vector3;
  stunT: number; dotT: number; dotDano: number; dotFonte: Ent | null; dotTicks?: number;
  buffs: { id: string; fim: number }[]; castT: number; castTotal: number; castSkill: string | null;
  botCd: number; raridade: number; ouro: number; xpVal: number; danoMult: number; defesa: number;
  lastDmg: number;
}

interface Proj { mesh: THREE.Mesh; de: Ent; alvo: Ent | null; alvoPos: THREE.Vector3; vel: number; dano: number; tipo: number; cura: boolean; aoVivo: boolean; }
interface DanoNum { spr: THREE.Sprite; t: number; vida: number; vy: number; }
interface AoeFx { mesh: THREE.Mesh; t: number; vida: number; }
interface Loot { mesh: THREE.Group; ouro: number; peca: string | null; raridade: number; t: number; pos: THREE.Vector3; }
interface Particula { mesh: THREE.Mesh; vx: number; vy: number; vz: number; t: number; vida: number; }

const GCD = 1.5; // REA: global cooldown real
const COR_RARIDADE = ["#e4e4e7", "#fbbf24", "#c084fc", "#f97316"];
const COR_FACCAO = ["#3ecf6e", "#f0563e", "#f4c95d"];

// HP/dano de mob — curvas próprias calibradas à progressão REA
export const mobHpMax = (def: MobDef): number =>
  Math.round((28 + def.nivel * def.nivel * 2.3 + def.nivel * 12) * def.hpMult);
export const mobDano = (def: MobDef): number =>
  (3 + def.nivel * 1.6) * def.danoMult;

export class HordesEngine {
  // núcleo
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private cam!: THREE.PerspectiveCamera;
  private canvas!: HTMLCanvasElement;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposado = false;
  private pausado = false;
  private tScale = 1;

  // mundo
  private terreno!: THREE.Mesh;
  private agua!: THREE.Mesh;
  private luzSol!: THREE.DirectionalLight;
  private luzAmb!: THREE.HemisphereLight;
  private ceu!: THREE.Mesh;
  private tDia = 0.28; // 0..1 — começa de manhã
  private arvores: THREE.InstancedMesh[] = [];
  private pedras!: THREE.InstancedMesh;

  // jogador
  eu!: Ent;
  char!: CharInfo;
  private moveDir = { x: 0, z: 0 };
  private keys = new Set<string>();
  private camYaw = 0; private camPitch = 0.42; private camDist = 16;
  private dragId = -1; private dragX = 0; private dragY = 0;
  private joystick = { x: 0, z: 0, ativo: false };

  // entidades
  private ents: Ent[] = [];
  private nextId = 1;
  private projeteis: Proj[] = [];
  private danosNum: DanoNum[] = [];
  private fx: AoeFx[] = [];
  private loots: Loot[] = [];
  private particulas: Particula[] = [];

  // combate do jogador
  private gcdT = 0;
  private cds: Record<string, number> = {};
  private combo = 0; private comboT = 0;
  private morteT: number | null = null;
  private buffs: { id: string; nome: string; fim: number; emoji: string }[] = [];
  private invPocaoCd = 0;

  // feedback
  private onHud: (h: HudState) => void = () => {};
  private onLog: (tipo: "combate" | "geral" | "sistema", msg: string) => void = () => {};
  private onMorte: () => void = () => {};
  private onNivel: (nv: number) => void = () => {};
  private onKill: (mobId: string) => void = () => {};
  private onLoot: (ouro: number, peca: string | null, raridade: number) => void = () => {};
  private onScoreFinal: (nivel: number) => void = () => {};
  private hudT = 0; private placasT = 0; private miniT = 0;
  private miniCanvas: HTMLCanvasElement | null = null;

  // chat dos bots
  private falasBot = [
    "Vendo espada boa, baratinha!", "Alguém pra mina de carvão?", "acabei de subir pra nv 12 🎉",
    "cuidado com as dunas, tem múmia agressiva", "grupo pra cripta depois?",
    "quem viu meu corpo lootado kkk", "wts poções 10g", "essa zona é boa pra farmar xp",
    "boa sorte nas quests!", "mob respawn rápido aqui, tô farmando lvl",
    "gg, matei o chefe bandido", "alguém curando? tô low hp",
  ];

  // ── init ──
  mount(canvas: HTMLCanvasElement, char: CharInfo, hooks: {
    onHud?: (h: HudState) => void; onLog?: (t: "combate" | "geral" | "sistema", m: string) => void;
    onMorte?: () => void; onNivel?: (nv: number) => void; onKill?: (mobId: string) => void;
    onLoot?: (ouro: number, peca: string | null, raridade: number) => void;
    onScoreFinal?: (nivel: number) => void;
  }) {
    this.canvas = canvas;
    this.char = char;
    this.onHud = hooks.onHud ?? this.onHud;
    this.onLog = hooks.onLog ?? this.onLog;
    this.onMorte = hooks.onMorte ?? this.onMorte;
    this.onNivel = hooks.onNivel ?? this.onNivel;
    this.onKill = hooks.onKill ?? this.onKill;
    this.onLoot = hooks.onLoot ?? this.onLoot;
    this.onScoreFinal = hooks.onScoreFinal ?? this.onScoreFinal;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xa8c8e0, 90, 340);

    this.cam = new THREE.PerspectiveCamera(62, (canvas.clientWidth || 1) / (canvas.clientHeight || 1), 0.1, 900);

    // luz
    this.luzAmb = new THREE.HemisphereLight(0xbfd8ff, 0x3a5a3a, 0.95);
    this.scene.add(this.luzAmb);
    this.luzSol = new THREE.DirectionalLight(0xfff2d8, 1.35);
    this.luzSol.position.set(120, 180, 60);
    this.scene.add(this.luzSol);

    // céu (esfera invertida com cor dinâmica)
    this.ceu = new THREE.Mesh(
      new THREE.SphereGeometry(760, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x87b8e8, side: THREE.BackSide, fog: false }),
    );
    this.scene.add(this.ceu);

    this.construirTerreno();
    this.construirAgua();
    this.construirProps();
    this.construirJogador();
    this.construirNPCs();
    this.construirMobs();
    this.construirBots();

    this.ligarEventos();
    this.registarHooks();
    this.relogio = now();
    this.loop();
  }

  private relogio = 0;

  // ── terreno por zonas (REA: biomas das 10 zonas) ──
  private alturaEm(x: number, z: number): number {
    // colinas suaves + vales por zona; deserto mais plano, cripta em fosso
    const h = Math.sin(x * 0.012) * Math.cos(z * 0.014) * 6 +
      Math.sin(x * 0.031 + 2) * Math.cos(z * 0.027 + 1) * 2.4 +
      Math.sin((x + z) * 0.005) * 4;
    const zl = zonaEm(x, z);
    if (zl.bioma === "deserto") return h * 0.5 + 1.5;
    if (zl.bioma === "cripta") return h * 0.8 - 2.5;
    if (zl.bioma === "mina") return h * 0.6 + 2;
    return h;
  }

  private corBioma(x: number, z: number, h: number): THREE.Color {
    const zl = zonaEm(x, z);
    const c = new THREE.Color(zl.cor);
    const varc = 0.9 + Math.sin(x * 0.11 + z * 0.07) * 0.06 + h * 0.004;
    return c.multiplyScalar(clamp(varc, 0.75, 1.18));
  }

  private construirTerreno() {
    const SEG = 110, TAM = 1000;
    const geo = new THREE.PlaneGeometry(TAM, TAM, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const cores = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = this.alturaEm(x, z);
      pos.setY(i, h);
      const c = this.corBioma(x, z, h);
      cores[i * 3] = c.r; cores[i * 3 + 1] = c.g; cores[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cores, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.terreno = new THREE.Mesh(geo, mat);
    this.scene.add(this.terreno);
  }

  private construirAgua() {
    const geo = new THREE.PlaneGeometry(1000, 1000);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2f6f9f, transparent: true, opacity: 0.72 });
    this.agua = new THREE.Mesh(geo, mat);
    this.agua.position.y = -7.5;
    this.scene.add(this.agua);
  }

  private construirProps() {
    // árvores: pinheiros em biomas floresta/grama; cactos no deserto; stalagmites na cripta
    const troncoGeo = new THREE.CylinderGeometry(0.28, 0.42, 3.2, 5);
    const copaGeo = new THREE.ConeGeometry(1.9, 4.6, 6);
    const N = 340;
    const troncos = new Float32Array(N * 16);
    const copas = new Float32Array(N * 16);
    const coresCopa = new Float32Array(N * 3);
    const dummy = new THREE.Object3D();
    let n = 0;
    for (let i = 0; i < N * 3 && n < N; i++) {
      const x = rr(-460, 460), z = rr(-460, 460);
      const zl = zonaEm(x, z);
      if (zl.id === "aldeia" || zl.id === "mina") continue;
      const dens = zl.bioma === "floresta" ? 0.85 : zl.bioma === "grama" ? 0.4 : zl.bioma === "deserto" ? 0.22 : zl.bioma === "cripta" ? 0.3 : 0.55;
      if (rnd() > dens) continue;
      const h = this.alturaEm(x, z);
      const esc = rr(0.75, 1.5);
      dummy.position.set(x, h + 1.6 * esc, z);
      dummy.scale.setScalar(esc);
      dummy.rotation.y = rr(0, Math.PI * 2);
      dummy.updateMatrix();
      dummy.matrix.toArray(troncos, n * 16);
      dummy.position.y = h + (3.2 + 2.3) * esc * 0.72;
      dummy.updateMatrix();
      dummy.matrix.toArray(copas, n * 16);
      const col = zl.bioma === "deserto" ? new THREE.Color(0x3f7f45) : zl.bioma === "cripta" ? new THREE.Color(0x7c5cd6) : new THREE.Color(0x1f6a2a).offsetHSL(rr(-0.03, 0.05), 0, rr(-0.05, 0.08));
      coresCopa[n * 3] = col.r; coresCopa[n * 3 + 1] = col.g; coresCopa[n * 3 + 2] = col.b;
      n++;
    }
    const imTr = new THREE.InstancedMesh(troncoGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), N);
    const imCp = new THREE.InstancedMesh(copaGeo, new THREE.MeshLambertMaterial({ vertexColors: false, color: 0xffffff }), N);
    // cores por instância
    imCp.instanceColor = new THREE.InstancedBufferAttribute(coresCopa, 3);
    (imCp.material as THREE.MeshLambertMaterial).vertexColors = false;
    for (let i = 0; i < N; i++) {
      dummy.matrix.fromArray(troncos, i * 16); dummy.updateMatrix(); imTr.setMatrixAt(i, dummy.matrix);
      dummy.matrix.fromArray(copas, i * 16); dummy.updateMatrix(); imCp.setMatrixAt(i, dummy.matrix);
    }
    imTr.count = n; imCp.count = n;
    imCp.instanceMatrix.needsUpdate = true; imTr.instanceMatrix.needsUpdate = true;
    if (imCp.instanceColor) imCp.instanceColor.needsUpdate = true;
    this.arvores = [imTr, imCp];
    this.scene.add(imTr, imCp);

    // pedras
    const pedraGeo = new THREE.DodecahedronGeometry(1.1, 0);
    const NP = 160;
    this.pedras = new THREE.InstancedMesh(pedraGeo, new THREE.MeshLambertMaterial({ color: 0x8a8a92 }), NP);
    let pn = 0;
    for (let i = 0; i < NP * 3 && pn < NP; i++) {
      const x = rr(-460, 460), z = rr(-460, 460);
      const zl = zonaEm(x, z);
      if (zl.id === "aldeia") continue;
      const h = this.alturaEm(x, z);
      dummy.position.set(x, h + 0.4, z);
      dummy.rotation.set(rr(0, 3), rr(0, 3), rr(0, 3));
      dummy.scale.setScalar(rr(0.5, 2.1));
      dummy.updateMatrix();
      this.pedras.setMatrixAt(pn, dummy.matrix);
      pn++;
    }
    this.pedras.count = pn;
    this.pedras.instanceMatrix.needsUpdate = true;
    this.scene.add(this.pedras);

    // totem da aldeia (marco central)
    const totem = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }));
    base.position.y = 0.6;
    const pilar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 9, 6), new THREE.MeshLambertMaterial({ color: 0xc9a45c }));
    pilar.position.y = 5;
    const chama = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 6), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
    chama.position.y = 10.4;
    this.chamaTotem = chama;
    totem.add(base, pilar, chama);
    totem.position.set(0, this.alturaEm(0, 0), 0);
    this.scene.add(totem);
  }
  private chamaTotem!: THREE.Mesh;

  // ── construções de entidades ──
  private rigHumanoide(cor1: string, cor2: string, classe: number, escala = 1): THREE.Group {
    const g = new THREE.Group();
    const m1 = new THREE.MeshLambertMaterial({ color: new THREE.Color(cor1) });
    const m2 = new THREE.MeshLambertMaterial({ color: new THREE.Color(cor2) });
    const tronco = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.55), m1);
    tronco.position.y = 1.45;
    const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), m2);
    cabeca.position.y = 2.32;
    const bracoE = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.0, 0.26), m1);
    bracoE.position.set(-0.62, 1.5, 0);
    const bracoD = bracoE.clone(); bracoD.position.x = 0.62;
    const pernaE = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.95, 0.32), m2);
    pernaE.position.set(-0.24, 0.48, 0);
    const pernaD = pernaE.clone(); pernaD.position.x = 0.24;
    g.add(tronco, cabeca, bracoE, bracoD, pernaE, pernaD);
    // arma por classe
    let arma: THREE.Mesh;
    if (classe === 0) arma = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 0.3), new THREE.MeshLambertMaterial({ color: 0xd8d8e0 }));
    else if (classe === 1) arma = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 5), new THREE.MeshLambertMaterial({ color: 0x8a5a2b }));
    else if (classe === 2) arma = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 4, 8, Math.PI), new THREE.MeshLambertMaterial({ color: 0xa87b48 }));
    else arma = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), new THREE.MeshLambertMaterial({ color: 0xf4c95d }));
    arma.position.set(0.78, 1.35, 0.15);
    if (classe === 2) arma.rotation.set(0, 0, Math.PI / 2);
    g.add(arma);
    g.scale.setScalar(escala);
    return g;
  }

  private rigMob(def: MobDef): THREE.Group {
    const g = new THREE.Group();
    const m1 = new THREE.MeshLambertMaterial({ color: new THREE.Color(def.cor) });
    const m2 = new THREE.MeshLambertMaterial({ color: new THREE.Color(def.cor2) });
    const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => { mesh.position.set(x, y, z); g.add(mesh); };
    switch (def.forma) {
      case "larva": {
        const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), m1);
        corpo.scale.set(1.5, 0.8, 1); add(corpo, 0, 0.45, 0);
        const cab = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), m2); add(cab, 0.55, 0.42, 0);
        break;
      }
      case "raposa": case "hiena": case "lobo": {
        const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.62, 0.6), m1); add(corpo, 0, 0.72, 0);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), m2); add(cab, 0.85, 0.95, 0);
        const foc = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), m1); add(foc, 1.1, 0.88, 0);
        const o1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), m2); add(o1, 0.78, 1.25, 0.14);
        const o2 = o1.clone(); add(o2, 0.78, 1.25, -0.14);
        const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 4), m2); add(c1, 0.45, 0.36, 0.22);
        const c2 = c1.clone(); add(c2, 0.45, 0.36, -0.22);
        const c3 = c1.clone(); add(c3, -0.45, 0.36, 0.22);
        const c4 = c1.clone(); add(c4, -0.45, 0.36, -0.22);
        const rabo = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 4), m1);
        rabo.rotation.z = Math.PI / 2.6; add(rabo, -0.85, 0.95, 0);
        break;
      }
      case "javali": case "urso": case "leao": case "crocodilo": {
        const grande = def.forma !== "javali";
        const corpo = new THREE.Mesh(new THREE.BoxGeometry(grande ? 1.9 : 1.5, grande ? 1.05 : 0.85, 0.95), m1); add(corpo, 0, grande ? 1.05 : 0.8, 0);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.66), m2); add(cab, grande ? 1.2 : 0.95, grande ? 1.35 : 1.0, 0);
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 4), m2); add(p1, grande ? 0.6 : 0.5, 0.4, 0.3);
        const p2 = p1.clone(); add(p2, grande ? 0.6 : 0.5, 0.4, -0.3);
        const p3 = p1.clone(); add(p3, grande ? -0.6 : -0.5, 0.4, 0.3);
        const p4 = p1.clone(); add(p4, grande ? -0.6 : -0.5, 0.4, -0.3);
        if (def.forma === "javali") {
          const presa = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 4), new THREE.MeshLambertMaterial({ color: 0xf5f0e0 }));
          presa.rotation.z = -1.1; add(presa, 1.3, 0.85, 0.2);
          const presa2 = presa.clone(); presa2.position.z = -0.2; g.add(presa2);
        }
        break;
      }
      case "aranha": {
        const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), m1);
        corpo.scale.set(1.3, 0.75, 1); add(corpo, 0, 0.72, 0);
        const cab = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), m2); add(cab, 0.68, 0.62, 0);
        for (let i = 0; i < 4; i++) {
          const perna = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.15, 4), m2);
          perna.rotation.z = Math.PI / 2.4; perna.rotation.y = (i - 1.5) * 0.5;
          add(perna, 0.1, 0.55, (i - 1.5) * 0.38);
          const perna2 = perna.clone(); perna2.rotation.y = Math.PI - (i - 1.5) * 0.5;
          add(perna2, -0.1, 0.55, (i - 1.5) * 0.38);
        }
        break;
      }
      case "abelha": case "mariposa": case "corvo": case "abutre": {
        const voador = def.forma === "abelha" || def.forma === "mariposa";
        const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), m1);
        corpo.scale.set(1.5, 0.9, 0.9); add(corpo, 0, voador ? 1.3 : 0.9, 0);
        const ala = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.5), m2);
        ala.position.set(0, voador ? 1.42 : 1.15, 0.4);
        const ala2 = ala.clone(); ala2.position.z = -0.4;
        g.add(ala, ala2);
        break;
      }
      case "cogumelo": {
        const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0xe7e0d0 })); add(pe, 0, 0.4, 0);
        const chapeu = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), m1); add(chapeu, 0, 0.8, 0);
        break;
      }
      case "golem": case "mumia": case "orc": {
        const esc = def.forma === "orc" ? 1.15 : 1;
        const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.95 * esc, 1.25 * esc, 0.6 * esc), m1); add(corpo, 0, 1.35 * esc, 0);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), m2); add(cab, 0, 2.2 * esc, 0);
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.05, 0.3), m1); add(b1, -0.68 * esc, 1.4 * esc, 0);
        const b2 = b1.clone(); b2.position.x = 0.68 * esc; g.add(b2);
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.75, 0.34), m2); add(p1, -0.26, 0.38, 0);
        const p2 = p1.clone(); p2.position.x = 0.26; g.add(p2);
        break;
      }
      case "tartaruga": {
        const casco = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 6), m1);
        casco.scale.set(1.25, 0.7, 1); add(casco, 0, 0.62, 0);
        const cab = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), m2); add(cab, 0.95, 0.5, 0);
        break;
      }
      case "beetle": case "lagarto": {
        const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 0.7), m1); add(corpo, 0, 0.5, 0);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.4), m2); add(cab, 0.72, 0.55, 0);
        break;
      }
      case "verme": {
        const segs = 4;
        for (let i = 0; i < segs; i++) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.5 - i * 0.06, 8, 6), i % 2 ? m2 : m1);
          s.scale.set(1.4, 0.75, 1); add(s, -i * 0.7, 0.4, 0);
        }
        break;
      }
      case "boss": {
        const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 1.1), m1); add(corpo, 0, 2.3, 0);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 0.95), m2); add(cab, 0, 3.75, 0);
        const ch1 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), new THREE.MeshLambertMaterial({ color: 0x161016 }));
        ch1.rotation.x = 0.3; add(ch1, -0.3, 4.35, 0);
        const ch2 = ch1.clone(); ch2.position.x = 0.3; g.add(ch2);
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 0.5), m1); add(b1, -1.15, 2.5, 0);
        const b2 = b1.clone(); b2.position.x = 1.15; g.add(b2);
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.3, 0.55), m2); add(p1, -0.45, 0.65, 0);
        const p2 = p1.clone(); p2.position.x = 0.45; g.add(p2);
        const aura = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.4, 24), new THREE.MeshBasicMaterial({ color: 0xff5533, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
        aura.rotation.x = -Math.PI / 2; aura.position.y = 0.06; g.add(aura);
        break;
      }
    }
    g.scale.setScalar(def.escala * (1 + def.raridade * 0.14));
    return g;
  }

  private fazerPlaca(nome: string, nivel: number, corNome: string): { spr: THREE.Sprite; tex: THREE.CanvasTexture; cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 72;
    const ctx = cv.getContext("2d")!;
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    spr.scale.set(4.6, 1.3, 1);
    spr.renderOrder = 999;
    this.desenhaPlaca(ctx, tex, nome, nivel, corNome, 1);
    return { spr, tex, cv, ctx };
  }

  private desenhaPlaca(ctx: CanvasRenderingContext2D, tex: THREE.CanvasTexture, nome: string, nivel: number, corNome: string, hpFrac: number) {
    ctx.clearRect(0, 0, 256, 72);
    // barra de vida
    ctx.fillStyle = "rgba(8,8,12,0.72)";
    ctx.roundRect(28, 44, 200, 13, 6); ctx.fill();
    const w = Math.max(0, Math.min(1, hpFrac));
    const grad = ctx.createLinearGradient(28, 0, 228, 0);
    grad.addColorStop(0, w > 0.5 ? "#2ecc40" : w > 0.22 ? "#f4c95d" : "#e5484d");
    grad.addColorStop(1, w > 0.5 ? "#12F027" : w > 0.22 ? "#d4a017" : "#ff5a5f");
    ctx.fillStyle = grad;
    ctx.roundRect(30, 46, 196 * w, 9, 4); ctx.fill();
    // nome + nível
    ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.85)";
    const linha = `${nome} · ${nivel}`;
    ctx.strokeText(linha, 128, 30);
    ctx.fillStyle = corNome;
    ctx.fillText(linha, 128, 30);
    tex.needsUpdate = true;
  }

  private novaEnt(kind: Ent["kind"], nome: string, nivel: number, mesh: THREE.Group, corNome: string, opts: Partial<Ent> = {}): Ent {
    const placa = this.fazerPlaca(nome, nivel, corNome);
    const e: Ent = {
      id: this.nextId++, kind, nome, nivel, classe: 0, faccao: 2,
      hp: 100, hpMax: 100, vivo: true,
      mp: 0, mpMax: 0,
      pos: new THREE.Vector3(), yaw: rr(0, Math.PI * 2), speed: 4.6,
      mesh, placa: placa.spr, placaTex: placa.tex, placaCv: placa.cv,
      placaCv2d: placa.ctx, placaHp: -1,
      alvo: null, atkCd: 0, wanderT: 0, wanderAlvo: new THREE.Vector3(),
      aggroT: 0, leashT: 0, respawnT: 0, spawn: new THREE.Vector3(),
      stunT: 0, dotT: 0, dotDano: 0, dotFonte: null,
      buffs: [], castT: 0, castTotal: 0, castSkill: null,
      botCd: rr(2, 8), raridade: 0, ouro: 0, xpVal: 0, danoMult: 1, defesa: 0, lastDmg: 0,
      ...opts,
    };
    mesh.add(placa.spr);
    placa.spr.position.y = 3.2;
    this.scene.add(mesh);
    this.ents.push(e);
    return e;
  }

  private construirJogador() {
    const cl = CLASSES[this.char.classe];
    const mesh = this.rigHumanoide(cl.cor, COR_FACCAO[this.char.faccao], this.char.classe, 1.05);
    this.eu = this.novaEnt("player", this.char.nome, 1, mesh, "#7dd3fc");
    this.eu.hpMax = cl.hp; this.eu.hp = cl.hp;
    this.eu.mpMax = cl.mp; this.eu.mp = cl.mp;
    this.eu.speed = 8.4;
    this.eu.faccao = this.char.faccao;
    this.eu.classe = this.char.classe;
    this.eu.pos.set(rr(-6, 6), 0, rr(-6, 6));
    this.eu.defesa = cl.def;
    this.syncY(this.eu);
    // anel de facção sob o jogador
    const anel = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.05, 20),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(COR_FACCAO[this.char.faccao]), transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    anel.rotation.x = -Math.PI / 2; anel.position.y = 0.05;
    mesh.add(anel);
  }

  private construirNPCs() {
    const npcs: { nome: string; emoji: string; x: number; z: number }[] = [
      { nome: "Sacerdote Alva", emoji: "✨", x: 8, z: 8 },
      { nome: "Guarda-Túmulos Vitor", emoji: "🧙", x: -9, z: 7 },
      { nome: "Mercador Tila", emoji: "💰", x: 10, z: -6 },
      { nome: "Pescador Kosme", emoji: "🎣", x: -7, z: -10 },
    ];
    for (const n of npcs) {
      const mesh = this.rigHumanoide("#f4c95d", "#b48a3c", 3, 1.02);
      const e = this.novaEnt("npc", n.nome, 99, mesh, "#f4c95d");
      e.pos.set(n.x, 0, n.z);
      e.speed = 0;
      this.syncY(e);
      // marcador ❗/💡 flutuante
      const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64;
      const ctx = cv.getContext("2d")!;
      ctx.font = "44px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(n.emoji, 32, 34);
      const tex = new THREE.CanvasTexture(cv);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
      spr.scale.set(1.2, 1.2, 1); spr.position.y = 4.6; spr.renderOrder = 998;
      mesh.add(spr);
    }
  }

  private construirMobs() {
    // popula cada zona com mobs do seu pool — ~110 no mundo
    for (const zona of ZONAS) {
      if (!zona.mobs.length) continue;
      const qtd = Math.round(zona.mobs.length * 3.2);
      for (let i = 0; i < qtd; i++) {
        const id = escolhe(zona.mobs);
        const def = MOBS.find(m2 => m2.id === id);
        if (!def) { console.warn("[Hordas] mob desconhecido:", id, "zona:", zona.id); continue; }
        this.spawnMob(def, zona.centro[0], zona.centro[1], zona.raio);
      }
    }
  }

  private spawnMob(def: MobDef, cx: number, cz: number, raio: number): Ent {
    const mesh = this.rigMob(def);
    const hpM = mobHpMax(def);
    const ang = rr(0, Math.PI * 2), dist = rr(0.25, 0.92) * raio;
    const x = cx + Math.cos(ang) * dist, z = cz + Math.sin(ang) * dist;
    const corNome = def.raridade >= 2 ? COR_RARIDADE[def.raridade] : def.nivel >= 45 ? "#ff8fa3" : "#ffb0b0";
    const e = this.novaEnt("mob", def.nome, def.nivel, mesh, corNome, {
      mob: def, hp: hpM, hpMax: hpM, raridade: def.raridade,
      xpVal: def.xp, ouro: def.ouro, danoMult: mobDano(def) / Math.max(1, def.danoMult),
      speed: def.agressivo ? rr(4.4, 5.6) : rr(2.2, 3.2),
    });
    e.danoMult = mobDano(def);
    e.pos.set(x, 0, z);
    e.spawn.copy(e.pos);
    this.syncY(e);
    return e;
  }

  private construirBots() {
    for (let i = 0; i < 7; i++) {
      const cl = rint(0, 3), fac = rint(0, 1);
      const mesh = this.rigHumanoide(CLASSES[cl].cor, COR_FACCAO[fac], cl, 1.02);
      const nivel = rint(3, 28);
      const e = this.novaEnt("bot", nomeAleatorio(), nivel, mesh, "#93c5fd", {
        classe: cl, faccao: fac, hpMax: CLASSES[cl].hp + nivel * 8, speed: rr(6.5, 8),
      });
      e.hp = e.hpMax;
      e.defesa = CLASSES[cl].def;
      const zona = escolhe(ZONAS.slice(1));
      e.pos.set(zona.centro[0] + rr(-30, 30), 0, zona.centro[1] + rr(-30, 30));
      this.syncY(e);
    }
  }

  private syncY(e: Ent) {
    const h = this.alturaEm(e.pos.x, e.pos.z);
    e.pos.y = h;
    e.mesh.position.copy(e.pos);
    e.mesh.rotation.y = e.yaw;
  }

  // ── input ──
  private ligarEventos() {
    const cv = this.canvas;
    cv.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("wheel", this.onWheel, { passive: true });
  }

  private onDown = (e: PointerEvent) => {
    if (e.button === 0 && !this.joystick.ativo) {
      // clique: mira raycast em entidade
      const r = this.canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.cam);
      const alvos = this.ents.filter(x => x.vivo && x !== this.eu && x.kind !== "npc");
      let melhor: Ent | null = null, melhorD = 26;
      const origem = this.raycaster.ray.origin, dir = this.raycaster.ray.direction;
      for (const a of alvos) {
        const v = new THREE.Vector3().subVectors(a.pos, origem);
        const t = v.dot(dir);
        if (t < 0 || t > 120) continue;
        const d = v.sub(dir.clone().multiplyScalar(t)).length();
        if (d < Math.max(1.4, a.raridade * 0.5) && t < melhorD) { melhorD = t; melhor = a; }
      }
      if (melhor) this.mirar(melhor);
      this.dragId = e.pointerId; this.dragX = e.clientX; this.dragY = e.clientY;
    } else if (e.button === 2) {
      this.dragId = e.pointerId; this.dragX = e.clientX; this.dragY = e.clientY;
    }
  };
  private raycaster = new THREE.Raycaster();

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.dragId) return;
    const dx = e.clientX - this.dragX, dy = e.clientY - this.dragY;
    this.dragX = e.clientX; this.dragY = e.clientY;
    this.camYaw -= dx * 0.0056;
    this.camPitch = clamp(this.camPitch + dy * 0.004, 0.12, 1.15);
  };

  private onUp = (e: PointerEvent) => { if (e.pointerId === this.dragId) this.dragId = -1; };

  private onWheel = (e: WheelEvent) => {
    this.camDist = clamp(this.camDist + Math.sign(e.deltaY) * 1.6, 7, 34);
  };

  private onKey = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    const k = e.key.toLowerCase();
    if (k >= "1" && k <= "8") this.usaSkillIndex(parseInt(k) - 1);
    if (e.code === "Tab") { e.preventDefault(); this.mirarProximo(); }
    if (e.code === "KeyQ") this.usaPocao();
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

  private onResize = () => {
    if (!this.canvas) return;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  };

  // API pública (React)
  setMove(x: number, z: number) { this.joystick.x = x; this.joystick.z = z; this.joystick.ativo = Math.abs(x) + Math.abs(z) > 0.05; }
  setCamRotate(dx: number) { this.camYaw -= dx * 0.012; }
  setZoom(delta: number) { this.camDist = clamp(this.camDist + delta, 7, 34); }
  setMini(canvas: HTMLCanvasElement | null) { this.miniCanvas = canvas; }
  pausar(p: boolean) { this.pausado = p; }

  // ── API usada pela UI (quests/NPC/móvel) ──
  hudSnap(): { zona: string; x: number; z: number } {
    return { zona: zonaEm(this.eu.pos.x, this.eu.pos.z).nome, x: Math.round(this.eu.pos.x), z: Math.round(this.eu.pos.z) };
  }
  recompensa(xp: number, ouro: number) {
    this.ganhaXP(xp);
    this.eu.ouro += ouro;
    this.onLog("sistema", `💰 +${ouro} de ouro de recompensa`);
  }
  curaTotal() {
    this.eu.hp = this.eu.hpMax;
    this.eu.mp = this.eu.mpMax;
    this.fxExpansao(this.eu.pos.clone(), 3, 0x12F027);
    this.onLog("sistema", "✨ O Sacerdote Alva restaurou a tua vida e magia.");
  }
  comprarPocao() {
    if (this.eu.ouro < 25) { this.onLog("sistema", "Ouro insuficiente (25 necessário)."); return; }
    if (this.pocoes >= 9) { this.onLog("sistema", "Já tens 9 poções."); return; }
    this.eu.ouro -= 25;
    this.pocoes++;
    this.onLog("sistema", "🧪 Compraste uma poção de vida.");
  }
  ataqueInstantaneo() {
    this.mirarProximo();
    const alvo = this.raycasterAlvo;
    if (!alvo) return;
    const d = alvo.pos.distanceTo(this.eu.pos);
    if (d > 3.4) {
      // aproxima até ao alcance do corpo a corpo
      const dir = new THREE.Vector3().subVectors(alvo.pos, this.eu.pos).normalize();
      this.eu.pos.add(dir.multiplyScalar(Math.max(0, d - 2.4)));
      this.syncY(this.eu);
    }
    this.eu.atkCd = 0;
  }

  dispose() {
    this.disposado = true;
    cancelAnimationFrame(this.raf);
    const cv = this.canvas;
    cv?.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    cv?.removeEventListener("wheel", this.onWheel);
    this.renderer?.dispose();
  }
// ═══════ PARTE 2: combate, IA, loop — colada no fim de hordesEngine.ts ═══════

  // ── mira ──
  private raycasterAlvo: Ent | null = null;
  mirar(e: Ent | null) { this.raycasterAlvo = e; }

  mirarProximo() {
    let melhor: Ent | null = null, melhorD = 40;
    for (const e of this.ents) {
      if (!e.vivo || e.kind !== "mob" || e === this.raycasterAlvo) continue;
      const d = e.pos.distanceTo(this.eu.pos);
      if (d < melhorD) { melhorD = d; melhor = e; }
    }
    if (melhor) this.mirar(melhor);
  }

  // ── poção (Q) ──
  private pocoes = 5;
  private usaPocao() {
    if (this.pocoes <= 0 || !this.eu.vivo || this.invPocaoCd > 0) return;
    this.pocoes--;
    this.invPocaoCd = 8;
    const cura = Math.round(this.eu.hpMax * 0.45);
    this.eu.hp = Math.min(this.eu.hpMax, this.eu.hp + cura);
    this.danoNum(this.eu.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), `+${cura}`, "#12F027");
    this.onLog("combate", `Usas-te uma poção (+${cura} HP). Restam ${this.pocoes}.`);
  }
  pocoesRestantes = (): number => this.pocoes;
  reporPocoes(n: number) { this.pocoes = Math.min(9, this.pocoes + n); }

  // ── skills ──
  skillsAtivas(): string[] { return CLASSES[this.char.classe].skills.filter(id => SKILLS[id].nivel <= this.eu.nivel); }

  pocao() { this.usaPocao(); }
  usaSkillIndex(i: number) {
    const ids = this.skillsAtivas();
    if (i < 0 || i >= ids.length) return;
    this.usaSkill(ids[i]);
  }

  usaSkill(id: string) {
    if (!this.eu.vivo || this.morteT !== null) return;
    const sk = SKILLS[id];
    if (!sk) return;
    if (this.eu.castSkill) { this.onLog("combate", "Já estás a canalizar!"); return; } // REA: cast bloqueia novas ações
    if (this.gcdT > 0) { this.onLog("combate", "Ação em recuperação global."); return; }
    if ((this.cds[id] ?? 0) > 0) { this.onLog("combate", `${sk.nome} ainda em recarga.`); return; }
    if (this.eu.mp < sk.custoMP) { this.onLog("combate", "MP insuficiente!"); return; }
    const precisaAlvo = sk.alvo === "inimigo" && sk.tipo !== "cura";
    if (precisaAlvo && (!this.raycasterAlvo || !this.raycasterAlvo.vivo)) {
      this.onLog("combate", "Sem alvo! Clica num inimigo ou usa Tab.");
      return;
    }
    this.eu.mp -= sk.custoMP;
    if (sk.cd > 0) this.cds[id] = sk.cd;
    this.gcdT = GCD; // REA: GCD 1.5s aplica-se a todas as skills

    if (sk.castLen > 0) {
      // cast bar (REA: castLen real — Dardo de Gelo 1.5s etc.)
      this.eu.castSkill = id; this.eu.castT = sk.castLen; this.eu.castTotal = sk.castLen;
      this.onLog("combate", `A canalizar ${sk.nome}…`);
      return;
    }
    this.executaSkill(id);
  }

  private executaSkill(id: string) {
    const sk = SKILLS[id];
    const alvo = this.raycasterAlvo;
    const roll = this.rollAtaque();
    const fator = sk.coef + this.eu.nivel * sk.incr;

    if (sk.tipo === "dano" || sk.tipo === "dot") {
      if (!alvo || !alvo.vivo) return;
      const d = Math.max(1, Math.round(sk.base + roll * fator));
      if (sk.alcance > 0 && alvo.pos.distanceTo(this.eu.pos) > sk.alcance * 1.2 + 4) {
        this.onLog("combate", `${sk.nome}: alvo fora de alcance.`);
        return;
      }
      if (id === "dardogelo" || id === "tiropreciso" || id === "perfuracao" || id === "flechavampirica" || id === "teleporte") {
        this.disparaProjétil(this.eu, alvo, d, id === "dardogelo" ? 0x9fe8ff : 0xf4c95d, sk.tipo === "dot");
      } else {
        this.aplicaDano(alvo, d, this.eu, sk.tipo === "dot");
        if (id === "cortecrescente" || id === "redemoinho") this.fxExpansao(this.eu.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), sk.alcance + 1.5, 0xf59e0b);
      }
      if (id === "flechavampirica") {
        const roubo = Math.round(d * 0.35);
        this.eu.hp = Math.min(this.eu.hpMax, this.eu.hp + roubo);
        this.danoNum(this.eu.pos.clone().add(new THREE.Vector3(0, 2.8, 0)), `+${roubo}`, "#12F027");
      }
      if (id === "colheitaalmas") {
        const roubo = Math.round(d * 0.3);
        this.eu.hp = Math.min(this.eu.hpMax, this.eu.hp + roubo);
      }
      this.onLog("combate", `${sk.nome} acerta ${alvo.nome} por ${d}.`);
    } else if (sk.tipo === "cura") {
      if (alvo && alvo.vivo && alvo.kind === "mob") {
        // no inimigo = dano sagrado (REA: Curar dual-mode)
        const d = Math.max(1, Math.round(sk.base + roll * fator * 0.6));
        this.disparaProjétil(this.eu, alvo, d, 0xfff3b0, false);
      } else {
        const cura = Math.round((sk.base + roll * fator) * 2.2);
        this.eu.hp = Math.min(this.eu.hpMax, this.eu.hp + cura);
        this.danoNum(this.eu.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), `+${cura}`, "#12F027");
        this.fxExpansao(this.eu.pos.clone(), 3, 0x12F027);
        this.onLog("combate", `Curas-te +${cura} HP.`);
      }
    } else if (sk.tipo === "buff") {
      const durMap: Record<string, number> = { grito: 300, peleferro: 12, furia: 17, palavravigor: 300, passoligeiro: 10, flechavenenosa: 12, escudogelo: 60, auraglacial: 300, blocoGelo: 5 };
      const dur = durMap[id] ?? 10;
      this.buffs = this.buffs.filter(b => b.id !== id);
      this.buffs.push({ id, nome: sk.nome, fim: now() + dur, emoji: sk.emoji });
      if (id === "blocoGelo") {
        // REA: Bloco de Gelo — imóvel e imune
        this.eu.stunT = Math.max(this.eu.stunT, dur);
      }
      this.fxExpansao(this.eu.pos.clone(), 2.6, 0x7dd3fc);
      this.onLog("combate", `${sk.nome} ativado (${dur}s).`);
    } else if (sk.tipo === "aoe") {
      const raio = sk.alcance > 10 ? 8 : sk.alcance + 2;
      let acertos = 0;
      for (const e of this.ents) {
        if (!e.vivo || e.kind !== "mob") continue;
        const d = e.pos.distanceTo(sk.alcance > 10 && alvo ? alvo.pos : this.eu.pos);
        if (d <= raio) {
          const dmg = Math.max(1, Math.round(sk.base + roll * fator));
          this.aplicaDano(e, dmg, this.eu, false);
          if (id === "novagelo") e.stunT = Math.max(e.stunT, 1.2);
          if (id === "provocar") { e.alvo = this.eu; e.aggroT = 8; }
          acertos++;
        }
      }
      this.fxExpansao((alvo && sk.alcance > 10 ? alvo.pos : this.eu.pos).clone(), raio, id === "novagelo" ? 0x9fe8ff : 0xffa040);
      this.onLog("combate", `${sk.nome} atinge ${acertos} inimigo(s).`);
    } else if (sk.tipo === "summon") {
      // Lobo de Luz (REA: summon do clérigo)
      const mesh = this.rigMob({ ...MOBS.find(x => x.id === "lobo")!, cor: "#fef9c3", cor2: "#f4c95d", escala: 0.9 });
      const pet = this.novaEnt("pet", "Lobo de Luz", this.eu.nivel, mesh, "#f4c95d", {
        hpMax: 60 + this.eu.nivel * 14, speed: 9,
      });
      pet.hp = pet.hpMax;
      pet.pos.copy(this.eu.pos).add(new THREE.Vector3(rr(-2, 2), 0, rr(-2, 2)));
      this.syncY(pet);
      this.onLog("sistema", "🐺 O Lobo de Luz luta ao teu lado!");
    }
  }

  private rollAtaque(): number {
    const cl = CLASSES[this.char.classe];
    let atq = cl.atq + this.eu.nivel * 1.35;
    if (this.buffs.some(b => b.id === "furia")) atq *= 1.35; // REA: Fúria +35%
    if (this.buffs.some(b => b.id === "grito")) atq *= 1.2; // REA: Grito de Guerra
    return atq;
  }

  // ── dano/cura genéricos ──
  private aplicaDano(e: Ent, d: number, fonte: Ent | null, dot: boolean) {
    if (!e.vivo) return;
    const def = e.kind === "player" || e.kind === "bot" ? e.defesa : e.raridade * 1.5;
    const efetivo = Math.max(1, Math.round(d * (1 - Math.min(0.5, def * 0.012))));
    e.hp -= efetivo;
    e.lastDmg = now();
    this.danoNum(e.pos.clone().add(new THREE.Vector3(rr(-0.6, 0.6), 2.4, 0)), `${efetivo}`, dot ? "#a3e635" : fonte === this.eu ? "#ffd23f" : "#ff8080");
    this.faíscas(e.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), dot ? 0xa3e635 : 0xffd23f, 5);
    if (e.hp <= 0) this.mata(e, fonte);
    else if (e.kind === "mob" && fonte && (fonte === this.eu || fonte.kind === "pet")) {
      // aggro (REA: aggroT + taunt)
      e.alvo = fonte.kind === "pet" ? (fonte as unknown as { dono?: Ent }).dono ?? this.eu : fonte;
      e.aggroT = 12;
      e.leashT = 0;
    }
    if (e === this.eu && e.hp <= 0) this.morre();
  }

  private mata(e: Ent, fonte: Ent | null) {
    e.vivo = false; e.hp = 0;
    e.mesh.visible = false;
    e.alvo = null;
    if (e.kind === "mob") {
      e.respawnT = 15 + rnd() * 10; // REA: respawn rápido p/ farm
      this.fxExpansao(e.pos.clone(), 2.2, 0xffffff);
      // loot (REA: ouro + peça com raridade)
      const fracOuro = Math.round(e.ouro * rr(0.85, 1.2));
      this.soltaLoot(e.pos.clone(), fracOuro);
      if (rnd() < 0.22 + e.raridade * 0.12) {
        const rar = rollRaridade();
        const peca = escolhe(["arma", "peito", "botas", "luvas", "amuleto"]);
        this.soltaLoot(e.pos.clone().add(new THREE.Vector3(rr(-1.5, 1.5), 0, rr(-1.5, 1.5))), 0, peca, rar);
      }
      if (fonte === this.eu) {
        this.eu.xpVal += 0; // placeholder (xp via XP direto abaixo)
        this.ganhaXP(e.xpVal);
        this.onKill(e.mob?.id ?? "");
        this.onLog("combate", `☠️ ${e.nome} (nv ${e.nivel}) derrotado! +${e.xpVal} XP`);
        this.combo++; this.comboT = 6;
      } else if (fonte && fonte.kind === "pet") {
        this.ganhaXP(Math.round(e.xpVal * 0.6));
        this.onKill(e.mob?.id ?? "");
      }
    } else if (e.kind === "bot") {
      e.respawnT = 20;
      this.onLog("geral", `${e.nome} caiu em combate.`);
    } else if (e.kind === "pet") {
      this.onLog("sistema", "O Lobo de Luz regressou ao plano espiritual.");
    }
  }

  private soltaLoot(pos: THREE.Vector3, ouro: number, peca: string | null = null, raridade = 0) {
    const g = new THREE.Group();
    if (peca) {
      const saco = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshLambertMaterial({ color: new THREE.Color(["#d4d4d8", "#4ade80", "#60a5fa", "#c084fc"][raridade]) }));
      saco.rotation.set(0.5, 0.7, 0.2);
      g.add(saco);
    } else {
      const moeda = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 10), new THREE.MeshLambertMaterial({ color: 0xf4c95d }));
      moeda.rotation.x = Math.PI / 2.3;
      g.add(moeda);
    }
    const brilho = new THREE.PointLight(0xf4c95d, 0.5, 4);
    g.add(brilho);
    g.position.copy(pos); g.position.y += 0.5;
    this.scene.add(g);
    this.loots.push({ mesh: g, ouro, peca, raridade, t: now(), pos: pos.clone() });
  }

  private ganhaXP(xp: number) {
    this.eu.xpVal += xp;
    while (this.eu.nivel < NIVEL_MAX && this.eu.xpVal >= xpParaNivel(this.eu.nivel)) {
      this.eu.xpVal -= xpParaNivel(this.eu.nivel);
      this.eu.nivel++;
      const cl = CLASSES[this.char.classe];
      const antes = this.eu.hpMax;
      this.eu.hpMax = cl.hp + (this.eu.nivel - 1) * 8; // REA: +8 HP/nível
      this.eu.hp = this.eu.hpMax; // cura total ao subir (REA: full heal)
      this.eu.mpMax = Math.round(cl.mp * (1 + this.eu.nivel * 0.06));
      this.eu.mp = this.eu.mpMax;
      this.fxExpansao(this.eu.pos.clone(), 4, 0xf4c95d);
      this.faíscas(this.eu.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xf4c95d, 22);
      this.onLog("sistema", `⭐ SUBISTE PARA O NÍVEL ${this.eu.nivel}! (+${this.eu.hpMax - antes} HP máx)`);
      this.onNivel(this.eu.nivel);
      if (this.eu.nivel >= NIVEL_MAX) this.onScoreFinal(this.eu.nivel);
    }
  }

  private morre() {
    if (this.morteT !== null) return;
    this.morteT = 3; // 3s até poder ressuscitar
    this.eu.vivo = false;
    this.eu.mesh.visible = false;
    this.mirar(null);
    this.onMorte();
    this.onLog("sistema", "💀 Morreste! O Sacerdote Alva pode trazer-te de volta.");
  }

  ressuscitar() {
    if (this.morteT === null || this.morteT > 0) return;
    this.morteT = null;
    this.eu.vivo = true;
    this.eu.hp = this.eu.hpMax;
    this.eu.mp = this.eu.mpMax;
    this.eu.mesh.visible = true;
    this.eu.pos.set(rr(-4, 4), 0, rr(-4, 4)); // junto ao sacerdote (REA: ressurreição na aldeia)
    this.syncY(this.eu);
    this.onLog("sistema", "✨ O Sacerdote Alva devolveu-te à vida.");
  }

  viajarAldeia() {
    if (this.morteT !== null) return;
    this.eu.pos.set(rr(-5, 5), 0, rr(-5, 5));
    this.syncY(this.eu);
    this.onLog("sistema", "Regressaste à Aldeia Aurora.");
  }

  // ── projéteis/fx ──
  private disparaProjétil(de: Ent, alvo: Ent, dano: number, cor: number, dot: boolean) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshBasicMaterial({ color: cor }),
    );
    mesh.position.copy(de.pos).add(new THREE.Vector3(0, 1.6, 0));
    this.scene.add(mesh);
    this.projeteis.push({ mesh, de, alvo, alvoPos: alvo.pos.clone(), vel: 26, dano, tipo: cor, cura: false, aoVivo: true });
    (mesh as unknown as { dot?: boolean }).dot = dot;
  }

  private fxExpansao(pos: THREE.Vector3, raio: number, cor: number) {
    const geo = new THREE.RingGeometry(raio * 0.3, raio, 28);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    mesh.position.copy(pos); mesh.position.y += 0.15;
    this.scene.add(mesh);
    this.fx.push({ mesh, t: 0, vida: 0.55 });
  }

  private danoNum(pos: THREE.Vector3, txt: string, cor: string) {
    const cv = document.createElement("canvas");
    cv.width = 128; cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.font = "800 34px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.strokeText(txt, 64, 40);
    ctx.fillStyle = cor;
    ctx.fillText(txt, 64, 40);
    const tex = new THREE.CanvasTexture(cv);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    spr.scale.set(2.6, 1.3, 1);
    spr.position.copy(pos);
    spr.renderOrder = 1000;
    this.scene.add(spr);
    this.danosNum.push({ spr, t: 0, vida: 1.0, vy: 2.4 });
  }

  private faíscas(pos: THREE.Vector3, cor: number, n: number) {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        new THREE.MeshBasicMaterial({ color: cor }),
      );
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.particulas.push({ mesh, vx: rr(-3, 3), vy: rr(2, 6), vz: rr(-3, 3), t: 0, vida: rr(0.4, 0.8) });
    }
  }

  // ── IA dos mobs (REA: wander/aggro/chase/leash/respawn) ──
  private tickMob(e: Ent, dt: number) {
    if (!e.vivo) {
      e.respawnT -= dt;
      if (e.respawnT <= 0) {
        e.vivo = true; e.hp = e.hpMax;
        e.mesh.visible = true;
        e.pos.copy(e.spawn);
        e.alvo = null; e.aggroT = 0;
        this.syncY(e);
      }
      return;
    }
    // dot
    if (e.dotT > 0) {
      e.dotT -= dt;
      if ((e.dotTicks = (e.dotTicks ?? 0) - dt) <= 0) {
        e.dotTicks = 1;
        this.aplicaDano(e, e.dotDano, e.dotFonte ?? this.eu, true);
        if (!e.vivo) return;
      }
    }
    if (e.stunT > 0) { e.stunT -= dt; e.aggroT = Math.max(e.aggroT, 1); return; }

    const distSpawn = e.pos.distanceTo(e.spawn);
    // leash (REA: volta ao spawn se longe)
    if (e.aggroT > 0 && distSpawn > 55) {
      e.aggroT = 0; e.alvo = null; e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.5);
    }
    // agressivo: procura alvo próximo
    if (e.aggroT <= 0 && e.mob?.agressivo) {
      const alvos = [this.eu, ...this.ents.filter(x => x.kind === "bot" && x.vivo)];
      for (const a of alvos) {
        if (!a.vivo) continue;
        if (a.pos.distanceTo(e.pos) < 13) { e.alvo = a; e.aggroT = 14; break; }
      }
    }
    if (e.aggroT > 0) {
      e.aggroT -= dt;
      const a = e.alvo;
      if (!a || !a.vivo || (a.kind === "player" && this.morteT !== null)) { e.alvo = null; e.aggroT = 0; }
      else {
        const d = e.pos.distanceTo(a.pos);
        if (d > 2.4 * (e.raridade + 1)) {
          const dir = new THREE.Vector3().subVectors(a.pos, e.pos).normalize();
          e.pos.add(dir.multiplyScalar(e.speed * dt));
          e.yaw = Math.atan2(dir.x, dir.z);
        }
        e.atkCd -= dt;
        if (d < 3.4 + e.raridade && e.atkCd <= 0) {
          e.atkCd = rr(1.6, 2.2);
          const dmg = e.danoMult * rr(0.85, 1.15);
          this.aplicaDano(a, dmg, e, false);
        }
      }
    } else {
      // wander (REA: mobs vagueiam perto do spawn)
      e.wanderT -= dt;
      if (e.wanderT <= 0) {
        e.wanderT = rr(3, 9);
        const ang = rr(0, Math.PI * 2), d = rr(2, 14);
        e.wanderAlvo.set(e.spawn.x + Math.cos(ang) * d, 0, e.spawn.z + Math.sin(ang) * d);
      }
      const dir = new THREE.Vector3().subVectors(e.wanderAlvo, e.pos);
      dir.y = 0;
      if (dir.length() > 0.8) {
        dir.normalize();
        e.pos.add(dir.multiplyScalar(e.speed * 0.55 * dt));
        e.yaw = Math.atan2(dir.x, dir.z);
      }
    }
    this.syncY(e);
  }

  // ── IA dos bots (REA: mundo vivo) ──
  private tickBot(e: Ent, dt: number) {
    if (!e.vivo) {
      e.respawnT -= dt;
      if (e.respawnT <= 0) { e.vivo = true; e.hp = e.hpMax; e.mesh.visible = true; }
      return;
    }
    // luta com mob próximo
    e.botCd -= dt;
    if (!e.alvo || !e.alvo.vivo || e.alvo.kind !== "mob") {
      if (e.botCd <= 0) {
        e.botCd = rr(2, 6);
        let melhor: Ent | null = null, dMelhor = 18;
        for (const m2 of this.ents) {
          if (m2.kind !== "mob" || !m2.vivo) continue;
          const d = m2.pos.distanceTo(e.pos);
          if (d < dMelhor) { dMelhor = d; melhor = m2; }
        }
        e.alvo = melhor;
      }
    } else {
      const d = e.pos.distanceTo(e.alvo.pos);
      if (d > 3) {
        const dir = new THREE.Vector3().subVectors(e.alvo.pos, e.pos).normalize();
        e.pos.add(dir.multiplyScalar(e.speed * 0.7 * dt));
        e.yaw = Math.atan2(dir.x, dir.z);
      }
      e.atkCd -= dt;
      if (e.atkCd <= 0 && d < 4) {
        e.atkCd = rr(1.4, 2.0);
        const dmg = (6 + e.nivel * 1.4) * rr(0.8, 1.2);
        this.aplicaDano(e.alvo, dmg, e, false);
        if (!e.alvo.vivo) { e.alvo = null; }
      }
      // bot apanha dano
      if (e.alvo && e.alvo.atkCd < 0.1 && rnd() < 0.02) {
        this.aplicaDano(e, e.alvo.danoMult * 0.8, e.alvo, false);
      }
    }
    if (e.hp < e.hpMax * 0.25 && rnd() < 0.01) { e.hp = e.hpMax; this.faíscas(e.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0x12F027, 8); }
    this.syncY(e);
  }

  // ── loop principal ──
  private loop = () => {
    if (this.disposado) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = Math.min(this.clock.getDelta(), 0.1);
    const dt = this.pausado ? 0 : raw * this.tScale;
    const t = now();

    if (dt > 0) {
      this.tDia = (this.tDia + dt / 300) % 1; // ciclo de 5 min (REA: daycycle)
      this.tickDiaNoite();
      this.tickJogador(dt, t);
      for (const e of this.ents) {
        if (e.kind === "mob") this.tickMob(e, dt);
        else if (e.kind === "bot") this.tickBot(e, dt);
        else if (e.kind === "pet") this.tickPet(e, dt);
      }
      this.tickProjeteis(dt);
      this.tickFx(dt);
      this.tickLoot(t);
      this.tickChatBots(dt);
    }

    this.tickCamera(raw);
    if (this.chamaTotem) this.chamaTotem.scale.setScalar(1 + Math.sin(t * 7) * 0.12);
    this.agua.position.y = -7.5 + Math.sin(t * 0.6) * 0.12;

    // placas 6Hz
    this.placasT -= raw;
    if (this.placasT <= 0) {
      this.placasT = 0.16;
      this.atualizaPlacas();
    }
    // HUD 6Hz
    this.hudT -= raw;
    if (this.hudT <= 0) { this.hudT = 0.16; this.enviaHud(); }
    // minimapa 5Hz
    this.miniT -= raw;
    if (this.miniT <= 0) { this.miniT = 0.2; this.desenhaMini(); }

    this.renderer.render(this.scene, this.cam);
  };

  private tickPet(e: Ent, dt: number) {
    if (!e.vivo) { e.respawnT -= dt; if (e.respawnT <= 0) { e.vivo = true; e.mesh.visible = true; } return; }
    // segue dono e ataca alvo do dono
    const dono = this.eu;
    let alvo: Ent | null = dono.vivo && this.raycasterAlvo && this.raycasterAlvo.kind === "mob" && this.raycasterAlvo.vivo ? this.raycasterAlvo : null;
    if (!alvo) {
      let melhor: Ent | null = null, dM = 10;
      for (const m2 of this.ents) if (m2.kind === "mob" && m2.vivo && m2.aggroT > 0) {
        const d = m2.pos.distanceTo(dono.pos);
        if (d < dM) { dM = d; melhor = m2; }
      }
      alvo = melhor;
    }
    const dest = alvo ? alvo.pos : dono.pos;
    const d = e.pos.distanceTo(dest);
    if (alvo && d < 3.2) {
      e.atkCd -= dt;
      if (e.atkCd <= 0) {
        e.atkCd = 1.6;
        (e as unknown as { dono?: Ent }).dono = dono;
        this.aplicaDano(alvo, (5 + dono.nivel * 1.1) * rr(0.8, 1.2), e, false);
      }
    } else if (d > 2) {
      const dir = new THREE.Vector3().subVectors(dest, e.pos).normalize();
      e.pos.add(dir.multiplyScalar(e.speed * dt));
      e.yaw = Math.atan2(dir.x, dir.z);
    }
    this.syncY(e);
  }

  private tickDiaNoite() {
    // REA: worldlight/fog/daycycle do shader original — cores equivalentes
    const ang = this.tDia * Math.PI * 2;
    const solAlt = Math.sin(ang - Math.PI / 2) * 0.5 + 0.5;
    const dia = clamp(solAlt * 1.4 - 0.2, 0, 1);
    const corCeu = new THREE.Color().setHSL(0.58, 0.55, 0.12 + dia * 0.55);
    const corFog = new THREE.Color().setHSL(0.56, 0.4, 0.1 + dia * 0.6);
    (this.ceu.material as THREE.MeshBasicMaterial).color = corCeu;
    (this.scene.fog as THREE.Fog).color = corFog;
    this.luzSol.intensity = 0.25 + dia * 1.15;
    this.luzAmb.intensity = 0.35 + dia * 0.65;
    this.luzSol.position.set(Math.cos(ang) * 160, 60 + solAlt * 140, Math.sin(ang) * 160);
  }

  private tickJogador(dt: number, t: number) {
    const e = this.eu;
    // regen fora de combate (REA: refreshCombatTimer)
    const emCombate = t - e.lastDmg < 5 || this.ents.some(x => x.kind === "mob" && x.alvo === e && x.aggroT > 0);
    if (!emCombate) {
      e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.045 * dt);
      e.mp = Math.min(e.mpMax, e.mp + e.mpMax * 0.06 * dt);
    } else {
      e.mp = Math.min(e.mpMax, e.mp + e.mpMax * 0.012 * dt);
    }
    // cooldowns
    this.gcdT = Math.max(0, this.gcdT - dt);
    for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.invPocaoCd = Math.max(0, this.invPocaoCd - dt);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    // buffs expiram
    this.buffs = this.buffs.filter(b => b.fim > t);
    // morte
    if (this.morteT !== null) { this.morteT = Math.max(0, this.morteT - dt); return; }
    if (!e.vivo) return;
    // cast em progresso
    if (e.castSkill) {
      e.castT -= dt;
      // REA: mover cancela canalização
      const mx = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0) + this.joystick.z;
      const mz = (this.keys.has("KeyA") ? 1 : 0) - (this.keys.has("KeyD") ? 1 : 0) + this.joystick.x;
      if (Math.abs(mx) + Math.abs(mz) > 0.1) {
        e.castSkill = null;
        this.onLog("combate", "Canalização cancelada (movimento).");
      } else if (e.castT <= 0) {
        const id = e.castSkill;
        e.castSkill = null;
        this.executaSkill(id);
      }
      return; // parado a canalizar
    }
    // movimento relativo à câmara
    let fx = 0, fz = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) fz += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) fz -= 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) fx += 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) fx -= 1;
    fx += this.joystick.x; fz += this.joystick.z;
    const mag = Math.hypot(fx, fz);
    if (mag > 0.05) {
      fx /= Math.max(1, mag); fz /= Math.max(1, mag);
      // converter para mundo
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = fz * sin + fx * cos;
      const wz = fz * cos - fx * sin;
      const vel = e.speed * (this.buffs.some(b => b.id === "passoligeiro") ? 1.45 : 1) * (e.stunT > 0 ? 0 : 1);
      e.pos.x = clamp(e.pos.x + wx * vel * dt, -480, 480);
      e.pos.z = clamp(e.pos.z + wz * vel * dt, -480, 480);
      e.yaw = Math.atan2(wx, wz);
      // bob da caminhada
      e.mesh.position.y = e.pos.y + Math.abs(Math.sin(t * 9)) * 0.14;
    }
    // stun decai
    e.stunT = Math.max(0, e.stunT - dt);
    // auto-ataque no alvo em alcance (REA: melee auto cd = 100/stat17)
    const alvo = this.raycasterAlvo;
    if (alvo && alvo.vivo) {
      const d = alvo.pos.distanceTo(e.pos);
      const classe = this.char.classe;
      const alcanceAtq = classe === 1 || classe === 2 ? 24 : 3.2; // mago/arqueiro à distância
      e.atkCd -= dt;
      if (e.atkCd <= 0 && d <= alcanceAtq + 2 && e.stunT <= 0) {
        e.atkCd = 1.15;
        const cl = CLASSES[classe];
        const roll = cl.atq + this.eu.nivel * 1.1;
        const crit = rnd() < (cl.crit / 100 + 0.03);
        let dmg = Math.max(1, Math.round((2 + roll * 0.42) * (crit ? 1.8 : 1)));
        this.aplicaDano(alvo, dmg, e, false);
        if (classe !== 1 && classe !== 2) this.fxExpansao(alvo.pos.clone().add(new THREE.Vector3(0, 0.1, 0)), 1.6, 0xffffff);
        if (this.buffs.some(b => b.id === "flechavenenosa")) {
          alvo.dotT = 4; alvo.dotDano = roll * 0.12; alvo.dotFonte = e; alvo.dotTicks = 1;
        }
      }
    }
    this.syncY(e);
  }

  private tickProjeteis(dt: number) {
    for (let i = this.projeteis.length - 1; i >= 0; i--) {
      const p = this.projeteis[i];
      const dest = p.alvo && p.alvo.vivo ? p.alvo.pos.clone().add(new THREE.Vector3(0, 1.3, 0)) : p.alvoPos;
      const dir = new THREE.Vector3().subVectors(dest, p.mesh.position);
      const dist = dir.length();
      const passo = p.vel * dt;
      if (dist <= passo + 0.4) {
        if (p.alvo && p.alvo.vivo) {
          const dot = (p.mesh as unknown as { dot?: boolean }).dot;
          this.aplicaDano(p.alvo, p.dano, p.de, !!dot);
          this.faíscas(p.mesh.position.clone(), p.tipo, 6);
        }
        this.scene.remove(p.mesh);
        this.projeteis.splice(i, 1);
        continue;
      }
      dir.normalize();
      p.mesh.position.add(dir.multiplyScalar(passo));
    }
  }

  private tickFx(dt: number) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const frac = f.t / f.vida;
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - frac);
      f.mesh.scale.setScalar(1 + frac * 0.9);
      if (f.t >= f.vida) { this.scene.remove(f.mesh); this.fx.splice(i, 1); }
    }
    for (let i = this.danosNum.length - 1; i >= 0; i--) {
      const d = this.danosNum[i];
      d.t += dt;
      d.spr.position.y += d.vy * dt;
      d.vy -= 2.2 * dt;
      (d.spr.material as THREE.SpriteMaterial).opacity = 1 - d.t / d.vida;
      if (d.t >= d.vida) { this.scene.remove(d.spr); this.danosNum.splice(i, 1); }
    }
    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i];
      p.t += dt;
      p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
      p.vy -= 9 * dt;
      if (p.t >= p.vida) { this.scene.remove(p.mesh); this.particulas.splice(i, 1); }
    }
  }

  private tickLoot(t: number) {
    for (let i = this.loots.length - 1; i >= 0; i--) {
      const l = this.loots[i];
      l.mesh.rotation.y += 0.03;
      const d = l.pos.distanceTo(this.eu.pos);
      if (d < 2.6 && this.eu.vivo) {
        if (l.ouro > 0) {
          this.eu.ouro += l.ouro;
          this.onLoot(l.ouro, null, 0);
          this.onLog("combate", `+${l.ouro} de ouro`);
        }
        if (l.peca) {
          this.onLoot(0, l.peca, l.raridade);
          this.onLog("sistema", `🎁 Encontraste: ${nomePeca(CLASSES[this.char.classe], l.peca, l.raridade)}!`);
        }
        this.scene.remove(l.mesh);
        this.loots.splice(i, 1);
      } else if (t - l.t > 60) {
        this.scene.remove(l.mesh);
        this.loots.splice(i, 1);
      }
    }
  }

  private tickChatBots(dt: number) {
    this._chatT -= dt;
    if (this._chatT <= 0) {
      this._chatT = rr(9, 22);
      const bots = this.ents.filter(e => e.kind === "bot");
      if (bots.length) {
        const b = escolhe(bots);
        const fala = escolhe(this.falasBot);
        this.onLog("geral", `[${b.nome}]: ${fala}`);
      }
    }
  }
  private _chatT = 6;

  private tickCamera(dt: number) {
    const e = this.eu;
    const foco = e.pos.clone().add(new THREE.Vector3(0, 2.4, 0));
    const cosP = Math.cos(this.camPitch);
    const off = new THREE.Vector3(
      Math.sin(this.camYaw) * cosP * this.camDist,
      Math.sin(this.camPitch) * this.camDist + 1.2,
      Math.cos(this.camYaw) * cosP * this.camDist,
    );
    const alvo = foco.clone().add(off);
    alvo.y = Math.max(alvo.y, this.alturaEm(alvo.x, alvo.z) + 1.6);
    this.cam.position.lerp(alvo, Math.min(1, dt * 9));
    this.cam.lookAt(foco);
  }

  private atualizaPlacas() {
    const t = now();
    for (const e of this.ents) {
      if (!e.mesh.visible) continue;
      const frac = e.hpMax > 0 ? clamp(e.hp / e.hpMax, 0, 1) : 0;
      // distância: esconder placa longe (REA: nameplate range) — atualiza SEMPRE
      const d = e.pos.distanceTo(this.eu.pos);
      e.placa.visible = d < 70;
      if (Math.abs(frac - e.placaHp) < 0.01 && e.placaHp >= 0) continue;
      e.placaHp = frac;
      const corNome = e.kind === "player" ? "#7dd3fc" : e.kind === "bot" ? "#93c5fd" : e.kind === "npc" ? "#f4c95d" : e.mob?.raridade >= 2 ? COR_RARIDADE[e.mob.raridade] : "#ffb0b0";
      this.desenhaPlaca(e.placaCv2d, e.placaTex, e.nome, e.nivel, corNome, frac);
    }
  }

  private enviaHud() {
    const alvo = this.raycasterAlvo;
    const ids = this.skillsAtivas();
    const hud: HudState = {
      hp: Math.max(0, Math.round(this.eu.hp)), hpMax: this.eu.hpMax,
      mp: Math.max(0, Math.round(this.eu.mp)), mpMax: this.eu.mpMax,
      xp: Math.round(this.eu.xpVal), xpProx: xpParaNivel(this.eu.nivel),
      nivel: this.eu.nivel, ouro: Math.round(this.eu.ouro),
      vivo: this.eu.vivo && this.morteT === null,
      zona: zonaEm(this.eu.pos.x, this.eu.pos.z).nome,
      x: Math.round(this.eu.pos.x), z: Math.round(this.eu.pos.z),
      alvo: alvo && alvo.vivo ? { nome: alvo.nome, nivel: alvo.nivel, hp: Math.max(0, Math.round(alvo.hp)), hpMax: alvo.hpMax, raridade: alvo.raridade, dist: Math.round(alvo.pos.distanceTo(this.eu.pos)) } : null,
      cast: this.eu.castSkill ? { nome: SKILLS[this.eu.castSkill].nome, t: this.eu.castT, total: this.eu.castTotal } : null,
      cds: ids.map(id => this.cds[id] ?? 0),
      gcd: this.gcdT, buffs: this.buffs.map(b => b.emoji),
      classe: this.char.classe, nome: this.char.nome,
      combos: this.combo, morteT: this.morteT, pocoes: this.pocoes,
    };
    this.onHud(hud);
  }

  // ── minimapa (REA: minimapa + zona + coords) ──
  private desenhaMini() {
    const cv = this.miniCanvas;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const S = cv.width;
    const alcance = 150;
    const px = (x: number): number => S / 2 + ((x - this.eu.pos.x) / alcance) * (S / 2);
    const pz = (z: number): number => S / 2 + ((z - this.eu.pos.z) / alcance) * (S / 2);
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#0c1210";
    ctx.fillRect(0, 0, S, S);
    // zonas
    for (const z of ZONAS) {
      ctx.fillStyle = `#${z.cor.toString(16).padStart(6, "0")}`;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(px(z.centro[0]), pz(z.centro[1]), Math.max(3, (z.raio / alcance) * (S / 2)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // entidades
    for (const e of this.ents) {
      if (!e.vivo || !e.mesh.visible) continue;
      const d = e.pos.distanceTo(this.eu.pos);
      if (d > alcance) continue;
      ctx.fillStyle = e.kind === "mob" ? (e.mob?.agressivo ? "#ff5a5f" : "#f4c95d") : e.kind === "npc" ? "#ffd23f" : e.kind === "player" ? "#ffffff" : "#7dd3fc";
      const r = e.kind === "player" ? 4 : e.kind === "npc" ? 3.5 : 2.4;
      ctx.beginPath();
      ctx.arc(px(e.pos.x), pz(e.pos.z), r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // moldura
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); ctx.stroke();
    // norte
    ctx.fillStyle = "#fff"; ctx.font = "700 11px system-ui"; ctx.textAlign = "center";
    ctx.fillText("N", S / 2, 12);
  }

  // ── hooks E2E (window.__bw) — contratos estáveis ──
  private registarHooks() {
    const w = window as unknown as Record<string, unknown>;
    const eng = this;
    w.__bw = {
      // placas de nome (REA: self/mobs/players)
      tags(): { self: boolean; mobs: number; players: number } {
        let mobs = 0, players = 0;
        for (const e of eng.ents) {
          if (!e.mesh.visible) continue;
          const vis = e.placa.visible !== false && e.pos.distanceTo(eng.eu.pos) < 70;
          if (e.kind === "mob" && vis) mobs++;
          else if ((e.kind === "bot" || e.kind === "player") && vis) players++;
        }
        return { self: eng.eu.mesh.visible, mobs, players };
      },
      hud(): HudState & { pocoes: number } {
        const alvo = eng.raycasterAlvo;
        const ids = eng.skillsAtivas();
        return {
          hp: Math.round(eng.eu.hp), hpMax: eng.eu.hpMax,
          mp: Math.round(eng.eu.mp), mpMax: eng.eu.mpMax,
          xp: Math.round(eng.eu.xpVal), xpProx: xpParaNivel(eng.eu.nivel),
          nivel: eng.eu.nivel, ouro: Math.round(eng.eu.ouro),
          vivo: eng.eu.vivo && eng.morteT === null,
          zona: zonaEm(eng.eu.pos.x, eng.eu.pos.z).nome,
          x: Math.round(eng.eu.pos.x), z: Math.round(eng.eu.pos.z),
          alvo: alvo && alvo.vivo ? { nome: alvo.nome, nivel: alvo.nivel, hp: Math.round(alvo.hp), hpMax: alvo.hpMax, raridade: alvo.raridade, dist: Math.round(alvo.pos.distanceTo(eng.eu.pos)) } : null,
          cast: eng.eu.castSkill ? { nome: SKILLS[eng.eu.castSkill].nome, t: eng.eu.castT, total: eng.eu.castTotal } : null,
          cds: ids.map(id => eng.cds[id] ?? 0), gcd: eng.gcdT,
          buffs: eng.buffs.map(b => b.emoji), classe: eng.char.classe, nome: eng.char.nome,
          combos: eng.combo, morteT: eng.morteT, pocoes: eng.pocoes,
        };
      },
      state(): { cast: { nome: string } | null; target: string | null; vivo: boolean; zona: string; nivel: number } {
        return {
          cast: eng.eu.castSkill ? { nome: SKILLS[eng.eu.castSkill].nome } : null,
          target: eng.raycasterAlvo && eng.raycasterAlvo.vivo ? eng.raycasterAlvo.nome : null,
          vivo: eng.eu.vivo, zona: zonaEm(eng.eu.pos.x, eng.eu.pos.z).nome,
          nivel: eng.eu.nivel,
        };
      },
      castSkill(i: number) { eng.usaSkillIndex(i); },
      castSkillNome(id: string) { eng.usaSkill(id); },
      pocao() { eng.usaPocao(); },
      sendChat(msg: string) { eng.onLog("geral", `[${eng.char.nome}]: ${msg}`); },
      // teletransporte de teste (determinismo)
      tp(x: number, z: number) { eng.eu.pos.set(x, 0, z); eng.syncY(eng.eu); },
      targetNear(nomeSub: string): string | null {
        let melhor: Ent | null = null, dM = Infinity;
        for (const e of eng.ents) {
          if (e.kind !== "mob" || !e.vivo) continue;
          if (nomeSub && !e.nome.toLowerCase().includes(nomeSub.toLowerCase())) continue;
          const d = e.pos.distanceTo(eng.eu.pos);
          if (d < dM) { dM = d; melhor = e; }
        }
        if (melhor) { eng.mirar(melhor); return melhor.nome; }
        return null;
      },
      // acelera o tempo de simulação (casts longos em E2E/GL por software)
      fastForward(sec: number, ms = 2500) { eng.tScale = sec; setTimeout(() => { eng.tScale = 1; }, ms); },
      // stats dos frames de grupo (REA: party frames)
      party(): { nome: string; nivel: number; hpFrac: number; classe: number }[] {
        return eng.ents.filter(e => e.kind === "bot").slice(0, 4)
          .map(e => ({ nome: e.nome, nivel: e.nivel, hpFrac: e.hp / e.hpMax, classe: e.classe }));
      },
      mobsPerto(raio: number): number {
        return eng.ents.filter(e => e.kind === "mob" && e.vivo && e.pos.distanceTo(eng.eu.pos) < raio).length;
      },
      atacarProximo(): string | null {
        // mantém o alvo atual se vivo; senão agarra o mais próximo
        if (!eng.raycasterAlvo || !eng.raycasterAlvo.vivo) {
          const nome = (w.__bw as { targetNear(n?: string): string | null }).targetNear("");
          if (!nome) return null;
        }
        const alvo = eng.raycasterAlvo;
        if (alvo) {
          const d = alvo.pos.distanceTo(eng.eu.pos);
          if (d > 2.6) {
            const dir = new THREE.Vector3().subVectors(alvo.pos, eng.eu.pos).normalize();
            eng.eu.pos.add(dir.multiplyScalar(Math.max(0, d - 2.2)));
            eng.syncY(eng.eu);
          }
          eng.eu.atkCd = 0;
        }
        return alvo?.nome ?? null;
      },
      morrer(): void {
        // simula morte instantânea (teste da ressurreição)
        eng.aplicaDano(eng.eu, eng.eu.hp + 10, null, false);
      },
      questKill(mobId: string) { eng.onKill(mobId); },
      respawn() { eng.ressuscitar(); },
    };
  }
}
