import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Radio, Sparkles, Clock, Gamepad2, Zap } from "lucide-react";
import { LeaderEntry } from "@/components/livegames/LiveLeaderboard";
import { subscribe, readLatest, RoundState, bindLiveCode } from "@/lib/liveBus";

const LiveOverlay = () => {
  const [params] = useSearchParams();
  const codeFromUrl = params.get("code");
  const [code, setCode] = useState(codeFromUrl || "LIVE");
  const [entries, setEntries] = useState<LeaderEntry[]>(() => readLatest<LeaderEntry[]>("leaderboard") || []);
  const [winner, setWinner] = useState<{ name: string; meta?: string } | null>(null);
  const [round, setRound] = useState<RoundState | null>(() => readLatest<RoundState>("roundState"));
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const started = readLatest<{ code: string; at: number }>("liveStarted");
    const endedEvt = readLatest<{ code: string; at: number }>("liveEnded");
    const startedAt = started?.at || 0;
    const endedAt = endedEvt?.at || 0;
    setEnded(endedAt > startedAt);
  }, []);

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
  }, [round?.at, round?.phase]);

  useEffect(() => {
    if (codeFromUrl) {
      bindLiveCode(codeFromUrl);
    } else {
      const c = readLatest<string>("liveCode");
      if (c) { setCode(c); bindLiveCode(c); }
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
  const isLow = top.length <= 0;

  return (
    <div className="min-h-screen bg-transparent text-white p-6 font-display">
      <style>{`html,body,#root{background:transparent !important;}`}</style>

      <div className="absolute top-5 left-5 flex flex-col gap-2 items-start">
        <div className={`ov-badge ${ended ? "ov-badge-ended" : "ov-badge-live"}`}>
          <Radio className={`h-3.5 w-3.5 ${ended ? "" : "ov-pulse-dot"}`} /> 
          {ended ? "ENCERRADA" : "LIVE"}
          <span className="ov-code">{code}</span>
        </div>
        {round && !ended && (
          <div className="ov-game-pill">
            <Gamepad2 className="h-3.5 w-3.5" style={{ color: "#34d399" }} />
            <span className="ov-game-name">{round.game}</span>
            <span className="ov-separator" />
            <span className={`ov-phase ${round.phase === "running" ? "ov-phase-run" : "ov-phase-wait"}`}>
              {round.phase}
            </span>
            {round.timeLeft > 0 && (
              <>
                <span className="ov-separator" />
                <Clock className="h-3 w-3" style={{ color: "#94a3b8" }} />
                <span className="ov-timer">{round.timeLeft}s</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="absolute top-5 right-5 w-72 rounded-2xl ov-leaderboard overflow-hidden">
        <div className="ov-lb-header">
          <Trophy className="h-4 w-4" style={{ color: "#fbbf24" }} />
          <span className="ov-lb-title">Top Jogadores</span>
          <span className="ov-lb-count">{top.length}</span>
        </div>
        {isLow ? (
          <div className="ov-lb-empty">
            <motion.div
              animate={{ y: [0, -6, 0], opacity: [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Gamepad2 className="h-8 w-8" style={{ color: "rgba(255,255,255,0.15)" }} />
            </motion.div>
            <p className="ov-lb-empty-text">Aguardando jogadores...</p>
          </div>
        ) : (
          <ul className="ov-lb-list">
            <AnimatePresence initial={false}>
              {top.map((e, i) => {
                const rankColors = ["#fbbf24", "#d1d5db", "#d97706", "#94a3b8", "#94a3b8"];
                const rankBg = i < 3 ? `${rankColors[i]}18` : "rgba(255,255,255,0.04)";
                return (
                  <motion.li
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    className="ov-lb-item"
                    style={{ backgroundColor: rankBg, borderLeftColor: rankColors[i] }}
                  >
                    <span
                      className="ov-lb-rank"
                      style={{
                        backgroundColor: i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#d97706" : "rgba(255,255,255,0.1)",
                        color: i < 3 ? "#000" : "#fff",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="ov-lb-info">
                      <p className="ov-lb-name">{e.name}</p>
                      <p className="ov-lb-game">{e.game}</p>
                    </div>
                    <span className="ov-lb-score" style={{ color: i === 0 ? "#fbbf24" : "#e5e5e5" }}>
                      {e.score}
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{ type: "spring", stiffness: 250, damping: 20 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <div className="ov-winner-card">
              <div className="ov-winner-glow" />
              <div className="ov-winner-content">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Sparkles className="h-6 w-6" style={{ color: "#fbbf24" }} />
                </motion.div>
                <div>
                  <p className="ov-winner-label">Vencedor</p>
                  <p className="ov-winner-name">{winner.name}</p>
                  {winner.meta && <p className="ov-winner-meta">{winner.meta}</p>}
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <Trophy className="h-7 w-7" style={{ color: "#fbbf24" }} />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveOverlay;
