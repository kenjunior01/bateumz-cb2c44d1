import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Clock, Trophy, Zap, Check, X, Users, Play, Crown, ArrowRight, Plus, Star, Flame, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import confetti from "canvas-confetti";
import {
  createQuizGame, addQuizQuestion, setQuizStatus, submitQuizAnswer,
  getQuizLeaderboard, subscribeQuiz, type QuizGame, type QuizQuestion,
} from "@/lib/livePlatform";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  scheduledLiveId?: string;
  liveCode?: string;
  isHost?: boolean;
  onScore?: (name: string, score: number) => void;
}

const COLORS = [
  "from-red-500 to-rose-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
  "from-pink-500 to-fuchsia-600",
];

const COLOR_BG = [
  "bg-red-500/10 border-red-500/30",
  "bg-blue-500/10 border-blue-500/30",
  "bg-emerald-500/10 border-emerald-500/30",
  "bg-amber-500/10 border-amber-500/30",
  "bg-violet-500/10 border-violet-500/30",
  "bg-pink-500/10 border-pink-500/30",
];

const springSnappy = { type: "spring" as const, stiffness: 400, damping: 25 };
const springBouncy = { type: "spring" as const, stiffness: 300, damping: 20 };
const springGentle = { type: "spring" as const, stiffness: 200, damping: 30 };
const springSoft = { type: "spring" as const, stiffness: 260, damping: 24 };

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const fireMultiWaveConfetti = () => {
  const wave1 = setTimeout(() => {
    confetti({ particleCount: 80, spread: 100, origin: { y: 0.6, x: 0.3 }, colors: ["#FFD700", "#FF6B35", "#FF1744"] });
  }, 0);
  const wave2 = setTimeout(() => {
    confetti({ particleCount: 80, spread: 100, origin: { y: 0.6, x: 0.7 }, colors: ["#00E5FF", "#76FF03", "#FFD700"] });
  }, 300);
  const wave3 = setTimeout(() => {
    confetti({ particleCount: 120, spread: 160, origin: { y: 0.5, x: 0.5 }, colors: ["#FFD700", "#FF4081", "#7C4DFF", "#00E5FF"] });
  }, 600);
  const wave4 = setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#FFD700", "#FF6B35"] });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#00E5FF", "#76FF03"] });
  }, 900);
  return () => { clearTimeout(wave1); clearTimeout(wave2); clearTimeout(wave3); clearTimeout(wave4); };
};

const fireCorrectConfetti = () => {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.65 },
    colors: ["#00E676", "#69F0AE", "#B9F6CA", "#FFD740"],
  });
};

const fireWrongConfetti = () => {
  confetti({
    particleCount: 20,
    spread: 40,
    origin: { y: 0.65 },
    colors: ["#FF1744", "#FF5252", "#FF8A80"],
    gravity: 1.5,
  });
};

