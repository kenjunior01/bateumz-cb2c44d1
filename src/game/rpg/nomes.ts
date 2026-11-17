// ============================================================
// v62 — NÓS DE TRADUÇÃO DO BATEU RPG (roadmap item 3: «Translate
// 3D World visible text into English»).
// O PORTUGUÊS CONTINUA CANÓNICO no motor (core.ts/constants.ts/sistemaRpg
// com lingua="pt" por omissão — os 157 testes do núcleo ficam intactos).
// Este módulo é a CAMADA DE EXIBIÇÃO: dado o dado canónico e a língua do
// utilizador, devolve o rótulo a mostrar. Puro browser E Node (mesmo
// padrão dos núcleos isomórficos v58–v61). Zero depedência de THREE ou
// React — só funções puras sobre os tipos do core.
// ============================================================

import {
  DIFICULDADES_RPG, REGIOES, POIS, HISTORIA, EFEITO_RAMO,
  type Regiao, type Poi, type Missao,
  type DificuldadeRpg, type RamoRpg,
} from "./core.ts";
import { NOMES, ITENS } from "../blocos/constants.ts";

/** Línguas de exibição do mundo: PT canónico + EN traduzido. As outras
 *  línguas da plataforma caem no EN pela cascata do LanguageContext. */
export type LinguaRpg = "pt" | "en";

export const linguaValida = (l: string | null | undefined): LinguaRpg =>
  l === "en" ? "en" : "pt";

// ── Dificuldades ──────────────────────────────────────────────
const NOMES_DIFICULDADE_EN: Record<DificuldadeRpg, { nome: string; desc: string }> = {
  medio: {
    nome: "NORMAL",
    desc: "The balance of the tales. Enemies as the bards tell them, fair rewards.",
  },
  dificil: {
    nome: "HARD",
    desc: "For those who already survived a night in the Miombo. Enemies 50% stronger, XP and credits +25%.",
  },
  lenda: {
    nome: "LEGEND",
    desc: "The guardians wake. Enemies more than doubled, XP and credits +60% — only for living legends.",
  },
};

export function nomeDificuldade(id: DificuldadeRpg, lingua: LinguaRpg): string {
  if (lingua === "en") return NOMES_DIFICULDADE_EN[id].nome;
  return DIFICULDADES_RPG[id].nome;
}
export function descDificuldade(id: DificuldadeRpg, lingua: LinguaRpg): string {
  if (lingua === "en") return NOMES_DIFICULDADE_EN[id].desc;
  return DIFICULDADES_RPG[id].desc;
}

// ── Regiões ───────────────────────────────────────────────────
const REGIOES_EN: Record<string, { nome: string; desc: string }> = {
  aldeia: { nome: "Village Plains", desc: "The home. Wattle houses, a lit campfire and the baobab of the tales." },
  planalto: { nome: "Winds Plateau", desc: "Tall grass where the wind never rests. Zombies roam at dusk." },
  miombo: { nome: "Deep Miombo", desc: "Dense miombo woodland — a real biome of eastern Mozambique and Angola. Spiders hunt here." },
  costa: { nome: "Coral Coast", desc: "White sand and sea. The winds' port awaits corsairs." },
  serra: { nome: "Northern Range", desc: "Stone and height. From the tower you can see half the world." },
  cinzas: { nome: "Ashlands", desc: "Volcanic soil and boomers. Nobody camps here twice." },
};
export function nomeRegiao(r: Regiao, lingua: LinguaRpg): string {
  if (lingua === "en") return REGIOES_EN[r.id]?.nome ?? r.nome;
  return r.nome;
}
export function descRegiao(r: Regiao, lingua: LinguaRpg): string {
  if (lingua === "en") return REGIOES_EN[r.id]?.desc ?? r.desc;
  return r.desc;
}

// ── Locais (POIs) ─────────────────────────────────────────────
const POIS_EN: Record<string, { nome: string; desc: string }> = {
  aldeia: { nome: "Starting Village", desc: "Where it all begins. The campfire never goes out." },
  torre: { nome: "Watchtower", desc: "From the top you see the whole Plateau — and everything that moves on it." },
  cacadores: { nome: "Hunters' Camp", desc: "Tents, a skewer and the stories of those who came back." },
  forja: { nome: "Lost Forge", desc: "Furnaces still warm. Somebody smelted iron here — not long ago." },
  ruinas: { nome: "Kivulivuli Ruins", desc: "Broken walls of a kingdom the maps forgot. The Guardian sleeps here." },
  cova: { nome: "Bat Cave", desc: "A stone mouth on the hillside. Inside, the cool of the earth." },
  baoba: { nome: "Elder Baobab", desc: "The oldest tree on the plains. Some apologize before touching it." },
  porto: { nome: "Winds Port", desc: "A pier of worn planks. The sea returns what it takes." },
};
export function nomePoi(p: Poi, lingua: LinguaRpg): string {
  if (lingua === "en") return POIS_EN[p.id]?.nome ?? p.nome;
  return p.nome;
}
export function descPoi(p: Poi, lingua: LinguaRpg): string {
  if (lingua === "en") return POIS_EN[p.id]?.desc ?? p.desc;
  return p.desc;
}

