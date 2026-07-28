import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Users, Trophy, Gamepad2, Zap, Heart, Gift,
  ChevronLeft, Send, Check, Clock, Star, X, ArrowRight,
  Crown, Flame, Lock, Volume2, VolumeX, Share2, Bell, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  subscribeChat, sendChatMessage, fetchChatHistory,
  sendReaction, updatePresence, subscribeViewerCount, getLiveViewerCount,
  toggleFollow, isFollowing, getCreatorStats, subscribeTips,
  createBingoGame, joinBingo, drawBingoNumber, markBingoNumber, checkBingo,
  subscribeBingo, type ChatMessage, type BingoGame, type BingoCard,
  type LiveTip, type CreatorStat,
} from "@/lib/livePlatform";
import FloatingReactions from "@/components/live/FloatingReactions";
import LiveChat from "@/components/live/LiveChat";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMOJI_QUICK = ["\u2764\uFE0F", "\u{1F525}", "\u{1F389}", "\u{1F4AF}", "\u{1F602}", "\u{1F44F}", "\u{1F618}", "\u{1F4A5}"];

const QUICK_GAMES = [
  { emoji: "\u{1F3B2}", label: "Roleta", id: "roulette" },
  { emoji: "\u26BD", label: "P\u00EAnaltis", id: "penalties" },
  { emoji: "\u{1F381}", label: "Caixa", id: "mystery" },
  { emoji: "\u{1F3AF}", label: "Quiz", id: "quiz" },
  { emoji: "\u{1F3B0}", label: "Bingo", id: "bingo" },
  { emoji: "\u{1F4AA}", label: "Tap", id: "tap" },
];

