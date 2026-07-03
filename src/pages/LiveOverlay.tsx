import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Radio, Sparkles, Clock, Gamepad2 } from "lucide-react";
import { LeaderEntry } from "@/components/livegames/LiveLeaderboard";
import { subscribe, readLatest, RoundState, bindLiveCode } from "@/lib/liveBus";

/**
 * Transparent overlay for OBS / Streamlabs Browser Source.
 * Subscribes to the live bus (BroadcastChannel + storage event fallback).
 * No polling — updates arrive instantly from the host tab.
 */
const LiveOverlay = () => {
  const [params] = useSearchParams();
  const codeFromUrl = params.get("code");
  const [code, setCode] = useState(codeFromUrl || "LIVE");
  const [entries, setEntries] = useState<LeaderEntry[]>(() => readLatest<LeaderEntry[]>("leaderboard") || []);
  const [winner, setWinner] = useState<{ name: string; meta?: string } | null>(null);
  const [round, setRound] = useState<RoundState | null>(() => readLatest<RoundState>("roundState"));
  const [ended, setEnded] = useState(false);

  // Re-hydrate phase from latest liveStarted vs liveEnded events on mount.
  useEffect(() => {
    const started = readLatest<{ code: string; at: number }>("liveStarted");
    const endedEvt = readLatest<{ code: string; at: number }>("liveEnded");
    const startedAt = started?.at || 0;
    const endedAt = endedEvt?.at || 0;
    setEnded(endedAt > startedAt);
  }, []);

  // Local countdown so timeLeft keeps ticking after a reload, derived from the
  // last roundState's timestamp without waiting for a new event.
  useEffect(() => {
    if (!round || round.phase !== "running" || !round.timeLeft) return;
    const baseAt = round.at;
    const baseLeft = round.timeLeft;
    const t = setInterval(() => {
      const left = Math.max(0, baseLeft - Math.floor((Date.now() - baseAt) / 1000));
      setRound((r) => (r ? { ...r, timeLeft: left } : r));
      if (left === 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [round?.at, round?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!codeFromUrl) {
      const c = readLatest<string>("liveCode");
      if (c) setCode(c);
    }

    const unsub = subscribe((evt) => {
      switch (evt.type) {
        case "leaderboard":
          setEntries(evt.payload as LeaderEntry[]);
          break;
        case "winner": {
          const w = evt.payload;
          setWinner({ name: w.name, meta: w.meta });
          window.setTimeout(() => setWinner(null), 6000);
          break;
        }
        case "liveCode":
          if (!codeFromUrl) setCode((evt.payload as string) || "LIVE");
          break;
        case "roundState":
          setRound(evt.payload as RoundState);
          if ((evt.payload as RoundState).phase === "running") setEnded(false);
          break;
        case "liveStarted":
          setEnded(false);
          setEntries([]);
          break;
        case "liveEnded":
          setEnded(true);
          setRound((r) => r ? { ...r, phase: "ended" } : r);
          break;
      }
    });
    return unsub;
  }, [codeFromUrl]);

  const top = [...entries].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div className="min-h-screen bg-transparent text-white p-6 font-display">
      <style>{`html,body,#root{background:transparent !important;}`}</style>

      <div className="absolute top-6 left-6 flex flex-col gap-2 items-start">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur text-white text-xs font-bold shadow-lg ${ended ? "bg-slate-700/90" : "bg-red-500/90"}`}>
          <Radio className={`h-3.5 w-3.5 ${ended ? "" : "animate-pulse"}`} /> {ended ? "ENCERRADA" : "LIVE"} · {code}
        </div>
        {round && !ended && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-white text-[11px] font-medium shadow-lg">
            <Gamepad2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="uppercase tracking-wider">{round.game}</span>
            <span className="opacity-50">·</span>
            <span className={`${round.phase === "running" ? "text-emerald-300" : "text-amber-300"}`}>{round.phase}</span>
            {round.timeLeft > 0 && (
              <>
                <span className="opacity-50">·</span>
                <Clock className="h-3 w-3" />
                <span className="font-mono">{round.timeLeft}s</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="absolute top-6 right-6 w-72 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 overflow-hidden shadow-2xl">
        <div className="px-4 py-2.5 bg-gradient-to-r from-yellow-500/30 to-amber-500/10 border-b border-white/10 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-bold">Top Jogadores</span>
        </div>
        {top.length === 0 ? (
          <p className="text-center text-xs text-white/60 py-6">Aguardando jogadores…</p>
        ) : (
          <ul className="divide-y divide-white/10">
            <AnimatePresence initial={false}>
              {top.map((e, i) => (
                <motion.li key={e.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${i === 0 ? "bg-yellow-400 text-black" : "bg-white/10"}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{e.name}</p>
                    <p className="text-[9px] text-white/60">{e.game}</p>
                  </div>
                  <span className="text-sm font-bold text-yellow-400">{e.score}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-5 rounded-3xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-7 w-7" />
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-70">Vencedor</p>
                <p className="text-2xl font-extrabold">{winner.name}</p>
                {winner.meta && <p className="text-xs font-medium opacity-80">{winner.meta}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveOverlay;
