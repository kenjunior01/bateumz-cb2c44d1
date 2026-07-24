import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Timer, SkipForward, Users, Zap, Crown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  isHost?: boolean;
  players?: string[];
}

const DEFAULT_QUESTIONS = [
  { text: "Qual é a coisa mais vergonhosa que já fizeste?", intensity: 2 },
  { text: "Qual é o teu maior segredo?", intensity: 3 },
  { text: "Já mentiste para sair de uma enrascada? O quê?", intensity: 2 },
  { text: "Qual é a pior coisa que já disseste a alguém?", intensity: 3 },
  { text: "Se pudesses apagar uma memória, qual seria?", intensity: 2 },
  { text: "Qual é o teu maior arrependimento?", intensity: 3 },
  { text: "Já foram traídos? Como descobriram?", intensity: 3 },
  { text: "Qual é a coisa mais louca que já fizeste por amor?", intensity: 2 },
  { text: "Qual é o teu guilty pleasure?", intensity: 1 },
  { text: "Já roubaste algo? O quê?", intensity: 2 },
  { text: "Qual é a pior mentira que já contaste?", intensity: 3 },
  { text: "Quem é a última pessoa que ligaste?", intensity: 1 },
  { text: "Já fingiste gostar de um presente que odiavas?", intensity: 1 },
  { text: "Qual é a coisa mais cara que compraste e arrependeste?", intensity: 1 },
  { text: "Já espiaste o celular do parceiro(a)?", intensity: 3 },
  { text: "Qual foi o pior primeiro encontro que tiveste?", intensity: 2 },
  { text: "Já foram despejados(a)? Porquê?", intensity: 2 },
  { text: "Qual é o teu vício mais estranho?", intensity: 2 },
  { text: "Se soubesses que ninguém ia descobrir, o que farias?", intensity: 3 },
  { text: "Qual é a pior coisa que já disseste aos teus pais?", intensity: 2 },
];

const INTENSITY_COLORS = ["", "from-amber-400 to-yellow-500", "from-orange-500 to-red-500", "from-red-600 to-rose-700"];
const INTENSITY_LABELS = ["", "Leve", "Médio", "Quente FFA"];

const HotSeat = ({ isHost = false, players = [] }: Props) => {
  const [questions] = useState(DEFAULT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [passed, setPassed] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const current = questions[currentIndex];
  const intensityColor = INTENSITY_COLORS[current.intensity];

  const startTimer = useCallback(() => {
    setTimeLeft(30);
    setTimerActive(true);
    setShowResult(false);
  }, []);

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) {
          setTimerActive(false);
          toast.error("Tempo esgotado! Passou automaticamente.");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const handleAnswer = () => {
    setAnswered((p) => p + 1);
    setTimerActive(false);
    setShowResult(true);
  };

  const handlePass = () => {
    setPassed((p) => p + 1);
    setTimerActive(false);
    nextQuestion();
  };

  const nextQuestion = () => {
    let next: number;
    do { next = Math.floor(Math.random() * questions.length); } while (next === currentIndex && questions.length > 1);
    setCurrentIndex(next);
    setShowResult(false);
    startTimer();
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setPassed(0);
    setAnswered(0);
    setShowResult(false);
    setTimerActive(false);
    setTimeLeft(30);
  };

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="font-bold text-base">Cadeira Quente</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <Zap className="h-3 w-3 mr-1 text-emerald-500" />{answered} respondeu
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            <SkipForward className="h-3 w-3 mr-1 text-red-400" />{passed} passou
          </Badge>
        </div>
      </div>

      {/* Player seat indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        <Crown className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-bold">Na Cadeira Quente</span>
        {players.length > 0 && (
          <span className="text-sm text-muted-foreground">· {players[0]}</span>
        )}
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.9, rotateY: 10 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn("rounded-3xl p-8 text-center text-white overflow-hidden", `bg-gradient-to-br ${intensityColor}`)}
        >
          <Badge className="bg-white/20 backdrop-blur text-white border-0 text-[10px] mb-4">
            <Flame className="h-3 w-3 mr-1" />{INTENSITY_LABELS[current.intensity]}
          </Badge>
          <p className="text-xl md:text-2xl font-black leading-snug">{current.text}</p>
          <p className="text-xs opacity-60 mt-4">Pergunta {currentIndex + 1} de {questions.length}</p>
        </motion.div>
      </AnimatePresence>

      {/* Timer bar */}
      {timerActive && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Timer className="h-3 w-3" /> Tempo
            </span>
            <span className={cn("font-bold", timeLeft <= 5 ? "text-red-500" : "text-foreground")}>{timeLeft}s</span>
          </div>
          <Progress value={(timeLeft / 30) * 100} className={cn("h-2", timeLeft <= 5 && "[&>div]:bg-red-500 [&>div]:animate-pulse")} />
        </div>
      )}

      {/* Action buttons */}
      {!showResult && !timerActive && !isHost && (
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startTimer}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-all"
          >
            <Flame className="h-7 w-7 text-primary" />
            <span className="text-sm font-bold text-primary">Arriscar!</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={nextQuestion}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-red-500/10 border-2 border-red-500/20 hover:border-red-500/50 transition-all"
          >
            <SkipForward className="h-7 w-7 text-red-500" />
            <span className="text-sm font-bold text-red-500">Passar</span>
          </motion.button>
        </div>
      )}

      {timerActive && !showResult && (
        <Button onClick={handleAnswer} className="w-full py-4 text-base font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
          Responder Agora
        </Button>
      )}

      {showResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-emerald-500 font-medium">
                Resposta registrada! Próxima pergunta...
              </p>
            </CardContent>
          </Card>
          <Button onClick={nextQuestion} className="w-full rounded-xl gap-2">
            Próxima Pergunta <Flame className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Host controls */}
      {isHost && (
        <div className="flex gap-2 pt-2">
          <Button onClick={nextQuestion} variant="outline" className="flex-1 rounded-xl gap-1">
            Próxima <SkipForward className="h-4 w-4" />
          </Button>
          <Button onClick={resetGame} variant="outline" size="icon" className="rounded-xl">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default HotSeat;