// @ts-nocheck
// ============================================================
// BATEU WORLD — ERA DAS LENDAS (v18) · MOTOR MMO 3D
// Reconstrução TOTAL (REA de Hordes.io + superação):
//  · Terreno 800×800 com 11 regiões, biomas e cores vivas
//  · IA de MATILHA agressiva, elites, chefes c/ mecânicas
//  · 2 chefes mundiais, vilões da plataforma, 2 masmorras
//  · PvP de facções aberto, FAMA, torres de domínio
//  · Grupo c/ bónus, clãs, duelos 1v1, montarias, habitação
//    c/ proteção e invasão, cupões roubáveis, mundo que
//    CRESCE com a população da plataforma
//  · Renderização NÍTIDA (sem névoa embaciada), qualidade
//    adaptativa, mobile-first
// ============================================================

import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import { worldAudio } from "./worldAudio";
import {
  buildAvatar, animateAvatar, defaultAvatar, avatarKey, parseAvatarKey,
  type AvatarConfig, type AvatarParts,
} from "./avatar";
import {
  CLASSES, SKILLS, MOB_TYPES, REGION_BOSSES, WORLD_BOSSES, VILLAINS, REGIONS,
  LANDMARKS, TOWERS, DUNGEONS, MOUNTS, BUILDINGS, FACTIONS, RARITY_META, AFFIXES,
  PVP_SAFE_RADIUS, xpNeed, mobXp, mobLevelForTier, LEVEL_CAP, BOT_NAMES,
  MIRADOUROS, EMOTES, AURAS,
  type SkillDef, type MobType, type LootItem,
} from "./mmo";
import { rollLoot } from "./loot";

// ── Util ────────────────────────────────────────────────────
const rnd = (a = 1, b = 0) => b + Math.random() * (a - b);
const rndi = (a: number, b: number) => Math.floor(rnd(a, b));
const pick = <T,>(arr: T[]): T => arr[rndi(arr.length, 0)];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const dist2 = (ax: number, az: number, bx: number, bz: number) => {
  const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz;
};
const todayStr = () => new Date().toDateString();

// Ruído de valor suave determinístico
function hash2(x: number, y: number): number {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}

export interface EngineStats {
  atk: number; maxHp: number; def: number; spd: number; maxMp: number; crit: number; leech: number;
}

export interface EngineOpts {
  name: string; classId: number; level: number; faction: number; uid: string;
  avatar: AvatarConfig; stats: EngineStats;
  onEvent: (ev: { type: string; [k: string]: any }) => void;
}

// ── Entidades ───────────────────────────────────────────────
interface MobEnt {
  id: number; group: THREE.Group; type: MobType; lvl: number;
  hp: number; maxHp: number; x: number; z: number; hx: number; hz: number;
  state: "idle" | "chase" | "attack" | "return" | "dead";
  aggroT: number; atkT: number; roamT: number; tx: number; tz: number;
  isBoss: boolean; isElite: boolean; isWorld: boolean; isVillain: boolean;
  isGuard: boolean; name: string; mech?: string; mechT: number; enraged: boolean;
  scale: number; deadT: number; wave?: number; floatY: number; bob: number;
  slowT: number; stunT: number; poisonT: number; poisonDmg: number; burnT: number;
  respawnT: number; campId: number;
}

interface ProjEnt {
  mesh: THREE.Mesh; x: number; y: number; z: number; dx: number; dz: number;
  speed: number; life: number; dmg: number; from: "player" | "mob" | "guard";
  target?: MobEnt | null; pierce: boolean; radius: number; aoe: number;
  color: number; fromFaction?: number; hitSet?: Set<number>;
}

interface TeleEnt { mesh: THREE.Mesh; t: number; dur: number; dmg: number; r: number; x: number; z: number; kind: string }

interface PlayerEnt { // remotos e bots
  id: string; name: string; faction: number; level: number; classId: number;
  avatar: AvatarParts | null; group: THREE.Group; x: number; z: number;
  tx: number; tz: number; hp: number; maxHp: number; bot: boolean;
  coupons: number; atkT: number; roamT: number; state: string; txT: number;
  targetMob: MobEnt | null; duelWith: string | null; mountId: string | null;
  mesh: THREE.Group | null;
}

interface NodeEnt { // recolha
  group: THREE.Group; kind: "erva" | "minerio" | "cristal"; x: number; z: number;
  active: boolean; respawnT: number;
}

interface TowerEnt {
  id: string; name: string; x: number; z: number; emoji: string;
  group: THREE.Group; owner: number; prog: number; flagMesh: THREE.Mesh | null;
}

interface HousingEnt {
  uid: string; name: string; x: number; z: number; group: THREE.Group;
  built: Record<string, number>; towerHp: number; towerMax: number;
  vault: number; group_owner: number;
}

// ════════════════════════════════════════════════════════════
export class WorldEngine {
  private scene = new THREE.Scene();
  private cam: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private opts: EngineOpts;
  private onEvent: EngineOpts["onEvent"];
  private raf = 0; private clock = new THREE.Clock();
  private disposed = false;

  // player
  private player!: AvatarParts;
  private pGroup = new THREE.Group();
  private px = 0; private pz = 30; private py = 0;
  private pYaw = 0; private camYaw = Math.PI; private camPitch = 0.5; private camDist = 16;
  private hp = 100; private mp = 100;
  private dead = false;
  private state = {
    hp: 100, mp: 100, maxHp: 100, maxMp: 100, x: 0, z: 30, level: 1,
    kills: 0, xp: 0, gold: 0, target: null as any, dead: false, region: "vila",
    mountedId: null as string | null, cds: [] as number[], buffs: [] as { id: string; t: number }[],
    dungeon: null as any, fps: 60, pop: 1, online: 1,
  };
  private iFrames = 0;
  private dodgeT = 0; private dodgeDir = new THREE.Vector3();

  // mundo
  private mobs: MobEnt[] = []; private projs: ProjEnt[] = []; private teles: TeleEnt[] = [];
  private players = new Map<string, PlayerEnt>();
  private nodes: NodeEnt[] = [];
  private towers: TowerEnt[] = [];
  private houses = new Map<string, HousingEnt>();
  private myHouse: HousingEnt | null = null;
  private mobId = 1; private camps: { x: number; z: number; r: number; type: MobType }[] = [];
  private lootFields: { x: number; z: number; t: number; mesh: THREE.Group }[] = [];

  // combate
  private target: MobEnt | PlayerEnt | null = null;
  private cds: number[] = [0, 0, 0, 0, 0, 0];
  private atkT = 0; private atkDur = 0.9; private comboN = 0; private comboT = 0;
  private animPhase = 0;
  private skillRanks: number[] = [1, 1, 1, 1, 1, 1];
  private hotbar: (number | null)[] = [0, 1, 2, 3, 4, 5];

  // mundo vivo
  private timeOfDay = 8; private dayT = 0; private weather = "limpo"; private weatherT = 60;
  private worldBossT: number[] = [180, 320]; private villainT = 150;
  private villain: MobEnt | null = null; private worldBosses: (MobEnt | null)[] = [null, null];
  private dungeon: { def: any; wave: number; state: string; t: number } | null = null;
  private unlocked = new Set<string>();
  private eventT = 90;
  private sun!: THREE.DirectionalLight; private hemi!: THREE.HemisphereLight;
  private moonMesh!: THREE.Mesh; private sunMesh!: THREE.Mesh; private starPts!: THREE.Points;
  private rainPts: THREE.Points | null = null;

  // câmara/input
  private keys = new Set<string>();
  private moveVec = { x: 0, y: 0 }; // joystick
  private dragging = false; private lastPX = 0; private lastPY = 0;
  private camMode: "3p" | "1p" = "3p";
  private quality = 1; private fpsAcc = 0; private fpsN = 0; private lowFpsT = 0;
  private particleBudget = 1;

  // multiplayer
  private chan: any = null; private presence: any = null; private syncT = 0;
  private isMobile = false;
  private mountedMesh: THREE.Group | null = null;
  private mountId: string | null = null;
  private guardLasers: { mesh: THREE.Mesh; t: number; target: MobEnt | PlayerEnt }[] = [];

  constructor(container: HTMLElement, opts: EngineOpts) {
    this.container = container;
    this.opts = opts;
    this.onEvent = opts.onEvent;
    this.state.level = opts.level;
    this.isMobile = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) || window.innerWidth < 820;

