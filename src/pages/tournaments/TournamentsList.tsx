import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Inbox, HandCoins, Plus, WifiOff, RefreshCw } from "lucide-react";
import ActivityFeed from "@/components/ActivityFeed";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import TournamentCard from "@/components/tournaments/TournamentCard";
import { getTournaments, type Tournament } from "@/lib/tournaments";
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
      <div className="mx-auto max-w-5xl px-4 py-8">
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
                <a href="/dashboard/tournaments">
                  <Plus className="h-4 w-4" /> Criar Torneio
                </a>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("tournament.subtitle")}
          </p>
        </motion.div>

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
