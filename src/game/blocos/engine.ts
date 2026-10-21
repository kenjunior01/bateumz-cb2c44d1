// ============================================================
// BATEUCRAFT — Motor principal
// Física · raycast DDA · quebrar/colocar · sobrevivência ·
// dia/noite · chunks dinâmicos · save · ganchos __blocos (E2E)
// ============================================================

import * as THREE from "three";
import { Mundo } from "./world";
import { GestorMobs, Mob } from "./mobs";
import { Inventario, avaliarReceitas, criarReceita, pertoDe } from "./inventario";
import { Receita } from "./constants";
import { criarMinifig, criarItemMao, AvatarLego } from "./lego";
import { Aleatorio } from "./noise";
import {
  B, BLOCOS, CHUNK, GRAVIDADE, SALTO, VEL_ANDAR, VEL_CORRER,
  VIDA_MAX, FOME_MAX, AR_MAX, DIA_SEGUNDOS, ALCANCE, RAIO_EXPLOSAO,
  dropDe, CORES, ITENS, CONQUISTAS, I,
} from "./constants";

export type Modo = "sobrevivencia" | "criativo";
export type Fase = "menu" | "jogando" | "morto" | "pausa";

export interface Entrada {
  frente: number; lado: number;      // joystick / teclas (-1..1)
  olharX: number; olharY: number;    // delta acumulado (radianos)
  salto: boolean; correr: boolean; subir: boolean; descer: boolean;
  minerando: boolean;
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
  blocosQuebrados: number; blocosColocados: number;
  passos: number;
}

interface Aviso { texto: string; tipo: "conquista" | "info" | "dano"; t: number }

const RAIO_RENDER = 3;

export class Motor {
  fase: Fase = "menu";
  modo: Modo = "sobrevivencia";
  mundo!: Mundo; gestor!: GestorMobs;
  inv = new Inventario();
  rnd = new Aleatorio(12345);

  // cena
  renderer!: THREE.WebGLRenderer; cena = new THREE.Scene();
  camara = new THREE.PerspectiveCamera(75, 1, 0.1, 400);
  sol!: THREE.DirectionalLight; ambiente!: THREE.HemisphereLight;
  realce!: THREE.LineSegments; avatar!: AvatarLego;
  luzTocha!: THREE.PointLight;

  // jogador
  px = 0; py = 40; pz = 0; vx = 0; vy = 0; vz = 0;
  yaw = 0; pitch = 0; noChao = false; naAgua = false; cabecaAgua = false;
  vida = VIDA_MAX; fome = FOME_MAX; ar = AR_MAX;
  tempo = DIA_SEGUNDOS * 0.25; // começa de manhã
  dia = 1; primeiraNoiteFeita = false;
  causaMorte = "";
  primeiraPessoa = true;

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

  // internals
  entrada: Entrada = { frente: 0, lado: 0, olharX: 0, olharY: 0, salto: false, correr: false, subir: false, descer: false, minerando: false };
  private relogioUltimo = 0; private acumFPS = 0; private nFPS = 0; fps = 60;
  private ultimoEstado = 0; private ultimoSave = 0; private animacaoAndar = 0;
  onEstado: ((c: Captura) => void) | null = null;
  morteRecente = 0;
  atacarPedido = false; colocarPedido = false; comerPedido = false;
  criativoVoar = false;

