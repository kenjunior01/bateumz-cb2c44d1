// ═══════════════════════════════════════════════════════════════
//  CATÁLOGO DE JOGOS — fonte única de verdade (hub /jogos, busca
//  global ⌘K, rails da homepage e claims honestos de contagem).
//
//  Padrão REA (Reverse Engineer Anything) — comportamento estudado
//  nos líderes do nicho e reconstruído do zero:
//  · CrazyGames/Poki → categorias com contagens + "Populares esta semana"
//  · Steam/Roblox    → "Continuar a jogar" (jogos recentes do jogador)
//  Nada é copiado de código ou assets externos — só o comportamento.
// ═══════════════════════════════════════════════════════════════
import { getProgress } from "@/components/games/kit/progress";

export interface GameDef {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  grad: string;
  category: string;
  players: string;
  icon: any;
  hasBot: boolean;
  regions?: string[];
}

// CATÁLOGO CURADO: apenas os clássicos famosos de qualquer dispositivo + o MMO da plataforma
export const ALL_GAMES: GameDef[] = [
  { id: "mmorpg", label: "BateuCraft: Mundo LEGO", emoji: "⛏️", desc: "Mundo voxel com personagens LEGO: minera, cria ferramentas, constrói, funde ferro, sobrevive à noite aos Zumbis e desvia do Estourador!", grad: "from-emerald-600 via-green-500 to-lime-400", category: "Mundo Aberto", players: "Solo", icon: "globe", hasBot: false },
  { id: "bounce", label: "Bounce", emoji: "⚽", desc: "O clássico da bola quicando! Salte plataformas, junte anéis e evite os espinhos — direto ao nível final!", grad: "from-sky-500 to-indigo-600", category: "Arcade", players: "Solo", icon: "circle", hasBot: false },
  { id: "spaceshooter", label: "Guerra Espacial", emoji: "🚀", desc: "Destrua naves inimigas no espaço — quem faz mais pontos!", grad: "from-slate-500 to-blue-700", category: "Arcade", players: "1v1 / Bot", icon: "zap", hasBot: false },
  { id: "flappybird", label: "Flappy Bird", emoji: "🐦", desc: "Desvie dos canos! O clássico viciante de qualquer dispositivo!", grad: "from-sky-400 to-green-500", category: "Arcade", players: "Solo / Bot", icon: "gamepad", hasBot: true },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "🐍", desc: "A cobra famosa de sempre — duas cobras, um tabuleiro, quem cresce mais ganha!", grad: "from-emerald-500 to-teal-600", category: "Arcade", players: "1v1 / Bot", icon: "gamepad", hasBot: true },
  { id: "numbertetris", label: "Números Caindo", emoji: "🔢", desc: "Estilo Tetris 2048 — números caem e combinam até fazer 2048!", grad: "from-orange-600 to-red-700", category: "Puzzle", players: "Solo", icon: "grid", hasBot: false },
  { id: "pongvs", label: "Pong VS", emoji: "🏓", desc: "O primeiro clássico da história — primeiro a 5 pontos!", grad: "from-blue-600 to-indigo-700", category: "Arcade", players: "1v1 / Bot", icon: "gamepad", hasBot: false },
  { id: "tictactoepro", label: "Galo PRO", emoji: "✕", desc: "O famoso jogo do galo a nível PRO — 9 mini-tabuleiros, estratégia avançada!", grad: "from-violet-600 to-indigo-700", category: "Estratégia", players: "1v1 / Bot", icon: "grid3", hasBot: true },
  { id: "connect4", label: "Ligar 4", emoji: "🔴", desc: "Estratégia pura: ligue 4 peças em linha para vencer!", grad: "from-blue-500 to-yellow-500", category: "Estratégia", players: "1v1 / Bot", icon: "grid", hasBot: true },
  { id: "checkers", label: "Damas", emoji: "♟️", desc: "O clássico mundial das damas com capturas e promoção a rei!", grad: "from-amber-700 to-red-800", category: "Estratégia", players: "1v1 / Bot", icon: "grid3", hasBot: false },
  { id: "chess", label: "Xadrez", emoji: "♚", desc: "Xadrez completo: roque, en passant, promoção e checkmate!", grad: "from-slate-700 to-zinc-900", category: "Estratégia", players: "1v1 / Bot", icon: "crown", hasBot: true },
  { id: "dominoes", label: "Dominó", emoji: "🎲", desc: "O clássico das mesas de Moçambique — encaixe as peças e esvazie a mão!", grad: "from-slate-600 to-zinc-700", category: "Estratégia", players: "1v1 / Bot", icon: "grid", hasBot: false },
  { id: "snakesladders", label: "Cobras e Escadas", emoji: "🪜", desc: "O clássico mundial! Suba escadas, fuja das cobras e chegue primeiro ao 100!", grad: "from-lime-600 to-emerald-700", category: "Arcade", players: "1v1 / Bot", icon: "sparkles", hasBot: true },
  { id: "memory", label: "Jogo da Memória VS", emoji: "🧠", desc: "O clássico dos pares — quem tem melhor memória?", grad: "from-indigo-500 to-purple-600", category: "Puzzle", players: "1v1 / Bot", icon: "brain", hasBot: false },
  { id: "urusse", label: "Urusse", emoji: "🧴", desc: "Mancala moçambicano — semeie, capture e vença!", grad: "from-green-700 to-amber-900", category: "Moçambicano", players: "1v1 / Bot", icon: "gamepad", hasBot: true },
  { id: "mexerica", label: "Mexerica", emoji: "✋", desc: "Bate a Mão — jogo moçambicano de reflexos!", grad: "from-amber-600 to-red-700", category: "Moçambicano", players: "1v1 / Bot", icon: "zap", hasBot: true },
];

