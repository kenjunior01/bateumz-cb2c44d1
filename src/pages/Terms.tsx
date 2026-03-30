import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Termos e Condições</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-3xl space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>Ao aceder e utilizar a plataforma Bateu, o utilizador aceita e concorda em cumprir os presentes Termos e Condições. Se não concordar com algum dos termos, deverá cessar imediatamente a utilização da plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>A Bateu é uma plataforma digital de sorteios premium que permite a empresas verificadas criar e gerir sorteios transparentes, e a utilizadores participarem na compra de bilhetes digitais.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Elegibilidade</h2>
            <p>Para utilizar a plataforma, o utilizador deve ter no mínimo 18 anos de idade e residir em Moçambique. A plataforma reserva-se o direito de solicitar documentos de identificação.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Pagamentos e Bilhetes</h2>
            <p>Os pagamentos são realizados via M-Pesa ou e-Mola. Cada bilhete adquirido é associado a um número único e registado de forma imutável na plataforma. Os bilhetes não são reembolsáveis após confirmação do pagamento.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Sorteios e Resultados</h2>
            <p>Os sorteios são realizados de forma transparente e verificável. Os resultados são finais e não estão sujeitos a recurso. A plataforma utiliza sistemas de verificação para garantir a imparcialidade dos sorteios.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Empresas e Taxa de Ativação</h2>
            <p>Empresas que desejam criar sorteios devem registar-se como conta empresarial e estão sujeitas a uma taxa de ativação definida pela plataforma. Todos os sorteios passam por um processo de aprovação antes de serem publicados.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Responsabilidade</h2>
            <p>A Bateu não se responsabiliza por falhas técnicas de operadoras de pagamento, indisponibilidade temporária do serviço, ou por ações de terceiros que violem estes termos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Contacto</h2>
            <p>Para questões relacionadas com estes termos, contacte-nos através do suporte integrado na plataforma ou via WhatsApp.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
