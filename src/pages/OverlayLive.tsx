import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { fetchScheduledLiveById, fetchScheduledLiveRanking, type ScheduledLive } from "@/lib/scheduledLives";
import { listAnnouncements, type LiveAnnouncement } from "@/lib/liveStudio";
import { Trophy, Radio, Clock, Users, Gift } from "lucide-react";

const useCountdown = (target?: string | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) };
};

const OverlayLive = () => {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const view = (params.get("view") || "ranking") as "ranking" | "prizes" | "countdown" | "announcement";
  const [live, setLive] = useState<ScheduledLive | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [last, setLast] = useState<LiveAnnouncement | null>(null);
  const cd = useCountdown(live?.scheduled_at);

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
    };
    load();
    const t = setInterval(load, 5000);
    return () => { active = false; clearInterval(t); };
  }, [id]);

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

  return (
    <div className="min-h-screen bg-transparent text-white p-6 font-display">
      <style>{`html,body,#root{background:transparent !important;}`}</style>

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