export const CATEGORIES = [
  { id: "todos", label: "Todos", emoji: "🎮" },
  { id: "Mundo Aberto", label: "Mundo Aberto", emoji: "🗺️" },
  { id: "Arcade", label: "Arcade", emoji: "👾" },
  { id: "Estratégia", label: "Estratégia", emoji: "♟️" },
  { id: "Puzzle", label: "Puzzle", emoji: "🧩" },
  { id: "Moçambicano", label: "Moçambicano", emoji: "🇲🇿" },
];

/** Contagens reais por categoria (chips honestos — nada inventado). */
export function categoryCounts(): Record<string, number> {
  const m: Record<string, number> = { todos: ALL_GAMES.length };
  ALL_GAMES.forEach((g) => { m[g.category] = (m[g.category] || 0) + 1; });
  return m;
}

/** Modos de jogo ao vivo no hub /lives (para claims honestos). */
export const LIVE_GAME_MODES = 84;

/* ─── Popularidade — base determinística estável por semana + jogadas reais ─── */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

function weekKey(): string {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${week}`;
}

/** Pontuação de popularidade: base 40–99 estável na semana + jogadas do jogador. */
export function popularityScore(gameId: string): number {
  const meta = getProgress().games[gameId];
  const plays = meta?.plays ?? 0;
  const base = 40 + (hashSeed(gameId + weekKey()) % 60);
  return base + Math.min(200, plays * 12) + Math.min(40, (meta?.best ?? 0) / 25);
}

/** "Populares esta semana" (padrão CrazyGames) — top N por popularidade. */
export function weeklyPopular(n = 6): GameDef[] {
  return [...ALL_GAMES].sort((a, b) => popularityScore(b.id) - popularityScore(a.id)).slice(0, n);
}

/** Jogos jogados recentemente pelo utilizador (padrão Steam/Roblox). */
export function recentGames(n = 8): GameDef[] {
  const p = getProgress().games;
  return ALL_GAMES
    .filter((g) => p[g.id]?.lastPlayed && (p[g.id]?.plays ?? 0) > 0)
    .sort((a, b) => (p[b.id].lastPlayed || 0) - (p[a.id].lastPlayed || 0))
    .slice(0, n);
}

/** Nº de vezes que o utilizador jogou um jogo (0 se nunca). */
export function playsOf(gameId: string): number {
  return getProgress().games[gameId]?.plays ?? 0;
}

/** Melhor pontuação do utilizador num jogo (0 se nunca). */
export function bestOf(gameId: string): number {
  return getProgress().games[gameId]?.best ?? 0;
}

/** Procura simples normalizada (sem acentos) para a busca global. */
export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
