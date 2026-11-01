import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy,
  WifiOff,
  RefreshCw,
  Timer,
  CircleDot,
  CalendarDays,
  BarChart3,
  Ticket,
  ShieldAlert,
  Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateWallet } from "@/lib/esports-advanced";
import {
  SPORT_LEAGUES,
  SPORTS_ATTRIBUTION,
  currentRoundHint,
  currentSeason,
  deriveStatus,
  formatKickoff,
  getRound,
  getStandings,
  isPredictable,
  leagueById,
  type DerivedStatus,
  type SportEvent,
  type SportLeague,
  type SportStanding,
} from "@/lib/sports";
import {
  PICK_LABELS,
  STAKE_MAX,
  STAKE_MIN,
  getMyPredictions,
  getPoolStats,
  placeSportPrediction,
  poolShares,
  type PredictionPoolStats,
  type SportPick,
  type SportPrediction,
} from "@/lib/sportPredictions";

type TabKey = "partidas" | "resultados" | "top5" | "palpites";

const STATUS_META: Record<DerivedStatus, { label: string; cls: string }> = {
  NS: { label: "Agendado", cls: "bg-secondary text-secondary-foreground" },
  LIVE: { label: "A decorrer", cls: "bg-red-500/15 text-red-500 border border-red-500/30" },
  HT: { label: "Intervalo", cls: "bg-amber-500/15 text-amber-500 border border-amber-500/30" },
  FT: { label: "Fim", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
  POSTP: { label: "Adiado", cls: "bg-secondary text-muted-foreground" },
};

export default function DesportoHub() {
  useSEO({
    title: "Desporto — Partidas, resultados e palpites",
    description:
      "Jornadas, resultados e classificação reais das grandes ligas (Premier League, La Liga, Champions, NBA) + palpites parimutuel entre jogadores na Bateu.",
    canonicalPath: "/desporto",
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const [league, setLeague] = useState<SportLeague>(SPORT_LEAGUES[0]);
  const season = useMemo(() => currentSeason(), []);
  const [round, setRound] = useState<number | null>(null);
  const [roundLocked, setRoundLocked] = useState(true); // true = hint automático
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [standings, setStandings] = useState<SportStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("partidas");

  // palpites
  const [myPredictions, setMyPredictions] = useState<SportPrediction[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pickEvent, setPickEvent] = useState<SportEvent | null>(null);
  const [pick, setPick] = useState<SportPick | null>(null);
  const [stake, setStake] = useState<string>("25");
  const [pool, setPool] = useState<PredictionPoolStats | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const liveTick = useRef(0);

  const loadRound = useCallback(
    async (lg: SportLeague, r: number, fresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const list = await getRound(lg.id, season, r, { fresh });
        setEvents(list);
        setError(null);
      } catch {
        setError("Não foi possível carregar a jornada. Verifica a ligação e tenta de novo.");
      } finally {
        setLoading(false);
      }
    },
    [season],
  );

  // Pista da jornada atual a partir da classificação (jogos disputados + 1)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRound(null);
    getStandings(league.id, season)
      .then((table) => {
        if (cancelled) return;
        setStandings(table);
        const hint = currentRoundHint(table) ?? 1;
        setRound(hint);
        setRoundLocked(true);
        loadRound(league, hint);
      })
      .catch(() => {
        if (cancelled) return;
        setRound(1);
        setRoundLocked(true);
        loadRound(league, 1);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.id, season]);

  // Poll honesto: só refresca (fresh) se houver jogo a decorrer e a página estiver visível
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden || round == null || roundLocked) return;
      const anyLive = events.some((e) => deriveStatus(e) === "LIVE" || deriveStatus(e) === "HT");
      liveTick.current += 1;
      if (anyLive && liveTick.current % 2 === 0) loadRound(league, round, true);
    }, 60_000);
    return () => clearInterval(id);
  }, [events, league, round, roundLocked, loadRound]);

  const loadMyPredictions = useCallback(() => {
    if (!user) {
      setMyPredictions([]);
      return;
    }
    getMyPredictions(user.id).then(setMyPredictions);
    getOrCreateWallet(user.id)
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(null));
  }, [user]);

  useEffect(loadMyPredictions, [loadMyPredictions]);

  const openPalpite = async (ev: SportEvent) => {
    if (!user) {
      toast.info("Inicia sessão para palpitar", { description: "O palpite usa a tua carteira de jogo." });
      navigate("/login");
      return;
    }
    setPickEvent(ev);
    setPick(null);
    setStake("25");
    setPool(null);
    getPoolStats(ev.id).then(setPool);
  };

  const submitPalpite = async () => {
    if (!user || !pickEvent || !pick) return;
    const value = parseInt(stake, 10);
    if (Number.isNaN(value) || value < STAKE_MIN || value > STAKE_MAX) {
      toast.error(`Aposta entre ${STAKE_MIN} e ${STAKE_MAX} moedas`);
      return;
    }
    setSubmitting(true);
    const res = await placeSportPrediction({ userId: user.id, ev: pickEvent, pick, stake: value });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Palpite registado!", {
        description: `${PICK_LABELS[pick]} · ${value} moedas em escrow até ao apuramento.`,
      });
      setPickEvent(null);
      loadMyPredictions();
    } else {
      toast.error(res.error);
    }
  };

  const refresh = () => {
    if (round != null) loadRound(league, round, true);
  };

  const changeRound = (delta: number) => {
    if (round == null) return;
    const next = Math.max(1, round + delta);
    setRound(next);
    setRoundLocked(false);
    loadRound(league, next);
  };

  const byKickoff = (a: SportEvent, b: SportEvent) =>
    new Date(a.kickoff || 0).getTime() - new Date(b.kickoff || 0).getTime();

  const now = new Date();
  const upcoming = events.filter((e) => deriveStatus(e) === "NS").sort(byKickoff);
  const live = events.filter((e) => ["LIVE", "HT"].includes(deriveStatus(e))).sort(byKickoff);
  const finished = events.filter((e) => deriveStatus(e) === "FT").sort(byKickoff);
  const predictable = upcoming.filter((e) => isPredictable(e, now));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 pt-24 lg:pt-32 pb-16">
        {/* Cabeçalho */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Desporto</h1>
              <p className="text-xs text-muted-foreground">
                Partidas, resultados e classificação reais · {SPORTS_ATTRIBUTION}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Seletor de liga */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none" data-testid="desporto-leagues">
          {SPORT_LEAGUES.map((lg) => (
            <button
              key={lg.id}
              onClick={() => setLeague(lg)}
              className={
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all border " +
                (lg.id === league.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary")
              }
            >
              {lg.name}
            </button>
          ))}
        </div>

        {/* Jornada */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => changeRound(-1)} disabled={round == null || round <= 1} aria-label="Jornada anterior">
              ←
            </Button>
            <div className="text-sm font-semibold px-2" data-testid="desporto-round">
              {round == null ? "Jornada…" : roundLocked ? `Jornada ${round} (atual)` : `Jornada ${round}`}
            </div>
            <Button variant="outline" size="sm" onClick={() => changeRound(1)} disabled={round == null} aria-label="Próxima jornada">
              →
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={refresh} data-testid="desporto-refresh">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="partidas" className="gap-1"><CalendarDays className="h-3.5 w-3.5" /> Partidas</TabsTrigger>
            <TabsTrigger value="resultados" className="gap-1"><Timer className="h-3.5 w-3.5" /> Resultados</TabsTrigger>
            <TabsTrigger value="top5" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Top 5</TabsTrigger>
            <TabsTrigger value="palpites" className="gap-1"><Ticket className="h-3.5 w-3.5" /> Meus</TabsTrigger>
          </TabsList>

          {/* PARTIDAS (jornada atual) */}
          <TabsContent value="partidas">
            {error ? (
              <ErrorState message={error} onRetry={refresh} />
            ) : loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : (
              <>
                {live.length > 0 && (
                  <section className="mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-wide text-red-500 mb-2 flex items-center gap-1.5">
                      <CircleDot className="h-3.5 w-3.5 animate-pulse" /> A decorrer agora
                    </h2>
                    {live.map((ev) => <MatchRow key={ev.id} ev={ev} onPick={openPalpite} />)}
                  </section>
                )}
                <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Próximas partidas
                </h2>
                {upcoming.length === 0 && live.length === 0 ? (
                  <EmptyState message="Sem partidas agendadas nesta jornada." />
                ) : (
                  upcoming.map((ev) => <MatchRow key={ev.id} ev={ev} onPick={openPalpite} />)
                )}
                {predictable.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Palpite social: quem acertar divide 95% do prémio total, proporcional ao valor apostado.
                      Palpites fecham ao apito inicial.
                    </span>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* RESULTADOS (jogos já com placar na jornada) */}
          <TabsContent value="resultados">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : finished.length === 0 ? (
              <EmptyState message="Ainda sem resultados publicados nesta jornada." />
            ) : (
              finished.map((ev) => <MatchRow key={ev.id} ev={ev} onPick={openPalpite} />)
            )}
          </TabsContent>

          {/* TOP 5 */}
          <TabsContent value="top5">
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                O plano gratuito da fonte publica o Top 5 da classificação — mostramos exatamente isso,
                sem inventar o resto. Formas recentes: <span className="text-emerald-500 font-semibold">V</span> vitória,{" "}
                <span className="text-amber-500 font-semibold">E</span> empate, <span className="text-red-500 font-semibold">D</span> derrota.
              </span>
            </div>
            {standings.length === 0 ? (
              <EmptyState message="Classificação ainda não disponível para esta temporada." />
            ) : (
              <div className="rounded-xl border overflow-hidden" data-testid="desporto-table">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2.5 pl-3 text-left font-semibold w-10">#</th>
                      <th className="py-2.5 text-left font-semibold">Equipa</th>
                      <th className="py-2.5 text-center font-semibold">J</th>
                      <th className="py-2.5 text-center font-semibold">V</th>
                      <th className="py-2.5 text-center font-semibold">E</th>
                      <th className="py-2.5 text-center font-semibold">D</th>
                      <th className="py-2.5 text-center font-semibold hidden sm:table-cell">GM</th>
                      <th className="py-2.5 text-center font-semibold hidden sm:table-cell">GS</th>
                      <th className="py-2.5 pr-3 text-center font-semibold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr key={s.teamId} className="border-t">
                        <td className="py-2.5 pl-3 font-bold tabular-nums">{s.rank}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            {s.badge && <img src={s.badge} alt="" className="h-5 w-5 object-contain" loading="lazy" />}
                            <span className="font-medium">{s.team}</span>
                            <span className="hidden sm:flex gap-0.5 ml-1">
                              {s.form.slice(-5).split("").map((f, i) => (
                                <span
                                  key={i}
                                  className={
                                    "h-1.5 w-1.5 rounded-full " +
                                    (f === "W" ? "bg-emerald-500" : f === "L" ? "bg-red-500" : f === "D" ? "bg-amber-500" : "bg-muted-foreground/30")
                                  }
                                />
                              ))}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center tabular-nums">{s.played}</td>
                        <td className="py-2.5 text-center tabular-nums">{s.win}</td>
                        <td className="py-2.5 text-center tabular-nums">{s.draw}</td>
                        <td className="py-2.5 text-center tabular-nums">{s.loss}</td>
                        <td className="py-2.5 text-center tabular-nums hidden sm:table-cell">{s.goalsFor}</td>
                        <td className="py-2.5 text-center tabular-nums hidden sm:table-cell">{s.goalsAgainst}</td>
                        <td className="py-2.5 pr-3 text-center font-bold tabular-nums">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* MEUS PALPITES */}
          <TabsContent value="palpites">
            {!user ? (
              <EmptyState message="Inicia sessão para ver e fazer palpites." />
            ) : myPredictions.length === 0 ? (
              <EmptyState message="Ainda sem palpites. Escolhe uma partida na aba Partidas." />
            ) : (
              <div className="space-y-2">
                {myPredictions.map((p) => (
                  <div key={p.id} className="rounded-xl border p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.event_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {leagueById(p.league_id)?.name ?? p.league_name} · {formatKickoff(p.kickoff_at)} · escolha{" "}
                        <span className="font-semibold text-foreground">{PICK_LABELS[p.pick]}</span> · {p.stake} moedas
                      </div>
                    </div>
                    <StatusBadge p={p} />
                  </div>
                ))}
                <div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground mt-3">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    O apuramento é automático com os resultados oficiais da fonte, 2h após o jogo.
                    Partida adiada = reembolso total.
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          {SPORTS_ATTRIBUTION} · Sem minuto-a-minuto ao vivo no plano gratuito — o estado é derivado dos dados e do relógio, nunca inventado. · 18+
        </p>
      </div>

      {/* Modal de palpite */}
      <Dialog open={!!pickEvent} onOpenChange={(o) => !o && setPickEvent(null)}>
        <DialogContent className="max-w-md" data-testid="palpite-modal">
          {pickEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Palpite — {pickEvent.name}</DialogTitle>
                <DialogDescription>
                  {formatKickoff(pickEvent.kickoff)} · encerra ao apito inicial
                </DialogDescription>
              </DialogHeader>

              {/* Distribuição do pool (prova social real) */}
              <div className="grid grid-cols-3 gap-2">
                {(["home", "draw", "away"] as SportPick[]).map((k) => {
                  const shares = poolShares(pool);
                  const pct = shares[k];
                  return (
                    <button
                      key={k}
                      onClick={() => setPick(k)}
                      data-testid={`pick-${k}`}
                      className={
                        "rounded-xl border p-2.5 text-center transition-all " +
                        (pick === k ? "border-primary bg-primary/10 shadow-sm" : "hover:bg-secondary/60")
                      }
                    >
                      <div className="text-xs font-semibold">{PICK_LABELS[k]}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {pool ? `${pool[`picks_${k}` as keyof PredictionPoolStats] as number} palpites` : "—"}
                      </div>
                      <div className="h-1 rounded-full bg-secondary mt-1.5 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Valor (moedas de jogo) — saldo: {walletBalance ?? "…"}
                </label>
                <Input
                  type="number"
                  min={STAKE_MIN}
                  max={STAKE_MAX}
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  data-testid="palpite-stake"
                />
                <div className="flex gap-1.5 mt-2">
                  {[10, 25, 50, 100].map((v) => (
                    <Button key={v} variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => setStake(String(v))}>
                      {v}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-secondary/50 p-3 text-[11px] text-muted-foreground leading-relaxed">
                Prémio total: <b>{pool ? `${pool.pool_total} moedas` : "a formar"}</b> · os acertadores dividem 95%
                proporcionalmente à aposta (5% taxa da plataforma). Partida adiada = reembolso integral.
                Apuramento automático pelo resultado oficial. 18+ — jogue com responsabilidade.
              </div>

              <Button className="w-full" disabled={!pick || submitting} onClick={submitPalpite} data-testid="palpite-submit">
                {submitting ? "A registar…" : !pick ? "Escolhe o teu palpite" : `Confirmar palpite (${stake || 0} moedas)`}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

// ── Componentes locais ──────────────────────────────────────────────────

function StatusBadge({ p }: { p: SportPrediction }) {
  const map = {
    open: { label: "Em jogo", cls: "bg-secondary text-secondary-foreground" },
    won: { label: `+${p.payout}`, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    lost: { label: "Perdido", cls: "bg-red-500/10 text-red-500" },
    void: { label: "Reembolsado", cls: "bg-amber-500/10 text-amber-600" },
  } as const;
  const m = map[p.status] ?? map.open;
  return <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold " + m.cls}>{m.label}</span>;
}

function MatchRow({ ev, onPick }: { ev: SportEvent; onPick: (ev: SportEvent) => void }) {
  const st = deriveStatus(ev);
  const meta = STATUS_META[st];
  const canPick = isPredictable(ev);
  return (
    <div className="rounded-xl border p-3.5 mb-2 flex items-center gap-3 hover:bg-secondary/30 transition-colors" data-testid={`match-${ev.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          {ev.homeBadge && <img src={ev.homeBadge} alt="" className="h-5 w-5 object-contain" loading="lazy" />}
          <span className="truncate">{ev.home}</span>
          {st === "FT" || st === "LIVE" ? (
            ev.homeScore != null ? (
              <span className="font-bold tabular-nums">{ev.homeScore}</span>
            ) : st === "LIVE" ? (
              <span className="text-xs text-red-500 font-semibold">–</span>
            ) : null
          ) : (
            <span className="text-xs text-muted-foreground">vs</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium mt-1.5">
          {ev.awayBadge && <img src={ev.awayBadge} alt="" className="h-5 w-5 object-contain" loading="lazy" />}
          <span className="truncate">{ev.away}</span>
          {st === "FT" || st === "LIVE" ? (
            ev.awayScore != null ? (
              <span className="font-bold tabular-nums">{ev.awayScore}</span>
            ) : st === "LIVE" ? (
              <span className="text-xs text-red-500 font-semibold">–</span>
            ) : null
          ) : null}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={"inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold " + meta.cls}>
          {st === "LIVE" && <CircleDot className="inline h-3 w-3 mr-1 animate-pulse" />}
          {meta.label}
        </span>
        <div className="text-[11px] text-muted-foreground mt-1">
          {st === "NS" ? formatKickoff(ev.kickoff) : ev.venue ?? ev.leagueName}
        </div>
        {canPick && (
          <Button size="sm" variant="outline" className="h-7 mt-1.5 text-xs" onClick={() => onPick(ev)} data-testid={`palpitar-${ev.id}`}>
            Palpitar
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      <Button variant="outline" size="sm" className="gap-2" onClick={onRetry} data-testid="desporto-retry">
        <RefreshCw className="h-4 w-4" /> Tentar novamente
      </Button>
    </div>
  );
}
