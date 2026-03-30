import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-3xl space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Recolha de Dados</h2>
            <p>A Bateu recolhe apenas os dados estritamente necessários para o funcionamento da plataforma: nome, número de telefone, endereço de e-mail e informações de pagamento. Os dados são recolhidos aquando do registo e da participação em sorteios.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Utilização dos Dados</h2>
            <p>Os dados pessoais são utilizados exclusivamente para: gestão de conta e perfil, processamento de participações em sorteios, comunicação de resultados e notificações, e cumprimento de obrigações legais.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Armazenamento e Segurança</h2>
            <p>Todos os dados são armazenados em servidores seguros com encriptação de ponta a ponta. Utilizamos as melhores práticas da indústria para proteger as informações dos nossos utilizadores.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Partilha de Dados</h2>
            <p>Não partilhamos, vendemos ou alugamos dados pessoais a terceiros. Os dados podem ser partilhados apenas quando exigido por lei ou com o consentimento explícito do utilizador.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Direitos do Utilizador</h2>
            <p>O utilizador tem o direito de aceder, corrigir, atualizar ou solicitar a eliminação dos seus dados pessoais a qualquer momento, através das definições da conta ou contactando o suporte.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
            <p>A plataforma utiliza cookies essenciais para o funcionamento do serviço e cookies analíticos para melhorar a experiência do utilizador. O utilizador pode desativar cookies não essenciais nas definições do navegador.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Alterações</h2>
            <p>Esta política pode ser atualizada periodicamente. Os utilizadores serão notificados de alterações significativas através da plataforma.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
