import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Users, Clock, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import CountdownTimer from "./CountdownTimer";

interface FeaturedRaffle {
  id: string;
  title: string;
  prize_title: string;
  end_date: string | null;
}

const HeroSection = () => {
  const { t } = useTranslation();
  const [participantCount, setParticipantCount] = useState(0);
  const [featuredRaffle, setFeaturedRaffle] = useState<FeaturedRaffle | null>(null);
  const [countdownEnabled, setCountdownEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ count }, { data: settings }] = await Promise.all([
        supabase.from("participants").select("id", { count: "exact", head: true }),
        supabase.from("platform_settings").select("key, value").eq("key", "featured").maybeSingle(),
      ]);

      setParticipantCount(count || 0);

      if (settings?.value) {
        const featured = settings.value as any;
        const isEnabled = featured.countdownEnabled === true;
        setCountdownEnabled(isEnabled);

        if (isEnabled && featured.raffleId) {
          const { data: raffle } = await supabase
            .from("raffles")
            .select("id, title, prize_title, end_date")
            .eq("id", featured.raffleId)
            .eq("status", "active")
            .maybeSingle();

          if (raffle) setFeaturedRaffle(raffle);
        }
      }
    };
    load();
  }, []);

  return (
    <section className="relative overflow-hidden pt-20 pb-4 md:pt-24 md:pb-8">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute left-1/4 top-1/3 h-48 w-48 rounded-full bg-primary/8 blur-[100px]" />
      <div className="absolute right-1/4 top-1/4 h-36 w-36 rounded-full bg-accent/8 blur-[80px]" />

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="mb-3 font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {t("hero.title1")} <span className="text-gradient-primary">{t("hero.title2")}</span>
          </h1>

          <p className="mx-auto mb-5 max-w-xl text-xs md:text-base text-muted-foreground">
            {t("hero.subtitle")}
          </p>

          {/* Countdown — only when admin enables it */}
          <AnimatePresence>
            {countdownEnabled && featuredRaffle && featuredRaffle.end_date && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, height: 0 }}
                animate={{ opacity: 1, scale: 1, height: "auto" }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-5 md:mb-6"
              >
                <div className="inline-flex flex-col items-center gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3">
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                    <Trophy className="h-3.5 w-3.5" />
                    <span>{featuredRaffle.title}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-accent">{featuredRaffle.prize_title}</span>
                  </div>
                  <CountdownTimer targetDate={new Date(featuredRaffle.end_date)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
            <Link
              to="/marketplace"
              className="group flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 md:px-7 md:py-3 text-sm md:text-base font-semibold text-primary-foreground transition-all glow-primary hover:opacity-90"
            >
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 md:mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-5 text-[10px] md:text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1"><Shield className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> {t("hero.verified")}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> {participantCount > 0 ? t("hero.participantsMany", { count: participantCount.toLocaleString() }) : t("hero.communityActive")}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> {t("hero.newWeek")}</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
