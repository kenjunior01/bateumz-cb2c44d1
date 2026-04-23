import { motion } from "framer-motion";
import { Shield, Lock, Cpu, FileCheck, Users, Eye, ChevronRight, CheckCircle2, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";

const sections = [
  {
    icon: Cpu,
    title: "Gerador de Números Aleatórios (RNG)",
    description: "Utilizamos um sistema de geração de números aleatórios criptograficamente seguro, baseado em múltiplas fontes de entropia. Cada sorteio gera uma seed única que é registada na blockchain antes do resultado ser revelado.",
    details: [
      "Algoritmo CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)",
      "Seed composta por timestamp + hash do bloco + dados do servidor",
      "Impossível prever ou manipular o resultado",
    ],
  },
  {
    icon: Shield,
    title: "Verificação Blockchain",
    description: "Todos os sorteios são registados na blockchain Polygon, garantindo imutabilidade e rastreabilidade. Qualquer pessoa pode verificar de forma independente que os resultados não foram adulterados.",
    details: [
      "Registo na rede Polygon (Proof-of-Stake)",
      "Hash da transação público e verificável",
      "Dados da seed publicados antes do sorteio",
    ],
  },
  {
    icon: Lock,
    title: "Segurança de Dados",
    description: "A sua informação pessoal e financeira está protegida com encriptação de grau bancário. Cumprimos as melhores práticas internacionais de segurança.",
    details: [
      "Encriptação SSL/TLS 256-bit em todas as comunicações",
      "Dados sensíveis encriptados em repouso (AES-256)",
      "Autenticação de dois fatores disponível",
      "Conformidade com RGPD e leis de proteção de dados",
    ],
  },
  {
    icon: FileCheck,
    title: "Auditoria e Conformidade",
    description: "Mantemos registos detalhados de todas as operações da plataforma. O nosso sistema de auditoria garante total rastreabilidade de ações administrativas.",
    details: [
      "Logs de auditoria imutáveis para todas as ações críticas",
      "Revisão periódica de segurança",
      "Processo de aprovação multi-etapa para sorteios empresariais",
    ],
  },
  {
    icon: Users,
    title: "Proteção do Participante",
    description: "Implementamos medidas rigorosas para proteger os participantes contra fraude e garantir uma experiência justa para todos.",
    details: [
      "Verificação de identidade para empresas organizadoras",
      "Limites de bilhetes por utilizador para prevenir monopolização",
      "Sistema de denúncias e resolução de disputas",
      "Política de reembolso transparente",
    ],
  },
  {
    icon: Eye,
    title: "Transparência Total",
    description: "Acreditamos que a transparência é a base da confiança. Todos os nossos processos são abertos e verificáveis.",
    details: [
      "Resultados de sorteios publicados em tempo real",
      "Estatísticas da plataforma acessíveis publicamente",
      "Feed de atividade ao vivo com transações reais",
      "Histórico completo de vencedores acessível a todos",
    ],
  },
];

const stats = [
  { value: "100%", label: "Sorteios na blockchain" },
  { value: "256-bit", label: "Encriptação SSL" },
  { value: "24/7", label: "Monitorização" },
  { value: "0", label: "Incidentes de segurança" },
];

const Transparency = () => {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar />

      {/* Hero */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Transparência & Segurança
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Como Garantimos a <span className="text-primary">Sua Confiança</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Na Bateu, cada sorteio é verificável, cada resultado é imutável e cada participante é protegido. Descubra como a nossa tecnologia garante justiça total.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 max-w-2xl mx-auto">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="p-4 rounded-2xl bg-card border border-border"
              >
                <p className="font-display text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-card border border-border p-6"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <section.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground mb-2">{section.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                  <ul className="space-y-2">
                    {section.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-xl mx-auto text-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-8">
          <h3 className="font-display text-xl font-bold text-foreground mb-2">Tem Dúvidas?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            A nossa equipa está disponível para esclarecer qualquer questão sobre segurança e transparência.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/faq" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
              Ver FAQ <ChevronRight className="h-4 w-4" />
            </a>
            <a href="/historico" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-card border border-border text-foreground text-sm font-medium hover:bg-secondary transition">
              Ver Histórico <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <BottomTabBar />
    </div>
  );
};

export default Transparency;
