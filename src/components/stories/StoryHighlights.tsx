// @ts-nocheck
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OptimizedImage from "@/components/OptimizedImage";
import StoryViewer, { type StoryAuthorGroup } from "@/components/stories/StoryViewer";
import { loadHighlights, type StoryHighlight, type UserStory } from "@/lib/stories";

interface Props {
  userId: string;
  /** Se true, mostra gestão (adicionar destaque a partir dos stories ativos) */
  isOwner?: boolean;
  /** Força recarregar os stories ativos */
  refreshKey?: number;
}

/**
 * Destaques de Stories — coleções permanentes no perfil
 * (estilo Instagram Highlights).
 */
const StoryHighlights = ({ userId, isOwner, refreshKey = 0 }: Props) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startIdx, setStartIdx] = useState(0);
  const [savingActive, setSavingActive] = useState(false);

  useEffect(() => {
    load();
  }, [userId, refreshKey]);

  const load = async () => {
    setLoading(true);
    const hl = await loadHighlights(userId);
    setHighlights(hl);
    setLoading(false);
  };

  const openHighlight = (idx: number) => {
    setStartIdx(idx);
    setViewerOpen(true);
  };

  // lista visível (só destaques com stories) — índices sempre coerentes
  const visibleHighlights = highlights.filter((h) => (h.stories || []).length > 0);

  const groupsFromHighlights = (): StoryAuthorGroup[] => {
    return visibleHighlights.map((h) => ({
      author: {
        id: h.id,
        name: h.title,
        avatar: h.cover_image || h.stories?.[0]?.image_url || undefined,
      },
      stories: (h.stories as UserStory[]) || [],
    }));
  };

  /** Adiciona os stories ativos (últimas 24h) a um destaque novo ou existente */
  const saveActiveToHighlight = async () => {
    if (!user) return;
    setSavingActive(true);
    try {
      const { data: actives } = await supabase
        .from("user_stories")
        .select("id")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .is("highlight_id", null);

      if (!actives || actives.length === 0) {
        toast.info("Não tem stories ativos para destacar. Publique um story primeiro!");
        return;
      }

      const title = prompt("Nome do destaque:", "Meus Momentos");
      if (!title) return;

      const { data: hl, error: hlErr } = await supabase
        .from("story_highlights")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (hlErr) throw hlErr;

      for (const s of actives) {
        await supabase
          .from("user_stories")
          .update({ highlight_id: hl.id })
          .eq("id", s.id);
      }

      toast.success(`"${title}" guardado nos destaques! ⭐`);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao guardar destaque";
      toast.error(msg);
    } finally {
      setSavingActive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-3 py-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-2 w-10 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (highlights.length === 0 && !isOwner) return null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto py-3 scrollbar-hide">
        {isOwner && (
          <button
            onClick={saveActiveToHighlight}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
              {savingActive ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">Novo destaque</span>
          </button>
        )}

        {visibleHighlights.map((h, idx) => {
          const cover = h.cover_image || h.stories?.[h.stories.length - 1]?.image_url;
          return (
            <motion.button
              key={h.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => openHighlight(idx)}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
            >
              <div className="h-16 w-16 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-orange-400 to-pink-400">
                <div className="h-full w-full rounded-full bg-background ring-2 ring-background overflow-hidden">
                  {cover ? (
                    <OptimizedImage
                      src={cover}
                      alt={h.title}
                      optimizeWidth={160}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${h.cover_gradient} flex items-center justify-center`}>
                      <Star className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-medium max-w-[68px] truncate">{h.title}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            groups={groupsFromHighlights()}
            startGroup={startIdx}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default StoryHighlights;
