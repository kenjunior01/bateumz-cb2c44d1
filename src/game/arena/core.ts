// ============================================================
// ARENA DAS LENDAS — NÚCLEO PURO (isomórfico: browser E Node)
// ────────────────────────────────────────────────────────────
// O jogo do mundo 3D deixou de ser voxel (o estilo «Minecraft» foi
// APAGADO a pedido do utilizador — src/game/blocos + src/game/rpg +
// src/game/cidade removidos) e passa a ser um MMO de arena em vista
// de topo estilo League of Legends com multi-jogador real estilo
// hordes.io (muitos utilizadores em simultâneo no MESMO mundo).
//
// As regras vivem AQUI (padrão «common» já usado pela plataforma):
// campeões, habilidades QWER, mobs, XP/essência, itens, dano,
// orçamentos anti-abuso, validação e sanitização do protocolo.
// Zero three.js, zero react, zero ws — testável direto no Node
// e compartilhado pelo cliente E pelo servidor (uma só fonte).
// ============================================================

// ── Mundo ───────────────────────────────────────────────────────
export const TAM_MUNDO = 220;            // lado do quadrado [-110, 110]
export const METADE_MUNDO = TAM_MUNDO / 2;
export const RAIO_INTERESSE = 70;        // snapshot só envia o que está a < 70u (padrão Veloren: raio de interesse)
export const POS_BASE: Pos = { x: -78, z: 78 };   // Base das Lendas (canto inferior-esquerdo, estilo LoL)
export const RAIO_FONTE = 9;             // a fonte da base regenera vida/mana
export const REGEN_FONTE_HP = 60;        // hp/s dentro da fonte
export const REGEN_FONTE_MP = 40;        // mp/s dentro da fonte
export const RAIO_REVIVER = 6;           // renasce junto à fonte
export const TEMPO_RESPAWN = 8;          // s de espera após a morte

export interface Pos { x: number; z: number }

// ── Campeões ────────────────────────────────────────────────────
export type CampeaoId = "kaimu" | "lyra" | "vex" | "nara";
export type SlotHabilidade = "Q" | "W" | "E" | "R";

export interface DefHabilidade {
  slot: SlotHabilidade;
  cd: number;               // segundos de cooldown
  mana: number;             // custo em mana
  alcance: number;          // alcance do ponto-alvo (0 = em si)
  dano: number;             // dano base no nível 1 (escala com nível)
  danoPorNivel: number;     // + por nível do campeão
  cura?: number;            // cura base (Nara / escudos)
  curaPorNivel?: number;
  escudo?: boolean;         // efeito é escudo (absorve dano)
  lentidao?: number;        // lentidão aplicada (fração da velocidade)
  durLentidao?: number;     // duração da lentidão (s)
  dash?: number;            // deslocamento instantâneo (u)
  blink?: boolean;          // teleporta (ignora inimigos)
  area?: number;            // raio do efeito em área
  canalizado?: number;      // duração de dano canalizado (s)
  velocidadeProjetil?: number; // >0 = habilidade é projétil
  descricao: string;        // descrição canónica PT (EN via i18n)
}

export interface DefCampeao {
  id: CampeaoId;
  nome: string;
  papel: "guerreiro" | "mago" | "atirador" | "curandeira";
  alcanceAtaque: number;    // ataque básico (≤3 = corpo a corpo)
  ataquePS: number;         // ataques por segundo
  hp: number; hpPorNivel: number;
  mp: number; mpPorNivel: number;
  regenHP: number; regenMP: number;     // por segundo fora da fonte
  velocidade: number;       // u/s
  armadura: number;         // redução de dano recebido
  poder: number;            // poder de habilidade base (amplifica QWER)
  cor: string;              // cor de identidade (ring/modelo)
  habilidades: Record<SlotHabilidade, DefHabilidade>;
  historia: string;
}

export const NIVEL_MAX = 18;

