import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const StatsBar = () => {
  const [stats, setStats] = useState([
    { value: "0", suffix: "", label: "Awarded in prizes" },
    { value: "0", suffix: "", label: "Active participants" },
    { value: "100%", suffix: "", label: "Verifiable results" },
    { value: "0", suffix: "", label: "Raffles completed" },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      const [rafflesRes, participantsRes] = await Promise.all([
        supabase.from("raffles").select("prize_value, status, sold_tickets, ticket_price"),
        supabase.from("participants").select("id", { count: "exact", head: true }),
      ]);

      const raffles = rafflesRes.data || [];
      const completed = raffles.filter((r) => r.status === "completed");
      const totalPrizes = completed.reduce((s, r) => s + Number(r.prize_value || 0), 0);
      const totalCompleted = completed.length;
      const participantCount = participantsRes.count || 0;

      const formatNum = (n: number) => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
        if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
        return n.toLocaleString();
      };

      setStats([
        { value: formatNum(totalPrizes), suffix: " MZN", label: "Já entregues em prémios" },
        { value: formatNum(participantCount), suffix: "", label: "Participantes activos" },
        { value: "100%", suffix: "", label: "Dos resultados são verificáveis" },
        { value: totalCompleted.toLocaleString(), suffix: "+", label: "Sorteios realizados" },
      ]);
    };
    fetchStats();
  }, []);

  // Hide section if no real data yet (all numeric values are 0)
  const hasData = stats.some((s) => s.value !== "0" && s.value !== "100%");

  return (
    <section className="relative border-y border-border bg-card/50">
      <div className="container mx-auto grid grid-cols-2 gap-6 px-6 py-12 md:grid-cols-4">
        {stats.map((s, i) => {
          // Skip zero counters to avoid credibility issues
          const isZero = s.value === "0";
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="font-display text-3xl font-bold text-gradient-primary md:text-4xl">
                {isZero ? (
                  <span className="text-xl md:text-2xl text-muted-foreground">Em breve</span>
                ) : (
                  <>{s.value}<span className="text-2xl md:text-3xl">{s.suffix}</span></>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default StatsBar;