  // ── Arranque ─────────────────────────────────────────────────
  iniciar(canvas: HTMLCanvasElement, modo: Modo, carregar = false) {
    this.modo = modo;
    const guardado = carregar ? this.lerSave() : null;
    const semente = guardado?.semente ?? (Date.now() % 1000000);
    const mundoAnterior = this.mundo; // para limpar da cena depois
    this.mundo = new Mundo(semente);
    this.gestor = new GestorMobs(this.mundo, semente);
    this.rnd = new Aleatorio(semente + 777);

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.cena.fog = new THREE.Fog(0x87ceeb, 30, 90);
      this.sol = new THREE.DirectionalLight(0xffffff, 1.4);
      this.ambiente = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.85);
      this.cena.add(this.sol, this.ambiente);
      this.luzTocha = new THREE.PointLight(0xffb050, 0, 9, 1.6);
      this.cena.add(this.luzTocha);
      // caixa de realce do bloco visado
      const caixa = new THREE.BoxGeometry(1.002, 1.002, 1.002);
      this.realce = new THREE.LineSegments(caixa, new THREE.LineBasicMaterial({ color: 0x101010, transparent: true, opacity: 0.7 }));
      this.realce.visible = false;
      this.cena.add(this.realce);
      this.mundo.grupo.name = "mundo";
      this.cena.add(this.mundo.grupo);
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
      for (const [k, v] of Object.entries(guardado.edits ?? {})) this.mundo.edits.set(k, v as number);
      [this.px, this.py, this.pz] = guardado.pos;
      this.yaw = guardado.yaw ?? 0; this.pitch = guardado.pitch ?? 0;
    } else {
      const [sx, sy, sz] = this.mundo.spawnPos();
      this.px = sx; this.py = sy; this.pz = sz;
      this.vida = VIDA_MAX; this.fome = FOME_MAX; this.ar = AR_MAX;
      this.inv.limpar();
      if (modo === "criativo") {
        // kit criativo: blocos básicos infinitos tratados no colocar
        this.inv.adicionar(B.TABUAS, 64); this.inv.adicionar(B.PEDRA, 64);
        this.inv.adicionar(B.VIDRO, 64); this.inv.adicionar(B.TOCHA, 64);
      } else {
        this.inv.adicionar(I.MACA, 2); // arranque gentil
      }
    }

    // avatar LEGO do jogador
    if (this.avatar) this.cena.remove(this.avatar.grupo);
    if (mundoAnterior) this.cena.remove(mundoAnterior.grupo); // mundo anterior (novo jogo)
    const prefs = this.lerPreferencias();
    this.avatar = criarMinifig({ torso: prefs.torso, pernas: prefs.pernas, chapeu: prefs.chapeu, corChapeu: prefs.corChapeu });
    this.avatar.grupo.visible = false;
    this.cena.add(this.avatar.grupo);

    // gerar chunks iniciais
    const cx = Math.floor(this.px / CHUNK), cz = Math.floor(this.pz / CHUNK);
    for (let dx = -RAIO_RENDER; dx <= RAIO_RENDER; dx++)
      for (let dz = -RAIO_RENDER; dz <= RAIO_RENDER; dz++) {
        const c = this.mundo.garantir(cx + dx, cz + dz);
        this.mundo.construirMalha(c);
      }
    // garantir chão sólido no spawn
    while (this.mundo.solido(this.px, this.py, this.pz) || this.mundo.solido(this.px, this.py + 0.5, this.pz)) this.py += 1;

    this.fase = "jogando";
    this.emitirEstado(true);
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

  private atualizarCeu() {
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
    this.cena.background = new THREE.Color(cor);
    (this.cena.fog as THREE.Fog).color = new THREE.Color(cor);
    const luzDia = this.noite ? 0.16 : f > 0.45 && f < 0.55 ? 0.7 : 1.35;
    this.sol.intensity = luzDia;
    this.ambiente.intensity = this.noite ? 0.3 : 0.85;
    const ang = f * Math.PI * 2 - Math.PI / 2;
    this.sol.position.set(Math.cos(ang) * 60, Math.abs(Math.sin(ang)) * 80 + 10, 30);
    // tocha na mão ilumina
    const s = this.inv.selecionado();
    const comTocha = s && s.id === B.TOCHA;
    this.luzTocha.intensity = comTocha ? 1.4 : 0;
    this.luzTocha.position.set(this.px, this.py + 1.4, this.pz);
  }

  // ── Raycast DDA voxel ────────────────────────────────────────
  private raycast(): { x: number; y: number; z: number; id: number } | null {
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch),
    ).normalize();
    let x = Math.floor(this.px), y = Math.floor(this.py + 1.62), z = Math.floor(this.pz);
    const passo = new THREE.Vector3(Math.abs(dir.x) < 1e-9 ? 1e9 : Math.abs(1 / dir.x),
      Math.abs(dir.y) < 1e-9 ? 1e9 : Math.abs(1 / dir.y),
      Math.abs(dir.z) < 1e-9 ? 1e9 : Math.abs(1 / dir.z));
    const sinal = [dir.x < 0 ? -1 : 1, dir.y < 0 ? -1 : 1, dir.z < 0 ? -1 : 1];
    let tMaxX = (sinal[0] > 0 ? (x + 1 - this.px) : (this.px - x)) * passo.x;
    let tMaxY = (sinal[1] > 0 ? (y + 1 - (this.py + 1.62)) : ((this.py + 1.62) - y)) * passo.y;
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
    this.mundo.setBloco(x, y, z, B.AR);
    this.blocosQuebrados++;
    this.som("quebrar");
    this.fome = Math.max(0, this.fome - 0.02);
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
    // mob morto por bloco removido? não aplicável
  }

  colocar() {
    if (this.fase !== "jogando" || !this.mira) return;
    const s = this.inv.selecionado();
    if (!s || s.id >= 100) return;
    // posição adjacente = bloco visado + face atingida
    const x = this.mira.x + this.ultimaFace[0];
    const y = this.mira.y + this.ultimaFace[1];
    const z = this.mira.z + this.ultimaFace[2];
    if (y < 0 || y >= 80) return;
    if (this.mundo.getBloco(x, y, z) !== B.AR && this.mundo.getBloco(x, y, z) !== B.AGUA) return;
    // não colocar dentro do jogador
    if (this.colideComJogador(x, y, z)) return;
    if (this.modo === "sobrevivencia") this.inv.consumirSelecionado(1);
    this.mundo.setBloco(x, y, z, s.id);
    this.blocosColocados++;
    this.som("colocar");
    this.emitirEstado(true);
  }

  private colideComJogador(x: number, y: number, z: number): boolean {
    const pxMin = this.px - 0.3, pxMax = this.px + 0.3;
    const pzMin = this.pz - 0.3, pzMax = this.pz + 0.3;
    const pyMin = this.py, pyMax = this.py + 1.8;
    return x + 1 > pxMin && x < pxMax && z + 1 > pzMin && z < pzMax && y + 1 > pyMin && y < pyMax;
  }

  atacar(): Mob | null {
    if (this.fase !== "jogando") return null;
    const s = this.inv.selecionado();
    const item = s ? ITENS[s.id] : undefined;
    const dano = item?.dano ?? 1;
    const mob = this.gestor.atacar(this.px, this.py + 1.2, this.pz, this.yaw, 3.4, dano);
    if (mob) {
      this.som("golpe");
      if (mob.tipo === "estourador" && !mob.vivo) this.conquista("estourador_derrotado");
      if (!mob.vivo) {
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
  som(tipo: "quebrar" | "colocar" | "golpe" | "comer" | "criar" | "conquista" | "dano" | "passo" | "sibilo" | "explosao") {
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

    // direção de movimento relativa ao yaw
    const velBase = this.entrada.correr ? VEL_CORRER : VEL_ANDAR;
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

    if (this.modo === "criativo" && (this.criativoVoar || !this.noChao && this.entrada.salto)) {
      // voo criativo
      const vVert = (this.entrada.salto || this.entrada.subir ? 1 : 0) - (this.entrada.descer ? 1 : 0);
      this.vy = vVert * velBase * 1.2;
    } else if (this.naAgua) {
      this.vy -= GRAVIDADE * 0.28 * dt;
      if (this.vy < -2.2) this.vy = -2.2;
      if (this.entrada.salto) this.vy = 3.4;
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

    // passos somam fome
    const andou = Math.hypot(this.vx, this.vz) * dt;
    if (andou > 0.001) { this.animacaoAndar += andou * 2.2; this.passosAcumulados += andou; }
    if (this.passosAcumulados > 1.6) { this.passosAcumulados = 0; if (this.modo === "sobrevivencia") this.fome = Math.max(0, this.fome - 0.015); }
  }
  private passosAcumulados = 0;

  receberDano(qtd: number, causa: string) {
    if (this.modo === "criativo" || this.fase !== "jogando") return;
    this.vida -= qtd;
    this.avisos.push({ texto: `-${qtd} ${causa === "queda" ? "de queda" : causa === "afogamento" ? "afogamento" : ""}`, tipo: "dano", t: 1.2 });
    this.som("dano");
    if (this.vida <= 0) {
      this.vida = 0;
      this.fase = "morto";
      this.causaMorte = causa === "queda" ? "Caiste de alto" : causa === "afogamento" ? "Afogaste-te" :
        causa === "fome" ? "Morreste de fome" : causa === "explosao" ? "Um Estourador apanhou-te" :
          causa === "vazio" ? "Caiste para fora do mundo" : "Foste derrotado";
      this.morteRecente = 1;
      this.emitirEstado(true); // UI reage de imediato
    }
  }

  renascer() {
    const [sx, sy, sz] = this.mundo.spawnPos();
    this.px = sx; this.py = sy; this.pz = sz;
    this.vx = this.vy = this.vz = 0;
    this.vida = VIDA_MAX; this.fome = FOME_MAX; this.ar = AR_MAX;
    this.fase = "jogando";
    this.emitirEstado(true);
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
    for (let r = 0; r <= RAIO_RENDER && orcamento > 0; r++) {
      for (let dx = -r; dx <= r && orcamento > 0; dx++) for (let dz = -r; dz <= r && orcamento > 0; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const c = this.mundo.garantir(cx + dx, cz + dz);
        if (c.sujo || !c.malha) { this.mundo.construirMalha(c); orcamento--; }
      }
    }
    // descarregar longe
    for (const [k, c] of this.mundo.chunks) {
      if (Math.max(Math.abs(c.cx - cx), Math.abs(c.cz - cz)) > RAIO_RENDER + 2) {
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

      this.fisica(dt);
      this.sobrevivencia(dt);
      this.mira = this.raycast();
      this.executarQuebra(dt);
      if (this.atacarPedido) { this.atacar(); this.atacarPedido = false; }
      if (this.colocarPedido) { this.colocar(); this.colocarPedido = false; }
      if (this.comerPedido) { this.comer(); this.comerPedido = false; }

      // mobs
      const r = this.gestor.atualizar(dt, this.px, this.py, this.pz, this.noite);
      if (r.dano > 0) this.receberDano(r.dano, r.fonte === "zumbi" ? "zumbi" : "mob");
      this.gestor.tentarSpawns(dt, this.noite, this.px, this.pz);
      this.gestor.limparDistante(this.px, this.pz);
      if (this.gestor.explosaoPendente) {
        const e = this.gestor.explosaoPendente;
        this.gestor.explosaoPendente = null;
        this.mundo.explodir(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z), this.rnd);
        this.som("explosao");
        const d = Math.hypot(this.px - e.x, this.py - e.y, this.pz - e.z);
        if (d < RAIO_EXPLOSAO + 2) {
          this.receberDano(Math.round((1 - d / (RAIO_EXPLOSAO + 2)) * 14), "explosao");
          this.vx += (this.px - e.x) * 2; this.vy += 5; this.vz += (this.pz - e.z) * 2;
        }
      }
    }

    this.atualizarCeu();
    this.atualizarChunks();

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

  // ── Render ──────────────────────────────────────────────────
  render(dtSegundos: number) {
    // câmara
    const olhoY = this.py + 1.62;
    if (this.primeiraPessoa) {
      this.camara.position.set(this.px, olhoY, this.pz);
      this.camara.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      if (this.avatar) this.avatar.grupo.visible = false;
    } else {
      const boom = 4.2;
      const dir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      let dist = boom;
      for (let t = 0.4; t <= boom; t += 0.25) {
        const cx = this.px + dir.x * t, cy = olhoY + dir.y * t, cz = this.pz + dir.z * t;
        if (this.mundo.solido(cx, cy, cz)) { dist = t - 0.3; break; }
      }
      this.camara.position.set(this.px + dir.x * dist, olhoY + dir.y * dist, this.pz + dir.z * dist);
      this.camara.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      if (this.avatar) {
        this.avatar.grupo.visible = this.fase !== "menu";
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
    // realce do bloco visado + progresso
    if (this.mira && this.fase === "jogando") {
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
      blocosQuebrados: this.blocosQuebrados, blocosColocados: this.blocosColocados,
      passos: Math.floor(this.animacaoAndar),
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
        v: 1, semente: this.mundo.semente, modo: this.modo,
        pos: [this.px, this.py, this.pz], yaw: this.yaw, pitch: this.pitch,
        vida: this.vida, fome: this.fome, dia: this.dia, tempo: this.tempo,
        primeiraNoiteFeita: this.primeiraNoiteFeita,
        inv: this.inv.slots, selecao: this.inv.selecao,
        creditos: this.creditos, conquistas: this.conquistas,
        edits: Object.fromEntries(this.mundo.edits),
        blocosQuebrados: this.blocosQuebrados, blocosColocados: this.blocosColocados,
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
