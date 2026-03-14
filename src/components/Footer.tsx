import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card/30 py-16">
    <div className="container mx-auto px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">SORTEX</span>
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          A plataforma onde cada sorteio é uma oportunidade real e verificável. Transparência não é promessa — é prova.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link to="/marketplace" className="hover:text-foreground transition-colors">Sorteios</Link>
          <a href="#como-funciona" className="hover:text-foreground transition-colors">Como Funciona</a>
          <a href="#vencedores" className="hover:text-foreground transition-colors">Vencedores</a>
          <a href="#" className="hover:text-foreground transition-colors">Termos</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 SORTEX. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