export const CAMPEOES: Record<CampeaoId, DefCampeao> = {
  kaimu: {
    id: "kaimu", nome: "Kaimu", papel: "guerreiro",
    alcanceAtaque: 2.8, ataquePS: 0.85,
    hp: 660, hpPorNivel: 96, mp: 300, mpPorNivel: 38,
    regenHP: 2.5, regenMP: 1.4,
    velocidade: 7.2, armadura: 28, poder: 0, cor: "#e4572e",
    habilidades: {
      Q: { slot: "Q", cd: 5, mana: 30, alcance: 4.6, dano: 42, danoPorNivel: 12, area: 4.6, descricao: "Corte em arco à frente que fere todos os inimigos no cone." },
      W: { slot: "W", cd: 12, mana: 40, alcance: 0, dano: 0, danoPorNivel: 0, escudo: true, cura: 60, curaPorNivel: 15, durLentidao: 3, descricao: "Pele de pedra: escudo que absorve dano durante 3 s." },
      E: { slot: "E", cd: 10, mana: 40, alcance: 7.5, dano: 30, danoPorNivel: 8, dash: 7.5, descricao: "Investida: avança 7,5 u e fere o primeiro inimigo no caminho." },
      R: { slot: "R", cd: 60, mana: 80, alcance: 0, dano: 95, danoPorNivel: 20, area: 7.5, lentidao: 0.4, durLentidao: 2, descricao: "Terremoto: golpeia o chão à tua volta em larga área e abranda os inimigos." },
    },
    historia: "Veterano das areias de Mafalala, luta com a força das lendas antigas.",
  },
  lyra: {
    id: "lyra", nome: "Lyra", papel: "mago",
    alcanceAtaque: 9, ataquePS: 0.65,
    hp: 520, hpPorNivel: 78, mp: 430, mpPorNivel: 56,
    regenHP: 2.0, regenMP: 2.2,
    velocidade: 6.9, armadura: 18, poder: 10, cor: "#8a6cff",
    habilidades: {
      Q: { slot: "Q", cd: 4, mana: 35, alcance: 11, dano: 58, danoPorNivel: 14, velocidadeProjetil: 26, descricao: "Raio arcano: projétil de energia que fere o primeiro inimigo." },
      W: { slot: "W", cd: 9, mana: 45, alcance: 8.5, dano: 48, danoPorNivel: 11, area: 5.5, lentidao: 0.35, durLentidao: 1.6, descricao: "Nova de gelo: explode no ponto-alvo e abranda quem for atingido." },
      E: { slot: "E", cd: 14, mana: 40, alcance: 8.5, dano: 0, danoPorNivel: 0, blink: true, descricao: "Passo etéreo: teleporta para o ponto-alvo." },
      R: { slot: "R", cd: 70, mana: 90, alcance: 9.5, dano: 135, danoPorNivel: 28, area: 8, descricao: "Tempestade arcana: devastação massiva na área-alvo." },
    },
    historia: "Guardiã da biblioteca suspensa, tece tempestades com palavras antigas.",
  },
  vex: {
    id: "vex", nome: "Vex", papel: "atirador",
    alcanceAtaque: 10, ataquePS: 1.1,
    hp: 510, hpPorNivel: 76, mp: 310, mpPorNivel: 34,
    regenHP: 2.0, regenMP: 1.5,
    velocidade: 7.0, armadura: 16, poder: 0, cor: "#3fae6a",
    habilidades: {
      Q: { slot: "Q", cd: 5, mana: 30, alcance: 12, dano: 50, danoPorNivel: 10, velocidadeProjetil: 34, descricao: "Tiro perfurante: flecha que atravessa os inimigos em linha." },
      W: { slot: "W", cd: 14, mana: 40, alcance: 9, dano: 0, danoPorNivel: 0, area: 3.2, lentidao: 0.5, durLentidao: 3, descricao: "Armadilha: zona que abranda inimigos durante 3 s." },
      E: { slot: "E", cd: 9, mana: 35, alcance: 6, dano: 0, danoPorNivel: 0, dash: 6, descricao: "Cambalhota: rola na direção do movimento." },
      R: { slot: "R", cd: 65, mana: 80, alcance: 10, dano: 125, danoPorNivel: 24, area: 6, canalizado: 2, descricao: "Chuva de flechas: bombardeia a área-alvo durante 2 s." },
    },
    historia: "Batedora do mato, nunca erra um tiro quando o povo depende dela.",
  },
  nara: {
    id: "nara", nome: "Nara", papel: "curandeira",
    alcanceAtaque: 8.5, ataquePS: 0.8,
    hp: 570, hpPorNivel: 84, mp: 400, mpPorNivel: 50,
    regenHP: 2.4, regenMP: 2.0,
    velocidade: 7.1, armadura: 20, poder: 5, cor: "#e8b13f",
    habilidades: {
      Q: { slot: "Q", cd: 4.5, mana: 30, alcance: 10, dano: 46, danoPorNivel: 10, velocidadeProjetil: 28, descricao: "Lança de luz: projétil sagrado que fere o primeiro inimigo." },
      W: { slot: "W", cd: 11, mana: 45, alcance: 0, dano: 0, danoPorNivel: 0, cura: 58, curaPorNivel: 14, descricao: "Bênção: restaura a tua vida instantaneamente." },
      E: { slot: "E", cd: 12, mana: 35, alcance: 0, dano: 0, danoPorNivel: 0, durLentidao: 3, descricao: "Haste sagrada: +45 % de velocidade durante 3 s." },
      R: { slot: "R", cd: 60, mana: 85, alcance: 0, dano: 0, danoPorNivel: 0, cura: 105, curaPorNivel: 22, area: 9, descricao: "Aura restauradora: cura tu e os aliados à tua volta." },
    },
    historia: "Sacerdotisa do rio sagrado, traz a cura das águas para a arena.",
  },
};

