import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, Trash2, Settings2, Volume2, VolumeX, Trophy, Share2, AlertTriangle, Gift, Sparkles, Zap, Star, PartyPopper, Monitor, Smartphone } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { CompanyBranding } from './LiveGameSettings';
import { PRESET_THEMES, type WheelTheme } from "@/lib/themes";
import {
  computeFinalRotation,
  findPrizeIndex,
  getSegmentAngle,
  getSegmentAtPointer,
  isNoWinLabel,
} from "@/lib/wheel-math";

export type WheelPrize = {
  id: string;
  label: string;
  color: string;
  textColor?: string;
  weight: number;
  description?: string;
  rewardType?: string;
  rewardValue?: string;
  rewardImageUrl?: string;
  maxWinsPerDay?: number | null;
  maxWinsTotal?: number | null;
  currentWinsToday?: number;
  currentWinsTotal?: number;
  effectType?: "confetti" | "fireworks" | "stars" | "poppers" | "zap";
  segment_number?: number;
};

export const DEFAULT_WHEEL_PRIZES: WheelPrize[] = [
  { id: "p1", label: "10% OFF", color: "#22c55e", textColor: "#fff", weight: 25, rewardType: "discount", rewardValue: "10%", effectType: "confetti" },
  { id: "p2", label: "Tenta Outra", color: "#334155", textColor: "#fff", weight: 35, rewardType: "none", rewardValue: "" },
  { id: "p3", label: "Brinde", color: "#eab308", textColor: "#000", weight: 15, rewardType: "prize", rewardValue: "Brinde", effectType: "stars" },
  { id: "p4", label: "Tenta Outra", color: "#1e293b", textColor: "#fff", weight: 15, rewardType: "none", rewardValue: "" },
  { id: "p5", label: "PRÉMIO!", color: "#8b5cf6", textColor: "#fff", weight: 5, rewardType: "grand_prize", rewardValue: "Grande Prémio", effectType: "fireworks" },
  { id: "p6", label: "5% OFF", color: "#ef4444", textColor: "#fff", weight: 5, rewardType: "discount", rewardValue: "5%", effectType: "poppers" },
];

const palette = ["#22c55e", "#eab308", "#8b5cf6", "#ef4444", "#0ea5e9", "#f97316", "#ec4899", "#14b8a6"];

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

interface Props {
  prizes: WheelPrize[];
  gameId?: string;
  onChange?: (prizes: WheelPrize[]) => void;
  onWin?: (prize: WheelPrize) => void;
  editable?: boolean;
  rotationDuration?: number;
  spinCost?: number;
  soundEnabled?: boolean;
  particleEffects?: boolean;
  branding?: CompanyBranding;
  mode?: "horizontal" | "vertical";
  theme?: keyof typeof PRESET_THEMES | WheelTheme;
}

const pickWeighted = (prizes: WheelPrize[]) => {
  const total = prizes.reduce((s, p) => s + Math.max(0, p.weight), 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < prizes.length; i++) {
    r -= Math.max(0, prizes[i].weight);
    if (r <= 0) return i;
  }
  return prizes.length - 1;
};

const getResultIcon = (result: WheelPrize) => {
  if (result.effectType === "fireworks") return <PartyPopper className="h-10 w-10" />;
  if (result.effectType === "stars") return <Star className="h-10 w-10" />;
  if (result.effectType === "zap") return <Zap className="h-10 w-10" />;
  if (result.effectType === "poppers") return <Gift className="h-10 w-10" />;
  return <Trophy className="h-10 w-10" />;
};

