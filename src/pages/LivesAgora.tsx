import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Users, Search, TrendingUp, Eye, Clock, Heart,
  Calendar, Star, Film, Flame, Crown, Zap, ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getActiveLives, getTopCreators, toggleFollow, isFollowing,
  getLiveViewerCount, subscribeViewerCount, getTrendingClips,
  type CreatorStat, type LiveClip,
} from "@/lib/livePlatform";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Todos", "Sorteio", "Quiz", "Bingo", "Esportes", "Música", "Festa", "Talk"];

const GRADIENTS = [
  "from-violet-600/30 via-fuchsia-500/20 to-pink-500/30",
  "from-cyan-500/30 via-blue-500/20 to-indigo-500/30",
  "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
  "from-amber-500/30 via-orange-500/20 to-red-500/30",
  "from-rose-500/30 via-pink-500/20 to-purple-500/30",
  "from-blue-500/30 via-violet-500/20 to-purple-500/30",
];

type Tab = "live" | "upcoming" | "creators" | "clips";

const CountdownBadge = ({ date }: { date: string }) => {
  const [diff, setDiff] = useState("");
  useEffect(() => {
    const calc = () => {
      const ms = new Date(date).getTime() - Date.now();
      if (ms <= 0) return "Em breve...";
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [date]);

  return <span className="text-[10px] text-emerald-500 font-medium">{diff}</span>;
};

const LiveCard = ({ live, index }: { live: any; index: number }) => {
  const { user } = useAuth();
  const [viewers, setViewers] = useState(0);
  const [following, setFollowing] = useState(false);
  const gradient = GRADIENTS[index % GRADIENTS.length];

  useEffect(() => {
    if (!live.id) return;
    getLiveViewerCount(live.id).then(setViewers);
    const unsub = subscribeViewerCount(live.id, setViewers);
    return unsub;
  }, [live.id]);

  useEffect(() => {
    if (!user || !live.business_user_id) return;
    isFollowing(live.business_user_id).then(setFollowing);
  }, [user, live.business_user_id]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user || !live.business_user_id) return;
    await toggleFollow(live.business_user_id);
    setFollowing((p: boolean) => !p);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Link
        to={`/live-evento/${live.slug}`}
        className="group block rounded-2xl border border-border/60 overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 bg-card"
      >
        <div className={cn("relative h-44 bg-gradient-to-br flex items-center justify-center overflow-hidden", gradient)}>
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/95 backdrop-blur-sm text-white text-[10px] font-bold shadow-lg shadow-red-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            AO VIVO
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px]">
            <Eye className="h-3 w-3" /> {viewers}
          </div>
          {live.category && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-white/15 backdrop-blur-sm text-white border-0 text-[9px] rounded-full">
                {live.category}
              </Badge>
            </div>
          )}
          <span className="text-5xl font-black text-white/5 select-none">BATEU</span>
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant={following ? "secondary" : "default"}
              className={cn("rounded-full h-7 text-[10px] px-3 shadow-lg", !following && "bg-primary hover:bg-primary/90")}
              onClick={handleFollow}
            >
              <Heart className={cn("h-3 w-3 mr-1", following && "fill-current text-red-500")} />
              {following ? "Seguindo" : "Seguir"}
            </Button>
          </div>
        </div>
        <div className="p-3">
          <h3 className="text-sm font-bold truncate group-hover:text-primary transition-colors leading-tight">
            {live.title}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-6 w-6 ring-2 ring-primary/20">
              <AvatarImage src={live.profiles?.avatar_url} />
              <AvatarFallback className="text-[8px] bg-primary/10">
                {live.profiles?.display_name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground truncate flex-1">
              {live.profiles?.display_name}
              {live.profiles?.company_name && (
                <span className="text-primary/60 ml-1">· {live.profiles.company_name}</span>
              )}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const CreatorCard = ({ creator, index }: { creator: CreatorStat; index: number }) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!user) return;
    isFollowing(creator.user_id).then(setFollowing);
  }, [user, creator.user_id]);

  const handleFollow = async () => {
    if (!user) return;
    await toggleFollow(creator.user_id);
    setFollowing((p) => !p);
  };

  const rankColors = [
    "bg-gradient-to-br from-amber-400 to-yellow-500 text-black shadow-amber-500/30",
    "bg-gradient-to-br from-zinc-300 to-zinc-400 text-black shadow-zinc-400/30",
    "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-amber-700/30",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 hover:border-primary/30 hover:bg-muted/20 transition-all group"
    >
      <span className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 shadow-md",
        index < 3 ? rankColors[index] : "bg-muted text-muted-foreground"
      )}>
        {index < 3 ? <Crown className="h-4 w-4" /> : index + 1}
      </span>
      <Avatar className="h-11 w-11 ring-2 ring-primary/10">
        <AvatarImage src={creator.avatar_url} />
        <AvatarFallback className="text-sm font-bold">{creator.display_name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{creator.display_name || creator.company_name}</p>
        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{creator.follower_count || 0}</span>
          <span className="flex items-center gap-0.5"><Radio className="h-3 w-3" />{creator.lives_count || 0} lives</span>
          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{Math.floor((creator.total_live_minutes || 0) / 60)}h</span>
        </div>
      </div>
      <Button
        size="sm"
        variant={following ? "secondary" : "default"}
        className={cn(
          "rounded-full h-8 text-[11px] px-4 transition-all",
          !following && "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
        )}
        onClick={handleFollow}
      >
        {following ? "Seguindo" : "Seguir"}
      </Button>
    </motion.div>
  );
};

