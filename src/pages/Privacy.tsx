import { motion } from "framer-motion";
import { ShieldCheck, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { privacyContent, resolveLegalLang } from "@/lib/legal-content";
import { useSEO } from "@/hooks/useSEO";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Privacy() {
  const { lang } = useLanguage();
  useSEO({ title: 'Política de Privacidade', description: 'Política de privacidade da Bateu. Saiba como protegemos os seus dados pessoais e informações de pagamento.', canonicalPath: '/privacidade', noindex: true });
  const content = privacyContent[resolveLegalLang(lang)];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        {/* Hero header with gradient accent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-12"
        >
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent/8 via-primary/5 to-accent/8 blur-xl -z-10" />
          <div className="relative rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <ShieldCheck className="h-6 w-6 text-accent" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  <Lock className="h-3 w-3" />
                  Proteção de Dados
                </span>
              </div>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {content.title}
            </h1>
          </div>
        </motion.div>

        {/* Sections with staggered animations */}
        <div className="max-w-3xl space-y-6">
          {content.sections.map((section, index) => (
            <motion.section
              key={section.title}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              whileHover={{ y: -2 }}
              className="group rounded-2xl border border-border/60 bg-card/50 p-6 md:p-8 transition-colors hover:border-accent/20 hover:bg-card/80"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/15 to-primary/10 text-xs font-bold text-accent">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <h2 className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors">
                    {section.title}
                  </h2>
                  <div className="space-y-2 text-muted-foreground leading-relaxed">
                    {section.paragraphs.map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          ))}
        </div>

        {/* Footer gradient divider */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"
        />
      </main>
      <Footer />
    </div>
  );
}
