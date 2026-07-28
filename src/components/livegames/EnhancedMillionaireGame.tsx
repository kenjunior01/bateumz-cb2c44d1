import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Volume2, VolumeX, Lightbulb, Users, Phone, CheckCircle2, XCircle, Trophy, Timer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { fetchTriviaQuestions, decodeHTMLEntities, shuffleAnswers, TriviaQuestion } from "@/lib/openTriviaDB";

interface PrizeLevel {
  level: number;
  amount: number;
  currency: string;
  is_safe_haven?: boolean;
}

interface Game {
  id: string;
  name: string;
  background_image_url?: string;
  background_color?: string;
  primary_color?: string;
  company_logo_url?: string;
  company_slogan?: string;
  total_questions: number;
  time_per_question: number;
  prize_structure?: PrizeLevel[];
  lifelines?: Record<string, boolean>;
  use_trivia_db?: boolean;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
}

interface Props {
  gameId?: string;
  onComplete?: (score: number, level: number, status: string) => void;
}

// Default prize structure for fallback
const DEFAULT_PRIZE_STRUCTURE: PrizeLevel[] = [
  { level: 1, amount: 100, currency: "MZN" },
  { level: 2, amount: 200, currency: "MZN" },
  { level: 3, amount: 300, currency: "MZN" },
  { level: 4, amount: 500, currency: "MZN" },
  { level: 5, amount: 1000, currency: "MZN", is_safe_haven: true },
  { level: 6, amount: 2000, currency: "MZN" },
  { level: 7, amount: 4000, currency: "MZN" },
  { level: 8, amount: 8000, currency: "MZN" },
  { level: 9, amount: 16000, currency: "MZN" },
  { level: 10, amount: 32000, currency: "MZN", is_safe_haven: true },
  { level: 11, amount: 64000, currency: "MZN" },
  { level: 12, amount: 125000, currency: "MZN" },
  { level: 13, amount: 250000, currency: "MZN" },
  { level: 14, amount: 500000, currency: "MZN" },
  { level: 15, amount: 1000000, currency: "MZN" },
];

