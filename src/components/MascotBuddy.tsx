import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { playPopSound, playDismissSound } from "@/lib/sounds";

import mascotHappy from "@/assets/mascot-happy.png";
import mascotThinking from "@/assets/mascot-thinking.png";
import mascotExcited from "@/assets/mascot-excited.png";
import mascotWinner from "@/assets/mascot-winner.png";

type MascotMood = "happy" | "thinking" | "excited" | "winner";

const MOOD_IMAGES: Record<MascotMood, string> = {
  happy: mascotHappy,
  thinking: mascotThinking,
  excited: mascotExcited,
  winner: mascotWinner,
};

const MOOD_ANIMATIONS: Record<MascotMood, Record<string, number[]>> = {
  happy: { y: [0, -8, 0], rotate: [0, 3, -3, 0] },
  thinking: { y: [0, -4, 0], rotate: [0, -5, 0] },
  excited: { y: [0, -14, 0, -10, 0], rotate: [0, 5, -5, 3, 0], scale: [1, 1.05, 1, 1.03, 1] },
  winner: { y: [0, -16, 0], rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] },
};

const POSITIONS = [
  { bottom: "6rem", right: "1.5rem" },
  { bottom: "6rem", left: "1.5rem" },
  { top: "5rem", right: "1.5rem" },
  { top: "5rem", left: "1.5rem" },
  { bottom: "40%", right: "1.5rem" },
  { bottom: "40%", left: "1.5rem" },
];

interface RouteContext {
  context: string;
  mood: MascotMood;
}

function getRouteContext(pathname: string): RouteContext {
  if (pathname === "/") return { context: "homepage", mood: "happy" };
  if (pathname === "/marketplace") return { context: "marketplace de sorteios", mood: "excited" };
  if (pathname.startsWith("/raffle") && pathname.includes("/live")) return { context: "sorteio ao vivo", mood: "winner" };
  if (pathname.startsWith("/raffle")) return { context: "detalhes do sorteio", mood: "thinking" };
  if (pathname === "/community") return { context: "comunidade", mood: "happy" };
  if (pathname === "/my-points") return { context: "pontos de sorte", mood: "excited" };
  if (pathname === "/my-tickets") return { context: "bilhetes do utilizador", mood: "thinking" };
  if (pathname === "/profile") return { context: "perfil do utilizador", mood: "happy" };
  if (pathname.startsWith("/dashboard")) return { context: "dashboard de negócio", mood: "thinking" };
  if (pathname === "/historico") return { context: "histórico de vencedores", mood: "winner" };
  if (pathname === "/como-funciona") return { context: "como funciona a plataforma", mood: "thinking" };
  return { context: "navegação geral", mood: "happy" };
}

const FALLBACK_MESSAGES: Record<MascotMood, ((name: string) => string)[]> = {
  happy: [
    (n) => `Ei ${n}! 🌟 Que bom ver-te! Explora os sorteios e tenta a tua sorte!`,
    (n) => `Olá ${n}! 😄 Bem-vindo ao Bateu! A diversão começa aqui!`,
    (n) => `${n}! ⭐ Convida amigos e ganha pontos de sorte extra!`,
  ],
  thinking: [
    (n) => `Hmm ${n}... 🤔 Este sorteio parece interessante! Já viste os detalhes?`,
    (n) => `${n}, analisa bem as probabilidades! 🧐 Quanto mais bilhetes, mais chances!`,
    (n) => `Pensando bem ${n}... 💭 Blockchain garante que tudo é justo e transparente!`,
  ],
  excited: [
    (n) => `${n}!! 🎉 Tantos prémios incríveis! Não percas esta oportunidade!`,
    (n) => `WOW ${n}! 🚀 Os sorteios estão a bombar! Participa agora!`,
    (n) => `${n}! 🔥 Tens pontos suficientes para resgatar recompensas!`,
  ],
  winner: [
    (n) => `${n}! 🏆 Alguém vai ganhar hoje! Será que és tu?!`,
    (n) => `INCRÍVEL ${n}! 🎊 O momento da verdade chegou!`,
    (n) => `${n}! 👑 Os vencedores são verificados por blockchain! Transparência total!`,
  ],
};

