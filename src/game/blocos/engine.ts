// ============================================================
// BATEUCRAFT — Motor principal
// Física · raycast DDA · quebrar/colocar · sobrevivência ·
// dia/noite · chunks dinâmicos · save · ganchos __blocos (E2E)
// v28: 5 tipos de câmara · zoom · balanço · tremor · agachar ·
// cama (dormir + spawn) · escada · minimapa · seletor criativo
// v29: AGRICULTURA (enxada · terra arada · trigo · pão) · TNT
// (fusível + explosão) · BAÚ (18 posições) · ARMADURA
// (peitorais com absorção) · VACA E GALINHA · METEOROLOGIA
// (chuva · tempestade · trovoada · relâmpagos · crescimento)
// v32: PESCA (vara · boia · picada · 3 peixes reais · fundição) ·
// ARANHA (hostil à noite, neutra de dia, dropa fio)
// ============================================================

import * as THREE from "three";
import { Mundo } from "./world";
import { GestorMobs, Mob, TipoMob, ehPassivo } from "./mobs";
import { Inventario, avaliarReceitas, criarReceita, pertoDe, Slot } from "./inventario";
import { Receita } from "./constants";
import { criarMinifig, criarItemMao, AvatarLego } from "./lego";
import { Aleatorio } from "./noise";
import {
  B, BLOCOS, CHUNK, ALTURA, GRAVIDADE, SALTO, VEL_ANDAR, VEL_CORRER,
  VIDA_MAX, FOME_MAX, AR_MAX, DIA_SEGUNDOS, ALCANCE, RAIO_EXPLOSAO,
  RAIO_TNT, FUSIVEL_TNT, TEMPO_CRESCER, CRESCER_CHUVA, BAU_SLOTS,
  PRECISA_DE_APOIO, PESCA_ALCANCE, PESCA_ESPERA_MIN, PESCA_ESPERA_MAX, PESCA_JANELA,
  dropDe, CORES, ITENS, CONQUISTAS, I, NOMES,
} from "./constants";

export type Modo = "sobrevivencia" | "criativo";
export type Fase = "menu" | "jogando" | "morto" | "pausa";
export type CamaraModo = "primeira" | "terceira" | "ombro" | "topo" | "cinema";
export type Meteo = "limpo" | "chuva" | "tempestade";
export const CAMARA_NOMES: Record<CamaraModo, string> = {
  primeira: "1ª PESSOA", terceira: "3ª PESSOA", ombro: "OMBRO", topo: "TOP-DOWN", cinema: "CINEMA",
};
export const METEO_NOMES: Record<Meteo, string> = { limpo: "LIMPO", chuva: "CHUVA", tempestade: "TEMPESTADE" };
const ORDEM_CAMARAS: CamaraModo[] = ["primeira", "terceira", "ombro", "topo", "cinema"];

export interface Entrada {
  frente: number; lado: number;      // joystick / teclas (-1..1)
  olharX: number; olharY: number;    // delta acumulado (radianos)
  salto: boolean; correr: boolean; subir: boolean; descer: boolean;
  minerando: boolean; agachado: boolean; zoom: boolean;
}

export interface Captura {
  fase: Fase; modo: Modo;
  vida: number; fome: number; ar: number;
  dia: number; horaFrac: number; noite: boolean;
  pos: [number, number, number]; yaw: number;
  fps: number; chunks: number; mobs: number;
  slots: ({ id: number; qtd: number } | null)[];
  selecao: number;
  mesaPerto: boolean; fornalhaPerto: boolean;
  mirando: { id: number; nome: string; x: number; y: number; z: number } | null;
  progressoQuebra: number;
  causaMorte: string;
  creditos: number; conquistas: string[];
  avisos: { texto: string; tipo: "conquista" | "info" | "dano" }[];
  ctaWhats: boolean;
  primeiraPessoa: boolean;
  camara: CamaraModo;
  agachado: boolean; zoom: boolean; naEscada: boolean;
  mobsDerrotados: number;
  spawnDefinido: boolean;
  naAgua: boolean; voando: boolean;
  blocosQuebrados: number; blocosColocados: number;
  passos: number;
  // v29
  meteo: Meteo;
  armadura: { id: number; nome: string; reducao: number } | null;
  bauAberto: { chave: string; slots: (Slot | null)[] } | null;
  tntAtivos: number;
  plantacoes: number;
  // v32
  pesca: { estado: "lancada" | "picada"; t: number } | null;
  peixesPescados: number;
}

interface Aviso { texto: string; tipo: "conquista" | "info" | "dano"; t: number }

interface TntAcesa { x: number; y: number; z: number; t: number; malha: THREE.Mesh }

export class Motor {
  fase: Fase = "menu";
  modo: Modo = "sobrevivencia";
  mundo!: Mundo; gestor!: GestorMobs;
  inv = new Inventario();
  rnd = new Aleatorio(12345);

  // som / desempenho (preferências locais)
  mudo = false; raioRender = 3;
  // qualidade automática (v29): se o aparelho não aguenta, baixamos
  // resolução primeiro, depois raio — sempre com aviso honesto ao jogador
  qualidadeAuto = true;
  private fpsBaixoT = 0; private passosQualidade = 0;

  // câmara: 5 modos + zoom + balanço + tremor (v28)
  camaraModo: CamaraModo = "primeira";
  private alturaOlhoAtual = 1.62;
  private fovAtual = 75;
  tremerT = 0;
  get primeiraPessoa() { return this.camaraModo === "primeira"; }

  // luzes reais das tochas colocadas
  luzesTocha: THREE.PointLight[] = [];
  private tochaTimer = 0;

  // céu: sol, lua, estrelas, nuvens
  private solDisco!: THREE.Sprite; private luaDisco!: THREE.Sprite;
  private estrelas!: THREE.Points; private nuvens!: THREE.Group;

  // partículas de quebra/explosão
  private poolParticulas: { m: THREE.Mesh; vx: number; vy: number; vz: number; t: number; tMax: number }[] = [];

  // mão em 1ª pessoa
  private maoFP = new THREE.Group(); private maoFPId = 0; swingT = 0;
  private avisoNoiteDia = 0;

  // cena
  renderer!: THREE.WebGLRenderer; cena = new THREE.Scene();
  camara = new THREE.PerspectiveCamera(75, 1, 0.1, 400);
  sol!: THREE.DirectionalLight; ambiente!: THREE.HemisphereLight;
  realce!: THREE.LineSegments; avatar!: AvatarLego;
  luzTocha!: THREE.PointLight;

  // jogador
  px = 0; py = 40; pz = 0; vx = 0; vy = 0; vz = 0;
  yaw = 0; pitch = 0; noChao = false; naAgua = false; cabecaAgua = false; naEscada = false;
  vida = VIDA_MAX; fome = FOME_MAX; ar = AR_MAX;
  tempo = DIA_SEGUNDOS * 0.25; // começa de manhã
  dia = 1; primeiraNoiteFeita = false;
  causaMorte = "";
  spawnProprio: [number, number, number] | null = null;
  mobsDerrotados = 0;

  // interação
  mira: { x: number; y: number; z: number; id: number } | null = null;
  ultimaFace: [number, number, number] = [0, 1, 0];
  progressoQuebra = 0; quebraAlvo: string | null = null;
  danoQuedaVy = 0; blocoSob = -1;
  pausado = false;

  // progressão
  creditos = 0; conquistas: string[] = [];
  avisos: Aviso[] = [];
  ctaWhats = false;
  blocosQuebrados = 0; blocosColocados = 0;

  // ── v29: agricultura · TNT · baús · meteorologia ──
  plantas = new Map<string, number>();   // "x,y,z" → segundos restantes até amadurecer
  tntAcesas: TntAcesa[] = [];
  baus = new Map<string, (Slot | null)[]>(); // "x,y,z" → 18 posições
  bauAberto: string | null = null;
  meteo: Meteo = "limpo";
  meteoT = 90; // segundos até mudar de tempo
  relampagoT = 0; // flash branco em curso (tempestade)
  chuvaNivel = 0; // 0..1 suavizado (partículas + som + céu)
  private chuvaPool: THREE.Mesh[] = [];
  private chuvaGain: GainNode | null = null;
  private plantaTick = 0;

  // ── v32: pesca ──
  pescaEstado: "parado" | "lancada" | "picada" = "parado";
  pescaTimer = 0; // espera até picada OU janela da picada (conforme o estado)
  private pescaBobber: THREE.Mesh | null = null;
  private pescaLinha: THREE.Line | null = null;
  private pescaAlvo: [number, number, number] = [0, 0, 0]; // posição da boia
  peixesPescados = 0;

  // internals
  entrada: Entrada = { frente: 0, lado: 0, olharX: 0, olharY: 0, salto: false, correr: false, subir: false, descer: false, minerando: false, agachado: false, zoom: false };
  dormirPedido = false;
  private relogioUltimo = 0; private acumFPS = 0; private nFPS = 0; fps = 60;
  private ultimoEstado = 0; private ultimoSave = 0; private animacaoAndar = 0;
  onEstado: ((c: Captura) => void) | null = null;
  morteRecente = 0;
  atacarPedido = false; colocarPedido = false; comerPedido = false;
  criativoVoar = false;
  // v33 (Cidade Bateu): ganchos opcionais — por omissão o motor comporta-se
  // exactamente como antes (mundo procedural + spawn natural).
  fabricaMundo: ((semente: number) => Mundo) | null = null;
  spawnFixo: [number, number, number] | null = null;

  constructor() {
    try { this.mudo = localStorage.getItem("bateu_blocos_som") === "1"; } catch { /* ignore */ }
    try {
      const r = Number(localStorage.getItem("bateu_blocos_dist"));
      if (r >= 2 && r <= 4) this.raioRender = Math.floor(r);
    } catch { /* ignore */ }
    try {
      const c = localStorage.getItem("bateu_blocos_camara") as CamaraModo | null;
      if (c && ORDEM_CAMARAS.includes(c)) this.camaraModo = c;
    } catch { /* ignore */ }
  }

  // ── Câmara (5 modos, cicla com F5 / botão) ───────────────────
  ciclarCamara(): CamaraModo {
    const i = ORDEM_CAMARAS.indexOf(this.camaraModo);
    this.camaraModo = ORDEM_CAMARAS[(i + 1) % ORDEM_CAMARAS.length];
    try { localStorage.setItem("bateu_blocos_camara", this.camaraModo); } catch { /* ignore */ }
    this.avisos.push({ texto: `Câmara: ${CAMARA_NOMES[this.camaraModo]}`, tipo: "info", t: 1.6 });
    return this.camaraModo;
  }
  definirCamara(m: CamaraModo) {
    if (!ORDEM_CAMARAS.includes(m)) return;
    this.camaraModo = m;
    try { localStorage.setItem("bateu_blocos_camara", m); } catch { /* ignore */ }
  }

