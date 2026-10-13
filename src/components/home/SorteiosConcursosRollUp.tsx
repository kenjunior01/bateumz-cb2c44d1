import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Clock, Users, Award, Sparkles, ArrowRight, Gift } from "lucide-react";
import RollUp from "./RollUp";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";

/**
 * SorteiosConcursosRollUp — Sorteios ativos + Concursos abertos (dados reais).
 * Barras de progresso reais (bilhetes vendidos) e prazo dos concursos.
 */

const ACCENT = { gold: "#fbbf24", purple: "#a855f7", cyan: "#00d4ff" };

interface Raffle {
  id: string; title: string; slug: string | null;
  prize_title: string; prize_value: number; ticket_price: number;
  total_tickets: number; sold_tickets: number; end_date: string | null; image_url: string | null;
}
interface Contest {
  id: string; title: string; description: string | null;
  prize_description: string | null; image_url: string | null; end_date: string | null;
}

function daysLeft(end: string | null): string {
  if (!end) return "";
  const d = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  if (d <= 0) return "últimas horas";
  return d === 1 ? "1 dia" : `${d} dias`;
}

export default function SorteiosConcursosRollUp() {
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [r, c] = await Promise.all([
          (supabase as any).from("raffles")
            .select("id,title,slug,prize_title,prize_value,ticket_price,total_tickets,sold_tickets,end_date,image_url")
            .eq("status", "active").order("created_at", { ascending: false }).limit(8),
          (supabase as any).from("contests")
            .select("id,title,description,prize_description,image_url,end_date")
            .eq("status", "active").order("created_at", { ascending: false }).limit(5),
        ]);
        if (!alive) return;
        if (r.data) setRaffles(r.data as Raffle[]);
        if (c.data) setContests(c.data as Contest[]);
      } catch { /* silencioso — cartões CTA ficam */ }
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  const hasData = raffles.length > 0 || contests.length > 0;

  return (
    <RollUp
      kicker="Sorteios & Concursos"
      title="Participa e pode ser teu"
      subtitle={hasData ? `${raffles.length} sorteio(s) ativo(s) · ${contests.length} concurso(s) aberto(s)` : "Sorteios verificados e concursos com prémio — resultados públicos"}
      accent={ACCENT.gold}
      viewAllHref="/marketplace"
      viewAllLabel="Ver tudo"
    >
      {/* ── Sorteios reais ── */}
      {raffles.map((r, i) => {
        const pct = r.total_tickets > 0 ? Math.min(100, Math.round(((r.sold_tickets || 0) / r.total_tickets) * 100)) : 0;
        return (
          <motion.article
            key={r.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.4 }}
            className="relative shrink-0 snap-start w-[70vw] max-w-[280px] sm:w-[32%] md:w-[26%] lg:w-[23%] rounded-3xl overflow-hidden cursor-pointer group"
            style={{ background: "linear-gradient(160deg, #1c1200 0%, #2a1c03 55%, #1e1400 100%)", border: "1px solid rgba(251,191,36,0.22)", minHeight: 300, boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}
            onClick={() => navigate(r.slug ? `/raffle/${r.slug}` : "/marketplace")}
            role="link"
            aria-label={r.title}
          >
            <div className="relative h-28 overflow-hidden" style={{ background: "linear-gradient(135deg, #33230a, #4a340e)" }}>
              {r.image_url ? (
                <img src={r.image_url} alt={r.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="h-full w-full flex items-center justify-center"><Gift className="h-11 w-11" style={{ color: `${ACCENT.gold}88` }} /></div>
              )}
              <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[9px] font-black tracking-[0.12em] px-2 py-1 rounded-lg backdrop-blur-sm" style={{ color: "#fff", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <Sparkles className="h-3 w-3" /> SORTEIO
              </span>
            </div>

            <div className="p-4 flex flex-col" style={{ minHeight: 200 }}>
              <h3 className="text-[15px] font-black text-white leading-snug line-clamp-2">{r.title}</h3>
              <div className="mt-1 text-lg font-black" style={{ color: ACCENT.gold }}>{formatMZN(r.prize_value)}</div>

              {/* progresso real de bilhetes */}
              <div className="mt-3">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, pct)}%`, background: `linear-gradient(90deg, ${ACCENT.gold}88, ${ACCENT.gold})` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="inline-flex items-center gap-1"><Ticket className="h-3 w-3" /> {r.sold_tickets || 0}/{r.total_tickets || 0} bilhetes</span>
                  {r.end_date && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {daysLeft(r.end_date)}</span>}
                </div>
              </div>

              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-semibold">Bilhete: <span style={{ color: ACCENT.gold }}>{formatMZN(r.ticket_price)}</span></span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: ACCENT.gold }}>Participar <ArrowRight className="h-3 w-3" /></span>
              </div>
            </div>
          </motion.article>
        );
      })}

      {/* ── Concursos reais ── */}
      {contests.map((c, i) => (
        <motion.article
          key={c.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.4 }}
          className="relative shrink-0 snap-start w-[70vw] max-w-[280px] sm:w-[32%] md:w-[26%] lg:w-[23%] rounded-3xl overflow-hidden cursor-pointer group"
          style={{ background: "linear-gradient(160deg, #12051f 0%, #1d0a33 55%, #150623 100%)", border: "1px solid rgba(168,85,247,0.22)", minHeight: 300, boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}
          onClick={() => navigate(`/concursos/${c.id}`)}
          role="link"
          aria-label={c.title}
        >
          <div className="relative h-28 overflow-hidden" style={{ background: "linear-gradient(135deg, #250d3f, #35124f)" }}>
            {c.image_url ? (
              <img src={c.image_url} alt={c.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="h-full w-full flex items-center justify-center"><Award className="h-11 w-11" style={{ color: `${ACCENT.purple}88` }} /></div>
            )}
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[9px] font-black tracking-[0.12em] px-2 py-1 rounded-lg backdrop-blur-sm" style={{ color: "#fff", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Award className="h-3 w-3" /> CONCURSO
            </span>
          </div>

          <div className="p-4 flex flex-col" style={{ minHeight: 200 }}>
            <h3 className="text-[15px] font-black text-white leading-snug line-clamp-2">{c.title}</h3>
            {c.prize_description && (
              <div className="mt-1 text-sm font-bold line-clamp-1" style={{ color: ACCENT.purple }}>{c.prize_description}</div>
            )}
            {c.description && <p className="mt-2 text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{c.description}</p>}
            <div className="mt-auto pt-3 flex items-center justify-between">
              {c.end_date && <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500"><Clock className="h-3 w-3" /> termina em {daysLeft(c.end_date)}</span>}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: ACCENT.purple }}>Ver concurso <ArrowRight className="h-3 w-3" /></span>
            </div>
          </div>
        </motion.article>
      ))}

      {/* ── CTA quando vazio ── */}
      {!loaded && (
        <div className="shrink-0 snap-start w-[70vw] max-w-[280px] sm:w-[32%] md:w-[26%] lg:w-[23%] rounded-3xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", minHeight: 300 }} />
      )}
      {loaded && !hasData && (
        <motion.article
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative shrink-0 snap-start w-[70vw] max-w-[280px] sm:w-[32%] md:w-[26%] lg:w-[23%] rounded-3xl overflow-hidden cursor-pointer group flex flex-col items-center justify-center p-6 text-center"
          style={{ background: "linear-gradient(145deg, #1c1200, #12051f)", border: `1px dashed ${ACCENT.gold}55`, minHeight: 300 }}
          onClick={() => navigate("/marketplace")}
          role="link"
          aria-label="Explorar sorteios"
        >
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: `${ACCENT.gold}14`, border: `1px solid ${ACCENT.gold}30` }}>
            <Users className="h-7 w-7" style={{ color: ACCENT.gold }} />
          </div>
          <h3 className="text-lg font-black text-white leading-tight">Novos sorteios a caminho</h3>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            Resultados 100% verificáveis e públicos. Subscreve e recebe alerta quando um sorteio abrir.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl" style={{ color: ACCENT.gold, background: `${ACCENT.gold}14`, border: `1px solid ${ACCENT.gold}33` }}>
            Explorar <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </motion.article>
      )}
    </RollUp>
  );
}
