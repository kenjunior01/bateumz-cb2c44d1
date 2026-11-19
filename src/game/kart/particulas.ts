// ============================================================
// PARTÍCULAS DO BATEU KART — v69 (sistema de pool fixo)
// ────────────────────────────────────────────────────────────
// Fumo de derrapagem, chamas de turbo, poeira off-road, faíscas
// de golpe, confetti de chegada e brasas do vulcão — tudo num
// ÚNICO THREE.Points com física em CPU (pool round-robin: emitir
// por cima do mais velho, nunca aloca durante a corrida).
//
// Regras da casa:
// · SEGURO EM NODE — só matemática de THREE (vetores/buffers);
//   nada de window/WebGL no topo do módulo (as suítes importam-no
//   sem browser e provam emitir→atualizar→vivas→limpar).
// · HONESTO — `vivas()` devolve o número REAL de partículas com
//   vida > 0 (o E2E usa-o como prova de emissão).
// · HDR — cores com componentes > 1 alimentam o bloom (v69).
// ============================================================
import * as THREE from "three";

export interface OptsEmissao {
  x: number; y: number; z: number;          // origem
  vx: number; vy: number; vz: number;       // velocidade base
  espalhar?: number;                        // jitter da velocidade (±)
  n: number;                                // quantidade
  vida: number;                             // segundos (±25% por partícula)
  cor: number;                              // cor (0xRRGGBB; HDR aceita >1 por canal via setColor)
  cor2?: number;                            // 2.ª cor — mistura aleatória por partícula
  brilho?: number;                          // multiplicador HDR (1 = cor tal e qual)
  tamanho?: number;                         // raio base no mundo (0.4)
  gravidade?: number;                       // y (padrão -3.5)
  arrasto?: number;                         // exponencial por segundo (padrão 1.6)
}

const VERT = `
  attribute vec3 aCor;
  attribute float aTamanho;
  attribute float aAlpha;
  varying vec3 vCor;
  varying float vAlpha;
  void main() {
    vCor = aCor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aTamanho * (260.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = `
  varying vec3 vCor;
  varying float vAlpha;
  void main() {
    if (vAlpha <= 0.003) discard;
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    float suave = smoothstep(1.0, 0.35, r);
    gl_FragColor = vec4(vCor, vAlpha * suave);
  }
