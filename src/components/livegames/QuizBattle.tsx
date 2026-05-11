import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Check, X } from "lucide-react";
import confetti from "canvas-confetti";

type Q = { question: string; options: string[]; correct: number };

const QUESTIONS: Q[] = [
  { question: "Qual é a capital de Moçambique?", options: ["Beira", "Maputo", "Nampula", "Tete"], correct: 1 },
  { question: "Quantas províncias tem Moçambique?", options: ["9", "10", "11", "12"], correct: 2 },
  { question: "Qual é a moeda oficial?", options: ["Kwanza", "Real", "Metical", "Escudo"], correct: 2 },
  { question: "Que rio atravessa Moçambique de oeste a este?", options: ["Limpopo", "Zambeze", "Save", "Rovuma"], correct: 1 },
  { question: "Em que ano Moçambique tornou-se independente?", options: ["1973", "1974", "1975", "1976"], correct: 2 },
  { question: "Qual destes é prato típico moçambicano?", options: ["Feijoada", "Matapa", "Bobotie", "Couscous"], correct: 1 },
];

const TIME_PER_Q = 8;

const QuizBattle = () => {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(TIME_PER_Q);
  const [picked, setPicked] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);

  const start = () => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuestions(shuffled);
    setQIdx(0);
    setScore(0);
    setPicked(null);
    setTime(TIME_PER_Q);
    setPhase("playing");
  };

  useEffect(() => {
    if (phase !== "playing" || picked !== null) return;
    if (time <= 0) {
      next(false);
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 0.1), 100);
    return () => clearTimeout(t);
  }, [time, phase, picked]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === questions[qIdx].correct;
    if (correct) setScore((s) => s + 1);
    setTimeout(() => next(correct), 1000);
  };

  const next = (_was: boolean) => {
    if (qIdx + 1 >= questions.length) {
      setPhase("done");
      if (score >= 3) confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      return;
    }
    setQIdx((i) => i + 1);
    setPicked(null);
    setTime(TIME_PER_Q);
  };

  if (phase === "idle") {
    return (
      <div className="max-w-sm mx-auto text-center">
        <div className="rounded-2xl bg-card border border-border p-6 mb-4">
          <Brain className="h-10 w-10 text-primary mx-auto mb-2" />
          <h3 className="font-display text-lg font-bold text-foreground mb-1">Quiz Battle</h3>
          <p className="text-sm text-muted-foreground">5 perguntas · 8s cada · acerta 3+ para ganhar</p>
        </div>
        <button onClick={start} className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm">
          ▶️ Começar Quiz
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const won = score >= 3;
    return (
      <div className="max-w-sm mx-auto text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-2xl p-6 ${won ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
        >
          <p className="text-4xl mb-2">{won ? "🏆" : "🤔"}</p>
          <p className="font-display text-2xl font-bold">{score}/{questions.length}</p>
          <p className="text-sm mt-1">{won ? "Excelente! Ganhaste pontos." : "Tente outra vez!"}</p>
        </motion.div>
        <button onClick={start} className="mt-4 text-sm text-primary font-medium hover:underline">
          🔁 Jogar de novo
        </button>
      </div>
    );
  }

  const q = questions[qIdx];
  return (
    <div className="max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="text-muted-foreground">Pergunta {qIdx + 1}/{questions.length}</span>
        <span className="text-primary font-bold">⏱️ {time.toFixed(1)}s</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
        <div className="h-full bg-primary transition-all" style={{ width: `${(time / TIME_PER_Q) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={qIdx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="rounded-2xl bg-card border border-border p-5 mb-4"
        >
          <p className="font-display text-base font-bold text-foreground text-center">{q.question}</p>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct;
          const isPicked = picked === i;
          const showResult = picked !== null;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={picked !== null}
              className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                showResult && isCorrect
                  ? "bg-primary/10 border-primary text-primary"
                  : showResult && isPicked
                  ? "bg-destructive/10 border-destructive text-destructive"
                  : "bg-card border-border text-foreground hover:bg-secondary"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 text-left">{opt}</span>
              {showResult && isCorrect && <Check className="h-4 w-4" />}
              {showResult && isPicked && !isCorrect && <X className="h-4 w-4" />}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3">
        Pontuação: <span className="text-primary font-bold">{score}</span>
      </p>
    </div>
  );
};

export default QuizBattle;
