import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { termsContent, resolveLegalLang } from "@/lib/legal-content";
import { useSEO } from "@/hooks/useSEO";

export default function Terms() {
  const { lang } = useLanguage();
  useSEO({ title: 'Termos e Condições', description: 'Termos de uso e condições gerais da plataforma Bateu. Leia os termos antes de utilizar os nossos serviços de jogos e sorteios online.', canonicalPath: '/termos', noindex: true });
  const content = termsContent[resolveLegalLang(lang)];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">{content.title}</h1>

        <div className="prose prose-sm dark:prose-invert max-w-3xl space-y-6 text-muted-foreground">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
