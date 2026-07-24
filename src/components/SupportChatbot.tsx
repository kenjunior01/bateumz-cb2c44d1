import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Sparkles, Ticket, Trophy, BookOpen, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Msg {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  suggestions?: string[];
}

const QUICK_QUESTIONS = [
  "Como compro um bilhete?",
  "Quais métodos de pagamento aceita?",
  "Como sei que o sorteio é justo?",
  "Como ganho Luck Points?",
];

interface QuickAction {
  icon: typeof Ticket;
  label: string;
  action: () => void;
}

const SUGGESTION_MAP: Record<string, string[]> = {
  "Como compro um bilhete?": ["Ver sorteios ativos", "Métodos de pagamento", "Meus bilhetes"],
  "Quais métodos de pagamento aceita?": ["Depositar na carteira", "PayPal", "Transferência bancária"],
  "Como sei que o sorteio é justo?": ["Verificação blockchain", "Transparência", "Historial de ganhadores"],
  "Como ganho Luck Points?": ["Participar em lives", "Referir amigos", "Tarefas diárias"],
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <motion.span
          className="h-2 w-2 rounded-full bg-primary/60"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-primary/60"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-primary/60"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
        />
      </div>
    </div>
  );
}

const SupportChatbot = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! 👋 Sou o assistente do Bateu. Em que te posso ajudar hoje?",
      timestamp: new Date(),
      suggestions: ["Meus Bilhetes", "Sorteios Ativos", "Como Funciona"],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const quickActions: QuickAction[] = [
    {
      icon: Ticket,
      label: "Meus Bilhetes",
      action: () => {
        navigate("/my-tickets");
        setOpen(false);
      },
    },
    {
      icon: Trophy,
      label: "Sorteios Ativos",
      action: () => {
        navigate("/marketplace");
        setOpen(false);
      },
    },
    {
      icon: BookOpen,
      label: "Como Funciona",
      action: () => {
        navigate("/como-funciona");
        setOpen(false);
      },
    },
    {
      icon: Mail,
      label: "Suporte",
      action: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "📧 Para suporte mais detalhado, entra em contacto conosco:\n\n**Email:** suporte@bateu.online\n**Resposta:** Até 24h úteis\n\nOu fala connosco nas redes sociais!",
            timestamp: new Date(),
          },
        ]);
        setShowQuickActions(false);
      },
    },
  ];

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Msg = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setShowQuickActions(false);

    // Simulate typing delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

    try {
      const { data, error } = await supabase.functions.invoke("mascot-chat", {
        body: {
          messages: next,
          userName: profile?.display_name || "visitante",
          context: "support",
          lang: "pt",
          userId: user?.id ?? null,
        },
      });
      if (error) throw error;

      const suggestions = SUGGESTION_MAP[trimmed] ?? [];

      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content: data?.message ?? "Hmm, tenta de novo 🤔",
          timestamp: new Date(),
          suggestions,
        },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content:
            "Estou com dificuldades agora 😅 Tenta daqui a pouco ou contacta suporte@bateu.online.",
          timestamp: new Date(),
          suggestions: ["Suporte", "Como Funciona"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    // Check if it's a navigation action
    if (text === "Meus Bilhetes") {
      navigate("/my-tickets");
      setOpen(false);
      return;
    }
    if (text === "Sorteios Ativos") {
      navigate("/marketplace");
      setOpen(false);
      return;
    }
    if (text === "Como Funciona") {
      navigate("/como-funciona");
      setOpen(false);
      return;
    }
    if (text === "Suporte") {
      quickActions.find((a) => a.label === "Suporte")?.action();
      return;
    }
    // Otherwise, send as a message
    send(text);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground"
        aria-label="Abrir chat de suporte"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent border-2 border-background animate-pulse" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-36 right-4 lg:bottom-24 lg:right-6 z-40 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none">Suporte Bateu</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Resposta instantânea • IA
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* ── Quick Actions ── */}
            {showQuickActions && messages.length <= 2 && (
              <div className="px-3 py-2.5 border-b border-border bg-background/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Ações rápidas
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {quickActions.map((qa) => (
                    <motion.button
                      key={qa.label}
                      whileTap={{ scale: 0.92 }}
                      onClick={qa.action}
                      className="flex flex-col items-center gap-1 rounded-xl bg-secondary/50 hover:bg-primary/10 active:bg-secondary p-2 transition-colors"
                    >
                      <qa.icon className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-medium text-center leading-tight">
                        {qa.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`px-3.5 py-2.5 text-sm leading-snug whitespace-pre-line ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                          : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                      }`}
                    >
                      {m.content.split(/(\*\*[^*]+\*\*)/).map((part, pi) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return (
                            <strong key={pi} className="font-semibold">
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        return <span key={pi}>{part}</span>;
                      })}
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.timestamp && (
                        <span className="text-[9px] text-muted-foreground/60 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(m.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && <TypingIndicator />}
              <div ref={endRef} />
            </div>

            {/* ── Suggestions ── */}
            <AnimatePresence>
              {messages.length > 0 &&
                messages[messages.length - 1].role === "assistant" &&
                messages[messages.length - 1].suggestions &&
                messages[messages.length - 1].suggestions!.length > 0 &&
                !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="px-3 pb-1.5 flex flex-wrap gap-1.5"
                  >
                    {messages[messages.length - 1].suggestions!.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestionClick(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-medium border border-primary/15 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
            </AnimatePresence>

            {/* ── Quick Questions ── */}
            {messages.length <= 2 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input ── */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 p-2 border-t border-border bg-background"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreve a tua pergunta…"
                className="flex-1 h-9 text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={loading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChatbot;
