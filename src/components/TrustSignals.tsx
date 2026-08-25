import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle2, ExternalLink, Ticket, CreditCard, Hash, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const securityBadges = [
  { icon: Lock, labelKey: "footer.ssl", descKey: "trust.subtitle" },
  { icon: Shield, labelKey: "footer.blockchain", descKey: "menu.transparency" },
  { icon: CheckCircle2, labelKey: "footer.rng", descKey: "hero.badge.verification" },
];

const paymentLogos = [
  { name: "PayPal", color: "bg-[#003087]/10 text-[#003087]" },
  { name: "Visa", color: "bg-indigo-500/10 text-indigo-600" },
  { name: "Mastercard", color: "bg-orange-500/10 text-orange-600" },
  { name: "Amex", color: "bg-sky-500/10 text-sky-600" },
];

const HOW_STEPS = [
  { icon: Ticket, titleKey: "trust.step1.title", descKey: "trust.step1.desc" },
  { icon: CreditCard, titleKey: "trust.step2.title", descKey: "trust.step2.desc" },
  { icon: Hash, titleKey: "trust.step3.title", descKey: "trust.step3.desc" },
  { icon: Trophy, titleKey: "trust.step4.title", descKey: "trust.step4.desc" },
];

const SPRING = { type: "spring" as const, stiffness: 300, damping: 20 };

const TrustSignals = () => {
  const { t } = useLanguage();

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Subtle gradient background accents */}
      <div className="absolute top-0 left-1/4 h-40 w-40 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-accent/5 blur-[80px] pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
        >
          <h2 className="font-display text-xl sm:text-2xl font-bold mb-2">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              {t("trust.title")}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">{t("trust.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg mx-auto">
          {securityBadges.map((badge, i) => (
            <motion.div
              key={badge.labelKey}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
              whileHover={{ y: -4, scale: 1.04, borderColor: "hsl(var(--primary) / 0.3)" }}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border text-center cursor-default shadow-[0_0_15px_hsl(var(--primary)/0.1)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.2)] transition-shadow duration-300"
            >
              <motion.div
                className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center"
                whileHover={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.4 }}
              >
                <badge.icon className="h-5 w-5 text-primary" />
              </motion.div>
              <span className="text-xs font-bold text-foreground">{t(badge.labelKey)}</span>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">{t("footer.checkout")}</span>
          {paymentLogos.map((p) => (
            <motion.span
              key={p.name}
              whileHover={{ scale: 1.1, y: -1 }}
              transition={SPRING}
              className={`text-[10px] font-bold px-3 py-1 rounded-full ${p.color} cursor-default`}
            >
              {p.name}
            </motion.span>
          ))}
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h3 className="font-display text-lg font-bold text-foreground mb-1">
            {t("trust.howTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("trust.howSubtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-6">
          {HOW_STEPS.map((step, i) => (
            <motion.div
              key={step.titleKey}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
              whileHover={{ y: -4, scale: 1.03, borderColor: "hsl(var(--primary) / 0.3)" }}
              className="group rounded-2xl bg-card border border-border p-4 text-center relative overflow-hidden shadow-[0_0_12px_hsl(var(--primary)/0.08)] hover:shadow-[0_0_22px_hsl(var(--primary)/0.18)] transition-shadow duration-300"
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
              <motion.div
                className="relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10"
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
              >
                <step.icon className="h-5 w-5 text-primary" />
              </motion.div>
              <p className="relative text-xs font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">{i + 1}</p>
              <p className="relative text-sm font-bold text-foreground mb-1">{t(step.titleKey)}</p>
              <p className="relative text-[11px] text-muted-foreground leading-snug">{t(step.descKey)}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Link
            to="/transparencia"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t("trust.learnMore")} <motion.span
              className="inline-block"
              whileHover={{ x: 3 }}
              transition={SPRING}
            ><ExternalLink className="h-3.5 w-3.5" /></motion.span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSignals;
