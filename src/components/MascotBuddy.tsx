import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MessageCircle, Send, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { playPopSound, playDismissSound, playSendSound } from "@/lib/sounds";

import mascotHappy from "@/assets/mascot-happy.png";
import mascotThinking from "@/assets/mascot-thinking.png";
import mascotExcited from "@/assets/mascot-excited.png";
import mascotWinner from "@/assets/mascot-winner.png";

type MascotMood = "happy" | "thinking" | "excited" | "winner";
type MascotMode = "bubble" | "chat";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

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

// Positions where the mascot can appear
const POSITIONS = [
  { className: "bottom-24 right-4", align: "right" },
  { className: "bottom-24 left-4", align: "left" },
  { className: "top-20 right-4", align: "right" },
  { className: "top-20 left-4", align: "left" },
  { className: "top-1/2 -translate-y-1/2 right-4", align: "right" },
  { className: "top-1/3 left-4", align: "left" },
] as const;

function getRouteContext(pathname: string): { context: string; mood: MascotMood } {
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
    (n) => `${n}! 🎈 Estás pronto para ganhar? Eu acredito em ti!`,
  ],
  thinking: [
    (n) => `Hmm ${n}... 🤔 Este sorteio parece interessante! Já viste os detalhes?`,
    (n) => `${n}, analisa bem! 🧐 Quanto mais bilhetes, mais chances!`,
    (n) => `${n}! 💡 Sabias que podes usar Luck Points para participar grátis?`,
  ],
  excited: [
    (n) => `${n}!! 🎉 Tantos prémios incríveis! Não percas esta oportunidade!`,
    (n) => `WOW ${n}! 🚀 Os sorteios estão a bombar! Participa agora!`,
    (n) => `${n}! 🔥 Olha só estes prémios! Eu não resistia!`,
  ],
  winner: [
    (n) => `${n}! 🏆 Alguém vai ganhar hoje! Será que és tu?!`,
    (n) => `${n}! 👑 Os vencedores são verificados por blockchain!`,
    (n) => `${n}! 🎊 Estou tão animado! O próximo vencedor pode ser tu!`,
  ],
};

const QUICK_QUESTIONS = [
  "Como participar num sorteio?",
  "O que são Luck Points?",
  "Como funciona o blockchain?",
  "Quantos sorteios estão activos?",
  "O que são sorteios sociais?",
  "A plataforma é segura?",
];

// Mini floating mascot that appears in different screen positions
function FloatingMiniMascot({ mood, onClick, position }: { mood: MascotMood; onClick: () => void; position: number }) {
  const pos = POSITIONS[position % POSITIONS.length];
  const img = MOOD_IMAGES[mood];

  return (
    <motion.button
      onClick={onClick}
      className={`fixed z-40 rounded-full ${pos.className}`}
      initial={{ scale: 0, opacity: 0, rotate: -180 }}
      animate={{ scale: 1, opacity: 0.7, rotate: 0 }}
      exit={{ scale: 0, opacity: 0, rotate: 180 }}
      transition={{ type: "spring", damping: 10, stiffness: 150 }}
      whileHover={{ scale: 1.3, opacity: 1 }}
    >
      <motion.img
        src={img}
        alt="Bateu"
        className="h-10 w-10 drop-shadow-md"
        width={40}
        height={40}
        animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
    </motion.button>
  );
}