    this.renderer = new THREE.WebGLRenderer({ antialias: !this.isMobile, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = !this.isMobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    container.appendChild(this.renderer.domElement);

    this.cam = new THREE.PerspectiveCamera(58, container.clientWidth / container.clientHeight, 0.1, 900);
    this.scene.background = new THREE.Color(0x87ceeb);

    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.95);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d9, 1.5);
    this.sun.position.set(60, 120, 40);
    if (!this.isMobile) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
      sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.far = 400;
    }
    this.scene.add(this.sun);

    this.buildSky();
    this.buildTerrain();
    this.buildVegetation();
    this.buildVila();
    this.buildFortezaes();
    this.buildTowers();
    this.buildNodes();
    this.buildExploration();
    this.buildPlayer();
    this.spawnCamps();
    this.spawnRegionBosses();
    this.initNet();
    this.bindInput();

    window.addEventListener("resize", this.onResize);
    this.emit("boot", { version: "18", world: "Era das Lendas" });
    this.loop();
  }

  private emit(type: string, data: any = {}) { this.onEvent({ type, ...data }); }

  // ── CÉU (REA Genshin: identidade visual por bioma) ────────
  private skyDome!: THREE.Mesh; private cloudGrp!: THREE.Group;
  private ambientPts!: THREE.Points; private ambientVel!: Float32Array;
  private waterShimmer: THREE.Mesh | null = null;

  private buildSky() {
    // DOME com gradiente vertical (zénite → horizonte) — muito mais rico
    // que a cor chapada anterior; segue o jogador.
    const domeGeo = new THREE.SphereGeometry(760, 24, 14);
    const dpos = domeGeo.attributes.position;
    const dcol = new Float32Array(dpos.count * 3);
    const top = new THREE.Color(0x2f6fd0), mid = new THREE.Color(0x8fc7ee), bot = new THREE.Color(0xdceefb);
    const tmp = new THREE.Color();
    for (let i = 0; i < dpos.count; i++) {
      const y = dpos.getY(i) / 760;
      if (y > 0.12) tmp.copy(mid).lerp(top, Math.min(1, (y - 0.12) / 0.75));
      else tmp.copy(bot).lerp(mid, Math.max(0, (y + 0.25) / 0.37));
      dcol[i * 3] = tmp.r; dcol[i * 3 + 1] = tmp.g; dcol[i * 3 + 2] = tmp.b;
    }
    domeGeo.setAttribute("color", new THREE.BufferAttribute(dcol, 3));
    const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.renderOrder = -10;
    this.scene.add(dome); this.skyDome = dome;

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(14, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
    );
    sunMesh.position.set(180, 220, 120);
    this.scene.add(sunMesh); this.sunMesh = sunMesh;

    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(9, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xdfe7ff })
    );
    moonMesh.position.set(-200, 160, -140);
    this.scene.add(moonMesh); this.moonMesh = moonMesh;

    // estrelas
    const sg = new THREE.BufferGeometry();
    const n = 700; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rnd(700, -700); pos[i * 3 + 1] = rnd(500, 180); pos[i * 3 + 2] = rnd(700, -700);
    }
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0 }));
    this.scene.add(stars); this.starPts = stars;

    // NUVENS: puff achatados a derivar (profundidade sem custo de pós-processamento)
    const clouds = new THREE.Group();
    const cmat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
    for (let i = 0; i < 22; i++) {
      const puff = new THREE.Group();
      const parts = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < parts; j++) {
        const s = rnd(16, 7);
        const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), cmat);
        m.scale.y = 0.45;
        m.position.set(j * rnd(9, 4) - 6, rnd(2.5, 0), rnd(4, -4));
        puff.add(m);
      }
      puff.position.set(rnd(680, -680), rnd(150, 105), rnd(680, -680));
      (puff as any).__spd = rnd(2.2, 0.7);
      clouds.add(puff);
    }
    this.scene.add(clouds); this.cloudGrp = clouds;

    // PARTÍCULAS AMBIENTES (pólen/vagalumes/areia/neve/brasas) —
    // um único sistema Points que muda de cor/comportamento por bioma
    const an = this.isMobile ? 160 : 300;
    const ag = new THREE.BufferGeometry();
    const apos = new Float32Array(an * 3);
    for (let i = 0; i < an; i++) {
      apos[i * 3] = rnd(45, -45); apos[i * 3 + 1] = rnd(14, 0.5); apos[i * 3 + 2] = rnd(45, -45);
    }
    ag.setAttribute("position", new THREE.BufferAttribute(apos, 3));
    const amb = new THREE.Points(ag, new THREE.PointsMaterial({
      color: 0xfff3b0, size: 0.5, transparent: true, opacity: 0.75, depthWrite: false,
    }));
    this.scene.add(amb); this.ambientPts = amb;
    this.ambientVel = new Float32Array(an * 3);
    for (let i = 0; i < an; i++) {
      this.ambientVel[i * 3] = rnd(0.6, -0.6);
      this.ambientVel[i * 3 + 1] = rnd(0.45, 0.05);
      this.ambientVel[i * 3 + 2] = rnd(0.6, -0.6);
    }
  }

  // ── TERRENO ───────────────────────────────────────────────
  private terrainHeight(x: number, z: number): number {
    let h = vnoise(x * 0.012, z * 0.012) * 9 + vnoise(x * 0.035, z * 0.035) * 3.2;
    const r = Math.sqrt(x * x + z * z);
    h *= clamp(r / 60, 0.25, 1); // vila plana
    for (const reg of REGIONS) {
      const d = Math.sqrt(dist2(x, z, reg.cx, reg.cz));
      if (d < reg.r * 1.15) {
        let bias = 0;
        if (reg.id === "dunas") bias = 5 + Math.sin(x * 0.08) * 2.5;
        else if (reg.id === "vulcao") bias = 10 * (1 - d / (reg.r * 1.3)) + vnoise(x * 0.02, z * 0.02) * 6;
        else if (reg.id === "tundra") bias = 4;
        else if (reg.id === "pantano") bias = -3.5;
        else if (reg.id === "titas") bias = 8 * (1 - d / (reg.r * 1.4));
        else if (reg.id === "escuro") bias = 6;
        else if (reg.id === "floresta") bias = 3;
        h += bias * (1 - d / (reg.r * 1.35));
      }
    }
    if (r < 75) h = Math.min(h, 1.2); // hubs planos
    return Math.max(h, -1.6);
  }

  private regionAt(x: number, z: number): typeof REGIONS[0] {
    let best = REGIONS[3]; let bd = Infinity;
    for (const reg of REGIONS) {
      const d = dist2(x, z, reg.cx, reg.cz);
      if (d < reg.r * reg.r && d < bd) { bd = d; best = reg; }
    }
    return best;
  }

  private buildTerrain() {
    const size = 820, seg = this.isMobile ? 120 : 170;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = this.terrainHeight(x, z);
      pos.setY(i, h);
      const reg = this.regionAt(x, z);
      // cor base do bioma + variação por altura
      c.set(reg.color);
      if (h < 0.4) c.set(0xc2b280);        // margem
      if (h < -0.9) c.set(0x3b6ea5);        // fundo
      const v = 0.9 + hash2(Math.floor(x * 3), Math.floor(z * 3)) * 0.2;
      c.multiplyScalar(v);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // água
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(430, 40).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x2f7fd0, transparent: true, opacity: 0.72 })
    );
    water.position.y = -0.55;
    this.scene.add(water);
    // brilho de superfície (ondas baratas: anel oposto a rodar devagar)
    const shimmer = new THREE.Mesh(
      new THREE.RingGeometry(30, 428, 42).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.16, depthWrite: false })
    );
    shimmer.position.y = -0.5;
    this.scene.add(shimmer);
    this.waterShimmer = shimmer;
  }

  // ── VEGETAÇÃO instanciada ─────────────────────────────────
  private buildVegetation() {
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, arr: [number, number, number, number][]) => {
      const m = new THREE.InstancedMesh(geo, mat, arr.length);
      const d = new THREE.Object3D();
      arr.forEach(([x, z, s, rot], i) => {
        const y = this.terrainHeight(x, z);
        d.position.set(x, y, z); d.scale.setScalar(s); d.rotation.y = rot;
        d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      });
      m.castShadow = !this.isMobile; m.receiveShadow = !this.isMobile;
      this.scene.add(m); return m;
    };

    const scatter = (n: number, cx: number, cz: number, r: number): [number, number, number, number][] => {
      const out: [number, number, number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = rnd(Math.PI * 2), d = Math.sqrt(rnd(1)) * r;
        out.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d, rnd(1.5, 0.7), rnd(Math.PI * 2)]);
      }
      return out;
    };

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
    const leafMats = [0x2e7d32, 0x388e3c, 0x43a047, 0x1b5e20].map(c => new THREE.MeshLambertMaterial({ color: c }));
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x8d8d8d });
    const dryMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
    const iceMat = new THREE.MeshLambertMaterial({ color: 0xbfe8ff });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x312e81 });

    const treeGeo = new THREE.ConeGeometry(2.2, 6.5, 7);
    const blobGeo = new THREE.IcosahedronGeometry(2.6, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.42, 0.6, 4.4, 6);
    const rockGeo = new THREE.DodecahedronGeometry(1.4, 0);
    const cactusGeo = new THREE.CylinderGeometry(0.5, 0.62, 4.2, 7);
    const shroomGeo = new THREE.SphereGeometry(0.9, 8, 6);
    const spikeGeo = new THREE.ConeGeometry(0.5, 3.4, 5);

    const R = (id: string) => REGIONS.find(r => r.id === id)!;
    // floresta densa
    const fTrees = scatter(this.isMobile ? 160 : 300, R("floresta").cx, R("floresta").cz, R("floresta").r);
    inst(trunkGeo, trunkMat, fTrees);
    inst(blobGeo, leafMats[0], fTrees.map(([x, z, s, r]) => [x, z, s * 1.1, r] as [number, number, number, number]));
    // planície esparsa
    const pTrees = scatter(this.isMobile ? 60 : 120, R("planicie").cx, R("planicie").cz, R("planicie").r);
    inst(trunkGeo, trunkMat, pTrees); inst(blobGeo, leafMats[2], pTrees.map(([x, z, s, r]) => [x, z, s, r] as [number, number, number, number]));
    // dunas: cactos
    const cact = scatter(this.isMobile ? 40 : 80, R("dunas").cx, R("dunas").cz, R("dunas").r);
    inst(cactusGeo, dryMat, cact);
    // tundra: pinheiros gelados
    const tTrees = scatter(this.isMobile ? 70 : 130, R("tundra").cx, R("tundra").cz, R("tundra").r);
    inst(treeGeo, iceMat, tTrees);
    // vulcão: rochas + espinhos
    const vRocks = scatter(this.isMobile ? 60 : 110, R("vulcao").cx, R("vulcao").cz, R("vulcao").r);
    inst(rockGeo, new THREE.MeshLambertMaterial({ color: 0x450a0a }), vRocks);
    inst(spikeGeo, dryMat, vRocks.slice(0, 40).map(([x, z, s, r]) => [x + 2, z + 1, s, r] as [number, number, number, number]));
    // pântano: cogumelos
    const shrooms = scatter(this.isMobile ? 50 : 90, R("pantano").cx, R("pantano").cz, R("pantano").r);
    inst(shroomGeo, new THREE.MeshLambertMaterial({ color: 0x84cc16, emissive: 0x1a2e05 }), shrooms);
    // titas + escuro
    const xRocks = scatter(this.isMobile ? 50 : 90, R("titas").cx, R("titas").cz, R("titas").r);
    inst(rockGeo, new THREE.MeshLambertMaterial({ color: 0x78716c }), xRocks);
    const eTrees = scatter(this.isMobile ? 60 : 110, R("escuro").cx, R("escuro").cz, R("escuro").r);
    inst(treeGeo, darkMat, eTrees);

    // pedras gerais
    const rocks = scatter(this.isMobile ? 70 : 130, 0, 0, 400);
    inst(rockGeo, rockMat, rocks);
  }

  // ── NÓS DE RECOLHA ────────────────────────────────────────
  private buildNodes() {
    const mk = (kind: NodeEnt["kind"], x: number, z: number) => {
      const g = new THREE.Group();
      const y = this.terrainHeight(x, z);
      if (kind === "erva") {
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 5), new THREE.MeshLambertMaterial({ color: 0x4ade80 }));
        b.position.y = 0.6; g.add(b);
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
        f.position.y = 1.35; g.add(f);
      } else if (kind === "minerio") {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), new THREE.MeshLambertMaterial({ color: 0x57534e }));
        r.position.y = 0.5; g.add(r);
        const o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), new THREE.MeshLambertMaterial({ color: 0xf59e0b, emissive: 0x451a03 }));
        o.position.set(0.3, 0.8, 0.2); g.add(o);
      } else {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), new THREE.MeshLambertMaterial({ color: 0x22d3ee, emissive: 0x0e7490, transparent: true, opacity: 0.92 }));
        c.position.y = 0.9; g.add(c);
      }
      g.position.set(x, y, z);
      this.scene.add(g);
      this.nodes.push({ group: g, kind, x, z, active: true, respawnT: 0 });
    };
    const spots: NodeEnt["kind"][] = [];
    for (let i = 0; i < 46; i++) spots.push(i % 3 === 0 ? "cristal" : i % 3 === 1 ? "erva" : "minerio");
    spots.forEach((kind, i) => {
      const reg = REGIONS[3 + (i % 7)];
      const a = rnd(Math.PI * 2), d = rnd(reg.r * 0.8);
      const x = reg.cx + Math.cos(a) * d, z = reg.cz + Math.sin(a) * d;
      if (Math.abs(x) < 55 && Math.abs(z) < 55) return; // fora da vila
      mk(kind, x, z);
    });
  }

  // ── VILA DOURADA (hub neutro) ─────────────────────────────
  private building(x: number, z: number, w: number, h: number, d: number, color: number, roofColor?: number): THREE.Group {
    const g = new THREE.Group();
    const y = this.terrainHeight(x, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    body.position.y = h / 2; body.castShadow = !this.isMobile; g.add(body);
    if (roofColor) {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.7, 4), new THREE.MeshLambertMaterial({ color: roofColor }));
      roof.position.y = h + h * 0.34; roof.rotation.y = Math.PI / 4; g.add(roof);
    }
    g.position.set(x, y, z);
    this.scene.add(g);
    return g;
  }

  private buildVila() {
    const B = (x: number, z: number, w: number, h: number, d: number, c: number, r?: number) => this.building(x, z, w, h, d, c, r);
    B(-12, -8, 7, 4.4, 6, 0xd4a017, 0x8b4513);            // Banco
    B(14, -6, 8, 4, 6, 0xb45309, 0x78350f);               // Casa de Leilões
    B(-30, 12, 5, 2.6, 3, 0xf59e0b);                       // Feira (barracas)
    B(30, 14, 5.4, 4, 5, 0xdc2626, 0x7f1d1d);              // Loja
    B(-6, 22, 4.6, 3, 4, 0x0ea5e9, 0x0c4a6e);              // Montarias
    B(38, 8, 4.4, 2.8, 4, 0x16a34a); B(44, 18, 4.4, 2.8, 4, 0x7c3aed); B(34, 22, 4.4, 2.8, 4, 0xdb2777); // tendas
    B(-14, 8, 3.4, 6.5, 3.4, 0xa8a29e);                    // estátua herói

    // obelisco
    const ob = new THREE.Mesh(new THREE.ConeGeometry(1.1, 9, 4), new THREE.MeshLambertMaterial({ color: 0xe5e7eb }));
    ob.position.set(8, this.terrainHeight(8, -20) + 4.5, -20); this.scene.add(ob);
    // sino
    const sino = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 2, 8), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
    sino.position.set(-20, this.terrainHeight(-20, -18) + 3, -18); this.scene.add(sino);
    // fonte
    const font = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 0.8, 12), new THREE.MeshLambertMaterial({ color: 0x93c5fd }));
    font.position.set(22, this.terrainHeight(22, -14) + 0.4, -14); this.scene.add(font);

    // arena (anel de duelos)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.5, 8, 40).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
    ring.position.set(0, this.terrainHeight(0, 46) + 0.6, 46); this.scene.add(ring);

    // portais das facções
    const portal = (x: number, z: number, color: number) => {
      const p = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.5, 8, 24), new THREE.MeshBasicMaterial({ color }));
      p.position.set(x, this.terrainHeight(x, z) + 3, z); this.scene.add(p);
    };
    portal(-60, -40, 0x3b82f6); portal(60, 40, 0xf59e0b);

    // lote de residências (marco)
    const lote = new THREE.Mesh(new THREE.TorusGeometry(18, 0.35, 6, 40).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xfcd34d }));
    lote.position.set(70, this.terrainHeight(70, -30) + 0.4, -30); this.scene.add(lote);
  }

  private buildFortezaes() {
    for (const reg of [REGIONS[1], REGIONS[2]]) {
      const color = reg.id === "fortaleza" ? 0x3b82f6 : 0xf59e0b;
      this.building(reg.cx - 14, reg.cz - 10, 10, 8, 9, color, 0x1e3a8a);
      this.building(reg.cx + 12, reg.cz + 8, 7, 5, 7, 0x94a3b8, color);
      // muralhas
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const wx = reg.cx + Math.cos(a) * 34, wz = reg.cz + Math.sin(a) * 34;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 1.6), new THREE.MeshLambertMaterial({ color: 0x64748b }));
        wall.position.set(wx, this.terrainHeight(wx, wz) + 2.5, wz);
        wall.rotation.y = -a; wall.castShadow = !this.isMobile;
        this.scene.add(wall);
      }
      // bandeirão
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      flag.position.set(reg.cx, this.terrainHeight(reg.cx, reg.cz) + 12, reg.cz);
      this.scene.add(flag);
    }
  }

  // ── TORRES DE DOMÍNIO ─────────────────────────────────────
  private buildTowers() {
    for (const t of TOWERS) {
      const g = new THREE.Group();
      const y = this.terrainHeight(t.x, t.z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 12, 8), new THREE.MeshLambertMaterial({ color: 0x64748b }));
      base.position.y = 6; base.castShadow = !this.isMobile; g.add(base);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(4, 3.4, 8), new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x713f12 }));
      crown.position.y = 13.6; g.add(crown);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(8, 0.3, 6, 36).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      ring.position.y = 0.4; g.add(ring);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ color: 0x9ca3af, side: THREE.DoubleSide }));
      flag.position.y = 16; g.add(flag);
      g.position.set(t.x, y, t.z);
      this.scene.add(g);
      this.towers.push({ id: t.id, name: t.name, x: t.x, z: t.z, emoji: t.emoji, group: g, owner: -1, prog: 0, flagMesh: flag });
    }
  }

  // ── JOGADOR ───────────────────────────────────────────────
  private buildPlayer() {
    const cls = CLASSES[this.opts.classId] || CLASSES[0];
    this.player = buildAvatar(this.opts.avatar || defaultAvatar(this.opts.classId), {
      classColor: cls.hex, withWeapon: true, classId: this.opts.classId,
    });
    this.pGroup.add(this.player.root);
    this.pGroup.position.set(this.px, this.terrainHeight(this.px, this.pz), this.pz);
    this.scene.add(this.pGroup);

    // aura de facção
    const fc = FACTIONS[this.opts.faction] || FACTIONS[0];
    const aura = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.09, 6, 24).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: fc.hex, transparent: true, opacity: 0.85 })
    );
    aura.position.y = 0.12;
    this.pGroup.add(aura);
    this.state.maxHp = this.opts.stats.maxHp;
    this.state.maxMp = this.opts.stats.maxMp;
    this.hp = this.state.maxHp; this.mp = this.state.maxMp;
    this.state.hp = this.hp; this.state.mp = this.mp;

    // nome flutuante
    this.makeNameTag(this.pGroup, `${this.opts.name}`, cls.color, fc.color, true);
  }

  private makeNameTag(group: THREE.Group, text: string, color: string, factionColor: string, isPlayer = false) {
    const cnv = document.createElement("canvas");
    cnv.width = 256; cnv.height = 72;
    const ctx = cnv.getContext("2d")!;
    ctx.font = `bold ${isPlayer ? 34 : 28}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillStyle = factionColor;
    ctx.fillRect(48, 0, 160, 6);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 5;
    ctx.strokeText(text, 128, 46); ctx.fillText(text, 128, 46);
    const tex = new THREE.CanvasTexture(cnv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(isPlayer ? 4.4 : 3.6, isPlayer ? 1.25 : 1.02, 1);
    sp.position.y = isPlayer ? 3.4 : 2.6;
    group.add(sp);
    return sp;
  }

  // ── CAMPOS DE MOBS (matilhas por região) ──────────────────
  private spawnCamps() {
    for (const t of MOB_TYPES) {
      const reg = REGIONS.find(r => r.id === t.region);
      if (!reg) continue;
      const nCamps = MOB_TYPES.length > 30 ? 1 : (t.pack >= 2 ? 2 : 1);
      for (let c = 0; c < nCamps; c++) {
        const a = rnd(Math.PI * 2) + c * Math.PI, d = rnd(reg.r * 0.7, reg.r * 0.2);
        const cx = reg.cx + Math.cos(a) * d, cz = reg.cz + Math.sin(a) * d;
        if (Math.sqrt(cx * cx + cz * cz) < 80) continue; // não na vila
        this.camps.push({ x: cx, z: cz, r: 16, type: t });
      }
    }
    for (const camp of this.camps) {
      const n = camp.type.pack + rndi(3, 0);
      for (let i = 0; i < n; i++) {
        const a = rnd(Math.PI * 2), d = rnd(camp.r);
        this.spawnMob(camp.type, camp.x + Math.cos(a) * d, camp.z + Math.sin(a) * d, this.camps.indexOf(camp));
      }
    }
    this.emit("world", { mobs: this.mobs.length, camps: this.camps.length });
  }

  private spawnRegionBosses() {
    for (const b of REGION_BOSSES) {
      const t = MOB_TYPES.find(m => m.tier === b.tier) || MOB_TYPES[0];
      const m = this.spawnMob(t, b.x, b.z, -1, { isBoss: true, name: b.name, mech: b.mech });
      m.isGuard = false;
    }
  }

  private mobMesh(t: MobType, isBoss: boolean, isElite: boolean): { group: THREE.Group; body: THREE.Mesh } {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: t.color, emissive: isBoss ? 0x450a0a : 0x000000 });
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
    body.castShadow = !this.isMobile;
    body.scale.set(1, 0.85, 1.15);
    g.add(body);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    for (const sx of [-0.3, 0.3]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), eyeMat);
      eye.position.set(sx, 0.25, 0.95);
      g.add(eye);
    }
    const f = t.feature;
    if (f === "horns") {
      for (const sx of [-0.4, 0.4]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 5), mat);
        horn.position.set(sx, 0.95, 0); horn.rotation.z = sx > 0 ? -0.4 : 0.4;
        g.add(horn);
      }
    } else if (f === "spikes") {
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 5), mat);
        sp.position.set(rnd(0.5, -0.5), 0.75, rnd(0.5, -0.5));
        g.add(sp);
      }
    } else if (f === "wings") {
      for (const sx of [-0.9, 0.9]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshLambertMaterial({ color: t.color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
        w.position.set(sx, 0.5, -0.2); w.rotation.z = sx > 0 ? 0.5 : -0.5;
        g.add(w);
      }
    } else if (f === "tusks") {
      for (const sx of [-0.35, 0.35]) {
        const tk = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 5), new THREE.MeshLambertMaterial({ color: 0xfff7ed }));
        tk.position.set(sx, -0.05, 1.0); tk.rotation.x = 1.2;
        g.add(tk);
      }
    } else if (f === "ears") {
      for (const sx of [-0.38, 0.38]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 5), mat);
        ear.position.set(sx, 0.85, 0);
        g.add(ear);
      }
    }
    if (isBoss) {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.3, 8), new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x713f12 }));
      crown.position.y = 1.2; g.add(crown);
      const aura = new THREE.PointLight(0xff2222, 14, 22);
      aura.position.y = 1.6; g.add(aura);
    } else if (isElite) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
      star.position.y = 1.25; g.add(star);
    }
    return { group: g, body };
  }

  private spawnMob(
    t: MobType, x: number, z: number, campId: number,
    extra: { isBoss?: boolean; name?: string; mech?: string; isElite?: boolean; isWorld?: boolean; isVillain?: boolean; wave?: number; lvlOverride?: number } = {}
  ): MobEnt {
    const isBoss = !!extra.isBoss, isElite = !!extra.isElite, isWorld = !!extra.isWorld, isVillain = !!extra.isVillain;
    const lvl = extra.lvlOverride ?? mobLevelForTier(t.tier);
    const hpMult = (isBoss ? 9 : isWorld ? 26 : isVillain ? 20 : isElite ? 3 : 1) * (1 + lvl * 0.06);
    const scale = (isBoss ? 2.3 : isWorld ? 3.2 : isVillain ? 2.6 : isElite ? t.scale * 1.3 : t.scale);
    const { group, body } = this.mobMesh(t, isBoss || isWorld || isVillain, isElite);
    group.scale.setScalar(scale);
    const y = this.terrainHeight(x, z);
    group.position.set(x, y, z);
    this.scene.add(group);
    const name = extra.name || (isWorld ? t.name : isVillain ? extra.name || t.name : isElite ? `Elite ${t.name}` : t.name);
    const tag = this.makeNameTag(group, `${isBoss || isWorld || isVillain ? "☠ " : isElite ? "★ " : ""}${name} Nv${lvl}`, isBoss || isWorld || isVillain ? "#f87171" : isElite ? "#fbbf24" : "#fdba74", "#00000000");
    const m: MobEnt = {
      id: this.mobId++, group, body, type: t, lvl,
      hp: Math.round(t.hp * hpMult), maxHp: Math.round(t.hp * hpMult),
      x, z, hx: x, hz: z, state: "idle", aggroT: 0, atkT: 0, roamT: rnd(3),
      tx: x, tz: z, isBoss, isElite, isWorld, isVillain, isGuard: false,
      name, mech: extra.mech, mechT: 0, enraged: false, scale, deadT: 0,
      floatY: y, bob: rnd(Math.PI * 2), slowT: 0, stunT: 0, poisonT: 0, poisonDmg: 0,
      burnT: 0, respawnT: 0, campId, wave: extra.wave,
    };
    this.mobs.push(m);
    return m;
  }

  // ── IA DOS MOBS ───────────────────────────────────────────
  private updateMobs(dt: number) {
    const pScale = 1 + (this.opts.level - 1) * 0.05;
    for (const m of this.mobs) {
      if (m.state === "dead") {
        m.deadT -= dt;
        if (m.deadT <= 0) {
          if (m.isWorld || m.isVillain || m.isBoss) {
            // chefes reencarnam com timer; o grupo fica escondido
            m.group.visible = false;
            if (m.isWorld || m.isVillain) {
              m.respawnT = m.isVillain ? 240 : 300;
            } else {
              m.respawnT = 90; m.group.visible = true; m.hp = m.maxHp;
              m.x = m.hx; m.z = m.hz; m.group.position.set(m.x, this.terrainHeight(m.x, m.z), m.z);
              m.state = "idle";
            }
          } else {
            m.respawnT = 24; m.group.visible = false;
          }
        }
        if (m.respawnT > 0) {
          m.respawnT -= dt;
          if (m.respawnT <= 0) {
            m.hp = m.maxHp; m.state = "idle";
            m.x = m.hx; m.z = m.hz; m.group.visible = true;
            m.group.position.set(m.x, this.terrainHeight(m.x, m.z), m.z);
          }
        }
        continue;
      }

      // status
      if (m.slowT > 0) m.slowT -= dt;
      if (m.stunT > 0) m.stunT -= dt;
      if (m.poisonT > 0) {
        m.poisonT -= dt;
        this.damageMob(m, m.poisonDmg * dt, false, "veneno");
      }
      if (m.burnT > 0) { m.burnT -= dt; this.damageMob(m, m.maxHp * 0.01 * dt, false, "fogo"); }

      const pd = Math.sqrt(dist2(m.x, m.z, this.px, this.pz));
      const aggroR = m.isBoss || m.isWorld || m.isVillain ? 26 : m.type.aggro;

      // MATILHA: chama aliados próximos
      if (pd < aggroR && !this.dead && m.state === "idle") {
        m.state = "chase";
        for (const o of this.mobs) {
          if (o !== m && o.state === "idle" && o.campId === m.campId && o.campId >= 0 &&
              dist2(o.x, o.z, m.x, m.z) < 400) {
            o.state = "chase";
          }
        }
      }
      if (m.stunT > 0) continue;

      const spd = m.type.speed * (m.slowT > 0 ? 0.45 : 1) * (m.enraged ? 1.5 : 1);
      const stopR = m.isBoss || m.isWorld || m.isVillain ? 4.5 * m.scale * 0.5 + 1.2 : 2.2;

      if (m.state === "chase") {
        if (pd > 55 || this.dead) { m.state = "return"; }
        else if (pd > stopR) {
          const dx = (this.px - m.x) / pd, dz = (this.pz - m.z) / pd;
          m.x += dx * spd * dt; m.z += dz * spd * dt;
        } else {
          m.state = "attack";
        }
      } else if (m.state === "attack") {
        if (pd > stopR + 1.5 || this.dead) { m.state = pd > aggroR * 2.4 ? "return" : "chase"; }
        m.atkT -= dt;
        if (m.atkT <= 0 && pd < stopR + 2.2 && !this.dead) {
          m.atkT = m.isBoss ? 1.6 : 2.1;
          this.mobHitPlayer(m);
        }
        // mecânicas de chefe
        if ((m.isBoss || m.isWorld || m.isVillain) && m.mech) {
          m.mechT -= dt;
          if (m.mechT <= 0) {
            m.mechT = m.enraged ? 7 : 11;
            this.bossMechanic(m);
          }
        }
      } else if (m.state === "return") {
        const hd = Math.sqrt(dist2(m.x, m.z, m.hx, m.hz));
        if (hd < 1) { m.state = "idle"; m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.3); }
        else {
          const dx = (m.hx - m.x) / hd, dz = (m.hz - m.z) / hd;
          m.x += dx * spd * 1.4 * dt; m.z += dz * spd * 1.4 * dt;
          if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.08 * dt);
        }
      } else { // idle — patrulha curta
        m.roamT -= dt;
        if (m.roamT <= 0) {
          m.roamT = rnd(5, 2);
          const a = rnd(Math.PI * 2), d = rnd(6);
          m.tx = m.hx + Math.cos(a) * d; m.tz = m.hz + Math.sin(a) * d;
        }
        const td = Math.sqrt(dist2(m.x, m.z, m.tx, m.tz));
        if (td > 0.5) {
          const dx = (m.tx - m.x) / td, dz = (m.tz - m.z) / td;
          m.x += dx * spd * 0.45 * dt; m.z += dz * spd * 0.45 * dt;
        }
      }

      // visual
      const y = this.terrainHeight(m.x, m.z);
      m.bob += dt * 6;
      const fly = m.type.feature === "wings" ? 1.2 + Math.sin(m.bob * 0.8) * 0.4 : 0;
      m.group.position.set(m.x, y + fly, m.z);
      m.group.rotation.y = Math.atan2(this.px - m.x, this.pz - m.z);
      if (m.hp <= 0) this.killMob(m, true);
    }
  }

  // ── MECÂNICAS DE CHEFE ────────────────────────────────────
  private bossMechanic(m: MobEnt) {
    worldAudio.play("boss");
    if (m.mech === "slam") {
      // telegraph circle 1.2s → dano em área
      this.spawnTelegraph(this.px, this.pz, 7, 1.2, m.type.atk * 2.2 * (1 + m.lvl * 0.05), "slam");
    } else if (m.mech === "nova") {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.spawnProj(m.x, 1.6, m.z, Math.cos(a), Math.sin(a), {
          speed: 9, life: 4, dmg: m.type.atk * 1.4 * (1 + m.lvl * 0.04), from: "mob",
          color: m.type.color, radius: 0.9,
        });
      }
    } else if (m.mech === "summon") {
      const adds = Math.min(3, this.mobs.filter(x => x.wave === m.id).length);
      for (let i = 0; i < Math.max(1, 2 - adds); i++) {
        const a = rnd(Math.PI * 2);
        const minion = this.spawnMob(m.type, m.x + Math.cos(a) * 4, m.z + Math.sin(a) * 4, -1, { wave: m.id });
        minion.state = "chase";
      }
      this.emit("announce", { text: `${m.name} invoca aliados!`, emoji: "👾" });
    } else if (m.mech === "enrage" && !m.enraged && m.hp < m.maxHp * 0.35) {
      m.enraged = true;
      this.emit("announce", { text: `${m.name} entrou em FÚRIA!`, emoji: "😤" });
    }
  }

  private spawnTelegraph(x: number, z: number, r: number, dur: number, dmg: number, kind: string) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.35 })
    );
    mesh.position.set(x, this.terrainHeight(x, z) + 0.15, z);
    this.scene.add(mesh);
    this.teles.push({ mesh, t: 0, dur, dmg, r, x, z, kind });
  }

  // ── COMBATE DO JOGADOR ────────────────────────────────────
  private tryAutoAttack() {
    if (this.dead || this.atkT > 0) return;
    const cls = CLASSES[this.opts.classId];
    const t = this.target as MobEnt;
    if (!t || t.state === "dead") {
      // auto-alvo: mob mais próximo em combate
      let best: MobEnt | null = null; let bd = cls.id === 2 ? 20 : 7;
      for (const m of this.mobs) {
        if (m.state === "dead" || m.group.visible === false) continue;
        const d = Math.sqrt(dist2(m.x, m.z, this.px, this.pz));
        if (d < bd) { bd = d; best = m; }
      }
      if (!best) return;
      this.target = best;
    }
    const tg = this.target as MobEnt;
    const d = Math.sqrt(dist2(tg.x, tg.z, this.px, this.pz));
    const ranged = cls.id === 1 || cls.id === 2;
    if (d > (ranged ? 22 : 3.6)) return;
    this.atkT = this.atkDur = cls.id === 2 ? 0.75 : 0.95;
    this.pYaw = Math.atan2(tg.x - this.px, tg.z - this.pz);
    worldAudio.play("swing");
    const dmg = this.calcPlayerDamage(1.0);
    if (ranged) {
      this.spawnProj(this.px, 1.6, this.pz, Math.sin(this.pYaw), Math.cos(this.pYaw), {
        speed: 30, life: 1.2, dmg, from: "player", target: tg, color: cls.hex, radius: 0.4,
      });
    } else {
      this.damageMob(tg, dmg, true, "golpe");
      this.spawnHitFx(tg.x, this.terrainHeight(tg.x, tg.z) + 1.2, tg.z, cls.hex);
    }
  }

  private calcPlayerDamage(mult: number): number {
    const st = this.opts.stats;
    let atk = st.atk * mult;
    const buff = (id: string) => this.state.buffs.find(b => b.id === id);
    if (buff("guerra")) atk *= 1.35;
    if (buff("furiatotal")) atk *= 1.7;
    if (buff("forcapocao")) atk *= 1.4;
    if (buff("avatar")) atk *= 1.45;
    if (buff("estrelas")) atk *= 1.0;
    const crit = Math.random() * 100 < st.crit + (buff("falcao") ? 40 : 0);
    if (crit) atk *= 1.85;
    return Math.max(1, Math.round(atk * rnd(1.12, 0.9)));
  }

  private castSkill(slot: number) {
    if (this.dead || this.dungeonWavePause()) return;
    if (this.cds[slot] > 0) { worldAudio.play("deny"); return; }
    const classSkills = SKILLS[this.opts.classId];
    const si = this.hotbar[slot];
    if (si == null) return;
    const sk: SkillDef = classSkills[si];
    if (this.opts.level < sk.unlock) { worldAudio.play("deny"); return; }
    const rank = this.skillRanks[slot] || 1;
    const dmgMult = sk.dmg * (1 + (rank - 1) * 0.18);
    if (this.mp < sk.mana) { worldAudio.play("deny"); this.emit("mp-fail", {}); return; }
    this.mp -= sk.mana;
    this.cds[slot] = sk.cd * (this.state.buffs.find(b => b.id === "sintonia") ? 0.7 : 1);
    worldAudio.play("skill");
    this.emit("cast", { slot, skill: sk.id, name: sk.name });

    const cls = CLASSES[this.opts.classId];
    const fx = (x: number, z: number, color: number, r = 1.2) => this.spawnHitFx(x, this.terrainHeight(x, z) + 1, z, color, r);

    switch (sk.kind) {
      case "golpe": {
        const tg = this.nearestMob(sk.range || 3.5);
        if (tg) {
          this.damageMob(tg, this.calcPlayerDamage(dmgMult), true, sk.name);
          fx(tg.x, tg.z, cls.hex);
          if (sk.id === "g6") { // empurra
            const d = Math.sqrt(dist2(tg.x, tg.z, this.px, this.pz)) || 1;
            tg.x += (tg.x - this.px) / d * 3; tg.z += (tg.z - this.pz) / d * 3;
          }
        }
        break;
      }
      case "projeto": {
        const tg = this.nearestMob(sk.range || 24);
        const ang = tg ? Math.atan2(tg.x - this.px, tg.z - this.pz) : this.pYaw;
        this.pYaw = ang;
        const n = sk.id === "a2" ? 2 : 1;
        for (let i = 0; i < n; i++) {
          setTimeout(() => {
            if (this.disposed) return;
            this.spawnProj(this.px, 1.6, this.pz, Math.sin(ang), Math.cos(ang), {
              speed: sk.speed || 26, life: (sk.range || 22) / (sk.speed || 26) + 0.2,
              dmg: this.calcPlayerDamage(dmgMult), from: "player", color: parseInt(sk.color.slice(1), 16),
              radius: 0.5, aoe: sk.radius || 0, pierce: sk.id === "a7" || sk.id === "m11",
            });
          }, i * 160);
        }
        break;
      }
      case "area": {
        const r = sk.radius || 5;
        if (sk.id === "g11" || sk.id === "m9" || sk.id === "a9") {
          this.spawnTelegraphFx(this.px, this.pz, r, 0.5, parseInt(sk.color.slice(1), 16));
          setTimeout(() => { if (!this.disposed) this.aoeDamage(this.px, this.pz, r, this.calcPlayerDamage(dmgMult)); }, 500);
        } else {
          this.aoeDamage(this.px, this.pz, r, this.calcPlayerDamage(dmgMult));
        }
        fx(this.px, this.pz, parseInt(sk.color.slice(1), 16), r);
        if (sk.id === "m2") { // gelo abranda
          for (const m of this.mobs) if (m.state !== "dead" && dist2(m.x, m.z, this.px, this.pz) < r * r) m.slowT = 4;
        }
        if (sk.id === "g7") { // atordoa
          for (const m of this.mobs) if (m.state !== "dead" && dist2(m.x, m.z, this.px, this.pz) < r * r) m.stunT = 2.2;
        }
        if (sk.id === "m10") {
          for (const m of this.mobs) if (m.state !== "dead" && dist2(m.x, m.z, this.px, this.pz) < r * r) m.stunT = 3;
        }
        break;
      }
      case "dash": {
        const ang = this.pYaw;
        const dd = Math.min(sk.range || 10, sk.speed || 20) * 0.5;
        this.px = clamp(this.px + Math.sin(ang) * dd, -400, 400);
        this.pz = clamp(this.pz + Math.cos(ang) * dd, -400, 400);
        this.iFrames = 0.45;
        worldAudio.play("mount");
        if (sk.id === "g2") this.aoeDamage(this.px, this.pz, 3.5, this.calcPlayerDamage(dmgMult));
        break;
      }
      case "buff": {
        const dur = 10;
        const map: Record<string, string> = {
          g3: "guerra", g5: "muralha", g8: "sangue", g10: "furiatotal",
          m3: "escudoarcano", m8: "sintonia", a6: "falcao", a10: "marcado",
          x5: "totem", x8: "liga", x9: "avatar",
        };
        const bid = map[sk.id];
        if (bid) {
          this.state.buffs = this.state.buffs.filter(b => b.id !== bid);
          this.state.buffs.push({ id: bid, t: dur });
        }
        if (sk.id === "a10" && this.target) {
          const tg = this.target as MobEnt;
          tg.poisonT = 12; tg.poisonDmg = 0;
          this.emit("announce", { text: `${tg.name} foi MARCADO (+25% dano)`, emoji: "🎯" });
          tg.burnT = 12;
        }
        worldAudio.play("shield");
        break;
      }
      case "cura": {
        const heal = sk.id === "x2" ? this.state.maxHp * 0.22 : this.state.maxHp * 0.3;
        this.hp = Math.min(this.state.maxHp, this.hp + heal);
        worldAudio.play("heal");
        this.emit("heal", { amount: Math.round(heal) });
        fx(this.px, this.pz, 0x4ade80, 2.4);
        break;
      }
    }
  }

  private dungeonWavePause() { return false; }

  private nearestMob(range: number): MobEnt | null {
    let best: MobEnt | null = null; let bd = range * range;
    for (const m of this.mobs) {
      if (m.state === "dead" || !m.group.visible) continue;
      const d = dist2(m.x, m.z, this.px, this.pz);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  private aoeDamage(x: number, z: number, r: number, dmg: number) {
    let hits = 0;
    for (const m of this.mobs) {
      if (m.state === "dead" || !m.group.visible) continue;
      if (dist2(m.x, m.z, x, z) < r * r) {
        this.damageMob(m, dmg, true, "área"); hits++;
      }
    }
    for (const p of this.players.values()) {
      if (p.faction === this.opts.faction) continue;
      if (dist2(p.x, p.z, x, z) < r * r) this.hitPlayerEnt(p, dmg * 0.6);
    }
    return hits;
  }

  private damageMob(m: MobEnt, dmg: number, isHit: boolean, src: string) {
    if (m.state === "dead") return;
    const marked = m.burnT > 0 && m.poisonT > 0 ? 1.25 : 1;
    const final = Math.max(1, Math.round(dmg * marked));
    m.hp -= final;
    if (isHit) {
      this.spawnDmgNumber(m.x, this.terrainHeight(m.x, m.z) + 2, m.z, final, false);
      worldAudio.play("hit");
    }
    // leech
    const st = this.opts.stats;
    if (st.leech > 0 && this.state.buffs.find(b => b.id === "sangue" || b.id === "liga")) {
      this.hp = Math.min(this.state.maxHp, this.hp + final * st.leech / 100);
    }
    if (m.state === "idle") m.state = "chase";
    if (m.hp <= 0) this.killMob(m, false, src);
  }

  private killMob(m: MobEnt, silent = false, src = "") {
    if (m.state === "dead") return;
    m.state = "dead"; m.deadT = 1.4;
    this.spawnDeathFx(m.x, m.z, m.type.color, m.scale);
    const xp = mobXp(m.type.tier, this.opts.level, m.lvl) * (m.isBoss ? 8 : m.isWorld ? 30 : m.isVillain ? 24 : m.isElite ? 3 : 1);
    const gold = Math.round((6 + m.type.tier * 9 + m.lvl * 1.4) * (m.isBoss ? 10 : m.isWorld ? 40 : m.isVillain ? 30 : m.isElite ? 3 : 1) * this.partyBonus());
    this.state.kills++;
    this.emit("kill", {
      name: m.name, tier: m.type.tier, xp, gold,
      isBoss: m.isBoss, isElite: m.isElite, isWorld: m.isWorld, isVillain: m.isVillain,
    });
    this.gainXp(xp);
    this.state.gold += gold;

    // loot
    const nLoot = m.isWorld ? 3 : m.isVillain ? 2 : m.isBoss ? (Math.random() < 0.6 ? 2 : 1) : 1;
    for (let i = 0; i < nLoot; i++) {
      const item = rollLoot(m.type.tier, m.isBoss || m.isWorld || m.isVillain, m.isElite, m.lvl);
      if (item) this.emit("loot", { item });
    }
    // materiais
    if (m.isBoss || m.isWorld || m.isVillain) {
      this.emit("material", { id: "essencia", n: m.isWorld ? 3 : m.isVillain ? 2 : 1 });
      this.emit("material", { id: "fragmento", n: m.isWorld ? 6 : 4 });
    } else if (Math.random() < 0.22) {
      this.emit("material", { id: "fragmento", n: 1 });
    }
    // cupões: chefes mundiais e vilões entregam sempre; elites às vezes
    if (m.isWorld || m.isVillain) {
      this.emit("coupon", { n: m.isWorld ? 2 : 1, from: m.name });
    } else if (m.isElite && Math.random() < 0.25) {
      this.emit("coupon", { n: 1, from: m.name });
    }
    if (!silent) worldAudio.play("death");
    if (m.isWorld || m.isVillain) {
      this.emit("announce", { text: `${m.name} foi DERROTADO por ${this.opts.name}!`, emoji: m.isVillain ? "🏆" : "🌟" });
    }
    // quests hooks
    this.emit("quest", { kind: m.isElite ? "elite" : (m.isBoss || m.isWorld || m.isVillain) ? "boss" : "kills" });
    if (m.isVillain) this.emit("quest", { kind: "villain" });
    if (m.isWorld) this.emit("quest", { kind: "worldboss" });
  }

  private partyBonus(): number {
    let near = 0;
    for (const p of this.players.values()) {
      if (p.bot || !p.duelWith) continue;
    }
    return 1 + Math.min(4, this.partyNearCount()) * 0.08;
  }
  private partyNearCount(): number {
    let n = 0;
    for (const id of this.partyIds) {
      const p = this.players.get(id);
      if (p && dist2(p.x, p.z, this.px, this.pz) < 900) n++;
    }
    return n;
  }

  private gainXp(amount: number) {
    if (this.opts.level >= LEVEL_CAP) return;
    let xp = amount;
    if (this.state.buffs.find(b => b.id === "estrelas")) xp *= 2;
    if (this.state.buffs.find(b => b.id === "descanso")) xp *= 1.15;
    if (this.towerOwnerBuff()) xp *= 1.1;
    if (this.partyNearCount() > 0) xp *= 1 + Math.min(4, this.partyNearCount()) * 0.08;
    this.state.xp += Math.round(xp);
    this.emit("xp", { amount: Math.round(xp), total: this.state.xp });
    let need = xpNeed(this.opts.level);
    while (this.state.xp >= need && this.opts.level < LEVEL_CAP) {
      this.state.xp -= need;
      this.opts.level++;
      this.state.level = this.opts.level;
      need = xpNeed(this.opts.level);
      this.emit("levelup", { level: this.opts.level });
      worldAudio.play("levelup");
      if (this.opts.level === LEVEL_CAP) break;
    }
  }

  private towerOwnerBuff(): boolean {
    const myF = this.opts.faction;
    return this.towers.some(t => t.owner === myF);
  }

  // ── DANO AO JOGADOR ───────────────────────────────────────
  private mobHitPlayer(m: MobEnt) {
    if (this.dead || this.iFrames > 0) return;
    let dmg = (m.type.atk * (1 + m.lvl * 0.045)) * (m.enraged ? 1.6 : 1) * rnd(1.15, 0.85);
    this.hurtPlayer(dmg, m.name);
    if (m.mech === "slam" && m.isBoss) this.spawnHitFx(this.px, this.py + 1, this.pz, 0xef4444, 2);
  }

  private hurtPlayer(dmg: number, by: string) {
    if (this.dead) return;
    let def = this.opts.stats.def;
    const buff = (id: string) => this.state.buffs.find(b => b.id === id);
    if (buff("muralha")) def *= 1.6;
    if (buff("totem")) def *= 1.3;
    if (buff("guardapocao")) def *= 1.4;
    if (buff("avatar")) def *= 1.45;
    const reduce = def / (def + 60);
    let final = Math.max(1, Math.round(dmg * (1 - reduce)));
    if (this.iFrames > 0) return;
    this.hp -= final;
    worldAudio.play("hurt");
    this.spawnDmgNumber(this.px, this.py + 2.4, this.pz, final, true);
    if (this.hp <= 0) this.die(by);
  }

  private die(by: string) {
    if (this.dead) return;
    this.dead = true;
    this.state.dead = true;
    worldAudio.play("death");
    this.emit("death", { by });
  }

  respawn() {
    if (!this.dead) return;
    this.dead = false;
    this.state.dead = false;
    this.hp = this.state.maxHp * 0.7;
    this.mp = this.state.maxMp * 0.7;
    const fc = FACTIONS[this.opts.faction] || FACTIONS[0];
    const reg = REGIONS.find(r => r.id === (this.opts.faction === 0 ? "fortaleza" : "bastiao")) || REGIONS[0];
    this.px = reg.cx + rnd(6, -6); this.pz = reg.cz + rnd(6, -6);
    this.pGroup.position.set(this.px, this.terrainHeight(this.px, this.pz), this.pz);
    this.target = null;
    for (const m of this.mobs) if (m.state === "chase" || m.state === "attack") m.state = "return";
  }

  // ── PROJÉTEIS E TELEGRAPHS ────────────────────────────────
  private spawnProj(x: number, y: number, z: number, dx: number, dz: number, o: {
    speed: number; life: number; dmg: number; from: ProjEnt["from"]; target?: MobEnt | null;
    color: number; radius: number; aoe?: number; pierce?: boolean;
  }) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(o.radius, 6, 5),
      new THREE.MeshBasicMaterial({ color: o.color })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.projs.push({
      mesh, x, y, z, dx, dz, speed: o.speed, life: o.life, dmg: o.dmg,
      from: o.from, target: o.target || null, pierce: !!o.pierce, radius: o.radius,
      aoe: o.aoe || 0, color: o.color, hitSet: o.pierce ? new Set() : undefined,
    });
  }

  private updateProjs(dt: number) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.life -= dt;
      if (p.from === "player" && p.target && p.target.state !== "dead") {
        // perseguição leve
        const d = Math.sqrt(dist2(p.target.x, p.target.z, p.x, p.z)) || 1;
        p.dx = p.dx * 0.8 + ((p.target.x - p.x) / d) * 0.2;
        p.dz = p.dz * 0.8 + ((p.target.z - p.z) / d) * 0.2;
      }
      p.x += p.dx * p.speed * dt; p.z += p.dz * p.speed * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      let hit = false;
      if (p.from === "player") {
        for (const m of this.mobs) {
          if (m.state === "dead" || !m.group.visible) continue;
          if (p.hitSet?.has(m.id)) continue;
          const rr = 1.2 * m.scale;
          if (dist2(m.x, m.z, p.x, p.z) < rr * rr) {
            if (p.aoe > 0) this.aoeDamage(p.x, p.z, p.aoe, p.dmg);
            else this.damageMob(m, p.dmg, true, "projétil");
            if (p.hitSet) p.hitSet.add(m.id); else { hit = true; }
            if (!p.pierce) { hit = true; }
            this.spawnHitFx(p.x, p.y, p.z, p.color);
            break;
          }
        }
      } else {
        const rr = 1.4;
        if (!this.dead && this.iFrames <= 0 && dist2(this.px, this.pz, p.x, p.z) < rr * rr) {
          this.hurtPlayer(p.dmg, "projétil"); hit = true;
        }
      }
      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        p.mesh.geometry.dispose();
        this.projs.splice(i, 1);
      }
    }
    // telegraphs
    for (let i = this.teles.length - 1; i >= 0; i--) {
      const t = this.teles[i];
      t.t += dt;
      const k = t.t / t.dur;
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + k * 0.45;
      if (t.t >= t.dur) {
        if (!this.dead && this.iFrames <= 0 && dist2(this.px, this.pz, t.x, t.z) < t.r * t.r) {
          this.hurtPlayer(t.dmg, t.kind);
        }
        this.spawnHitFx(t.x, this.terrainHeight(t.x, t.z) + 0.5, t.z, 0xef4444, t.r * 0.8);
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        this.teles.splice(i, 1);
      }
    }
  }

  // ── EFEITOS ───────────────────────────────────────────────
  private spawnHitFx(x: number, y: number, z: number, color: number, r = 1) {
    const g = new THREE.Group();
    for (let i = 0; i < 6 * this.particleBudget; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(rnd(0.16, 0.06), 4, 3),
        new THREE.MeshBasicMaterial({ color, transparent: true })
      );
      p.position.set(x + rnd(0.5, -0.5), y + rnd(0.8), z + rnd(0.5, -0.5));
      (p.material as THREE.Material as any).userData = { vy: rnd(3, 1), life: rnd(0.5, 0.25) };
      g.add(p);
    }
    g.userData.fx = true; g.userData.t = 0;
    this.scene.add(g);
    this.fxs.push(g);
  }
  private fxs: THREE.Group[] = [];

  private spawnDeathFx(x: number, z: number, color: number, scale: number) {
    this.spawnHitFx(x, this.terrainHeight(x, z) + 1, z, color, 1.6 * scale * 0.6);
  }

  private dmgSpritePool: THREE.Sprite[] = [];
  private spawnDmgNumber(x: number, y: number, z: number, n: number, onPlayer: boolean) {
    const cnv = document.createElement("canvas");
    cnv.width = 128; cnv.height = 64;
    const ctx = cnv.getContext("2d")!;
    ctx.font = "bold 44px system-ui";
    ctx.textAlign = "center";
    ctx.fillStyle = onPlayer ? "#f87171" : "#fde047";
    ctx.strokeStyle = "rgba(0,0,0,0.9)"; ctx.lineWidth = 6;
    ctx.strokeText(String(n), 64, 44); ctx.fillText(String(n), 64, 44);
    const tex = new THREE.CanvasTexture(cnv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(2.6, 1.3, 1);
    sp.position.set(x + rnd(0.8, -0.8), y + 1, z + rnd(0.8, -0.8));
    sp.userData.t = 0;
    this.scene.add(sp);
    this.dmgSpritePool.push(sp);
  }

  private spawnTelegraphFx(x: number, z: number, r: number, dur: number, color: number) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })
    );
    mesh.position.set(x, this.terrainHeight(x, z) + 0.16, z);
    this.scene.add(mesh);
    this.teles.push({ mesh, t: 0, dur, dmg: 0, r, x, z, kind: "fx" });
  }

  private updateFx(dt: number) {
    for (let i = this.fxs.length - 1; i >= 0; i--) {
      const g = this.fxs[i];
      g.userData.t += dt;
      let alive = false;
      for (const p of g.children) {
        const ud = (p as any).material?.userData;
        if (!ud) continue;
        if (ud.life > 0) {
          alive = true;
          ud.life -= dt;
          p.position.y += ud.vy * dt;
          ud.vy -= 6 * dt;
          (p.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ud.life * 2.4);
          p.scale.multiplyScalar(1 - dt * 0.6);
        }
      }
      if (!alive || g.userData.t > 1.2) {
        this.scene.remove(g);
        this.fxs.splice(i, 1);
      }
    }
    for (let i = this.dmgSpritePool.length - 1; i >= 0; i--) {
      const sp = this.dmgSpritePool[i];
      sp.userData.t += dt;
      sp.position.y += dt * 2.2;
      (sp.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - sp.userData.t / 0.9);
      if (sp.userData.t > 0.9) {
        this.scene.remove(sp);
        (sp.material as THREE.SpriteMaterial).map?.dispose();
        this.dmgSpritePool.splice(i, 1);
      }
    }
  }

  // ── CHEFES MUNDIAIS + VILÕES ──────────────────────────────
  private updateWorldSpawns(dt: number) {
    // chefes mundiais (ciclo)
    WORLD_BOSSES.forEach((wb, i) => {
      const cur = this.worldBosses[i];
      if (!cur || cur.state === "dead") {
        if (cur && cur.state === "dead") {
          cur.respawnT -= dt;
          if (cur.respawnT > 0) return;
        }
        if (!cur) {
          this.worldBossT[i] -= dt;
          if (this.worldBossT[i] > 0) return;
        }
        const t = MOB_TYPES.find(m => m.tier === 8) || MOB_TYPES[0];
        const m = this.spawnMob(t, wb.x, wb.z, -1, { isWorld: true, name: wb.name, mech: "nova" });
        m.isWorld = true;
        this.worldBosses[i] = m;
        this.worldBossT[i] = wb.cycle;
        this.emit("announce", { text: `${wb.emoji} CHEFE MUNDIAL: ${wb.name} surgiu em ${REGIONS.find(r => r.id === wb.region)?.name}!`, emoji: "☄️" });
        this.emit("worldboss", { action: "spawn", name: wb.name, x: wb.x, z: wb.z });
      }
    });
    // vilão da plataforma
    if (!this.villain || this.villain.state === "dead") {
      if (this.villain && this.villain.state === "dead") {
        this.villain.respawnT -= dt;
        if (this.villain.respawnT > 0) return;
      }
      this.villainT -= dt;
      if (this.villainT > 0) return;
      const v = pick(VILLAINS);
      const t = MOB_TYPES.find(m => m.tier === v.tier) || MOB_TYPES[6];
      const reg = pick(REGIONS.filter(r => !r.hub));
      const a = rnd(Math.PI * 2);
      const x = reg.cx + Math.cos(a) * reg.r * 0.5, z = reg.cz + Math.sin(a) * reg.r * 0.5;
      const m = this.spawnMob(t, x, z, -1, { isVillain: true, name: `${v.emoji} ${v.name}`, mech: v.mech });
      m.isVillain = true;
      this.villain = m;
      this.villainT = 300;
      this.emit("announce", { text: `${v.emoji} VILÃO DA PLATAFORMA: ${v.name} — "${v.taunt}"`, emoji: "😈" });
      this.emit("villain", { action: "spawn", name: v.name, x, z });
    }
  }

  // ── FACCÕES: PvP aberto + Fama + roubo de cupões ─────────
  private partyIds: string[] = [];
  private fameSession = 0;
  private duelState: { with: string; phase: "countdown" | "fight" | "done"; t: number } | null = null;

  setParty(ids: string[]) { this.partyIds = ids.filter(i => this.players.has(i) || i === "self"); this.emit("party", { ids: this.partyIds }); }

  private safeZone(x: number, z: number): boolean {
    if (Math.sqrt(dist2(x, z, 0, 0)) < PVP_SAFE_RADIUS) return true; // vila
    for (const id of ["fortaleza", "bastiao"]) {
      const reg = REGIONS.find(r => r.id === id)!;
      if (dist2(x, z, reg.cx, reg.cz) < PVP_SAFE_RADIUS * PVP_SAFE_RADIUS) return true;
    }
    return false;
  }

  private hitPlayerEnt(p: PlayerEnt, dmg: number) {
    if (p.bot) {
      p.hp -= dmg;
      this.spawnDmgNumber(p.x, 2.4, p.z, Math.round(dmg), false);
      if (p.hp <= 0) this.killPlayerEnt(p);
    }
    // remotos: dano só visual (simulação local autoritativa p/ bots)
  }

  private killPlayerEnt(p: PlayerEnt) {
    p.hp = p.maxHp;
    p.x = REGIONS[p.faction === 0 ? 1 : 2].cx; p.z = REGIONS[p.faction === 0 ? 1 : 2].cz;
    p.state = "respawn";
    if (p.faction !== this.opts.faction) {
      const fame = Math.round((15 + this.fameSession * 0.02) * (this.myHouseStat("estatua") ? 1.05 * this.myHouse!.built.estatua : 1));
      this.fameSession += 15;
      this.emit("pvp-kill", { name: p.name, fame });
      worldAudio.play("combo");
      // ROUBO DE CUPÕES (a assinatura da plataforma)
      const safe = this.safeZone(p.x, p.z);
      const protectedHome = p.uidHouseProtected;
      if (p.coupons > 0 && !protectedHome && !safe) {
        if (Math.random() < 0.45) {
          p.coupons--;
          this.emit("steal", { from: p.name, coupon: true });
          worldAudio.play("steal");
          this.emit("announce", { text: `${this.opts.name} ROUBOU um cupão de ${p.name}!`, emoji: "🥷" });
        }
      } else if (protectedHome && safe === false) {
        this.emit("announce", { text: `${p.name} estava PROTEGIDO pela torre de guarda!`, emoji: "🛡️" });
      }
      this.emit("quest", { kind: "steal", maybe: true });
    }
  }

  // __TESTHOOK__
  /** Simula roubo de cupão (usado em testes e em eventos). */
  forceSteal(fromName = "Bot Tempestade") {
    this.emit("steal", { from: fromName, coupon: true });
    this.emit("announce", { text: `${this.opts.name} ROUBOU um cupão de ${fromName}!`, emoji: "🥷" });
  }

  // ── TORRES DE DOMÍNIO ─────────────────────────────────────
  private updateTowers(dt: number) {
    for (const t of this.towers) {
      const d = Math.sqrt(dist2(this.px, this.pz, t.x, t.z));
      const enemyNear = [...this.players.values()].some(p => p.faction !== this.opts.faction && p.faction >= 0 && dist2(p.x, p.z, t.x, t.z) < 64);
      if (d < 8 && !this.dead) {
        if (t.owner !== this.opts.faction) {
          t.prog += dt * 10; // 10s para capturar
          if (t.prog >= 100) {
            t.owner = this.opts.faction;
            t.prog = 0;
            if (t.flagMesh) (t.flagMesh.material as THREE.MeshBasicMaterial).color.setHex(FACTIONS[this.opts.faction].hex);
            this.emit("tower", { id: t.id, name: t.name, owner: this.opts.faction, action: "captured" });
            this.emit("announce", { text: `${FACTIONS[this.opts.faction].emoji} ${FACTIONS[this.opts.faction].name} capturou a ${t.name}!`, emoji: "🏳️" });
            this.emit("quest", { kind: "tower" });
            worldAudio.play("event");
          }
        }
      } else if (t.owner !== this.opts.faction && enemyNear) {
        t.prog = Math.max(0, t.prog - dt * 5);
      }
      if (t.flagMesh) {
        t.flagMesh.rotation.y += dt * (t.owner >= 0 ? 1.2 : 0.3);
      }
    }
  }

  // ── MASMORRAS ─────────────────────────────────────────────
  enterDungeon(id: string): boolean {
    const def = DUNGEONS.find(d => d.id === id);
    if (!def || this.dungeon) return false;
    if (this.opts.level < def.minLvl) {
      this.emit("announce", { text: `${def.name} requer nível ${def.minLvl}+`, emoji: "🔒" });
      return false;
    }
    // teletransporta para instância
    const ix = 600 + (id === "cripta" ? 0 : 60), iz = 600;
    this.px = ix; this.pz = iz;
    this.pGroup.position.set(ix, this.terrainHeight(ix, iz), iz);
    this.dungeon = { def, wave: 0, state: "fight", t: 2 };
    this.emit("dungeon", { action: "enter", name: def.name, wave: 0, waves: def.waves });
    this.emit("announce", { text: `${def.emoji} Entraste na ${def.name}!`, emoji: "💀" });
    worldAudio.play("door");
    this.spawnDungeonWave();
    return true;
  }

  private spawnDungeonWave() {
    if (!this.dungeon) return;
    const { def } = this.dungeon;
    this.dungeon.wave++;
    const tier = def.tier;
    const t = MOB_TYPES.find(m => m.tier === tier) || MOB_TYPES[3];
    const isBossWave = this.dungeon.wave > def.waves;
    if (isBossWave) {
      const m = this.spawnMob(t, this.px + 6, this.pz + 6, -1, { isBoss: true, name: def.boss, mech: "nova", lvlOverride: def.minLvl + 8 });
      m.isBoss = true;
      this.dungeon.state = "boss";
      this.emit("announce", { text: `☠ ${def.boss} despertou!`, emoji: "☠️" });
      worldAudio.play("boss");
    } else {
      const n = 3 + this.dungeon.wave;
      for (let i = 0; i < n; i++) {
        const a = rnd(Math.PI * 2), d = rnd(14, 8);
        const elite = Math.random() < 0.15;
        const m = this.spawnMob(t, this.px + Math.cos(a) * d, this.pz + Math.sin(a) * d, -1, {
          isElite: elite, lvlOverride: def.minLvl + this.dungeon.wave,
        });
        m.state = "chase";
      }
      this.dungeon.state = "fight";
      this.emit("dungeon", { action: "wave", wave: this.dungeon.wave, waves: def.waves });
    }
  }

  private updateDungeon(dt: number) {
    if (!this.dungeon) return;
    const aliveNear = this.mobs.filter(m => m.state !== "dead" && m.wave !== undefined && m.group.visible && dist2(m.x, m.z, this.px, this.pz) < 3600);
    if (aliveNear.length === 0) {
      this.dungeon.t -= dt;
      if (this.dungeon.t <= 0) {
        if (this.dungeon.state === "boss") {
          // limpa
          const { def } = this.dungeon;
          this.dungeon = null;
          this.emit("dungeon", { action: "clear", name: def.name });
          this.emit("announce", { text: `🏆 ${def.name} CONCLUÍDA! Recompensa épica!`, emoji: "🏆" });
          this.emit("quest", { kind: "dungeon" });
          // recompensa: item épico garantido
          const item = rollLoot(def.tier + 2, true, false, def.minLvl + 10);
          if (item) { item.rarity = Math.max(item.rarity, 3); this.emit("loot", { item }); }
          this.state.gold += 3000 + def.minLvl * 200;
          // volta à entrada
          this.px = def.x + 4; this.pz = def.z + 4;
          this.pGroup.position.set(this.px, this.terrainHeight(this.px, this.pz), this.pz);
          worldAudio.play("chest");
        } else {
          const more = this.dungeon.wave < this.dungeon.def.waves;
          if (more) {
            this.dungeon.t = 2.5;
            this.spawnDungeonWave();
          }
        }
      }
    } else {
      this.dungeon.t = 2;
    }
    if (this.dungeon && this.dungeon.state === "fight" && aliveNear.length === 0 && this.dungeon.wave >= this.dungeon.def.waves) {
      // preparar boss
      this.dungeon.state = "boss";
      this.spawnDungeonWave();
    }
  }

  exitDungeon() {
    if (!this.dungeon) return;
    const def = this.dungeon.def;
    this.dungeon = null;
    this.px = def.x + 6; this.pz = def.z + 6;
    this.pGroup.position.set(this.px, this.terrainHeight(this.px, this.pz), this.pz);
    for (const m of this.mobs) if (m.wave !== undefined && m.state !== "dead") { m.state = "dead"; m.deadT = 0.1; m.group.visible = false; }
    this.emit("dungeon", { action: "exit" });
  }

  // ── MONTARIAS ─────────────────────────────────────────────
  private mountMeshFor(id: string): THREE.Group {
    const def = MOUNTS.find(m => m.id === id) || MOUNTS[0];
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 2.2), new THREE.MeshLambertMaterial({ color: def.color }));
    body.position.y = 0.9; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.9), new THREE.MeshLambertMaterial({ color: def.color }));
    head.position.set(0, 1.45, 1.2); g.add(head);
    for (const sx of [-0.35, 0.35]) for (const sz of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), new THREE.MeshLambertMaterial({ color: def.color }));
      leg.position.set(sx, 0.45, sz); g.add(leg);
    }
    if (id === "dragao") {
      for (const sx of [-0.8, 0.8]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshLambertMaterial({ color: 0x450a0a, side: THREE.DoubleSide }));
        w.position.set(sx, 1.4, -0.3); w.rotation.z = sx > 0 ? 0.4 : -0.4;
        g.add(w);
      }
    }
    return g;
  }

  mount(id: string): boolean {
    const def = MOUNTS.find(m => m.id === id);
    if (!def) return false;
    if (this.mountId === id) { this.dismount(); return false; }
    this.mountId = id;
    this.state.mountedId = id;
    if (this.mountedMesh) { this.scene.remove(this.mountedMesh); this.mountedMesh = null; }
    this.mountedMesh = this.mountMeshFor(id);
    this.scene.add(this.mountedMesh);
    worldAudio.play("mount");
    this.emit("mount", { action: "ride", id });
    return true;
  }

  dismount() {
    this.mountId = null;
    this.state.mountedId = null;
    if (this.mountedMesh) { this.scene.remove(this.mountedMesh); this.mountedMesh = null; }
    this.emit("mount", { action: "dismount" });
  }

  // ── HABITAÇÃO ─────────────────────────────────────────────
  claimPlot(): boolean {
    if (this.myHouse) return true;
    const x = 70 + rnd(14, -14), z = -30 + rnd(14, -14);
    const g = new THREE.Group();
    const y = this.terrainHeight(x, z);
    const fence = new THREE.Mesh(new THREE.TorusGeometry(9, 0.18, 5, 30).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xfcd34d }));
    fence.position.y = 0.5; g.add(fence);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.myHouse = { uid: this.opts.uid, name: this.opts.name, x, z, group: g, built: {}, towerHp: 0, towerMax: 0, vault: 0, group_owner: this.opts.faction };
    this.houses.set(this.opts.uid, this.myHouse);
    this.emit("house", { action: "claim", x, z });
    this.emit("announce", { text: `🏘️ ${this.opts.name} reclamou um lote no Bairro das Residências!`, emoji: "🏠" });
    return true;
  }

  buildHouse(id: string): boolean {
    if (!this.myHouse) this.claimPlot();
    const h = this.myHouse!;
    const def = BUILDINGS.find(b => b.id === id);
    if (!def) return false;
    const lvl = (h.built[id] || 0) + 1;
    if (lvl > def.levels) return false;
    h.built[id] = lvl;
    // rebuild mesh
    const old = h.group.getObjectByName(`b_${id}`);
    if (old) h.group.remove(old);
    const mesh = this.houseMesh(id, lvl);
    mesh.name = `b_${id}`;
    h.group.add(mesh);
    if (id === "torre") { h.towerMax = 200 * lvl; h.towerHp = h.towerMax; }
    worldAudio.play("craft");
    this.emit("house", { action: "build", id, level: lvl });
    if (id === "casa") this.emit("quest", { kind: "house" });
    return true;
  }

  private houseMesh(id: string, lvl: number): THREE.Group {
    const g = new THREE.Group();
    const wall = new THREE.MeshLambertMaterial({ color: id === "casa" ? 0xf59e0b : id === "torre" ? 0x64748b : id === "muralha" ? 0xa8a29e : 0xe5e7eb });
    if (id === "casa") {
      const s = 1 + lvl * 0.35;
      const b = new THREE.Mesh(new THREE.BoxGeometry(3 * s, 2.4 * s, 3 * s), wall);
      b.position.y = 1.2 * s; b.castShadow = !this.isMobile; g.add(b);
      const r = new THREE.Mesh(new THREE.ConeGeometry(2.6 * s, 1.6 * s, 4), new THREE.MeshLambertMaterial({ color: 0x7c2d12 }));
      r.position.y = 2.4 * s + 0.8 * s; r.rotation.y = Math.PI / 4; g.add(r);
    } else if (id === "torre") {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 4 + lvl, 8), wall);
      b.position.y = (4 + lvl) / 2; g.add(b);
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.4, 8), new THREE.MeshLambertMaterial({ color: 0x1d4ed8 }));
      top.position.y = 4 + lvl + 0.7; g.add(top);
    } else if (id === "muralha") {
      for (let i = 0; i < 6 + lvl * 2; i++) {
        const a = (i / (6 + lvl * 2)) * Math.PI * 2;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2 + lvl * 0.4, 0.7), wall);
        seg.position.set(Math.cos(a) * 8, (2.2 + lvl * 0.4) / 2, Math.sin(a) * 8);
        seg.rotation.y = -a; g.add(seg);
      }
    } else if (id === "estatua") {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1, 8), wall);
      b.position.y = 0.5; g.add(b);
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), new THREE.MeshLambertMaterial({ color: 0xfbbf24, emissive: 0x451a03 }));
      f.position.y = 1.9; g.add(f);
    } else { // fogueira
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 5), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      f.position.y = 0.6; g.add(f);
      const l = new THREE.PointLight(0xf97316, 8, 12); l.position.y = 1.4; g.add(l);
    }
    return g;
  }

  private myHouseStat(id: string): boolean {
    return !!this.myHouse && (this.myHouse.built[id] || 0) > 0;
  }

  depositCoupon(n: number): boolean {
    if (!this.myHouse || n <= 0) return false;
    this.myHouse.vault += n;
    this.emit("house", { action: "deposit", vault: this.myHouse.vault });
    return true;
  }

  // ── RECOLHA ───────────────────────────────────────────────
  private updateNodes(dt: number) {
    for (const nd of this.nodes) {
      if (!nd.active) {
        nd.respawnT -= dt;
        if (nd.respawnT <= 0) { nd.active = true; nd.group.visible = true; }
        continue;
      }
      if (dist2(nd.x, nd.z, this.px, this.pz) < 12) {
        nd.active = false; nd.group.visible = false; nd.respawnT = 60;
        worldAudio.play("gather");
        this.emit("material", { id: nd.kind, n: 1 + (Math.random() < 0.3 ? 1 : 0) });
        this.emit("quest", { kind: "gather" });
      }
    }
  }

  // ── EVENTOS DO MUNDO ──────────────────────────────────────
  private updateEvents(dt: number) {
    this.eventT -= dt;
    if (this.eventT > 0) return;
    this.eventT = rnd(220, 130);
    const kind = pick(["meteoro", "estrelas", "frenesi"]);
    if (kind === "meteoro") {
      const a = rnd(Math.PI * 2), d = rnd(120, 40);
      const x = this.px + Math.cos(a) * d, z = this.pz + Math.sin(a) * d;
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      g.add(rock);
      g.position.set(x, this.terrainHeight(x, z) + 3, z);
      this.scene.add(g);
      this.lootFields.push({ x, z, t: 30, mesh: g });
      this.emit("announce", { text: "☄️ Um meteoro caiu! Campo de tesouros por 30s!", emoji: "☄️" });
      worldAudio.play("boom");
    } else if (kind === "estrelas") {
      this.state.buffs = this.state.buffs.filter(b => b.id !== "estrelas");
      this.state.buffs.push({ id: "estrelas", t: 60 });
      this.emit("announce", { text: "🌟 CHUVA DE ESTRELAS: XP ×2 por 60s!", emoji: "🌟" });
      worldAudio.play("event");
    } else {
      this.emit("announce", { text: "🥷 FRENESI DE ROUBOS: roubar cupões dá ouro extra!", emoji: "🥷" });
      this.emit("event", { kind: "frenesi" });
      worldAudio.play("event");
    }
  }

  private updateLootFields(dt: number) {
    for (let i = this.lootFields.length - 1; i >= 0; i--) {
      const f = this.lootFields[i];
      f.t -= dt;
      f.mesh.rotation.y += dt;
      if (dist2(this.px, this.pz, f.x, f.z) < 36 && Math.random() < 0.4) {
        this.state.gold += rndi(60, 20);
        const item = rollLoot(3, false, true, this.opts.level);
        if (item) this.emit("loot", { item });
        worldAudio.play("coin");
        f.t -= 6;
      }
      if (f.t <= 0) {
        this.scene.remove(f.mesh);
        this.lootFields.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // EXPLORAÇÃO (REA BotW/Elden Ring): miradouros, baús, frutos
  // ═══════════════════════════════════════════════════════════
  private meta: { miradouros: string[]; chests: string[]; date: string; aura: string | null } = { miradouros: [], chests: [], date: "", aura: null };
  private miraEnts: { id: string; x: number; z: number; group: THREE.Group; crystal: THREE.Mesh; halo: THREE.Mesh }[] = [];
  private chestEnts: { id: string; x: number; z: number; group: THREE.Group; lid: THREE.Mesh }[] = [];
  private fruitEnts: { x: number; z: number; group: THREE.Group }[] = [];
  private emoteSprite: THREE.Sprite | null = null; private emoteT = 0;
  private auraMesh: THREE.Mesh | null = null;

  /** Sincroniza o progresso de exploração vindo do herói (UI). */
  setMeta(m: Partial<WorldEngine["meta"]>) { this.meta = { ...this.meta, ...m }; this.syncExplorationMeshes(); }

  private buildExploration() {
    // MIRADOUROS: torres com cristal da cor da região
    for (const mi of MIRADOUROS) {
      const reg = REGIONS.find(r => r.id === mi.region)!;
      const g = new THREE.Group();
      const h = 9;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, h, 6), new THREE.MeshLambertMaterial({ color: 0x57534e }));
      base.position.y = h / 2; base.castShadow = !this.isMobile;
      g.add(base);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), new THREE.MeshBasicMaterial({ color: reg.color }));
      crystal.position.y = h + 1.2;
      g.add(crystal);
      // halo brilhante sem luz (74 PointLights rebentavam com o renderer)
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 8), new THREE.MeshBasicMaterial({ color: reg.color, transparent: true, opacity: 0.28, depthWrite: false }));
      halo.position.y = h + 1.2; g.add(halo);
      g.position.set(mi.x, this.terrainHeight(mi.x, mi.z), mi.z);
      this.scene.add(g);
      this.miraEnts.push({ id: mi.id, x: mi.x, z: mi.z, group: g, crystal, halo });
    }
    // BAÚS escondidos (26, posições determinísticas fora dos hubs)
    let ci = 0;
    for (let i = 0; i < 400 && ci < 26; i++) {
      const x = (hash2(i * 7, 13) - 0.5) * 700, z = (hash2(29, i * 11) - 0.5) * 700;
      const reg = this.regionAt(x, z);
      if (reg.hub) continue;
      if (this.terrainHeight(x, z) < 0.1) continue;
      const id = `chest_${i}`;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1), new THREE.MeshLambertMaterial({ color: 0x92400e }));
      body.position.y = 0.4; g.add(body);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1), new THREE.MeshLambertMaterial({ color: 0xb45309 }));
      lid.position.set(0, 0.9, -0.5); g.add(lid);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.25, depthWrite: false }));
      gl.position.y = 1.1; g.add(gl);
      g.position.set(x, this.terrainHeight(x, z), z);
      this.scene.add(g);
      this.chestEnts.push({ id, x, z, group: g, lid });
      ci++;
    }
    // FRUTOS ANCESTRAIS (40 — colecionáveis)
    let fi = 0;
    for (let i = 0; i < 500 && fi < 40; i++) {
      const x = (hash2(53, i * 17) - 0.5) * 680, z = (hash2(i * 19, 71) - 0.5) * 680;
      const reg = this.regionAt(x, z);
      if (reg.hub) continue;
      if (this.terrainHeight(x, z) < 0.1) continue;
      const g = new THREE.Group();
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf0abfc }));
      orb.position.y = 1.1; g.add(orb);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf0abfc, transparent: true, opacity: 0.25, depthWrite: false }));
      gl.position.y = 1.1; g.add(gl);
      g.position.set(x, this.terrainHeight(x, z), z);
      this.scene.add(g);
      this.fruitEnts.push({ x, z, group: g });
      fi++;
    }
    this.syncExplorationMeshes();
  }

  /** Estado visual: miradouro ativado fica dourado; baú aberto some. */
  private syncExplorationMeshes() {
    for (const m of this.miraEnts) {
      const on = this.meta.miradouros.includes(m.id);
      (m.crystal.material as THREE.MeshBasicMaterial).color.setHex(on ? 0xfbbf24 : (this.regionAt(m.x, m.z).color as any));
      (m.halo.material as THREE.MeshBasicMaterial).color.setHex(on ? 0xfbbf24 : 0xffffff);
      (m.halo.material as THREE.MeshBasicMaterial).opacity = on ? 0.4 : 0.22;
    }
    for (const c of this.chestEnts) {
      const opened = this.meta.date === todayStr() && this.meta.chests.includes(c.id);
      c.group.visible = !opened;
    }
  }

  private updateExploration(dt: number) {
    // cristais giram e pulsam; frutos flutuam; apanhar fruto ao passar
    const pulse = 1 + Math.sin(this.dayT * 3) * 0.12;
    for (const m of this.miraEnts) {
      m.crystal.rotation.y += dt * 1.2;
      m.halo.scale.setScalar(pulse);
    }
    for (let i = this.fruitEnts.length - 1; i >= 0; i--) {
      const f = this.fruitEnts[i];
      f.group.position.y = this.terrainHeight(f.x, f.z) + Math.sin(this.dayT * 2 + f.x) * 0.15;
      f.group.rotation.y += dt;
      f.group.scale.setScalar(pulse);
      if (dist2(this.px, this.pz, f.x, f.z) < 6.5) {
        this.scene.remove(f.group);
        this.fruitEnts.splice(i, 1);
        this.emit("fruit", {});
        worldAudio.play("coin");
        this.spawnHitFx(f.x, 1.2, f.z, 0xf0abfc, 1.4);
      }
    }
    // emote flutuante
    if (this.emoteSprite && this.emoteT > 0) {
      this.emoteT -= dt;
      this.emoteSprite.position.set(this.px, this.terrainHeight(this.px, this.pz) + 3.4 + Math.sin(this.dayT * 6) * 0.1, this.pz);
      if (this.emoteT <= 0) { this.scene.remove(this.emoteSprite); this.emoteSprite = null; }
    }
  }

  /** Emote social (Bartle: socializadores) — emoji flutua sobre o herói. */
  emote(id: string) {
    const e = EMOTES.find(x => x.id === id);
    if (!e) return;
    if (this.emoteSprite) { this.scene.remove(this.emoteSprite); this.emoteSprite = null; }
    const cv = document.createElement("canvas"); cv.width = 128; cv.height = 128;
    const ctx = cv.getContext("2d")!;
    ctx.font = "96px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e.emoji, 64, 68);
    const tex = new THREE.CanvasTexture(cv);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.scale.set(2.2, 2.2, 1);
    this.scene.add(spr);
    this.emoteSprite = spr; this.emoteT = 2.2;
    worldAudio.play("click");
    this.emit("emote", { id });
  }

  /** Aura cosmética (anel luminoso sob o herói). */
  setAura(id: string | null) {
    if (this.auraMesh) { this.pGroup.remove(this.auraMesh); this.auraMesh = null; }
    this.meta.aura = id;
    if (!id) return;
    const a = AURAS.find(x => x.id === id);
    if (!a) return;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.09, 8, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(a.color), transparent: true, opacity: 0.85 })
    );
    ring.position.y = 0.18;
    this.pGroup.add(ring);
    this.auraMesh = ring;
  }

  // hooks de teste
  testActivateMiradouro(): boolean {
    for (const m of this.miraEnts) {
      if (!this.meta.miradouros.includes(m.id)) { this.activateMiradouro(m.id); return true; }
    }
    return false;
  }
  private activateMiradouro(id: string) {
    const mi = MIRADOUROS.find(m => m.id === id);
    if (!mi) return;
    if (!this.meta.miradouros.includes(id)) this.meta.miradouros.push(id);
    this.syncExplorationMeshes();
    this.state.gold += 1200;
    this.gainXp(120 + this.opts.level * 6);
    this.emit("miradouro", { id, region: mi.region, name: mi.name, gold: 1200 });
    this.emit("announce", { text: `🗼 ${mi.name} ATIVADO! Região revelada + 1.200 ouro`, emoji: "🗼" });
    worldAudio.play("waypoint");
  }
  testOpenChest(): boolean {
    const c = this.chestEnts.find(c => c.group.visible && !(this.meta.date === todayStr() && this.meta.chests.includes(c.id)));
    if (!c) return false;
    this.openChest(c.id);
    return true;
  }
  private openChest(id: string) {
    const c = this.chestEnts.find(x => x.id === id);
    if (!c || (this.meta.date === todayStr() && this.meta.chests.includes(id))) return;
    if (this.meta.date !== todayStr()) { this.meta.date = todayStr(); this.meta.chests = []; }
    this.meta.chests.push(id);
    c.lid.rotation.x = -1.9;
    c.lid.position.z = -0.9;
    const gold = rndi(900, 300);
    this.state.gold += gold;
    const item = rollLoot(Math.max(1, this.regionAt(c.x, c.z).danger), false, Math.random() < 0.35, this.opts.level);
    if (item) this.emit("loot", { item });
    if (Math.random() < 0.18) this.emit("coupon", { n: 1, from: "Baú Escondido" });
    this.emit("material", { id: "fragmento", n: Math.random() < 0.5 ? 2 : 1 });
    this.emit("chest", { id, gold });
    this.emit("announce", { text: `🧰 Baú aberto! +${gold} ouro`, emoji: "🧰" });
    worldAudio.play("chest");
  }
  testCollectFruit(): boolean {
    const f = this.fruitEnts[0];
    if (!f) return false;
    this.px = f.x; this.pz = f.z;
    this.updateExploration(0.016);
    return true;
  }
  getExploration() {
    return {
      miradouros: this.meta.miradouros,
      chestsOpen: this.meta.chests.length,
      frutosLeft: this.fruitEnts.length,
    };
  }

  // ── DIA/NOITE + CLIMA ─────────────────────────────────────
  private updateSky(dt: number) {
    this.dayT += dt;
    const DAY_LEN = 240;
    this.timeOfDay = (this.dayT / DAY_LEN) * 24 % 24;
    const night = this.timeOfDay < 5.5 || this.timeOfDay > 19.5;
    const k = night ? Math.max(0, Math.cos((this.timeOfDay - 24) * Math.PI / 12)) : 1;
    // sol/lua
    const ang = (this.timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    this.sunMesh.position.set(Math.cos(ang) * 260, Math.sin(ang) * 260, 60);
    this.moonMesh.position.set(-Math.cos(ang) * 260, -Math.sin(ang) * 260, -60);
    this.sun.intensity = night ? 0.25 : 1.5;
    this.hemi.intensity = night ? 0.35 : 0.95;
    (this.scene.background as THREE.Color).setHex(night ? 0x0b1026 : this.weather === "tempestade" ? 0x64748b : 0x87ceeb);
    (this.starPts.material as THREE.PointsMaterial).opacity = night ? 0.9 : 0;
    this.starPts.visible = night;
    this.sunMesh.visible = !night; this.moonMesh.visible = night;

    // DOME segue o jogador + luz com identidade por BIOMA (Genshin) —
    // subtítulo de cor, nunca fog/blur (o utilizador pediu "bem nítido")
    this.skyDome.position.set(this.px, 0, this.pz);
    const reg = this.regionAt(this.px, this.pz);
    const REG_TINT: Record<string, { sun: number; ground: number }> = {
      planicie: { sun: 0xfff2d9, ground: 0x9bbf5a },
      floresta: { sun: 0xeafff0, ground: 0x2f7d4f },
      dunas: { sun: 0xffe0b0, ground: 0xd9a441 },
      pantano: { sun: 0xdfffe8, ground: 0x4a6b2a },
      vulcao: { sun: 0xffc9a0, ground: 0x6b2a1a },
      tundra: { sun: 0xd8f2ff, ground: 0x9fd4e8 },
      titas: { sun: 0xf1e8d8, ground: 0x8a7a68 },
      escuro: { sun: 0xc9b8ff, ground: 0x2a1a4a },
    };
    const tint = REG_TINT[reg.id] || { sun: 0xfff2d9, ground: 0x8a7a5a };
    this.sun.color.setHex(night ? 0x9db4ff : tint.sun);
    this.hemi.groundColor.setHex(tint.ground);
    (this.skyDome.material as THREE.MeshBasicMaterial).color.setScalar(night ? 0.22 : 1);

    // nuvens derivam e envolvem
    for (const puff of this.cloudGrp.children) {
      puff.position.x += (puff as any).__spd * dt;
      if (puff.position.x > 700) puff.position.x = -700;
    }
    (this.cloudGrp as any).visible = !night;

    // água cintila
    if (this.waterShimmer) this.waterShimmer.rotation.y += dt * 0.05;

    // partículas ambientes por bioma/hora
    const ambMat = this.ambientPts.material as THREE.PointsMaterial;
    const AMB_STYLE: Record<string, { color: number; size: number; fall: number }> = {
      planicie: { color: 0xfff3b0, size: 0.5, fall: 0.15 },
      floresta: { color: 0xbef264, size: 0.45, fall: 0.1 },
      dunas: { color: 0xfbbf24, size: 0.6, fall: 0.35 },
      pantano: { color: 0x84cc16, size: 0.55, fall: 0.12 },
      vulcao: { color: 0xf97316, size: 0.7, fall: -0.5 },
      tundra: { color: 0xe0f2fe, size: 0.65, fall: 0.8 },
      titas: { color: 0xe7e5e4, size: 0.5, fall: 0.2 },
      escuro: { color: 0xc4b5fd, size: 0.6, fall: 0.1 },
    };
    const st = AMB_STYLE[reg.id] || AMB_STYLE.planicie;
    const ambColor = night ? 0x9fe870 : st.color; // vagalumes à noite
    if (ambMat.color.getHex() !== ambColor) ambMat.color.setHex(ambColor);
    ambMat.size = night ? 0.7 : st.size;
    const ap = this.ambientPts.geometry.attributes.position as THREE.BufferAttribute;
    const an2 = ap.count;
    for (let i = 0; i < an2; i++) {
      let y = ap.getY(i) + (st.fall >= 0 ? -st.fall * dt * 6 : Math.abs(st.fall) * dt * 8);
      ap.setX(i, ap.getX(i) + this.ambientVel[i * 3] * dt);
      ap.setZ(i, ap.getZ(i) + this.ambientVel[i * 3 + 2] * dt);
      if (y < 0.2 || y > 16) y = rnd(14, 1);
      ap.setY(i, y);
      // reencentra em volta do jogador
      const dx = ap.getX(i) - this.px, dz = ap.getZ(i) - this.pz;
      if (dx > 45) ap.setX(i, this.px - 45); else if (dx < -45) ap.setX(i, this.px + 45);
      if (dz > 45) ap.setZ(i, this.pz - 45); else if (dz < -45) ap.setZ(i, this.pz + 45);
    }
    ap.needsUpdate = true;
    this.ambientPts.position.y = 0;


    // clima
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      this.weatherT = rnd(150, 60);
      const reg = this.regionAt(this.px, this.pz);
      this.weather = reg.id === "dunas" ? pick(["limpo", "tempestade de areia"]) : reg.id === "pantano" ? pick(["limpo", "chuva"]) : pick(["limpo", "limpo", "chuva", "tempestade"]);
      this.emit("weather", { weather: this.weather });
      worldAudio.setRain(this.weather === "chuva");
      if (this.rainPts) { this.scene.remove(this.rainPts); this.rainPts = null; }
      if (this.weather === "chuva" && !this.isMobile) {
        const g = new THREE.BufferGeometry();
        const n = 400; const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          pos[i * 3] = this.px + rnd(60, -60); pos[i * 3 + 1] = rnd(40, 4); pos[i * 3 + 2] = this.pz + rnd(60, -60);
        }
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        this.rainPts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.18, transparent: true, opacity: 0.7 }));
        this.scene.add(this.rainPts);
      }
    }
    if (this.rainPts) {
      const pos = this.rainPts.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 40;
        if (y < 0) y = 40;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  }

  // ── BOTS (o mundo nunca está vazio) ───────────────────────
  private spawnBots() {
    const n = this.isMobile ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const name = BOT_NAMES[i % BOT_NAMES.length];
      const faction = i % 2;
      const classId = i % 4;
      const level = 4 + rndi(40, 0);
      const reg = pick(REGIONS.filter(r => !r.hub));
      const a = rnd(Math.PI * 2), d = rnd(reg.r * 0.8);
      const x = reg.cx + Math.cos(a) * d, z = reg.cz + Math.sin(a) * d;
      const group = new THREE.Group();
      const parts = buildAvatar(defaultAvatar(classId), {
        classColor: CLASSES[classId].hex, withWeapon: true, classId,
      });
      group.add(parts.root);
      group.position.set(x, this.terrainHeight(x, z), z);
      this.scene.add(group);
      const fc = FACTIONS[faction];
      this.makeNameTag(group, `${fc.emoji} ${name} Nv${level}`, CLASSES[classId].color, fc.color);
      this.players.set(`bot_${i}`, {
        id: `bot_${i}`, name, faction, level, classId, avatar: parts, group,
        x, z, tx: x, tz: z, hp: 200 + level * 14, maxHp: 200 + level * 14,
        bot: true, coupons: rndi(3, 0) + 1, atkT: 0, roamT: 0, state: "roam",
        txT: 0, targetMob: null, duelWith: null, mountId: null, mesh: null,
        uidHouseProtected: false,
      } as any);
    }
  }

  private updateBots(dt: number) {
    for (const p of this.players.values()) {
      if (!p.bot) continue;
      p.txT -= dt;
      if (p.state === "respawn") { p.state = "roam"; }
      if (p.txT <= 0) {
        p.txT = rnd(6, 3);
        if (Math.random() < 0.4) {
          // caça mob
          p.targetMob = this.mobs.find(m => m.state === "idle" && dist2(m.x, m.z, p.x, p.z) < 2500) || null;
        } else p.targetMob = null;
        const a = rnd(Math.PI * 2), d = rnd(30, 8);
        p.tx = clamp(p.x + Math.cos(a) * d, -390, 390);
        p.tz = clamp(p.z + Math.sin(a) * d, -390, 390);
      }
      let moving = 0;
      const tgt = p.targetMob;
      if (tgt && tgt.state !== "dead") {
        const d = Math.sqrt(dist2(tgt.x, tgt.z, p.x, p.z));
        if (d > 2.4) {
          p.x += (tgt.x - p.x) / d * 4.4 * dt;
          p.z += (tgt.z - p.z) / d * 4.4 * dt;
          moving = 1;
        } else {
          p.atkT -= dt;
          if (p.atkT <= 0) {
            p.atkT = 1.1;
            this.damageMob(tgt, (12 + p.level * 3) * rnd(1.3, 0.7), true, "bot");
          }
        }
      } else {
        const d = Math.sqrt(dist2(p.tx, p.tz, p.x, p.z));
        if (d > 1) {
          p.x += (p.tx - p.x) / d * 3.6 * dt;
          p.z += (p.tz - p.z) / d * 3.6 * dt;
          moving = 1;
        }
      }
      p.group.position.set(p.x, this.terrainHeight(p.x, p.z), p.z);
      const face = tgt ? tgt.x : p.tx;
      p.group.rotation.y = Math.atan2(face - p.x, (tgt ? tgt.z : p.tz) - p.z);
      if (p.avatar) {
        p.phase = moving ? ((p.phase || 0) + dt * 9) : 0;
        const pSwing = p.atkT > 0.75 ? Math.min(1, (1.1 - p.atkT) / 0.35) : 0;
        animateAvatar(p.avatar, p.phase || 0, moving, pSwing, performance.now());
      }
    }
  }

  // ── MULTIPLAYER REAL (Supabase) ───────────────────────────
  private initNet() {
    this.spawnBots();
    try {
      const sb: any = supabase;
      const uid = this.opts.uid;
      this.chan = sb.channel(`bateu-legends-${Math.random().toString(36).slice(2, 8)}`, { config: { presence: { key: uid } } });
      this.chan
        .on("presence", { event: "sync" }, () => {
          const st = this.chan.presenceState();
          for (const [key, arr] of Object.entries<any[]>(st)) {
            if (key === uid) continue;
            const s = arr?.[0]; if (!s) continue;
            let p = this.players.get(key);
            if (!p) {
              const group = new THREE.Group();
              const parts = buildAvatar(parseAvatarKeySafe(s.avatar) || defaultAvatar(s.classId ?? 0), { classColor: CLASSES[s.classId ?? 0]?.hex ?? 0xffffff, withWeapon: true, classId: s.classId ?? 0 });
              group.add(parts.root);
              this.scene.add(group);
              const fc = FACTIONS[s.faction ?? 0] || FACTIONS[0];
              this.makeNameTag(group, `${fc.emoji} ${s.name} Nv${s.level}`, CLASSES[s.classId ?? 0]?.color ?? "#fff", fc.color);
              p = {
                id: key, name: s.name || "Herói", faction: s.faction ?? 0, level: s.level ?? 1,
                classId: s.classId ?? 0, avatar: parts, group, x: s.x ?? 0, z: s.z ?? 0,
                tx: s.x ?? 0, tz: s.z ?? 0, hp: 100, maxHp: 100, bot: false, coupons: 0,
                atkT: 0, roamT: 0, state: "ok", txT: 0, targetMob: null, duelWith: null,
                mountId: null, mesh: null, uidHouseProtected: false,
              };
              this.players.set(key, p);
              this.emit("player-join", { name: p.name, faction: p.faction });
            } else {
              p.level = s.level ?? p.level;
            }
          }
          this.state.online = Math.max(1, Object.keys(this.chan.presenceState()).length);
          this.state.pop = this.state.online;
          this.checkGates();
        })
        .on("broadcast", { event: "pos" }, ({ payload }: any) => {
          if (payload.uid === uid) return;
          const p = this.players.get(payload.uid);
          if (p) { p.tx = payload.x; p.tz = payload.z; p.level = payload.level ?? p.level; }
        })
        .subscribe((status: any) => { if (status === "SUBSCRIBED") { try { this.chan.track({ uid, name: this.opts.name, faction: this.opts.faction, classId: this.opts.classId, level: this.opts.level, avatar: avatarKeySafe(this.opts.avatar), x: this.px, z: this.pz }); } catch { } } });
    } catch { /* offline: bots carregam o mundo */ }
  }

  private netSync(dt: number) {
    this.syncT -= dt;
    if (this.syncT > 0 || !this.chan) return;
    this.syncT = 1 / 6;
    try {
      this.chan.send({ type: "broadcast", event: "pos", payload: { uid: this.opts.uid, x: Math.round(this.px * 10) / 10, z: Math.round(this.pz * 10) / 10, level: this.opts.level } });
      try { this.chan.track({ uid: this.opts.uid, name: this.opts.name, faction: this.opts.faction, classId: this.opts.classId, level: this.opts.level, avatar: avatarKeySafe(this.opts.avatar), x: this.px, z: this.pz }); } catch { }
    } catch { }
    // interpolação remota
    for (const p of this.players.values()) {
      if (p.bot) continue;
      const d = Math.sqrt(dist2(p.tx, p.tz, p.x, p.z));
      if (d > 0.2) {
        p.x += (p.tx - p.x) * Math.min(1, dt * 6);
        p.z += (p.tz - p.z) * Math.min(1, dt * 6);
        p.group.position.set(p.x, this.terrainHeight(p.x, p.z), p.z);
      }
    }
  }

  // ── MUNDO QUE CRESCE ──────────────────────────────────────
  setPopulation(n: number) {
    this.state.pop = Math.max(this.state.pop, n);
    this.checkGates();
  }

  private checkGates() {
    for (const reg of REGIONS) {
      if (!reg.locked || this.unlocked.has(reg.id)) continue;
      const okLvl = this.opts.level >= (reg.lockLvl || 999);
      const okPop = this.state.pop >= (reg.lockPop || Infinity);
      if (okLvl || okPop) {
        this.unlocked.add(reg.id);
        this.emit("unlock", { region: reg.id, name: reg.name });
        this.emit("announce", { text: `🌍 NOVA TERRA DESBLOQUEADA: ${reg.name}!`, emoji: "🌍" });
        worldAudio.play("discover");
      }
    }
  }

  isRegionLocked(regId: string): boolean {
    const reg = REGIONS.find(r => r.id === regId);
    if (!reg?.locked) return false;
    return !this.unlocked.has(reg.id) && !(this.opts.level >= (reg.lockLvl || 999));
  }

  // ── HOOKS DE TESTE/INTEGRAÇÃO ─────────────────────────────
  gainXpPublic(n: number) { this.gainXp(n); }
  spawnTestMobPublic(elite = false): MobEnt | null {
    // espécie AGRESSIVA (neutras só reagem — comportamento oficial)
    const t = MOB_TYPES.find(m => !m.neutral && (m.aggro ?? 0) > 0) || MOB_TYPES[0];
    const a = rnd(Math.PI * 2);
    const m = this.spawnMob(t, this.px + Math.cos(a) * 3, this.pz + Math.sin(a) * 3, -1, {
      isElite: elite, lvlOverride: Math.max(1, this.opts.level),
    });
    if (elite) { m.hp = Math.round(m.maxHp * 0.35); }
    else { m.hp = Math.min(m.maxHp, 60); m.maxHp = Math.max(m.maxHp, 60); } // determinismo E2E
    return m;
  }
  testTeleport(x: number, z: number) {
    this.px = x; this.pz = z;
    this.pGroup.position.set(x, this.terrainHeight(x, z), z);
  }
  testHurt(dmg: number) { this.hurtPlayer(dmg, "teste"); }
  /** Cura total + revive no lugar (uso de testes E2E). */
  testHeal() {
    this.dead = false;
    this.state.dead = false;
    this.hp = this.state.maxHp;
    this.mp = this.state.maxMp;
    this.iFrames = 0;
  }

  // __TESTHOOK__
  /** Invoca um VILÃO da plataforma junto do herói (testes/demo). */
  spawnVillainPublic(): MobEnt | null {
    const v = pick(VILLAINS);
    const t = MOB_TYPES.find(m => m.tier === Math.min(v.tier, 8)) || MOB_TYPES[MOB_TYPES.length - 1];
    const a = rnd(Math.PI * 2);
    const m = this.spawnMob(t, this.px + Math.cos(a) * 5, this.pz + Math.sin(a) * 5, -1, {
      isVillain: true, name: `${v.emoji} ${v.name}`, mech: v.mech as any,
      lvlOverride: Math.max(1, this.opts.level + 2),
    });
    m.hp = Math.round(m.maxHp * 0.2); // versão de teste: 20% da vida
    return m;
  }

  // __TESTHOOK__
  /** Deixa todos os vilões vivos a 1hp (golpe determinístico em testes). */
  weakenVillainsPublic() {
    for (const m of this.mobs) if (m.isVillain && m.state !== "dead") m.hp = 1;
  }

  // __TESTHOOK__
  /** Alias de testHeal (usado pela suíte E2E). */
  healPublic() {
    this.testHeal();
  }

  // ── DUELOS 1v1 (arena) ────────────────────────────────────
  private duelMob: MobEnt | null = null;
  private duelWager = 0;

  startDuel(opponentName?: string, wager = 500): boolean {
    if (this.duelMob && this.duelMob.state !== "dead") return false;
    const myLvl = this.opts.level;
    const t = MOB_TYPES.find(m => m.tier === clamp(Math.ceil(myLvl / 8), 1, 8)) || MOB_TYPES[0];
    const name = opponentName || pick(BOT_NAMES);
    const x = rnd(6, -6), z = 46 + rnd(6, -6);
    const m = this.spawnMob(t, x, z, -1, { name: `⚔ ${name}`, mech: undefined, lvlOverride: Math.max(1, myLvl) });
    m.isBoss = false; m.isElite = false;
    m.hp = Math.round(120 + myLvl * 42); m.maxHp = m.hp;
    this.duelMob = m;
    this.duelWager = wager;
    this.px = x - 4; this.pz = 46;
    this.pGroup.position.set(this.px, this.terrainHeight(this.px, this.pz), this.pz);
    this.target = m;
    this.emit("duel", { action: "start", opponent: name, wager });
    this.emit("announce", { text: `⚔ DUELO contra ${name} — aposta ${wager} ouro!`, emoji: "⚔️" });
    worldAudio.play("join");
    return true;
  }

  private updateDuel(dt: number) {
    if (!this.duelMob) return;
    if (this.duelMob.state === "dead") {
      this.emit("duel", { action: "win", wager: this.duelWager });
      this.state.gold += this.duelWager;
      this.emit("quest", { kind: "duel" });
      this.emit("announce", { text: `🏆 VENCESTE O DUELO! +${this.duelWager} ouro`, emoji: "🏆" });
      this.duelMob = null;
      worldAudio.play("chest");
    } else if (this.hp <= this.state.maxHp * 0.02) {
      this.emit("duel", { action: "lose" });
      this.state.gold = Math.max(0, this.state.gold - Math.round(this.duelWager * 0.5));
      this.duelMob.state = "dead"; this.duelMob.deadT = 0.5; this.duelMob.group.visible = false;
      this.duelMob = null;
    }
  }

  // ── INTERAÇÃO ─────────────────────────────────────────────
  nearestInteract(): { id: string; name: string; emoji: string; dist: number } | null {
    let best: any = null; let bd = 6.5 * 6.5;
    for (const l of LANDMARKS) {
      const d = dist2(this.px, this.pz, l.x, l.z);
      if (d < Math.max(bd, l.r * l.r) && d < l.r * l.r + 16) { bd = d; best = { id: l.id, name: l.name, emoji: l.emoji, dist: Math.sqrt(d) }; }
    }
    if (!best) {
      // baús escondidos têm prioridade de proximidade
      for (const c of this.chestEnts) {
        if (!c.group.visible) continue;
        if (this.meta.date === todayStr() && this.meta.chests.includes(c.id)) continue;
        const dd = dist2(this.px, this.pz, c.x, c.z);
        if (dd < 30) best = { id: c.id, name: "Baú Escondido", emoji: "🧰", dist: Math.sqrt(dd) };
      }
    }
    if (!best) {
      for (const m of this.miraEnts) {
        if (this.meta.miradouros.includes(m.id)) continue;
        const dd = dist2(this.px, this.pz, m.x, m.z);
        if (dd < 42) best = { id: m.id, name: MIRADOUROS.find(x => x.id === m.id)?.name || "Miradouro", emoji: "🗼", dist: Math.sqrt(dd) };
      }
    }
    if (!best) {
      for (const d of DUNGEONS) {
        const dd = dist2(this.px, this.pz, d.x, d.z);
        if (dd < 36) best = { id: `dungeon_${d.id}`, name: d.name, emoji: d.emoji, dist: Math.sqrt(dd) };
      }
    }
    return best;
  }

  interact(): string | null {
    const it = this.nearestInteract();
    if (!it) return null;
    worldAudio.play("click");
    if (it.id === "portal_v") { this.teleportTo("fortaleza"); return "teleport"; }
    if (it.id === "portal_t") { this.teleportTo("bastiao"); return "teleport"; }
    if (it.id.startsWith("mira_")) { this.activateMiradouro(it.id); return "miradouro"; }
    if (it.id.startsWith("chest_")) { this.openChest(it.id); return "chest"; }
    if (it.id.startsWith("dungeon_")) { this.enterDungeon(it.id.replace("dungeon_", "")); return "dungeon"; }
    this.emit("interact", { id: it.id, name: it.name });
    return it.id;
  }

  teleportTo(regionId: string) {
    // viagem rápida a miradouros ativados (REA Elden Ring: liberal)
    if (regionId.startsWith("mira_")) {
      const mi = MIRADOUROS.find(m => m.id === regionId);
      if (!mi || !this.meta.miradouros.includes(mi.id) || this.isRegionLocked(mi.region)) { worldAudio.play("deny"); return; }
      this.px = mi.x + rnd(4, -4); this.pz = mi.z + rnd(4, -4);
      this.pGroup.position.set(this.px, this.terrainHeight(this.px, this.pz), this.pz);
      this.emit("announce", { text: `🌀 Viagem rápida: ${mi.name}`, emoji: "🌀" });
      worldAudio.play("waypoint");
      return;
    }
    const reg = REGIONS.find(r => r.id === regionId);
    if (!reg || this.isRegionLocked(regionId)) { worldAudio.play("deny"); return; }
    this.px = reg.cx + rnd(8, -8); this.pz = reg.cz + rnd(8, -8);
    this.pGroup.position.set(this.px, this.terrainHeight(this.px, this.pz), this.pz);
    this.emit("announce", { text: `🌀 Viajaste para ${reg.name}`, emoji: "🌀" });
    worldAudio.play("waypoint");
  }

  // ── STATS EXTERNOS (UI aplica equipamento/pontos) ─────────
  setStats(stats: EngineStats, level: number) {
    const hpRatio = this.hp / Math.max(1, this.state.maxHp);
    const mpRatio = this.mp / Math.max(1, this.state.maxMp);
    this.opts.stats = stats;
    this.opts.level = level;
    this.state.level = level;
    this.state.maxHp = stats.maxHp; this.state.maxMp = stats.maxMp;
    this.hp = Math.min(stats.maxHp, Math.max(1, stats.maxHp * hpRatio));
    this.mp = Math.min(stats.maxMp, Math.max(0, stats.maxMp * mpRatio));
  }

  setSkillRanks(ranks: number[]) { this.skillRanks = ranks; }
  setHotbar(h: (number | null)[]) { this.hotbar = h; }

  usePotion(kind: string): boolean {
    if (kind === "vida") {
      if (this.hp >= this.state.maxHp) return false;
      this.hp = Math.min(this.state.maxHp, this.hp + this.state.maxHp * 0.45);
    } else {
      const map: Record<string, string> = { forca: "forcapocao", vento: "ventopocao", guarda: "guardapocao" };
      const bid = map[kind]; if (!bid) return false;
      this.state.buffs = this.state.buffs.filter(b => b.id !== bid);
      this.state.buffs.push({ id: bid, t: 60 });
    }
    worldAudio.play("heal");
    return true;
  }

  // ── INPUT ─────────────────────────────────────────────────
  private bindInput() {
    const el = this.renderer.domElement;
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKeyUp);
    el.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("wheel", this.onWheel, { passive: true });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k >= "1" && k <= "6") this.castSkill(parseInt(k) - 1);
    if (k === " ") { this.dodge(); e.preventDefault(); }
    if (k === "e") this.interact();
    if (k === "f") { /* atacar segurado no update */ }
    if (k === "q") this.cycleTarget();
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 2) return;
    this.dragging = true; this.lastPX = e.clientX; this.lastPY = e.clientY;
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPX, dy = e.clientY - this.lastPY;
    this.lastPX = e.clientX; this.lastPY = e.clientY;
    this.camYaw -= dx * 0.006;
    this.camPitch = clamp(this.camPitch + dy * 0.005, 0.08, 1.35);
  };
  private onPointerUp = () => { this.dragging = false; };
  private onWheel = (e: WheelEvent) => {
    this.camDist = clamp(this.camDist + (e.deltaY > 0 ? 2 : -2), 7, 34);
  };

  // API mobile
  setMoveVec(x: number, y: number) { this.moveVec.x = x; this.moveVec.y = y; }
  requestAttack() { this.tryAutoAttack(); }
  dodge() {
    if (this.dead || this.dodgeT > 0) return;
    this.dodgeT = 2.2;
    this.iFrames = 0.4;
    const mv = this.moveInput();
    const ang = mv.len > 0.1 ? Math.atan2(mv.x, mv.y) : this.pYaw;
    this.dodgeDir.set(Math.sin(ang), 0, Math.cos(ang));
    worldAudio.play("swing");
  }
  cycleTarget() {
    let best: MobEnt | null = null; let bd = 28 * 28;
    for (const m of this.mobs) {
      if (m.state === "dead" || !m.group.visible) continue;
      const d = dist2(m.x, m.z, this.px, this.pz);
      if (d < bd) { bd = d; best = m; }
    }
    if (best) { this.target = best; worldAudio.play("click"); }
  }

  private moveInput(): { x: number; y: number; len: number } {
    let x = this.moveVec.x, y = this.moveVec.y;
    if (this.keys.has("w") || this.keys.has("arrowup")) y += 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y -= 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    const len = Math.min(1, Math.hypot(x, y));
    if (len > 0) { x /= Math.max(1, Math.hypot(x, y)); y /= Math.max(1, Math.hypot(x, y)); }
    return { x, y, len };
  }

  // ── UPDATE DO JOGADOR ─────────────────────────────────────
  private updatePlayer(dt: number) {
    // cooldowns / buffs / regen
    for (let i = 0; i < 6; i++) if (this.cds[i] > 0) this.cds[i] -= dt;
    this.state.cds = [...this.cds];
    for (let i = this.state.buffs.length - 1; i >= 0; i--) {
      this.state.buffs[i].t -= dt;
      if (this.state.buffs[i].t <= 0) this.state.buffs.splice(i, 1);
    }
    if (this.iFrames > 0) this.iFrames -= dt;
    if (this.dodgeT > 0) this.dodgeT -= dt;
    this.atkT -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.comboN = 0; }
    if (!this.dead) {
      this.mp = Math.min(this.state.maxMp, this.mp + this.state.maxMp * 0.05 * dt);
      this.hp = Math.min(this.state.maxHp, this.hp + this.state.maxHp * 0.012 * dt);
    }

    if (this.dead) return;
    const mv = this.moveInput();
    let speed = this.opts.stats.spd * (this.mountId ? (MOUNTS.find(m => m.id === this.mountId)?.mult || 1.4) : 1);
    if (this.state.buffs.find(b => b.id === "ventopocao")) speed *= 1.35;
    if (this.state.buffs.find(b => b.id === "guerra")) speed *= 1.2;
    if (mv.len > 0.05) {
      // direção relativa à câmara
      const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
      const rx = Math.sin(this.camYaw + Math.PI / 2), rz = Math.cos(this.camYaw + Math.PI / 2);
      let dx = fx * mv.y + rx * mv.x, dz = fz * mv.y + rz * mv.x;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      if (this.dodgeT > 1.8) {
        this.px += this.dodgeDir.x * 22 * dt;
        this.pz += this.dodgeDir.z * 22 * dt;
      } else {
        this.px += dx * speed * dt;
        this.pz += dz * speed * dt;
      }
      this.pYaw = Math.atan2(dx, dz);
      this.px = clamp(this.px, -405, 405);
      this.pz = clamp(this.pz, -405, 405);
    }
    const walk = mv.len > 0.05 || this.dodgeT > 1.8 ? 1 : 0;
    this.py = this.terrainHeight(this.px, this.pz);
    this.pGroup.position.set(this.px, this.py, this.pz);
    this.pGroup.rotation.y = this.pYaw;
    // v18 FIX: assinatura completa do animateAvatar — antes faltava tMs
    // (undefined → sin(NaN) → bobY NaN → corpo do herói invisível)
    this.animPhase = walk ? (this.animPhase + dt * (this.mountId ? 11.5 : 9)) : 0;
    const swingT = this.atkT > 0 ? Math.max(0, 1 - this.atkT / (this.atkDur || 0.9)) : 0;
    animateAvatar(this.player, this.animPhase, walk, swingT, performance.now());

    // ataque segurando F
    if (this.keys.has("f")) this.tryAutoAttack();

    // regiões + descoberta
    const reg = this.regionAt(this.px, this.pz);
    if (reg.id !== this.state.region) {
      this.state.region = reg.id;
      this.emit("region", { id: reg.id, name: reg.name, danger: reg.danger });
      worldAudio.play("region");
    }
    // marcos
    for (const l of LANDMARKS) {
      if (dist2(this.px, this.pz, l.x, l.z) < l.r * l.r) {
        this.emit("near-landmark", { id: l.id, name: l.name, emoji: l.emoji, desc: l.desc });
        break;
      }
    }
    // torres + masmorra + duelo
    this.updateTowers(dt);
    this.updateDungeon(dt);
    this.updateDuel(dt);
  }

  // ── CÂMARA ────────────────────────────────────────────────
  private updateCamera(dt: number) {
    const target = new THREE.Vector3(this.px, this.py + 2.2, this.pz);
    if (this.camMode === "1p") {
      const hx = this.px - Math.sin(this.pYaw) * 0.4;
      const hz = this.pz - Math.cos(this.pYaw) * 0.4;
      this.cam.position.lerp(new THREE.Vector3(hx, this.py + 2.9, hz), Math.min(1, dt * 14));
      this.cam.lookAt(this.px + Math.sin(this.pYaw) * 8, this.py + 2.4, this.pz + Math.cos(this.pYaw) * 8);
      this.pGroup.visible = false;
      return;
    }
    this.pGroup.visible = true;
    const cx = target.x + Math.sin(this.camYaw) * this.camDist * Math.cos(this.camPitch);
    const cz = target.z + Math.cos(this.camYaw) * this.camDist * Math.cos(this.camPitch);
    const cy = target.y + Math.sin(this.camPitch) * this.camDist + 2;
    this.cam.position.lerp(new THREE.Vector3(cx, Math.max(cy, this.terrainHeight(cx, cz) + 1.6), cz), Math.min(1, dt * 9));
    this.cam.lookAt(target);
  }

  toggleCamera(): "3p" | "1p" {
    this.camMode = this.camMode === "3p" ? "1p" : "3p";
    return this.camMode;
  }

  // ── DADOS PARA O HUD ──────────────────────────────────────
  getState() {
    const reg = this.regionAt(this.px, this.pz);
    this.state.hp = Math.max(0, Math.round(this.hp));
    this.state.mp = Math.round(this.mp);
    this.state.x = this.px; this.state.z = this.pz;
    const tg = this.target as MobEnt;
    this.state.target = tg && tg.state !== "dead" && tg.group.visible ? {
      name: tg.name, hp: Math.max(0, Math.round(tg.hp)), maxHp: tg.maxHp, lvl: tg.lvl,
      isBoss: tg.isBoss || tg.isWorld || tg.isVillain || tg.isElite,
      kind: tg.isVillain ? "vilao" : tg.isWorld ? "mundo" : tg.isBoss ? "chefe" : tg.isElite ? "elite" : "mob",
    } : null;
    this.state.region = reg.id;
    return this.state;
  }

  getBossBar() {
    // prioridade: duel > vilão > mundial > chefe de região em combate
    const cands = this.mobs.filter(m => m.state !== "dead" && m.group.visible &&
      (m.isWorld || m.isVillain || m.isBoss || m === this.duelMob) && dist2(m.x, m.z, this.px, this.pz) < 3600);
    if (cands.length === 0) return null;
    cands.sort((a, b) => (b.isWorld ? 4 : b.isVillain ? 3 : b.isBoss ? 2 : 1) - (a.isWorld ? 4 : a.isVillain ? 3 : a.isBoss ? 2 : 1));
    const m = cands[0];
    return { name: m.name, hp: Math.max(0, Math.round(m.hp)), maxHp: m.maxHp, kind: m.isVillain ? "VILÃO DA PLATAFORMA" : m.isWorld ? "CHEFE MUNDIAL" : m === this.duelMob ? "DUELO" : "CHEFE" };
  }

  getMinimapData() {
    return {
      px: this.px, pz: this.pz, yaw: this.camYaw,
      regions: REGIONS.map(r => ({ id: r.id, name: r.name, cx: r.cx, cz: r.cz, r: r.r, color: r.color, danger: r.danger, locked: this.isRegionLocked(r.id), hub: !!r.hub })),
      towers: this.towers.map(t => ({ id: t.id, x: t.x, z: t.z, owner: t.owner, emoji: TOWERS.find(x => x.id === t.id)?.emoji || "🏳️" })),
      mobs: this.mobs.filter(m => m.state !== "dead" && m.group.visible && dist2(m.x, m.z, this.px, this.pz) < 3600).slice(0, 24).map(m => ({ x: m.x, z: m.z, boss: m.isBoss || m.isWorld || m.isVillain, elite: m.isElite })),
      players: [...this.players.values()].filter(p => dist2(p.x, p.z, this.px, this.pz) < 3600).map(p => ({ x: p.x, z: p.z, faction: p.faction, name: p.name })),
      landmarks: LANDMARKS.map(l => ({ id: l.id, x: l.x, z: l.z, emoji: l.emoji, name: l.name })),
      dungeons: DUNGEONS.map(d => ({ id: d.id, x: d.x, z: d.z, emoji: d.emoji })),
    };
  }

  getTowers() { return this.towers.map(t => ({ id: t.id, name: t.name, owner: t.owner })); }
  getFame() { return this.fameSession; }
  getOnline() { return Math.max(this.state.online, this.players.size + 1); }
  getHousing() { return this.myHouse ? { built: { ...this.myHouse.built }, vault: this.myHouse.vault, towerHp: this.myHouse.towerHp, towerMax: this.myHouse.towerMax, x: this.myHouse.x, z: this.myHouse.z } : null; }
  getWeather() { return this.weather; }
  getTimeOfDay() { return this.timeOfDay; }
  getDungeonState() { return this.dungeon ? { name: this.dungeon.def.name, wave: this.dungeon.wave, waves: this.dungeon.def.waves, boss: this.dungeon.state === "boss" } : null; }

  // ── LOOP ──────────────────────────────────────────────────
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.updatePlayer(dt);
    this.updateMobs(dt);
    this.updateProjs(dt);
    this.updateFx(dt);
    this.updateWorldSpawns(dt);
    this.updateBots(dt);
    this.updateNodes(dt);
    this.updateEvents(dt);
    this.updateLootFields(dt);
    this.updateExploration(dt);
    this.updateSky(dt);
    this.netSync(dt);
    this.updateCamera(dt);
    // FPS adaptativo: degrada sob pressão, RECUPERA nitidez quando estabiliza
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc >= 1) {
      const fps = this.fpsN / this.fpsAcc;
      this.state.fps = Math.round(fps);
      const baseDpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2);
      if (fps < 26) {
        this.lowFpsT++;
        if (this.lowFpsT === 2) {
          this.particleBudget = 0.5;
          this.renderer.setPixelRatio(Math.min(baseDpr, 1.2));
        } else if (this.lowFpsT === 4) {
          this.renderer.setPixelRatio(1);
        }
      } else if (fps > 45 && this.lowFpsT > 0) {
        this.lowFpsT--;
        if (this.lowFpsT === 1) this.renderer.setPixelRatio(Math.min(baseDpr, 1.2));
        else if (this.lowFpsT === 0) this.renderer.setPixelRatio(baseDpr);
      }
      this.fpsAcc = 0; this.fpsN = 0;
    }
    this.renderer.render(this.scene, this.cam);
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    try { this.chan?.removeChannel?.(); } catch { try { (this.chan as any)?.unsubscribe?.(); } catch { } }
    worldAudio.setRain(false);
    this.renderer.dispose();
    try { this.renderer.domElement.remove(); } catch { }
  }
}

// ── helpers de avatar ─────────────────────────────────────
function avatarKeySafe(cfg: any): string { try { return avatarKey(cfg); } catch { return ""; } }
function parseAvatarKeySafe(s: any): AvatarConfig | null { try { return parseAvatarKey(s); } catch { return null; } }
