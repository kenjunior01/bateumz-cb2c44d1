import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { RefreshCw, Compass } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  children: React.ReactNode;
  requiredRole?: "business" | "admin" | "regional_manager";
  blockRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRole, blockRoles = [] }: Props) {
  const { user, role, loading, bootErro, tentarNovamente } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  /* v62 (roadmap item 10 — P0): o boot de autenticação falhou (rede/Supabase)
     — nada de spinner infinito nem redirecionar a ninguém para /login como se
     fosse convidado honesto: estado de RECUPERAÇÃO navegável — retry real +
     caminho para a plataforma aberta. */
  if (bootErro && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="auth-boot-fallback">
        <div className="glass rounded-2xl border border-border p-6 max-w-sm text-center space-y-3">
          <RefreshCw className="h-8 w-8 mx-auto text-primary" />
          <h2 className="font-display text-lg font-bold text-foreground">{t("auth.boot.falha.titulo")}</h2>
          <p className="text-sm text-muted-foreground">{t("auth.boot.falha.corpo")}</p>
          <button
            onClick={tentarNovamente}
            data-testid="auth-boot-retry"
            className="w-full h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> {t("auth.boot.falha.tentar")}
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Compass className="h-4 w-4" /> {t("auth.boot.falha.convidado")}
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && blockRoles.includes(role)) {
    return <Navigate to={role === "admin" || role === "superadmin" ? "/admin" : "/dashboard"} replace />;
  }

  if (requiredRole === "admin" && role !== "admin" && role !== "superadmin") {
    return <Navigate to={role === "business" ? "/dashboard" : "/profile"} replace />;
  }

  if (requiredRole === "business" && role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (requiredRole === "business" && role !== "business") {
    return <Navigate to="/profile" replace />;
  }

  if (requiredRole === "regional_manager" && role !== "regional_manager" && role !== "admin" && role !== "superadmin") {
    return <Navigate to="/profile" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