export default function MascotBuddy() {
  const { profile, user } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState(POSITIONS[0]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearCountRef = useRef(0);

  const userName = profile?.display_name || user?.email?.split("@")[0] || "amigo";
  const { context, mood } = useMemo(() => getRouteContext(location.pathname), [location.pathname]);

  const fetchMessage = useCallback(async (ctx: string, currentMood: MascotMood) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("mascot-message", {
        body: { userName, context: ctx, mood: currentMood },
      });
      if (error || !data?.message) throw new Error("No message");
      setMessage(data.message);
    } catch {
      const pool = FALLBACK_MESSAGES[currentMood];
      setMessage(pool[Math.floor(Math.random() * pool.length)](userName));
    } finally {
      setLoading(false);
    }
  }, [userName]);

  const showMascot = useCallback(async () => {
    if (dismissed) return;
    const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    setPosition(pos);
    await fetchMessage(context, mood);
    setVisible(true);
    appearCountRef.current += 1;
    playPopSound();

    timerRef.current = setTimeout(() => {
      setVisible(false);
      const baseDelay = Math.min(30000 + appearCountRef.current * 15000, 120000);
      const jitter = Math.random() * 20000;
      timerRef.current = setTimeout(showMascot, baseDelay + jitter);
    }, 8000);
  }, [dismissed, fetchMessage, context, mood]);

  // Re-trigger on route change
  useEffect(() => {
    if (dismissed) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = appearCountRef.current === 0 ? 5000 : 3000;
    timerRef.current = setTimeout(showMascot, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [location.pathname, showMascot, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    playDismissSound();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(showMascot, 60000 + Math.random() * 60000);
  };

  const handleClose = () => {
    setVisible(false);
    setDismissed(true);
    playDismissSound();
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const currentImage = MOOD_IMAGES[mood];
  const currentAnimation = MOOD_ANIMATIONS[mood];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="fixed z-50 flex items-end gap-2"
          style={position}
        >
          {/* Speech bubble */}
          <motion.div
            initial={{ opacity: 0, x: position.right ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative max-w-[260px] rounded-2xl border border-border bg-card p-3 shadow-lg"
          >
            <button
              onClick={handleClose}
              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] hover:opacity-80"
              title="Fechar mascote"
            >
              <X className="h-3 w-3" />
            </button>

            {/* Mood indicator */}
            <div className="mb-1 flex items-center gap-1">
              <span className="text-[10px] font-medium text-muted-foreground capitalize">
                {mood === "happy" && "😊 Feliz"}
                {mood === "thinking" && "🤔 Pensativo"}
                {mood === "excited" && "🤩 Animado"}
                {mood === "winner" && "🏆 Festivo"}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-1">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span className="text-xs text-muted-foreground">A pensar...</span>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-foreground">{message}</p>
            )}
            {/* Bubble arrow */}
            <div
              className={`absolute bottom-3 ${position.right ? "-right-2" : "-left-2"} h-3 w-3 rotate-45 border-b border-r border-border bg-card`}
              style={position.left ? { borderRight: "none", borderBottom: "none", borderLeft: "1px solid", borderTop: "1px solid" } : {}}
            />
          </motion.div>

          {/* Mascot image */}
          <motion.div
            onClick={handleDismiss}
            className="cursor-pointer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={currentAnimation}
            transition={{
              y: { repeat: Infinity, duration: mood === "excited" ? 1.5 : 2, ease: "easeInOut" },
              rotate: { repeat: Infinity, duration: mood === "excited" ? 2 : 3, ease: "easeInOut" },
              scale: { repeat: Infinity, duration: mood === "excited" ? 1.5 : 2, ease: "easeInOut" },
            }}
          >
            <img
              src={currentImage}
              alt={`Bateu Mascote - ${mood}`}
              className="h-20 w-20 drop-shadow-lg"
              width={80}
              height={80}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
