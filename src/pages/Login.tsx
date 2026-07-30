import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowLeft, ChevronRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { playPopSound } from "@/lib/sounds";

import mascotHappy from "@/assets/mascot-happy.png";
import mascotExcited from "@/assets/mascot-excited.png";
import mascotWinner from "@/assets/mascot-winner.png";
import mascotThinking from "@/assets/mascot-thinking.png";

const FLOATING_EMOJIS = ["🎯", "🏆", "🎁", "✨", "💎", "🎲"];

function FloatingEmoji({ emoji, delay, x, y }: { emoji: string; delay: number; x: string; y: string }) {
  return (
    <motion.span
      className="absolute text-xl pointer-events-none select-none"
      style={{ left: x, top: y }}
      animate={{ y: [0, -20, 0], rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
      transition={{ repeat: Infinity, duration: 3 + Math.random() * 2, delay, ease: "easeInOut" }}
    >
      {emoji}
    </motion.span>
  );
}

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const nextPath = (() => {
    try {
      const p = new URLSearchParams(window.location.search).get("next");
      if (p && p.startsWith("/") && !p.startsWith("//")) return p;
    } catch {}
    return null;
  })();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mascotMood, setMascotMood] = useState<"happy" | "excited" | "thinking" | "winner">("happy");
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const mascotImages = { happy: mascotHappy, excited: mascotExcited, thinking: mascotThinking, winner: mascotWinner };

  const navigateAfterLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    if (nextPath) {
      navigate(nextPath);
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = data?.map((item: any) => item.role) || [];

    if (roles.includes("superadmin") || roles.includes("admin")) navigate("/admin");
    else if (roles.includes("business")) navigate("/dashboard");
    else navigate("/profile");
  };

  // Change mascot mood based on interaction
  useEffect(() => {
    if (error) setMascotMood("thinking");
    else if (email && password.length >= 6) setMascotMood("excited");
    else if (focusedField) setMascotMood("happy");
    else setMascotMood("happy");
  }, [email, password, error, focusedField]);

  const mascotMessages: Record<string, string> = {
    happy: "Hey there! Great to see you 👋",
    excited: "All set! Let's go 🚀",
    thinking: "Hmm... something looks off 🤔",
    winner: "Welcome back! 🎉",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
      setMascotMood("thinking");
    } else {
      setMascotMood("winner");
      setSuccess(true);
      playPopSound();
      setTimeout(navigateAfterLogin, 1200);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    playPopSound();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError("Could not connect with Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    playPopSound();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin + '/dashboard' },
    });
    if (error) {
      setError("Could not connect with Apple. Please try again.");
      setAppleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
        {FLOATING_EMOJIS.map((e, i) => (
          <motion.span
            key={i}
            className="absolute text-3xl pointer-events-none"
            initial={{ x: Math.random() * 400 - 200, y: -20, opacity: 1, rotate: 0 }}
            animate={{ y: 500, opacity: 0, rotate: Math.random() * 360 }}
            transition={{ duration: 2 + Math.random(), delay: i * 0.12, ease: "easeIn" }}
          >
            {e}
          </motion.span>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 12 }}
          className="glass rounded-3xl p-8 max-w-md text-center relative z-10"
        >
          <motion.img
            src={mascotWinner}
            alt="Bateu"
            className="h-24 w-24 mx-auto mb-4"
            width={96} height={96}
            animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
            <h2 className="font-display text-2xl font-bold text-foreground">Welcome back! 🎊</h2>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground mt-3">
            Redirecting to your dashboard...
          </motion.p>
          <motion.div
            className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          >
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, delay: 0.7 }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 6 }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-[120px]"
          animate={{ scale: [1.3, 1, 1.3], opacity: [0.5, 0.3, 0.5] }}
          transition={{ repeat: Infinity, duration: 8 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[180px]"
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
        />
      </div>

      {FLOATING_EMOJIS.map((emoji, i) => (
        <FloatingEmoji
          key={i}
          emoji={emoji}
          delay={i * 0.5}
          x={`${10 + (i * 15) % 80}%`}
          y={`${10 + (i * 20) % 70}%`}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md z-10"
      >
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/assets/bateu-logo.png" alt="Bateu" className="h-10 w-10 rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="font-display text-2xl font-bold text-foreground">Bateu</span>
          </Link>

          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.img
              key={mascotMood}
              src={mascotImages[mascotMood]}
              alt="Bateu Mascot"
              className="h-16 w-16"
              width={64} height={64}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0, y: [0, -8, 0] }}
              transition={{ type: "spring", damping: 10, y: { repeat: Infinity, duration: 2 } }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={mascotMood}
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.9 }}
                className="rounded-2xl bg-card border border-border px-4 py-2 text-xs text-foreground max-w-[200px] relative"
              >
                {mascotMessages[mascotMood]}
                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-card border-l border-b border-border" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden"
          whileHover={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.1)" }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute -top-6 -right-6 text-primary/20"
            animate={{ rotate: [0, 360] }}
            transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
          >
            <Sparkles className="h-16 w-16" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-xl font-bold text-foreground mb-1"
          >
            Welcome back! 🎉
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground mb-6"
          >
            Entra na tua conta para continuar a ganhar
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
            <Button
              variant="outline"
              className="w-full h-11 gap-3 border-border hover:bg-secondary rounded-xl"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? "A conectar..." : "Continuar com Google"}
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 gap-3 rounded-xl bg-black text-white border-black hover:bg-neutral-800 dark:bg-card dark:text-foreground dark:border-border dark:hover:bg-secondary"
              onClick={handleAppleLogin}
              disabled={appleLoading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {appleLoading ? "A conectar..." : "Continuar com Apple"}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="relative my-6"
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">ou</span>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Email</label>
              <div className="relative group">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === "email" ? "text-primary" : "text-muted-foreground"}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="seu@email.com"
                  required
                  className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Password</label>
              <div className="relative group">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focusedField === "password" ? "text-primary" : "text-muted-foreground"}`} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                  className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2 flex items-center gap-2"
                >
                  <span>😕</span> {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden"
              >
                {loading ? (
                  <>
                    <motion.div
                      className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    />
                    A entrar...
                  </>
                ) : (
                  <>
                    Sign in <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-5 text-center space-y-2"
          >
            <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Esqueceu a senha? 🔑
            </Link>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create account 🚀
              </Link>
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="mt-4 text-center"
        >
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Voltar ao site
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