export const IDs_CAMPEOES: CampeaoId[] = ["kaimu", "lyra", "vex", "nara"];

/** Única porta de entrada de ids de campeão vindos de fora (padrão jogoValido v60). */
export function campeaoValido(bruto: unknown): CampeaoId | null {
  if (typeof bruto !== "string") return null;
  return (IDs_CAMPEOES as string[]).includes(bruto) ? (bruto as CampeaoId) : null;
}

// ── Itens (loja na fonte da base, padrão LoL/hordes.io) ────────
export interface DefItem {
  id: string; nome: string; custo: number; max: number;
  ataque: number; poder: number; vida: number; mana: number;
  velocidade: number; regenHP: number; regenMP: number;
}
export const ITENS: Record<string, DefItem> = {
  lamina: { id: "lamina", nome: "Lâmina Feroz", custo: 1100, max: 3, ataque: 14, poder: 0, vida: 0, mana: 0, velocidade: 0, regenHP: 0, regenMP: 0 },
  cajado: { id: "cajado", nome: "Cajado Arcano", custo: 1100, max: 3, ataque: 0, poder: 16, vida: 0, mana: 0, velocidade: 0, regenHP: 0, regenMP: 0 },
  couraca: { id: "couraca", nome: "Couraça do Colosso", custo: 1000, max: 3, ataque: 0, poder: 0, vida: 190, mana: 0, velocidade: 0, regenHP: 0, regenMP: 0 },
  botas: { id: "botas", nome: "Botas da Celeridade", custo: 700, max: 3, ataque: 0, poder: 0, vida: 0, mana: 0, velocidade: 0.9, regenHP: 0, regenMP: 0 },
  anel: { id: "anel", nome: "Anel de Mana", custo: 800, max: 3, ataque: 0, poder: 0, vida: 0, mana: 230, velocidade: 0, regenHP: 0, regenMP: 1.6 },
  talisma: { id: "talisma", nome: "Talismã Vital", custo: 800, max: 3, ataque: 0, poder: 0, vida: 0, mana: 0, velocidade: 0, regenHP: 3, regenMP: 0 },
};
export const IDS_ITENS = Object.keys(ITENS);

/** Custo com escalonamento: 2ª compra ×1,4 (arredondado a 25). */
export function custoItem(id: string, jaComprados: number): number {
  const def = ITENS[id];
  if (!def) return 0;
  const fator = Math.pow(1.4, Math.max(0, jaComprados));
  return Math.round((def.custo * fator) / 25) * 25;
}

export function compraValida(id: string, jaComprados: number, essencia: number): { ok: boolean; custo: number; motivo: "" | "item" | "max" | "essencia" } {
  if (!ITENS[id]) return { ok: false, custo: 0, motivo: "item" };
  if (jaComprados >= ITENS[id].max) return { ok: false, custo: custoItem(id, jaComprados), motivo: "max" };
  const custo = custoItem(id, jaComprados);
  if (essencia < custo) return { ok: false, custo, motivo: "essencia" };
  return { ok: true, custo, motivo: "" };
}

