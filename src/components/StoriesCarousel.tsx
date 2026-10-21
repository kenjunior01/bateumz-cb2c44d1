import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StoryStudio from "@/components/stories/StoryStudio";
import StoryViewer, { type StoryAuthorGroup } from "@/components/stories/StoryViewer";
import OptimizedImage from "@/components/OptimizedImage";
import { loadActiveStories, type UserStory } from "@/lib/stories";
import bateuLogo from "@/assets/bateu-logo.png";

const VIEWED_KEY = "bateu_stories_viewed_v2";

interface Props {
  /** Embebido no home mobile: sem sticky, sem fundo sólido */
  embedded?: boolean;
}

const StoriesCarousel = ({ embedded = false }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<StoryAuthorGroup[]>([]);
  const [platformStories, setPlatformStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startGroup, setStartGroup] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIEWED_KEY);
      if (raw) setViewedIds(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
    reload();
  }, []);

  const reload = async () => {
    setLoading(true);
    // Stories dos utilizadores (agrupados)
    const g = await loadActiveStories();
    setGroups(Array.from(g.values()));

    // Stories da plataforma (anúncios, hot, vencedores, novos)
    const platform: UserStory[] = [];
    const cutoff = new Date(Date.now() - 24 * 3600e3).toISOString();

    const { data: hotRaffles } = await supabase
      .from("raffles")
      .select("id, title, image_url, slug, sold_tickets, created_at, updated_at")
      .eq("status", "active")
      .order("sold_tickets", { ascending: false })
      .limit(2);
    (hotRaffles || []).forEach((r) => {
      platform.push({
        id: `hot-${r.id}`,
        user_id: "platform",
        content: `🔥 EM ALTA\n${r.title}`,
        image_url: r.image_url || null,
        media_type: r.image_url ? "image" : "text",
        background: "from-orange-500 via-red-500 to-pink-600",
        link_url: `/raffle/${r.slug || r.id}`,
        link_label: "Participar agora",
        created_at: r.updated_at || r.created_at,
        expires_at: new Date(Date.now() + 864e5).toISOString(),
        duration_seconds: 6,
      });
    });

    const { data: newRaffles } = await supabase
      .from("raffles")
      .select("id, title, image_url, slug, created_at")
      .eq("status", "active")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(2);
    (newRaffles || []).forEach((r) => {
      platform.push({
        id: `new-${r.id}`,
        user_id: "platform",
        content: `✨ NOVO SORTEIO\n${r.title}`,
        image_url: r.image_url || null,
        media_type: r.image_url ? "image" : "text",
        background: "from-violet-500 via-purple-600 to-fuchsia-600",
        link_url: `/raffle/${r.slug || r.id}`,
        link_label: "Ver sorteio",
        created_at: r.created_at,
        expires_at: new Date(Date.now() + 864e5).toISOString(),
        duration_seconds: 6,
      });
    });

    const { data: winners } = await supabase.rpc("get_public_winners" as any, { p_limit: 1 } as any);
    ((winners as unknown as { id: string; display_name: string; prize_title: string; won_at: string }[]) || []).forEach((w) => {
      platform.push({
        id: `winner-${w.id}`,
        user_id: "platform",
        content: `🏆 VENCEDOR!\n${w.display_name} ganhou ${w.prize_title}`,
        media_type: "text",
        background: "from-yellow-400 via-amber-500 to-orange-600",
        link_url: "/historico",
        link_label: "Ver vencedores",
        created_at: String(w.won_at),
        expires_at: new Date(Date.now() + 864e5).toISOString(),
        duration_seconds: 6,
      });
    });

    platform.push({
      id: "announcement-alienacao",
      user_id: "platform",
      content: "📢 NOVIDADE\nAlienação de Bens chegou! Leasing, leilões e rent-to-own.",
      media_type: "text",
      background: "from-teal-400 to-cyan-600",
      link_url: "/alienacao",
      link_label: "Descobrir alienação",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 864e5).toISOString(),
      duration_seconds: 6,
    });

    setPlatformStories(platform);
    setLoading(false);
  };

  const markViewed = (id: string) => {
    setViewedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(VIEWED_KEY, JSON.stringify([...next].slice(-500)));
      } catch { /* ignore */ }
      return next;
    });
  };

  // Grupos finais: plataforma primeiro + utilizadores
  const allGroups: StoryAuthorGroup[] = useMemo(() => {
    const list: StoryAuthorGroup[] = [];
    if (platformStories.length > 0) {
      list.push({ author: { id: "platform", name: "Bateu Oficial", avatar: bateuLogo }, stories: platformStories });
    }
    return [...list, ...groups];
  }, [platformStories, groups]);

  const hasOwnStory = user && groups.some((g) => g.author.id === user.id);
  const ownUnseen = user && groups
    .find((g) => g.author.id === user.id)
    ?.stories.some((s) => !viewedIds.has(s.id));

  const openGroup = (idx: number) => {
    setStartGroup(idx);
    setViewerOpen(true);
    const group = allGroups[idx];
    group?.stories.forEach((s) => markViewed(s.id));
  };

  const openOwn = () => {
    if (!user) return navigate("/login");
    if (hasOwnStory) {
      const idx = allGroups.findIndex((g) => g.author.id === user.id);
      if (idx >= 0) return openGroup(idx);
    }
    setCreateOpen(true);
  };

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  // Sempre visível: anónimos veem o atalho "O teu story" (→ /login),
  // autenticados veem tudo. Maximiza a descoberta dos stories.
  return (
    <>
      <section
        className={
          embedded
            ? "px-4 py-2"
            : "sticky top-14 lg:top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 lg:static lg:bg-transparent lg:backdrop-blur-none lg:border-0 px-4 py-2 sm:py-3"
        }
        data-testid={embedded ? "mh-stories" : "stories-carousel"}
      >
        <div className="relative container mx-auto">
          <button onClick={() => scrollBy(-1)} className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-card/80 shadow-md text-foreground hover:bg-card" aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1" style={{ scrollbarWidth: "none" }}>
            {/* Seu status */}
            <button onClick={openOwn} className="flex flex-col items-center gap-1.5 shrink-0 snap-start group" aria-label="Seu status">
              <div className="relative">
                {hasOwnStory ? (
                  <>
                    <div className={`absolute inset-0 rounded-full ${ownUnseen ? "bg-gradient-to-tr from-primary to-accent" : "bg-muted-foreground/30"}`} />
                    <div className="relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full p-[3px]">
                      <div className="h-full w-full rounded-full bg-card ring-2 ring-background overflow-hidden">
                        {groups.find((g) => g.author.id === user?.id)?.stories[0]?.image_url ? (
                          <OptimizedImage
                            src={groups.find((g) => g.author.id === user?.id)!.stories[0].image_url!}
                            alt=""
                            optimizeWidth={160}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center">
                            <Plus className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCreateOpen(true); }}
                      className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background shadow-md"
                      aria-label="Adicionar story"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                  </>
                ) : (
                  <div className="relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full p-[3px] bg-gradient-to-tr from-primary to-accent">
                    <div className="relative h-full w-full rounded-full bg-card ring-2 ring-background flex items-center justify-center">
                      <Plus className="h-6 w-6 text-primary" strokeWidth={2.5} />
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-foreground max-w-[68px] truncate">Seu Status</span>
            </button>

            {/* Grupos de autores — ⭐ REA Instagram: skeleton enquanto carrega (sem "salto") */}
            {loading && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`sk-${i}`} className="flex flex-col items-center gap-1.5 shrink-0" data-testid={i === 0 ? "stories-skeleton" : undefined}>
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-muted-foreground/15 animate-pulse" />
                      <div className="relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full p-[3px]">
                        <div className="h-full w-full rounded-full bg-muted/70 animate-pulse" />
                      </div>
                    </div>
                    <div className="h-2.5 w-14 rounded-full bg-muted/60 animate-pulse" />
                  </div>
                ))}
              </>
            )}
            {!loading && allGroups.map((g, idx) => {
              const firstUnviewed = g.stories.find((s) => !viewedIds.has(s.id));
              const allViewed = !firstUnviewed;
              const isPlatform = g.author.id === "platform";
              const latest = g.stories[g.stories.length - 1];
              return (
                <motion.button
                  key={g.author.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                  onClick={() => openGroup(idx)}
                  className="flex flex-col items-center gap-1.5 shrink-0 snap-start group"
                >
                  <div className="relative">
                    <div className={`absolute inset-0 rounded-full ${allViewed ? "bg-muted-foreground/25" : "bg-gradient-to-tr from-orange-400 via-primary to-emerald-400"}`} />
                    <div className="relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full p-[3px]">
                      <div className="relative h-full w-full rounded-full bg-background ring-2 ring-background overflow-hidden">
                        {g.author.avatar ? (
                          <OptimizedImage
                            src={g.author.avatar}
                            alt={g.author.name}
                            optimizeWidth={160}
                            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-110 ${allViewed ? "opacity-60" : ""}`}
                          />
                        ) : latest?.image_url ? (
                          <OptimizedImage
                            src={latest.image_url}
                            alt=""
                            optimizeWidth={160}
                            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-110 ${allViewed ? "opacity-60" : ""}`}
                          />
                        ) : (
                          <div className={`h-full w-full bg-gradient-to-br ${latest?.background || "from-primary to-emerald-400"} flex items-center justify-center`}>
                            {isPlatform ? <Megaphone className="h-5 w-5 text-white" /> : <span className="text-white font-bold text-lg">{g.author.name.charAt(0)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    {g.stories.length > 1 && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border-2 border-background">
                        {g.stories.length}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium max-w-[68px] truncate ${allViewed ? "text-muted-foreground/60" : "text-foreground"}`}>
                    {g.author.name}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <button onClick={() => scrollBy(1)} className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-card/80 shadow-md text-foreground hover:bg-card" aria-label="Seguinte">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            groups={allGroups}
            startGroup={startGroup}
            onClose={() => { setViewerOpen(false); reload(); }}
            onDeleted={reload}
          />
        )}
      </AnimatePresence>

      <StoryStudio open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />
    </>
  );
};

export default StoriesCarousel;
