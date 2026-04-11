import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import mascotImg from "@/assets/mascot.png";

const POSITIONS = [
  { bottom: "6rem", right: "1.5rem" },
  { bottom: "6rem", left: "1.5rem" },
  { top: "5rem", right: "1.5rem" },
  { top: "5rem", left: "1.5rem" },
  { bottom: "40%", right: "1.5rem" },
  { bottom: "40%", left: "1.5rem" },
];

const CONTEXTS = [
  "homepage", "marketplace", "sorteios ativos", "comunidade",
  "perfil do utilizador", "como funciona", "dashboard",
];

const FALLBACK_MESSAGES = [
  (name: string) => `Ei ${name}! 🌟 Sabia que podes ganhar prémios incríveis? Dá uma olhada nos sorteios!`,
  (name: string) => `${name}, a sorte sorri aos audazes! 🎰 Tenta a tua sorte num sorteio hoje!`,
  (name: string) => `Olá ${name}! 🎉 Todos os sorteios são verificados por blockchain. Transparência total!`,
  (name: string) => `Boas ${name}! ⭐ Convida amigos e ganha pontos de sorte extra!`,
  (name: string) => `${name}! 🏆 Já viste os últimos vencedores? Podes ser o próximo!`,
];

export default function MascotBuddy() {
  const { profile, user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState(POSITIONS[0]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearCountRef = useRef(0);

  const userName = profile?.display_name || user?.email?.split("@")[0] || "amigo";

  const fetchMessage = useCallback(async () => {
    const ctx = CONTEXTS[Math.floor(Math.random() * CONTEXTS.length)];
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("mascot-message", {
        body: { userName, context: ctx },
      });
      if (error || !data?.message) throw new Error("No message");
      setMessage(data.message);
    } catch {
      const fn = FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
      setMessage(fn(userName));
    } finally {
      setLoading(false);
    }
  }, [userName]);

  const showMascot = useCallback(async () => {
    if (dismissed) return;
    const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    setPosition(pos);
    await fetchMessage();
    setVisible(true);
    appearCountRef.current += 1;

    // Auto-hide after 8 seconds
    timerRef.current = setTimeout(() => {
      setVisible(false);
      // Schedule next appearance (longer intervals over time)
      const baseDelay = Math.min(30000 + appearCountRef.current * 15000, 120000);
      const jitter = Math.random() * 20000;
      timerRef.current = setTimeout(showMascot, baseDelay + jitter);
    }, 8000);
  }, [dismissed, fetchMessage]);

  useEffect(() => {
    // First appearance after 5 seconds
    const initial = setTimeout(showMascot, 5000);
    return () => {
      clearTimeout(initial);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showMascot]);

  const handleDismiss = () => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Come back after longer delay
    timerRef.current = setTimeout(showMascot, 60000 + Math.random() * 60000);
  };

  const handleClose = () => {
    setVisible(false);
    setDismissed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

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
            animate={{
              y: [0, -8, 0],
              rotate: [0, 3, -3, 0],
            }}
            transition={{
              y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
              rotate: { repeat: Infinity, duration: 3, ease: "easeInOut" },
            }}
          >
            <img
              src={mascotImg}
              alt="Bateu Mascote"
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
