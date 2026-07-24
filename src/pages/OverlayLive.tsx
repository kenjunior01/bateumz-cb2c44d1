import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { fetchScheduledLiveById, fetchScheduledLiveRanking, type ScheduledLive } from "@/lib/scheduledLives";
import { listAnnouncements, type LiveAnnouncement } from "@/lib/liveStudio";
import { Trophy, Radio } from "lucide-react";

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
        supabase.from("live_ambassador_prizes").select("*").eq("scheduled_live_id", sl.id).order("position"),
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

  const statusBadge = isLive
    ? { text: "AO VIVO", cls: "bg-red-500 animate-pulse" }
    : isEnded
      ? { text: "FINAL", cls: "bg-zinc-700" }
      : isCancelled
        ? { text: "CANCELADA", cls: "bg-rose-600" }
        : { text: "EM BREVE", cls: "bg-emerald-600" };

  return (
    <div className="min-h-screen bg-transparent text-white p-6 font-display">
      {view === "ranking" && (
        <div className="rounded-3xl bg-black/70 backdrop-blur-md border border-white/10 p-5 max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="font-extrabold text-lg">{isEnded ? "Top final" : "Top embaixadores"}</h2>
            <span className={`ml-auto text-[10px] uppercase px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.text}</span>
          </div>
          {isCancelled ? (
            <p className="text-sm text-white/70">Esta live foi cancelada.</p>
          ) : (
            <ul className="space-y-2">
              {ranking.map((r, i) => (
                <motion.li layout key={r.ambassador_id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${i === 0 ? "bg-amber-400 text-black" : "bg-white/10"}`}>{i + 1}</span>
                  <span className="flex-1 truncate font-bold">{r.display_name || r.ref_code}</span>
                  <span className="text-emerald-400 font-extrabold text-lg">{r.visits}</span>
                </motion.li>
              ))}
              {ranking.length === 0 && <li className="text-sm text-white/60 text-center py-4">Sem visitas ainda</li>}
            </ul>
          )}
        </div>
      )}

      {view === "prizes" && (
        <div className="rounded-3xl bg-black/70 backdrop-blur-md border border-white/10 p-5 max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="font-extrabold text-lg">Prémios desta live</h2>
            <span className={`ml-auto text-[10px] uppercase px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.text}</span>
          </div>
          <ul className="space-y-2">
            {prizes.map((p) => (
              <li key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${p.winner_user_id ? "bg-emerald-500/20" : "bg-white/5"}`}>
                <span className="w-7 h-7 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs font-extrabold">#{p.position}</span>
                <span className="flex-1 font-bold">{p.title}</span>
                {p.winner_user_id && <span className="text-[10px] uppercase text-emerald-300">Atribuído</span>}
              </li>
            ))}
            {prizes.length === 0 && <li className="text-sm text-white/60 text-center py-4">Sem prémios definidos</li>}
          </ul>
        </div>
      )}

      {view === "countdown" && (
        <div className="rounded-3xl bg-black/70 backdrop-blur-md border border-white/10 p-8 max-w-md text-center">
          {isCancelled ? (
            <>
              <p className="text-sm uppercase tracking-widest text-rose-300 mb-2">Cancelada</p>
              <p className="text-3xl font-extrabold">{live.title}</p>
            </>
          ) : isEnded ? (
            <>
              <p className="text-sm uppercase tracking-widest text-white/60 mb-2">Live encerrada</p>
              <p className="text-3xl font-extrabold">Obrigado a todos!</p>
              <p className="text-base mt-2 font-bold">{live.title}</p>
            </>
          ) : isLive ? (
            <>
              <p className="text-sm uppercase tracking-widest text-red-300 mb-2 animate-pulse">Estamos ao vivo</p>
              <p className="text-3xl font-extrabold">{live.title}</p>
            </>
          ) : cd ? (
            <>
              <p className="text-sm uppercase tracking-widest text-white/60 mb-2">A live começa em</p>
              <p className="text-6xl font-extrabold tabular-nums">{String(cd.h).padStart(2, "0")}:{String(cd.m).padStart(2, "0")}:{String(cd.s).padStart(2, "0")}</p>
              <p className="text-lg mt-3 font-bold">{live.title}</p>
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-widest text-white/60 mb-2">Brevemente</p>
              <p className="text-3xl font-extrabold">{live.title}</p>
            </>
          )}
        </div>
      )}

      {view === "announcement" && (
        <AnimatePresence mode="wait">
          {last && !isCancelled && (
            <motion.div key={last.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-3xl bg-gradient-to-br from-red-600 to-amber-500 p-8 max-w-xl shadow-2xl">
              <div className="flex items-center gap-2 mb-2"><Radio className="h-5 w-5 animate-pulse" /><span className="text-xs uppercase font-bold tracking-widest">Aviso</span></div>
              <p className="text-3xl font-extrabold leading-tight">{last.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default OverlayLive;