const ClipCard = ({ clip, index }: { clip: LiveClip; index: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.05 }}
    className="rounded-2xl border border-border/60 overflow-hidden hover:border-primary/30 transition-all group cursor-pointer"
  >
    <div className={cn("relative h-48 bg-gradient-to-br flex items-center justify-center", GRADIENTS[index % GRADIENTS.length])}>
      <Film className="h-8 w-8 text-white/20" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
        <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
          <ArrowRight className="h-4 w-4 text-foreground ml-0.5" />
        </div>
      </div>
      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px]">
        {clip.duration_seconds}s
      </div>
      <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px]">
        <Eye className="h-2.5 w-2.5" /> {clip.views_count}
      </div>
    </div>
    <div className="p-2.5">
      <p className="text-xs font-bold truncate">{clip.title || "Clip"}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{clip.description}</p>
    </div>
  </motion.div>
);

const LivesAgora = () => {
  const { user } = useAuth();
  const [lives, setLives] = useState<any[]>([]);
  const [creators, setCreators] = useState<CreatorStat[]>([]);
  const [clips, setClips] = useState<LiveClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("live");
  const [category, setCategory] = useState("Todos");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [livesRes, creatorsRes, clipsRes] = await Promise.all([
        getActiveLives(),
        getTopCreators(30),
        getTrendingClips(20),
      ]);
      if (livesRes.data) setLives(livesRes.data as any[]);
      if (creatorsRes.data) setCreators(creatorsRes.data as CreatorStat[]);
      if (clipsRes.data) setClips(clipsRes.data as LiveClip[]);
    } catch (err) {
      console.error("Failed to load discovery data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); const t = setInterval(loadData, 30000); return () => clearInterval(t); }, [loadData]);

  const filteredLives = lives.filter((l: any) => {
    const matchSearch = !search ||
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.profiles?.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || l.category === category;
    return matchSearch && matchCat;
  });

  const filteredCreators = creators.filter((c) =>
    !search ||
    c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "live", label: "Ao Vivo", icon: Radio, count: lives.length },
    { id: "upcoming", label: "Em Breve", icon: Calendar },
    { id: "creators", label: "Top Criadores", icon: TrendingUp, count: creators.length },
    { id: "clips", label: "Clips", icon: Film, count: clips.length },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0 bg-cosmic bg-noise">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-6 md:p-8 border border-primary/10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative">
                    <span className="h-3 w-3 rounded-full bg-red-500 block" />
                    <span className="h-3 w-3 rounded-full bg-red-500 absolute inset-0 animate-ping opacity-75" />
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">Lives Agora</h1>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Descubra lives em curso, jogue em tempo real e apoie seus criadores favoritos. O entretenimento está aqui.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-black text-primary">{lives.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ao Vivo</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-500">{creators.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Criadores</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar lives ou criadores..."
            className="pl-10 h-11 rounded-xl bg-muted/40 border-border/60 focus:border-primary/50"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0",
                category === cat
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-2xl bg-muted/40 w-fit mb-6">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all",
                  tab === t.id
                    ? "bg-card shadow-md text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {t.count !== undefined && (
                  <Badge variant="secondary" className="text-[9px] h-4 min-w-4 px-1 rounded-full">{t.count}</Badge>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === "live" && (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border/60 p-3 space-y-3">
                      <Skeleton className="h-44 w-full rounded-xl" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredLives.length === 0 ? (
                <div className="text-center py-20">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Radio className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma live em curso</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Volte mais tarde ou explore outras categorias!</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredLives.map((live, i) => <LiveCard key={live.id} live={live} index={i} />)}
                </div>
              )}
            </motion.div>
          )}

          {tab === "upcoming" && (
            <motion.div key="upcoming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
              ) : (
                <div className="space-y-3">
                  {lives.filter((l: any) => l.status === "scheduled").length === 0 ? (
                    <div className="text-center py-20">
                      <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhuma live agendada</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Os criadores vão anunciar em breve!</p>
                    </div>
                  ) : (
                    lives.filter((l: any) => l.status === "scheduled").map((live: any, i: number) => (
                      <motion.div
                        key={live.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 hover:border-primary/30 hover:bg-muted/20 transition-all"
                      >
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
                          <Calendar className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{live.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span>{live.profiles?.display_name}</span>
                            <span>·</span>
                            <CountdownBadge date={live.scheduled_at} />
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full text-[10px] shrink-0">
                          <Clock className="h-3 w-3 mr-1" /> Agendado
                        </Badge>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}

          {tab === "creators" && (
            <motion.div key="creators" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
              ) : filteredCreators.length === 0 ? (
                <div className="text-center py-20">
                  <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum criador encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCreators.map((creator, i) => (
                    <CreatorCard key={creator.user_id} creator={creator} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "clips" && (
            <motion.div key="clips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
                </div>
              ) : clips.length === 0 ? (
                <div className="text-center py-20">
                  <Film className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum clip disponível</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Os melhores momentos das lives vão aparecer aqui!</p>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {clips.map((clip, i) => <ClipCard key={clip.id} clip={clip} index={i} />)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
};

export default LivesAgora;
