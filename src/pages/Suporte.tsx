import { Link } from "react-router-dom";
import { Mail, FileText, ShieldCheck, HelpCircle, BadgeCheck, LifeBuoy, ChevronRight, Scale } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";

/* ═══════════════════════════════════════════════════════════════════════
   v39 — /suporte (auditoria bateu.online, plano 0–14 dias):
   «publicar suporte, termos, política de privacidade, regras e contacto».
   HONESTO POR CONSTRUÇÃO: só canais que existem de facto na plataforma.
   O email é o mesmo configurado no painel de administração
   (AdminSettings → suporte@bateu.co.mz). Não inventamos telefone,
   WhatsApp, horário nem SLA de resposta.
   ═══════════════════════════════════════════════════════════════════════ */

const AJUDA = [
  {
    icon: HelpCircle,
    to: "/faq",
    titulo: "Perguntas frequentes",
    desc: "Respostas rápidas sobre contas, entradas, prémios e levantamentos.",
  },
  {
    icon: LifeBuoy,
    to: "/como-funciona",
    titulo: "Como funciona",
    desc: "Escolher, confirmar e acompanhar o resultado — passo a passo.",
  },
  {
    icon: FileText,
    to: "/termos",
    titulo: "Termos e condições",
    desc: "As regras da plataforma, por escrito, antes de participares.",
  },
  {
    icon: FileText,
    to: "/privacidade",
    titulo: "Privacidade",
    desc: "Que dados recolhemos, porquê e como os protegemos.",
  },
  {
    icon: BadgeCheck,
    to: "/transparencia",
    titulo: "Transparência",
    desc: "Resultados verificáveis, prova de sorteios e histórico.",
  },
  {
    icon: ShieldCheck,
    to: "/protecao",
    titulo: "Limites e protecção",
    desc: "Define limites, faz uma pausa ou auto-exclui-te a qualquer momento.",
  },
];

const Suporte = () => {
  useSEO({
    title: "Suporte e Ajuda",
    description:
      "Centro de ajuda da Bateu: FAQ, como funciona, termos, privacidade, transparência e contacto directo do suporte.",
    canonicalPath: "/suporte",
  });
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="conteudo-principal" className="container mx-auto max-w-4xl px-4 py-10" tabIndex={-1}>
        <div className="mb-8 flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10">
            <LifeBuoy className="h-6 w-6 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Suporte e ajuda
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              A ajuda começa aqui. Antes de perguntar, quase tudo está resolvido nas páginas
              abaixo — escritas em linguagem simples, sem letra miudinha.
            </p>
          </div>
        </div>

        {/* Email directo — o único canal real configurado na plataforma */}
        <a
          href="mailto:suporte@bateu.co.mz"
          data-testid="suporte-email"
          className="mb-8 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-[0_4px_18px_rgba(0,0,0,0.08)]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Falar com o suporte</span>
            <span className="block truncate text-xs text-muted-foreground">
              suporte@bateu.co.mz — escreve-nos directamente a partir do teu email.
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </a>

        <h2 className="mb-3 font-display text-lg font-bold">Centro de ajuda</h2>
        <div className="mb-8 grid gap-2.5 sm:grid-cols-2">
          {AJUDA.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              data-testid={`suporte-${a.to.replace("/", "")}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-transform active:scale-[0.98]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10">
                <a.icon className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{a.titulo}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{a.desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed">
          <div className="mb-1 flex items-center gap-2 font-bold">
            <Scale className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            Jogo responsável — {t("trustbar.age")}
          </div>
          <p className="text-muted-foreground">
            Participar tem risco: nunca existe garantia de ganho. Define limites antes de jogar
            e, se sentires que perdeste o controlo, faz uma pausa ou auto-exclui-te — tudo em{" "}
            <Link to="/protecao" className="font-semibold text-foreground underline underline-offset-2">
              Limites e protecção
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Suporte;
