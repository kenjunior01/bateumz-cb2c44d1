import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Clock, Trophy, Zap, Check, X, Users, Play, Crown, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

const COLORS = ["from-red-500 to-rose-600", "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-violet-500 to-purple-600", "from-pink-500 to-fuchsia-600"];
const COLOR_BG = ["bg-red-500/10 border-red-500/30", "bg-blue-500/10 border-blue-500/30", "bg-emerald-500/10 border-emerald-500/30", "bg-amber-500/10 border-amber-500/30", "bg-violet-500/10 border-violet-500/30", "bg-pink-500/10 border-pink-500/30"];

const KahootMultiplayerQuiz = ({ scheduledLiveId, liveCode, isHost, onScore }: Props) => {
  const { user } = useAuth();
  const [game, setGame] = useState<QuizGame | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Host state: question creation
  const [newQ, setNewQ] = useState({ question: "", options: ["", "", "", ""], correct: 0 });
  const [showResults, setShowResults] = useState(false);

  // Player state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);

  // Timer
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

  // Subscribe to game state changes
  useEffect(() => {
    if (!game?.id) return;
    const unsub = subscribeQuiz(game.id, (g) => {
      setGame(g);
      if (g.status === "question") {
        setShowResults(false);
        setSelectedAnswer(null);
        setAnswerLocked(false);
        setAnswerFeedback(null);
        setQuestionStartTime(Date.now());
        setTimeLeft(g.time_per_question);
      }
      if (g.status === "showing_results") {
        setShowResults(true);
      }
    });
    return unsub;
  }, [game?.id]);

  // Load leaderboard on show results
  useEffect(() => {
    if (!game?.id || !showResults) return;
    getQuizLeaderboard(game.id, 10).then(setLeaderboard);
  }, [game?.id, showResults]);

  // HOST: Create game
  const handleCreate = async () => {
    const { data, error } = await createQuizGame({
      scheduled_live_id: scheduledLiveId,
      live_code: liveCode,
    });
    if (error) { toast.error("Erro ao criar quiz"); return; }
    if (data) setGame(data as QuizGame);
    toast.success("Quiz criado! Adicione perguntas.");
  };

  // HOST: Add question
  const handleAddQuestion = async () => {
    if (!game || !newQ.question.trim()) return;
    const filledOptions = newQ.options.filter((o) => o.trim());
    if (filledOptions.length < 2) { toast.error("Mínimo 2 opções"); return; }
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

  // HOST: Start question
  const handleStartQuestion = async (idx: number) => {
    if (!game) return;
    await setQuizStatus(game.id, "question");
    setGame({ ...game, status: "question", current_question_index: idx });
  };

  // HOST: Show results
  const handleShowResults = async () => {
    if (!game) return;
    await setQuizStatus(game.id, "showing_results");
  };

  // HOST: Next question
  const handleNextQuestion = async () => {
    if (!game) return;
    const nextIdx = game.current_question_index + 1;
    await setQuizStatus(game.id, "question");
  };

  // HOST: Finish quiz
  const handleFinish = async () => {
    if (!game) return;
    await setQuizStatus(game.id, "finished");
    confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
  };

  // PLAYER: Answer
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
      setTotalPoints((prev) => prev + (data.points_earned || 0));
      if (isCorrect && onScore) onScore(user?.user_metadata?.display_name || "Jogador", data.points_earned);
      confetti({ particleCount: isCorrect ? 100 : 0, spread: 60 });
    }

    setTimeout(() => { setAnswerFeedback(null); }, 2500);
  };

  const currentQ = game ? questions[game.current_question_index] : null;

  // ===== RENDER =====
  return (
    <div className="space-y-4">
      {/* Host: No game yet */}
      {!game && isHost && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Brain className="h-12 w-12 mx-auto text-primary/30 mb-3" />
            <h3 className="font-bold text-lg mb-1">Quiz ao Vivo</h3>
            <p className="text-xs text-muted-foreground mb-4">Crie um quiz e todos jogam em tempo real pelo telemóvel</p>
            <Button onClick={handleCreate} className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 gap-1.5">
              <Play className="h-4 w-4" /> Criar Quiz
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Player: Waiting */}
      {!game && !isHost && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Brain className="h-12 w-12 mx-auto text-primary/30 mb-3" />
            <h3 className="font-bold text-lg mb-1">Quiz ao Vivo</h3>
            <p className="text-xs text-muted-foreground">Aguardando o host iniciar o quiz...</p>
          </CardContent>
        </Card>
      )}

      {/* Game in progress */}
      {game && game.status === "waiting" && isHost && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className="bg-blue-500 text-white"><Brain className="h-3 w-3 mr-1" /> Quiz Criado</Badge>
            <span className="text-xs text-muted-foreground">{questions.length} perguntas</span>
          </div>

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
                  <div key={i} className="relative">
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...newQ.options]; next[i] = e.target.value;
                        setNewQ({ ...newQ, options: next });
                      }}
                      placeholder={`Opção ${i + 1}${i < 4 ? "" : " (máx 6)"}`}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background"
                    />
                    <button
                      onClick={() => setNewQ({ ...newQ, correct: i })}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 text-[9px] font-bold flex items-center justify-center ${
                        newQ.correct === i ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                      }`}
                    >{i + 1}</button>
                  </div>
                ))}
              </div>
              <Button onClick={handleAddQuestion} size="sm" className="w-full rounded-full gap-1">
                <Plus className="h-3 w-3" /> Adicionar Pergunta
              </Button>
            </CardContent>
          </Card>

          
          {questions.length > 0 && (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{i + 1}</span>
                  <span className="flex-1 truncate">{q.question}</span>
                  <span className="text-[10px] text-muted-foreground">{q.options.length} opções</span>
                  {isHost && game.status === "waiting" && i === 0 && (
                    <Button size="sm" onClick={() => handleStartQuestion(0)} className="h-7 text-[10px] rounded-full bg-emerald-500 text-white gap-0.5">
                      <Play className="h-3 w-3" /> Iniciar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {questions.length > 0 && (
            <Button onClick={handleStartQuestion(0)} className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white gap-1.5">
              <Play className="h-4 w-4" /> Iniciar Quiz ({questions.length} perguntas)
            </Button>
          )}
        </div>
      )}

      {/* Question active */}
      {game && game.status === "question" && currentQ && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className="bg-blue-500 text-white">Pergunta {game.current_question_index + 1}/{questions.length}</Badge>
            <div className="flex items-center gap-1.5">
              <Clock className={`h-3.5 w-3.5 ${timeLeft <= 5 ? "text-red-500" : "text-muted-foreground"}`} />
              <span className={`font-mono text-sm font-bold ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-foreground"}`}>{timeLeft}s</span>
            </div>
          </div>

          <Progress value={(timeLeft / (game.time_per_question || 15)) * 100} className="h-1" />

          <Card className="border-2 border-primary/20">
            <CardContent className="py-6">
              <h3 className="text-center text-lg font-bold mb-6">{currentQ.question}</h3>
              <div className="grid gap-2 max-w-md mx-auto">
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedAnswer === i;
                  const isRevealed = answerFeedback !== null;
                  const isCorrect = i === currentQ.correct_index;

                  let bgClass = "border-border hover:border-primary/40";
                  if (isRevealed && isCorrect) bgClass = "bg-emerald-500/20 border-emerald-500";
                  else if (isRevealed && isSelected && !isCorrect) bgClass = "bg-red-500/20 border-red-500";
                  else if (isSelected) bgClass = `bg-gradient-to-r ${COLORS[i % COLORS.length]} border-transparent`;

                  return (
                    <motion.button
                      key={i}
                      whileHover={!answerLocked ? { scale: 1.02 } : {}}
                      whileTap={!answerLocked ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(i)}
                      disabled={answerLocked}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${bgClass}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isSelected ? "bg-white/30 text-white" : COLOR_BG[i % COLOR_BG.length]
                        }`}>{
                          String.fromCharCode(65 + i)
                        }</span>
                        <span className={`text-sm font-medium flex-1 ${isSelected ? "text-white font-bold" : ""}`}>{opt}</span>
                        {isRevealed && isCorrect && <Check className="h-4 w-4 text-emerald-500" />}
                        {isRevealed && isSelected && !isCorrect && <X className="h-4 w-4 text-red-500" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {!isHost && (
            <div className="text-center">
              <span className="text-xs text-muted-foreground">Seus pontos: </span>
              <span className="text-sm font-bold text-primary">{totalPoints}</span>
            </div>
          )}
        </div>
      )}

      {/* Showing results */}
      {game && showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className="bg-amber-500 text-white"><Trophy className="h-3 w-3 mr-1" /> Resultados</Badge>
            {isHost && game.current_question_index < questions.length - 1 && (
              <Button onClick={handleNextQuestion} size="sm" className="rounded-full gap-1">
                Próxima <ArrowRight className="h-3 w-3" />
              </Button>
            )}
            {isHost && game.current_question_index >= questions.length - 1 && (
              <Button onClick={handleFinish} className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                <Crown className="h-3.5 w-3.5" /> Finalizar
              </Button>
            )}
          </div>

          {/* Leaderboard */}
          <Card>
            <CardContent className="py-3">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Trophy className="h-4 w-4 text-amber-500" /> Ranking</h4>
              {leaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sem respostas ainda</p>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((entry, i) => (
                    <motion.div
                      key={entry.display_name}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${
                        i === 0 ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/30"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-zinc-300 text-black" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                      <span className="flex-1 text-xs font-medium truncate">{entry.display_name}</span>
                      <span className="text-[10px] text-muted-foreground">{entry.correct_count}✓</span>
                      <span className="text-sm font-bold text-primary">{entry.total_points}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {!isHost && (
            <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">Seus pontos totais</p>
              <p className="text-2xl font-extrabold text-primary">{totalPoints}</p>
            </div>
          )}
        </div>
      )}

      {/* Finished */}
      {game && game.status === "finished" && (
        <Card className="border-amber-500/30">
          <CardContent className="py-8 text-center">
            <Crown className="h-12 w-12 mx-auto text-amber-500 mb-3" />
            <h3 className="font-bold text-xl mb-1">Quiz Finalizado!</h3>
            {!isHost && <p className="text-sm text-muted-foreground mb-2">Pontuação final: <strong className="text-primary">{totalPoints}</strong></p>}
            {leaderboard.length > 0 && (
              <div className="mt-4 space-y-1">
                {leaderboard.slice(0, 3).map((entry, i) => (
                  <div key={entry.display_name} className={`flex items-center gap-2 justify-center ${
                    i === 0 ? "text-amber-500" : "text-muted-foreground"
                  }`}>
                    <span className="font-bold">#{i + 1}</span>
                    <span className="text-sm">{entry.display_name}</span>
                    <span className="text-sm font-bold">{entry.total_points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KahootMultiplayerQuiz;