export default function EnhancedMillionaireGame({ gameId: propGameId, onComplete }: Props) {
  const { gameId: urlGameId } = useParams();
  const gameId = propGameId || urlGameId;
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lifelinesUsed, setLifelinesUsed] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [triviaLoading, setTriviaLoading] = useState(false);
  const [flashClass, setFlashClass] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [questionKey, setQuestionKey] = useState(0);
  const [showCelebrationRays, setShowCelebrationRays] = useState(false);

  // Default questions for fallback
  const defaultQuestions: Question[] = [
    { id: "1", question_number: 1, question_text: "Qual é a capital de Moçambique?", option_a: "Beira", option_b: "Maputo", option_c: "Nampula", option_d: "Tete", correct_answer: "B" },
    { id: "2", question_number: 2, question_text: "Quantas províncias tem Moçambique?", option_a: "9", option_b: "10", option_c: "11", option_d: "12", correct_answer: "C" },
    { id: "3", question_number: 3, question_text: "Qual é a moeda oficial?", option_a: "Kwanza", option_b: "Real", option_c: "Metical", option_d: "Escudo", correct_answer: "C" },
  ];

  const loadGame = useCallback(async () => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: gameData, error: gameError } = await supabase
        .from("millionaire_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (gameError) {
        console.warn("Falling back to default game config:", gameError);
        // Create a default game object
        setGame({
          id: gameId,
          name: "Quem Quer Ser Milionário?",
          total_questions: 15,
          time_per_question: 30,
          background_color: "#0a0e17",
          primary_color: "#fbbf24",
          use_trivia_db: true,
        });
      } else {
        setGame(gameData as unknown as Game);
        setTimeLeft(gameData.time_per_question || 30);
      }


      // Check if we should use Open Trivia DB
      if (game?.use_trivia_db || true) { // Default to true for demo purposes
        await loadTriviaQuestions(game?.total_questions || 15);
      } else {
        const { data: qData, error: qError } = await supabase
          .from("millionaire_questions")
          .select("*")
          .eq("game_id", gameId)
          .order("question_number", { ascending: true });

        if (qError || !qData || qData.length === 0) {
          console.warn("Falling back to default questions:", qError);
          setQuestions(defaultQuestions);
          if (!game) {
            setGame({
              id: gameId,
              name: "Quem Quer Ser Milionário?",
              total_questions: 3,
              time_per_question: 30,
              background_color: "#0a0e17",
              primary_color: "#fbbf24",
            });
          }
        } else {
          setQuestions(qData);
        }
      }
    } catch (err) {
      console.error("Error loading millionaire game:", err);
      // Fallback to defaults
      setGame({
        id: gameId,
        name: "Quem Quer Ser Milionário?",
        total_questions: 3,
        time_per_question: 30,
        background_color: "#0a0e17",
        primary_color: "#fbbf24",
      });
      setQuestions(defaultQuestions);
    } finally {
      setLoading(false);
    }
  }, [gameId, game?.use_trivia_db, game?.total_questions]);

  const loadTriviaQuestions = async (count: number) => {
    setTriviaLoading(true);
    try {
      const triviaQuestions = await fetchTriviaQuestions(count, undefined, 'easy', 'multiple');
      
      if (triviaQuestions.length === 0) {
        setQuestions(defaultQuestions);
        toast.warning('Não foi possível carregar perguntas da base de dados, usando padrão');
      } else {
        const formattedQuestions: Question[] = triviaQuestions.map((tq, index) => {
          const shuffled = shuffleAnswers(
            decodeHTMLEntities(tq.correct_answer), 
            tq.incorrect_answers.map(a => decodeHTMLEntities(a))
          );
          
          return {
            id: `trivia-${index}`,
            question_number: index + 1,
            question_text: decodeHTMLEntities(tq.question),
            ...shuffled,
          };
        });
        setQuestions(formattedQuestions);
        toast.success(`Carregadas ${formattedQuestions.length} perguntas da Open Trivia DB!`);
      }
    } catch (error) {
      console.error('Failed to load trivia:', error);
      setQuestions(defaultQuestions);
    } finally {
      setTriviaLoading(false);
    }
  };

  useEffect(() => { loadGame(); }, [loadGame]);

  // Timer logic
  useEffect(() => {
    if (status !== 'playing' || answered || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [status, answered, timeLeft]);

  // Auto-fail on timeout
  useEffect(() => {
    if (timeLeft === 0 && !answered && status === 'playing') {
      setStatus('lost');
      toast.error("Tempo esgotado!");
    }
  }, [timeLeft, answered, status]);

  const currentQuestion = useMemo(() => questions[currentLevel - 1], [questions, currentLevel]);
  
  const prizeStructure = useMemo(() => {
    if (game?.prize_structure && game.prize_structure.length > 0) {
      return game.prize_structure;
    }
    // Use default prize structure adjusted to match total questions
    return DEFAULT_PRIZE_STRUCTURE.slice(0, game?.total_questions || 15);
  }, [game]);

  const currentPrize = useMemo(() => prizeStructure[currentLevel - 1], [prizeStructure, currentLevel]);

  const handleAnswer = async (choice: string) => {
    if (answered || status !== 'playing') return;
    setSelectedAnswer(choice);
    setAnswered(true);

    const isCorrect = choice === currentQuestion.correct_answer;

    setFlashClass("");
    setTimeout(() => {
      setFlashClass(isCorrect ? "game-flash-green" : "game-flash-red");
      setShakeKey(k => k + 1);
      setTimeout(() => setFlashClass(""), 600);
    }, 100);

    setTimeout(async () => {
      if (isCorrect) {
        if (currentLevel === (game?.total_questions || prizeStructure.length)) {
          setStatus('won');
          setShakeKey(k => k + 1);
          setShowCelebrationRays(true);
          setFlashClass("game-flash-gold");
          setTimeout(() => setFlashClass(""), 1200);
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.55 } });
          setTimeout(() => confetti({ particleCount: 150, spread: 140, origin: { x: 0.2, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff", "#fde68a"] }), 150);
          setTimeout(() => confetti({ particleCount: 150, spread: 140, origin: { x: 0.8, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff", "#fde68a"] }), 300);
          setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.3 }, colors: ["#fbbf24", "#ffffff"], shapes: ["star"] }), 500);
          setTimeout(() => {
            const end = Date.now() + 4000;
            const iv = setInterval(() => {
              if (Date.now() > end) return clearInterval(iv);
              confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ["#fbbf24", "#ffffff"] });
              confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ["#fbbf24", "#ffffff"] });
            }, 60);
          }, 800);
          saveSession('completed', currentPrize?.amount || 0);
          onComplete?.(currentPrize?.amount || 0, currentLevel, 'won');
        } else {
          toast.success("Resposta Correta!");
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, colors: ["#22c55e", "#4ade80", "#ffffff"] });
          setTimeout(() => confetti({ particleCount: 20, spread: 40, origin: { x: 0.5, y: 0.6 }, colors: ["#22c55e", "#ffffff"] }), 150);
          // Advance after delay
          setTimeout(() => {
            setCurrentLevel(prev => prev + 1);
            setAnswered(false);
            setSelectedAnswer(null);
            setDisabledOptions([]);
            setTimeLeft(game?.time_per_question || 30);
            setQuestionKey(k => k + 1);
          }, 1500);
        }
      } else {
        setStatus('lost');
        setShakeKey(k => k + 1);
        setTimeout(() => {
          confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 }, colors: ["#ef4444", "#991b1b"] });
        }, 500);
        const safePrize = calculateSafePrize();
        saveSession('abandoned', safePrize);
        onComplete?.(safePrize, currentLevel, 'lost');
      }
    }, 2000); // Dramatic pause
  };

  const calculateSafePrize = () => {
    const prizes = prizeStructure;
    let safeAmount = 0;
    // Níveis de segurança padrão: 5 e 10
    const defaultSafeLevels = [5, 10];
    for (let i = 0; i < currentLevel - 1; i++) {
      if (prizes[i]?.is_safe_haven || defaultSafeLevels.includes(prizes[i]?.level)) {
        safeAmount = prizes[i]?.amount || 0;
      }
    }
    return safeAmount;
  };

  const handleLifeline = (type: string) => {
    if (lifelinesUsed[type] || answered) return;
    setLifelinesUsed(prev => ({ ...prev, [type]: true }));
    
    if (type === '50_50') {
      const wrongAnswers = ['A', 'B', 'C', 'D'].filter(l => l !== currentQuestion.correct_answer);
      const toDisable = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, 2);
      setDisabledOptions(toDisable);
      toast.info("50/50 Ativado: Duas respostas erradas removidas.");
    }
  };

  const saveSession = async (finalStatus: string, prize: number) => {
    if (!user || !region || !gameId) return;
    try {
      await supabase.from("millionaire_sessions").insert({
        game_id: gameId,
        user_id: user.id,
        region_id: region.id,
        current_level: currentLevel,
        prize_won: prize,
        status: finalStatus
      });
    } catch (err) { console.error(err); }
  };

  const restartGame = () => {
    setCurrentLevel(1);
    setStatus('playing');
    setAnswered(false);
    setSelectedAnswer(null);
    setDisabledOptions([]);
    setTimeLeft(game?.time_per_question || 30);
    setLifelinesUsed({});
    setShowCelebrationRays(false);
  };

  if (loading || triviaLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0e17] gap-4 relative overflow-hidden">
      <div className="game-particle game-particle-1" style={{ top: '20%', left: '30%' }} />
      <div className="game-particle game-particle-3" style={{ bottom: '30%', right: '20%' }} />
      <div className="game-particle game-particle-5" style={{ top: '60%', left: '10%' }} />
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white text-lg"
      >Carregando perguntas...</motion.p>
    </div>
  );
  
  if (!game || !currentQuestion) return <Navigate to="/" replace />;

  return (
    <div key={shakeKey} className={`min-h-screen relative flex flex-col bg-[#0a0e17] text-white overflow-hidden ${shakeKey > 0 && status !== 'playing' ? 'game-screen-shake' : ''}`}
      style={{ 
        backgroundColor: game.background_color || '#0a0e17',
        backgroundImage: game.background_image_url ? `url(${game.background_image_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e17]/80 via-[#0a0e17]/60 to-[#0a0e17]/95"></div>
      {flashClass && <div className={`fixed inset-0 z-[100] pointer-events-none ${flashClass}`} />}
      {showCelebrationRays && <div className="celebration-rays" />}
      <div className="game-particle game-particle-1" style={{ top: '15%', left: '10%' }} />
      <div className="game-particle game-particle-2" style={{ top: '25%', right: '15%' }} />
      <div className="game-particle game-particle-3" style={{ bottom: '20%', left: '20%' }} />
      <div className="game-particle game-particle-4" style={{ top: '50%', right: '8%' }} />
      <div className="game-particle game-particle-5" style={{ bottom: '10%', right: '25%' }} />
      <div className="game-particle game-particle-6" style={{ top: '70%', left: '5%' }} />

      {/* Top Header */}
      <div className="relative z-10 p-6 flex justify-between items-center border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.5)]">
            <Trophy className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest">{game.name}</h1>
            <p className="text-xs text-white/50 uppercase">Nível {currentLevel} • {currentPrize?.amount} {currentPrize?.currency}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => loadTriviaQuestions(game?.total_questions || 15)} 
            title="Recarregar perguntas"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-500 ${
            timeLeft <= 5 ? 'bg-red-500/20 border-red-500/50 timer-urgent' :
            timeLeft <= 10 ? 'bg-amber-500/20 border-amber-500/40' :
            'bg-black/40 border-white/10'
          }`}>
            <Timer className={`w-5 h-5 transition-colors duration-500 ${
              timeLeft <= 5 ? 'text-red-400' :
              timeLeft <= 10 ? 'text-amber-400' :
              'text-primary'
            }`} />
            <span className={`text-xl font-mono font-bold transition-colors duration-500 ${
              timeLeft <= 5 ? 'text-red-400' :
              timeLeft <= 10 ? 'text-amber-400' :
              'text-white'
            }`}>{timeLeft}s</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="absolute top-[72px] left-0 right-0 h-1 bg-white/5 z-20">
        <div
          className="h-full transition-colors duration-1000"
          style={{
            width: status === 'playing' && !answered ? `${(timeLeft / (game?.time_per_question || 30)) * 100}%` : '0%',
            background: timeLeft <= 5 ? 'linear-gradient(90deg, #ef4444, #f87171)' : timeLeft <= 10 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, hsl(var(--primary)), #fbbf24)',
            transition: 'width 1s linear, background 1s ease',
            boxShadow: timeLeft <= 5 ? '0 0 15px rgba(239, 68, 68, 0.5)' : timeLeft <= 10 ? '0 0 10px rgba(251, 191, 36, 0.3)' : '0 0 5px rgba(251, 191, 36, 0.2)'
          }}
        />
      </div>

      <div className="relative z-10 flex-1 container mx-auto px-4 py-8 grid lg:grid-cols-[1fr_320px] gap-8">
        
        {/* Main Game Area */}
        <div className="flex flex-col justify-center space-y-12">
          
          {/* Question Box with Branding */}
          <div className="relative space-y-6">
            {(game.company_logo_url || game.company_slogan) && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                {game.company_logo_url && (
                  <img src={game.company_logo_url} alt="Logo" className="h-16 object-contain mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                )}
                {game.company_slogan && (
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/80">{game.company_slogan}</p>
                )}
              </motion.div>
            )}
            
            <div className="relative">
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-[2px] bg-primary"></div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-[2px] bg-primary"></div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                key={questionKey}
                className={"relative bg-black/60 backdrop-blur-xl border-2 " + (timeLeft <= 5 && !answered ? "border-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.3)]" : timeLeft <= 10 && !answered ? "border-amber-500/40 shadow-[0_0_40px_rgba(251,191,36,0.2)]" : "border-primary/30 shadow-[0_0_40px_rgba(0,0,0,0.5)]") + " p-8 md:p-12 rounded-[2rem] text-center overflow-hidden"}
              >
                <div className="lightning-effect" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <p className="text-xs uppercase tracking-[0.3em] text-primary/60 mb-4 font-bold">Pergunta {currentLevel} de {game?.total_questions || prizeStructure.length}</p>
                <h2 className="text-2xl md:text-4xl font-bold leading-tight">
                  {currentQuestion.question_text}
                </h2>
              </motion.div>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D'].map((letter) => {
              const optionKey = `option_${letter.toLowerCase()}` as keyof Question;
              const text = currentQuestion[optionKey] as string;
              const isSelected = selectedAnswer === letter;
              const isCorrect = letter === currentQuestion.correct_answer;
              const isDisabled = disabledOptions.includes(letter);

              let stateClass = "border-white/20 bg-white/5 hover:bg-white/10 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]";
              if (isSelected) stateClass = "border-primary bg-primary/20 text-primary shadow-[0_0_25px_rgba(var(--primary),0.4)]";
              if (answered && isCorrect) stateClass = "border-green-500 bg-green-500/20 text-green-500 option-reveal-correct";
              if (answered && isSelected && !isCorrect) stateClass = "border-red-500 bg-red-500/20 text-red-500 option-reveal-wrong";
              if (isDisabled) stateClass = "opacity-20 pointer-events-none grayscale";

              return (
                <motion.button
                  key={`${questionKey}-${letter}`}
                  initial={{ opacity: 0, x: letter < 'C' ? -30 : 30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 0.1 + (letter.charCodeAt(0) - 'A'.charCodeAt(0)) * 0.08, type: "spring", stiffness: 180, damping: 20 }}
                  onClick={() => handleAnswer(letter)}
                  disabled={answered || isDisabled || status !== 'playing'}
                  className={`relative group flex items-center p-1 rounded-full border-2 transition-all duration-300 ${stateClass}`}
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 flex items-center justify-center font-black text-primary group-hover:bg-primary group-hover:text-black group-hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all duration-200 text-sm md:text-base">
                    {letter}
                  </div>
                  <span className="flex-1 px-4 md:px-6 font-semibold text-base md:text-lg text-left">{text}</span>
                  <div className="w-12 h-[2px] bg-white/10 absolute -right-4 top-1/2 -translate-y-1/2 group-hover:bg-primary transition-colors hidden md:block"></div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Pyramid & Lifelines */}
        <div className="space-y-6">
          {/* Lifelines */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-6">
              <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-4">Ajudas Disponíveis</h3>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => handleLifeline('50_50')}
                  disabled={lifelinesUsed['50_50'] || answered}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${lifelinesUsed['50_50'] ? 'opacity-30 grayscale border-white/10' : 'border-primary/30 bg-primary/5 hover:bg-primary/20'}`}
                >
                  <Lightbulb className="w-6 h-6 text-primary" />
                  <span className="text-[10px] font-bold">50:50</span>
                </button>
                <button disabled className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 opacity-30 grayscale">
                  <Users className="w-6 h-6" />
                  <span className="text-[10px] font-bold">PÚBLICO</span>
                </button>
                <button disabled className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 opacity-30 grayscale">
                  <Phone className="w-6 h-6" />
                  <span className="text-[10px] font-bold">LIGAR</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Prize Pyramid */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Pirâmide de Prémios</h3>
                <Badge variant="outline" className="border-primary text-primary">{game.total_questions} Níveis</Badge>
              </div>
              <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col-reverse">
                {prizeStructure.map((p, i) => {
                  const isCurrent = currentLevel === p.level;
                  const isPast = currentLevel > p.level;
                  return (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0, scale: isCurrent ? 1.05 : 1 }}
                      transition={{ delay: (prizeStructure.length - i) * 0.05, type: "spring", stiffness: 200, damping: 20 }}
                      className={`flex items-center gap-4 px-4 py-2 rounded-lg transition-all ${isCurrent ? 'bg-primary text-black font-black shadow-lg prize-glow' : isPast ? 'opacity-40 line-through' : 'hover:bg-white/5'}`}
                    >
                      <span className={`text-xs w-6 font-bold ${isCurrent ? 'text-black/60' : 'text-primary'}`}>{p.level}</span>
                      <span className="flex-1 text-sm">{p.amount.toLocaleString()} {p.currency}</span>
                      {p.is_safe_haven && <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-black/60' : 'text-primary'}`} />}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Overlays */}
      <AnimatePresence>
        {status !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center space-y-8 p-12 rounded-[3rem] border-2 border-white/10 bg-white/5 win-overlay-enter game-shimmer"
            >
              {status === 'won' ? (
                <>
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-24 h-24 bg-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.5)]"
                  >
                    <Trophy className="w-12 h-12 text-black" />
                  </motion.div>
                  <h2 className="text-6xl font-black italic uppercase tracking-tighter">MILIONÁRIO!</h2>
                  <p className="text-2xl text-white/70">Ganhou o prémio máximo de <br/><span className="text-primary text-4xl font-black">{currentPrize?.amount} {currentPrize?.currency}</span></p>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="w-24 h-24 bg-red-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">
                    <XCircle className="w-12 h-12 text-white" />
                  </motion.div>
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter">FIM DE JOGO</h2>
                  <p className="text-xl text-white/70">Leva para casa: <br/><span className="text-primary text-3xl font-black">{calculateSafePrize()} {prizeStructure[0]?.currency || 'MZN'}</span></p>
                </>
              )}
              <div className="flex gap-4 justify-center pt-4">
                <Button size="lg" className="px-12 py-8 text-xl font-black rounded-full spin-btn-glow" onClick={restartGame}>TENTAR NOVAMENTE</Button>
                <Button size="lg" variant="outline" className="px-12 py-8 text-xl font-black rounded-full border-white/20" onClick={() => window.location.href = '/'}>SAIR</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
