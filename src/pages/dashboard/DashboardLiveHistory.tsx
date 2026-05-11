import { useEffect, useMemo, useState } from "react";
import { Trophy, Download, FileText, Trash2, Radio, Calendar, Users, Gamepad2, ListOrdered } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  readHistory, clearHistory, exportSessionsCSV, downloadCSV, printSessionsPDF, LiveSession,
  aggregateByGame, exportGameAggregateCSV, printGameAggregatePDF,
} from "@/lib/liveHistory";

const DashboardLiveHistory = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [filter, setFilter] = useState("");
  const [view, setView] = useState<"sessions" | "games">("sessions");

  useEffect(() => { document.title = "Histórico de Lives · Dashboard | Bateu"; setSessions(readHistory()); }, []);

  const filtered = useMemo(() => {
    if (!filter) return sessions;
    const q = filter.toLowerCase();
    return sessions.filter((s) =>
      s.code.toLowerCase().includes(q) ||
      (s.activeGame || "").toLowerCase().includes(q) ||
      s.winners.some((w) => w.name.toLowerCase().includes(q))
    );
  }, [sessions, filter]);

  const totals = useMemo(() => ({
    lives: sessions.length,
    players: new Set(sessions.flatMap((s) => s.leaderboard.map((e) => e.name))).size,
    plays: sessions.reduce((a, s) => a + s.leaderboard.length, 0),
    winners: sessions.reduce((a, s) => a + s.winners.length, 0),
  }), [sessions]);

  const aggregates = useMemo(() => aggregateByGame(filtered), [filtered]);

  const onExportCSV = () => {
    if (view === "games") {
      if (!aggregates.length) return;
      downloadCSV(`bateu-ranking-jogos-${Date.now()}.csv`, exportGameAggregateCSV(aggregates));
      toast({ title: "CSV exportado", description: `${aggregates.length} jogo(s)` });
      return;
    }
    if (!filtered.length) return;
    downloadCSV(`bateu-lives-${Date.now()}.csv`, exportSessionsCSV(filtered));
    toast({ title: "CSV exportado", description: `${filtered.length} live(s)` });
  };
  const onPDF = () => {
    if (view === "games") {
      if (!aggregates.length) return;
      printGameAggregatePDF(aggregates);
      return;
    }
    if (!filtered.length) return;
    printSessionsPDF(filtered);
  };
  const onClear = () => {
    if (!confirm("Apagar todo o histórico de lives?")) return;
    clearHistory(); setSessions([]);
    toast({ title: "Histórico limpo" });
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/5 p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold mb-2">
              <Radio className="h-3.5 w-3.5" /> HISTÓRICO DE LIVES
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Vencedores e Rankings por Live</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Cada live encerrada é guardada aqui com o ranking completo. Exporte para CSV ou PDF para partilhar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onExportCSV} disabled={!filtered.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
            <button onClick={onPDF} disabled={!filtered.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium disabled:opacity-50">
              <FileText className="h-4 w-4" /> Exportar PDF
            </button>
            <button onClick={onClear} disabled={!sessions.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-medium disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Limpar
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Radio, label: "Lives realizadas", value: totals.lives },
          { icon: Users, label: "Jogadores únicos", value: totals.players },
          { icon: Trophy, label: "Vencedores", value: totals.winners },
          { icon: Calendar, label: "Jogadas totais", value: totals.plays },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <s.icon className="h-4 w-4 text-primary mb-2" />
            <p className="font-display text-2xl font-bold">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs font-bold">
          <button onClick={() => setView("sessions")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${view === "sessions" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <ListOrdered className="h-3.5 w-3.5" /> Por Live
          </button>
          <button onClick={() => setView("games")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${view === "games" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Gamepad2 className="h-3.5 w-3.5" /> Por Jogo
          </button>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por código, jogo ou vencedor…"
          className="flex-1 px-4 py-2.5 rounded-full bg-card border border-border text-sm"
        />
      </div>

      {view === "games" ? (
        aggregates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center">
            <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Sem dados agregados ainda. Encerre uma live com participantes para ver o ranking por jogo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {aggregates.map((g) => {
              const top = g.topPlayers.slice(0, 10);
              return (
                <article key={g.game} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-secondary/40 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm">{g.game}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                        {g.livesCount} live(s)
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {g.uniquePlayers} jogador(es) · {g.plays} jogada(s) · {g.totalScore} pts totais
                    </div>
                  </header>
                  <div className="p-5">
                    {top.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem participantes.</p>
                    ) : (
                      <ol className="space-y-1.5">
                        {top.map((p, i) => (
                          <li key={p.name} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 truncate">
                              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${i === 0 ? "bg-yellow-400 text-black" : "bg-muted text-muted-foreground"}`}>
                                {i + 1}
                              </span>
                              <span className="truncate">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground">· {p.plays} jogada(s)</span>
                            </span>
                            <span className="font-bold text-primary">{p.score}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Ainda sem lives no histórico. Inicie uma no <Link to="/lives" className="text-primary underline">Live Hub</Link> e encerre-a quando terminar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
            const top = [...s.leaderboard].sort((a, b) => b.score - a.score).slice(0, 5);
            return (
              <article key={s.code + s.startedAt} className="rounded-2xl border border-border bg-card overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-secondary/40 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary">#{s.code}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(s.startedAt).toLocaleString("pt-PT")} · {Math.max(1, Math.round(s.durationSec / 60))} min
                    </span>
                    {s.activeGame && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                        {s.activeGame}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.leaderboard.length} jogada(s) · {s.winners.length} vencedor(es)
                  </div>
                </header>
                <div className="p-5 grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Vencedores</h4>
                    {s.winners.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem vencedores anunciados.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {s.winners.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Trophy className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />
                            <div>
                              <p className="font-medium">{w.name}</p>
                              {w.meta && <p className="text-[11px] text-muted-foreground">{w.meta}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Top 5 ranking</h4>
                    {top.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem participantes.</p>
                    ) : (
                      <ol className="space-y-1">
                        {top.map((e, i) => (
                          <li key={e.id} className="flex items-center justify-between text-sm">
                            <span className="truncate">
                              <span className="text-muted-foreground mr-2">{i + 1}.</span>{e.name}
                              <span className="text-[10px] text-muted-foreground ml-2">{e.game}</span>
                            </span>
                            <span className="font-bold text-primary">{e.score}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardLiveHistory;
