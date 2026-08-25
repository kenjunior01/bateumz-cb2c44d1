import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap, Trophy, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSEO } from "@/hooks/useSEO";

type GameCard = {
  id: string;
  type: "spin" | "millionaire";
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_active: boolean;
};

export default function InstantWin() {
  useSEO({ title: 'Jogos Instantâneos', description: 'Jogue jogos instantâneos na Bateu. Resultados imediatos, prémios a verificar e diversão sem espera. Disponível em vários formatos.', canonicalPath: '/instant-win' });
  const { t } = useLanguage();
  const [games, setGames] = useState<GameCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: spins }, { data: millionaires }] = await Promise.all([
        supabase
          .from("spin_wheel_games")
          .select("id, title, description, cover_image_url, is_active")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("millionaire_games")
          .select("id, title, description, cover_image_url, is_active")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      const merged: GameCard[] = [
        ...(spins ?? []).map((g: any) => ({ ...g, type: "spin" as const })),
        ...(millionaires ?? []).map((g: any) => ({ ...g, type: "millionaire" as const })),
      ];
      setGames(merged);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background bg-cosmic bg-noise">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border/40">
        <div className="game-particle game-particle-1" style={{ top: "20%", left: "8%" }} />
        <div className="game-particle game-particle-2" style={{ top: "40%", right: "12%" }} />
        <div className="game-particle game-particle-5" style={{ bottom: "15%", left: "25%" }} />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, hsl(var(--region-primary,var(--primary))/0.25) 0%, transparent 70%)",
          }}
        />
        <div className="container relative mx-auto px-4 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium backdrop-blur">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {t("instantWin.badge")}
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("instantWin.title")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("instantWin.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <Card className="p-10 text-center game-shimmer">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            </motion.div>
            <h3 className="mb-2 text-xl font-semibold">{t("instantWin.noGames")}</h3>
            <p className="mb-6 text-muted-foreground">
              {t("instantWin.noGamesDesc")}
            </p>
            <Button asChild className="shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)]">
              <Link to="/">{t("common.back")}</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g, i) => (
              <Link
                key={`${g.type}-${g.id}`}
                to={g.type === "spin" ? `/games/spin-wheel/${g.id}` : `/games/millionaire/${g.id}`}
                className="group"
              >
                <Card className="h-full overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.1),0_0_15px_hsl(var(--primary)/0.25)] hover:-translate-y-1 game-card-3d game-shimmer">
                  <div
                    className="relative flex h-40 items-center justify-center bg-muted"
                    style={
                      g.cover_image_url
                        ? { backgroundImage: `url(${g.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : undefined
                    }
                  >
                    {!g.cover_image_url && (
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="relative"
                      >
                        <Sparkles className="h-10 w-10 text-primary/60" />
                        <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
                      </motion.div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur">
                      {g.type === "spin" ? t("menu.spinWheel") : t("menu.millionaire")}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 line-clamp-1 font-semibold group-hover:text-primary transition-colors">{g.title}</h3>
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {g.description || t("instantWin.subtitle")}
                    </p>
                    <div className="flex items-center text-sm font-medium text-primary">
                      {t("instantWin.play")}
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-2" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
