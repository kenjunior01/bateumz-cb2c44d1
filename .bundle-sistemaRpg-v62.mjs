// src/game/blocos/noise.ts
var Ruido = class _Ruido {
  perm;
  constructor(semente) {
    let a = semente >>> 0;
    const rnd = () => {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  hash2(x, y) {
    return this.perm[this.perm[x & 255] + y & 255] / 255;
  }
  /** Hash determinístico POR COLUNA (inteiro) — sem suavização.
   *  Usado para árvores/decorações: o mesmo (x,z)+semente dá SEMPRE
   *  o mesmo resultado, independentemente da ordem em que os chunks
   *  são gerados (corrige mundos diferentes entre sessões). */
  hashCol(x, z, sal = 0) {
    const xi = x + sal * 37 | 0, zi = z - sal * 91 | 0;
    return this.perm[this.perm[xi & 255] + zi & 255] / 255;
  }
  hash3(x, y, z) {
    return this.perm[this.perm[this.perm[x & 255] + y & 255] + z & 255] / 255;
  }
  static fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }
  /** Ruído 2D suave em [0,1] */
  n2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = _Ruido.fade(xf), v = _Ruido.fade(yf);
    const a = this.hash2(xi, yi), b = this.hash2(xi + 1, yi);
    const c = this.hash2(xi, yi + 1), d = this.hash2(xi + 1, yi + 1);
    return _Ruido.lerp(_Ruido.lerp(a, b, u), _Ruido.lerp(c, d, u), v);
  }
  /** Ruído 3D suave em [0,1] */
  n3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = _Ruido.fade(xf), v = _Ruido.fade(yf), w = _Ruido.fade(zf);
    const l = _Ruido.lerp;
    const c000 = this.hash3(xi, yi, zi), c100 = this.hash3(xi + 1, yi, zi);
    const c010 = this.hash3(xi, yi + 1, zi), c110 = this.hash3(xi + 1, yi + 1, zi);
    const c001 = this.hash3(xi, yi, zi + 1), c101 = this.hash3(xi + 1, yi, zi + 1);
    const c011 = this.hash3(xi, yi + 1, zi + 1), c111 = this.hash3(xi + 1, yi + 1, zi + 1);
    return l(
      l(l(c000, c100, u), l(c010, c110, u), v),
      l(l(c001, c101, u), l(c011, c111, u), v),
      w
    );
  }
  /** fBm 2D — octaves de ruído somadas, resultado em [0,1] */
  fbm2(x, y, octavas = 4, persistencia = 0.5) {
    let amp = 1, freq = 1, soma = 0, norm = 0;
    for (let i = 0; i < octavas; i++) {
      soma += this.n2(x * freq, y * freq) * amp;
      norm += amp;
      amp *= persistencia;
      freq *= 2;
    }
    return soma / norm;
  }
};
var Aleatorio = class {
  a;
  constructor(semente) {
    this.a = semente >>> 0 || 1;
  }
  proximo() {
    let t = this.a += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  intervalo(min, max) {
    return min + this.proximo() * (max - min);
  }
  inteiro(min, max) {
    return Math.floor(this.intervalo(min, max + 1));
  }
  chance(p) {
    return this.proximo() < p;
  }
};

// src/game/blocos/constants.ts
var B = {
  AR: 0,
  RELVA: 1,
  TERRA: 2,
  PEDRA: 3,
  PEDREGULHO: 4,
  AREIA: 5,
  AGUA: 6,
  TRONCO: 7,
  FOLHAS: 8,
  TABUAS: 9,
  CARVAO_M: 10,
  FERRO_M: 11,
  OURO_M: 12,
  DIAMANTE_M: 13,
  ROCHA_MAE: 14,
  MESA: 15,
  FORNALHA: 16,
  TOCHA: 17,
  VIDRO: 18,
  CAMA: 19,
  ESCADA: 20,
  ERVA: 21,
  FLOR_AM: 22,
  FLOR_VM: 23,
  CACTO: 24,
  TERRA_ARADA: 25,
  TRIGO_J: 26,
  TRIGO_M: 27,
  TNT: 28,
  BAU: 29
};
var CRUZ = /* @__PURE__ */ new Set([B.ERVA, B.FLOR_AM, B.FLOR_VM]);
var I = {
  GRAVETO: 100,
  CARVAO: 101,
  DIAMANTE: 102,
  BARRA_FERRO: 103,
  BARRA_OURO: 104,
  CARNE_CRUA: 105,
  CARNE_ASSADA: 106,
  MACA: 107,
  PICARETA_MADEIRA: 108,
  PICARETA_PEDRA: 109,
  PICARETA_FERRO: 110,
  PICARETA_DIAMANTE: 111,
  ESPADA_MADEIRA: 112,
  ESPADA_PEDRA: 113,
  ESPADA_FERRO: 114,
  ESPADA_DIAMANTE: 115,
  PA_MADEIRA: 116,
  SEMENTES: 117,
  TRIGO: 118,
  ENXADA_MADEIRA: 119,
  ENXADA_FERRO: 120,
  PAO: 121,
  COURO: 122,
  ARMADURA_COURO: 123,
  ARMADURA_FERRO: 124,
  ARMADURA_DIAMANTE: 125,
  FIO: 126,
  VARA_PESCA: 127,
  PEIXE_SARDINHA: 128,
  PEIXE_CARAPAU: 129,
  PEIXE_CORVINA: 130,
  PEIXE_ASSADO: 131
};
var NOMES = {
  [B.AR]: "Ar",
  [B.RELVA]: "Relva",
  [B.TERRA]: "Terra",
  [B.PEDRA]: "Pedra",
  [B.PEDREGULHO]: "Pedregulho",
  [B.AREIA]: "Areia",
  [B.AGUA]: "\xC1gua",
  [B.TRONCO]: "Tronco",
  [B.FOLHAS]: "Folhas",
  [B.TABUAS]: "T\xE1buas",
  [B.CARVAO_M]: "Min\xE9rio de Carv\xE3o",
  [B.FERRO_M]: "Min\xE9rio de Ferro",
  [B.OURO_M]: "Min\xE9rio de Ouro",
  [B.DIAMANTE_M]: "Min\xE9rio de Diamante",
  [B.ROCHA_MAE]: "Rocha-M\xE3e",
  [B.MESA]: "Mesa de Cria\xE7\xE3o",
  [B.FORNALHA]: "Fornalha",
  [B.TOCHA]: "Tocha",
  [B.VIDRO]: "Vidro",
  [B.CAMA]: "Cama",
  [B.ESCADA]: "Escada",
  [B.ERVA]: "Erva Alta",
  [B.FLOR_AM]: "Flor Amarela",
  [B.FLOR_VM]: "Flor Vermelha",
  [B.CACTO]: "Cacto",
  [B.TERRA_ARADA]: "Terra Arada",
  [B.TRIGO_J]: "Trigo Jovem",
  [B.TRIGO_M]: "Trigo Maduro",
  [B.TNT]: "TNT",
  [B.BAU]: "Ba\xFA",
  [I.GRAVETO]: "Graveto",
  [I.CARVAO]: "Carv\xE3o",
  [I.DIAMANTE]: "Diamante",
  [I.BARRA_FERRO]: "Barra de Ferro",
  [I.BARRA_OURO]: "Barra de Ouro",
  [I.CARNE_CRUA]: "Carne Crua",
  [I.CARNE_ASSADA]: "Carne Assada",
  [I.MACA]: "Ma\xE7\xE3",
  [I.PICARETA_MADEIRA]: "Picareta de Madeira",
  [I.PICARETA_PEDRA]: "Picareta de Pedra",
  [I.PICARETA_FERRO]: "Picareta de Ferro",
  [I.PICARETA_DIAMANTE]: "Picareta de Diamante",
  [I.ESPADA_MADEIRA]: "Espada de Madeira",
  [I.ESPADA_PEDRA]: "Espada de Pedra",
  [I.ESPADA_FERRO]: "Espada de Ferro",
  [I.ESPADA_DIAMANTE]: "Espada de Diamante",
  [I.PA_MADEIRA]: "P\xE1 de Madeira",
  [I.SEMENTES]: "Sementes",
  [I.TRIGO]: "Trigo",
  [I.PAO]: "P\xE3o",
  [I.ENXADA_MADEIRA]: "Enxada de Madeira",
  [I.ENXADA_FERRO]: "Enxada de Ferro",
  [I.COURO]: "Couro",
  [I.ARMADURA_COURO]: "Peitoral de Couro",
  [I.ARMADURA_FERRO]: "Peitoral de Ferro",
  [I.ARMADURA_DIAMANTE]: "Peitoral de Diamante",
  [I.FIO]: "Fio",
  [I.VARA_PESCA]: "Vara de Pesca",
  [I.PEIXE_SARDINHA]: "Sardinha",
  [I.PEIXE_CARAPAU]: "Carapau",
  [I.PEIXE_CORVINA]: "Corvina",
  [I.PEIXE_ASSADO]: "Peixe Assado"
};
var CORES = {
  [B.RELVA]: ["#5db03a", "#7a5636"],
  [B.TERRA]: ["#7a5636", "#5d4028"],
  [B.PEDRA]: ["#8f8f8f", "#6e6e6e"],
  [B.PEDREGULHO]: ["#7d7d7d", "#565656"],
  [B.AREIA]: ["#e2d39a", "#c9b980"],
  [B.AGUA]: ["#3a6fd8", "#2a55b0"],
  [B.TRONCO]: ["#9a6b39", "#6d4a26"],
  [B.FOLHAS]: ["#3e8c2a", "#2c6a1c"],
  [B.TABUAS]: ["#b78b52", "#966f3e"],
  [B.CARVAO_M]: ["#8f8f8f", "#2b2b2b"],
  [B.FERRO_M]: ["#8f8f8f", "#d8af93"],
  [B.OURO_M]: ["#8f8f8f", "#f0d04a"],
  [B.DIAMANTE_M]: ["#8f8f8f", "#4fe0d8"],
  [B.ROCHA_MAE]: ["#3a3a3a", "#1c1c1c"],
  [B.MESA]: ["#b78b52", "#7a5636"],
  [B.FORNALHA]: ["#6e6e6e", "#3d3d3d"],
  [B.TOCHA]: ["#f0c542", "#8a5a2a"],
  [B.VIDRO]: ["#bfe6f0", "#9cc8d8"],
  [B.CAMA]: ["#c23a3a", "#f0f0f0"],
  [B.ESCADA]: ["#b78b52", "#8a6a3a"],
  [B.ERVA]: ["#5aa832", "#3a7a20"],
  [B.FLOR_AM]: ["#f0d04a", "#4f9e2f"],
  [B.FLOR_VM]: ["#e03a3a", "#4f9e2f"],
  [B.CACTO]: ["#3f8c3f", "#2c6a2c"],
  [B.TERRA_ARADA]: ["#5d4028", "#4a3018"],
  [B.TRIGO_J]: ["#7ab04a", "#5a8a30"],
  [B.TRIGO_M]: ["#d8b84a", "#b8932a"],
  [B.TNT]: ["#d83a2a", "#a82018"],
  [B.BAU]: ["#b78b52", "#8a6238"],
  [I.GRAVETO]: ["#9a6b39", "#6d4a26"],
  [I.CARVAO]: ["#2b2b2b", "#111"],
  [I.DIAMANTE]: ["#4fe0d8", "#2bb3ac"],
  [I.BARRA_FERRO]: ["#d8d8d8", "#a8a8a8"],
  [I.BARRA_OURO]: ["#f0d04a", "#c9a628"],
  [I.CARNE_CRUA]: ["#e08a7a", "#c05a4a"],
  [I.CARNE_ASSADA]: ["#9a5a3a", "#7a3a22"],
  [I.MACA]: ["#e03a3a", "#b02020"],
  [I.PICARETA_MADEIRA]: ["#b78b52", "#8a6a3a"],
  [I.PICARETA_PEDRA]: ["#9a9a9a", "#6a6a6a"],
  [I.PICARETA_FERRO]: ["#d8d8d8", "#a8a8a8"],
  [I.PICARETA_DIAMANTE]: ["#4fe0d8", "#2bb3ac"],
  [I.ESPADA_MADEIRA]: ["#b78b52", "#8a6a3a"],
  [I.ESPADA_PEDRA]: ["#9a9a9a", "#6a6a6a"],
  [I.ESPADA_FERRO]: ["#d8d8d8", "#a8a8a8"],
  [I.ESPADA_DIAMANTE]: ["#4fe0d8", "#2bb3ac"],
  [I.PA_MADEIRA]: ["#b78b52", "#8a6a3a"],
  [I.SEMENTES]: ["#7ab04a", "#5a8a30"],
  [I.TRIGO]: ["#d8b84a", "#b8932a"],
  [I.PAO]: ["#c89a52", "#a87a32"],
  [I.ENXADA_MADEIRA]: ["#b78b52", "#8a6a3a"],
  [I.ENXADA_FERRO]: ["#d8d8d8", "#a8a8a8"],
  [I.COURO]: ["#a0683a", "#7a4a24"],
  [I.ARMADURA_COURO]: ["#a0683a", "#7a4a24"],
  [I.ARMADURA_FERRO]: ["#d8d8d8", "#a8a8a8"],
  [I.ARMADURA_DIAMANTE]: ["#4fe0d8", "#2bb3ac"],
  [I.FIO]: ["#e8e8e8", "#b8b8b8"],
  [I.VARA_PESCA]: ["#a07840", "#6a4a24"],
  [I.PEIXE_SARDINHA]: ["#8ab8d8", "#5a88a8"],
  [I.PEIXE_CARAPAU]: ["#a8c0d0", "#7890a0"],
  [I.PEIXE_CORVINA]: ["#687890", "#48586a"],
  [I.PEIXE_ASSADO]: ["#c08850", "#906030"]
};
var ITENS = {
  [I.PICARETA_MADEIRA]: { nome: NOMES[I.PICARETA_MADEIRA], cor: "#b78b52", cor2: "#8a6a3a", ferramenta: "picareta", tier: 1, dano: 2, maximo: 1 },
  [I.PICARETA_PEDRA]: { nome: NOMES[I.PICARETA_PEDRA], cor: "#9a9a9a", cor2: "#6a6a6a", ferramenta: "picareta", tier: 2, dano: 3, maximo: 1 },
  [I.PICARETA_FERRO]: { nome: NOMES[I.PICARETA_FERRO], cor: "#d8d8d8", cor2: "#a8a8a8", ferramenta: "picareta", tier: 3, dano: 4, maximo: 1 },
  [I.PICARETA_DIAMANTE]: { nome: NOMES[I.PICARETA_DIAMANTE], cor: "#4fe0d8", cor2: "#2bb3ac", ferramenta: "picareta", tier: 4, dano: 5, maximo: 1 },
  [I.ESPADA_MADEIRA]: { nome: NOMES[I.ESPADA_MADEIRA], cor: "#b78b52", cor2: "#8a6a3a", ferramenta: "espada", tier: 1, dano: 4, maximo: 1 },
  [I.ESPADA_PEDRA]: { nome: NOMES[I.ESPADA_PEDRA], cor: "#9a9a9a", cor2: "#6a6a6a", ferramenta: "espada", tier: 2, dano: 5, maximo: 1 },
  [I.ESPADA_FERRO]: { nome: NOMES[I.ESPADA_FERRO], cor: "#d8d8d8", cor2: "#a8a8a8", ferramenta: "espada", tier: 3, dano: 6, maximo: 1 },
  [I.ESPADA_DIAMANTE]: { nome: NOMES[I.ESPADA_DIAMANTE], cor: "#4fe0d8", cor2: "#2bb3ac", ferramenta: "espada", tier: 4, dano: 7, maximo: 1 },
  [I.PA_MADEIRA]: { nome: NOMES[I.PA_MADEIRA], cor: "#b78b52", cor2: "#8a6a3a", ferramenta: "pa", tier: 1, dano: 2, maximo: 1 },
  [I.ENXADA_MADEIRA]: { nome: NOMES[I.ENXADA_MADEIRA], cor: "#b78b52", cor2: "#8a6a3a", ferramenta: "enxada", tier: 1, dano: 2, maximo: 1 },
  [I.ENXADA_FERRO]: { nome: NOMES[I.ENXADA_FERRO], cor: "#d8d8d8", cor2: "#a8a8a8", ferramenta: "enxada", tier: 2, dano: 3, maximo: 1 },
  [I.CARNE_CRUA]: { nome: NOMES[I.CARNE_CRUA], cor: "#e08a7a", cor2: "#c05a4a", comida: 3, maximo: 64 },
  [I.CARNE_ASSADA]: { nome: NOMES[I.CARNE_ASSADA], cor: "#9a5a3a", cor2: "#7a3a22", comida: 8, maximo: 64 },
  [I.MACA]: { nome: NOMES[I.MACA], cor: "#e03a3a", cor2: "#b02020", comida: 4, maximo: 64 },
  [I.PAO]: { nome: NOMES[I.PAO], cor: "#c89a52", cor2: "#a87a32", comida: 5, maximo: 64 },
  [I.SEMENTES]: { nome: NOMES[I.SEMENTES], cor: "#7ab04a", cor2: "#5a8a30", maximo: 64 },
  [I.TRIGO]: { nome: NOMES[I.TRIGO], cor: "#d8b84a", cor2: "#b8932a", maximo: 64 },
  [I.COURO]: { nome: NOMES[I.COURO], cor: "#a0683a", cor2: "#7a4a24", maximo: 64 },
  [I.ARMADURA_COURO]: { nome: NOMES[I.ARMADURA_COURO], cor: "#a0683a", cor2: "#7a4a24", armadura: 0.15, maximo: 1 },
  [I.ARMADURA_FERRO]: { nome: NOMES[I.ARMADURA_FERRO], cor: "#d8d8d8", cor2: "#a8a8a8", armadura: 0.3, maximo: 1 },
  [I.ARMADURA_DIAMANTE]: { nome: NOMES[I.ARMADURA_DIAMANTE], cor: "#4fe0d8", cor2: "#2bb3ac", armadura: 0.45, maximo: 1 },
  // v32: pesca — fio, vara e peixes reais da costa (comida honesta, sardinha < carapau < corvina)
  [I.FIO]: { nome: NOMES[I.FIO], cor: "#e8e8e8", cor2: "#b8b8b8", maximo: 64 },
  [I.VARA_PESCA]: { nome: NOMES[I.VARA_PESCA], cor: "#a07840", cor2: "#6a4a24", maximo: 1 },
  [I.PEIXE_SARDINHA]: { nome: NOMES[I.PEIXE_SARDINHA], cor: "#8ab8d8", cor2: "#5a88a8", comida: 3, maximo: 64 },
  [I.PEIXE_CARAPAU]: { nome: NOMES[I.PEIXE_CARAPAU], cor: "#a8c0d0", cor2: "#7890a0", comida: 4, maximo: 64 },
  [I.PEIXE_CORVINA]: { nome: NOMES[I.PEIXE_CORVINA], cor: "#687890", cor2: "#48586a", comida: 5, maximo: 64 },
  [I.PEIXE_ASSADO]: { nome: NOMES[I.PEIXE_ASSADO], cor: "#c08850", cor2: "#906030", comida: 8, maximo: 64 },
  // v48: materiais no REGISTO de itens — sempre foram reais (receitas de
  // fundição/ferragens), mas faltavam aqui; o espólio dos baús do RPG exige
  // que TODO item entregue seja ITENS ou BLOCOS (fonte única, zero exceção).
  [I.GRAVETO]: { nome: NOMES[I.GRAVETO], cor: "#9a6b39", cor2: "#6d4a26", maximo: 64 },
  [I.CARVAO]: { nome: NOMES[I.CARVAO], cor: "#2b2b2b", cor2: "#111111", maximo: 64 },
  [I.DIAMANTE]: { nome: NOMES[I.DIAMANTE], cor: "#4fe0d8", cor2: "#2bb3ac", maximo: 64 },
  [I.BARRA_FERRO]: { nome: NOMES[I.BARRA_FERRO], cor: "#d8d8d8", cor2: "#a8a8a8", maximo: 64 },
  [I.BARRA_OURO]: { nome: NOMES[I.BARRA_OURO], cor: "#f0d04a", cor2: "#c9a628", maximo: 64 }
};
var D = (o) => ({
  ferramenta: null,
  tier: 0,
  drop: -1,
  solido: true,
  ...o
});
var BLOCOS = {
  [B.RELVA]: D({ nome: NOMES[B.RELVA], dureza: 0.9, ferramenta: "pa", tiles: [0, 2, 1], drop: B.TERRA }),
  [B.TERRA]: D({ nome: NOMES[B.TERRA], dureza: 0.9, ferramenta: "pa", tiles: [2, 2, 2] }),
  [B.PEDRA]: D({ nome: NOMES[B.PEDRA], dureza: 7.5, ferramenta: "picareta", tier: 1, tiles: [3, 3, 3], drop: B.PEDREGULHO }),
  [B.PEDREGULHO]: D({ nome: NOMES[B.PEDREGULHO], dureza: 9, ferramenta: "picareta", tier: 1, tiles: [4, 4, 4] }),
  [B.AREIA]: D({ nome: NOMES[B.AREIA], dureza: 0.9, ferramenta: "pa", tiles: [5, 5, 5] }),
  [B.AGUA]: D({ nome: NOMES[B.AGUA], dureza: 9999, tiles: [6, 6, 6], solido: false, transparente: true, liquido: true }),
  [B.TRONCO]: D({ nome: NOMES[B.TRONCO], dureza: 3, tiles: [7, 7, 8] }),
  [B.FOLHAS]: D({ nome: NOMES[B.FOLHAS], dureza: 0.35, tiles: [9, 9, 9], transparente: true }),
  [B.TABUAS]: D({ nome: NOMES[B.TABUAS], dureza: 3, tiles: [11, 11, 11] }),
  [B.CARVAO_M]: D({ nome: NOMES[B.CARVAO_M], dureza: 15, ferramenta: "picareta", tier: 1, tiles: [12, 12, 12], drop: I.CARVAO }),
  [B.FERRO_M]: D({ nome: NOMES[B.FERRO_M], dureza: 15, ferramenta: "picareta", tier: 2, tiles: [13, 13, 13] }),
  [B.OURO_M]: D({ nome: NOMES[B.OURO_M], dureza: 15, ferramenta: "picareta", tier: 3, tiles: [14, 14, 14] }),
  [B.DIAMANTE_M]: D({ nome: NOMES[B.DIAMANTE_M], dureza: 15, ferramenta: "picareta", tier: 3, tiles: [15, 15, 15], drop: I.DIAMANTE }),
  [B.ROCHA_MAE]: D({ nome: NOMES[B.ROCHA_MAE], dureza: Infinity, tiles: [16, 16, 16] }),
  [B.MESA]: D({ nome: NOMES[B.MESA], dureza: 3.5, tiles: [17, 11, 18] }),
  [B.FORNALHA]: D({ nome: NOMES[B.FORNALHA], dureza: 5, ferramenta: "picareta", tier: 1, tiles: [19, 19, 20] }),
  [B.TOCHA]: D({ nome: NOMES[B.TOCHA], dureza: 0.05, tiles: [21, 21, 21], solido: false, transparente: true, brilho: 1 }),
  [B.VIDRO]: D({ nome: NOMES[B.VIDRO], dureza: 0.6, tiles: [22, 22, 22], transparente: true }),
  [B.CAMA]: D({ nome: NOMES[B.CAMA], dureza: 0.5, tiles: [23, 23, 23] }),
  [B.ESCADA]: D({ nome: NOMES[B.ESCADA], dureza: 0.8, tiles: [24, 24, 24], solido: false, transparente: true }),
  [B.ERVA]: D({ nome: NOMES[B.ERVA], dureza: 0.05, tiles: [25, 25, 25], solido: false, transparente: true, cruz: true, drop: null }),
  [B.FLOR_AM]: D({ nome: NOMES[B.FLOR_AM], dureza: 0.05, tiles: [26, 26, 26], solido: false, transparente: true, cruz: true }),
  [B.FLOR_VM]: D({ nome: NOMES[B.FLOR_VM], dureza: 0.05, tiles: [27, 27, 27], solido: false, transparente: true, cruz: true }),
  [B.CACTO]: D({ nome: NOMES[B.CACTO], dureza: 0.7, tiles: [28, 28, 29] }),
  [B.TERRA_ARADA]: D({ nome: NOMES[B.TERRA_ARADA], dureza: 0.7, ferramenta: "pa", tiles: [30, 2, 2], drop: B.TERRA }),
  [B.TRIGO_J]: D({ nome: NOMES[B.TRIGO_J], dureza: 0.03, tiles: [31, 31, 31], solido: false, transparente: true, drop: -1 }),
  [B.TRIGO_M]: D({ nome: NOMES[B.TRIGO_M], dureza: 0.03, tiles: [32, 32, 32], solido: false, transparente: true, drop: -1 }),
  [B.TNT]: D({ nome: NOMES[B.TNT], dureza: 0.2, tiles: [33, 33, 34] }),
  [B.BAU]: D({ nome: NOMES[B.BAU], dureza: 2.5, tiles: [35, 11, 36] })
};
var PRECISA_DE_APOIO = /* @__PURE__ */ new Set([B.ERVA, B.FLOR_AM, B.FLOR_VM, B.CACTO]);
var solidoId = (id) => {
  const d = BLOCOS[id];
  return !!d && d.solido;
};
var RECEITAS = [
  { id: "tabuas", nome: "4\xD7 T\xE1buas", resultado: [B.TABUAS, 4], ingredientes: [[B.TRONCO, 1]], mesa: false, categoria: "criacao", desc: "A base de tudo." },
  { id: "gravetos", nome: "4\xD7 Gravetos", resultado: [I.GRAVETO, 4], ingredientes: [[B.TABUAS, 2]], mesa: false, categoria: "criacao" },
  { id: "mesa", nome: "Mesa de Cria\xE7\xE3o", resultado: [B.MESA, 1], ingredientes: [[B.TABUAS, 4]], mesa: false, categoria: "criacao", desc: "Desbloqueia receitas avan\xE7adas perto dela." },
  { id: "tochas", nome: "4\xD7 Tochas", resultado: [B.TOCHA, 4], ingredientes: [[I.GRAVETO, 4], [I.CARVAO, 1]], mesa: false, categoria: "criacao", desc: "Ilumina e afasta a escurid\xE3o." },
  { id: "pic_mad", nome: "Picareta de Madeira", resultado: [I.PICARETA_MADEIRA, 1], ingredientes: [[B.TABUAS, 3], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Necess\xE1ria para pedra." },
  { id: "esp_mad", nome: "Espada de Madeira", resultado: [I.ESPADA_MADEIRA, 1], ingredientes: [[B.TABUAS, 2], [I.GRAVETO, 1]], mesa: true, categoria: "criacao" },
  { id: "pa_mad", nome: "P\xE1 de Madeira", resultado: [I.PA_MADEIRA, 1], ingredientes: [[B.TABUAS, 1], [I.GRAVETO, 2]], mesa: true, categoria: "criacao" },
  { id: "fornalha", nome: "Fornalha", resultado: [B.FORNALHA, 1], ingredientes: [[B.PEDREGULHO, 8]], mesa: true, categoria: "criacao", desc: "Fundir min\xE9rios e cozinhar." },
  { id: "pic_ped", nome: "Picareta de Pedra", resultado: [I.PICARETA_PEDRA, 1], ingredientes: [[B.PEDREGULHO, 3], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Necess\xE1ria para ferro." },
  { id: "esp_ped", nome: "Espada de Pedra", resultado: [I.ESPADA_PEDRA, 1], ingredientes: [[B.PEDREGULHO, 2], [I.GRAVETO, 1]], mesa: true, categoria: "criacao" },
  { id: "pic_fer", nome: "Picareta de Ferro", resultado: [I.PICARETA_FERRO, 1], ingredientes: [[I.BARRA_FERRO, 3], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Necess\xE1ria para ouro e diamante." },
  { id: "esp_fer", nome: "Espada de Ferro", resultado: [I.ESPADA_FERRO, 1], ingredientes: [[I.BARRA_FERRO, 2], [I.GRAVETO, 1]], mesa: true, categoria: "criacao" },
  { id: "pic_dia", nome: "Picareta de Diamante", resultado: [I.PICARETA_DIAMANTE, 1], ingredientes: [[I.DIAMANTE, 3], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "A mais r\xE1pida de todas." },
  { id: "esp_dia", nome: "Espada de Diamante", resultado: [I.ESPADA_DIAMANTE, 1], ingredientes: [[I.DIAMANTE, 2], [I.GRAVETO, 1]], mesa: true, categoria: "criacao" },
  { id: "fun_fer", nome: "2\xD7 Barra de Ferro", resultado: [I.BARRA_FERRO, 2], ingredientes: [[B.FERRO_M, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "fun_ouro", nome: "2\xD7 Barra de Ouro", resultado: [I.BARRA_OURO, 2], ingredientes: [[B.OURO_M, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "fun_carne", nome: "2\xD7 Carne Assada", resultado: [I.CARNE_ASSADA, 2], ingredientes: [[I.CARNE_CRUA, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "fun_vidro", nome: "2\xD7 Vidro", resultado: [B.VIDRO, 2], ingredientes: [[B.AREIA, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "cama", nome: "Cama", resultado: [B.CAMA, 1], ingredientes: [[B.TABUAS, 3], [B.FOLHAS, 3]], mesa: false, categoria: "criacao", desc: "Dorme \xE0 noite e define o teu ponto de renascimento." },
  { id: "escada", nome: "3\xD7 Escada", resultado: [B.ESCADA, 3], ingredientes: [[B.TABUAS, 7]], mesa: true, categoria: "criacao", desc: "Escala paredes sem saltos." },
  { id: "enx_mad", nome: "Enxada de Madeira", resultado: [I.ENXADA_MADEIRA, 1], ingredientes: [[B.TABUAS, 2], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Lavra terra para plantar sementes." },
  { id: "enx_fer", nome: "Enxada de Ferro", resultado: [I.ENXADA_FERRO, 1], ingredientes: [[I.BARRA_FERRO, 2], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Enxada resistente." },
  { id: "pao", nome: "P\xE3o", resultado: [I.PAO, 1], ingredientes: [[I.TRIGO, 3]], mesa: false, categoria: "criacao", desc: "Restaura 5 de fome." },
  { id: "bau", nome: "Ba\xFA", resultado: [B.BAU, 1], ingredientes: [[B.TABUAS, 8]], mesa: true, categoria: "criacao", desc: "18 posi\xE7\xF5es de armazenamento \u2014 guardado no teu mundo." },
  { id: "tnt", nome: "TNT", resultado: [B.TNT, 1], ingredientes: [[B.AREIA, 4], [I.CARVAO, 5]], mesa: true, categoria: "criacao", desc: "Ataca-a para acender: explos\xE3o enorme. Cuidado!" },
  { id: "arm_couro", nome: "Peitoral de Couro", resultado: [I.ARMADURA_COURO, 1], ingredientes: [[I.COURO, 5], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Absorve 15% do dano." },
  { id: "arm_fer", nome: "Peitoral de Ferro", resultado: [I.ARMADURA_FERRO, 1], ingredientes: [[I.BARRA_FERRO, 5], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Absorve 30% do dano." },
  { id: "arm_dia", nome: "Peitoral de Diamante", resultado: [I.ARMADURA_DIAMANTE, 1], ingredientes: [[I.DIAMANTE, 5], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Absorve 45% do dano." },
  { id: "vara_pesca", nome: "Vara de Pesca", resultado: [I.VARA_PESCA, 1], ingredientes: [[I.GRAVETO, 3], [I.FIO, 2]], mesa: true, categoria: "criacao", desc: "Lan\xE7a a linha na \xE1gua e espera a picada." },
  { id: "fun_sardinha", nome: "2\xD7 Peixe Assado", resultado: [I.PEIXE_ASSADO, 2], ingredientes: [[I.PEIXE_SARDINHA, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "fun_carapau", nome: "2\xD7 Peixe Assado", resultado: [I.PEIXE_ASSADO, 2], ingredientes: [[I.PEIXE_CARAPAU, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "fun_corvina", nome: "2\xD7 Peixe Assado", resultado: [I.PEIXE_ASSADO, 2], ingredientes: [[I.PEIXE_CORVINA, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" }
];
var CHUNK = 16;
var ALTURA = 80;
var NIVEL_MAR = 30;
var GRAVIDADE = 26;
var VIDA_MAX = 20;
var RAIO_EXPLOSAO = 3.2;

// src/game/blocos/lego.ts
import * as THREE from "three";

// src/game/blocos/textures.ts
var TILE = 16;
var COLS_ATLAS = 8;
var LINHAS_ATLAS = 5;
function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function pintar(ctx, col, linha, base, variacao = 14, semente = 1, detalhe) {
  const img = ctx.createImageData(TILE, TILE);
  const b = hex(base);
  const rnd = new Aleatorio(semente * 7919 + col * 131 + linha * 17);
  const set = (x, y, c) => {
    const i = (y * TILE + x) * 4;
    img.data[i] = clamp255(c[0]);
    img.data[i + 1] = clamp255(c[1]);
    img.data[i + 2] = clamp255(c[2]);
    img.data[i + 3] = 255;
  };
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const d = (rnd.proximo() - 0.5) * 2 * variacao;
    set(x, y, [b[0] + d, b[1] + d, b[2] + d]);
  }
  if (detalhe) detalhe((x, y, c) => {
    if (x >= 0 && x < TILE && y >= 0 && y < TILE) set(x, y, c);
  });
  ctx.putImageData(img, col * TILE, linha * TILE);
}
var MISTURAR = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function pintarAlfa(ctx, col, linha, desenhar) {
  const img = ctx.createImageData(TILE, TILE);
  const hexP = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const set = (x, y, c) => {
    if (x < 0 || x >= TILE || y < 0 || y >= TILE) return;
    const i = (y * TILE + x) * 4;
    img.data[i] = clamp255(c[0]);
    img.data[i + 1] = clamp255(c[1]);
    img.data[i + 2] = clamp255(c[2]);
    img.data[i + 3] = 255;
  };
  desenhar((x, y, cor) => set(x, y, hexP(cor)));
  ctx.putImageData(img, col * TILE, linha * TILE);
}
function criarAtlas() {
  const cv = document.createElement("canvas");
  cv.width = COLS_ATLAS * TILE;
  cv.height = LINHAS_ATLAS * TILE;
  const ctx = cv.getContext("2d");
  const verde = hex("#4f9e2f"), verdeEsc = hex("#3a7a20"), terraEsc = hex("#5d4028"), cinza = hex("#8a8a8a"), cinzaEsc = hex("#6a6a6a");
  pintar(ctx, 0, 0, "#4f9e2f", 18, 11, (px) => {
    for (let i = 0; i < 22; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), verdeEsc);
  });
  pintar(ctx, 1, 0, "#7a5636", 14, 12, (px) => {
    for (let x = 0; x < 16; x++) {
      const h = 3 + x % 3;
      for (let y = 0; y < h; y++) px(x, y, MISTURAR(verde, verdeEsc, (x * 7 + y * 13) % 5 / 5));
    }
  });
  pintar(ctx, 2, 0, "#7a5636", 16, 13, (px) => {
    for (let i = 0; i < 14; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), terraEsc);
  });
  pintar(ctx, 3, 0, "#8a8a8a", 12, 14, (px) => {
    for (let i = 0; i < 10; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), cinzaEsc);
  });
  pintar(ctx, 4, 0, "#7d7d7d", 8, 15, (px) => {
    const pedras = hex("#9b9b9b"), sombra = hex("#585858");
    const rec = [[1, 1, 6, 4], [9, 2, 5, 5], [2, 8, 5, 6], [9, 9, 6, 5], [6, 6, 3, 3]];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, sombra);
    for (const [rx, ry, rw, rh] of rec)
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++)
        px(x, y, MISTURAR(pedras, cinza, (x + y) % 4 / 6));
  });
  pintar(ctx, 5, 0, "#dcc98f", 12, 16);
  pintar(ctx, 6, 0, "#3a6fd8", 8, 17, (px) => {
    const claro = hex("#5a8ff0");
    for (let y = 2; y < 16; y += 5) for (let x = 0; x < 16; x++) if ((x + y) % 7 < 4) px(x, y, claro);
  });
  pintar(ctx, 7, 0, "#9a6b39", 6, 18, (px) => {
    const anel = hex("#7a5124"), centro = hex("#b5854e");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 2.2) px(x, y, centro);
      else if (Math.abs(d % 3 - 1.4) < 0.55) px(x, y, anel);
    }
  });
  pintar(ctx, 0, 1, "#6d4a26", 10, 19, (px) => {
    const casca = hex("#8a6034");
    for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if ((x + y) % 5 !== 0) px(x, y, casca);
  });
  pintar(ctx, 1, 1, "#3e8c2a", 20, 20, (px) => {
    const esc = hex("#2c6a1c"), buraco = hex("#255c17");
    for (let i = 0; i < 20; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), esc);
    for (let i = 0; i < 6; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), buraco);
  });
  pintar(ctx, 2, 1, "#43882d", 22, 21, (px) => {
    const lima = hex("#6aa53c");
    for (let i = 0; i < 12; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), lima);
  });
  pintar(ctx, 3, 1, "#b78b52", 8, 22, (px) => {
    const linha = hex("#8a6238"), veio = hex("#a37c46");
    for (let y = 0; y < 16; y++) {
      if (y % 4 === 3) for (let x = 0; x < 16; x++) px(x, y, linha);
      else for (let x = 0; x < 16; x++) if ((x * 3 + y) % 9 === 0) px(x, y, veio);
    }
    px(7, 1, linha);
    px(3, 5, linha);
    px(12, 9, linha);
    px(6, 13, linha);
  });
  const mina = (col, linha, semente, cor) => pintar(ctx, col, linha, "#8a8a8a", 12, semente, (px) => {
    const gema = hex(cor), gemaEsc = hex(cor).map((v) => v * 0.7);
    const manchas = [[3, 3], [10, 4], [5, 10], [12, 11], [8, 7]];
    for (const [mx, my] of manchas) {
      px(mx, my, gema);
      px(mx + 1, my, gemaEsc);
      px(mx, my + 1, gemaEsc);
      px(mx + 1, my + 1, gema);
    }
  });
  mina(4, 1, 31, "#2b2b2b");
  mina(5, 1, 32, "#d8af93");
  mina(6, 1, 33, "#f0d04a");
  mina(7, 1, 34, "#4fe0d8");
  pintar(ctx, 0, 2, "#3a3a3a", 16, 35, (px) => {
    const esc = hex("#1c1c1c"), clr = hex("#555");
    for (let i = 0; i < 24; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), Math.random() < 0.5 ? esc : clr);
  });
  pintar(ctx, 1, 2, "#b78b52", 8, 36, (px) => {
    const grade = hex("#6d4a26"), branco = hex("#d8c9a8");
    for (let i = 0; i < 16; i++) {
      px(i, 0, grade);
      px(i, 15, grade);
      px(0, i, grade);
      px(15, i, grade);
      px(i, 7, grade);
      px(7, i, grade);
    }
    for (const [gx, gy] of [[3, 3], [11, 3], [3, 11], [11, 11]]) {
      px(gx, gy, branco);
      px(gx + 1, gy, branco);
      px(gx, gy + 1, branco);
    }
  });
  pintar(ctx, 2, 2, "#9a7243", 10, 37, (px) => {
    const linha = hex("#6d4a26"), serr = hex("#c8c8c8");
    for (let y = 0; y < 16; y++) {
      if (y % 5 === 4) for (let x = 0; x < 16; x++) px(x, y, linha);
    }
    for (let y = 2; y < 7; y++) px(4, y, serr);
    for (let x = 3; x < 6; x++) px(x, 2, serr);
  });
  pintar(ctx, 3, 2, "#6e6e6e", 10, 38, (px) => {
    const borda = hex("#4a4a4a");
    for (let i = 0; i < 16; i++) {
      px(i, 0, borda);
      px(i, 15, borda);
      px(0, i, borda);
      px(15, i, borda);
    }
  });
  pintar(ctx, 4, 2, "#6e6e6e", 10, 39, (px) => {
    const borda = hex("#4a4a4a"), fogo = hex("#f08a2a"), fogo2 = hex("#f0c542");
    for (let i = 0; i < 16; i++) {
      px(i, 0, borda);
      px(i, 15, borda);
      px(0, i, borda);
      px(15, i, borda);
    }
    for (let y = 8; y < 14; y++) for (let x = 4; x < 12; x++) px(x, y, fogo);
    for (let y = 10; y < 13; y++) for (let x = 6; x < 10; x++) px(x, y, fogo2);
  });
  pintar(ctx, 5, 2, "#000000", 0, 40, (px) => {
    const pau = hex("#8a5a2a"), chama = hex("#f0c542"), nuc = hex("#fff0a0");
    for (let y = 6; y < 16; y++) for (let x = 7; x < 9; x++) px(x, y, pau);
    for (let y = 2; y < 6; y++) for (let x = 6; x < 10; x++) px(x, y, chama);
    px(7, 3, nuc);
    px(8, 3, nuc);
    px(7, 4, nuc);
    px(8, 4, nuc);
  });
  pintar(ctx, 6, 2, "#bfe6f0", 4, 41, (px) => {
    const mold = hex("#8fb8c8"), brilho = hex("#ffffff");
    for (let i = 0; i < 16; i++) {
      px(i, 0, mold);
      px(i, 15, mold);
      px(0, i, mold);
      px(15, i, mold);
    }
    for (let i = 2; i < 7; i++) px(i, 9 - i + 2, brilho);
  });
  pintar(ctx, 7, 2, "#c23a3a", 10, 42, (px) => {
    const traves = hex("#f0f0f0"), travesSombra = hex("#cfcfcf"), manta = hex("#a02a2a");
    for (let y = 1; y < 6; y++) for (let x = 1; x < 15; x++) px(x, y, (x + y) % 4 === 0 ? travesSombra : traves);
    for (let x = 0; x < 16; x++) px(x, 6, manta);
    for (let y = 10; y < 16; y += 5) for (let x = 1; x < 15; x++) px(x, y, manta);
  });
  pintar(ctx, 0, 3, "#8a6238", 8, 43, (px) => {
    const lado = hex("#b78b52"), degrau = hex("#c89a62"), sombra = hex("#5d4028");
    for (let y = 0; y < 16; y++) {
      px(2, y, lado);
      px(3, y, lado);
      px(12, y, lado);
      px(13, y, lado);
    }
    for (const dy of [1, 2, 7, 8, 13, 14]) for (let x = 2; x < 14; x++) px(x, dy, (x + dy) % 3 === 0 ? sombra : degrau);
  });
  pintarAlfa(ctx, 1, 3, (px) => {
    const tons = ["#4f9e2f", "#5aa832", "#3a7a20", "#6ab53e", "#57a62e"];
    for (let bx = 0; bx < 16; bx++) {
      const alt = 6 + (bx * 7 + 3) % 6;
      const c1 = tons[bx % tons.length], c2 = tons[(bx + 2) % tons.length];
      const curva = (bx + bx * 5 % 3) % 3 === 0 ? bx % 2 ? 1 : -1 : 0;
      for (let y = 15; y > 15 - alt; y--) {
        const t = (15 - y) / alt;
        px(bx + (t > 0.6 ? curva : 0), y, y % 3 === 0 ? c2 : c1);
      }
    }
    for (let x = 1; x < 15; x++) px(x, 15, tons[x % tons.length]);
  });
  pintarAlfa(ctx, 2, 3, (px) => {
    for (let y = 8; y < 16; y++) px(7, y, "#3a7a20");
    px(6, 11, "#4f9e2f");
    px(9, 10, "#4f9e2f");
    const p = "#f0d04a", p2 = "#d4b02e", c = "#c98a1a";
    for (const [fx, fy] of [[6, 4], [8, 4], [5, 5], [9, 5], [6, 6], [8, 6], [7, 3], [7, 7]]) px(fx, fy, p);
    px(7, 5, c);
    px(6, 5, p2);
    px(8, 5, p2);
  });
  pintarAlfa(ctx, 3, 3, (px) => {
    for (let y = 8; y < 16; y++) px(8, y, "#3a7a20");
    px(7, 12, "#4f9e2f");
    px(10, 11, "#4f9e2f");
    const p = "#e03a3a", p2 = "#b82828", c = "#f0c542";
    for (const [fx, fy] of [[7, 3], [9, 3], [6, 4], [10, 4], [7, 5], [9, 5], [8, 2], [8, 6]]) px(fx, fy, p);
    px(8, 4, c);
    px(7, 4, p2);
    px(9, 4, p2);
  });
  pintar(ctx, 4, 3, "#3f8c3f", 8, 47, (px) => {
    const centro = hex("#5aa84a"), borda = hex("#2c6a2c");
    for (let i = 0; i < 16; i++) {
      px(i, 0, borda);
      px(i, 15, borda);
      px(0, i, borda);
      px(15, i, borda);
    }
    for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) px(x, y, centro);
  });
  pintar(ctx, 5, 3, "#3f8c3f", 8, 48, (px) => {
    const sulco = hex("#2c6a2c"), espinho = hex("#e8f0d8"), claro = hex("#54a044");
    for (const sx of [2, 7, 12]) for (let y = 0; y < 16; y++) px(sx, y, sulco);
    for (const sx of [4, 9, 14]) for (let y = 1; y < 16; y += 2) if ((sx + y) % 4 === 0) px(sx, y, claro);
    for (const [ex, ey] of [[0, 3], [15, 5], [0, 11], [15, 9]]) px(ex, ey, espinho);
  });
  pintar(ctx, 6, 3, "#5d4028", 10, 44, (px) => {
    const sulco = hex("#46301c"), humido = hex("#6b4a2c");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (y % 5 === 2) px(x, y, sulco);
      else if (y % 5 === 1 && x % 4 < 2) px(x, y, humido);
    }
  });
  pintar(ctx, 7, 3, "#5d4028", 10, 45, (px) => {
    const broto = hex("#7ab04a"), folha = hex("#8ec45c");
    for (let x = 1; x < 16; x += 4) for (let y = 9; y < 16; y++) {
      px(x, y, broto);
      if (y < 12) px(x + 1, y, folha);
    }
  });
  pintar(ctx, 0, 4, "#5d4028", 8, 46, (px) => {
    const caule = hex("#b8932a"), espiga = hex("#e8c858"), topo = hex("#f0d878");
    for (let x = 1; x < 16; x += 4) for (let y = 3; y < 16; y++) px(x, y, caule);
    for (let x = 1; x < 16; x += 4) for (let y = 1; y < 6; y++) px(x, y, espiga);
    for (let x = 1; x < 16; x += 4) {
      px(x, 0, topo);
      px(x + 1, 2, espiga);
    }
  });
  pintar(ctx, 1, 4, "#d83a2a", 10, 47, (px) => {
    const cruz = hex("#f0e8d8"), pavio = hex("#2b2b2b");
    for (let i = 0; i < 16; i++) {
      px(i, 7, cruz);
      px(i, 8, cruz);
      px(7, i, cruz);
      px(8, i, cruz);
    }
    px(7, 7, pavio);
    px(8, 8, pavio);
  });
  pintar(ctx, 2, 4, "#d83a2a", 10, 48, (px) => {
    const faixa = hex("#f0e8d8"), letra = hex("#1c1c1c");
    for (let y = 4; y < 12; y++) for (let x = 0; x < 16; x++) px(x, y, faixa);
    const T2 = [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2], [1, 3], [1, 4]];
    const N = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 1], [2, 2], [3, 3], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]];
    for (const [ox, ly] of T2) px(2 + ox, 5 + ly, letra);
    for (const [ox, ly] of T2) px(7 + ox, 5 + ly, letra);
    for (const [ox, ly] of N) px(10 + ox, 5 + ly, letra);
  });
  pintar(ctx, 3, 4, "#b78b52", 8, 49, (px) => {
    const faixa = hex("#8a8a8a"), fech = hex("#f0c542");
    for (let i = 0; i < 16; i++) {
      px(i, 0, faixa);
      px(i, 15, faixa);
      px(0, i, faixa);
      px(15, i, faixa);
    }
    for (let x = 0; x < 16; x++) px(x, 7, faixa);
    px(6, 6, fech);
    px(7, 6, fech);
    px(6, 7, fech);
    px(7, 7, fech);
    px(8, 6, fech);
    px(8, 7, fech);
  });
  pintar(ctx, 4, 4, "#a37c46", 8, 50, (px) => {
    const linha = hex("#6d4a26"), fech = hex("#f0c542"), sombraF = hex("#8a6a20");
    for (let y = 0; y < 16; y++) {
      if (y % 4 === 3) for (let x = 0; x < 16; x++) px(x, y, linha);
    }
    for (let y = 6; y < 11; y++) for (let x = 6; x < 10; x++) px(x, y, fech);
    px(7, 9, sombraF);
    px(8, 9, sombraF);
    px(7, 10, sombraF);
  });
  return cv;
}

// src/game/blocos/mobs.ts
var ehPassivo = (t) => t === "porco" || t === "vaca" || t === "galinha";

// src/game/blocos/itensChao.ts
var ITEM_CHAO_TTL = 120;
var ITEM_RAIO_PEGA = 1.7;
var ITEM_RAIO_IMA = 3;
var ITEM_CAP = 48;
function criarItemChao(id, qtd, x, y, z, ang, pegaT = 0) {
  return {
    id,
    qtd,
    x,
    y,
    z,
    vx: Math.sin(ang) * 1.6,
    vy: 3.2,
    vz: Math.cos(ang) * 1.6,
    idade: 0,
    noChao: false,
    avisoCheiaT: 0,
    pegaT
  };
}
function passoItensChao(itens, dt, solido, px, py, pz) {
  const pegos = [];
  const expirados = [];
  for (const it of itens) {
    it.idade += dt;
    it.avisoCheiaT = Math.max(0, it.avisoCheiaT - dt);
    if (it.idade >= ITEM_CHAO_TTL || it.y < -10) {
      expirados.push(it);
      continue;
    }
    const dx = px - it.x, dz = pz - it.z, dy = py + 0.9 - it.y;
    const dHoriz = Math.hypot(dx, dz);
    let imaNestePasso = false;
    if (it.pegaT > 0) {
      it.pegaT = Math.max(0, it.pegaT - dt);
    } else if (dHoriz < ITEM_RAIO_IMA && Math.abs(dy) < 2.2) {
      if (dHoriz <= ITEM_RAIO_PEGA) {
        pegos.push(it);
        continue;
      }
      const vel = Math.min(3.2, 0.8 + dHoriz * 0.8);
      it.vx = dx / dHoriz * vel;
      it.vz = dz / dHoriz * vel;
      imaNestePasso = true;
    }
    it.vy -= GRAVIDADE * dt;
    if (it.vy < -30) it.vy = -30;
    if (it.noChao && !imaNestePasso) {
      const f = Math.max(0, 1 - 10 * dt);
      it.vx *= f;
      it.vz *= f;
    }
    const nx = it.x + it.vx * dt;
    if (!solido(nx, it.y + 0.15, it.z)) it.x = nx;
    else it.vx = 0;
    const nz = it.z + it.vz * dt;
    if (!solido(it.x, it.y + 0.15, nz)) it.z = nz;
    else it.vz = 0;
    const ny = it.y + it.vy * dt;
    if (it.vy <= 0 && (solido(it.x, ny, it.z) || solido(it.x, ny - 0.1, it.z))) {
      it.y = Math.floor(ny) + 1.001;
      it.vy = 0;
      it.noChao = true;
    } else if (it.vy > 0 && solido(it.x, ny + 0.15, it.z)) {
      it.vy = 0;
    } else {
      it.y = ny;
      it.noChao = false;
    }
  }
  return { pegos, expirados };
}
function aplicarCapItens(itens, cap = ITEM_CAP) {
  if (itens.length <= cap) return [];
  const ordenados = [...itens].sort((a, b) => b.idade - a.idade);
  return ordenados.slice(0, itens.length - cap);
}

// src/game/rpg/sistemaRpg.ts
import * as THREE3 from "three";

// src/game/armazem.ts
var NOME_DB = "bateu_armazem";
var LOJA = "chaves";
var VERSAO_DB = 1;
function idbDisponivel() {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}
var promessaDB = null;
function abrirArmazem() {
  if (promessaDB) return promessaDB;
  promessaDB = new Promise((resolve) => {
    if (!idbDisponivel()) {
      resolve(null);
      return;
    }
    try {
      const pedido = indexedDB.open(NOME_DB, VERSAO_DB);
      pedido.onupgradeneeded = () => {
        const db = pedido.result;
        if (!db.objectStoreNames.contains(LOJA)) db.createObjectStore(LOJA);
      };
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => {
        console.warn("[armazem] IDB indispon\xEDvel:", pedido.error?.message);
        resolve(null);
      };
      pedido.onblocked = () => {
        console.warn("[armazem] IDB bloqueado por outra vers\xE3o");
        resolve(null);
      };
    } catch (e) {
      console.warn("[armazem] open lan\xE7ou:", e instanceof Error ? e.message : String(e));
      resolve(null);
    }
  });
  return promessaDB;
}
async function idbDefinir(chave, valor) {
  const bytes = medirBytes(valor);
  const db = await abrirArmazem();
  if (!db) return { ok: false, onde: null, bytes, erro: "IndexedDB indispon\xEDvel" };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(LOJA, "readwrite");
      const loja = tx.objectStore(LOJA);
      const envelope = { ts: Date.now(), v: valor };
      loja.put(envelope, chave);
      tx.oncomplete = () => resolve({ ok: true, onde: "idb", bytes });
      tx.onerror = () => resolve({ ok: false, onde: null, bytes, erro: tx.error?.message || "erro IDB" });
      tx.onabort = () => resolve({ ok: false, onde: null, bytes, erro: tx.error?.message || "IDB abortada (quota?)" });
    } catch (e) {
      resolve({ ok: false, onde: null, bytes, erro: e instanceof Error ? e.message : String(e) });
    }
  });
}
function espelharLS(chaveLS, valor) {
  const bytes = medirBytes(valor);
  try {
    localStorage.setItem(chaveLS, JSON.stringify(valor));
    return { ok: true, bytes };
  } catch (e) {
    return { ok: false, bytes, erro: e instanceof Error ? e.message : "localStorage cheio/indispon\xEDvel" };
  }
}
async function idbObter(chave) {
  const db = await abrirArmazem();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(LOJA, "readonly");
      const pedido = tx.objectStore(LOJA).get(chave);
      tx.oncomplete = () => {
        const r = pedido.result;
        resolve(r && typeof r.ts === "number" ? r : null);
      };
      tx.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function idbRemover(chave) {
  const db = await abrirArmazem();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(LOJA, "readwrite");
      tx.objectStore(LOJA).delete(chave);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
async function estimarEspaco() {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    if (typeof e.usage !== "number" || typeof e.quota !== "number") return null;
    return { uso: e.usage, quota: e.quota };
  } catch {
    return null;
  }
}
async function restaurarLSdeIDB(chaveLS, chaveIDB, validar) {
  try {
    const bruto = localStorage.getItem(chaveLS);
    if (bruto) {
      const v = JSON.parse(bruto);
      if (validar(v)) return false;
    }
  } catch {
  }
  const env = await idbObter(chaveIDB);
  if (!env || !validar(env.v)) return false;
  const espelho = espelharLS(chaveLS, env.v);
  return espelho.ok;
}
function medirBytes(valor) {
  try {
    return JSON.stringify(valor).length;
  } catch {
    return 0;
  }
}
function ligarGanchosArmazem() {
  try {
    if (typeof window === "undefined" || window.__armazem) return;
    window.__armazem = {
      definir: (c, v) => idbDefinir(c, v),
      obter: (c) => idbObter(c),
      remover: (c) => idbRemover(c),
      estimar: () => estimarEspaco(),
      disponivel: () => idbDisponivel()
    };
  } catch {
  }
}
ligarGanchosArmazem();

// src/game/blocos/world.ts
import * as THREE2 from "three";

// src/game/blocos/geracao.ts
var idx = (x, y, z) => (y * CHUNK + z) * CHUNK + x;
function gerarDadosTerreno(ruido, cx, cz, perfil) {
  const dados = new Uint8Array(CHUNK * CHUNK * ALTURA);
  for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
    const x = cx * CHUNK + lx, z = cz * CHUNK + lz;
    const h = perfil.altura(x, z);
    const bioma = perfil.bioma(x, z);
    for (let y = 0; y < ALTURA; y++) {
      let id = B.AR;
      if (y === 0 || y === 1 && ruido.n3(x, y, z) < 0.5) id = B.ROCHA_MAE;
      else if (y < h - 3) {
        id = B.PEDRA;
        if (y > 3 && y < h - 4) {
          const c = ruido.n3(x * 0.075, y * 0.1, z * 0.075);
          if (c > 0.74) id = B.AR;
        }
        if (id === B.PEDRA) {
          const r = ruido.n3(x * 0.9 + 40, y * 0.9 + 40, z * 0.9 + 40);
          if (y < 48 && r > 0.988) id = B.CARVAO_M;
          else if (y < 32 && r < 0.012) id = B.FERRO_M;
          else if (y < 20 && r > 0.985) id = B.OURO_M;
          else if (y < 14 && r < 7e-3) id = B.DIAMANTE_M;
        }
      } else if (y < h) id = bioma === "deserto" ? B.AREIA : B.TERRA;
      else if (y === h) id = bioma === "deserto" ? B.AREIA : h < NIVEL_MAR + 1 ? B.AREIA : B.RELVA;
      else if (y <= NIVEL_MAR) id = B.AGUA;
      dados[idx(lx, y, lz)] = id;
    }
    if (h > NIVEL_MAR + 1 && dados[idx(lx, h, lz)] === B.RELVA) {
      const pArvore = bioma === "floresta" ? 0.05 : bioma === "planicie" ? 0.016 : 0;
      if (ruido.hashCol(x, z, 11) < pArvore && lx > 1 && lx < CHUNK - 2 && lz > 1 && lz < CHUNK - 2) {
        const alt = 4 + Math.floor(ruido.hashCol(x, z, 29) * 3);
        for (let t = 1; t <= alt; t++) dados[idx(lx, h + t, lz)] = B.TRONCO;
        for (let dy = alt - 2; dy <= alt + 1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          const dist = Math.abs(dx) + Math.abs(dz) + Math.abs(dy - alt + 0.5) * 1.4;
          if (dist <= 3.4 && !(dx === 0 && dz === 0 && dy < alt)) {
            const px2 = lx + dx, py = h + dy + 1, pz2 = lz + dz;
            if (px2 >= 0 && px2 < CHUNK && pz2 >= 0 && pz2 < CHUNK && py < ALTURA && dados[idx(px2, py, pz2)] === B.AR)
              dados[idx(px2, py, pz2)] = B.FOLHAS;
          }
        }
      }
    }
    const topo = dados[idx(lx, h, lz)];
    if (h > NIVEL_MAR + 1 && h + 1 < ALTURA && dados[idx(lx, h + 1, lz)] === B.AR) {
      const d1 = ruido.hashCol(x, z, 53);
      if (bioma === "deserto" && topo === B.AREIA) {
        if (d1 < 0.014) {
          const altC = 1 + Math.floor(ruido.hashCol(x, z, 71) * 3);
          for (let t = 1; t <= altC && h + t < ALTURA; t++) dados[idx(lx, h + t, lz)] = B.CACTO;
        }
      } else if (topo === B.RELVA) {
        if (d1 < (bioma === "planicie" ? 0.07 : 0.055)) dados[idx(lx, h + 1, lz)] = B.ERVA;
        else if (d1 < (bioma === "planicie" ? 0.079 : 0.067)) dados[idx(lx, h + 1, lz)] = B.FLOR_AM;
        else if (d1 < (bioma === "planicie" ? 0.088 : 0.079)) dados[idx(lx, h + 1, lz)] = B.FLOR_VM;
      }
    }
  }
  return dados;
}
function alturaTerrenoBase(ruido, x, z) {
  const base = ruido.fbm2(x * 0.012, z * 0.012, 4);
  const montanha = ruido.fbm2(x * 4e-3 + 500, z * 4e-3 + 500, 3);
  const detalhe = ruido.n2(x * 0.06, z * 0.06);
  let h = 28 + base * 22 + Math.max(0, montanha - 0.55) * 70 + detalhe * 3;
  return Math.max(4, Math.min(ALTURA - 6, Math.floor(h)));
}
function biomaBase(ruido, x, z) {
  const t = ruido.fbm2(x * 5e-3 + 900, z * 5e-3 + 900, 3);
  if (alturaTerrenoBase(ruido, x, z) > 52) return "montanha";
  if (t < 0.36) return "deserto";
  if (t > 0.62) return "floresta";
  return "planicie";
}
function aplicarEditsChunk(dados, edits, cx, cz) {
  for (const [k, v] of edits) {
    const [ex, ey, ez] = k.split(",").map(Number);
    if (Math.floor(ex / CHUNK) === cx && Math.floor(ez / CHUNK) === cz)
      dados[idx((ex % CHUNK + CHUNK) % CHUNK, ey, (ez % CHUNK + CHUNK) % CHUNK)] = v;
  }
}
function somaBytes(dados) {
  let s = 0;
  for (let i = 0; i < dados.length; i++) s += dados[i];
  return s;
}

// src/game/blocos/malha.ts
var idx2 = (x, y, z) => (y * CHUNK + z) * CHUNK + x;
function uvPorTile(t) {
  const w = COLS_ATLAS, h = LINHAS_ATLAS;
  const col = t % w, lin = Math.floor(t / w);
  const u0 = col / w, v1 = 1 - lin / h, u1 = (col + 1) / w, v0 = 1 - (lin + 1) / h;
  return { u0, v0, u1, v1 };
}
var FACES = [
  { dir: [0, 1, 0], verts: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], sombra: 1, escolher: "topo" },
  { dir: [0, -1, 0], verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], sombra: 0.5, escolher: "baixo" },
  { dir: [1, 0, 0], verts: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], sombra: 0.8, escolher: "lado" },
  { dir: [-1, 0, 0], verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], sombra: 0.8, escolher: "lado" },
  { dir: [0, 0, 1], verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], sombra: 0.65, escolher: "lado" },
  { dir: [0, 0, -1], verts: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], sombra: 0.65, escolher: "lado" }
];
var escolherIndice = (nums) => {
  let max = 0;
  for (let i = 0; i < nums.length; i++) if (nums[i] > max) max = nums[i];
  return max <= 65535 ? new Uint16Array(nums) : new Uint32Array(nums);
};
function construirDadosMalha(cx, cz, dados, viz, superficie) {
  const baseX = cx * CHUNK, baseZ = cz * CHUNK;
  const pos = [], nor = [], uv = [], cor = [], ind = [];
  const posA = [], norA = [], uvA = [], corA = [], indA = [];
  const blocoEm = (lx, y, lz) => {
    if (y < 0 || y >= ALTURA) return B.AR;
    if (lx < 0) {
      const d = viz.xn;
      return d ? d[idx2(CHUNK - 1, y, lz)] : B.AR;
    }
    if (lx >= CHUNK) {
      const d = viz.xp;
      return d ? d[idx2(0, y, lz)] : B.AR;
    }
    if (lz < 0) {
      const d = viz.zn;
      return d ? d[idx2(lx, y, CHUNK - 1)] : B.AR;
    }
    if (lz >= CHUNK) {
      const d = viz.zp;
      return d ? d[idx2(lx, y, 0)] : B.AR;
    }
    return dados[idx2(lx, y, lz)];
  };
  const solidoEm = (x, y, z) => {
    const d = BLOCOS[blocoEm(Math.floor(x), Math.floor(y), Math.floor(z))];
    return !!d && d.solido;
  };
  const face = (x, y, z, dir, verts, tile, sombra, alvo) => {
    const { u0, v0, u1, v1 } = uvPorTile(tile);
    const P = alvo === "s" ? pos : posA, N = alvo === "s" ? nor : norA, U = alvo === "s" ? uv : uvA, C = alvo === "s" ? cor : corA, I2 = alvo === "s" ? ind : indA;
    const ini = P.length / 3;
    const [dx, dy, dz] = dir;
    const aov = verts.map(([vx, vy, vz]) => {
      let oc = 0;
      const ex = dx !== 0 ? 0 : 1, ey = dy !== 0 ? 0 : 1, ez = dz !== 0 ? 0 : 1;
      const bx = x + dx, by = y + dy, bz = z + dz;
      if (ex) {
        if (solidoEm(bx, by + (vy ? -0.5 : 0.5), bz)) oc++;
        if (solidoEm(bx, by, bz + (vz ? -0.5 : 0.5))) oc++;
      }
      if (ey) {
        if (solidoEm(bx + (vx ? -0.5 : 0.5), by, bz)) oc++;
        if (solidoEm(bx, by, bz + (vz ? -0.5 : 0.5))) oc++;
      }
      if (ez) {
        if (solidoEm(bx + (vx ? -0.5 : 0.5), by, bz)) oc++;
        if (solidoEm(bx, by + (vy ? -0.5 : 0.5), bz)) oc++;
      }
      return 1 - oc * 0.16;
    });
    for (let i = 0; i < 4; i++) {
      const [vx, vy, vz] = verts[i];
      P.push(x + vx, y + vy, z + vz);
      N.push(dx, dy, dz);
      C.push(sombra * aov[i], sombra * aov[i], sombra * aov[i]);
    }
    const m = 1e-3;
    if (dir[1] === 1) U.push(u0 + m, v0 + m, u1 - m, v0 + m, u1 - m, v1 - m, u0 + m, v1 - m);
    else if (dir[1] === -1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
    else if (dir[0] === 1) U.push(u1 - m, v1 - m, u0 + m, v1 - m, u0 + m, v0 + m, u1 - m, v0 + m);
    else if (dir[0] === -1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
    else if (dir[2] === 1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
    else U.push(u1 - m, v1 - m, u0 + m, v1 - m, u0 + m, v0 + m, u1 - m, v0 + m);
    I2.push(ini, ini + 1, ini + 2, ini, ini + 2, ini + 3);
  };
  const emitirCruz = (x, y, z, tile, luz) => {
    const { u0, v0, u1, v1 } = uvPorTile(tile);
    const m = 0.5 / (COLS_ATLAS * TILE);
    const mv = 0.5 / (LINHAS_ATLAS * TILE);
    const uA = u0 + m, uB = u1 - m, vA = v0 + mv, vB = v1 - mv;
    const planos = [
      [[0.09, 0.09], [0.91, 0.91]],
      [[0.91, 0.09], [0.09, 0.91]]
    ];
    for (const [[ax, az], [bx, bz]] of planos) {
      for (const inv of [false, true]) {
        const ini = pos.length / 3;
        const vs = inv ? [[bx, 0, bz], [ax, 0, az], [ax, 1, az], [bx, 1, bz]] : [[ax, 0, az], [bx, 0, bz], [bx, 1, bz], [ax, 1, az]];
        for (const [vx, vy, vz] of vs) {
          pos.push(x + vx, y + vy, z + vz);
          nor.push(0, 1, 0);
          cor.push(luz, luz, luz);
        }
        uv.push(uA, vA, uB, vA, uB, vB, uA, vB);
        ind.push(ini, ini + 1, ini + 2, ini, ini + 2, ini + 3);
      }
    }
  };
  for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
    const wx = baseX + lx, wz = baseZ + lz;
    const superficieCol = superficie(wx, wz);
    for (let y = 0; y < ALTURA; y++) {
      const id = dados[idx2(lx, y, lz)];
      if (id === B.AR) continue;
      const def = BLOCOS[id];
      if (!def) continue;
      if (def.cruz) {
        const profC = Math.max(0, Math.min(1, (superficieCol - 3 - y) / 9));
        emitirCruz(wx, y, wz, def.tiles[0], 1 - profC * 0.72);
        continue;
      }
      const aguada = !!def.liquido;
      for (const f of FACES) {
        const nx = wx + f.dir[0], ny = y + f.dir[1], nz = wz + f.dir[2];
        const vizId = blocoEm(nx - baseX, ny, nz - baseZ);
        const defViz = BLOCOS[vizId];
        const mostrar = vizId === B.AR || defViz && defViz.transparente && !def.transparente || def.transparente && vizId === B.AGUA && id !== B.AGUA;
        if (!mostrar) continue;
        if (aguada && f.dir[1] !== 1) continue;
        const tile = f.escolher === "topo" ? def.tiles[0] : f.escolher === "baixo" ? def.tiles[1] : def.tiles[2];
        const prof = Math.max(0, Math.min(1, (superficieCol - 3 - y) / 9));
        const luz = aguada ? 1 : 1 - prof * 0.72;
        face(wx, y, wz, f.dir, f.verts, tile, f.sombra * luz, aguada ? "a" : "s");
      }
    }
  }
  return {
    pos: new Float32Array(pos),
    nor: new Float32Array(nor),
    uv: new Float32Array(uv),
    cor: new Float32Array(cor),
    ind: escolherIndice(ind),
    posA: new Float32Array(posA),
    norA: new Float32Array(norA),
    uvA: new Float32Array(uvA),
    corA: new Float32Array(corA),
    indA: escolherIndice(indA)
  };
}
function somaValores(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s;
}
function malhaIgual(a, b) {
  const pares = [
    [a.pos, b.pos],
    [a.nor, b.nor],
    [a.uv, b.uv],
    [a.cor, b.cor],
    [a.ind, b.ind],
    [a.posA, b.posA],
    [a.norA, b.norA],
    [a.uvA, b.uvA],
    [a.corA, b.corA],
    [a.indA, b.indA]
  ];
  for (const [x, y] of pares) {
    if (x.length !== y.length) return false;
    if (somaValores(x) !== somaValores(y)) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  }
  return true;
}

// src/game/blocos/world.ts
var idx3 = (x, y, z) => (y * CHUNK + z) * CHUNK + x;
var Mundo = class {
  constructor(semente) {
    this.semente = semente;
    this.ruido = new Ruido(semente);
    this.rndArvores = new Aleatorio(semente * 31 + 7);
    const atlas = criarAtlas();
    const tex = new THREE2.CanvasTexture(atlas);
    tex.magFilter = THREE2.NearestFilter;
    tex.minFilter = THREE2.NearestFilter;
    tex.colorSpace = THREE2.SRGBColorSpace;
    this.material = new THREE2.MeshLambertMaterial({ map: tex, vertexColors: true, alphaTest: 0.5 });
    this.materialAgua = new THREE2.MeshLambertMaterial({
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE2.DoubleSide
    });
  }
  semente;
  chunks = /* @__PURE__ */ new Map();
  edits = /* @__PURE__ */ new Map();
  // alterações do jogador "x,y,z" -> id
  tochas = /* @__PURE__ */ new Set();
  // posições de tochas colocadas (para luz real)
  ruido;
  rndArvores;
  grupo = new THREE2.Group();
  material;
  materialAgua;
  // ── v46: geração de DADOS de chunk em Web Worker (padrão Veloren) ──
  // a malha continua no main thread (THREE); os DADOS são paralelizáveis.
  // As subclasses declaram o perfil de terreno para o worker usar AS MESMAS
  // fórmulas puras (terrenoRpg/terrenoCidade) — zero segunda fonte.
  perfilId = "base";
  worker = null;
  workerAtivo = false;
  workerErro = "";
  pendentes = /* @__PURE__ */ new Set();
  geradosWorker = 0;
  geradosSync = 0;
  emergencias = 0;
  descartados = 0;
  msUltimoWorker = 0;
  msWorkerTotal = 0;
  // ── v51: MALHAGEM em Web Worker (padrão Veloren: meshing threads) ──
  // o trabalho pesado (faces/AO/UV) corre no worker; o main thread SÓ
  // cria as BufferGeometry dos buffers prontos (o upload à GPU). Sync
  // permanece para o spawn/teleporte/emergência (E2Es assumem terreno
  // imediato — anotação v46) e como fallback honesto se o worker falhar.
  malhador = null;
  malhadorAtivo = false;
  malhadorErro = "";
  pendentesMalha = /* @__PURE__ */ new Set();
  malhasProntas = [];
  malhasPedidas = 0;
  malhadosWorker = 0;
  malhadosSync = 0;
  malhasDescartadas = 0;
  msMalhaUltimo = 0;
  msMalhaWorkerTotal = 0;
  msMalhaSyncTotal = 0;
  // ── Altura do terreno (mapa de alturas determinístico) ──────
  // v46: delega nas funções puras de geracao.ts — as MESMAS que o worker
  // usa (as subclasses sobrepõem por delegação aos seus perfis puras).
  alturaTerreno(x, z) {
    return alturaTerrenoBase(this.ruido, x, z);
  }
  bioma(x, z) {
    return biomaBase(this.ruido, x, z);
  }
  // ── Geração de um chunk (main thread) ────────────────────────────
  // v46: as colunas vêm de gerarDadosTerreno (o MESMO algoritmo que o
  // worker corre) + edições + carimbos do mundo via posGerar().
  gerarChunk(cx, cz) {
    this.geradosSync++;
    const dados = gerarDadosTerreno(this.ruido, cx, cz, this.perfil());
    return this.finalizarChunk(cx, cz, dados);
  }
  /** Par de funções de terreno desta instância (as subclasses delegam
   *  nas suas funções puras — o worker usa exactamente essas). */
  perfil() {
    return { altura: (x, z) => this.alturaTerreno(x, z), bioma: (x, z) => this.bioma(x, z) };
  }
  /** Fase comum aos dois caminhos de geração (sync e worker): edições do
   *  jogador + carimbos específicos do mundo. Único ponto de entrada. */
  finalizarChunk(cx, cz, dados) {
    aplicarEditsChunk(dados, this.edits, cx, cz);
    const c = { cx, cz, dados, sujo: true };
    this.posGerar(c);
    return c;
  }
  /** Carimbos específicos do mundo (POIs do RPG, distritos da CIDADE) —
   *  baratos, ficam no main thread; as subclasses sobrepõem. */
  posGerar(_c) {
    void _c;
  }
  // ── v46: worker de geração ──────────────────────────────────
  ativarWorker() {
    if (this.worker) return this.workerAtivo;
    try {
      const w = new Worker(new URL("./geradorTerreno.worker.ts", import.meta.url), { type: "module" });
      w.onerror = (e) => {
        this.workerErro = e.message || "erro no worker";
        this.workerAtivo = false;
      };
      w.onmessage = (e) => this.receberDoWorker(e.data);
      w.postMessage({ tipo: "init", semente: this.semente, perfil: this.perfilId });
      this.worker = w;
      this.workerAtivo = true;
    } catch (err) {
      this.workerErro = String(err);
      this.workerAtivo = false;
    }
    return this.workerAtivo;
  }
  desativarWorker() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
      }
    }
    this.worker = null;
    this.workerAtivo = false;
    this.pendentes.clear();
  }
  // ── v51: worker de MALHAGEM ─────────────────────────────────
  ativarMalhador() {
    if (this.malhador) return this.malhadorAtivo;
    try {
      const w = new Worker(new URL("./malhador.worker.ts", import.meta.url), { type: "module" });
      w.onerror = (e) => {
        this.malhadorErro = e.message || "erro no malhador";
        this.malhadorAtivo = false;
        this.pendentesMalha.clear();
      };
      w.onmessage = (e) => this.receberMalhaDoWorker(e.data);
      w.postMessage({ tipo: "init", semente: this.semente, perfil: this.perfilId });
      this.malhador = w;
      this.malhadorAtivo = true;
    } catch (err) {
      this.malhadorErro = String(err);
      this.malhadorAtivo = false;
    }
    return this.malhadorAtivo;
  }
  desativarMalhador() {
    if (this.malhador) {
      try {
        this.malhador.terminate();
      } catch {
      }
    }
    this.malhador = null;
    this.malhadorAtivo = false;
    this.pendentesMalha.clear();
    this.malhasProntas = [];
  }
  /** Dados crus dos 4 vizinhos (para a malha respeitar as fronteiras
   *  e o AO — o MESMO critério do getBloco antigo: ausente = AR). */
  vizinhosMalha(cx, cz) {
    const n = (dx, dz) => this.getChunk(cx + dx, cz + dz)?.dados;
    return { xn: n(-1, 0), xp: n(1, 0), zn: n(0, -1), zp: n(0, 1) };
  }
  /** Construção PURA dos buffers (usada pelo caminho sync e pela
   *  verificação de identidade compararMalhaComSync). */
  dadosMalha(c) {
    return construirDadosMalha(c.cx, c.cz, c.dados, this.vizinhosMalha(c.cx, c.cz), (x, z) => this.alturaTerreno(x, z));
  }
  /** Pede a MALHA de um chunk ao worker. Os dados vão como CÓPIAS
   *  (structured clone — o main thread mantém os seus). A resposta
   *  entra na fila malhasProntas e o motor aplica com orçamento. */
  pedirMalha(c) {
    if (!this.malhadorAtivo || !this.malhador) return false;
    const k = this.chave(c.cx, c.cz);
    if (this.pendentesMalha.has(k)) return false;
    this.pendentesMalha.add(k);
    this.malhasPedidas++;
    this.malhador.postMessage({ tipo: "malhar", cx: c.cx, cz: c.cz, dados: c.dados, vizinhos: this.vizinhosMalha(c.cx, c.cz) });
    return true;
  }
  receberMalhaDoWorker(m) {
    if (m?.tipo !== "malha" || typeof m.cx !== "number" || typeof m.cz !== "number" || !m.dm) return;
    const k = this.chave(m.cx, m.cz);
    this.pendentesMalha.delete(k);
    const ms = m.ms ?? 0;
    this.msMalhaUltimo = ms;
    if (!this.chunks.has(k)) {
      this.malhasDescartadas++;
      return;
    }
    this.malhasProntas.push({ cx: m.cx, cz: m.cz, dm: m.dm, ms });
  }
  /** Aplica as malhas prontas do worker com orçamento por frame —
   *  o main thread só faz o upload (BufferGeometry) da parte barata. */
  processarMalhasProntas(orcamento = 4) {
    while (orcamento > 0 && this.malhasProntas.length > 0) {
      const p = this.malhasProntas.shift();
      const c = this.chunks.get(this.chave(p.cx, p.cz));
      if (!c) {
        this.malhasDescartadas++;
        continue;
      }
      this.montarMalha(c, p.dm);
      this.malhadosWorker++;
      this.msMalhaWorkerTotal += p.ms;
      orcamento--;
    }
  }
  /** Contagens honestas da malhagem (E2E v51). */
  infoMalha() {
    return {
      malhador: this.malhadorAtivo,
      erroMalhador: this.malhadorErro,
      perfil: this.perfilId,
      pedidas: this.malhasPedidas,
      malhadasWorker: this.malhadosWorker,
      malhadasSync: this.malhadosSync,
      descartadas: this.malhasDescartadas,
      pendentes: this.pendentesMalha.size,
      prontas: this.malhasProntas.length,
      msUltimoWorker: Math.round(this.msMalhaUltimo),
      msWorkerTotal: Math.round(this.msMalhaWorkerTotal),
      msSyncTotal: Math.round(this.msMalhaSyncTotal)
    };
  }
  /** Prova de identidade da MALHA: reconstrói os buffers PELO CAMINHO
   *  SYNC (dados vivos + vizinhos vivos + altura do perfil) e compara
   *  com a malha viva (que pode ter vindo do worker) — bit a bit. */
  compararMalhaComSync(cx, cz) {
    const t0 = performance.now();
    const live = this.chunks.get(this.chave(cx, cz));
    if (!live || !live.malha) return { igual: false, vertsLive: -1, vertsSync: -1, vertsAguaLive: -1, vertsAguaSync: -1, msSync: 0 };
    const dm = this.dadosMalha(live);
    const g = live.malha.geometry, gA = live.malhaAgua?.geometry;
    const att = (geo, nome) => Array.from(geo.getAttribute(nome).array);
    const idxArr = (geo) => geo?.index ? Array.from(geo.index.array) : [];
    const iguais = malhaIgual(dm, {
      pos: new Float32Array(att(g, "position")),
      nor: new Float32Array(att(g, "normal")),
      uv: new Float32Array(att(g, "uv")),
      cor: new Float32Array(att(g, "color")),
      ind: new Uint32Array(idxArr(g)),
      posA: gA ? new Float32Array(att(gA, "position")) : new Float32Array(0),
      norA: gA ? new Float32Array(att(gA, "normal")) : new Float32Array(0),
      uvA: gA ? new Float32Array(att(gA, "uv")) : new Float32Array(0),
      corA: gA ? new Float32Array(att(gA, "color")) : new Float32Array(0),
      indA: new Uint32Array(idxArr(gA))
    });
    return {
      igual: iguais,
      vertsLive: g.getAttribute("position").count,
      vertsSync: dm.pos.length / 3,
      vertsAguaLive: gA ? gA.getAttribute("position").count : 0,
      vertsAguaSync: dm.posA.length / 3,
      msSync: Math.round(performance.now() - t0)
    };
  }
  receberDoWorker(m) {
    if (m?.tipo !== "chunk" || typeof m.cx !== "number" || typeof m.cz !== "number" || !m.dados) return;
    const k = this.chave(m.cx, m.cz);
    this.pendentes.delete(k);
    const ms = m.ms ?? 0;
    this.msUltimoWorker = ms;
    this.msWorkerTotal += ms;
    if (this.chunks.has(k)) {
      this.descartados++;
      return;
    }
    const c = this.finalizarChunk(m.cx, m.cz, new Uint8Array(m.dados));
    this.chunks.set(k, c);
    this.geradosWorker++;
  }
  /** Pede os dados de um chunk ao worker (sem duplicar pedidos).
   *  A resposta entra pelo MESMO caminho do sync (edições + carimbos). */
  pedirChunk(cx, cz) {
    if (!this.workerAtivo || !this.worker) return false;
    const k = this.chave(cx, cz);
    if (this.chunks.has(k) || this.pendentes.has(k)) return false;
    this.pendentes.add(k);
    this.worker.postMessage({ tipo: "gerar", cx, cz });
    return true;
  }
  /** Contagens honestas da geração (E2E v46). */
  infoGeracao() {
    return {
      worker: this.workerAtivo,
      erroWorker: this.workerErro,
      perfil: this.perfilId,
      semente: this.semente,
      geradosWorker: this.geradosWorker,
      geradosSync: this.geradosSync,
      emergencias: this.emergencias,
      pendentes: this.pendentes.size,
      descartados: this.descartados,
      carregados: this.chunks.size,
      msUltimoWorker: Math.round(this.msUltimoWorker),
      msWorkerTotal: Math.round(this.msWorkerTotal)
    };
  }
  /** Prova de identidade byte a byte: regenera o chunk PELO CAMINHO SYNC
   *  (ruido fresco da mesma semente + edições + carimbos) e compara a soma
   *  de bytes com o chunk vivo (que pode ter vindo do worker). */
  compararComSync(cx, cz) {
    const t0 = performance.now();
    const dados = gerarDadosTerreno(new Ruido(this.semente), cx, cz, this.perfil());
    const c = this.finalizarChunk(cx, cz, dados);
    const msSync = performance.now() - t0;
    const live = this.chunks.get(this.chave(cx, cz));
    if (!live) return { igual: false, somaLive: -1, somaSync: somaBytes(c.dados), msSync };
    const somaLive = somaBytes(live.dados), somaSync = somaBytes(c.dados);
    return { igual: somaLive === somaSync, somaLive, somaSync, msSync: Math.round(msSync) };
  }
  chave(cx, cz) {
    return `${cx},${cz}`;
  }
  getChunk(cx, cz) {
    return this.chunks.get(this.chave(cx, cz));
  }
  garantir(cx, cz) {
    const k = this.chave(cx, cz);
    let c = this.chunks.get(k);
    if (!c) {
      c = this.gerarChunk(cx, cz);
      this.chunks.set(k, c);
    }
    return c;
  }
  getBloco(x, y, z) {
    if (y < 0 || y >= ALTURA) return B.AR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(this.chave(cx, cz));
    if (!c) return B.AR;
    return c.dados[idx3((x % CHUNK + CHUNK) % CHUNK, y, (z % CHUNK + CHUNK) % CHUNK)];
  }
  setBloco(x, y, z, id, marcarEdit = true) {
    if (y < 0 || y >= ALTURA) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(this.chave(cx, cz));
    if (!c) return;
    const lx = (x % CHUNK + CHUNK) % CHUNK, lz = (z % CHUNK + CHUNK) % CHUNK;
    c.dados[idx3(lx, y, lz)] = id;
    const chave = `${x},${y},${z}`;
    if (id === B.TOCHA) this.tochas.add(chave);
    else this.tochas.delete(chave);
    if (marcarEdit) {
      this.edits.set(chave, id);
    }
    c.sujo = true;
    if (lx === 0) {
      const v = this.getChunk(cx - 1, cz);
      if (v) v.sujo = true;
    }
    if (lx === CHUNK - 1) {
      const v = this.getChunk(cx + 1, cz);
      if (v) v.sujo = true;
    }
    if (lz === 0) {
      const v = this.getChunk(cx, cz - 1);
      if (v) v.sujo = true;
    }
    if (lz === CHUNK - 1) {
      const v = this.getChunk(cx, cz + 1);
      if (v) v.sujo = true;
    }
  }
  solido(x, y, z) {
    return solidoId(this.getBloco(Math.floor(x), Math.floor(y), Math.floor(z)));
  }
  // ── Explosão (Estourador / TNT) — destrói blocos num raio ──
  explodir(cx, cy, cz, rnd, raio = RAIO_EXPLOSAO) {
    const removidos = [];
    const r = Math.ceil(raio);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dy, dz);
      if (d > raio + rnd.proximo() * 0.6) continue;
      const x = cx + dx, y = cy + dy, z = cz + dz;
      const id = this.getBloco(x, y, z);
      if (id === B.AR || id === B.AGUA || id === B.ROCHA_MAE) continue;
      this.setBloco(x, y, z, B.AR);
      removidos.push([x, y, z]);
    }
    return removidos;
  }
  // ── Malhagem de chunk (v51: buffers PUROS em malha.ts) ──────
  // construirMalha = caminho SYNC (spawn/teleporte/emergência/fallback):
  // calcula os buffers no próprio frame e cria as geometrias.
  construirMalha(c) {
    const t0 = performance.now();
    const dm = this.dadosMalha(c);
    this.montarMalha(c, dm);
    this.malhadosSync++;
    this.msMalhaSyncTotal += performance.now() - t0;
  }
  /** O único ponto onde THREE entra na malhagem: typed arrays prontos →
   *  BufferGeometry + Mesh (a parte barata — upload). Os números são
   *  EXACTAMENTE os mesmos do caminho do worker (compararMalhaComSync
   *  prova bit a bit no E2E v51). */
  montarMalha(c, dm) {
    const montar = (solidos, mat) => {
      const I2 = solidos ? dm.ind : dm.indA;
      if (!I2.length) return void 0;
      const g = new THREE2.BufferGeometry();
      g.setAttribute("position", new THREE2.BufferAttribute(solidos ? dm.pos : dm.posA, 3));
      g.setAttribute("normal", new THREE2.BufferAttribute(solidos ? dm.nor : dm.norA, 3));
      g.setAttribute("uv", new THREE2.BufferAttribute(solidos ? dm.uv : dm.uvA, 2));
      g.setAttribute("color", new THREE2.BufferAttribute(solidos ? dm.cor : dm.corA, 3));
      g.setIndex(new THREE2.BufferAttribute(I2, 1));
      const m = new THREE2.Mesh(g, mat);
      m.frustumCulled = true;
      return m;
    };
    for (const antigo of [c.malha, c.malhaAgua]) if (antigo) {
      this.grupo.remove(antigo);
      antigo.geometry.dispose();
    }
    c.malha = montar(true, this.material);
    c.malhaAgua = montar(false, this.materialAgua);
    if (c.malha) this.grupo.add(c.malha);
    if (c.malhaAgua) this.grupo.add(c.malhaAgua);
    c.sujo = false;
  }
  // posição segura de spawn — AGORA perto de floresta (v29):
  // a progressão começa por soque um tronco, por isso o jogador
  // tem de nascer com árvores à vista. Procura floresta em anéis
  // (determinístico), depois planície; deserto/montanha são evitados.
  spawnPos() {
    let planicie = null;
    let qualquer = null;
    for (let r = 0; r <= 360; r += 8) {
      const passos = Math.max(1, Math.floor(r * 6.283 / 8));
      for (let a = 0; a < passos; a++) {
        const ang = a / passos * 6.283 + r * 0.35;
        const x = Math.round(Math.cos(ang) * r), z = Math.round(Math.sin(ang) * r);
        const h = this.alturaTerreno(x, z);
        if (h <= NIVEL_MAR + 1) continue;
        const b = this.bioma(x, z);
        const pos = [x + 0.5, h + 1.02, z + 0.5];
        if (b === "floresta") return pos;
        if (b === "planicie" && !planicie) planicie = pos;
        if (!qualquer) qualquer = pos;
      }
      if (r >= 120 && planicie) return planicie;
    }
    if (planicie) return planicie;
    if (qualquer) return qualquer;
    return [0.5, this.alturaTerreno(0, 0) + 1.02, 0.5];
  }
};

// src/game/rpg/core.ts
var SEED_RPG = 20251113;
var ALTURA_ALDEIA = 32;
var SPAWN_ALDEIA = [2.5, 4.5];
var DIFICULDADES_RPG = {
  medio: {
    id: "medio",
    nome: "M\xC9DIO",
    desc: "O equil\xEDbrio dos contos. Inimigos como contam os bardos, recompensas justas.",
    multHpMob: 1,
    multDanoMob: 1,
    multXP: 1,
    multCred: 1,
    raioPoi: 14,
    freqSpawn: 1
  },
  dificil: {
    id: "dificil",
    nome: "DIF\xCDCIL",
    desc: "Para quem j\xE1 sobreviveu a uma noite no Miombo. Inimigos 50% mais fortes, XP e cr\xE9ditos +25%.",
    multHpMob: 1.5,
    multDanoMob: 1.5,
    multXP: 1.25,
    multCred: 1.25,
    raioPoi: 12,
    freqSpawn: 1.35
  },
  lenda: {
    id: "lenda",
    nome: "LENDA",
    desc: "Os guardi\xF5es acordam. Inimigos mais que duplicados, XP e cr\xE9ditos +60% \u2014 s\xF3 para lendas vivas.",
    multHpMob: 2.2,
    multDanoMob: 2.2,
    multXP: 1.6,
    multCred: 1.6,
    raioPoi: 10,
    freqSpawn: 1.8
  }
};
var REGIOES = [
  { id: "aldeia", nome: "Plan\xEDcie da Aldeia", nivel: 1, cor: "#facc15", cx: 0, cz: 0, raio: 26, desc: "O lar. Casas de pau-a-pino, fogueira acesa e o imbondeiro dos contos." },
  { id: "planalto", nome: "Planalto dos Ventos", nivel: 2, cor: "#f59e0b", cx: -56, cz: 14, raio: 34, desc: "Relva alta onde o vento nunca para. Zumbis vagam ao anoitecer." },
  { id: "miombo", nome: "Miombo Profundo", nivel: 3, cor: "#22c55e", cx: 58, cz: -42, raio: 36, desc: "Floresta densa de miombo \u2014 bioma real do leste de Mo\xE7ambique e Angola. Aranhas ca\xE7am aqui." },
  { id: "costa", nome: "Costa dos Corais", nivel: 3, cor: "#22d3ee", cx: 8, cz: 64, raio: 36, desc: "Areia branca e mar. O porto dos ventos espera cors\xE1rios." },
  { id: "serra", nome: "Serra do Norte", nivel: 4, cor: "#a78bfa", cx: -18, cz: -80, raio: 34, desc: "Pedra e altura. Da torre v\xEA-se metade do mundo." },
  { id: "cinzas", nome: "Terra de Cinzas", nivel: 5, cor: "#fb923c", cx: 82, cz: 52, raio: 30, desc: "Solo vulc\xE2nico e estouradores. Ningu\xE9m acampa duas vezes aqui." }
];
function regiaoEm(x, z) {
  let melhor = null;
  let melhorD = Infinity;
  for (const r of REGIOES) {
    const d = Math.hypot(x - r.cx, z - r.cz);
    if (d <= r.raio && d < melhorD) {
      melhor = r;
      melhorD = d;
    }
  }
  return melhor;
}
var NIVEL_SELVAGEM = 2;
var bau = (poi, n, x, y, z) => ({ chave: `poi:${poi}:${n}`, x, y, z });
var POIS = [
  { id: "aldeia", nome: "Aldeia Inicial", tipo: "aldeia", regiao: "aldeia", x: 0, z: 2, baus: [bau("aldeia", 1, 4, ALTURA_ALDEIA + 1, 5)], desc: "Onde tudo come\xE7a. A fogueira nunca apaga." },
  { id: "torre", nome: "Torre do Vigia", tipo: "torre", regiao: "aldeia", x: 14, z: -16, baus: [bau("torre", 1, 14, ALTURA_ALDEIA + 10, -16)], desc: "Do topo v\xEA-se o Planalto inteiro \u2014 e o que nele se move." },
  { id: "cacadores", nome: "Acampamento dos Ca\xE7adores", tipo: "acampamento", regiao: "planalto", x: -52, z: 18, baus: [bau("cacadores", 1, -52, 35, 18)], desc: "Tendas, um espeto e as hist\xF3rias de quem voltou." },
  { id: "forja", nome: "Forja Perdida", tipo: "forja", regiao: "cinzas", x: 82, z: 52, baus: [bau("forja", 1, 82, 34, 52)], desc: "Fornalhas ainda mornas. Algu\xE9m fundiu ferro aqui \u2014 h\xE1 pouco tempo." },
  { id: "ruinas", nome: "Ru\xEDnas de Kivulivuli", tipo: "ruinas", regiao: "miombo", x: 58, z: -42, baus: [bau("ruinas", 1, 54, 33, -46), bau("ruinas", 2, 62, 33, -38)], desc: "Muros partidos de um reino que os mapas esqueceram. O Guardi\xE3o dorme aqui." },
  { id: "cova", nome: "Cova dos Morcegos", tipo: "cova", regiao: "miombo", x: 70, z: -30, baus: [bau("cova", 1, 70, 28, -31)], desc: "Uma boca de pedra na encosta. Dentro, o fresco da terra." },
  { id: "baoba", nome: "Baob\xE1 Anci\xE3o", tipo: "baoba", regiao: "planalto", x: -38, z: 34, baus: [bau("baoba", 1, -36, 33, 34)], desc: "A \xE1rvore mais velha da plan\xEDcie. H\xE1 quem pe\xE7a desculpa antes de tocar-lhe." },
  { id: "porto", nome: "Porto dos Ventos", tipo: "porto", regiao: "costa", x: 10, z: 66, baus: [bau("porto", 1, 10, 32, 68)], desc: "Cais de t\xE1buas gastas. O mar devolve o que leva." }
];
function poiEm(x, z, raio) {
  let melhor = null;
  let melhorD = Infinity;
  for (const p of POIS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d <= raio && d < melhorD) {
      melhor = p;
      melhorD = d;
    }
  }
  return melhor;
}
var ESPOLIO_BAUS = {
  "poi:aldeia:1": [{ id: I.PAO, qtd: 2 }, { id: I.MACA, qtd: 1 }],
  "poi:torre:1": [{ id: B.TOCHA, qtd: 6 }, { id: I.CARNE_ASSADA, qtd: 2 }],
  "poi:cacadores:1": [{ id: I.CARNE_ASSADA, qtd: 3 }, { id: I.COURO, qtd: 1 }, { id: I.ESPADA_PEDRA, qtd: 1 }],
  "poi:baoba:1": [{ id: I.MACA, qtd: 3 }, { id: I.PAO, qtd: 1 }],
  "poi:porto:1": [{ id: I.PEIXE_ASSADO, qtd: 3 }, { id: I.FIO, qtd: 2 }],
  "poi:cova:1": [{ id: B.TOCHA, qtd: 8 }, { id: I.CARNE_CRUA, qtd: 2 }],
  "poi:ruinas:1": [{ id: I.BARRA_FERRO, qtd: 2 }, { id: I.CARNE_ASSADA, qtd: 1 }],
  "poi:ruinas:2": [{ id: I.ARMADURA_COURO, qtd: 1 }, { id: I.PAO, qtd: 2 }],
  "poi:forja:1": [{ id: I.ARMADURA_FERRO, qtd: 1 }, { id: I.BARRA_FERRO, qtd: 2 }]
};
var NIVEL_MAX = 30;
function xpParaNivel(n) {
  if (n <= 1) return 0;
  let total = 0;
  for (let k = 1; k < n; k++) total += custoNivel(k);
  return total;
}
function custoNivel(k) {
  return Math.round(60 + 18 * k + 2.2 * k * k);
}
function nivelDe(xp) {
  let n = 1;
  while (n < NIVEL_MAX && xp >= xpParaNivel(n + 1)) n++;
  return n;
}
function progressoNivel(xp) {
  const nivel = nivelDe(xp);
  const base = xpParaNivel(nivel);
  const alvo = nivel >= NIVEL_MAX ? base : xpParaNivel(nivel + 1);
  return { nivel, atual: xp - base, falta: Math.max(0, alvo - xp) };
}
var RAMOS_RPG = ["guerreiro", "explorador", "sabio"];
var NIVEL_MAX_RAMO_RPG = 3;
function multDanoHeroi(nivel, guerreiro) {
  return 1 + (nivel - 1) * 0.06 + guerreiro * 0.5;
}
function escalaVelExplorador(explorador) {
  return Math.min(1.18, 1 + explorador * 0.08);
}
function raioDescoberta(dif, explorador) {
  return dif.raioPoi + explorador * 2;
}
function xpPorKiller(tipo, nivelRegiao, dif, sabio) {
  const base = tipo === "estourador" ? 16 : tipo === "aranha" ? 12 : tipo === "zumbi" ? 10 : 4;
  const bruto = base * (1 + (nivelRegiao - 1) * 0.25) * dif.multXP * (1 + sabio * 0.05);
  return Math.max(1, Math.round(bruto));
}
function hpInimigo(hpBase, nivelRegiao, dif) {
  return Math.max(1, Math.round(hpBase * (1 + (nivelRegiao - 1) * 0.35) * dif.multHpMob));
}
var HISTORIA = [
  {
    id: "h1",
    titulo: "Chamado da Aldeia",
    historia: true,
    ordem: 1,
    objetivos: [{ tipo: "chegarPoi", alvo: "torre", qtd: 1, texto: "Sobe \xE0 Torre do Vigia" }],
    xp: 60,
    creditos: 10
  },
  {
    id: "h2",
    titulo: "Manto da Noite",
    historia: true,
    ordem: 2,
    objetivos: [{ tipo: "matar", alvo: "hostil", qtd: 5, texto: "Derrota 5 inimigos hostis" }],
    xp: 110,
    creditos: 15
  },
  {
    id: "h3",
    titulo: "O Miombo Profundo",
    historia: true,
    ordem: 3,
    objetivos: [
      { tipo: "descobrirRegiao", alvo: "miombo", qtd: 1, texto: "Descobre o Miombo Profundo" },
      { tipo: "matar", alvo: "aranha", qtd: 4, texto: "Derrota 4 aranhas no miombo" }
    ],
    xp: 160,
    creditos: 20
  },
  {
    id: "h4",
    titulo: "Ru\xEDnas de Kivulivuli",
    historia: true,
    ordem: 4,
    objetivos: [
      { tipo: "chegarPoi", alvo: "ruinas", qtd: 1, texto: "Chega \xE0s Ru\xEDnas de Kivulivuli" },
      { tipo: "abrirBaus", alvo: "2", qtd: 2, texto: "Abre 2 ba\xFAs de tesouro" }
    ],
    xp: 200,
    creditos: 25
  },
  {
    id: "h5",
    titulo: "Ca\xE7ada aos Estouradores",
    historia: true,
    ordem: 5,
    objetivos: [{ tipo: "matar", alvo: "estourador", qtd: 3, texto: "Derrota 3 estouradores" }],
    xp: 260,
    creditos: 30
  },
  {
    id: "h6",
    titulo: "O Guardi\xE3o das Ru\xEDnas",
    historia: true,
    ordem: 6,
    objetivos: [
      { tipo: "matar", alvo: "guardiao", qtd: 1, texto: "Derrota o Guardi\xE3o das Ru\xEDnas" },
      { tipo: "descobrirRegiao", alvo: "cinzas", qtd: 1, texto: "Descobre a Terra de Cinzas" }
    ],
    xp: 420,
    creditos: 60
  }
];
function aleatorio(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var MODELOS_DIARIA = [
  { titulo: "Ca\xE7ada da manh\xE3", tipo: "matar", alvo: "hostil", baseQtd: 4, xp: 45, cred: 8 },
  { titulo: "Colecionador de tesouros", tipo: "abrirBaus", alvo: "1", baseQtd: 1, xp: 40, cred: 6 },
  { titulo: "Botas gastas", tipo: "andar", alvo: "300", baseQtd: 300, xp: 40, cred: 6 },
  { titulo: "A noite que sobreviveste", tipo: "sobreviverNoite", alvo: "1", baseQtd: 1, xp: 55, cred: 10 },
  { titulo: "Roteiro do dia", tipo: "descobrirRegiao", alvo: "qualquer", baseQtd: 1, xp: 50, cred: 8 },
  { titulo: "Controlo de pragas", tipo: "matar", alvo: "zumbi", baseQtd: 6, xp: 50, cred: 9 }
];
function diaLocal(data = /* @__PURE__ */ new Date()) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function missoesDiarias(dia, dif, lingua = "pt") {
  let h = 0;
  for (let i = 0; i < dia.length; i++) h = Math.imul(h, 31) + dia.charCodeAt(i) | 0;
  const rnd = aleatorio(h ^ 24301);
  const escolhidas = [];
  const pool = [...MODELOS_DIARIA];
  while (escolhidas.length < 3 && pool.length > 0) {
    const i = Math.floor(rnd() * pool.length);
    escolhidas.push(pool.splice(i, 1)[0]);
  }
  return escolhidas.map((m, i) => {
    const qtd = Math.max(1, Math.round(m.baseQtd * (m.tipo === "andar" ? 1 : 1 + ordemDificuldade(dif.id) * 0.25)));
    return {
      id: `d:${dia}:${i}`,
      titulo: m.titulo,
      objetivo: { tipo: m.tipo, alvo: m.alvo, qtd, texto: textoObjetivo(m.tipo, m.alvo, qtd, lingua) },
      xp: Math.round(m.xp * dif.multXP),
      creditos: Math.round(m.cred * dif.multCred)
    };
  });
}
function ordemDificuldade(id) {
  return id === "medio" ? 0 : id === "dificil" ? 1 : 2;
}
function textoObjetivo(tipo, alvo, qtd, lingua = "pt") {
  const en = lingua === "en";
  switch (tipo) {
    case "matar":
      return alvo === "zumbi" ? en ? `Defeat ${qtd} zombies` : `Derrota ${qtd} zumbis` : alvo === "aranha" ? en ? `Defeat ${qtd} spiders` : `Derrota ${qtd} aranhas` : alvo === "estourador" ? en ? `Defeat ${qtd} boomers` : `Derrota ${qtd} estouradores` : en ? `Defeat ${qtd} hostile enemies` : `Derrota ${qtd} inimigos hostis`;
    case "abrirBaus":
      return en ? `Open ${qtd} treasure chest${qtd > 1 ? "s" : ""}` : `Abre ${qtd} ba\xFA${qtd > 1 ? "s" : ""} de tesouro`;
    case "andar":
      return en ? `Walk ${qtd} blocks` : `Caminha ${qtd} blocos`;
    case "sobreviverNoite":
      return en ? "Survive a full night" : "Sobrevive a uma noite inteira";
    case "descobrirRegiao":
      return en ? "Discover a new region" : "Descobre uma regi\xE3o nova";
    case "chegarPoi":
      return en ? `Reach the destination: ${alvo}` : `Chega ao destino: ${alvo}`;
  }
}
function estadoMissoesInicial() {
  return { historiaFeitas: [], contadores: {}, diarias: { dia: "", feitas: [], prog: {} }, concluidasTotal: 0 };
}
function aplicarEvento(est, evento) {
  const recompensas = [];
  const qtdEv = evento.qtd ?? 1;
  if (est.diarias.dia !== evento.dia) {
    est.diarias = { dia: evento.dia, feitas: [], prog: {} };
  }
  for (const d of missoesDiarias(evento.dia, evento.dif)) {
    if (est.diarias.feitas.includes(d.id)) continue;
    const o = d.objetivo;
    if (o.tipo !== evento.tipo) continue;
    if (o.tipo === "descobrirRegiao") {
      est.diarias.prog[d.id] = (est.diarias.prog[d.id] ?? 0) + 1;
    } else if (o.tipo === "matar" && (o.alvo === evento.alvo || o.alvo === "hostil" && evento.alvo !== "passivo" && evento.alvo !== void 0)) {
      est.diarias.prog[d.id] = (est.diarias.prog[d.id] ?? 0) + qtdEv;
    } else if (o.tipo !== "matar") {
      est.diarias.prog[d.id] = (est.diarias.prog[d.id] ?? 0) + qtdEv;
    }
    if ((est.diarias.prog[d.id] ?? 0) >= o.qtd) {
      est.diarias.feitas.push(d.id);
      recompensas.push({ id: d.id, titulo: d.titulo, xp: d.xp, creditos: d.creditos, diaria: true });
    }
  }
  const atual = HISTORIA.find((h) => !est.historiaFeitas.includes(h.id));
  if (atual) {
    const c = est.contadores[atual.id] ??= {};
    for (const o of atual.objetivos) {
      if (o.tipo !== evento.tipo) continue;
      const temAlvo = o.tipo === "matar" || o.tipo === "chegarPoi" || o.tipo === "descobrirRegiao";
      const alvoMatch = !temAlvo ? true : o.tipo === "matar" && o.alvo === "hostil" ? evento.alvo !== "passivo" && evento.alvo !== void 0 : o.alvo === evento.alvo;
      if (!alvoMatch) continue;
      const chave = `${o.tipo}:${o.alvo}`;
      c[chave] = (c[chave] ?? 0) + qtdEv;
    }
    let completos = 0;
    for (const o of atual.objetivos) {
      const chave = `${o.tipo}:${o.alvo}`;
      if ((c[chave] ?? 0) >= o.qtd) completos++;
    }
    if (completos >= atual.objetivos.length) {
      est.historiaFeitas.push(atual.id);
      est.concluidasTotal++;
      recompensas.push({ id: atual.id, titulo: atual.titulo, xp: atual.xp, creditos: atual.creditos, diaria: false });
    }
  }
  return recompensas;
}
function capituloAtual(est) {
  return HISTORIA.find((h) => !est.historiaFeitas.includes(h.id)) ?? null;
}
function progressoObjetivo(est, idMissao, o) {
  return Math.min(o.qtd, est.contadores[idMissao]?.[`${o.tipo}:${o.alvo}`] ?? 0);
}
function perfilInicial(dif = "medio") {
  return {
    v: 41,
    dificuldade: dif,
    xp: 0,
    pontos: 0,
    skills: { guerreiro: 0, explorador: 0, sabio: 0 },
    missoes: estadoMissoesInicial(),
    descobertas: { regioes: [], pois: [], baus: [] },
    creditos: 0,
    kills: { hostil: 0, zumbi: 0, aranha: 0, estourador: 0, passivo: 0, guardiao: 0 },
    mortes: 0,
    blocos: 0,
    bossDerrotado: false,
    pos: null,
    inv: null,
    invArm: null,
    itensChao: null,
    ts: 0
  };
}
function validarPerfilRpg(v) {
  if (!v || typeof v !== "object") return null;
  const p = v;
  if (p.v !== 41) return null;
  if (!p.dificuldade || !DIFICULDADES_RPG[p.dificuldade]) return null;
  if (typeof p.xp !== "number" || !Number.isFinite(p.xp) || p.xp < 0) return null;
  if (typeof p.pontos !== "number" || !Number.isFinite(p.pontos) || p.pontos < 0) return null;
  if (!p.skills || !RAMOS_RPG.every((r) => typeof p.skills[r] === "number" && p.skills[r] >= 0 && p.skills[r] <= NIVEL_MAX_RAMO_RPG)) return null;
  if (!p.missoes || typeof p.missoes !== "object" || !Array.isArray(p.missoes.historiaFeitas)) return null;
  if (!p.descobertas || !Array.isArray(p.descobertas.regioes) || !Array.isArray(p.descobertas.pois) || !Array.isArray(p.descobertas.baus)) return null;
  if (typeof p.creditos !== "number" || !Number.isFinite(p.creditos) || p.creditos < 0) return null;
  if (!p.kills || typeof p.kills !== "object") return null;
  if (typeof p.mortes !== "number" || typeof p.blocos !== "number") return null;
  if (typeof p.bossDerrotado !== "boolean") return null;
  if (p.pos !== null && (!Array.isArray(p.pos) || p.pos.length !== 3)) return null;
  const invValida = (a) => {
    if (a === void 0) return null;
    if (!Array.isArray(a) || a.length > 36) return null;
    return a.map((s) => s && typeof s === "object" && typeof s.id === "number" && s.id > 0 && typeof s.qtd === "number" && s.qtd > 0 ? { id: s.id, qtd: Math.floor(s.qtd) } : null);
  };
  const armValida = (a) => {
    if (!a || typeof a !== "object") return null;
    const s = a;
    return typeof s.id === "number" && s.id > 0 ? { id: s.id, qtd: 1 } : null;
  };
  const chaoValida = (a) => {
    if (a === void 0) return null;
    if (!Array.isArray(a)) return null;
    const itens = a.filter((e) => e && typeof e === "object" && typeof e.id === "number" && e.id > 0 && typeof e.qtd === "number" && e.qtd > 0 && ["x", "y", "z"].every((k) => typeof e[k] === "number" && Number.isFinite(e[k]))).slice(0, 48).map((e) => ({ id: e.id, qtd: Math.floor(e.qtd), x: e.x, y: e.y, z: e.z }));
    return itens;
  };
  const base = perfilInicial(p.dificuldade);
  return {
    v: 41,
    dificuldade: p.dificuldade,
    xp: p.xp,
    pontos: p.pontos,
    skills: { guerreiro: p.skills.guerreiro, explorador: p.skills.explorador, sabio: p.skills.sabio },
    missoes: p.missoes,
    descobertas: p.descobertas,
    creditos: p.creditos,
    kills: { ...base.kills, ...p.kills },
    mortes: p.mortes,
    blocos: p.blocos,
    bossDerrotado: p.bossDerrotado,
    pos: p.pos ?? null,
    inv: invValida(p.inv),
    invArm: armValida(p.invArm),
    itensChao: chaoValida(p.itensChao),
    ts: typeof p.ts === "number" ? p.ts : 0
  };
}
function perfilTemProgresso(p) {
  return p.xp > 0 || p.missoes.concluidasTotal > 0 || p.descobertas.regioes.length > 0 || p.descobertas.pois.length > 0 || p.kills.hostil > 0;
}

// src/game/rpg/terrenoRpg.ts
var PAD_POI = {
  aldeia: ALTURA_ALDEIA,
  // 32 — planície da aldeia (é o próprio centro)
  torre: ALTURA_ALDEIA,
  // dentro da planície plana
  cacadores: 34,
  ruinas: 32,
  cova: 32,
  baoba: 32,
  porto: 31,
  // praia (NIVEL_MAR=30 → areia a h<31)
  forja: 33
};
var ALVO_REGIAO = {
  aldeia: { base: 32, ruga: 1.2 },
  planalto: { base: 36, ruga: 2.5 },
  miombo: { base: 33, ruga: 2.2 },
  costa: { base: 31, ruga: 1.8 },
  // z>72 desce ao mar
  serra: { base: 42, ruga: 7 },
  cinzas: { base: 35, ruga: 3 }
};
function pesoRegiao(x, z) {
  let melhor = "", melhorW = 0;
  for (const r of REGIOES) {
    const d = Math.hypot(x - r.cx, z - r.cz);
    const w = Math.max(0, Math.min(1, (r.raio * 1.25 - d) / (r.raio * 0.7)));
    if (w > melhorW) {
      melhorW = w;
      melhor = r.id;
    }
  }
  return { regiao: melhor, w: melhorW };
}
function alturaRpg(ruido, x, z) {
  const natural = alturaTerrenoBase(ruido, x, z);
  const { regiao, w } = pesoRegiao(x, z);
  let h = natural;
  if (w > 0) {
    const alvo = ALVO_REGIAO[regiao] ?? { base: 30, ruga: 2 };
    let alvoH = alvo.base + ruido.n2(x * 0.02, z * 0.02) * alvo.ruga;
    if (regiao === "costa" && z > 72) alvoH = 27 + ruido.n2(x * 0.02, z * 0.02) * 1.6;
    if (regiao === "serra") alvoH += Math.max(0, ruido.fbm2(x * 6e-3 + 500, z * 6e-3 + 500, 3) - 0.45) * 26;
    h = natural * (1 - w) + alvoH * w;
  }
  for (const p of POIS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < 14) {
      const pw = Math.max(0, Math.min(1, (10 - d) / 5));
      const padY = PAD_POI[p.id] ?? ALTURA_ALDEIA;
      h = h * (1 - pw) + padY * pw;
    }
  }
  return Math.max(4, Math.min(ALTURA - 6, Math.floor(h)));
}
function biomaRpg(ruido, x, z) {
  const { regiao, w } = pesoRegiao(x, z);
  if (w > 0.45) {
    if (regiao === "miombo") return "floresta";
    if (regiao === "serra") return "montanha";
    return "planicie";
  }
  const t = ruido.fbm2(x * 5e-3 + 900, z * 5e-3 + 900, 3);
  if (alturaRpg(ruido, x, z) > 52) return "montanha";
  if (t < 0.36) return "deserto";
  if (t > 0.62) return "floresta";
  return "planicie";
}

// src/game/rpg/mundoRpg.ts
var idx4 = (x, y, z) => (y * CHUNK + z) * CHUNK + x;
var MundoRPG = class extends Mundo {
  constructor() {
    super(SEED_RPG);
    this.perfilId = "rpg";
  }
  /** Terreno do RPG: regiões com sabor, padins planos nos POIs —
   *  v46: delega na função pura (partilhada com o worker). */
  alturaTerreno(x, z) {
    return alturaRpg(this.ruido, x, z);
  }
  /** Biomas por região: miombo = floresta densa, serra = montanha. */
  bioma(x, z) {
    return biomaRpg(this.ruido, x, z);
  }
  /** v46: os carimbos (cinzas + POIs) correm no main thread sobre dados
   *  que vieram do caminho sync OU do worker — um só ponto de entrada. */
  posGerar(c) {
    super.posGerar(c);
    const bx = c.cx * CHUNK, bz = c.cz * CHUNK;
    if (bx < 120 && bz < 90 && bx > 40 && bz > 10) this.revestirCinzas(c);
    for (const p of POIS) {
      const y = PAD_POI[p.id] ?? ALTURA_ALDEIA;
      if (bx + CHUNK < p.x - 13 || bx > p.x + 13 || bz + CHUNK < p.z - 13 || bz > p.z + 13) continue;
      this.carimbarPoi(c, p.id, p.x, p.z, y);
    }
  }
  /** Superfície vulcânica: onde era relva, fica pedra/ardósia + carvão incandescente. */
  revestirCinzas(c) {
    const bx = c.cx * CHUNK, bz = c.cz * CHUNK;
    for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
      const x = bx + lx, z = bz + lz;
      const { regiao, w } = pesoRegiao(x, z);
      if (regiao !== "cinzas" || w < 0.55) continue;
      let topo = -1;
      for (let y = ALTURA - 1; y > 0; y--) {
        const id = c.dados[idx4(lx, y, lz)];
        if (id === B.RELVA || id === B.ERVA || id === B.FLOR_AM || id === B.FLOR_VM) {
          topo = y;
          break;
        }
        if (id !== B.AR && id !== B.FOLHAS && id !== B.TRONCO && y < 70) {
          topo = y;
          break;
        }
      }
      if (topo <= 0) continue;
      for (let y = topo; y <= topo + 1 && y < ALTURA; y++) {
        const id = c.dados[idx4(lx, y, lz)];
        if (id === B.RELVA) c.dados[idx4(lx, y, lz)] = this.ruido.hashCol(x, z, 91) < 0.45 ? B.PEDRA : B.PEDREGULHO;
        else if (id === B.ERVA || id === B.FLOR_AM || id === B.FLOR_VM) c.dados[idx4(lx, y, lz)] = B.AR;
      }
      if (this.ruido.hashCol(x, z, 97) < 0.02 && c.dados[idx4(lx, topo, lz)] === B.PEDRA)
        c.dados[idx4(lx, topo + 1, lz)] = B.CARVAO_M;
    }
  }
  // ── helpers de carimbo (mesmo padrão do MundoCidade) ─────────
  por(c, x, y, z, id) {
    if (y < 0 || y >= ALTURA) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    if (cx !== c.cx || cz !== c.cz) return;
    const lx = (x % CHUNK + CHUNK) % CHUNK, lz = (z % CHUNK + CHUNK) % CHUNK;
    c.dados[idx4(lx, y, lz)] = id;
  }
  limpar(c, x0, y0, z0, x1, y1, z1) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
      this.por(c, x, y, z, B.AR);
  }
  caixa(c, x0, y0, z0, x1, y1, z1, id) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
      this.por(c, x, y, z, id);
  }
  carimbarPoi(c, id, px, pz, y) {
    const rnd = new Aleatorio(SEED_RPG + (id.length * 131 + id.charCodeAt(0)));
    switch (id) {
      case "aldeia":
        this.carimbarAldeia(c, y, rnd);
        break;
      case "torre":
        this.carimbarTorre(c, y);
        break;
      case "cacadores":
        this.carimbarAcampamento(c, px, pz, y, rnd);
        break;
      case "ruinas":
        this.carimbarRuinas(c, y, rnd);
        break;
      case "cova":
        this.carimbarCova(c, y);
        break;
      case "baoba":
        this.carimbarBaoba(c, y);
        break;
      case "porto":
        this.carimbarPorto(c, y);
        break;
      case "forja":
        this.carimbarForja(c, y);
        break;
    }
  }
  // ── Aldeia Inicial: 2 casas, fogueira, imbondeiro, baú ───────
  carimbarAldeia(c, y, rnd) {
    this.limpar(c, -12, y + 1, -8, 12, y + 14, 12);
    const casa = (x0, z0, portaZ) => {
      this.caixa(c, x0, y + 1, z0, x0 + 4, y + 3, z0 + 4, B.TABUAS);
      this.limpar(c, x0 + 1, y + 1, z0 + 1, x0 + 3, y + 3, z0 + 3);
      this.caixa(c, x0, y + 4, z0, x0 + 4, y + 4, z0 + 4, B.TABUAS);
      this.limpar(c, x0 + 2, y + 1, portaZ, x0 + 2, y + 2, portaZ);
      this.por(c, x0, y + 2, z0 + 2, B.VIDRO);
      this.por(c, x0 + 4, y + 2, z0 + 2, B.VIDRO);
      this.por(c, x0 + 2, y + 3, z0 + 2, B.TOCHA);
    };
    casa(-7, 6, 6);
    casa(6, -4, 0);
    this.por(c, 1, y + 1, 3, B.PEDREGULHO);
    this.por(c, 1, y + 2, 3, B.TOCHA);
    this.por(c, 0, y + 1, 2, B.PEDREGULHO);
    this.por(c, 2, y + 1, 4, B.PEDREGULHO);
    for (let t = 1; t <= 7; t++) this.por(c, -2, y + t, -4, B.TRONCO);
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
      const d2 = Math.abs(dx) + Math.abs(dz);
      if (d2 <= 5 && !(dx === 0 && dz === 0) && rnd.chance(0.85))
        this.por(c, -2 + dx, y + 6 + Math.floor(d2 / 2.5), -4 + dz, B.FOLHAS);
    }
    this.por(c, 4, y + 1, 5, B.BAU);
    this.por(c, 10, y + 1, 8, B.TOCHA);
    this.por(c, -10, y + 1, -2, B.TOCHA);
  }
  // ── Torre do Vigia: 5×5 de tábuas, escada, baú no topo ───────
  carimbarTorre(c, y) {
    this.limpar(c, 11, y + 1, -20, 17, y + 12, -12);
    for (let h = 1; h <= 9; h++) {
      for (let x = 12; x <= 16; x++) {
        this.por(c, x, y + h, -18, B.TABUAS);
        this.por(c, x, y + h, -14, B.TABUAS);
      }
      for (let z = -18; z <= -14; z++) {
        this.por(c, 12, y + h, z, B.TABUAS);
        this.por(c, 16, y + h, z, B.TABUAS);
      }
    }
    this.limpar(c, 14, y + 1, -14, 14, y + 2, -14);
    this.caixa(c, 12, y + 9, -18, 16, y + 9, -14, B.TABUAS);
    for (let h = 1; h <= 8; h++) this.por(c, 13, y + h, -15, B.ESCADA);
    this.por(c, 14, y + 10, -16, B.BAU);
    this.por(c, 12, y + 10, -18, B.TOCHA);
    this.por(c, 16, y + 10, -14, B.TOCHA);
  }
  // ── Acampamento dos Caçadores: 2 tendas + espeto + baú ──────
  carimbarAcampamento(c, px, pz, y, rnd) {
    this.limpar(c, px - 6, y + 1, pz - 6, px + 6, y + 8, pz + 6);
    const tenda = (x, z) => {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
        this.por(c, x + dx, y + 1, z + dz, B.TABUAS);
      this.limpar(c, x - 1, y + 1, z, x + 1, y + 1, z);
      this.por(c, x, y + 2, z, B.TABUAS);
    };
    tenda(px - 3, pz + 2);
    tenda(px + 3, pz - 2);
    this.por(c, px + 1, y + 1, pz + 2, B.PEDREGULHO);
    this.por(c, px + 1, y + 2, pz + 2, B.TOCHA);
    this.por(c, px, y + 1, pz, B.BAU);
    if (rnd.chance(0.9)) this.por(c, px - 5, y + 1, pz - 3, B.TRONCO);
  }
  // ── Ruínas de Kivulivuli: muros partidos, 2 baús ────────────
  carimbarRuinas(c, y, rnd) {
    this.limpar(c, 52, y + 1, -50, 66, y + 8, -34);
    const x0 = 54, x1 = 62, z0 = -46, z1 = -38;
    for (let x = x0; x <= x1; x++) {
      const h = 1 + Math.floor(rnd.proximo() * 3);
      if (!rnd.chance(0.15)) for (let t = 1; t <= h; t++) this.por(c, x, y + t, z0, B.PEDREGULHO);
      const h2 = 1 + Math.floor(rnd.proximo() * 3);
      if (!rnd.chance(0.15)) for (let t = 1; t <= h2; t++) this.por(c, x, y + t, z1, B.PEDREGULHO);
    }
    for (let z = z0; z <= z1; z++) {
      const h = 1 + Math.floor(rnd.proximo() * 3);
      if (!rnd.chance(0.15)) for (let t = 1; t <= h; t++) this.por(c, x0, y + t, z, B.PEDREGULHO);
      const h2 = 1 + Math.floor(rnd.proximo() * 3);
      if (!rnd.chance(0.15)) for (let t = 1; t <= h2; t++) this.por(c, x1, y + t, z, B.PEDREGULHO);
    }
    for (const [cx2, cz2] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]])
      for (let t = 1; t <= 4; t++) this.por(c, cx2, y + t, cz2, B.PEDREGULHO);
    for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++)
      if (rnd.chance(0.08)) this.por(c, x, y + 1, z, B.PEDREGULHO);
    this.por(c, x0, y + 1, z0 + 2, B.BAU);
    this.por(c, x1, y + 1, z1 - 2, B.BAU);
  }
  // ── Cova dos Morcegos: vala descendente + câmara com baú ────
  carimbarCova(c, y) {
    this.limpar(c, 67, 28, -33, 73, 31, -27);
    this.caixa(c, 67, 27, -33, 73, 27, -27, B.PEDRA);
    for (let i = 0; i < 5; i++) {
      const z = -26 - i;
      const fundo = y - i;
      this.limpar(c, 69, fundo, z, 71, y + 1, z);
      this.caixa(c, 69, fundo - 1, z, 71, fundo - 1, z, B.PEDRA);
    }
    this.por(c, 70, 28, -31, B.BAU);
  }
  // ── Baobá Ancião: tronco monumental + baú ───────────────────
  carimbarBaoba(c, y) {
    this.limpar(c, -44, y + 1, 30, -32, y + 12, 40);
    for (let t = 1; t <= 8; t++) {
      this.por(c, -38, y + t, 34, B.TRONCO);
      this.por(c, -37, y + t, 34, B.TRONCO);
    }
    for (let dy = 0; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      const dist = Math.abs(dx) + Math.abs(dz) + dy * 1.3;
      if (dist <= 4.5 && !(dx === 0 && dz === 0)) this.por(c, -38 + dx, y + 8 + dy, 34 + dz, B.FOLHAS);
    }
    this.por(c, -36, y + 1, 34, B.BAU);
    this.por(c, -41, y + 1, 37, B.ERVA);
  }
  // ── Porto dos Ventos: cais de tábuas sobre o mar + baú ──────
  carimbarPorto(c, y) {
    this.limpar(c, 7, y + 1, 64, 13, y + 8, 75);
    for (let z = 66; z <= 74; z++) {
      for (let x = 8; x <= 12; x++) this.por(c, x, y, z, B.TABUAS);
      for (const px of [8, 12]) {
        for (let yy = y - 1; yy >= y - 8; yy--) {
          if (yy < 2) break;
          this.por(c, px, yy, z, B.TRONCO);
        }
      }
    }
    this.por(c, 10, y + 1, 68, B.BAU);
    for (let t = 1; t <= 6; t++) this.por(c, 10, y + t, 74, B.TRONCO);
    this.por(c, 10, y + 7, 74, B.FOLHAS);
    this.por(c, 11, y + 7, 74, B.FOLHAS);
  }
  // ── Forja Perdida: fornalhas + mesa + muros partidos + baú ──
  carimbarForja(c, y) {
    this.limpar(c, 78, y + 1, 48, 86, y + 6, 56);
    this.caixa(c, 80, y, 50, 84, y, 54, B.PEDREGULHO);
    for (let x = 80; x <= 84; x++) if (x !== 82) for (let t = 1; t <= 2; t++) this.por(c, x, y + t, 50, B.PEDREGULHO);
    for (let z = 51; z <= 54; z++) if (z !== 52) for (let t = 1; t <= 2; t++) this.por(c, 80, y + t, z, B.PEDREGULHO);
    this.por(c, 81, y + 1, 51, B.FORNALHA);
    this.por(c, 83, y + 1, 51, B.FORNALHA);
    this.por(c, 80, y + 1, 53, B.MESA);
    this.por(c, 82, y + 1, 52, B.BAU);
    this.por(c, 84, y + 1, 54, B.TOCHA);
  }
};

