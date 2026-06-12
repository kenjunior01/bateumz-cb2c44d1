import { useEffect, useState, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Volume2, VolumeX, Trophy } from "lucide-react";
import { toast } from "sonner";
import "./SpinWheelGame.css";

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
  probability_percentage: number;
}

interface Game {
  id: string;
  name: string;
  description: string;
  background_image_url: string;
  background_color: string;
  wheel_background_color: string;
  wheel_border_color: string;
  segment_count: number;
  rotation_duration: number;
  spin_cost: number;
  animation_style: string;
  sound_enabled: boolean;
  particle_effects: boolean;
}

export default function SpinWheelGame() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastReward, setLastReward] = useState<Segment | null>(null);
  const [totalSpins, setTotalSpins] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);

  useEffect(() => {
    if (!gameId || !user) return;
    loadGame();
  }, [gameId, user]);

  useEffect(() => {
    if (game && segments.length > 0) {
      drawWheel();
    }
  }, [game, segments, wheelRotation]);

  const loadGame = async () => {
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
      toast.error("Erro ao carregar jogo");
    } finally {
      setLoading(false);
    }
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || !game) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.fillStyle = game.wheel_background_color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw segments
    const segmentAngle = (360 / segments.length) * (Math.PI / 180);

    segments.forEach((segment, index) => {
      const startAngle = (index * 360) / segments.length + wheelRotation;
      const endAngle = startAngle + 360 / segments.length;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(
        centerX,
        centerY,
        radius,
        (startAngle * Math.PI) / 180,
        (endAngle * Math.PI) / 180
      );
      ctx.closePath();
      ctx.fillStyle = segment.background_color;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = game.wheel_border_color;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(
        ((startAngle + endAngle) / 2 * Math.PI) / 180
      );
      ctx.textAlign = "right";
      ctx.fillStyle = segment.text_color;
      ctx.font = "bold 14px Arial";
      ctx.fillText(segment.label, radius - 30, 5);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = game.wheel_border_color;
    ctx.fill();
    ctx.strokeStyle = game.wheel_background_color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX - 15, 50);
    ctx.lineTo(centerX + 15, 50);
    ctx.closePath();
    ctx.fillStyle = game.wheel_border_color;
    ctx.fill();
  };

  const spin = async () => {
    if (isSpinning) return;
    if (game && game.spin_cost > 0) {
      toast.info(`Custa ${game.spin_cost} pontos para girar`);
    }

    setIsSpinning(true);
    playSound("spin");

    // Calculate random rotation
    const spinDegrees = Math.random() * 360;
    const totalRotation = wheelRotation + 360 * 5 + spinDegrees;

    // Animate rotation
    const startTime = Date.now();
    const duration = (game?.rotation_duration || 5) * 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentRotation = wheelRotation + (totalRotation - wheelRotation) * easeProgress;

      setWheelRotation(currentRotation % 360);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        handleSpinComplete(spinDegrees);
      }
    };

    requestAnimationFrame(animate);
  };

  const handleSpinComplete = async (finalDegree: number) => {
    const segmentIndex = Math.floor(
      ((360 - finalDegree) % 360) / (360 / segments.length)
    );
    const winningSegment = segments[segmentIndex];

    setLastReward(winningSegment);
    setTotalSpins((prev) => prev + 1);
    playSound("win");

    // Save spin session
    try {
      const { error } = await supabase.from("spin_wheel_sessions").insert({
        wheel_id: gameId,
        user_id: user!.id,
        region_id: "default-region",
        segment_id: winningSegment.id,
        reward_type: winningSegment.reward_type,
        reward_value: winningSegment.reward_value,
        spin_angle: finalDegree,
        rotation_duration: game?.rotation_duration || 5,
      });

      if (error) throw error;
      toast.success(`Você ganhou: ${winningSegment.reward_value}!`);
    } catch (error) {
      console.error("Error saving spin:", error);
    }
  };

  const playSound = (type: string) => {
    if (!soundEnabled || !game?.sound_enabled) return;
    // Implement sound effects
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!game) {
    return <Navigate to="/games" replace />;
  }

  return (
    <div
      className="min-h-screen spin-wheel-game"
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
      <div className="absolute inset-0 bg-black/30"></div>

      <div className="relative z-10 container mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-white mb-2">
              {game.name}
            </h1>
            {game.description && (
              <p className="text-white/80">{game.description}</p>
            )}
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

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center gap-8">
          {/* Wheel */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-20">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-400"></div>
              </div>

              {/* Canvas Wheel */}
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className={`rounded-full shadow-2xl transition-transform ${
                  isSpinning ? "" : ""
                }`}
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? "none" : "transform 0.3s ease-out",
                }}
              />
            </div>

            {/* Spin Button */}
            <Button
              onClick={spin}
              disabled={isSpinning}
              className="mt-8 px-12 py-6 text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black disabled:opacity-50"
            >
              {isSpinning ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Girando...
                </>
              ) : (
                "GIRAR A RODA"
              )}
            </Button>
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-4">
            {/* Stats */}
            <Card className="bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total de Giros</p>
                  <p className="text-3xl font-bold">{totalSpins}</p>
                </div>
              </CardContent>
            </Card>

            {/* Last Reward */}
            {lastReward && (
              <Card className="bg-white/95 backdrop-blur border-2 border-yellow-400">
                <CardHeader>
                  <CardTitle className="text-sm">Último Prêmio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastReward.reward_image_url && (
                    <img
                      src={lastReward.reward_image_url}
                      alt={lastReward.label}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-bold text-lg">{lastReward.label}</p>
                    <p className="text-sm text-gray-600">{lastReward.description}</p>
                  </div>
                  <Badge className="w-full justify-center py-2 text-base">
                    {lastReward.reward_value}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Segments List */}
            <Card className="bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm">Prêmios Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {segments.map((segment) => (
                    <div
                      key={segment.id}
                      className="p-2 rounded text-sm border-2"
                      style={{
                        borderColor: segment.background_color,
                        backgroundColor: segment.background_color + "20",
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{segment.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {segment.reward_value}
                        </Badge>
                      </div>
                      {segment.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {segment.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
