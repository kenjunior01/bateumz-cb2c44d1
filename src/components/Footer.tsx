import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Lock, CheckCircle2, Contrast } from "lucide-react";
import bateuLogo from "@/assets/bateu-logo.png";
import ResponsibleGaming from "@/components/ResponsibleGaming";
// v90 — MODO ALTO CONTRASTE: o botão do rodapé é a ÚNICA superfície que
// grava a escolha; o núcleo (contraste.ts) é puro e a aplicação é um
// atributo no <html> que o CSS §v90 da index.css chaveia.
import { CHAVE_CONTRASTE, alternarContraste, aplicarContraste, type EstadoContraste } from "@/lib/contraste";

const regionIconStyle = { color: "var(--region-primary, hsl(var(--primary)))" } as const;

const SPRING = { type: "spring" as const, stiffness: 300, damping: 20 };

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const securityItems = ["footer.ssl", "footer.prova", "footer.apuramento"] as const;
const securityIcons = [Lock, Shield, CheckCircle2] as const;

const Footer = () => {
  const { t } = useLanguage();
  // v90 — alto contraste: o estado INICIAL é lido da MESMA fonte que o boot
  // (núcleo aplicarContraste — escolha explícita, ou o SO se nunca escolheu);
  // o botão mostra o estado EFETIVO e o aria-pressed bate sempre certo.
  const [contraste, setContraste] = useState<EstadoContraste>(() =>
    aplicarContraste({
      storage: localStorage,
      documentElement: document.documentElement,
      matchMedia: (q) => window.matchMedia(q),
    }),
  );
  useEffect(() => {
    // re-sincroniza se outra página/aba gravou (o mesmo padrão do storage event)
    const aoTrocar = (e: StorageEvent) => {
      if (e.key === CHAVE_CONTRASTE) {
        setContraste(
          aplicarContraste({
            storage: localStorage,
            documentElement: document.documentElement,
            matchMedia: (q) => window.matchMedia(q),
          }),
        );
      }
    };
    window.addEventListener("storage", aoTrocar);
    return () => window.removeEventListener("storage", aoTrocar);
  }, []);
  const alternarContrasteAgora = () => {
    const novo = alternarContraste(contraste);
    try {
      localStorage.setItem(CHAVE_CONTRASTE, novo);
    } catch { /* storage cheio/bloqueado — o atributo é aplicado na mesma */ }
    setContraste(
      aplicarContraste({
        storage: localStorage,
        documentElement: document.documentElement,
        matchMedia: (q) => window.matchMedia(q),
      }),
    );
  };
  return (
    <footer
      className="relative border-t border-border py-16 section-glow-divider"
      style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--card))) 4%, hsl(var(--card)/0.3))" }}
    >
      {/* Subtle gradient accents */}
      <div className="absolute top-0 left-1/3 h-32 w-48 bg-primary/3 blur-[80px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 h-32 w-48 bg-accent/3 blur-[80px] pointer-events-none rounded-full" />
      <div className="absolute inset-0 h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />

      <motion.div
        className="container mx-auto px-6 relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        <motion.div className="mb-10 text-center" custom={0} variants={fadeInUp}>
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <motion.img
              src={bateuLogo}
              alt="Bateu"
              className="h-8 w-8"
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              transition={SPRING}
            />
            <span
              className="font-display text-xl font-bold"
              style={{ color: "var(--region-primary, hsl(var(--foreground)))" }}
            >
              Bateu
            </span>
          </div>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </motion.div>

        <motion.div className="flex items-center justify-center gap-4 mb-8 flex-wrap" custom={0.1} variants={fadeInUp}>
          {securityItems.map((key, i) => {
            const Icon = securityIcons[i];
            return (
              <motion.div
                key={key}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground rounded-full px-3 py-1.5 border border-transparent"
                whileHover={{
                  scale: 1.05,
                  borderColor: "hsl(var(--primary) / 0.2)",
                  background: "hsl(var(--primary) / 0.05)",
                }}
                transition={SPRING}
              >
                <Icon className="h-3.5 w-3.5" style={regionIconStyle} />
                <span className="font-medium">{t(key)}</span>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div className="flex items-center justify-center gap-2 mb-8" custom={0.2} variants={fadeInUp}>
          <motion.span
            whileHover={{ scale: 1.1, y: -1 }}
            transition={SPRING}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#003087] text-white cursor-default"
          >PayPal</motion.span>
          <motion.span
            whileHover={{ scale: 1.1, y: -1 }}
            transition={SPRING}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground cursor-default"
          >Visa</motion.span>
          <motion.span
            whileHover={{ scale: 1.1, y: -1 }}
            transition={SPRING}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground cursor-default"
          >Mastercard</motion.span>
          <motion.span
            whileHover={{ scale: 1.1, y: -1 }}
            transition={SPRING}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground cursor-default"
          >Amex</motion.span>
        </motion.div>

        <motion.div className="mb-8 flex justify-center" custom={0.25} variants={fadeInUp}>
          <ResponsibleGaming />
        </motion.div>

        <motion.div className="flex flex-col items-center gap-6 md:flex-row md:justify-between" custom={0.3} variants={fadeInUp}>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/marketplace" className="region-link hover:opacity-80 transition-opacity">{t("footer.raffles")}</Link>
            <Link to="/alienacao" className="region-link hover:opacity-80 transition-opacity">Leilões e bens</Link>
            <Link to="/historico" className="region-link hover:opacity-80 transition-opacity">{t("footer.winners")}</Link>
            <Link to="/como-funciona" className="region-link hover:opacity-80 transition-opacity">{t("footer.howItWorks")}</Link>
            <Link to="/transparencia" className="region-link hover:opacity-80 transition-opacity">{t("footer.transparency")}</Link>
            <Link to="/instant-win" className="region-link hover:opacity-80 transition-opacity">{t("footer.instantWin")}</Link>
            <Link to="/referral" className="region-link hover:opacity-80 transition-opacity">{t("footer.referral")}</Link>
            <Link to="/termos" className="region-link hover:opacity-80 transition-opacity">{t("footer.terms")}</Link>
            <Link to="/privacidade" className="region-link hover:opacity-80 transition-opacity">{t("footer.privacy")}</Link>
            <Link to="/community" className="region-link hover:opacity-80 transition-opacity">{t("footer.community")}</Link>
            <Link to="/faq" className="region-link hover:opacity-80 transition-opacity">{t("footer.faq")}</Link>
            {/* v54 — BATEU IA (NVIDIA Nemotron) */}
            <Link to="/ia" data-testid="footer-ia" className="region-link hover:opacity-80 transition-opacity">{t("footer.ia")}</Link>
            {/* v39 auditoria (0–14 dias): suporte publicado + protecção a um toque */}
            <Link to="/suporte" data-testid="footer-suporte" className="region-link hover:opacity-80 transition-opacity">{t("footer.support")}</Link>
            <Link to="/protecao" data-testid="footer-protecao" className="region-link hover:opacity-80 transition-opacity">{t("footer.protection")}</Link>
          </div>
          <div className="flex flex-col items-center gap-3">
            {/* v90 — MODO ALTO CONTRASTE: escolha EXPLÍCITA, gravada no
                aparelho; aria-pressed comunica o estado real */}
            <button
              type="button"
              data-testid="footer-contraste"
              aria-pressed={contraste === "alto"}
              onClick={alternarContrasteAgora}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors"
              style={
                contraste === "alto"
                  ? { borderColor: "hsl(var(--primary) / 0.6)", color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.08)" }
                  : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
              }
            >
              <Contrast className="h-3.5 w-3.5" aria-hidden="true" />
              {t("contraste.rotulo")}
            </button>
            <p className="text-sm text-muted-foreground">
              © 2026 Bateu. {t("footer.rights")}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
};

export default Footer;