  // ── Arranque ─────────────────────────────────────────────────
  iniciar(canvas: HTMLCanvasElement, modo: Modo, carregar = false) {
    this.modo = modo;
    const guardado = carregar ? this.lerSave() : null;
    const semente = guardado?.semente ?? (Date.now() % 1000000);
    const mundoAnterior = this.mundo; // para limpar da cena depois
    this.mundo = this.fabricaMundo ? this.fabricaMundo(semente) : new Mundo(semente);
    this.gestor = new GestorMobs(this.mundo, semente);
    this.rnd = new Aleatorio(semente + 777);

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.cena.fog = new THREE.Fog(0x87ceeb, 24, 76); // v29: horizonte mais suave (árvores/erva distantes diluem antes)
      this.sol = new THREE.DirectionalLight(0xffffff, 1.4);
      this.ambiente = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.85);
      this.cena.add(this.sol, this.ambiente);
      this.luzTocha = new THREE.PointLight(0xffb050, 0, 9, 1.6);
      this.cena.add(this.luzTocha);
      // luzes das tochas COLOCADAS no mundo (as 6 mais próximas)
      for (let i = 0; i < 6; i++) {
        const l = new THREE.PointLight(0xffa843, 0, 10, 1.5);
        this.luzesTocha.push(l); this.cena.add(l);
      }
      // caixa de realce do bloco visado
      const caixa = new THREE.BoxGeometry(1.002, 1.002, 1.002);
      this.realce = new THREE.LineSegments(caixa, new THREE.LineBasicMaterial({ color: 0x101010, transparent: true, opacity: 0.7 }));
      this.realce.visible = false;
      this.cena.add(this.realce);
      this.mundo.grupo.name = "mundo";
      this.cena.add(this.mundo.grupo);
      // ── CÉU: sol, lua, estrelas, nuvens (quadradinhos LEGO) ──
      this.solDisco = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffe58a, fog: false, transparent: true, depthWrite: false }));
      this.solDisco.scale.setScalar(24);
      this.luaDisco = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd8e4f0, fog: false, transparent: true, depthWrite: false }));
      this.luaDisco.scale.setScalar(15);
      this.cena.add(this.solDisco, this.luaDisco);
      const posEstrelas: number[] = [];
      for (let i = 0; i < 320; i++) {
        const a = this.rnd.proximo() * Math.PI * 2, e = Math.asin(this.rnd.proximo() * 0.92);
        posEstrelas.push(Math.cos(a) * Math.cos(e) * 190, Math.sin(e) * 190, Math.sin(a) * Math.cos(e) * 190);
      }
      const geoEstrelas = new THREE.BufferGeometry();
      geoEstrelas.setAttribute("position", new THREE.Float32BufferAttribute(posEstrelas, 3));
      this.estrelas = new THREE.Points(geoEstrelas, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      this.cena.add(this.estrelas);
      this.nuvens = new THREE.Group();
      const matNuvem = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, fog: false });
      // v29: nuvens em "conjuntos" de blocos mais finos — menos placa, mais fofas
      for (let i = 0; i < 9; i++) {
        const conjunto = new THREE.Group();
        const puffs = 2 + Math.floor(this.rnd.proximo() * 3);
        for (let p = 0; p < puffs; p++) {
          const nuvem = new THREE.Mesh(
            new THREE.BoxGeometry(5 + this.rnd.proximo() * 9, 0.9, 4 + this.rnd.proximo() * 7), matNuvem,
          );
          nuvem.position.set((this.rnd.proximo() - 0.5) * 11, (this.rnd.proximo() - 0.5) * 1.2, (this.rnd.proximo() - 0.5) * 8);
          conjunto.add(nuvem);
        }
        conjunto.position.set((this.rnd.proximo() - 0.5) * 180, 64 + this.rnd.proximo() * 9, (this.rnd.proximo() - 0.5) * 180);
        this.nuvens.add(conjunto);
      }
      this.cena.add(this.nuvens);
      // pool de partículas (cubinhos LEGO que voam ao quebrar)
      const geoP = new THREE.BoxGeometry(0.095, 0.095, 0.095);
      for (let i = 0; i < 90; i++) {
        const m = new THREE.Mesh(geoP, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
        m.visible = false; this.cena.add(m);
        this.poolParticulas.push({ m, vx: 0, vy: 0, vz: 0, t: 0, tMax: 1 });
      }
      // pool de gotas de chuva (v29): agulhas finas que caem à volta do jogador
      const geoChuva = new THREE.BoxGeometry(0.03, 0.5, 0.03);
      const matChuva = new THREE.MeshBasicMaterial({ color: 0xa8c8e8, transparent: true, opacity: 0.55, fog: false });
      for (let i = 0; i < 260; i++) {
        const g = new THREE.Mesh(geoChuva, matChuva);
        g.visible = false; this.cena.add(g);
        this.chuvaPool.push(g);
      }
      // mão em 1ª pessoa vive presa à câmara
      this.cena.add(this.camara);
      this.camara.add(this.maoFP);
    }

    if (guardado) {
      this.inv.slots = guardado.inv;
      this.inv.selecao = guardado.selecao ?? 0;
      this.creditos = guardado.creditos ?? 0;
      this.conquistas = guardado.conquistas ?? [];
      this.dia = guardado.dia ?? 1;
      this.tempo = guardado.tempo ?? this.tempo;
      this.primeiraNoiteFeita = guardado.primeiraNoiteFeita ?? false;
      this.blocosQuebrados = guardado.blocosQuebrados ?? 0;
      this.blocosColocados = guardado.blocosColocados ?? 0;
      this.spawnProprio = guardado.spawn ?? null;
      this.mobsDerrotados = guardado.mobsDerrotados ?? 0;
      // v29: armadura, baús, plantações e meteorologia do save
      this.inv.armadura = guardado.armadura ?? null;
      for (const [k, slots] of Object.entries(guardado.baus ?? {})) {
        const arr = slots as (Slot | null)[];
        if (Array.isArray(arr)) this.baus.set(k, arr.slice(0, BAU_SLOTS));
      }
      for (const [k, seg] of Object.entries(guardado.plantas ?? {})) {
        const n = Number(seg);
        if (Number.isFinite(n) && n > 0) this.plantas.set(k, n);
      }
      if (guardado.meteo === "chuva" || guardado.meteo === "tempestade" || guardado.meteo === "limpo") {
        this.meteo = guardado.meteo;
      }
      this.meteoT = guardado.meteoT ?? 90;
      for (const [k, v] of Object.entries(guardado.edits ?? {})) this.mundo.edits.set(k, v as number);
      // reconstruir tochas conhecidas a partir das edições do save
      for (const [k, v] of this.mundo.edits) if (v === B.TOCHA) this.mundo.tochas.add(k);
      [this.px, this.py, this.pz] = guardado.pos;
      this.yaw = guardado.yaw ?? 0; this.pitch = guardado.pitch ?? 0;
    } else {
      const [sx, sy, sz] = this.spawnFixo ?? this.mundo.spawnPos();
      this.px = sx; this.py = sy; this.pz = sz;
      this.vida = VIDA_MAX; this.fome = FOME_MAX; this.ar = AR_MAX;
      this.inv.limpar();
      if (modo === "criativo") {
        // kit criativo: blocos básicos infinitos tratados no colocar
        this.inv.adicionar(B.TABUAS, 64); this.inv.adicionar(B.PEDRA, 64);
        this.inv.adicionar(B.VIDRO, 64); this.inv.adicionar(B.TOCHA, 64);
      } else {
        this.inv.adicionar(I.MACA, 2); // arranque gentil
        // dica inicial honesta (v29): o primeiro objetivo do género é madeira
        this.avisos.push({ texto: "Soque um tronco para apanhar madeira!", tipo: "info", t: 9 });
        this.avisos.push({ texto: "Constrói um abrigo antes do anoitecer…", tipo: "info", t: 12 });
      }
    }

    // avatar LEGO do jogador
    if (this.avatar) this.cena.remove(this.avatar.grupo);
    if (mundoAnterior) this.cena.remove(mundoAnterior.grupo); // mundo anterior (novo jogo)
    const prefs = this.lerPreferencias();
    this.avatar = criarMinifig({ torso: prefs.torso, pernas: prefs.pernas, chapeu: prefs.chapeu, corChapeu: prefs.corChapeu });
    this.avatar.grupo.visible = false;
    this.cena.add(this.avatar.grupo);
    this.pausado = false; this.maoFPId = 0; this.swingT = 0;
    // limpar TNT acesas e estado transitório de um jogo anterior (v29)
    for (const t of this.tntAcesas) { this.cena.remove(t.malha); t.malha.geometry.dispose(); }
    this.tntAcesas = [];
    this.bauAberto = null;
    this.relampagoT = 0;
    if (guardado?.semente === undefined) { // mundo novo: começa limpo
      this.plantas.clear(); this.baus.clear();
      this.meteo = "limpo"; this.meteoT = 90 + this.rnd.inteiro(0, 60);
      this.inv.armadura = null;
    }

    // gerar chunks iniciais
    const cx = Math.floor(this.px / CHUNK), cz = Math.floor(this.pz / CHUNK);
    for (let dx = -this.raioRender; dx <= this.raioRender; dx++)
      for (let dz = -this.raioRender; dz <= this.raioRender; dz++) {
        const c = this.mundo.garantir(cx + dx, cz + dz);
        this.mundo.construirMalha(c);
      }
    // garantir chão sólido no spawn
    while (this.mundo.solido(this.px, this.py, this.pz) || this.mundo.solido(this.px, this.py + 0.5, this.pz)) this.py += 1;

    this.fase = "jogando";
    this.emitirEstado(true);
  }

  // ── Qualidade automática (v29) — honesta: avisa sempre o que fez ──
  private ajustarQualidade(dt: number) {
    if (!this.qualidadeAuto || this.fase !== "jogando" || !this.renderer) return;
    if (this.fps > 0 && this.fps < 24) this.fpsBaixoT += dt;
    else this.fpsBaixoT = Math.max(0, this.fpsBaixoT - dt * 2);
    if (this.fpsBaixoT > 4 && this.passosQualidade < 4) {
      this.fpsBaixoT = 0;
      const pr = this.renderer.getPixelRatio();
      if (pr > 1.05) {
        this.renderer.setPixelRatio(Math.max(1, pr - 0.5));
        this.redimensionar();
        this.avisos.push({ texto: "Desempenho baixo — resolução reduzida", tipo: "info", t: 3 });
      } else if (this.raioRender > 2) {
        this.raioRender -= 1;
        this.avisos.push({ texto: `Desempenho baixo — raio de render: ${this.raioRender}`, tipo: "info", t: 3 });
      } else return;
      this.passosQualidade++;
    }
  }

  // ── Preferências do avatar (personalização LEGO) ─────────────
  lerPreferencias(): { torso: string; pernas: string; chapeu: "nenhum" | "cabelo" | "bone" | "capacete"; corChapeu: string } {
    try {
      const raw = localStorage.getItem("bateu_blocos_avatar");
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { torso: "#2a6adb", pernas: "#c23a3a", chapeu: "cabelo", corChapeu: "#4a2f1a" };
  }
  definirPreferencias(p: Partial<{ torso: string; pernas: string; chapeu: "nenhum" | "cabelo" | "bone" | "capacete"; corChapeu: string }>) {
    const atual = { ...this.lerPreferencias(), ...p };
    localStorage.setItem("bateu_blocos_avatar", JSON.stringify(atual));
    if (this.avatar) {
      this.cena.remove(this.avatar.grupo);
      this.avatar = criarMinifig({ torso: atual.torso, pernas: atual.pernas, chapeu: atual.chapeu, corChapeu: atual.corChapeu });
      this.avatar.grupo.visible = !this.primeiraPessoa && this.fase !== "menu";
      this.cena.add(this.avatar.grupo);
    }
  }

  // ── Ciclo dia/noite ──────────────────────────────────────────
  get horaFrac() { return (this.tempo % DIA_SEGUNDOS) / DIA_SEGUNDOS; }
  get noite() { const f = this.horaFrac; return f >= 0.5 && f < 0.95; }

  private atualizarCeu(dt = 0) {
    const f = this.horaFrac;
    // paleta: manhã, dia, pôr-do-sol, noite
    const cores: [number, number[]][] = [
      [0.0, [0x87ceeb]], [0.42, [0x87ceeb]], [0.5, [0xf08a4a]],
      [0.55, [0x0a0a24]], [0.9, [0x0a0a24]], [0.97, [0xf0a060]], [1.0, [0x87ceeb]],
    ];
    let cor = cores[0][1][0];
    for (let i = 0; i < cores.length - 1; i++) {
      if (f >= cores[i][0] && f <= cores[i + 1][0]) {
        const t = (f - cores[i][0]) / (cores[i + 1][0] - cores[i][0] || 1);
        const a = new THREE.Color(cores[i][1][0]), b2 = new THREE.Color(cores[i + 1][1][0]);
        cor = a.lerp(b2, t).getHex();
        break;
      }
    }
    // ── v29 METEOROLOGIA: céu escurece com chuva, clareia nos relâmpagos ──
    const escuro = 1 - this.chuvaNivel * 0.55;
    let final = new THREE.Color(cor).multiplyScalar(escuro);
    if (this.relampagoT > 0) final = final.lerp(new THREE.Color(0xf0f4ff), Math.min(1, this.relampagoT * 7));
    this.cena.background = final;
    (this.cena.fog as THREE.Fog).color = final;
    const luzDia = (this.noite ? 0.16 : f > 0.45 && f < 0.55 ? 0.7 : 1.35) * (1 - this.chuvaNivel * 0.42)
      + (this.relampagoT > 0 ? 1.2 : 0);
    this.sol.intensity = luzDia;
    this.ambiente.intensity = (this.noite ? 0.3 : 0.85) * (1 - this.chuvaNivel * 0.3) + (this.relampagoT > 0 ? 0.7 : 0);
    const ang = f * Math.PI * 2 - Math.PI / 2;
    this.sol.position.set(Math.cos(ang) * 60, Math.abs(Math.sin(ang)) * 80 + 10, 30);
    // tocha na mão ilumina
    const s = this.inv.selecionado();
    const comTocha = s && s.id === B.TOCHA;
    this.luzTocha.intensity = comTocha ? 1.4 : 0;
    this.luzTocha.position.set(this.px, this.py + 1.4, this.pz);

    // ── sol / lua (arco celeste real: nasce ao amanhecer f=0, pico ao meio-dia f=0.25, põe-se ao pôr-do-sol f=0.5) ──
    const theta = f * Math.PI * 2;
    const seno = Math.sin(theta), coseno = Math.cos(theta);
    this.solDisco.position.set(this.px + coseno * 175, seno * 175 + 4, this.pz + 55);
    this.luaDisco.position.set(this.px - coseno * 175, -seno * 175 + 4, this.pz - 55);
    (this.solDisco.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, (seno + 0.12) * 6));
    (this.luaDisco.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, (-seno + 0.12) * 6));
    // ── estrelas (aparecem ao anoitecer) ──
    const alvo = f > 0.5 && f < 0.95 ? Math.min(1, Math.min(f - 0.5, 0.95 - f) * 8) : 0;
    const matEst = this.estrelas.material as THREE.PointsMaterial;
    matEst.opacity += (alvo * 0.9 - matEst.opacity) * Math.min(1, dt * 3);
    this.estrelas.position.set(this.px, 0, this.pz);
    this.estrelas.rotation.y += dt * 0.004;
    // ── nuvens: deriva lenta + embrulho à volta do jogador ──
    for (const nuvem of this.nuvens.children) {
      nuvem.position.x += dt * 1.1;
      const dx2 = nuvem.position.x - this.px, dz2 = nuvem.position.z - this.pz;
      if (dx2 > 110) nuvem.position.x -= 220;
      if (dx2 < -110) nuvem.position.x += 220;
      if (dz2 > 110) nuvem.position.z -= 220;
      if (dz2 < -110) nuvem.position.z += 220;
    }
  }

  // ── Luzes das tochas colocadas (as 6 mais próximas) ───────
  private atualizarLuzesTochas() {
    const cand: { d: number; x: number; y: number; z: number }[] = [];
    for (const k of this.mundo.tochas) {
      const [tx, ty, tz] = k.split(",").map(Number);
      const d = (tx - this.px) ** 2 + (ty - this.py) ** 2 + (tz - this.pz) ** 2;
      if (d < 1600) cand.push({ d, x: tx, y: ty, z: tz });
    }
    cand.sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.luzesTocha.length; i++) {
      const l = this.luzesTocha[i];
      const t = cand[i];
      if (t) {
        l.position.set(t.x + 0.5, t.y + 0.55, t.z + 0.5);
        l.intensity = 1.25;
      } else l.intensity = 0;
    }
  }

  // ── Partículas LEGO (quebra / explosão) ────────────────
  private spawnParticulas(x: number, y: number, z: number, cor: string, qtd: number, forca = 1) {
    let postos = 0;
    for (const p of this.poolParticulas) {
      if (p.t > 0) continue;
      p.t = 0.35 + this.rnd.proximo() * 0.3; p.tMax = p.t;
      (p.m.material as THREE.MeshBasicMaterial).color.set(cor);
      p.m.position.set(x + (this.rnd.proximo() - 0.5) * 0.7, y + (this.rnd.proximo() - 0.5) * 0.7, z + (this.rnd.proximo() - 0.5) * 0.7);
      p.vx = (this.rnd.proximo() - 0.5) * 3.4 * forca;
      p.vy = (1.4 + this.rnd.proximo() * 2.6) * forca;
      p.vz = (this.rnd.proximo() - 0.5) * 3.4 * forca;
      p.m.visible = true;
      if (++postos >= qtd) break;
    }
  }
  private atualizarParticulas(dt: number) {
    for (const p of this.poolParticulas) {
      if (p.t <= 0) continue;
      p.t -= dt;
      if (p.t <= 0) { p.m.visible = false; continue; }
      p.vy -= 13 * dt;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      p.m.scale.setScalar(Math.max(0.15, p.t / p.tMax));
    }
  }
  particulasAtivas(): number { return this.poolParticulas.filter((p) => p.t > 0).length; }

  // ── Raycast DDA voxel ────────────────────────────────────────
  get alturaOlho() { return this.entrada.agachado ? 1.32 : 1.62; }
  private raycast(): { x: number; y: number; z: number; id: number } | null {
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch),
    ).normalize();
    const olhoY = this.py + this.alturaOlho;
    let x = Math.floor(this.px), y = Math.floor(olhoY), z = Math.floor(this.pz);
    const passo = new THREE.Vector3(Math.abs(dir.x) < 1e-9 ? 1e9 : Math.abs(1 / dir.x),
      Math.abs(dir.y) < 1e-9 ? 1e9 : Math.abs(1 / dir.y),
      Math.abs(dir.z) < 1e-9 ? 1e9 : Math.abs(1 / dir.z));
    const sinal = [dir.x < 0 ? -1 : 1, dir.y < 0 ? -1 : 1, dir.z < 0 ? -1 : 1];
    let tMaxX = (sinal[0] > 0 ? (x + 1 - this.px) : (this.px - x)) * passo.x;
    let tMaxY = (sinal[1] > 0 ? (y + 1 - olhoY) : (olhoY - y)) * passo.y;
    let tMaxZ = (sinal[2] > 0 ? (z + 1 - this.pz) : (this.pz - z)) * passo.z;
    let face: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < 60; i++) {
      const id = this.mundo.getBloco(x, y, z);
      if (id !== B.AR && id !== B.AGUA) { this.ultimaFace = face; return { x, y, z, id }; }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { if (tMaxX > ALCANCE) break; x += sinal[0]; tMaxX += passo.x; face = [-sinal[0], 0, 0]; }
      else if (tMaxY < tMaxZ) { if (tMaxY > ALCANCE) break; y += sinal[1]; tMaxY += passo.y; face = [0, -sinal[1], 0]; }
      else { if (tMaxZ > ALCANCE) break; z += sinal[2]; tMaxZ += passo.z; face = [0, 0, -sinal[2]]; }
    }
    return null;
  }

  private multiplicadorFerramenta(idBloco: number): { vel: number; dropa: boolean } {
    const def = BLOCOS[idBloco];
    if (!def) return { vel: 1, dropa: true };
    const s = this.inv.selecionado();
    const item = s ? ITENS[s.id] : undefined;
    if (!item || !item.ferramenta) return { vel: 1, dropa: def.tier === 0 };
    if (item.ferramenta === def.ferramenta) {
      const mults = [1, 2, 4, 6, 8];
      return { vel: mults[item.tier ?? 1], dropa: (item.tier ?? 0) >= def.tier };
    }
    if (item.ferramenta === "espada" && !def.ferramenta) return { vel: 1.2, dropa: def.tier === 0 };
    return { vel: 1, dropa: def.tier === 0 };
  }

  // ── Ações do jogador ────────────────────────────────────────
  private executarQuebra(dt: number) {
    if (!this.entrada.minerando || this.fase !== "jogando") { this.progressoQuebra = 0; this.quebraAlvo = null; return; }
    if (!this.mira) { this.progressoQuebra = 0; this.quebraAlvo = null; return; }
    const alvo = `${this.mira.x},${this.mira.y},${this.mira.z}`;
    if (alvo !== this.quebraAlvo) { this.quebraAlvo = alvo; this.progressoQuebra = 0; }
    const def = BLOCOS[this.mira.id];
    if (!def || def.dureza === Infinity) { this.progressoQuebra = 0; return; }
    const { vel, dropa } = this.multiplicadorFerramenta(this.mira.id);
    if (this.modo === "criativo") { this.quebrar(this.mira.x, this.mira.y, this.mira.z, false); return; }
    this.progressoQuebra += (dt * vel) / def.dureza;
    if (this.progressoQuebra >= 1) {
      this.progressoQuebra = 0;
      this.quebrar(this.mira.x, this.mira.y, this.mira.z, dropa);
    }
  }

  private quebrar(x: number, y: number, z: number, dropa: boolean) {
    const id = this.mundo.getBloco(x, y, z);
    if (id === B.AR || id === B.ROCHA_MAE) return;
    // TNT quebrada cai para o inventário e cancela nada (nunca foi acesa)
    this.mundo.setBloco(x, y, z, B.AR);
    this.blocosQuebrados++;
    if (this.blocosQuebrados >= 200) this.conquista("mineiro");
    this.som("quebrar");
    this.spawnParticulas(x + 0.5, y + 0.5, z + 0.5, CORES[id]?.[0] ?? "#9a9a9a", 10);
    this.fome = Math.max(0, this.fome - 0.02);
    // ── v29: colheita de trigo (dos dois estágios) ──
    if (id === B.TRIGO_M) {
      if (this.modo === "sobrevivencia" || dropa) {
        this.inv.adicionar(I.TRIGO, 1);
        this.inv.adicionar(I.SEMENTES, this.rnd.inteiro(1, 2));
      }
      this.conquista("agricultor");
      this.som("comer");
      return;
    }
    if (id === B.TRIGO_J) {
      if (this.modo === "sobrevivencia" || dropa) this.inv.adicionar(I.SEMENTES, 1); // ainda jovem: só sementes
      return;
    }
    // baú quebrado: os itens dele voltam para a mochila (nada se perde)
    if (id === B.BAU) {
      const chave = `${x},${y},${z}`;
      const slots = this.baus.get(chave);
      if (slots) for (const s of slots) if (s) this.inv.adicionar(s.id, s.qtd);
      this.baus.delete(chave);
    }
    if (dropa) {
      const drop = dropDe(id);
      if (drop) {
        this.inv.adicionar(drop, 1);
        if (id === B.TRONCO) this.conquista("primeira_madeira");
        if (id === B.PEDRA) this.conquista("primeira_pedra");
        if (drop === 102) this.conquista("primeiro_diamante");
      }
    }
    // folhas podem soltar maçã
    if (id === B.FOLHAS) {
      const d = this.rnd.chance(0.08) ? { id: 107 as number, qtd: 1 } : null;
      if (d) this.inv.adicionar(d.id, d.qtd);
    }
    // apoio: erva/flores/cacto em cima caem também (v29, coluna toda no cacto)
    const acima = this.mundo.getBloco(x, y + 1, z);
    if (PRECISA_DE_APOIO.has(acima)) this.quebrar(x, y + 1, z, true);
  }

  colocar() {
    if (this.fase !== "jogando" || !this.mira) return;
    // usar a cama (dormir) em vez de colocar bloco na cara dela
    if (this.mira.id === B.CAMA) { this.dormir(); return; }
    // abrir baú em vez de colocar bloco na cara dele (v29)
    if (this.mira.id === B.BAU) { this.abrirBau(); return; }
    const s = this.inv.selecionado();
    if (!s) return;
    // ── v29 AGRICULTURA: enxada lava a terra; sementes plantam ──
    if (s.id >= 100) {
      const item = ITENS[s.id];
      if (item?.ferramenta === "enxada") { this.arar(); return; }
      if (s.id === I.SEMENTES) { this.plantar(); return; }
      return; // itens não colocáveis
    }
    // posição adjacente = bloco visado + face atingida
    const x = this.mira.x + this.ultimaFace[0];
    const y = this.mira.y + this.ultimaFace[1];
    const z = this.mira.z + this.ultimaFace[2];
    if (y < 0 || y >= 80) return;
    if (this.mundo.getBloco(x, y, z) !== B.AR && this.mundo.getBloco(x, y, z) !== B.AGUA) return;
    // erva/flores/cacto precisam de chão sólido por baixo (v29)
    if (PRECISA_DE_APOIO.has(s.id) && !this.mundo.solido(x, y - 1, z)) return;
    // não colocar dentro do jogador (exceto escada/tocha, que não são sólidas)
    const novoSolido = BLOCOS[s.id]?.solido ?? true;
    if (novoSolido && this.colideComJogador(x, y, z)) return;
    if (this.modo === "sobrevivencia") this.inv.consumirSelecionado(1);
    this.mundo.setBloco(x, y, z, s.id);
    this.blocosColocados++;
    if (this.blocosColocados >= 100) this.conquista("arquiteto");
    this.som("colocar");
    if (s.id === B.BAU) { this.baus.set(`${x},${y},${z}`, new Array(BAU_SLOTS).fill(null)); } // baú novo com 18 posições vazias
    this.emitirEstado(true);
  }

  // ── v29 AGRICULTURA ─────────────────────────────────────────
  /** Enxada: transforma relva/terra com face superior visada em terra arada */
  private arar() {
    if (!this.mira) return;
    const id = this.mira.id;
    if (id !== B.RELVA && id !== B.TERRA) {
      this.avisos.push({ texto: "A enxada só lava relva ou terra", tipo: "info", t: 1.8 });
      return;
    }
    // tem de ter ar por cima (o campo precisa de luz)
    if (this.mundo.getBloco(this.mira.x, this.mira.y + 1, this.mira.z) !== B.AR) return;
    this.swingT = 0.3;
    this.mundo.setBloco(this.mira.x, this.mira.y, this.mira.z, B.TERRA_ARADA);
    this.som("quebrar");
    this.emitirEstado(true);
  }
  /** Sementes: planta trigo jovem em terra arada */
  private plantar() {
    if (!this.mira) return;
    if (this.mira.id !== B.TERRA_ARADA) {
      this.avisos.push({ texto: "Plantas só em Terra Arada (usa a enxada)", tipo: "info", t: 2 });
      return;
    }
    if (this.mundo.getBloco(this.mira.x, this.mira.y + 1, this.mira.z) !== B.AR) return;
    const x = this.mira.x, y = this.mira.y + 1, z = this.mira.z;
    if (this.modo === "sobrevivencia") this.inv.consumirSelecionado(1);
    this.mundo.setBloco(x, y, z, B.TRIGO_J);
    this.plantas.set(`${x},${y},${z}`, TEMPO_CRESCER * (this.meteo === "limpo" ? 1 : CRESCER_CHUVA));
    this.som("colocar");
    this.emitirEstado(true);
  }

  // ── v29 BAÚ: 18 posições por posição no mundo ────────────────
  abrirBau() {
    if (this.fase !== "jogando" || !this.mira || this.mira.id !== B.BAU) return;
    const chave = `${this.mira.x},${this.mira.y},${this.mira.z}`;
    if (!this.baus.has(chave)) this.baus.set(chave, new Array(BAU_SLOTS).fill(null)); // baú antigo sem registo
    this.bauAberto = chave;
    this.som("colocar");
    this.emitirEstado(true);
  }
  fecharBau() { if (this.bauAberto) { this.bauAberto = null; this.emitirEstado(true); } }
  slotsBau(chave: string): (Slot | null)[] {
    let b = this.baus.get(chave);
    if (!b) { b = new Array(BAU_SLOTS).fill(null); this.baus.set(chave, b); }
    return b;
  }
  /** Guarda o slot i da mochila no baú aberto (1.ª vaga) */
  bauDepositar(i: number): boolean {
    if (!this.bauAberto || i < 0 || i > 35) return false;
    const s = this.inv.slots[i];
    if (!s) return false;
    const bau = this.slotsBau(this.bauAberto);
    // encher pilhas iguais primeiro
    if (s.id >= 100 || true) {
      const max = s.id >= 100 ? (ITENS[s.id]?.maximo ?? 64) : 64;
      for (const bs of bau) {
        if (bs && bs.id === s.id && bs.qtd < max) {
          const caber = Math.min(max - bs.qtd, s.qtd);
          bs.qtd += caber; s.qtd -= caber;
          if (s.qtd <= 0) { this.inv.slots[i] = null; this.conquista("cofre"); this.emitirEstado(true); return true; }
        }
      }
      for (let j = 0; j < bau.length; j++) {
        if (!bau[j]) {
          bau[j] = { id: s.id, qtd: s.qtd };
          this.inv.slots[i] = null;
          this.conquista("cofre");
          this.emitirEstado(true);
          return true;
        }
      }
    }
    this.avisos.push({ texto: "Baú cheio", tipo: "info", t: 1.6 });
    return false;
  }
  /** Retira o slot i do baú aberto para a mochila */
  bauRetirar(i: number): boolean {
    if (!this.bauAberto || i < 0 || i >= BAU_SLOTS) return false;
    const bau = this.slotsBau(this.bauAberto);
    const s = bau[i];
    if (!s) return false;
    const guardado = this.inv.adicionar(s.id, s.qtd);
    if (guardado === 0) { this.avisos.push({ texto: "Mochila cheia", tipo: "info", t: 1.6 }); return false; }
    s.qtd -= guardado;
    if (s.qtd <= 0) bau[i] = null;
    this.emitirEstado(true);
    return true;
  }

  // ── v29 ARMADURA ───────────────────────────────────────
  equiparArmadura(): boolean {
    if (this.fase !== "jogando") return false;
    const ok = this.inv.equiparArmadura();
    if (ok) {
      this.conquista("blindado");
      this.som("criar");
      this.emitirEstado(true);
    }
    return ok;
  }
  despirArmadura(): boolean {
    if (this.fase !== "jogando") return false;
    const ok = this.inv.despirArmadura();
    if (ok) this.emitirEstado(true);
    return ok;
  }

  // ── v29 TNT: acende · fusível · explosão enorme ──────
  private acenderTnt(x: number, y: number, z: number) {
    const chave = `${x},${y},${z}`;
    if (this.tntAcesas.some((t) => `${t.x},${t.y},${t.z}` === chave)) return; // já acesa
    this.mundo.setBloco(x, y, z, B.AR); // sai do mundo e vira entidade com fusível
    const malha = new THREE.Mesh(
      new THREE.BoxGeometry(0.94, 0.94, 0.94),
      new THREE.MeshLambertMaterial({ color: 0xd83a2a }),
    );
    malha.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.cena.add(malha);
    this.tntAcesas.push({ x, y, z, t: FUSIVEL_TNT, malha });
    this.som("sibilo");
    this.avisos.push({ texto: "TNT acesa — afasta-te!", tipo: "dano", t: 2 });
    this.emitirEstado(true);
  }
  private atualizarTnt(dt: number) {
    for (let i = this.tntAcesas.length - 1; i >= 0; i--) {
      const t = this.tntAcesas[i];
      t.t -= dt;
      // piscar acelerado até explodir
      const piscar = Math.sin(performance.now() / (60 + t.t * 90)) > 0;
      t.malha.material instanceof THREE.MeshLambertMaterial &&
        t.malha.material.emissive.setRGB(piscar ? 0.9 : 0.05, piscar ? 0.55 : 0.02, 0.02);
      t.malha.scale.setScalar(1 + (1 - Math.max(0, t.t) / FUSIVEL_TNT) * 0.35);
      if (t.t <= 0) {
        this.cena.remove(t.malha); t.malha.geometry.dispose();
        this.tntAcesas.splice(i, 1);
        this.explodirNoMundo(t.x + 0.5, t.y + 0.5, t.z + 0.5, RAIO_TNT);
        this.conquista("demolidor");
      }
    }
  }
  /** Explosão genérica (TNT): destrói blocos, partículas, dano e tremor */
  private explodirNoMundo(ex: number, ey: number, ez: number, raio: number) {
    const removidos = this.mundo.explodir(Math.floor(ex), Math.floor(ey), Math.floor(ez), this.rnd, raio);
    this.som("explosao");
    for (let i = 0; i < removidos.length && i < 40; i += 2) {
      const [rx, ry, rz] = removidos[i];
      this.spawnParticulas(rx + 0.5, ry + 0.5, rz + 0.5, "#5a5a5a", 4, 2.4);
    }
    this.spawnParticulas(ex, ey, ez, "#f0a030", 24, 3.2);
    const d = Math.hypot(this.px - ex, this.py - ey, this.pz - ez);
    if (d < raio + 2.5) {
      const qtd = Math.round((1 - d / (raio + 2.5)) * 18);
      if (qtd > 0) this.receberDano(qtd, "explosao");
      this.vx += (this.px - ex) * 2.2; this.vy += 6; this.vz += (this.pz - ez) * 2.2;
    }
    this.tremerT = 0.8;
  }

  // ── v29 METEOROLOGIA: limpo → chuva → tempestade → limpo ──
  definirMeteo(m: Meteo, segundos = 0) {
    if (m !== "limpo" && m !== "chuva" && m !== "tempestade") return;
    this.meteo = m;
    this.meteoT = segundos > 0 ? segundos : (m === "limpo" ? 150 : 75);
    this.avisos.push({ texto: m === "limpo" ? "O céu abriu ☀" : m === "chuva" ? "Começou a chover ☂ — o trigo adora!" : "TEMPESTADE ⚡ afasta-te de estruturas altas!", tipo: "info", t: 3.5 });
    this.emitirEstado(true);
  }
  private atualizarMeteo(dt: number) {
    this.meteoT -= dt;
    if (this.meteoT <= 0) {
      // transições honestas e determinísticas: limpo→chuva→(tempestade 1/3 das vezes)→limpo
      if (this.meteo === "limpo") { this.meteo = "chuva"; this.meteoT = 60 + this.rnd.inteiro(0, 60); }
      else if (this.meteo === "chuva") {
        if (this.rnd.chance(0.34) && this.noite) { this.meteo = "tempestade"; this.meteoT = 40 + this.rnd.inteiro(0, 40); }
        else { this.meteo = "limpo"; this.meteoT = 120 + this.rnd.inteiro(0, 90); }
      }
      else { this.meteo = "limpo"; this.meteoT = 150 + this.rnd.inteiro(0, 90); }
      const nomes: Record<string, string> = { limpo: "O céu abriu ☀", chuva: "Começou a chover ☂ — o trigo adora!", tempestade: "TEMPESTADE ⚡ afasta-te de estruturas altas!" };
      this.avisos.push({ texto: nomes[this.meteo], tipo: "info", t: 3.5 });
    }
    // nível de chuva suavizado (0..1) para partículas, céu e som
    const alvo = this.meteo === "limpo" ? 0 : this.meteo === "chuva" ? 0.65 : 1;
    this.chuvaNivel += (alvo - this.chuvaNivel) * Math.min(1, dt * 1.2);
    // relâmpagos na tempestade
    if (this.meteo === "tempestade") {
      if (this.relampagoT > 0) {
        this.relampagoT -= dt;
        if (this.relampagoT <= 0 && this.chuvaGain === null) this.som("trovao");
      } else if (this.rnd.proximo() < dt * 0.14) {
        this.relampagoT = 0.14;
      }
    } else this.relampagoT = Math.max(0, this.relampagoT - dt);
  }
  /** Partículas de chuva: agulhas que caem num cilindro à volta do jogador */
  private atualizarChuva(dt: number) {
    const ativa = this.chuvaNivel > 0.04;
    const n = Math.floor(this.chuvaPool.length * Math.min(1, this.chuvaNivel * 1.15));
    for (let i = 0; i < this.chuvaPool.length; i++) {
      const g = this.chuvaPool[i];
      if (!ativa || i >= n) { g.visible = false; continue; }
      if (!g.visible) {
        const a = this.rnd.proximo() * Math.PI * 2, r = 4 + this.rnd.proximo() * 14;
        g.position.set(this.px + Math.cos(a) * r, this.py + 9 + this.rnd.proximo() * 6, this.pz + Math.sin(a) * r);
        g.visible = true;
      }
      g.position.y -= dt * 21;
      if (g.position.y < this.py - 4) g.visible = false; // caiu abaixo: recicla
    }
    // som de chuva: ruído filtrado em loop (intensidade segue o nível)
    if (this.mudo || !ativa) { this.pararChuva(); return; }
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      if (this.audioCtx.state === "suspended") void this.audioCtx.resume();
      if (!this.chuvaGain) {
        const dur = 2, sr = this.audioCtx.sampleRate;
        const buf = this.audioCtx.createBuffer(1, sr * dur, sr);
        const canal = buf.getChannelData(0);
        for (let i = 0; i < canal.length; i++) canal[i] = (Math.random() * 2 - 1) * 0.4;
        const src = this.audioCtx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const filtro = this.audioCtx.createBiquadFilter();
        filtro.type = "lowpass"; filtro.frequency.value = 900;
        this.chuvaGain = this.audioCtx.createGain();
        this.chuvaGain.gain.value = 0;
        src.connect(filtro); filtro.connect(this.chuvaGain); this.chuvaGain.connect(this.audioCtx.destination);
        src.start();
        (this.chuvaGain as unknown as { __src?: AudioBufferSourceNode }).__src = src;
      }
      this.chuvaGain.gain.value = this.chuvaNivel * 0.14;
    } catch { /* áudio indisponível — segue o jogo */ }
  }
  private pararChuva() {
    if (this.chuvaGain) {
      try { this.chuvaGain.gain.value = 0; } catch { /* ignore */ }
      const src = (this.chuvaGain as unknown as { __src?: AudioBufferSourceNode }).__src;
      if (src) { try { src.stop(); } catch { /* ignore */ } }
      try { this.chuvaGain.disconnect(); } catch { /* ignore */ }
      this.chuvaGain = null;
    }
  }

  private colideComJogador(x: number, y: number, z: number): boolean {
    const pxMin = this.px - 0.3, pxMax = this.px + 0.3;
    const pzMin = this.pz - 0.3, pzMax = this.pz + 0.3;
    const pyMin = this.py, pyMax = this.py + 1.8;
    return x + 1 > pxMin && x < pxMax && z + 1 > pzMin && z < pzMax && y + 1 > pyMin && y < pyMax;
  }

  atacar(): Mob | null {
    if (this.fase !== "jogando") return null;
    // ── v29: TNT acende com um golpe; baú abre com um golpe ──
    if (this.mira && this.mira.id === B.TNT) { this.acenderTnt(this.mira.x, this.mira.y, this.mira.z); return null; }
    if (this.mira && this.mira.id === B.BAU) { this.abrirBau(); return null; }
    this.swingT = 0.3;
    const s = this.inv.selecionado();
    const item = s ? ITENS[s.id] : undefined;
    const dano = item?.dano ?? 1;
    const mob = this.gestor.atacar(this.px, this.py + 1.2, this.pz, this.yaw, 3.4, dano);
    if (mob) {
      this.som("golpe");
      if (mob.tipo === "estourador" && !mob.vivo) this.conquista("estourador_derrotado");
      if (mob.tipo === "aranha" && !mob.vivo) this.conquista("aracnologo");
      if (!mob.vivo) {
        this.mobsDerrotados++;
        this.conquista("safari");
        for (const d of this.gestor.dropDoMob(mob.tipo, this.rnd)) this.inv.adicionar(d.id, d.qtd);
      }
    }
    return mob;
  }

  comer() {
    if (this.fase !== "jogando") return;
    const s = this.inv.selecionado();
    if (!s) return;
    const item = ITENS[s.id];
    if (!item?.comida) return;
    if (this.fome >= FOME_MAX - 0.5 && this.modo === "sobrevivencia") return;
    this.fome = Math.min(FOME_MAX, this.fome + item.comida);
    if (this.modo === "sobrevivencia") this.inv.consumirSelecionado(1);
    this.som("comer");
    this.emitirEstado(true);
  }

  // ── v32: PESCA ──────────────────────────────────────────
  // Raycast DDA que procura ÁGUA (o raycast normal ignora-a).
  private miraAgua(): { x: number; y: number; z: number } | null {
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch),
    ).normalize();
    const olhoY = this.py + this.alturaOlho;
    let x = Math.floor(this.px), y = Math.floor(olhoY), z = Math.floor(this.pz);
    const passo = new THREE.Vector3(Math.abs(dir.x) < 1e-9 ? 1e9 : Math.abs(1 / dir.x),
      Math.abs(dir.y) < 1e-9 ? 1e9 : Math.abs(1 / dir.y),
      Math.abs(dir.z) < 1e-9 ? 1e9 : Math.abs(1 / dir.z));
    const sinal = [dir.x < 0 ? -1 : 1, dir.y < 0 ? -1 : 1, dir.z < 0 ? -1 : 1];
    let tMaxX = (sinal[0] > 0 ? (x + 1 - this.px) : (this.px - x)) * passo.x;
    let tMaxY = (sinal[1] > 0 ? (y + 1 - olhoY) : (olhoY - y)) * passo.y;
    let tMaxZ = (sinal[2] > 0 ? (z + 1 - this.pz) : (this.pz - z)) * passo.z;
    for (let i = 0; i < 80; i++) {
      const id = this.mundo.getBloco(x, y, z);
      if (id === B.AGUA) return { x, y, z };
      if (id !== B.AR) return null; // sólido no caminho: sem linha
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { if (tMaxX > PESCA_ALCANCE) break; x += sinal[0]; tMaxX += passo.x; }
      else if (tMaxY < tMaxZ) { if (tMaxY > PESCA_ALCANCE) break; y += sinal[1]; tMaxY += passo.y; }
      else { if (tMaxZ > PESCA_ALCANCE) break; z += sinal[2]; tMaxZ += passo.z; }
    }
    return null;
  }

  /** Ação do botão ATACAR com a vara selecionada: lançar / recolher / fisgar. */
  pescarAcao() {
    if (this.fase !== "jogando") return;
    if (this.pescaEstado === "parado") {
      const agua = this.miraAgua();
      if (!agua) {
        this.avisos.push({ texto: "Aponta para a água para lançar a linha", tipo: "info", t: 2 });
        return;
      }
      if (!this.pescaBobber) {
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshLambertMaterial({ color: "#e03a3a" }));
        this.pescaBobber = g;
      }
      this.pescaAlvo = [agua.x + 0.5, agua.y + 0.82, agua.z + 0.5];
      this.pescaBobber.position.set(...this.pescaAlvo);
      this.pescaBobber.visible = true;
      if (!this.pescaLinha) {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        this.pescaLinha = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#d8d8d8" }));
      }
      this.pescaLinha.visible = true;
      this.cena.add(this.pescaBobber, this.pescaLinha);
      this.pescaEstado = "lancada";
      this.pescaTimer = PESCA_ESPERA_MIN + this.rnd.proximo() * (PESCA_ESPERA_MAX - PESCA_ESPERA_MIN);
      this.som("salpicar");
      this.emitirEstado(true);
      return;
    }
    if (this.pescaEstado === "lancada") {
      this.limparPesca();
      this.avisos.push({ texto: "Recolheste a linha", tipo: "info", t: 1.6 });
      return;
    }
    // picada → FISGAR: peixe decidido aqui (raro é raro de verdade)
    const r = this.rnd.proximo();
    const peixe = r < 0.6 ? I.PEIXE_SARDINHA : r < 0.9 ? I.PEIXE_CARAPAU : I.PEIXE_CORVINA;
    this.inv.adicionar(peixe, 1);
    this.peixesPescados++;
    this.limparPesca();
    this.conquista("pescador");
    this.som("comer");
    this.avisos.push({ texto: `Pescaste: ${NOMES[peixe]}!`, tipo: "conquista", t: 3 });
    this.emitirEstado(true);
  }

  private limparPesca() {
    if (this.pescaBobber) { this.pescaBobber.visible = false; try { this.cena.remove(this.pescaBobber); } catch { /* cena ausente */ } }
    if (this.pescaLinha) { this.pescaLinha.visible = false; try { this.cena.remove(this.pescaLinha); } catch { /* cena ausente */ } }
    this.pescaEstado = "parado";
    this.pescaTimer = 0;
  }

  private atualizarPesca(dt: number) {
    if (this.pescaEstado === "parado") return;
    // afastou-se da boia → recolhe honestamente
    const d = Math.hypot(this.px - this.pescaAlvo[0], this.pz - this.pescaAlvo[2]);
    if (d > PESCA_ALCANCE + 2) {
      this.limparPesca();
      this.avisos.push({ texto: "Afastaste-te da linha — recolhida", tipo: "info", t: 2 });
      return;
    }
    if (this.pescaEstado === "lancada") {
      this.pescaTimer -= dt;
      // boia flutua enquanto espera
      if (this.pescaBobber) this.pescaBobber.position.y = this.pescaAlvo[1] + Math.sin(performance.now() / 380) * 0.035;
      if (this.pescaTimer <= 0) {
        this.pescaEstado = "picada";
        this.pescaTimer = PESCA_JANELA; // janela para fisgar
        this.som("salpicar");
        if (this.pescaBobber) this.pescaBobber.position.y = this.pescaAlvo[1] - 0.3; // boia afunda
        this.spawnParticulas(this.pescaAlvo[0], this.pescaAlvo[1], this.pescaAlvo[2], "#9cc8d8", 6, 0.7);
        this.emitirEstado(true);
      }
    } else if (this.pescaEstado === "picada") {
      this.pescaTimer -= dt;
      if (this.pescaTimer <= 0) {
        this.limparPesca();
        this.avisos.push({ texto: "Escapou-te!", tipo: "info", t: 2 });
        this.emitirEstado(true);
      }
    }
    // linha: da mão à boia
    if (this.pescaLinha && this.pescaBobber && this.pescaLinha.visible) {
      const pos = this.pescaLinha.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, this.px, this.py + 1.4, this.pz);
      pos.setXYZ(1, this.pescaBobber.position.x, this.pescaBobber.position.y, this.pescaBobber.position.z);
      pos.needsUpdate = true;
    }
  }

  // ── Dormir (cama): salta a noite e define o renascimento ──
  dormir() {
    if (this.fase !== "jogando" || !this.mira || this.mira.id !== B.CAMA) return;
    if (!this.noite) {
      this.avisos.push({ texto: "Só podes dormir à noite", tipo: "info", t: 2.5 });
      return;
    }
    // monstros por perto impedem o sono
    for (const mob of this.gestor.mobs) {
      if (!mob.vivo || mob.tipo === "porco") continue;
      if (Math.hypot(mob.x - this.px, mob.z - this.pz) < 9) {
        this.avisos.push({ texto: "Há monstros por perto! Não podes dormir.", tipo: "info", t: 2.5 });
        return;
      }
    }
    // saltar para a manhã do dia seguinte
    this.tempo = (Math.floor(this.tempo / DIA_SEGUNDOS) + 1) * DIA_SEGUNDOS;
    this.dia = Math.floor(this.tempo / DIA_SEGUNDOS) + 1;
    this.primeiraNoiteFeita = true;
    this.spawnProprio = [this.mira.x + 0.5, this.mira.y + 1.02, this.mira.z + 0.5];
    this.vida = Math.min(VIDA_MAX, this.vida + 4);
    this.ar = AR_MAX;
    this.conquista("bom_descanso");
    this.avisos.push({ texto: "Dormiste bem — renascimento definido junto à cama ✓", tipo: "info", t: 3.5 });
    this.som("criar");
    this.emitirEstado(true);
  }

  // ── Criação / fundição ──────────────────────────────────────
  receitas() {
    const mesa = pertoDe(this.mundo, this.px, this.py, this.pz, B.MESA);
    const fornalha = pertoDe(this.mundo, this.px, this.py, this.pz, B.FORNALHA);
    return { mesa, fornalha, lista: avaliarReceitas(this.inv, mesa, fornalha) };
  }

  criar(idReceita: string): { ok: boolean; motivo: string } {
    const r = this.receitas();
    const info = r.lista.find((i: { receita: Receita }) => i.receita.id === idReceita);
    if (!info) return { ok: false, motivo: "Receita desconhecida" };
    if (!info.pode) return { ok: false, motivo: info.motivo };
    if (criarReceita(this.inv, info.receita)) {
      this.som("criar");
      if (["pic_mad", "pic_ped", "pic_fer", "pic_dia"].includes(idReceita)) this.conquista("primeira_picareta");
      if (idReceita === "fun_fer") this.conquista("primeiro_ferro");
      if (idReceita === "pao") this.conquista("padeiro");
      if (idReceita === "vara_pesca") this.conquista("tecelao");
      this.emitirEstado(true);
      return { ok: true, motivo: "" };
    }
    return { ok: false, motivo: "Sem materiais" };
  }

  // ── Conquistas / créditos ───────────────────────────────────
  conquista(id: string) {
    if (this.conquistas.includes(id)) return;
    const c = CONQUISTAS.find((x) => x.id === id);
    if (!c) return;
    this.conquistas.push(id);
    this.creditos += c.creditos;
    this.avisos.push({ texto: `Conquista: ${c.nome} (+${c.creditos} créditos)`, tipo: "conquista", t: 4 });
    if (this.creditos >= 25) this.ctaWhats = true;
    this.som("conquista");
  }

  // ── Sons sintetizados (WebAudio, sem ficheiros) ──────────────
  private audioCtx: AudioContext | null = null;
  alternarSom(): boolean {
    this.mudo = !this.mudo;
    try { localStorage.setItem("bateu_blocos_som", this.mudo ? "1" : "0"); } catch { /* ignore */ }
    return this.mudo;
  }
  definirRaio(n: number) {
    this.raioRender = Math.max(2, Math.min(4, Math.floor(n)));
    try { localStorage.setItem("bateu_blocos_dist", String(this.raioRender)); } catch { /* ignore */ }
  }
  /** Modo guardado no save (para o botão CONTINUAR usar o modo certo) */
  lerModoSave(): Modo | null {
    try {
      const sv = JSON.parse(localStorage.getItem("bateu_blocos_save") || "null");
      return sv?.modo === "criativo" ? "criativo" : sv?.modo === "sobrevivencia" ? "sobrevivencia" : null;
    } catch { return null; }
  }
  som(tipo: "quebrar" | "colocar" | "golpe" | "comer" | "criar" | "conquista" | "dano" | "passo" | "sibilo" | "explosao" | "trovao" | "salpicar") {
    if (this.mudo) return;
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      const ctx = this.audioCtx;
      if (ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      const config: Record<string, [OscillatorType, number, number, number, number]> = {
        quebrar: ["square", 180, 0.08, 0.12, 60], colocar: ["square", 260, 0.06, 0.1, 80],
        golpe: ["sawtooth", 140, 0.07, 0.12, 40], comer: ["triangle", 320, 0.12, 0.15, -80],
        criar: ["triangle", 520, 0.1, 0.12, 140], conquista: ["sine", 660, 0.3, 0.15, 220],
        dano: ["sawtooth", 110, 0.15, 0.2, -30], passo: ["triangle", 90, 0.04, 0.05, 10],
        sibilo: ["sawtooth", 1400, 0.5, 0.06, 900], explosao: ["sawtooth", 70, 0.5, 0.4, -40],
        trovao: ["sawtooth", 55, 0.9, 0.5, -25],
        salpicar: ["sine", 620, 0.18, 0.14, -260],
      };
      const [forma, freq, dur, vol, desliza] = config[tipo];
      osc.type = forma;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(Math.max(30, freq + desliza), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch { /* áudio indisponível — segue o jogo */ }
  }

  // ── Física do jogador ───────────────────────────────────────
  private fisica(dt: number) {
    const naAguaAgora = this.mundo.getBloco(Math.floor(this.px), Math.floor(this.py + 0.4), Math.floor(this.pz)) === B.AGUA;
    const cabecaAguaAgora = this.mundo.getBloco(Math.floor(this.px), Math.floor(this.py + 1.62), Math.floor(this.pz)) === B.AGUA;
    this.naAgua = naAguaAgora; this.cabecaAgua = cabecaAguaAgora;

    // escada: escalada se o corpo está dentro de uma (v28)
    const emEscada = this.mundo.getBloco(Math.floor(this.px), Math.floor(this.py + 0.4), Math.floor(this.pz)) === B.ESCADA ||
      this.mundo.getBloco(Math.floor(this.px), Math.floor(this.py + 1.2), Math.floor(this.pz)) === B.ESCADA;
    this.naEscada = emEscada;

    // direção de movimento relativa ao yaw (agachado anda devagar, v28)
    const velBase = (this.entrada.correr ? VEL_CORRER : VEL_ANDAR) * (this.entrada.agachado ? 0.45 : 1);
    const vel = this.modo === "criativo" && this.criativoVoar ? velBase * 1.7 : this.naAgua ? velBase * 0.55 : velBase;
    let mx = 0, mz = 0;
    if (this.fase === "jogando") {
      const f = this.entrada.frente, l = this.entrada.lado;
      mx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * l) * vel;
      mz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * l) * vel;
    }
    // aceleração suave
    const acc = this.noChao || this.criativoVoar ? 14 : 5;
    this.vx += (mx - this.vx) * Math.min(1, acc * dt);
    this.vz += (mz - this.vz) * Math.min(1, acc * dt);

    if (emEscada) {
      // escalada: sobe/desce; parado, fica preso à escada
      const vVert = (this.entrada.salto || this.entrada.subir ? 1 : 0) - (this.entrada.descer ? 1 : 0);
      this.vy = vVert * 3.2;
      this.noChao = false; this.danoQuedaVy = 0;
    } else if (this.modo === "criativo" && (this.criativoVoar || !this.noChao && this.entrada.salto)) {
      // voo criativo
      const vVert = (this.entrada.salto || this.entrada.subir ? 1 : 0) - (this.entrada.descer ? 1 : 0);
      this.vy = vVert * velBase * 1.2;
    } else if (this.naAgua) {
      this.vy -= GRAVIDADE * 0.28 * dt;
      if (this.vy < -2.2) this.vy = -2.2;
      if (this.entrada.salto) this.vy = 3.4;
      if (this.entrada.descer) this.vy = -3.0; // mergulhar (móvel: botão MERGULHAR)
    } else {
      this.vy -= GRAVIDADE * dt;
      if (this.vy < -40) this.vy = -40;
      if (this.entrada.salto && this.noChao && this.fase === "jogando") {
        this.vy = SALTO; this.noChao = false;
        this.fome = Math.max(0, this.fome - 0.03);
      }
    }

    // mover eixo a eixo com colisão AABB
    const largura = 0.3, altura = 1.8;
    const colideEm = (x: number, y: number, z: number): boolean => {
      for (const ox of [-largura, largura]) for (const oz of [-largura, largura]) for (const oy of [0.05, altura - 0.05]) {
        if (this.mundo.solido(x + ox, y + oy, z + oz)) return true;
      }
      return false;
    };
    const nx = this.px + this.vx * dt;
    if (!colideEm(nx, this.py, this.pz)) this.px = nx; else this.vx = 0;
    const nz = this.pz + this.vz * dt;
    if (!colideEm(this.px, this.py, nz)) this.pz = nz; else this.vz = 0;
    const ny = this.py + this.vy * dt;
    if (this.vy < 0) {
      if (colideEm(this.px, ny, this.pz)) {
        // aterrar: dano de queda
        const queda = Math.abs(Math.min(0, this.danoQuedaVy));
        if (queda > 11 && !this.naAgua && this.modo === "sobrevivencia") {
          const dano = Math.floor(queda - 11);
          this.receberDano(dano, "queda");
        }
        this.danoQuedaVy = 0;
        this.py = Math.floor(ny) + 1.001; this.vy = 0; this.noChao = true;
      } else { this.py = ny; this.noChao = false; this.danoQuedaVy = Math.min(this.danoQuedaVy, this.vy); }
    } else {
      if (colideEm(this.px, ny + altura, this.pz)) this.vy = 0;
      else this.py = ny;
      this.noChao = false;
    }
    if (this.py < -12) this.receberDano(1000, "vazio");

    // passos somam fome + som de passos (v28: "passo" estava definido mas nunca chamado)
    const andou = Math.hypot(this.vx, this.vz) * dt;
    if (andou > 0.001) { this.animacaoAndar += andou * 2.2; this.passosAcumulados += andou; }
    if (this.passosAcumulados > 1.6) {
      this.passosAcumulados = 0;
      if (this.modo === "sobrevivencia") this.fome = Math.max(0, this.fome - 0.015);
      if (this.noChao && !this.naAgua) this.som("passo");
    }
  }
  private passosAcumulados = 0;

  receberDano(qtd: number, causa: string) {
    if (this.modo === "criativo" || this.fase !== "jogando") return;
    // ── v29: o peitoral absorve parte do dano (explosões incluídas) ──
    const reducao = this.inv.reducaoArmadura;
    let efetivo = qtd;
    if (reducao > 0 && qtd < 1000) efetivo = Math.max(1, Math.round(qtd * (1 - reducao)));
    this.vida -= efetivo;
    this.tremerT = 0.35; // tremor de câmara (v28)
    this.avisos.push({ texto: `-${efetivo} ${causa === "queda" ? "de queda" : causa === "afogamento" ? "afogamento" : ""}`, tipo: "dano", t: 1.2 });
    this.som("dano");
    if (this.vida <= 0) {
      this.vida = 0;
      this.fase = "morto";
      this.causaMorte = causa === "queda" ? "Caiste de alto" : causa === "afogamento" ? "Afogaste-te" :
        causa === "fome" ? "Morreste de fome" : causa === "explosao" ? "Explodiu ao teu lado" :
          causa === "vazio" ? "Caiste para fora do mundo" : "Foste derrotado";
      this.morteRecente = 1;
      this.emitirEstado(true); // UI reage de imediato
    }
  }

  renascer() {
    const [sx, sy, sz] = this.spawnProprio ?? this.mundo.spawnPos();
    this.px = sx; this.py = sy; this.pz = sz;
    this.vx = this.vy = this.vz = 0;
    this.vida = VIDA_MAX; this.fome = FOME_MAX; this.ar = AR_MAX;
    this.fase = "jogando";
    this.emitirEstado(true);
  }

  // ── Seletor de blocos criativos (v28 + ervas v29-mundo vivo + TNT/baú v29) ──
  listaBlocosCriativos(): number[] {
    return [B.RELVA, B.TERRA, B.PEDRA, B.PEDREGULHO, B.AREIA, B.TRONCO, B.FOLHAS,
      B.TABUAS, B.VIDRO, B.TOCHA, B.MESA, B.FORNALHA, B.CAMA, B.ESCADA,
      B.ERVA, B.FLOR_AM, B.FLOR_VM, B.CACTO, B.TNT, B.BAU];
  }
  darBloco(id: number, qtd = 64) { if (id > 0 && id < 100 && BLOCOS[id]) this.inv.adicionar(id, qtd); }

  // ── Minimapa: amostra real dos chunks carregados (sem invenções) ──
  miniMapa(meiolado = 24): {
    lado: number; px: number; pz: number; yaw: number;
    celulas: Uint8Array; mobs: { x: number; z: number; tipo: string }[];
  } {
    const lado = meiolado * 2;
    const celulas = new Uint8Array(lado * lado);
    for (let dz = 0; dz < lado; dz++) for (let dx = 0; dx < lado; dx++) {
      const x = Math.floor(this.px) - meiolado + dx, z = Math.floor(this.pz) - meiolado + dz;
      // topo da coluna nos chunks carregados (dados reais, incluindo edições)
      let id = 0;
      for (let y = ALTURA - 1; y >= 0; y--) {
        const b = this.mundo.getBloco(x, y, z);
        if (b !== B.AR) { id = b; break; }
      }
      celulas[dz * lado + dx] = id;
    }
    const mobs = this.gestor.mobs.filter((m) => m.vivo && Math.abs(m.x - this.px) < meiolado && Math.abs(m.z - this.pz) < meiolado)
      .map((m) => ({ x: m.x, z: m.z, tipo: m.tipo }));
    return { lado, px: this.px, pz: this.pz, yaw: this.yaw, celulas, mobs };
  }

  // ── Sobrevivência: fome, ar, regen ──────────────────────────
  private sobrevivencia(dt: number) {
    if (this.modo !== "sobrevivencia" || this.fase !== "jogando") return;
    this.fome = Math.max(0, this.fome - dt * (0.028 + (this.entrada.correr ? 0.03 : 0)));
    if (this.cabecaAgua) {
      this.ar -= dt * (AR_MAX / 15);
      if (this.ar <= 0) { this.ar = 0; this.danoAfogar += dt; if (this.danoAfogar > 1) { this.danoAfogar = 0; this.receberDano(2, "afogamento"); } }
    } else this.ar = Math.min(AR_MAX, this.ar + dt * 4);
    if (this.fome >= 17 && this.vida < VIDA_MAX) {
      this.regen += dt;
      if (this.regen > 2) { this.regen = 0; this.vida = Math.min(VIDA_MAX, this.vida + 1); this.fome = Math.max(0, this.fome - 0.4); }
    } else if (this.fome <= 0) {
      this.fomeZero += dt;
      if (this.fomeZero > 3) { this.fomeZero = 0; if (this.vida > 2) this.receberDano(1, "fome"); }
    }
    void this.blocoSob;
  }
  private regen = 0; private fomeZero = 0; private danoAfogar = 0;

  // ── Chunks dinâmicos ────────────────────────────────────────
  private atualizarChunks() {
    const cx = Math.floor(this.px / CHUNK), cz = Math.floor(this.pz / CHUNK);
    // garantir à volta
    let orcamento = 2;
    for (let r = 0; r <= this.raioRender && orcamento > 0; r++) {
      for (let dx = -r; dx <= r && orcamento > 0; dx++) for (let dz = -r; dz <= r && orcamento > 0; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const c = this.mundo.garantir(cx + dx, cz + dz);
        if (c.sujo || !c.malha) { this.mundo.construirMalha(c); orcamento--; }
      }
    }
    // descartar longe
    for (const [k, c] of this.mundo.chunks) {
      if (Math.max(Math.abs(c.cx - cx), Math.abs(c.cz - cz)) > this.raioRender + 2) {
        for (const m of [c.malha, c.malhaAgua]) if (m) { this.mundo.grupo.remove(m); m.geometry.dispose(); }
        this.mundo.chunks.delete(k);
      }
    }
  }

  // ── Passo determinístico (usado pelo rAF e pelo pump E2E) ───
  passo(dt: number) {
    if (this.pausado || (this.fase !== "jogando" && this.fase !== "morto")) return;
    // olhar
    this.yaw += this.entrada.olharX; this.pitch += this.entrada.olharY;
    this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));
    this.entrada.olharX = 0; this.entrada.olharY = 0;

    if (this.fase === "jogando") {
      this.tempo += dt;
      const antes = this.dia;
      this.dia = Math.floor(this.tempo / DIA_SEGUNDOS) + 1;
      if (antes !== this.dia && !this.primeiraNoiteFeita && this.horaFrac < 0.5) { this.primeiraNoiteFeita = true; this.conquista("primeira_noite"); }
      // aviso do anoitecer (1× por dia)
      if (this.horaFrac > 0.42 && this.horaFrac < 0.5 && this.avisoNoiteDia !== this.dia) {
        this.avisoNoiteDia = this.dia;
        this.avisos.push({ texto: "A noite está a chegar — abriga-te!", tipo: "info", t: 3.5 });
      }

      this.fisica(dt);
      this.sobrevivencia(dt);
      this.mira = this.raycast();
      this.executarQuebra(dt);
      if (this.atacarPedido) {
        const sAtk = this.inv.selecionado();
        if (sAtk && sAtk.id === I.VARA_PESCA) this.pescarAcao();
        else this.atacar();
        this.atacarPedido = false;
      }
      if (this.colocarPedido) { this.colocar(); this.colocarPedido = false; }
      if (this.comerPedido) { this.comer(); this.comerPedido = false; }
      if (this.dormirPedido) { this.dormir(); this.dormirPedido = false; }

      // mobs
      const r = this.gestor.atualizar(dt, this.px, this.py, this.pz, this.noite);
      if (r.dano > 0) this.receberDano(r.dano, r.fonte === "zumbi" ? "zumbi" : "mob");
      this.gestor.tentarSpawns(dt, this.noite, this.px, this.pz);
      this.gestor.limparDistante(this.px, this.pz);
      if (this.gestor.explosaoPendente) {
        const e = this.gestor.explosaoPendente;
        this.gestor.explosaoPendente = null;
        this.explodirNoMundo(e.x, e.y, e.z, RAIO_EXPLOSAO);
      }

      // ── v29: TNT acesas · plantações · meteorologia · chuva ──
      this.atualizarTnt(dt);
      this.atualizarPlantacoes(dt);
      this.atualizarMeteo(dt);
      this.atualizarChuva(dt);
      // ── v32: pesca ──
      this.atualizarPesca(dt);
    }

    if (this.swingT > 0) this.swingT -= dt;
    if (this.tremerT > 0) this.tremerT = Math.max(0, this.tremerT - dt * 1.8); // tremor decai no passo (determinístico)
    this.ajustarQualidade(dt);
    this.atualizarCeu(dt);
    this.atualizarChunks();
    this.atualizarParticulas(dt);
    // luzes das tochas colocadas (reavaliar ~3×/s)
    this.tochaTimer += dt;
    if (this.tochaTimer > 0.33) { this.tochaTimer = 0; this.atualizarLuzesTochas(); }

    // sibilo do estourador em fusão
    for (const mob of this.gestor.mobs) {
      if (mob.vivo && mob.estado === "fundir" && !this._sibiloTocado) { this.som("sibilo"); this._sibiloTocado = true; }
      if (!mob.vivo || mob.estado !== "fundir") this._sibiloTocado = false;
    }

    // avisos expiram
    for (const a of this.avisos) a.t -= dt;
    this.avisos = this.avisos.filter((a) => a.t > 0);

    // save automático
    this.ultimoSave += dt;
    if (this.ultimoSave > 10) { this.ultimoSave = 0; this.guardar(); }

    this.emitirEstado();
  }
  private _sibiloTocado = false;

  /** v29: trigo cresce — a chuva acelera (CRESCER_CHUVA) */
  private atualizarPlantacoes(dt: number) {
    if (this.plantas.size === 0) return;
    for (const [chave, restam] of this.plantas) {
      const novo = restam - dt;
      if (novo <= 0) {
        const [x, y, z] = chave.split(",").map(Number);
        if (this.mundo.getBloco(x, y, z) === B.TRIGO_J) {
          this.mundo.setBloco(x, y, z, B.TRIGO_M);
          this.plantas.delete(chave);
        } else this.plantas.delete(chave); // planta foi quebrada — sai da fila
      } else this.plantas.set(chave, novo);
    }
  }

  // ── Render ──────────────────────────────────────────────────
  render(dtSegundos: number) {
    // altura do olho (agachar baixa a câmara com suavidade)
    const alvoOlho = this.entrada.agachado && !this.primeiraPessoa ? 1.32 : 1.62;
    this.alturaOlhoAtual += (alvoOlho - this.alturaOlhoAtual) * Math.min(1, dtSegundos * 10);
    const tremer = () => this.tremerT > 0 ? (this.rnd.proximo() - 0.5) * this.tremerT * 0.12 : 0;
    // balanço do passo (1ª pessoa): sobe e desce ao andar no chão
    const aAndar = Math.hypot(this.vx, this.vz) > 0.5 && this.noChao && this.fase === "jogando";
    const bobY = aAndar ? Math.sin(this.animacaoAndar * 6) * 0.045 : 0;
    const bobX = aAndar ? Math.cos(this.animacaoAndar * 3) * 0.028 : 0;

    const modo = this.camaraModo;
    if (modo === "primeira") {
      this.camara.position.set(this.px + bobX * 0.4, this.py + this.alturaOlhoAtual + bobY, this.pz);
      this.camara.rotation.set(this.pitch + tremer(), this.yaw + tremer(), 0, "YXZ");
      if (this.avatar) this.avatar.grupo.visible = false;
    } else if (modo === "terceira") {
      const boom = 4.2;
      const dir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      let dist = boom;
      for (let t = 0.4; t <= boom; t += 0.25) {
        const cx = this.px + dir.x * t, cy = this.py + this.alturaOlhoAtual + dir.y * t, cz = this.pz + dir.z * t;
        if (this.mundo.solido(cx, cy, cz)) { dist = t - 0.3; break; }
      }
      this.camara.position.set(this.px + dir.x * dist, this.py + this.alturaOlhoAtual + dir.y * dist, this.pz + dir.z * dist);
      this.camara.rotation.set(this.pitch + tremer(), this.yaw + tremer(), 0, "YXZ");
    } else if (modo === "ombro") {
      // câmara de ombro: próxima e deslocada para a direita (mira precisa)
      const boom = 2.4;
      const dir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      const lat = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); // direita do jogador
      let dist = boom;
      for (let t = 0.4; t <= boom; t += 0.2) {
        const cx = this.px + dir.x * t + lat.x * 0.85, cy = this.py + this.alturaOlhoAtual + 0.18 + dir.y * t, cz = this.pz + dir.z * t + lat.z * 0.85;
        if (this.mundo.solido(cx, cy, cz)) { dist = t - 0.2; break; }
      }
      const fLat = 0.85 * (dist / boom);
      this.camara.position.set(
        this.px + dir.x * dist + lat.x * fLat,
        this.py + this.alturaOlhoAtual + 0.18 + dir.y * dist,
        this.pz + dir.z * dist + lat.z * fLat,
      );
      this.camara.rotation.set(this.pitch + tremer(), this.yaw + tremer(), 0, "YXZ");
    } else if (modo === "topo") {
      // vista de cima (estratégica / mapeamento)
      this.camara.position.set(this.px, this.py + 24, this.pz + 0.01);
      this.camara.rotation.set(-Math.PI / 2 + 0.14, this.yaw + Math.PI + tremer(), 0, "YXZ");
    } else {
      // cinema: órbita lenta à volta do jogador (apanhar construções)
      const ang = performance.now() / 1000 * 0.22;
      const raio = 5.5;
      let altura = this.py + 2.4;
      const cx0 = this.px + Math.cos(ang) * raio, cz0 = this.pz + Math.sin(ang) * raio;
      if (this.mundo.solido(cx0, altura, cz0)) altura = this.py + 4.2;
      this.camara.position.set(cx0, altura, cz0);
      this.camara.lookAt(this.px, this.py + 1.2, this.pz);
      if (this.tremerT > 0) { this.camara.rotation.x += tremer(); this.camara.rotation.y += tremer(); }
    }
    // avatar visível em todas as câmaras exceto 1ª pessoa
    if (this.avatar && this.fase !== "menu") {
      this.avatar.grupo.visible = modo !== "primeira";
      if (modo !== "primeira") {
        this.avatar.grupo.position.set(this.px, this.py, this.pz);
        this.avatar.grupo.rotation.y = this.yaw + Math.PI;
        const balanco = Math.sin(this.animacaoAndar * 6) * 0.6;
        this.avatar.pernaE.rotation.x = balanco; this.avatar.pernaD.rotation.x = -balanco;
        this.avatar.bracoE.rotation.x = -balanco; this.avatar.bracoD.rotation.x = balanco;
        // item na mão
        const s = this.inv.selecionado();
        if (s && (this as any)._maoId !== s.id) {
          (this as any)._maoId = s.id;
          this.avatar.mao.clear();
          this.avatar.mao.add(criarItemMao(s.id, CORES[s.id]));
        } else if (!s) { (this as any)._maoId = 0; this.avatar.mao.clear(); }
      }
    }
    // FOV dinâmico: zoom (telescópio) · sprint (sensação de velocidade)
    const fovAlvo = this.entrada.zoom ? 28 : this.entrada.correr && aAndar ? 82 : 75;
    this.fovAtual += (fovAlvo - this.fovAtual) * Math.min(1, dtSegundos * 9);
    if (Math.abs(this.camara.fov - this.fovAtual) > 0.1) {
      this.camara.fov = this.fovAtual;
      this.camara.updateProjectionMatrix();
    }
    // mão + item em 1ª pessoa (presa à câmara, balança e golpeia) — escondida em zoom
    if (this.fase === "jogando" && modo === "primeira" && !this.entrada.zoom) {
      const sel2 = this.inv.selecionado();
      if ((sel2?.id ?? 0) !== this.maoFPId) {
        this.maoFPId = sel2?.id ?? 0;
        this.maoFP.clear();
        if (sel2) {
          const item2 = criarItemMao(sel2.id, CORES[sel2.id]);
          item2.scale.setScalar(sel2.id < 100 ? 1.2 : 1.05);
          this.maoFP.add(item2);
        }
      }
      this.maoFP.visible = !!sel2;
      if (sel2) {
        const aBalanca = Math.sin(this.animacaoAndar * 6) * 0.022;
        const baseX = 0.44, baseY = -0.42 + aBalanca, baseZ = -0.75;
        this.maoFP.position.set(baseX, baseY, baseZ);
        this.maoFP.rotation.set(-0.2, 0.5, 0.08);
        if (this.swingT > 0) {
          const g = 1 - this.swingT / 0.3; // 0→1 durante o golpe
          this.maoFP.rotation.x = -0.25 - Math.sin(g * Math.PI) * 1.15;
          this.maoFP.position.z = baseZ - Math.sin(g * Math.PI) * 0.18;
        } else if (this.entrada.minerando) {
          this.maoFP.rotation.x = -0.25 - Math.abs(Math.sin(performance.now() / 110)) * 0.55;
        }
      }
    } else this.maoFP.visible = false;
    // realce do bloco visado + progresso (nas câmaras com mira: 1ª, 3ª, ombro)
    if (this.mira && this.fase === "jogando" && (modo === "primeira" || modo === "terceira" || modo === "ombro")) {
      this.realce.visible = true;
      this.realce.position.set(this.mira.x + 0.5, this.mira.y + 0.5, this.mira.z + 0.5);
      const esc = 1 + Math.sin(performance.now() / 90) * 0.02 * (this.entrada.minerando ? 1 : 0);
      this.realce.scale.setScalar(this.progressoQuebra > 0 ? 1 - this.progressoQuebra * 0.12 : esc);
    } else this.realce.visible = false;

    this.acumFPS += dtSegundos; this.nFPS++;
    if (this.acumFPS > 0.5) { this.fps = Math.round(this.nFPS / this.acumFPS); this.acumFPS = 0; this.nFPS = 0; }
    this.renderer.render(this.cena, this.camara);
  }

  // ── Estado para a UI ────────────────────────────────────────
  captura(): Captura {
    return {
      fase: this.fase, modo: this.modo,
      vida: this.vida, fome: this.fome, ar: this.ar,
      dia: this.dia, horaFrac: this.horaFrac, noite: this.noite,
      pos: [this.px, this.py, this.pz], yaw: this.yaw,
      fps: this.fps, chunks: this.mundo?.chunks.size ?? 0, mobs: this.gestor?.mobs.filter((m) => m.vivo).length ?? 0,
      slots: this.inv.slots.map((s) => s ? { id: s.id, qtd: s.qtd } : null),
      selecao: this.inv.selecao,
      mesaPerto: this.mundo ? pertoDe(this.mundo, this.px, this.py, this.pz, B.MESA) : false,
      fornalhaPerto: this.mundo ? pertoDe(this.mundo, this.px, this.py, this.pz, B.FORNALHA) : false,
      mirando: this.mira ? { id: this.mira.id, nome: BLOCOS[this.mira.id]?.nome ?? "?", x: this.mira.x, y: this.mira.y, z: this.mira.z } : null,
      progressoQuebra: this.progressoQuebra,
      causaMorte: this.causaMorte,
      creditos: this.creditos, conquistas: [...this.conquistas],
      avisos: this.avisos.map((a) => ({ texto: a.texto, tipo: a.tipo })),
      ctaWhats: this.ctaWhats,
      primeiraPessoa: this.primeiraPessoa,
      camara: this.camaraModo,
      agachado: this.entrada.agachado,
      zoom: this.entrada.zoom,
      naEscada: this.naEscada,
      mobsDerrotados: this.mobsDerrotados,
      spawnDefinido: !!this.spawnProprio,
      naAgua: this.naAgua, voando: this.modo === "criativo" && this.criativoVoar,
      blocosQuebrados: this.blocosQuebrados, blocosColocados: this.blocosColocados,
      passos: Math.floor(this.animacaoAndar),
      // v29
      meteo: this.meteo,
      armadura: this.inv.armadura ? { id: this.inv.armadura.id, nome: NOMES[this.inv.armadura.id] ?? "Peitoral", reducao: this.inv.reducaoArmadura } : null,
      bauAberto: this.bauAberto ? { chave: this.bauAberto, slots: this.slotsBau(this.bauAberto).map((s) => s ? { id: s.id, qtd: s.qtd } : null) } : null,
      tntAtivos: this.tntAcesas.length,
      plantacoes: this.plantas.size,
      // v32
      pesca: this.pescaEstado === "parado" ? null : { estado: this.pescaEstado, t: Math.round(this.pescaTimer * 10) / 10 },
      peixesPescados: this.peixesPescados,
    };
  }

  private emitirEstado(forcar = false) {
    const agora = performance.now();
    if (!forcar && agora - this.ultimoEstado < 200) return;
    this.ultimoEstado = agora;
    if (this.onEstado) this.onEstado(this.captura());
  }

  // ── Guardar / carregar ──────────────────────────────────────
  guardar() {
    if (!this.mundo || this.fase === "menu") return;
    try {
      const dados = {
        v: 3, semente: this.mundo.semente, modo: this.modo,
        pos: [this.px, this.py, this.pz], yaw: this.yaw, pitch: this.pitch,
        vida: this.vida, fome: this.fome, dia: this.dia, tempo: this.tempo,
        primeiraNoiteFeita: this.primeiraNoiteFeita,
        inv: this.inv.slots, selecao: this.inv.selecao,
        creditos: this.creditos, conquistas: this.conquistas,
        edits: Object.fromEntries(this.mundo.edits),
        blocosQuebrados: this.blocosQuebrados, blocosColocados: this.blocosColocados,
        spawn: this.spawnProprio, mobsDerrotados: this.mobsDerrotados,
        // v29: armadura · baús · plantações · meteorologia
        armadura: this.inv.armadura,
        baus: Object.fromEntries(this.baus),
        plantas: Object.fromEntries([...this.plantas.entries()].map(([k, v]) => [k, Math.round(v * 10) / 10])),
        meteo: this.meteo, meteoT: Math.round(this.meteoT),
      };
      localStorage.setItem("bateu_blocos_save", JSON.stringify(dados));
    } catch { /* armazenamento cheio — segue */ }
  }

  private lerSave(): any {
    try { return JSON.parse(localStorage.getItem("bateu_blocos_save") || "null"); } catch { return null; }
  }

  temSave(): boolean { return !!localStorage.getItem("bateu_blocos_save"); }
  apagarSave() { localStorage.removeItem("bateu_blocos_save"); }

  parar() {
    this.guardar();
    this.pararChuva();
    this.fase = "menu";
  }

  redimensionar() {
    if (!this.renderer) return;
    const c = this.renderer.domElement;
    const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camara.aspect = w / Math.max(1, h);
    this.camara.updateProjectionMatrix();
  }
}
