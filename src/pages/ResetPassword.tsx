import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    const check = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const errDesc = hash.get("error_description") || query.get("error_description");
      if (errDesc) {
        if (active) {
          setLinkError(errDesc);
          setChecking(false);
        }
        return;
      }

      // Recovery links may arrive as hash tokens, a PKCE ?code=, or ?token_hash=
      if (hash.get("type") === "recovery" || query.get("type") === "recovery" || query.get("code")) {
        if (active) setIsRecovery(true);
      }

      const tokenHash = query.get("token_hash");
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        if (active) {
          if (error) setLinkError(error.message);
          else setIsRecovery(true);
          setChecking(false);
        }
        return;
      }

      // Fall back to an already-established recovery session
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) setIsRecovery(true);
      setChecking(false);
    };

    // Give the Supabase client a moment to process the URL itself
    const timer = setTimeout(check, 300);

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  if (checking && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground text-sm">Verifying your reset link...</p>
      </div>
    );
  }

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <p className="text-muted-foreground mb-2">
            {linkError || "This password reset link is invalid or has expired."}
          </p>
          <p className="text-muted-foreground text-sm mb-4">Request a new link and open it on this same device.</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/forgot-password" className="text-primary hover:underline">Request new link</Link>
            <Link to="/login" className="text-muted-foreground hover:underline">Back to login</Link>
          </div>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-foreground">SORTEX</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {success ? "Senha Atualizada!" : "Nova Senha"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {success ? "Pode entrar com a nova senha" : "Defina a sua nova senha"}
          </p>
        </div>

        <div className="glass rounded-2xl p-8">
          {success ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm">A redirecionar para o login...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-10 glow-primary">
                {loading ? "A atualizar..." : "Atualizar Senha"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Voltar ao login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
