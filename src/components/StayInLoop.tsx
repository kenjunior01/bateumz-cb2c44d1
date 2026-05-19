import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Landing-page "Stay in the loop" capture. Stores emails in newsletter_signups.
 * Used to announce upcoming drops and prize launches to US/CA users.
 */
const StayInLoop = () => {
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<"US" | "CA">("US");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("newsletter_signups")
      .insert({ email: trimmed, country, source: "landing" });
    setLoading(false);
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
    toast.success("You're in! We'll email you when the next drop goes live. 🎉");
  };

  return (
    <section className="relative py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-8 text-center backdrop-blur-sm"
        >
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-accent" />
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Get early access to every new drop
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Join the Bateu insider list — be the first to know when premium prizes go live across the US &amp; Canada.
          </p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary/15 px-5 py-3 text-sm font-semibold text-primary"
            >
              <Check className="h-5 w-5" />
              You're on the list. Watch your inbox.
            </motion.div>
          ) : (
            <form onSubmit={submit} className="flex flex-col sm:flex-row items-stretch gap-2 max-w-md mx-auto">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 flex-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as "US" | "CA")}
                  className="bg-transparent text-xs font-semibold text-muted-foreground outline-none"
                  aria-label="Country"
                >
                  <option value="US">US</option>
                  <option value="CA">CA</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all glow-primary hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Joining…" : "Notify me"}
              </button>
            </form>
          )}

          <p className="mt-4 text-[11px] text-muted-foreground">
            No spam. Unsubscribe anytime. PayPal-only checkout — your card stays with PayPal.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default StayInLoop;
