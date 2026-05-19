import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle2, Play, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const securityBadges = [
  { icon: Lock, label: "SSL 256-bit", desc: "End-to-end encryption" },
  { icon: Shield, label: "Blockchain", desc: "On-chain verified draws" },
  { icon: CheckCircle2, label: "Certified RNG", desc: "Auditable randomness" },
];

const paymentLogos = [
  { name: "PayPal", color: "bg-[#003087]/10 text-[#003087]" },
  { name: "Visa", color: "bg-indigo-500/10 text-indigo-600" },
  { name: "Mastercard", color: "bg-orange-500/10 text-orange-600" },
  { name: "Amex", color: "bg-sky-500/10 text-sky-600" },
];

const testimonials = [
  {
    name: "Carlos M.",
    province: "Austin, TX",
    prize: "iPhone 15 Pro",
    quote: "I never thought I'd win! The whole process was 100% transparent.",
    videoPlaceholder: true,
  },
  {
    name: "Ana S.",
    province: "Toronto, ON",
    prize: "Bahamas trip for 2",
    quote: "Got the prize in under 48h. Incredible!",
    videoPlaceholder: true,
  },
  {
    name: "Pedro R.",
    province: "Miami, FL",
    prize: "MacBook Air",
    quote: "On-chain verification gives me real peace of mind.",
    videoPlaceholder: true,
  },
];

const TrustSignals = () => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {/* Security Badges */}
        <div className="text-center mb-8">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
            🛡️ Security &amp; Transparency
          </h2>
          <p className="text-sm text-muted-foreground">Your trust is our top priority</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg mx-auto">
          {securityBadges.map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border text-center"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <badge.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground">{badge.label}</span>
              <span className="text-[10px] text-muted-foreground">{badge.desc}</span>
            </motion.div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Secure checkout via PayPal:</span>
          {paymentLogos.map((p) => (
            <span key={p.name} className={`text-[10px] font-bold px-3 py-1 rounded-full ${p.color}`}>
              {p.name}
            </span>
          ))}
        </div>

        {/* Video Testimonials */}
        <div className="text-center mb-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-1">
            🎥 Real Winners
          </h3>
          <p className="text-xs text-muted-foreground">Real stories from our winners</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto mb-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-card border border-border overflow-hidden group"
            >
              {/* Video placeholder */}
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="h-5 w-5 text-primary ml-0.5" />
                </div>
                <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">
                  0:45
                </span>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.province}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic mb-1">"{t.quote}"</p>
                <span className="text-[10px] font-bold text-primary">🏆 {t.prize}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/transparencia"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Learn more about our transparency <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TrustSignals;