// ── Estatísticas derivadas (nível + itens) ─────────────────────
export interface StatsCampeao {
  hpMax: number; mpMax: number; velocidade: number;
  ataque: number; alcanceAtaque: number; ataquePS: number;
  armadura: number; poder: number; regenHP: number; regenMP: number;
}

export function statsDe(id: CampeaoId, nivel: number, itens: Record<string, number>): StatsCampeao {
  const c = CAMPEOES[id];
  const n = Math.max(1, Math.min(NIVEL_MAX, Math.floor(nivel)));
  const s: StatsCampeao = {
    hpMax: c.hp + c.hpPorNivel * (n - 1),
    mpMax: c.mp + c.mpPorNivel * (n - 1),
    velocidade: c.velocidade,
    ataque: Math.round((60 + 6 * (n - 1)) * (c.papel === "atirador" ? 1.08 : 1)),
    alcanceAtaque: c.alcanceAtaque,
    ataquePS: c.ataquePS,
    armadura: c.armadura + 2 * (n - 1),
    poder: c.poder + 4 * (n - 1),
    regenHP: c.regenHP,
    regenMP: c.regenMP,
  };
  for (const it of Object.keys(itens)) {
    const q = Math.min(3, Math.max(0, Math.floor(itens[it] ?? 0)));
    const def = ITENS[it];
    if (!def) continue;
    s.ataque += def.ataque * q;
    s.poder += def.poder * q;
    s.hpMax += def.vida * q;
    s.mpMax += def.mana * q;
    s.velocidade += def.velocidade * q;
    s.regenHP += def.regenHP * q;
    s.regenMP += def.regenMP * q;
  }
  return s;
}

/** Dano de uma habilidade ao nível `nivel` (antes da armadura). */
export function danoHabilidade(h: DefHabilidade, nivel: number, poder: number): number {
  return Math.round((h.dano + h.danoPorNivel * (nivel - 1)) * (1 + poder / 100));
}
/** Cura/escudo de uma habilidade ao nível `nivel`. */
export function curaHabilidade(h: DefHabilidade, nivel: number, poder: number): number {
  return Math.round(((h.cura ?? 0) + (h.curaPorNivel ?? 0) * (nivel - 1)) * (1 + poder / 100));
}

// ── Progressão ─────────────────────────────────────────────────
/** XP necessário para subir de `nivel` para `nivel+1`. */
export function xpParaSubir(nivel: number): number {
  return 90 + (nivel - 1) * 48;
}
/** Recomputa nível/xp a partir do xp acumulado. */
export function nivelDeXp(xpAcumulado: number): { nivel: number; xpNoNivel: number; subiu: number } {
  let nivel = 1, resto = Math.max(0, Math.floor(xpAcumulado)), subiu = 0;
  while (nivel < NIVEL_MAX && resto >= xpParaSubir(nivel)) { resto -= xpParaSubir(nivel); nivel++; subiu++; }
  return { nivel, xpNoNivel: resto, subiu };
}
/** XP acumulado ATÉ ENTRAR no nível `n` (inverso exato de nivelDeXp) — o servidor
 *  envia nível+xpNoNivel e o cliente reconstrói o xpTotal sem divergir. */
export function xpTotalAteNivel(n: number): number {
  const k = Math.max(1, Math.min(NIVEL_MAX, Math.floor(n))) - 1;
  return 90 * k + 24 * k * (k - 1);
}

// ── Mobs ───────────────────────────────────────────────────────
export type TipoMob = "lobo" | "raptor" | "golem" | "espectro" | "raposa" | "dragao" | "barao";

export interface DefMob {
  tipo: TipoMob;
  hp: number; ad: number; ataquePS: number; alcance: number; velocidade: number;
  xp: number; essencia: number; aggro: number; leash: number; armadura: number;
  chefe?: boolean; projetil?: boolean;
}

