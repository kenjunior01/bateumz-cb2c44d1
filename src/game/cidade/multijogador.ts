// Cidade Bateu — cliente de presença partilhada (v37 — N3 completo)
// Padrões do estudo Veloren (docs/REA-veloren-estudo-v36.md): mensagens nomeadas
// (common/net/src/msg/*), interpolação, reconexão honesta, throttle por distância
// no servidor. v37: regras vindas do CORE ISOMÓRFICO (padrão `common` — a mesma
// validaMovimento/limpaFala que o servidor executa), chat da praça com bolha de
// fala e reconciliação honesta (`corrigido` → aviso + ajuste). Zero código
// Veloren. Sem servidor, o jogo fica 100% local como antes (nunca finge MP).

import * as THREE from "three";
import { ALTURA_PLATEAU, FALA_RATE_MS, limpaFala } from "./core";

export type EstadoMP = "off" | "a_ligar" | "ligado" | "erro";

interface Remoto {
  id: number; nome: string;
  x: number; z: number; ry: number;         // posição interpolada (render)
  alvoX: number; alvoZ: number; alvoRy: number; // último estado do servidor
  vistoEm: number;
  grupo: THREE.Group; etiqueta: THREE.Sprite;
}

const CORES_AVATAR = [0x2dd4bf, 0xf59e0b, 0xa78bfa, 0xf87171, 0x34d399, 0x60a5fa];

function etiquetaNome(nome: string): THREE.Sprite {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 64;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgba(10,10,20,0.72)";
  ctx.roundRect?.(8, 8, 240, 48, 14);
  ctx.fill();
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(nome.slice(0, 16), 128, 33);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(1.9, 0.48, 1);
  spr.renderOrder = 5;
  return spr;
}

function avatar(cor: number): THREE.Group {
  const g = new THREE.Group();
  const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  // pernas
  const pernas = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.3), mat(0x2b2b3a));
  pernas.position.y = 0.36;
  // corpo
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), mat(cor));
  corpo.position.y = 1.08;
  // cabeça
  const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.44), mat(0xe8c39e));
  cabeca.position.y = 1.66;
  g.add(pernas, corpo, cabeca);
  return g;
}

const lerpAng = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Bolha de fala (canvas → sprite) — igual ao padrão das etiquetas, 100% local. */
function bolhaFala(texto: string): THREE.Sprite {
  const t = texto.slice(0, 140);
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 160;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.roundRect?.(10, 10, 492, 116, 22);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(236, 124); ctx.lineTo(256, 152); ctx.lineTo(276, 124); ctx.closePath();
  ctx.fill();
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillStyle = "#0f172a"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const palavras = t.split(" ");
  const linhas: string[] = [];
  let linha = "";
  for (const p of palavras) {
    const teste = linha ? `${linha} ${p}` : p;
    if (ctx.measureText(teste).width > 460 && linha) { linhas.push(linha); linha = p; } else linha = teste;
    if (linhas.length === 3) break;
  }
  if (linhas.length < 3 && linha) linhas.push(linha);
  linhas.forEach((l, i) => ctx.fillText(l, 256, 40 + i * 34));
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(2.9, 0.9, 1);
  spr.renderOrder = 6;
  return spr;
}

export interface FalaInfo { id: number; nome: string; texto: string; em: number }

export class CidadeMP {
  estado: EstadoMP = "off";
  private ws: WebSocket | null = null;
  private remotos = new Map<number, Remoto>();
  private falas: FalaInfo[] = [];               // histórico local (últimas 12)
  private bolhas = new Map<number, { spr: THREE.Sprite; ate: number }>();
  private url = ""; private nome = "";
  private tentativa = 0; private queroLigado = false;
  private timerRecon: ReturnType<typeof setTimeout> | null = null;
  private ultimoPosMs = 0;
  private ultimaFalaLocal = 0;
  private agora = () => performance.now();

  constructor(private opts: {
    alturaEm: (x: number, z: number) => number;
    onEstado: (e: EstadoMP, info?: string) => void;
    onAviso: (texto: string) => void;
    onFala?: (f: FalaInfo) => void;              // v37 — chat da praça
    onCorrecao?: (x: number, z: number) => void; // v37 — reconciliação honesta
  }) {}

