// ═══════════════════════════════════════════════════════════════
// Marketplace Bateu — o mercado unificado de classe mundial.
//
// REA dos melhores do mundo (Amazon · Temu · StockX · Steam · Wallapop):
//   → UMA busca instantânea para tudo (leilões, produtos, alienação,
//     sorteios, jogos, concursos)
//   → Flash deals com contagem regressiva REAL (o que acaba primeiro)
//   → Prova social e confiança em cada cartão (verificado, visualizações)
//   → Atividade ao vivo embutida (o mercado respira)
//   → Compatibilidade total com links antigos (?tab= / ?filter= / ?q=)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Flame, Gavel, ShoppingBag, KeyRound, Gift, Gamepad2, Trophy,
  LayoutGrid, ArrowUpDown, ShieldCheck, Eye, Heart, MapPin, Zap, Clock, Sparkles,
} from "lucide-react";
import { formatMZN } from "@/lib/currency";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ActivityFeed from "@/components/ActivityFeed";
import {
  getMarketplaceData, searchMarket, sortMarket, subscribeMarketChanges,
  kindLabel, type MarketItem, type MarketKind, type MarketData, type MarketSort,
} from "@/lib/marketplace";
import { useSEO } from "@/hooks/useSEO";

const sb: any = null; // acesso direto não necessário — tudo via lib/marketplace

type CatFilter = "all" | MarketKind;

const CATS: { id: CatFilter; label: string; icon: typeof Gavel; accent: string }[] = [
  { id: "all", label: "Tudo", icon: LayoutGrid, accent: "from-cyan-500 to-blue-600" },
  { id: "leilao", label: "Leilões", icon: Gavel, accent: "from-orange-500 to-amber-600" },
  { id: "produto", label: "Produtos", icon: ShoppingBag, accent: "from-fuchsia-500 to-purple-600" },
  { id: "alienacao", label: "Alienação", icon: KeyRound, accent: "from-emerald-500 to-teal-600" },
  { id: "sorteio", label: "Sorteios", icon: Gift, accent: "from-violet-500 to-fuchsia-600" },
  { id: "jogo", label: "Jogos", icon: Gamepad2, accent: "from-lime-500 to-green-600" },
  { id: "concurso", label: "Concursos", icon: Trophy, accent: "from-yellow-500 to-orange-600" },
];

const SORTS: { id: MarketSort; label: string }[] = [
  { id: "urgente", label: "Acaba primeiro" },
  { id: "desconto", label: "Melhor desconto" },
  { id: "barato", label: "Preço mais baixo" },
  { id: "caro", label: "Preço mais alto" },
  { id: "popular", label: "Mais popular" },
  { id: "recente", label: "Mais recente" },
];

/** Contagem regressiva ao vivo (tiquetaque a cada segundo). */
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [active]);
  return now;
}

