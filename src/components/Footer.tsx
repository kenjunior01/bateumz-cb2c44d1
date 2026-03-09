import { Trophy } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card/30 py-12">
    <div className="container mx-auto px-6">
      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Trophy className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">SORTEX</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Termos</a>
          <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
          <a href="#" className="hover:text-foreground transition-colors">FAQ</a>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 SORTEX. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
