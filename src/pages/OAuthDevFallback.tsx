import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/* v62 (roadmap item 5 — Google/Apple honestos): o registo gerido (Lovable
   cloud-auth) redireciona o browser para /~oauth/initiate — rota que só
   existe na PRODUÇÃO (a plataforma Lovable trata o arranque do OAuth).
   Em dev/local este caminho dava 404 seco, sem uma palavra ao utilizador.
   Este fallback é HONESTO: explica que o OAuth gerido corre na produção
   (ou domínio próprio ligado ao Lovable) e devolve à autenticação — nunca
   finge que a ligação ao provedor falhou nem que «não há conta». */
export default function OAuthDevFallback() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="oauth-fallback">
      <div className="glass rounded-2xl border border-border p-6 max-w-sm text-center space-y-3">
        <ShieldAlert className="h-8 w-8 mx-auto text-amber-500" />
        <h1 className="font-display text-lg font-bold text-foreground">{t("auth.oauth.dev.titulo")}</h1>
        <p className="text-sm text-muted-foreground">{t("auth.oauth.dev.corpo")}</p>
        <p className="text-xs text-muted-foreground/70 font-mono break-all">/~oauth/initiate</p>
        <Link
          to="/login"
          className="w-full h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2"
          data-testid="oauth-fallback-voltar"
        >
          <ArrowLeft className="h-4 w-4" /> {t("auth.oauth.dev.voltar")}
        </Link>
        <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
          {t("auth.oauth.dev.inicio")}
        </Link>
      </div>
    </div>
  );
}
