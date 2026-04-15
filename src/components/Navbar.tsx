import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import bateuLogo from "@/assets/bateu-logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const links = [
    { label: "Sorteios", href: "/marketplace" },
    { label: "Concursos", href: "/concursos" },
    { label: "Empresas", href: "/empresas" },
    { label: "Comunidade", href: "/community" },
    { label: "Convida & Ganha", href: "/referral" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={bateuLogo} alt="Bateu" className="h-8 w-8" />
          <span className="font-display text-xl font-bold text-foreground">
            Bateu
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/my-points" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1">
                <Star className="h-4 w-4 text-accent" /> Pontos
              </Link>
              <Link to="/dashboard" className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                Dashboard
              </Link>
              {role === "admin" && (
                <Link to="/admin" className="rounded-lg px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                  Admin
                </Link>
              )}
              <button onClick={signOut} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                Entrar
              </Link>
              <Link to="/register" className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow-primary">
                <Zap className="h-4 w-4" />
                Participar
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button className="text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-2 px-6 py-4">
              {links.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/register" onClick={() => setOpen(false)} className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                <Zap className="h-4 w-4" />
                Participar Agora
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