export default function MascotBuddy() {
  const { profile, user } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<MascotMode>("bubble");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [positionIndex, setPositionIndex] = useState(0);
  const [miniMascots, setMiniMascots] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const miniTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearCountRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<MascotMode>(mode);
  modeRef.current = mode;

  const userName = profile?.display_name || user?.email?.split("@")[0] || "amigo";
  const { context, mood } = useMemo(() => getRouteContext(location.pathname), [location.pathname]);

  // Show mini mascots in various positions
  useEffect(() => {
    const spawnMini = () => {
      if (modeRef.current === "chat") return;
      const pos = Math.floor(Math.random() * POSITIONS.length);
      setMiniMascots(prev => {
        if (prev.length >= 2) return prev;
        if (prev.includes(pos)) return prev;
        return [...prev, pos];
      });
      setTimeout(() => {
        setMiniMascots(prev => prev.filter(p => p !== pos));
      }, 5000 + Math.random() * 5000);
    };

    miniTimerRef.current = setInterval(spawnMini, 15000 + Math.random() * 20000);
    // Initial spawn after delay
    const initial = setTimeout(spawnMini, 8000);
    return () => {
      if (miniTimerRef.current) clearInterval(miniTimerRef.current);
      clearTimeout(initial);
    };
  }, [location.pathname]);

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
    if (dismissed || modeRef.current === "chat") return;
    // Randomize position
    setPositionIndex(Math.floor(Math.random() * POSITIONS.length));
    await fetchMessage(context, mood);
    setVisible(true);
    appearCountRef.current += 1;
    playPopSound();

    timerRef.current = setTimeout(() => {
      if (modeRef.current !== "chat") setVisible(false);
      const baseDelay = Math.min(30000 + appearCountRef.current * 15000, 120000);
      timerRef.current = setTimeout(showMascot, baseDelay + Math.random() * 20000);
    }, 8000);
  }, [dismissed, fetchMessage, context, mood]);

  useEffect(() => {
    if (dismissed) return;
    if (mode === "chat") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = appearCountRef.current === 0 ? 5000 : 3000;
    timerRef.current = setTimeout(showMascot, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [location.pathname, showMascot, dismissed, mode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const openChat = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMode("chat");
    setVisible(true);
    setMiniMascots([]);
    playPopSound();
    if (chatMessages.length === 0) {
      setChatMessages([{
        role: "assistant",
        content: `Olá ${userName}! 😊 Sou o Bateu, o teu assistente. Pergunta-me qualquer coisa sobre a plataforma!`,
      }]);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);
    playSendSound();

    try {
      const { data, error } = await supabase.functions.invoke("mascot-chat", {
        body: {
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          userName,
          context,
        },
      });
      if (error || !data?.message) throw new Error("No response");
      setChatMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Ops, não consegui responder! 😅 Tenta de novo." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDismiss = () => {
    if (mode === "chat") return;
    openChat();
  };

  const handleClose = () => {
    setVisible(false);
    setMode("bubble");
    setDismissed(true);
    setMiniMascots([]);
    playDismissSound();
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const minimizeChat = () => {
    setMode("bubble");
    setVisible(false);
    playDismissSound();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(showMascot, 60000);
  };

  const currentImage = MOOD_IMAGES[mood];
  const currentAnimation = MOOD_ANIMATIONS[mood];
  const currentPos = POSITIONS[positionIndex % POSITIONS.length];

  return (
    <>
      {/* Mini mascots floating around */}
      <AnimatePresence>
        {miniMascots.map((pos) => (
          <FloatingMiniMascot key={pos} mood={mood} onClick={openChat} position={pos} />
        ))}
      </AnimatePresence>

      {/* Main mascot button when hidden */}
      {!visible && !dismissed && (
        <motion.button
          onClick={openChat}
          className="fixed bottom-24 right-4 z-50 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <img src={currentImage} alt="Bateu" className="h-14 w-14 drop-shadow-md" width={56} height={56} />
          <motion.div
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </motion.button>
      )}

      <AnimatePresence>
        {visible && mode === "chat" ? (
          /* ── Chat mode ── */
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="fixed bottom-24 right-4 z-50 w-[320px] sm:w-[360px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "70vh" }}
          >
            {/* Chat header */}
            <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
              <motion.img
                src={currentImage}
                alt="Bateu"
                className="h-10 w-10"
                width={40}
                height={40}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Bateu Assistente</p>
                <p className="text-[10px] text-muted-foreground">
                  {mood === "happy" && "😊 Feliz"}
                  {mood === "thinking" && "🤔 Pensativo"}
                  {mood === "excited" && "🤩 Animado"}
                  {mood === "winner" && "🏆 Festivo"}
                  {" · "}Online
                </p>
              </div>
              <button onClick={minimizeChat} className="p-1 rounded hover:bg-secondary transition-colors" title="Minimizar">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={handleClose} className="p-1 rounded hover:bg-destructive/20 transition-colors" title="Fechar">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[400px]">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <motion.img
                      src={currentImage}
                      alt=""
                      className="h-6 w-6 mr-1 mt-1 shrink-0"
                      width={24}
                      height={24}
                      animate={{ y: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <motion.img src={currentImage} alt="" className="h-6 w-6 mr-1 mt-1" width={24} height={24}
                    animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-3 py-2">
                    <motion.div className="flex gap-1" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    </motion.div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick questions */}
            {chatMessages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-[10px] px-2 py-1 rounded-full border border-border bg-secondary hover:bg-accent/10 text-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(chatInput); }}
              className="flex items-center gap-2 p-2 border-t border-border"
            >
              <input
                ref={inputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pergunta ao Bateu..."
                className="flex-1 bg-secondary rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        ) : visible && mode === "bubble" ? (
          /* ── Bubble mode - appears at random positions ── */
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className={`fixed z-50 flex items-end gap-2 ${currentPos.className}`}
            style={{ flexDirection: currentPos.align === "left" ? "row-reverse" : "row" }}
          >
            <motion.div
              initial={{ opacity: 0, x: currentPos.align === "left" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="relative max-w-[240px] rounded-2xl border border-border bg-card p-3 shadow-lg"
            >
              <button
                onClick={handleClose}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] hover:opacity-80"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {mood === "happy" && "😊 Feliz"}
                  {mood === "thinking" && "🤔 Pensativo"}
                  {mood === "excited" && "🤩 Animado"}
                  {mood === "winner" && "🏆 Festivo"}
                </span>
                <button
                  onClick={openChat}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  <MessageCircle className="h-3 w-3" /> Chat
                </button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                  <span className="text-xs text-muted-foreground">A pensar...</span>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-foreground">{message}</p>
              )}
            </motion.div>

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
              <img src={currentImage} alt={`Bateu - ${mood}`} className="h-20 w-20 drop-shadow-lg" width={80} height={80} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
