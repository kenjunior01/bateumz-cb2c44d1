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

const TrustSignals = () => {
  const { t } = useLanguage();

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
            🛡️ {t("trust.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("trust.subtitle")}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg mx-auto">
          {securityBadges.map((badge, i) => (
            <motion.div
              key={badge.labelKey}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <badge.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground">{t(badge.labelKey)}</span>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">{t("footer.checkout")}</span>
          {paymentLogos.map((p) => (
            <span key={p.name} className={`text-[10px] font-bold px-3 py-1 rounded-full ${p.color}`}>
              {p.name}
            </span>
          ))}
        </div>

        {/* How it works — replaces placeholder testimonials */}
        <div className="text-center mb-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-1">
            {t("trust.howTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("trust.howSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-6">
          {HOW_STEPS.map((step, i) => (
            <motion.div
              key={step.titleKey}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-card border border-border p-4 text-center"
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-bold text-primary mb-1">{i + 1}</p>
              <p className="text-sm font-bold text-foreground mb-1">{t(step.titleKey)}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{t(step.descKey)}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/transparencia"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t("trust.learnMore")} <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TrustSignals;
