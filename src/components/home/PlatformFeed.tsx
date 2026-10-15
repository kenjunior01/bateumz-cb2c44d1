import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Gamepad2, Ticket, Award, Store, Clapperboard, Sparkles,
  ArrowRight, Flame, Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadActiveStories, timeAgo } from "@/lib/stories";
import { formatMZN } from "@/lib/currency";

/**
 * PlatformFeed — o feed dinâmico que engloba TODA a plataforma:
 * vitórias, torneios, sorteios, concursos, vendas e stories —
 * num só fluxo em tempo real, com filtros por tipo.
 * Só mostra factos reais do Supabase; sem dados, explica a plataforma.
 */

const CYAN = "#00d4ff"; const PURPLE = "#a855f7"; const GREEN = "#2ea043"; const GOLD = "#fbbf24"; const ROSE = "#f43f5e";

type FeedType = "jogos" | "torneios" | "sorteios" | "concursos" | "vendas" | "stories";

interface FeedItem {
  key: string;
  type: FeedType;
  icon: any;
  color: string;
  text: string;
  detail?: string;
  time: string;
  href: string;
  hot?: boolean;
}

const FILTERS: { id: FeedType | "tudo"; label: string; color: string }[] = [
  { id: "tudo", label: "Tudo", color: CYAN },
  { id: "jogos", label: "Jogos", color: GREEN },
  { id: "torneios", label: "Torneios", color: PURPLE },
  { id: "sorteios", label: "Sorteios", color: GOLD },
  { id: "concursos", label: "Concursos", color: ROSE },
  { id: "vendas", label: "Vendas", color: "#34d399" },
  { id: "stories", label: "Stories", color: "#fb7185" },
];

