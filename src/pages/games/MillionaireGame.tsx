import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, Volume2, VolumeX, Lightbulb, Users, Phone, RefreshCw,
  CheckCircle2, XCircle, Trophy, Timer,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  playTickSound, playWinSound, playVictoryFanfare,
  playDismissSound, playLevelUpSound, playDrumRoll,
} from "@/lib/sounds";
import "./MillionaireGame.css";

interface Game {
  id: string;
  name: string;
  background_image_url: string;
  background_color: string;
  primary_color: string;
  company_logo_url?: string;
  company_slogan?: string;
  total_questions: number;
  time_per_question: number;
  prize_structure: { level: number; amount: number; currency: string; is_safe_haven?: boolean }[];
  lifelines: Record<string, boolean>;
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

type LifelineKey = "50_50" | "audience" | "phone" | "swap";

export default function MillionaireGame() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null); // final locked answer (suspense phase)
  const [revealed, setRevealed] = useState(false); // shows correct/incorrect
  const [timeLeft, setTimeLeft] = useState(30);
  const [lifelinesUsed, setLifelinesUsed] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [audiencePoll, setAudiencePoll] = useState<Record<string, number> | null>(null);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const [showAudience, setShowAudience] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const swappedRef = useRef(false);

  // Ambient ticking during countdown
  useEffect(() => {
    if (!soundEnabled || status !== "playing" || locked || revealed) return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => {
      if (timeLeft <= 10 && timeLeft > 0) playTickSound();
    }, 0);
    return () => clearTimeout(t);
  }, [timeLeft, soundEnabled, status, locked, revealed]);

  const loadGame = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    try {
      const { data: gameData, error: gameError } = await supabase
        .from("millionaire_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData as any);
      setTimeLeft((gameData as any).time_per_question || 30);

      const { data: qData, error: qError } = await supabase
        .from("millionaire_questions")
        .select("*")
        .eq("game_id", gameId)
        .order("question_number", { ascending: true });

      if (qError) throw qError;
      setQuestions((qData || []) as any);
    } catch (err) {
      console.error("Error loading millionaire game:", err);
      toast.error("Erro ao carregar o jogo");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => { loadGame(); }, [loadGame]);

  // Timer
  useEffect(() => {
    if (status !== "playing" || locked || revealed || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [status, locked, revealed, timeLeft]);

  // Timeout = lose
  useEffect(() => {
    if (timeLeft === 0 && !locked && !revealed && status === "playing") {
      setStatus("lost");
      if (soundEnabled) playDismissSound();
      toast.error("Tempo esgotado!");
    }
  }, [timeLeft, locked, revealed, status, soundEnabled]);

  const currentQuestion = useMemo(() => questions[currentLevel - 1], [questions, currentLevel]);
  const currentPrize = useMemo(() => game?.prize_structure?.[currentLevel - 1], [game, currentLevel]);

  const calculateSafePrize = () => {
    const prizes = game?.prize_structure || [];
    let safe = 0;
    const defaults = [5, 10];
    for (let i = 0; i < currentLevel - 1; i++) {
      if (prizes[i]?.is_safe_haven || defaults.includes(prizes[i]?.level)) {
        safe = prizes[i].amount;
      }
    }
    return safe;
  };

  const saveSession = async (finalStatus: string, prize: number) => {
    if (!user || !region) return;
    try {
      await supabase.from("millionaire_sessions").insert({
        game_id: gameId,
        user_id: user.id,
        region_id: region.id,
        current_level: currentLevel,
        prize_won: prize,
        status: finalStatus,
      });
    } catch (err) { console.error(err); }
  };

  // === Answer flow with suspense ===
  const chooseAnswer = (choice: string) => {
    if (locked || revealed || status !== "playing") return;
    setSelectedAnswer(choice);
  };

  const confirmAnswer = async () => {
    if (!selectedAnswer || locked || revealed) return;
    setLocked(selectedAnswer);
    if (soundEnabled) playDrumRoll();

    // Suspense pause before reveal (longer at higher levels)
    const suspense = Math.min(1500 + currentLevel * 250, 4000);
    setTimeout(() => {
      setRevealed(true);
      const isCorrect = selectedAnswer === currentQuestion.correct_answer;

      if (isCorrect) {
        if (soundEnabled) playLevelUpSound();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

        if (currentLevel === (game?.total_questions || questions.length)) {
          setStatus("won");
          if (soundEnabled) playVictoryFanfare();
          confetti({ particleCount: 300, spread: 120, origin: { y: 0.6 } });
          saveSession("completed", currentPrize?.amount || 0);
        } else {
          toast.success("Resposta Correta!");
          setTimeout(() => {
            setCurrentLevel((p) => p + 1);
            setSelectedAnswer(null);
            setLocked(null);
            setRevealed(false);
            setDisabledOptions([]);
            setAudiencePoll(null);
            setPhoneMsg(null);
            swappedRef.current = false;
            setTimeLeft(game?.time_per_question || 30);
          }, 2000);
        }
      } else {
        if (soundEnabled) playDismissSound();
        setStatus("lost");
        const safe = calculateSafePrize();
        saveSession("abandoned", safe);
      }
    }, suspense);
  };

  const walkAway = () => {
    if (locked || revealed || status !== "playing") return;
    const prize = game?.prize_structure?.[currentLevel - 2]?.amount || 0;
    setStatus("won");
    if (soundEnabled) playWinSound();
    saveSession("walked_away", prize);
  };

  // === Lifelines ===
  const useFiftyFifty = () => {
    if (lifelinesUsed["50_50"] || locked) return;
    setLifelinesUsed((p) => ({ ...p, "50_50": true }));
    const wrong = ["A", "B", "C", "D"].filter((l) => l !== currentQuestion.correct_answer);
    const toDisable = wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
    setDisabledOptions(toDisable);
    if (soundEnabled) playLevelUpSound();
    toast.info("50:50 — duas respostas erradas removidas");
  };

  const useAudience = () => {
    if (lifelinesUsed["audience"] || locked) return;
    setLifelinesUsed((p) => ({ ...p, audience: true }));
    // Weighted distribution: correct answer gets 55-80%, remainder split
    const correctPct = 55 + Math.floor(Math.random() * 26);
    const remaining = 100 - correctPct;
    const others = ["A", "B", "C", "D"].filter((l) => l !== currentQuestion.correct_answer && !disabledOptions.includes(l));
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    dist[currentQuestion.correct_answer] = correctPct;
    let leftover = remaining;
    others.forEach((o, i) => {
      if (i === others.length - 1) dist[o] = leftover;
      else {
        const v = Math.floor(Math.random() * (leftover / (others.length - i)));
        dist[o] = v;
        leftover -= v;
      }
    });
    setAudiencePoll(dist);
    setShowAudience(true);
    if (soundEnabled) playLevelUpSound();
  };

  const usePhone = () => {
    if (lifelinesUsed["phone"] || locked) return;
    setLifelinesUsed((p) => ({ ...p, phone: true }));
    // 75% confidence in correct answer
    const confident = Math.random() < 0.75;
    const answer = confident
      ? currentQuestion.correct_answer
      : ["A", "B", "C", "D"].filter((l) => l !== currentQuestion.correct_answer)[Math.floor(Math.random() * 3)];
    const confidence = confident
      ? ["Tenho quase a certeza de que é", "Aposto que é", "Sem dúvida é"][Math.floor(Math.random() * 3)]
      : ["Acho que talvez seja", "Não tenho a certeza, mas diria", "Se calhar é"][Math.floor(Math.random() * 3)];
    setPhoneMsg(`${confidence} a opção ${answer}.`);
    setShowPhone(true);
    if (soundEnabled) playLevelUpSound();
  };

  const useSwap = async () => {
    if (lifelinesUsed["swap"] || locked || swappedRef.current) return;
    setLifelinesUsed((p) => ({ ...p, swap: true }));
    swappedRef.current = true;
    // Try to load a replacement question of same level from other games; otherwise reshuffle options
    try {
      const { data } = await supabase
        .from("millionaire_questions")
        .select("*")
        .eq("question_number", currentQuestion.question_number)
        .neq("id", currentQuestion.id)
        .limit(5);
      if (data && data.length) {
        const pick = data[Math.floor(Math.random() * data.length)] as any;
        const newQuestions = [...questions];
        newQuestions[currentLevel - 1] = pick;
        setQuestions(newQuestions);
        setSelectedAnswer(null);
        setDisabledOptions([]);
        toast.info("Pergunta trocada!");
      } else {
        toast.info("Sem pergunta alternativa — a baralhar as opções.");
      }
    } catch {
      toast.error("Erro ao trocar a pergunta");
    }
    if (soundEnabled) playLevelUpSound();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0a0e17]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!game || !currentQuestion) return <Navigate to="/" replace />;

  const currency = currentPrize?.currency || "MZN";

  return (
    <div
      className="min-h-screen relative flex flex-col bg-[#0a0e17] text-white overflow-hidden"
      style={{
        backgroundImage: game.background_image_url ? `url(${game.background_image_url})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e17]/85 via-[#0a0e17]/70 to-[#0a0e17]/95 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 p-4 md:p-6 flex flex-wrap gap-3 justify-between items-center border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {game.company_logo_url ? (
            <img src={game.company_logo_url} alt="" className="w-12 h-12 rounded-full object-contain bg-black/40 p-1" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center"><Trophy className="text-black w-6 h-6" /></div>
          )}
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase tracking-widest">{game.name}</h1>
            <p className="text-xs text-white/60 uppercase">Nível {currentLevel} • {currentPrize?.amount?.toLocaleString()} {currency}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
            <Timer className={`w-5 h-5 ${timeLeft < 10 ? "text-red-500 animate-pulse" : "text-primary"}`} />
            <span className={`text-xl font-mono font-bold ${timeLeft < 10 ? "text-red-400" : ""}`}>{timeLeft}s</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled((s) => !s)} aria-label="Som">
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Timer bar */}
      <Progress value={(timeLeft / (game.time_per_question || 30)) * 100} className="h-1 rounded-none bg-white/5" />

      <div className="relative z-10 flex-1 container mx-auto px-4 py-6 md:py-8 grid lg:grid-cols-[1fr_320px] gap-6 md:gap-8">
        {/* Main */}
        <div className="flex flex-col justify-center space-y-8 md:space-y-12">
          {game.company_slogan && (
            <p className="text-center text-xs font-black uppercase tracking-[0.3em] text-primary/80">{game.company_slogan}</p>
          )}

          {/* Question */}
          <div className="relative">
            <div className="bg-black/60 backdrop-blur-xl border-2 border-primary/30 p-6 md:p-10 rounded-3xl text-center shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <p className="text-xs text-primary/70 uppercase tracking-widest mb-3">Pergunta {currentLevel}</p>
              <h2 className="text-xl md:text-3xl font-bold leading-tight">{currentQuestion.question_text}</h2>
            </div>
          </div>

          {/* Options */}
          <div className="grid md:grid-cols-2 gap-3 md:gap-4">
            {["A", "B", "C", "D"].map((letter) => {
              const optionKey = `option_${letter.toLowerCase()}` as keyof Question;
              const text = currentQuestion[optionKey] as string;
              const isSelected = selectedAnswer === letter;
              const isLocked = locked === letter;
              const isCorrect = letter === currentQuestion.correct_answer;
              const isDisabled = disabledOptions.includes(letter);

              let stateClass = "border-white/20 bg-white/5 hover:bg-white/10";
              if (isSelected && !locked) stateClass = "border-primary bg-primary/25 shadow-[0_0_20px_hsl(var(--primary)/0.4)]";
              if (isLocked && !revealed) stateClass = "border-yellow-400 bg-yellow-400/25 animate-pulse shadow-[0_0_30px_rgba(250,204,21,0.6)]";
              if (revealed && isCorrect) stateClass = "border-green-500 bg-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-pulse";
              if (revealed && isLocked && !isCorrect) stateClass = "border-red-500 bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.6)]";
              if (isDisabled) stateClass = "opacity-20 pointer-events-none grayscale";

              return (
                <button
                  key={letter}
                  onClick={() => chooseAnswer(letter)}
                  disabled={!!locked || revealed || isDisabled || status !== "playing"}
                  className={`relative group flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-300 ${stateClass}`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-primary shrink-0">
                    {letter}
                  </div>
                  <span className="flex-1 px-2 font-semibold text-base md:text-lg text-left">{text}</span>
                  {revealed && isCorrect && <CheckCircle2 className="w-6 h-6 text-green-400" />}
                  {revealed && isLocked && !isCorrect && <XCircle className="w-6 h-6 text-red-400" />}
                </button>
              );
            })}
          </div>

          {/* Confirm / walk away */}
          {!locked && !revealed && (
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                size="lg"
                disabled={!selectedAnswer}
                onClick={confirmAnswer}
                className="px-8 font-black uppercase tracking-widest"
              >
                Confirmar Resposta
              </Button>
              {currentLevel > 1 && (
                <Button size="lg" variant="outline" onClick={walkAway} className="border-white/20">
                  Desistir (levar {game.prize_structure[currentLevel - 2]?.amount?.toLocaleString()} {currency})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6">
          {/* Lifelines */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-4 md:p-6">
              <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-3">Ajudas</h3>
              <div className="grid grid-cols-4 gap-2">
                <LifelineBtn label="50:50" icon={Lightbulb} used={!!lifelinesUsed["50_50"]} onClick={useFiftyFifty} />
                <LifelineBtn label="Público" icon={Users} used={!!lifelinesUsed["audience"]} onClick={useAudience} />
                <LifelineBtn label="Telefone" icon={Phone} used={!!lifelinesUsed["phone"]} onClick={usePhone} />
                <LifelineBtn label="Trocar" icon={RefreshCw} used={!!lifelinesUsed["swap"]} onClick={useSwap} />
              </div>
            </CardContent>
          </Card>

          {/* Pyramid */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Pirâmide de Prémios</h3>
                <Badge variant="outline" className="border-primary text-primary">{game.total_questions} Níveis</Badge>
              </div>
              <div className="p-2 space-y-1 max-h-[420px] overflow-y-auto flex flex-col-reverse">
                {game.prize_structure.map((p, i) => {
                  const isCurrent = currentLevel === p.level;
                  const isPast = currentLevel > p.level;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                        isCurrent
                          ? "bg-yellow-400 text-black font-black scale-105 shadow-lg"
                          : isPast
                          ? "opacity-40 bg-green-500/10"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <span className={`text-xs w-6 ${isCurrent ? "text-black/70" : "text-primary"}`}>{p.level}</span>
                      <span className="flex-1 text-sm">{p.amount.toLocaleString()} {p.currency}</span>
                      {p.is_safe_haven && <CheckCircle2 className={`w-4 h-4 ${isCurrent ? "text-black" : "text-primary"}`} />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Audience Dialog */}
      <Dialog open={showAudience} onOpenChange={setShowAudience}>
        <DialogContent className="bg-[#0a0e17] border-primary/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Ajuda do Público</DialogTitle>
            <DialogDescription className="text-white/60">Distribuição de votos da audiência</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {audiencePoll && (["A", "B", "C", "D"] as const).map((k) => (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">{k}</span>
                  <span>{audiencePoll[k]}%</span>
                </div>
                <div className="h-3 rounded bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-yellow-400" style={{ width: `${audiencePoll[k]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Dialog */}
      <Dialog open={showPhone} onOpenChange={setShowPhone}>
        <DialogContent className="bg-[#0a0e17] border-primary/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Phone className="w-5 h-5" /> Chamada ao Amigo</DialogTitle>
            <DialogDescription className="text-white/60">30 segundos ao telefone…</DialogDescription>
          </DialogHeader>
          <p className="text-lg py-4 italic">"{phoneMsg}"</p>
        </DialogContent>
      </Dialog>

      {/* End Screen */}
      {status !== "playing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-500 p-4">
          <div className="text-center space-y-6 p-8 md:p-12 rounded-3xl border-2 border-white/10 bg-white/5 max-w-lg w-full">
            {status === "won" ? (
              <>
                <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.5)]">
                  <Trophy className="w-12 h-12 text-black" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Parabéns!</h2>
                <p className="text-lg text-white/80">Ganhou<br/><span className="text-primary text-3xl md:text-4xl font-black">{(currentPrize?.amount || 0).toLocaleString()} {currency}</span></p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-red-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">
                  <XCircle className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Fim de Jogo</h2>
                <p className="text-lg text-white/80">A resposta correta era <span className="text-green-400 font-bold">{currentQuestion.correct_answer}</span></p>
                <p className="text-lg text-white/80">Leva para casa<br/><span className="text-primary text-3xl font-black">{calculateSafePrize().toLocaleString()} {currency}</span></p>
              </>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" className="font-black rounded-full" onClick={() => window.location.reload()}>Jogar de Novo</Button>
              <Button size="lg" variant="outline" className="rounded-full border-white/20" onClick={() => (window.location.href = "/")}>Sair</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LifelineBtn({
  label, icon: Icon, used, onClick,
}: { label: string; icon: any; used: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={used}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
        used ? "opacity-30 grayscale border-white/10" : "border-primary/30 bg-primary/5 hover:bg-primary/20 hover:scale-105"
      }`}
    >
      <Icon className="w-5 h-5 text-primary" />
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );
}
