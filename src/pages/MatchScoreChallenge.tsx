import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchLiveScores, fetchFixturesByDate, type LiveMatch } from "@/lib/football-api";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { awardEngagementPoints } from "@/lib/awardEngagement";
import { toast } from "sonner";

export default function MatchScoreChallenge() {
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let live = await fetchLiveScores();
        const upcoming = live.filter((m) => m.homeScore == null);
        if (upcoming.length > 0) {
          setMatch(upcoming[0]);
        } else {
          const today = await fetchFixturesByDate();
          setMatch(today.find((m) => m.homeScore == null) || today[0] || null);
        }
      } catch {
        toast.error("Erro ao carregar próximo jogo");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submit = async () => {
    if (!user) {
      toast.error("Faça login para participar");
      return;
    }
    if (home === "" || away === "") {
      toast.error("Indique ambos os resultados");
      return;
    }
    setSubmitted(true);
    if (region?.id) {
      await awardEngagementPoints(region.id, "prediction_made", `score-challenge-${match?.id}`);
      toast.success("Previsão registada! +5 pontos de engagement");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Link to="/jogos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar aos jogos
        </Link>

        <div className="text-center mb-8">
          <Target className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold">Desafio de Resultado</h1>
          <p className="text-muted-foreground mt-2">Preveja o resultado exacto do próximo jogo</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : !match ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Sem jogos disponíveis.</CardContent></Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">{match.homeTeam} vs {match.awayTeam}</CardTitle>
              {match.league && <p className="text-center text-sm text-muted-foreground">{match.league}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              {submitted ? (
                <p className="text-center text-green-600 font-medium">
                  Previsão: {home} - {away} registada! Boa sorte!
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{match.homeTeam}</Label>
                      <Input type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)} />
                    </div>
                    <div>
                      <Label>{match.awayTeam}</Label>
                      <Input type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={submit}>Submeter previsão</Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
