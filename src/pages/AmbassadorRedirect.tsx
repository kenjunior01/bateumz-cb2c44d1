import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { recordAmbassadorVisit } from "@/lib/ambassador";

/**
 * Public landing for ambassador links: /e/:businessId/:refCode
 * Records a unique visit (server-side dedup by IP+UA+visitorId+day) and
 * forwards to the company page (or the live hub if liveCode provided).
 */
const AmbassadorRedirect = () => {
  const { businessId, refCode } = useParams<{ businessId: string; refCode: string }>();
  const [params] = useSearchParams();
  const liveCode = params.get("live") || "";
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!refCode) { setError("Link inválido"); return; }
      try {
        await recordAmbassadorVisit(refCode, liveCode);
      } catch (e) {
        // Don't block navigation on tracking errors.
        console.warn("ambassador visit failed", e);
      }
      if (cancelled) return;
      const target = liveCode ? `/lives?code=${encodeURIComponent(liveCode)}&ref=${encodeURIComponent(refCode)}` : `/empresa/${businessId}?ref=${encodeURIComponent(refCode)}`;
      setTimeout(() => navigate(target, { replace: true }), 900);
    };
    run();
    return () => { cancelled = true; };
  }, [refCode, businessId, liveCode, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-emerald-500/5 px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-500 text-white mb-4 shadow-xl">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">A entrar na live…</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {error ? error : "Estás a ser convidado por um embaixador. A registar a tua visita…"}
        </p>
        {!error && <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" />}
      </motion.div>
    </div>
  );
};

export default AmbassadorRedirect;
