import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Trophy, Flame, Star, Megaphone, X, Clock, Plus, User as UserIcon, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CreateStoryDialog from "@/components/CreateStoryDialog";
import { toast } from "sonner";

interface Story {
  id: string;
  type: "hot" | "winner" | "announcement" | "new" | "user";
  title: string;
  subtitle: string;
  image?: string;
  gradient: string;
  icon: typeof Trophy;
  link?: string;
  createdAt: number; // timestamp ms
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
}

const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const VIEWED_KEY = "bateu_stories_viewed";


const StoriesCarousel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [progress, setProgress] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  const [createOpen, setCreateOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    // Load viewed stories from localStorage
    try {
      const raw = localStorage.getItem(VIEWED_KEY);
      if (raw) {
        const parsed: Record<string, number> = JSON.parse(raw);
        // Clean expired
        const fresh: Record<string, number> = {};
        Object.entries(parsed).forEach(([k, v]) => {
          if (Date.now() - v < STORY_TTL_MS) fresh[k] = v;
        });
        localStorage.setItem(VIEWED_KEY, JSON.stringify(fresh));
        setViewedIds(new Set(Object.keys(fresh)));
      }
    } catch {}
    loadStories();
  }, []);

  // Tick "now" every minute to keep countdown fresh
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  const loadStories = async () => {
    const baseStories: Story[] = [
      {
        id: "announcement-1",
        type: "announcement",
        title: "🎉 Novidade!",
        subtitle: "Raspadinhas digitais e Roda da Sorte agora disponíveis!",
        gradient: "from-primary to-emerald-400",
        icon: Megaphone,
        link: "/instant-win",
        createdAt: Date.now(),
      },
    ];

    const cutoff = new Date(Date.now() - STORY_TTL_MS).toISOString();

    // Hot raffles (last 24h activity)
    const { data: hotRaffles } = await supabase
      .from("raffles")
      .select("id, title, image_url, slug, sold_tickets, total_tickets, created_at, updated_at")
      .eq("status", "active")
      .order("sold_tickets", { ascending: false })
      .limit(3);

    if (hotRaffles) {
      hotRaffles.forEach((r) => {
        baseStories.push({
          id: `hot-${r.id}`,
          type: "hot",
          title: "🔥 Em Alta",
          subtitle: r.title,
          image: r.image_url || undefined,
          gradient: "from-orange-500 via-red-500 to-pink-600",
          icon: Flame,
          link: `/raffle/${r.slug || r.id}`,
          createdAt: new Date(r.updated_at || r.created_at).getTime(),
        });
      });
    }

    // Recent winners (last 24h)
    const { data: winners } = await supabase
      .from("participants")
      .select("id, ticket_number, created_at, raffles(title, prize_title)")
      .eq("status", "winner")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(3);

    if (winners) {
      winners.forEach((w: any) => {
        baseStories.push({
          id: `winner-${w.id}`,
          type: "winner",
          title: "🏆 Vencedor!",
          subtitle: w.raffles?.prize_title || w.raffles?.title || "Prémio incrível",
          gradient: "from-yellow-400 via-amber-500 to-orange-600",
          icon: Trophy,
          createdAt: new Date(w.created_at).getTime(),
        });
      });
    }

    // New raffles (last 24h)
    const { data: newRaffles } = await supabase
      .from("raffles")
      .select("id, title, slug, image_url, created_at")
      .eq("status", "active")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(3);

    if (newRaffles) {
      newRaffles.forEach((r) => {
        baseStories.push({
          id: `new-${r.id}`,
          type: "new",
          title: "✨ Novo",
          subtitle: r.title,
          image: r.image_url || undefined,
          gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
          icon: Star,
          link: `/raffle/${r.slug || r.id}`,
          createdAt: new Date(r.created_at).getTime(),
        });
      });
    }

    // User-published stories
    const { data: userStories } = await supabase
      .from("user_stories")
      .select("id, user_id, content, image_url, background, created_at, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(30);

    let profilesById: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userStories && userStories.length > 0) {
      const ids = Array.from(new Set(userStories.map((s) => s.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      (profs || []).forEach((p: any) => { profilesById[p.user_id] = p; });

      userStories.forEach((s: any) => {
        const prof = profilesById[s.user_id];
        baseStories.push({
          id: `user-${s.id}`,
          type: "user",
          title: prof?.display_name || "Utilizador",
          subtitle: s.content || "",
          image: s.image_url || prof?.avatar_url || undefined,
          gradient: s.background || "from-primary to-emerald-400",
          icon: UserIcon,
          createdAt: new Date(s.created_at).getTime(),
          authorId: s.user_id,
          authorName: prof?.display_name || "Utilizador",
          authorAvatar: prof?.avatar_url || undefined,
        });
      });
    }

    // Filter only stories younger than 24h, then sort: user stories first then by recency
    const fresh = baseStories
      .filter((s) => Date.now() - s.createdAt < STORY_TTL_MS)
      .sort((a, b) => {
        if (a.type === "user" && b.type !== "user") return -1;
        if (b.type === "user" && a.type !== "user") return 1;
        return b.createdAt - a.createdAt;
      });
    setStories(fresh);
  };

  const deleteStory = async (id: string) => {
    if (!confirm("Apagar este status?")) return;
    const realId = id.replace(/^user-/, "");
    const { error } = await supabase.from("user_stories").delete().eq("id", realId);
    if (error) { toast.error("Erro ao apagar"); return; }
    toast.success("Status removido");
    setActiveStory(null);
    loadStories();
  };

  const markViewed = (id: string) => {
    setViewedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        const raw = localStorage.getItem(VIEWED_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[id] = Date.now();
        localStorage.setItem(VIEWED_KEY, JSON.stringify(parsed));
      } catch {}
      return next;
    });
  };

  const openStory = (story: Story) => {
    setActiveStory(story);
    setProgress(0);
    markViewed(story.id);
  };

  useEffect(() => {
    if (!activeStory) return;
    const start = Date.now();
    const duration = 5000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct);
      if (pct < 1) {
        timerRef.current = setTimeout(tick, 30);
      } else {
        const idx = stories.findIndex((s) => s.id === activeStory.id);
        if (idx < stories.length - 1) {
          const next = stories[idx + 1];
          setActiveStory(next);
          markViewed(next.id);
          setProgress(0);
        } else {
          setActiveStory(null);
        }
      }
    };
    timerRef.current = setTimeout(tick, 30);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeStory?.id]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  if (stories.length === 0 && !user) return null;

  const typeRing: Record<string, string> = {
    hot: "from-orange-400 via-red-500 to-pink-500",
    winner: "from-yellow-400 via-amber-500 to-orange-500",
    announcement: "from-primary via-emerald-400 to-teal-400",
    new: "from-violet-500 via-purple-500 to-fuchsia-500",
    user: "from-sky-400 via-primary to-emerald-400",
  };

  const formatRemaining = (createdAt: number) => {
    const remaining = STORY_TTL_MS - (now - createdAt);
    if (remaining <= 0) return "expirado";
    const h = Math.floor(remaining / (60 * 60 * 1000));
    const m = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <>
      <section className="sticky top-14 lg:top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-0 px-4 py-2 sm:py-3">
        <div className="relative container mx-auto">
          <button onClick={() => scrollBy(-1)} className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-card/80 shadow-md text-foreground hover:bg-card">
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => user ? setCreateOpen(true) : navigate("/login")}
              className="flex flex-col items-center gap-1.5 shrink-0 snap-start group"
              aria-label="Publicar status"
            >
              <div className="relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full p-[3px] bg-gradient-to-tr from-primary to-accent">
                <div className="relative h-full w-full rounded-full bg-card ring-2 ring-background flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <span className="text-[10px] font-medium text-foreground max-w-[68px] truncate">
                Seu Status
              </span>
            </button>
            {stories.map((story, idx) => {
              const viewed = viewedIds.has(story.id);
              return (
                <motion.button
                  key={story.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => openStory(story)}
                  className="flex flex-col items-center gap-1.5 shrink-0 snap-start group"
                >
                  <div className="relative">
                    {/* Static gradient ring (no infinite rotation = stable on mobile) */}
                    {!viewed && (
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${typeRing[story.type]}`} />
                    )}
                    {viewed && (
                      <div className="absolute inset-0 rounded-full bg-muted-foreground/30" />
                    )}

                    <div className="relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full p-[3px]">
                      <div className={`relative h-full w-full rounded-full bg-gradient-to-br ${story.gradient} flex items-center justify-center overflow-hidden ring-2 ring-background`}>
                        {story.image ? (
                          <img src={story.image} alt="" className="h-full w-full object-cover rounded-full transition-transform duration-300 group-hover:scale-110" />
                        ) : (
                          <story.icon className="h-6 w-6 text-white drop-shadow" />
                        )}
                        {/* Shine sweep on hover */}
                        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                          <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        </div>
                      </div>
                    </div>

                    {/* Time-remaining mini badge */}
                    <div className="absolute -bottom-0.5 -right-0.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-background border border-border text-[8px] font-semibold text-muted-foreground shadow-sm">
                      <Clock className="h-2 w-2" />
                      {formatRemaining(story.createdAt)}
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium max-w-[68px] truncate ${viewed ? "text-muted-foreground/60" : "text-foreground"}`}>{story.title}</span>
                </motion.button>
              );
            })}
          </div>

          <button onClick={() => scrollBy(1)} className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-card/80 shadow-md text-foreground hover:bg-card">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Fullscreen Story Viewer */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={() => setActiveStory(null)}
          >
            {/* Progress bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
              {stories.map((s, i) => {
                const activeIdx = stories.findIndex((st) => st.id === activeStory.id);
                return (
                  <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{
                        width: i < activeIdx ? "100%" : i === activeIdx ? `${progress * 100}%` : "0%",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <button className="absolute top-10 right-4 z-10 text-white" onClick={() => setActiveStory(null)}>
              <X className="h-6 w-6" />
            </button>

            {activeStory.type === "user" && user && activeStory.authorId === user.id && (
              <button
                className="absolute top-10 right-14 z-10 text-white/80 hover:text-red-400 p-1"
                onClick={(e) => { e.stopPropagation(); deleteStory(activeStory.id); }}
                aria-label="Apagar status"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}

            <motion.div
              key={activeStory.id}
              initial={{ scale: 0.9, opacity: 0, rotateY: -15 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.9, opacity: 0, rotateY: 15 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className={`w-full max-w-sm mx-4 aspect-[9/16] rounded-3xl bg-gradient-to-br ${activeStory.gradient} flex flex-col items-center justify-center p-8 text-center relative overflow-hidden`}
              onClick={(e) => {
                e.stopPropagation();
                if (activeStory.link) navigate(activeStory.link);
              }}
            >
              {/* Background image for user stories with picture */}
              {activeStory.type === "user" && activeStory.image && (
                <img src={activeStory.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}

              {/* Static decorative blobs */}
              <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-black/30 blur-3xl pointer-events-none" />

              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

              <div className="relative z-10">
                {activeStory.type === "user" ? (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {activeStory.authorAvatar ? (
                        <img src={activeStory.authorAvatar} alt="" className="h-10 w-10 rounded-full ring-2 ring-white/50 object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <span className="text-white font-semibold drop-shadow">{activeStory.authorName}</span>
                    </div>
                    {activeStory.subtitle && (
                      <p className="text-2xl font-display font-bold text-white whitespace-pre-wrap drop-shadow leading-snug">
                        {activeStory.subtitle}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      <activeStory.icon className="h-16 w-16 text-white mx-auto mb-6 drop-shadow-lg" />
                    </motion.div>
                    <h2 className="text-3xl font-display font-bold text-white mb-3 drop-shadow">
                      {activeStory.title}
                    </h2>
                    <p className="text-lg text-white/95 leading-relaxed drop-shadow">
                      {activeStory.subtitle}
                    </p>
                    {activeStory.link && (
                      <div className="mt-8 inline-flex items-center gap-2 px-6 py-2.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium border border-white/30">
                        Toque para ver →
                      </div>
                    )}
                  </>
                )}
                <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur text-white/90 text-xs">
                  <Clock className="h-3 w-3" />
                  Expira em {formatRemaining(activeStory.createdAt)}
                </div>
              </div>
            </motion.div>

            {/* Navigate stories */}
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                const idx = stories.findIndex((s) => s.id === activeStory.id);
                if (idx > 0) { setActiveStory(stories[idx - 1]); setProgress(0); markViewed(stories[idx - 1].id); }
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                const idx = stories.findIndex((s) => s.id === activeStory.id);
                if (idx < stories.length - 1) { setActiveStory(stories[idx + 1]); setProgress(0); markViewed(stories[idx + 1].id); }
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StoriesCarousel;
