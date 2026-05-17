import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Lock, CheckCircle2 } from "lucide-react";
import bateuLogo from "@/assets/bateu-logo.png";

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border bg-card/30 py-16">
      <div className="container mx-auto px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <img src={bateuLogo} alt="Jackpot Drop" className="h-8 w-8" />
            <span className="font-display text-xl font-bold text-foreground">Jackpot Drop</span>
          </div>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>

        {/* Security Seals */}
        <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">SSL 256-bit</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Blockchain Verified</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">RNG Certificado</span>
          </div>
        </div>

        {/* Payment Logos */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["M-Pesa", "e-Mola", "Visa", "Mastercard"].map((p) => (
            <span key={p} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
              {p}
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/marketplace" className="hover:text-foreground transition-colors">{t("footer.raffles")}</Link>
            <Link to="/historico" className="hover:text-foreground transition-colors">{t("footer.winners")}</Link>
            <Link to="/como-funciona" className="hover:text-foreground transition-colors">{t("footer.howItWorks")}</Link>
            <Link to="/transparencia" className="hover:text-foreground transition-colors">Transparência</Link>
            <Link to="/instant-win" className="hover:text-foreground transition-colors">Instant Win</Link>
            <Link to="/termos" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
            <Link to="/privacidade" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
            <Link to="/community" className="hover:text-foreground transition-colors">{t("footer.community")}</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">{t("footer.faq")}</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Jackpot Drop. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
