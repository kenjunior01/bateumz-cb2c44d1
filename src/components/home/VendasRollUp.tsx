import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Eye, Tag, Store, ArrowRight, Car, Home, Wrench, Truck, Factory, Package } from "lucide-react";
import RollUp from "./RollUp";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";

/**
 * VendasRollUp — "Coisas a Vender": bens reais da alienação
 * (viaturas, imóveis, equipamentos, frotas, máquinas) colocados por empresas.
 * Sem dados → cartões CTA honestos (anuncia / explora).
 */

const ACCENT = { green: "#2ea043", cyan: "#00d4ff", gold: "#fbbf24" };

const CAT_ICON: Record<string, any> = {
  viaturas: Car, imoveis: Home, equipamentos: Wrench, frotas: Truck, maquinario: Factory, outros: Package,
};
const MODALITY_LABEL: Record<string, string> = {
  venda_direta: "À VENDA", leasing: "LEASING", rent_to_own: "RENT-TO-OWN", leilao: "LEILÃO",
};

interface Asset {
  id: string;
  title: string;
  category: string;
  modality: string;
  asset_value: number;
  images: string[];
  province: string | null;
  city: string | null;
  condition: string;
  views_count: number;
  featured: boolean;
  slug: string | null;
}

export default function VendasRollUp() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("alienacao_assets")
          .select("id,title,category,modality,asset_value,images,province,city,condition,views_count,featured,slug")
          .in("status", ["disponivel", "reservado"])
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10);
        if (!alive) return;
        if (!error && data && data.length > 0) setAssets(data as Asset[]);
      } catch { /* silencioso */ }
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <RollUp
      kicker="Coisas à Venda"
      title="Bens e oportunidades do marketplace"
      subtitle={assets.length > 0 ? "Viaturas, imóveis, equipamentos e mais — direto das empresas" : "Empresas colocam bens à venda, leasing e leilão na plataforma"}
      accent={ACCENT.green}
      viewAllHref="/alienacao"
      viewAllLabel="Ver catálogo completo"
    >
      {assets.map((a, i) => {
        const CatIcon = CAT_ICON[a.category] || Package;
        const img = a.images && a.images.length > 0 ? a.images[0] : null;
        return (
          <motion.article
            key={a.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.4 }}
            className="relative shrink-0 snap-start w-[70vw] max-w-[280px] sm:w-[32%] md:w-[26%] lg:w-[23%] rounded-3xl overflow-hidden cursor-pointer group"
            style={{ background: "linear-gradient(160deg, #071209 0%, #0a1a0e 60%, #081510 100%)", border: "1px solid rgba(46,160,67,0.22)", minHeight: 300, boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}
            onClick={() => navigate(`/alienacao/${a.slug || a.id}`)}
            role="link"
            aria-label={a.title}
          >
            {/* imagem ou fallback com ícone */}
            <div className="relative h-32 overflow-hidden" style={{ background: "linear-gradient(135deg, #0c1f12, #123522)" }}>
              {img ? (
                <img src={img} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <CatIcon className="h-12 w-12" style={{ color: `${ACCENT.green}88` }} />
                </div>
              )}
              <span
                className="absolute top-2.5 left-2.5 text-[9px] font-black tracking-[0.12em] px-2 py-1 rounded-lg backdrop-blur-sm"
                style={{ color: ACCENT.gold, background: "rgba(0,0,0,0.55)", border: `1px solid ${ACCENT.gold}44` }}
              >
                {MODALITY_LABEL[a.modality] || "À VENDA"}
              </span>
              {a.featured && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-black tracking-[0.12em] px-2 py-1 rounded-lg backdrop-blur-sm" style={{ color: ACCENT.cyan, background: "rgba(0,0,0,0.55)", border: `1px solid ${ACCENT.cyan}44` }}>
                  ★ DESTAQUE
                </span>
              )}
            </div>

            <div className="p-4 flex flex-col" style={{ minHeight: 168 }}>
              <h3 className="text-[15px] font-black text-white leading-snug line-clamp-2">{a.title}</h3>
              <div className="mt-1.5 text-lg font-black" style={{ color: ACCENT.green }}>
                {formatMZN(a.asset_value)}
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {a.city || a.province || "Moçambique"}
                </span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <Eye className="h-3 w-3" /> {a.views_count || 0}
                </span>
              </div>
            </div>
          </motion.article>
        );
      })}

      {/* cartão CTA — sempre presente no fim, ainda mais com dados */}
      <motion.article
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4 }}
        className="relative shrink-0 snap-start w-[70vw] max-w-[280px] sm:w-[32%] md:w-[26%] lg:w-[23%] rounded-3xl overflow-hidden cursor-pointer group flex flex-col items-center justify-center p-6 text-center"
        style={{
          background: "linear-gradient(145deg, #06180c 0%, #0a2412 100%)",
          border: `1px dashed ${ACCENT.green}55`,
          minHeight: 300,
        }}
        onClick={() => navigate("/alienacao")}
        role="link"
        aria-label="Vender na plataforma"
      >
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: `${ACCENT.green}14`, border: `1px solid ${ACCENT.green}30` }}>
          <Store className="h-7 w-7" style={{ color: ACCENT.green }} />
        </div>
        <h3 className="text-lg font-black text-white leading-tight">
          {loaded && assets.length === 0 ? "Vende os teus bens aqui" : "Também podes vender aqui"}
        </h3>
        <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
          Coloca viaturas, imóveis, equipamentos ou frota à venda, leasing ou leilão — com visibilidade nacional.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl" style={{ color: ACCENT.green, background: `${ACCENT.green}14`, border: `1px solid ${ACCENT.green}33` }}>
          Começar a vender <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </motion.article>
    </RollUp>
  );
}
