// ============================================================
// BATEU KART — MOTOR VISUAL three.js (v65)
// ────────────────────────────────────────────────────────────
// A lógica vive SEMPRE em core.ts (padrão da casa v63/v64 — o
// mesmo núcleo que um futuro servidor de corridas online usaria).
// Este motor só desenha e recolhe input: câmara de PERSEGUIÇÃO
// estilo Mario Kart, pista malhada por amostras (estrada + bordas
// alternadas + rampas de turbo + caixas «?», moedas, linha de
// partida), 12 karts, projéteis (casca/casca-alvo/míssil), óleo,
// escudo, chama de turbo, faíscas de deriva, minimapa 2D.
//
// Lições aplicadas: destruir() dispose TOTAL e idempotente (v60);
// blur/visibilitychange largam TODAS as teclas (v60); catch-up de
// dt ≤ 0,25 s para SwiftShader lento (v63); modo leve honesto
// (?kart-leve=1); ResizeObserver não — window resize + rAF basta
// (canvas fixed 100%).
// ============================================================
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import {
  EstadoCorrida, EntradaKart, EventoCorrida, ItemKartId, MelhoriaId, KartId, PistaDef,
  construirPista, novaCorrida, passoCorrida, posicoesDe, pistaPorId, statsDe,
  FaseCorrida, Pista, rng32, type DificuldadeKart,
} from "./core.ts";
import { novaBatalha, passoBatalha, rankingBatalha, DURACAO_BATALHA_S, type EstadoBatalha } from "./batalha.ts";
import { Particulas } from "./particulas.ts";
import { CATALOGO_DESAFIOS, lerCustom, type DesafioEmpresa } from "../../lib/desafios.ts"; // v71: as MARCAS anunciam os desafios NO CIRCUITO
import type { SnapKart, CorredorInicio } from "./mp.ts";
import type { SomKart } from "../som.ts";

// ── HUD que o React desenha ────────────────────────────────────
export interface EstadoHudKart {
  fase: FaseCorrida;
  contagem: number; // 3, 2, 1 (0 = já!)
  volta: number;
  voltas: number;
  posicao: number;
  total: number;
  vel: number;
  velMax: number;
  item: ItemKartId | null;
  itens3: number;
  moedas: number;
  tempo: number;
  contrario: boolean;
  derrapando: boolean;
  derivaFase: 0 | 1 | 2;
  boost: boolean;
  stun: boolean;
  escudo: boolean;
  payout: { moedas: number; xp: number; recorde: boolean } | null;
  resultados: { id: number; nome: string; posicao: number; tempo: number }[];
  // v68 BATALHA — null em corridas
  batalha: {
    baloes: number;
    golpes: number;
    vivos: number;
    tempoRestante: number;
    classificacao: { id: number; nome: string; posicao: number; baloes: number; eliminado: boolean }[];
  } | null;
}

export interface AvisosKart {
  golpeRecebido?: ItemKartId | "raio";
  itemNovo?: ItemKartId;
  voltaNova?: number;
  moeda?: boolean;
  derivaTurbo?: 1 | 2;
  rampa?: boolean;
  // v68 BATALHA
  balaoPerdido?: boolean;
  eliminadoEu?: boolean;
  eliminadoOutro?: { nome: string; por: string };
}

interface OptsMotor {
  canvas: HTMLCanvasElement;
  pistaId: string;
  voltas: number;
  kartJogador: KartId;
  melhorias: Partial<Record<MelhoriaId, number>>;
  nomeJogador: string;
  recordeAnterior?: number;
  leve: boolean;
  aoHud: (e: EstadoHudKart) => void;
  aoAviso: (a: AvisosKart) => void;
  // ── v66 ONLINE ──
  idJogador?: number;                    // slot do MEU corredor (solo = 6)
  corredoresRede?: CorredorInicio[];     // descritores vindos do servidor (nomes/karts/cores reais)
  aoPulsarItemRede?: () => void;         // em rede o uso de item vai por MENSAGEM, não por física local
  // ── v67 SOM (adaptador fino — o motor nunca importa o Web Audio) ──
  som?: SomKart;
  // ── v68 BATALHA (solo: o motor possui o EstadoBatalha e corre passoBatalha) ──
  batalha?: boolean;
  // ── v86 FORMA DE JOGAR: dificuldade + assistência + auto-aceleração ──
  dificuldade?: DificuldadeKart;   // omissão «normal» = o campo de sempre
  assistencia?: boolean;           // smart steering (o jogador só)
  autoAcelerar?: boolean;          // o motor mantém o acelerador PREMIDO
}

const COR_FAISCA_1 = 0x66ccff; // tier azul
const COR_FAISCA_2 = 0xffb347; // tier laranja

// ── v69: céus por tema (cúpula com sol HDR que alimenta o bloom) ──
const CEUS: Record<string, { topo: number; horizonte: number; sol: number; brilhoSol: number; dirSol: [number, number, number] }> = {
  praia:   { topo: 0x2f7fd0, horizonte: 0xffe3b0, sol: 0xfff3c0, brilhoSol: 2.4, dirSol: [0.42, 0.58, 0.3] },
  deserto: { topo: 0x2e6fb0, horizonte: 0xffdf9e, sol: 0xffffff, brilhoSol: 2.8, dirSol: [0.5, 0.5, -0.35] },
  vulcao:  { topo: 0x1c0e1e, horizonte: 0xe0451f, sol: 0xff7a50, brilhoSol: 1.7, dirSol: [-0.3, 0.7, 0.2] },
  coliseu: { topo: 0x180e26, horizonte: 0xb33a5a, sol: 0xffb35c, brilhoSol: 1.9, dirSol: [0.35, 0.6, -0.25] },
};

// ── v69: shader da cúpula de céu (gradiente + disco solar HDR) ──
const SHADER_CEU = {
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vDir;
    uniform vec3 cTopo;
    uniform vec3 cHor;
    uniform vec3 cSol;
    uniform vec3 dSol;
    uniform float brilhoSol;
    void main() {
      float h = clamp(vDir.y, 0.0, 1.0);
      vec3 cor = mix(cHor, cTopo, pow(h, 0.55));
      float s = max(dot(normalize(vDir), normalize(dSol)), 0.0);
      cor += cSol * brilhoSol * (pow(s, 420.0) * 1.4 + pow(s, 8.0) * 0.18);
      gl_FragColor = vec4(cor, 1.0);
    }
  `,
};

// ── v69: vinheta cinematográfica (pass de pós-processamento) ──
const SHADER_VINHETA = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, forca: { value: 0.34 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float forca;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5, 0.5));
      c.rgb *= 1.0 - forca * smoothstep(0.42, 0.95, d);
      gl_FragColor = c;
    }
  `,
};

