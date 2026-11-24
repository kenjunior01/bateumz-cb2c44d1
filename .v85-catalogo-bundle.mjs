// src/components/games/kit/progress.ts
var KEY = "bateu:kit-progress-v1";
var todayKey = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.day !== todayKey()) p.missions = {};
      p.day = todayKey();
      return p;
    }
  } catch {
  }
  return { games: {}, day: todayKey(), missions: {}, streak: 0, lastStreakDay: "", xp: 0, credit: 0 };
}
function getProgress() {
  return load();
}

// src/lib/gamesCatalog.ts
function pontosMaxDe(id) {
  return ALL_GAMES.find((g) => g.id === id)?.pontosMax ?? 0;
}
var ALL_GAMES = [
  { id: "kart", label: "BATEU KART: Circuito das Lendas", emoji: "\u{1F3CE}\uFE0F", desc: "Corridas LONGAS estilo Mario Kart: derrapa para o mini-turbo, recolhe cascas e m\xEDsseis, melhora o carro e as armas na garagem \u2014 ONLINE com sala partilhada!", grad: "from-orange-500 via-red-500 to-rose-600", category: "Corridas", players: "Solo \xB7 12 pilotos", icon: "flag", hasBot: false, minutos: 6, pontosMax: 120, dificuldade: "F\xE1cil" },
  { id: "bounce", label: "Bounce", emoji: "\u26BD", desc: "O cl\xE1ssico da bola quicando! Salte plataformas, junte an\xE9is e evite os espinhos \u2014 direto ao n\xEDvel final!", grad: "from-sky-500 to-indigo-600", category: "Arcade", players: "Solo", icon: "circle", hasBot: false, minutos: 3, pontosMax: 60, dificuldade: "M\xE9dia" },
  { id: "spaceshooter", label: "Guerra Espacial", emoji: "\u{1F680}", desc: "Scouts, fighters que atiram, tanques, kamikazes, drones aliados, LASER e chefes \u2014 a guerra avan\xE7ada!", grad: "from-slate-500 to-blue-700", category: "Arcade", players: "1v1 / Bot", icon: "zap", hasBot: false, minutos: 5, pontosMax: 90, dificuldade: "M\xE9dia" },
  { id: "flappybird", label: "Flappy Bird", emoji: "\u{1F426}", desc: "Desvie dos canos! O cl\xE1ssico viciante de qualquer dispositivo!", grad: "from-sky-400 to-green-500", category: "Arcade", players: "Solo / Bot", icon: "gamepad", hasBot: true, minutos: 2, pontosMax: 50, dificuldade: "Dif\xEDcil" },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "\u{1F40D}", desc: "A cobra famosa de sempre \u2014 duas cobras, um tabuleiro, quem cresce mais ganha!", grad: "from-emerald-500 to-teal-600", category: "Arcade", players: "1v1 / Bot", icon: "gamepad", hasBot: true, minutos: 3, pontosMax: 70, dificuldade: "F\xE1cil" },
  { id: "numbertetris", label: "N\xFAmeros Caindo", emoji: "\u{1F522}", desc: "Estilo Tetris 2048 \u2014 n\xFAmeros caem e combinam at\xE9 fazer 2048!", grad: "from-orange-600 to-red-700", category: "Puzzle", players: "Solo", icon: "grid", hasBot: false, minutos: 5, pontosMax: 80, dificuldade: "M\xE9dia" },
  { id: "tetris", label: "Tetris", emoji: "\u{1F9F1}", desc: "O CL\xC1SSICO de sempre: saco de 7, hold, pe\xE7a fantasma, combos e TETRIS com flash \u2014 vicia!", grad: "from-cyan-500 to-violet-600", category: "Puzzle", players: "Solo", icon: "grid", hasBot: false, minutos: 5, pontosMax: 100, dificuldade: "M\xE9dia" },
  { id: "pongvs", label: "Pong VS", emoji: "\u{1F3D3}", desc: "O primeiro cl\xE1ssico da hist\xF3ria \u2014 primeiro a 5 pontos!", grad: "from-blue-600 to-indigo-700", category: "Arcade", players: "1v1 / Bot", icon: "gamepad", hasBot: false, minutos: 3, pontosMax: 60, dificuldade: "F\xE1cil" },
  { id: "tictactoepro", label: "Galo PRO", emoji: "\u2715", desc: "O famoso jogo do galo a n\xEDvel PRO \u2014 9 mini-tabuleiros, estrat\xE9gia avan\xE7ada!", grad: "from-violet-600 to-indigo-700", category: "Estrat\xE9gia", players: "1v1 / Bot", icon: "grid3", hasBot: true, minutos: 4, pontosMax: 70, dificuldade: "M\xE9dia" },
  { id: "connect4", label: "Ligar 4", emoji: "\u{1F534}", desc: "Estrat\xE9gia pura: ligue 4 pe\xE7as em linha para vencer!", grad: "from-blue-500 to-yellow-500", category: "Estrat\xE9gia", players: "1v1 / Bot", icon: "grid", hasBot: true, minutos: 4, pontosMax: 70, dificuldade: "F\xE1cil" },
  { id: "checkers", label: "Damas", emoji: "\u265F\uFE0F", desc: "O cl\xE1ssico mundial das damas com capturas e promo\xE7\xE3o a rei!", grad: "from-amber-700 to-red-800", category: "Estrat\xE9gia", players: "1v1 / Bot", icon: "grid3", hasBot: false, minutos: 8, pontosMax: 100, dificuldade: "Dif\xEDcil" },
  { id: "chess", label: "Xadrez", emoji: "\u265A", desc: "Xadrez completo: roque, en passant, promo\xE7\xE3o e checkmate!", grad: "from-slate-700 to-zinc-900", category: "Estrat\xE9gia", players: "1v1 / Bot", icon: "crown", hasBot: true, minutos: 12, pontosMax: 120, dificuldade: "Dif\xEDcil" },
  { id: "dominoes", label: "Domin\xF3", emoji: "\u{1F3B2}", desc: "O cl\xE1ssico das mesas de Mo\xE7ambique \u2014 encaixe as pe\xE7as e esvazie a m\xE3o!", grad: "from-slate-600 to-zinc-700", category: "Estrat\xE9gia", players: "1v1 / Bot", icon: "grid", hasBot: false, minutos: 8, pontosMax: 90, dificuldade: "M\xE9dia" },
  { id: "snakesladders", label: "Cobras e Escadas", emoji: "\u{1FA9C}", desc: "O cl\xE1ssico mundial! Suba escadas, fuja das cobras e chegue primeiro ao 100!", grad: "from-lime-600 to-emerald-700", category: "Arcade", players: "1v1 / Bot", icon: "sparkles", hasBot: true, minutos: 4, pontosMax: 60, dificuldade: "F\xE1cil" },
  { id: "memory", label: "Jogo da Mem\xF3ria VS", emoji: "\u{1F9E0}", desc: "O cl\xE1ssico dos pares \u2014 quem tem melhor mem\xF3ria?", grad: "from-indigo-500 to-purple-600", category: "Puzzle", players: "1v1 / Bot", icon: "brain", hasBot: false, minutos: 3, pontosMax: 60, dificuldade: "F\xE1cil" },
  { id: "urusse", label: "Urusse", emoji: "\u{1F9F4}", desc: "Mancala mo\xE7ambicano \u2014 semeie, capture e ven\xE7a!", grad: "from-green-700 to-amber-900", category: "Mo\xE7ambicano", players: "1v1 / Bot", icon: "gamepad", hasBot: true, minutos: 7, pontosMax: 90, dificuldade: "M\xE9dia" },
  { id: "mexerica", label: "Mexerica", emoji: "\u270B", desc: "Bate a M\xE3o \u2014 jogo mo\xE7ambicano de reflexos!", grad: "from-amber-600 to-red-700", category: "Mo\xE7ambicano", players: "1v1 / Bot", icon: "zap", hasBot: true, minutos: 2, pontosMax: 50, dificuldade: "F\xE1cil" }
];
var CATEGORIES = [
  { id: "todos", label: "Todos", emoji: "\u{1F3AE}" },
  { id: "Corridas", label: "Corridas", emoji: "\u{1F3CE}\uFE0F" },
  { id: "Arcade", label: "Arcade", emoji: "\u{1F47E}" },
  { id: "Estrat\xE9gia", label: "Estrat\xE9gia", emoji: "\u265F\uFE0F" },
  { id: "Puzzle", label: "Puzzle", emoji: "\u{1F9E9}" },
  { id: "Mo\xE7ambicano", label: "Mo\xE7ambicano", emoji: "\u{1F1F2}\u{1F1FF}" }
];
function categoryCounts() {
  const m = { todos: ALL_GAMES.length };
  ALL_GAMES.forEach((g) => {
    m[g.category] = (m[g.category] || 0) + 1;
  });
  return m;
}
var LIVE_GAME_MODES = 82;
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function weekKey() {
  const d = /* @__PURE__ */ new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 864e5 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${week}`;
}
function popularityScore(gameId) {
  const meta = getProgress().games[gameId];
  const plays = meta?.plays ?? 0;
  const base = 40 + hashSeed(gameId + weekKey()) % 60;
  return base + Math.min(200, plays * 12) + Math.min(40, (meta?.best ?? 0) / 25);
}
function weeklyPopular(n = 6) {
  return [...ALL_GAMES].sort((a, b) => popularityScore(b.id) - popularityScore(a.id)).slice(0, n);
}
function recentGames(n = 8) {
  const p = getProgress().games;
  return ALL_GAMES.filter((g) => p[g.id]?.lastPlayed && (p[g.id]?.plays ?? 0) > 0).sort((a, b) => (p[b.id].lastPlayed || 0) - (p[a.id].lastPlayed || 0)).slice(0, n);
}
function playsOf(gameId) {
  return getProgress().games[gameId]?.plays ?? 0;
}
function bestOf(gameId) {
  return getProgress().games[gameId]?.best ?? 0;
}
function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
export {
  ALL_GAMES,
  CATEGORIES,
  LIVE_GAME_MODES,
  bestOf,
  categoryCounts,
  normalize,
  playsOf,
  pontosMaxDe,
  popularityScore,
  recentGames,
  weeklyPopular
};