// src/game/rpg/nomes.ts
var NOMES_DIFICULDADE_EN = {
  medio: {
    nome: "NORMAL",
    desc: "The balance of the tales. Enemies as the bards tell them, fair rewards."
  },
  dificil: {
    nome: "HARD",
    desc: "For those who already survived a night in the Miombo. Enemies 50% stronger, XP and credits +25%."
  },
  lenda: {
    nome: "LEGEND",
    desc: "The guardians wake. Enemies more than doubled, XP and credits +60% \u2014 only for living legends."
  }
};
function nomeDificuldade(id, lingua) {
  if (lingua === "en") return NOMES_DIFICULDADE_EN[id].nome;
  return DIFICULDADES_RPG[id].nome;
}
var REGIOES_EN = {
  aldeia: { nome: "Village Plains", desc: "The home. Wattle houses, a lit campfire and the baobab of the tales." },
  planalto: { nome: "Winds Plateau", desc: "Tall grass where the wind never rests. Zombies roam at dusk." },
  miombo: { nome: "Deep Miombo", desc: "Dense miombo woodland \u2014 a real biome of eastern Mozambique and Angola. Spiders hunt here." },
  costa: { nome: "Coral Coast", desc: "White sand and sea. The winds' port awaits corsairs." },
  serra: { nome: "Northern Range", desc: "Stone and height. From the tower you can see half the world." },
  cinzas: { nome: "Ashlands", desc: "Volcanic soil and boomers. Nobody camps here twice." }
};
function nomeRegiao(r, lingua) {
  if (lingua === "en") return REGIOES_EN[r.id]?.nome ?? r.nome;
  return r.nome;
}
var POIS_EN = {
  aldeia: { nome: "Starting Village", desc: "Where it all begins. The campfire never goes out." },
  torre: { nome: "Watchtower", desc: "From the top you see the whole Plateau \u2014 and everything that moves on it." },
  cacadores: { nome: "Hunters' Camp", desc: "Tents, a skewer and the stories of those who came back." },
  forja: { nome: "Lost Forge", desc: "Furnaces still warm. Somebody smelted iron here \u2014 not long ago." },
  ruinas: { nome: "Kivulivuli Ruins", desc: "Broken walls of a kingdom the maps forgot. The Guardian sleeps here." },
  cova: { nome: "Bat Cave", desc: "A stone mouth on the hillside. Inside, the cool of the earth." },
  baoba: { nome: "Elder Baobab", desc: "The oldest tree on the plains. Some apologize before touching it." },
  porto: { nome: "Winds Port", desc: "A pier of worn planks. The sea returns what it takes." }
};
function nomePoi(p, lingua) {
  if (lingua === "en") return POIS_EN[p.id]?.nome ?? p.nome;
  return p.nome;
}
var HISTORIA_EN = {
  h1: { titulo: "Call of the Village", objetivos: ["Climb the Watchtower"] },
  h2: { titulo: "Cloak of the Night", objetivos: ["Defeat 5 hostile enemies"] },
  h3: { titulo: "The Deep Miombo", objetivos: ["Discover the Deep Miombo", "Defeat 4 miombo spiders"] },
  h4: { titulo: "Kivulivuli Ruins", objetivos: ["Reach the Kivulivuli Ruins", "Open 2 treasure chests"] },
  h5: { titulo: "Boomer Hunt", objetivos: ["Defeat 3 boomers"] },
  h6: { titulo: "The Guardian of the Ruins", objetivos: ["Discover the Ashlands", "Defeat the Guardian of the Ruins"] }
};
function tituloMissao(m, lingua) {
  if (lingua === "en") return HISTORIA_EN[m.id]?.titulo ?? m.titulo;
  return m.titulo;
}
var DIARIAS_TITULO_EN = {
  "Ca\xE7ada da manh\xE3": "Morning hunt",
  "Colecionador de tesouros": "Treasure collector",
  "Botas gastas": "Worn-out boots",
  "A noite que sobreviveste": "The night you survived",
  "Roteiro do dia": "Day's route",
  "Controlo de pragas": "Pest control"
};
function tituloDiaria(tituloPt, lingua) {
  if (lingua === "en") return DIARIAS_TITULO_EN[tituloPt] ?? tituloPt;
  return tituloPt;
}
var RAMOS_EN = {
  guerreiro: { nome: "Warrior", efeitos: ["+2 damage per strike level"] },
  explorador: { nome: "Explorer", efeitos: ["+8% speed per level (cap 18%)", "+2 blocks of discovery reach per level"] },
  sabio: { nome: "Sage", efeitos: ["+5% XP per level", "health regeneration out of combat"] }
};
function nomeRamo(r, lingua) {
  if (lingua === "en") return RAMOS_EN[r].nome;
  const pt = { guerreiro: "Guerreiro", explorador: "Explorador", sabio: "S\xE1bio" };
  return pt[r];
}
var NOMES_EN = {
  // blocos
  0: "Air",
  1: "Grass",
  2: "Dirt",
  3: "Stone",
  4: "Cobblestone",
  5: "Sand",
  6: "Water",
  7: "Log",
  8: "Leaves",
  9: "Planks",
  10: "Coal Ore",
  11: "Iron Ore",
  12: "Gold Ore",
  13: "Diamond Ore",
  14: "Bedrock",
  15: "Crafting Table",
  16: "Furnace",
  17: "Torch",
  18: "Glass",
  19: "Bed",
  20: "Ladder",
  21: "Tall Grass",
  22: "Yellow Flower",
  23: "Red Flower",
  24: "Cactus",
  25: "Farmland",
  26: "Young Wheat",
  27: "Ripe Wheat",
  28: "TNT",
  29: "Chest",
  // itens (ids reais do catálogo I = 100–131)
  100: "Stick",
  101: "Coal",
  102: "Diamond",
  103: "Iron Ingot",
  104: "Gold Ingot",
  105: "Raw Meat",
  106: "Cooked Meat",
  107: "Apple",
  108: "Wooden Pickaxe",
  109: "Stone Pickaxe",
  110: "Iron Pickaxe",
  111: "Diamond Pickaxe",
  112: "Wooden Sword",
  113: "Stone Sword",
  114: "Iron Sword",
  115: "Diamond Sword",
  116: "Wooden Shovel",
  117: "Seeds",
  118: "Wheat",
  119: "Wooden Hoe",
  120: "Iron Hoe",
  121: "Bread",
  122: "Leather",
  123: "Leather Chestplate",
  124: "Iron Chestplate",
  125: "Diamond Chestplate",
  126: "String",
  127: "Fishing Rod",
  128: "Sardine",
  129: "Horse Mackerel",
  130: "Corvina",
  131: "Grilled Fish"
};
function nomeItem(id, lingua) {
  if (lingua === "en") return NOMES_EN[id] ?? NOMES[id] ?? "?";
  return NOMES[id] ?? "?";
}
var ID_POR_NOME_PT = (() => {
  const m = {};
  for (const idStr of Object.keys(NOMES)) {
    const id = Number(idStr);
    if (!(id in m)) m[NOMES[id]] = id;
  }
  return m;
})();

