import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Users, Shield, Plus, Crown, Clock, Swords } from "lucide-react";
import RollUp from "./RollUp";
import { getTournaments, type Tournament } from "@/lib/tournaments";
import { getLeagues, type League } from "@/lib/leagues";

/**
 * EsportsRollUp — "Inscrições abertas": torneios ativos + ligas com registo
 * aberto num só roll-up, com CTA para empresas criarem os seus.
 * Dados 100% reais (Supabase). Se não houver nada, mostra o cartão de
 * criação — honesto e sempre com ação.
 */

const ACCENT = { emerald: "#10b981", cyan: "#00d4ff", gold: "#fbbf24", violet: "#a855f7" };

export default function EsportsRollUp() {
  const navigate = useNavigate();
  const [tours, setTours] = useState<Tournament[]>([]);
  const [ligas, setLigas] = useState<League[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ts, ls] = await Promise.all([
          getTournaments("active").catch(() => [] as Tournament[]),
          getLeagues({ status: "registration", limit: 8 }).catch(() => [] as League[]),
        ]);
        if (!alive) return;
        setTours(ts ?? []);
        setLigas(ls ?? []);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const total = tours.length + ligas.length;

  return (
    <RollUp
      kicker="Esports & Ligas"
      title="Inscrições abertas"
      subtitle={
        !loaded
          ? "A carregar competições…"
          : total > 0
            ? `${tours.length} torneio(s) ativo(s) · ${ligas.length} liga(s) com inscrição aberta`
            : "Empresas estão a criar as próximas competições — sê tu a primeira liga"
      }
      accent={ACCENT.emerald}
      viewAllHref="/ligas"
      viewAllLabel="Ver ligas e campeonatos"
      autoAdvanceMs={0}
    >
      {/* ── Torneios ativos com inscrição ── */}
      {tours.map((t, i) => (
        <motion.article
          key={`t-${t.id}`}
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.4 }}
          className="relative shrink-0 snap-start w-[70vw] max-w-[290px] sm:w-[30%] md:w-[24%] lg:w-[21%] rounded-3xl overflow-hidden cursor-pointer group p-5"
          style={{
            background: "linear-gradient(145deg, #04211a 0%, #06332a 60%, #0a4034 100%)",
            border: `1px solid ${ACCENT.emerald}35`,
            minHeight: 230,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
          onClick={() => navigate(`/tournaments/${t.id}`)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/tournaments/${t.id}`); } }}
          role="link"
          tabIndex={0}
          aria-label={`Inscrever-se no torneio ${t.name}`}
          data-testid={`esports-torneio-${i + 1}`}
        >
          <div className="hidden sm:block absolute -top-8 -right-8 h-28 w-28 rounded-full blur-3xl opacity-60" style={{ background: "rgba(16,185,129,0.25)" }} />
          <div className="relative flex flex-col h-full" style={{ minHeight: 190 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ color: ACCENT.emerald, background: `${ACCENT.emerald}14`, border: `1px solid ${ACCENT.emerald}33` }}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: ACCENT.emerald }} />
                INSCRIÇÃO ABERTA
              </span>
              <Trophy className="h-5 w-5" style={{ color: ACCENT.gold }} />
            </div>
            <h3 className="text-lg font-black text-white leading-snug line-clamp-2">{t.name}</h3>
            <div className="mt-2 flex items-center gap-1.5 text-sm font-bold" style={{ color: ACCENT.gold }}>
              <Crown className="h-4 w-4" />
              <span className="truncate">{t.prize_description || (t.prize_value ? `${t.prize_value} ${t.currency || "MT"}` : "Prémio a definir")}</span>
            </div>
            <div className="mt-auto pt-3 flex items-center justify-between gap-2 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {t.max_participants ? `até ${t.max_participants}` : "vagas abertas"}
              </span>
              {t.end_date && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> até {new Date(t.end_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                </span>
              )}
            </div>
            <span className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-white text-center" style={{ background: `linear-gradient(90deg, ${ACCENT.emerald}, #059669)` }}>
              <Users className="h-3.5 w-3.5" /> Inscrever-me
            </span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${ACCENT.emerald}, transparent 70%)` }} />
        </motion.article>
      ))}

      {/* ── Ligas com inscrição aberta ── */}
      {ligas.map((l, i) => (
        <motion.article
          key={`l-${l.id}`}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.4 }}
          className="relative shrink-0 snap-start w-[70vw] max-w-[290px] sm:w-[30%] md:w-[24%] lg:w-[21%] rounded-3xl overflow-hidden cursor-pointer group p-5"
          style={{
            background: "linear-gradient(145deg, #0b0621 0%, #150a33 60%, #1b0f42 100%)",
            border: `1px solid ${l.primary_color || ACCENT.violet}40`,
            minHeight: 230,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
          onClick={() => navigate(`/ligas/${l.slug}`)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/ligas/${l.slug}`); } }}
          role="link"
          tabIndex={0}
          aria-label={`Inscrever-se na liga ${l.name}`}
          data-testid={`esports-liga-${i + 1}`}
        >
          <div className="hidden sm:block absolute -top-8 -left-8 h-28 w-28 rounded-full blur-3xl opacity-50" style={{ background: `${l.primary_color || ACCENT.violet}30` }} />
          <div className="relative flex flex-col h-full" style={{ minHeight: 190 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ color: ACCENT.cyan, background: `${ACCENT.cyan}12`, border: `1px solid ${ACCENT.cyan}30` }}>
                <Shield className="h-3 w-3" /> LIGA
              </span>
              <Swords className="h-5 w-5" style={{ color: l.secondary_color || ACCENT.cyan }} />
            </div>
            <h3 className="text-lg font-black text-white leading-snug line-clamp-2">{l.name}</h3>
            {l.prize_description || l.prize_pool > 0 ? (
              <div className="mt-2 flex items-center gap-1.5 text-sm font-bold" style={{ color: ACCENT.gold }}>
                <Crown className="h-4 w-4" />
                <span className="truncate">{l.prize_description || `${l.prize_pool.toLocaleString("pt-PT")} ${l.currency || "MT"}`}</span>
              </div>
            ) : null}
            <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {l.current_participants ?? 0}/{l.max_participants}
              </span>
              {l.registration_closes_at && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> até {new Date(l.registration_closes_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                </span>
              )}
            </div>
            <span className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-white text-center" style={{ background: `linear-gradient(90deg, ${l.primary_color || ACCENT.violet}, ${l.secondary_color || "#7c3aed"})` }}>
              <Plus className="h-3.5 w-3.5" /> Entrar na liga
            </span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${l.primary_color || ACCENT.violet}, transparent 70%)` }} />
        </motion.article>
      ))}

      {/* ── Cartão de criação (empresas/organizadores) ── */}
      <article
        className="relative shrink-0 snap-start w-[70vw] max-w-[290px] sm:w-[30%] md:w-[24%] lg:w-[21%] rounded-3xl overflow-hidden cursor-pointer group flex flex-col items-center justify-center p-5 text-center"
        style={{
          background: "linear-gradient(145deg, #0a0a12, #101020)",
          border: `1px dashed ${ACCENT.emerald}55`,
          minHeight: 230,
        }}
        onClick={() => navigate("/dashboard/esports")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/dashboard/esports"); } }}
        role="link"
        tabIndex={0}
        aria-label="Criar torneio ou liga como empresa"
        data-testid="esports-criar-card"
      >
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110" style={{ background: `${ACCENT.emerald}14`, border: `1px solid ${ACCENT.emerald}30` }}>
          <Plus className="h-6 w-6" style={{ color: ACCENT.emerald }} />
        </div>
        <h3 className="text-[15px] font-black text-white leading-tight">Empresa? Cria o teu<br />torneio ou liga</h3>
        <p className="text-[11px] text-zinc-500 mt-1">Branding próprio, inscrições automáticas, prémios e grelha</p>
        <span className="mt-3 text-[11px] font-bold" style={{ color: ACCENT.emerald }}>Começar agora →</span>
      </article>
    </RollUp>
  );
}
