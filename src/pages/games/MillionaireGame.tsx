import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Volume2, VolumeX, Lightbulb, Users, Phone, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import "./MillionaireGame.css";

interface Game {
  id: string;
  name: string;
  background_image_url: string;
  background_color: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  total_questions: number;
  time_per_question: number;
  prize_structure: any[];
  lifelines: any;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  question_image_url: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
}

interface GameState {
  currentLevel: number;
  selectedAnswer: string | null;
  answered: boolean;
  isCorrect: boolean | null;
  timeLeft: number;
  lifelines: Record<string, boolean>;
  prizeWon: number;
}

export default function MillionaireGame() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentLevel: 1,
    selectedAnswer: null,
    answered: false,
    isCorrect: null,
    timeLeft: 30,
    lifelines: {},
    prizeWon: 0,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (!gameId || !user) return;
    loadGame();
  }, [gameId, user]);

  useEffect(() => {
    if (!gameState.answered || gameState.timeLeft <= 0) return;

    const timer = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.answered, gameState.timeLeft]);

  const loadGame = async () => {
    setLoading(true);
    try {
      const { data: gameData, error: gameError } = await supabase
        .from("millionaire_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      const { data: questionsData, error: questionsError } = await supabase
        .from("millionaire_questions")
        .select("*")
        .eq("game_id", gameId)
        .order("question_number");

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      setGameState((prev) => ({
        ...prev,
        lifelines: gameData.lifelines,
        timeLeft: gameData.time_per_question,
      }));
    } catch (error) {
      console.error("Error loading game:", error);
      toast.error("Erro ao carregar jogo");
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[gameState.currentLevel - 1];
  const currentPrize = game?.prize_structure[gameState.currentLevel - 1];

  const handleAnswerSelect = (answer: string) => {
    if (gameState.answered) return;
    setGameState((prev) => ({ ...prev, selectedAnswer: answer }));
  };

  const handleSubmitAnswer = async () => {
    if (!gameState.selectedAnswer || !currentQuestion) return;

    const isCorrect = gameState.selectedAnswer === currentQuestion.correct_answer;
    setGameState((prev) => ({
      ...prev,
      answered: true,
      isCorrect,
    }));

    playSound(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setShowExplanation(true);
    }
  };

  const handleContinue = async () => {
    if (!gameState.isCorrect) {
      // Game Over
      await saveGameSession();
      return;
    }

    if (gameState.currentLevel >= (game?.total_questions || 15)) {
      // Won!
      await saveGameSession(true);
      return;
    }

    // Next question
    setGameState((prev) => ({
      ...prev,
      currentLevel: prev.currentLevel + 1,
      selectedAnswer: null,
      answered: false,
      isCorrect: null,
      timeLeft: game?.time_per_question || 30,
      prizeWon: currentPrize?.amount || 0,
    }));
    setShowExplanation(false);
  };

  const usedLifeline = async (lifelineType: string) => {
    if (!gameState.lifelines[lifelineType]) {
      toast.info("Você já usou essa ajuda!");
      return;
    }

    setGameState((prev) => ({
      ...prev,
      lifelines: { ...prev.lifelines, [lifelineType]: false },
    }));

    playSound("lifeline");

    // Implement lifeline logic
    if (lifelineType === "50_50") {
      // Remove 2 wrong answers
    } else if (lifelineType === "ask_audience") {
      // Show audience poll
    } else if (lifelineType === "phone_a_friend") {
      // Show phone interface
    }
  };

  const saveGameSession = async (won = false) => {
    try {
      const { error } = await supabase.from("millionaire_sessions").insert({
        game_id: gameId,
        user_id: user!.id,
        region_id: "default-region", // Should come from context
        current_level: gameState.currentLevel,
        prize_won: gameState.prizeWon,
        status: won ? "completed" : "abandoned",
        answers: {}, // Store answers
        duration_seconds: 0,
      });

      if (error) throw error;
      toast.success(won ? "Parabéns! Você ganhou!" : "Fim de jogo");
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const playSound = (type: string) => {
    if (!soundEnabled) return;
    // Implement sound effects
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!game || !currentQuestion) {
    return <Navigate to="/games" replace />;
  }

  return (
    <div
      className="min-h-screen millionaire-game"
      style={{
        backgroundImage: game.background_image_url
          ? `url(${game.background_image_url})`
          : undefined,
        backgroundColor: game.background_color,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-white mb-2">
              {game.name}
            </h1>
            <p className="text-white/80">Pergunta {gameState.currentLevel} de {game.total_questions}</p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/20"
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          {/* Main Game Area */}
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-white">
                <span>Progresso</span>
                <span>{gameState.currentLevel}/{game.total_questions}</span>
              </div>
              <Progress
                value={(gameState.currentLevel / game.total_questions) * 100}
                className="h-2"
              />
            </div>

            {/* Question Card */}
            <Card className="bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">{currentQuestion.question_text}</CardTitle>
                {currentQuestion.question_image_url && (
                  <img
                    src={currentQuestion.question_image_url}
                    alt="Question"
                    className="mt-4 rounded-lg max-h-64 object-cover w-full"
                  />
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Timer */}
                {!gameState.answered && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{
                          width: `${(gameState.timeLeft / (game.time_per_question || 30)) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="font-bold text-lg">{gameState.timeLeft}s</span>
                  </div>
                )}

                {/* Answer Options */}
                <div className="grid gap-3 mt-6">
                  {["A", "B", "C", "D"].map((letter) => {
                    const optionKey = `option_${letter.toLowerCase()}`;
                    const optionText = currentQuestion[optionKey as keyof Question];
                    const isSelected = gameState.selectedAnswer === letter;
                    const isCorrectAnswer = letter === currentQuestion.correct_answer;
                    const showCorrect =
                      gameState.answered && isCorrectAnswer;
                    const showWrong =
                      gameState.answered && isSelected && !isCorrectAnswer;

                    return (
                      <Button
                        key={letter}
                        onClick={() => handleAnswerSelect(letter)}
                        disabled={gameState.answered}
                        className={`h-auto py-4 px-6 text-left justify-start text-lg font-semibold transition-all ${
                          isSelected
                            ? "ring-2 ring-offset-2"
                            : ""
                        } ${
                          showCorrect
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : showWrong
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <span className="font-bold mr-4 text-xl">{letter}.</span>
                        <span>{optionText}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showExplanation && currentQuestion.explanation && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="font-semibold text-blue-900 mb-2">Explicação:</p>
                    <p className="text-blue-800">{currentQuestion.explanation}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8">
                  {!gameState.answered ? (
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!gameState.selectedAnswer}
                      className="flex-1 h-12 text-lg font-bold"
                      style={{ backgroundColor: game.primary_color, color: "#000" }}
                    >\n                      Confirmar Resposta\n                    </Button>\n                  ) : (\n                    <Button\n                      onClick={handleContinue}\n                      className=\"flex-1 h-12 text-lg font-bold bg-green-500 hover:bg-green-600\"\n                    >\n                      {gameState.isCorrect ? \"Próxima Pergunta\" : \"Tentar Novamente\"}\n                    </Button>\n                  )}\n                </div>\n              </CardContent>\n            </Card>\n          </div>\n\n          {/* Sidebar - Prize Pyramid */}\n          <div className=\"space-y-4\">\n            {/* Lifelines */}\n            <Card className=\"bg-white/95 backdrop-blur\">\n              <CardHeader>\n                <CardTitle className=\"text-sm\">Ajudas</CardTitle>\n              </CardHeader>\n              <CardContent className=\"space-y-2\">\n                {gameState.lifelines[\"50_50\"] && (\n                  <Button\n                    onClick={() => usedLifeline(\"50_50\")}\n                    variant=\"outline\"\n                    className=\"w-full justify-start\"\n                  >\n                    <Lightbulb className=\"h-4 w-4 mr-2\" />\n                    50/50\n                  </Button>\n                )}\n                {gameState.lifelines[\"ask_audience\"] && (\n                  <Button\n                    onClick={() => usedLifeline(\"ask_audience\")}\n                    variant=\"outline\"\n                    className=\"w-full justify-start\"\n                  >\n                    <Users className=\"h-4 w-4 mr-2\" />\n                    Público\n                  </Button>\n                )}\n                {gameState.lifelines[\"phone_a_friend\"] && (\n                  <Button\n                    onClick={() => usedLifeline(\"phone_a_friend\")}\n                    variant=\"outline\"\n                    className=\"w-full justify-start\"\n                  >\n                    <Phone className=\"h-4 w-4 mr-2\" />\n                    Telefonar\n                  </Button>\n                )}\n              </CardContent>\n            </Card>\n\n            {/* Prize Pyramid */}\n            <Card className=\"bg-white/95 backdrop-blur\">\n              <CardHeader>\n                <CardTitle className=\"text-sm\">Prêmios</CardTitle>\n              </CardHeader>\n              <CardContent>\n                <div className=\"space-y-2 max-h-96 overflow-y-auto\">\n                  {game.prize_structure.map((prize, index) => (\n                    <div\n                      key={index}\n                      className={`p-2 rounded text-sm font-semibold transition-all ${\n                        index + 1 === gameState.currentLevel\n                          ? \"bg-yellow-300 text-black scale-105\"\n                          : index + 1 < gameState.currentLevel\n                          ? \"bg-green-200 text-green-900\"\n                          : \"bg-gray-200 text-gray-600\"\n                      }`}\n                    >\n                      <div className=\"flex justify-between\">\n                        <span>Nível {prize.level}</span>\n                        <span>{prize.currency} {prize.amount.toLocaleString()}</span>\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              </CardContent>\n            </Card>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n}\n
