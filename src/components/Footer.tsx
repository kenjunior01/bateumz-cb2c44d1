import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Lock, CheckCircle2 } from "lucide-react";
import bateuLogo from "@/assets/bateu-logo.png";

const regionIconStyle = { color: "var(--region-primary, hsl(var(--primary)))" } as const;

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer
      className="relative border-t border-border py-16 section-glow-divider"
      style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--card))) 4%, hsl(var(--card)/0.3))" }}
    >
      <div className="absolute inset-0 h-24 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
      <div className="container mx-auto px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <img src={bateuLogo} alt="Bateu" className="h-8 w-8" />
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
        </div>

        <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5" style={regionIconStyle} />
            <span className="font-medium">{t("footer.ssl")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3.5 w-3.5" style={regionIconStyle} />
            <span className="font-medium">{t("footer.blockchain")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" style={regionIconStyle} />
            <span className="font-medium">{t("footer.rng")}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#003087] text-white">PayPal</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Visa</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Mastercard</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Amex</span>
        </div>

        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/marketplace" className="region-link hover:opacity-80 transition-opacity">{t("footer.raffles")}</Link>
            <Link to="/historico" className="region-link hover:opacity-80 transition-opacity">{t("footer.winners")}</Link>
            <Link to="/como-funciona" className="region-link hover:opacity-80 transition-opacity">{t("footer.howItWorks")}</Link>
            <Link to="/transparencia" className="region-link hover:opacity-80 transition-opacity">{t("footer.transparency")}</Link>
            <Link to="/instant-win" className="region-link hover:opacity-80 transition-opacity">{t("footer.instantWin")}</Link>
            <Link to="/referral" className="region-link hover:opacity-80 transition-opacity">{t("footer.referral")}</Link>
            <Link to="/termos" className="region-link hover:opacity-80 transition-opacity">{t("footer.terms")}</Link>
            <Link to="/privacidade" className="region-link hover:opacity-80 transition-opacity">{t("footer.privacy")}</Link>
            <Link to="/community" className="region-link hover:opacity-80 transition-opacity">{t("footer.community")}</Link>
            <Link to="/faq" className="region-link hover:opacity-80 transition-opacity">{t("footer.faq")}</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Bateu. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
