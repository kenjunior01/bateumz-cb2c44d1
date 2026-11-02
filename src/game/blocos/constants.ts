// ============================================================
// BATEUCRAFT: MUNDO LEGO — Constantes do motor voxel
// Propostas do género sandbox, implementação 100% original.
// ============================================================

// ── Blocos (ids ≤ 99) ────────────────────────────────────────
export const B = {
  AR: 0, RELVA: 1, TERRA: 2, PEDRA: 3, PEDREGULHO: 4, AREIA: 5, AGUA: 6,
  TRONCO: 7, FOLHAS: 8, TABUAS: 9, CARVAO_M: 10, FERRO_M: 11, OURO_M: 12,
  DIAMANTE_M: 13, ROCHA_MAE: 14, MESA: 15, FORNALHA: 16, TOCHA: 17, VIDRO: 18,
  CAMA: 19, ESCADA: 20, ERVA: 21, FLOR_AM: 22, FLOR_VM: 23, CACTO: 24,
  TERRA_ARADA: 25, TRIGO_J: 26, TRIGO_M: 27, TNT: 28, BAU: 29,} as const;

// Decorações: erva/flores em cruz, cacto em cubo (v29)
export const CRUZ: ReadonlySet<number> = new Set([B.ERVA, B.FLOR_AM, B.FLOR_VM]);

// ── Itens (ids ≥ 100, só inventário) ─────────────────────────
export const I = {
  GRAVETO: 100, CARVAO: 101, DIAMANTE: 102, BARRA_FERRO: 103, BARRA_OURO: 104,
  CARNE_CRUA: 105, CARNE_ASSADA: 106, MACA: 107,
  PICARETA_MADEIRA: 108, PICARETA_PEDRA: 109, PICARETA_FERRO: 110, PICARETA_DIAMANTE: 111,
  ESPADA_MADEIRA: 112, ESPADA_PEDRA: 113, ESPADA_FERRO: 114, ESPADA_DIAMANTE: 115,
  PA_MADEIRA: 116, SEMENTES: 117, TRIGO: 118, ENXADA_MADEIRA: 119, ENXADA_FERRO: 120,
  PAO: 121, COURO: 122, ARMADURA_COURO: 123, ARMADURA_FERRO: 124, ARMADURA_DIAMANTE: 125,
} as const;

export interface DefItem {
  nome: string; cor: string; cor2: string; ferramenta?: "picareta" | "pa" | "espada" | "enxada";
  tier?: number; dano?: number; comida?: number; maximo?: number;
  armadura?: number; // fração de dano absorvida (0.15 = 15%)
}

// Nomes dos blocos e itens (100% português)
export const NOMES: Record<number, string> = {
  [B.AR]: "Ar", [B.RELVA]: "Relva", [B.TERRA]: "Terra", [B.PEDRA]: "Pedra",
  [B.PEDREGULHO]: "Pedregulho", [B.AREIA]: "Areia", [B.AGUA]: "Água",
  [B.TRONCO]: "Tronco", [B.FOLHAS]: "Folhas", [B.TABUAS]: "Tábuas",
  [B.CARVAO_M]: "Minério de Carvão", [B.FERRO_M]: "Minério de Ferro",
  [B.OURO_M]: "Minério de Ouro", [B.DIAMANTE_M]: "Minério de Diamante",
  [B.ROCHA_MAE]: "Rocha-Mãe", [B.MESA]: "Mesa de Criação", [B.FORNALHA]: "Fornalha",
  [B.TOCHA]: "Tocha", [B.VIDRO]: "Vidro", [B.CAMA]: "Cama", [B.ESCADA]: "Escada",
  [B.ERVA]: "Erva Alta", [B.FLOR_AM]: "Flor Amarela", [B.FLOR_VM]: "Flor Vermelha",
  [B.CACTO]: "Cacto",
  [B.TERRA_ARADA]: "Terra Arada", [B.TRIGO_J]: "Trigo Jovem", [B.TRIGO_M]: "Trigo Maduro",
  [B.TNT]: "TNT", [B.BAU]: "Baú",  [I.GRAVETO]: "Graveto", [I.CARVAO]: "Carvão", [I.DIAMANTE]: "Diamante",
  [I.BARRA_FERRO]: "Barra de Ferro", [I.BARRA_OURO]: "Barra de Ouro",
  [I.CARNE_CRUA]: "Carne Crua", [I.CARNE_ASSADA]: "Carne Assada", [I.MACA]: "Maçã",
  [I.PICARETA_MADEIRA]: "Picareta de Madeira", [I.PICARETA_PEDRA]: "Picareta de Pedra",
  [I.PICARETA_FERRO]: "Picareta de Ferro", [I.PICARETA_DIAMANTE]: "Picareta de Diamante",
  [I.ESPADA_MADEIRA]: "Espada de Madeira", [I.ESPADA_PEDRA]: "Espada de Pedra",
  [I.ESPADA_FERRO]: "Espada de Ferro", [I.ESPADA_DIAMANTE]: "Espada de Diamante",
  [I.PA_MADEIRA]: "Pá de Madeira",
  [I.SEMENTES]: "Sementes", [I.TRIGO]: "Trigo", [I.PAO]: "Pão",
  [I.ENXADA_MADEIRA]: "Enxada de Madeira", [I.ENXADA_FERRO]: "Enxada de Ferro",
  [I.COURO]: "Couro", [I.ARMADURA_COURO]: "Peitoral de Couro",
  [I.ARMADURA_FERRO]: "Peitoral de Ferro", [I.ARMADURA_DIAMANTE]: "Peitoral de Diamante",
};