// src/game/rpg/sistemaRpg.ts
var CHAVE_SAVE_RPG = "bateu_rpg_save";
var TIPO_KILL = {
  zumbi: "zumbi",
  aranha: "aranha",
  estourador: "estourador"
};
var SistemaRPG = class {
  /** Língua de EXIBIÇÃO dos avisos e textos gerados (v62 — roadmap item 3).
   *  PT por omissão: o motor canónico e os 157 testes do núcleo ficam
   *  intactos; o UI do mundo passa "en" quando a língua da plataforma é EN. */
  lingua = "pt";
  perfil = perfilInicial("medio");
  motor = null;
  avisosRpg = [];
  cdSpawn = 0;
  cdSave = 8;
  boss = { vivo: false, derrotado: false, spawnado: false };
  bossMob = null;
  bossPendente = false;
  lastDanoT = 0;
  noiteAntes = false;
  noiteSobrevivendo = false;
  andouFrac = 0;
  posAnterior = null;
  prontoSaveIDB = null;
  // ── v50: itens no chão (contadores HONESTOS — nada desaparece sem nota) ──
  itensChaoRpg = [];
  recolhidos = 0;
  // unidades recolhidas pela mochila
  expiradosTTL = 0;
  // itens que passaram o TTL (ou caíram ao vazio)
  expiradosCap = 0;
  // itens saídos pelo limite de 48 (o mais velho)
  constructor() {
    this.prontoSaveIDB = restaurarLSdeIDB(
      CHAVE_SAVE_RPG,
      CHAVE_SAVE_RPG,
      (v) => validarPerfilRpg(v) !== null
    ).then(() => {
      this.perfil = this.lerPerfilLS() ?? this.perfil;
      return this.perfil;
    });
  }
  /** Lê e valida o espelho localStorage (null = ausente/corrompido). */
  lerPerfilLS() {
    try {
      const raw = localStorage.getItem(CHAVE_SAVE_RPG);
      if (!raw) return null;
      return validarPerfilRpg(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  get dif() {
    return DIFICULDADES_RPG[this.perfil.dificuldade];
  }
  // ── ANTES de cada motor.iniciar ─────────────────────────────
  /** Define o mundo e o spawn (a altura da planície é determinística). */
  preparar(motor) {
    this.motor = motor;
    motor.fabricaMundo = () => new MundoRPG();
    motor.spawnFixo = [SPAWN_ALDEIA[0], ALTURA_ALDEIA + 1.02, SPAWN_ALDEIA[1]];
    motor.spawnProprio = [SPAWN_ALDEIA[0], ALTURA_ALDEIA + 1.02, SPAWN_ALDEIA[1]];
    motor.escalaVel = escalaVelExplorador(this.perfil.skills.explorador);
    this.boss = { vivo: false, derrotado: false, spawnado: false };
    this.bossMob = null;
    this.bossPendente = false;
    this.cdSpawn = 0;
    this.noiteAntes = false;
    this.noiteSobrevivendo = false;
    this.posAnterior = null;
    this.limparItensChao();
    this.recolhidos = 0;
    this.expiradosTTL = 0;
    this.expiradosCap = 0;
  }
  /** DEPOIS de cada motor.iniciar — o gestor de mobs é NOVO a cada iniciar
   *  (os wraps do gestor re-aplicam sempre; os do MOTOR aplicam uma única
   *  vez, guardados no próprio motor, para nunca empilharem multiplicadores). */
  ligarAposIniciar() {
    const m = this.motor;
    if (!m || !m.gestor) return;
    const g = m.gestor;
    const invSalva = this.perfil.inv;
    if (invSalva && invSalva.some((s) => s)) {
      m.inv.limpar();
      for (let i = 0; i < 36 && i < invSalva.length; i++) {
        const s = invSalva[i];
        if (s) m.inv.slots[i] = { id: s.id, qtd: s.qtd };
      }
      if (this.perfil.invArm) m.inv.armadura = { id: this.perfil.invArm.id, qtd: 1 };
      const idxEspadaSalva = m.inv.slots.findIndex((sl) => sl && sl.id === I.ESPADA_MADEIRA);
      if (idxEspadaSalva >= 0) m.inv.selecao = idxEspadaSalva;
    } else {
      m.inv.adicionar(I.ESPADA_MADEIRA, 1);
      m.inv.adicionar(I.PAO, 3);
      m.inv.adicionar(I.MACA, 2);
      m.inv.adicionar(B.TOCHA, 10);
      const idxEspada = m.inv.slots.findIndex((sl) => sl && sl.id === I.ESPADA_MADEIRA);
      if (idxEspada >= 0) m.inv.selecao = idxEspada;
    }
    g.tentarSpawns = (segundos, noite, px, pz) => {
      this.cdSpawn -= segundos * this.dif.freqSpawn * (noite ? 1.4 : 1);
      if (this.cdSpawn > 0) return;
      this.cdSpawn = 2.8;
      const regiao = regiaoEm(px, pz);
      const capPassivo = 6;
      const passivos = g.contar("porco") + g.contar("vaca") + g.contar("galinha");
      if (passivos < capPassivo) this.tentarSpawnPassivo(g, px, pz);
      const hostis = g.contar("zumbi") + g.contar("aranha") + g.contar("estourador");
      const capHostis = noite ? 9 : 4;
      if (hostis < capHostis) this.tentarSpawnHostil(g, px, pz, noite, regiao?.id);
    };
    const origSpawnar = g.spawnar.bind(g);
    g.spawnar = (tipo, x, y, z) => {
      const mob = origSpawnar(tipo, x, y, z);
      if (!ehPassivo(tipo)) {
        const regiao = regiaoEm(x, z);
        const nivel = regiao?.nivel ?? NIVEL_SELVAGEM;
        mob.hp = mob.hpMax = hpInimigo(mob.hpMax, nivel, this.dif);
      }
      if (this.bossPendente) {
        this.bossPendente = false;
        mob.hp = mob.hpMax = Math.round(mob.hpMax * 3);
        mob.__boss = true;
        this.boss.vivo = true;
        this.boss.spawnado = true;
        this.bossMob = mob;
      }
      return mob;
    };
    const origMatar = g.matar.bind(g);
    g.matar = (mob, comDrop) => {
      if (mob.__boss && !comDrop) return;
      origMatar(mob, comDrop);
      if (comDrop) this.registarKill(mob);
    };
    const origAtacarG = g.atacar.bind(g);
    g.atacar = (px, py, pz, yaw, alcance, dano) => {
      const escala = multDanoHeroi(nivelDe(this.perfil.xp), this.perfil.skills.guerreiro);
      return origAtacarG(px, py, pz, yaw, alcance, dano * escala);
    };
    const anyM = m;
    if (!anyM.__rpgLigado) {
      anyM.__rpgLigado = true;
      const origAtacar = m.atacar.bind(m);
      m.atacar = () => {
        if (m.fase === "jogando" && m.mira && m.mira.id === B.BAU) {
          this.abrirTesouro(m.mira.x, m.mira.y, m.mira.z);
          return null;
        }
        return origAtacar();
      };
      const origReceber = m.receberDano.bind(m);
      m.receberDano = (qtd, causa) => {
        this.lastDanoT = Date.now();
        if (this.dif.multDanoMob !== 1) qtd = Math.max(1, Math.round(qtd * this.dif.multDanoMob));
        origReceber(qtd, causa);
      };
      const origRenascer = m.renascer.bind(m);
      m.renascer = () => {
        origRenascer();
        this.perfil.mortes++;
        this.noiteSobrevivendo = false;
        if (this.boss.vivo) {
          if (this.bossMob) origMatar(this.bossMob, false);
          this.boss.vivo = false;
          this.boss.spawnado = false;
          this.bossMob = null;
        }
        this.aviso(this.txt(`Renasceste na Aldeia Inicial (${this.perfil.mortes}\xAA morte) \u2014 o progresso RPG fica.`, `You respawned at the Starting Village (death #${this.perfil.mortes}) \u2014 RPG progress stays.`), "info", 4);
      };
    }
    if (this.perfil.pos) {
      const [x, y, z] = this.perfil.pos;
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        m.px = x;
        m.py = y + 0.02;
        m.pz = z;
      }
    }
    m.aoDroparChao = (id, qtd, x, y, z) => this.adicionarItemChao(id, qtd, x, y, z);
    if (this.perfil.itensChao?.length) {
      for (const e of this.perfil.itensChao) this.adicionarItemChao(e.id, e.qtd, e.x, e.y, e.z);
    }
    this.noiteAntes = m.noite;
    this.aviso(this.txt(`BATEU RPG: Lendas \u2014 dificuldade ${this.dif.nome}. O mundo \xE9 o mesmo para todos (semente ${SEED_RPG}).`, `BATEU RPG: Legends \u2014 difficulty ${nomeDificuldade(this.dif.id, this.lingua)}. The world is the same for everyone (seed ${SEED_RPG}).`), "info", 5);
  }
  // ── spawns auxiliares ─────────────────────────────────────────
  tentarSpawnPassivo(g, px, pz) {
    const tipo = ["porco", "vaca", "galinha"][Math.floor(this.rnd01() * 3)];
    const p = this.posicaoSpawn(px, pz, 12, 22);
    if (p) g.spawnar(tipo, p[0], p[1], p[2]);
  }
  tentarSpawnHostil(g, px, pz, noite, regiaoId) {
    let tipo;
    const r = this.rnd01();
    if (noite) {
      tipo = r < 0.52 ? "zumbi" : r < 0.84 ? "aranha" : "estourador";
    } else {
      const agressivoDia = regiaoId === "cinzas" || regiaoId === void 0;
      if (r < 0.45) tipo = "aranha";
      else if (agressivoDia && r < 0.62) tipo = "estourador";
      else return;
    }
    const p = this.posicaoSpawn(px, pz, 16, 26);
    if (p) g.spawnar(tipo, p[0], p[1], p[2]);
  }
  /** PRNG local do sistema (não partilhado — só para escolher posições). */
  rndSemente = 32417;
  rnd01() {
    this.rndSemente = this.rndSemente * 1664525 + 1013904223 >>> 0;
    return this.rndSemente / 4294967296;
  }
  /** Acha chão sólido num anel à volta do jogador (null = sem chão válido). */
  posicaoSpawn(px, pz, dMin, dMax) {
    const m = this.motor;
    if (!m.mundo) return null;
    const ang = this.rnd01() * Math.PI * 2;
    const dist = dMin + this.rnd01() * (dMax - dMin);
    const x = Math.floor(px + Math.cos(ang) * dist) + 0.5;
    const z = Math.floor(pz + Math.sin(ang) * dist) + 0.5;
    for (let y = ALTURA - 1; y > 2; y--) {
      if (m.mundo.solido(Math.floor(x), y, Math.floor(z)) && !m.mundo.solido(Math.floor(x), y + 1, Math.floor(z)) && !m.mundo.solido(Math.floor(x), y + 2, Math.floor(z))) {
        return [x, y + 1.05, z];
      }
    }
    return null;
  }
  // ── baú de tesouro ────────────────────────────────────────────
  /** v48: público — o E2E pode abrir um baú pelo CAMINHO REAL (mesma função
   *  da mira/ataque) sem depender de mirar pixel-perfeito no canvas. */
  abrirTesouro(x, y, z) {
    for (const p of POIS) {
      for (const b of p.baus) {
        if (b.x === x && b.y === y && b.z === z) {
          if (this.perfil.descobertas.baus.includes(b.chave)) {
            this.aviso(this.txt("Este ba\xFA j\xE1 est\xE1 vazio \u2014 o tesouro foi levado.", "This chest is already empty \u2014 the treasure was taken."), "info", 2.5);
            return;
          }
          this.perfil.descobertas.baus.push(b.chave);
          const xp = Math.round(40 * this.dif.multXP);
          const cred = Math.round(6 * this.dif.multCred);
          this.ganharXP(xp, false);
          this.perfil.creditos += cred;
          let espolioTxt = "";
          let perdidos = 0;
          const esp = ESPOLIO_BAUS[b.chave];
          if (esp && this.motor) {
            const partes = [];
            for (const e of esp) {
              const guardado = this.motor.inv.adicionar(e.id, e.qtd);
              if (guardado > 0) partes.push(`${guardado}\xD7 ${nomeItem(e.id, this.lingua)}`);
              if (guardado < e.qtd) perdidos += e.qtd - guardado;
            }
            espolioTxt = partes.length ? this.lingua === "en" ? ` \xB7 loot: ${partes.join(", ")}` : ` \xB7 esp\xF3lio: ${partes.join(", ")}` : "";
            if (perdidos > 0) this.aviso(this.txt(`Mochila cheia \u2014 ${perdidos} item(ns) do esp\xF3lio n\xE3o couberam (perdidos: o ba\xFA abriu).`, `Backpack full \u2014 ${perdidos} loot item(s) didn't fit (lost: the chest opened).`), "info", 4);
          }
          this.aviso(this.txt(`Ba\xFA de tesouro aberto: +${xp} XP, +${cred} cr\xE9ditos${espolioTxt}.`, `Treasure chest opened: +${xp} XP, +${cred} credits${espolioTxt}.`), "descoberta", 3.5);
          this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "abrirBaus", qtd: 1, dia: diaLocal(), dif: this.dif }));
          return;
        }
      }
    }
    this.aviso(this.txt("Ba\xFA sem tesouro \u2014 o mundo guarda os seus segredos noutros ba\xFAs.", "Chest without treasure \u2014 the world keeps its secrets in other chests."), "info", 2.5);
  }
  // ── v50: ITENS NO CHÃO — gestor (malhas + recolha) ─────────────────
  /** Malha do item: cubo pequeno com a cor REAL do item (CORES do motor). */
  malhaItemChao(id) {
    const c = CORES[id] ?? ["#999999", "#666666"];
    return new THREE3.Mesh(
      new THREE3.BoxGeometry(0.28, 0.28, 0.28),
      new THREE3.MeshLambertMaterial({ color: c[0] })
    );
  }
  adicionarItemChao(id, qtd, x, y, z, pegaT = 0) {
    const m = this.motor;
    if (!m || !m.mundo) return;
    const dado = criarItemChao(id, qtd, x, y, z, this.rnd01() * Math.PI * 2, pegaT);
    const malha = this.malhaItemChao(id);
    malha.position.set(dado.x, dado.y, dado.z);
    m.mundo.grupo.add(malha);
    this.itensChaoRpg.push({ dado, malha });
    for (const fora of aplicarCapItens(this.itensChaoRpg.map((i) => i.dado))) {
      const idx5 = this.itensChaoRpg.findIndex((i) => i.dado === fora);
      if (idx5 >= 0) {
        this.removerItemChao(idx5);
        this.expiradosCap++;
      }
    }
  }
  removerItemChao(idx5) {
    const ic = this.itensChaoRpg[idx5];
    if (!ic) return;
    if (this.motor?.mundo) this.motor.mundo.grupo.remove(ic.malha);
    ic.malha.geometry.dispose();
    ic.malha.material.dispose();
    this.itensChaoRpg.splice(idx5, 1);
  }
  limparItensChao() {
    if (this.motor?.mundo) for (const ic of this.itensChaoRpg) this.motor.mundo.grupo.remove(ic.malha);
    for (const ic of this.itensChaoRpg) {
      ic.malha.geometry.dispose();
      ic.malha.material.dispose();
    }
    this.itensChaoRpg = [];
  }
  /** Lista REAL do chão (HUD, ganchos E2E) — distâncias ao herói incluídas. */
  listaItensChao() {
    const m = this.motor;
    const px = m?.px ?? 0, pz = m?.pz ?? 0;
    return {
      itens: this.itensChaoRpg.map((i) => ({
        id: i.dado.id,
        qtd: i.dado.qtd,
        x: i.dado.x,
        y: i.dado.y,
        z: i.dado.z,
        dist: Math.round(Math.hypot(i.dado.x - px, i.dado.z - pz) * 10) / 10
      })),
      total: this.itensChaoRpg.length,
      recolhidos: this.recolhidos,
      expiradosTTL: this.expiradosTTL,
      expiradosCap: this.expiradosCap,
      cap: ITEM_CAP,
      ttl: ITEM_CHAO_TTL
    };
  }
  /** v50: Q / botão LARGAR — 1 unidade do slot selecionado vai para o chão
   *  à frente do herói (convenção do motor: frente = −sin(yaw), −cos(yaw)).
   *  O gasto passa pelo consumirSelecionado REAL do motor. */
  largarSelecionado() {
    const m = this.motor;
    if (!m || m.fase !== "jogando") return false;
    const s = m.inv.selecionado();
    if (!s) return false;
    const id = s.id;
    m.inv.consumirSelecionado(1);
    const x = m.px - Math.sin(m.yaw) * 1.1;
    const z = m.pz - Math.cos(m.yaw) * 1.1;
    this.adicionarItemChao(id, 1, x, m.py + 1.2, z, 1.2);
    this.aviso(this.txt(`Largaste 1\xD7 ${nomeItem(id, this.lingua)} \u2014 fica no ch\xE3o (aproxima-te para recolher).`, `Dropped 1\xD7 ${nomeItem(id, this.lingua)} \u2014 it stays on the ground (walk close to pick it up).`), "info", 2.5);
    return true;
  }
  // ── kill → XP + missões ───────────────────────────────────────
  registarKill(mob) {
    const m = this.motor;
    const regiao = regiaoEm(m.px, m.pz);
    const nivel = regiao?.nivel ?? NIVEL_SELVAGEM;
    if (mob.__boss) {
      this.boss.vivo = false;
      this.boss.derrotado = true;
      this.perfil.bossDerrotado = true;
      this.bossMob = null;
      this.perfil.kills.guardiao++;
      this.perfil.kills.hostil++;
      const xp2 = Math.round(150 * this.dif.multXP * (1 + this.perfil.skills.sabio * 0.05));
      this.ganharXP(xp2, false);
      this.aviso(this.txt(`O GUARDI\xC3O caiu! +${xp2} XP \u2014 as Ru\xEDnas dormem em paz.`, `The GUARDIAN fell! +${xp2} XP \u2014 the Ruins sleep in peace.`), "boss", 5);
      this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "matar", alvo: "guardiao", dia: diaLocal(), dif: this.dif }));
      return;
    }
    const tipoKill = TIPO_KILL[mob.tipo];
    if (!tipoKill) {
      this.perfil.kills.passivo++;
      this.ganharXP(xpPorKiller("passivo", nivel, this.dif, this.perfil.skills.sabio), false);
      return;
    }
    this.perfil.kills[tipoKill]++;
    this.perfil.kills.hostil++;
    const xp = xpPorKiller(tipoKill, nivel, this.dif, this.perfil.skills.sabio);
    this.ganharXP(xp, false);
    this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "matar", alvo: tipoKill, dia: diaLocal(), dif: this.dif }));
  }
  // ── XP / níveis ───────────────────────────────────────────────
  ganharXP(qtd, comAviso) {
    if (qtd <= 0) return;
    const antes = nivelDe(this.perfil.xp);
    this.perfil.xp = Math.min(xpParaNivel(NIVEL_MAX) + 1, this.perfil.xp + qtd);
    const depois = nivelDe(this.perfil.xp);
    if (depois > antes) {
      this.perfil.pontos += depois - antes;
      this.aviso(this.txt(`N\xCDVEL ${depois}! +${depois - antes} ponto${depois - antes > 1 ? "s" : ""} de habilidade.`, `LEVEL ${depois}! +${depois - antes} skill point${depois - antes > 1 ? "s" : ""}.`), "nivel", 4);
    } else if (comAviso) {
      this.aviso(`+${qtd} XP`, "info", 1.6);
    }
  }
  processarRecompensas(recompensas) {
    for (const r of recompensas) {
      this.ganharXP(r.xp, false);
      this.perfil.creditos += r.creditos;
      const tituloLingua = r.diaria ? tituloDiaria(r.titulo, this.lingua) : HISTORIA.find((h) => h.id === r.id) ? tituloMissao(HISTORIA.find((h) => h.id === r.id), this.lingua) : r.titulo;
      this.aviso(this.txt(`${r.diaria ? "Di\xE1ria" : "Cap\xEDtulo"} conclu\xEDda \u2014 ${tituloLingua}: +${r.xp} XP, +${r.creditos} cr\xE9ditos.`, `${r.diaria ? "Daily" : "Chapter"} complete \u2014 ${tituloLingua}: +${r.xp} XP, +${r.creditos} credits.`), "missao", 4.5);
    }
  }
  aviso(texto, tipo, t) {
    this.avisosRpg.push({ texto, tipo, t });
    if (this.avisosRpg.length > 6) this.avisosRpg.splice(0, this.avisosRpg.length - 6);
  }
  /** Texto de aviso na língua de exibição (v62): PT canónico, EN traduzido. */
  txt(pt, en) {
    return this.lingua === "en" ? en : pt;
  }
  // ── tick (chamado pelo loop do componente, a cada passo) ──────
  tick(dt) {
    const m = this.motor;
    if (!m || m.fase !== "jogando") return;
    for (const a of this.avisosRpg) a.t -= dt;
    this.avisosRpg = this.avisosRpg.filter((a) => a.t > 0);
    const regiao = regiaoEm(m.px, m.pz);
    if (regiao && !this.perfil.descobertas.regioes.includes(regiao.id)) {
      this.perfil.descobertas.regioes.push(regiao.id);
      const xp = Math.round(25 * this.dif.multXP);
      this.ganharXP(xp, false);
      this.aviso(this.txt(`Regi\xE3o descoberta \u2014 ${nomeRegiao(regiao, this.lingua)}! +${xp} XP`, `Region discovered \u2014 ${nomeRegiao(regiao, this.lingua)}! +${xp} XP`), "descoberta", 4);
      this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "descobrirRegiao", alvo: regiao.id, dia: diaLocal(), dif: this.dif }));
    }
    const poi = poiEm(m.px, m.pz, raioDescoberta(this.dif, this.perfil.skills.explorador));
    if (poi && !this.perfil.descobertas.pois.includes(poi.id)) {
      this.perfil.descobertas.pois.push(poi.id);
      const xp = Math.round(40 * this.dif.multXP);
      this.ganharXP(xp, false);
      this.aviso(this.txt(`Local descoberto \u2014 ${nomePoi(poi, this.lingua)}! +${xp} XP`, `Place discovered \u2014 ${nomePoi(poi, this.lingua)}! +${xp} XP`), "descoberta", 4);
      this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "chegarPoi", alvo: poi.id, dia: diaLocal(), dif: this.dif }));
    }
    if (this.posAnterior) {
      const d = Math.hypot(m.px - this.posAnterior[0], m.pz - this.posAnterior[1]);
      this.andouFrac += d;
      if (this.andouFrac >= 10) {
        const blocos = Math.floor(this.andouFrac);
        this.perfil.blocos += blocos;
        this.andouFrac -= blocos;
        this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "andar", qtd: blocos, dia: diaLocal(), dif: this.dif }));
      }
    }
    this.posAnterior = [m.px, m.pz];
    if (m.noite && !this.noiteAntes) this.noiteSobrevivendo = true;
    if (!m.noite && this.noiteAntes && this.noiteSobrevivendo) {
      this.noiteSobrevivendo = false;
      this.processarRecompensas(aplicarEvento(this.perfil.missoes, { tipo: "sobreviverNoite", dia: diaLocal(), dif: this.dif }));
      this.aviso(this.txt("Sobreviveste \xE0 noite. O imbondeiro conta a tua hist\xF3ria.", "You survived the night. The baobab tells your story."), "info", 3.5);
    }
    this.noiteAntes = m.noite;
    const cap = capituloAtual(this.perfil.missoes);
    if (cap?.id === "h6" && !this.boss.spawnado && !this.boss.derrotado) {
      const ruinas = POIS.find((p) => p.id === "ruinas");
      if (ruinas && Math.hypot(m.px - ruinas.x, m.pz - ruinas.z) < 16 && m.gestor && m.mundo) {
        this.bossPendente = true;
        let y = 34;
        for (let yy = ALTURA - 1; yy > 2; yy--) {
          if (m.mundo.solido(ruinas.x, yy, ruinas.z)) {
            y = yy + 1;
            break;
          }
        }
        m.gestor.spawnar("zumbi", ruinas.x + 0.5, y + 0.05, ruinas.z + 0.5);
        this.aviso(this.txt("O GUARDI\xC3O das Ru\xEDnas acordou!", "The Guardian of the Ruins has awakened!"), "boss", 4);
      }
    }
    const agora = Date.now();
    if (this.perfil.skills.sabio > 0 && m.vida > 0 && m.vida < VIDA_MAX && agora - this.lastDanoT > 8e3) {
      m.vida = Math.min(VIDA_MAX, m.vida + this.perfil.skills.sabio * 0.4 * dt);
    }
    if (this.itensChaoRpg.length && m.mundo) {
      const r = passoItensChao(
        this.itensChaoRpg.map((i) => i.dado),
        dt,
        (x, y, z) => m.mundo.solido(x, y, z),
        m.px,
        m.py,
        m.pz
      );
      for (const item of r.pegos) {
        const guardado = m.inv.adicionar(item.id, item.qtd);
        if (guardado > 0) {
          this.recolhidos += guardado;
          this.aviso(this.txt(`+${guardado}\xD7 ${nomeItem(item.id, this.lingua)} \u2014 recolhido do ch\xE3o.`, `+${guardado}\xD7 ${nomeItem(item.id, this.lingua)} \u2014 picked up from the ground.`), "info", 2);
          item.qtd -= guardado;
        }
        if (item.qtd <= 0) {
          const idx5 = this.itensChaoRpg.findIndex((i) => i.dado === item);
          if (idx5 >= 0) this.removerItemChao(idx5);
        } else if (item.avisoCheiaT <= 0) {
          item.avisoCheiaT = 8;
          this.aviso(this.txt("Mochila cheia \u2014 o item fica no ch\xE3o at\xE9 caber.", "Backpack full \u2014 the item stays on the ground until it fits."), "info", 3);
        }
      }
      for (const item of r.expirados) {
        const idx5 = this.itensChaoRpg.findIndex((i) => i.dado === item);
        if (idx5 >= 0) {
          this.removerItemChao(idx5);
          this.expiradosTTL++;
        }
      }
      for (const ic of this.itensChaoRpg) {
        ic.malha.position.set(ic.dado.x, ic.dado.y + 0.16 + Math.sin(ic.dado.idade * 3) * 0.05, ic.dado.z);
        ic.malha.rotation.y += dt * 2.2;
      }
    }
    this.cdSave -= dt;
    if (this.cdSave <= 0) {
      this.cdSave = 8;
      void this.guardar();
    }
  }
  // ── ações da UI ───────────────────────────────────────────────
  gastarPonto(ramo) {
    if (this.perfil.pontos < 1 || this.perfil.skills[ramo] >= NIVEL_MAX_RAMO_RPG) return false;
    this.perfil.pontos -= 1;
    this.perfil.skills[ramo] += 1;
    if (this.motor && ramo === "explorador") this.motor.escalaVel = escalaVelExplorador(this.perfil.skills.explorador);
    this.aviso(this.txt(`${nomeRamo(ramo, this.lingua)} n\xEDvel ${this.perfil.skills[ramo]}.`, `${nomeRamo(ramo, this.lingua)} level ${this.perfil.skills[ramo]}.`), "nivel", 3);
    void this.guardar();
    return true;
  }
  definirDificuldade(d) {
    if (!DIFICULDADES_RPG[d]) return false;
    this.perfil.dificuldade = d;
    void this.guardar();
    return true;
  }
  // ── save / load honesto (padrão do armazem.ts + progressao.ts) ─
  async guardar() {
    if (!this.motor) return { ok: false, onde: "nenhum", erro: "motor n\xE3o ligado" };
    this.perfil.pos = [Math.round(this.motor.px * 10) / 10, Math.round(this.motor.py * 10) / 10, Math.round(this.motor.pz * 10) / 10];
    this.perfil.inv = this.motor.inv.slots.map((s) => s ? { id: s.id, qtd: s.qtd } : null);
    this.perfil.invArm = this.motor.inv.armadura ? { id: this.motor.inv.armadura.id, qtd: 1 } : null;
    this.perfil.itensChao = this.itensChaoRpg.map((i) => ({
      id: i.dado.id,
      qtd: i.dado.qtd,
      x: Math.round(i.dado.x * 100) / 100,
      y: Math.round(i.dado.y * 100) / 100,
      z: Math.round(i.dado.z * 100) / 100
    }));
    this.perfil.ts = Date.now();
    const ls = espelharLS(CHAVE_SAVE_RPG, this.perfil);
    const idb = await idbDefinir(CHAVE_SAVE_RPG, this.perfil);
    const ok = idb.ok || ls.ok;
    if (!ok) this.aviso(this.txt("Save falhou (sem espa\xE7o?): o progresso corre risco.", "Save failed (out of space?): progress is at risk."), "info", 4);
    return { ok, onde: idb.ok && ls.ok ? "idb+ls" : idb.ok ? "idb" : ls.ok ? "ls" : "nenhum" };
  }
  async apagarSave() {
    try {
      localStorage.removeItem(CHAVE_SAVE_RPG);
    } catch {
    }
    await idbRemover(CHAVE_SAVE_RPG);
    this.perfil = perfilInicial(this.perfil.dificuldade);
    this.boss = { vivo: false, derrotado: false, spawnado: false };
    this.bossMob = null;
    this.limparItensChao();
    this.recolhidos = 0;
    this.expiradosTTL = 0;
    this.expiradosCap = 0;
  }
  /** Espera o IDB e devolve o perfil carregado (para o botão CONTINUAR). */
  quandoSavePronto() {
    return this.prontoSaveIDB ?? Promise.resolve(this.perfil);
  }
  temSave() {
    try {
      const raw = localStorage.getItem(CHAVE_SAVE_RPG);
      if (raw && validarPerfilRpg(JSON.parse(raw))) return true;
    } catch {
    }
    return this.perfilTemProgresso();
  }
  perfilTemProgresso() {
    return perfilTemProgresso(this.perfil);
  }
  /** Novo jogo: apaga o save RPG e repõe o perfil virgem. */
  async novoJogo(dif) {
    await this.apagarSave();
    this.perfil = perfilInicial(dif);
  }
  // ── captura para o HUD (o espelho do Captura do motor) ────────
  captura() {
    const p = this.perfil;
    const prog = progressoNivel(p.xp);
    const cap = capituloAtual(p.missoes);
    const dia = diaLocal();
    const diarias = missoesDiarias(dia, this.dif, this.lingua);
    const feitasDia = p.missoes.diarias.dia === dia ? p.missoes.diarias.feitas : [];
    let objetivo = null;
    if (cap) {
      for (const o of cap.objetivos) {
        const prog2 = progressoObjetivo(p.missoes, cap.id, o);
        if (prog2 >= o.qtd) continue;
        if (o.tipo === "chegarPoi") {
          const poi = POIS.find((q) => q.id === o.alvo);
          if (poi) objetivo = { texto: o.texto, x: poi.x, z: poi.z };
        } else if (o.tipo === "descobrirRegiao") {
          const r = REGIOES.find((q) => q.id === o.alvo);
          if (r) objetivo = { texto: o.texto, x: r.cx, z: r.cz };
        } else if (o.tipo === "abrirBaus") {
          const livre = POIS.flatMap((q) => q.baus).find((b) => !p.descobertas.baus.includes(b.chave));
          if (livre) objetivo = { texto: o.texto, x: livre.x, z: livre.z };
        } else if (o.tipo === "matar") {
          objetivo = { texto: o.texto, x: NaN, z: NaN };
        }
        break;
      }
    }
    return {
      nivel: prog.nivel,
      xpAtual: prog.atual,
      xpFalta: prog.falta,
      pontos: p.pontos,
      skills: { ...p.skills },
      dificuldade: this.dif,
      regiao: regiaoEm(this.motor?.px ?? 0, this.motor?.pz ?? 0),
      capitulo: cap ? {
        id: cap.id,
        titulo: cap.titulo,
        objetivos: cap.objetivos.map((o) => ({ texto: o.texto, prog: progressoObjetivo(p.missoes, cap.id, o), qtd: o.qtd }))
      } : null,
      historiaFeita: !cap,
      diarias: diarias.map((d) => ({
        id: d.id,
        titulo: d.titulo,
        texto: d.objetivo.texto,
        xp: d.xp,
        creditos: d.creditos,
        prog: p.missoes.diarias.dia === dia ? Math.min(d.objetivo.qtd, p.missoes.diarias.prog[d.id] ?? 0) : 0,
        qtd: d.objetivo.qtd,
        feita: feitasDia.includes(d.id)
      })),
      creditos: p.creditos,
      kills: { ...p.kills },
      mortes: p.mortes,
      blocos: p.blocos,
      boss: {
        vivo: this.boss.vivo,
        derrotado: this.boss.derrotado || this.perfil.bossDerrotado,
        spawnado: this.boss.spawnado,
        hp: this.bossMob?.vivo ? Math.max(0, Math.round(this.bossMob.hp)) : void 0,
        hpMax: this.bossMob?.vivo ? this.bossMob.hpMax : void 0
      },
      descobertas: { regioes: p.descobertas.regioes.length, pois: p.descobertas.pois.length, baus: p.descobertas.baus.length },
      totalRegioes: REGIOES.length,
      totalPois: POIS.length,
      totalBaus: POIS.reduce((n, q) => n + q.baus.length, 0),
      // v50: chão honesto — o HUD mostra o que está mesmo lá (e o que saiu)
      itensChao: {
        total: this.itensChaoRpg.length,
        recolhidos: this.recolhidos,
        expiradosTTL: this.expiradosTTL,
        expiradosCap: this.expiradosCap,
        cap: ITEM_CAP,
        ttl: ITEM_CHAO_TTL
      },
      avisos: this.avisosRpg.map((a) => ({ ...a })),
      objetivo
    };
  }
};
export {
  CHAVE_SAVE_RPG,
  SistemaRPG
};