  ligar(url: string, nome: string) {
    if (this.queroLigado) this.desligar(); // religar limpo
    this.queroLigado = true;
    this.url = url; this.nome = nome;
    this.tentativa = 0;
    this.conectar();
  }

  private setEstado(e: EstadoMP, info?: string) {
    this.estado = e;
    this.opts.onEstado(e, info);
  }

  private conectar() {
    if (!this.queroLigado) return;
    this.setEstado(this.tentativa === 0 ? "a_ligar" : "a_ligar", this.tentativa > 0 ? `tentativa ${this.tentativa + 1}` : undefined);
    let ws: WebSocket;
    try { ws = new WebSocket(this.url); } catch { this.agendarRecon(); return; }
    this.ws = ws;
    const guarda = this; // closures abaixo usam a instância viva

    ws.onopen = () => {
      ws.send(JSON.stringify({ t: "ola", nome: guarda.nome }));
    };
    ws.onmessage = (ev) => {
      let m: any;
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (m.t === "rejeitado") { guarda.setEstado("erro", m.motivo === "cheio" ? "mundo cheio" : "recusado"); guarda.queroLigado = false; try { ws.close(); } catch { /* ignore */ } return; }
      if (m.t === "bemvindo") {
        guarda.tentativa = 0;
        guarda.setEstado("ligado");
        for (const j of m.jogadores ?? []) guarda.criarRemoto(j.id, j.nome, j.x, j.z, j.ry);
        guarda.opts.onAviso(`🌐 ${guarda.nome} entrou na cidade partilhada`);
        return;
      }
      if (m.t === "entrou") { guarda.criarRemoto(m.id, m.nome, 0, 0, 0); guarda.opts.onAviso(`🌐 ${m.nome} chegou à cidade`); return; }
      if (m.t === "saiu") { guarda.removerRemoto(m.id); return; }
      if (m.t === "corrigido") {
        // v37 — o servidor cortou um salto ilegal: ajusta a posição local com aviso
        if (typeof m.x === "number" && typeof m.z === "number" && Number.isFinite(m.x) && Number.isFinite(m.z))
          guarda.opts.onCorrecao?.(m.x, m.z);
        return;
      }
      if (m.t === "fala") {
        const texto = limpaFala(m.texto);
        if (!texto || typeof m.nome !== "string") return; // sanitiza MESMO vindo do servidor
        const f: FalaInfo = { id: Number(m.id) || 0, nome: m.nome.slice(0, 24), texto, em: Date.now() };
        guarda.falas.push(f);
        if (guarda.falas.length > 12) guarda.falas.shift();
        guarda.opts.onFala?.(f);
        const r = guarda.remotos.get(f.id);
        if (r) guarda.mostrarBolha(f.id, texto);
        return;
      }
      if (m.t === "estado") {
        for (const j of m.jogadores ?? []) {
          const r = guarda.remotos.get(j.id);
          if (r) { r.alvoX = j.x; r.alvoZ = j.z; r.alvoRy = j.ry; r.vistoEm = Date.now(); }
          else guarda.criarRemoto(j.id, j.nome, j.x, j.z, j.ry);
        }
        return;
      }
    };
    ws.onclose = () => {
      if (guarda.ws !== ws) return; // ligação velha
      guarda.ws = null;
      for (const id of [...guarda.remotos.keys()]) guarda.removerRemoto(id);
      if (!guarda.queroLigado) { guarda.setEstado("off"); return; }
      guarda.setEstado("erro");
      guarda.agendarRecon();
    };
    ws.onerror = () => { /* o onclose trata — evita duplicar aviso */ };
  }

  private agendarRecon() {
    if (!this.queroLigado || this.timerRecon) return;
    this.tentativa++;
    const espera = Math.min(15000, 2000 * this.tentativa);
    this.timerRecon = setTimeout(() => { this.timerRecon = null; this.conectar(); }, espera);
  }

  private criarRemoto(id: number, nome: string, x: number, z: number, ry: number) {
    if (this.remotos.has(id)) return;
    const grupo = avatar(CORES_AVATAR[id % CORES_AVATAR.length]);
    const etiqueta = etiquetaNome(nome);
    etiqueta.position.y = 2.35;
    grupo.add(etiqueta);
    this.remotos.set(id, {
      id, nome: String(nome ?? "Viajante"), x, z, ry, alvoX: x, alvoZ: z, alvoRy: ry,
      vistoEm: Date.now(), grupo, etiqueta,
    });
    this.aplicarY(this.remotos.get(id)!);
  }