`;

export class Particulas {
  private capacidade: number;
  private cursor = 0;                       // round-robin — sobrescreve a mais velha
  private pos: Float32Array;
  private vel: Float32Array;
  private vidaMax: Float32Array;
  private vida: Float32Array;
  private grav: Float32Array;
  private arrast: Float32Array;
  private attrs: {
    pos: THREE.BufferAttribute;
    cor: THREE.BufferAttribute;
    tam: THREE.BufferAttribute;
    alpha: THREE.BufferAttribute;
  };
  readonly pontos: THREE.Points;
  private geometria: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private cA = new THREE.Color();
  private cB = new THREE.Color();
  private usados = 0;                       // slots já escritos desde o limpar() (atualizar() conta o valor exato)
  private _vivas = 0;

  constructor(capacidade = 460) {
    this.capacidade = Math.max(24, Math.floor(capacidade));
    const n = this.capacidade;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.vida = new Float32Array(n);
    this.vidaMax = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.arrast = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    this.attrs = {
      pos: new THREE.BufferAttribute(new Float32Array(n * 3), 3),
      cor: new THREE.BufferAttribute(new Float32Array(n * 3), 3),
      tam: new THREE.BufferAttribute(new Float32Array(n), 1),
      alpha: new THREE.BufferAttribute(new Float32Array(n), 1),
    };
    geo.setAttribute("position", this.attrs.pos);
    geo.setAttribute("aCor", this.attrs.cor);
    geo.setAttribute("aTamanho", this.attrs.tam);
    geo.setAttribute("aAlpha", this.attrs.alpha);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); // nunca culled de forma enganosa
    this.geometria = geo;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.pontos = new THREE.Points(geo, this.material);
    this.pontos.frustumCulled = false;
    for (let i = 0; i < n; i++) { this.attrs.tam.array[i] = 0; this.attrs.alpha.array[i] = 0; }
  }

  get vivas(): number { return this._vivas; }

  /** Emitte `n` partículas (round-robin — o excedente sobrescreve as mais velhas). */
  emitir(o: OptsEmissao): void {
    const n = Math.max(1, Math.min(o.n, this.capacidade));
    const esp = o.espalhar ?? 0;
    const brilho = o.brilho ?? 1;
    const tam = o.tamanho ?? 0.4;
    const grav = o.gravidade ?? -3.5;
    const arr = o.arrasto ?? 1.6;
    this.cA.setHex(o.cor).multiplyScalar(brilho);
    if (o.cor2 !== undefined) this.cB.setHex(o.cor2).multiplyScalar(brilho);
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacidade;
      const j3 = i * 3;
      this.pos[j3] = o.x; this.pos[j3 + 1] = o.y; this.pos[j3 + 2] = o.z;
      this.vel[j3] = o.vx + (Math.random() - 0.5) * 2 * esp;
      this.vel[j3 + 1] = o.vy + (Math.random() - 0.5) * 2 * esp;
      this.vel[j3 + 2] = o.vz + (Math.random() - 0.5) * 2 * esp;
      const v = o.vida * (0.75 + Math.random() * 0.5);
      this.vida[i] = v; this.vidaMax[i] = v;
      this.grav[i] = grav; this.arrast[i] = arr;
      const cc = o.cor2 !== undefined && Math.random() < 0.5 ? this.cB : this.cA;
      this.attrs.cor.array[j3] = cc.r; this.attrs.cor.array[j3 + 1] = cc.g; this.attrs.cor.array[j3 + 2] = cc.b;
      this.attrs.tam.array[i] = tam * (0.7 + Math.random() * 0.6);
      this.attrs.alpha.array[i] = 0.9;
    }
    this.usados = Math.min(this.capacidade, this.usados + n);
    this._vivas = Math.max(this._vivas, this.usados);
    this.attrs.pos.needsUpdate = true;
    this.attrs.cor.needsUpdate = true;
    this.attrs.tam.needsUpdate = true;
    this.attrs.alpha.needsUpdate = true;
  }

  /** Física em CPU: gravidade, arrasto exponencial, fade-in/out por vida. */
  atualizar(dt: number): void {
    const d = Math.max(0, Math.min(dt, 0.25));
    let vivas = 0;
    const { array: pa } = this.attrs.pos;
    const { array: aa } = this.attrs.alpha;
    const { array: ta } = this.attrs.tam;
    for (let i = 0; i < this.capacidade; i++) {
      if (this.vida[i] <= 0) { if (aa[i] !== 0) aa[i] = 0; continue; }
      this.vida[i] -= d;
      const j3 = i * 3;
      if (this.vida[i] <= 0) { aa[i] = 0; ta[i] = 0; this.vida[i] = 0; continue; }
      const fator = Math.exp(-this.arrast[i] * d);
      this.vel[j3] *= fator;
      this.vel[j3 + 1] = this.vel[j3 + 1] * fator + this.grav[i] * d;
      this.vel[j3 + 2] *= fator;
      this.pos[j3] += this.vel[j3] * d;
      this.pos[j3 + 1] += this.vel[j3 + 1] * d;
      this.pos[j3 + 2] += this.vel[j3 + 2] * d;
      pa[j3] = this.pos[j3]; pa[j3 + 1] = this.pos[j3 + 1]; pa[j3 + 2] = this.pos[j3 + 2];
      const fr = this.vida[i] / this.vidaMax[i];
      // fade: nasce a 0.85, morre a 0 — curva quadrática suave
      aa[i] = 0.85 * fr * fr;
      vivas++;
    }
    this._vivas = vivas;
    this.attrs.pos.needsUpdate = true;
    this.attrs.alpha.needsUpdate = true;
    this.attrs.tam.needsUpdate = true;
  }

  /** Limpa TUDO (nova corrida). */
  limpar(): void {
    this.vida.fill(0);
    this.attrs.alpha.array.fill(0);
    this.attrs.tam.array.fill(0);
    this.usados = 0;
    this._vivas = 0;
    this.attrs.alpha.needsUpdate = true;
    this.attrs.tam.needsUpdate = true;
  }

  dispose(): void {
    this.geometria.dispose();
    this.material.dispose();
  }
}
