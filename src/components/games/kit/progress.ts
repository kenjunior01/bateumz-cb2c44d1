// ═══════════════════════════════════════════════════════════════
//  BATEU PRO KIT — Progressão universal de TODOS os jogos:
//  · Missões diárias por jogo (padrão MPL/WinZO)
//  · XP do herói + créditos + sequência (streak) de dias
//  · Recorde por jogo (best score) guardado no aparelho
//  Tudo offline-first (localStorage) e sincronizável depois.
// ═══════════════════════════════════════════════════════════════

const KEY = "bateu:kit-progress-v1";

export interface GameMission {
  id: string;
  desc: string;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
  rewardXp: number;
  rewardCredit: number;
}

export interface GameMeta {
  best: number;
  plays: number;
  totalScore: number;
  lastPlayed: number;
}

export interface DayKey { day: string }

export interface Progress {
  games: Record<string, GameMeta>;
  day: string;                              // "2026-10-17"
  missions: Record<string, GameMission[]>;  // gameId → missões do dia
  streak: number;
  lastStreakDay: string;
  xp: number;
  credit: number;
}

export interface ScoreResult {
  isRecord: boolean;
  best: number;
  xpGain: number;
  creditGain: number;
  missionsCompleted: GameMission[];
  levelUp: boolean;
  newLevel: number;
}

const DAY_MS = 86400000;
const todayKey = () => new Date().toISOString().slice(0, 10);

/** XP exigida por nível — progressão difícil (padrão decidido pelo dono). */
export function xpForLevel(level: number): number {
  return Math.round(120 * Math.pow(level, 1.55));
}

export function levelFromXp(xp: number): { level: number; cur: number; need: number } {
  let level = 1, acc = 0;
  while (acc + xpForLevel(level) <= xp && level < 999) { acc += xpForLevel(level); level++; }
  return { level, cur: xp - acc, need: xpForLevel(level) };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p.day !== todayKey()) p.missions = {};       // novas missões a cada dia
      p.day = todayKey();
      return p;
    }
  } catch {}
  return { games: {}, day: todayKey(), missions: {}, streak: 0, lastStreakDay: "", xp: 0, credit: 0 };
}

function save(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

function buildMissions(gameName: string): GameMission[] {
  const scoreTarget = 500 + Math.floor(Math.random() * 4) * 100;
  return [
    { id: "play1", desc: `Joga ${gameName} 1 vez`, target: 1, progress: 0, done: false, claimed: false, rewardXp: 10, rewardCredit: 2 },
    { id: "play3", desc: `Joga ${gameName} 3 vezes hoje`, target: 3, progress: 0, done: false, claimed: false, rewardXp: 20, rewardCredit: 5 },
    { id: "score", desc: `Atinge ${scoreTarget} pontos numa partida`, target: scoreTarget, progress: 0, done: false, claimed: false, rewardXp: 35, rewardCredit: 8 },
  ];
}

/** Missões do dia para um jogo (3 por jogo/dia, estilo arcade pass). */
export function getMissions(gameId: string, gameName: string): GameMission[] {
  const p = load();
  const list = p.missions[gameId];
  if (list && list.length) return list;
  const built = buildMissions(gameName);
  p.missions[gameId] = built;
  save(p);
  return built;
}

export interface ClaimableMission { mission: GameMission; gameId: string }

/** Registra o fim de uma partida. Devolve tudo o que o jogador ganhou. */
export function recordGameResult(gameId: string, gameName: string, score: number): { result: ScoreResult; claimables: ClaimableMission[] } {
  const p = load();

  // streak de dias
  const t = todayKey();
  if (p.lastStreakDay !== t) {
    const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
    p.streak = p.lastStreakDay === yesterday ? p.streak + 1 : 1;
    p.lastStreakDay = t;
  }

  const meta = p.games[gameId] || { best: 0, plays: 0, totalScore: 0, lastPlayed: 0 };
  const isRecord = score > meta.best;
  meta.best = Math.max(meta.best, score);
  meta.plays += 1;
  meta.totalScore += score;
  meta.lastPlayed = Date.now();
  p.games[gameId] = meta;

  // recompensa base por partida (difícil de amontoar — decidido pelo dono)
  const xpGain = 4 + Math.min(16, Math.floor(score / 150));
  const creditGain = score >= 200 ? 1 : 0; // crédito é RARO de propósito
  p.xp += xpGain;
  p.credit += creditGain;

  const beforeLevel = levelFromXp(p.xp - xpGain).level;
  const afterLevel = levelFromXp(p.xp).level;

  // missões — SEMPRE no mesmo objecto `p` (um único load → mutações não se perdem)
  let missions = p.missions[gameId];
  if (!missions || missions.length === 0) {
    missions = buildMissions(gameName);
    p.missions[gameId] = missions;
  }
  const claimables: ClaimableMission[] = [];
  for (const m of missions) {
    if (m.claimed) continue;
    if (m.id === "score" && score >= m.target) m.progress = m.target;
    if (m.id === "play1") m.progress = 1;
    if (m.id === "play3") m.progress = Math.min(m.target, m.progress + 1);
    if (m.progress >= m.target && !m.done) {
      m.done = true;
      claimables.push({ mission: m, gameId });
    }
  }

  save(p);
  return {
    result: {
      isRecord, best: meta.best, xpGain, creditGain,
      missionsCompleted: claimables.map(c => c.mission),
      levelUp: afterLevel > beforeLevel,
      newLevel: afterLevel,
    },
    claimables,
  };

}

/** Reclama uma missão concluída → créditos/XP diretos. */
export function claimMission(gameId: string, missionId: string): { xp: number; credit: number } | null {
  const p = load();
  const list = p.missions[gameId];
  const m = list?.find(x => x.id === missionId);
  if (!m || !m.done || m.claimed) return null;
  m.claimed = true;
  p.xp += m.rewardXp;
  p.credit += m.rewardCredit;
  save(p);
  return { xp: m.rewardXp, credit: m.rewardCredit };
}

export function getProgress(): Progress {
  return load();
}

export function getGameMeta(gameId: string): GameMeta {
  return load().games[gameId] || { best: 0, plays: 0, totalScore: 0, lastPlayed: 0 };
}

/** Salvamento versionado de estado de jogo (posição, inventário, etc.). */
export function saveState<T>(slot: string, state: T) {
  try { localStorage.setItem("bateu:save:" + slot, JSON.stringify({ v: 1, at: Date.now(), state })); } catch {}
}
export function loadState<T>(slot: string): T | null {
  try {
    const raw = localStorage.getItem("bateu:save:" + slot);
    if (!raw) return null;
    return (JSON.parse(raw) as { v: number; at: number; state: T }).state;
  } catch { return null; }
}
