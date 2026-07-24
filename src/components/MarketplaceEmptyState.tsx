import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Sparkles, Check, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const MarketplaceEmptyState = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(t("marketplace.empty.invalidEmail"));
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("newsletter_signups")
      .insert({ email: trimmed, country: "US", source: "marketplace" });
    setLoading(false);
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast.error(t("marketplace.empty.error"));
      return;
    }
    setSubmitted(true);
    toast.success(t("marketplace.empty.success"));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-8 text-center"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Ticket className="h-8 w-8 text-primary" />
      </div>
      <Sparkles className="mx-auto mb-2 h-6 w-6 text-accent" />
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">
        {t("marketplace.empty.title")}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {t("marketplace.empty.subtitle")}
      </p>

      {submitted ? (
        <div className="inline-flex items-center gap-2 rounded-xl bg-primary/15 px-5 py-3 text-sm font-semibold text-primary">
          <Check className="h-5 w-5" />
          {t("marketplace.empty.confirmed")}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto mb-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("marketplace.empty.emailPlaceholder")}
              className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Button type="submit" disabled={loading} className="shrink-0">
            {loading ? t("common.loading") : t("marketplace.empty.cta")}
          </Button>
        </form>
      )}

      <p className="text-xs text-muted-foreground">
        {t("marketplace.empty.orBrowse")}{" "}
        <Link to="/como-funciona" className="font-medium text-primary hover:underline">
          {t("footer.howItWorks")}
        </Link>
      </p>
    </motion.div>
  );
};

export default MarketplaceEmptyState;
