import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trophy, Swords, Timer, Zap, Crown, ChevronLeft, ChevronRight, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  isHost?: boolean;
  player1Name?: string;
  player2Name?: string;
}

const TALENT_TYPES = ["Cantar", "Dançar", "Imitar", "Contar piada", "Atuar", "Freestyle rap", "Ler com emoção", "Fazer beatbox", "Dublar cena de filme", "Criar mêsica no momento"];

const CHALLENGES = [
  "Cantar uma música famosa com a boca fechada",
  "Dançar como se ninguém estivesse a ver",
  "Imitar um animal por 10 segundos",
  "Fazer freestyle sobre um tema aleatório",
  "Contar a piada mais engraçada que souber em 15 segundos",
  "Fazer beatbox por 20 segundos",
  "Dublar uma cena de um filme clássico",
  "Cantar a música mais antiga que souber",
  "Fazer uma mímica que os outros adivinhem",
  "Imitar um apresentador de TV",
];

const TalentBattle = ({ isHost = false, player1Name = "Jogador 1", player2Name = "Jogador 2" }: Props) => {
  const [phase, setPhase] = useState<"setup" | "battle" | "voting" | "results">("setup");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(5);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [challenge, setChallenge] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [p1Votes, setP1Votes] = useState(0);
  const [p2Votes, setP2Votes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [talentType, setTalentType] = useState("");
  const [showTalentSelect, setShowTalentSelect] = useState(false);

  const startBattle = () => {
    const randomChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    setChallenge(randomChallenge);
    setPhase("battle");
    setCurrentPlayer(1);
    setP1Score(0);
    setP2Score(0);
    setCurrentRound(1);
    setTimeLeft(30);
  };

  const generateChallenge = useCallback(() => {
    const randomChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    setChallenge(randomChallenge);
    setTimeLeft(30);
    setTimerActive(true);
  }, []);

  const startRound = () => {
    setCurrentPlayer(1);
    generateChallenge();
  };

  const nextPlayer = () => {
    if (currentPlayer === 1) {
      setCurrentPlayer(2);
      generateChallenge();
    } else {
      setPhase("voting");
      setP1Votes(0);
      setP2Votes(0);
      setHasVoted(false);
      setTimerActive(false);
    }
  };

  const vote = (player: 1 | 2) => {
    if (hasVoted) return;
    setHasVoted(true);
    if (player === 1) setP1Votes((p) => p + 1);
    else setP2Votes((p) => p + 1);
  };

  const finishVoting = () => {
    if (p1Votes > p2Votes) setP1Score((p) => p + 1);
    else if (p2Votes > p1Votes) setP2Score((p) => p + 1);

    if (currentRound >= totalRounds) {
      setPhase("results");
    } else {
      setCurrentRound((p) => p + 1);
      startRound();
    }
  };

  const resetGame = () => {
    setPhase("setup");
    setP1Score(0);
    setP2Score(0);
    setCurrentRound(1);
  };

  // Timer effect
  useState(() => {
    if (!timerActive) return;
    const t = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) { setTimerActive(false); toast.error("Tempo esgotado!"); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  });

  const winner = p1Score > p2Score ? 1 : p2Score > p1Score ? 2 : 0;

  return (
    <div className="space-y-4">
      {(phase === "battle" || phase === "voting") && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
          <div className="text-center flex-1">
            <p className={cn("text-lg font-black", currentPlayer === 1 && "text-primary")}>{player1Name}</p>
            <p className="text-2xl font-black text-primary">{p1Score}</p>
          </div>
          <div className="text-center px-4">
            <Badge className="bg-amber-500 text-white">Rodada {currentRound}/{totalRounds}</Badge>
          </div>
          <div className="text-center flex-1">
            <p className={cn("text-lg font-black", currentPlayer === 2 && "text-rose-500")}>{player2Name}</p>
            <p className="text-2xl font-black text-rose-500">{p2Score}</p>
          </div>
        </div>
      )}

      {phase === "setup" && (
        <div className="text-center py-8 space-y-6">
          <div className="text-6xl">⚔️</div>
          <div>
            <h3 className="text-2xl font-black">Batalha de Talentos</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Dois jogadores, cinco rodadas, um vencedor. Cada jogador recebe um desafio
              aleatório e tem 30 segundos para impressionar a plateia!
            </p>
          </div>
          <Button onClick={startBattle} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-8 py-6 text-lg font-bold">
            Iniciar Batalha <Swords className="h-5 w-5 ml-2" />
          </Button>
        </div>
      )}

      {phase === "battle" && (
        <div className="space-y-4">
          <div className="text-center">
            <Badge className={cn("text-sm", currentPlayer === 1 ? "bg-primary" : "bg-rose-500")}>
              <Crown className="h-3.5 w-3.5 mr-1" />
              Vez de {currentPlayer === 1 ? player1Name : player2Name}
            </Badge>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentRound}-${currentPlayer}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-3xl p-6 bg-gradient-to-br from-violet-600/90 via-purple-600/90 to-fuchsia-600/90 text-white text-center"
            >
              <Sparkles className="h-5 w-5 mx-auto mb-3 opacity-60" />
              <p className="text-lg md:text-xl font-black leading-snug">{challenge}</p>
              {talentType && (
                <Badge className="mt-3 bg-white/20 border-0 text-white">{talentType}</Badge>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <Timer className="h-3 w-3 text-muted-foreground" />
              <span className={cn("font-bold", timeLeft <= 5 && "text-red-500")}>{timeLeft}s</span>
            </div>
            <Progress value={(timeLeft / 30) * 100} className={cn("h-2", timeLeft <= 5 && "[&>div]:bg-red-500")} />
          </div>

          {isHost && (
            <Button onClick={nextPlayer} className="w-full rounded-xl gap-2">
              {currentPlayer === 1 ? `Próximo: ${player2Name}` : "Ir para Votação"} <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {phase === "voting" && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Quem apresentou melhor?</p>
            <Badge><Star className="h-3 w-3 mr-1" />Vote na rodada {currentRound}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => vote(1)}
              disabled={hasVoted}
              className={cn(
                "flex flex-col items-center gap-3 py-8 rounded-2xl border-2 transition-all",
                hasVoted && p1Votes >= p2Votes ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
            >
              <Crown className={cn("h-8 w-8", hasVoted && p1Votes >= p2Votes ? "text-primary" : "text-muted-foreground")} />
              <span className="font-bold">{player1Name}</span>
              {hasVoted && <Badge>{p1Votes} votos</Badge>}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => vote(2)}
              disabled={hasVoted}
              className={cn(
                "flex flex-col items-center gap-3 py-8 rounded-2xl border-2 transition-all",
                hasVoted && p2Votes >= p1Votes ? "border-rose-500 bg-rose-500/10" : "border-border hover:border-rose-500/50"
              )}
            >
              <Crown className={cn("h-8 w-8", hasVoted && p2Votes >= p1Votes ? "text-rose-500" : "text-muted-foreground")} />
              <span className="font-bold">{player2Name}</span>
              {hasVoted && <Badge>{p2Votes} votos</Badge>}
            </motion.button>
          </div>
          {isHost && (
            <Button onClick={finishVoting} className="w-full rounded-xl gap-2">
              {currentRound >= totalRounds ? "Ver Resultados" : "Próxima Rodada"} <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {phase === "results" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 space-y-6"
        >
          <div className="text-6xl"></div>
          {winner > 0 ? (
            <>
              <h3 className="text-2xl font-black">{winner === 1 ? player1Name : player2Name} Venceu!</h3>
              <div className="flex justify-center gap-8 mt-4">
                <div className={cn("p-4 rounded-2xl", winner === 1 ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50")}>
                  <p className="text-sm font-bold">{player1Name}</p>
                  <p className="text-3xl font-black text-primary">{p1Score}</p>
                </div>
                <div className={cn("p-4 rounded-2xl", winner === 2 ? "bg-rose-500/10 ring-2 ring-rose-500" : "bg-muted/50")}>
                  <p className="text-sm font-bold">{player2Name}</p>
                  <p className="text-3xl font-black text-rose-500">{p2Score}</p>
                </div>
              </div>
            </>
          ) : (
            <h3 className="text-2xl font-black">Empate!</h3>
          )}
          <Button onClick={resetGame} variant="outline" className="rounded-xl gap-2">
            Jogar Novamente <RotateCcw className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default TalentBattle;