const PrizeWheel = ({
  prizes: initialPrizes,
  gameId,
  onChange,
  onWin,
  editable = true,
  rotationDuration = 5,
  spinCost = 0,
  soundEnabled: initialSoundEnabled = true,
  particleEffects = true,
  branding,
  mode: initialMode = "horizontal",
  theme: initialTheme = "dark",
}: Props) => {
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelPrize | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [loading, setLoading] = useState(false);
  const [prizes, setPrizes] = useState<WheelPrize[]>(initialPrizes);
  const [gameName, setGameName] = useState("Roda da Sorte");
  const [defaultEffect, setDefaultEffect] = useState<string>("confetti");
  const [wheelConfig, setWheelConfig] = useState<any>(null);
  const [mode, setMode] = useState<"horizontal" | "vertical">(initialMode);
  const [currentTheme, setCurrentTheme] = useState<WheelTheme>(
    typeof initialTheme === "string" ? PRESET_THEMES[initialTheme] : initialTheme
  );

  // Fetch game from Supabase if gameId is provided
  useEffect(() => {
    if (!gameId) return;
    
    const fetchGame = async () => {
      setLoading(true);
      try {
        // Fetch game data
        const { data: gameData, error: gameError } = await supabase
          .from("spin_wheel_games")
          .select("*")
          .eq("id", gameId)
          .single();
        
        if (gameError) throw gameError;
        
        setWheelConfig(gameData);
        setGameName(gameData.name);
        setDefaultEffect(gameData.default_effect || "confetti");
        
        // Fetch segments
        const { data: segmentsData, error: segmentsError } = await supabase
          .from("spin_wheel_segments")
          .select("*")
          .eq("wheel_id", gameId)
          .order("segment_number");
        
        if (segmentsError) throw segmentsError;
        
        if (segmentsData && segmentsData.length > 0) {
          setPrizes(segmentsData.map((s: any) => ({
            id: s.id,
            label: s.label,
            color: s.background_color,
            textColor: s.text_color,
            weight: s.weight ?? 1,
            description: s.description,
            rewardType: s.reward_type,
            rewardValue: s.reward_value,
            rewardImageUrl: s.reward_image_url,
            maxWinsPerDay: s.max_wins_per_day,
            maxWinsTotal: s.max_wins_total,
            currentWinsToday: s.current_wins_today,
            currentWinsTotal: s.current_wins_total,
            effectType: s.effect_type,
            segment_number: s.segment_number,
          })));
        }
      } catch (error) {
        console.error("Error fetching game:", error);
        toast.error("Erro ao carregar jogo");
      } finally {
        setLoading(false);
      }
    };
    
    fetchGame();
  }, [gameId]);

  const segmentAngle = 360 / Math.max(1, prizes.length);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const arc = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(0,0,0,0.5)";

    prizes.forEach((seg, i) => {
      const angle = i * arc - (Math.PI / 2);
      ctx.beginPath();
      ctx.fillStyle = seg.color;
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arc, false);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = seg.textColor || "#FFFFFF";
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = "right";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.shadowBlur = 2;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.fillText(seg.label.length > 12 ? seg.label.slice(0, 11) + "…" : seg.label, radius - 40, 6);
      ctx.restore();
    });

    ctx.shadowBlur = 20;
    ctx.shadowColor = wheelConfig?.wheel_border_color || branding?.primaryColor || "#FFD700";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = wheelConfig?.wheel_border_color || branding?.primaryColor || "#FFD700";
    ctx.lineWidth = 12;
    ctx.stroke();

    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40);
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(1, wheelConfig?.wheel_background_color || branding?.primaryColor || "#FFD700");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "900 14px Inter, sans-serif";
    ctx.fillText("BATEU", centerX, centerY + 5);
  }, [prizes, branding?.backgroundColor, wheelConfig]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel, rotation]);

  const spin = async () => {
    if (spinning || prizes.length < 2) return;

    if (gameId && user && !region?.id) {
      toast.error(t("error"));
      return;
    }

    setSpinning(true);
    setResult(null);
    setLoading(true);

    try {
      let winner: WheelPrize;
      let winningIndex: number;

      if (gameId && user && region) {
        const { data: spinResult, error: spinError } = await supabase.functions.invoke(
          "spin-wheel-spin",
          { body: { wheel_id: gameId, region_id: region.id } },
        );
        if (spinError) throw spinError;

        const rawWinner = spinResult?.data?.winner || spinResult?.winner;
        if (!rawWinner) throw new Error("Invalid spin response");

        winningIndex = findPrizeIndex(prizes, rawWinner);
        if (winningIndex < 0) {
          winningIndex = pickWeighted(prizes);
        }
        winner = {
          ...prizes[winningIndex],
          label: rawWinner.label ?? prizes[winningIndex].label,
          rewardValue: rawWinner.reward_value ?? prizes[winningIndex].rewardValue,
          rewardType: rawWinner.reward_type ?? prizes[winningIndex].rewardType,
          effectType: rawWinner.effect_type ?? prizes[winningIndex].effectType,
        };
      } else {
        winningIndex = pickWeighted(prizes);
        winner = prizes[winningIndex];
      }

      const finalRotation = computeFinalRotation(rotation, winningIndex, prizes.length);
      const startTime = Date.now();
      const durationMs = (wheelConfig?.rotation_duration || rotationDuration) * 1000;
      const initialRotation = rotation;
      const segmentAngleDeg = getSegmentAngle(prizes.length);
      let lastSegment = -1;

      const getCurrentSegment = (angle: number) => getSegmentAtPointer(angle, prizes.length);

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        const currentRot = initialRotation + (finalRotation - initialRotation) * ease;

        setRotation(currentRot);

        if (soundEnabled) {
          const currentSeg = getCurrentSegment(currentRot);
          if (currentSeg !== lastSegment && lastSegment !== -1) {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3");
            audio.volume = 0.1;
            audio.play().catch(() => {});
          }
          lastSegment = currentSeg;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setRotation(finalRotation);
          setSpinning(false);
          setResult(winner);
          onWin?.(winner);

          const landed = getSegmentAtPointer(finalRotation, prizes.length);
          if (landed !== winningIndex) {
            console.warn("Wheel alignment check:", { landed, winningIndex, segmentAngleDeg });
          }

          if (particleEffects && !isNoWinLabel(winner.label) && winner.rewardType !== "none") {
            fireConfetti(winner.effectType || defaultEffect || "confetti");
          }
        }
      };

      requestAnimationFrame(animate);
    } catch (error) {
      console.error("Erro ao girar roda:", error);
      setSpinning(false);
      toast.error(t("wheel.errorSpin"));
    } finally {
      setLoading(false);
    }
  };

  const update = (next: WheelPrize[]) => onChange?.(next);
  const addPrize = () =>
    update([
      ...prizes,
      { id: `p${Date.now()}`, label: "Novo Prémio", color: palette[prizes.length % palette.length], textColor: "#fff", weight: 10 },
    ]);
  const removePrize = (id: string) => update(prizes.filter((p) => p.id !== id));
  const patchPrize = (id: string, patch: Partial<WheelPrize>) =>
    update(prizes.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const totalWeight = prizes.reduce((s, p) => s + Math.max(0, p.weight), 0) || 1;

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center font-sans"
         style={{ 
           backgroundColor: currentTheme.backgroundColor,
           backgroundImage: branding?.backgroundImageUrl ? `url(${branding.backgroundImageUrl})` : 'none',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           color: currentTheme.textColor
         }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      
      <div className={`relative z-10 w-full max-w-7xl px-4 py-8 flex ${mode === "horizontal" ? "flex-col md:flex-row" : "flex-col"} items-center gap-8`}>
        {/* Mode Selector & Theme Selector (only when editable) */}
        {editable && (
          <div className="absolute top-4 left-4 z-50 flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMode(mode === "horizontal" ? "vertical" : "horizontal")}
            >
              {mode === "horizontal" ? <Smartphone className="h-4 w-4 mr-2" /> : <Monitor className="h-4 w-4 mr-2" />}
              {mode === "horizontal" ? t("wheel.modeVertical") : t("wheel.modeHorizontal")}
            </Button>
            <div className="flex gap-1">
              {Object.entries(PRESET_THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setCurrentTheme(theme)}
                  className="w-8 h-8 rounded-full border-2 border-white/50 hover:scale-110 transition-transform"
                  style={{ backgroundColor: theme.primaryColor }}
                  title={theme.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Left Side: Webcam Placeholder (Horizontal Mode) or Top (Vertical Mode) */}
        {mode === "horizontal" && (
          <div className="flex-1 space-y-6 text-center md:text-left" style={{ color: currentTheme.textColor }}>
            {/* Webcam Placeholder */}
            <div className="w-48 h-48 rounded-2xl bg-black/30 border-2 border-white/20 flex items-center justify-center">
              <p className="text-white/50 text-sm">{t("wheel.webcam")}</p>
            </div>
            {(branding?.companyLogoUrl || branding?.companySlogan) && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center md:items-start animate-in fade-in slide-in-from-top duration-1000 mb-6"
              >
                {branding?.companyLogoUrl && (
                  <img src={branding.companyLogoUrl} alt="Logo" className="h-16 object-contain mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                )}
                {branding?.companySlogan && (
                  <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: `${currentTheme.primaryColor}80` }}>{branding.companySlogan}</p>
                )}
              </motion.div>
            )}
            
            <div className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 mb-2">
              <span className="text-xs font-bold">{t("wheel.premiumBadge")}</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">{gameName}</h1>
            <p className="text-xl text-white/70 max-w-md mx-auto md:mx-0">{t("wheel.subtitle")}</p>
            
            {spinCost > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-md text-white">
                <span className="text-xs uppercase opacity-60 font-bold">{t("wheel.cost")}</span>
                <span className="text-2xl font-black">{spinCost} MZN</span>
              </div>
            )}
          </div>
        )}

        {/* Top: Webcam Placeholder (Vertical Mode) */}
        {mode === "vertical" && (
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="w-full h-40 rounded-2xl bg-black/30 border-2 border-white/20 flex items-center justify-center">
              <p className="text-white/50 text-sm">{t("wheel.webcam")}</p>
            </div>
            {(branding?.companyLogoUrl || branding?.companySlogan) && (
              <div className="flex flex-col items-center gap-2">
                {branding?.companyLogoUrl && (
                  <img src={branding.companyLogoUrl} alt="Logo" className="h-12 object-contain" />
                )}
                {branding?.companySlogan && (
                  <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${currentTheme.primaryColor}80` }}>{branding.companySlogan}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Center: The Wheel */}
        <div className="relative group">
          {/* Modern Enhanced Pointer - More Precise */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 drop-shadow-2xl">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-primary shadow-lg relative" style={{ borderColor: currentTheme.primaryColor }}>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent" style={{ borderTopColor: currentTheme.primaryColor }} />
              </div>
              <Sparkles className="w-6 h-6" style={{ color: currentTheme.primaryColor }} />
            </div>
          </div>

          {/* Wheel Container */}
          <div className="relative p-6 rounded-full bg-white/5 border-2 border-white/10 backdrop-blur-sm shadow-[0_0_80px_rgba(0,0,0,0.6)]" style={{ borderColor: `${currentTheme.primaryColor}40` }}>
            <canvas
              ref={canvasRef}
              width="600"
              height="600"
              className="max-w-[300px] sm:max-w-[400px] md:max-w-[600px] h-auto rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'none' : 'transform 0.5s cubic-bezier(0.1, 0, 0.3, 1)'
              }}
            />
            
            {/* Center Button */}
            <button
                onClick={spin}
                disabled={spinning || loading}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full 
                flex flex-col items-center justify-center font-black text-sm transition-all duration-300 z-20
                ${spinning || loading ? 'bg-gray-500 scale-95 opacity-50 cursor-not-allowed' : 'bg-white hover:scale-110 shadow-2xl active:scale-90 cursor-pointer'}`}
                style={{ color: wheelConfig?.wheel_background_color || currentTheme.primaryColor }}
              >
                {loading || spinning ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 animate-spin" />
                    {t("wheel.spinning")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <PartyPopper className="w-6 h-6" />
                    {t("wheel.spin")}
                  </span>
                )}
              </button>
          </div>
        </div>

        {/* Right Side: Last Winner & Rewards (Horizontal Mode) or Bottom (Vertical Mode) */}
        <div className={`${mode === "horizontal" ? "w-full md:w-96" : "w-full max-w-md"} space-y-6`}>
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.3, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: -100 }}
                transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                className={`rounded-3xl p-8 text-center space-y-4 shadow-2xl border-2 ${
                  result.rewardType === "none" || isNoWinLabel(result.label)
                    ? "bg-secondary/90 text-muted-foreground border-white/20"
                    : "border-white/20"
                }`}
                style={
                  result.rewardType !== "none" && !isNoWinLabel(result.label)
                    ? {
                        background: `linear-gradient(135deg, ${currentTheme.primaryColor}66, ${currentTheme.primaryColor}22)`,
                        borderColor: `${currentTheme.primaryColor}66`,
                        color: currentTheme.textColor,
                      }
                    : undefined
                }
              >
                {result.rewardType !== "none" && !isNoWinLabel(result.label) ? (
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{
                        rotate: [0, 15, -15, 0],
                        scale: [1, 1.4, 1],
                      }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                      className="text-yellow-400"
                    >
                      {getResultIcon(result)}
                    </motion.div>
                    <motion.p
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="font-black text-3xl"
                    >
                      🎉 {t("wheel.win")}! 🎉
                    </motion.p>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                      className="text-6xl font-black tracking-tighter"
                    >
                      {result.rewardValue || result.label}
                    </motion.p>
                    {result.description && (
                      <p className="opacity-90 text-lg">{result.description}</p>
                    )}
                    {result.rewardImageUrl && (
                      <img 
                        src={result.rewardImageUrl} 
                        alt="Prémio" 
                        className="w-32 h-32 object-cover rounded-2xl shadow-lg"
                      />
                    )}
                  </div>
                ) : (
                  <p className="font-bold text-3xl flex items-center gap-3 justify-center">
                    😅 {t("tryAgain")}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimum Segments Warning */}
          {prizes.length < 4 && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />
              <p className="text-sm">{t("wheel.minSegmentsWarning")}</p>
            </div>
          )}

          <div className="rounded-2xl bg-black/20 border border-white/10 backdrop-blur-xl text-white overflow-hidden">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider opacity-70 font-bold">{t("wheel.prizes")}</span>
              {editable && onChange && (
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-card border border-border text-[11px] font-medium hover:bg-secondary">
                      <Settings2 className="h-3.5 w-3.5" /> {t("wheel.config")}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                    <SheetHeader className="mb-4"><SheetTitle>{t("wheel.configureTitle")}</SheetTitle></SheetHeader>
                    <div className="space-y-4 pb-6">
                      {prizes.map((p) => {
                        const pct = ((Math.max(0, p.weight) / totalWeight) * 100).toFixed(1);
                        return (
                          <div key={p.id} className="rounded-2xl border border-border p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={p.color}
                                onChange={(e) => patchPrize(p.id, { color: e.target.value })}
                                className="h-9 w-9 rounded-md border border-border bg-transparent cursor-pointer"
                              />
                              <Input
                                value={p.label}
                                onChange={(e) => patchPrize(p.id, { label: e.target.value })}
                                placeholder={t("wheel.prizeName")}
                                className="flex-1"
                              />
                              <button
                                onClick={() => removePrize(p.id)}
                                className="p-2 rounded-md hover:bg-destructive/10 text-destructive"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">{t("wheel.prizeValue")}</Label>
                                <Input
                                  value={p.rewardValue || ""}
                                  onChange={(e) => patchPrize(p.id, { rewardValue: e.target.value })}
                                  placeholder="Ex: 100 MZN"
                                  className="text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">{t("wheel.weight")} ({pct}%)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={1000}
                                  value={p.weight}
                                  onChange={(e) => patchPrize(p.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("wheel.effectType")}</Label>
                              <select
                                value={p.effectType || "confetti"}
                                onChange={(e) => patchPrize(p.id, { effectType: e.target.value as any })}
                                className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs"
                              >
                                <option value="confetti">Confetti</option>
                                <option value="fireworks">Fireworks</option>
                                <option value="stars">Stars</option>
                                <option value="poppers">Poppers</option>
                                <option value="zap">Zap</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={addPrize}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-secondary"
                      >
                        <Plus className="h-4 w-4" /> {t("wheel.addPrize")}
                      </button>
                      <p className="text-[11px] text-muted-foreground text-center">
                        {t("wheel.weightHint")}
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
            <div className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
              {prizes.map((p, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{p.label}</p>
                    {p.rewardValue && <p className="text-xs opacity-50">{p.rewardValue}</p>}
                  </div>
                  {p.rewardImageUrl && (
                    <img src={p.rewardImageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Controls */}
      <div className="fixed bottom-8 right-8 flex gap-3 z-50">
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
        <button className="p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all">
          <Share2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default PrizeWheel;
