import { Link } from "react-router-dom";
import { ShieldCheck, FileText, BadgeCheck, LifeBuoy } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";
import ResponsibleGaming from "@/components/ResponsibleGaming";
import Footer from "@/components/Footer";

/* ═══════════════════════════════════════════════════════════════════════
   v39 — /protecao (auditoria bateu.online, secção 6):
   «“Limites e proteção” deve estar sempre a um toque da conta e do fluxo
   de participação». O componente ResponsibleGaming já existia mas só era
   acessível dentro do /profile — agora é uma página pública própria,
   ligada na barra de confiança, no rodapé e no suporte.
   ═══════════════════════════════════════════════════════════════════════ */

const Protecao = () => {
  useSEO({
    title: "Limites e Protecção do Jogador",
    description:
      "Define limites de depósito e tempo, faz uma pausa de 24 horas ou auto-exclui-te. Ferramentas de jogo responsável da Bateu, sempre a um toque.",
    canonicalPath: "/protecao",
  });
  const { t } = useLanguage();

  return (
    /* Contexto escuro explícito: o ResponsibleGaming foi desenhado para a
       página de perfil (fundo escuro) — texto claro sobre cartões translúcidos.
       Sem o envolvimento .dark num fundo escuro, ficaria ilegível (v39). */
    <div className="dark min-h-screen bg-[#050508] text-zinc-100">
      <main id="conteudo-principal" className="container mx-auto max-w-4xl px-4 py-10" tabIndex={-1}>
        <div className="mb-6 flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Limites e protecção
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              O teu controlo vem antes de tudo o resto. Define limites, faz pausas ou auto-exclui-te —
              estas ferramentas são produto central, não letra miudinha no rodapé.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-2.5 sm:grid-cols-3">
          <Link
            to="/termos"
            className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3.5 text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            <FileText className="h-4 w-4 text-accent" aria-hidden="true" />
            Termos e regras
          </Link>
          <Link
            to="/transparencia"
            className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3.5 text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            <BadgeCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Resultados verificáveis
          </Link>
          <Link
            to="/suporte"
            className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3.5 text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            <LifeBuoy className="h-4 w-4 text-accent" aria-hidden="true" />
            Suporte
          </Link>
        </div>

        <ResponsibleGaming />

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          {t("trustbar.age")} — participar implica risco e nunca existe garantia de ganho. Se o jogo
          deixar de ser diversão, procura apoio: esta página existe exactamente para isso.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default Protecao;
