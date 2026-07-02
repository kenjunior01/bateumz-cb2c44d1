import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { useToast } from "@/hooks/use-toast";
import { computeFinalRotation, findPrizeIndex, isNoWinLabel } from "@/lib/wheel-math";
import { AlertTriangle, Trophy, Gift, Sparkles, Zap, Star, PartyPopper, Volume2, VolumeX } from "lucide-react";
import { playTickSound, playWinSound, playVictoryFanfare, playDismissSound, playDrumRoll } from "@/lib/sounds";

interface Segment {
  id: string;
  label: string;
  background_color: string;
  text_color: string;
  reward_type: string;
  reward_value: string;
  weight?: number;
  effect_type?: string | null;
  segment_number?: number;
}


interface SpinWheelProps {
  gameId: string;
}

const pickWinnerIndex = (segments: Segment[]): number => {
  const totalWeight = segments.reduce((sum, s) => sum + (s.weight || 1), 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < segments.length; i++) {
    r -= (segments[i].weight || 1);
    if (r <= 0) return i;
  }
  return segments.length - 1;
};

// Enhanced effect functions
const fireConfetti = (type: string = "confetti") => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    switch (type) {
      case "fireworks":
        confetti({
          ...defaults,
          particleCount,
          spread: 70,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00"],
        });
        confetti({
          ...defaults,
          particleCount,
          spread: 70,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#ff00ff", "#00ffff", "#ff8800", "#88ff00"],
        });
        break;
      case "stars":
        confetti({
          ...defaults,
          particleCount: particleCount * 0.5,
          shapes: ["star"],
          gravity: 0.8,
          scalar: 1.2,
          origin: { y: 0.4 },
          colors: ["#ffd700", "#ffed4e", "#ffffff"],
        });
        break;
      case "poppers":
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            confetti({
              ...defaults,
              particleCount: 20,
              origin: { x: 0.2 + i * 0.15, y: 0.6 },
              spread: 60,
              colors: ["#ff4444", "#44ff44", "#4444ff", "#ffff44"],
            });
          }, i * 200);
        }
        break;
      case "zap":
        confetti({
          ...defaults,
          particleCount: 100,
          shapes: ["circle", "square"],
          gravity: 1.2,
          scalar: 0.9,
          origin: { y: 0.2 },
          colors: ["#ff00ff", "#00ffff", "#ff0000", "#00ff00"],
        });
        break;
      case "confetti":
      default:
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.2, 0.8), y: Math.random() - 0.1 },
          spread: 180,
        });
        break;
    }
  }, 250);
};

