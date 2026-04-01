import { motion } from "framer-motion";
import { HelpCircle, ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Perguntas Frequentes</h1>
          <p className="text-muted-foreground">Encontre respostas para as dúvidas mais comuns sobre o Bateu.</p>
        </motion.div>

        <div className="space-y-8">
          {faqs.map((section, si) => (
            <motion.div key={section.category} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.1 }}>
              <h2 className="font-display text-lg font-bold text-foreground mb-3">{section.category}</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {section.questions.map((faq, i) => (
                  <AccordionItem key={i} value={`${si}-${i}`} className="rounded-xl border border-border bg-card px-4">
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
