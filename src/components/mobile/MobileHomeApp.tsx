// ═══════════════════════════════════════════════════════════════
// MobileHomeApp — Home mobile da Bateu (estilo app nativo)
// Fusão do melhor das duas versões de exemplo:
//   • Círculos de acesso rápido com anéis de gradiente coloridos
//   • Cartão DESTAQUE com contagem decrescente, preço e progresso
//   • Secção "Descoberta ao Vivo" com FILTRAR e badges de raridade
//   • Fundo escuro com ambiente roxo + brilhos suaves
//   • Sino com ponto de notificação + avatar no topo
// 100% em português.
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Radio, Ticket, Gamepad2, Crown, Play,
  MoreHorizontal, Flame, Clock, Sparkles, ChevronRight, Gem,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileNav } from "@/contexts/MobileNavigationContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { formatMZN } from "@/lib/currency";
import bateuLogo from "@/assets/bateu-logo.png";
import Footer from "@/components/Footer";
import DailyMissions from "@/components/engagement/DailyMissions";

const MobileSocialFeed = lazy(() => import("@/components/MobileSocialFeed").then(m => ({ default: m.default })));

/* ─── tipos ─── */
interface RaffleRow {
  id: string;
  title: string;
  slug: string | null;
  prize_title: string;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  end_date: string | null;
  image_url: string | null;
  raffle_type: string;
  points_cost: number;
  hide_prize_value: boolean;
  created_at: string;
}

type DiscoveryMode = "recentes" | "acabar" | "populares";
const DISCOVERY_MODES: { id: DiscoveryMode; label: string }[] = [
  { id: "recentes", label: "Recentes" },
  { id: "acabar", label: "A acabar" },
  { id: "populares", label: "Populares" },
];