export const MOBS: Record<TipoMob, DefMob> = {
  lobo:     { tipo: "lobo",     hp: 230,  ad: 18, ataquePS: 0.8, alcance: 1.8, velocidade: 6.6, xp: 40,  essencia: 14,  aggro: 8,   leash: 19, armadura: 5 },
  raptor:   { tipo: "raptor",   hp: 165,  ad: 14, ataquePS: 1.2, alcance: 1.6, velocidade: 7.4, xp: 32,  essencia: 11,  aggro: 7,   leash: 16, armadura: 0 },
  golem:    { tipo: "golem",    hp: 540,  ad: 32, ataquePS: 0.5, alcance: 2.0, velocidade: 4.9, xp: 68,  essencia: 24,  aggro: 7,   leash: 18, armadura: 32 },
  espectro: { tipo: "espectro", hp: 250,  ad: 23, ataquePS: 0.7, alcance: 8,   velocidade: 5.8, xp: 48,  essencia: 17,  aggro: 9,   leash: 20, armadura: 8, projetil: true },
  raposa:   { tipo: "raposa",   hp: 195,  ad: 16, ataquePS: 1.0, alcance: 1.7, velocidade: 8.4, xp: 36,  essencia: 13,  aggro: 8.5, leash: 20, armadura: 3 },
  dragao:   { tipo: "dragao",   hp: 2600, ad: 58, ataquePS: 0.7, alcance: 3.4, velocidade: 5.6, xp: 340, essencia: 130, aggro: 10,  leash: 26, armadura: 30, chefe: true },
  barao:    { tipo: "barao",    hp: 6400, ad: 84, ataquePS: 0.6, alcance: 4.2, velocidade: 4.6, xp: 820, essencia: 320, aggro: 11,  leash: 30, armadura: 40, chefe: true },
};

// ── Mapa: camps (espelhados no cliente E servidor — uma só fonte) ──
export interface DefCamp { id: string; tipo: TipoMob; n: number; x: number; z: number; respawn: number; nome: string }
export const CAMPS: DefCamp[] = [
  { id: "lobos-norte",   tipo: "lobo",     n: 3, x: -48, z: -22, respawn: 26,  nome: "Moita dos Lobos" },
  { id: "raptors-oeste", tipo: "raptor",   n: 4, x: -24, z: 46,  respawn: 24,  nome: "Ninho dos Raptors" },
  { id: "golems-leste",  tipo: "golem",    n: 2, x: 46,  z: 24,  respawn: 34,  nome: "Canteiro dos Golems" },
  { id: "espectros-sul", tipo: "espectro", n: 2, x: 24,  z: -48, respawn: 30,  nome: "Neblina dos Espectros" },
  { id: "rapozas-rio",   tipo: "raposa",   n: 3, x: 50,  z: 52,  respawn: 26,  nome: "Toca das Rapozas" },
  { id: "espectros-rio", tipo: "espectro", n: 2, x: -52, z: 52,  respawn: 30,  nome: "Fonte Amaldiçoada" },
  { id: "golems-norte",  tipo: "golem",    n: 2, x: 22,  z: -50, respawn: 34,  nome: "Pédregal Antigo" },
  { id: "dragao",        tipo: "dragao",   n: 1, x: 62,  z: -62, respawn: 150, nome: "Poço do Dragão" },
  { id: "barao",         tipo: "barao",    n: 1, x: -62, z: -62, respawn: 210, nome: "Covil do Barão" },
];

/** Total de mobs gerados no arranque do mundo. */
export function totalMobs(): number {
  return CAMPS.reduce((t, c) => t + c.n, 0);
}

// ── Fórmulas de combate ────────────────────────────────────────
/** Redução por armadura (fórmula LoL): dmg × 100/(100+armadura). */
export function reduzArmadura(dano: number, armadura: number): number {
  return dano * (100 / (100 + Math.max(0, armadura)));
}

/** Orçamento anti-abuso: dano máximo PLAUSÍVEL por segundo de um herói
 *  (ataques básicos + melhor habilidade) — o servidor recusa claims acima
 *  disto acumulados numa janela deslizante (honestidade anti-cheat). */
export function dpsTeto(id: CampeaoId, nivel: number, itens: Record<string, number>): number {
  const s = statsDe(id, nivel, itens);
  const c = CAMPEOES[id];
  let melhor = 0;
  for (const slot of ["Q", "W", "E", "R"] as SlotHabilidade[]) {
    const d = danoHabilidade(c.habilidades[slot], nivel, s.poder) / Math.max(1, c.habilidades[slot].cd);
    if (d > melhor) melhor = d;
  }
  return Math.ceil(s.ataque * s.ataquePS + melhor) * 3 + 30; // ×3 de folga honesta
}

