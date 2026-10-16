// ═══════════════════════════════════════════════════════════════
//  BATEU PRO KIT — Moldura "Pro" para jogos:
//  barra superior com recorde, som, ecrã inteiro e pausa +
//  folha de recompensas pós-partida (XP, créditos, missões, recorde).
//  Mobile-first: alvos de toque ≥ 44px, sem blur pesado.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState, type ReactNode } from "react";
import { Volume2, VolumeX, Maximize, Minimize, Trophy, Zap } from "lucide-react";
import { FxProvider, useFx } from "./fx";
import { isSfxEnabled, setSfxEnabled, unlockAudio, juice } from "./sfx";
import {
  recordGameResult, claimMission, getGameMeta, levelFromXp,
  getProgress, type ClaimableMission, type ScoreResult,
} from "./progress";

export interface ProGameReport {
  gameId: string;
  gameName: string;
  score: number;
  onScore?: (name: string, score: number) => void;
}

function RewardSheet({ result, claimables, gameName, onClose }: {
  result: ScoreResult; claimables: ClaimableMission[]; gameName: string; onClose: () => void;
}) {
  const [claims, setClaims] = useState<ClaimableMission[]>(claimables);
  const prog = getProgress();
  const lvl = levelFromXp(prog.xp);
  return (
    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3" role="dialog" aria-label="Recompensas da partida">
      <div className="w-full max-w-sm rounded-2xl border border-amber-400/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <p className="text-base font-black text-white">Partida concluída — {gameName}</p>
        </div>

        {result.isRecord && (
          <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-300">
            🏆 NOVO RECORDE PESSOAL: {result.best} pts!
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Ganhaste</p>
            <p className="font-black text-emerald-400">+{result.xpGain} XP</p>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Créditos</p>
            <p className="font-black text-amber-300">+{result.creditGain}</p>
          </div>
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Nível {lvl.level}</span>
            <span>{lvl.cur}/{lvl.need} XP</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{ width: `${Math.min(100, (lvl.cur / lvl.need) * 100)}%` }} />
          </div>
          {result.levelUp && (
            <p className="mt-1.5 text-xs font-black text-emerald-400">⬆️ Subiste para o Nível {result.newLevel}!</p>
          )}
        </div>

        {claims.length > 0 && (
          <div className="mb-3 space-y-2">
            <p className="text-xs font-bold text-zinc-300">Missões concluídas:</p>
            {claims.map(({ mission }) => (
              <button key={mission.id}
                onClick={() => {
                  const got = claimMission(claims.find(c => c.mission.id === mission.id)?.gameId ?? "", mission.id);
                  if (got) { juice("coin", 14); }
                  setClaims(prev => prev.filter(c => c.mission.id !== mission.id));
                }}
                className="flex w-full items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left text-xs text-zinc-200 transition-colors hover:bg-emerald-500/20">
                <span>{mission.desc}</span>
                <span className="ml-2 shrink-0 font-black text-emerald-400">+{mission.rewardXp} XP +{mission.rewardCredit} 💎</span>
              </button>
            ))}
          </div>
        )}

        <button onClick={onClose}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-sm font-black text-white shadow-lg transition-transform active:scale-[.98]">
          Continuar a jogar
        </button>
      </div>
    </div>
  );
}

function Toolbar({ gameName, onReport }: { gameName: string; onReport?: (r: ProGameReport) => void }) {
  const [snd, setSnd] = useState(isSfxEnabled());
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  return (
    <div className="flex items-center justify-end gap-1.5 px-2 pt-1.5">
      <span className="mr-auto max-w-[45%] truncate text-[10px] font-bold uppercase tracking-wider text-zinc-500">{gameName}</span>
      <button aria-label="Som" onClick={() => { const v = !snd; setSnd(v); setSfxEnabled(v); if (v) unlockAudio(); }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
        {snd ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      <button aria-label="Ecrã inteiro"
        onClick={async () => {
          const el = document.querySelector(".pro-game-root");
          try {
            if (!document.fullscreenElement) { await el?.requestFullscreen?.(); }
            else await document.exitFullscreen();
          } catch {}
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
        {full ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </button>
    </div>
  );
}

function BestBadge({ gameId }: { gameId: string }) {
  const meta = getGameMeta(gameId);
  if (!meta.best) return null;
  return (
    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400/90">
      <Trophy className="h-3 w-3" /> {meta.best}
    </div>
  );
}

/**
 * Moldura universal: envolve o jogo com FX + barra Pro.
 * Reporta pontuações → progressão + folha de recompensas.
 */
export function ProGameFrame({ gameId, gameName, score, onScore, children }: {
  gameId: string; gameName: string;
  /** último score reportado pelo jogo (muda → mostra recompensas) */
  score?: number;
  onScore?: (name: string, score: number) => void;
  children: ReactNode;
}) {
  const [lastReport, setLastReport] = useState<{ result: ScoreResult; claimables: ClaimableMission[] } | null>(null);
  const meta = getGameMeta(gameId);

  useEffect(() => {
    if (score == null || score <= 0) return;
    const { result, claimables } = recordGameResult(gameId, gameName, score);
    onScore?.(gameName, score);
    setLastReport({ result, claimables });
    juice(result.isRecord ? "win" : "coin", result.isRecord ? [30, 40, 30] : 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <FxProvider>
      <div className="pro-game-root relative mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-zinc-950/60 shadow-xl">
        <div className="flex items-center justify-between px-3 pt-2">
          <BestBadge gameId={gameId} />
          <Toolbar gameName={gameName} onReport={onScore as any} />
        </div>
        <div className="relative flex-1">{children}</div>
        {lastReport && (
          <RewardSheet
            result={lastReport.result}
            claimables={lastReport.claimables}
            gameName={gameName}
            onClose={() => setLastReport(null)}
          />
        )}
      </div>
    </FxProvider>
  );
}

/** Liga um jogo legado ao progresso universal sem moldura (usar quando o jogo já tem UI própria). */
export function useScoreReporter(gameId: string, gameName: string) {
  return (score: number) => {
    if (score <= 0) return null;
    return recordGameResult(gameId, gameName, score);
  };
}

export { Zap };
