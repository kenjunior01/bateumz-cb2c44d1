import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Mail, Lock, Zap, Building2, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-foreground">SORTEX</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground mt-1">Entre na sua conta para continuar</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-50"
            >
              {loading ? "A entrar..." : "Entrar"}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Criar conta
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Voltar ao site
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
