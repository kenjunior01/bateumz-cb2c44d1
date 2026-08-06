import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  VolumeX,
  Lightbulb,
  Users,
  Phone,
  CheckCircle2,
  XCircle,
  Trophy,
  Timer,
  RefreshCw,
  ChevronRight,
  Star,
  Crown,
  Flame,
  LogOut,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { fetchTriviaQuestions, decodeHTMLEntities, shuffleAnswers } from "@/lib/openTriviaDB";

interface PrizeLevel {
  level: number;
  amount: number;
  currency: string;
  is_safe_haven?: boolean;
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

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  highest_level: number;
  highest_prize: number;
  total_plays: number;
  total_wins: number;
  average_level: number;
  last_played_at: string;
}

const PRIZE_STRUCTURE: PrizeLevel[] = [
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

const defaultQuestions: Question[] = [
  { id: "1", question_number: 1, question_text: "Qual e a capital de Mocambique?", option_a: "Beira", option_b: "Maputo", option_c: "Nampula", option_d: "Tete", correct_answer: "B" },
  { id: "2", question_number: 2, question_text: "Quantas provincias tem Mocambique?", option_a: "9", option_b: "10", option_c: "11", option_d: "12", correct_answer: "C" },
  { id: "3", question_number: 3, question_text: "Qual e a moeda oficial de Mocambique?", option_a: "Kwanza", option_b: "Real", option_c: "Metical", option_d: "Escudo", correct_answer: "C" },
];

type Screen = "lobby" | "playing" | "won" | "lost";

type Phase = "question-in" | "thinking" | "reveal" | "transition";

export default function MillionairePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { region } = useRegionalTheme();

  const [screen, setScreen] = useState<Screen>("lobby");
  const [phase, setPhase] = useState<Phase>("question-in");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [lifelinesUsed, setLifelinesUsed] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameName, setGameName] = useState("");
  const [bgColor, setBgColor] = useState("#020817");
  const [primaryColor, setPrimaryColor] = useState("#fbbf24");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [audienceVotes, setAudienceVotes] = useState<number[]>([]);
  const [showAudience, setShowAudience] = useState(false);
  const [phoneFriend, setPhoneFriend] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [questionKey, setQuestionKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const totalQuestions = 15;
  const currentQuestion = useMemo(() => questions[currentLevel - 1], [questions, currentLevel]);
  const currentPrize = PRIZE_STRUCTURE[currentLevel - 1];

  useEffect(() => {
    loadGameData();
    loadLeaderboard();
  }, []);

  const loadGameData = async () => {
    if (gameId) {
      const { data } = await supabase.from("millionaire_games").select("*").eq("id", gameId).single();
      if (data) {
        setGameName(data.name || "Quem Quer Ser Milionario?");
        setBgColor(data.background_color || "#020817");
        setPrimaryColor(data.primary_color || "#fbbf24");
      }
    }
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    if (!gameId) return;
    const { data } = await (supabase as any)
      .from("millionaire_leaderboard")
      .select("*, profiles!inner(display_name, avatar_url)")
      .eq("game_id", gameId)
      .order("highest_prize", { ascending: false })
      .limit(10);
    if (data) {
      setLeaderboard(data.map((d: any) => ({
        user_id: d.user_id,
        display_name: d.profiles?.display_name || "Anonymous",
        avatar_url: d.profiles?.avatar_url,
        highest_level: d.highest_level,
        highest_prize: d.highest_prize,
        total_plays: d.total_plays,
        total_wins: d.total_wins,
        average_level: d.average_level,
        last_played_at: d.last_played_at,
      })));
    }
  };

  const startGame = async () => {
    setLoading(true);
    const trivia = await fetchTriviaQuestions(totalQuestions, undefined, "easy", "multiple");
    if (trivia.length > 0) {
      const formatted: Question[] = trivia.map((tq, i) => {
        const s = shuffleAnswers(decodeHTMLEntities(tq.correct_answer), tq.incorrect_answers.map(a => decodeHTMLEntities(a)));
        return { id: `t-${i}`, question_number: i + 1, question_text: decodeHTMLEntities(tq.question), ...s };
      });
      setQuestions(formatted);
    } else {
      setQuestions(defaultQuestions);
      toast.warning("Perguntas padrao carregadas");
    }
    setLoading(false);
    setScreen("playing");
    setCurrentLevel(1);
    setSelectedAnswer(null);
    setAnswered(false);
    setTimeLeft(45);
    setLifelinesUsed({});
    setDisabledOptions([]);
    setAudienceVotes([]);
    setPhoneFriend("");
  };

  useEffect(() => {
    if (screen !== "playing" || answered) return;
    timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, answered, currentLevel]);

  useEffect(() => {
    if (timeLeft === 0 && !answered && screen === "playing") {
      setAnswered(true);
      setPhase("reveal");
      setTimeout(() => {
        setScreen("lost");
        toast.error("Tempo esgotado!");
      }, 2500);
    }
  }, [timeLeft, answered, screen]);

  const handleAnswer = (choice: string) => {
    if (answered || screen !== "playing") return;
    setSelectedAnswer(choice);
    setAnswered(true);
    setPhase("thinking");

    setTimeout(() => {
      setPhase("reveal");
      const isCorrect = choice === currentQuestion.correct_answer;

      if (isCorrect) {
        fireCorrectEffects();
        if (currentLevel === totalQuestions) {
          setTimeout(() => {
            fireWinEffects();
            setScreen("won");
            saveSession("completed", currentPrize.amount);
          }, 2000);
        } else {
          setTimeout(() => {
            setPhase("transition");
            setTimeout(() => {
              setCurrentLevel(p => p + 1);
              setAnswered(false);
              setSelectedAnswer(null);
              setDisabledOptions([]);
              setTimeLeft(45);
              setAudienceVotes([]);
              setPhoneFriend("");
              setQuestionKey(k => k + 1);
              setPhase("question-in");
            }, 800);
          }, 2000);
        }
      } else {
        fireWrongEffects();
        setTimeout(() => {
          setScreen("lost");
          saveSession("abandoned", calculateSafePrize());
        }, 2500);
      }
    }, 3000);
  };

  const calculateSafePrize = () => {
    let safe = 0;
    for (let i = 0; i < currentLevel - 1; i++) {
      if (PRIZE_STRUCTURE[i]?.is_safe_haven) safe = PRIZE_STRUCTURE[i].amount;
    }
    return safe;
  };

  const saveSession = async (status: string, prize: number) => {
    if (!user || !region || !gameId) return;
    await supabase.from("millionaire_sessions").insert({
      game_id: gameId,
      user_id: user.id,
      region_id: region.id,
      current_level: currentLevel,
      prize_won: prize,
      status,
    });
    loadLeaderboard();
  };

  const handle5050 = () => {
    if (lifelinesUsed["50_50"] || answered) return;
    setLifelinesUsed(p => ({ ...p, "50_50": true }));
    const wrong = ["A", "B", "C", "D"].filter(l => l !== currentQuestion.correct_answer);
    const toDisable = wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
    setDisabledOptions(toDisable);
    toast.info("50:50 - Duas respostas removidas!");
  };

  const handleAudience = () => {
    if (lifelinesUsed.audience || answered) return;
    setLifelinesUsed(p => ({ ...p, audience: true }));
    setShowAudience(true);
    const correct = currentQuestion.correct_answer.charCodeAt(0) - 65;
    const votes = [0, 0, 0, 0].map((_, i) => {
      if (i === correct) return 40 + Math.floor(Math.random() * 40);
      return Math.floor(Math.random() * 20);
    });
    const total = votes.reduce((a, b) => a + b, 0);
    setAudienceVotes(votes.map(v => Math.round((v / total) * 100)));
    toast.info("O Publico votou!");
    setTimeout(() => setShowAudience(false), 5000);
  };

  const handlePhone = () => {
    if (lifelinesUsed.phone || answered) return;
    setLifelinesUsed(p => ({ ...p, phone: true }));
    setShowPhone(true);
    const friends = ["Ana (Professora)", "Carlos (Engenheiro)", "Maria (Medica)", "Joao (Programador)"];
    const friend = friends[Math.floor(Math.random() * friends.length)];
    const correct = currentQuestion.correct_answer;
    const correctText = currentQuestion[`option_${correct.toLowerCase()}` as keyof Question] as string;
    const confidence = Math.random() > 0.2 ? "bastante seguro" : "nao tenho certeza";
    setPhoneFriend(`${friend} diz: \"Acho que e ${correctText}... estou ${confidence}!\"`);
    toast.info(`Ligacao para ${friend.split(" (")[0]}...`);
    setTimeout(() => setShowPhone(false), 5000);
  };

  const fireCorrectEffects = () => {
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ["#22c55e", "#4ade80", "#ffffff"] });
  };

  const fireWrongEffects = () => {
    setTimeout(() => confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 }, colors: ["#ef4444", "#991b1b"] }), 500);
  };

  const fireWinEffects = () => {
    confetti({ particleCount: 300, spread: 120, origin: { y: 0.5 } });
    setTimeout(() => confetti({ particleCount: 200, spread: 150, origin: { x: 0.2, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff", "#fde68a"] }), 200);
    setTimeout(() => confetti({ particleCount: 200, spread: 150, origin: { x: 0.8, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff", "#fde68a"] }), 400);
    setTimeout(() => {
      const end = Date.now() + 5000;
      const iv = setInterval(() => {
        if (Date.now() > end) return clearInterval(iv);
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ["#fbbf24", "#ffffff"] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ["#fbbf24", "#ffffff"] });
      }, 60);
    }, 800);
  };

  const formatPrize = (n: number) => n.toLocaleString("pt-MZ");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full border-4 border-amber-400/30 border-t-amber-400 animate-spin" />
            <Crown className="w-8 h-8 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-amber-400/60 mt-4 text-sm uppercase tracking-[0.3em]">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden font-sans" style={{ backgroundColor: bgColor }}>
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-transparent to-black/40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-amber-500/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[100px]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[100px]" />

      <div className="relative z-10">
        {screen === "lobby" && <LobbyScreen gameName={gameName} primaryColor={primaryColor} leaderboard={leaderboard} onStart={startGame} user={user} onLogin={() => navigate("/login")} formatPrize={formatPrize} />}
        {screen === "playing" && currentQuestion && (
          <GameScreen
            key={questionKey}
            gameName={gameName}
            primaryColor={primaryColor}
            currentLevel={currentLevel}
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            currentPrize={currentPrize}
            timeLeft={timeLeft}
            maxTime={45}
            selectedAnswer={selectedAnswer}
            answered={answered}
            phase={phase}
            lifelinesUsed={lifelinesUsed}
            disabledOptions={disabledOptions}
            prizeStructure={PRIZE_STRUCTURE}
            soundEnabled={soundEnabled}
            audienceVotes={audienceVotes}
            showAudience={showAudience}
            phoneFriend={phoneFriend}
            showPhone={showPhone}
            onAnswer={handleAnswer}
            on5050={handle5050}
            onAudience={handleAudience}
            onPhone={handlePhone}
            onToggleSound={() => setSoundEnabled(p => !p)}
            onQuit={() => setScreen("lobby")}
            formatPrize={formatPrize}
          />
        )}
        {(screen === "won" || screen === "lost") && (
          <ResultScreen
            screen={screen}
            gameName={gameName}
            primaryColor={primaryColor}
            currentLevel={currentLevel}
            currentPrize={currentPrize}
            safePrize={calculateSafePrize()}
            prizeStructure={PRIZE_STRUCTURE}
            onRestart={() => { setScreen("lobby"); loadLeaderboard(); }}
            onQuit={() => setScreen("lobby")}
            formatPrize={formatPrize}
          />
        )}
      </div>
    </div>
  );
}

function LobbyScreen({ gameName, primaryColor, leaderboard, onStart, user, onLogin, formatPrize }: {
  gameName: string;
  primaryColor: string;
  leaderboard: LeaderboardEntry[];
  onStart: () => void;
  user: any;
  onLogin: () => void;
  formatPrize: (n: number) => string;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="max-w-2xl w-full text-center space-y-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
          >
            <div className="relative inline-block">
              <div className="absolute -inset-4 rounded-full blur-xl opacity-40" style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }} />
              <div className="relative w-28 h-28 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, #b45309)` }}>
                <Crown className="w-14 h-14 text-black" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-6 rounded-full border-2 border-dashed"
                style={{ borderColor: `${primaryColor}30` }}
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter" style={{ textShadow: `0 0 40px ${primaryColor}40` }}>
              Quem Quer Ser
            </h1>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter" style={{ color: primaryColor, textShadow: `0 0 60px ${primaryColor}60` }}>
              Milionario?
            </h1>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-white/50 text-lg">
            15 perguntas. 3 ajudas. 1 milhao de MZN.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="space-y-4">
            <div className="flex items-center justify-center gap-8 text-white/40 text-sm">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" style={{ color: primaryColor }} /> Niveis de seguranca</div>
              <div className="flex items-center gap-2"><Star className="w-4 h-4" style={{ color: primaryColor }} /> 15 niveis</div>
              <div className="flex items-center gap-2"><Flame className="w-4 h-4" style={{ color: primaryColor }} /> 3 ajudas</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }}>
            {user ? (
              <button
                onClick={onStart}
                className="group relative px-16 py-5 rounded-full text-xl font-black text-black uppercase tracking-wider overflow-hidden transition-transform hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, #b45309)` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">JOGAR</span>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="group relative px-16 py-5 rounded-full text-xl font-black text-black uppercase tracking-wider overflow-hidden transition-transform hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, #b45309)` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">ENTRAR PARA JOGAR</span>
              </button>
            )}
          </motion.div>

          {leaderboard.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-8">
              <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Melhores Jogadores</h3>
                <div className="space-y-2 w-full max-w-sm">
                  {leaderboard.slice(0, 5).map((entry, i) => (
                    <div key={entry.user_id} className="flex items-center gap-3 text-sm">
                      <span className="w-6 text-center font-black" style={{ color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#475569" }}>{i + 1}</span>
                      <span className="flex-1 text-white/70 truncate">{entry.display_name}</span>
                      <span className="font-bold text-white/50">Nv.{entry.highest_level}</span>
                      <span className="font-black min-w-[80px] text-right" style={{ color: i === 0 ? "#fbbf24" : "#94a3b8" }}>{formatPrize(entry.highest_prize)} MZN</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function GameScreen({ gameName, primaryColor, currentLevel, totalQuestions, currentQuestion, currentPrize, timeLeft, maxTime, selectedAnswer, answered, phase, lifelinesUsed, disabledOptions, prizeStructure, soundEnabled, audienceVotes, showAudience, phoneFriend, showPhone, onAnswer, on5050, onAudience, onPhone, onToggleSound, onQuit, formatPrize }: {
  gameName: string;
  primaryColor: string;
  currentLevel: number;
  totalQuestions: number;
  currentQuestion: Question;
  currentPrize: PrizeLevel;
  timeLeft: number;
  maxTime: number;
  selectedAnswer: string | null;
  answered: boolean;
  phase: Phase;
  lifelinesUsed: Record<string, boolean>;
  disabledOptions: string[];
  prizeStructure: PrizeLevel[];
  soundEnabled: boolean;
  audienceVotes: number[];
  showAudience: boolean;
  phoneFriend: string;
  showPhone: boolean;
  onAnswer: (c: string) => void;
  on5050: () => void;
  onAudience: () => void;
  onPhone: () => void;
  onToggleSound: () => void;
  onQuit: () => void;
  formatPrize: (n: number) => string;
}) {
  const isUrgent = timeLeft <= 10;
  const isCritical = timeLeft <= 5;
  const isCorrect = selectedAnswer === currentQuestion.correct_answer;
  const isWrong = answered && selectedAnswer !== null && !isCorrect;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative z-20 px-4 py-3 flex items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={onQuit} className="text-white/40 hover:text-white/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${primaryColor}20` }}>
            <Crown className="w-4 h-4" style={{ color: primaryColor }} />
          </div>
          <span className="text-white/60 text-xs uppercase tracking-widest font-bold hidden sm:block">Pergunta {currentLevel} de {totalQuestions}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all duration-300 ${isCritical ? "bg-red-500/20 border-red-500/50" : isUrgent ? "bg-amber-500/20 border-amber-500/40" : "bg-black/40 border-white/10"}`}>
            <Timer className={`w-4 h-4 transition-colors ${isCritical ? "text-red-400 animate-pulse" : isUrgent ? "text-amber-400" : "text-white/60"}`} />
            <span className={`text-lg font-mono font-bold tabular-nums min-w-[2ch] text-center ${isCritical ? "text-red-400" : isUrgent ? "text-amber-400" : "text-white"}`}>{timeLeft}</span>
          </div>
          <button onClick={onToggleSound} className="text-white/40 hover:text-white/80 p-2 transition-colors">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="relative z-20 h-1 bg-white/5">
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{
            width: answered ? "0%" : `${(timeLeft / maxTime) * 100}%`,
            background: isCritical ? "linear-gradient(90deg, #ef4444, #f87171)" : isUrgent ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : `linear-gradient(90deg, ${primaryColor}, ${primaryColor}80)`,
          }}
        />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col justify-center p-4 md:p-8 lg:p-12 space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="border-white/10 text-white/40 text-xs">NIVEL {currentLevel}</Badge>
              <span className="text-white/30">|</span>
              <Badge className="text-xs font-bold" style={{ background: `${primaryColor}20`, color: primaryColor, border: `1px solid ${primaryColor}30` }}>
                {formatPrize(currentPrize.amount)} {currentPrize.currency}
              </Badge>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 25 }}
                className="relative max-w-3xl mx-auto"
              >
                <div
                  className="relative p-8 md:p-12 rounded-3xl border backdrop-blur-xl transition-all duration-500"
                  style={{
                    borderColor: answered ? (isCorrect ? "#22c55e40" : isWrong ? "#ef444440" : "#ffffff15") : isCritical ? "#ef444440" : `${primaryColor}20`,
                    background: answered ? (isCorrect ? "rgba(34,197,94,0.05)" : isWrong ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)") : "rgba(255,255,255,0.03)",
                    boxShadow: answered ? (isCorrect ? "0 0 60px rgba(34,197,94,0.15)" : isWrong ? "0 0 60px rgba(239,68,68,0.15)" : "none") : isCritical ? "0 0 60px rgba(239,68,68,0.1)" : `0 0 40px ${primaryColor}05`,
                  }}
                >
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-white leading-relaxed">
                    {currentQuestion.question_text}
                  </h2>
                  <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto w-full">
            {["A", "B", "C", "D"].map((letter, idx) => {
              const optKey = `option_${letter.toLowerCase()}` as keyof Question;
              const text = currentQuestion[optKey] as string;
              const isSel = selectedAnswer === letter;
              const isCorr = letter === currentQuestion.correct_answer;
              const isDis = disabledOptions.includes(letter);
              const isLocked = answered || isDis;

              let bg = "bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/25";
              let textCol = "text-white/90";
              let letterBg = "bg-white/10 text-white/60";

              if (isDis) {
                bg = "bg-white/[0.02] border-white/5 opacity-20";
                textCol = "text-white/20";
              }
              if (isSel && !answered) {
                bg = `border-2`; 
                letterBg = "text-black font-bold";
              }
              if (answered && isCorr) {
                bg = "bg-green-500/15 border-green-500/50";
                textCol = "text-green-400";
                letterBg = "bg-green-500 text-white";
              }
              if (answered && isSel && !isCorr) {
                bg = "bg-red-500/15 border-red-500/50";
                textCol = "text-red-400";
                letterBg = "bg-red-500 text-white";
              }

              return (
                <motion.button
                  key={`${currentQuestion.id}-${letter}`}
                  initial={{ opacity: 0, x: idx < 2 ? -20 : 20 }}
                  animate={{ opacity: isDis ? 0.2 : 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1, type: "spring", stiffness: 200, damping: 25 }}
                  onClick={() => onAnswer(letter)}
                  disabled={isLocked}
                  className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 ${bg} ${isLocked ? "cursor-default" : "cursor-pointer active:scale-[0.98]"}`}
                  style={isSel && !answered ? { borderColor: primaryColor, background: `${primaryColor}15` } : {}}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-sm md:text-base transition-all ${letterBg}`} style={isSel && !answered ? { background: primaryColor, color: "#000" } : {}}>
                    {letter}
                  </div>
                  <span className={`flex-1 text-left font-semibold text-base md:text-lg ${textCol}`}>{text}</span>
                  {answered && isCorr && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />}
                  {answered && isSel && !isCorr && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 max-w-3xl mx-auto w-full">
            <LifelineButton icon={<Lightbulb className="w-5 h-5" />} label="50:50" used={lifelinesUsed["50_50"]} onClick={on5050} disabled={answered} primaryColor={primaryColor} />
            <LifelineButton icon={<Users className="w-5 h-5" />} label="PUBLICO" used={lifelinesUsed.audience} onClick={onAudience} disabled={answered} primaryColor={primaryColor} />
            <LifelineButton icon={<Phone className="w-5 h-5" />} label="LIGAR" used={lifelinesUsed.phone} onClick={onPhone} disabled={answered} primaryColor={primaryColor} />
          </div>
        </div>

        <div className="hidden lg:flex flex-col border-l border-white/10 bg-black/20">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">Piramide de Premios</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 flex flex-col-reverse">
            {prizeStructure.map((p) => {
              const isCurrent = currentLevel === p.level;
              const isPast = currentLevel > p.level;
              return (
                <div
                  key={p.level}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${isCurrent ? "font-black scale-[1.02]" : isPast ? "opacity-30 line-through" : "hover:bg-white/5"}`}
                  style={isCurrent ? { background: primaryColor, color: "#000" } : {}}
                >
                  <span className={`text-xs font-bold w-5 ${isCurrent ? "text-black/60" : "text-white/30"}`}>{p.level}</span>
                  <span className="flex-1 text-sm">{formatPrize(p.amount)} {p.currency}</span>
                  {p.is_safe_haven && <ShieldCheck className={`w-3.5 h-3.5 ${isCurrent ? "text-black/40" : ""}`} style={!isCurrent ? { color: primaryColor } : {}} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAudience && audienceVotes.length === 4 && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-black/90 border border-white/10 rounded-2xl backdrop-blur-xl p-6 min-w-[300px]">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 text-center">Voto do Publico</h4>
              <div className="space-y-2">
                {["A", "B", "C", "D"].map((l, i) => (
                  <div key={l} className="flex items-center gap-3">
                    <span className="w-6 text-xs font-bold text-white/50">{l}</span>
                    <div className="flex-1 h-6 bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${audienceVotes[i]}%` }} transition={{ duration: 1, delay: i * 0.15 }} className="h-full rounded-full" style={{ background: l === currentQuestion.correct_answer ? primaryColor : "rgba(255,255,255,0.3)" }} />
                    </div>
                    <span className="text-xs font-bold text-white/60 w-10 text-right">{audienceVotes[i]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhone && phoneFriend && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-b from-blue-950 to-black border border-blue-500/20 rounded-3xl p-8 max-w-md w-full text-center space-y-4">
              <Phone className="w-10 h-10 text-blue-400 mx-auto animate-pulse" />
              <p className="text-white/90 text-lg italic leading-relaxed">{phoneFriend}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-md border-t border-white/10 p-2">
        <div className="flex items-center gap-1 max-w-md mx-auto">
          {prizeStructure.map((p) => {
            const isCurrent = currentLevel === p.level;
            return (
              <div key={p.level} className={`flex-1 h-1.5 rounded-full transition-all ${isCurrent ? "" : "bg-white/10"}`} style={isCurrent ? { background: primaryColor, boxShadow: `0 0 8px ${primaryColor}` } : {}} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LifelineButton({ icon, label, used, onClick, disabled, primaryColor }: {
  icon: React.ReactNode;
  label: string;
  used: boolean;
  onClick: () => void;
  disabled: boolean;
  primaryColor: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={used || disabled}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-300 ${used ? "opacity-25 grayscale border-white/5 bg-white/[0.02]" : `border-white/15 bg-white/5 hover:bg-white/10 active:scale-95`}`}
      style={!used ? { borderColor: `${primaryColor}30` } : {}}
    >
      <span style={!used ? { color: primaryColor } : {}}>{icon}</span>
      <span className={`text-xs font-bold uppercase tracking-wider ${used ? "text-white/20" : "text-white/60"}`}>{label}</span>
    </button>
  );
}

function ResultScreen({ screen, primaryColor, currentLevel, currentPrize, safePrize, prizeStructure, onRestart, onQuit, formatPrize }: {
  screen: "won" | "lost";
  gameName: string;
  primaryColor: string;
  currentLevel: number;
  currentPrize: PrizeLevel;
  safePrize: number;
  prizeStructure: PrizeLevel[];
  onRestart: () => void;
  onQuit: () => void;
  formatPrize: (n: number) => string;
}) {
  const isWin = screen === "won";
  const prize = isWin ? currentPrize.amount : safePrize;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="max-w-lg w-full text-center space-y-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
          className="relative inline-block"
        >
          <div className="absolute -inset-8 rounded-full blur-2xl opacity-30" style={{ background: isWin ? primaryColor : "#ef4444" }} />
          <div className="relative w-32 h-32 rounded-full flex items-center justify-center" style={{ background: isWin ? `linear-gradient(135deg, ${primaryColor}, #b45309)` : "linear-gradient(135deg, #ef4444, #991b1b)" }}>
            {isWin ? <Trophy className="w-16 h-16 text-black" /> : <XCircle className="w-16 h-16 text-white" />}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <h1 className={`text-4xl md:text-6xl font-black uppercase tracking-tighter ${isWin ? "" : ""}`} style={{ color: isWin ? primaryColor : "#ef4444", textShadow: `0 0 40px ${isWin ? primaryColor : "#ef444440"}` }}>
            {isWin ? "MILIONARIO!" : "FIM DE JOGO"}
          </h1>
          <p className="text-white/40 mt-2 text-lg">
            {isWin ? "Parabens! Ganhou o premio maximo!" : "Chegou ao nivel " + currentLevel}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="space-y-2">
          <p className="text-white/50 text-sm uppercase tracking-widest">Leva para casa</p>
          <p className="text-5xl md:text-6xl font-black" style={{ color: primaryColor, textShadow: `0 0 40px ${primaryColor}40` }}>
            {formatPrize(prize)}
            <span className="text-2xl text-white/40 ml-2">{prizeStructure[0].currency}</span>
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={onRestart}
            className="px-10 py-4 rounded-full text-lg font-black text-black uppercase tracking-wider transition-transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, #b45309)` }}
          >
            JOGAR NOVAMENTE
          </button>
          <button
            onClick={onQuit}
            className="px-10 py-4 rounded-full text-lg font-black uppercase tracking-wider border-2 border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
          >
            SAIR
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
