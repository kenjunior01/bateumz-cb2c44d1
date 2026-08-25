import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatMZN } from "@/lib/currency";

interface Raffle {
  id: string;
  title: string;
  slug: string | null;
  image_url: string | null;
  ticket_price: number;
  category: string | null;
  sold_tickets: number;
  total_tickets: number;
}

const AIRecommendations = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Raffle[]>([]);

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    // Get user's interests and past categories
    let preferredCategories: string[] = [];

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("interests")
        .eq("user_id", user.id)
        .single();

      const { data: pastTickets } = await supabase
        .from("participants")
        .select("raffles(category)")
        .eq("user_id", user.id)
        .limit(20);

      if (profile?.interests) {
        preferredCategories.push(...profile.interests);
      }
      if (pastTickets) {
        pastTickets.forEach((t: any) => {
          if (t.raffles?.category) preferredCategories.push(t.raffles.category);
        });
      }
    }

    // Fetch active raffles
    const { data: raffles, error: rafflesError } = await supabase
      .from("raffles")
      .select("id, title, slug, image_url, ticket_price, category, sold_tickets, total_tickets")
      .eq("status", "active")
      .order("sold_tickets", { ascending: false })
      .limit(20);

    if (rafflesError) {
      console.warn("Raffles fetch skipped:", rafflesError.message);
      return;
    }
    if (!raffles) return;

    // Score & sort by relevance
    const scored = raffles.map((r) => {
      let score = 0;
      if (preferredCategories.includes(r.category || "")) score += 10;
      score += (r.sold_tickets / Math.max(r.total_tickets, 1)) * 5; // popularity
      if (r.image_url) score += 2;
      return { ...r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    setRecommendations(scored.slice(0, 4));
  };

  if (recommendations.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shadow-[0_0_10px_hsl(var(--primary)/0.15)]">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-display text-sm font-bold text-foreground">
          {user ? t("ai.recommended") : t("ai.featured")}
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium ml-1">{t("ai.badge")}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {recommendations.map((r, i) => (
          <motion.button
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/raffle/${r.slug || r.id}`)}
            className="rounded-2xl bg-card border border-border overflow-hidden text-left group hover:border-primary/30 transition-all shadow-[0_0_10px_hsl(var(--primary)/0.08)] hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
          >
            <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
              {r.image_url ? (
                <img src={r.image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  <Gift className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
                {Math.round((r.sold_tickets / Math.max(r.total_tickets, 1)) * 100)}%
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-bold text-foreground line-clamp-1">{r.title}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] font-bold text-primary">{formatMZN(r.ticket_price)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default AIRecommendations;