/* ─── raridade pelo valor do prémio (MT) ─── */
function rarityOf(r: RaffleRow): { label: string; cls: string } {
  if (r.raffle_type === "free") return { label: "Grátis", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" };
  if (r.raffle_type === "points") return { label: "Pontos", cls: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30" };
  const v = Number(r.prize_value || 0);
  if (v >= 10000) return { label: "Lendário", cls: "bg-amber-500/20 text-amber-300 border-amber-400/30" };
  if (v >= 2500) return { label: "Épico", cls: "bg-purple-500/20 text-purple-300 border-purple-400/30" };
  if (v >= 500) return { label: "Raro", cls: "bg-blue-500/20 text-blue-300 border-blue-400/30" };
  return { label: "Comum", cls: "bg-white/10 text-zinc-300 border-white/15" };
}

/* ─── contagem decrescente viva ─── */
function useCountdown(endDate: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - now;
  if (diff <= 0) return "Encerrado";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h`;
  if (h > 0) return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

/* ─── anéis de gradiente dos círculos ─── */
const QUICK_LINKS = [
  { icon: Radio, label: "AO VIVO", href: "/lives", ring: "conic-gradient(from 180deg, #f97316, #ec4899, #f97316)", live: true },
  { icon: Ticket, label: "SORTEIOS", href: "/marketplace?tab=raffles", ring: "conic-gradient(from 180deg, #8b5cf6, #d946ef, #8b5cf6)" },
  { icon: Gamepad2, label: "GAMES", href: "/jogos", ring: "conic-gradient(from 180deg, #22d3ee, #3b82f6, #22d3ee)" },
  { icon: Crown, label: "VIP HUB", href: "/pontos", ring: "conic-gradient(from 180deg, #f59e0b, #fbbf24, #f59e0b)" },
  { icon: MoreHorizontal, label: "MAIS", href: null, ring: "conic-gradient(from 180deg, #ec4899, #f43f5e, #ec4899)" },
];

/* ─── carta de destaque ─── */
function DestaqueCard({ r }: { r: RaffleRow }) {
  const { t } = useLanguage();
  const { sfx } = useSoundEffects();
  const countdown = useCountdown(r.end_date);
  const pct = r.total_tickets > 0 ? Math.min(100, (r.sold_tickets / r.total_tickets) * 100) : 0;
  const href = `/raffle/${r.slug || r.id}`;
  const words = (r.prize_title || r.title || "").trim().split(/\s+/);
  const first = words.slice(0, 1).join(" ");
  const rest = words.slice(1).join(" ");

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-4"
    >
      <Link
        to={href}
        onClick={() => sfx.tabClick()}
        data-testid="mh-destaque"
        className="block relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c14] shadow-[0_10px_40px_rgba(0,0,0,0.55)]"
      >
        {/* imagem de fundo */}
        {r.image_url && (
          <img src={r.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080e] via-[#0a0a12cc] to-[#0c0c1499]" />

        <div className="relative p-4 pt-4">
          {/* pill DESTAQUE + contagem */}
          <div className="mb-16 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-extrabold tracking-widest text-white shadow-lg shadow-violet-600/40">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              {t("mh.featured")}
            </span>
            {countdown && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-200 backdrop-blur-sm border border-white/10">
                <Clock className="h-3 w-3 text-violet-300" />
                {t("mh.endsIn", { time: countdown })}
              </span>
            )}
          </div>

          {/* título — 1ª palavra branca, resto gradiente azul (versão A) */}
          <h2 className="font-display text-2xl font-black leading-[1.08] tracking-tight text-white drop-shadow-lg">
            {first}
            {rest && (
              <>
                {" "}
                <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
                  {rest}
                </span>
              </>
            )}
          </h2>

          {/* preço + progresso (versão B) */}
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="text-xs text-zinc-400">
              {t("mh.ticketsFrom")}{" "}
              <span className="text-sm font-extrabold text-white">
                {r.raffle_type === "free" ? t("mh.free") : r.raffle_type === "points" ? `${r.points_cost} pts` : formatMZN(r.ticket_price)}
              </span>
            </p>
            <span className="text-[11px] font-bold text-violet-300">{Math.round(pct)}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 progress-glow"
            />
          </div>

          {/* CTA */}
          <span className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-700/40 active:scale-[0.98] transition-transform">
            <Sparkles className="h-4 w-4" />
            {t("mh.joinNow")}
          </span>
        </div>
      </Link>
    </motion.section>
  );
}

/* ─── cartão da Descoberta ao Vivo ─── */
function DiscoveryCard({ r }: { r: RaffleRow }) {
  const { sfx } = useSoundEffects();
  const pct = r.total_tickets > 0 ? Math.min(100, Math.round((r.sold_tickets / r.total_tickets) * 100)) : 0;
  const rarity = rarityOf(r);
  const countdown = useCountdown(r.end_date);

  return (
    <Link
      to={`/raffle/${r.slug || r.id}`}
      onClick={() => sfx.tabClick()}
      data-testid="mh-discovery-card"
      className="group w-[168px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d15] shadow-md transition-transform active:scale-[0.97]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {r.image_url ? (
          <img src={r.image_url} alt={r.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#15151f]">
            <Gem className="h-8 w-8 text-white/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d15cc] via-transparent to-transparent" />
        {/* chip % bilhetes + badge raridade (versão B) */}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm border border-white/10">
          {pct}% {t("mh.slots")}
        </span>
        <span className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide backdrop-blur-sm ${rarity.cls}`}>
          {rarity.label}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-1 text-[12.5px] font-bold leading-tight text-white">{r.prize_title || r.title}</h3>
        <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
          <span className="font-bold text-zinc-200">
            {r.raffle_type === "free" ? t("mh.free") : r.raffle_type === "points" ? `${r.points_cost} pts` : formatMZN(r.ticket_price)}
          </span>
          {countdown && countdown !== "Encerrado" && (
            <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{countdown}</span>
          )}
        </div>
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function MobileHomeApp() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openMenu } = useMobileNav();
  const { sfx } = useSoundEffects();

  const [raffles, setRaffles] = useState<RaffleRow[]>([]);
  const [mode, setMode] = useState<DiscoveryMode>("recentes");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("raffles")
          .select("id,title,slug,prize_title,prize_value,ticket_price,total_tickets,sold_tickets,end_date,image_url,raffle_type,points_cost,hide_prize_value,created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(24);
        if (data) setRaffles(data as RaffleRow[]);
      } catch { /* fallback silencioso */ }
    })();
  }, []);

  /* destaque = sorteio ativo mais próximo de acabar (com data) */
  const destaque = useMemo(() => {
    const withEnd = raffles.filter((r) => r.end_date && new Date(r.end_date).getTime() > Date.now());
    if (withEnd.length > 0) {
      return [...withEnd].sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())[0];
    }
    return raffles[0] || null;
  }, [raffles]);

  /* descoberta = lista filtrável (versão B) */
  const discovery = useMemo(() => {
    const list = [...raffles];
    if (mode === "acabar") {
      return list
        .filter((r) => r.end_date && new Date(r.end_date).getTime() > Date.now())
        .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());
    }
    if (mode === "populares") {
      return list.sort((a, b) => (b.sold_tickets / Math.max(1, b.total_tickets)) - (a.sold_tickets / Math.max(1, a.total_tickets)));
    }
    return list; // recentes (já ordenado por created_at desc)
  }, [raffles, mode]);

  const modeIdx = DISCOVERY_MODES.findIndex((m) => m.id === mode);

  return (
    <div className="dark min-h-screen bg-[#050508] text-zinc-100" style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom))" }}>
      {/* ambiente roxo suave (versão B) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-64 bg-[radial-gradient(ellipse_60%_100%_at_50%_100%,rgba(124,58,237,0.16),transparent_70%)]" />

      {/* ═══ topo global MobileTopBar (pesquisa + sino + avatar + menu) ═══ */}

      {/* ═══ círculos de acesso rápido (rótulos PT + anéis B) ═══ */}
      <section className="px-4 pt-4" data-testid="mh-quick">
        <div className="flex items-start justify-between gap-1">
          {QUICK_LINKS.map((q) => {
            const inner = (
              <>
                <span
                  className="grid h-[62px] w-[62px] place-items-center rounded-full p-[2.5px]"
                  style={{ background: q.ring }}
                >
                  <span className="relative grid h-full w-full place-items-center rounded-full bg-[#101018]">
                    <q.icon className="h-5 w-5 text-zinc-200" strokeWidth={1.9} />
                    {q.live && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                      </span>
                    )}
                  </span>
                </span>
                <span className="mt-1.5 text-[9.5px] font-bold tracking-wider text-zinc-400">{q.label}</span>
              </>
            );
            return q.href ? (
              <Link
                key={q.label}
                to={q.href}
                onClick={() => sfx.tabClick()}
                className="flex w-[19%] flex-col items-center transition-transform active:scale-95"
              >
                {inner}
              </Link>
            ) : (
              <button
                key={q.label}
                onClick={() => { sfx.tabClick(); openMenu(); }}
                className="flex w-[19%] flex-col items-center transition-transform active:scale-95"
              >
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ DESTAQUE — contagem + preço + progresso (A+B) ═══ */}
      <div className="mt-4">
        {destaque ? (
          <DestaqueCard r={destaque} />
        ) : (
          <div className="px-4">
            <div className="rounded-3xl border border-white/10 bg-[#0c0c14] p-6 text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-violet-400" />
              <p className="text-sm font-bold text-white">{t("mh.noFeatured")}</p>
              <p className="mt-1 text-xs text-zinc-400">{t("mh.noFeaturedSub")}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Descoberta ao Vivo + FILTRAR (versão B) ═══ */}
      <section className="mt-7" data-testid="mh-discovery">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="font-display text-[17px] font-extrabold tracking-tight text-white">{t("mh.discovery")}</h2>
          <button
            onClick={() => { sfx.tabClick(); setMode(DISCOVERY_MODES[(modeIdx + 1) % DISCOVERY_MODES.length].id); }}
            className="inline-flex items-center gap-1 rounded-full bg-violet-600/15 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-300 border border-violet-500/25 active:scale-95 transition-transform"
            data-testid="mh-filter"
          >
            {DISCOVERY_MODES[modeIdx].label}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {discovery.length > 0 ? (
          <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {discovery.slice(0, 12).map((r) => <DiscoveryCard key={r.id} r={r} />)}
          </div>
        ) : (
          <p className="px-4 text-xs text-zinc-500">{t("mh.noRaffles")}</p>
        )}
      </section>

      {/* ═══ faixa MUNDO 3D ═══ */}
      <section className="mt-7 px-4">
        <button
          onClick={() => { sfx.whoosh(); navigate("/lives?game=mmorpg"); }}
          data-testid="mh-world-banner"
          className="relative flex w-full items-center gap-3 overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-r from-[#1a1030] via-[#241447] to-[#12102a] p-4 text-left shadow-lg shadow-violet-900/30 active:scale-[0.98] transition-transform"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-600/40">
            <Play className="h-5 w-5 text-white fill-white" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[15px] font-black text-white">
              {t("mh.worldTitle")}
              <Flame className="h-3.5 w-3.5 text-orange-400" />
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-violet-200/70">{t("mh.worldSub")}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-violet-300" />
        </button>
      </section>

      {/* ═══ missões diárias + feed social (conteúdo real da plataforma) ═══ */}
      <section className="mt-7 px-4">
        <DailyMissions compact />
      </section>

      <section className="mt-6">
        <Suspense fallback={<div className="h-40" />}>
          <MobileSocialFeed />
        </Suspense>
      </section>

      <Footer />
    </div>
  );
}