function fmtRestante(endsAt: number | null | undefined, now: number): string | null {
  if (!endsAt || endsAt <= now) return null;
  const s = Math.floor((endsAt - now) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

const KIND_ICON: Record<MarketKind, typeof Gavel> = {
  leilao: Gavel, produto: ShoppingBag, alienacao: KeyRound,
  sorteio: Gift, jogo: Gamepad2, concurso: Trophy,
};

const KIND_COLOR: Record<MarketKind, string> = {
  leilao: "bg-orange-500/15 text-orange-300 border-orange-400/25",
  produto: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/25",
  alienacao: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
  sorteio: "bg-violet-500/15 text-violet-300 border-violet-400/25",
  jogo: "bg-lime-500/15 text-lime-300 border-lime-400/25",
  concurso: "bg-yellow-500/15 text-yellow-300 border-yellow-400/25",
};

// ── cartão do marketplace ──────────────────────────────────────────────────

function MarketCard({ item, now }: { item: MarketItem; now: number }) {
  const KindIcon = KIND_ICON[item.kind];
  const restante = fmtRestante(item.endsAt, now);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      data-testid="market-card"
      data-kind={item.kind}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur transition-colors hover:border-white/25"
    >
      <Link to={item.href} className="flex h-full flex-col">
        {/* mídia */}
        <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-5xl">{item.emoji}</div>
          )}
          {/* tipo */}
          <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${KIND_COLOR[item.kind]}`}>
            <KindIcon className="h-3 w-3" /> {kindLabel(item.kind)}
          </span>
          {/* desconto */}
          {item.discountPct != null && item.discountPct > 0 && (
            <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-black text-white shadow-lg shadow-rose-500/30" data-testid="market-discount">
              −{item.discountPct}%
            </span>
          )}
          {/* urgência */}
          {restante && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur" data-testid="market-countdown">
              <Clock className="h-3 w-3 text-amber-400" /> {restante}
            </span>
          )}
        </div>

        {/* conteúdo */}
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="line-clamp-2 text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="line-clamp-1 text-xs text-zinc-400">{item.subtitle}</p>
          )}
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div>
              {item.price > 0 ? (
                <>
                  {item.oldPrice && item.oldPrice > item.price && (
                    <span className="mr-1.5 text-[11px] text-zinc-500 line-through">{formatMZN(item.oldPrice)}</span>
                  )}
                  <span className="text-base font-black text-white">{formatMZN(item.price)}</span>
                </>
              ) : (
                <span className="text-sm font-black text-emerald-400">Grátis</span>
              )}
              {item.meta && <span className="block truncate text-[10px] text-zinc-500">{item.meta}</span>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] text-zinc-500">
              {item.verified && (
                <span className="inline-flex items-center gap-0.5 text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> Verificado
                </span>
              )}
              {(item.views != null && item.views > 0) && (
                <span className="inline-flex items-center gap-0.5">
                  <Eye className="h-3 w-3" /> {item.views.toLocaleString("pt-PT")}
                </span>
              )}
              {item.location && (
                <span className="inline-flex max-w-[110px] items-center gap-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{item.location}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── página ─────────────────────────────────────────────────────────────────

export default function Marketplace() {
  useSEO({
    title: "Marketplace Bateu — Leilões, Produtos, Alienação e Sorteios",
    description: "O mercado unificado da Bateu: leilões ao vivo, produtos em prestações, alienação, sorteios premium e jogos. Busca instantânea, flash deals reais e confiança verificada.",
    canonicalPath: "/marketplace",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [cat, setCat] = useState<CatFilter>("all");
  const [sort, setSort] = useState<MarketSort>("urgente");

  /* compatibilidade com links antigos: ?tab= e ?filter= */
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "raffles") setCat("sorteio");
    else if (tab === "contests") setCat("concurso");
    else if (tab === "games") setCat("jogo");
    else if (tab === "all") setCat("all");
    const filter = searchParams.get("filter");
    switch (filter) {
      case "trending": setSort("popular"); break;
      case "new": setSort("recente"); break;
      case "ending": setSort("urgente"); break;
      case "cheap": setSort("barato"); setCat("sorteio"); break;
      case "premium": setSort("desconto"); break;
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    const d = await getMarketplaceData();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const off = subscribeMarketChanges(load);
    return off;
  }, [load]);

  const now = useNow(!!data && data.flashDeals.length > 0);

  const hasUrgent = !!data && data.flashDeals.length > 0;
  const hero = useMemo<MarketItem | null>(() => {
    if (!data) return null;
    return (
      data.flashDeals[0] ??
      data.leiloesDestaque[0] ??
      [...data.items].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0] ??
      null
    );
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = searchMarket(data.items, q);
    if (cat !== "all") list = list.filter((i) => i.kind === cat);
    return sortMarket(list, sort);
  }, [data, q, cat, sort]);

  const counts = data?.counts;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* ═══ cabeçalho do mercado ═══ */}
      <header className="border-b border-white/10 bg-gradient-to-b from-zinc-900/80 to-transparent">
        <div className="mx-auto max-w-6xl px-4 pb-4 pt-8">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400">Marketplace Bateu</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">
              Um mercado. <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">Tudo dentro.</span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Leilões ao vivo, produtos em prestações, alienação, sorteios premium e jogos — com busca instantânea, flash deals reais e vendedores verificados.
            </p>
          </motion.div>

          {/* busca instantânea */}
          <div className="relative mt-4" data-testid="market-search">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-[18px] -translate-y-1/2 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar em tudo: iPhone, leilão de viatura, bilhete de sorteio…"
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-white placeholder-zinc-500 outline-none backdrop-blur transition-colors focus:border-cyan-400/50 focus:bg-white/[0.07]"
              aria-label="Procurar no marketplace"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                aria-label="Limpar pesquisa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* categorias com contadores reais */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="market-cats" role="tablist" aria-label="Categorias do mercado">
            {CATS.map((c) => {
              const Icon = c.icon;
              const n = c.id === "all" ? (data?.items.length ?? 0) : (counts?.[c.id as MarketKind] ?? 0);
              const activeCat = cat === c.id;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={activeCat}
                  onClick={() => setCat(c.id)}
                  data-testid={`market-cat-${c.id}`}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                    activeCat
                      ? `border-transparent bg-gradient-to-r ${c.accent} text-white shadow-lg`
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c.label}
                  {!loading && <span className={`rounded-full px-1.5 text-[10px] ${activeCat ? "bg-white/20" : "bg-white/10"}`}>{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        {/* ═══ HERO: o destaque do momento ═══ */}
        {hero && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mt-5 overflow-hidden rounded-3xl border border-white/10"
            data-testid="market-hero"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-fuchsia-500/10 to-amber-500/10" />
            <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-8 md:p-8">
              <div className="grid h-40 w-full shrink-0 place-items-center overflow-hidden rounded-2xl bg-black/30 text-7xl md:h-44 md:w-64">
                {hero.image ? (
                  <img src={hero.image} alt={hero.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span>{hero.emoji}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
                    <Flame className="h-3 w-3" /> Em destaque agora
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${KIND_COLOR[hero.kind]}`}>
                    {kindLabel(hero.kind)}
                  </span>
                  {hero.countdown && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300" data-testid="market-hero-countdown">
                      <Zap className="h-3 w-3" /> termina em {hero.countdown}
                    </span>
                  )}
                </div>
                <h2 className="line-clamp-2 text-xl font-black text-white md:text-2xl">{hero.title}</h2>
                {hero.subtitle && <p className="mt-1 text-sm text-zinc-400">{hero.subtitle}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-2xl font-black text-white">{hero.price > 0 ? formatMZN(hero.price) : "Grátis"}</span>
                  {hero.oldPrice && hero.oldPrice > hero.price && (
                    <span className="text-sm text-zinc-500 line-through">{formatMZN(hero.oldPrice)}</span>
                  )}
                  {hero.discountPct != null && hero.discountPct > 0 && (
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-black text-white">−{hero.discountPct}%</span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={hero.href}
                    data-testid="market-hero-cta"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-500/25 transition-transform hover:scale-[1.03]"
                  >
                    <Zap className="h-4 w-4" /> {hero.kind === "leilao" ? "Dar lance agora" : "Ver agora"}
                  </Link>
                  <button
                    onClick={() => { setCat(hero.kind); document.getElementById("market-grid-sec")?.scrollIntoView({ behavior: "smooth" }); }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white backdrop-blur hover:border-white/30"
                  >
                    Ver mais {kindLabel(hero.kind).toLowerCase()}s
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ═══ FLASH DEALS ═══ */}
        {hasUrgent && (
          <section className="mt-8" data-testid="market-flash">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-400" />
              <h2 className="text-lg font-black tracking-tight text-white md:text-xl">Flash deals</h2>
              <span className="text-[11px] text-zinc-500">· os que acabam primeiro, atualizado ao vivo</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {data!.flashDeals.map((d) => {
                const restante = fmtRestante(d.endsAt, now);
                return (
                  <Link
                    key={d.id}
                    to={d.href}
                    data-testid="market-flash-item"
                    className="group relative w-44 shrink-0 overflow-hidden rounded-2xl border border-rose-400/20 bg-white/[0.04] p-3 backdrop-blur transition-colors hover:border-rose-400/50"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-3xl">{d.emoji}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-black text-amber-300" data-testid="flash-countdown">
                        <Clock className="h-3 w-3" /> {restante ?? "a fechar"}
                      </span>
                    </div>
                    <h3 className="line-clamp-1 text-xs font-bold text-white">{d.title}</h3>
                    <p className="mt-0.5 text-sm font-black text-rose-300">
                      {d.price > 0 ? formatMZN(d.price) : "Grátis"}
                      {d.discountPct != null && d.discountPct > 0 && (
                        <span className="ml-1.5 rounded bg-rose-500 px-1 text-[10px] font-black text-white">−{d.discountPct}%</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">{kindLabel(d.kind)}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ grelha com ordenação ═══ */}
        <section className="mt-8" id="market-grid-sec" data-testid="market-grid-sec">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-white md:text-xl">
              <LayoutGrid className="h-5 w-5 text-cyan-400" />
              {cat === "all" ? "Explorar o mercado" : CATS.find((c) => c.id === cat)?.label}
              {!loading && <span className="text-xs font-bold text-zinc-500">· {filtered.length} {filtered.length === 1 ? "item" : "itens"}</span>}
            </h2>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as MarketSort)}
                data-testid="market-sort"
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-bold text-white outline-none backdrop-blur focus:border-cyan-400/50"
                aria-label="Ordenar por"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-zinc-900">{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center"
              data-testid="market-empty"
            >
              <span className="mb-3 text-5xl">🛒</span>
              <h3 className="text-lg font-black text-white">
                {q ? `Nada encontrado para “${q}”` : "O mercado está a abrir as portas"}
              </h3>
              <p className="mt-1 max-w-md text-sm text-zinc-400">
                {q
                  ? "Tenta outra palavra ou explora as categorias — há leilões, produtos e sorteios à tua espera."
                  : "Assim que houver leilões, produtos, alienação ou sorteios publicados, aparecem aqui na hora."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => { setQ(""); setCat("all"); }}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:border-white/30"
                >
                  Ver tudo
                </button>
                <button
                  onClick={() => navigate("/leiloes")}
                  className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-300 hover:border-orange-400/60"
                >
                  🔨 Leilões
                </button>
                <button
                  onClick={() => navigate("/prestacoes")}
                  className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-xs font-bold text-fuchsia-300 hover:border-fuchsia-400/60"
                >
                  🛍️ Produtos
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" data-testid="market-grid">
              <AnimatePresence initial={false}>
                {filtered.map((item) => (
                  <MarketCard key={item.id} item={item} now={now} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ═══ baralho de confiança ═══ */}
        <section className="mt-10 grid gap-3 sm:grid-cols-3" data-testid="market-trust">
          {[
            { icon: ShieldCheck, title: "Vendedores verificados", desc: "Identidade e reputação confirmadas pela Bateu antes de vender." },
            { icon: Gavel, title: "Leilões com anti-snipe", desc: "Lances nos últimos segundos estendem o leilão — ninguém ganha por sorrateiro." },
            { icon: Eye, title: "Tudo transparente", desc: "Histórico de lances, visualizações e estado do item visíveis para todos." },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
            >
              <t.icon className="mb-2 h-6 w-6 text-cyan-400" />
              <h3 className="text-sm font-black text-white">{t.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{t.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* ═══ atividade ao vivo do mercado ═══ */}
        <section className="mt-10">
          <ActivityFeed limit={4} testId="market-activity" />
        </section>

        {/* ═══ CTA vender ═══ */}
        <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-fuchsia-500/10 p-6 md:p-8" data-testid="market-sell-cta">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-white md:text-2xl">Tens algo para vender ou leiloar?</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Publica no marketplace da Bateu: leilões com lances ao vivo, produtos em prestações e visibilidade para milhares de utilizadores.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to="/negocios"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-[1.03]"
              >
                <ShoppingBag className="h-4 w-4" /> Ser vendedor
              </Link>
              <Link
                to="/leiloes"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:border-white/30"
              >
                <Gavel className="h-4 w-4" /> Leiloar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