const DynamicSpinWheel = ({ gameId }: SpinWheelProps) => {
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Segment | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wheelConfig, setWheelConfig] = useState<{
    company_logo_url?: string;
    company_slogan?: string;
    background_image_url?: string;
    background_color?: string;
    wheel_background_color?: string;
    wheel_border_color?: string;
    rotation_duration?: number;
    default_effect?: string;
  } | null>(null);

  useEffect(() => {
    const loadWheelData = async () => {
      const { data: gameData, error: gameError } = await supabase
        .from("spin_wheel_games")
        .select("*")
        .eq("id", gameId)
        .single();
      
      if (gameData) {
        setWheelConfig(gameData);
      }

      const { data, error } = await supabase
        .from("spin_wheel_segments")
        .select("*")
        .eq("wheel_id", gameId)
        .order("segment_number", { ascending: true });

      if (error) {
        console.error("Error loading wheel segments:", error);
      } else if (data) {
        setSegments(data);
      }
      setLoading(false);
    };

    loadWheelData();
  }, [gameId]);

  useEffect(() => {
    if (canvasRef.current && segments.length > 0) drawWheel();
  }, [segments, wheelConfig]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 10;
    const segmentAngle = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    segments.forEach((seg, i) => {
      const startAngle = i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.background_color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = seg.text_color;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(seg.label, radius * 0.5, 5);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = wheelConfig?.wheel_background_color || "#fff";
    ctx.fill();
    ctx.strokeStyle = wheelConfig?.wheel_border_color || "#eab308";
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const spin = async () => {
    if (spinning || segments.length === 0) return;
    if (!user) {
      toast({ title: t("loginRequired"), description: t("loginToPlay"), variant: "destructive" });
      return;
    }

    setSpinning(true);
    setResult(null);

    try {
      let winnerIndex: number;
      let winner: Segment;

      if (region?.id) {
        const { data: spinResult, error: spinError } = await supabase.functions.invoke("spin-wheel-spin", {
          body: { wheel_id: gameId, region_id: region.id },
        });
        if (spinError) throw spinError;
        const raw = spinResult?.data?.winner || spinResult?.winner;
        winnerIndex = findPrizeIndex(segments, raw);
        if (winnerIndex < 0) winnerIndex = pickWinnerIndex(segments);
        winner = { ...segments[winnerIndex], label: raw?.label ?? segments[winnerIndex].label };
      } else {
        winnerIndex = pickWinnerIndex(segments);
        winner = segments[winnerIndex];
      }

      const finalRotation = computeFinalRotation(rotation, winnerIndex, segments.length);
      setRotation(finalRotation);

      const duration = wheelConfig?.rotation_duration || 4;
      setTimeout(() => {
        setResult(winner);
        setSpinning(false);

        if (winner.reward_type !== "nothing" && winner.reward_type !== "none" && !isNoWinLabel(winner.label)) {
          fireConfetti(winner.effect_type || wheelConfig?.default_effect || "confetti");
          toast({
            title: t("wheel.win"),
            description: `${t("youWon")}: ${winner.reward_value || winner.label}`,
          });
        }
      }, duration * 1000);
    } catch (e) {
      console.error("Error spinning wheel:", e);
      setSpinning(false);
      toast({ title: t("error"), description: t("wheel.errorSpin"), variant: "destructive" });
    }
  };

  if (loading) return <div className="text-center py-8">{t("wheel.loading")}</div>;
  if (segments.length === 0) return <div className="text-center py-8 text-muted-foreground">{t("wheel.noSegments")}</div>;

  const bgStyle = wheelConfig?.background_image_url
    ? { backgroundImage: `url(${wheelConfig.background_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : wheelConfig?.background_color
      ? { backgroundColor: wheelConfig.background_color }
      : {};

  const getResultIcon = (result: Segment) => {
    if (result.effect_type === "fireworks") return <PartyPopper className="h-10 w-10" />;
    if (result.effect_type === "stars") return <Star className="h-10 w-10" />;
    if (result.effect_type === "zap") return <Zap className="h-10 w-10" />;
    if (result.effect_type === "poppers") return <Gift className="h-10 w-10" />;
    return <Trophy className="h-10 w-10" />;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4" style={bgStyle}>
      {/* Minimum segments warning */}
      {segments.length < 4 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />
          <p className="text-sm">{t("wheel.minSegmentsWarning")}</p>
        </div>
      )}

      {/* Company branding */}
      {wheelConfig?.company_logo_url && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 bg-black/20 backdrop-blur-sm p-3 rounded-2xl border border-white/10"
        >
          <img src={wheelConfig.company_logo_url} alt="Company" className="h-12 w-12 rounded-full object-cover" />
          {wheelConfig.company_slogan && (
            <p className="text-sm font-medium text-white">{wheelConfig.company_slogan}</p>
          )}
        </motion.div>
      )}

      <div className="relative">
        {/* Pointer */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />

        <motion.div
          animate={{ rotate: rotation }}
          transition={{
            duration: wheelConfig?.rotation_duration || 4,
            ease: [0.17, 0.67, 0.12, 0.99],
          }}
        >
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="drop-shadow-2xl"
          />
        </motion.div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={spin}
        disabled={spinning}
        className="group relative px-10 py-4 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-lg hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
      >
        <span className="flex items-center gap-2">
          {spinning ? (
            <>
              <Sparkles className="w-6 h-6 animate-spin" />
              {t("wheel.spinning")}
            </>
          ) : (
            <>
              <PartyPopper className="w-6 h-6" />
              {t("wheel.spin")}
            </>
          )}
        </span>
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -30 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className={`text-center px-10 py-8 rounded-3xl shadow-2xl backdrop-blur-xl ${
              result.reward_type === "nothing" || result.reward_type === "none" || isNoWinLabel(result.label)
                ? "bg-secondary/80 text-muted-foreground border border-white/10"
                : "bg-gradient-to-br from-primary/30 to-primary/10 text-primary border border-primary/30"
            }`}
          >
            {result.reward_type !== "nothing" && result.reward_type !== "none" && !isNoWinLabel(result.label) ? (
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                  className="text-yellow-400"
                >
                  {getResultIcon(result)}
                </motion.div>
                <motion.p
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className="font-black text-2xl"
                >
                  {t("wheel.win")}
                </motion.p>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-3xl font-black tracking-tight"
                >
                  {result.reward_value || result.label}
                </motion.p>
              </div>
            ) : (
              <p className="font-bold text-2xl flex items-center gap-2 justify-center">
                😅 {t("tryAgain")}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicSpinWheel;
