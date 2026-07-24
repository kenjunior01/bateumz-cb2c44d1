import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Check, X, Users, User } from "lucide-react";
import confetti from "canvas-confetti";

type Q = { question: string; options: string[]; correct: number };

const QUESTIONS: Q[] = [
  { question: "Qual é a capital de Moçambique?", options: ["Beira", "Maputo", "Nampula", "Tete"], correct: 1 },
  { question: "Quantas províncias tem Moçambique?", options: ["9", "10", "11", "12"], correct: 2 },
  { question: "Qual é a moeda oficial?", options: ["Kwanza", "Real", "Metical", "Escudo"], correct: 2 },
  { question: "Que rio atravessa Moçambique de oeste a este?", options: ["Limpopo", "Zambeze", "Save", "Rovuma"], correct: 1 },
  { question: "Em que ano Moçambique tornou-se independente?", options: ["1973", "1974", "1975", "1976"], correct: 2 },
  { question: "Qual destes é prato típico moçambicano?", options: ["Feijoada", "Matapa", "Bobotie", "Couscous"], correct: 1 },
  { question: "Qual o oceano que banha Moçambique?", options: ["Atlântico", "Índico", "Pacífico", "Ártico"], correct: 1 },
  { question: "Qual a língua oficial?", options: ["Inglês", "Francês", "Português", "Suaíli"], correct: 2 },
];

interface Props {
  totalQuestions?: number;
  timePerQ?: number;
  onScore?: (name: string, score: number) => void;
}

const QuizBattle = ({ totalQuestions = 5, timePerQ = 8, onScore }: Props) => {
  const [mode, setMode] = useState<"solo" | "vs">("solo");
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [qIdx, setQIdx] = useState(0);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Name, setP1Name] = useState("Jogador 1");
  const [p2Name, setP2Name] = useState("Jogador 2");
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [time, setTime] = useState(timePerQ);
  const [picked, setPicked] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);

  const start = () => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setQuestions(shuffled);
    setQIdx(0);
    setP1Score(0);
    setP2Score(0);
    setPicked(null);
    setTime(timePerQ);
    setActivePlayer(1);
    setPhase("playing");
  };

  useEffect(() => {
    if (phase !== "playing" || picked !== null) return;
    if (time <= 0) {
      next();
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 0.1), 100);
    return () => clearTimeout(t);
  }, [time, phase, picked]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === questions[qIdx].correct;
    if (correct) {
      if (activePlayer === 1) setP1Score((s) => s + 1);
      else setP2Score((s) => s + 1);
    }
    setTimeout(next, 1000);
  };

  const next = () => {
    if (mode === "vs" && activePlayer === 1) {
      // Same question, second player turn
      setActivePlayer(2);
      setPicked(null);
      setTime(timePerQ);
      return;
    }
    if (qIdx + 1 >= questions.length) {
      setPhase("done");
      const winningScore = Math.max(p1Score, p2Score);
      if (winningScore >= Math.ceil(questions.length / 2)) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }
      if (mode === "solo") onScore?.(p1Name, p1Score);
      else {
        onScore?.(p1Name, p1Score);
        onScore?.(p2Name, p2Score);
      }
      return;
    }
    setQIdx((i) => i + 1);
    setActivePlayer(1);
    setPicked(null);
    setTime(timePerQ);
  };

  if (phase === "idle") {
    return (
      <div className="max-w-sm mx-auto text-center">
        <div className="rounded-2xl bg-card border border-border p-6 mb-4">
          <Brain className="h-10 w-10 text-primary mx-auto mb-2" />
          <h3 className="font-display text-lg font-bold text-foreground mb-1">Quiz Battle</h3>
          <p className="text-sm text-muted-foreground">{totalQuestions} perguntas · {timePerQ}s cada</p>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode("solo")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium ${mode === "solo" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
          >
            <User className="h-3.5 w-3.5" /> Solo
          </button>
          <button
            onClick={() => setMode("vs")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium ${mode === "vs" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
          >
            <Users className="h-3.5 w-3.5" /> 2 Jogadores
          </button>
        </div>

        {mode === "vs" && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input value={p1Name} onChange={(e) => setP1Name(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm" />
            <input value={p2Name} onChange={(e) => setP2Name(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm" />
          </div>
        )}

        <button onClick={start} className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm">
          ▶️ Começar Quiz
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const winner = mode === "solo" ? null : (p1Score === p2Score ? "Empate" : (p1Score > p2Score ? p1Name : p2Name));
    return (
      <div className="max-w-sm mx-auto text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-primary/10 text-primary p-6">
          <p className="text-4xl mb-2">🏆</p>
          {mode === "solo" ? (
            <p className="font-display text-2xl font-bold">{p1Score}/{questions.length}</p>
          ) : (
            <>
              <p className="font-display text-xl font-bold">{winner === "Empate" ? "🤝 Empate!" : `${winner} venceu!`}</p>
              <p className="text-sm mt-2">{p1Name}: {p1Score} · {p2Name}: {p2Score}</p>
            </>
          )}
        </motion.div>
        <button onClick={start} className="mt-4 text-sm text-primary font-medium hover:underline">🔁 Jogar de novo</button>
      </div>
    );
  }

  const q = questions[qIdx];
  const currentName = mode === "vs" ? (activePlayer === 1 ? p1Name : p2Name) : p1Name;

  return (
    <div className="max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-muted-foreground">Pergunta {qIdx + 1}/{questions.length}</span>
        <span className="text-primary font-bold">⏱️ {time.toFixed(1)}s</span>
      </div>
      {mode === "vs" && (
        <div className="text-center mb-2">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${activePlayer === 1 ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"}`}>
            Vez de {currentName}
          </span>
        </div>
      )}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
        <div className="h-full bg-primary transition-all" style={{ width: `${(time / timePerQ) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${qIdx}-${activePlayer}`}
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
        {mode === "vs" ? (
          <>
            {p1Name}: <span className="text-primary font-bold">{p1Score}</span> · {p2Name}: <span className="text-amber-600 font-bold">{p2Score}</span>
          </>
        ) : (
          <>Pontuação: <span className="text-primary font-bold">{p1Score}</span></>
        )}
      </p>
    </div>
  );
};

export default QuizBattle;
