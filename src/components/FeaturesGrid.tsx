import { motion } from "framer-motion";
import { Shield, Zap, Gift, Users, TrendingUp, Lock, Gamepad2, Radio, Brain, Eye } from "lucide-react";

const SPRING_BOUNCE = { type: "spring" as const, stiffness: 300, damping: 20 };

const features = [
  {
    icon: Shield,
    title: "Transparência Comprovada",
    desc: "Cada sorteio gera um registo público e imutável. Qualquer pessoa pode verificar se o resultado é justo — não precisa acreditar na nossa palavra.",
    span: "md:col-span-2",
    color: "from-emerald-500 to-teal-500",
    glow: "group-hover:shadow-emerald-500/20",
  },
  {
    icon: Zap,
    title: "Entre em Segundos",
    desc: "M-Pesa, cartão ou métodos locais. Sem burocracia, sem formulários longos.",
    span: "",
    color: "from-amber-500 to-yellow-500",
    glow: "",
  },
  {
    icon: Gift,
    title: "Prémios à Sua Escolha",
    desc: "Ganhou? Escolha entre dezenas de prémios disponíveis no seu nível.",
    span: "",
    color: "from-violet-500 to-purple-500",
    glow: "",
  },
  {
    icon: Users,
    title: "Traga os Seus Amigos",
    desc: "Crie um grupo, divida custos de bilhetes e multipliquem as hipóteses juntos.",
    span: "",
    color: "from-blue-500 to-cyan-500",
    glow: "",
  },
  {
    icon: Gamepad2,
    title: "50+ Jogos ao Vivo",
    desc: "Galo, Ligar 4, Pong, Snake e muito mais — todos com IA integrada.",
    span: "",
    color: "from-red-500 to-orange-500",
    glow: "",
  },
  {
    icon: TrendingUp,
    title: "Cada Entrada Vale Mais",
    desc: "Ganhe pontos com cada bilhete. Troque por bilhetes grátis ou prémios exclusivos.",
    span: "",
    color: "from-pink-500 to-rose-500",
    glow: "",
  },
  {
    icon: Eye,
    title: "Nada a Esconder",
    desc: "Sorteios em directo com transmissão ao vivo, prova de entrega em vídeo e auditoria pública para cada resultado.",
    span: "md:col-span-2",
    color: "from-indigo-500 to-blue-500",
    glow: "",
  },
  {
    icon: Brain,
    title: "IA Inteligente",
    desc: "3 níveis de dificuldade que se adaptam ao seu estilo de jogo.",
    span: "",
    color: "from-cyan-500 to-teal-400",
    glow: "",
  },
];

const FeaturesGrid = () => {
  return (
    <section id="como-funciona" className="relative py-24 section-glow-divider energy-wave overflow-hidden">
      <div className="absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full blur-[120px]" style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 6%, transparent)" }} />
      <div className="absolute left-0 bottom-0 h-64 w-64 rounded-full blur-[100px]" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 4%, transparent)" }} />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 text-center"
        >
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-gradient-primary"
          >
            Construído para ser confiável
          </motion.span>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Tudo o que nos torna{" "}
            <span className="text-gradient-primary">diferentes</span>
          </h2>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mx-auto mb-14 max-w-xl text-center text-muted-foreground"
        >
          Não pedimos que acredite. Pedimos que verifique.
        </motion.p>

        <div className="grid gap-4 md:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
              className={"group glass rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 relative overflow-hidden " + f.span + " " + f.glow}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-500 rounded-2xl" />
              <div className="relative">
                <motion.div
                  className={"mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br " + f.color + " text-white shadow-lg transition-transform duration-300 group-hover:scale-110"}
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <f.icon className="h-6 w-6" />
                </motion.div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
