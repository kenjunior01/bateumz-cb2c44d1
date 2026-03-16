import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Heart, Send, Trophy, Star, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Message {
  id: string;
  user_id: string;
  content: string;
  message_type: string;
  likes_count: number;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  liked_by_me?: boolean;
}

const MESSAGE_TYPES = [
  { id: "all", label: "Todos", icon: MessageCircle },
  { id: "winner", label: "Vencedores 🏆", icon: Trophy },
  { id: "general", label: "Geral", icon: Users },
  { id: "tip", label: "Dicas ⭐", icon: Star },
];

export default function Community() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [msgType, setMsgType] = useState("general");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("community_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      // Fetch profiles for messages
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      const enriched = data.map((m: any) => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      }));
      setMessages(enriched);
    }
    setLoading(false);
  };

  const fetchMyLikes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("message_likes")
      .select("message_id")
      .eq("user_id", user.id);
    if (data) setMyLikes(new Set(data.map((l: any) => l.message_id)));
  };

  useEffect(() => {
    fetchMessages();
    fetchMyLikes();

    const channel = supabase
      .channel("community")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSend = async () => {
    if (!user || !newMsg.trim()) return;
    const { error } = await supabase.from("community_messages").insert({
      user_id: user.id,
      content: newMsg.trim(),
      message_type: msgType,
    } as any);
    if (error) {
      toast.error("Erro ao enviar mensagem");
      return;
    }
    setNewMsg("");
  };

  const handleLike = async (msgId: string) => {
    if (!user) { toast.error("Faça login para reagir"); return; }
    if (myLikes.has(msgId)) {
      await supabase.from("message_likes").delete().eq("message_id", msgId).eq("user_id", user.id);
      setMyLikes((prev) => { const s = new Set(prev); s.delete(msgId); return s; });
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, likes_count: Math.max(0, m.likes_count - 1) } : m));
    } else {
      await supabase.from("message_likes").insert({ message_id: msgId, user_id: user.id } as any);
      setMyLikes((prev) => new Set(prev).add(msgId));
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, likes_count: m.likes_count + 1 } : m));
    }
  };

  const handleDelete = async (msgId: string) => {
    await supabase.from("community_messages").delete().eq("id", msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    toast.success("Mensagem eliminada");
  };

  const filtered = filter === "all" ? messages : messages.filter((m) => m.message_type === filter);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const getInitial = (name: string | null) => (name || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-primary" /> Comunidade
          </h1>
          <p className="text-muted-foreground mt-1">Partilhe testemunhos, dicas e celebre com outros participantes</p>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {MESSAGE_TYPES.map((t) => (
            <Button key={t.id} variant={filter === t.id ? "default" : "outline"} size="sm" onClick={() => setFilter(t.id)} className="shrink-0">
              {t.label}
            </Button>
          ))}
        </div>

        {/* Compose */}
        {user ? (
          <Card className="glass mb-6">
            <CardContent className="p-4">
              <div className="flex gap-2 mb-3">
                {[
                  { id: "general", label: "Geral" },
                  { id: "winner", label: "🏆 Testemunho" },
                  { id: "tip", label: "⭐ Dica" },
                ].map((t) => (
                  <button key={t.id} onClick={() => setMsgType(t.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${msgType === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Escreva a sua mensagem..."
                  className="flex-1 h-10 rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button onClick={handleSend} disabled={!newMsg.trim()} size="sm" className="gap-1">
                  <Send className="h-4 w-4" /> Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass mb-6">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              <a href="/login" className="text-primary hover:underline">Faça login</a> para participar da conversa
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma mensagem ainda. Seja o primeiro!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} layout>
                  <Card className="glass hover:border-primary/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                          {getInitial(msg.profile?.display_name ?? null)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {msg.profile?.display_name || "Utilizador"}
                            </span>
                            {msg.message_type === "winner" && <Badge className="bg-accent/20 text-accent text-[10px]">🏆 Vencedor</Badge>}
                            {msg.message_type === "tip" && <Badge className="bg-primary/20 text-primary text-[10px]">⭐ Dica</Badge>}
                            <span className="text-xs text-muted-foreground ml-auto shrink-0">{timeAgo(msg.created_at)}</span>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">{msg.content}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <button onClick={() => handleLike(msg.id)}
                              className={`flex items-center gap-1 text-xs transition-colors ${myLikes.has(msg.id) ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                              <Heart className={`h-3.5 w-3.5 ${myLikes.has(msg.id) ? "fill-current" : ""}`} />
                              {msg.likes_count > 0 && msg.likes_count}
                            </button>
                            {user?.id === msg.user_id && (
                              <button onClick={() => handleDelete(msg.id)} className="text-xs text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <Footer />
    </div>
  );
}
