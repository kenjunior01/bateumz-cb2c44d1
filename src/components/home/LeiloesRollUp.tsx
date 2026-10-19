import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gavel, Timer, Eye, MapPin, CheckCircle2, ArrowRight, Flame } from "lucide-react";
import RollUp from "./RollUp";
import {
  listLeiloes, subscribeLeiloes, tempoRestante, corStatus,
  LEILAO_STATUS_LABEL, categoriaLabel,
  type Leilao,
} from "@/lib/leiloes";
import { formatMZN } from "@/lib/currency";

/**
 * LeiloesRollUp — "Leilões ao Vivo" na homepage: itens raros,
 * dados de qualquer operadora, créditos e bens com lances em tempo real.
 */

const ACCENT = "#ff7b00";

export default function LeiloesRollUp() {
  const navigate = useNavigate();
  const [, force] = useState(0);
  useEffect(() => subscribeLeiloes(() => force((n) => n + 1)), []);
  const leiloes = useMemo(
    () => listLeiloes().filter((l) => l.status === "ao_vivo" || l.status === "terminando" || l.status === "agendado").slice(0, 9),
    [force]
  );

  const aoVivo = leiloes.filter((l) => l.status !== "agendado").length;

  return (
    <RollUp
      kicker="Leilões ao Vivo"
      title="Licita e leva para casa"
      subtitle={aoVivo > 0 ? `${aoVivo} leilões a decorrer — anti-snipe de 15s e compra imediata` : "Novos leilões todos os dias às 12h e 19h"}
      accent={ACCENT}
      viewAllHref="/leiloes"
      viewAllLabel="Casa de Leilões"
      autoAdvanceMs={6000}
    >
      {leiloes.map((l: Leilao, i) => {
        const cor = corStatus(l.status);
        const ehMeu = l.lances[0]?.is_minha === true;
        return (
          <motion.article
            key={l.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.4 }}
            className="relative shrink-0 snap-start w-[70vw] max-w-[280px] sm:w-[32%] md:w-[26%] lg:w-[23%] rounded-3xl overflow-hidden cursor-pointer group"
            style={{
              background: "linear-gradient(160deg, #120b04 0%, #150d06 60%, #0d0803 100%)",
              border: `1px solid ${l.destaque ? "rgba(255,123,0,0.4)" : "rgba(255,123,0,0.18)"}`,
              minHeight: 300,
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
            onClick={() => navigate(`/leiloes/${l.slug || l.id}`)}
            role="link"
            aria-label={l.titulo}
            data-testid="leilao-rollup-card"
          >
            {/* capa */}
            <div className="relative h-32 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${ACCENT}12, rgba(0,0,0,0.3))` }}>
              <span className="text-6xl transition-transform duration-500 group-hover:scale-110">{l.imagem_emoji}</span>
              <span
                className="absolute top-2.5 left-2.5 text-[9px] font-black tracking-[0.12em] px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1"
                style={{ color: cor, background: "rgba(0,0,0,0.55)", border: `1px solid ${cor}44` }}
              >
                {l.status === "terminando" && <Flame className="h-2.5 w-2.5" />}
                {LEILAO_STATUS_LABEL[l.status]}
              </span>
              {l.status !== "agendado" && (
                <span
                  className="absolute bottom-2.5 right-2.5 text-[10px] font-black font-mono tabular-nums px-2 py-1 rounded-lg backdrop-blur-sm"
                  style={{ color: cor, background: "rgba(0,0,0,0.65)" }}
                >
                  <Timer className="inline h-3 w-3 mr-1 -mt-0.5" />
                  {tempoRestante(l.ends_at)}
                </span>
              )}
            </div>

            <div className="p-4 flex flex-col" style={{ minHeight: 168 }}>
              <h3 className="text-[15px] font-black text-white leading-snug line-clamp-2 group-hover:text-orange-300 transition-colors">
                {l.titulo}
              </h3>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-lg font-black" style={{ color: ACCENT }}>{formatMZN(l.lance_atual)}</span>
                <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                  <Gavel className="h-3 w-3" /> {l.lances.length} lances
                </span>
                {ehMeu && (
                  <span className="text-[10px] font-bold text-emerald-400 inline-flex items-center gap-1 ml-auto">
                    <CheckCircle2 className="h-3 w-3" /> É teu!
                  </span>
                )}
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" /> {l.localizacao}
                </span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <Eye className="h-3 w-3" /> {l.visualizacoes}
                </span>
              </div>
              <span className="mt-2 text-[10px] text-zinc-600 truncate">{categoriaLabel(l.categoria)}</span>
            </div>
          </motion.article>
        );
      })}

      {/* CTA final */}
      <motion.article
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4 }}
        className="relative shrink-0 snap-start w-[70vw] max-w-[280px] sm:w-[32%] md:w-[26%] lg:w-[23%] rounded-3xl overflow-hidden cursor-pointer group flex flex-col items-center justify-center p-6 text-center"
        style={{ background: "linear-gradient(145deg, #140b04 0%, #1d1206 100%)", border: `1px dashed ${ACCENT}55`, minHeight: 300 }}
        onClick={() => navigate("/leiloes")}
        role="link"
        aria-label="Ver todos os leilões"
      >
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}30` }}>
          <Gavel className="h-7 w-7" style={{ color: ACCENT }} />
        </div>
        <h3 className="text-lg font-black text-white leading-tight">Entra na casa de leilões</h3>
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
          Itens raros do mundo, dados de qualquer operadora, créditos e bens reais — ao segundo, ao vivo.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl" style={{ color: ACCENT, background: `${ACCENT}14`, border: `1px solid ${ACCENT}33` }}>
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </motion.article>
    </RollUp>
  );
}
