// ============================================================
// ARENA DAS LENDAS — MOTOR 3D (three.js, vista de topo estilo LoL)
// ────────────────────────────────────────────────────────────
// Motor do MMO de arena. NADA de voxels/blocos (o estilo Minecraft
// foi apagado a pedido do utilizador): terreno suave com cores por
// vértice, personagens low-poly orgânicas, câmara fixa de topo
// (offset constante, como no LoL), click-to-move + WASD, ataques
// automáticos, habilidades QWER com cooldown/mana, projéteis,
// partículas, números de dano, minimapa e multi-jogador via mp.ts.
//
// Modos HONESTOS:
//  · ONLINE — mobs autoritativos do servidor (snapshots + eventos);
//  · SOLO   — a MESMA simulação de mobs (simulacao.ts) corre aqui,
//             no aparelho; o HUD mostra «Modo Solo» e nunca finge
//             jogadores remotos.
// Lição v60 aplicada: destruir() dispose TUDO (geometrias, materiais,
// texturas, renderer + forceContextLoss) — seguro 2×, sem contextos
// WebGL zumbis. PCFShadowMap (o PCFSoft foi removido de three).
// ============================================================
import * as THREE from "three";
import {
  CAMPEOES, MOBS, CAMPS, type CampeaoId, type SlotHabilidade,
  type MobEstado, type AnimHeroi, type EstadoHeroi,
  NIVEL_MAX, POS_BASE, RAIO_FONTE, REGEN_FONTE_HP, REGEN_FONTE_MP, TEMPO_RESPAWN,
  RAIO_INTERESSE,
  statsDe, danoHabilidade, curaHabilidade, nivelDeXp, xpParaSubir,
  reduzArmadura, dist, dist2, dentroMundo, recolherPos, posReviver,
  custoItem, compraValida, dpsTeto, type StatsCampeao,
} from "./core.ts";
import {
  ARBUSTOS, TORRES, TRILHO_DRAGAO, TRILHO_BARAO, LANE, RIO_LARGURA, RIO_BORDA,
  corTerreno, arvores, rochas, tipoTerreno, CORES_TERRENO,
} from "./mundo.ts";
import {
  criarMobs, passoMobs, aplicarDanoMob, eventosVazios, type MobSim,
} from "./simulacao.ts";
import type { RedeArena, EstadoMp } from "./mp.ts";

// ── Contrato com a UI (React) ──────────────────────────────────
export interface EstadoHud {
  nome: string; campeao: CampeaoId; nivel: number;
  xpNoNivel: number; xpParaSubirNivel: number;
  essencia: number; abates: number;
  hp: number; hpMax: number; mp: number; mpMax: number;
  escudo: number;
  cds: Record<SlotHabilidade, number>;
  cdsFrac: Record<SlotHabilidade, number>;
  morto: boolean; respawnFalta: number;
  emFonte: boolean; pressa: boolean;
  fps: number;
  alvoTipo: string;
}

export interface AvisosMotor {
  danoRecebido: number;       // flash vermelho
  subiuNivel: boolean;        // efeito de nível
  matou: string;              // tipo do mob morto ("")
  erroHabilidade: "" | "mana" | "cd";
  cura: number;
}

export interface OpcoesMotor {
  canvas: HTMLCanvasElement;
  nome: string;
  campeao: CampeaoId;
  nivelInicial: number;
  xpInicial: number;
  essenciaInicial: number;
  itens: Record<string, number>;
  abatesInicial: number;
  rede: RedeArena | null;     // null = SOLO
  aoHud: (e: EstadoHud) => void;
  aoAviso: (a: AvisosMotor) => void;
  aoGolpeMob: (id: number, dano: number, x: number, z: number) => void;
  aoMorte: () => void;
  aoReviver: () => void;
}

const OFFSET_CAMARA = new THREE.Vector3(0, 26, 15.5);   // pitch ≈ 59° (estilo LoL)
const ZOOM_MIN = 0.55, ZOOM_MAX = 1.6;
const PASSO = 1 / 60;

// ── Util: sprite de texto (nomes, barras, números de dano) ─────
interface BarraEntidade { sprite: THREE.Sprite; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; }

function canvasSprite(largura: number, altura: number): BarraEntidade {
  const cv = document.createElement("canvas");
  cv.width = largura; cv.height = altura;
  const ctx = cv.getContext("2d")!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 10;
  return { sprite, ctx, tex };
}

