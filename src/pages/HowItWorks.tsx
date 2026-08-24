import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { UserPlus, Search, Ticket, Trophy, ShieldCheck, CreditCard, ArrowRight } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";

const steps = [
  { icon: UserPlus, title: "Cria a tua conta", desc: "Regista-te gratuitamente em menos de 1 minuto com o teu e-mail e n\u00famero de telefone." },
  { icon: Search, title: "Explora sorteios", desc: "Navega pelo marketplace e descobre sorteios de empresas verificadas com pr\u00e9mios incr\u00edveis." },
  { icon: Ticket, title: "Compra bilhetes", desc: "Escolhe o sorteio, seleciona os teus bilhetes e paga via M-Pesa ou e-Mola de forma segura." },
  { icon: CreditCard, title: "Confirma\u00e7\u00e3o de pagamento", desc: "Envia o comprovativo e aguarda a confirma\u00e7\u00e3o. O teu bilhete fica registado automaticamente." },
  { icon: Trophy, title: "Sorteio transparente", desc: "Quando todos os bilhetes forem vendidos, o sorteio \u00e9 realizado ao vivo com verifica\u00e7\u00e3o blockchain." },
  { icon: ShieldCheck, title: "Recebe o pr\u00e9mio", desc: "Se ganhares, a empresa entrega o pr\u00e9mio e tu confirmas a rece\u00e7\u00e3o na plataforma." },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HowItWorks() {
  useSEO({ title: 'Como Funciona', description: 'Descubra como funciona a plataforma Bateu: crie conta, carregue a carteira, participe em sorteios ao vivo, jogue jogos exclusivos e levante pr\u00e9mios reais.', canonicalPath: '/como-funciona' });

  return (
    <div className="min-h-screen bg-background bg-mesh-soft bg-noise relative overflow-hidden">
      {/* Gradient orbs background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,145,64,0.08) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)" }}
          animate={{ scale: [1.1, 0.9, 1.1], x: [0, -15, 0], y: [0, 20, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <Navbar />
      <main className="container mx-auto px-6 py-24 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <motion.span
            className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            Passo a Passo
          </motion.span>
          <motion.h1
            className="font-display text-4xl font-bold text-foreground md:text-5xl"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            Como Funciona o{' '}
            <span className="bg-gradient-to-r from-[#009140] via-[#FFD700] to-[#009140] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
              Bateu
            </span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Participar num sorteio \u00e9 simples, r\u00e1pido e totalmente transparente. Segue estes passos:
          </motion.p>
        </motion.div>

        {/* Steps with staggered entrance */}
        <motion.div
          className="mx-auto max-w-3xl space-y-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              variants={itemVariants}
              className="relative flex gap-6 pb-12 last:pb-0 group"
            >
              {/* Connecting line */}
              {i < steps.length - 1 && (
                <motion.div
                  className="absolute left-6 top-14 h-full w-px"
                  style={{ background: "linear-gradient(to bottom, rgba(0,145,64,0.4), rgba(255,215,0,0.2), transparent)", transformOrigin: "top" }}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 + 0.3, duration: 0.5 }}
                />
              )}

              {/* Icon box with glow */}
              <motion.div
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-4 ring-background z-10"
                whileHover={{
                  scale: 1.15,
                  boxShadow: "0 0 24px rgba(0,145,64,0.4), 0 0 48px rgba(0,145,64,0.15)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                {/* Glow ring on hover */}
                <motion.div
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#009140]/20 via-[#FFD700]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <step.icon className="h-5 w-5 relative z-10" />
              </motion.div>

              {/* Text content */}
              <div className="pt-1 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <motion.span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#009140] to-[#00b354] text-[11px] font-bold text-white shadow-[0_0_12px_rgba(0,145,64,0.4)]"
                    whileHover={{ scale: 1.2, boxShadow: "0 0 20px rgba(0,145,64,0.6)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    {i + 1}
                  </motion.span>
                  <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#009140] to-[#00b354] text-white font-semibold text-sm shadow-[0_0_24px_rgba(0,145,64,0.3)]"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 32px rgba(0,145,64,0.5), 0 0 64px rgba(0,145,64,0.2)",
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            Come\u00e7ar Agora
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight className="h-4 w-4" />
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}