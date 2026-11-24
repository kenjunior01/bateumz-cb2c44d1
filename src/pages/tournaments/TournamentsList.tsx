import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Inbox, HandCoins, Plus, WifiOff, RefreshCw, Zap, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ActivityFeed from "@/components/ActivityFeed";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import TournamentCard from "@/components/tournaments/TournamentCard";
import { getTournaments, type Tournament } from "@/lib/tournaments";
import { torneiosDoAparelho, jogoEsport, type TorneioEsport } from "@/lib/esport";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function TournamentsList() {
  useSEO({ title: 'Torneios', description: 'Participe em torneios competitivos na Bateu. Classificações em tempo real, prémios em dinheiro e competição justa.', canonicalPath: '/tournaments' });
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // v86 E-SPORT: torneios QUE FUNCIONAM AGORA (aparelho, resultados reais)
  const [locais, setLocais] = useState<TorneioEsport[]>([]);

  const loadLocais = () => setLocais(torneiosDoAparelho());

  const load = () => {
    setLoading(true);
    setError(null);
    getTournaments()
      .then((list) => {
        setTournaments(list);
        setError(null);
      })
      .catch(() => setError("Não foi possível carregar os torneios. Verifica a ligação e tenta de novo."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    loadLocais();
  }, []);

  // REA torneios: o que está a acabar primeiro aparece em cima (urgência real)
  const byEndingSoon = (a: Tournament, b: Tournament) =>
    new Date(a.end_date ?? "2999-01-01").getTime() - new Date(b.end_date ?? "2999-01-01").getTime();
  const byStartingSoon = (a: Tournament, b: Tournament) =>
    new Date(a.start_date ?? "2999-01-01").getTime() - new Date(b.start_date ?? "2999-01-01").getTime();

  const active = tournaments.filter((t) => t.status === "active").sort(byEndingSoon);
  const upcoming = tournaments.filter((t) => t.status === "draft").sort(byStartingSoon);
  const completed = tournaments.filter((t) => t.status === "completed");

  const EmptyState = ({ message }: { message: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <Inbox className="h-14 w-14 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </motion.div>
  );

  const ErrorState = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <WifiOff className="h-14 w-14 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium text-muted-foreground mb-4 max-w-sm">{error}</p>
      <Button onClick={load} variant="outline" size="sm" className="gap-2" data-testid="torneios-retry">
        <RefreshCw className="h-4 w-4" /> Tentar novamente
      </Button>
    </motion.div>
  );

  const renderList = (list: Tournament[]) => {
    if (error) return ErrorState;
    if (loading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      );
    }
    if (list.length === 0) {
      return <EmptyState message={t("tournament.no_tournaments")} />;
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((tourn) => (
          <TournamentCard
            key={tourn.id}
            tournament={tourn}
            onClick={() => navigate(`/tournaments/${tourn.id}`)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* v88 DESIGN DESKTOP: pt-24 — a navbar é FIXA e o título nasça SOB ela
          (era py-8 → «Torneios» cortado pelo cabeçalho em qualquer desktop) */}
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">{t("tournament.title")}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href="/negocios">
                  <HandCoins className="h-4 w-4" /> Ganhe dinheiro organizando
                </a>
              </Button>
              <Button asChild size="sm" className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700" data-testid="torneios-criar">
                <a href="/tournaments/criar">
                  <Plus className="h-4 w-4" /> Criar Torneio
                </a>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("tournament.subtitle")}
          </p>
        </motion.div>

        {/* v86 E-SPORT: torneios do APARELHO — funcionam agora, resultados reais */}
        {locais.length > 0 && (
          <div className="mb-8" data-testid="torneios-local-section">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-black uppercase tracking-wide">{t("esport.lista.titulo")}</h2>
              <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-300 border-0 text-[10px]">{locais.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t("esport.lista.sub")}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locais.slice(0, 6).map((lt) => {
                const emp = lt.organizador.tipo === "empresa";
                return (
                  <button
                    key={lt.id}
                    onClick={() => navigate(`/tournaments/${lt.id}`)}
                    className="text-left rounded-xl border-2 p-3 transition-all hover:border-amber-400/60 bg-white/5"
                    style={emp ? { borderColor: `${lt.organizador.cor}66` } : undefined}
                    data-testid={`torneios-local-card-${lt.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg grid place-items-center text-[10px] font-black text-white shrink-0" style={{ background: lt.organizador.cor }}>{lt.organizador.iniciais}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black truncate">{lt.nome}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {emp ? <Building2 className="inline h-3 w-3 mr-0.5 text-sky-400" /> : null}
                          {jogoEsport(lt.jogo)?.label ?? lt.jogo}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                      <span className="text-amber-500">🏆 {lt.premioPontos} {t("esport.local.premioUnit")}</span>
                      <span className="text-muted-foreground">{t(`esport.estado.${lt.estado}`)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Tabs defaultValue="active">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="active">{t("tournament.active")}</TabsTrigger>
            <TabsTrigger value="upcoming">{t("tournament.upcoming")}</TabsTrigger>
            <TabsTrigger value="completed">{t("tournament.completed")}</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {renderList(active)}
          </TabsContent>
          <TabsContent value="upcoming" className="mt-6">
            {renderList(upcoming)}
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            {renderList(completed)}
          </TabsContent>
        </Tabs>

        {/* atividade ao vivo — inscrições e resultados aparecem aqui em tempo real */}
        <div className="mt-10" data-testid="torneios-activity">
          <ActivityFeed limit={4} testId="torneios-activity-feed" />
        </div>
      </div>
      <Footer />
    </div>
  );
}
