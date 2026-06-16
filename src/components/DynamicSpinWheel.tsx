import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Segment {
  id: string;
  label: string;
  background_color: string;
  text_color: string;
  reward_type: string;
  reward_value: string;
}

interface SpinWheelProps {
  gameId: string;
}

const DynamicSpinWheel = ({ gameId }: SpinWheelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWheelData = async () => {
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

  const spin = async () => {
    if (spinning || segments.length === 0) return;
    if (!user) {
      toast({ title: "Login necessário", description: "Por favor, entre na sua conta para jogar.", variant: "destructive" });
      return;
    }

    setSpinning(true);
    setResult(null);

    // Randomly pick a segment (client-side for animation, should be validated server-side later)
    const extraSpins = 5 + Math.random() * 3;
    const targetAngle = extraSpins * 360 + Math.random() * 360;
    const newRotation = rotation + targetAngle;
    setRotation(newRotation);

    setTimeout(async () => {
      const finalAngle = newRotation % 360;
      const segmentAngle = 360 / segments.length;
      const idx = Math.floor(((360 - finalAngle + segmentAngle / 2) % 360) / segmentAngle) % segments.length;
      const won = segments[idx];
      
      setResult(won.label);
      setSpinning(false);

      if (won.reward_type !== "nothing") {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        toast({ title: "Parabéns!", description: `Ganhaste: ${won.label}` });
        
        // Save session in database
        await supabase.from("spin_wheel_sessions").insert({
          wheel_id: gameId,
          user_id: user.id,
          region_id: "default-region", // Needs to be dynamic
          segment_id: won.id,
          reward_type: won.reward_type,
          reward_value: won.reward_value,
          status: "completed"
        });
      }
    }, 4000);
  };

  if (loading) return <div className="text-center py-8">Carregando roda...</div>;
  if (segments.length === 0) return <div className="text-center py-8 text-muted-foreground">Esta roda não tem segmentos configurados.</div>;

  const segmentAngle = 360 / segments.length;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-md" />

        <motion.svg
          width="300"
          height="300"
          viewBox="0 0 300 300"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
          className="drop-shadow-2xl"
        >
          {segments.map((seg, i) => {
            const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
            const x1 = 150 + 140 * Math.cos(startAngle);
            const y1 = 150 + 140 * Math.sin(startAngle);
            const x2 = 150 + 140 * Math.cos(endAngle);
            const y2 = 150 + 140 * Math.sin(endAngle);
            const largeArc = segmentAngle > 180 ? 1 : 0;
            const midAngle = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180);
            const tx = 150 + 90 * Math.cos(midAngle);
            const ty = 150 + 90 * Math.sin(midAngle);
            const textRotation = (i + 0.5) * segmentAngle;

            return (
              <g key={seg.id}>
                <path
                  d={`M150,150 L${x1},${y1} A140,140 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={seg.background_color}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1.5"
                />
                <text
                  x={tx}
                  y={ty}
                  fill={seg.text_color}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                >
                  {seg.label}
                </text>
              </g>
            );
          })}
          <circle cx="150" cy="150" r="22" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="3" />
          <text x="150" y="150" fill="hsl(var(--primary))" fontSize="14" fontWeight="bold" textAnchor="middle" dominantBaseline="central">
            🎯
          </text>
        </motion.svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="group relative px-10 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-primary/25"
      >
        <span className="flex items-center gap-2">
          {spinning ? "A girar..." : "Girar a Roda! 🎰"}
        </span>
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`text-center px-8 py-4 rounded-2xl shadow-xl ${result.toLowerCase().includes("nada") || result.toLowerCase().includes("tenta") ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary border border-primary/20"}`}
          >
            <p className="font-bold text-xl">{result.toLowerCase().includes("nada") || result.toLowerCase().includes("tenta") ? "😅 Tente de novo!" : `🎉 Ganhou: ${result}`}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicSpinWheel;
