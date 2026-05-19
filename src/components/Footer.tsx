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
            <img src={bateuLogo} alt="Bateu" className="h-8 w-8" />
            <span className="font-display text-xl font-bold text-foreground">Bateu</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">US · CA</span>
          </div>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Premium raffles for the US &amp; Canada. Every draw is publicly verifiable — transparency isn't a promise, it's proof.
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
            <Link to="/marketplace" className="hover:text-foreground transition-colors">Raffles</Link>
            <Link to="/historico" className="hover:text-foreground transition-colors">Verified Winners</Link>
            <Link to="/como-funciona" className="hover:text-foreground transition-colors">How It Works</Link>
            <Link to="/transparencia" className="hover:text-foreground transition-colors">Transparency</Link>
            <Link to="/instant-win" className="hover:text-foreground transition-colors">Instant Win</Link>
            <Link to="/referral" className="hover:text-foreground transition-colors">Refer &amp; Earn</Link>
            <Link to="/termos" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacidade" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/community" className="hover:text-foreground transition-colors">Community</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Bateu. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
