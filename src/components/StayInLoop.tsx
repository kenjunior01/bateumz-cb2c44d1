import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Sparkles, Check, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SPRING_BOUNCE = { type: "spring" as const, stiffness: 300, damping: 20 };

const StayInLoop = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Por favor, insira um email válido.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("newsletter_signups")
      .insert({ email: trimmed, country: "MZ", source: "landing" });
    setLoading(false);
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast.error("Algo correu mal. Tente novamente.");
      return;
    }
    setSubmitted(true);
    toast.success("Está dentro! Vamos enviar email quando o próximo prémio for lançado.");
  };

  return (
    <section className="relative py-20 holographic-bg overflow-hidden">
      <div className="nebula-blob nebula-blob-2" style={{ opacity: 0.4 }} />
      <div className="nebula-blob nebula-blob-3" style={{ opacity: 0.3 }} />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-8 md:p-10 text-center backdrop-blur-sm overflow-hidden"
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer-sweep_4s_ease-in-out_infinite]" />
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5, ...SPRING_BOUNCE }}
            className="relative"
          >
            <motion.div
              className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-red-500 flex items-center justify-center shadow-lg"
              animate={{ boxShadow: ["0 10px 30px hsl(var(--accent) / 0.3)", "0 10px 50px hsl(var(--accent) / 0.5)", "0 10px 30px hsl(var(--accent) / 0.3)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Bell className="h-7 w-7 text-white" />
            </motion.div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 relative"
          >
            Seja o primeiro a saber dos novos prémios
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-sm text-muted-foreground mb-8 relative"
          >
            Junte-se à lista exclusiva Bateu — seja o primeiro a saber quando prémios premium ficam disponíveis.
          </motion.p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING_BOUNCE}
              className="relative inline-flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-6 py-3.5 text-sm font-semibold text-emerald-500"
            >
              <Check className="h-5 w-5" />
              Está na lista. Fique atento ao seu email.
            </motion.div>
          ) : (
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-stretch gap-3 max-w-md mx-auto relative"
            >
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 flex-1 focus-within:border-primary/50 focus-within:shadow-[0_0_15px_hsl(var(--primary)/0.15)] transition-all duration-300">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="flex-1 bg-transparent py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_BOUNCE}
                className="region-cta rounded-xl px-7 py-3.5 text-sm font-bold transition-all glow-primary hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "A enviar..." : "Notificar-me"}
              </motion.button>
            </motion.form>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-5 text-[11px] text-muted-foreground relative"
          >
            Sem spam. Cancelar a qualquer momento. Pagamento seguro — os seus dados estão protegidos.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default StayInLoop;
