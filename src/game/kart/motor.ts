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
import {
  EstadoCorrida, EntradaKart, EventoCorrida, ItemKartId, MelhoriaId, KartId, PistaDef,
  construirPista, novaCorrida, passoCorrida, posicoesDe, pistaPorId, statsDe,
  FaseCorrida, Pista, rng32,
} from "./core.ts";
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
}

export interface AvisosKart {
  golpeRecebido?: ItemKartId | "raio";
  itemNovo?: ItemKartId;
  voltaNova?: number;
  moeda?: boolean;
  derivaTurbo?: 1 | 2;
  rampa?: boolean;
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
}

const COR_FAISCA_1 = 0x66ccff; // tier azul
const COR_FAISCA_2 = 0xffb347; // tier laranja

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
  private rede = false;                 // v66: true = o SERVIDOR simula; este motor só interpola e renderiza
  private idJogador = 6;
  private alvosRede = new Map<number, { x: number; z: number; ang: number; da: number }>();
  private alvosProjetilRede = new Map<number, { x: number; z: number; ang: number }>();
  private alvosOleoRede = new Map<number, { x: number; z: number }>();
  private entrada: EntradaKart = { acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: false };
  private teclas = new Set<string>();
  private ultimoHud = 0;
  private derivaFase: 0 | 1 | 2 = 0;
  private ultRaio = 0;
  // ── v67 SOM ──
  private somBeep = 4;               // último beep da contagem (4 = ainda não tocou)
  private somFase: FaseCorrida | null = null; // fase anterior (transição contagem→corrida = «JÁ»)
  private somTerminei = false;       // fanfarra de chegada 1×
  private disposaveis: { dispose(): void }[] = [];
  private meshesKart = new Map<number, { grupo: THREE.Group; chama: THREE.Mesh; faiscas: THREE.Mesh; escudo: THREE.Mesh }>();
  private meshesProjetil = new Map<number, THREE.Mesh>();
  private meshesOleo = new Map<number, THREE.Mesh>();
  private meshesCaixa: THREE.Mesh[] = [];
  private meshesMoeda: THREE.Mesh[] = [];
  private meshesRampa: THREE.Mesh[] = [];
  private disposaveisGeometria: THREE.BufferGeometry[] = [];
  private disposaveisMaterial: THREE.Material[] = [];
  private disposaveisTextura: THREE.Texture[] = [];

  constructor(opts: OptsMotor) {
    this.opts = opts;
    const def = pistaPorId(opts.pistaId);
    if (!def) throw new Error(`pista desconhecida: ${opts.pistaId}`);
    this.pista = construirPista(def);
    this.idJogador = typeof opts.idJogador === "number" && opts.idJogador >= 0 ? opts.idJogador : 6;
    this.corrida = novaCorrida({
      pista: this.pista,
      voltas: opts.voltas,
      kartJogador: opts.kartJogador,
      melhoriasJogador: opts.melhorias,
      nomeJogador: opts.nomeJogador,
      recordeAnterior: opts.recordeAnterior,
    });
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

    this.cena.background = new THREE.Color(def.corCeu);
    this.cena.fog = new THREE.Fog(def.corNevoa, opts.leve ? 130 : 170, opts.leve ? 420 : 560);

    const renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: !opts.leve,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.leve ? 1.25 : 2));
    this.renderer = renderer;

    const luzHemi = new THREE.HemisphereLight(0xffffff, def.corChao, 1.05);
    const luzDir = new THREE.DirectionalLight(0xffffff, 0.85);
    luzDir.position.set(120, 220, 80);
    this.cena.add(luzHemi, luzDir);

    this.construirMundo(def, opts.leve);
    this.construirCorredores();

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

    // chão gigante
    const geoChao = new THREE.CircleGeometry(1400, 48);
    geoChao.rotateX(-Math.PI / 2);
    const matChao = new THREE.MeshLambertMaterial({ color: def.corChao });
    const chao = new THREE.Mesh(geoChao, matChao);
    chao.position.y = -0.06;
    this.cena.add(chao);
    this.registar(geoChao, matChao);

    // estrada (fita por amostras)
    const geoEstrada = this.fita(-def.largura, def.largura, 0.02);
    const matEstrada = new THREE.MeshLambertMaterial({ color: def.corEstrada, side: THREE.DoubleSide });
    this.cena.add(new THREE.Mesh(geoEstrada, matEstrada));
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
    const matCaixa = new THREE.MeshLambertMaterial({ color: 0xff9e2c, transparent: true, opacity: 0.82 });
    for (let i = 0; i < pista.caixas.length; i++) {
      const cx = pista.caixas[i];
      const mesh = new THREE.Mesh(geoCaixa, matCaixa);
      mesh.position.set(cx.x, 1.1, cx.z);
      mesh.userData.idx = i;
      this.cena.add(mesh);
      this.meshesCaixa.push(mesh);
    }
    this.registar(geoCaixa, matCaixa);

    // moedas
    const geoMoeda = new THREE.CylinderGeometry(0.85, 0.85, 0.16, 14);
    geoMoeda.rotateX(Math.PI / 2);
    const matMoeda = new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x7a5a00 });
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
    const matLava = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
    this.registar(geoTronco, matTronco);
    this.registar(geoPalma, matPalma);
    this.registar(geoCacto, matCacto);
    this.registar(geoRocha, matRocha);
    this.registar(geoLava, matLava);
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
          const lava = new THREE.Mesh(geoLava, matLava);
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
  }

  /** Fita entre duas latitudes laterais (estrada) — geometria por amostras. */
  private fita(latA: number, latB: number, y: number): THREE.BufferGeometry {
    const pista = this.pista;
    const m = pista.amostras.length;
    const pos = new Float32Array((m + 1) * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i <= m; i++) {
      const a = pista.amostras[i % m];
      pos[i * 6] = a.x + a.nx * latA; pos[i * 6 + 1] = y; pos[i * 6 + 2] = a.z + a.nz * latA;
      pos[i * 6 + 3] = a.x + a.nx * latB; pos[i * 6 + 4] = y; pos[i * 6 + 5] = a.z + a.nz * latB;
    }
    for (let i = 0; i < m; i++) {
      const p0 = i * 2, p1 = i * 2 + 1, p2 = ((i + 1) % (m + 1)) * 2, p3 = ((i + 1) % (m + 1)) * 2 + 1;
      idx.push(p0, p1, p2, p1, p3, p2); // winding para CIMA (visto de cima — lição da captura!)
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
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
    const matRoda = new THREE.MeshLambertMaterial({ color: 0x23262b });
    const matPiloto = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    const matCabine = new THREE.MeshLambertMaterial({ color: 0x2c3440 });
    const matAlerao = new THREE.MeshLambertMaterial({ color: 0x1f242c });
    const matChama = new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.9 });
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
      const matCorpo = new THREE.MeshLambertMaterial({ color: c.cor });
      this.registar(null, matCorpo);
      const grupo = new THREE.Group();
      const corpo = new THREE.Mesh(geoCorpo, matCorpo);
      corpo.position.y = 0.55;
      const cabine = new THREE.Mesh(geoCabine, matCabine);
      cabine.position.set(0, 1.0, -0.25);
      const piloto = new THREE.Mesh(geoPiloto, matPiloto);
      piloto.position.set(0, 1.35, -0.25);
      const alerao = new THREE.Mesh(geoAlerao, matAlerao);
      alerao.position.set(0, 1.0, -1.35);
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
      this.cena.add(grupo);
      this.meshesKart.set(c.id, { grupo, chama, faiscas, escudo });
    }
  }

  private registar(geo: THREE.BufferGeometry | null, mat: THREE.Material | THREE.Light): void {
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
  };
  private sincronizarTeclas(): void {
    this.entrada.acelerar = this.teclas.has("ArrowUp") || this.teclas.has("KeyW");
    this.entrada.travar = this.teclas.has("ArrowDown") || this.teclas.has("KeyS");
    const esq = this.teclas.has("ArrowLeft") || this.teclas.has("KeyA");
    const dir = this.teclas.has("ArrowRight") || this.teclas.has("KeyD");
    this.entrada.virar = (dir ? 1 : 0) + (esq ? -1 : 0);
    this.entrada.derrapar = this.teclas.has("ShiftLeft") || this.teclas.has("ShiftRight") || this.teclas.has("Space");
  }

  /** Entrada externa (botões móveis / E2E). `usarItem` é uma PULSAÇÃO. */
  setEntrada(parcial: Partial<Omit<EntradaKart, "usarItem">>): void {
    if (this.destruido) return;
    Object.assign(this.entrada, parcial);
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
        passoCorrida(this.corrida, this.entrada, dt);
        this.entrada.usarItem = false; // pulsação consumida
        this.drenarEventos();
        if (this.corrida.fase !== antes || this.corredorJogador().item !== itemAntes) this.empurrarHud();
      }
    }
    this.atualizarSom();
    this.sincronizarVisual(agora);
    this.seguirCamara(dt);
    if (this.renderer) this.renderer.render(this.cena, this.camara);
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
      if (e.t === "golpe" && e.alvo === this.idJogador) { avisos.golpeRecebido = e.tipo; }
      else if (e.t === "raio") { avisos.golpeRecebido = "raio"; this.ultRaio = performance.now(); }
      else if (e.t === "item" && e.id === this.idJogador) { avisos.itemNovo = e.item; }
      else if (e.t === "volta" && e.id === this.idJogador) { avisos.voltaNova = e.volta; }
      else if (e.t === "moeda" && e.id === this.idJogador) { avisos.moeda = true; }
      else if (e.t === "deriva" && e.id === this.idJogador) {
        avisos.derivaTurbo = e.fase;
        this.derivaFase = 0;
      } else if (e.t === "rampa" && e.id === this.idJogador) { avisos.rampa = true; }
    }
    this.corrida.eventos.length = 0;
    if (algum && Object.keys(avisos).length) this.opts.aoAviso(avisos);
  }

  private empurrarHud(): void {
    this.ultimoHud = performance.now();
    const j = this.corredorJogador();
    this.opts.aoHud({
      fase: this.corrida.fase,
      contagem: Math.min(3, Math.max(0, Math.ceil(this.corrida.tempoContagem))),
      volta: Math.min(this.corrida.voltas, Math.max(1, j.volta || 1)),
      voltas: this.corrida.voltas,
      posicao: j.posicao,
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
