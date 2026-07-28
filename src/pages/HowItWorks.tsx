import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { UserPlus, Search, Ticket, Trophy, ShieldCheck, CreditCard } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Cria a tua conta", desc: "Regista-te gratuitamente em menos de 1 minuto com o teu e-mail e número de telefone." },
  { icon: Search, title: "Explora sorteios", desc: "Navega pelo marketplace e descobre sorteios de empresas verificadas com prémios incríveis." },
  { icon: Ticket, title: "Compra bilhetes", desc: "Escolhe o sorteio, seleciona os teus bilhetes e paga via M-Pesa ou e-Mola de forma segura." },
  { icon: CreditCard, title: "Confirmação de pagamento", desc: "Envia o comprovativo e aguarda a confirmação. O teu bilhete fica registado automaticamente." },
  { icon: Trophy, title: "Sorteio transparente", desc: "Quando todos os bilhetes forem vendidos, o sorteio é realizado ao vivo com verificação blockchain." },
  { icon: ShieldCheck, title: "Recebe o prémio", desc: "Se ganhares, a empresa entrega o prémio e tu confirmas a receção na plataforma." },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background bg-mesh-soft bg-noise">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">Passo a Passo</span>
          <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">Como Funciona o Bateu</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Participar num sorteio é simples, rápido e totalmente transparente. Segue estes passos:
          </p>
        </motion.div>

        <div className="mx-auto max-w-3xl space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative flex gap-6 pb-12 last:pb-0"
            >
              {/* Timeline line */}
              {i < steps.length - 1 && (
                <div className="absolute left-6 top-14 h-full w-px bg-gradient-to-b from-primary/40 to-transparent" />
              )}
              
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-4 ring-background">
                <step.icon className="h-5 w-5" />
              </div>
              <div className="pt-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                  <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
