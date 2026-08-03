import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Trophy, Sparkles, Loader2, Copy, Check, Share2, ArrowLeft, Users, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchRanking, buildLiveRankingUrl, type AmbassadorRanking } from "@/lib/ambassador";
import { toast } from "sonner";

const PAGE_SIZE = 50;

const LiveAmbassadorsRanking = () => {
  const { liveCode } = useParams<{ liveCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const code = (liveCode || "").toUpperCase();
  const businessFilter = searchParams.get("biz") || "";

  const [ranking, setRanking] = useState<AmbassadorRanking[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const base = buildLiveRankingUrl(code);
    return businessFilter ? `${base}?biz=${encodeURIComponent(businessFilter)}` : base;
  }, [code, businessFilter]);
  const totalVisits = useMemo(() => ranking.reduce((s, r) => s + r.visits, 0), [ranking]);

  const loadPage = useCallback(async (pageIndex: number, append: boolean) => {
    if (pageIndex === 0) setLoading(true); else setLoadingMore(true);
    try {
      const r = await fetchRanking(businessFilter || "", code, {
        limit: PAGE_SIZE,
        offset: pageIndex * PAGE_SIZE,
      });
      setHasMore(r.length === PAGE_SIZE);
      setRanking((prev) => append ? [...prev, ...r] : r);
      setPage(pageIndex);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, [code, businessFilter]);

  // Initial load + auto-refresh of the first page
  useEffect(() => {
    loadPage(0, false);
    const t = setInterval(() => loadPage(0, false), 12000);
    return () => clearInterval(t);
  }, [loadPage]);

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast.success("Link copiado!");
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `Ranking de embaixadores · ${code}`, url: shareUrl }); return; }
      catch { /* fall through */ }
    }
    copy();
  };

  const clearFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("biz");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-background to-amber-50/40 dark:from-emerald-950/20 dark:to-amber-950/20 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Link to="/lives" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>

        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-amber-500 p-6 text-white shadow-xl">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90">
            <Sparkles className="h-3.5 w-3.5" /> Live Ambassadors
          </div>
          <h1 className="font-display text-3xl font-extrabold mt-1">{code || "—"}</h1>
          <p className="text-sm opacity-90 mt-1">
            Ranking público dos convidados gerados pelos embaixadores nesta live.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2">
              <p className="text-[10px] uppercase opacity-80">Ambassadors</p>
              <p className="text-2xl font-extrabold">{ranking.length}{hasMore ? "+" : ""}</p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-2">
              <p className="text-[10px] uppercase opacity-80">Visits únicas</p>
              <p className="text-2xl font-extrabold">{totalVisits}</p>
            </div>
          </div>
        </div>

        {businessFilter && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-xs">
            <span className="font-bold">Filtrado por empresa</span>
            <code className="font-mono text-[10px] truncate flex-1">{businessFilter}</code>
            <button onClick={clearFilter} className="text-[11px] underline">Limpar</button>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-border bg-card p-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-500" />
          <p className="text-[11px] flex-1 font-mono break-all text-muted-foreground">{shareUrl}</p>
          <button onClick={copy} className="px-3 py-1.5 rounded-full bg-secondary text-xs font-bold inline-flex items-center gap-1">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />} Copy
          </button>
          <button onClick={share} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1">
            <Share2 className="h-3 w-3" /> Share
          </button>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="font-display text-sm font-bold flex-1">Top embaixadores</h2>
            <span className="text-[10px] uppercase text-muted-foreground">Atualizado em tempo real</span>
          </div>
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-10 inline-flex items-center gap-2 justify-center w-full">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar ranking…
            </p>
          ) : ranking.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Ainda sem visitas registadas. Sê o primeiro embaixador a partilhar!
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {ranking.map((r, i) => (
                    <motion.li key={r.ambassador_id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="px-4 py-3 flex items-center gap-3">
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold ${
                        i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-slate-300 text-black" :
                        i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{r.display_name || r.ref_code.toUpperCase()}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">#{r.ref_code}</p>
                      </div>
                      <span className="text-lg font-extrabold text-emerald-600">{r.visits}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="p-4 border-t border-border flex items-center justify-center">
                {hasMore ? (
                  <button onClick={() => loadPage(page + 1, true)} disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">
                    {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-3 w-3" />}
                    Carregar mais (+{PAGE_SIZE})
                  </button>
                ) : (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fim do ranking</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAmbassadorsRanking;