// Cores para ícones do HUD (gradiente CSS) e fallback 3D
export const CORES: Record<number, [string, string]> = {
  [B.RELVA]: ["#5db03a", "#7a5636"], [B.TERRA]: ["#7a5636", "#5d4028"],
  [B.PEDRA]: ["#8f8f8f", "#6e6e6e"], [B.PEDREGULHO]: ["#7d7d7d", "#565656"],
  [B.AREIA]: ["#e2d39a", "#c9b980"], [B.AGUA]: ["#3a6fd8", "#2a55b0"],
  [B.TRONCO]: ["#9a6b39", "#6d4a26"], [B.FOLHAS]: ["#3e8c2a", "#2c6a1c"],
  [B.TABUAS]: ["#b78b52", "#966f3e"], [B.CARVAO_M]: ["#8f8f8f", "#2b2b2b"],
  [B.FERRO_M]: ["#8f8f8f", "#d8af93"], [B.OURO_M]: ["#8f8f8f", "#f0d04a"],
  [B.DIAMANTE_M]: ["#8f8f8f", "#4fe0d8"], [B.ROCHA_MAE]: ["#3a3a3a", "#1c1c1c"],
  [B.MESA]: ["#b78b52", "#7a5636"], [B.FORNALHA]: ["#6e6e6e", "#3d3d3d"],
  [B.TOCHA]: ["#f0c542", "#8a5a2a"], [B.VIDRO]: ["#bfe6f0", "#9cc8d8"],
  [B.CAMA]: ["#c23a3a", "#f0f0f0"], [B.ESCADA]: ["#b78b52", "#8a6a3a"],
  [B.ERVA]: ["#5aa832", "#3a7a20"], [B.FLOR_AM]: ["#f0d04a", "#4f9e2f"],
  [B.FLOR_VM]: ["#e03a3a", "#4f9e2f"], [B.CACTO]: ["#3f8c3f", "#2c6a2c"],
  [B.TERRA_ARADA]: ["#5d4028", "#4a3018"], [B.TRIGO_J]: ["#7ab04a", "#5a8a30"],
  [B.TRIGO_M]: ["#d8b84a", "#b8932a"], [B.TNT]: ["#d83a2a", "#a82018"],
  [B.BAU]: ["#b78b52", "#8a6238"],  [I.GRAVETO]: ["#9a6b39", "#6d4a26"], [I.CARVAO]: ["#2b2b2b", "#111"],
  [I.DIAMANTE]: ["#4fe0d8", "#2bb3ac"], [I.BARRA_FERRO]: ["#d8d8d8", "#a8a8a8"],
  [I.BARRA_OURO]: ["#f0d04a", "#c9a628"], [I.CARNE_CRUA]: ["#e08a7a", "#c05a4a"],
  [I.CARNE_ASSADA]: ["#9a5a3a", "#7a3a22"], [I.MACA]: ["#e03a3a", "#b02020"],
  [I.PICARETA_MADEIRA]: ["#b78b52", "#8a6a3a"], [I.PICARETA_PEDRA]: ["#9a9a9a", "#6a6a6a"],
  [I.PICARETA_FERRO]: ["#d8d8d8", "#a8a8a8"], [I.PICARETA_DIAMANTE]: ["#4fe0d8", "#2bb3ac"],
  [I.ESPADA_MADEIRA]: ["#b78b52", "#8a6a3a"], [I.ESPADA_PEDRA]: ["#9a9a9a", "#6a6a6a"],
  [I.ESPADA_FERRO]: ["#d8d8d8", "#a8a8a8"], [I.ESPADA_DIAMANTE]: ["#4fe0d8", "#2bb3ac"],
  [I.PA_MADEIRA]: ["#b78b52", "#8a6a3a"],
  [I.SEMENTES]: ["#7ab04a", "#5a8a30"], [I.TRIGO]: ["#d8b84a", "#b8932a"],
  [I.PAO]: ["#c89a52", "#a87a32"], [I.ENXADA_MADEIRA]: ["#b78b52", "#8a6a3a"],
  [I.ENXADA_FERRO]: ["#d8d8d8", "#a8a8a8"], [I.COURO]: ["#a0683a", "#7a4a24"],
  [I.ARMADURA_COURO]: ["#a0683a", "#7a4a24"], [I.ARMADURA_FERRO]: ["#d8d8d8", "#a8a8a8"],
  [I.ARMADURA_DIAMANTE]: ["#4fe0d8", "#2bb3ac"],
};

