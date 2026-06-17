import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Loader2, Trophy, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchLiveScores, fetchFixturesByDate, type LiveMatch } from "@/lib/football-api";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { awardEngagementPoints } from "@/lib/awardEngagement";
import { toast } from "sonner";

function buildQuestions(matches: LiveMatch[]) {
  if (matches.length === 0) return [];
  const m = matches[Math.floor(Math.random() * matches.length)];
  const questions = [
    {
      id: "1",
      text: `Quem está a jogar em casa no jogo ${m.homeTeam} vs ${m.awayTeam}?`,
      options: [m.homeTeam, m.awayTeam, "Empate", "Nenhum"],
      correct: m.homeTeam,
    },
    {
      id: "2",
      text: `Qual é a equipa visitante em ${m.homeTeam} vs ${m.awayTeam}?`,
      options: [m.homeTeam, m.awayTeam, m.league || "Internacional", "Desconhecido"],
      correct: m.awayTeam,
    },
  ];
  if (m.homeScore != null && m.awayScore != null) {
    questions.push({
      id: "3",
      text: `Qual é o resultado actual de ${m.homeTeam} vs ${m.awayTeam}?`,
      options: [`${m.homeScore}-${m.awayScore}`, `${m.awayScore}-${m.homeScore}`, "0-0", "Adiado"],
      correct: `${m.homeScore}-${m.awayScore}`,
    });
  }
  return questions;
}

export default function FootballLiveQuiz() {
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [questions, setQuestions] = useState<ReturnType<typeof buildQuestions>>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [awarded, setAwarded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let data = await fetchLiveScores();
        if (data.length === 0) data = await fetchFixturesByDate();
        setMatches(data);
        setQuestions(buildQuestions(data));
      } catch {
        toast.error("Erro ao carregar jogos para o quiz");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const q = questions[current];

  const pick = async (option: string) => {
    if (selected || !q) return;
    setSelected(option);
    const correct = option === q.correct;
    if (correct) setScore((s) => s + 1);

    setTimeout(async () => {
      if (current + 1 >= questions.length) {
        setFinished(true);
        if (user && region?.id && correct && !awarded) {
          const res = await awardEngagementPoints(region.id, "contest_entry", "football-live-quiz");
          if (res.success) {
            setAwarded(true);
            toast.success(`Quiz concluído! +${res.pointsAwarded || 20} pontos`);
          }
        }
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
      }
    }, 800);
  };

  const restart = () => {
    setQuestions(buildQuestions(matches));
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
    setAwarded(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/jogos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar aos jogos
        </Link>

        <div className="text-center mb-8">
          <Brain className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold">Quiz Futebol Ao Vivo</h1>
          <p className="text-muted-foreground mt-2">Perguntas geradas a partir de jogos reais da RapidAPI</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : questions.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Sem jogos disponíveis hoje. Tente mais tarde.</CardContent></Card>
        ) : finished ? (
          <Card>
            <CardHeader><CardTitle className="text-center">Resultado: {score}/{questions.length}</CardTitle></CardHeader>
            <CardContent className="text-center space-y-4">
              <Trophy className="h-12 w-12 text-primary mx-auto" />
              <p>{score === questions.length ? "Perfeito! És um expert!" : "Boa tentativa — tenta outra vez!"}</p>
              <Button onClick={restart}>Jogar novamente</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Pergunta {current + 1}/{questions.length}</CardTitle>
                <Badge>{score} acertos</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium text-lg">{q?.text}</p>
              {q?.options.map((opt) => {
                const isPick = selected === opt;
                const isCorrect = opt === q.correct;
                return (
                  <Button
                    key={opt}
                    variant="outline"
                    className={`w-full justify-start h-auto py-3 ${selected && isCorrect && isPick ? "border-green-500" : ""} ${selected && isPick && !isCorrect ? "border-red-500" : ""}`}
                    disabled={!!selected}
                    onClick={() => pick(opt)}
                  >
                    {selected && isCorrect && isPick && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                    {selected && isPick && !isCorrect && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                    {opt}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