function texturaAsfalto(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#d9d9d9"; // tint da pista multiplica (def.corEstrada domina)
  ctx.fillRect(0, 0, 128, 128);
  // grão de asfalto
  for (let k = 0; k < 420; k++) {
    const g = 200 + Math.floor(Math.random() * 56);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  // tracejado central amarelo (estilo Mario Kart)
  ctx.fillStyle = "#ffdf4f";
  for (let y = 0; y < 128; y += 32) ctx.fillRect(60, y, 8, 18);
  // linhas de bordo brancas
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(2, 0, 5, 128);
  ctx.fillRect(121, 0, 5, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

function texturaAgua(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 256, 256);
  // caustics: arcos claros entrecruzados (o tint azul do material domina)
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.4;
  for (let k = 0; k < 26; k++) {
    const cx = Math.random() * 256, cy = Math.random() * 256, r = 12 + Math.random() * 30;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.random() * 6.28, Math.random() * 6.28 + 2.2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(210,235,255,0.5)";
  for (let k = 0; k < 60; k++) ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 1.6);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 14);
  return t;
}

function texturaNuvem(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 128);
  for (let k = 0; k < 26; k++) {
    const x = 30 + Math.random() * 196, y = 50 + Math.random() * 44, r = 12 + Math.random() * 26;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

// v71 — PAINEL DE MARCA (publicidade dos DESAFIOS no circuito): quadro
// canvas 256×128 com a cor da empresa, logótipo de iniciais, nome,
// tagline e o prémio do desafio — a plataforma VIVA na pista.
function texturaPainelMarca(d: DesafioEmpresa): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = d.empresa.cor;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(0, 86, 256, 42);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 122);
  // logótipo gerado (iniciais da marca)
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath(); ctx.arc(40, 42, 26, 0, 6.28); ctx.fill();
  ctx.fillStyle = d.empresa.cor;
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(d.empresa.iniciais.slice(0, 3), 40, 43);
  ctx.textBaseline = "alphabetic";
  // nome + tagline
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(d.empresa.nome.slice(0, 15).toUpperCase(), 148, 36);
  ctx.font = "600 13px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(d.empresa.tagline.slice(0, 30), 148, 58);
  ctx.fillText(d.titulo.slice(0, 32), 128, 76);
  // faixa do prémio
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 19px sans-serif";
  ctx.fillText(`DESAFIO +${d.premioMoedas} moedas`, 128, 114);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texturaXadrez(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 16;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
    ctx.fillStyle = (i + j) % 2 === 0 ? "#ffffff" : "#1a1a1a";
    ctx.fillRect(i * 4, j * 4, 4, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}

function texturaRampa(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffb300";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#7a5200";
  for (let k = 0; k < 3; k++) {
    const y = 6 + k * 18; // chevrons apontam para o «baixo» do canvas = FRENTE no plano
    ctx.beginPath();
    ctx.moveTo(8, y); ctx.lineTo(32, y + 12); ctx.lineTo(56, y);
    ctx.lineTo(56, y + 8); ctx.lineTo(32, y + 20); ctx.lineTo(8, y + 8);
    ctx.closePath();
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

// ═══════════════════════════════════════════════════════════════
export class MotorKart {
  private renderer: THREE.WebGLRenderer | null = null;
  private cena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(68, 1, 0.1, 1600);
  private pista: Pista;
  private corrida: EstadoCorrida;
  private opts: OptsMotor;
  private raf = 0;
  private ultimoT = 0;
  private pausadoRef = false;
  private auto = false;
  private destruido = false;
  private rede = false;                 // v66: o SERVIDOR simula; este motor só interpola e renderiza
  private batalha: EstadoBatalha | null = null;   // v68: modo Batalha de Balões (solo)
  private idJogador = 6;
  private alvosRede = new Map<number, { x: number; z: number; ang: number; da: number }>();
  private alvosProjetilRede = new Map<number, { x: number; z: number; ang: number }>();
  private alvosOleoRede = new Map<number, { x: number; z: number }>();
  private entrada: EntradaKart = { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: false };
  private teclas = new Set<string>();
  private autoAcelerar = false; // v86: o acelerador nunca larga
  private ultimoHud = 0;
  private derivaFase: 0 | 1 | 2 = 0;
  private ultRaio = 0;
  // ── v67 SOM ──
  private somBeep = 4;               // último beep da contagem (4 = ainda não tocou)
  private somFase: FaseCorrida | null = null; // fase anterior (transição contagem→corrida = «JÁ»)
  private somTerminei = false;       // fanfarra de chegada 1×
  private disposaveis: { dispose(): void }[] = [];
  private meshesKart = new Map<number, { grupo: THREE.Group; chama: THREE.Mesh; faiscas: THREE.Mesh; escudo: THREE.Mesh; baloes: THREE.Group; corpoMat: THREE.MeshLambertMaterial | THREE.MeshPhongMaterial }>();
  private meshesProjetil = new Map<number, THREE.Mesh>();
  private meshesOleo = new Map<number, THREE.Mesh>();
  private meshesCaixa: THREE.Mesh[] = [];
  private meshesMoeda: THREE.Mesh[] = [];
  private meshesRampa: THREE.Mesh[] = [];
  private disposaveisGeometria: THREE.BufferGeometry[] = [];
  private disposaveisMaterial: THREE.Material[] = [];
  private disposaveisTextura: THREE.Texture[] = [];
  // ── v69 GRÁFICOS (alta/leve — leve mantém o caminho antigo) ──
  private qualidade: "alta" | "leve" = "alta";
  private composer: EffectComposer | null = null;
  private passVinheta: ShaderPass | null = null;
  private luzDir: THREE.DirectionalLight | null = null;
  private part: Particulas | null = null;
  private riscos: THREE.LineSegments | null = null;
  private matRiscos: THREE.LineBasicMaterial | null = null;
  private ceuDomo: THREE.Mesh | null = null;
  private uniformesCeu: { cTopo: THREE.IUniform; cHor: THREE.IUniform; cSol: THREE.IUniform; dSol: THREE.IUniform; brilhoSol: THREE.IUniform } | null = null;
  private nuvens = new THREE.Group();
  private texAgua: THREE.CanvasTexture | null = null;
  private matAgua: THREE.MeshPhongMaterial | null = null;
  // v71: painéis de MARCAS ao longo do circuito (catálogo + os 4 custom mais recentes da Sala)
  private paineisMarcas: THREE.Mesh[] = [];
  private matLava: THREE.MeshBasicMaterial | null = null;
  private tremor = 0;            // impulso de shake de câmara (decai exponencial)
  private rollSuave = 0;         // rolagem bancária em deriva (suavizada)
  private confeteFeito = false;  // chuva de confetti 1× na chegada do jogador
  private caixasEu = 0;          // v70: caixas «?» que o JOGADOR abriu nesta corrida

  constructor(opts: OptsMotor) {
    this.opts = opts;
    this.autoAcelerar = opts.autoAcelerar === true; // v86 forma de jogar
    this.idJogador = typeof opts.idJogador === "number" && opts.idJogador >= 0 ? opts.idJogador : 6;
    if (opts.batalha) {
      // v68 BATALHA: o núcleo da batalha possui a «corrida» (arena Coliseu, voltas ∞)
      this.batalha = novaBatalha({
        kartJogador: opts.kartJogador,
        melhoriasJogador: opts.melhorias,
        nomeJogador: opts.nomeJogador,
      });
      this.corrida = this.batalha.cor;
      this.pista = this.corrida.pista;
    } else {
      const defIni = pistaPorId(opts.pistaId);
      if (!defIni) throw new Error(`pista desconhecida: ${opts.pistaId}`);
      this.pista = construirPista(defIni);
      this.corrida = novaCorrida({
        pista: this.pista,
        voltas: opts.voltas,
        kartJogador: opts.kartJogador,
        melhoriasJogador: opts.melhorias,
        nomeJogador: opts.nomeJogador,
        recordeAnterior: opts.recordeAnterior,
        dificuldade: opts.dificuldade,
        assistencia: opts.assistencia,
      });
    }
    const def: PistaDef = this.pista.def;
    // v66 ONLINE: o servidor mandou os descritores REAIS (nomes/karts/cores) —
    // reescrevem o mirror ANTES das meshes existirem (construirCorredores lê daqui)
    if (opts.corredoresRede?.length) {
      this.rede = true;
      for (const r of opts.corredoresRede) {
        const c = this.corrida.corredores.find((x) => x.id === r.id);
        if (!c) continue;
        c.nome = r.nome;
        c.kart = r.kart;
        c.cor = r.cor;
        c.eJogador = r.eJogador;
        c.stats = r.id === this.idJogador ? statsDe(opts.kartJogador, opts.melhorias) : statsDe(r.kart, {});
      }
      const meu = this.corrida.corredores.find((x) => x.id === this.idJogador);
      if (meu) meu.nome = opts.nomeJogador || meu.nome;
    }
    // ── v69: QUALIDADE — «leve» mantém o caminho da v65 intocado (SwiftShader/APK/E2E);
    // «alta» liga pós-processamento (ACES+bloom+vinheta), sombras e partículas plenas.
    this.qualidade = opts.leve ? "leve" : "alta";
    const alta = this.qualidade === "alta";

    this.cena.background = new THREE.Color(def.corCeu);
    this.cena.fog = new THREE.Fog(def.corNevoa, opts.leve ? 130 : 170, opts.leve ? 420 : 560);

    const renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: !opts.leve,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.leve ? 1.25 : 2));
    // v69: tono ACES + espaço de cor honesto (só em alta — leve mantém o visual v65)
    if (alta) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.renderer = renderer;

    const luzHemi = new THREE.HemisphereLight(0xffffff, def.corChao, alta ? 0.85 : 1.05);
    const luzDir = new THREE.DirectionalLight(0xfff2dd, alta ? 1.25 : 0.85);
    luzDir.position.set(120, 220, 80);
    if (alta) {
      // v69: sombras dinâmicas dos karts — a caixa da sombra SEGUE o jogador
      luzDir.castShadow = true;
      luzDir.shadow.mapSize.set(1024, 1024);
      luzDir.shadow.camera.left = -70; luzDir.shadow.camera.right = 70;
      luzDir.shadow.camera.top = 70; luzDir.shadow.camera.bottom = -70;
      luzDir.shadow.camera.near = 40; luzDir.shadow.camera.far = 460;
      luzDir.shadow.bias = -0.0012;
      this.cena.add(luzDir.target);
      this.luzDir = luzDir;
    }
    this.cena.add(luzHemi, luzDir);

    this.construirMundo(def, opts.leve);
    this.construirCorredores();

    // v69: partículas (pool menor no modo leve) + riscos de velocidade como filhos da câmara
    if (alta) {
      this.part = new Particulas(460);
      this.cena.add(this.part.pontos);
      this.construirRiscos();
    }

    // v69 ALTA: composer = RenderPass → Bloom (HDR) → Vinheta → OutputPass (ACES)
    if (alta && renderer) {
      const comp = new EffectComposer(renderer);
      comp.addPass(new RenderPass(this.cena, this.camara));
      comp.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 576), 0.55, 0.85, 0.8));
      this.passVinheta = new ShaderPass(SHADER_VINHETA);
      comp.addPass(this.passVinheta);
      comp.addPass(new OutputPass());
      this.composer = comp;
    }
    // a câmara entra na cena para os filhos (riscos) renderizarem
    this.cena.add(this.camara);

    this.redimensionar();
    window.addEventListener("resize", this.redimensionar);
    window.addEventListener("keydown", this.aoTeclaBaixo);
    window.addEventListener("keyup", this.aoTeclaAlto);
    window.addEventListener("blur", this.largarTudo);
    document.addEventListener("visibilitychange", this.largarTudo);

    this.ultimoT = performance.now();
    this.raf = requestAnimationFrame(this.passo);
  }

  // ── construção do mundo ────────────────────────────────────────
  private construirMundo(def: PistaDef, leve: boolean): void {
    const pista = this.pista;
    const m = pista.amostras.length;
    const alta = this.qualidade === "alta";

    // chão gigante — v69: na praia é MAR (Phong + caustics animadas), resto Phong subtil
    const geoChao = new THREE.CircleGeometry(1400, 48);
    geoChao.rotateX(-Math.PI / 2);
    let matChao: THREE.Material;
    if (def.tema === "praia" && alta) {
      this.texAgua = texturaAgua();
      this.disposaveisTextura.push(this.texAgua);
      this.matAgua = new THREE.MeshPhongMaterial({ color: def.corChao, map: this.texAgua, shininess: 110, specular: 0xbfe3ff });
      matChao = this.matAgua;
    } else if (alta) {
      matChao = new THREE.MeshPhongMaterial({ color: def.corChao, shininess: def.tema === "deserto" ? 14 : 6, specular: 0x2f2f2f });
    } else {
      matChao = new THREE.MeshLambertMaterial({ color: def.corChao });
    }
    const chao = new THREE.Mesh(geoChao, matChao);
    chao.position.y = -0.06;
    chao.receiveShadow = alta;
    this.cena.add(chao);
    this.registar(geoChao, matChao);

    // estrada (fita por amostras) — v69: asfalto com tracejado/linhas (uv ao longo)
    const geoEstrada = this.fita(-def.largura, def.largura, 0.02, alta);
    let matEstrada: THREE.MeshLambertMaterial;
    if (alta) {
      const texAsf = texturaAsfalto();
      this.disposaveisTextura.push(texAsf);
      matEstrada = new THREE.MeshLambertMaterial({ color: def.corEstrada, map: texAsf, side: THREE.DoubleSide });
    } else {
      matEstrada = new THREE.MeshLambertMaterial({ color: def.corEstrada, side: THREE.DoubleSide });
    }
    const estrada = new THREE.Mesh(geoEstrada, matEstrada);
    estrada.receiveShadow = alta;
    this.cena.add(estrada);
    this.registar(geoEstrada, matEstrada);

    // bordas alternadas (vermelho/branco) dos dois lados
    const geoBorda = this.fitaComCores(-def.largura - 1.1, -def.largura, (i) => (Math.floor(i / 4) % 2 === 0 ? def.corBordaA : def.corBordaB));
    const matBorda = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.cena.add(new THREE.Mesh(geoBorda, matBorda));
    this.registar(geoBorda, matBorda);
    const geoBorda2 = this.fitaComCores(def.largura, def.largura + 1.1, (i) => (Math.floor(i / 4) % 2 === 0 ? def.corBordaA : def.corBordaB));
    this.cena.add(new THREE.Mesh(geoBorda2, matBorda));
    this.registar(geoBorda2, matBorda);

    // linha de partida (xadrez) + portão
    const texX = texturaXadrez();
    this.disposaveisTextura.push(texX);
    const geoLinha = new THREE.PlaneGeometry(def.largura * 2, 3);
    geoLinha.rotateX(-Math.PI / 2);
    const matLinha = new THREE.MeshBasicMaterial({ map: texX });
    const linha = new THREE.Mesh(geoLinha, matLinha);
    const a0 = pista.amostras[0];
    linha.position.set(a0.x, 0.035, a0.z);
    linha.rotation.y = Math.atan2(a0.tx, a0.tz);
    this.cena.add(linha);
    this.registar(geoLinha, matLinha);
    const geoPoste = new THREE.CylinderGeometry(0.5, 0.5, 7, 10);
    const matPoste = new THREE.MeshLambertMaterial({ color: 0x2c3440 });
    const geoBanner = new THREE.BoxGeometry(def.largura * 2 + 3, 1.4, 0.4);
    const matBanner = new THREE.MeshLambertMaterial({ color: def.corBordaA });
    for (const lado of [-1, 1]) {
      const poste = new THREE.Mesh(geoPoste, matPoste);
      poste.position.set(a0.x + a0.nx * (def.largura + 2) * lado, 3.5, a0.z + a0.nz * (def.largura + 2) * lado);
      this.cena.add(poste);
    }
    const banner = new THREE.Mesh(geoBanner, matBanner);
    banner.position.set(a0.x, 7, a0.z);
    banner.rotation.y = Math.atan2(a0.tx, a0.tz);
    this.cena.add(banner);
    this.registar(geoPoste, matPoste);
    this.registar(geoBanner, matBanner);

    // rampas de turbo
    const texR = texturaRampa();
    this.disposaveisTextura.push(texR);
    const geoRampa = new THREE.PlaneGeometry(6, 9);
    geoRampa.rotateX(-Math.PI / 2);
    const matRampa = new THREE.MeshBasicMaterial({ map: texR });
    for (const r of pista.rampas) {
      const mesh = new THREE.Mesh(geoRampa, matRampa);
      mesh.position.set(r.x, 0.04, r.z);
      mesh.rotation.y = Math.atan2(r.tx, r.tz);
      this.cena.add(mesh);
      this.meshesRampa.push(mesh);
    }
    this.registar(geoRampa, matRampa);

    // caixas de item
    const geoCaixa = new THREE.BoxGeometry(1.7, 1.7, 1.7);
    const matCaixa = alta
      ? new THREE.MeshPhongMaterial({ color: 0xff9e2c, emissive: new THREE.Color(0.62, 0.3, 0.03), transparent: true, opacity: 0.84, shininess: 55, specular: 0xfff0c0 })
      : new THREE.MeshLambertMaterial({ color: 0xff9e2c, transparent: true, opacity: 0.82 });
    for (let i = 0; i < pista.caixas.length; i++) {
      const cx = pista.caixas[i];
      const mesh = new THREE.Mesh(geoCaixa, matCaixa);
      mesh.position.set(cx.x, 1.1, cx.z);
      mesh.userData.idx = i;
      this.cena.add(mesh);
      this.meshesCaixa.push(mesh);
    }
    this.registar(geoCaixa, matCaixa);

    // moedas — v69: emissivo HDR para o bloom as acender (leve mantém a v65)
    const geoMoeda = new THREE.CylinderGeometry(0.85, 0.85, 0.16, 14);
    geoMoeda.rotateX(Math.PI / 2);
    const matMoeda = alta
      ? new THREE.MeshPhongMaterial({ color: 0xffd23f, emissive: new THREE.Color(1.05, 0.78, 0.12), shininess: 120, specular: 0xffffff })
      : new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x7a5a00 });
    for (let i = 0; i < pista.moedas.length; i++) {
      const mo = pista.moedas[i];
      const mesh = new THREE.Mesh(geoMoeda, matMoeda);
      mesh.position.set(mo.x, 1.0, mo.z);
      mesh.userData.idx = i;
      this.cena.add(mesh);
      this.meshesMoeda.push(mesh);
    }
    this.registar(geoMoeda, matMoeda);

    // decoração por tema (leve = metade)
    const rng = rng32(20261118);
    const decorMax = leve ? 45 : 90;
    const geoTronco = new THREE.CylinderGeometry(0.22, 0.34, 4.4, 7);
    const matTronco = new THREE.MeshLambertMaterial({ color: def.tema === "praia" ? 0x8a5a2b : 0x6b4a2a });
    const geoPalma = new THREE.SphereGeometry(1.7, 8, 6);
    const geoCacto = new THREE.CylinderGeometry(0.42, 0.5, 3.2, 8);
    const geoRocha = new THREE.ConeGeometry(1.9, 2.6, 7);
    const matPalma = new THREE.MeshLambertMaterial({ color: 0x2ea043 });
    const matCacto = new THREE.MeshLambertMaterial({ color: 0x1e8a3c });
    const matRocha = new THREE.MeshLambertMaterial({ color: def.tema === "vulcao" ? 0x2f2628 : 0x8f8377 });
    const geoLava = new THREE.CircleGeometry(3.4, 12);
    geoLava.rotateX(-Math.PI / 2);
    // v69: lava HDR (>1 por canal) — o bloom faz o magma ARDER; pulsa por frame
    this.matLava = alta
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 0.52, 0.14) })
      : new THREE.MeshBasicMaterial({ color: 0xff5a1f });
    this.registar(geoTronco, matTronco);
    this.registar(geoPalma, matPalma);
    this.registar(geoCacto, matCacto);
    this.registar(geoRocha, matRocha);
    this.registar(geoLava, this.matLava);
    for (let k = 0; k < decorMax; k++) {
      const a = pista.amostras[Math.floor(rng() * m)];
      const lado = rng() < 0.5 ? -1 : 1;
      const lat = lado * (def.largura + 4 + rng() * 18);
      const x = a.x + a.nx * lat, z = a.z + a.nz * lat;
      if (def.tema === "praia") {
        const tronco = new THREE.Mesh(geoTronco, matTronco);
        tronco.position.set(x, 2.2, z);
        const palma = new THREE.Mesh(geoPalma, matPalma);
        palma.position.set(x, 5.1, z);
        palma.scale.setScalar(0.8 + rng() * 0.6);
        this.cena.add(tronco, palma);
      } else if (def.tema === "deserto") {
        if (rng() < 0.6) {
          const cacto = new THREE.Mesh(geoCacto, matCacto);
          cacto.position.set(x, 1.6, z);
          cacto.scale.setScalar(0.7 + rng() * 0.8);
          this.cena.add(cacto);
        } else {
          const rocha = new THREE.Mesh(geoRocha, matRocha);
          rocha.position.set(x, 1.1, z);
          rocha.scale.setScalar(0.6 + rng() * 1.2);
          this.cena.add(rocha);
        }
      } else {
        const rocha = new THREE.Mesh(geoRocha, matRocha);
        rocha.position.set(x, 1.1, z);
        rocha.scale.setScalar(0.8 + rng() * 1.6);
        this.cena.add(rocha);
        if (rng() < 0.25) {
          const lava = new THREE.Mesh(geoLava, this.matLava);
          lava.position.set(x + (rng() - 0.5) * 6, 0.02, z + (rng() - 0.5) * 6);
          this.cena.add(lava);
        }
      }
    }

    // colinas distantes (silhueta)
    const geoColina = new THREE.ConeGeometry(90, 55, 7);
    const matColina = new THREE.MeshLambertMaterial({ color: def.corNevoa });
    this.registar(geoColina, matColina);
    for (let k = 0; k < 10; k++) {
      const angulo = (k / 10) * Math.PI * 2;
      const colina = new THREE.Mesh(geoColina, matColina);
      colina.position.set(Math.sin(angulo) * 800, 18, Math.cos(angulo) * 800);
      colina.scale.set(1 + (k % 3) * 0.4, 0.8 + (k % 4) * 0.25, 1);
      this.cena.add(colina);
    }

    // ── v69: cúpula de céu (gradiente + sol HDR) + nuvens-sprite ──
    if (alta) {
      const ceu = CEUS[def.tema] ?? CEUS.praia;
      const geoCeu = new THREE.SphereGeometry(1150, 24, 14);
      this.uniformesCeu = {
        cTopo: { value: new THREE.Color(ceu.topo) },
        cHor: { value: new THREE.Color(ceu.horizonte) },
        cSol: { value: new THREE.Color(ceu.sol) },
        dSol: { value: new THREE.Vector3(ceu.dirSol[0], ceu.dirSol[1], ceu.dirSol[2]).normalize() },
        brilhoSol: { value: ceu.brilhoSol },
      };
      const matCeu = new THREE.ShaderMaterial({
        uniforms: this.uniformesCeu as unknown as Record<string, THREE.IUniform>,
        vertexShader: SHADER_CEU.vertexShader,
        fragmentShader: SHADER_CEU.fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      });
      this.ceuDomo = new THREE.Mesh(geoCeu, matCeu);
      this.ceuDomo.renderOrder = -10;
      this.cena.add(this.ceuDomo);
      this.registar(geoCeu, matCeu);

      if (def.tema === "praia" || def.tema === "deserto") {
        const texNuv = texturaNuvem();
        this.disposaveisTextura.push(texNuv);
        const matNuv = new THREE.SpriteMaterial({ map: texNuv, transparent: true, opacity: 0.85, depthWrite: false });
        this.registar(null, matNuv);
        for (let k = 0; k < 9; k++) {
          const sp = new THREE.Sprite(matNuv);
          const ang = (k / 9) * Math.PI * 2 + rng() * 0.5;
          const raio = 380 + rng() * 300;
          sp.position.set(Math.sin(ang) * raio, 130 + rng() * 70, Math.cos(ang) * raio);
          sp.scale.set(150 + rng() * 90, 45 + rng() * 25, 1);
          this.nuvens.add(sp);
        }
        this.cena.add(this.nuvens);
      }
    }

    // v71: as MARCAS anunciam os desafios NO CIRCUITO (nos DOIS caminhos —
    // é conteúdo da plataforma, não um efeito de qualidade gráfica)
    this.construirPaineisMarcas(def);
  }

  // ── v71: painéis de publicidade das marcas (catálogo + Sala de Patrocínios) ──
  private construirPaineisMarcas(def: PistaDef): void {
    // catálogo do lançamento + os 4 desafios CUSTOM mais recentes da Sala de Patrocínios (teto honesto)
    const marcas: DesafioEmpresa[] = [...CATALOGO_DESAFIOS, ...lerCustom().slice(-4)];
    const m = this.pista.amostras.length;
    const passo = Math.max(40, Math.floor(m / marcas.length));
    const geoQuadro = new THREE.BoxGeometry(7, 3.5, 0.3);
    const geoPoste = new THREE.CylinderGeometry(0.18, 0.22, 3.2, 8);
    const matPoste = new THREE.MeshLambertMaterial({ color: 0x2c3440 });
    const matTraseira = new THREE.MeshLambertMaterial({ color: 0x1f242c });
    this.registar(geoQuadro, matPoste);
    this.registar(geoPoste, matTraseira);
    const alta = this.qualidade === "alta";
    for (let k = 0; k < marcas.length; k++) {
      const d = marcas[k];
      const i = (k * passo) % m;
      const a = this.pista.amostras[i];
      const lado = k % 2 === 0 ? -1 : 1;
      const lat = lado * (def.largura + 4.6);
      const px = a.x + a.nx * lat, pz = a.z + a.nz * lat;
      const tex = texturaPainelMarca(d);
      this.disposaveisTextura.push(tex);
      const matFrente = new THREE.MeshBasicMaterial({ map: tex });
      this.registar(null, matFrente);
      // BoxGeometry: material por face [+x, −x, +y, −y, +z, −z] — o TEXTO na frente (+z)
      const quadro = new THREE.Mesh(geoQuadro, [matTraseira, matTraseira, matTraseira, matTraseira, matFrente, matTraseira]);
      quadro.position.set(px, 4.2, pz);
      quadro.rotation.y = Math.atan2(-lado * a.nx, -lado * a.nz); // a face do texto olha para a pista
      quadro.castShadow = alta;   // v71: as marcas também lançam sombra no caminho ALTA
      quadro.receiveShadow = alta;
      this.cena.add(quadro);
      this.paineisMarcas.push(quadro);
      for (const off of [-2.6, 2.6]) {
        const poste = new THREE.Mesh(geoPoste, matPoste);
        const nx = Math.cos(quadro.rotation.y), nz = -Math.sin(quadro.rotation.y);
        poste.position.set(px + nx * off, 1.6, pz + nz * off);
        poste.castShadow = alta;
        this.cena.add(poste);
      }
    }
  }

  /** v69: riscos de velocidade — linhas aditivas EM TORNO da câmara (aparecem com velocidade). */
  private construirRiscos(): void {
    const n = 44;
    const pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const r = 2.4 + Math.random() * 6.5;
      const len = 2.2 + Math.random() * 2.6;
      const cx = Math.cos(th) * r, cy = Math.sin(th) * r * 0.72, cz = -3.5 - Math.random() * 3;
      pos[i * 6] = cx; pos[i * 6 + 1] = cy; pos[i * 6 + 2] = cz;
      pos[i * 6 + 3] = cx; pos[i * 6 + 4] = cy; pos[i * 6 + 5] = cz - len;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.matRiscos = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
    this.riscos = new THREE.LineSegments(geo, this.matRiscos);
    this.riscos.frustumCulled = false;
    this.riscos.renderOrder = 20;
    this.camara.add(this.riscos);
    this.registar(geo, this.matRiscos);
  }

  /** Fita entre duas latitudes laterais (estrada) — geometria por amostras. v69: uv opcional ao longo. */
  private fita(latA: number, latB: number, y: number, comUv = false): THREE.BufferGeometry {
    const pista = this.pista;
    const m = pista.amostras.length;
    const pos = new Float32Array((m + 1) * 2 * 3);
    const uv = comUv ? new Float32Array((m + 1) * 2 * 2) : null;
    const idx: number[] = [];
    for (let i = 0; i <= m; i++) {
      const a = pista.amostras[i % m];
      pos[i * 6] = a.x + a.nx * latA; pos[i * 6 + 1] = y; pos[i * 6 + 2] = a.z + a.nz * latA;
      pos[i * 6 + 3] = a.x + a.nx * latB; pos[i * 6 + 4] = y; pos[i * 6 + 5] = a.z + a.nz * latB;
      if (uv) {
        const v = (a.s ?? i * 2.5) / 7; // 7 u por repetição do asfalto
        uv[i * 4] = 0; uv[i * 4 + 1] = v;
        uv[i * 4 + 2] = 1; uv[i * 4 + 3] = v;
      }
    }
    for (let i = 0; i < m; i++) {
      const p0 = i * 2, p1 = i * 2 + 1, p2 = ((i + 1) % (m + 1)) * 2, p3 = ((i + 1) % (m + 1)) * 2 + 1;
      idx.push(p0, p1, p2, p1, p3, p2); // winding para CIMA (visto de cima — lição da captura!)
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    if (uv) g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /** Fita com cores por amostra (bordas alternadas). */
  private fitaComCores(latA: number, latB: number, cor: (i: number) => number): THREE.BufferGeometry {
    const pista = this.pista;
    const m = pista.amostras.length;
    const pos = new Float32Array((m + 1) * 2 * 3);
    const col = new Float32Array((m + 1) * 2 * 3);
    const idx: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i <= m; i++) {
      const a = pista.amostras[i % m];
      c.setHex(cor(i));
      pos[i * 6] = a.x + a.nx * latA; pos[i * 6 + 1] = 0.03; pos[i * 6 + 2] = a.z + a.nz * latA;
      pos[i * 6 + 3] = a.x + a.nx * latB; pos[i * 6 + 4] = 0.03; pos[i * 6 + 5] = a.z + a.nz * latB;
      col[i * 6] = c.r; col[i * 6 + 1] = c.g; col[i * 6 + 2] = c.b;
      col[i * 6 + 3] = c.r; col[i * 6 + 4] = c.g; col[i * 6 + 5] = c.b;
    }
    for (let i = 0; i < m; i++) {
      const p0 = i * 2, p1 = i * 2 + 1, p2 = ((i + 1) % (m + 1)) * 2, p3 = ((i + 1) % (m + 1)) * 2 + 1;
      idx.push(p0, p1, p2, p1, p3, p2); // winding para CIMA
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // ── karts ──────────────────────────────────────────────────────
  private construirCorredores(): void {
    const alta = this.qualidade === "alta";
    const geoCorpo = new THREE.BoxGeometry(1.9, 0.62, 3);
    const geoCabine = new THREE.BoxGeometry(1.15, 0.55, 1.3);
    const geoRoda = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 10);
    geoRoda.rotateZ(Math.PI / 2);
    const geoPiloto = new THREE.SphereGeometry(0.38, 10, 8);
    const geoAlerao = new THREE.BoxGeometry(1.7, 0.1, 0.42);
    const geoChama = new THREE.ConeGeometry(0.4, 1.5, 8);
    geoChama.rotateX(Math.PI / 2);
    const geoFaiscas = new THREE.RingGeometry(1.1, 2.0, 16);
    geoFaiscas.rotateX(-Math.PI / 2);
    const geoEscudo = new THREE.SphereGeometry(2.1, 14, 10);
    const matRoda = alta ? new THREE.MeshPhongMaterial({ color: 0x23262b, shininess: 40, specular: 0x555555 }) : new THREE.MeshLambertMaterial({ color: 0x23262b });
    const matPiloto = alta ? new THREE.MeshPhongMaterial({ color: 0xf2f2f2, shininess: 30, specular: 0x444444 }) : new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    const matCabine = alta ? new THREE.MeshPhongMaterial({ color: 0x2c3440, shininess: 90, specular: 0x8899aa }) : new THREE.MeshLambertMaterial({ color: 0x2c3440 });
    const matAlerao = alta ? new THREE.MeshPhongMaterial({ color: 0x1f242c, shininess: 60, specular: 0x666666 }) : new THREE.MeshLambertMaterial({ color: 0x1f242c });
    // v69: chama aditiva HDR (o bloom faz o turbo VIBRAR)
    const matChama = alta
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.6, 0.15), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
      : new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.9 });
    const matFaiscas = new THREE.MeshBasicMaterial({ color: COR_FAISCA_1, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const matEscudo = new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.35 });
    this.registar(geoCorpo, matRoda);
    this.registar(geoCabine, matCabine);
    this.registar(geoRoda, matRoda);
    this.registar(geoPiloto, matPiloto);
    this.registar(geoAlerao, matAlerao);
    this.registar(geoChama, matChama);
    this.registar(geoFaiscas, matFaiscas);
    this.registar(geoEscudo, matEscudo);
    for (const c of this.corrida.corredores) {
      const matCorpo = alta
        ? new THREE.MeshPhongMaterial({ color: c.cor, shininess: 80, specular: 0x777777 })
        : new THREE.MeshLambertMaterial({ color: c.cor });
      this.registar(null, matCorpo);
      const grupo = new THREE.Group();
      const corpo = new THREE.Mesh(geoCorpo, matCorpo);
      corpo.position.y = 0.55;
      corpo.castShadow = alta;
      const cabine = new THREE.Mesh(geoCabine, matCabine);
      cabine.position.set(0, 1.0, -0.25);
      cabine.castShadow = alta;
      const piloto = new THREE.Mesh(geoPiloto, matPiloto);
      piloto.position.set(0, 1.35, -0.25);
      const alerao = new THREE.Mesh(geoAlerao, matAlerao);
      alerao.position.set(0, 1.0, -1.35);
      alerao.castShadow = alta;
      grupo.add(corpo, cabine, piloto, alerao);
      for (const [rx, rz] of [[-1.05, 1.05], [1.05, 1.05], [-1.05, -1.05], [1.05, -1.05]] as const) {
        const roda = new THREE.Mesh(geoRoda, matRoda);
        roda.position.set(rx, 0.44, rz);
        grupo.add(roda);
      }
      const chama = new THREE.Mesh(geoChama, matChama);
      chama.position.set(0, 0.55, -2.2);
      chama.rotation.y = Math.PI; // aponta para trás
      chama.visible = false;
      grupo.add(chama);
      const faiscas = new THREE.Mesh(geoFaiscas, matFaiscas);
      faiscas.position.y = 0.1;
      faiscas.visible = false;
      grupo.add(faiscas);
      const escudo = new THREE.Mesh(geoEscudo, matEscudo);
      escudo.position.y = 0.9;
      escudo.visible = false;
      grupo.add(escudo);
      // v68 BATALHA: 3 balões sobre o kart (a cor do piloto) — visíveis por balões restantes
      const geoBalao = new THREE.SphereGeometry(0.46, 10, 8);
      this.registar(geoBalao);
      const baloes = new THREE.Group();
      const posBaloes: [number, number, number][] = [[-0.85, 2.45, -0.3], [0, 2.95, -0.5], [0.85, 2.45, -0.3]];
      for (const [bx, by, bz] of posBaloes) {
        const bolha = new THREE.Mesh(geoBalao, matCorpo);
        bolha.position.set(bx, by, bz);
        bolha.visible = false;
        baloes.add(bolha);
      }
      baloes.visible = !!this.batalha;
      grupo.add(baloes);
      this.cena.add(grupo);
      this.meshesKart.set(c.id, { grupo, chama, faiscas, escudo, baloes, corpoMat: matCorpo });
    }
  }

  private registar(geo: THREE.BufferGeometry | null, mat?: THREE.Material | THREE.Light | null): void {
    if (geo) this.disposaveisGeometria.push(geo);
    if (mat && (mat as THREE.Material).dispose) this.disposaveisMaterial.push(mat as THREE.Material);
  }

  // ── input ──────────────────────────────────────────────────────
  private aoTeclaBaixo = (ev: KeyboardEvent): void => {
    if (this.destruido || this.pausadoRef) return;
    const k = ev.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(k)) ev.preventDefault();
    this.teclas.add(k);
    if (k === "KeyE" || k === "Enter" || k === "ControlLeft") this.entrada.usarItem = true;
    this.sincronizarTeclas();
  };
  private aoTeclaAlto = (ev: KeyboardEvent): void => {
    this.teclas.delete(ev.code);
    this.sincronizarTeclas();
  };
  private largarTudo = (): void => {
    this.teclas.clear();
    this.entrada.acelerar = false; this.entrada.travar = false; this.entrada.virar = 0; this.entrada.derrapar = false;
    if (this.autoAcelerar) this.entrada.acelerar = true;
  };
  private sincronizarTeclas(): void {
    this.entrada.acelerar = this.teclas.has("ArrowUp") || this.teclas.has("KeyW");
    this.entrada.travar = this.teclas.has("ArrowDown") || this.teclas.has("KeyS");
    const esq = this.teclas.has("ArrowLeft") || this.teclas.has("KeyA");
    const dir = this.teclas.has("ArrowRight") || this.teclas.has("KeyD");
    this.entrada.virar = (dir ? 1 : 0) + (esq ? -1 : 0);
    this.entrada.derrapar = this.teclas.has("ShiftLeft") || this.teclas.has("ShiftRight") || this.teclas.has("Space");
    if (this.autoAcelerar) this.entrada.acelerar = true;
  }

  /** Entrada externa (botões móveis / E2E). `usarItem` é uma PULSAÇÃO. */
  setEntrada(parcial: Partial<Omit<EntradaKart, "usarItem">>): void {
    if (this.destruido) return;
    Object.assign(this.entrada, parcial);
    if (this.autoAcelerar && parcial.acelerar === false) this.entrada.acelerar = true;
  }
  pulsarItem(): void {
    if (!this.destruido) this.entrada.usarItem = true;
  }
  pausar(v: boolean): void {
    this.pausadoRef = v;
    if (v) {
      this.largarTudo();
      this.opts.som?.motor(0, false); // motor silencia na pausa
      this.opts.som?.derrapagem(0);
    }
  }
  estaPausado(): boolean { return this.pausadoRef; }

  // ── v66 ONLINE ─────────────────────────────────────────────────
  estaRede(): boolean { return this.rede; }
  idMeu(): number { return this.idJogador; }
  /** Entrada ATUAL do jogador (o cliente de rede publica isto a ~30 Hz). */
  obterEntrada(): EntradaKart { return this.entrada; }

  /** Aplica a snapshot AUTORITATIVA da sala ao mirror visual (o servidor é quem simula). */
  aplicarSnap(s: SnapKart): void {
    if (this.destruido || !this.rede) return;
    for (const r of s.j) {
      const c = this.corrida.corredores.find((x) => x.id === r.id);
      if (!c) continue;
      c.boost = r.bo || 0;
      c.stun = r.st || 0;
      c.escudo = r.esc || 0;
      c.foraPista = r.fp === 1;
      c.derrapando = r.dr === 1;
      c.derivaCarga = r.dc || 0;
      c.volta = r.vo || 0;
      c.posicao = r.po || 0;
      c.moedas = r.mo || 0;
      c.iAmostra = r.ia || c.iAmostra;
      c.item = (r.it ?? null) as ItemKartId | null;
      c.itens3 = r.i3 || 0;
      c.terminou = r.fin === 1;
      if (r.fin === 1 && r.tf > 0) c.tempoFim = r.tf;
      c.eJogador = r.ej === 1;
      c.vel = r.vel || 0;
      this.alvosRede.set(r.id, { x: r.x, z: r.z, ang: r.ang, da: r.da || r.ang });
    }
    s.cx?.forEach((v, i) => { const c = this.corrida.caixas[i]; if (c) c.viva = v === 1; });
    s.mn?.forEach((v, i) => { const c = this.corrida.moedas[i]; if (c) c.viva = v === 1; });
    // projéteis/perigos: reconstruídos pelo ID (as meshes seguem automaticamente)
    const proj: typeof this.corrida.projeteis = [];
    this.alvosProjetilRede.clear();
    for (const r of (s as unknown as { pj?: { i: number; tp: "casca" | "cascaAlvo" | "missil"; x: number; z: number; ang: number; do: number }[] }).pj ?? []) {
      proj.push({ id: r.i, tipo: r.tp, x: r.x, z: r.z, ang: r.ang, vel: 0, dono: r.do, alvo: -1, vida: 1, iAmostra: 0 });
      this.alvosProjetilRede.set(r.i, { x: r.x, z: r.z, ang: r.ang });
    }
    this.corrida.projeteis = proj;
    const per: typeof this.corrida.perigos = [];
    this.alvosOleoRede.clear();
    for (const r of (s as unknown as { og?: { i: number; x: number; z: number; do: number }[] }).og ?? []) {
      per.push({ id: r.i, tipo: "oleo", x: r.x, z: r.z, dono: r.do, vida: 1, idade: 1 });
      this.alvosOleoRede.set(r.i, { x: r.x, z: r.z });
    }
    this.corrida.perigos = per;
    this.corrida.fase = s.fase;
    this.corrida.tempo = s.tempo ?? this.corrida.tempo;
    this.corrida.tempoContagem = s.cont ?? 0;
    if (s.ev?.length) for (const ev of s.ev) this.corrida.eventos.push(ev);
    if (s.res?.length) this.corrida.resultados = s.res;
  }

  // ── ciclo ──────────────────────────────────────────────────────
  private passo = (): void => {
    if (this.destruido) return;
    this.raf = requestAnimationFrame(this.passo);
    const agora = performance.now();
    const dt = Math.min((agora - this.ultimoT) / 1000, 0.25); // catch-up honesto (v63)
    this.ultimoT = agora;
    if (!this.pausadoRef) {
      if (this.rede) {
        // v66 ONLINE: a ENTRADA (inclusive o auto) vai para o SERVIDOR; o motor só interpola
        if (this.auto) {
          const usarPendente = this.entrada.usarItem;
          this.entrada = this.entradaAuto();
          if (usarPendente) this.entrada.usarItem = true;
        }
        if (this.entrada.usarItem) {
          this.entrada.usarItem = false;
          this.opts.aoPulsarItemRede?.();
        }
        this.interpolarRede(dt);
        this.drenarEventos();
        this.empurrarHud();
      } else {
        if (this.auto) {
          const usarPendente = this.entrada.usarItem; // a pulsação do item SOBREVIVE ao auto
          this.entrada = this.entradaAuto();
          if (usarPendente) this.entrada.usarItem = true;
        }
        const antes = this.corrida.fase;
        const itemAntes = this.corredorJogador().item;
        const baloesAntes = this.batalha ? this.batalha.baloes[this.idJogador] : -1;
        if (this.batalha) passoBatalha(this.batalha, this.entrada, dt);
        else passoCorrida(this.corrida, this.entrada, dt);
        this.entrada.usarItem = false; // pulsação consumida
        this.drenarEventos();
        const mudouBaloes = this.batalha && this.batalha.baloes[this.idJogador] !== baloesAntes;
        if (this.corrida.fase !== antes || this.corredorJogador().item !== itemAntes || mudouBaloes) this.empurrarHud();
      }
    }
    this.atualizarSom();
    this.sincronizarVisual(agora);
    this.atualizarAmbiente(agora, dt); // v69: céu/nuvens/água/lava/brasas/sombra seguem o mundo
    this.seguirCamara(dt);
    if (this.composer) this.composer.render();
    else if (this.renderer) this.renderer.render(this.cena, this.camara);
    if (agora - this.ultimoHud > 110) this.empurrarHud();
  };

  /** v67: alimenta os loops de áudio (motor/derrapagem) + beeps da contagem + fanfarra. Serve para solo E rede —
   *  lê APENAS o estado do espelho (em rede o estado vem das snapshots a 10 Hz). */
  private atualizarSom(): void {
    const som = this.opts.som;
    if (!som) return;
    const j = this.corredorJogador();
    // pausa silencia os loops (e impede que este método re-alimente o pitch)
    if (this.pausadoRef) { som.motor(0, false); som.derrapagem(0); return; }
    // motor + derrapagem (por frame — o pitch do motor precisa de suavidade)
    const velMax = Math.max(1, j.stats?.velMax ?? 38);
    som.motor(Math.min(1, Math.max(0, j.vel / velMax)), this.entrada.acelerar);
    som.derrapagem(j.derrapando ? Math.min(1, 0.35 + j.vel / velMax * 0.65) : 0);
    // contagem 3·2·1·JÁ — cruza INTEIROS descendentes (funciona a 10 Hz em rede)
    if (this.corrida.fase === "contagem") {
      const cont = Math.ceil(this.corrida.tempoContagem);
      if (cont < this.somBeep && cont >= 1) { this.somBeep = cont; som.beep(cont); }
    }
    if (this.somFase === "contagem" && this.corrida.fase === "corrida") { som.beep(0); this.somBeep = 4; }
    this.somFase = this.corrida.fase;
    // fanfarra da CHEGADA (1×)
    if (!this.somTerminei && j.terminou) { this.somTerminei = true; som.chegada(); }
  }

  /** v66: interpola o mirror em direção à ÚLTIMA snapshot (10 Hz → 60 fps suave). */
  private interpolarRede(dt: number): void {
    const k = 1 - Math.exp(-Math.max(dt, 0.001) * 12);
    for (const c of this.corrida.corredores) {
      const al = this.alvosRede.get(c.id);
      if (!al) continue;
      c.x += (al.x - c.x) * k;
      c.z += (al.z - c.z) * k;
      let da = al.ang - c.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      c.ang += da * k;
      let dd = al.da - c.dirAng;
      dd = Math.atan2(Math.sin(dd), Math.cos(dd));
      c.dirAng += dd * k;
    }
    for (const p of this.corrida.projeteis) {
      const al = this.alvosProjetilRede.get(p.id);
      if (!al) continue;
      p.x += (al.x - p.x) * k;
      p.z += (al.z - p.z) * k;
      let da = al.ang - p.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      p.ang += da * k;
    }
    for (const h of this.corrida.perigos) {
      const al = this.alvosOleoRede.get(h.id);
      if (!al) continue;
      h.x += (al.x - h.x) * k;
      h.z += (al.z - h.z) * k;
    }
  }

  private corredorJogador() {
    return this.corrida.corredores.find((c) => c.id === this.idJogador) ?? this.corrida.corredores[6];
  }

  /** v69: vida do MUNDO por frame — céu/nuvens seguem a câmara, água caustica, lava pulsa,
   *  brasas sobem no vulcão, a caixa de sombra segue o jogador e as partículas físicas avançam. */
  private atualizarAmbiente(agoraMs: number, dt: number): void {
    const t = agoraMs / 1000;
    const j = this.corredorJogador();
    if (this.ceuDomo) this.ceuDomo.position.copy(this.camara.position);
    if (this.nuvens.children.length) this.nuvens.rotation.y = t * 0.005;
    if (this.texAgua) { this.texAgua.offset.x = (t * 0.022) % 1; this.texAgua.offset.y = (t * 0.013) % 1; }
    if (this.matLava) {
      const p = 0.5 + Math.sin(t * 2.6) * 0.09;
      this.matLava.color.setRGB(1.9 * p + 0.2, 0.52 * p + 0.05, 0.14 * p);
    }
    if (this.luzDir) {
      this.luzDir.position.set(j.x + 90, 160, j.z + 60);
      this.luzDir.target.position.set(j.x, 0, j.z);
      this.luzDir.target.updateMatrixWorld();
    }
    // brasas ambiente (vulcão/coliseu) — algumas por segundo, sobem devagar
    if (this.part && this.pista.def.tema === "vulcao" && Math.random() < 0.4) {
      const ang = Math.random() * Math.PI * 2, raio = 18 + Math.random() * 70;
      this.part.emitir({
        x: j.x + Math.sin(ang) * raio, y: 0.4, z: j.z + Math.cos(ang) * raio,
        vx: 0, vy: 1.4 + Math.random() * 1.4, vz: 0, n: 1,
        vida: 2.4, cor: 0xff6a1f, cor2: 0xffc85a, brilho: 1.15, tamanho: 0.3, gravidade: 0.4, arrasto: 0.4,
      });
    }
    if (this.part) this.part.atualizar(dt);
    // riscos de velocidade: opacidade pela velocidade (forte em turbo)
    if (this.matRiscos) {
      const vn = Math.max(0, Math.min(1, j.vel / Math.max(1, j.stats?.velMax ?? 38)));
      const alvo = Math.max(0, (vn - 0.5) / 0.5) * 0.42 * (j.boost > 0 ? 1.45 : 1);
      this.matRiscos.opacity += (Math.min(0.6, alvo) - this.matRiscos.opacity) * Math.min(1, 8 * Math.max(dt, 0.001));
    }
  }

  /** Condução assistida (telemóvel/testes): persegue o ponto da pista à frente. */
  private entradaAuto(): EntradaKart {
    const j = this.corredorJogador();
    const m = this.pista.amostras.length;
    const look = 12 + Math.floor(j.vel * 0.35);
    const alvo = this.pista.amostras[(j.iAmostra + look) % m];
    const dif = Math.atan2(alvo.x - j.x, alvo.z - j.z) - j.ang;
    const difN = Math.atan2(Math.sin(dif), Math.cos(dif));
    return {
      acelerar: true,
      travar: false,
      virar: Math.max(-1, Math.min(1, difN * 2.5)),
      derrapar: Math.abs(difN) > 0.4 && j.vel > 20,
      usarItem: false,
    };
  }
  setAuto(v: boolean): void { this.auto = v; }

  private drenarEventos(): void {
    const avisos: AvisosKart = {};
    let algum = false;
    for (const ev of this.corrida.eventos) {
      algum = true;
      const e = ev as EventoCorrida;
      this.opts.som?.evento(e as unknown as { t: string; id?: number; item?: string; fase?: number; por?: number; alvo?: number }, this.idJogador); // v67
      if (e.t === "golpe") {
        // v69: faíscas no kart atingido + TREMOR se EU fui atingido
        const vitima = this.corrida.corredores.find((c) => c.id === e.alvo);
        if (vitima && this.part) {
          this.part.emitir({ x: vitima.x, y: 0.8, z: vitima.z, vx: 0, vy: 3.5, vz: 0, espalhar: 7, n: 22, vida: 0.55, cor: 0xffd75e, cor2: 0xff8a1f, brilho: 1.4, tamanho: 0.34, gravidade: -9, arrasto: 1.4 });
        }
        if (e.alvo === this.idJogador) { avisos.golpeRecebido = e.tipo; this.tremor = 0.55; }
      }
      else if (e.t === "raio") {
        avisos.golpeRecebido = "raio"; this.ultRaio = performance.now();
        if (this.corredorJogador().stun > 0) this.tremor = Math.max(this.tremor, 0.35); // o raio atinge-me
      }
      else if (e.t === "item" && e.id === this.idJogador) {
        avisos.itemNovo = e.item;
        this.caixasEu++; // v70: caixa «?» que EU abri (contador honesto para desafios)
        const j = this.corredorJogador();
        if (this.part) this.part.emitir({ x: j.x, y: 1.3, z: j.z, vx: 0, vy: 3, vz: 0, espalhar: 4.5, n: 14, vida: 0.5, cor: 0xffb347, cor2: 0xfff0a0, brilho: 1.3, tamanho: 0.32, gravidade: -6, arrasto: 1.6 });
      }
      else if (e.t === "volta" && e.id === this.idJogador) { avisos.voltaNova = e.volta; }
      else if (e.t === "moeda" && e.id === this.idJogador) { avisos.moeda = true; }
      else if (e.t === "deriva" && e.id === this.idJogador) {
        avisos.derivaTurbo = e.fase;
        this.derivaFase = 0;
        // v69: jorros do mini-turbo (azul/laranja pela fase)
        const j = this.corredorJogador();
        if (this.part) this.part.emitir({ x: j.x, y: 0.5, z: j.z, vx: 0, vy: 2.5, vz: 0, espalhar: 5, n: 16, vida: 0.5, cor: e.fase === 2 ? 0xffb347 : COR_FAISCA_1, cor2: 0xffffff, brilho: e.fase === 2 ? 1.4 : 1.15, tamanho: 0.35, gravidade: -4, arrasto: 2 });
      } else if (e.t === "rampa" && e.id === this.idJogador) {
        avisos.rampa = true;
        const j = this.corredorJogador();
        if (this.part) this.part.emitir({ x: j.x, y: 0.6, z: j.z, vx: 0, vy: 4, vz: 0, espalhar: 4, n: 12, vida: 0.5, cor: 0x66ccff, cor2: 0xffffff, brilho: 1.3, tamanho: 0.34, gravidade: -5, arrasto: 1.8 });
      }
    }
    this.corrida.eventos.length = 0;
    // v68 BATALHA: traduz os eventos de balões em avisos (o som dos golpes já veio pelo «golpe» do core)
    if (this.batalha) {
      for (const ev of this.batalha.eventos) {
        algum = true;
        if (ev.t === "balao" && ev.alvo === this.idJogador) avisos.balaoPerdido = true;
        else if (ev.t === "eliminado") {
          if (ev.alvo === this.idJogador) avisos.eliminadoEu = true;
          else {
            const vitima = this.corrida.corredores[ev.alvo];
            const agressor = ev.por >= 0 && ev.por < this.corrida.corredores.length ? this.corrida.corredores[ev.por] : null;
            avisos.eliminadoOutro = { nome: vitima?.nome ?? "?", por: agressor?.nome ?? "" };
          }
        }
      }
      this.batalha.eventos.length = 0;
    }
    if (algum && Object.keys(avisos).length) this.opts.aoAviso(avisos);
  }

  private empurrarHud(): void {
    this.ultimoHud = performance.now();
    const j = this.corredorJogador();
    // v68 BATALHA: posição/classificação vêm dos BALÕES (a «posição de corrida» é irrelevante aqui)
    let posicao = j.posicao;
    let infoBatalha: EstadoHudKart["batalha"] = null;
    if (this.batalha) {
      const ordem = rankingBatalha(this.batalha);
      posicao = ordem.findIndex((c) => c.id === j.id) + 1;
      infoBatalha = {
        baloes: Math.max(0, this.batalha.baloes[this.idJogador] ?? 0),
        golpes: this.batalha.golpes[this.idJogador] ?? 0,
        vivos: this.batalha.baloes.filter((x) => x > 0).length,
        tempoRestante: Math.max(0, DURACAO_BATALHA_S - this.corrida.tempo),
        classificacao: ordem.map((c, idx) => ({
          id: c.id, nome: c.nome, posicao: idx + 1,
          baloes: Math.max(0, this.batalha!.baloes[c.id]),
          eliminado: c.terminou,
        })),
      };
    }
    this.opts.aoHud({
      fase: this.corrida.fase,
      contagem: Math.min(3, Math.max(0, Math.ceil(this.corrida.tempoContagem))),
      volta: Math.min(this.corrida.voltas, Math.max(1, j.volta || 1)),
      voltas: this.corrida.voltas,
      posicao,
      total: this.corrida.corredores.length,
      vel: j.vel,
      velMax: j.stats.velMax,
      item: j.item,
      itens3: j.itens3,
      moedas: j.moedas,
      tempo: this.corrida.tempo,
      contrario: j.contrario > 0.4,
      derrapando: j.derrapando,
      derivaFase: this.derivaFase,
      boost: j.boost > 0,
      stun: j.stun > 0,
      escudo: j.escudo > 0,
      payout: this.corrida.payout,
      resultados: this.corrida.resultados,
      batalha: infoBatalha,
    });
  }

  // ── sincronização visual ───────────────────────────────────────
  private sincronizarVisual(agoraMs: number): void {
    const t = agoraMs / 1000;
    for (const c of this.corrida.corredores) {
      const mk = this.meshesKart.get(c.id);
      if (!mk) continue;
      mk.grupo.position.set(c.x, 0, c.z);
      mk.grupo.rotation.z = c.derrapando ? -c.derivaDir * 0.09 : 0;
      mk.grupo.rotation.y = c.ang + (c.stun > 0 ? agoraMs * 0.014 : 0); // giro do stun (visual)
      mk.chama.visible = c.boost > 0;
      if (c.boost > 0) mk.chama.scale.setScalar(0.9 + Math.sin(t * 30) * 0.25);
      mk.faiscas.visible = c.derrapando;
      if (c.derrapando) {
        const tier = c.derivaCarga >= 2 ? 2 : c.derivaCarga >= 0.9 ? 1 : 0;
        if (c.eJogador && tier !== this.derivaFase) this.derivaFase = tier as 0 | 1 | 2;
        (mk.faiscas.material as THREE.MeshBasicMaterial).color.setHex(tier >= 2 ? COR_FAISCA_2 : COR_FAISCA_1);
        mk.faiscas.scale.setScalar(tier >= 2 ? 1.25 : 1);
      }
      mk.escudo.visible = c.escudo > 0;
      if (c.stun > 0) mk.grupo.rotation.y += c.stun * 6; // giro do stun (visual)
      // v68 BATALHA: balões visíveis por balões restantes + wreck cinzento a zero
      if (this.batalha) {
        const n = Math.max(0, this.batalha.baloes[c.id] ?? 0);
        mk.baloes.children.forEach((b, i) => { b.visible = i < n; });
        if (n > 0) mk.baloes.position.y = Math.sin(t * 2.4 + c.id * 1.7) * 0.09;
        if (n === 0) {
          if (!mk.corpoMat.userData.wreck) { mk.corpoMat.color.setHex(0x4b4f56); mk.corpoMat.userData.wreck = true; }
        }
      }
      // ── v69: emissores de partículas (derrapagem/turbo/off-road) — só em ALTA ──
      if (this.part && !this.destruido) {
        const dx = Math.sin(c.ang), dz = Math.cos(c.ang);      // frente do kart
        const px = -dx, pz = -dz;                              // traseira
        const deTras = 1.9;
        if (c.derrapando && c.vel > 5) {
          // fumo cinzento nos pneus traseiros (2/frame, vida curta)
          this.part.emitir({
            x: c.x + px * deTras, y: 0.25, z: c.z + pz * deTras,
            vx: px * 2.2, vy: 1.1, vz: pz * 2.2, espalhar: 1.1, n: 2,
            vida: 0.5, cor: 0xcfcfcf, tamanho: 0.5, gravidade: -1.2, arrasto: 2.4,
          });
        }
        if (c.boost > 0) {
          // chamas do escape (HDR — o bloom faz brilhar)
          this.part.emitir({
            x: c.x + px * (deTras + 0.6), y: 0.55, z: c.z + pz * (deTras + 0.6),
            vx: px * 6.5, vy: 0.4, vz: pz * 6.5, espalhar: 1.4, n: 2,
            vida: 0.28, cor: 0xff8a1f, cor2: 0xffd75e, brilho: 1.5, tamanho: 0.4, gravidade: 1.5, arrasto: 2.8,
          });
        }
        if (c.foraPista && c.vel > 5) {
          // poeira do terreno (cor pelo tema)
          const poeira = this.pista.def.tema === "praia" ? 0xf2e3c0 : this.pista.def.tema === "deserto" ? 0xe0c090 : 0x5a4648;
          this.part.emitir({
            x: c.x + px * deTras, y: 0.3, z: c.z + pz * deTras,
            vx: px * 3, vy: 1.4, vz: pz * 3, espalhar: 1.8, n: 1,
            vida: 0.7, cor: poeira, tamanho: 0.55, gravidade: -1.0, arrasto: 2.2,
          });
        }
      }
    }
    // v69: chegada do JOGADOR = chuva de confetti (1×)
    if (this.part && !this.confeteFeito) {
      const j = this.corredorJogador();
      if (j.terminou) {
        this.confeteFeito = true;
        const cores = [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xff4081, 0xffffff];
        for (let k = 0; k < 6; k++) {
          this.part.emitir({
            x: j.x, y: 2.4, z: j.z, vx: 0, vy: 8.5 + Math.random() * 4.5, vz: 0,
            espalhar: 6.5, n: 22, vida: 1.9, cor: cores[k], tamanho: 0.42,
            gravidade: -5.5, arrasto: 1.1,
          });
        }
      }
    }
    // caixas
    this.corrida.caixas.forEach((cx, i) => {
      const mesh = this.meshesCaixa[i];
      if (!mesh) return;
      mesh.visible = cx.viva;
      if (cx.viva) {
        mesh.rotation.y = t * 1.6 + i;
        mesh.position.y = 1.1 + Math.sin(t * 2.2 + i) * 0.18;
      }
    });
    // moedas
    this.corrida.moedas.forEach((mo, i) => {
      const mesh = this.meshesMoeda[i];
      if (!mesh) return;
      mesh.visible = mo.viva;
      if (mo.viva) mesh.rotation.y = t * 3 + i * 0.7;
    });
    // projéteis
    const vivos = new Set<number>();
    for (const p of this.corrida.projeteis) {
      vivos.add(p.id);
      let mesh = this.meshesProjetil.get(p.id);
      if (!mesh) {
        mesh = this.criarProjetil(p.tipo);
        this.cena.add(mesh);
        this.meshesProjetil.set(p.id, mesh);
      }
      mesh.position.set(p.x, p.tipo === "missil" ? 1.0 : 0.75, p.z);
      mesh.rotation.y = p.ang;
    }
    for (const [id, mesh] of this.meshesProjetil) {
      if (!vivos.has(id)) { this.cena.remove(mesh); this.meshesProjetil.delete(id); }
    }
    // óleo
    const vivosOleo = new Set<number>();
    for (const h of this.corrida.perigos) {
      vivosOleo.add(h.id);
      let mesh = this.meshesOleo.get(h.id);
      if (!mesh) {
        const geo = new THREE.CircleGeometry(1.7, 14);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b, transparent: true, opacity: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        this.registar(geo, mat);
        mesh.position.set(h.x, 0.045, h.z);
        this.cena.add(mesh);
        this.meshesOleo.set(h.id, mesh);
      }
    }
    for (const [id, mesh] of this.meshesOleo) {
      if (!vivosOleo.has(id)) { this.cena.remove(mesh); this.meshesOleo.delete(id); }
    }
  }

  private criarProjetil(tipo: "casca" | "cascaAlvo" | "missil"): THREE.Mesh {
    if (tipo === "missil") {
      const geo = new THREE.ConeGeometry(0.42, 1.3, 8);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff6a00 });
      this.registar(geo, mat);
      return new THREE.Mesh(geo, mat);
    }
    const geo = new THREE.SphereGeometry(0.52, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: tipo === "casca" ? 0x3ddc55 : 0xe64545 });
    this.registar(geo, mat);
    return new THREE.Mesh(geo, mat);
  }

  private seguirCamara(dt: number): void {
    const j = this.corredorJogador();
    const dx = Math.sin(j.ang), dz = Math.cos(j.ang);
    const alvo = new THREE.Vector3(j.x - dx * 9.5, 4.6, j.z - dz * 9.5);
    const fator = Math.min(1, 6 * Math.max(dt, 0.001));
    this.camara.position.lerp(alvo, fator);
    const mira = new THREE.Vector3(j.x + dx * 7, 1.5, j.z + dz * 7);
    this.camara.lookAt(mira);
    // v69: rolagem bancária em deriva (a câmara inclina COM o kart)
    const rollAlvo = j.derrapando ? -j.derivaDir * 0.055 : 0;
    this.rollSuave += (rollAlvo - this.rollSuave) * Math.min(1, 5 * Math.max(dt, 0.001));
    this.camara.rotateZ(this.rollSuave);
    // v69: TREMOR de impacto (golpe/raio/balão perdido) — decai exponencial
    if (this.tremor > 0.002) {
      this.camara.position.x += (Math.random() - 0.5) * this.tremor;
      this.camara.position.y += (Math.random() - 0.5) * this.tremor * 0.6;
      this.camara.position.z += (Math.random() - 0.5) * this.tremor;
      this.tremor *= Math.exp(-4.5 * Math.max(dt, 0.001));
    }
    const fovAlvo = 66 + Math.min(14, (j.vel / Math.max(1, j.stats.velMax)) * 14);
    if (Math.abs(this.camara.fov - fovAlvo) > 0.4) {
      this.camara.fov += (fovAlvo - this.camara.fov) * Math.min(1, 3 * dt);
      this.camara.updateProjectionMatrix();
    }
  }

  private redimensionar = (): void => {
    if (this.destruido || !this.renderer) return;
    const canvas = this.opts.canvas;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h); // v69: o composer acompanha o resize
    this.camara.aspect = w / h;
    this.camara.updateProjectionMatrix();
  };

  // ── minimapa 2D (canvas do React) ──────────────────────────────
  desenharMinimapa(ctx: CanvasRenderingContext2D, tamanho: number): void {
    if (this.destruido) return;
    const pista = this.pista;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const a of pista.amostras) {
      if (a.x < minX) minX = a.x; if (a.x > maxX) maxX = a.x;
      if (a.z < minZ) minZ = a.z; if (a.z > maxZ) maxZ = a.z;
    }
    const escala = (tamanho - 14) / Math.max(maxX - minX, maxZ - minZ);
    const cx = tamanho / 2 - ((minX + maxX) / 2) * escala;
    const cz = tamanho / 2 - ((minZ + maxZ) / 2) * escala;
    const px = (x: number) => x * escala + cx;
    const pz = (z: number) => z * escala + cz;
    ctx.clearRect(0, 0, tamanho, tamanho);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(3, pista.def.largura * 2 * escala);
    ctx.beginPath();
    for (let i = 0; i <= pista.amostras.length; i += 4) {
      const a = pista.amostras[i % pista.amostras.length];
      if (i === 0) ctx.moveTo(px(a.x), pz(a.z)); else ctx.lineTo(px(a.x), pz(a.z));
    }
    ctx.stroke();
    const a0 = pista.amostras[0];
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px(a0.x) - 3, pz(a0.z) - 3, 6, 6);
    for (const c of this.corrida.corredores) {
      ctx.fillStyle = c.eJogador ? "#ffd23f" : "#e05252";
      ctx.beginPath();
      ctx.arc(px(c.x), pz(c.z), c.eJogador ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── ganchos E2E (tipados, padrão v60/v63) ──────────────────────
  ganchos() {
    const self = this;
    return {
      estado: () => {
        const j = self.corredorJogador();
        return {
          fase: self.corrida.fase,
          tempo: self.corrida.tempo,
          contagem: self.corrida.tempoContagem,
          voltas: self.corrida.voltas,
          comprimento: Math.round(self.pista.comprimento),
          volta: j.volta,
          posicao: j.posicao,
          item: j.item,
          itens3: j.itens3,
          moedas: j.moedas,
          vel: Math.round(j.vel * 10) / 10,
          x: j.x, z: j.z, ang: j.ang,
          stun: j.stun > 0,
          escudo: j.escudo > 0,
          boost: j.boost > 0,
          derrapando: j.derrapando,
          contrario: j.contrario > 0.4,
          terminou: j.terminou,
          payout: self.corrida.payout,
          resultados: self.corrida.resultados.length,
          corredores: self.corrida.corredores.length,
          projeteis: self.corrida.projeteis.length,
          perigos: self.corrida.perigos.length,
          raioRecente: performance.now() - self.ultRaio < 2500,
          caixasVivas: self.corrida.caixas.filter((c) => c.viva).length,
        };
      },
      /** Posição dos 12 (para provas de ordenação). */
      classificacao: () => posicoesDe(self.corrida).map((c) => ({ id: c.id, nome: c.nome, posicao: c.posicao, eJogador: c.eJogador, terminou: c.terminou, tempo: c.tempoFim })),
      // ── v66 ONLINE ──
      meuId: () => self.idMeu(),
      estaRede: () => self.estaRede(),
      /** Humanos REMOTOS (eJogador ≠ eu) — prova de multi real. */
      remotosRede: () => self.corrida.corredores.filter((c) => c.eJogador && c.id !== self.idJogador).map((c) => ({ id: c.id, nome: c.nome })),
      /** Estado de um corredor por id (prova de movimento do REMOTO nas snapshots). */
      posCorredor: (id: number) => {
        const c = self.corrida.corredores.find((x) => x.id === id);
        if (!c) return null;
        return { id: c.id, x: Math.round(c.x * 10) / 10, z: Math.round(c.z * 10) / 10, posicao: c.posicao, vel: Math.round(c.vel * 10) / 10, terminou: c.terminou, eJogador: c.eJogador, item: c.item };
      },
      /** v69 GRÁFICOS: estado honesto do motor visual (o E2E prova qualidade/partículas/confetti). */
      graficos: () => ({
        qualidade: self.qualidade,
        bloom: self.composer !== null,
        sombras: self.renderer?.shadowMap.enabled ?? false,
        ceuDomo: self.ceuDomo !== null,
        particulasVivas: self.part?.vivas ?? 0,
        riscosVisiveis: (self.matRiscos?.opacity ?? 0) > 0.03,
        tremorAtivo: self.tremor > 0.02,
        confete: self.confeteFeito,
        caixasAbertas: self.caixasEu,
        paineisMarcas: self.paineisMarcas.length, // v71: publicidade das marcas NO circuito
        fov: Math.round(self.camara.fov * 10) / 10,
        tema: self.pista.def.tema,
      }),
      /** v69: provoca um TREMOR honesto de teste (o E2E prova o shake sem precisar de golpes). */
      tremorForcar: (v: number) => { self.tremor = Math.max(0, Math.min(1.2, v)); },
      /** v70: caixa «?» VIVA mais próxima (≤400 u) — steering determinístico de teste/assistência;
       *  o kart conduz de verdade até lá (o servidor continua a validar tudo). */
      alvoCaixa: () => {
        const j = self.corredorJogador();
        let melhor: { x: number; z: number; d: number } | null = null;
        for (const cx of self.corrida.caixas) {
          if (!cx.viva) continue;
          const d = Math.hypot(cx.x - j.x, cx.z - j.z);
          if (d < 400 && (!melhor || d < melhor.d)) melhor = { x: cx.x, z: cx.z, d: Math.round(d * 10) / 10 };
        }
        return melhor;
      },
      /** v68 BATALHA: estado completo da batalha (balões/golpes/eliminados/teto). */
      batalha: () => self.batalha ? {
        baloes: [...self.batalha.baloes],
        golpes: [...self.batalha.golpes],
        eliminados: [...self.batalha.eliminados],
        fim: self.batalha.fim,
        vencedor: self.batalha.vencedor,
        vivos: self.batalha.baloes.filter((x) => x > 0).length,
        tempoRestante: Math.max(0, Math.round(DURACAO_BATALHA_S - self.corrida.tempo)),
        meus: self.batalha.baloes[self.idJogador] ?? 0,
        arena: self.pista.def.id,
        corredores: self.corrida.corredores.length,
        fase: self.corrida.fase,
      } : null,
      /** Input externo (telemóvel/E2E). */
      entrada: (p: Partial<Omit<EntradaKart, "usarItem">>) => self.setEntrada(p),
      usarItem: () => self.pulsarItem(),
      pausar: (v: boolean) => self.pausar(v),
      /** Condução assistida ON/OFF (E2E/telemóvel) — o kart anda como um piloto razoável. */
      dirigirAuto: (v: boolean) => self.setAuto(v),
      /** Teletransporte HONESTO de teste: fração da DISTÂNCIA TOTAL da corrida (0..1). */
      tpProgresso: (frac: number) => {
        const j = self.corredorJogador();
        const f = Math.max(0, Math.min(0.999, frac));
        const alvoS = f * self.corrida.voltas * self.pista.comprimento;
        const m = self.pista.amostras.length;
        const i = ((Math.floor(alvoS / 2.5) % m) + m) % m;
        const a = self.pista.amostras[i];
        j.x = a.x; j.z = a.z; j.ang = Math.atan2(a.tx, a.tz); j.dirAng = j.ang;
        j.iAmostra = i; j.sTotal = alvoS; j.vel = 18;
        j.dsAnt = a.s;
        j.volta = Math.max(j.volta, Math.floor(alvoS / self.pista.comprimento));
      },
      /** Leva o kart do jogador para perto de uma caixa de item (teste de recolha) — sincroniza SEMPRE o índice da amostra. */
      tpCaixaMaisPerto: () => {
        const j = self.corredorJogador();
        let melhor: { x: number; z: number } | null = null, melhorD = Infinity;
        for (const cx of self.corrida.caixas) {
          if (!cx.viva) continue;
          const d = Math.hypot(cx.x - j.x, cx.z - j.z);
          if (d < melhorD) { melhorD = d; melhor = cx; }
        }
        if (melhor) {
          // varredura TOTAL (hook de teste, 1×): a janela ±40 do core não serve para saltos longos
          const m = self.pista.amostras.length;
          let iMelhor = 0, dMelhor = Infinity;
          for (let i = 0; i < m; i++) {
            const a = self.pista.amostras[i];
            const d = (a.x - melhor.x) * (a.x - melhor.x) + (a.z - melhor.z) * (a.z - melhor.z);
            if (d < dMelhor) { dMelhor = d; iMelhor = i; }
          }
          const a = self.pista.amostras[iMelhor];
          j.x = melhor.x; j.z = melhor.z + 1.5;
          j.ang = Math.atan2(a.tx, a.tz); j.dirAng = j.ang;
          j.iAmostra = iMelhor; j.sTotal = iMelhor * 2.5; j.dsAnt = iMelhor * 2.5;
          j.vel = 6;
        }
        return !!melhor;
      },
      estaPausado: () => self.pausadoRef,
    };
  }

  // ── destruição total e idempotente (lição v60) ─────────────────
  destruir(): void {
    if (this.destruido) return;
    this.destruido = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.redimensionar);
    window.removeEventListener("keydown", this.aoTeclaBaixo);
    window.removeEventListener("keyup", this.aoTeclaAlto);
    window.removeEventListener("blur", this.largarTudo);
    document.removeEventListener("visibilitychange", this.largarTudo);
    this.largarTudo();
    this.opts.som?.motor(0, false); // v67: silencia os loops ao morrer/limpar
    this.opts.som?.derrapagem(0);
    this.cena.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    for (const g of this.disposaveisGeometria) g.dispose();
    for (const m of this.disposaveisMaterial) m.dispose();
    for (const t of this.disposaveisTextura) t.dispose();
    this.meshesKart.clear();
    this.meshesProjetil.clear();
    this.meshesOleo.clear();
    this.meshesCaixa = [];
    this.meshesMoeda = [];
    this.meshesRampa = [];
    // v69: dispose do composer, partículas e riscos (idempotente)
    this.composer?.dispose();
    this.composer = null;
    this.passVinheta = null;
    this.part?.dispose();
    this.part = null;
    this.riscos = null;
    this.matRiscos = null;
    this.ceuDomo = null;
    this.uniformesCeu = null;
    this.nuvens.clear();
    this.paineisMarcas = []; // v71
    this.texAgua = null;
    this.matAgua = null;
    this.matLava = null;
    this.luzDir = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss?.();
      this.renderer = null;
    }
    this.disposaveisGeometria = [];
    this.disposaveisMaterial = [];
    this.disposaveisTextura = [];
  }

  estaDestruido(): boolean { return this.destruido; }
}

export type GanchosKart = ReturnType<MotorKart["ganchos"]>;
