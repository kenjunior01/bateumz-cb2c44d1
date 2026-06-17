import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchStandings, fetchWorldCupPlayers, findWorldCupLeagueId } from "@/lib/football-api";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { awardEngagementPoints } from "@/lib/awardEngagement";
import { toast } from "sonner";

export default function GoldenBootPredict() {
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<{ name: string; team: string; goals?: number }[]>([]);
  const [pick, setPick] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const leagueId = await findWorldCupLeagueId();
        await fetchStandings(leagueId);
        const list = await fetchWorldCupPlayers();
        setPlayers(list.slice(0, 12).map((p) => ({ name: p.name, team: p.team, goals: p.goals })));
      } catch {
        toast.error("Erro ao carregar dados de artilheiros");
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
    if (!pick.trim()) {
      toast.error("Indique o nome do jogador");
      return;
    }
    setSubmitted(true);
    if (region?.id) {
      await awardEngagementPoints(region.id, "contest_entry", "golden-boot-predict");
      toast.success("Previsão de artilheiro registada! +20 pontos");
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
          <Award className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold">Bota de Ouro — Previsão</h1>
          <p className="text-muted-foreground mt-2">Quem será o melhor marcador do Mundial?</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Card>
            <CardHeader><CardTitle>A sua aposta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {players.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1 mb-2">
                  <p className="font-medium">Referência (top marcadores):</p>
                  {players.slice(0, 5).map((p) => (
                    <p key={p.name}>{p.name} ({p.team}) — {p.goals ?? 0} golos</p>
                  ))}
                </div>
              )}
              {submitted ? (
                <p className="text-center text-green-600">Apostou em <strong>{pick}</strong>. Boa sorte!</p>
              ) : (
                <>
                  <div>
                    <Label>Nome do jogador</Label>
                    <Input placeholder="Ex: Cristiano Ronaldo" value={pick} onChange={(e) => setPick(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={submit}>Confirmar previsão</Button>
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
