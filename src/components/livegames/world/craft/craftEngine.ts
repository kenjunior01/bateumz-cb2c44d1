// ============================================================
// BATEUCRAFT — Motor voxel 3D (REA de Minecraft)
// Mundo em chunks, mineração, construção, crafting, fornalhas,
// baús, mobs, ciclo dia/noite, habilidades KI e acesso à plataforma.
// Renderização: three.js, 1 draw call por chunk, AO nos vértices,
// texturas pixel-art procedurais (0% direitos de autor).
// ============================================================
import * as THREE from "three";
import {
  B, BLOCKS, ITEMS, RECIPES, SELL_PRICES, SELL_BLOCK_PRICES,
  paintAtlas, ATLAS_COLS, ATLAS_ROWS, TILE_PX, T,
  Stack, makeStack, maxStack, stackId, nameOf, Recipe,
} from "./craftData";

// ── Constantes do mundo ─────────────────────────────────────
const CS = 16;          // chunk xz
const CH = 64;          // altura do mundo
const SEA = 26;
const DAY_LEN = 480;    // segundos por dia (8 min)
const REACH = 4.6;
const GRAV = 28;
const JUMP_V = 8.8;
const WALK = 4.3, SPRINT = 5.9, SNEAK_SP = 1.5, FLY_SP = 10;
const PW = 0.3, PH = 1.8, EYE = 1.62;

export interface CraftOpts {
  name: string;
  classId: number;
  level: number;
  uid: string;
  isTouch: boolean;
  onEvent: (ev: any) => void;
}

// ── Ruído determinístico ────────────────────────────────────
function hash2(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function hash3(x: number, y: number, z: number, s: number): number {
  return hash2(x * 31 + z, y * 17 + z * 7, s);
}
function smooth(t: number) { return t * t * (3 - 2 * t); }
function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, s: number, oct = 3): number {
  let v = 0, amp = 0.55, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { v += vnoise(x * f, y * f, s + i * 101) * amp; tot += amp; amp *= 0.5; f *= 2.1; }
  return v / tot;
}

// ── Geração de terreno ──────────────────────────────────────
interface Chunk { d: Uint8Array; cx: number; cz: number; meshO?: THREE.Mesh; meshT?: THREE.Mesh; dirty: boolean }

function terrainH(wx: number, wz: number, seed: number): number {
  const cont = fbm(wx * 0.0035, wz * 0.0035, seed, 2);
  const hills = fbm(wx * 0.011, wz * 0.011, seed + 55, 2); // suave — colinas rolantes
  const m = Math.max(0, cont - 0.60) / 0.4;
  let h = 21 + cont * 10 + hills * 10 + m * m * 26;
  return Math.max(3, Math.min(CH - 8, Math.round(h)));
}
function biomeAt(wx: number, wz: number, h: number, seed: number): "floresta" | "planície" | "deserto" | "montanha" | "neve" {
  if (h >= 46) return "neve";
  if (h >= 40) return "montanha";
  const temp = fbm(wx * 0.0035 + 900, wz * 0.0035, seed + 77, 2);
  const moist = fbm(wx * 0.0045, wz * 0.0045 + 900, seed + 123, 2);
  if (temp > 0.60 && moist < 0.47) return "deserto";
  if (moist > 0.52) return "floresta";
  return "planície";
}
function isCave(wx: number, y: number, wz: number, seed: number): boolean {
  const a = vnoise(wx * 0.075, y * 0.11, seed + 301);
  const b = vnoise(wx * 0.075 + 400, y * 0.11 + 400, seed + 401);
  const c = vnoise(wz * 0.075 + 800, y * 0.09 + 800, seed + 501);
  return a > 0.62 && b > 0.62 && c > 0.55;
}
function oreAt(wx: number, y: number, wz: number, seed: number): number {
  const r = hash3(wx, y, wz, seed + 909);
  if (y < 10 && r < 0.0028) return B.CRYSTAL_ORE;
  if (y < 14 && r < 0.006) return B.DIAMOND_ORE;
  if (y < 20 && r < 0.011) return B.GOLD_ORE;
  if (y < 34 && r < 0.019) return B.IRON_ORE;
  if (y < 46 && r < 0.03) return B.COAL_ORE;
  if (r > 0.985) return B.GRAVEL;
  return B.STONE;
}

// ── Motor principal ─────────────────────────────────────────
export class CraftEngine {
  private canvas: HTMLCanvasElement;
  private opts: CraftOpts;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private atlasTex!: THREE.CanvasTexture;
  private matO!: THREE.MeshBasicMaterial;
  private matT!: THREE.MeshBasicMaterial;
  private crackMats: THREE.MeshBasicMaterial[] = [];
  private crackMesh!: THREE.Mesh;
  private outline!: THREE.LineSegments;

  private chunks = new Map<string, Chunk>();
  private edits = new Map<string, Map<number, number>>();   // chunkKey → (idx → id)
  private lightBlocks = new Map<string, { x: number; y: number; z: number; i: number }>();
  private meshQueue = new Set<string>();
  private genQueue: string[] = [];

  private torchLights: THREE.PointLight[] = [];
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;
  private sunPivot!: THREE.Object3D;
  private stars!: THREE.Points;
  private clouds!: THREE.Group;

  // jogador
  private p = { x: 8.5, y: 40, z: 8.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: false, fly: false, sprint: false, sneak: false, inWater: false, headWater: false };
  private spawn = { x: 8.5, y: 40, z: 8.5 };
  private hp = 20; private maxHp = 20; private hunger = 20; private air = 10; private energy = 100;
  private exhaustion = 0; private regenT = 0; private starveT = 0; private fallFrom = 0; private airT = 0;
  private dead = false; private deadT = 0;
  private camMode = 0;
  private playerLevel = 1;
  private playerBody?: THREE.Group;

  // inventário
  inv: (Stack | null)[] = new Array(36).fill(null);
  sel = 0;

  // painéis de mundo
  private chests = new Map<string, (Stack | null)[]>();     // "x,y,z" → 27
  private furnaces = new Map<string, { inp: Stack | null; fuel: Stack | null; out: Stack | null; burn: number; cook: number }>();
  private openChest: string | null = null;
  private openFurn: string | null = null;

  // entidades
  private mobs: any[] = [];
  private drops: any[] = [];
  private arrows: any[] = [];
  private parts!: { pts: THREE.Points; pos: Float32Array; col: Float32Array; vel: Float32Array; life: Float32Array; n: number };

  // input
  private input = { mx: 0, my: 0, jump: false, sneak: false, sprint: false, up: false, down: false, break: false };
  private lookAcc = { dx: 0, dy: 0 };
  private keys = new Set<string>();
  private locked = false;
  private breakTarget: { x: number; y: number; z: number } | null = null;
  private breakProg = 0; private breakTime = 0; private breakAcc = 0;
  private attackCd = 0; private placeCd = 0; private dashCd = 0; private kiCd = 0;
  private ability = { dash: false, ki: false, fly: false };