// ==================== BINGO SPECTATOR VIEW ====================
const SpectatorBingo = ({ scheduledLiveId, liveCode }: { scheduledLiveId?: string; liveCode?: string }) => {
  const { user } = useAuth();
  const [game, setGame] = useState<BingoGame | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [marked, setMarked] = useState<Set<number>>(new Set());

  const BINGO_HEADER = ["B", "I", "N", "G", "O"];

  const handleJoin = async () => {
    if (!game) return;
    const { data, error } = await joinBingo(game.id);
    if (error) { toast.error("Erro ao entrar no bingo"); return; }
    setCard(data as BingoCard);
    toast.success("Cart\u00F3ria gerada! Boa sorte!");
  };

  const handleMark = async (num: number) => {
    if (!card || !game) return;
    if (!game.drawn_numbers?.includes(num)) return;
    await markBingoNumber(card.id, num);
    const newMarked = new Set(marked);
    newMarked.add(num);
    setMarked(newMarked);
  };

  const handleBingo = () => {
    if (!card || !game) return;
    const won = checkBingo(card, game.drawn_numbers || [], game.pattern_type);
    if (won) {
      toast.success("\u{1F389} BINGO! Voc\u00EA ganhou!");
    } else {
      toast.error("Ainda n\u00E3o completou o padr\u00E3o!");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-base">Bingo ao Vivo</h3>
        </div>
        {game && (
          <Badge variant="outline" className="text-[10px]">
            {game.drawn_numbers?.length || 0} sorteados
          </Badge>
        )}
      </div>

      {!card ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="text-4xl mb-3">🃏</div>
          <p className="text-sm text-muted-foreground mb-4">
            {game
              ? "Gere sua cart\u00F3ria e jogue em tempo real!"
              : "Aguardando o in\u00EDcio do bingo..."}
          </p>
          {game ? (
            <Button onClick={handleJoin} className="bg-emerald-500 hover:bg-emerald-600">
              Gerar Cart\u00F3ria
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Drawn numbers display */}
          {game.drawn_numbers && game.drawn_numbers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {game.drawn_numbers.slice(-12).map((n) => (
                <span key={n} className="h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {n}
                </span>
              ))}
            </div>
          )}

          {/* Bingo card grid */}
          <div className="grid grid-cols-5 gap-1">
            {BINGO_HEADER.map((h, i) => (
              <div key={h} className="h-7 rounded-lg bg-primary/20 text-primary text-xs font-black flex items-center justify-center">
                {h}
              </div>
            ))}
            {card.numbers.map((num, i) => {
              const isMarked = marked.has(num) || num === 0;
              const isDrawn = game?.drawn_numbers?.includes(num) || num === 0;
              return (
                <button
                  key={i}
                  onClick={() => handleMark(num)}
                  disabled={!isDrawn || num === 0}
                  className={cn(
                    "h-10 rounded-lg text-xs font-bold transition-all",
                    num === 0
                      ? "bg-emerald-500/20 text-emerald-500"
                      : isMarked
                        ? "bg-primary text-primary-foreground scale-95"
                        : isDrawn
                          ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/40 cursor-pointer"
                          : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {num === 0 ? "\u2605" : num}
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleBingo}
            className="w-full py-3 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"
          >
            GRITAR BINGO!
          </Button>
        </div>
      )}
    </div>
  );
};

// ==================== TAP BATTLE SPECTATOR ====================
const SpectatorTapBattle = ({ liveCode }: { liveCode?: string }) => {
  const { user } = useAuth();
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [active, setActive] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [tapParticles, setTapParticles] = useState<{id: number; x: number; y: number; color: string}[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const tapRef = useRef<HTMLDivElement>(null);

  const spawnTapParticle = (e: React.MouseEvent) => {
    if (!tapRef.current) return;
    const rect = tapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const colors = ["#f97316", "#ef4444", "#fbbf24", "#f59e0b", "#ffffff"];
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i, x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 60,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setTapParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setTapParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), 600);
  };

  const handleTap = (e: React.MouseEvent) => {
    if (!active) { startGame(); return; }
    spawnTapParticle(e);
    setTaps(p => { const n = p + 1; if (n % 20 === 0) setShakeKey(k => k + 1); return n; });
  };

  const startGame = () => { setTaps(0); setTimeLeft(10); setActive(true); setTapParticles([]); };

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) {
          setActive(false);
          setBestScore((b) => Math.max(b, taps));
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [active, taps]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="font-bold text-base">Batalha de Toques</h3>
        </div>
        {bestScore > 0 && (
          <Badge variant="secondary" className="text-[10px]">Recorde: {bestScore}</Badge>
        )}
      </div>

      <div key={shakeKey} className={`text-center py-2 ${shakeKey > 0 ? "game-screen-shake" : ""}`}>
        <motion.p key={taps} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="text-5xl font-black text-primary">{taps}</motion.p>
        <p className="text-xs text-muted-foreground mt-1">toques</p>
      </div>

      {active && (
        <div className="relative">
          <div className={`absolute inset-0 rounded-full ${timeLeft <= 3 ? 'energy-bar-glow' : ''}`} />
          <Progress value={(timeLeft / 10) * 100} className={`h-3 ${timeLeft <= 3 ? '[&>div]:!bg-red-500' : timeLeft <= 5 ? '[&>div]:!bg-amber-500' : ''}`} />
          {timeLeft <= 3 && <p className="text-center text-[10px] text-red-400 font-bold mt-1 animate-pulse">ULTIMOS SEGUNDOS!</p>}
        </div>
      )}

      <button
        onClick={handleTap}
        className={cn(
          "w-full h-32 rounded-2xl text-xl font-black transition-all active:scale-90",
          active
            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
            : "bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-2 border-dashed border-primary/30"
        )}
      >
        {active ? `\u{1F4AA} TOQUE! (${timeLeft}s)` : "\u{1F3C3} Come\u00E7ar"}
      </button>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const LiveParticipar = () => {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const liveCode = params.get("code") || "";
  const scheduledLiveId = slug || undefined;
  const liveId = slug || liveCode;

  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activePanel, setActivePanel] = useState<"chat" | "games" | "bingo">("chat");
  const [joined, setJoined] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [muted, setMuted] = useState(false);
  const [followingHost, setFollowingHost] = useState(false);
  const [recentTips, setRecentTips] = useState<LiveTip[]>([]);
  const [hostInfo, setHostInfo] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Presence
  useEffect(() => {
    if (!liveId) return;
    const update = () => updatePresence({ scheduled_live_id: scheduledLiveId, live_code: liveCode || undefined });
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [liveId, scheduledLiveId, liveCode]);

  // Viewer count
  useEffect(() => {
    if (!slug) return;
    getLiveViewerCount(slug).then(setViewerCount);
    const unsub = subscribeViewerCount(slug, setViewerCount);
    return unsub;
  }, [slug]);

  // Chat history + subscribe
  useEffect(() => {
    if (!liveId) return;
    const opts = scheduledLiveId ? { scheduled_live_id: scheduledLiveId } : { live_code: liveCode };
    fetchChatHistory({ ...opts, limit: 50 }).then(({ data }) => {
      if (data) setMessages((data as ChatMessage[]).reverse());
    });
    const unsub = subscribeChat(liveId, opts, (msg) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });
    return unsub;
  }, [liveId, scheduledLiveId, liveCode]);

  // Tips
  useEffect(() => {
    if (!scheduledLiveId) return;
    const unsub = subscribeTips(scheduledLiveId, (tip) => {
      setRecentTips((prev) => [tip, ...prev].slice(0, 3));
    });
    return unsub;
  }, [scheduledLiveId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleJoin = async () => {
    if (user) {
      await sendChatMessage({
        scheduled_live_id: scheduledLiveId,
        live_code: liveCode || undefined,
        message: "Entrou na live! \u{1F44B}",
      });
    }
    setJoined(true);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    await sendChatMessage({
      scheduled_live_id: scheduledLiveId,
      live_code: liveCode || undefined,
      message: chatInput.trim(),
    });
    setChatInput("");
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return `${Math.floor(diff / 3600000)}h`;
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <FloatingReactions scheduledLiveId={scheduledLiveId} liveCode={liveCode || undefined} />

      {/* Tip animation overlay */}
      <AnimatePresence>
        {recentTips.map((tip, i) => (
          <motion.div
            key={`${tip.id}-${i}`}
            initial={{ x: 300, opacity: 0, scale: 0.5 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed top-20 right-4 z-50 max-w-xs"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white shadow-xl shadow-amber-500/30 backdrop-blur-sm">
              <Gift className="h-5 w-5" />
              <div>
                <p className="text-[10px] opacity-80">Super Chat</p>
                <p className="text-sm font-black">${tip.amount.toFixed(2)}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto flex flex-col h-screen lg:h-screen">
        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <Link to="/lives-agora">
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-500 text-white text-[10px] gap-1.5 px-2.5 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                AO VIVO
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {viewerCount}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMuted((p) => !p)} className="p-2 rounded-full hover:bg-muted">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button className="p-2 rounded-full hover:bg-muted">
              <Share2 className="h-4 w-4" />
            </button>
            {!joined && user && (
              <Button
                onClick={handleJoin}
                size="sm"
                className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] gap-1 h-8"
              >
                <Check className="h-3.5 w-3.5" /> Entrar
              </Button>
            )}
          </div>
        </div>

        {/* Video / Stream area */}
        <div className="shrink-0 relative bg-gradient-to-br from-primary/20 via-background to-accent/10 aspect-video max-h-[40vh] lg:max-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
          <div className="relative z-20 text-center">
            <p className="text-5xl font-black text-white/10 select-none">BATEU</p>
            <p className="text-xs text-white/40 mt-1">Plataforma de Entretenimento</p>
          </div>
          {/* Live game indicator */}
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
            <Badge className="bg-black/40 backdrop-blur-sm text-white border-0 text-[10px] rounded-full gap-1">
              <Gamepad2 className="h-3 w-3" /> Jogos ativos
            </Badge>
          </div>
          {/* Viewer count overlay */}
          <div className="absolute top-3 right-3 z-20">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px]">
              <Eye className="h-3 w-3" /> {viewerCount}
            </div>
          </div>
        </div>

        {/* Panel tabs - mobile bottom sheet style */}
        <div className="shrink-0 flex items-center gap-1 px-4 py-2 border-b border-border/40 overflow-x-auto">
          {[
            { id: "chat" as const, label: "Chat", icon: Zap },
            { id: "games" as const, label: "Jogos", icon: Gamepad2 },
            { id: "bingo" as const, label: "Bingo", icon: Trophy },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all",
                  activePanel === tab.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main content area - scrollable */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* CHAT PANEL */}
            {activePanel === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Zap className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs">Aguardando mensagens...</p>
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "text-xs rounded-xl px-3 py-2",
                          msg.is_system
                            ? "text-center text-primary/70 bg-primary/5"
                            : msg.is_highlighted
                              ? "bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/20"
                              : "hover:bg-muted/40"
                        )}
                      >
                        {msg.is_system ? (
                          <p>{msg.message}</p>
                        ) : (
                          <>
                            {msg.is_highlighted && msg.tip_amount > 0 && (
                              <Badge className="bg-amber-500 text-white text-[8px] border-0 mb-1 px-1.5 rounded-full">
                                $${msg.tip_amount.toFixed(2)}
                              </Badge>
                            )}
                            <div className="flex items-start gap-2">
                              <Avatar className="h-5 w-5 mt-0.5 shrink-0">
                                <AvatarImage src={msg.avatar_url || undefined} />
                                <AvatarFallback className="text-[7px] bg-primary/10">
                                  {msg.display_name?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <span className="font-bold text-primary mr-1.5">{msg.display_name}</span>
                                <span className="break-words">{msg.message}</span>
                              </div>
                              <span className="text-[9px] text-muted-foreground/50 shrink-0 ml-auto">{timeAgo(msg.created_at)}</span>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={chatEndRef} />
                </div>

                {/* Emoji quick reactions */}
                <div className="shrink-0 flex items-center gap-1 px-4 py-1.5 overflow-x-auto">
                  {EMOJI_QUICK.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction({ scheduled_live_id: scheduledLiveId, live_code: liveCode || undefined, emoji })}
                      className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted active:scale-125 transition-all text-lg shrink-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Chat input */}
                <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-border/40 bg-background">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    placeholder={joined ? "Enviar mensagem..." : "Entre na live para chat"}
                    className="flex-1 h-10 rounded-xl text-sm"
                    maxLength={500}
                    disabled={!joined}
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={!joined || !chatInput.trim()}
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl bg-primary"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* GAMES PANEL */}
            {activePanel === "games" && (
              <motion.div
                key="games"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="h-full overflow-y-auto p-4 space-y-4"
              >
                <SpectatorTapBattle liveCode={liveCode || undefined} />

                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs text-muted-foreground mb-3 font-medium">Jogos dispon\u00EDveis na live:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_GAMES.map((g) => (
                      <div
                        key={g.id}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/60 hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer active:scale-95"
                      >
                        <span className="text-3xl">{g.emoji}</span>
                        <span className="text-[11px] font-medium">{g.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* BINGO PANEL */}
            {activePanel === "bingo" && (
              <motion.div
                key="bingo"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto p-4"
              >
                <SpectatorBingo scheduledLiveId={scheduledLiveId} liveCode={liveCode || undefined} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default LiveParticipar;
