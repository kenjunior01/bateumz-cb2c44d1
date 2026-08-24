import { motion } from "framer-motion";
import { HelpCircle, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSEO } from "@/hooks/useSEO";

const faqs = [
  {
    category: "Geral",
    questions: [
      { q: "O que é o Bateu?", a: "O Bateu é uma plataforma de sorteios premium em Moçambique que oferece prémios de luxo com resultados verificáveis em blockchain, garantindo total transparência." },
      { q: "Como posso participar num sorteio?", a: "Basta criar uma conta, escolher o sorteio desejado, selecionar os seus números e efectuar o pagamento via M-Pesa ou e-Mola. Após confirmação, os seus bilhetes ficam registados." },
      { q: "Os sorteios são justos?", a: "Sim! Todos os resultados são registados na blockchain (rede Polygon), tornando-os imutáveis e verificáveis por qualquer pessoa. Pode verificar clicando em 'Verificar Blockchain' em qualquer sorteio." },
      { q: "Preciso pagar para participar?", a: "Existem 3 tipos de sorteios: pagos (com bilhetes à venda), gratuitos (basta registar-se) e por pontos (usa pontos acumulados no programa de referências)." },
    ],
  },
  {
    category: "Pagamentos",
    questions: [
      { q: "Quais métodos de pagamento são aceites?", a: "Aceitamos M-Pesa e e-Mola. Após selecionar os bilhetes, receberá instruções para enviar o pagamento para o número indicado." },
      { q: "Como confirmo o meu pagamento?", a: "Após enviar o pagamento, faça upload do comprovativo na página do sorteio. A equipa verificará e confirmará os seus bilhetes." },
      { q: "Quanto tempo demora a confirmação?", a: "A confirmação é geralmente feita em poucas horas durante o horário comercial. Receberá uma notificação assim que os seus bilhetes forem confirmados." },
    ],
  },
  {
    category: "Prémios e Vencedores",
    questions: [
      { q: "Como sei se ganhei?", a: "Receberá uma notificação na plataforma. Também pode acompanhar o sorteio ao vivo na página 'Sorteio ao Vivo'." },
      { q: "Como recebo o meu prémio?", a: "Após ser anunciado como vencedor, a equipa Bateu entrará em contacto consigo para coordenar a entrega do prémio." },
      { q: "Posso ver vencedores anteriores?", a: "Sim! Na página de cada sorteio concluído, pode ver o bilhete vencedor e verificar o resultado na blockchain." },
    ],
  },
  {
    category: "Programa Convida & Ganha",
    questions: [
      { q: "Como funciona o programa de referências?", a: "Cada amigo que se regista com o seu link de convite dá-lhe 50 pontos. Acumule pontos para participar em sorteios gratuitos e obter descontos." },
      { q: "Onde encontro o meu link de convite?", a: "Aceda à página 'Convida & Ganha' no menu principal. O seu link único estará disponível para copiar e partilhar." },
      { q: "Os pontos expiram?", a: "Não! Os seus pontos acumulados não têm prazo de validade e podem ser usados quando quiser." },
    ],
  },
  {
    category: "Bolões",
    questions: [
      { q: "O que é um Bolão?", a: "Um Bolão é um grupo de pessoas que se juntam para comprar bilhetes em conjunto, aumentando as chances de ganhar. Se o grupo vencer, o prémio é dividido entre os membros." },
      { q: "Como crio ou entro num Bolão?", a: "Na página de um sorteio, clique em 'Criar Bolão' para iniciar um grupo ou use um código de convite para entrar num Bolão existente." },
    ],
  },
  {
    category: "Empresas",
    questions: [
      { q: "Como posso criar sorteios para a minha empresa?", a: "Registe-se como 'Empresa' e aceda ao painel de controlo. Lá pode criar sorteios personalizados com a identidade visual da sua marca." },
      { q: "Qual é o custo para criar um sorteio?", a: "Existe uma taxa de activação baseada numa percentagem do valor do prémio. Os detalhes são apresentados durante a criação do sorteio." },
      { q: "Posso personalizar a página do meu sorteio?", a: "Sim! Com a funcionalidade White Label, pode definir cores, logotipo e informações da sua marca para que o sorteio tenha a identidade visual da sua empresa." },
    ],
  },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { staggerChildren: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const faqItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function FAQ() {
  useSEO({ title: 'Perguntas Frequentes (FAQ)', description: 'Respostas às perguntas mais comuns sobre a plataforma Bateu. Saiba como funcionam sorteios, depósitos, saques, apostas e muito mais.', canonicalPath: '/faq' });

  return (
    <div className="min-h-screen bg-background bg-mesh-soft bg-noise relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,145,64,0.06) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.2, 1], x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-0 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.04) 0%, transparent 70%)" }}
          animate={{ scale: [1.1, 0.9, 1.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20 max-w-3xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <motion.div
            className="relative inline-block mb-4"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            {/* Glow behind icon */}
            <motion.div
              className="absolute inset-0 blur-xl rounded-full"
              style={{ background: "radial-gradient(circle, rgba(0,145,64,0.3) 0%, transparent 70%)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <HelpCircle className="h-12 w-12 text-primary mx-auto relative z-10" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Perguntas{' '}
            <span className="bg-gradient-to-r from-[#009140] via-[#FFD700] to-[#009140] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
              Frequentes
            </span>
          </h1>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Encontre respostas para as dúvidas mais comuns sobre o Bateu.
          </motion.p>
        </motion.div>

        {/* FAQ Sections */}
        <div className="space-y-10">
          {faqs.map((section, si) => (
            <motion.div
              key={section.category}
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {/* Category heading with accent */}
              <motion.div
                className="flex items-center gap-3 mb-4"
                variants={faqItemVariants}
              >
                <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                <h2 className="font-display text-lg font-bold text-foreground whitespace-nowrap">
                  {section.category}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
              </motion.div>

              <Accordion type="single" collapsible className="space-y-2">
                {section.questions.map((faq, i) => (
                  <motion.div
                    key={`${si}-${i}`}
                    variants={faqItemVariants}
                    whileHover={{
                      x: 4,
                      transition: { duration: 0.2 },
                    }}
                    className="rounded-xl"
                  >
                    <AccordionItem
                      value={`${si}-${i}`}
                      className="rounded-xl border border-border bg-card/80 backdrop-blur-sm px-4 hover:border-primary/30 hover:bg-card transition-colors duration-200"
                    >
                      <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 text-muted-foreground"
            whileHover={{ color: "hsl(var(--foreground))" }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm">Ainda tens dúvidas?</span>
            <span className="text-sm font-medium text-primary cursor-pointer hover:underline">
              Contacta-nos
            </span>
          </motion.div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
