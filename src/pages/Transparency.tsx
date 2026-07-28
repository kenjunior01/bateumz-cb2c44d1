import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, Link } from "react-router-dom";
import { Shield, Lock, Cpu, FileCheck, Users, Eye, ChevronRight, CheckCircle2, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import BlockchainVerification from "@/components/BlockchainVerification";
import { useLanguage } from "@/contexts/LanguageContext";
import { transparencyContent, resolveLegalLang } from "@/lib/legal-content";
import { supabase } from "@/integrations/supabase/client";

const SECTION_ICONS = [Cpu, Shield, Lock, FileCheck, Users, Eye];

const Transparency = () => {
  const { lang } = useLanguage();
  const content = transparencyContent[resolveLegalLang(lang)];
  const [searchParams] = useSearchParams();
  const raffleId = searchParams.get("raffle");
  const [raffleTitle, setRaffleTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!raffleId) {
      setRaffleTitle(null);
      return;
    }
    supabase
      .from("raffles")
      .select("title, prize_title")
      .eq("id", raffleId)
      .maybeSingle()
      .then(({ data }) => {
        setRaffleTitle(data?.title || data?.prize_title || raffleId);
      });
  }, [raffleId]);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0 bg-mesh-soft bg-noise">
      <Navbar />

      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              {content.badge}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {content.title}{" "}
              <span className="text-primary">{content.titleHighlight}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">{content.subtitle}</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 max-w-2xl mx-auto">
            {content.stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="p-4 rounded-2xl bg-card border border-border"
              >
                <p className="font-display text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How verification works — visual guide */}
      <section className="container mx-auto px-4 pb-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4 text-center">
            {content.howItWorksTitle}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {content.howItWorksSteps.map((step) => (
              <div key={step.step} className="flex gap-3 rounded-xl bg-background/60 border border-border p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {step.step}
                </span>
                <div>
                  <p className="font-semibold text-foreground text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Per-raffle verification from winner links */}
      {raffleId && (
        <section className="container mx-auto px-4 pb-8">
          <div className="max-w-3xl mx-auto rounded-2xl border-2 border-primary/30 bg-card p-6">
            <h2 className="font-display text-lg font-bold text-foreground mb-1">{content.verifyTitle}</h2>
            <p className="text-sm text-muted-foreground mb-4">{content.verifySubtitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <BlockchainVerification raffleId={raffleId} raffleTitle={raffleTitle || raffleId} />
              <Link to={`/raffle/${raffleId}`} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                {raffleTitle || raffleId} <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          {content.sections.map((section, i) => {
            const Icon = SECTION_ICONS[i] || Shield;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl bg-card border border-border p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground mb-2">{section.title}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                    <ul className="space-y-2">
                      {section.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-xl mx-auto text-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-8">
          <h3 className="font-display text-xl font-bold text-foreground mb-2">{content.ctaTitle}</h3>
          <p className="text-sm text-muted-foreground mb-4">{content.ctaSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/faq" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
              {content.ctaFaq} <ChevronRight className="h-4 w-4" />
            </Link>
            <Link to="/historico" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-card border border-border text-foreground text-sm font-medium hover:bg-secondary transition">
              {content.ctaHistory} <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <BottomTabBar />
    </div>
  );
};

export default Transparency;