const KahootMultiplayerQuiz = ({ scheduledLiveId, liveCode, isHost, onScore }: Props) => {
  const { user } = useAuth();
  const [game, setGame] = useState<QuizGame | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [newQ, setNewQ] = useState({ question: "", options: ["", "", "", ""], correct: 0 });
  const [showResults, setShowResults] = useState(false);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [screenFlash, setScreenFlash] = useState<"green" | "red" | null>(null);
  const [finishAnimating, setFinishAnimating] = useState(false);

  const totalTime = game?.time_per_question || 15;
  const timerRatio = totalTime > 0 ? timeLeft / totalTime : 0;

  const timerColor = useMemo(() => {
    if (timeLeft <= 3) return "#EF4444";
    if (timeLeft <= 5) return "#F59E0B";
    if (timeLeft <= 8) return "#FBBF24";
    return "#22C55E";
  }, [timeLeft]);

  const timerBarGradient = useMemo(() => {
    if (timeLeft <= 3) return "from-red-500 via-red-600 to-rose-700";
    if (timeLeft <= 5) return "from-amber-500 via-orange-500 to-red-500";
    if (timeLeft <= 8) return "from-yellow-400 via-amber-400 to-orange-500";
    return "from-emerald-400 via-green-400 to-emerald-500";
  }, [timeLeft]);

  const isUrgent = timeLeft <= 3;
  const isWarning = timeLeft <= 5 && timeLeft > 3;

  useEffect(() => {
    if (timeLeft <= 0 || !game || game.status !== "question") return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, game?.status]);

  useEffect(() => {
    if (!game?.id) return;
    const unsub = subscribeQuiz(game.id, (g) => {
      setGame(g);
      if (g.status === "question") {
        setShowResults(false);
        setSelectedAnswer(null);
        setAnswerLocked(false);
        setAnswerFeedback(null);
        setShowPointsPopup(false);
        setLastPointsEarned(0);
        setQuestionStartTime(Date.now());
        setTimeLeft(g.time_per_question);
      }
      if (g.status === "showing_results") {
        setShowResults(true);
      }
      if (g.status === "finished") {
        setFinishAnimating(true);
      }
    });
    return unsub;
  }, [game?.id]);

  useEffect(() => {
    if (!game?.id || !showResults) return;
    getQuizLeaderboard(game.id, 10).then(setLeaderboard);
  }, [game?.id, showResults]);

  useEffect(() => {
    if (!finishAnimating) return;
    const cleanup = fireMultiWaveConfetti();
    const t = setTimeout(() => setFinishAnimating(false), 3000);
    return () => { cleanup(); clearTimeout(t); };
  }, [finishAnimating]);

  const handleCreate = async () => {
    const { data, error } = await createQuizGame({
      scheduled_live_id: scheduledLiveId,
      live_code: liveCode,
    });
    if (error) { toast.error("Erro ao criar quiz"); return; }
    if (data) setGame(data as QuizGame);
    toast.success("Quiz criado! Adicione perguntas.");
  };

  const handleAddQuestion = async () => {
    if (!game || !newQ.question.trim()) return;
    const filledOptions = newQ.options.filter((o) => o.trim());
    if (filledOptions.length < 2) { toast.error("Minimo 2 opcoes"); return; }
    await addQuizQuestion(game.id, newQ.question, filledOptions, newQ.correct, questions.length);
    setQuestions((prev) => [...prev, {
      id: `temp-${Date.now()}`,
      quiz_id: game.id,
      question: newQ.question,
      options: filledOptions,
      correct_index: newQ.correct,
      image_url: null,
      position: questions.length,
      points: 1000,
    }]);
    setNewQ({ question: "", options: ["", "", "", ""], correct: 0 });
    toast.success(`Pergunta ${questions.length + 1} adicionada`);
  };

  const handleStartQuestion = async (idx: number) => {
    if (!game) return;
    await setQuizStatus(game.id, "question");
    setGame({ ...game, status: "question", current_question_index: idx });
  };

  const handleShowResults = async () => {
    if (!game) return;
    await setQuizStatus(game.id, "showing_results");
  };

  const handleNextQuestion = async () => {
    if (!game) return;
    const nextIdx = game.current_question_index + 1;
    await setQuizStatus(game.id, "question");
  };

  const handleFinish = async () => {
    if (!game) return;
    await setQuizStatus(game.id, "finished");
    fireMultiWaveConfetti();
  };

  const handleAnswer = async (idx: number) => {
    if (answerLocked || !game) return;
    setAnswerLocked(true);
    setSelectedAnswer(idx);
    const timeTaken = Date.now() - questionStartTime;
    const currentQ = questions[game.current_question_index];
    if (!currentQ) return;

    const { data } = await submitQuizAnswer(game.id, currentQ.id, idx, timeTaken);
    const isCorrect = idx === currentQ.correct_index;
    setAnswerFeedback(isCorrect ? "correct" : "wrong");

    if (data?.points_earned > 0) {
      const earned = data.points_earned || 0;
      setTotalPoints((prev) => prev + earned);
      setLastPointsEarned(earned);
      setShowPointsPopup(true);
      if (isCorrect && onScore) onScore(user?.user_metadata?.display_name || "Jogador", earned);
    }

    if (isCorrect) {
      setScreenFlash("green");
      fireCorrectConfetti();
      setTimeout(() => setScreenFlash(null), 400);
    } else {
      setScreenFlash("red");
      setScreenShake(true);
      fireWrongConfetti();
      setTimeout(() => { setScreenFlash(null); setScreenShake(false); }, 500);
    }

    setTimeout(() => {
      setAnswerFeedback(null);
      setShowPointsPopup(false);
    }, 2500);
  };

  const currentQ = game ? questions[game.current_question_index] : null;

  const circularTimerRadius = 22;
  const circularTimerStroke = 3.5;
  const circularTimerCircumference = 2 * Math.PI * circularTimerRadius;
  const circularTimerOffset = circularTimerCircumference * (1 - timerRatio);

  return (
    <div className={`relative ${screenShake ? "screen-shake" : ""}`}>
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            key={screenFlash}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`absolute inset-0 pointer-events-none z-50 rounded-xl ${
              screenFlash === "green"
                ? "screen-flash bg-emerald-500/20"
                : "screen-flash bg-red-500/25"
            }`}
          />
        )}
      </AnimatePresence>

      {isUrgent && game?.status === "question" && (
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="absolute inset-0 pointer-events-none z-40 rounded-xl ring-2 ring-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
        />
      )}

      {!game && isHost && (
        <Card className="border-dashed overflow-hidden">
          <CardContent className="py-10 text-center relative">
            <motion.div
              animate={{
                rotateY: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-4"
            >
              <Brain className="h-14 w-14 text-primary/60" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-bold text-lg mb-1"
            >
              Quiz ao Vivo
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-muted-foreground mb-5"
            >
              Crie um quiz e todos jogam em tempo real pelo telemovel
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, ...springBouncy }}
            >
              <Button
                onClick={handleCreate}
                className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 gap-1.5 glow-pulse relative overflow-hidden"
                size="lg"
              >
                <motion.span
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
                  className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{ skewX: "-12deg" }}
                />
                <Play className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Criar Quiz</span>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      )}

      {!game && !isHost && (
        <Card className="border-dashed overflow-hidden">
          <CardContent className="py-10 text-center">
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-4"
            >
              <Brain className="h-14 w-14 text-primary/40" />
            </motion.div>
            <h3 className="font-bold text-lg mb-1">Quiz ao Vivo</h3>
            <motion.div className="flex items-center justify-center gap-1.5 mt-2">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-xs text-muted-foreground"
              >
                Aguardando o host iniciar o quiz
              </motion.span>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="h-3 w-3 text-amber-500" />
              </motion.span>
            </motion.div>
          </CardContent>
        </Card>
      )}

      {game && game.status === "waiting" && isHost && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={springGentle}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={springSnappy}
            >
              <Badge className="bg-blue-500 text-white text-xs">
                <Brain className="h-3 w-3 mr-1" /> Quiz Criado
              </Badge>
            </motion.div>
            <motion.span
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={springSnappy}
              className="text-xs text-muted-foreground"
            >
              {questions.length} perguntas
            </motion.span>
          </div>

          <motion.div
            layout
            transition={springSoft}
          >
            <Card>
              <CardContent className="space-y-3">
                <Input
                  value={newQ.question}
                  onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
                  placeholder="Pergunta..."
                  className="text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  {newQ.options.map((opt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, ...springGentle }}
                      className="relative"
                    >
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...newQ.options]; next[i] = e.target.value;
                          setNewQ({ ...newQ, options: next });
                        }}
                        placeholder={`Opcao ${i + 1}`}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background"
                      />
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setNewQ({ ...newQ, correct: i })}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 text-[9px] font-bold flex items-center justify-center transition-colors ${
                          newQ.correct === i ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button onClick={handleAddQuestion} size="sm" className="w-full rounded-full gap-1">
                    <Plus className="h-3 w-3" /> Adicionar Pergunta
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <AnimatePresence>
            {questions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {questions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, ...springGentle }}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.06 + 0.1, ...springSnappy }}
                      className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary"
                    >
                      {i + 1}
                    </motion.span>
                    <span className="flex-1 truncate">{q.question}</span>
                    <span className="text-[10px] text-muted-foreground">{q.options.length} opcoes</span>
                    {isHost && game.status === "waiting" && i === 0 && (
                      <motion.div whileTap={{ scale: 0.9 }}>
                        <Button
                          size="sm"
                          onClick={() => handleStartQuestion(0)}
                          className="h-7 text-[10px] rounded-full bg-emerald-500 text-white gap-0.5 glow-pulse"
                        >
                          <Play className="h-3 w-3" /> Iniciar
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {questions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, ...springBouncy }}
              >
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => handleStartQuestion(0)}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white gap-1.5 relative overflow-hidden"
                    size="lg"
                  >
                    <motion.span
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
                      className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                      style={{ skewX: "-12deg" }}
                    />
                    <Play className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Iniciar Quiz ({questions.length} perguntas)</span>
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {game && game.status === "question" && currentQ && (
        <motion.div
          key={`question-${game.current_question_index}`}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={springSnappy}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springSnappy}>
              <Badge className="bg-blue-500 text-white">
                <Flame className="h-3 w-3 mr-1" />
                Pergunta {game.current_question_index + 1}/{questions.length}
              </Badge>
            </motion.div>

            <div className="flex items-center gap-2">
              <motion.div
                className="relative"
                animate={isWarning ? { scale: [1, 1.15, 1] } : isUrgent ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg width="52" height="52" viewBox="0 0 52 52" className="transform -rotate-90">
                  <circle
                    cx="26"
                    cy="26"
                    r={circularTimerRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={circularTimerStroke}
                    className="text-muted/20"
                  />
                  <motion.circle
                    cx="26"
                    cy="26"
                    r={circularTimerRadius}
                    fill="none"
                    stroke={timerColor}
                    strokeWidth={circularTimerStroke}
                    strokeLinecap="round"
                    strokeDasharray={circularTimerCircumference}
                    initial={false}
                    animate={{ strokeDashoffset: circularTimerOffset }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                      filter: isUrgent ? "drop-shadow(0 0 6px rgba(239,68,68,0.6))" : "none",
                    }}
                  />
                </svg>
                <motion.span
                  key={timeLeft}
                  initial={timeLeft <= 5 ? { scale: 1.4, color: timerColor } : { scale: 1 }}
                  animate={{ scale: 1, color: timerColor }}
                  transition={springSnappy}
                  className="absolute inset-0 flex items-center justify-center font-mono text-sm font-extrabold"
                  style={{ color: timerColor }}
                >
                  {timeLeft}
                </motion.span>
              </motion.div>
            </div>
          </div>

          <div className="relative h-2 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${timerBarGradient}`}
              initial={false}
              animate={{ width: `${timerRatio * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                boxShadow: isUrgent
                  ? "0 0 12px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.2)"
                  : isWarning
                    ? "0 0 8px rgba(245,158,11,0.4)"
                    : "none",
              }}
            />
          </div>

          <Card className="border-2 border-primary/20 relative overflow-visible">
            <CardContent className="py-6 relative">
              <AnimatePresence>
                {answerFeedback === "correct" && (
                  <motion.div
                    key="correct-flash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 rounded-xl bg-emerald-500/10 pointer-events-none z-10"
                  />
                )}
                {answerFeedback === "wrong" && (
                  <motion.div
                    key="wrong-flash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 rounded-xl bg-red-500/10 pointer-events-none z-10"
                  />
                )}
              </AnimatePresence>

              <motion.h3
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, ...springGentle }}
                className="text-center text-lg font-bold mb-6 relative z-20"
              >
                {currentQ.question}
              </motion.h3>

              <div className="grid gap-2.5 max-w-md mx-auto relative z-20">
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedAnswer === i;
                  const isRevealed = answerFeedback !== null;
                  const isCorrect = i === currentQ.correct_index;

                  let bgClass = "border-border hover:border-primary/50 bg-background/50";
                  if (isRevealed && isCorrect) bgClass = "bg-emerald-500/20 border-emerald-500 shadow-[0_0_16px_rgba(34,197,94,0.3)]";
                  else if (isRevealed && isSelected && !isCorrect) bgClass = "bg-red-500/20 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]";
                  else if (isSelected) bgClass = `bg-gradient-to-r ${COLORS[i % COLORS.length]} border-transparent shadow-lg`;

                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: isSelected ? 1.05 : 1,
                      }}
                      transition={{
                        delay: i * 0.08,
                        ...springBouncy,
                      }}
                      whileHover={!answerLocked ? { scale: 1.03, boxShadow: "0 0 20px rgba(99,102,241,0.2)" } : {}}
                      whileTap={!answerLocked ? { scale: 0.95 } : {}}
                      onClick={() => handleAnswer(i)}
                      disabled={answerLocked}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-300 ${bgClass} ${
                        !answerLocked ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <motion.span
                          animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.3 }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? "bg-white/30 text-white shadow-inner"
                              : COLOR_BG[i % COLOR_BG.length]
                          }`}
                        >
                          {LETTERS[i] || String.fromCharCode(65 + i)}
                        </motion.span>
                        <span className={`text-sm font-medium flex-1 ${isSelected ? "text-white font-bold" : ""}`}>
                          {opt}
                        </span>
                        <AnimatePresence>
                          {isRevealed && isCorrect && (
                            <motion.span
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={springSnappy}
                            >
                              <Check className="h-5 w-5 text-emerald-400" />
                            </motion.span>
                          )}
                          {isRevealed && isSelected && !isCorrect && (
                            <motion.span
                              initial={{ scale: 0, rotate: 180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={springSnappy}
                            >
                              <X className="h-5 w-5 text-red-400" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showPointsPopup && lastPointsEarned > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -40, scale: 1 }}
                    exit={{ opacity: 0, y: -80, scale: 0.5 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute bottom-4 right-4 z-30"
                  >
                    <div className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-extrabold">+{lastPointsEarned}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {!isHost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <span className="text-xs text-muted-foreground">Seus pontos: </span>
              <motion.span
                key={totalPoints}
                initial={{ scale: 1.3, color: "#22C55E" }}
                animate={{ scale: 1, color: "#6366F1" }}
                transition={springSnappy}
                className="text-sm font-bold text-primary inline-block"
              >
                {totalPoints}
              </motion.span>
            </motion.div>
          )}
        </motion.div>
      )}

      {game && showResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={springGentle}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springSnappy}>
              <Badge className="bg-amber-500 text-white">
                <Trophy className="h-3 w-3 mr-1" /> Resultados
              </Badge>
            </motion.div>
            <AnimatePresence mode="wait">
              {isHost && game.current_question_index < questions.length - 1 && (
                <motion.div
                  key="next"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={springSnappy}
                >
                  <Button onClick={handleNextQuestion} size="sm" className="rounded-full gap-1">
                    Proxima <ArrowRight className="h-3 w-3" />
                  </Button>
                </motion.div>
              )}
              {isHost && game.current_question_index >= questions.length - 1 && (
                <motion.div
                  key="finish"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={springBouncy}
                >
                  <Button
                    onClick={handleFinish}
                    className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1 glow-pulse relative overflow-hidden"
                  >
                    <motion.span
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
                      className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      style={{ skewX: "-12deg" }}
                    />
                    <Crown className="h-3.5 w-3.5 relative z-10" />
                    <span className="relative z-10">Finalizar</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Card>
            <CardContent className="py-3">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Trophy className="h-4 w-4 text-amber-500" />
                </motion.span>
                Ranking
              </h4>
              {leaderboard.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground text-center py-4"
                >
                  Sem respostas ainda
                </motion.p>
              ) : (
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {leaderboard.map((entry, i) => (
                      <motion.div
                        key={entry.display_name}
                        initial={{ opacity: 0, x: 80 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -80 }}
                        transition={{
                          delay: i * 0.12,
                          ...springSnappy,
                        }}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg relative overflow-hidden ${
                          i === 0
                            ? "bg-amber-500/10 border border-amber-500/30"
                            : i === 1
                              ? "bg-zinc-300/10 border border-zinc-300/20"
                              : i === 2
                                ? "bg-amber-700/10 border border-amber-700/20"
                                : "bg-muted/30"
                        }`}
                      >
                        {i === 0 && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          />
                        )}
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 relative ${
                          i === 0
                            ? "bg-amber-400 text-black"
                            : i === 1
                              ? "bg-zinc-300 text-black"
                              : i === 2
                                ? "bg-amber-700 text-white"
                                : "bg-muted text-muted-foreground"
                        }`}>
                          {i === 0 ? (
                            <motion.span
                              animate={{ y: [0, -3, 0], rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <Crown className="h-3 w-3" />
                            </motion.span>
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span className="flex-1 text-xs font-medium truncate relative">{entry.display_name}</span>
                        <span className="text-[10px] text-muted-foreground relative">{entry.correct_count}<Check className="h-2.5 w-2.5 inline ml-0.5 text-emerald-500" /></span>
                        <motion.span
                          key={entry.total_points}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          transition={springSnappy}
                          className={`text-sm font-bold relative ${
                            i === 0 ? "text-amber-500" : "text-primary"
                          }`}
                        >
                          {entry.total_points}
                        </motion.span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {!isHost && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, ...springBouncy }}
              className="text-center p-3 rounded-xl bg-primary/5 border border-primary/20"
            >
              <p className="text-xs text-muted-foreground">Seus pontos totais</p>
              <motion.p
                key={totalPoints}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={springSnappy}
                className="text-2xl font-extrabold text-primary"
              >
                {totalPoints}
              </motion.p>
            </motion.div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {game && game.status === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={springBouncy}
          >
            <Card className="border-amber-500/30 overflow-hidden relative">
              <div className="absolute inset-0 celebration-rays pointer-events-none" />

              <CardContent className="py-10 text-center relative z-10">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="inline-block mb-2"
                >
                  <Trophy className="h-16 w-16 text-amber-500" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, ...springBouncy }}
                  className="font-black text-3xl mb-1 text-amber-500 neon-border-gold inline-block px-4 py-1 rounded-lg"
                >
                  VENCEDOR
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted-foreground mb-6"
                >
                  Quiz Finalizado!
                </motion.p>

                {!isHost && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, ...springGentle }}
                    className="mb-6"
                  >
                    <p className="text-xs text-muted-foreground">Pontuacao final</p>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, ...springBouncy }}
                      className="text-3xl font-black text-primary"
                    >
                      {totalPoints}
                    </motion.p>
                  </motion.div>
                )}

                {leaderboard.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, ...springGentle }}
                    className="mt-4"
                  >
                    <div className="flex items-end justify-center gap-3 mb-2">
                      {[1, 0, 2].map((posIdx) => {
                        const entry = leaderboard[posIdx];
                        if (!entry) return null;
                        const isWinner = posIdx === 0;
                        const heights = [80, 60, 45];
                        const bgColors = [
                          "bg-gradient-to-t from-amber-500 to-amber-400",
                          "bg-gradient-to-t from-zinc-400 to-zinc-300",
                          "bg-gradient-to-t from-amber-700 to-amber-600",
                        ];
                        const textColors = [
                          "text-black",
                          "text-black",
                          "text-white",
                        ];

                        return (
                          <motion.div
                            key={posIdx}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: 1.2 + posIdx * 0.3,
                              ...springBouncy,
                            }}
                            className="flex flex-col items-center"
                          >
                            <motion.div
                              animate={isWinner ? { y: [0, -6, 0] } : {}}
                              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                              className="mb-1"
                            >
                              {isWinner && (
                                <motion.div
                                  animate={{ rotate: [0, 10, -10, 0] }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  <Crown className="h-5 w-5 text-amber-400 mx-auto" />
                                </motion.div>
                              )}
                            </motion.div>
                            <div className="text-center mb-1">
                              <p className={`text-xs font-bold ${isWinner ? "text-amber-500" : "text-muted-foreground"}`}>
                                {entry.display_name}
                              </p>
                            </div>
                            <div
                              className={`${bgColors[posIdx]} ${textColors[posIdx]} rounded-t-lg flex items-end justify-center pb-1 px-4`}
                              style={{ width: "72px", height: `${heights[posIdx]}px` }}
                            >
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1.8 + posIdx * 0.2, ...springSnappy }}
                                className="text-center"
                              >
                                <span className="text-[10px] font-bold opacity-70">#{posIdx + 1}</span>
                                <p className="text-xs font-black">{entry.total_points}</p>
                              </motion.div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                <AnimatePresence>
                  {finishAnimating && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={springBouncy}
                      className="mt-4 flex items-center justify-center gap-2"
                    >
                      {[...Array(5)].map((_, i) => (
                        <motion.span
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 1.5 + i * 0.1, ...springSnappy }}
                        >
                          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KahootMultiplayerQuiz;
