import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => (
  <section className="relative py-24 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
    <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[150px]" />

    <div className="container relative z-10 mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-2xl"
      >
        <Sparkles className="mx-auto mb-6 h-10 w-10 text-accent" />
        <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
          Your next big win is one PayPal tap away
        </h2>
        <p className="mb-6 text-lg text-muted-foreground">
          Real prizes shipped across the US &amp; Canada. Secure PayPal-only checkout — pay with PayPal balance, card, or bank in seconds.
        </p>

        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
          <ShieldCheck className="h-4 w-4" />
          100% PayPal Buyer Protection · No card details stored
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/marketplace"
            className="region-cta group inline-flex items-center gap-2 rounded-xl px-10 py-4 text-lg font-semibold transition-all glow-primary hover:opacity-90"
          >
            See open raffles
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/referral"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/40 px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
          >
            Refer a friend, earn Luck Points
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
