import { motion } from "framer-motion";
import { Calendar, Car, Home, Smartphone, Sparkles, Building2, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";

const categories = [
  { icon: Car, label: "Viaturas", color: "from-primary/30 to-primary/5" },
  { icon: Home, label: "Imóveis", color: "from-accent/30 to-accent/5" },
  { icon: Smartphone, label: "Eletrónicos", color: "from-secondary/40 to-secondary/5" },
  { icon: Building2, label: "Equipamentos", color: "from-primary/30 to-accent/5" },
];

export default function Prestacoes() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-32 lg:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> EM BREVE
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold text-foreground md:text-6xl">
            Vendas a <span className="text-accent">Prestações</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Compre viaturas, imóveis e eletrónicos com pagamento facilitado em até 60 prestações,
            diretamente das melhores empresas de Moçambique.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${cat.color} p-6 text-center transition-all hover:scale-105 hover:border-primary/50`}
            >
              <cat.icon className="mx-auto h-10 w-10 text-foreground" />
              <p className="mt-3 font-semibold text-foreground">{cat.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 rounded-3xl border border-border bg-card p-8 md:p-12"
        >
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <Calendar className="h-12 w-12 text-primary" />
              <h2 className="mt-4 font-display text-2xl font-bold text-foreground md:text-3xl">
                Estamos a preparar algo especial
              </h2>
              <p className="mt-3 text-muted-foreground">
                Um sistema completo de vendas a prestações com simulador inteligente, candidatura
                online e acompanhamento em tempo real. Para empresas e clientes.
              </p>
              <a
                href="/empresas"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow-primary"
              >
                Conhecer Empresas Parceiras <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "Simulador de prestações interativo",
                "Candidatura 100% online",
                "Pagamentos via M-Pesa, e-Mola e Multicaixa",
                "Acompanhamento em painel pessoal",
                "Empresas verificadas e em conformidade",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </main>
      <Footer />
      <BottomTabBar />
    </div>
  );
}
