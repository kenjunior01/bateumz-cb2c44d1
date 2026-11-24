// ============================================================
// v85 — HOMEPAGE DESKTOP «DESKTOP VIVO» (sobre a base v79/v83):
//   1. Cabeçalho fino (TrustBar 1 fio · Navbar v79 — barra de live SÓ
//      com transmissão activa real)
//   2. PRIMEIRA DOBRA EM DUAS COLUNAS (HeroDobra): chamada à esquerda,
//      PAINEL VIVO de progressão à direita (loop «Joga hoje. Acumula
//      pontos. Desbloqueia prémios.» com números REAIS; registado:
//      nível/pontos/barra/missão/prémios)
//   3. TRÊS cartões CONCRETOS (DescobertaTres: KART com recompensa à
//      vista, partida real de desporto, banner KART com imagem)
//   4. PRÉMIOS disponíveis (SorteiosConcursosRollUp — dados reais)
//   5. ACTIVIDADE REAL (ActividadeReal — só números que existem)
//   6. continuar a jogar (ContinuePlayRail — progressão do próprio)
//   7. CONFIANÇA no fim (ConfiancaFim + Footer)
// Sai da homepage (reorganizado, não eliminado):
//   · stories «Seu Status»/«Bateu Oficial» → Comunidade
//   · roll-up da loja → Mercado Bateu (página própria)
// Tudo aqui são componentes REAIS de dados (supabase/locais).
// ============================================================
import { lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSEO } from "@/hooks/useSEO";
import Navbar from "@/components/Navbar";
import TrustBar from "@/components/TrustBar";
import Footer from "@/components/Footer";
import HeroDobra from "@/components/home/HeroDobra";
import DescobertaTres from "@/components/home/DescobertaTres";
import ActividadeReal from "@/components/home/ActividadeReal";
import ConfiancaFim from "@/components/home/ConfiancaFim";

const MobileHomeApp = lazy(() => import("@/components/mobile/MobileHomeApp"));
const ContinuePlayRail = lazy(() => import("@/components/home/ContinuePlayRail").then(m => ({ default: m.default })));
const SorteiosConcursosRollUp = lazy(() => import("@/components/home/SorteiosConcursosRollUp").then(m => ({ default: m.default })));

const Home = () => {
  const isMobile = useIsMobile();

  useSEO({
    title: "Jogos Online, Sorteios ao Vivo e Desporto",
    description: "Joga, acompanha e participa em jogos e sorteios ao vivo com resultados verificáveis. Feita para Moçambique, Angola, Cabo Verde e Brasil. +18 — joga com responsabilidade.",
    canonicalPath: "/",
  });

  if (isMobile) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <MobileHomeApp />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 1 · cabeçalho */}
      <TrustBar />
      <Navbar />
      <main id="conteudo-principal" className="pb-16 pt-20 lg:pt-20">
        {/* pt-20: a navbar é FIXA (topo = fundo do banner de anúncio quando
            existe live activa, 0 caso contrário) — o respiro evita que a
            chamada principal nasça por baixo dela. */}
        {/* 2 · PRIMEIRA DOBRA EM DUAS COLUNAS — chamada à esquerda,
            painel vivo de progressão à direita (v85) */}
        <HeroDobra />

        {/* 3 · TRÊS cartões de descoberta CONCRETOS (KART com recompensa,
            partida real de desporto, banner KART com imagem) */}
        <DescobertaTres />

        {/* 4 · PRÉMIOS DISPONÍVEIS — descoberta com dados reais */}
        <section className="px-4 py-8" aria-label="Sorteios disponíveis">
          <div className="container mx-auto max-w-6xl">
            <Suspense fallback={<div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />}>
              <SorteiosConcursosRollUp />
            </Suspense>
          </div>
        </section>

        {/* 5 · ACTIVIDADE REAL */}
        <ActividadeReal />

        {/* continuar a jogar — progressão REAL do próprio jogador (v78) */}
        <Suspense fallback={<div className="h-40" />}>
          <ContinuePlayRail />
        </Suspense>

        {/* 6 · CONFIANÇA */}
        <ConfiancaFim />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
