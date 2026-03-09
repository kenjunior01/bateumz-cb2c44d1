import { motion } from "framer-motion";
import { Shield, Zap, Gift, Users, TrendingUp, Lock } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Blockchain Verificável",
    desc: "Cada sorteio gera um hash público. Verifique matematicamente que ninguém manipulou o resultado.",
    span: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Checkout em 2 Segundos",
    desc: "Pix, Apple Pay e Google Pay. Compre sem criar conta.",
    span: "",
  },
  {
    icon: Gift,
    title: "Escolha o Prémio",
    desc: "Ganhou? Escolha entre centenas de prémios do seu nível.",
    span: "",
  },
  {
    icon: Users,
    title: "Bolões com Amigos",
    desc: "Crie grupos e dividam o custo dos bilhetes automaticamente.",
    span: "",
  },
  {
    icon: TrendingUp,
    title: "Luck Points",
    desc: "Cada compra gera pontos. Troque por bilhetes grátis ou prémios instantâneos.",
    span: "",
  },
  {
    icon: Lock,
    title: "Transparência Total",
    desc: "Prova de entrega em vídeo, sorteios ao vivo e auditoria pública.",
    span: "md:col-span-2",
  },
];

const FeaturesGrid = () => {
  return (
    <section id="como-funciona" className="relative py-24">
      <div className="absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]" />
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">
            Por que somos diferentes
          </span>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Inovação em cada detalhe
          </h2>
        </motion.div>

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
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
