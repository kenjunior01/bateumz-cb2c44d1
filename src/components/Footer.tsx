import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Lock, CheckCircle2 } from "lucide-react";
import bateuLogo from "@/assets/bateu-logo.png";

const regionLinkStyle = { color: "var(--region-primary, hsl(var(--muted-foreground)))" } as const;
const regionIconStyle = { color: "var(--region-primary, hsl(var(--primary)))" } as const;

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer
      className="border-t border-border py-16"
      style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--card))) 4%, hsl(var(--card)/0.3))" }}
    >
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
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">US · CA</span>
          </div>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Premium raffles with public verification. Every draw is publicly auditable — transparency isn't a promise, it's proof.
          </p>
        </div>

        {/* Security Seals */}
        <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5" style={regionIconStyle} />
            <span className="font-medium">SSL 256-bit</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3.5 w-3.5" style={regionIconStyle} />
            <span className="font-medium">Blockchain Verified</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" style={regionIconStyle} />
            <span className="font-medium">Certified RNG</span>
          </div>
        </div>

        {/* Payment Logos — PayPal only */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#003087] text-white">PayPal</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Visa</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Mastercard</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Amex</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Bank</span>
        </div>

        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/marketplace" className="region-link hover:opacity-80 transition-opacity">{t("footer.raffles")}</Link>
            <Link to="/historico" className="region-link hover:opacity-80 transition-opacity">{t("footer.winners")}</Link>
            <Link to="/como-funciona" className="region-link hover:opacity-80 transition-opacity">{t("footer.howItWorks")}</Link>
            <Link to="/transparencia" className="region-link hover:opacity-80 transition-opacity">Transparency</Link>
            <Link to="/instant-win" className="region-link hover:opacity-80 transition-opacity">Instant Win</Link>
            <Link to="/referral" className="region-link hover:opacity-80 transition-opacity">Refer &amp; Earn</Link>
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

