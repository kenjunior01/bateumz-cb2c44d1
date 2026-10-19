// ═══════════════════════════════════════════════════════════════
//  BATEU PRO KIT — Barra de Missões Diárias por jogo activo.
//  Usada no LiveHub: aplica progressão universal a TODOS os
//  jogos através de um único ponto (recordScore).
// ═══════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect } from "react";
import { Target, Flame, Gem } from "lucide-react";
import {
  getMissions, getProgress, recordGameResult, claimMission, levelFromXp,
  type GameMission,
} from "./progress";
import { juice } from "./sfx";

export function MissionsBar({ gameId, gameName }: { gameId: string; gameName: string }) {
  const [missions, setMissions] = useState<GameMission[]>(() => getMissions(gameId, gameName));
  const [prog, setProg] = useState(() => getProgress());
  const [flash, setFlash] = useState(0);

  // quando o jogo activo muda → mostra as missões desse jogo
  useEffect(() => {
    setMissions(getMissions(gameId, gameName));
    setProg(getProgress());
  }, [gameId, gameName]);

  /** Chamado pelo hub quando qualquer jogo reporta score. */
  const reportScore = useCallback((score: number) => {
    const { result, claimables } = recordGameResult(gameId, gameName, score);
    if (claimables.length) juice("levelup", [20, 30, 20]);
    else juice("coin", 8);
    setMissions(getMissions(gameId, gameName));
    setProg(getProgress());
    setFlash(Date.now());
    return { result, claimables };
  }, [gameId, gameName]);

  const lvl = levelFromXp(prog.xp);

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-zinc-900/80 to-zinc-950/80 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Target className="h-4 w-4 text-amber-400" />
        <p className="text-xs font-black text-white">Missões de hoje — {gameName}</p>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-300">
          <Flame className="h-3 w-3" /> {prog.streak} dia{prog.streak === 1 ? "" : "s"} seguidos
        </span>
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
          <Gem className="h-3 w-3" /> {prog.credit} 💎 · Nv {lvl.level}
        </span>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-3">
        {missions.map(m => (
          <div key={m.id}
            className={`rounded-lg border px-2.5 py-2 text-[11px] transition-colors ${
              m.claimed ? "border-white/5 bg-white/[.03] text-zinc-500" :
              m.done ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" :
              "border-white/10 bg-white/[.04] text-zinc-300"}`}>
            <p className="font-semibold leading-tight">{m.desc}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">
                {m.claimed ? "✔ reclamada" : m.done ? "pronta!" : `${Math.min(m.progress, m.target)}/${m.target}`}
              </span>
              {m.done && !m.claimed ? (
                <button
                  onClick={() => { claimMission(gameId, m.id); juice("coin", 14); setMissions(getMissions(gameId, gameName)); setProg(getProgress()); }}
                  className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white active:scale-95">
                  +{m.rewardXp}XP +{m.rewardCredit}💎
                </button>
              ) : (
                <span className="text-[10px] font-bold text-amber-400/80">+{m.rewardXp}XP +{m.rewardCredit}💎</span>
              )}
            </div>
            {!m.claimed && (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      {flash > 0 && <span className="sr-only" aria-live="polite">Progresso actualizado</span>}
    </div>
  );
}

/** Espião leve para o hub reportar score sem re-render das missões. */
export function reportUniversalScore(gameId: string, gameName: string, score: number) {
  if (!score) return;
  recordGameResult(gameId, gameName, score);
}

// Hook de testes/integração (mesmo padrão do window.__bw do mundo 3D)
if (typeof window !== "undefined") {
  (window as any).__bateuKit = {
    report: reportUniversalScore,
    claim: claimMission,
    getProgress,
    getMissions,
  };
}
