import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Gift, Star, Users, Eye, Plus, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMZN } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface RaffleWinner {
  id: string;
  title: string;
  prize_title: string;
  prize_value: number;
  status: string;
  image_url: string | null;
  winner_ticket?: number;
  winner_name?: string;
}

export default function DashboardPrizes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<RaffleWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: rafflesData } = await supabase
        .from("raffles")
        .select("id, title, prize_title, prize_value, status, image_url")
        .eq("business_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!rafflesData) { setLoading(false); return; }

      const raffleIds = rafflesData.map(r => r.id);
      const { data: winners } = await supabase
        .from("participants")
        .select("raffle_id, ticket_number, user_id")
        .in("raffle_id", raffleIds)
        .eq("status", "winner");

      const winnerUserIds = winners?.map(w => w.user_id) || [];
      const { data: profiles } = winnerUserIds.length > 0
        ? await supabase.from("profiles_public").select("user_id, display_name").in("user_id", winnerUserIds)
        : { data: [] as any[] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      const winnerMap = new Map((winners || []).map((w: any) => [w.raffle_id, { ticket: w.ticket_number, name: profileMap.get(w.user_id) || "Anónimo" }]));

      setRaffles(rafflesData.map(r => ({
        ...r,
        winner_ticket: winnerMap.get(r.id)?.ticket,
        winner_name: winnerMap.get(r.id)?.name as string | undefined,
      })));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const completed = raffles.filter(r => r.status === "completed");
  const active = raffles.filter(r => r.status === "active");
  const totalPrizeValue = raffles.reduce((s, r) => s + Number(r.prize_value), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" /> Prémios & Vencedores
          </h1>
          <p className="text-sm text-muted-foreground">Gestão dos prémios dos seus sorteios e vencedores</p>
        </div>
        <Button onClick={() => navigate("/dashboard/raffles/create")} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Sorteio
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Valor Total em Prémios", value: formatMZN(totalPrizeValue), icon: Trophy, color: "text-primary bg-primary/10" },
          { label: "Sorteios Ativos", value: active.length, icon: Sparkles, color: "text-accent bg-accent/10" },
          { label: "Vencedores Escolhidos", value: completed.length, icon: Crown, color: "text-yellow-500 bg-yellow-500/10" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {completed.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-yellow-500" /> Vencedores Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completed.map((r) => (
                <div key={r.id} className="flex items-center gap-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 p-4">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.prize_title} · {formatMZN(Number(r.prize_value))}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      🎉 #{r.winner_ticket}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{r.winner_name}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> Prémios em Jogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : active.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum sorteio ativo no momento</p>
                <Button className="mt-4" onClick={() => navigate("/dashboard/raffles/create")}>
                  Criar Sorteio
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <div className="flex items-center gap-4 rounded-xl bg-secondary/30 p-4 hover:bg-secondary/50 transition-colors">
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.title} className="h-12 w-12 rounded-xl object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Gift className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.prize_title}</p>
                      </div>
                      <span className="font-display font-bold text-primary text-sm">{formatMZN(Number(r.prize_value))}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