// ── Movimento (predição no cliente, validação no servidor) ─────
export const VEL_DASH_FATOR = 3.2;
/** Orçamento de deslocamento horizontal num intervalo `dt` s. */
export function orcamentoMovimento(id: CampeaoId, nivel: number, itens: Record<string, number>, dt: number): number {
  const s = statsDe(id, nivel, itens);
  return s.velocidade * dt * 1.45 + VEL_DASH_FATOR * s.velocidade * 0.1; // folga de rede
}

export function dentroMundo(x: number, z: number, margem = 2): boolean {
  return x >= -METADE_MUNDO + margem && x <= METADE_MUNDO - margem && z >= -METADE_MUNDO + margem && z <= METADE_MUNDO - margem;
}

/** Recolhe uma posição ao mundo (clamp honesto — o servidor devolve `corrigido`). */
export function recolherPos(x: number, z: number): Pos {
  return {
    x: Math.max(-METADE_MUNDO + 2, Math.min(METADE_MUNDO - 2, x)),
    z: Math.max(-METADE_MUNDO + 2, Math.min(METADE_MUNDO - 2, z)),
  };
}

/** Spawn de renascimento: junto à fonte da base, com pequena dispersão determinística. */
export function posReviver(indice = 0): Pos {
  const ang = (indice % 8) * (Math.PI / 4);
  return { x: POS_BASE.x + Math.cos(ang) * RAIO_REVIVER, z: POS_BASE.z + Math.sin(ang) * RAIO_REVIVER };
}