function desenharBarraVida(
  ctx: CanvasRenderingContext2D, tex: THREE.CanvasTexture,
  frac: number, cor: string, nome: string, escudoFrac = 0,
): void {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (nome) {
    ctx.font = `bold ${Math.round(h * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(nome, w / 2, h * 0.26);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(nome, w / 2, h * 0.26);
  }
  const y = h * 0.62, bh = h * 0.26, x = w * 0.06, bw = w * 0.88;
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2);
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, bw * Math.max(0, Math.min(1, frac)), bh);
  if (escudoFrac > 0) {
    ctx.fillStyle = "rgba(225,230,255,0.9)";
    ctx.fillRect(x, y - 3, bw * Math.max(0, Math.min(1, escudoFrac)), 3);
  }
  tex.needsUpdate = true;
}

function desenharTextoGrande(ctx: CanvasRenderingContext2D, tex: THREE.CanvasTexture, texto: string, cor: string): void {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.font = `bold ${Math.round(h * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.strokeText(texto, w / 2, h / 2);
  ctx.fillStyle = cor;
  ctx.fillText(texto, w / 2, h / 2);
  tex.needsUpdate = true;
}

// ── Materiais partilhados (recriados por motor após destruir) ──
let MATS: Record<string, THREE.MeshStandardMaterial> | null = null;
function materiais(): Record<string, THREE.MeshStandardMaterial> {
  if (!MATS) {
    MATS = {
      pele: new THREE.MeshStandardMaterial({ color: 0xe8c39e, roughness: 0.8 }),
      metal: new THREE.MeshStandardMaterial({ color: 0xc9cfd8, metalness: 0.6, roughness: 0.35 }),
      madeira: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
      pedra: new THREE.MeshStandardMaterial({ color: 0x8d8f94, roughness: 0.95 }),
      folha: new THREE.MeshStandardMaterial({ color: 0x2f6e33, roughness: 0.9 }),
      folhaEscura: new THREE.MeshStandardMaterial({ color: 0x255a2c, roughness: 0.9 }),
      agua: new THREE.MeshStandardMaterial({ color: 0x2e6d9e, transparent: true, opacity: 0.72, roughness: 0.25 }),
      arbusto: new THREE.MeshStandardMaterial({ color: 0x2c7a3d, transparent: true, opacity: 0.55, roughness: 1 }),
      cristal: new THREE.MeshStandardMaterial({ color: 0x7fd4ff, emissive: 0x3aa0d8, emissiveIntensity: 0.7, roughness: 0.3 }),
      escudo: new THREE.MeshStandardMaterial({ color: 0xdce6ff, transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
      fonte: new THREE.MeshStandardMaterial({ color: 0x9fd8ef, emissive: 0x2b7ca0, emissiveIntensity: 0.5, transparent: true, opacity: 0.5 }),
      mobLobo: new THREE.MeshStandardMaterial({ color: 0x555b63, roughness: 0.9 }),
      mobRaptor: new THREE.MeshStandardMaterial({ color: 0x5a8f4e, roughness: 0.9 }),
      mobGolem: new THREE.MeshStandardMaterial({ color: 0x7a7f87, roughness: 1 }),
      mobEspectro: new THREE.MeshStandardMaterial({ color: 0x9a6fe0, transparent: true, opacity: 0.82, roughness: 0.6 }),
      mobRaposa: new THREE.MeshStandardMaterial({ color: 0xc96b2f, roughness: 0.85 }),
      mobDragao: new THREE.MeshStandardMaterial({ color: 0xa8322a, roughness: 0.7 }),
      mobBarao: new THREE.MeshStandardMaterial({ color: 0x4a2d6e, roughness: 0.8 }),
      chifre: new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.7 }),
    };
  }
  return MATS!;
}

function malha(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Modelo do herói (grupo com partes nomeadas para animar). */
function modeloHeroi(cor: string, papel: string): THREE.Group {
  const g = new THREE.Group();
  const matCor = new THREE.MeshStandardMaterial({ color: new THREE.Color(cor), roughness: 0.65 });
  const corpo = malha(GEO_CAPS, matCor, 0, 0.95, 0);
  g.add(corpo);
  g.add(malha(GEO_ESFERA, materiais().pele, 0, 1.52, 0));
  g.add(malha(GEO_ESFERA_PQ, matCor, -0.44, 1.18, 0));
  g.add(malha(GEO_ESFERA_PQ, matCor, 0.44, 1.18, 0));
  const arma = new THREE.Group();
  if (papel === "guerreiro") {
    arma.add(malha(new THREE.BoxGeometry(0.09, 1.0, 0.22), materiais().metal, 0, 0.5, 0));
    arma.add(malha(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 8), materiais().madeira, 0, -0.05, 0));
  } else if (papel === "mago" || papel === "curandeira") {
    arma.add(malha(new THREE.CylinderGeometry(0.04, 0.05, 1.15, 8), materiais().madeira, 0, 0.45, 0));
    arma.add(malha(new THREE.OctahedronGeometry(0.12), materiais().cristal, 0, 1.05, 0));
  } else {
    const arco = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 16, Math.PI), materiais().madeira);
    arco.rotation.z = Math.PI / 2;
    arco.position.y = 0.55;
    arco.castShadow = true;
    arma.add(arco);
  }
  arma.position.set(0.5, 0.85, 0.12);
  arma.name = "arma";
  g.add(arma);
  const ring = new THREE.Mesh(GEO_ANEL, new THREE.MeshBasicMaterial({ color: new THREE.Color(cor), transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);
  return g;
}

/** Modelo de mob por tipo (low-poly orgânico). */
function modeloMob(tipo: string): THREE.Group {
  const g = new THREE.Group();
  const m = materiais();
  const chave = `mob${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}`;
  const mat = m[chave] ?? m.pedra;
  switch (tipo) {
    case "lobo": {
      const corpo = malha(GEO_CAPS, mat, 0, 0.62, 0);
      corpo.scale.set(1, 0.75, 1.5);
      const cabeca = malha(GEO_ESFERA, mat, 0, 0.78, 0.62);
      cabeca.scale.set(0.85, 0.85, 1);
      g.add(corpo, cabeca,
        malha(new THREE.ConeGeometry(0.09, 0.22, 6), m.chifre, -0.14, 1.02, 0.58),
        malha(new THREE.ConeGeometry(0.09, 0.22, 6), m.chifre, 0.14, 1.02, 0.58));
      break;
    }
    case "raptor": {
      const corpo = malha(GEO_CAPS, mat, 0, 0.5, 0);
      corpo.scale.set(0.8, 0.7, 1.1);
      const cabeca = malha(GEO_ESFERA, mat, 0, 0.72, 0.45);
      cabeca.scale.set(0.7, 0.7, 0.7);
      const bico = malha(new THREE.ConeGeometry(0.08, 0.3, 6), m.chifre, 0, 0.72, 0.75);
      bico.rotation.x = Math.PI / 2;
      g.add(corpo, cabeca, bico);
      break;
    }
    case "golem": {
      g.add(malha(new THREE.DodecahedronGeometry(0.85), mat, 0, 1.0, 0),
        malha(new THREE.DodecahedronGeometry(0.34), mat, -0.92, 0.85, 0.1),
        malha(new THREE.DodecahedronGeometry(0.34), mat, 0.92, 0.85, 0.1),
        malha(new THREE.DodecahedronGeometry(0.36), mat, 0, 1.85, 0));
      break;
    }
    case "espectro": {
      const nucleo = malha(GEO_ESFERA, m.cristal, 0, 0.95, 0.1);
      nucleo.scale.setScalar(0.7);
      g.add(malha(new THREE.ConeGeometry(0.5, 1.3, 10), mat, 0, 1.05, 0), nucleo);
      break;
    }
    case "raposa": {
      const corpo = malha(GEO_CAPS, mat, 0, 0.5, 0);
      corpo.scale.set(0.75, 0.6, 1.3);
      const cabeca = malha(GEO_ESFERA, mat, 0, 0.62, 0.55);
      cabeca.scale.set(0.7, 0.7, 0.8);
      const cauda = malha(new THREE.ConeGeometry(0.16, 0.6, 7), mat, 0, 0.55, -0.6);
      cauda.rotation.x = Math.PI / 2.6;
      g.add(corpo, cabeca, cauda);
      break;
    }
    case "dragao": {
      const corpo = malha(GEO_CAPS, mat, 0, 1.3, 0);
      corpo.scale.set(1.3, 1.5, 1.9);
      const cabeca = malha(GEO_ESFERA, mat, 0, 1.75, 1.3);
      cabeca.scale.set(0.9, 0.8, 1.2);
      const asaL = malha(new THREE.ConeGeometry(0.9, 1.6, 5), mat, -1.15, 1.7, -0.2);
      asaL.rotation.z = Math.PI / 2.4; asaL.scale.y = 0.2;
      const asaR = malha(new THREE.ConeGeometry(0.9, 1.6, 5), mat, 1.15, 1.7, -0.2);
      asaR.rotation.z = -Math.PI / 2.4; asaR.scale.y = 0.2;
      g.add(corpo, cabeca,
        malha(new THREE.ConeGeometry(0.1, 0.5, 6), m.chifre, -0.3, 2.25, 1.1),
        malha(new THREE.ConeGeometry(0.1, 0.5, 6), m.chifre, 0.3, 2.25, 1.1),
        asaL, asaR);
      break;
    }
    case "barao": {
      const coroa = malha(new THREE.TorusGeometry(0.5, 0.07, 8, 18), m.chifre, 0, 4.05, 0);
      coroa.rotation.x = Math.PI / 2;
      g.add(malha(new THREE.DodecahedronGeometry(1.7), mat, 0, 2.0, 0),
        malha(new THREE.DodecahedronGeometry(0.62), mat, -1.85, 1.7, 0.2),
        malha(new THREE.DodecahedronGeometry(0.62), mat, 1.85, 1.7, 0.2),
        malha(new THREE.DodecahedronGeometry(0.6), mat, 0, 3.7, 0),
        coroa);
      break;
    }
    default:
      g.add(malha(GEO_CAPS, m.pedra, 0, 0.7, 0));
  }
  return g;
}

// geometrias partilhadas por todos os modelos (persistem entre motores)
const GEO_CAPS = new THREE.CapsuleGeometry(0.42, 0.55, 6, 12);
const GEO_ESFERA = new THREE.SphereGeometry(0.26, 12, 10);
const GEO_ESFERA_PQ = new THREE.SphereGeometry(0.16, 10, 8);
const GEO_ANEL = new THREE.RingGeometry(0.62, 0.78, 28);
const GEO_PROJETIL = new THREE.SphereGeometry(0.18, 10, 8);

interface MobVisual { grupo: THREE.Group; barra: BarraEntidade; ultimoHp: number; }
interface HeroiVisual { grupo: THREE.Group; barra: BarraEntidade; alvoX: number; alvoZ: number; alvoRy: number; }
interface Projetil { malha: THREE.Mesh; vx: number; vz: number; vida: number; dano: number; habilidades: boolean; }
interface Particula { sprite: THREE.Sprite; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; vida: number; vidaMax: number; vx: number; vy: number; vz: number; }
interface FxAnel { malha: THREE.Mesh; vida: number; vidaMax: number; }

export class MotorArena {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private luz: THREE.DirectionalLight | null = null;
  private raf = 0;
  private rodando = false;
  private destruido = false;
  private readonly opts: OpcoesMotor;
  private container: HTMLElement;

  // herói local
  private heroi!: THREE.Group;
  private armaHeroi: THREE.Group | null = null;
  private barraHeroi!: BarraEntidade;
  private hp = 0; private hpMax = 0; private mp = 0; private mpMax = 0;
  private escudo = 0; private escudoAte = 0;
  private nivel = 1; private xpTotal = 0; private essencia = 0; private abates = 0;
  private itens: Record<string, number>;
  private stats: StatsCampeao;
  private cds: Record<SlotHabilidade, number> = { Q: 0, W: 0, E: 0, R: 0 };
  private morto = false; private respawnAte = 0;
  private pressaAte = 0;
  private alvoMobId = -1;

  // movimento
  private px = 0; private pz = 0; private ry = 0;
  private alvoMoverX: number | null = null; private alvoMoverZ: number | null = null;
  private teclas: Record<string, boolean> = {};
  private joyX = 0; private joyZ = 0;
  private cursorMundo = new THREE.Vector3();
  private anim: AnimHeroi = "parado";
  private balancoArma = 0;
  private ultimoAtaque = 0;

  // mobs
  private mobsSim: MobSim[] = [];
  private mobsVisual: Map<number, MobVisual> = new Map();
  private mobsOnline: Map<number, MobEstado> = new Map();
  private readonly solo: boolean;

  // remotos
  private remotos: Map<number, HeroiVisual> = new Map();

  // fx
  private projeteis: Projetil[] = [];
  private particulas: Particula[] = [];
  private aneis: FxAnel[] = [];
  private poolNumeros: Particula[] = [];
  private bubbleEscudo: THREE.Mesh | null = null;

  // câmara / loop
  private zoom = 1;
  private acumulado = 0;
  private ultimoMs = 0;
  private fps = 60; private fpsAcum = 0; private fpsFrames = 0;
  private avisos: AvisosMotor = { danoRecebido: 0, subiuNivel: false, matou: "", erroHabilidade: "", cura: 0 };
  private hudMs = 0;
  private minimapaBase: HTMLCanvasElement | null = null;
  private observador: ResizeObserver | null = null;

  // caches de dispose
  private geoCache: THREE.BufferGeometry[] = [];
  private matCache: THREE.Material[] = [];
  private texCache: THREE.Texture[] = [];

  constructor(opts: OpcoesMotor) {
    this.opts = opts;
    this.container = opts.canvas.parentElement ?? document.body;
    this.solo = opts.rede === null;
    this.itens = { ...opts.itens };
    this.nivel = Math.max(1, Math.min(NIVEL_MAX, Math.floor(opts.nivelInicial)));
    this.xpTotal = Math.max(0, Math.floor(opts.xpInicial));
    this.essencia = Math.max(0, Math.floor(opts.essenciaInicial));
    this.abates = Math.max(0, Math.floor(opts.abatesInicial));
    this.stats = statsDe(opts.campeao, this.nivel, this.itens);
    this.iniciar();
  }

  // ═══════════════════════ SETUP ═══════════════════════
  private iniciar(): void {
    const canvas = this.opts.canvas;
    const leve = new URLSearchParams(window.location.search).has("arena-leve");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !leve, powerPreference: "high-performance" });
    renderer.shadowMap.enabled = !leve;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(leve ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b5d4);
    scene.fog = new THREE.Fog(0x87b5d4, 95, 210);
    this.scene = scene;

    const cam = new THREE.PerspectiveCamera(52, 1, 0.5, 400);
    this.camera = cam;

    scene.add(new THREE.HemisphereLight(0xdfeaf5, 0x3c4a33, 1.05));
    const sol = new THREE.DirectionalLight(0xfff2d8, 1.9);
    sol.position.set(30, 48, 18);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.camera.left = -48; sol.shadow.camera.right = 48;
    sol.shadow.camera.top = 48; sol.shadow.camera.bottom = -48;
    sol.shadow.camera.near = 8; sol.shadow.camera.far = 140;
    sol.shadow.bias = -0.0006;
    scene.add(sol);
    scene.add(sol.target);
    this.luz = sol;

    this.construirTerreno();
    this.construirDecoracao();
    this.construirEstruturas();

    const def = CAMPEOES[this.opts.campeao];
    const spawn = posReviver(Math.floor(Math.random() * 8));
    this.px = spawn.x; this.pz = spawn.z;
    this.hpMax = this.stats.hpMax; this.hp = this.hpMax;
    this.mpMax = this.stats.mpMax; this.mp = this.mpMax;
    this.heroi = modeloHeroi(def.cor, def.papel);
    this.armaHeroi = this.heroi.getObjectByName("arma") as THREE.Group | null;
    this.heroi.position.set(this.px, 0, this.pz);
    scene.add(this.heroi);
    this.barraHeroi = canvasSprite(192, 44);
    this.barraHeroi.sprite.scale.set(3.0, 0.69, 1);
    scene.add(this.barraHeroi.sprite);
    this.atualizarBarraHeroi();

    if (this.solo) {
      this.mobsSim = criarMobs(Date.now());
      for (const m of this.mobsSim) this.garantirMobVisual(m);
    }

    this.bubbleEscudo = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 10), materiais().escudo);
    this.bubbleEscudo.visible = false;
    this.heroi.add(this.bubbleEscudo);

    this.ligarEventos();
    this.redimensionar();
    this.observador = new ResizeObserver(() => this.redimensionar());
    this.observador.observe(this.container);
    this.rodando = true;
    this.ultimoMs = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private guardar(geo?: THREE.BufferGeometry, mat?: THREE.Material, tex?: THREE.Texture): void {
    if (geo) this.geoCache.push(geo);
    if (mat) this.matCache.push(mat);
    if (tex) this.texCache.push(tex);
  }

  private construirTerreno(): void {
    const scene = this.scene!;
    const seg = 128;
    const geo = new THREE.PlaneGeometry(220, 220, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cores = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const c = corTerreno(x, z);
      const dRio = Math.abs(x - z) / Math.SQRT2;
      const dLane = distParaPolilinha(x, z, LANE);
      const montanha = Math.max(0, Math.sin(x * 0.045 + 2.1) * Math.cos(z * 0.041) - 0.42) * 6.5;
      const borda = Math.max(0, Math.hypot(x, z) - 88) * 0.35;
      const h = (montanha + borda) * Math.min(1, Math.max(0, (dRio - 9) / 10)) * Math.min(1, Math.max(0, (dLane - 9) / 8));
      pos.setY(i, h);
      cores[i * 3] = c[0]; cores[i * 3 + 1] = c[1]; cores[i * 3 + 2] = c[2];
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cores, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 });
    this.guardar(geo, mat);
    const chao = new THREE.Mesh(geo, mat);
    chao.receiveShadow = true;
    scene.add(chao);

    // faixa de água SÓ no canal do rio (diagonal z=x) — o resto é terra firme
    const aguaGeo = new THREE.PlaneGeometry(RIO_LARGURA * 2 + RIO_BORDA, 340, 1, 1);
    aguaGeo.rotateX(-Math.PI / 2);
    aguaGeo.rotateY(Math.PI / 4);
    const aguaMat = materiais().agua.clone();
    this.guardar(aguaGeo, aguaMat);
    const agua = new THREE.Mesh(aguaGeo, aguaMat);
    agua.position.y = 0.06;
    agua.name = "agua";
    scene.add(agua);
  }

  private construirDecoracao(): void {
    const scene = this.scene!;
    const arv = arvores();
    const troncoGeo = new THREE.CylinderGeometry(0.22, 0.3, 1.6, 7);
    const copaGeo = new THREE.IcosahedronGeometry(1.05, 0);
    this.guardar(troncoGeo);
    this.guardar(copaGeo);
    const tInst = new THREE.InstancedMesh(troncoGeo, materiais().madeira, arv.length);
    const cInstA = new THREE.InstancedMesh(copaGeo, materiais().folha, Math.ceil(arv.length / 2));
    const cInstB = new THREE.InstancedMesh(copaGeo, materiais().folhaEscura, Math.floor(arv.length / 2));
    tInst.castShadow = true; cInstA.castShadow = true; cInstB.castShadow = true;
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Vector3();
    let ia = 0, ib = 0;
    arv.forEach((d, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.v * 6.28);
      mtx.compose(new THREE.Vector3(d.x, 0.8 * d.s, d.z), q, e.set(d.s, d.s, d.s));
      tInst.setMatrixAt(i, mtx);
      const escala = d.s * (0.95 + d.v * 0.35);
      mtx.compose(new THREE.Vector3(d.x, 2.35 * d.s, d.z), q, e.set(escala, escala * 1.15, escala));
      if (i % 2 === 0) cInstA.setMatrixAt(ia++, mtx); else cInstB.setMatrixAt(ib++, mtx);
    });
    scene.add(tInst, cInstA, cInstB);

    const rk = rochas();
    const rochaGeo = new THREE.DodecahedronGeometry(0.6, 0);
    this.guardar(rochaGeo);
    const rInst = new THREE.InstancedMesh(rochaGeo, materiais().pedra, rk.length);
    rInst.castShadow = true;
    rk.forEach((d, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0.3, 1, 0.2).normalize(), d.v * 6.28);
      mtx.compose(new THREE.Vector3(d.x, 0.3 * d.s, d.z), q, e.set(d.s, d.s * 0.7, d.s));
      rInst.setMatrixAt(i, mtx);
    });
    scene.add(rInst);

    const arbGeo = new THREE.CircleGeometry(1, 24);
    arbGeo.rotateX(-Math.PI / 2);
    this.guardar(arbGeo);
    for (const a of ARBUSTOS) {
      const mat = materiais().arbusto.clone();
      this.guardar(undefined, mat);
      const m2 = new THREE.Mesh(arbGeo, mat);
      m2.position.set(a.x, 0.18, a.z);
      m2.scale.setScalar(a.r);
      scene.add(m2);
    }
  }

  private construirEstruturas(): void {
    const scene = this.scene!;
    const m = materiais();
    const fonteAnel = malha(new THREE.TorusGeometry(5.4, 0.4, 10, 36), m.pedra, POS_BASE.x, 0.5, POS_BASE.z);
    fonteAnel.rotation.x = -Math.PI / 2;
    const fonteAgua = new THREE.Mesh(new THREE.CircleGeometry(5.0, 30), m.fonte);
    fonteAgua.rotation.x = -Math.PI / 2;
    fonteAgua.position.set(POS_BASE.x, 0.4, POS_BASE.z);
    const cristal = malha(new THREE.OctahedronGeometry(1.5), m.cristal, POS_BASE.x, 2.6, POS_BASE.z);
    this.guardar(fonteAnel.geometry);
    this.guardar(fonteAgua.geometry);
    this.guardar(cristal.geometry);
    scene.add(fonteAnel, fonteAgua, cristal);

    const torreGeo = new THREE.CylinderGeometry(1.15, 1.5, 6.5, 10);
    this.guardar(torreGeo);
    for (const t of TORRES) {
      const topo = malha(new THREE.OctahedronGeometry(0.8), m.cristal, t.x, 7.2, t.z);
      this.guardar(topo.geometry);
      scene.add(malha(torreGeo, m.pedra, t.x, 3.25, t.z), topo);
    }

    const platGeo = new THREE.CircleGeometry(7.5, 26);
    platGeo.rotateX(-Math.PI / 2);
    this.guardar(platGeo);
    for (const c of CAMPS) {
      const plat = new THREE.Mesh(platGeo, m.pedra);
      plat.position.set(c.x, 0.06, c.z);
      scene.add(plat);
      if (c.tipo === "barao" || c.tipo === "dragao") {
        const pilares = c.tipo === "barao" ? 4 : 2;
        for (let i = 0; i < pilares; i++) {
          const ang = (i / pilares) * Math.PI * 2 + 0.6;
          const p = malha(new THREE.CylinderGeometry(0.5, 0.7, 4.2, 8), m.pedra, c.x + Math.cos(ang) * 6.4, 2.1, c.z + Math.sin(ang) * 6.4);
          this.guardar(p.geometry);
          scene.add(p);
        }
      }
    }

    for (const tr of [TRILHO_DRAGAO, TRILHO_BARAO]) {
      for (const p of tr) {
        const mk = malha(new THREE.DodecahedronGeometry(0.28), m.pedra, p.x, 0.2, p.z);
        this.guardar(mk.geometry);
        scene.add(mk);
      }
    }
  }

  // ═══════════════════════ INPUT ═══════════════════════
  private aoPonteiroBaixo = (ev: PointerEvent) => {
    if (this.morto) return;
    if (ev.button !== 0 && ev.button !== 2) return;
    this.calcularCursor(ev);
    const mob = this.mobMaisPertoDoCursor(3.2);
    if (mob) { this.alvoMobId = mob.id; this.alvoMoverX = null; this.alvoMoverZ = null; return; }
    this.alvoMobId = -1;
    this.alvoMoverX = this.cursorMundo.x;
    this.alvoMoverZ = this.cursorMundo.z;
  };
  private aoPonteiroMover = (ev: PointerEvent) => { this.calcularCursor(ev); };
  private aoContexto = (ev: Event) => { ev.preventDefault(); };
  private aoRoda = (ev: WheelEvent) => {
    ev.preventDefault();
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * (ev.deltaY > 0 ? 1.08 : 0.93)));
  };
  private aoTeclaBaixo = (ev: KeyboardEvent) => {
    const k = ev.key.toLowerCase();
    this.teclas[k] = true;
    if (k === "q" || k === "e" || k === "r") { ev.preventDefault(); this.usarHabilidade(k.toUpperCase() as SlotHabilidade); }
    // W do teclado move; a habilidade W usa o botão/botão móvel + tecla F (padrão acessível)
    if (k === "f") { ev.preventDefault(); this.usarHabilidade("W"); }
    if (k === "s" || k === " ") { this.alvoMoverX = null; this.alvoMoverZ = null; this.alvoMobId = -1; }
  };
  private aoTeclaAcima = (ev: KeyboardEvent) => { this.teclas[ev.key.toLowerCase()] = false; };
  private aoPerderFoco = () => { this.teclas = {}; this.joyX = 0; this.joyZ = 0; };

  private ligarEventos(): void {
    const c = this.opts.canvas;
    c.addEventListener("pointerdown", this.aoPonteiroBaixo);
    c.addEventListener("pointermove", this.aoPonteiroMover);
    c.addEventListener("contextmenu", this.aoContexto);
    c.addEventListener("wheel", this.aoRoda, { passive: false });
    window.addEventListener("keydown", this.aoTeclaBaixo);
    window.addEventListener("keyup", this.aoTeclaAcima);
    window.addEventListener("blur", this.aoPerderFoco);
    document.addEventListener("visibilitychange", this.aoPerderFoco);
  }

  private calcularCursor(ev: PointerEvent): void {
    const canvas = this.opts.canvas;
    const r = canvas.getBoundingClientRect();
    const ndcX = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const ndcY = -((ev.clientY - r.top) / r.height) * 2 + 1;
    if (!this.camera) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ponto = new THREE.Vector3();
    if (ray.ray.intersectPlane(plano, ponto)) this.cursorMundo.copy(ponto);
  }

  // ═══════════════════════ ALVOS ═══════════════════════
  private listaMobs(): (MobSim | MobEstado)[] {
    return this.solo ? this.mobsSim.filter((m) => m.respawnTs <= 0) : Array.from(this.mobsOnline.values());
  }
  private obterMob(id: number): MobSim | MobEstado | null {
    if (this.solo) return this.mobsSim.find((m) => m.id === id && m.respawnTs <= 0) ?? null;
    return this.mobsOnline.get(id) ?? null;
  }
  private mobMaisPerto(raio: number): MobSim | MobEstado | null {
    let melhor: MobSim | MobEstado | null = null;
    let melhorD = raio;
    for (const m of this.listaMobs()) {
      const d = dist(this.px, this.pz, m.x, m.z);
      if (d < melhorD) { melhorD = d; melhor = m; }
    }
    return melhor;
  }
  private mobMaisPertoDoCursor(margem: number): MobSim | MobEstado | null {
    let melhor: MobSim | MobEstado | null = null;
    let melhorD = margem;
    for (const m of this.listaMobs()) {
      const d = dist(this.cursorMundo.x, this.cursorMundo.z, m.x, m.z);
      const raio = MOBS[m.tipo].chefe ? 3.4 : 1.4;
      if (d - raio < melhorD) { melhorD = Math.max(0, d - raio); melhor = m; }
    }
    return melhor;
  }
  private mobsPertoContagem(raio: number): number {
    const r2 = raio * raio;
    return this.listaMobs().filter((m) => dist2(this.px, this.pz, m.x, m.z) < r2).length;
  }

  // ═══════════════════════ API PÚBLICA (UI) ═══════════════════════
  setJoystick(x: number, z: number): void {
    this.joyX = Math.max(-1, Math.min(1, x));
    this.joyZ = Math.max(-1, Math.min(1, z));
    if (this.joyX !== 0 || this.joyZ !== 0) { this.alvoMoverX = null; this.alvoMoverZ = null; this.alvoMobId = -1; }
  }

  /** Cast com ponto-alvo explícito (desktop: cursor; mobile: auto). */
  usarHabilidade(slot: SlotHabilidade, paraX?: number, paraZ?: number): boolean {
    if (this.morto || this.destruido) return false;
    const def = CAMPEOES[this.opts.campeao].habilidades[slot];
    if (this.cds[slot] > 0) { this.avisos.erroHabilidade = "cd"; return false; }
    if (this.mp < def.mana) { this.avisos.erroHabilidade = "mana"; return false; }

    // ponto-alvo: explícito > cursor > mob auto > frente
    let tx: number, tz: number;
    if (paraX !== undefined && paraZ !== undefined) { tx = paraX; tz = paraZ; }
    else if (this.cursorMundo.lengthSq() > 0.001 && !this.joyAtivo()) { tx = this.cursorMundo.x; tz = this.cursorMundo.z; }
    else {
      const mob = this.mobMaisPerto(Math.max(def.alcance, def.area ?? 0) + 2);
      if (mob) { tx = mob.x; tz = mob.z; }
      else { tx = this.px + Math.sin(this.ry) * (def.alcance || 5); tz = this.pz + Math.cos(this.ry) * (def.alcance || 5); }
    }

    // clamp ao alcance (comportamento LoL: cast no limite)
    if (def.alcance > 0) {
      const d = dist(this.px, this.pz, tx, tz);
      if (d > def.alcance) {
        tx = this.px + ((tx - this.px) / d) * def.alcance;
        tz = this.pz + ((tz - this.pz) / d) * def.alcance;
      }
    }

    this.mp -= def.mana;
    this.cds[slot] = def.cd;
    this.ry = Math.atan2(tx - this.px, tz - this.pz) || this.ry;
    this.executarHabilidade(slot, def, tx, tz);
    return true;
  }

  private joyAtivo(): boolean { return this.joyX !== 0 || this.joyZ !== 0; }

  private executarHabilidade(slot: SlotHabilidade, def: typeof CAMPEOES[CampeaoId]["habilidades"][SlotHabilidade], tx: number, tz: number): void {
    const nivel = this.nivel;
    const poder = this.stats.poder;
    const corHeroi = new THREE.Color(CAMPEOES[this.opts.campeao].cor);

    if (def.dash) {
      const d = dist(this.px, this.pz, tx, tz);
      const passo = Math.min(def.dash, d);
      const nx = this.px + ((tx - this.px) / (d || 1)) * passo;
      const nz = this.pz + ((tz - this.pz) / (d || 1)) * passo;
      if (dentroMundo(nx, nz)) {
        if (def.dano > 0) this.danificarNoCaminho(this.px, this.pz, nx, nz, danoHabilidade(def, nivel, poder));
        this.px = nx; this.pz = nz;
        this.fxAnel(this.px, this.pz, 1.4, corHeroi);
      }
    } else if (def.blink) {
      this.fxAnel(this.px, this.pz, 1.6, corHeroi);
      const nx = recolherPos(tx, tz);
      this.px = nx.x; this.pz = nx.z;
      this.fxAnel(this.px, this.pz, 1.6, corHeroi);
    }

    if (def.escudo) {
      this.escudo = curaHabilidade(def, nivel, poder);
      this.escudoAte = performance.now() / 1000 + (def.durLentidao ?? 3);
      if (this.bubbleEscudo) this.bubbleEscudo.visible = true;
    } else if (def.cura) {
      const cura = curaHabilidade(def, nivel, poder);
      this.hp = Math.min(this.hpMax, this.hp + cura);
      this.numeroFlutuante(this.px, 2.2, this.pz, cura, "#7fe07f");
      this.avisos.cura = cura;
      if (def.area) {
        this.fxAnel(this.px, this.pz, def.area, new THREE.Color(0x7fe07f));
        for (const h of this.remotos.values()) {
          if (dist(h.grupo.position.x, h.grupo.position.z, this.px, this.pz) <= def.area) {
            this.numeroFlutuante(h.grupo.position.x, 2.2, h.grupo.position.z, cura, "#7fe07f");
          }
        }
      }
    }

    if (slot === "E" && this.opts.campeao === "nara") {
      this.pressaAte = performance.now() / 1000 + 3;
      this.fxAnel(this.px, this.pz, 1.8, new THREE.Color(0xffe08a));
    }

    if (def.dano > 0) {
      const danoBruto = danoHabilidade(def, nivel, poder);
      if (def.velocidadeProjetil) {
        this.dispararProjetil(tx, tz, danoBruto, def.velocidadeProjetil, true);
      } else if (def.area && def.area > 0) {
        if (slot === "R" && this.opts.campeao === "vex") {
          const porPulso = Math.max(1, Math.round(danoBruto / 4));
          for (let i = 0; i < 4; i++) {
            window.setTimeout(() => {
              if (this.destruido || this.morto) return;
              this.danificarEmArea(tx, tz, def.area ?? 3, porPulso);
              this.fxAnel(tx, tz, def.area ?? 3, new THREE.Color(0x9adf6a));
            }, i * 500);
          }
        } else {
          this.danificarEmArea(tx, tz, def.area, danoBruto);
          this.fxAnel(tx, tz, def.area, slot === "R" ? new THREE.Color(0xffb14a) : corHeroi);
        }
      } else if (slot === "Q" && this.opts.campeao === "kaimu") {
        this.danificarEmFrente(danoBruto, def.area ?? 4.6);
        this.fxAnel(this.px, this.pz, 2.2, new THREE.Color(0xffa25a));
      }
      this.balancoArma = 1;
    }
  }

  comprar(id: string): boolean {
    if (!dentroDaFonte(this.px, this.pz)) return false;
    const ja = this.itens[id] ?? 0;
    const v = compraValida(id, ja, this.essencia);
    if (!v.ok) return false;
    this.essencia -= v.custo;
    this.itens[id] = ja + 1;
    this.stats = statsDe(this.opts.campeao, this.nivel, this.itens);
    const antigoMax = this.hpMax;
    this.hpMax = this.stats.hpMax;
    this.mpMax = this.stats.mpMax;
    this.hp += this.hpMax - antigoMax;
    return true;
  }

  custoVisivel(id: string): number { return custoItem(id, this.itens[id] ?? 0); }

  estadoHud(): EstadoHud {
    const n = nivelDeXp(this.xpTotal);
    const defC = CAMPEOES[this.opts.campeao];
    return {
      nome: this.opts.nome, campeao: this.opts.campeao, nivel: n.nivel,
      xpNoNivel: n.xpNoNivel, xpParaSubirNivel: xpParaSubir(n.nivel),
      essencia: this.essencia, abates: this.abates,
      hp: Math.max(0, Math.round(this.hp)), hpMax: Math.round(this.hpMax),
      mp: Math.round(this.mp), mpMax: Math.round(this.mpMax),
      escudo: Math.round(this.escudo),
      cds: { ...this.cds },
      cdsFrac: {
        Q: this.cds.Q / defC.habilidades.Q.cd,
        W: this.cds.W / defC.habilidades.W.cd,
        E: this.cds.E / defC.habilidades.E.cd,
        R: this.cds.R / defC.habilidades.R.cd,
      },
      morto: this.morto,
      respawnFalta: this.morto ? Math.max(0, this.respawnAte - performance.now() / 1000) : 0,
      emFonte: dentroDaFonte(this.px, this.pz),
      pressa: performance.now() / 1000 < this.pressaAte,
      fps: Math.round(this.fps),
      alvoTipo: this.alvoMobId >= 0 ? (this.obterMob(this.alvoMobId)?.tipo ?? "") : "",
    };
  }

  desenharMinimapa(ctx: CanvasRenderingContext2D, tamanho: number): void {
    if (!this.minimapaBase || this.minimapaBase.width !== tamanho) this.prepararMinimapaBase(tamanho);
    if (this.minimapaBase) ctx.drawImage(this.minimapaBase, 0, 0, tamanho, tamanho);
    const f = tamanho / 220;
    const px = (x: number) => (x + 110) * f;
    for (const m of this.listaMobs()) {
      if (MOBS[m.tipo].chefe) continue;
      ctx.fillStyle = "rgba(230,70,60,0.9)";
      ctx.beginPath(); ctx.arc(px(m.x), px(m.z), 2.4, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of CAMPS) {
      if (c.tipo !== "barao" && c.tipo !== "dragao") continue;
      const vivo = this.listaMobs().some((m) => m.tipo === c.tipo);
      ctx.fillStyle = vivo ? "rgba(255,150,40,0.95)" : "rgba(120,90,60,0.6)";
      ctx.beginPath(); ctx.arc(px(c.x), px(c.z), 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const h of this.remotos.values()) {
      ctx.fillStyle = "#67e8f9";
      ctx.beginPath(); ctx.arc(px(h.grupo.position.x), px(h.grupo.position.z), 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(px(this.px), px(this.pz), 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath(); ctx.arc(px(this.px), px(this.pz), 6, 0, Math.PI * 2); ctx.stroke();
    const meia = RAIO_INTERESSE * f;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.strokeRect(px(this.px) - meia, px(this.pz) - meia, meia * 2, meia * 2);
  }

  private prepararMinimapaBase(tamanho: number): void {
    const cv = document.createElement("canvas");
    cv.width = tamanho; cv.height = tamanho;
    const ctx = cv.getContext("2d")!;
    const f = tamanho / 220;
    for (let gx = 0; gx < tamanho; gx += 2) {
      for (let gz = 0; gz < tamanho; gz += 2) {
        const x = gx / f - 110, z = gz / f - 110;
        const c = CORES_TERRENO[tipoTerreno(x, z)];
        ctx.fillStyle = `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
        ctx.fillRect(gx, gz, 2, 2);
      }
    }
    ctx.fillStyle = "rgba(120,200,255,0.9)";
    ctx.beginPath(); ctx.arc((POS_BASE.x + 110) * f, (POS_BASE.z + 110) * f, 6, 0, Math.PI * 2); ctx.fill();
    this.minimapaBase = cv;
  }

  // ═══════════════════════ MULTI-JOGADOR ═══════════════════════
  /** Snapshot do servidor: jogadores remotos + mobs autoritativos. */
  aplicarSnapshot(jogadores: EstadoHeroi[], mobs: MobEstado[]): void {
    if (this.destruido) return;
    const vistos = new Set<number>();
    for (const j of jogadores) {
      if (j.id === this.idRede()) continue;
      vistos.add(j.id);
      let hv = this.remotos.get(j.id);
      if (!hv) {
        const def = CAMPEOES[j.campeao];
        const grupo = modeloHeroi(def.cor, def.papel);
        grupo.position.set(j.x, 0, j.z);
        const barra = canvasSprite(192, 44);
        barra.sprite.scale.set(3.0, 0.69, 1);
        this.scene!.add(grupo, barra.sprite);
        hv = { grupo, barra, alvoX: j.x, alvoZ: j.z, alvoRy: j.ry };
        this.remotos.set(j.id, hv);
      }
      hv.alvoX = j.x; hv.alvoZ = j.z; hv.alvoRy = j.ry;
      hv.grupo.visible = !j.morto;
      hv.barra.sprite.visible = !j.morto;
      desenharBarraVida(hv.barra.ctx, hv.barra.tex, j.hpMax > 0 ? j.hp / j.hpMax : 0, "#4ade80", j.nome);
    }
    for (const [id, hv] of this.remotos) {
      if (!vistos.has(id)) {
        this.scene!.remove(hv.grupo, hv.barra.sprite);
        this.remotos.delete(id);
      }
    }
    if (!this.solo) {
      const presentes = new Set<number>();
      for (const m of mobs) {
        presentes.add(m.id);
        this.mobsOnline.set(m.id, m);
        this.garantirMobVisual(m);
      }
      for (const id of Array.from(this.mobsOnline.keys())) {
        if (!presentes.has(id)) this.mobsOnline.delete(id);
      }
    }
  }

  /** Evento: um mob feriu OUTRO herói (não eu) — só visual. */
  receberGolpeMob(alvoId: number, dano: number, x: number, z: number): void {
    if (alvoId === this.idRede()) return;
    this.numeroFlutuante(x, 2.4, z, dano, "#ffb0a0");
  }

  /** Evento: ESTE herói foi ferido por um mob (servidor autoritativo). */
  receberFere(dano: number, x: number, z: number): void {
    if (this.morto || this.destruido) return;
    this.aplicarDanoLocal(dano, x, z);
  }

  /** Evento: mob morreu (claim de alguém — recompensa se fui eu). */
  receberMobMorte(id: number, tipo: string, assassinoId: number, xp: number, essencia: number): void {
    const mob = this.obterMob(id);
    const mx = mob?.x ?? this.px, mz = mob?.z ?? this.pz;
    this.fxAnel(mx, mz, MOBS[tipo as keyof typeof MOBS]?.chefe ? 6 : 2.2, new THREE.Color(0xffd54f));
    for (let i = 0; i < 8; i++) this.fxParticula(mx, 1.2, mz, "#ffd54f");
    this.mobsOnline.delete(id);
    const vis = this.mobsVisual.get(id);
    if (vis) { this.scene!.remove(vis.grupo, vis.barra.sprite); this.mobsVisual.delete(id); }
    if (assassinoId === this.idRede()) {
      this.xpTotal += xp;
      this.essencia += essencia;
      this.abates++;
      this.verificarSubida();
      this.avisos.matou = tipo;
    }
  }

  mpEstado(): EstadoMp | null {
    return this.opts.rede?.estado() ?? null;
  }
  private idRede(): number { return this.opts.rede?.meuId() ?? -1; }

  // ═══════════════════════ SIMULAÇÃO LOCAL ═══════════════════════
  private passoLocal(dt: number, agoraS: number): void {
    (["Q", "W", "E", "R"] as SlotHabilidade[]).forEach((s) => { this.cds[s] = Math.max(0, this.cds[s] - dt); });
    if (this.escudo > 0 && agoraS > this.escudoAte) {
      this.escudo = 0;
      if (this.bubbleEscudo) this.bubbleEscudo.visible = false;
    }

    if (this.morto) {
      if (agoraS >= this.respawnAte) this.reviver();
      return;
    }

    // input → vetor de movimento
    let vx = 0, vz = 0;
    if (this.teclas["w"] || this.teclas["arrowup"]) vz -= 1;
    if (this.teclas["arrowdown"]) vz += 1;
    if (this.teclas["a"] || this.teclas["arrowleft"]) vx -= 1;
    if (this.teclas["d"] || this.teclas["arrowright"]) vx += 1;
    if (this.joyX !== 0 || this.joyZ !== 0) { vx += this.joyX; vz += this.joyZ; }
    if (vx !== 0 || vz !== 0) {
      const d = Math.hypot(vx, vz);
      vx /= d; vz /= d;
      this.alvoMoverX = null; this.alvoMoverZ = null; this.alvoMobId = -1;
      this.anim = "andar";
    } else if (this.alvoMobId >= 0) {
      const mob = this.obterMob(this.alvoMobId);
      if (!mob) { this.alvoMobId = -1; this.anim = "parado"; }
      else {
        const dAlvo = dist(this.px, this.pz, mob.x, mob.z);
        const range = this.stats.alcanceAtaque + (MOBS[mob.tipo].chefe ? 2.4 : 0.4);
        if (dAlvo > range * 0.92) {
          vx = (mob.x - this.px) / dAlvo; vz = (mob.z - this.pz) / dAlvo;
          this.anim = "andar";
        } else {
          this.ry = Math.atan2(mob.x - this.px, mob.z - this.pz);
          this.ataqueBasico(agoraS);
          this.anim = "atacar";
        }
      }
    } else if (this.alvoMoverX !== null && this.alvoMoverZ !== null) {
      const d = dist(this.px, this.pz, this.alvoMoverX, this.alvoMoverZ);
      if (d < 0.35) { this.alvoMoverX = null; this.alvoMoverZ = null; this.anim = "parado"; }
      else {
        vx = (this.alvoMoverX - this.px) / d; vz = (this.alvoMoverZ - this.pz) / d;
        this.anim = "andar";
      }
    } else {
      const mob = this.mobMaisPerto(this.stats.alcanceAtaque + 0.3);
      if (mob) {
        this.ry = Math.atan2(mob.x - this.px, mob.z - this.pz);
        this.ataqueBasico(agoraS);
        this.anim = "atacar";
      } else if (this.anim === "atacar") {
        this.anim = "parado";
      }
    }

    // velocidade (água abranda; pressa acelera)
    let vel = this.stats.velocidade;
    if (agoraS < this.pressaAte) vel *= 1.45;
    if (tipoTerreno(this.px, this.pz) === "agua") vel *= 0.55;

    if (vx !== 0 || vz !== 0) {
      const p = recolherPos(this.px + vx * vel * dt, this.pz + vz * vel * dt);
      this.px = p.x; this.pz = p.z;
      this.ry = Math.atan2(vx, vz);
    }

    if (dentroDaFonte(this.px, this.pz)) {
      this.hp = Math.min(this.hpMax, this.hp + REGEN_FONTE_HP * dt);
      this.mp = Math.min(this.mpMax, this.mp + REGEN_FONTE_MP * dt);
    } else {
      this.hp = Math.min(this.hpMax, this.hp + this.stats.regenHP * dt);
      this.mp = Math.min(this.mpMax, this.mp + this.stats.regenMP * dt);
    }

    // SOLO: a MESMA simulação que o servidor autoritativo corre
    if (this.solo && this.mobsSim.length) {
      const ev = eventosVazios();
      const herois = [{ id: 1, x: this.px, z: this.pz, hp: this.hp, armadura: this.stats.armadura, morto: this.morto }];
      passoMobs(this.mobsSim, herois, dt, Date.now(), ev);
      for (const g of ev.golpesMob) {
        if (g.alvoId === 1) this.aplicarDanoLocal(g.dano, g.x, g.z);
        else this.numeroFlutuante(g.x, 2.4, g.z, g.dano, "#ffb0a0");
      }
      for (const e of this.mobsSim) {
        const vis = this.mobsVisual.get(e.id);
        if (!vis) continue;
        if (e.respawnTs > 0) { vis.grupo.visible = false; vis.barra.sprite.visible = false; continue; }
        vis.grupo.visible = true;
        vis.grupo.position.x = e.x; vis.grupo.position.z = e.z;
        vis.grupo.rotation.y = e.ry;
        if (vis.ultimoHp !== e.hp) {
          desenharBarraVida(vis.barra.ctx, vis.barra.tex, e.hp / e.hpMax, "#ff6a5a", "");
          vis.barra.sprite.position.set(e.x, MOBS[e.tipo].chefe ? 4.9 : 1.75, e.z);
          vis.barra.sprite.visible = e.hp < e.hpMax;
          vis.ultimoHp = e.hp;
        }
      }
    }
  }

  private ataqueBasico(agoraS: number): void {
    if (agoraS - this.ultimoAtaque < 1 / this.stats.ataquePS) return;
    this.ultimoAtaque = agoraS;
    this.balancoArma = 1;
    const dano = this.stats.ataque;
    const def = CAMPEOES[this.opts.campeao];
    let alvo: MobSim | MobEstado | null = this.alvoMobId >= 0 ? this.obterMob(this.alvoMobId) : null;
    if (!alvo) alvo = this.mobMaisPerto(this.stats.alcanceAtaque + 0.3);
    if (!alvo) return;
    if (def.alcanceAtaque <= 3.2) this.danificarMob(alvo.id, dano, alvo.x, alvo.z);
    else this.dispararProjetil(alvo.x, alvo.z, dano, 30, false);
  }

  private danificarNoCaminho(x1: number, z1: number, x2: number, z2: number, danoBruto: number): void {
    for (const m of this.listaMobs()) {
      if (distParaSegmento(m.x, m.z, x1, z1, x2, z2) < 1.6) this.danificarMob(m.id, danoBruto, m.x, m.z);
    }
  }
  private danificarEmArea(cx: number, cz: number, raio: number, danoBruto: number): void {
    for (const m of this.listaMobs()) {
      if (dist2(cx, cz, m.x, m.z) <= raio * raio) this.danificarMob(m.id, danoBruto, m.x, m.z);
    }
  }
  private danificarEmFrente(danoBruto: number, alcance: number): void {
    const fx = Math.sin(this.ry), fz = Math.cos(this.ry);
    for (const m of this.listaMobs()) {
      const dx = m.x - this.px, dz = m.z - this.pz;
      const d = Math.hypot(dx, dz);
      if (d > alcance) continue;
      if ((dx / (d || 1)) * fx + (dz / (d || 1)) * fz > 0.45) this.danificarMob(m.id, danoBruto, m.x, m.z);
    }
  }

  /** Dano a um mob — SOLO aplica na sim local; ONLINE envia claim ao servidor. */
  private danificarMob(id: number, danoBruto: number, x: number, z: number): void {
    if (this.solo) {
      const mob = this.mobsSim.find((m) => m.id === id);
      if (!mob || mob.respawnTs > 0) return;
      const dano = Math.max(1, Math.round(reduzArmadura(danoBruto, MOBS[mob.tipo].armadura)));
      const morte = aplicarDanoMob(mob, dano, 1, Date.now());
      this.numeroFlutuante(x, 1.8, z, dano, "#ffffff");
      this.fxParticula(x, 1.0, z, "#ff8a5c");
      if (morte) {
        this.xpTotal += morte.xp;
        this.essencia += morte.essencia;
        this.abates++;
        this.verificarSubida();
        this.avisos.matou = mob.tipo;
        this.fxAnel(mob.x, mob.z, 2.2, new THREE.Color(0xffd54f));
        for (let i = 0; i < 8; i++) this.fxParticula(mob.x, 1.2, mob.z, "#ffd54f");
      }
    } else {
      const dano = Math.min(Math.round(danoBruto), this.tetoGolpe());
      this.numeroFlutuante(x, 1.8, z, dano, "#ffffff");
      this.fxParticula(x, 1.0, z, "#ff8a5c");
      this.opts.aoGolpeMob(id, dano, this.px, this.pz);
    }
  }

  private tetoGolpe(): number {
    return Math.max(30, Math.round(dpsTeto(this.opts.campeao, this.nivel, this.itens) / Math.max(0.1, this.stats.ataquePS)));
  }

  private verificarSubida(): void {
    const antes = this.nivel;
    const r = nivelDeXp(this.xpTotal);
    this.nivel = r.nivel;
    if (r.nivel > antes) {
      this.stats = statsDe(this.opts.campeao, this.nivel, this.itens);
      const antigoMax = this.hpMax;
      this.hpMax = this.stats.hpMax;
      this.mpMax = this.stats.mpMax;
      this.hp = Math.min(this.hpMax, this.hp + (this.hpMax - antigoMax) + this.hpMax * 0.12);
      this.mp = Math.min(this.mpMax, this.mp + this.mpMax * 0.2);
      this.fxAnel(this.px, this.pz, 2.6, new THREE.Color(0xffe066));
      this.avisos.subiuNivel = true;
    }
  }

  private aplicarDanoLocal(danoBruto: number, x: number, z: number): void {
    if (this.morto) return;
    let dano = Math.max(1, Math.round(reduzArmadura(danoBruto, this.stats.armadura)));
    if (this.escudo > 0) {
      const absorvido = Math.min(this.escudo, dano);
      this.escudo -= absorvido;
      dano -= absorvido;
      if (this.escudo <= 0 && this.bubbleEscudo) this.bubbleEscudo.visible = false;
    }
    if (dano <= 0) return;
    this.hp -= dano;
    this.numeroFlutuante(this.px, 2.3, this.pz, dano, "#ff5b5b");
    this.avisos.danoRecebido = dano;
    if (this.hp <= 0) this.morrer();
    void x; void z;
  }

  private morrer(): void {
    this.morto = true;
    this.hp = 0;
    this.opts.rede?.morrer();
    this.escudo = 0;
    if (this.bubbleEscudo) this.bubbleEscudo.visible = false;
    this.alvoMoverX = null; this.alvoMoverZ = null; this.alvoMobId = -1;
    this.respawnAte = performance.now() / 1000 + TEMPO_RESPAWN;
    this.anim = "morte";
    this.opts.aoMorte();
  }

  private reviver(): void {
    this.morto = false;
    this.stats = statsDe(this.opts.campeao, this.nivel, this.itens);
    this.hpMax = this.stats.hpMax; this.hp = this.hpMax;
    this.mpMax = this.stats.mpMax; this.mp = this.mpMax;
    const p = posReviver(Math.floor(Math.random() * 8));
    this.px = p.x; this.pz = p.z;
    this.anim = "parado";
    this.fxAnel(this.px, this.pz, 2.4, new THREE.Color(0x7fd4ff));
    this.opts.rede?.renascer(this.px, this.pz, this.nivel, this.essencia, this.abates, this.itens);
    this.opts.aoReviver();
  }

  // ═══════════════════════ FX ═══════════════════════
  private garantirMobVisual(m: { id: number; tipo: string; x: number; z: number }): void {
    if (this.mobsVisual.has(m.id)) return;
    const grupo = modeloMob(m.tipo);
    grupo.position.set(m.x, 0, m.z);
    const barra = canvasSprite(160, 34);
    barra.sprite.scale.set(2.4, 0.51, 1);
    this.scene!.add(grupo, barra.sprite);
    this.mobsVisual.set(m.id, { grupo, barra, ultimoHp: -1 });
  }

  private dispararProjetil(tx: number, tz: number, dano: number, vel: number, habilidades: boolean): void {
    const dx = tx - this.px, dz = tz - this.pz;
    const d = Math.hypot(dx, dz) || 1;
    const mat = new THREE.MeshBasicMaterial({ color: habilidades ? new THREE.Color(CAMPEOES[this.opts.campeao].cor).offsetHSL(0, 0, 0.15) : new THREE.Color(0xfff1b8) });
    this.guardar(undefined, mat);
    const malhaP = new THREE.Mesh(GEO_PROJETIL, mat);
    malhaP.position.set(this.px, 1.15, this.pz);
    this.scene!.add(malhaP);
    this.projeteis.push({ malha: malhaP, vx: (dx / d) * vel, vz: (dz / d) * vel, vida: 2.2, dano, habilidades });
  }

  private numeroFlutuante(x: number, y: number, z: number, valor: number, cor: string): void {
    let p = this.poolNumeros.find((n) => n.vida <= 0);
    if (!p) {
      const s = canvasSprite(128, 64);
      s.sprite.scale.set(1.7, 0.85, 1);
      this.scene!.add(s.sprite);
      p = { sprite: s.sprite, ctx: s.ctx, tex: s.tex, vida: 0, vidaMax: 0.9, vx: 0, vy: 1.4, vz: 0 };
      this.poolNumeros.push(p);
    }
    desenharTextoGrande(p.ctx, p.tex, String(Math.round(valor)), cor);
    p.sprite.position.set(x + (Math.random() - 0.5) * 0.6, y, z);
    p.vida = 0.9; p.vidaMax = 0.9;
    p.sprite.visible = true;
  }

  private fxParticula(x: number, y: number, z: number, cor: string): void {
    const s = canvasSprite(64, 64);
    s.sprite.scale.setScalar(0.5);
    s.ctx.clearRect(0, 0, 64, 64);
    s.ctx.fillStyle = cor;
    s.ctx.beginPath(); s.ctx.arc(32, 32, 22, 0, Math.PI * 2); s.ctx.fill();
    s.tex.needsUpdate = true;
    const p: Particula = { sprite: s.sprite, ctx: s.ctx, tex: s.tex, vida: 0.55, vidaMax: 0.55, vx: (Math.random() - 0.5) * 7, vy: 4 + Math.random() * 3, vz: (Math.random() - 0.5) * 7 };
    s.sprite.position.set(x, y, z);
    this.scene!.add(s.sprite);
    this.particulas.push(p);
  }

  private fxAnel(x: number, z: number, raio: number, cor: THREE.Color): void {
    const geo = new THREE.RingGeometry(raio * 0.35, raio, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    this.guardar(geo, mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 0.25, z);
    this.scene!.add(m);
    this.aneis.push({ malha: m, vida: 0.5, vidaMax: 0.5 });
  }

  // ═══════════════════════ LOOP ═══════════════════════
  private loop = (ms: number) => {
    if (!this.rodando || this.destruido) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.25, (ms - this.ultimoMs) / 1000); // catch-up honesto em renders lentos
    this.ultimoMs = ms;
    this.acumulado += dt;
    const agoraS = ms / 1000;

    while (this.acumulado >= PASSO) {
      this.passoLocal(PASSO, agoraS);
      this.acumulado -= PASSO;
    }

    // animação do herói
    if (this.anim === "andar") this.heroi.position.y = Math.abs(Math.sin(ms * 0.02)) * 0.12;
    else if (this.anim === "morte") this.heroi.position.y = -0.35;
    else this.heroi.position.y = Math.sin(ms * 0.004) * 0.045;
    if (this.armaHeroi) {
      this.balancoArma = Math.max(0, this.balancoArma - dt * 4);
      this.armaHeroi.rotation.x = -this.balancoArma * 1.9;
    }

    // câmara estilo LoL (offset fixo, segue o herói)
    if (this.camera && this.scene) {
      const destino = new THREE.Vector3(this.px, 0, this.pz).add(OFFSET_CAMARA.clone().multiplyScalar(this.zoom));
      this.camera.position.lerp(destino, Math.min(1, dt * 6));
      this.camera.lookAt(this.px, 0, this.pz);
      if (this.luz) {
        this.luz.position.set(this.px + 30, 48, this.pz + 18);
        this.luz.target.position.set(this.px, 0, this.pz);
        this.luz.target.updateMatrixWorld();
      }
    }
    const agua = this.scene?.getObjectByName("agua");
    if (agua) agua.position.y = 0.12 + Math.sin(ms / 900) * 0.02;

    this.atualizarProjeteis(dt);
    this.atualizarFx(dt);

    if (!this.solo) {
      for (const [id, m] of this.mobsOnline) {
        const vis = this.mobsVisual.get(id);
        if (!vis) continue;
        vis.grupo.position.x += (m.x - vis.grupo.position.x) * 0.18;
        vis.grupo.position.z += (m.z - vis.grupo.position.z) * 0.18;
        vis.grupo.rotation.y = m.ry;
        vis.grupo.visible = m.hp > 0;
        if (vis.ultimoHp !== m.hp) {
          desenharBarraVida(vis.barra.ctx, vis.barra.tex, m.hpMax > 0 ? m.hp / m.hpMax : 0, "#ff6a5a", "");
          vis.barra.sprite.position.set(vis.grupo.position.x, MOBS[m.tipo].chefe ? 4.9 : 1.75, vis.grupo.position.z);
          vis.barra.sprite.visible = m.hp > 0 && m.hp < m.hpMax;
          vis.ultimoHp = m.hp;
        }
      }
    }
    for (const h of this.remotos.values()) {
      h.grupo.position.x += (h.alvoX - h.grupo.position.x) * 0.16;
      h.grupo.position.z += (h.alvoZ - h.grupo.position.z) * 0.16;
      h.grupo.rotation.y = h.alvoRy;
      h.barra.sprite.position.set(h.grupo.position.x, 2.5, h.grupo.position.z);
    }

    this.heroi.position.x = this.px;
    this.heroi.position.z = this.pz;
    this.heroi.rotation.y = this.ry;
    this.heroi.rotation.x = this.morto ? Math.min(Math.PI / 2, this.heroi.rotation.x + dt * 3) : 0;
    this.barraHeroi.sprite.position.set(this.px, 2.5, this.pz);
    this.atualizarBarraHeroi();

    // rede: publica posição (o mp.ts faz throttle a 10 Hz)
    if (this.opts.rede && !this.morto) {
      this.opts.rede.publicarPosicao(
        this.px, this.pz, this.ry, this.anim,
        Math.max(0, Math.round(this.hp)), Math.round(this.hpMax),
        Math.round(this.mp), Math.round(this.mpMax),
        nivelDeXp(this.xpTotal).nivel, this.abates, this.essencia, this.itens, this.opts.campeao,
      );
    }

    this.fpsFrames++; this.fpsAcum += dt;
    if (this.fpsAcum >= 0.5) { this.fps = this.fpsFrames / this.fpsAcum; this.fpsFrames = 0; this.fpsAcum = 0; }

    if (ms - this.hudMs > 50) {
      this.hudMs = ms;
      this.opts.aoHud(this.estadoHud());
      const av = this.avisos;
      if (av.danoRecebido || av.subiuNivel || av.cura || av.matou || av.erroHabilidade) {
        this.opts.aoAviso({ ...av });
        this.avisos = { danoRecebido: 0, subiuNivel: false, matou: "", erroHabilidade: "", cura: 0 };
      }
    }

    this.renderer?.render(this.scene!, this.camera!);
  };

  private atualizarProjeteis(dt: number): void {
    for (let i = this.projeteis.length - 1; i >= 0; i--) {
      const p = this.projeteis[i];
      p.malha.position.x += p.vx * dt;
      p.malha.position.z += p.vz * dt;
      p.vida -= dt;
      let bateu = false;
      for (const m of this.listaMobs()) {
        if (dist2(p.malha.position.x, p.malha.position.z, m.x, m.z) < 1.0) {
          this.danificarMob(m.id, p.dano, m.x, m.z);
          bateu = true;
          break;
        }
      }
      if (bateu || p.vida <= 0 || !dentroMundo(p.malha.position.x, p.malha.position.z)) {
        this.scene!.remove(p.malha);
        (p.malha.material as THREE.Material).dispose();
        this.projeteis.splice(i, 1);
      }
    }
  }

  private atualizarFx(dt: number): void {
    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i];
      p.vida -= dt;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      p.vy -= 9 * dt;
      (p.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, p.vida / p.vidaMax);
      if (p.vida <= 0) {
        this.scene!.remove(p.sprite);
        (p.sprite.material as THREE.SpriteMaterial).dispose();
        p.tex.dispose();
        this.particulas.splice(i, 1);
      }
    }
    for (const n of this.poolNumeros) {
      if (n.vida > 0) {
        n.vida -= dt;
        n.sprite.position.y += 1.4 * dt;
        (n.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, n.vida / n.vidaMax);
      } else {
        n.sprite.visible = false;
      }
    }
    for (let i = this.aneis.length - 1; i >= 0; i--) {
      const a = this.aneis[i];
      a.vida -= dt;
      const frac = Math.max(0, a.vida / a.vidaMax);
      (a.malha.material as THREE.MeshBasicMaterial).opacity = frac * 0.85;
      a.malha.scale.setScalar(1 + (1 - frac) * 0.4);
      if (a.vida <= 0) {
        this.scene!.remove(a.malha);
        (a.malha.material as THREE.Material).dispose();
        a.malha.geometry.dispose();
        this.aneis.splice(i, 1);
      }
    }
  }

  private atualizarBarraHeroi(): void {
    desenharBarraVida(
      this.barraHeroi.ctx, this.barraHeroi.tex,
      this.hpMax > 0 ? Math.max(0, this.hp) / this.hpMax : 0,
      "#4ade80", this.opts.nome, this.hpMax > 0 ? this.escudo / this.hpMax : 0,
    );
  }

  itensCount(id: string): number { return this.itens[id] ?? 0; }

  // ═══════════════════════ CICLO DE VIDA ═══════════════════════
  redimensionar(): void {
    if (!this.renderer || !this.camera || this.destruido) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  estaDestruido(): boolean { return this.destruido; }

  paraSave(): { nivel: number; xpTotal: number; essencia: number; itens: Record<string, number>; abates: number } {
    return { nivel: this.nivel, xpTotal: this.xpTotal, essencia: this.essencia, itens: { ...this.itens }, abates: this.abates };
  }

  /** Ganchos E2E tipados (padrão v60: o compilador prova o contrato). */
  ganchos() {
    return {
      fase: () => (this.morto ? "morto" : "jogando"),
      estado: () => ({
        x: Math.round(this.px * 10) / 10, z: Math.round(this.pz * 10) / 10,
        hp: Math.round(this.hp), hpMax: Math.round(this.hpMax),
        mp: Math.round(this.mp), nivel: this.nivel,
        essencia: this.essencia, morto: this.morto, anim: this.anim,
        fps: Math.round(this.fps), acumm: Math.round(this.acumulado * 1000),
      }),
      teclas: () => ({ ...this.teclas }),
      mobsPerto: (raio = 25) => this.mobsPertoContagem(raio),
      mobFerido: (raio = 25) => this.listaMobs().some((m) => dist2(this.px, this.pz, m.x, m.z) < raio * raio && m.hp < m.hpMax),
      abates: () => this.abates,
      essencia: () => this.essencia,
      jogadoresRemotos: () => this.remotos.size,
      mpEstado: () => this.mpEstado()?.estado ?? "solo",
      andarPara: (x: number, z: number) => { this.alvoMoverX = x; this.alvoMoverZ = z; this.alvoMobId = -1; },
      disparar: (slot: SlotHabilidade) => this.usarHabilidade(slot),
      mobMaisPerto: () => {
        const m = this.mobMaisPerto(35);
        return m ? { id: m.id, tipo: m.tipo, hp: m.hp, dist: Math.round(dist(this.px, this.pz, m.x, m.z) * 10) / 10 } : null;
      },
      comprar: (id: string) => this.comprar(id),
      custo: (id: string) => this.custoVisivel(id),
      itensCount: (id: string) => this.itens[id] ?? 0,
      solo: () => this.solo,
    };
  }

  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    this.rodando = false;
    cancelAnimationFrame(this.raf);
    const c = this.opts.canvas;
    c.removeEventListener("pointerdown", this.aoPonteiroBaixo);
    c.removeEventListener("pointermove", this.aoPonteiroMover);
    c.removeEventListener("contextmenu", this.aoContexto);
    c.removeEventListener("wheel", this.aoRoda);
    window.removeEventListener("keydown", this.aoTeclaBaixo);
    window.removeEventListener("keyup", this.aoTeclaAcima);
    window.removeEventListener("blur", this.aoPerderFoco);
    document.removeEventListener("visibilitychange", this.aoPerderFoco);
    this.observador?.disconnect();
    this.observador = null;
    for (const geo of this.geoCache) geo.dispose();
    for (const mat of this.matCache) mat.dispose();
    for (const tex of this.texCache) tex.dispose();
    this.geoCache = []; this.matCache = []; this.texCache = [];
    MATS?.pele?.dispose(); MATS = null;
    if (this.scene) this.scene.clear();
    this.scene = null;
    this.camera = null;
    this.luz = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }
}

// ── helpers de módulo ──────────────────────────────────────────
function dentroDaFonte(x: number, z: number): boolean {
  return dist(x, z, POS_BASE.x, POS_BASE.z) <= RAIO_FONTE;
}
function distParaSegmento(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const abx = x2 - x1, abz = z2 - z1;
  const apx = px - x1, apz = pz - z1;
  const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / (abx * abx + abz * abz || 1)));
  return Math.hypot(px - (x1 + abx * t), pz - (z1 + abz * t));
}
function distParaPolilinha(x: number, z: number, pontos: { x: number; z: number }[]): number {
  let melhor = Infinity;
  for (let i = 0; i < pontos.length - 1; i++) {
    const d = distParaSegmento(x, z, pontos[i].x, pontos[i].z, pontos[i + 1].x, pontos[i + 1].z);
    if (d < melhor) melhor = d;
  }
  return melhor;
}
