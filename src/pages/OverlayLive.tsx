import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { fetchScheduledLiveById, fetchScheduledLiveRanking, type ScheduledLive } from "@/lib/scheduledLives";
import { listAnnouncements, type LiveAnnouncement } from "@/lib/liveStudio";
import { subscribe, readLatest, bindLiveCode, type RoundState } from "@/lib/liveBus";
import { Trophy, Radio, Clock, Users, Gift, Gamepad2, Zap, ArrowUp, ArrowDown, Minus } from "lucide-react";

const useCountdown = (target?: string | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) };
};

interface LeaderEntry {
  id: string;
  name: string;
  score: number;
  game: string;
  at: number;
}

const OverlayLive = () => {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const view = (params.get("view") || "ranking") as "ranking" | "prizes" | "countdown" | "announcement" | "game";
  const [live, setLive] = useState<ScheduledLive | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [last, setLast] = useState<LiveAnnouncement | null>(null);
  const cd = useCountdown(live?.scheduled_at);

  const [gameEntries, setGameEntries] = useState<LeaderEntry[]>([]);
  const [round, setRound] = useState<RoundState | null>(null);
  const [winner, setWinner] = useState<{ name: string; meta?: string } | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const sl = await fetchScheduledLiveById(id);
      if (!active) return;
      setLive(sl);
      if (!sl) return;
      const [r, p, an] = await Promise.all([
        fetchScheduledLiveRanking(sl.id, { limit: 5 }),
        supabase.from("live_ambassador_prizes_public").select("*").eq("scheduled_live_id", sl.id).order("position"),
        listAnnouncements(sl.id, 1),
      ]);
      setRanking(r); setPrizes((p.data as any[]) || []); setLast(an[0] || null);

      if (sl.live_code) {
        bindLiveCode(sl.live_code);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { active = false; clearInterval(t); };
  }, [id]);

  useEffect(() => {
    if (!live?.live_code) {
      const c = readLatest<string>("liveCode");
      if (c) bindLiveCode(c);
    }
    const unsub = subscribe((evt) => {
      switch (evt.type) {
        case "leaderboard":
          setGameEntries(evt.payload as LeaderEntry[]);
          break;
        case "winner": {
          const w = evt.payload as { name: string; meta?: string };
          setWinner(w);
          setTimeout(() => setWinner(null), 6000);
          break;
        }
        case "roundState": {
          const rs = evt.payload as RoundState;
          setRound(rs);
          if (rs.phase === "running") setIsLiveActive(true);
          break;
        }
        case "liveStarted":
          setIsLiveActive(true);
          break;
        case "liveEnded":
          setIsLiveActive(false);
          break;
      }
    });
    return unsub;
  }, [live?.live_code]);

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

  if (!live) return <div className="min-h-screen bg-transparent" />;

  const isLive = live.status === "live";
  const isEnded = live.status === "ended";
  const isCancelled = live.status === "cancelled";

  const statusConfig = isLive
    ? { text: "AO VIVO", cls: "ov-status-live" }
    : isEnded
      ? { text: "FINAL", cls: "ov-status-ended" }
      : isCancelled
        ? { text: "CANCELADA", cls: "ov-status-cancelled" }
        : { text: "EM BREVE", cls: "ov-status-upcoming" };

  const panelClass = "ov-panel";
  const topGame = [...gameEntries].sort((a, b) => b.score - a.score).slice(0, 5);

  const RankArrow = ({ prev, curr }: { prev?: number; curr: number }) => {
    if (prev === undefined || prev === curr) return <Minus className="w-3 h-3 opacity-30" />;
    if (prev > curr) return <ArrowUp className="w-3 h-3" style={{ color: "#22c55e" }} />;
    return <ArrowDown className="w-3 h-3" style={{ color: "#ef4444" }} />;
  };

  return (
    <div className="min-h-screen bg-transparent text-white p-6 font-display">
      <style>{`html,body,#root{background:transparent !important;}`}</style>

      {view === "game" && (
        <div className="flex flex-col gap-4">
          <div className={panelClass}>
            <div className="ov-panel-header">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" style={{ color: "#8b5cf6" }} />
                <h2 className="ov-panel-title">Jogo ao Vivo</h2>
              </div>
              <span className={statusConfig.cls}>{statusConfig.text}</span>
            </div>
            {round && isLiveActive && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Current game</p>
                    <p className="text-lg font-black mt-0.5" style={{ color: "#8b5cf6" }}>{round.game}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                    <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + (round.phase === "running" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
                      {round.phase === "running" ? "Running" : String(round.phase)}
                    </span>
                  </div>
                </div>
                {round.timeLeft > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    <Clock className="h-4 w-4" style={{ color: round.timeLeft <= 5 ? "#ef4444" : "#fbbf24" }} />
                    <div className="flex-1">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: round.timeLeft <= 5 ? "#ef4444" : "#fbbf24" }}
                          animate={{ width: `${Math.max(5, (round.timeLeft / 60) * 100)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                    <motion.span
                      key={round.timeLeft}
                      className="text-xl font-black tabular-nums w-12 text-right"
                      style={{ color: round.timeLeft <= 5 ? "#ef4444" : "#fbbf24" }}
                      initial={{ scale: 1.15 }}
                      animate={{ scale: 1 }}
                    >
                      {round.timeLeft}s
                    </motion.span>
                  </div>
                )}
              </div>
            )}
            {!round && !isLiveActive && (
              <div className="p-6 text-center">
                <motion.div
                  animate={{ y: [0, -6, 0], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Gamepad2 className="h-10 w-10 mx-auto" style={{ color: "rgba(255,255,255,0.15)" }} />
                </motion.div>
                <p className="ov-panel-empty-text mt-3">Aguardando jogo...</p>
                {isLive && <p className="text-[10px] text-muted-foreground mt-1">O proximo jogo vai aparecer aqui</p>}
              </div>
            )}
          </div>

          <div className={panelClass}>
            <div className="ov-panel-header">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" style={{ color: "#fbbf24" }} />
                <h2 className="ov-panel-title">Top Jogadores</h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                {topGame.length}
              </span>
            </div>
            {topGame.length === 0 ? (
              <div className="p-6 text-center">
                <motion.div
                  animate={{ y: [0, -6, 0], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Users className="h-8 w-8 mx-auto" style={{ color: "rgba(255,255,255,0.15)" }} />
                </motion.div>
                <p className="ov-panel-empty-text mt-3">Aguardando jogadores...</p>
              </div>
            ) : (
              <ul className="ov-panel-list">
                <AnimatePresence initial={false}>
                  {topGame.map((e, i) => {
                    const rankColors = ["#fbbf24", "#d1d5db", "#d97706", "#94a3b8", "#94a3b8"];
                    return (
                      <motion.li
                        layout
                        key={e.id}
                        initial={{ opacity: 0, x: 10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        className="ov-panel-item"
                        style={{
                          backgroundColor: i < 3 ? `${rankColors[i]}12` : "rgba(255,255,255,0.04)",
                          borderLeftColor: rankColors[i],
                        }}
                      >
                        <span
                          className="ov-panel-rank"
                          style={{
                            backgroundColor: i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#d97706" : "rgba(255,255,255,0.1)",
                            color: i < 3 ? "#000" : "#fff",
                          }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="ov-panel-name truncate">{e.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{e.game}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="ov-panel-value font-bold" style={{ color: i === 0 ? "#fbbf24" : "#e5e5e5" }}>
                            {e.score}
                          </span>
                          <Zap className="h-3 w-3" style={{ color: "#fbbf24", opacity: 0.5 }} />
                        </div>
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
              >
                <div className="ov-announcement" style={{ borderColor: "#fbbf2460", background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(139,92,246,0.1))" }}>
                  <div className="ov-announcement-header" style={{ borderBottomColor: "#fbbf2430" }}>
                    <Trophy className="h-4 w-4" style={{ color: "#fbbf24" }} />
                    <span className="ov-announcement-badge" style={{ color: "#fbbf24", backgroundColor: "rgba(251,191,36,0.15)" }}>VENCEDOR</span>
                  </div>
                  <p className="ov-announcement-text" style={{ fontSize: "1.1rem", fontWeight: 800 }}>{winner.name}</p>
                  {winner.meta && <p className="text-xs text-muted-foreground mt-1">{winner.meta}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {view === "ranking" && (
        <div className={panelClass}>
          <div className="ov-panel-header">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" style={{ color: "#fbbf24" }} />
              <h2 className="ov-panel-title">{isEnded ? "Top final" : "Top embaixadores"}</h2>
            </div>
            <span className={statusConfig.cls}>{statusConfig.text}</span>
          </div>
          {isCancelled ? (
            <p className="ov-panel-empty">Esta live foi cancelada.</p>
          ) : (
            <ul className="ov-panel-list">
              {ranking.map((r, i) => {
                const rankColors = ["#fbbf24", "#d1d5db", "#d97706", "#94a3b8", "#94a3b8"];
                return (
                  <motion.li
                    layout
                    key={r.ambassador_id}
                    className="ov-panel-item"
                    style={{
                      backgroundColor: i < 3 ? `${rankColors[i]}12` : "rgba(255,255,255,0.04)",
                      borderLeftColor: rankColors[i],
                    }}
                  >
                    <span
                      className="ov-panel-rank"
                      style={{
                        backgroundColor: i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : "rgba(255,255,255,0.1)",
                        color: i < 2 ? "#000" : "#fff",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="ov-panel-name">{r.display_name || r.ref_code}</span>
                    <div className="ov-panel-value-wrap">
                      <Users className="h-3 w-3" style={{ color: "#34d399" }} />
                      <span className="ov-panel-value" style={{ color: "#34d399" }}>{r.visits}</span>
                    </div>
                  </motion.li>
                );
              })}
              {ranking.length === 0 && (
                <li className="ov-panel-empty">Sem visitas ainda</li>
              )}
            </ul>
          )}
        </div>
      )}

      {view === "prizes" && (
        <div className={panelClass}>
          <div className="ov-panel-header">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" style={{ color: "#fbbf24" }} />
              <h2 className="ov-panel-title">Premios desta live</h2>
            </div>
            <span className={statusConfig.cls}>{statusConfig.text}</span>
          </div>
          <ul className="ov-panel-list">
            {prizes.map((p) => (
              <li
                key={p.id}
                className="ov-panel-item"
                style={{
                  backgroundColor: p.winner_user_id ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
                  borderLeftColor: p.winner_user_id ? "#34d399" : "#fbbf24",
                }}
              >
                <span className="ov-panel-rank" style={{ backgroundColor: "#fbbf24", color: "#000" }}>#{p.position}</span>
                <span className="ov-panel-name flex-1">{p.title}</span>
                {p.winner_user_id && (
                  <span className="ov-prize-assigned">Atribuido</span>
                )}
              </li>
            ))}
            {prizes.length === 0 && (
              <li className="ov-panel-empty">Sem premios definidos</li>
            )}
          </ul>
        </div>
      )}

      {view === "countdown" && (
        <div className={panelClass} style={{ textAlign: "center", padding: "2.5rem" }}>
          {isCancelled ? (
            <>
              <p className="ov-cd-label" style={{ color: "#fb7185" }}>Cancelada</p>
              <p className="ov-cd-title">{live.title}</p>
            </>
          ) : isEnded ? (
            <>
              <p className="ov-cd-label">Live encerrada</p>
              <p className="ov-cd-title" style={{ fontSize: "1.75rem" }}>Obrigado a todos!</p>
              <p className="ov-cd-subtitle">{live.title}</p>
            </>
          ) : isLive ? (
            <>
              <motion.p
                className="ov-cd-label"
                style={{ color: "#f87171" }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                Estamos ao vivo
              </motion.p>
              <p className="ov-cd-title">{live.title}</p>
            </>
          ) : cd ? (
            <>
              <p className="ov-cd-label">A live comeca em</p>
              <div className="ov-cd-digits">
                {[(cd.h, "h"), (cd.m, "m"), (cd.s, "s")].map(([val, unit], i) => (
                  <div key={unit} className="ov-cd-block">
                    <span className="ov-cd-number">{String(val).padStart(2, "0")}</span>
                    <span className="ov-cd-unit">{unit}</span>
                    {i < 2 && <span className="ov-cd-colon">:</span>}
                  </div>
                ))}
              </div>
              <p className="ov-cd-subtitle">{live.title}</p>
            </>
          ) : (
            <>
              <p className="ov-cd-label">Brevemente</p>
              <p className="ov-cd-title">{live.title}</p>
            </>
          )}
        </div>
      )}

      {view === "announcement" && (
        <AnimatePresence mode="wait">
          {last && !isCancelled && (
            <motion.div
              key={last.id}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="ov-announcement"
            >
              <div className="ov-announcement-header">
                <Radio className="h-4 w-4 ov-pulse-dot" />
                <span className="ov-announcement-badge">Aviso</span>
              </div>
              <p className="ov-announcement-text">{last.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default OverlayLive;
