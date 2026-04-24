import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle2, Play, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const securityBadges = [
  { icon: Lock, label: "SSL 256-bit", desc: "Encriptação total" },
  { icon: Shield, label: "Blockchain", desc: "Sorteios verificados" },
  { icon: CheckCircle2, label: "RNG Certificado", desc: "Aleatoriedade auditável" },
];

const paymentLogos = [
  { name: "M-Pesa", color: "bg-red-500/10 text-red-600" },
  { name: "e-Mola", color: "bg-blue-500/10 text-blue-600" },
  { name: "Visa", color: "bg-indigo-500/10 text-indigo-600" },
  { name: "Mastercard", color: "bg-orange-500/10 text-orange-600" },
];

const testimonials = [
  {
    name: "Carlos M.",
    province: "Maputo",
    prize: "iPhone 15 Pro",
    quote: "Nunca pensei ganhar! O processo foi 100% transparente.",
    videoPlaceholder: true,
  },
  {
    name: "Ana S.",
    province: "Sofala",
    prize: "Viagem a Bazaruto",
    quote: "Recebi o prémio em menos de 48h. Incrível!",
    videoPlaceholder: true,
  },
  {
    name: "Pedro R.",
    province: "Nampula",
    prize: "MacBook Air",
    quote: "A verificação blockchain dá muita confiança.",
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
            🛡️ Segurança & Transparência
          </h2>
          <p className="text-sm text-muted-foreground">A sua confiança é a nossa prioridade</p>
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
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="text-xs text-muted-foreground font-medium">Pagamentos seguros:</span>
          {paymentLogos.map((p) => (
            <span key={p.name} className={`text-[10px] font-bold px-3 py-1 rounded-full ${p.color}`}>
              {p.name}
            </span>
          ))}
        </div>

        {/* Video Testimonials */}
        <div className="text-center mb-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-1">
            🎥 Vencedores Reais
          </h3>
          <p className="text-xs text-muted-foreground">Histórias reais dos nossos ganhadores</p>
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
            Saiba mais sobre a nossa transparência <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TrustSignals;
