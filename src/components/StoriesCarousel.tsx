import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Trophy, Flame, Star, Megaphone, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Story {
  id: string;
  type: "hot" | "winner" | "announcement" | "new";
  title: string;
  subtitle: string;
  image?: string;
  gradient: string;
  icon: typeof Trophy;
  link?: string;
}

const StoriesCarousel = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStories();
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
      },
    ];

    // Fetch hot raffles
    const { data: hotRaffles } = await supabase
      .from("raffles")
      .select("id, title, image_url, slug, sold_tickets, total_tickets")
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
          gradient: "from-orange-500 to-red-500",
          icon: Flame,
          link: `/raffle/${r.slug || r.id}`,
        });
      });
    }

    // Fetch recent winners
    const { data: winners } = await supabase
      .from("participants")
      .select("id, ticket_number, raffles(title, prize_title)")
      .eq("status", "winner")
      .order("created_at", { ascending: false })
      .limit(2);

    if (winners) {
      winners.forEach((w: any) => {
        baseStories.push({
          id: `winner-${w.id}`,
          type: "winner",
          title: "🏆 Vencedor!",
          subtitle: w.raffles?.prize_title || w.raffles?.title || "Prémio incrível",
          gradient: "from-yellow-500 to-amber-600",
          icon: Trophy,
        });
      });
    }

    // New raffles
    const { data: newRaffles } = await supabase
      .from("raffles")
      .select("id, title, slug, image_url")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(2);

    if (newRaffles) {
      newRaffles.forEach((r) => {
        baseStories.push({
          id: `new-${r.id}`,
          type: "new",
          title: "✨ Novo",
          subtitle: r.title,
          image: r.image_url || undefined,
          gradient: "from-violet-500 to-purple-600",
          icon: Star,
          link: `/raffle/${r.slug || r.id}`,
        });
      });
    }

    setStories(baseStories);
  };

  const openStory = (story: Story) => {
    setActiveStory(story);
    setProgress(0);
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
        // Auto-advance
        const idx = stories.findIndex((s) => s.id === activeStory.id);
        if (idx < stories.length - 1) {
          setActiveStory(stories[idx + 1]);
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

  if (stories.length === 0) return null;

  const typeColor: Record<string, string> = {
    hot: "ring-orange-500",
    winner: "ring-yellow-500",
    announcement: "ring-primary",
    new: "ring-violet-500",
  };

  return (
    <>
      <section className="sticky top-14 lg:top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-0 px-4 py-2 sm:py-3">
        <div className="relative container mx-auto">
          <button onClick={() => scrollBy(-1)} className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-card/80 shadow-md text-foreground hover:bg-card">
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1" style={{ scrollbarWidth: "none" }}>
            {stories.map((story) => (
              <button
                key={story.id}
                onClick={() => openStory(story)}
                className="flex flex-col items-center gap-1.5 shrink-0 snap-start"
              >
                <div className={`h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full ring-[2.5px] ${typeColor[story.type]} p-[3px]`}>
                  <div className={`h-full w-full rounded-full bg-gradient-to-br ${story.gradient} flex items-center justify-center overflow-hidden`}>
                    {story.image ? (
                      <img src={story.image} alt="" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <story.icon className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground max-w-[68px] truncate">{story.title}</span>
              </button>
            ))}
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

            <motion.div
              key={activeStory.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm mx-4 aspect-[9/16] rounded-3xl bg-gradient-to-br ${activeStory.gradient} flex flex-col items-center justify-center p-8 text-center relative overflow-hidden`}
              onClick={(e) => {
                e.stopPropagation();
                if (activeStory.link) navigate(activeStory.link);
              }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10">
                <activeStory.icon className="h-16 w-16 text-white/90 mx-auto mb-6" />
                <h2 className="text-3xl font-display font-bold text-white mb-3">{activeStory.title}</h2>
                <p className="text-lg text-white/90 leading-relaxed">{activeStory.subtitle}</p>
                {activeStory.link && (
                  <div className="mt-8 px-6 py-2.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">
                    Toque para ver →
                  </div>
                )}
              </div>
            </motion.div>

            {/* Navigate stories */}
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                const idx = stories.findIndex((s) => s.id === activeStory.id);
                if (idx > 0) { setActiveStory(stories[idx - 1]); setProgress(0); }
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                const idx = stories.findIndex((s) => s.id === activeStory.id);
                if (idx < stories.length - 1) { setActiveStory(stories[idx + 1]); setProgress(0); }
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