  private aplicarY(r: Remoto) {
    let y = ALTURA_PLATEAU;
    try { y = this.opts.alturaEm(r.x, r.z); } catch { /* fallback altura da praça */ }
    r.grupo.position.set(r.x, y, r.z);
  }

  private removerRemoto(id: number) {
    const r = this.remotos.get(id);
    if (!r) return;
    this.removerBolha(id);
    r.grupo.removeFromParent();
    r.etiqueta.material.map?.dispose();
    r.etiqueta.material.dispose();
    r.grupo.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m.dispose();
      }
    });
    this.remotos.delete(id);
  }

  // ── v37 — chat da praça ──────────────────────────────
  private mostrarBolha(id: number, texto: string) {
    const r = this.remotos.get(id);
    if (!r) return;
    this.removerBolha(id);
    const spr = bolhaFala(texto);
    spr.position.y = 2.95;
    r.grupo.add(spr);
    this.bolhas.set(id, { spr, ate: Date.now() + 4000 });
  }

  private removerBolha(id: number) {
    const b = this.bolhas.get(id);
    if (!b) return;
    b.spr.removeFromParent();
    b.spr.material.map?.dispose();
    b.spr.material.dispose();
    this.bolhas.delete(id);
  }

  /** envia fala (sanitizada aqui e no servidor) · false = limitada/vazia — honesto */
  falar(texto: string): boolean {
    const limpo = limpaFala(texto);
    if (!limpo) return false;
    const agora = Date.now();
    if (agora - this.ultimaFalaLocal < FALA_RATE_MS) return false; // mesma regra do servidor
    if (!this.ws || this.ws.readyState !== 1 || this.estado !== "ligado") return false;
    this.ultimaFalaLocal = agora;
    try { this.ws.send(JSON.stringify({ t: "fala", texto: limpo })); return true; } catch { return false; }
  }

  falasInfo(): FalaInfo[] { return [...this.falas]; }

  /** chamado a cada frame com a posição do jogador LOCAL (que continua predito no cliente) */
  passo(dt: number, meuX: number, meuZ: number, meuRy: number) {
    const agora = Date.now();
    // envio a ~10 Hz (servidor faz snapshot 10 Hz + throttle por distância)
    if (this.ws && this.ws.readyState === 1 && agora - this.ultimoPosMs > 100) {
      this.ultimoPosMs = agora;
      try { this.ws.send(JSON.stringify({ t: "pos", x: Math.round(meuX * 100) / 100, z: Math.round(meuZ * 100) / 100, ry: Math.round(meuRy * 100) / 100 })); } catch { /* ignora */ }
    }
    // bolhas expiradas saem (4 s de vida honesta)
    for (const [id, b] of this.bolhas) if (agora > b.ate) this.removerBolha(id);
    // interpolação suave (buffer implícito: alvo vem a 10 Hz, render a 60)
    const k = Math.min(1, dt * 8);
    const vistos = new Set<number>();
    for (const [id, r] of this.remotos) {
      if (agora - r.vistoEm > 15000) { this.removerRemoto(id); continue; } // sem news = fantasma sai
      vistos.add(id);
      r.x += (r.alvoX - r.x) * k;
      r.z += (r.alvoZ - r.z) * k;
      r.ry = lerpAng(r.ry, r.alvoRy, k);
      r.grupo.rotation.y = r.ry;
      this.aplicarY(r);
    }
  }

  remotosInfo() {
    return [...this.remotos.values()].map((r) => ({ id: r.id, nome: r.nome, x: Math.round(r.x * 10) / 10, z: Math.round(r.z * 10) / 10 }));
  }

  get nNoMundo() { return this.remotos.size + (this.estado === "ligado" ? 1 : 0); }

  desligar() {
    this.queroLigado = false;
    if (this.timerRecon) { clearTimeout(this.timerRecon); this.timerRecon = null; }
    if (this.ws) { try { this.ws.close(); } catch { /* ignore */ } this.ws = null; }
    for (const id of [...this.remotos.keys()]) this.removerRemoto(id);
    for (const id of [...this.bolhas.keys()]) this.removerBolha(id);
    this.falas = [];
    this.setEstado("off");
  }
}
