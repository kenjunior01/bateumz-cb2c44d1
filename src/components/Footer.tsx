import { Link } from "react-router-dom";
import bateuLogo from "@/assets/bateu-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30 py-16">
      <div className="container mx-auto px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <img src={bateuLogo} alt="Bateu" className="h-8 w-8" />
            <span className="font-display text-xl font-bold text-foreground">Bateu</span>
          </div>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            A plataforma onde cada sorteio é uma oportunidade real e verificável. Transparência não é promessa — é prova.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/marketplace" className="hover:text-foreground transition-colors">Sorteios</Link>
            <Link to="/historico" className="hover:text-foreground transition-colors">Vencedores</Link>
            <Link to="/como-funciona" className="hover:text-foreground transition-colors">Como Funciona</Link>
            <Link to="/termos" className="hover:text-foreground transition-colors">Termos</Link>
            <Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
            <Link to="/community" className="hover:text-foreground transition-colors">Comunidade</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Bateu. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