export default function PlatformFeed() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<FeedType | "tudo">("tudo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: FeedItem[] = [];
      const iso24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

      /* ── vitórias recentes de sorteios ── */
      try {
        const winP = await supabase.from("participants").select("user_id,raffle_id,created_at").eq("status", "winner").order("created_at", { ascending: false }).limit(3);
        if (winP.data && winP.data.length > 0) {
          const uids = [...new Set(winP.data.map((w: any) => w.user_id))];
          const rids = [...new Set(winP.data.map((w: any) => w.raffle_id))];
          const [profs, rfs] = await Promise.all([
            supabase.from("profiles_public").select("user_id,display_name").in("user_id", uids),
            supabase.from("raffles").select("id,prize_title,slug").in("id", rids),
          ]);
          const pm = new Map(((profs.data || []) as any[]).map((p) => [p.user_id, p.display_name as string]));
          const rm = new Map(((rfs.data || []) as any[]).map((r) => [r.id, r]));
          (winP.data as any[]).forEach((w, i) => {
            const n = pm.get(w.user_id); const r = rm.get(w.raffle_id) as any;
            if (n && r) out.push({
              key: `win-${i}`, type: "sorteios", icon: Trophy, color: GOLD,
              text: `${String(n).split(" ")[0]} ganhou ${r.prize_title}`,
              detail: "Resultado verificado e público",
              time: timeAgo(w.created_at), href: r.slug ? `/raffle/${r.slug}` : "/marketplace", hot: true,
            });
          });
        }
      } catch { /* silencioso */ }

      /* ── torneios ativos ── */
      try {
        // "tournaments" ainda não está no tipo gerado do cliente — cast seguro
        const { data } = await (supabase as any).from("tournaments").select("id,name,prize_description,end_date").eq("status", "active").order("created_at", { ascending: false }).limit(2);
        ((data || []) as any[]).forEach((t) => out.push({
          key: `tour-${t.id}`, type: "torneios", icon: Gamepad2, color: PURPLE,
          text: `Torneio "${t.name}" está a decorrer`,
          detail: t.prize_description || "Entra e compete pelo topo do ranking",
          time: "agora", href: "/esports", hot: true,
        }));
      } catch { /* silencioso */ }

      /* ── sorteios a acabar ── */
      try {
        const { data } = await supabase.from("raffles").select("id,title,slug,end_date").eq("status", "active").not("end_date", "is", null).order("end_date", { ascending: true }).limit(2);
        ((data || []) as any[]).forEach((r) => {
          const d = Math.ceil((new Date(r.end_date).getTime() - Date.now()) / 86400000);
          out.push({
            key: `end-${r.id}`, type: "sorteios", icon: Ticket, color: GOLD,
            text: `Sorteio "${r.title}" acaba em ${d <= 1 ? "menos de 1 dia" : `${d} dias`}`,
            detail: "Últimos bilhetes disponíveis",
            time: timeAgo(r.end_date), href: r.slug ? `/raffle/${r.slug}` : "/marketplace",
          });
        });
      } catch { /* silencioso */ }

      /* ── concursos abertos ── */
      try {
        const { data } = await supabase.from("contests").select("id,title,prize_description,created_at").eq("status", "active").order("created_at", { ascending: false }).limit(2);
        ((data || []) as any[]).forEach((c) => out.push({
          key: `conc-${c.id}`, type: "concursos", icon: Award, color: ROSE,
          text: `Concurso "${c.title}" aberto a participações`,
          detail: c.prize_description || "Mostra o teu talento e ganha o prémio",
          time: c.created_at ? timeAgo(c.created_at) : "agora", href: `/concursos/${c.id}`,
        }));
      } catch { /* silencioso */ }

      /* ── bens à venda recentes ── */
      try {
        const { data } = await (supabase as any).from("alienacao_assets").select("id,title,asset_value,slug,created_at").in("status", ["disponivel", "reservado"]).order("created_at", { ascending: false }).limit(2);
        ((data || []) as any[]).forEach((a) => out.push({
          key: `vend-${a.id}`, type: "vendas", icon: Store, color: GREEN,
          text: `Novo bem à venda: ${a.title}`,
          detail: a.asset_value ? `Por ${formatMZN(a.asset_value)}` : "Venda direta, leasing ou leilão",
          time: a.created_at ? timeAgo(a.created_at) : "hoje", href: `/alienacao/${a.slug || a.id}`,
        }));
      } catch { /* silencioso */ }

      /* ── stories recentes ── */
      try {
        const storiesMap = await loadActiveStories();
        const flat: any[] = [];
        storiesMap.forEach((group) => group.stories.forEach((s) => flat.push(s)));
        flat.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        flat.slice(0, 2).forEach((s, i) => out.push({
          key: `story-${s.id}`, type: "stories", icon: Clapperboard, color: ROSE,
          text: `${s.authorName || "Alguém"} publicou um story${s.content ? `: "${String(s.content).slice(0, 60)}"` : ""}`,
          detail: "Vê no feed social da plataforma",
          time: timeAgo(s.created_at), href: "/community", hot: i === 0,
        }));
      } catch { /* silencioso */ }

      /* ── pulso de jogo (24h) ── */
      try {
        const { count } = await supabase.from("game_sessions").select("id", { count: "exact", head: true }).gte("created_at", iso24h);
        if (typeof count === "number" && count > 0) {
          out.push({
            key: "pulse-24h", type: "jogos", icon: Flame, color: CYAN,
            text: `${count.toLocaleString("pt-PT")} partida${count === 1 ? "" : "s"} nas últimas 24 horas`,
            detail: "Multiplayer, bots e solo — 80+ jogos",
            time: "24h", href: "/jogos", hot: true,
          });
        }
      } catch { /* silencioso */ }

      /* ordenar: quentes primeiro, depois por tempo */
      const order: FeedType[] = ["jogos", "torneios", "sorteios", "concursos", "vendas", "stories"];
      out.sort((a, b) => {
        if (a.hot !== b.hot) return a.hot ? -1 : 1;
        return order.indexOf(a.type) - order.indexOf(b.type);
      });
      if (alive) { setItems(out); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const visible = useMemo(
    () => (filter === "tudo" ? items : items.filter((i) => i.type === filter)),
    [items, filter]
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { tudo: items.length };
    items.forEach((i) => { m[i.type] = (m[i.type] || 0) + 1; });
    return m;
  }, [items]);

  return (
    <section className="relative py-10 sm:py-14" style={{ background: "linear-gradient(180deg, #050508, #070610 50%, #050508)" }}>
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        {/* ── cabeçalho ── */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}>
              <Radio className="h-5 w-5" style={{ color: CYAN }} />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute h-full w-full rounded-full opacity-60 animate-ping" style={{ background: ROSE }} />
                <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: ROSE }} />
              </span>
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">Feed da Plataforma</h2>
              <p className="text-[11px] text-zinc-500">Vitórias, torneios, sorteios, vendas e stories — tudo num só lugar</p>
            </div>
          </div>
        </div>

        {/* ── chips de filtro ── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const n = counts[f.id] || 0;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95"
                style={{
                  color: active ? "#000" : f.color,
                  background: active ? f.color : `${f.color}0d`,
                  border: `1px solid ${f.color}${active ? "" : "26"}`,
                }}
              >
                {f.label}
                {n > 0 && (
                  <span className="text-[9px] font-black rounded-full px-1.5" style={{ background: active ? "rgba(0,0,0,0.18)" : `${f.color}1f` }}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── lista do feed ── */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {loading && (
            <div className="p-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-xl shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 rounded w-3/4" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <div className="h-3 rounded w-1/2" style={{ background: "rgba(255,255,255,0.04)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="p-6 text-center">
              <Sparkles className="h-7 w-7 mx-auto mb-2" style={{ color: CYAN }} />
              <p className="text-sm font-bold text-white">A plataforma está a aquecer</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Assim que houver vitórias, torneios, sorteios e publicações, aparecem aqui em tempo real.
                Enquanto isso, explora os {80}+ jogos do catálogo.
              </p>
              <button
                onClick={() => navigate("/jogos")}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-transform active:scale-95"
                style={{ color: CYAN, background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}
              >
                Explorar jogos <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <AnimatePresence initial={false}>
            {!loading && visible.slice(0, 12).map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3), duration: 0.3 }}
                  onClick={() => navigate(item.href)}
                  className="flex items-start gap-3 p-4 cursor-pointer transition-colors duration-150 hover:bg-white/[0.03]"
                  style={idx > 0 ? { borderTop: "1px solid rgba(255,255,255,0.05)" } : undefined}
                >
                  <span
                    className="relative shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5"
                    style={{ background: `${item.color}12`, border: `1px solid ${item.color}2c` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                    {item.hot && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse" style={{ background: item.color }} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-zinc-100 leading-snug">
                      {item.text}
                      {item.hot && (
                        <span className="ml-2 align-middle text-[8px] font-black tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ color: item.color, background: `${item.color}14`, border: `1px solid ${item.color}30` }}>
                          AGORA
                        </span>
                      )}
                    </p>
                    {item.detail && <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{item.detail}</p>}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-zinc-600 mt-1">{item.time}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* rodapé do feed */}
        {!loading && visible.length > 0 && (
          <button
            onClick={() => navigate("/community")}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-2xl transition-transform active:scale-[0.98]"
            style={{ color: CYAN, background: `${CYAN}0a`, border: `1px solid ${CYAN}22` }}
          >
            Ver mais atividade na comunidade <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </section>
  );
}