// ── História (missões de capítulo) ────────────────────────────
const HISTORIA_EN: Record<string, { titulo: string; objetivos: string[] }> = {
  h1: { titulo: "Call of the Village", objetivos: ["Climb the Watchtower"] },
  h2: { titulo: "Cloak of the Night", objetivos: ["Defeat 5 hostile enemies"] },
  h3: { titulo: "The Deep Miombo", objetivos: ["Discover the Deep Miombo", "Defeat 4 miombo spiders"] },
  h4: { titulo: "Kivulivuli Ruins", objetivos: ["Reach the Kivulivuli Ruins", "Open 2 treasure chests"] },
  h5: { titulo: "Boomer Hunt", objetivos: ["Defeat 3 boomers"] },
  h6: { titulo: "The Guardian of the Ruins", objetivos: ["Discover the Ashlands", "Defeat the Guardian of the Ruins"] },
};
export function tituloMissao(m: Missao, lingua: LinguaRpg): string {
  if (lingua === "en") return HISTORIA_EN[m.id]?.titulo ?? m.titulo;
  return m.titulo;
}
/** Texto do objetivo i da missão (a história é fixa — o EN vai pelo índice). */
export function textoObjetivoMissao(m: Missao, i: number, lingua: LinguaRpg): string {
  const en = HISTORIA_EN[m.id]?.objetivos[i];
  if (lingua === "en" && en) return en;
  return m.objetivos[i]?.texto ?? "";
}

/** Título por ID de capítulo (a captura RPG só carrega id+titulo PT). */
export function tituloMissaoPorId(id: string, lingua: LinguaRpg): string {
  const m = HISTORIA.find((h) => h.id === id);
  return m ? tituloMissao(m, lingua) : id;
}
/** Texto do objetivo i por ID de capítulo (mesma ordem dos objetivos). */
export function textoObjetivoPorId(id: string, i: number, lingua: LinguaRpg): string {
  const m = HISTORIA.find((h) => h.id === id);
  return m ? textoObjetivoMissao(m, i, lingua) : "";
}
/** Texto de objetivo PT → EN (a bússola da captura só traz o texto). */
export function textoObjetivoPorTexto(pt: string, lingua: LinguaRpg): string {
  if (lingua !== "en") return pt;
  for (const m of HISTORIA) {
    const i = m.objetivos.findIndex((o) => o.texto === pt);
    if (i >= 0 && HISTORIA_EN[m.id]?.objetivos[i]) return HISTORIA_EN[m.id].objetivos[i];
  }
  return pt;
}

/** Nome PT do catálogo partilhado → EN (armadura na captura, nomes de
 *  receitas que coincidem com itens/blocos do NOMES). */
export function nomePorTexto(pt: string, lingua: LinguaRpg): string {
  if (lingua !== "en") return pt;
  const id = ID_POR_NOME_PT[pt];
  return id !== undefined ? (NOMES_EN[id] ?? pt) : pt;
}

// ── Diárias (títulos dos modelos + textos de objetivo) ────────
const DIARIAS_TITULO_EN: Record<string, string> = {
  "Caçada da manhã": "Morning hunt",
  "Colecionador de tesouros": "Treasure collector",
  "Botas gastas": "Worn-out boots",
  "A noite que sobreviveste": "The night you survived",
  "Roteiro do dia": "Day's route",
  "Controlo de pragas": "Pest control",
};
export function tituloDiaria(tituloPt: string, lingua: LinguaRpg): string {
  if (lingua === "en") return DIARIAS_TITULO_EN[tituloPt] ?? tituloPt;
  return tituloPt;
}

// ── Ramos de habilidade ───────────────────────────────────────
const RAMOS_EN: Record<RamoRpg, { nome: string; efeitos: string[] }> = {
  guerreiro: { nome: "Warrior", efeitos: ["+2 damage per strike level"] },
  explorador: { nome: "Explorer", efeitos: ["+8% speed per level (cap 18%)", "+2 blocks of discovery reach per level"] },
  sabio: { nome: "Sage", efeitos: ["+5% XP per level", "health regeneration out of combat"] },
};
export function nomeRamo(r: RamoRpg, lingua: LinguaRpg): string {
  if (lingua === "en") return RAMOS_EN[r].nome;
  // PT canónico — importado do core via NOMES_RAMO pelos consumidores;
  // aqui devolvemos o nome capitalizado (mesmo texto do core).
  const pt: Record<RamoRpg, string> = { guerreiro: "Guerreiro", explorador: "Explorador", sabio: "Sábio" };
  return pt[r];
}
export function efeitosRamo(r: RamoRpg, lingua: LinguaRpg): string[] {
  if (lingua === "en") return RAMOS_EN[r].efeitos;
  return EFEITO_RAMO[r];
}

