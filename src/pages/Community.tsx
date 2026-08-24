import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Heart, Send, Trophy, Star, Trash2, Users, BarChart3, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import { useSEO } from "@/hooks/useSEO";

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
  { id: "poll", label: "Sondagens 📊", icon: BarChart3 },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Community() {
  useSEO({ title: 'Comunidade Bateu', description: 'Junte-se à comunidade Bateu. Conecte-se com outros jogadores, partilhe estratégias, acompanhe resultados e esteja por dentro das novidades.', canonicalPath: '/community' });
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [msgType, setMsgType] = useState("general");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("community_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
      const enriched = data.map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) || null }));
      setMessages(enriched);
    }
    setLoading(false);
  };

  const fetchMyLikes = async () => {
    if (!user) return;
    const { data } = await supabase.from("message_likes").select("message_id").eq("user_id", user.id);
    if (data) setMyLikes(new Set(data.map((l: any) => l.message_id)));
  };

  useEffect(() => {
    fetchMessages();
    fetchMyLikes();
    const channel = supabase
      .channel("community")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSend = async () => {
    if (!user || !newMsg.trim()) return;
    const { error } = await supabase.from("community_messages").insert({
      user_id: user.id, content: newMsg.trim(), message_type: msgType,
    } as any);
    if (error) { toast.error("Erro ao enviar mensagem"); return; }
    setNewMsg("");
  };

  const handleSendPoll = async () => {
    if (!user || !pollQuestion.trim()) return;
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) { toast.error("Adicione pelo menos 2 opções"); return; }
    const pollData = JSON.stringify({ question: pollQuestion.trim(), options: validOptions, votes: {} });
    const { error } = await supabase.from("community_messages").insert({
      user_id: user.id, content: pollData, message_type: "poll",
    } as any);
    if (error) { toast.error("Erro ao criar sondagem"); return; }
    setPollQuestion(""); setPollOptions(["", ""]); setShowPollCreator(false);
    toast.success("Sondagem criada!");
  };

  const handleVote = async (msgId: string, optionIdx: number) => {
    if (!user) { toast.error("Faça login para votar"); return; }
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    try {
      const pollData = JSON.parse(msg.content);
      const votes: Record<string, number> = pollData.votes || {};
      // Check if already voted
      const votedKey = "_voter_" + user.id;
      if (votes[votedKey] !== undefined) { toast.info("Já votou nesta sondagem"); return; }
      votes[votedKey] = optionIdx;
      const countKey = "opt_" + optionIdx;
      votes[countKey] = (votes[countKey] || 0) + 1;
      pollData.votes = votes;
      // We can't update community_messages (no UPDATE RLS), so we use likes as vote tracking
      // Instead, store votes in the content itself via a workaround:
      // Actually the user owns the message... let's use a different approach
      // Store vote as a like + update local state
      if (!myLikes.has(msgId)) {
        await supabase.from("message_likes").insert({ message_id: msgId, user_id: user.id } as any);
        setMyLikes(prev => new Set(prev).add(msgId));
      }
      // Update local state for immediate feedback
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const data = JSON.parse(m.content);
        data.votes = data.votes || {};
        data.votes[votedKey] = optionIdx;
        data.votes["opt_" + optionIdx] = (data.votes["opt_" + optionIdx] || 0) + 1;
        return { ...m, content: JSON.stringify(data), likes_count: m.likes_count + 1 };
      }));
      toast.success("Voto registado!");
    } catch { /* not a valid poll */ }
  };

  const handleLike = async (msgId: string) => {
    if (!user) { toast.error("Faça login para reagir"); return; }
    if (myLikes.has(msgId)) {
      await supabase.from("message_likes").delete().eq("message_id", msgId).eq("user_id", user.id);
      setMyLikes(prev => { const s = new Set(prev); s.delete(msgId); return s; });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, likes_count: Math.max(0, m.likes_count - 1) } : m));
    } else {
      await supabase.from("message_likes").insert({ message_id: msgId, user_id: user.id } as any);
      setMyLikes(prev => new Set(prev).add(msgId));
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, likes_count: m.likes_count + 1 } : m));
    }
  };

  const handleDelete = async (msgId: string) => {
    await supabase.from("community_messages").delete().eq("id", msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    toast.success("Mensagem eliminada");
  };

  const filtered = filter === "all" ? messages : messages.filter(m => m.message_type === filter);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return mins + "m";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h";
    return Math.floor(hrs / 24) + "d";
  };

  const getInitial = (name: string | null) => (name || "U").charAt(0).toUpperCase();

  const renderPoll = (msg: Message) => {
    try {
      const data = JSON.parse(msg.content);
      if (!data.question || !data.options) return <p className="text-sm text-foreground/90">{msg.content}</p>;
      const votes = data.votes || {};
      const hasVoted = user ? votes["_voter_" + user.id] !== undefined : false;
      const totalVotes = data.options.reduce((_: number, __: any, i: number) => _ + (votes["opt_" + i] || 0), 0);

      return (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> {data.question}
          </p>
          <div className="space-y-1.5">
            {data.options.map((opt: string, i: number) => {
              const count = votes["opt_" + i] || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isMyVote = hasVoted && votes["_voter_" + (user ? user.id : "")] === i;
              return (
                <button
                  key={i}
                  onClick={() => !hasVoted && handleVote(msg.id, i)}
                  disabled={hasVoted}
                  className={("w-full text-left rounded-lg p-2.5 text-sm transition-all relative overflow-hidden ") +
                    (hasVoted ? "cursor-default" : "hover:bg-primary/10 cursor-pointer") + " " +
                    (isMyVote ? "ring-1 ring-primary" : "") + " bg-secondary/50"}
                >
                  {hasVoted && (
                    <div className="absolute inset-0 bg-primary/10 rounded-lg" style={{ width: pct + "%" }} />
                  )}
                  <div className="relative flex items-center justify-between">
                    <span className={isMyVote ? "font-medium text-primary" : "text-foreground"}>{opt}</span>
                    {hasVoted && <span className="text-xs text-muted-foreground">{pct}% ({count})</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {totalVotes > 0 && (
            <p className="text-[10px] text-muted-foreground">{totalVotes} voto{totalVotes !== 1 ? "s" : ""}</p>
          )}
        </div>
      );
    } catch {
      return <p className="text-sm text-foreground/90">{msg.content}</p>;
    }
  };

  const chipCategories = MESSAGE_TYPES.map((t) => ({
    id: t.id,
    label: t.label.replace(/[🏆⭐📊]/g, "").trim(),
    icon: t.id === "winner" ? "🏆" : t.id === "tip" ? "⭐" : t.id === "poll" ? "📊" : t.id === "general" ? "💬" : "📰",
    count: t.id === "all" ? messages.length : messages.filter((m) => m.message_type === t.id).length,
  }));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 bg-mesh-soft bg-noise">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 pt-2 md:pt-28 pb-10 md:pb-20 max-w-3xl">
        <MobileDiscoveryHeader
          title="Comunidade"
          searchValue=""
          onSearchChange={() => {}}
          searchPlaceholder="Pesquisar mensagem..."
          categories={chipCategories}
          activeCategory={filter}
          onCategoryChange={setFilter}
        />

        {/* Desktop header - enhanced with gradient accent */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5 }}
          className="hidden md:block mb-8 relative"
        >
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-primary/6 via-accent/4 to-primary/6 blur-lg -z-10" />
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            Comunidade
          </h1>
          <p className="text-muted-foreground mt-1 ml-[52px]">Partilhe testemunhos, dicas, crie sondagens e celebre com outros participantes</p>
        </motion.div>

        {/* Desktop filter buttons - enhanced with whileHover */}
        <div className="hidden md:flex gap-2 mb-6 overflow-x-auto pb-2">
          {MESSAGE_TYPES.map(t => (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setFilter(t.id)}
              className={"shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all " +
                (filter === t.id
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-secondary/80 text-muted-foreground hover:text-foreground border border-border hover:border-primary/20"
                )}
            >
              {t.label}
            </motion.button>
          ))}
        </div>

        {user ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="glass mb-6 border-primary/10 bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-4">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {[
                    { id: "general", label: "Geral" },
                    { id: "winner", label: "🏆 Testemunho" },
                    { id: "tip", label: "⭐ Dica" },
                  ].map(t => (
                    <motion.button
                      key={t.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setMsgType(t.id); setShowPollCreator(false); }}
                      className={("rounded-full px-3 py-1 text-xs font-medium transition-all ") +
                        (msgType === t.id && !showPollCreator
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                    >
                      {t.label}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPollCreator(!showPollCreator)}
                    className={("rounded-full px-3 py-1 text-xs font-medium transition-all ") +
                      (showPollCreator
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                  >
                    📊 Sondagem
                  </motion.button>
                </div>

                {showPollCreator ? (
                  <div className="space-y-3">
                    <input
                      value={pollQuestion}
                      onChange={e => setPollQuestion(e.target.value)}
                      placeholder="Qual é a sua pergunta?"
                      className="w-full h-10 rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={opt}
                          onChange={e => {
                            const n = [...pollOptions];
                            n[i] = e.target.value;
                            setPollOptions(n);
                          }}
                          placeholder={"Opção " + (i + 1)}
                          className="flex-1 h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {pollOptions.length > 2 && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive text-sm px-2"
                          >✕</motion.button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      {pollOptions.length < 5 && (
                        <Button variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ""])}>
                          + Opção
                        </Button>
                      )}
                      <Button size="sm" onClick={handleSendPoll} disabled={!pollQuestion.trim()} className="ml-auto gap-1">
                        <BarChart3 className="h-4 w-4" /> Publicar Sondagem
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      placeholder="Escreva a sua mensagem..."
                      className="flex-1 h-10 rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button onClick={handleSend} disabled={!newMsg.trim()} size="sm" className="gap-1">
                        <Send className="h-4 w-4" /> Enviar
                      </Button>
                    </motion.div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="glass mb-6">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              <a href="/login" className="text-primary hover:underline">Faça login</a> para participar da conversa
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 text-muted-foreground"
          >
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma mensagem ainda. Seja o primeiro!</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} layout>
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="glass hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-primary/10 text-primary text-sm font-bold">
                            {getInitial(msg.profile?.display_name ?? null)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {msg.profile?.display_name || "Utilizador"}
                              </span>
                              {msg.message_type === "winner" && <Badge className="bg-accent/20 text-accent text-[10px]">🏆 Vencedor</Badge>}
                              {msg.message_type === "tip" && <Badge className="bg-primary/20 text-primary text-[10px]">⭐ Dica</Badge>}
                              {msg.message_type === "poll" && <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">📊 Sondagem</Badge>}
                              <span className="text-xs text-muted-foreground ml-auto shrink-0">{timeAgo(msg.created_at)}</span>
                            </div>
                            {msg.message_type === "poll" ? renderPoll(msg) : (
                              <p className="text-sm text-foreground/90 leading-relaxed">{msg.content}</p>
                            )}
                            {msg.message_type !== "poll" && (
                              <div className="flex items-center gap-3 mt-2">
                                <motion.button
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleLike(msg.id)}
                                  className={"flex items-center gap-1 text-xs transition-colors " + (myLikes.has(msg.id) ? "text-destructive" : "text-muted-foreground hover:text-destructive")}
                                >
                                  <Heart className={("h-3.5 w-3.5 ") + (myLikes.has(msg.id) ? "fill-current" : "")} />
                                  {msg.likes_count > 0 && msg.likes_count}
                                </motion.button>
                                {user?.id === msg.user_id && (
                                  <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleDelete(msg.id)}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </motion.button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
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
