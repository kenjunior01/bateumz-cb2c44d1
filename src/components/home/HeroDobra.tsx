import HeroPrincipal from "@/components/home/HeroPrincipal";
import BoasVindasRetencao from "@/components/home/BoasVindasRetencao";

/* ═══════════════════════════════════════════════════════════════════════
   v85 — «DESKTOP VIVO»: PRIMEIRA DOBRA EM DUAS COLUNAS.
   Antes: título e botões concentrados à esquerda e uma grande parte do
   desktop VAZIA (feedback: «o desktop precisa de mostrar o motivo para
   regressar, não apenas os caminhos de navegação»).
   Agora:
   · ESQUERDA — a chamada principal (HeroPrincipal, uma frase + 2 botões);
   · DIREITA — o painel vivo de progressão (BoasVindasRetencao variante
     «painel»): visitante vê o loop «Joga hoje. Acumula pontos.
     Desbloqueia prémios.» com NÚMEROS REAIS do catálogo; registado vê
     nível, pontos, barra real, missão do dia e prémios disponíveis.
   Em <lg as colunas empilham (mobile continua no MobileHomeApp).
   ═══════════════════════════════════════════════════════════════════════ */

const HeroDobra = () => {
  return (
    <section aria-labelledby="hero-principal-title" className="relative px-4 pt-5 sm:pt-8">
      {/* v88 DESIGN DESKTOP: ambiente suave atrás da dobra — a primeira dobra
          deixa de ser «página branca com texto» e ganha profundidade (glow
          nas duas cores da marca, SEM imagens inventadas nem números falsos) */}
      <div
        data-testid="home88-ambiente"
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] hidden lg:block"
        style={{
          background:
            "radial-gradient(560px 260px at 18% 12%, hsl(var(--primary)/0.10), transparent 68%)," +
            "radial-gradient(520px 300px at 84% 30%, hsl(var(--accent)/0.10), transparent 70%)",
        }}
      />
      <div className="relative container mx-auto max-w-6xl">
        <div
          data-testid="home85-dobra"
          className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.05fr_minmax(330px,0.95fr)] lg:gap-8 lg:pt-2"
        >
          <div className="min-w-0">
            <HeroPrincipal naDobra />
          </div>
          <div className="min-w-0">
            <BoasVindasRetencao variante="painel" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroDobra;