// ── Causas de morte (o motor partilhado é PT canónico) ────────
const CAUSA_MORTE_EN: Record<string, string> = {
  "Caiste de alto": "You fell from a height",
  "Afogaste-te": "You drowned",
  "Morreste de fome": "You starved to death",
  "Explodiu ao teu lado": "It exploded next to you",
  "Caiste para fora do mundo": "You fell out of the world",
  "Foste derrotado": "You were defeated",
};
export function causaMorte(pt: string, lingua: LinguaRpg): string {
  if (lingua === "en") return CAUSA_MORTE_EN[pt] ?? pt;
  return pt;
}

// ── Nomes de itens/blocos (catálogo partilhado do motor, PT canónico) ──
const NOMES_EN: Record<number, string> = {
  // blocos
  0: "Air", 1: "Grass", 2: "Dirt", 3: "Stone", 4: "Cobblestone", 5: "Sand", 6: "Water",
  7: "Log", 8: "Leaves", 9: "Planks", 10: "Coal Ore", 11: "Iron Ore", 12: "Gold Ore",
  13: "Diamond Ore", 14: "Bedrock", 15: "Crafting Table", 16: "Furnace", 17: "Torch",
  18: "Glass", 19: "Bed", 20: "Ladder", 21: "Tall Grass", 22: "Yellow Flower",
  23: "Red Flower", 24: "Cactus", 25: "Farmland", 26: "Young Wheat", 27: "Ripe Wheat",
  28: "TNT", 29: "Chest",
  // itens (ids reais do catálogo I = 100–131)
  100: "Stick", 101: "Coal", 102: "Diamond", 103: "Iron Ingot", 104: "Gold Ingot",
  105: "Raw Meat", 106: "Cooked Meat", 107: "Apple",
  108: "Wooden Pickaxe", 109: "Stone Pickaxe", 110: "Iron Pickaxe", 111: "Diamond Pickaxe",
  112: "Wooden Sword", 113: "Stone Sword", 114: "Iron Sword", 115: "Diamond Sword",
  116: "Wooden Shovel", 117: "Seeds", 118: "Wheat", 119: "Wooden Hoe", 120: "Iron Hoe",
  121: "Bread", 122: "Leather", 123: "Leather Chestplate",
  124: "Iron Chestplate", 125: "Diamond Chestplate",
  126: "String", 127: "Fishing Rod", 128: "Sardine", 129: "Horse Mackerel", 130: "Corvina",
  131: "Grilled Fish",
};
/** Nome de item/bloco na língua pedida. PT canónico; EN pelo id (os ids do
 *  catálogo partilhado são estáveis — a tradução cobre todos os NOMES). */
export function nomeItem(id: number, lingua: LinguaRpg): string {
  if (lingua === "en") return NOMES_EN[id] ?? NOMES[id] ?? "?";
  return NOMES[id] ?? "?";
}

// Reverse map PT→id (nomePorTexto) — construído do catálogo canónico.
const ID_POR_NOME_PT: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const idStr of Object.keys(NOMES)) {
    const id = Number(idStr);
    if (!(id in m)) m[NOMES[id]] = id;
  }
  return m;
})();

// ── Rótulos do mapa/minimapa (canvas) ─────────────────────────
export function rotuloMapa(lingua: LinguaRpg): { selvagens: string; nv: (n: number) => string; norte: string } {
  if (lingua === "en") return { selvagens: "Wilderness", nv: (n) => `Lv ${n}`, norte: "N" };
  return { selvagens: "Terras Selvagens", nv: (n) => `Nv ${n}`, norte: "N" };
}

// ── Verificação de cobertura (o teste A prova no Node) ────────
/** Todas as regiões/POIs/missões da história têm tradução EN? */
export function coberturaEnCompleta(): { ok: boolean; faltam: string[] } {
  const faltam: string[] = [];
  for (const r of REGIOES) if (!REGIOES_EN[r.id]) faltam.push("regiao:" + r.id);
  for (const p of POIS) if (!POIS_EN[p.id]) faltam.push("poi:" + p.id);
  for (const m of HISTORIA) {
    const en = HISTORIA_EN[m.id];
    if (!en) { faltam.push("missao:" + m.id); continue; }
    if (en.objetivos.length !== m.objetivos.length) faltam.push("missao:" + m.id + ":objetivos");
  }
  // itens: todo id com nome PT tem nome EN
  for (const idStr of Object.keys(NOMES)) {
    const id = Number(idStr);
    if (!NOMES_EN[id]) faltam.push("item:" + id);
  }
  // ITENS do registo (armaduras/ferramentas usam NOMES, já cobertos acima)
  for (const idStr of Object.keys(ITENS)) {
    const id = Number(idStr);
    if (!NOMES_EN[id]) faltam.push("itens:" + id);
  }
  return { ok: faltam.length === 0, faltam };
}