// Ferramentas: multiplicador de velocidade e dano (progressão rara e difícil)
export const ITENS: Record<number, DefItem> = {
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
};

export interface DefBloco {
  nome: string; dureza: number; ferramenta: "picareta" | "pa" | null;
  tier: number; // tier mínimo de ferramenta para dropar (0 = mão)
  drop: number | null; // id que cai (null = nada); default = o próprio
  tiles: [number, number, number]; // [topo, baixo, lado] índices do atlas
  solido: boolean; transparente?: boolean; liquido?: boolean; brilho?: number;
  cruz?: boolean; // renderizado em 2 planos diagonais (erva/flores)
}

const D = (o: Partial<DefBloco> & { nome: string; dureza: number; tiles: [number, number, number] }): DefBloco => ({
  ferramenta: null, tier: 0, drop: -1, solido: true, ...o,
});

// dureza = segundos para quebrar À MÃO (progressão difícil)
export const BLOCOS: Record<number, DefBloco> = {
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
  [B.BAU]: D({ nome: NOMES[B.BAU], dureza: 2.5, tiles: [35, 11, 36] }),};

// Blocos que caem se o bloco por baixo for removido (v29)
export const PRECISA_DE_APOIO: ReadonlySet<number> = new Set([B.ERVA, B.FLOR_AM, B.FLOR_VM, B.CACTO]);

export const ehBloco = (id: number) => id > 0 && id < 100;
export const dropDe = (id: number) => { const d = BLOCOS[id]; if (!d) return null; return d.drop === -1 ? id : d.drop; };

