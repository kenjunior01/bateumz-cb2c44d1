// ============================================================
// BATEUCRAFT — Ruído procedural original (value noise + fBm)
// Sem dependências externas, determinístico por semente.
// ============================================================

export class Ruido {
  private perm: Uint8Array;

  constructor(semente: number) {
    // PRNG mulberry32 — tabela de permutação embaralhada
    let a = semente >>> 0;
    const rnd = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private hash2(x: number, y: number): number {
    return this.perm[(this.perm[x & 255] + y) & 255] / 255;
  }
  private hash3(x: number, y: number, z: number): number {
    return this.perm[(this.perm[(this.perm[x & 255] + y) & 255] + z) & 255] / 255;
  }

  private static fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
  private static lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  /** Ruído 2D suave em [0,1] */
  n2(x: number, y: number): number {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = Ruido.fade(xf), v = Ruido.fade(yf);
    const a = this.hash2(xi, yi), b = this.hash2(xi + 1, yi);
    const c = this.hash2(xi, yi + 1), d = this.hash2(xi + 1, yi + 1);
    return Ruido.lerp(Ruido.lerp(a, b, u), Ruido.lerp(c, d, u), v);
  }

  /** Ruído 3D suave em [0,1] */
  n3(x: number, y: number, z: number): number {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = Ruido.fade(xf), v = Ruido.fade(yf), w = Ruido.fade(zf);
    const l = Ruido.lerp;
    const c000 = this.hash3(xi, yi, zi), c100 = this.hash3(xi + 1, yi, zi);
    const c010 = this.hash3(xi, yi + 1, zi), c110 = this.hash3(xi + 1, yi + 1, zi);
    const c001 = this.hash3(xi, yi, zi + 1), c101 = this.hash3(xi + 1, yi, zi + 1);
    const c011 = this.hash3(xi, yi + 1, zi + 1), c111 = this.hash3(xi + 1, yi + 1, zi + 1);
    return l(
      l(l(c000, c100, u), l(c010, c110, u), v),
      l(l(c001, c101, u), l(c011, c111, u), v), w);
  }

  /** fBm 2D — octaves de ruído somadas, resultado em [0,1] */
  fbm2(x: number, y: number, octavas = 4, persistencia = 0.5): number {
    let amp = 1, freq = 1, soma = 0, norm = 0;
    for (let i = 0; i < octavas; i++) {
      soma += this.n2(x * freq, y * freq) * amp;
      norm += amp; amp *= persistencia; freq *= 2;
    }
    return soma / norm;
  }
}

// PRNG determinístico reutilizável (geração de árvores, mobs, drops)
export class Aleatorio {
  private a: number;
  constructor(semente: number) { this.a = (semente >>> 0) || 1; }
  proximo(): number {
    let t = (this.a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  intervalo(min: number, max: number): number { return min + this.proximo() * (max - min); }
  inteiro(min: number, max: number): number { return Math.floor(this.intervalo(min, max + 1)); }
  chance(p: number): boolean { return this.proximo() < p; }
}