// ── Sanitização / validação (a MESMA no cliente e no servidor) ──
export function limpaNome(bruto: unknown): string {
  if (typeof bruto !== "string") return "";
  return bruto.replace(/[\u0000-\u001f\u007f<>"]/g, "").trim().slice(0, 16);
}
export function limpaFala(bruto: unknown): string {
  if (typeof bruto !== "string") return "";
  return bruto.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120);
}
export function nomeSeguro(bruto: unknown): string {
  const n = limpaNome(bruto);
  return n.length >= 2 ? n : `Herói-${100 + Math.floor(Math.random() * 900)}`;
}

export interface OlaJogador { nome: string; campeao: CampeaoId; nivel: number }
export function validaOla(m: unknown): OlaJogador | null {
  if (typeof m !== "object" || m === null) return null;
  const o = m as Record<string, unknown>;
  const campeao = campeaoValido(o.campeao);
  if (!campeao) return null;
  const nivel = typeof o.nivel === "number" && Number.isFinite(o.nivel)
    ? Math.max(1, Math.min(NIVEL_MAX, Math.floor(o.nivel))) : 1;
  return { nome: nomeSeguro(o.nome), campeao, nivel };
}

export interface GolpeClaim { id: number; dano: number; x: number; z: number }
export function validaGolpe(m: unknown): GolpeClaim | null {
  if (typeof m !== "object" || m === null) return null;
  const o = m as Record<string, unknown>;
  const id = typeof o.id === "number" && Number.isInteger(o.id) && o.id >= 0 ? o.id : -1;
  const dano = typeof o.dano === "number" && Number.isFinite(o.dano) ? Math.max(0, Math.min(99999, o.dano)) : -1;
  const x = typeof o.x === "number" && Number.isFinite(o.x) ? o.x : NaN;
  const z = typeof o.z === "number" && Number.isFinite(o.z) ? o.z : NaN;
  if (id < 0 || dano <= 0 || !Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { id, dano, x, z };
}

// ── PvP (v64): todos contra todos FORA da fonte — dano autoritativo ──
// O cliente SÓ declara «feri o herói Y com a habilidade X» (alvoId+slot);
// o VALOR do dano é computado pelo servidor a partir das MESMAS definições
// (statsDe/danoHabilidade/reduzArmadura) — um campo `dano` no pacote é
// IGNORADO. Nada de HP reportado pelo cliente em PvP.
export type SlotOuBasico = SlotHabilidade | "";   // "" = ataque básico

export const RAIO_ZONA_SEGURA = RAIO_FONTE + 2;   // fonte + plataforma (regra LoL)
export const TOL_REDE_S = 0.4;                    // tolerância de rede nos gates de cadência (s)
export const JANELA_CAST_MS = 2500;               // claim com hab é válido ≤2,5 s após o cast
export const ESSENCIA_ABATE_BASE = 55;
export const ESSENCIA_ABATE_POR_NIVEL = 9;
export const XP_ABATE_BASE = 45;
export const XP_ABATE_POR_NIVEL = 8;

export interface GolpePvpClaim { alvoId: number; hab: SlotOuBasico }
export function validaGolpePvp(m: unknown): GolpePvpClaim | null {
  if (typeof m !== "object" || m === null) return null;
  const o = m as Record<string, unknown>;
  const alvoId = typeof o.alvoId === "number" && Number.isInteger(o.alvoId) && o.alvoId >= 0 ? o.alvoId : -1;
  const habBruto = o.hab;
  let hab: SlotOuBasico | null = null;
  if (habBruto === "" || habBruto === undefined || habBruto === null) hab = "";
  else if (habBruto === "Q" || habBruto === "W" || habBruto === "E" || habBruto === "R") hab = habBruto;
  if (alvoId < 0 || hab === null) return null;
  return { alvoId, hab };
}

export interface CastClaim { slot: SlotHabilidade }
export function validaCast(m: unknown): CastClaim | null {
  if (typeof m !== "object" || m === null) return null;
  const o = m as Record<string, unknown>;
  if (o.slot !== "Q" && o.slot !== "W" && o.slot !== "E" && o.slot !== "R") return null;
  return { slot: o.slot };
}

/** Dano do ATAQUE BÁSICO — computado pelo servidor (nunca aceite do cliente). */
export function danoAtaqueBasico(id: CampeaoId, nivel: number, itens: Record<string, number>): number {
  return Math.round(statsDe(id, nivel, itens).ataque);
}

/** Recompensa por ABATE de herói (escala com o nível da VÍTIMA — padrão LoL). */
export function recursosAbate(nivelVitima: number): { essencia: number; xp: number } {
  const n = Math.max(1, Math.min(NIVEL_MAX, Math.floor(nivelVitima)));
  return {
    essencia: ESSENCIA_ABATE_BASE + ESSENCIA_ABATE_POR_NIVEL * (n - 1),
    xp: XP_ABATE_BASE + XP_ABATE_POR_NIVEL * (n - 1),
  };
}

/** A fonte é ZONA SEGURA: nem atacar de dentro, nem atacar quem está dentro. */
export function zonaSegura(x: number, z: number): boolean {
  return dist(x, z, POS_BASE.x, POS_BASE.z) <= RAIO_ZONA_SEGURA;
}

/** Gate de cadência com tolerância de rede — a MESMA regra no cliente e no servidor. */
export function cadenciaPermitida(ultimoMs: number, agoraMs: number, intervaloS: number): boolean {
  return agoraMs - ultimoMs >= intervaloS * 1000 - TOL_REDE_S * 1000;
}

// ── Fala com rate-limit compartilhado ──────────────────────────
export const FALA_INTERVALO_MS = 1200;
export function falaPermitida(ultimoMs: number, agoraMs: number): boolean {
  return agoraMs - ultimoMs >= FALA_INTERVALO_MS;
}

// ── Presença: estado de um herói no protocolo ──────────────────
export type AnimHeroi = "parado" | "andar" | "atacar" | "morte";
export interface EstadoHeroi {
  id: number; nome: string; campeao: CampeaoId; nivel: number;
  x: number; z: number; ry: number; anim: AnimHeroi;
  hp: number; hpMax: number; morto: boolean;
  abates: number; essencia: number;
}
export type AnimMob = "parado" | "andar" | "atacar";
export interface MobEstado {
  id: number; tipo: TipoMob; x: number; z: number; ry: number;
  hp: number; hpMax: number; anim: AnimMob;
}

// ── Utilitários ────────────────────────────────────────────────
export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}
export function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.sqrt(dist2(ax, az, bx, bz));
}

/** Filtro de interesse: só o que está a < raio viaja na snapshot. */
export function interessam<T extends { x: number; z: number }>(ax: number, az: number, lista: T[], raio = RAIO_INTERESSE): T[] {
  const r2 = raio * raio;
  return lista.filter((e) => dist2(ax, az, e.x, e.z) <= r2);
}
