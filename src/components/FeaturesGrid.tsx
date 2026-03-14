import { motion } from "framer-motion";
import { Shield, Zap, Gift, Users, TrendingUp, Lock } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Transparência que se prova",
    desc: "Cada sorteio gera um registo público e imutável. Qualquer pessoa pode verificar que o resultado é justo — sem depender da nossa palavra.",
    span: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Participe em segundos",
    desc: "M-Pesa, e-Mola ou cartão. Sem burocracia, sem formulários longos.",
    span: "",
  },
  {
    icon: Gift,
    title: "Prémios que você escolhe",
    desc: "Ganhou? Escolha entre dezenas de prémios disponíveis no seu nível.",
    span: "",
  },
  {
    icon: Users,
    title: "Junte os amigos",
    desc: "Crie um grupo, dividam o custo dos bilhetes e multipliquem as chances juntos.",
    span: "",
  },
  {
    icon: TrendingUp,
    title: "Cada participação vale mais",
    desc: "Acumule pontos a cada bilhete. Troque por bilhetes grátis ou prémios exclusivos.",
    span: "",
  },
  {
    icon: Lock,
    title: "Nada a esconder",
    desc: "Sorteios transmitidos ao vivo, prova de entrega em vídeo e auditoria pública de cada resultado.",
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
          className="mb-4 text-center"
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">
            Construído para confiar
          </span>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            Tudo o que nos torna diferentes
          </h2>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          Não pedimos que acredite. Pedimos que verifique.
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
