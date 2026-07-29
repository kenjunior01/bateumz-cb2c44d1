import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Gift, Shield, Trash2, Ban, Reply, ChevronDown, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  sendChatMessage,
  subscribeChat,
  fetchChatHistory,
  type ChatMessage,
} from "@/lib/livePlatform";
import { toast } from "sonner";

interface Props {
  scheduledLiveId?: string;
  liveCode?: string;
  isModerator?: boolean;
  onTipClick?: () => void;
  compact?: boolean;
}

const EMOJI_QUICK = ["❤️", "😂", "🔥", "👏", "🎉", "😍", "💀", "🤔"];

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "agora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
};

const LiveChat = ({ scheduledLiveId, liveCode, isModerator, onTipClick, compact }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [replying, setReplying] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const liveId = scheduledLiveId || liveCode || "unknown";

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      const { data } = await fetchChatHistory({
        scheduled_live_id: scheduledLiveId,
        live_code: liveCode,
        limit: 80,
      });
      if (active && data) {
        setMessages(data.reverse() as ChatMessage[]);
        setLoading(false);
      }
    };
    loadHistory();

    const unsub = subscribeChat(liveId, { scheduled_live_id: scheduledLiveId, live_code: liveCode }, (msg) => {
      if (active) setMessages((prev) => [...prev, msg]);
    });

    return () => { active = false; unsub(); };
  }, [liveId, scheduledLiveId, liveCode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setReplying(null);
    setShowEmoji(false);
    const { error } = await sendChatMessage({
      scheduled_live_id: scheduledLiveId,
      live_code: liveCode,
      message: text,
      replyToId: replying?.id,
    });
    if (error) toast.error("Erro ao enviar mensagem");
  }, [input, scheduledLiveId, liveCode, replying]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleBan = async (msg: ChatMessage) => {
    if (!msg.user_id || !scheduledLiveId) return;
    await import("@/lib/livePlatform").then((m) => m.banUser(scheduledLiveId, msg.user_id));
    toast.success(`${msg.display_name} foi banido`);
  };

  const handleDelete = async (msg: ChatMessage) => {
    await import("@/lib/livePlatform").then((m) => m.deleteChatMessage(msg.id));
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
  };

  const handleEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className={`flex flex-col bg-card border border-border rounded-2xl overflow-hidden ${compact ? "h-[400px]" : "h-[500px] lg:h-[600px]"}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Chat ao Vivo
          </span>
          <Badge variant="secondary" className="text-[10px]">{messages.length}</Badge>
        </div>
        {onTipClick && (
          <Button onClick={onTipClick} size="sm" className="h-7 gap-1 text-[11px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 rounded-full px-3">
            <Gift className="h-3 w-3" /> Super Chat
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-1.5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {messages.length === 0 && !loading && (
            <p className="text-center text-xs text-muted-foreground py-12">
              Seja o primeiro a enviar uma mensagem! 🎉
            </p>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`group relative rounded-xl px-3 py-2 ${
                  msg.is_system
                    ? "bg-primary/5 text-primary text-center text-[11px]"
                    : msg.is_highlighted
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30"
                    : "hover:bg-muted/50"
                }`}
              >
                {msg.is_system ? (
                  <p>{msg.message}</p>
                ) : (
                  <>
                    {msg.is_highlighted && msg.tip_amount > 0 && (
                      <div className="absolute -top-2 left-3">
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] border-0 px-2 rounded-full shadow-lg">
                          💰 ${msg.tip_amount.toFixed(2)}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={msg.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px] bg-primary/10">
                          {msg.display_name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${msg.is_moderator ? "text-emerald-500" : "text-foreground"}`}>
                            {msg.display_name}
                          </span>
                          {msg.is_moderator && <Shield className="h-3 w-3 text-emerald-500" />}
                          <span className="text-[9px] text-muted-foreground">{timeAgo(msg.created_at)}</span>
                        </div>
                        {msg.reply_to_id && (
                          <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                            ↩️ respondendo
                          </p>
                        )}
                        <p className="text-[13px] mt-0.5 break-words leading-relaxed">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                    {isModerator && (
                      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                        <button onClick={() => setReplying(msg)} className="p-1 rounded hover:bg-secondary" aria-label="Responder">
                          <Reply className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleBan(msg)} className="p-1 rounded hover:bg-red-500/20" aria-label="Banir">
                          <Ban className="h-3 w-3 text-red-500" />
                        </button>
                        <button onClick={() => handleDelete(msg)} className="p-1 rounded hover:bg-red-500/20" aria-label="Apagar">
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <AnimatePresence>
        {replying && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border px-3 py-2 bg-muted/30 flex items-center gap-2">
            <Reply className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate flex-1">
              Respondendo a <strong>{replying.display_name}</strong>
            </span>
            <button onClick={() => setReplying(null)} className="p-0.5 rounded hover:bg-secondary">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-border p-2 space-y-1.5">
        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-1 px-1">
              {EMOJI_QUICK.map((e) => (
                <button key={e} onClick={() => handleEmoji(e)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary text-base transition-transform hover:scale-125">
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowEmoji((p) => !p)} className={`p-1.5 rounded-lg transition-colors ${showEmoji ? "bg-secondary" : "hover:bg-secondary"}`}>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showEmoji ? "rotate-180" : ""}`} />
          </button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enviar mensagem..."
            className="flex-1 h-9 text-sm border-border rounded-xl bg-muted/30"
            maxLength={500}
            autoFocus
          />
          <Button onClick={handleSend} disabled={!input.trim()} size="sm" className="h-9 w-9 p-0 rounded-xl bg-primary hover:bg-primary/90">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LiveChat;