  // tempo/mundo
  private time = 0.16; private day = 1;
  private seed: number;
  private stats = { mined: 0, placed: 0, kills: 0, diamonds: 0, crystals: 0, deaths: 0, crafted: 0 };
  private firsts = new Set<string>();
  private nearTable = false;
  private fpsEma = 60; private dpr = 1.5; private meshR = 4; private dataR = 5;
  private renderDist = 4;
  private muted = false;
  private audioCtx?: AudioContext;
  private stepAlt = 0; private stepT = 0;
  private saveT = 0; private saveDirty = false; private hadSave = false;
  private lightT = 0; private spawnT = 0; private hudT = 0;
  private raf = 0; private last = 0; private disposed = false; private ready = false;
  private target: { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null = null;
  private biome = "planície";
  private camDist = 4;

  onHud: (h: any) => void = () => {};
  onInv: () => void = () => {};
  onUi: (a: { open?: string; close?: boolean }) => void = () => {};

  constructor(canvas: HTMLCanvasElement, opts: CraftOpts) {
    this.canvas = canvas;
    this.opts = opts;
    this.seed = 1337 + (Math.abs(this.strHash(opts.uid || "bateu")) % 90000);
    this.playerLevel = opts.level || 1;
    this.unlockAbilities();
    this.initGl();
    this.loadSave();
    if (!this.hadSave) this.findSpawn(); // ⛏ só procura spawn em mundos NOVOS
    this.bindInput();
    this.loop(performance.now());
  }

  private strHash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  // ── GL ─────────────────────────────────────────────────────
  private initGl(): void {
    const isTouch = this.opts.isTouch;
    this.dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.7 : 2);
    this.meshR = isTouch ? 3 : 5;
    this.dataR = this.meshR + 1;
    this.renderDist = this.meshR;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.canvas.clientWidth || 300, this.canvas.clientHeight || 150, false);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, this.meshR * CS * 0.72, this.meshR * CS * 0.99);

    this.camera = new THREE.PerspectiveCamera(75, 1.6, 0.08, 300);

    // atlas
    const atlas = paintAtlas();
    (window as any).__bateuAtlas = atlas;
    this.atlasTex = new THREE.CanvasTexture(atlas);
    this.atlasTex.magFilter = THREE.NearestFilter;
    this.atlasTex.minFilter = THREE.NearestFilter;
    this.atlasTex.generateMipmaps = false;
    this.matO = new THREE.MeshBasicMaterial({ map: this.atlasTex, vertexColors: true });
    this.matT = new THREE.MeshBasicMaterial({ map: this.atlasTex, vertexColors: true, transparent: true, side: THREE.DoubleSide, alphaTest: 0.02 });

    // rachaduras
    for (let s = 0; s < 10; s++) {
      const tex = this.tileTexture(T.CRACK0 + s);
      this.crackMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    }
    const cg = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    this.crackMesh = new THREE.Mesh(cg, this.crackMats[0]);
    this.crackMesh.visible = false;
    this.scene.add(this.crackMesh);

    // contorno do bloco-alvo
    const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.outline = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 }));
    this.outline.visible = false;
    this.scene.add(this.outline);

    // luzes (só afetam Lambert dos mobs/jogador; terreno usa vertex colors)
    this.hemi = new THREE.HemisphereLight(0xbcd8ff, 0x6b5b47, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d0, 0.8);
    this.sun.position.set(40, 80, 20);
    this.scene.add(this.sun);
    const nLights = this.opts.isTouch ? 1 : 3;
    for (let i = 0; i < nLights; i++) {
      const l = new THREE.PointLight(0xffb864, 0, 11, 1.6);
      this.torchLights.push(l);
      this.scene.add(l);
    }

    // céu: sol/lua/estrelas
    this.sunPivot = new THREE.Object3D();
    this.scene.add(this.sunPivot);
    const sunTex = this.skyTile([[0xfff3b0, 0], [0xffe066, 1]], true);
    const moonTex = this.skyTile([[0xe8ecf5, 0], [0xc9d2e8, 1]], false);
    const sunM = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
    sunM.position.set(0, 120, 0); sunM.rotation.x = Math.PI / 2;
    this.sunPivot.add(sunM);
    const moonM = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false }));
    moonM.position.set(0, -120, 0); moonM.rotation.x = -Math.PI / 2;
    this.sunPivot.add(moonM);
    // estrelas
    const starN = 260; const sp = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.9);
      sp[i * 3] = Math.sin(ph) * Math.cos(th) * 190; sp[i * 3 + 1] = Math.cos(ph) * 190; sp[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 190;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.scene.add(this.stars);

    // nuvens estilo Minecraft — blocos brancos a deriva
    this.clouds = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const cw = 10 + Math.random() * 18, cd = 8 + Math.random() * 12;
      const c = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.9, cd), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false }));
      c.position.set((Math.random() - 0.5) * 240, 80 + Math.random() * 9, (Math.random() - 0.5) * 240);
      this.clouds.add(c);
    }
    this.scene.add(this.clouds);

    // partículas
    const PN = 140;
    const pg = new THREE.BufferGeometry();
    const pp = new Float32Array(PN * 3), pc = new Float32Array(PN * 3);
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    pg.setAttribute("color", new THREE.BufferAttribute(pc, 3));
    this.parts = { pts: new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false })), pos: pp, col: pc, vel: new Float32Array(PN * 3), life: new Float32Array(PN), n: PN };
    this.parts.pts.frustumCulled = false;
    for (let i = 0; i < PN; i++) pp[i * 3 + 1] = -999;
    this.scene.add(this.parts.pts);

    // corpo do jogador (3ª pessoa)
    this.playerBody = this.buildHumanoid(0x2f6fd0, 0xf2c94c, 0x5d3f1f);
    this.playerBody.visible = false;
    this.scene.add(this.playerBody);

    this.resize();
    window.addEventListener("resize", this.resize);
  }

  private tileTexture(tile: number): THREE.CanvasTexture {
    const atlas = (window as any).__bateuAtlas as HTMLCanvasElement;
    const cv = document.createElement("canvas"); cv.width = TILE_PX; cv.height = TILE_PX;
    const g = cv.getContext("2d")!;
    g.drawImage(atlas, (tile % ATLAS_COLS) * TILE_PX, Math.floor(tile / ATLAS_COLS) * TILE_PX, TILE_PX, TILE_PX, 0, 0, TILE_PX, TILE_PX);
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  }
  private skyTile(cols: [number, number][], sun: boolean): THREE.CanvasTexture {
    const cv = document.createElement("canvas"); cv.width = 32; cv.height = 32;
    const g = cv.getContext("2d")!;
    if (sun) { g.fillStyle = "#ffe066"; g.fillRect(4, 4, 24, 24); g.fillStyle = "#fff3b0"; g.fillRect(8, 8, 16, 16); }
    else { g.fillStyle = "#c9d2e8"; g.fillRect(6, 6, 20, 20); g.fillStyle = "#a8b4cc"; g.fillRect(10, 12, 4, 4); g.fillRect(18, 18, 5, 3); }
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  }

  private resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  };

  // ── Chunks ─────────────────────────────────────────────────
  private ckey(cx: number, cz: number): string { return cx + "|" + cz; }
  private bidx(x: number, y: number, z: number): number { return (x * CS + z) * CH + y; }

  private genChunkData(cx: number, cz: number): Chunk {
    const d = new Uint8Array(CS * CS * CH);
    const seed = this.seed;
    for (let x = 0; x < CS; x++) {
      for (let z = 0; z < CS; z++) {
        const wx = cx * CS + x, wz = cz * CS + z;
        const h = terrainH(wx, wz, seed);
        const bio = biomeAt(wx, wz, h, seed);
        for (let y = 0; y <= h; y++) {
          let id: number;
          if (y === 0) id = B.BEDROCK;
          else if (y < h - 3) id = oreAt(wx, y, wz, seed);
          else if (y < h) id = bio === "deserto" ? (y < h - 1 ? B.SANDSTONE : B.SAND) : B.DIRT;
          else { // superfície
            if (bio === "deserto") id = B.SAND;
            else if (bio === "neve") id = B.SNOW;
            else if (h <= SEA + 1) id = B.SAND;
            else if (h >= 40 && bio === "montanha") id = B.STONE;
            else id = B.GRASS;
          }
          if (id === B.STONE && y > 2 && isCave(wx, y, wz, seed)) id = B.AIR;
          d[this.bidx(x, y, z)] = id;
        }
        // água
        if (h < SEA) for (let y = h + 1; y <= SEA; y++) d[this.bidx(x, y, z)] = B.WATER;
        // árvore
        if (d[this.bidx(x, h, z)] === B.GRASS && x >= 2 && x <= 13 && z >= 2 && z <= 13) {
          const dens = bio === "floresta" ? 0.075 : bio === "planície" ? 0.024 : 0;
          if (hash2(wx, wz, seed + 31) < dens) {
            const th = 4 + Math.floor(hash2(wx, wz, seed + 33) * 3);
            for (let k = 1; k <= th; k++) d[this.bidx(x, h + k, z)] = B.LOG;
            for (let ly = h + th - 2; ly <= h + th + 1; ly++) {
              const rad = ly >= h + th ? 1 : 2;
              for (let lx = -rad; lx <= rad; lx++) for (let lz = -rad; lz <= rad; lz++) {
                if (Math.abs(lx) === rad && Math.abs(lz) === rad && rad > 1) continue;
                const ix = x + lx, iz = z + lz, iy = ly;
                if (ix < 0 || ix > 15 || iz < 0 || iz > 15 || iy >= CH) continue;
                if (d[this.bidx(ix, iy, iz)] === B.AIR) d[this.bidx(ix, iy, iz)] = B.LEAVES;
              }
            }
          }
        }
        // cacto
        if (d[this.bidx(x, h, z)] === B.SAND && h > SEA && hash2(wx, wz, seed + 37) < 0.006) {
          const chh = 2 + Math.floor(hash2(wx, wz, seed + 39) * 2);
          for (let k = 1; k <= chh; k++) if (h + k < CH) d[this.bidx(x, h + k, z)] = B.CACTUS;
        }
      }
    }
    // tesouro (baú com bilhete) — 1 em ~25 chunks
    if (hash2(cx, cz, seed + 41) < 0.04) {
      const tx = 4 + Math.floor(hash2(cx, cz, seed + 43) * 8);
      const tz = 4 + Math.floor(hash2(cx, cz, seed + 45) * 8);
      let ty = -1;
      for (let y = 8; y < 20; y++) if (d[this.bidx(tx, y, tz)] === B.AIR && d[this.bidx(tx, y - 1, tz)] !== B.AIR && d[this.bidx(tx, y - 1, tz)] !== B.WATER) { ty = y; break; }
      if (ty > 0) {
        d[this.bidx(tx, ty, tz)] = B.CHEST;
        const pk = `${cx * CS + tx},${ty},${cz * CS + tz}`;
        if (!this.chests.has(pk)) this.chests.set(pk, this.genTreasureLoot(cx, cz));
        this.lightBlocks.set("lb" + pk, { x: cx * CS + tx, y: ty, z: cz * CS + tz, i: 5 });
      }
    }
    // luzes naturais (cristais)
    for (let x = 0; x < CS; x++) for (let z = 0; z < CS; z++) for (let y = 2; y < CH; y++) {
      const id = d[this.bidx(x, y, z)];
      if (id === B.CRYSTAL_ORE) this.lightBlocks.set(`lb${cx * CS + x},${y},${cz * CS + z}`, { x: cx * CS + x, y, z: cz * CS + z, i: 6 });
    }
    const ch: Chunk = { d, cx, cz, dirty: true };
    // aplica edições guardadas
    const ed = this.edits.get(this.ckey(cx, cz));
    if (ed) for (const [i, id] of ed) d[i] = id;
    return ch;
  }

  private genTreasureLoot(cx: number, cz: number): (Stack | null)[] {
    const s: (Stack | null)[] = new Array(27).fill(null);
    const r = hash2(cx, cz, this.seed + 47);
    s[0] = makeStack("bilhete", 1);
    s[1] = { i: "gold_ingot", n: 1 + Math.floor(r * 2) };
    s[2] = makeStack("coal", 2 + Math.floor(r * 6));
    if (r > 0.72) s[3] = makeStack("diamond", 1);
    if (r > 0.9) s[4] = makeStack("crystal", 1);
    return s;
  }

  private getChunk(cx: number, cz: number): Chunk {
    const k = this.ckey(cx, cz);
    let c = this.chunks.get(k);
    if (!c) { c = this.genChunkData(cx, cz); this.chunks.set(k, c); }
    return c;
  }

  getBlock(wx: number, wy: number, wz: number): number {
    if (wy < 0) return B.BEDROCK;
    if (wy >= CH) return B.AIR;
    const cx = Math.floor(wx / CS), cz = Math.floor(wz / CS);
    const c = this.getChunk(cx, cz);
    return c.d[this.bidx(wx - cx * CS, wy, wz - cz * CS)];
  }
  private solidAt(wx: number, wy: number, wz: number): boolean {
    const b = this.getBlock(Math.floor(wx), Math.floor(wy), Math.floor(wz));
    const def = BLOCKS[b];
    return !!def && def.solid;
  }

  setBlock(wx: number, wy: number, wz: number, id: number, record = true): void {
    if (wy < 1 || wy >= CH) return;
    const cx = Math.floor(wx / CS), cz = Math.floor(wz / CS);
    const lx = wx - cx * CS, lz = wz - cz * CS;
    const c = this.getChunk(cx, cz);
    const idx = this.bidx(lx, wy, lz);
    if (c.d[idx] === id) return;
    c.d[idx] = id;
    if (record) {
      const k = this.ckey(cx, cz);
      let ed = this.edits.get(k);
      if (!ed) { ed = new Map(); this.edits.set(k, ed); }
      ed.set(idx, id);
      this.saveDirty = true;
    }
    // luzes
    const pk = `lb${wx},${wy},${wz}`;
    if (BLOCKS[id]?.light) this.lightBlocks.set(pk, { x: wx, y: wy, z: wz, i: BLOCKS[id].light! });
    else this.lightBlocks.delete(pk);
    // remesh: chunk + vizinhos se na borda
    this.remeshNow(cx, cz);
    if (lx === 0) this.remeshNow(cx - 1, cz);
    if (lx === CS - 1) this.remeshNow(cx + 1, cz);
    if (lz === 0) this.remeshNow(cx, cz - 1);
    if (lz === CS - 1) this.remeshNow(cx, cz + 1);
  }
  private remeshNow(cx: number, cz: number): void {
    const k = this.ckey(cx, cz);
    const c = this.chunks.get(k);
    if (c) { c.dirty = true; this.meshQueue.add(k); }
  }

  // ── Meshing (culling de faces + AO nos vértices) ───────────
  private tileUV(tile: number): [number, number, number, number] {
    const c = tile % ATLAS_COLS, r = Math.floor(tile / ATLAS_COLS);
    const u0 = c / ATLAS_COLS, u1 = (c + 1) / ATLAS_COLS;
    const v1 = 1 - r / ATLAS_ROWS, v0 = 1 - (r + 1) / ATLAS_ROWS;
    return [u0, v0, u1, v1];
  }
  private buildChunkMesh(c: Chunk): void {
    const { d, cx, cz } = c;
    const O = { pos: [] as number[], uv: [] as number[], col: [] as number[], idx: [] as number[] };
    const TT = { pos: [] as number[], uv: [] as number[], col: [] as number[], idx: [] as number[] };
    const gb = (x: number, y: number, z: number): number => {
      if (y < 0) return B.BEDROCK; if (y >= CH) return B.AIR;
      if (x >= 0 && x < CS && z >= 0 && z < CS) return d[this.bidx(x, y, z)];
      return this.getBlock(cx * CS + x, y, cz * CS + z);
    };
    const pushQuad = (B4: { v: number[][]; o: number[] }, tgt: typeof O, tile: number, bright: number[], topY = 1) => {
      const [u0, v0, u1, v1] = this.tileUV(tile);
      const base = tgt.pos.length / 3;
      const uvq = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      for (let i = 0; i < 4; i++) {
        tgt.pos.push(B4.v[i][0], B4.v[i][1] * topY + B4.o[1], B4.v[i][2]);
        tgt.uv.push(uvq[i][0], uvq[i][1]);
        const b = bright[i];
        tgt.col.push(b, b, b);
      }
      if (bright[0] + bright[2] >= bright[1] + bright[3]) tgt.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else tgt.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    };
    // cálculo de AO por face (estilo Minecraft — cantos escuros junto a blocos)
    const faceAO = (bx: number, by: number, bz: number, dir: number): number[] => {
      // dir: 0 +y, 1 -y, 2 +x, 3 -x, 4 +z, 5 -z
      const solidOp = (x: number, y: number, z: number): boolean => {
        const id = gb(x, y, z); const df = BLOCKS[id];
        return !!df && df.opaque && df.solid;
      };
      const res: number[] = [];
      let axes: [number, number, number][];
      if (dir === 0 || dir === 1) axes = [[1, 0, 0], [0, 0, 1]];
      else if (dir === 2 || dir === 3) axes = [[0, 1, 0], [0, 0, 1]];
      else axes = [[1, 0, 0], [0, 1, 0]];
      const n = dir === 0 ? [0, 1, 0] : dir === 1 ? [0, -1, 0] : dir === 2 ? [1, 0, 0] : dir === 3 ? [-1, 0, 0] : dir === 4 ? [0, 0, 1] : [0, 0, -1];
      const cxw = bx + n[0], cyw = by + n[1], czw = bz + n[2];
      for (let i = 0; i < 4; i++) {
        const s1d = i === 0 || i === 3 ? -1 : 1;
        const s2d = i === 0 || i === 1 ? -1 : 1;
        const s1 = solidOp(cxw + axes[0][0] * s1d, cyw + axes[0][1] * s1d, czw + axes[0][2] * s1d);
        const s2 = solidOp(cxw + axes[1][0] * s2d, cyw + axes[1][1] * s2d, czw + axes[1][2] * s2d);
        const cor = solidOp(cxw + axes[0][0] * s1d + axes[1][0] * s2d, cyw + axes[0][1] * s1d + axes[1][1] * s2d, czw + axes[0][2] * s1d + axes[1][2] * s2d);
        res.push((s1 && s2) ? 0.5 : 1 - 0.18 * ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (cor ? 1 : 0)));
      }
      return res;
    };
    const FSHADE = [1, 0.55, 0.8, 0.8, 0.68, 0.68];

    for (let x = 0; x < CS; x++) for (let z = 0; z < CS; z++) for (let y = 0; y < CH; y++) {
      const id = d[this.bidx(x, y, z)];
      if (id === B.AIR) continue;
      const def = BLOCKS[id]; if (!def) continue;
      const isT = !def.opaque;
      const tgt = isT ? TT : O;

      if (id === B.TORCH) {
        // cruz de tochas — brilho total
        const br = 1;
        const [u0, v0, u1, v1] = this.tileUV(T.TORCH);
        const quads: number[][][] = [
          [[x + 0.5, y, z], [x + 0.5, y + 1, z + 1]],
          [[x + 0.5, y, z + 1], [x + 0.5, y + 1, z]],
        ];
        for (const q of quads) {
          const base = tgt.pos.length / 3;
          tgt.pos.push(q[0][0], q[0][1], q[0][2], q[1][0], q[1][1], q[1][2], q[1][0], q[1][1], q[1][2], q[0][0], q[0][1], q[0][2]);
          tgt.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
          for (let i = 0; i < 4; i++) tgt.col.push(1.15, 1.15, 1.1);
          tgt.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
        continue;
      }

      const waterTop = id === B.WATER && gb(x, y + 1, z) !== B.WATER;
      for (let dir = 0; dir < 6; dir++) {
        const n = dir === 0 ? [0, 1, 0] : dir === 1 ? [0, -1, 0] : dir === 2 ? [1, 0, 0] : dir === 3 ? [-1, 0, 0] : dir === 4 ? [0, 0, 1] : [0, 0, -1];
        const nb = gb(x + n[0], y + n[1], z + n[2]);
        const ndef = BLOCKS[nb];
        let draw: boolean;
        if (id === B.WATER) draw = nb === B.AIR || (!ndef?.opaque && nb !== B.WATER);
        else if (!def.opaque) draw = !ndef?.opaque && nb !== id;
        else draw = !ndef?.opaque;
        if (!draw) continue;
        const tile = dir === 0 ? def.tiles[0] : dir === 1 ? def.tiles[1] : def.tiles[2];
        const ao = def.light ? [1, 1, 1, 1] : faceAO(x, y, z, dir);
        const bright = ao.map((a) => a * FSHADE[dir]);
        // vértices do quad
        let v: number[][];
        if (dir === 0) v = [[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]];
        else if (dir === 1) v = [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [x, y, z]];
        else if (dir === 2) v = [[x + 1, y, z], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z]];
        else if (dir === 3) v = [[x, y, z + 1], [x, y, z], [x, y + 1, z], [x, y + 1, z + 1]];
        else if (dir === 4) v = [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]];
        else v = [[x + 1, y, z], [x, y, z], [x, y + 1, z], [x + 1, y + 1, z]];
        // corrigir winding para faces -x/-z/-y
        if (dir === 1 || dir === 3 || dir === 5) v = [v[1], v[0], v[3], v[2]];
        const topY = waterTop && dir === 0 ? 0.88 : 1;
        if (waterTop && dir !== 0) {
          // abaixar topo dos lados da água
          v = v.map((vv) => (vv[1] === y + 1 ? [vv[0], y + 0.88, vv[2]] : vv));
        }
        pushQuad({ v, o: [0, 0, 0] }, tgt, tile, bright, topY);
      }
    }

    // aplicar geometrias
    const apply = (tgt: typeof O, mat: THREE.Material, old?: THREE.Mesh): THREE.Mesh | undefined => {
      if (old) { this.scene.remove(old); old.geometry.dispose(); }
      if (tgt.idx.length === 0) return undefined;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(tgt.pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(tgt.uv, 2));
      g.setAttribute("color", new THREE.Float32BufferAttribute(tgt.col, 3));
      g.setIndex(tgt.idx);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.position.set(cx * CS, 0, cz * CS); // ⛏ POSICIONAR O CHUNK NO MUNDO (estava na origem!)
      m.frustumCulled = true;
      this.scene.add(m);
      return m;
    };
    c.meshO = apply(O, this.matO, c.meshO);
    c.meshT = apply(TT, this.matT, c.meshT);
    c.dirty = false;
  }

  private updateChunks(): void {
    const pcx = Math.floor(this.p.x / CS), pcz = Math.floor(this.p.z / CS);
    // gerar dados
    for (let dx = -this.dataR; dx <= this.dataR; dx++) for (let dz = -this.dataR; dz <= this.dataR; dz++) {
      const k = this.ckey(pcx + dx, pcz + dz);
      if (!this.chunks.has(k)) this.genQueue.push(k);
    }
    if (this.genQueue.length) {
      const t0 = performance.now();
      while (this.genQueue.length && performance.now() - t0 < 6) {
        const k = this.genQueue.shift()!;
        if (!this.chunks.has(k)) {
          const [cx, cz] = k.split("|").map(Number);
          this.chunks.set(k, this.genChunkData(cx, cz));
        }
      }
    }
    // mesh queue: mais perto primeiro
    if (this.meshQueue.size) {
      const arr = [...this.meshQueue].map((k) => {
        const [cx, cz] = k.split("|").map(Number);
        return { k, d2: (cx - pcx) ** 2 + (cz - pcz) ** 2 };
      }).sort((a, b) => a.d2 - b.d2);
      let built = 0;
      for (const it of arr) {
        if (built >= 2) break;
        const [cx, cz] = it.k.split("|").map(Number);
        if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) > this.meshR + 1) { this.meshQueue.delete(it.k); continue; }
        const c = this.chunks.get(it.k);
        if (c && c.dirty) { this.buildChunkMesh(c); built++; }
        this.meshQueue.delete(it.k);
      }
    }
    // ensure meshes exist for radius
    let ensured = 0;
    for (let dx = -this.meshR; dx <= this.meshR && ensured < 2; dx++) for (let dz = -this.meshR; dz <= this.meshR && ensured < 2; dz++) {
      const c = this.chunks.get(this.ckey(pcx + dx, pcz + dz));
      if (c && c.dirty) { this.buildChunkMesh(c); ensured++; }
    }
    // descarregar chunks distantes
    if (this.chunks.size > (2 * this.dataR + 3) ** 2 + 40) {
      for (const [k, c] of this.chunks) {
        const [cx, cz] = k.split("|").map(Number);
        if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) > this.dataR + 2) {
          if (c.meshO) { this.scene.remove(c.meshO); c.meshO.geometry.dispose(); }
          if (c.meshT) { this.scene.remove(c.meshT); c.meshT.geometry.dispose(); }
          this.chunks.delete(k);
        }
      }
    }
  }

  // ── Sons (WebAudio sintetizado — 0% direitos de autor) ──────
  private ac(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioCtx.state === "suspended") this.audioCtx.resume().catch(() => {});
      return this.audioCtx;
    } catch { return null; }
  }
  private blip(freq: number, dur: number, type: OscillatorType = "square", vol = 0.12, slide = 0): void {
    const ctx = this.ac(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }
  private noiseS(dur: number, fFreq: number, vol = 0.14, slideTo?: number): void {
    const ctx = this.ac(); if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const dd = buf.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = fFreq;
    if (slideTo) f.frequency.linearRampToValueAtTime(slideTo, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
  }
  private sDig(pitch = 1) { this.noiseS(0.07, 700 * pitch, 0.1); }
  private sBreak(pitch = 1) { this.noiseS(0.16, 900 * pitch, 0.18); }
  private sPlace() { this.blip(190, 0.07, "square", 0.12); this.noiseS(0.04, 1400, 0.06); }
  private sStep() { this.noiseS(0.03, this.stepAlt ? 800 : 640, 0.055); this.stepAlt = 1 - this.stepAlt; }
  private sPop() { this.blip(660, 0.06, "square", 0.09, 320); }
  private sHurt() { this.blip(150, 0.16, "sawtooth", 0.14, -60); }
  private sEat() { let i = 0; const iv = setInterval(() => { this.noiseS(0.05, 1100, 0.09); if (++i > 2) clearInterval(iv); }, 130); }
  private sBoom() { this.noiseS(0.55, 400, 0.4, 70); this.blip(70, 0.5, "sine", 0.25, -30); }
  private sCraft() { this.blip(520, 0.05, "triangle", 0.1); setTimeout(() => this.blip(760, 0.06, "triangle", 0.1), 70); }
  private sLevel() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.12, "triangle", 0.12), i * 90)); }
  private sClick() { this.blip(880, 0.03, "triangle", 0.07); }
  private sWhoosh() { this.noiseS(0.22, 2000, 0.1, 300); }

  // ── Mob models (voxel estilo Minecraft) ────────────────────
  private box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z);
    return m;
  }
  private buildMob(type: string): { g: THREE.Group; legs: THREE.Object3D[]; head?: THREE.Object3D; mats: THREE.MeshLambertMaterial[] } {
    const g = new THREE.Group();
    const legs: THREE.Object3D[] = [];
    const mats: THREE.MeshLambertMaterial[] = [];
    const mk = (w: number, h: number, d: number, c: number, x: number, y: number, z: number, pivotY?: number): THREE.Mesh => {
      const mesh = this.box(w, h, d, c, 0, 0, 0);
      if (pivotY !== undefined) {
        const piv = new THREE.Group();
        piv.position.set(x, pivotY, z);
        mesh.position.set(0, -h / 2, 0);
        piv.add(mesh);
        g.add(piv);
        legs.push(piv);
        mats.push(mesh.material as THREE.MeshLambertMaterial);
        return mesh;
      }
      mesh.position.set(x, y, z);
      g.add(mesh);
      mats.push(mesh.material as THREE.MeshLambertMaterial);
      return mesh;
    };
    if (type === "pig") {
      mk(0.9, 0.55, 0.62, 0xf0a0a0, 0, 0.62, 0);
      const head = mk(0.5, 0.45, 0.4, 0xf0a0a0, 0, 0.68, 0.48);
      mk(0.24, 0.16, 0.08, 0xe07f7f, 0, 0.62, 0.71);
      mk(0.08, 0.08, 0.03, 0x1a1a2e, -0.12, 0.76, 0.69);
      mk(0.08, 0.08, 0.03, 0x1a1a2e, 0.12, 0.76, 0.69);
      mk(0.2, 0.35, 0.2, 0xe08f8f, -0.28, 0.35, 0.22, 0.35);
      mk(0.2, 0.35, 0.2, 0xe08f8f, 0.28, 0.35, 0.22, 0.35);
      mk(0.2, 0.35, 0.2, 0xe08f8f, -0.28, 0.35, -0.22, 0.35);
      mk(0.2, 0.35, 0.2, 0xe08f8f, 0.28, 0.35, -0.22, 0.35);
      return { g, legs, mats };
    }
    if (type === "cow") {
      mk(1.0, 0.62, 0.66, 0x6e4e2a, 0, 0.75, 0);
      mk(0.42, 0.3, 0.3, 0xe8e8e8, 0.25, 0.86, 0.2);
      mk(0.3, 0.3, 0.3, 0xe8e8e8, -0.3, 0.7, -0.15);
      const head = mk(0.46, 0.44, 0.42, 0x5d3f1f, 0, 0.9, 0.55);
      mk(0.08, 0.08, 0.03, 0x1a1a2e, -0.12, 0.98, 0.77);
      mk(0.08, 0.08, 0.03, 0x1a1a2e, 0.12, 0.98, 0.77);
      mk(0.2, 0.45, 0.2, 0x5d3f1f, -0.3, 0.45, 0.24, 0.45);
      mk(0.2, 0.45, 0.2, 0x5d3f1f, 0.3, 0.45, 0.24, 0.45);
      mk(0.2, 0.45, 0.2, 0x5d3f1f, -0.3, 0.45, -0.24, 0.45);
      mk(0.2, 0.45, 0.2, 0x5d3f1f, 0.3, 0.45, -0.24, 0.45);
      return { g, legs, mats };
    }
    if (type === "sheep") {
      mk(0.85, 0.65, 0.66, 0xe8e8e8, 0, 0.7, 0);
      const head = mk(0.36, 0.36, 0.36, 0xc9b8a0, 0, 0.85, 0.5);
      mk(0.08, 0.08, 0.03, 0x1a1a2e, -0.09, 0.9, 0.69);
      mk(0.08, 0.08, 0.03, 0x1a1a2e, 0.09, 0.9, 0.69);
      mk(0.18, 0.4, 0.18, 0xc9b8a0, -0.24, 0.4, 0.2, 0.4);
      mk(0.18, 0.4, 0.18, 0xc9b8a0, 0.24, 0.4, 0.2, 0.4);
      mk(0.18, 0.4, 0.18, 0xc9b8a0, -0.24, 0.4, -0.2, 0.4);
      mk(0.18, 0.4, 0.18, 0xc9b8a0, 0.24, 0.4, -0.2, 0.4);
      return { g, legs, mats };
    }
    if (type === "zombie") {
      mk(0.5, 0.62, 0.3, 0x2f6f8f, 0, 1.18, 0);              // torso (camisa)
      const head = mk(0.44, 0.44, 0.44, 0x4f9f4f, 0, 1.72, 0); // cabeça
      mk(0.09, 0.09, 0.03, 0x1a1a2e, -0.1, 1.78, 0.23);
      mk(0.09, 0.09, 0.03, 0x1a1a2e, 0.1, 1.78, 0.23);
      const aL = new THREE.Group(); aL.position.set(-0.34, 1.62, 0);
      const aLm = this.box(0.16, 0.6, 0.16, 0x4f9f4f, 0, -0.3, 0.12); aLm.rotation.x = -1.35; aL.add(aLm);
      g.add(aL); mats.push(aLm.material as THREE.MeshLambertMaterial);
      const aR = new THREE.Group(); aR.position.set(0.34, 1.62, 0);
      const aRm = this.box(0.16, 0.6, 0.16, 0x4f9f4f, 0, -0.3, 0.12); aRm.rotation.x = -1.35; aR.add(aRm);
      g.add(aR); mats.push(aRm.material as THREE.MeshLambertMaterial);
      mk(0.2, 0.62, 0.2, 0x3a4a7f, -0.13, 0.62, 0, 0.62);
      mk(0.2, 0.62, 0.2, 0x3a4a7f, 0.13, 0.62, 0, 0.62);
      return { g, legs, head, mats };
    }
    if (type === "skeleton") {
      mk(0.4, 0.6, 0.22, 0xd8d8d8, 0, 1.2, 0);
      const head = mk(0.42, 0.42, 0.42, 0xe8e8e8, 0, 1.72, 0);
      mk(0.08, 0.1, 0.03, 0x1a1a2e, -0.09, 1.76, 0.22);
      mk(0.08, 0.1, 0.03, 0x1a1a2e, 0.09, 1.76, 0.22);
      const aL = new THREE.Group(); aL.position.set(-0.28, 1.62, 0);
      const aLm = this.box(0.11, 0.58, 0.11, 0xd8d8d8, 0, -0.29, 0.1); aLm.rotation.x = -1.3; aL.add(aLm);
      g.add(aL); mats.push(aLm.material as THREE.MeshLambertMaterial);
      const aR = new THREE.Group(); aR.position.set(0.28, 1.62, 0);
      const aRm = this.box(0.11, 0.58, 0.11, 0xd8d8d8, 0, -0.29, 0.1); aRm.rotation.x = -1.3; aR.add(aRm);
      g.add(aR); mats.push(aRm.material as THREE.MeshLambertMaterial);
      mk(0.13, 0.62, 0.13, 0xd8d8d8, -0.11, 0.62, 0, 0.62);
      mk(0.13, 0.62, 0.13, 0xd8d8d8, 0.11, 0.62, 0, 0.62);
      return { g, legs, head, mats };
    }
    // creeper
    mk(0.5, 0.9, 0.34, 0x4faa4f, 0, 0.95, 0);
    const head = mk(0.46, 0.46, 0.46, 0x54b454, 0, 1.66, 0);
    mk(0.1, 0.1, 0.03, 0x111111, -0.11, 1.72, 0.24);
    mk(0.1, 0.1, 0.03, 0x111111, 0.11, 1.72, 0.24);
    mk(0.1, 0.14, 0.03, 0x111111, 0, 1.56, 0.24);
    mk(0.2, 0.32, 0.24, 0x449a44, -0.14, 0.16, 0.2, 0.32);
    mk(0.2, 0.32, 0.24, 0x449a44, 0.14, 0.16, 0.2, 0.32);
    mk(0.2, 0.32, 0.24, 0x449a44, -0.14, 0.16, -0.2, 0.32);
    mk(0.2, 0.32, 0.24, 0x449a44, 0.14, 0.16, -0.2, 0.32);
    return { g, legs, head, mats };
  }
  private buildHumanoid(shirt: number, skin: number, pants: number): THREE.Group {
    const g = new THREE.Group();
    const torso = this.box(0.5, 0.62, 0.3, shirt, 0, 1.18, 0); g.add(torso);
    const head = this.box(0.44, 0.44, 0.44, skin, 0, 1.72, 0); g.add(head);
    const eL = this.box(0.08, 0.08, 0.03, 0x1a1a2e, -0.1, 1.78, 0.23); g.add(eL);
    const eR = this.box(0.08, 0.08, 0.03, 0x1a1a2e, 0.1, 1.78, 0.23); g.add(eR);
    const aL = this.box(0.16, 0.6, 0.16, skin, -0.34, 1.32, 0); g.add(aL);
    const aR = this.box(0.16, 0.6, 0.16, skin, 0.34, 1.32, 0); g.add(aR);
    const lL = this.box(0.2, 0.62, 0.2, pants, -0.13, 0.62, 0); g.add(lL);
    const lR = this.box(0.2, 0.62, 0.2, pants, 0.13, 0.62, 0); g.add(lR);
    return g;
  }

  // ── Mobs ───────────────────────────────────────────────────
  private spawnMob(type: string, x: number, y: number, z: number): any {
    const model = this.buildMob(type);
    const hostile = type === "zombie" || type === "skeleton" || type === "creeper";
    const hp = type === "zombie" ? 20 : type === "skeleton" ? 20 : type === "creeper" ? 20 : type === "pig" ? 10 : type === "cow" ? 10 : 8;
    const mob = {
      type, hostile, x, y, z, vx: 0, vy: 0, vz: 0, yaw: Math.random() * Math.PI * 2,
      hp, maxHp: hp, onGround: false, g: model.g, legs: model.legs, mats: model.mats,
      w: hostile ? 0.3 : type === "cow" ? 0.45 : 0.38, h: hostile ? 1.9 : 1.3,
      wanderT: 0, fleeT: 0, atkCd: 0, shootCd: 2, fuse: 0, burnT: 0, hurtT: 0, animT: Math.random() * 10,
      speed: type === "zombie" ? 2.5 : type === "creeper" ? 2.7 : type === "skeleton" ? 2.2 : 1.1,
    };
    model.g.position.set(x, y, z);
    this.scene.add(model.g);
    this.mobs.push(mob);
    return mob;
  }
  private entityCollide(e: { x: number; y: number; z: number; vx: number; vy: number; vz: number; w: number; h: number; onGround: boolean }, dt: number, grav = GRAV): void {
    // água
    const inWater = this.getBlock(Math.floor(e.x), Math.floor(e.y + 0.3), Math.floor(e.z)) === B.WATER;
    e.vy -= (inWater ? 6 : grav) * dt;
    if (inWater) { e.vy = Math.max(e.vy, -2.4); if (Math.random() < 0.06) e.vy = 2.4; }
    e.vy = Math.max(e.vy, -38);
    const tryAxis = (axis: "x" | "y" | "z"): void => {
      const delta = axis === "x" ? e.vx * dt : axis === "y" ? e.vy * dt : e.vz * dt;
      if (delta === 0) return;
      e[axis] += delta;
      const minX = Math.floor(e.x - e.w), maxX = Math.floor(e.x + e.w);
      const minY = Math.floor(e.y), maxY = Math.floor(e.y + e.h - 0.01);
      const minZ = Math.floor(e.z - e.w), maxZ = Math.floor(e.z + e.w);
      for (let bx = minX; bx <= maxX; bx++) for (let by = minY; by <= maxY; by++) for (let bz = minZ; bz <= maxZ; bz++) {
        if (!this.solidAt(bx, by, bz)) continue;
        if (axis === "y") {
          if (delta < 0) { e.y = by + 1; e.onGround = true; } else e.y = by - e.h - 0.001;
          e.vy = 0;
        } else if (axis === "x") {
          e.x = delta > 0 ? bx - e.w - 0.001 : bx + 1 + e.w + 0.001;
          e.vx = 0;
        } else {
          e.z = delta > 0 ? bz - e.w - 0.001 : bz + 1 + e.w + 0.001;
          e.vz = 0;
        }
        return;
      }
    };
    e.onGround = false;
    tryAxis("y");
    tryAxis("x");
    tryAxis("z");
  }
  private hurtPlayer(dmg: number, fromName: string): void {
    if (this.dead) return;
    this.hp -= dmg;
    this.sHurt();
    this.opts.onEvent({ type: "hp", hp: Math.max(0, this.hp), maxHp: this.maxHp, hit: true });
    if (this.hp <= 0) {
      this.dead = true; this.deadT = 0; this.stats.deaths++;
      this.opts.onEvent({ type: "death", by: fromName });
    }
  }
  private damageMob(m: any, dmg: number, kx: number, kz: number): void {
    m.hp -= dmg;
    m.hurtT = 0.35;
    m.vx += kx * 5; m.vz += kz * 5; m.vy = Math.max(m.vy, 4);
    if (m.hostile) { m.fleeT = 0; } else { m.fleeT = 4; m.yaw = Math.atan2(kx, kz); }
    m.mats.forEach((mm: THREE.MeshLambertMaterial) => mm.color.setHex(0xff6b6b));
    this.sDig(1.4);
    if (m.hp <= 0) this.killMob(m);
  }
  private killMob(m: any): void {
    const i = this.mobs.indexOf(m);
    if (i >= 0) this.mobs.splice(i, 1);
    this.scene.remove(m.g);
    m.g.traverse((o: any) => { o.geometry?.dispose?.(); (o.material as any)?.dispose?.(); });
    // drops
    const at = (n: number) => ({ x: m.x, y: m.y + 0.5, z: m.z, j: n });
    if (m.type === "pig") this.spawnDrop(makeStack("porkchop", 1 + Math.floor(Math.random() * 2)), at(0));
    if (m.type === "cow") { this.spawnDrop(makeStack("beef", 1 + Math.floor(Math.random() * 2)), at(0)); }
    if (m.type === "sheep") this.spawnDrop(makeStack(B.WOOL, 1), at(0));
    if (m.type === "zombie") { if (Math.random() < 0.3) this.spawnDrop(makeStack("apple", 1), at(0)); if (Math.random() < 0.2) this.spawnDrop(makeStack("coal", 1), at(1)); }
    if (m.type === "skeleton") { if (Math.random() < 0.5) this.spawnDrop(makeStack("stick", 1 + Math.floor(Math.random() * 2)), at(0)); }
    if (m.type === "creeper") { if (Math.random() < 0.5) this.spawnDrop(makeStack("coal", 1 + Math.floor(Math.random() * 2)), at(0)); }
    this.spawnOrb(m.x, m.y + 0.8, m.z, m.hostile ? 5 : 2);
    for (let k = 0; k < 8; k++) this.particle(m.x, m.y + 0.6, m.z, 0xdddddd);
    this.stats.kills++;
    this.opts.onEvent({ type: "kill", name: this.mobName(m.type), boss: false, pts: m.hostile ? 1 : 1, credits: 0 });
    this.opts.onEvent({ type: "gain", xp: m.hostile ? 6 : 2, gold: 0 });
    this.sPop();
  }
  private mobName(t: string): string {
    return t === "zombie" ? "Zumbi" : t === "skeleton" ? "Esqueleto" : t === "creeper" ? "Creeper" : t === "pig" ? "Porco" : t === "cow" ? "Vaca" : "Ovelha";
  }
  private explode(x: number, y: number, z: number, r: number, fromCreeper = true): void {
    this.sBoom();
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) {
      if (dx * dx + dy * dy + dz * dz > r * r) continue;
      const bx = x + dx, by = y + dy, bz = z + dz;
      const id = this.getBlock(bx, by, bz);
      if (id === B.AIR || id === B.BEDROCK || id === B.WATER) continue;
      const def = BLOCKS[id];
      if (def && def.hard > 3.4) continue; // blocos muito duros aguentam
      if (id === B.CHEST) { this.popChestContents(bx, by, bz); const ck = `${bx},${by},${bz}`; this.chests.delete(ck); }
      if (id === B.FURNACE || id === B.FURNACE_LIT) { this.popFurnaceContents(bx, by, bz); this.furnaces.delete(`${bx},${by},${bz}`); }
      this.setBlock(bx, by, bz, B.AIR);
    }
    for (let k = 0; k < 26; k++) this.particle(x + (Math.random() - 0.5) * 2, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 2, Math.random() < 0.5 ? 0x777777 : 0xff9a2a);
    // dano no jogador
    const d = Math.hypot(this.p.x - x, this.p.y + 1 - y, this.p.z - z);
    if (d < r + 1.6) {
      const dmg = Math.round(Math.max(2, 13 * (1 - d / (r + 1.6))));
      this.hurtPlayer(dmg, fromCreeper ? "Creeper" : "Explosão");
      const kx = (this.p.x - x) / Math.max(0.4, d), kz = (this.p.z - z) / Math.max(0.4, d);
      this.p.vx += kx * 9; this.p.vz += kz * 9; this.p.vy += 6;
    }
    // dano em mobs vizinhos
    for (const m of [...this.mobs]) {
      const dm = Math.hypot(m.x - x, m.y + 0.5 - y, m.z - z);
      if (dm < r + 1.2) this.damageMob(m, Math.round(Math.max(2, 13 * (1 - dm / (r + 1.2)))), (m.x - x) / Math.max(0.4, dm), (m.z - z) / Math.max(0.4, dm));
    }
  }
  private updateMobs(dt: number, t: number): void {
    const night = this.dayAmt() < 0.38;
    const underground = this.p.y < terrainH(Math.floor(this.p.x), Math.floor(this.p.z), this.seed) - 6;
    for (const m of [...this.mobs]) {
      const dx = this.p.x - m.x, dz = this.p.z - m.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 70) { this.removeMob(m); continue; }
      // queimar ao sol
      if ((m.type === "zombie" || m.type === "skeleton") && !night && !underground) {
        m.burnT += dt;
        if (m.burnT > 1) { m.burnT = 0; m.hp -= 3; m.hurtT = 0.2; if (Math.random() < 0.4) this.particle(m.x, m.y + 1.2, m.z, 0xff9a2a); if (m.hp <= 0) { this.killMob(m); continue; } }
      }
      if (m.hurtT > 0) {
        m.hurtT -= dt;
        if (m.hurtT <= 0) m.mats.forEach((mm: THREE.MeshLambertMaterial) => mm.color.setHex(m.type === "creeper" ? 0x54b454 : m.type === "zombie" ? 0x4f9f4f : m.type === "skeleton" ? 0xd8d8d8 : m.type === "pig" ? 0xf0a0a0 : m.type === "cow" ? 0x6e4e2a : 0xe8e8e8));
      }
      let mvx = 0, mvz = 0, speed = m.speed;
      m.wanderT -= dt;
      if (m.hostile && dist < 20 && !this.dead && (night || underground || m.hurtT > 0)) {
        const inv = 1 / Math.max(0.01, dist);
        m.yaw = Math.atan2(dx * inv, dz * inv);
        if (m.type === "skeleton") {
          if (dist > 11) { mvx = dx * inv; mvz = dz * inv; }
          else if (dist < 7) { mvx = -dx * inv; mvz = -dz * inv; }
          m.shootCd -= dt;
          if (m.shootCd <= 0 && dist < 15) {
            m.shootCd = 2.3;
            const dy = (this.p.y + 1.2) - (m.y + 1.5);
            this.spawnArrow(m.x, m.y + 1.5, m.z, dx / dist * 14, dy / dist * 14 + 2.2, dz / dist * 14);
            this.sWhoosh();
          }
        } else if (m.type === "creeper") {
          if (dist > 2.2) { mvx = dx * inv; mvz = dz * inv; m.fuse = Math.max(0, m.fuse - dt * 0.8); }
          else {
            m.fuse += dt;
            const fl = Math.sin(m.fuse * 22) > 0 ? 1.6 : 1;
            m.g.scale.setScalar(fl);
            if (m.fuse > 1.5) {
              this.removeMob(m);
              this.explode(m.x, m.y + 0.8, m.z, 2.5);
              continue;
            }
          }
        } else {
          if (dist > 1.4) { mvx = dx * inv; mvz = dz * inv; }
          m.atkCd -= dt;
          if (dist < 1.7 && m.atkCd <= 0) { m.atkCd = 1.0; this.hurtPlayer(3, "Zumbi"); }
        }
      } else if (m.fleeT > 0) {
        m.fleeT -= dt;
        speed = m.speed * 2.6;
        mvx = -Math.sin(m.yaw); mvz = -Math.cos(m.yaw);
      } else {
        if (m.wanderT <= 0) { m.wanderT = 2 + Math.random() * 4; m.yaw = Math.random() * Math.PI * 2; m.speedMod = Math.random() < 0.5 ? 0 : 1; }
        if ((m as any).speedMod) { mvx = Math.sin(m.yaw); mvz = Math.cos(m.yaw); }
        speed = m.speed;
      }
      // física
      const len = Math.hypot(mvx, mvz);
      if (len > 0) { mvx = mvx / len * speed; mvz = mvz / len * speed; }
      m.vx += (mvx - m.vx) * Math.min(1, dt * 8);
      m.vz += (mvz - m.vz) * Math.min(1, dt * 8);
      const preX = m.x, preZ = m.z;
      this.entityCollide(m, dt, GRAV);
      // saltar se bloqueado
      if (m.onGround && len > 0 && Math.hypot(m.x - preX, m.z - preZ) < speed * dt * 0.3) m.vy = 8;
      // animação
      m.animT += dt * (len > 0 ? 9 : 2);
      const sw = Math.sin(m.animT) * (len > 0 ? 0.55 : 0.06);
      if (m.legs.length >= 4) {
        m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw;
        m.legs[2].rotation.x = -sw; m.legs[3].rotation.x = sw;
      } else if (m.legs.length === 2) {
        m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw;
      }
      m.g.position.set(m.x, m.y, m.z);
      m.g.rotation.y = m.yaw;
      // ataques de proximidade já tratados; zumbi no escuro perto do jogador
      if (m.type === "zombie" && Math.random() < dt * 0.08) this.blip(95 + Math.random() * 30, 0.3, "sawtooth", Math.min(0.09, 2.2 / Math.max(3, dist)));
    }
  }
  private removeMob(m: any): void {
    const i = this.mobs.indexOf(m);
    if (i >= 0) this.mobs.splice(i, 1);
    this.scene.remove(m.g);
    m.g.traverse((o: any) => { o.geometry?.dispose?.(); (o.material as any)?.dispose?.(); });
  }
  private trySpawnMobs(dt: number): void {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 1.6;
    const night = this.dayAmt() < 0.38;
    const underground = this.p.y < 24;
    const hostiles = this.mobs.filter((m) => m.hostile).length;
    const passives = this.mobs.length - hostiles;
    const capH = this.opts.isTouch ? 7 : 10;
    const capP = this.opts.isTouch ? 5 : 8;
    const pickSpot = (): { x: number; y: number; z: number } | null => {
      const a = Math.random() * Math.PI * 2;
      const d = 17 + Math.random() * 20;
      const x = Math.floor(this.p.x + Math.cos(a) * d) + 0.5;
      const z = Math.floor(this.p.z + Math.sin(a) * d) + 0.5;
      for (let y = CH - 3; y > 2; y--) {
        if (this.solidAt(x, y, z)) {
          if (this.getBlock(Math.floor(x), y + 1, Math.floor(z)) !== B.AIR) return null;
          if (this.getBlock(Math.floor(x), y + 2, Math.floor(z)) !== B.AIR) return null;
          if (this.getBlock(Math.floor(x), y + 1, Math.floor(z)) === B.WATER) return null;
          return { x, y: y + 1, z };
        }
      }
      return null;
    };
    if (hostiles < capH && (night || underground)) {
      const s = pickSpot();
      if (s) {
        const r = Math.random();
        this.spawnMob(r < 0.45 ? "zombie" : r < 0.75 ? "skeleton" : "creeper", s.x, s.y, s.z);
      }
    }
    if (passives < capP && !underground) {
      const s = pickSpot();
      if (s) {
        const r = Math.random();
        this.spawnMob(r < 0.4 ? "pig" : r < 0.7 ? "sheep" : "cow", s.x, s.y, s.z);
      }
    }
  }

  // ── Drops / XP orbs / setas / partículas ───────────────────
  private avgColors = new Map<number, number>();
  private tileAvgColor(tile: number): number {
    const hit = this.avgColors.get(tile); if (hit) return hit;
    const atlas = (window as any).__bateuAtlas as HTMLCanvasElement;
    const g = atlas.getContext("2d")!;
    const data = g.getImageData((tile % ATLAS_COLS) * TILE_PX, Math.floor(tile / ATLAS_COLS) * TILE_PX, TILE_PX, TILE_PX).data;
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 40) continue; r += data[i]; gg += data[i + 1]; b += data[i + 2]; n++; }
    const c = n ? ((r / n) << 16 | (gg / n) << 8 | (b / n)) : 0x888888;
    this.avgColors.set(tile, c);
    return c;
  }
  private spawnDrop(s: Stack, at: { x: number; y: number; z: number; j: number }): void {
    const isBlock = s.b !== undefined && s.b !== null;
    let mesh: THREE.Object3D;
    if (isBlock) {
      const c = this.tileAvgColor(BLOCKS[s.b].tiles[2]);
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), new THREE.MeshLambertMaterial({ color: c }));
    } else {
      const icon = this.iconTexture(s.i!);
      mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: icon, transparent: true }));
      mesh.scale.setScalar(0.42);
    }
    mesh.position.set(at.x, at.y, at.z);
    this.scene.add(mesh);
    this.drops.push({ s, x: at.x, y: at.y, z: at.z, vx: (Math.random() - 0.5) * 2.4, vy: 3.2, vz: (Math.random() - 0.5) * 2.4, mesh, t: 0, w: 0.12, h: 0.24, onGround: false, isBlock: !!isBlock });
  }
  private iconCacheTex = new Map<string, THREE.Texture>();
  private iconTexture(id: string): THREE.Texture {
    const hit = this.iconCacheTex.get(id); if (hit) return hit;
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 16;
    const g = cv.getContext("2d")!;
    const put = (x: number, y: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
    if (id === "stick") { for (let k = 0; k < 9; k++) put(4 + k, 12 - k, "#9a6b3f"); }
    else if (id === "coal") { g.fillStyle = "#2b2b2b"; g.fillRect(4, 5, 8, 7); }
    else if (id === "iron_ingot") { g.fillStyle = "#d8d8d8"; g.fillRect(3, 6, 10, 5); }
    else if (id === "gold_ingot") { g.fillStyle = "#f2c94c"; g.fillRect(3, 6, 10, 5); }
    else if (id === "diamond") { g.fillStyle = "#4ee1e8"; g.fillRect(5, 6, 6, 5); g.fillRect(6, 5, 4, 7); }
    else if (id === "crystal") { g.fillStyle = "#b26bff"; g.fillRect(6, 5, 4, 7); g.fillStyle = "#e6ccff"; g.fillRect(7, 6, 2, 5); }
    else if (id.startsWith("wood_")) { this.drawToolTex(g, "#9a6b3f"); }
    else if (id.startsWith("stone_")) { this.drawToolTex(g, "#8f8f8f"); }
    else if (id.startsWith("iron_")) { this.drawToolTex(g, "#d8d8d8"); }
    else if (id.startsWith("gold_")) { this.drawToolTex(g, "#f2c94c"); }
    else if (id.startsWith("diamond_") || id === "ki_sword") { this.drawToolTex(g, id === "ki_sword" ? "#8fdcff" : "#4ee1e8"); }
    else { g.fillStyle = "#e07f7f"; g.fillRect(4, 5, 8, 7); } // comida
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    this.iconCacheTex.set(id, tex);
    return tex;
  }
  private drawToolTex(g: CanvasRenderingContext2D, color: string): void {
    g.fillStyle = "#9a6b3f";
    for (let k = 0; k < 7; k++) g.fillRect(5 + k, 13 - k, 1, 1);
    g.fillStyle = color;
    g.fillRect(8, 3, 6, 2); g.fillRect(11, 5, 2, 2);
  }
  private spawnOrb(x: number, y: number, z: number, xp: number): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0x7ef7c0 }));
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.drops.push({ orb: xp, x, y, z, vx: (Math.random() - 0.5) * 2, vy: 3, vz: (Math.random() - 0.5) * 2, mesh, t: 0, w: 0.07, h: 0.14, onGround: false });
  }
  private spawnArrow(x: number, y: number, z: number, vx: number, vy: number, vz: number): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), new THREE.MeshLambertMaterial({ color: 0xd8cfc4 }));
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.arrows.push({ x, y, z, vx, vy, vz, mesh, t: 0 });
  }
  private particle(x: number, y: number, z: number, color: number): void {
    const P = this.parts;
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] > 0) continue;
      P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
      P.col[i * 3] = ((color >> 16) & 255) / 255; P.col[i * 3 + 1] = ((color >> 8) & 255) / 255; P.col[i * 3 + 2] = (color & 255) / 255;
      P.vel[i * 3] = (Math.random() - 0.5) * 3; P.vel[i * 3 + 1] = Math.random() * 3.4 + 1; P.vel[i * 3 + 2] = (Math.random() - 0.5) * 3;
      P.life[i] = 0.5 + Math.random() * 0.35;
      return;
    }
  }
  private updateFx(dt: number): void {
    const P = this.parts;
    let any = false;
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) { if (P.pos[i * 3 + 1] > -900) { P.pos[i * 3 + 1] = -999; any = true; } continue; }
      P.life[i] -= dt;
      P.vel[i * 3 + 1] -= 9 * dt;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      any = true;
    }
    if (any) {
      (P.pts.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (P.pts.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    }
    // drops
    for (const d of [...this.drops]) {
      d.t += dt;
      this.entityCollide(d, dt, 22);
      d.vx *= 0.9; d.vz *= 0.9;
      const dx = this.p.x - d.x, dy = (this.p.y + 0.9) - d.y, dz = this.p.z - d.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < 2.1 && d.t > 0.45) {
        d.vx += dx / dist * 26 * dt; d.vy += dy / dist * 26 * dt; d.vz += dz / dist * 26 * dt;
      }
      if (d.t > 0.45 && dist < 0.8) {
        if (d.orb) {
          this.opts.onEvent({ type: "gain", xp: d.orb, gold: 0 });
          this.sPop();
        } else {
          const left = this.addStack(d.s);
          if (left === 0) { this.sPop(); this.opts.onEvent({ type: "notify", msg: `+${d.s.n} ${nameOf(d.s)}`, tone: "info" }); this.removeDrop(d); continue; }
        }
      }
      if (d.t > 120) { this.removeDrop(d); continue; }
      d.mesh.position.set(d.x, d.y + 0.15 + Math.sin(d.t * 2.4) * 0.05, d.z);
      if ((d as any).isBlock) d.mesh.rotation.y = d.t * 1.4;
    }
    // setas
    for (const a of [...this.arrows]) {
      a.t += dt;
      a.vy -= 11 * dt;
      a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
      a.mesh.position.set(a.x, a.y, a.z);
      a.mesh.lookAt(a.x + a.vx, a.y + a.vy, a.z + a.vz);
      const hitP = Math.abs(a.x - this.p.x) < 0.45 && Math.abs(a.z - this.p.z) < 0.45 && a.y > this.p.y && a.y < this.p.y + 1.9;
      if (hitP) { this.hurtPlayer(3, "Esqueleto"); this.removeArrow(a); continue; }
      if (this.solidAt(a.x, a.y, a.z) || a.t > 4) this.removeArrow(a);
    }
  }
  private removeDrop(d: any): void {
    const i = this.drops.indexOf(d);
    if (i >= 0) this.drops.splice(i, 1);
    this.scene.remove(d.mesh);
    const m = d.mesh as any;
    m.geometry?.dispose?.(); (m.material as any)?.map?.dispose?.(); (m.material as any)?.dispose?.();
  }
  private removeArrow(a: any): void {
    const i = this.arrows.indexOf(a);
    if (i >= 0) this.arrows.splice(i, 1);
    this.scene.remove(a.mesh);
    (a.mesh.geometry as any)?.dispose?.();
    (a.mesh.material as any)?.dispose?.();
  }

  // ── Fornalhas ──────────────────────────────────────────────
  private fuelTime(s: Stack): number { return (ITEMS[s.i!]?.fuel || (s.b !== undefined && s.b !== null ? (s.b === B.LOG || s.b === B.PLANKS ? 1.2 : 0) : 0)) * 4; }
  private smeltResult(s: Stack): Stack | null {
    if (s.b === B.IRON_ORE) return makeStack("iron_ingot", 1);
    if (s.b === B.GOLD_ORE) return makeStack("gold_ingot", 1);
    if (s.b === B.SAND) return makeStack(B.GLASS, 1);
    if (s.b === B.LOG) return makeStack("charcoal", 1);
    if (s.i === "porkchop") return makeStack("cooked_porkchop", 1);
    if (s.i === "beef") return makeStack("steak", 1);
    if (s.i === "cobble" as any) return null;
    return null;
  }
  private updateFurnaces(dt: number): void {
    for (const [k, f] of this.furnaces) {
      const canSmelt = f.inp && this.smeltResult(f.inp!) && (!f.out || (stackId(f.out!) === stackId(this.smeltResult(f.inp!)!) && f.out!.n + this.smeltResult(f.inp!)!.n <= maxStack(f.out!)));
      if (f.burn <= 0 && canSmelt && f.fuel) {
        f.burn = this.fuelTime(f.fuel);
        f.fuel.n--; if (f.fuel.n <= 0) f.fuel = null;
        this.saveDirty = true;
      }
      if (f.burn > 0) {
        f.burn -= dt;
        if (canSmelt) {
          f.cook += dt;
          if (f.cook >= 4) {
            f.cook = 0;
            const res = this.smeltResult(f.inp!)!;
            if (f.out) f.out.n += res.n; else f.out = res;
            f.inp!.n--; if (f.inp!.n <= 0) f.inp = null;
            this.saveDirty = true;
            this.onInv();
          }
        } else f.cook = 0;
      } else f.cook = 0;
      // bloco aceso/apagado
      const [x, y, z] = k.split(",").map(Number);
      const cur = this.getBlock(x, y, z);
      if (f.burn > 0 && cur === B.FURNACE) this.setBlock(x, y, z, B.FURNACE_LIT);
      else if (f.burn <= 0 && cur === B.FURNACE_LIT) this.setBlock(x, y, z, B.FURNACE);
    }
  }
  private popChestContents(x: number, y: number, z: number): void {
    const slots = this.chests.get(`${x},${y},${z}`);
    if (slots) for (const s of slots) if (s) this.spawnDrop(s, { x: x + 0.5, y: y + 0.5, z: z + 0.5, j: 0 });
  }
  private popFurnaceContents(x: number, y: number, z: number): void {
    const f = this.furnaces.get(`${x},${y},${z}`);
    if (f) for (const s of [f.inp, f.fuel, f.out]) if (s) this.spawnDrop(s, { x: x + 0.5, y: y + 0.5, z: z + 0.5, j: 0 });
  }

  // ── Céu / dia-noite ────────────────────────────────────────
  dayAmt(): number {
    const sunEl = Math.sin(this.time * Math.PI * 2);
    return Math.max(0.06, Math.min(1, sunEl * 1.5 + 0.42));
  }
  private updateSky(dt: number): void {
    this.time += dt / DAY_LEN;
    if (this.time >= 1) { this.time -= 1; this.day++; this.saveDirty = true; }
    const amt = this.dayAmt();
    // cores
    const dayC = new THREE.Color(0x8fc9ef), nightC = new THREE.Color(0x0a0f26), setC = new THREE.Color(0xf2996a);
    const sunEl = Math.sin(this.time * Math.PI * 2);
    const sky = nightC.clone().lerp(dayC, amt);
    if (Math.abs(sunEl) < 0.22) sky.lerp(setC, 0.45 * (1 - Math.abs(sunEl) / 0.22));
    (this.scene.background as THREE.Color).copy(sky);
    (this.scene.fog as THREE.Fog).color.copy(sky);
    const bright = 0.24 + 0.76 * amt;
    this.matO.color.setScalar(bright);
    this.matT.color.setScalar(bright);
    this.hemi.intensity = 0.3 + 0.75 * amt;
    this.sun.intensity = 0.15 + 0.75 * amt;
    // pivot segue jogador
    this.sunPivot.position.set(this.p.x, this.p.y, this.p.z);
    this.sunPivot.rotation.z = -this.time * Math.PI * 2 + Math.PI / 2;
    this.sun.position.set(Math.cos(this.time * Math.PI * 2) * 60, Math.max(12, sunEl * 90), 24).add(new THREE.Vector3(this.p.x, 0, this.p.z));
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - amt * 1.6);
    this.stars.position.set(this.p.x, this.p.y, this.p.z);
    (this.stars.material as THREE.PointsMaterial).size = 1.4;
    // nuvens à deriva
    for (const c of this.clouds.children) {
      c.position.x += dt * 1.15;
      if (c.position.x - this.p.x > 150) c.position.x -= 300;
      if (c.position.x - this.p.x < -150) c.position.x += 300;
      if (c.position.z - this.p.z > 150) c.position.z -= 300;
      if (c.position.z - this.p.z < -150) c.position.z += 300;
      const cm = (c as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (cm) cm.opacity = 0.2 + 0.62 * amt;
    }
  }

  // ── Spawn inicial ──────────────────────────────────────────
  private findSpawn(): void {
    for (let r = 0; r < 80; r++) {
      const wx = 8 + Math.round(Math.cos(r * 1.7) * r * 2), wz = 8 + Math.round(Math.sin(r * 1.7) * r * 2);
      const h = terrainH(wx, wz, this.seed);
      if (h <= SEA + 1) continue;
      const bio = biomeAt(wx, wz, h, this.seed);
      if (bio !== "deserto" && bio !== "planície" && bio !== "floresta") continue;
      // ⛏ garantir céu limpo — 6 blocos de ar acima (sem árvore/teto)
      let clear = true;
      for (let y = h + 1; y <= h + 6; y++) if (this.getBlock(wx, y, wz) !== B.AIR) { clear = false; break; }
      if (!clear) continue;
      // ⛏ preferir terreno plano à volta (sem paredes à frente)
      let flat = true;
      for (const [dx2, dz2] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
        const h2 = terrainH(wx + dx2, wz + dz2, this.seed);
        if (Math.abs(h2 - h) > 2) { flat = false; break; }
      }
      if (!flat && r < 60) continue;
      // ⛏ VISTA LIVRE: nada de blocos à altura dos olhos num raio de 10 em 8 direções
      let vista = true;
      for (const [dx2, dz2] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        for (let t = 1; t <= 10; t++) {
          if (this.getBlock(wx + dx2 * t, h + 2, wz + dz2 * t) !== B.AIR) { vista = false; break; }
        }
        if (!vista) break;
      }
      if (!vista && r < 70) continue;
      // ⛏ pousar no PRIMEIRO bolso de ar (2 blocos) — nunca dentro de blocos
      let sy = h + 1;
      while (sy < CH - 3 && (this.getBlock(wx, sy, wz) !== B.AIR || this.getBlock(wx, sy + 1, wz) !== B.AIR)) sy++;
      this.p.x = wx + 0.5; this.p.z = wz + 0.5; this.p.y = sy + 0.02;
      this.spawn = { x: this.p.x, y: this.p.y, z: this.p.z };
      return;
    }
    this.p.y = terrainH(Math.floor(this.p.x), Math.floor(this.p.z), this.seed) + 1.02;
    this.spawn = { x: this.p.x, y: this.p.y, z: this.p.z };
  }

  // ── Física do jogador ──────────────────────────────────────
  private updatePlayer(dt: number): void {
    const p = this.p;
    if (this.dead) {
      this.deadT += dt;
      if (this.deadT > 2.4) this.respawn();
      return;
    }
    // look acumulado
    p.yaw -= this.lookAcc.dx * 0.0032;
    p.pitch -= this.lookAcc.dy * 0.0032;
    p.pitch = Math.max(-1.55, Math.min(1.55, p.pitch));
    this.lookAcc.dx = 0; this.lookAcc.dy = 0;

    const inWater = this.getBlock(Math.floor(p.x), Math.floor(p.y + 0.4), Math.floor(p.z)) === B.WATER;
    const headWater = this.getBlock(Math.floor(p.x), Math.floor(p.y + 1.55), Math.floor(p.z)) === B.WATER;
    p.inWater = inWater; p.headWater = headWater;

    // direção
    let mx = this.input.mx, my = this.input.my;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    const wantSprint = this.input.sprint || this.keys.has("ShiftLeft") === false && this.keys.has("ControlLeft");
    p.sprint = wantSprint && my > 0.4 && this.hunger > 3 && !p.sneak;
    p.sneak = this.input.sneak || this.keys.has("ShiftLeft");
    let speed = p.fly ? FLY_SP : p.sneak ? SNEAK_SP : p.sprint ? SPRINT : WALK;
    if (inWater && !p.fly) speed *= 0.62;
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    const tvx = (-sin * my + cos * mx) * speed;
    const tvz = (-cos * my - sin * mx) * speed;
    const accel = p.onGround || p.fly ? 14 : 5;
    p.vx += (tvx - p.vx) * Math.min(1, dt * accel);
    p.vz += (tvz - p.vz) * Math.min(1, dt * accel);

    if (p.fly) {
      const up = (this.input.jump || this.input.up ? 1 : 0) - (p.sneak || this.input.down ? 1 : 0);
      p.vy += (up * 7.5 - p.vy) * Math.min(1, dt * 10);
      this.energy -= dt * 2.6;
      if (this.energy <= 0) { this.energy = 0; this.setFly(false); this.opts.onEvent({ type: "notify", msg: "⚡ KI esgotado — voo desligado", tone: "bad" }); }
    } else if (inWater) {
      p.vy -= 5.5 * dt;
      if (this.input.jump) p.vy = Math.min(p.vy + 22 * dt, 3.4);
      p.vy = Math.max(p.vy, -3.2);
    } else {
      p.vy -= GRAV * dt;
      const jumpHeld = this.input.jump || this.keys.has("Space");
      if (jumpHeld && p.onGround) {
        p.vy = JUMP_V;
        this.exhaustion += 0.08;
      }
      // auto-jump no telemóvel
      if (this.opts.isTouch && p.onGround && mag > 0.4) {
        const fx = p.x + (tvx / speed) * 0.55, fz = p.z + (tvz / speed) * 0.55;
        const feetBlocked = this.solidAt(fx, p.y + 0.1, fz) || this.solidAt(fx, p.y + 0.9, fz);
        const headBlocked = this.solidAt(fx, p.y + 1.8, fz);
        const stepFree = !this.solidAt(fx, p.y + 1.2, fz) && !this.solidAt(fx, p.y + 2.1, fz);
        if (feetBlocked && !headBlocked && stepFree) p.vy = JUMP_V * 0.92;
      }
    }
    p.vy = Math.max(p.vy, -42);

    // colisão por eixos
    const pp = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, vz: p.vz, w: PW, h: PH, onGround: p.onGround };
    const wasGround = p.onGround;
    this.entityCollide(pp, dt, GRAV);
    p.x = pp.x; p.y = pp.y; p.z = pp.z; p.vx = pp.vx; p.vy = pp.vy; p.vz = pp.vz; p.onGround = pp.onGround;

    // dano de queda
    if (!p.onGround && !p.fly && !inWater) {
      if (wasGround || this.fallMaxY === 0) this.fallMaxY = p.y;
      this.fallMaxY = Math.max(this.fallMaxY, p.y);
    }
    if (p.onGround && this.fallMaxY > 0) {
      const fall = this.fallMaxY - p.y;
      if (fall > 3.6 && !inWater) {
        const dmg = Math.floor(fall - 3);
        if (dmg > 0) this.hurtPlayer(dmg, "Uma queda de " + Math.round(fall) + " blocos");
      }
      this.fallMaxY = 0;
    }
    if (inWater) this.fallMaxY = 0;

    // ar / afogamento
    if (headWater) {
      this.airT += dt;
      if (this.airT > 1.1) { this.airT = 0; this.air = Math.max(0, this.air - 1); }
      if (this.air === 0) {
        this.starveT += dt;
        if (this.starveT > 0.8) { this.starveT = 0; this.hurtPlayer(2, "Afogamento"); }
      }
    } else { this.air = 10; this.airT = 0; }

    // passos
    if (p.onGround && Math.hypot(p.vx, p.vz) > 1.5) {
      this.stepT += dt * Math.hypot(p.vx, p.vz);
      if (this.stepT > 2.2) { this.stepT = 0; this.sStep(); this.exhaustion += 0.006; }
    }

    // fome / regeneração
    this.exhaustion += dt * (p.sprint ? 0.045 : 0.004);
    if (this.exhaustion > 4) { this.exhaustion = 0; this.hunger = Math.max(0, this.hunger - 1); }
    if (this.hunger >= 16 && this.hp < this.maxHp) {
      this.regenT += dt;
      if (this.regenT > 3.5) { this.regenT = 0; this.hp = Math.min(this.maxHp, this.hp + 1); this.exhaustion += 1.5; this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.maxHp, hit: false }); }
    }
    if (this.hunger <= 0) {
      this.starveT += dt;
      if (this.starveT > 4) { this.starveT = 0; if (this.hp > 2) this.hurtPlayer(1, "Fome extrema"); }
    }
    // energia KI
    if (!p.fly) this.energy = Math.min(100, this.energy + dt * 1.7);

    // mesa de craft perto?
    this.nearTable = false;
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    for (let dx = -3; dx <= 3 && !this.nearTable; dx++) for (let dy = -2; dy <= 2 && !this.nearTable; dy++) for (let dz = -3; dz <= 3 && !this.nearTable; dz++) {
      if (this.getBlock(bx + dx, by + dy, bz + dz) === B.TABLE) this.nearTable = true;
    }

    // descobertas de bioma
    const surf = terrainH(bx, bz, this.seed);
    this.biome = biomeAt(bx, bz, surf, this.seed);
    this.checkFirst("bio_" + this.biome, this.biome === "deserto" ? ["Deserto Dourado", "🏜️"] : this.biome === "floresta" ? ["Coração da Floresta", "🌳"] : this.biome === "neve" ? ["Picos Nevados", "🏔️"] : this.biome === "montanha" ? ["Terras Altas", "⛰️"] : ["Planícies Verdes", "🌾"], 30);
    if (p.y < 7) this.checkFirst("deep", ["Fundo do Mundo", "🕳️"], 40);
    if (p.y > 50) this.checkFirst("peak", ["Pico do Mundo", "🏔️"], 40);

    // tesouros: proximidade do baú raro
    if (this.lightT > 0.8) {
      // nada aqui — luzes tratadas noutro tick
    }
  }
  private fallMaxY = 0;

  private checkFirst(id: string, nameEmoji: [string, string], xp: number): void {
    if (this.firsts.has(id)) return;
    this.firsts.add(id);
    this.saveDirty = true;
    this.opts.onEvent({ type: "discover", id: "craft_" + id, name: nameEmoji[0], emoji: nameEmoji[1], xp });
    this.sLevel();
  }

  respawn(): void {
    this.hp = this.maxHp; this.hunger = 20; this.air = 10; this.energy = 60;
    this.dead = false; this.deadT = 0;
    this.p.x = this.spawn.x; this.p.y = this.spawn.y + 0.5; this.p.z = this.spawn.z;
    this.p.vx = 0; this.p.vy = 0; this.p.vz = 0;
    this.fallMaxY = 0;
    this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.maxHp, hit: false });
  }

  // ── Raycast voxel (DDA) ────────────────────────────────────
  private raycast(maxD = REACH): { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.p.pitch, this.p.yaw, 0, "YXZ"));
    const ox = this.p.x, oy = this.p.y + EYE, oz = this.p.z;
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = dir.x > 0 ? 1 : -1, stepY = dir.y > 0 ? 1 : -1, stepZ = dir.z > 0 ? 1 : -1;
    const tDeltaX = Math.abs(1 / (dir.x || 1e-9)), tDeltaY = Math.abs(1 / (dir.y || 1e-9)), tDeltaZ = Math.abs(1 / (dir.z || 1e-9));
    let tMaxX = (dir.x > 0 ? (x + 1 - ox) : (ox - x)) * tDeltaX;
    let tMaxY = (dir.y > 0 ? (y + 1 - oy) : (oy - y)) * tDeltaY;
    let tMaxZ = (dir.z > 0 ? (z + 1 - oz) : (oz - z)) * tDeltaZ;
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < 80; i++) {
      const id = this.getBlock(x, y, z);
      if (id !== B.AIR && id !== B.WATER) return { x, y, z, nx, ny, nz };
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { if (tMaxX > maxD) break; x += stepX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
      else if (tMaxY < tMaxZ) { if (tMaxY > maxD) break; y += stepY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
      else { if (tMaxZ > maxD) break; z += stepZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    }
    return null;
  }
  private mobInSight(maxD = 3.6): any {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.p.pitch, this.p.yaw, 0, "YXZ"));
    let best: any = null, bestD = maxD;
    for (const m of this.mobs) {
      const dx = m.x - this.p.x, dy = (m.y + m.h * 0.5) - (this.p.y + EYE), dz = m.z - this.p.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > maxD) continue;
      const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / Math.max(0.01, d);
      if (dot > 0.86 && d < bestD) { best = m; bestD = d; }
    }
    return best;
  }

  // ── Quebrar / colocar / interagir ──────────────────────────
  private selectedStack(): Stack | null { return this.inv[this.sel]; }
  private heldTool(): { def: NonNullable<typeof ITEMS[string]>["tool"]; id: string } | null {
    const s = this.selectedStack();
    if (!s || s.i === undefined) return null;
    const t = ITEMS[s.i]?.tool;
    return t ? { def: t, id: s.i! } : null;
  }
  private updateBreaking(dt: number): void {
    if (this.dead) { this.breakTarget = null; return; }
    const hit = this.raycast();
    this.target = hit;
    if (!this.input.break || !hit) {
      this.breakTarget = null; this.breakProg = 0; this.breakAcc = 0;
      this.crackMesh.visible = false;
      return;
    }
    if (!this.breakTarget || this.breakTarget.x !== hit.x || this.breakTarget.y !== hit.y || this.breakTarget.z !== hit.z) {
      this.breakTarget = { x: hit.x, y: hit.y, z: hit.z };
      this.breakProg = 0; this.breakAcc = 0;
    }
    const id = this.getBlock(hit.x, hit.y, hit.z);
    const def = BLOCKS[id];
    if (!def || def.hard === Infinity) { this.crackMesh.visible = false; return; }
    const tool = this.heldTool();
    const rightType = tool && (def.tool === "any" || tool.def.type === def.tool);
    const rightTier = rightType && tool!.def.tier >= def.tier;
    let time = def.hard / (rightType ? tool!.def.speed : 1);
    if (def.tier > 0 && !rightTier) time = def.hard * 3.6; // ferramenta errada = muito lento
    this.breakTime = time;
    this.breakAcc += dt;
    this.breakProg = Math.min(1, this.breakAcc / Math.max(0.05, time));
    // som de escavação
    if (Math.random() < dt * 7) this.sDig(def.soundPitch || 1);
    // crack visual
    const stage = Math.min(9, Math.floor(this.breakProg * 10));
    this.crackMesh.material = this.crackMats[stage];
    this.crackMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.crackMesh.visible = true;
    // ataque em mob tem prioridade no primeiro toque
    if (this.breakProg >= 1) this.finishBreak(hit.x, hit.y, hit.z, id, rightTier || def.tier === 0);
  }
  private finishBreak(x: number, y: number, z: number, id: number, withDrop: boolean): void {
    const def = BLOCKS[id];
    this.breakTarget = null; this.breakProg = 0; this.breakAcc = 0;
    this.crackMesh.visible = false;
    // contents
    if (id === B.CHEST) { this.popChestContents(x, y, z); this.chests.delete(`${x},${y},${z}`); }
    if (id === B.FURNACE || id === B.FURNACE_LIT) { this.popFurnaceContents(x, y, z); this.furnaces.delete(`${x},${y},${z}`); }
    this.setBlock(x, y, z, B.AIR);
    this.sBreak(def?.soundPitch || 1);
    this.stats.mined++;
    this.exhaustion += 0.03;
    if (withDrop && def?.drop) {
      for (const dDrop of def.drop) {
        const n = dDrop.n || 1;
        const dropId = dDrop.b !== undefined ? dDrop.b : dDrop.i!;
        // folhas: só 18% de maçã
        if (id === B.LEAVES && Math.random() > 0.18) continue;
        if (typeof dropId === "string") this.spawnDrop(makeStack(dropId, n), { x: x + 0.5, y: y + 0.4, z: z + 0.5, j: 0 });
        else this.spawnDrop(makeStack(dropId, n), { x: x + 0.5, y: y + 0.4, z: z + 0.5, j: 0 });
      }
    }
    for (let k = 0; k < 6; k++) this.particle(x + Math.random(), y + Math.random(), z + Math.random(), this.tileAvgColor(def?.tiles[2] ?? T.STONE));
    // durabilidade
    const tool = this.heldTool();
    if (tool && def && def.hard >= 0.4) this.useToolDurability();
    // XP por minério + primeiras vezes + gather
    const isOre = id === B.COAL_ORE || id === B.IRON_ORE || id === B.GOLD_ORE || id === B.DIAMOND_ORE || id === B.CRYSTAL_ORE;
    if (isOre && withDrop) {
      const xp = id === B.COAL_ORE ? 3 : id === B.IRON_ORE ? 5 : id === B.GOLD_ORE ? 8 : id === B.DIAMOND_ORE ? 18 : 45;
      this.opts.onEvent({ type: "gain", xp, gold: 0 });
      this.opts.onEvent({ type: "gather", kind: id === B.CRYSTAL_ORE ? "cristal" : "minério", name: def.name });
      if (id === B.DIAMOND_ORE) {
        this.stats.diamonds++;
        this.checkFirst("diamond", ["Primeiro Diamante", "💎"], 60);
        this.opts.onEvent({ type: "notify", msg: "💎 DIAMANTE! Raro como um bilhete premiado!", tone: "good" });
        if (this.stats.diamonds === 1) this.issuePrize("diamond");
      }
      if (id === B.CRYSTAL_ORE) { this.stats.crystals++; this.checkFirst("crystal", ["Cristal Bateu", "🔮"], 90); }
    } else if (id === B.LOG && withDrop) {
      this.opts.onEvent({ type: "gather", kind: "erva", name: "Madeira" });
    } else if ((id === B.STONE || id === B.COBBLE) && withDrop) {
      this.opts.onEvent({ type: "gather", kind: "minério", name: "Pedra" });
    }
  }
  private useToolDurability(): void {
    const s = this.selectedStack();
    if (!s || s.i === undefined || s.dur === undefined) return;
    const def = ITEMS[s.i];
    if (!def?.tool) return;
    s.dur--;
    if (s.dur <= 0) {
      this.inv[this.sel] = null;
      this.opts.onEvent({ type: "notify", msg: `💔 ${def.name} partiu-se!`, tone: "bad" });
      this.sBreak(0.6);
    }
    this.onInv();
  }
  private issuePrize(kind: string): void {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BC-";
    for (let i = 0; i < 6; i++) code += abc[Math.floor(Math.random() * abc.length)];
    this.opts.onEvent({ type: "prize", code, kind });
  }

  placeOnce(): void {
    if (this.dead || this.placeCd > 0) return;
    this.placeCd = 0.22;
    const hit = this.target || this.raycast();
    if (!hit) return;
    // interativo?
    const tid = this.getBlock(hit.x, hit.y, hit.z);
    if (!this.p.sneak && (tid === B.TABLE || tid === B.FURNACE || tid === B.FURNACE_LIT || tid === B.CHEST)) {
      this.interactOnce();
      return;
    }
    const s = this.selectedStack();
    if (!s || s.b === undefined || s.b === null) { // item não é bloco → comer se comida
      if (s?.i && ITEMS[s.i]?.food) this.eatSelected();
      return;
    }
    const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
    const cur = this.getBlock(px, py, pz);
    if (cur !== B.AIR && cur !== B.WATER) return;
    // não colocar dentro do jogador
    if (BLOCKS[s.b]?.solid) {
      const overlap = px + 1 > this.p.x - PW && px < this.p.x + PW && pz + 1 > this.p.z - PW && pz < this.p.z + PW && py + 1 > this.p.y && py < this.p.y + PH;
      if (overlap) return;
    }
    // tocha precisa de suporte
    if (s.b === B.TORCH && !this.solidAt(px, py - 1, pz) && !this.solidAt(px + hit.nx, py + hit.ny, pz + hit.nz)) return;
    this.setBlock(px, py, pz, s.b);
    s.n--;
    if (s.n <= 0) this.inv[this.sel] = null;
    this.stats.placed++;
    this.sPlace();
    if (s.b === B.CHEST) this.chests.set(`${px},${py},${pz}`, new Array(27).fill(null));
    if (s.b === B.FURNACE) this.furnaces.set(`${px},${py},${pz}`, { inp: null, fuel: null, out: null, burn: 0, cook: 0 });
    this.onInv();
    this.saveDirty = true;
  }

  interactOnce(): void {
    if (this.dead) return;
    const hit = this.target || this.raycast();
    if (!hit) { this.eatSelected(); return; }
    const id = this.getBlock(hit.x, hit.y, hit.z);
    if (id === B.TABLE) { this.onUi({ open: "craft" }); this.sClick(); return; }
    if (id === B.FURNACE || id === B.FURNACE_LIT) { this.openFurn = `${hit.x},${hit.y},${hit.z}`; if (!this.furnaces.has(this.openFurn)) this.furnaces.set(this.openFurn, { inp: null, fuel: null, out: null, burn: 0, cook: 0 }); this.onUi({ open: "furnace" }); this.sClick(); return; }
    if (id === B.CHEST) {
      const k = `${hit.x},${hit.y},${hit.z}`;
      if (!this.chests.has(k)) this.chests.set(k, new Array(27).fill(null));
      this.openChest = k;
      this.onUi({ open: "chest" });
      this.sClick();
      // tesouro: bilhete → evento plataforma
      const slots = this.chests.get(k)!;
      if (slots.some((s) => s?.i === "bilhete")) {
        this.opts.onEvent({ type: "notify", msg: "🎫 Bilhete de sorteio encontrado! Usa o 📱 PLATAFORMA → Sorteios!", tone: "good" });
        this.opts.onEvent({ type: "gain", xp: 20, gold: 50 });
      }
      return;
    }
    this.eatSelected();
  }
  eatSelected(): void {
    const s = this.selectedStack();
    if (!s?.i || this.dead) return;
    const food = ITEMS[s.i]?.food;
    if (!food || this.hunger >= 20) return;
    this.hunger = Math.min(20, this.hunger + food);
    if (s.i === "porkchop" || s.i === "beef") this.exhaustion += 1; // cru fome extra? simples
    s.n--; if (s.n <= 0) this.inv[this.sel] = null;
    this.sEat();
    this.onInv();
  }
  attackOnce(): void {
    if (this.dead || this.attackCd > 0) return;
    this.attackCd = 0.42;
    const m = this.mobInSight();
    if (m) {
      const tool = this.heldTool();
      const dmg = tool ? (tool.def.type === "sword" ? tool.def.dmg : Math.max(1, tool.def.dmg - 1)) : 1;
      const dx = m.x - this.p.x, dz = m.z - this.p.z;
      const d = Math.hypot(dx, dz) || 1;
      this.damageMob(m, dmg, dx / d, dz / d);
      if (tool) this.useToolDurability();
      // combo de esgrima consome fome
      this.exhaustion += 0.1;
    }
  }

  // ── Habilidades KI (melhor que Minecraft) ──────────────────
  private unlockAbilities(): void {
    const lvl = this.playerLevel;
    this.ability.dash = lvl >= 5;
    this.ability.ki = lvl >= 8;
    this.ability.fly = lvl >= 12;
  }
  setPlayerLevel(lvl: number): void { this.playerLevel = lvl; this.unlockAbilities(); }
  toggleFly(): void {
    if (!this.ability.fly) { this.opts.onEvent({ type: "notify", msg: "⚡ Voo KI desbloqueia no nível 12!", tone: "info" }); return; }
    this.setFly(!this.p.fly);
  }
  private setFly(on: boolean): void {
    this.p.fly = on;
    if (on) this.p.vy = 0;
    this.opts.onEvent({ type: "notify", msg: on ? "⚡ VOO KI ATIVADO — Salta para subir, agacha para descer!" : "Voo desativado", tone: "good" });
  }
  dashOnce(): void {
    if (!this.ability.dash) { this.opts.onEvent({ type: "notify", msg: "⚡ Impulso desbloqueia no nível 5!", tone: "info" }); return; }
    if (this.dashCd > 0 || this.energy < 25) return;
    this.dashCd = 1.3; this.energy -= 25;
    const sin = Math.sin(this.p.yaw), cos = Math.cos(this.p.yaw);
    this.p.vx += -sin * 13; this.p.vz += -cos * 13; this.p.vy = Math.max(this.p.vy, 3);
    this.sWhoosh();
    for (let k = 0; k < 8; k++) this.particle(this.p.x, this.p.y + 1, this.p.z, 0x8fdcff);
  }
  kiBlastOnce(): void {
    if (!this.ability.ki) { this.opts.onEvent({ type: "notify", msg: "⚡ Explosão de KI desbloqueia no nível 8!", tone: "info" }); return; }
    if (this.kiCd > 0 || this.energy < 45) { if (this.kiCd > 0) this.opts.onEvent({ type: "notify", msg: `⚡ KI a recarregar (${Math.ceil(this.kiCd)}s)`, tone: "info" }); return; }
    const hit = this.raycast();
    if (!hit) { this.opts.onEvent({ type: "notify", msg: "Mira num bloco primeiro!", tone: "info" }); return; }
    this.kiCd = 30; this.energy -= 45;
    this.sBoom();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const x = hit.x + dx, y = hit.y + dy, z = hit.z + dz;
      const id = this.getBlock(x, y, z);
      if (id === B.AIR || id === B.BEDROCK || id === B.WATER) continue;
      const def = BLOCKS[id];
      if (def?.drop && def.hard < Infinity) for (const dd of def.drop) {
        if (id === B.LEAVES && Math.random() > 0.18) continue;
        if (dd.i) this.spawnDrop(makeStack(dd.i, dd.n || 1), { x: x + 0.5, y: y + 0.4, z: z + 0.5, j: 0 });
        else if (dd.b !== undefined) this.spawnDrop(makeStack(dd.b, dd.n || 1), { x: x + 0.5, y: y + 0.4, z: z + 0.5, j: 0 });
      }
      this.setBlock(x, y, z, B.AIR);
      this.stats.mined++;
    }
    for (let k = 0; k < 20; k++) this.particle(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 0x8fdcff);
    this.opts.onEvent({ type: "notify", msg: "⚡ EXPLOSÃO DE KI! 3×3 demolidos!", tone: "good" });
  }

  getPowerLevel(): number {
    return Math.round(this.playerLevel * 120 + this.stats.kills * 15 + this.stats.mined * 0.5 + this.stats.placed * 0.8 + this.stats.diamonds * 80 + this.stats.crystals * 200);
  }

  // ── Inventário / craft / venda ─────────────────────────────
  addStack(s: Stack): number {
    // tenta juntar
    for (let i = 0; i < 36; i++) {
      const t = this.inv[i];
      if (t && stackId(t) === stackId(s) && t.dur === undefined && s.dur === undefined && t.n < maxStack(t)) {
        const add = Math.min(s.n, maxStack(t) - t.n);
        t.n += add; s.n -= add;
        if (s.n <= 0) { this.onInv(); this.saveDirty = true; return 0; }
      }
    }
    for (let i = 0; i < 36; i++) {
      if (!this.inv[i]) {
        const add = Math.min(s.n, maxStack(s));
        this.inv[i] = { ...s, n: add };
        s.n -= add;
        if (s.n <= 0) { this.onInv(); this.saveDirty = true; return 0; }
      }
    }
    this.onInv(); this.saveDirty = true;
    return s.n;
  }
  countItem(id: string): number {
    let n = 0;
    for (const s of this.inv) if (s && stackId(s) === id) n += s.n;
    return n;
  }
  private consume(id: string, need: number): boolean {
    if (this.countItem(id) < need) return false;
    for (let i = 0; i < 36 && need > 0; i++) {
      const s = this.inv[i];
      if (s && stackId(s) === id) {
        const take = Math.min(need, s.n);
        s.n -= take; need -= take;
        if (s.n <= 0) this.inv[i] = null;
      }
    }
    return true;
  }
  invSwap(a: number, bIdx: number): void {
    if (a < 0 || a > 35 || bIdx < 0 || bIdx > 35) return;
    const tmp = this.inv[a];
    this.inv[a] = this.inv[bIdx];
    this.inv[bIdx] = tmp;
    this.onInv(); this.saveDirty = true;
    this.sClick();
  }
  moveStack(fromL: string, fi: number, toL: string, ti: number): void {
    // fornalha: slots especiais
    const f = this.openFurn ? this.furnaces.get(this.openFurn) : null;
    const getSlot = (l: string, i: number): Stack | null => {
      if (l === "inv") return this.inv[i] ?? null;
      if (l === "chest" && this.openChest) return this.chests.get(this.openChest)![i] ?? null;
      if (f) {
        if (l === "fin") return f.inp;
        if (l === "ffuel") return f.fuel;
        if (l === "fout") return f.out;
      }
      return null;
    };
    const setSlot = (l: string, i: number, v: Stack | null): void => {
      if (l === "inv") this.inv[i] = v;
      else if (l === "chest" && this.openChest) this.chests.get(this.openChest)![i] = v;
      else if (f) {
        if (l === "fin") f.inp = v;
        else if (l === "ffuel") f.fuel = v;
        else if (l === "fout") f.out = v;
      }
    };
    const src = getSlot(fromL, fi);
    const dst = getSlot(toL, ti);
    if (!src) return;
    // fout só recebe o mesmo tipo
    if (toL === "fout" && dst && stackId(dst) !== stackId(src)) return;
    if (toL === "ffuel" && this.fuelTime(src) <= 0) return;
    if (fromL === "fout" && toL !== "inv" && toL !== "chest") return;
    if (dst && stackId(dst) === stackId(src) && dst.dur === undefined && src.dur === undefined) {
      const add = Math.min(src.n, maxStack(dst) - dst.n);
      dst.n += add; src.n -= add;
      if (src.n <= 0) setSlot(fromL, fi, null);
    } else {
      setSlot(fromL, fi, dst);
      setSlot(toL, ti, src);
    }
    this.onInv(); this.saveDirty = true;
    this.sClick();
  }
  selectSlot(i: number): void { if (i >= 0 && i <= 8) { this.sel = i; this.onInv(); } }
  scrollSel(d: number): void { this.sel = (this.sel + d + 9) % 9; this.onInv(); }

  canCraft(r: Recipe): { ok: boolean; needTable: boolean } {
    const needTable = !!r.table && !this.nearTable;
    if (needTable) return { ok: false, needTable: true };
    for (const ins of r.ins) if (this.countItem(stackId(ins)) < ins.n) return { ok: false, needTable };
    return { ok: true, needTable: false };
  }
  craft(id: string, times = 1): void {
    const r = RECIPES.find((x) => x.id === id);
    if (!r) return;
    for (let k = 0; k < times; k++) {
      const c = this.canCraft(r);
      if (!c.ok) break;
      for (const ins of r.ins) this.consume(stackId(ins), ins.n);
      const out = { ...r.out };
      if (out.i && ITEMS[out.i]?.tool) out.dur = ITEMS[out.i]!.tool!.dur;
      this.addStack(out);
      this.stats.crafted++;
    }
    this.sCraft();
    this.saveDirty = true;
  }
  sellItem(id: string, count: number): void {
    const have = this.countItem(id);
    const n = Math.min(have, count);
    if (n <= 0) return;
    let price = 0;
    if (id.startsWith("b")) { const bid = Number(id.slice(1)); price = SELL_BLOCK_PRICES[bid] || 0; }
    else price = SELL_PRICES[id.slice(1)] || 0;
    if (price <= 0) return;
    if (!this.consume(id, n)) return;
    const gold = Math.max(1, Math.round(price * n));
    this.opts.onEvent({ type: "gain", xp: 1, gold });
    this.opts.onEvent({ type: "notify", msg: `💰 Vendeste ${n}× por ${gold} de ouro!`, tone: "good" });
    this.onInv();
    this.saveDirty = true;
    this.sPop();
  }
  give(id: string, n = 1): void {
    const s = typeof id === "string" && id.startsWith("b") ? makeStack(Number(id.slice(1)), n) : makeStack(id, n, ITEMS[id]?.tool?.dur);
    this.addStack(s as Stack);
  }
  eatBest(): void { // comer a melhor comida disponível
    const order = ["steak", "cooked_porkchop", "apple", "beef", "porkchop"];
    for (const id of order) {
      for (let i = 0; i < 36; i++) {
        const s = this.inv[i];
        if (s?.i === id) {
          const oldSel = this.inv[this.sel];
          this.inv[this.sel] = s;
          this.inv[i] = oldSel && oldSel.i !== id ? oldSel : null;
          this.eatSelected();
          return;
        }
      }
    }
    this.opts.onEvent({ type: "notify", msg: "Sem comida! Caça porcos ou apanha maçãs 🍎", tone: "info" });
  }

  // ── Luzes de tochas (pool) ─────────────────────────────────
  private updateLights(dt: number): void {
    this.lightT -= dt;
    if (this.lightT > 0) return;
    this.lightT = 0.7;
    const near: { d: number; x: number; y: number; z: number; i: number }[] = [];
    for (const l of this.lightBlocks.values()) {
      const d = (l.x - this.p.x) ** 2 + (l.y - this.p.y) ** 2 + (l.z - this.p.z) ** 2;
      if (d < 26 * 26) near.push({ ...l, d });
    }
    near.sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.torchLights.length; i++) {
      const li = this.torchLights[i];
      const l = near[i];
      if (l) { li.position.set(l.x + 0.5, l.y + 0.6, l.z + 0.5); li.intensity = 5 + l.i * 0.35; }
      else li.intensity = 0;
    }
  }

  // ── Input ──────────────────────────────────────────────────
  setInput(patch: Partial<typeof this.input>): void { Object.assign(this.input, patch); }
  look(dx: number, dy: number): void { this.lookAcc.dx += dx; this.lookAcc.dy += dy; }

  private bindInput(): void {
    const cv = this.canvas;
    // teclado (desktop)
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    // rato
    cv.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("wheel", this.onWheel, { passive: false });
    document.addEventListener("pointerlockchange", this.onLockChange);
  }
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === "KeyE") { this.onUi({ open: "inv" }); e.preventDefault(); }
    if (e.code === "KeyC") this.toggleCam();
    if (e.code === "KeyF") this.toggleFly();
    if (e.code === "KeyQ") this.dashOnce();
    if (e.code === "KeyR") this.kiBlastOnce();
    if (e.code === "KeyG") this.eatBest();
    if (e.code.startsWith("Digit")) { const n = Number(e.code.slice(5)); if (n >= 1 && n <= 9) this.selectSlot(n - 1); }
  };
  private onKeyUp = (e: KeyboardEvent): void => { this.keys.delete(e.code); };
  private onMouseDown = (e: MouseEvent): void => {
    if (!this.locked && !this.opts.isTouch) {
      this.canvas.requestPointerLock?.();
      return;
    }
    if (e.button === 0) { this.attackOnce(); this.setInput({ break: true }); }
    if (e.button === 2) this.placeOnce();
  };
  private onMouseUp = (e: MouseEvent): void => { if (e.button === 0) this.setInput({ break: false }); };
  private onMouseMove = (e: MouseEvent): void => {
    if (this.locked) this.look(e.movementX * 1.4, e.movementY * 1.4);
  };
  private onWheel = (e: WheelEvent): void => { e.preventDefault(); this.scrollSel(e.deltaY > 0 ? 1 : -1); };
  private onLockChange = (): void => { this.locked = document.pointerLockElement === this.canvas; };
  toggleCam(): void {
    this.camMode = (this.camMode + 1) % 2;
    if (this.playerBody) this.playerBody.visible = this.camMode === 1;
  }
  getCamMode(): number { return this.camMode; }

  // ── Câmera ─────────────────────────────────────────────────
  private updateCamera(dt: number): void {
    const eye = new THREE.Vector3(this.p.x, this.p.y + (this.p.sneak ? EYE - 0.22 : EYE), this.p.z);
    if (this.camMode === 0) {
      this.camera.position.copy(eye);
    } else {
      const dir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(this.p.pitch, this.p.yaw, 0, "YXZ"));
      const back = eye.clone().addScaledVector(dir, this.camDist);
      // recuar se bater em bloco
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const px = eye.x + dir.x * this.camDist * t, py = eye.y + dir.y * this.camDist * t, pz = eye.z + dir.z * this.camDist * t;
        if (this.solidAt(px, py, pz)) { back.set(eye.x + dir.x * this.camDist * (t - 0.12), eye.y + dir.y * this.camDist * (t - 0.12), eye.z + dir.z * this.camDist * (t - 0.12)); break; }
      }
      this.camera.position.copy(back);
    }
    this.camera.rotation.set(this.p.pitch, this.p.yaw, 0, "YXZ");
    if (this.playerBody) {
      this.playerBody.position.set(this.p.x, this.p.y, this.p.z);
      this.playerBody.rotation.y = this.p.yaw + Math.PI;
    }
  }

  // ── Guardar / carregar ─────────────────────────────────────
  private saveKey(): string { return `bateu_craft_v2_${this.opts.uid || "guest"}`; }
  saveNow(): void {
    try {
      const edits: Record<string, number[]> = {};
      for (const [k, m] of this.edits) {
        const arr: number[] = [];
        for (const [i, id] of m) { arr.push(i, id); }
        if (arr.length) edits[k] = arr;
      }
      const chests: Record<string, (Stack | null)[]> = {};
      for (const [k, v] of this.chests) chests[k] = v;
      const furn: Record<string, any> = {};
      for (const [k, f] of this.furnaces) furn[k] = f;
      const data = {
        seed: this.seed, time: this.time, day: this.day,
        p: { x: this.p.x, y: this.p.y, z: this.p.z, yaw: this.p.yaw, pitch: this.p.pitch },
        hp: this.hp, hunger: this.hunger, energy: this.energy,
        spawn: this.spawn, inv: this.inv, sel: this.sel,
        stats: this.stats, firsts: [...this.firsts],
        edits, chests, furn,
        ts: Date.now(),
      };
      localStorage.setItem(this.saveKey(), JSON.stringify(data));
      this.saveDirty = false;
    } catch { /* quota */ }
  }
  private loadSave(): void {
    try {
      const raw = localStorage.getItem(this.saveKey());
      if (!raw) return;
      this.hadSave = true;
      const d = JSON.parse(raw);
      if (d.seed) this.seed = d.seed;
      if (typeof d.time === "number") this.time = d.time;
      if (d.day) this.day = d.day;
      if (d.p) { this.p.x = d.p.x; this.p.y = d.p.y; this.p.z = d.p.z; this.p.yaw = d.p.yaw || 0; this.p.pitch = d.p.pitch || 0; }
      if (typeof d.hp === "number") this.hp = Math.max(2, d.hp);
      if (typeof d.hunger === "number") this.hunger = d.hunger;
      if (typeof d.energy === "number") this.energy = d.energy;
      if (d.spawn) this.spawn = d.spawn;
      if (Array.isArray(d.inv)) this.inv = d.inv;
      if (typeof d.sel === "number") this.sel = d.sel;
      if (d.stats) this.stats = { ...this.stats, ...d.stats };
      if (Array.isArray(d.firsts)) this.firsts = new Set(d.firsts);
      if (d.edits) for (const k of Object.keys(d.edits)) {
        const arr = d.edits[k]; const m = new Map<number, number>();
        for (let i = 0; i < arr.length; i += 2) m.set(arr[i], arr[i + 1]);
        this.edits.set(k, m);
      }
      if (d.chests) for (const k of Object.keys(d.chests)) this.chests.set(k, d.chests[k]);
      if (d.furn) for (const k of Object.keys(d.furn)) this.furnaces.set(k, d.furn[k]);
    } catch { /* ignore */ }
  }

  // ── Loop principal ─────────────────────────────────────────
  private loop = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    this.fpsEma = this.fpsEma * 0.95 + (1 / Math.max(0.001, dt)) * 0.05;

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.placeCd = Math.max(0, this.placeCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.kiCd = Math.max(0, this.kiCd - dt);

    this.updateChunks();
    this.updatePlayer(dt);
    this.updateBreaking(dt);
    this.updateMobs(dt, now / 1000);
    this.trySpawnMobs(dt);
    this.updateFx(dt);
    this.updateFurnaces(dt);
    this.updateSky(dt);
    this.updateLights(dt);
    this.updateCamera(dt);

    // saving
    this.saveT += dt;
    if (this.saveT > 14) { this.saveT = 0; if (this.saveDirty) this.saveNow(); }

    // hud
    this.hudT += dt;
    if (this.hudT > 0.12) { this.hudT = 0; this.emitHud(); }

    this.renderer.render(this.scene, this.camera);
  };

  private emitHud(): void {
    const dirs = ["Norte", "Noroeste", "Oeste", "Sudoeste", "Sul", "Sudeste", "Este", "Nordeste"];
    const facing = dirs[Math.round(((this.p.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8];
    this.onHud({
      hp: this.hp, maxHp: this.maxHp, hunger: this.hunger, air: this.air, energy: this.energy,
      dead: this.dead, breaking: this.breakProg, breakTime: this.breakTime,
      target: this.target ? (BLOCKS[this.getBlock(this.target.x, this.target.y, this.target.z)]?.name || null) : null,
      time: this.time, day: this.day, x: Math.round(this.p.x), y: Math.round(this.p.y), z: Math.round(this.p.z),
      facing, sel: this.sel, fly: this.p.fly, sprint: this.p.sprint,
      fps: Math.round(this.fpsEma), chunks: this.chunks.size, mobs: this.mobs.length,
      pl: this.getPowerLevel(), nearTable: this.nearTable, biome: this.biome,
      dashCd: this.dashCd, kiCd: this.kiCd,
      ability: { ...this.ability },
      stats: { ...this.stats },
    });
  }

  getStats(): any {
    return {
      ready: this.ready, fps: Math.round(this.fpsEma), chunks: this.chunks.size, mobs: this.mobs.length,
      pos: { x: this.p.x, y: this.p.y, z: this.p.z }, time: this.time, day: this.day,
      mined: this.stats.mined, placed: this.stats.placed, kills: this.stats.kills,
      inv: this.inv.filter(Boolean).length, sel: this.sel, hp: this.hp, biome: this.biome,
      mobsByType: this.mobs.reduce((a: any, m) => { a[m.type] = (a[m.type] || 0) + 1; return a; }, {}),
    };
  }
  setTime(t: number): void { this.time = t; }
  // ── API de teste E2E ──
  setBlockAt(x: number, y: number, z: number, id: number): void { this.setBlock(Math.floor(x), Math.floor(y), Math.floor(z), id); }
  getBlockAt(x: number, y: number, z: number): number { return this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); }
  debugSpawn(type: string): void {
    const a = Math.random() * Math.PI * 2;
    const x = this.p.x + Math.cos(a) * 12, z = this.p.z + Math.sin(a) * 12;
    let y = this.p.y + 1;
    for (let yy = CH - 2; yy > 2; yy--) { if (this.solidAt(Math.floor(x), yy, Math.floor(z))) { y = yy + 1; break; } }
    this.spawnMob(type, Math.floor(x) + 0.5, y, Math.floor(z) + 0.5);
  }
  debugState(): any { return { hp: this.hp, hunger: this.hunger, energy: this.energy, sel: this.sel, nearTable: this.nearTable, dead: this.dead }; }
  setRenderDist(n: number): void {
    this.renderDist = Math.max(2, Math.min(6, n));
    this.meshR = this.renderDist; this.dataR = this.renderDist + 1;
    (this.scene.fog as THREE.Fog).near = this.meshR * CS * 0.72;
    (this.scene.fog as THREE.Fog).far = this.meshR * CS * 0.99;
  }
  setMuted(m: boolean): void { this.muted = m; }
  setDpr(d: number): void { this.dpr = d; this.renderer.setPixelRatio(d); }
  markReady(): void { this.ready = true; }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.saveNow();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    window.removeEventListener("resize", this.resize);
    try { this.renderer.dispose(); } catch { /* ignore */ }
    this.scene?.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); });
      }
    });
    this.chunks.clear();
  }
}


