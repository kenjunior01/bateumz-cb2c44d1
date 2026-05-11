import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Radio, Sparkles } from "lucide-react";
import { LeaderEntry } from "@/components/livegames/LiveLeaderboard";
import { subscribe, readLatest } from "@/lib/liveBus";

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

  useEffect(() => {
    // Hydrate live code from bus if not in URL
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
          // Auto-dismiss after 6s
          window.setTimeout(() => setWinner(null), 6000);
          break;
        }
        case "liveCode":
          if (!codeFromUrl) setCode(evt.payload as string);
          break;
      }
    });
    return unsub;
  }, [codeFromUrl]);

  const top = [...entries].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div className="min-h-screen bg-transparent text-white p-6 font-display">
      <style>{`html,body,#root{background:transparent !important;}`}</style>

      <div className="absolute top-6 left-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur text-white text-xs font-bold shadow-lg">
        <Radio className="h-3.5 w-3.5 animate-pulse" /> LIVE · {code}
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