// ── Receitas de criação (cada ingrediente: [id, qtd]) ────────
export interface Receita {
  id: string; nome: string; resultado: [number, number];
  ingredientes: [number, number][]; mesa: boolean; categoria: "criacao" | "fundicao";
  desc?: string;
}
export const RECEITAS: Receita[] = [
  { id: "tabuas", nome: "4× Tábuas", resultado: [B.TABUAS, 4], ingredientes: [[B.TRONCO, 1]], mesa: false, categoria: "criacao", desc: "A base de tudo." },
  { id: "gravetos", nome: "4× Gravetos", resultado: [I.GRAVETO, 4], ingredientes: [[B.TABUAS, 2]], mesa: false, categoria: "criacao" },
  { id: "mesa", nome: "Mesa de Criação", resultado: [B.MESA, 1], ingredientes: [[B.TABUAS, 4]], mesa: false, categoria: "criacao", desc: "Desbloqueia receitas avançadas perto dela." },
  { id: "tochas", nome: "4× Tochas", resultado: [B.TOCHA, 4], ingredientes: [[I.GRAVETO, 4], [I.CARVAO, 1]], mesa: false, categoria: "criacao", desc: "Ilumina e afasta a escuridão." },
  { id: "pic_mad", nome: "Picareta de Madeira", resultado: [I.PICARETA_MADEIRA, 1], ingredientes: [[B.TABUAS, 3], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Necessária para pedra." },
  { id: "esp_mad", nome: "Espada de Madeira", resultado: [I.ESPADA_MADEIRA, 1], ingredientes: [[B.TABUAS, 2], [I.GRAVETO, 1]], mesa: true, categoria: "criacao" },
  { id: "pa_mad", nome: "Pá de Madeira", resultado: [I.PA_MADEIRA, 1], ingredientes: [[B.TABUAS, 1], [I.GRAVETO, 2]], mesa: true, categoria: "criacao" },
  { id: "fornalha", nome: "Fornalha", resultado: [B.FORNALHA, 1], ingredientes: [[B.PEDREGULHO, 8]], mesa: true, categoria: "criacao", desc: "Fundir minérios e cozinhar." },
  { id: "pic_ped", nome: "Picareta de Pedra", resultado: [I.PICARETA_PEDRA, 1], ingredientes: [[B.PEDREGULHO, 3], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Necessária para ferro." },
  { id: "esp_ped", nome: "Espada de Pedra", resultado: [I.ESPADA_PEDRA, 1], ingredientes: [[B.PEDREGULHO, 2], [I.GRAVETO, 1]], mesa: true, categoria: "criacao" },
  { id: "pic_fer", nome: "Picareta de Ferro", resultado: [I.PICARETA_FERRO, 1], ingredientes: [[I.BARRA_FERRO, 3], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Necessária para ouro e diamante." },
  { id: "esp_fer", nome: "Espada de Ferro", resultado: [I.ESPADA_FERRO, 1], ingredientes: [[I.BARRA_FERRO, 2], [I.GRAVETO, 1]], mesa: true, categoria: "criacao" },
  { id: "pic_dia", nome: "Picareta de Diamante", resultado: [I.PICARETA_DIAMANTE, 1], ingredientes: [[I.DIAMANTE, 3], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "A mais rápida de todas." },
  { id: "esp_dia", nome: "Espada de Diamante", resultado: [I.ESPADA_DIAMANTE, 1], ingredientes: [[I.DIAMANTE, 2], [I.GRAVETO, 1]], mesa: true, categoria: "criacao" },
  { id: "fun_fer", nome: "2× Barra de Ferro", resultado: [I.BARRA_FERRO, 2], ingredientes: [[B.FERRO_M, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "fun_ouro", nome: "2× Barra de Ouro", resultado: [I.BARRA_OURO, 2], ingredientes: [[B.OURO_M, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "fun_carne", nome: "2× Carne Assada", resultado: [I.CARNE_ASSADA, 2], ingredientes: [[I.CARNE_CRUA, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "fun_vidro", nome: "2× Vidro", resultado: [B.VIDRO, 2], ingredientes: [[B.AREIA, 2], [I.CARVAO, 1]], mesa: false, categoria: "fundicao" },
  { id: "cama", nome: "Cama", resultado: [B.CAMA, 1], ingredientes: [[B.TABUAS, 3], [B.FOLHAS, 3]], mesa: false, categoria: "criacao", desc: "Dorme à noite e define o teu ponto de renascimento." },
  { id: "escada", nome: "3× Escada", resultado: [B.ESCADA, 3], ingredientes: [[B.TABUAS, 7]], mesa: true, categoria: "criacao", desc: "Escala paredes sem saltos." },
  { id: "enx_mad", nome: "Enxada de Madeira", resultado: [I.ENXADA_MADEIRA, 1], ingredientes: [[B.TABUAS, 2], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Lavra terra para plantar sementes." },
  { id: "enx_fer", nome: "Enxada de Ferro", resultado: [I.ENXADA_FERRO, 1], ingredientes: [[I.BARRA_FERRO, 2], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Enxada resistente." },
  { id: "pao", nome: "Pão", resultado: [I.PAO, 1], ingredientes: [[I.TRIGO, 3]], mesa: false, categoria: "criacao", desc: "Restaura 5 de fome." },
  { id: "bau", nome: "Baú", resultado: [B.BAU, 1], ingredientes: [[B.TABUAS, 8]], mesa: true, categoria: "criacao", desc: "18 posições de armazenamento — guardado no teu mundo." },
  { id: "tnt", nome: "TNT", resultado: [B.TNT, 1], ingredientes: [[B.AREIA, 4], [I.CARVAO, 5]], mesa: true, categoria: "criacao", desc: "Ataca-a para acender: explosão enorme. Cuidado!" },
  { id: "arm_couro", nome: "Peitoral de Couro", resultado: [I.ARMADURA_COURO, 1], ingredientes: [[I.COURO, 5], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Absorve 15% do dano." },
  { id: "arm_fer", nome: "Peitoral de Ferro", resultado: [I.ARMADURA_FERRO, 1], ingredientes: [[I.BARRA_FERRO, 5], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Absorve 30% do dano." },
  { id: "arm_dia", nome: "Peitoral de Diamante", resultado: [I.ARMADURA_DIAMANTE, 1], ingredientes: [[I.DIAMANTE, 5], [I.GRAVETO, 2]], mesa: true, categoria: "criacao", desc: "Absorve 45% do dano." },
];

// ── Física / mundo ────────────────────────────────────────────
export const CHUNK = 16, ALTURA = 80, NIVEL_MAR = 30;
export const GRAVIDADE = 26, SALTO = 8.6, VEL_ANDAR = 4.4, VEL_CORRER = 5.9;
export const VIDA_MAX = 20, FOME_MAX = 20, AR_MAX = 10;
export const DIA_SEGUNDOS = 600; // 10 min por dia (proposta do género)
export const ALCANCE = 5;
export const RAIO_EXPLOSAO = 3.2;
export const RAIO_TNT = 4.6;         // TNT explode mais largo que o Estourador
export const FUSIVEL_TNT = 2.6;      // segundos até estourar
export const TEMPO_CRESCER = 26;     // segundos por fase do trigo (sol)
export const CRESCER_CHUVA = 0.42;   // multiplicador do tempo: chove → cresce ×2,4 mais rápido
export const BAU_SLOTS = 18;

export interface Conquista { id: string; nome: string; creditos: number; desc: string }
export const CONQUISTAS: Conquista[] = [
  { id: "primeira_madeira", nome: "Primeiro Tronco", creditos: 2, desc: "Cortaste o teu primeiro tronco." },
  { id: "primeira_pedra", nome: "Idade da Pedra", creditos: 3, desc: "Mineraste pedra pela primeira vez." },
  { id: "primeira_picareta", nome: "Ferramenteiro", creditos: 5, desc: "Criaste a tua primeira picareta." },
  { id: "primeiro_ferro", nome: "Corrida ao Ferro", creditos: 10, desc: "Fundiste a tua primeira barra de ferro." },
  { id: "primeiro_diamante", nome: "DIAMANTE!", creditos: 25, desc: "Encontraste o tesouro mais raro do mundo." },
  { id: "primeira_noite", nome: "Sobrevivente da Noite", creditos: 8, desc: "Sobreviveste à primeira noite." },
  { id: "estourador_derrotado", nome: "Desarme Perfeito", creditos: 10, desc: "Derrotaste um Estourador antes de ele explodir." },
  { id: "bom_descanso", nome: "Bom Descanso", creditos: 5, desc: "Dormiste numa cama e definiste o renascimento." },
  { id: "safari", nome: "Safari", creditos: 6, desc: "Derrotaste o teu primeiro mob." },
  { id: "mineiro", nome: "Mineiro Dedicado", creditos: 8, desc: "Quebraste 200 blocos." },
  { id: "arquiteto", nome: "Arquiteto", creditos: 8, desc: "Colocaste 100 blocos." },
  { id: "agricultor", nome: "Agricultor", creditos: 8, desc: "Colheste trigo maduro." },
  { id: "padeiro", nome: "Padeiro", creditos: 6, desc: "Criaste o teu primeiro pão." },
  { id: "demolidor", nome: "Demolidor", creditos: 10, desc: "Explodiste TNT." },
  { id: "cofre", nome: "Cofre Seguro", creditos: 5, desc: "Guardaste um item num baú." },
  { id: "blindado", nome: "Blindado", creditos: 7, desc: "Vesti-te com um peitoral." },
];
export const WHATSAPP = "258848547887";
