import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Volume2, VolumeX, Trophy, Share2, Zap, Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Segment {
  id: string;
  segment_number: number;
  label: string;
  description: string;
  background_color: string;
  text_color: string;
  reward_type: string;
  reward_value: string;
  reward_image_url: string;
  weight: number;
}

interface Game {
  id: string;
  name: string;
  description: string;
  background_image_url: string;
  background_color: string;
  wheel_background_color: string;
  wheel_border_color: string;
  company_logo_url?: string;
  company_slogan?: string;
  rotation_duration: number;
  spin_cost: number;
  sound_enabled: boolean;
  particle_effects: boolean;
}

export default function SpinWheelGame() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastReward, setLastReward] = useState<Segment | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);

  const loadGame = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    try {
      const { data: gameData, error: gameError } = await supabase
        .from("spin_wheel_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      const { data: segmentsData, error: segmentsError } = await supabase
        .from("spin_wheel_segments")
        .select("*")
        .eq("wheel_id", gameId)
        .order("segment_number");

      if (segmentsError) throw segmentsError;
      setSegments(segmentsData || []);
    } catch (error) {
      console.error("Error loading game:", error);
      toast.error("Erro ao carregar o jogo da roda");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !game || segments.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const arc = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Outer Shadow/Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(0,0,0,0.5)";

    segments.forEach((segment, i) => {
      const angle = i * arc - (Math.PI / 2);  // Apply -90° offset to align with pointer at top
      
      // Draw Segment
      ctx.beginPath();
      ctx.fillStyle = segment.background_color;
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arc, false);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      // Draw Inner Border
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Text
      ctx.save();
      ctx.fillStyle = segment.text_color || "#FFFFFF";
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = "right";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.shadowBlur = 2;
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.fillText(segment.label, radius - 40, 6);
      ctx.restore();
    });

    // Draw Outer Ring with Glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = game.wheel_border_color || "#FFD700";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = game.wheel_border_color || "#FFD700";
    ctx.lineWidth = 12;
    ctx.stroke();

    // Draw Center Cap (Modern Glass Effect)
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40);
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(1, game.wheel_border_color || "#FFD700");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center Logo
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "900 14px Inter, sans-serif";
    ctx.fillText("BATEU", centerX, centerY + 5);

  }, [game, segments]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel, wheelRotation]);

  const spin = async () => {
    if (isSpinning || !game || segments.length === 0) return;

    setIsSpinning(true);
    setLastReward(null);

    // Calculate winning segment based on weights
    const totalWeight = segments.reduce((acc, s) => acc + (s.weight || 1), 0);
    let random = Math.random() * totalWeight;
    let winningIndex = 0;
    for (let i = 0; i < segments.length; i++) {
      random -= (segments[i].weight || 1);
      if (random <= 0) {
        winningIndex = i;
        break;
      }
    }

    const sectorAngle = 360 / segments.length;
    // Ajuste de 90 graus para alinhar com o ponteiro no topo (12h)
    // A rotação do canvas é no sentido horário, então o índice vencedor deve ser subtraído
    const targetRotation = 360 * 10 + (360 - (winningIndex * sectorAngle)) - 90;
    
    const duration = (game.rotation_duration || 5) * 1000;
    const start = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing mais dramático e fluido (quintic out)
      const ease = 1 - Math.pow(1 - progress, 5);
      const currentRotation = targetRotation * ease;
      
      setWheelRotation(currentRotation);

      // Efeito sonoro de "tick" baseado na rotação
      if (soundEnabled && Math.floor(currentRotation / (360 / segments.length)) !== Math.floor((targetRotation * (1 - Math.pow(1 - (progress - 0.01), 5))) / (360 / segments.length))) {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3");
        audio.volume = 0.1;
        audio.play().catch(() => {});
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const winner = segments[winningIndex];
        setLastReward(winner);
        
        if (game.particle_effects) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: [game.wheel_border_color || "#FFD700", "#FFFFFF"]
          });
        }

        saveSession(winner, currentRotation);
      }
    };

    requestAnimationFrame(animate);
  };

  const saveSession = async (winner: Segment, finalAngle: number) => {
    if (!user || !region) return;
    try {
      const { error } = await supabase.from("spin_wheel_sessions").insert({
        wheel_id: gameId,
        user_id: user.id,
        region_id: region.id,
        segment_id: winner.id,
        reward_type: winner.reward_type,
        reward_value: winner.reward_value,
        spin_angle: finalAngle % 360,
        status: 'completed'
      });
      if (error) throw error;
      toast.success(`Parabéns! Ganhou: ${winner.reward_value}`);
    } catch (err) {
      console.error("Error saving spin session:", err);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#0f172a]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  if (!game) return <Navigate to="/" replace />;

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center font-sans"
      style={{ 
        backgroundColor: game.background_color || "#0f172a",
        backgroundImage: game.background_image_url ? `url(${game.background_image_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Dynamic Background Overlay for Branding */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-6xl px-4 py-8 flex flex-col md:flex-row items-center gap-12">
        
        {/* Left Side: Game Info & Branding */}
        <div className="flex-1 space-y-6 text-white text-center md:text-left">
          {(game.company_logo_url || game.company_slogan) && (
            <div className="flex flex-col items-center md:items-start animate-in fade-in slide-in-from-top duration-1000 mb-6">
              {game.company_logo_url && (
                <img src={game.company_logo_url} alt="Logo" className="h-16 object-contain mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
              )}
              {game.company_slogan && (
                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/80">{game.company_slogan}</p>
              )}
            </div>
          )}
          
          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1">
            Giro da Sorte Premium
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">
            {game.name}
          </h1>
          <p className="text-xl text-white/70 max-w-md mx-auto md:mx-0">
            {game.description || "Tenta a tua sorte e ganha prémios incríveis instantaneamente!"}
          </p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
            <Card className="bg-white/10 border-white/10 backdrop-blur-md text-white p-4 min-w-[140px]">
              <p className="text-xs uppercase opacity-60 font-bold">Custo</p>
              <p className="text-2xl font-black">{game.spin_cost > 0 ? `${game.spin_cost} MZN` : 'GRÁTIS'}</p>
            </Card>
            <Card className="bg-white/10 border-white/10 backdrop-blur-md text-white p-4 min-w-[140px]">
              <p className="text-xs uppercase opacity-60 font-bold">Prêmios</p>
              <p className="text-2xl font-black">{segments.length}</p>
            </Card>
          </div>
        </div>

        {/* Center: The Wheel */}
        <div className="relative group">
          {/* Modern Pointer */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 drop-shadow-xl">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-4 border-primary shadow-inner">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary mt-8"></div>
            </div>
          </div>

          {/* Wheel Container */}
          <div className="relative p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="max-w-[320px] sm:max-w-[450px] md:max-w-[500px] h-auto rounded-full"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transition: isSpinning ? 'none' : 'transform 0.5s cubic-bezier(0.1, 0, 0.3, 1)'
              }}
            />
            
            {/* Center Button */}
            <button
              onClick={spin}
              disabled={isSpinning}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full 
                flex flex-col items-center justify-center font-black text-sm transition-all duration-300 z-20
                ${isSpinning ? 'bg-gray-500 scale-95 opacity-50' : 'bg-white hover:scale-110 shadow-2xl active:scale-90'}
              `}
              style={{ color: game.background_color }}
            >
              {isSpinning ? '...' : 'GIRAR'}
            </button>
          </div>
        </div>

        {/* Right Side: Last Winner & Rewards */}
        <div className="w-full md:w-80 space-y-4">
          {lastReward && (
            <Card className="bg-primary border-none text-white animate-in zoom-in duration-500">
              <CardContent className="p-6 text-center space-y-2">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-300" />
                <h3 className="text-2xl font-black">GANHOU!</h3>
                <p className="text-4xl font-black tracking-tight">{lastReward.reward_value}</p>
                <p className="opacity-80 text-sm">{lastReward.label}</p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-black/20 border-white/10 backdrop-blur-xl text-white overflow-hidden">
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="text-sm uppercase tracking-widest opacity-70">Prêmios em Jogo</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
              {segments.map((s, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.background_color }}></div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{s.label}</p>
                    <p className="text-xs opacity-50">{s.reward_value}</p>
                  </div>
                  {s.reward_image_url && (
                    <img src={s.reward_image_url} alt="" className="w-8 h-8 rounded object-cover" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Controls */}
      <div className="fixed bottom-8 right-8 flex gap-3 z-50">
        <Button size="icon" variant="outline" className="rounded-full bg-white/10 border-white/20 text-white" onClick={() => setSoundEnabled(!soundEnabled)}>
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        <Button size="icon" variant="outline" className="rounded-full bg-white/10 border-white/20 text-white">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
