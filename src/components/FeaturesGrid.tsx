import { motion } from "framer-motion";
import { Shield, Zap, Gift, Users, TrendingUp, Lock } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Transparency you can prove",
    desc: "Every raffle generates a public, immutable record. Anyone can verify the result is fair — no need to take our word for it.",
    span: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Join in seconds",
    desc: "PayPal, card or local methods. No paperwork, no long forms.",
    span: "",
  },
  {
    icon: Gift,
    title: "Prizes you choose",
    desc: "Won? Pick from dozens of prizes available at your level.",
    span: "",
  },
  {
    icon: Users,
    title: "Bring your friends",
    desc: "Create a group, split ticket costs and multiply your chances together.",
    span: "",
  },
  {
    icon: TrendingUp,
    title: "Every entry is worth more",
    desc: "Earn points with every ticket. Trade them for free tickets or exclusive prizes.",
    span: "",
  },
  {
    icon: Lock,
    title: "Nothing to hide",
    desc: "Live-streamed draws, video proof of delivery and public audit for every result.",
    span: "md:col-span-2",
  },
];

const FeaturesGrid = () => {
  return (
    <section id="how-it-works" className="relative py-24 section-glow-divider energy-wave">
      <div className="absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full blur-[120px]" style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 6%, transparent)" }} />
      <div className="absolute left-0 bottom-0 h-64 w-64 rounded-full blur-[100px]" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 4%, transparent)" }} />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-center"
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--region-primary, hsl(var(--primary)))" }}>
            Built to be trusted
          </span>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Everything that makes us different
          </h2>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          We don't ask you to believe. We ask you to verify.
        </motion.p>

        <div className="grid gap-4 md:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`group glass rounded-2xl p-6 transition-all hover:border-primary/30 ${f.span}`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground" style={{ color: "var(--region-primary, hsl(var(--primary)))" }}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
