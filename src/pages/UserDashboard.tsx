import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Gift, History, Trophy, Zap, ArrowRight, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface PointEntry {
  id: string;
  points: number;
  action: string;
  description: string | null;
  created_at: string;
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  reward_type: string;
  value: number;
}

interface RedeemedReward {
  id: string;
  points_spent: number;
  status: string;
  redeemed_at: string;
  rewards?: { title: string; reward_type: string } | null;
}

const actionLabels: Record<string, string> = {
  purchase: "Compra de bilhete",
  referral: "Indicação",
  daily_login: "Login diário",
  first_raffle: "Primeiro sorteio",
  streak: "Streak de participação",
  bonus: "Bónus especial",
};

const UserDashboard = () => {
  const { user } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [history, setHistory] = useState<PointEntry[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redeemed, setRedeemed] = useState<RedeemedReward[]>([]);
  const [loading, setLoading] = useState(true);

  const level = Math.floor(totalPoints / 500) + 1;
  const progressToNext = (totalPoints % 500) / 5;

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [pointsRes, rewardsRes, redeemedRes] = await Promise.all([
        supabase.from("luck_points").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("rewards").select("*").eq("is_active", true).order("points_cost", { ascending: true }),
        supabase.from("redeemed_rewards").select("*, rewards(title, reward_type)").eq("user_id", user.id).order("redeemed_at", { ascending: false }),
      ]);
      if (pointsRes.data) {
        setHistory(pointsRes.data);
        setTotalPoints(pointsRes.data.reduce((sum, p) => sum + p.points, 0));
      }
      if (rewardsRes.data) setRewards(rewardsRes.data);
      if (redeemedRes.data) {
        const mapped = redeemedRes.data.map((r: any) => ({
          ...r,
          rewards: Array.isArray(r.rewards) ? r.rewards[0] ?? null : r.rewards,
        }));
        setRedeemed(mapped);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleRedeem = async (reward: Reward) => {
    if (totalPoints < reward.points_cost) {
      toast.error("Pontos insuficientes!");
      return;
    }
    if (!user) return;
    const { error: redeemErr } = await supabase.from("redeemed_rewards").insert({
      user_id: user.id,
      reward_id: reward.id,
      points_spent: reward.points_cost,
    });
    if (redeemErr) { toast.error("Erro ao resgatar"); return; }
    const { error: pointsErr } = await supabase.from("luck_points").insert({
      user_id: user.id,
      points: -reward.points_cost,
      action: "redeem",
      description: `Resgatou: ${reward.title}`,
    });
    if (!pointsErr) {
      setTotalPoints((p) => p - reward.points_cost);
      toast.success(`${reward.title} resgatado com sucesso!`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 pt-4 lg:pt-28 pb-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-5 lg:mb-10">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">Meus Luck Points</h1>
          <p className="text-sm text-muted-foreground">Acumule pontos, suba de nível e resgate recompensas exclusivas.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4 lg:hidden">
          <Card className="glass border-primary/30 bg-gradient-to-br from-primary/15 via-card to-accent/10 overflow-hidden relative">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
                  <Star className="h-6 w-6 text-primary fill-primary/40" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total de Pontos</p>
                  <p className="font-display text-3xl font-bold text-foreground leading-none mt-0.5">{totalPoints.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Nível</p>
                  <p className="font-display text-2xl font-bold text-accent leading-none">{level}</p>
                </div>
              </div>
              <Progress value={progressToNext} className="h-2" />
              <p className="text-[11px] text-muted-foreground mt-1.5">{500 - (totalPoints % 500)} pts para o próximo nível</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="hidden lg:grid gap-4 md:grid-cols-3 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass border-primary/20 glow-primary">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
                  <Star className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pontos</p>
                  <p className="font-display text-3xl font-bold text-foreground">{totalPoints.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20">
                  <Zap className="h-7 w-7 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Nível {level}</p>
                  <Progress value={progressToNext} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{500 - (totalPoints % 500)} pts para o próximo</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Gift className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recompensas Resgatadas</p>
                  <p className="font-display text-3xl font-bold text-foreground">{redeemed.length}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 lg:hidden">
          <Card className="glass">
            <CardContent className="p-3 flex items-center gap-2.5">
              <Gift className="h-5 w-5 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Resgatadas</p>
                <p className="font-display text-lg font-bold text-foreground leading-none">{redeemed.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-3 flex items-center gap-2.5">
              <History className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Histórico</p>
                <p className="font-display text-lg font-bold text-foreground leading-none">{history.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rewards" className="space-y-6">
          <TabsList className="glass border border-border">
            <TabsTrigger value="rewards" className="gap-2"><Gift className="h-4 w-4" /> Recompensas</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
            <TabsTrigger value="redeemed" className="gap-2"><Trophy className="h-4 w-4" /> Resgatados</TabsTrigger>
          </TabsList>

          <TabsContent value="rewards">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">Nenhuma recompensa disponível de momento.</p>}
              {rewards.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass hover:border-primary/30 transition-colors group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{r.title}</CardTitle>
                        <Badge variant="outline" className="border-accent/50 text-accent">{r.points_cost} pts</Badge>
                      </div>
                      {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => handleRedeem(r)} disabled={totalPoints < r.points_cost} className="w-full gap-2 group-hover:glow-primary">
                        <Gift className="h-4 w-4" />
                        {totalPoints >= r.points_cost ? "Resgatar" : "Pontos insuficientes"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="glass">
              <CardContent className="p-0">
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-10">Nenhum histórico de pontos.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {history.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${entry.points > 0 ? "bg-primary/20" : "bg-destructive/20"}`}>
                            {entry.points > 0 ? <Star className="h-4 w-4 text-primary" /> : <Gift className="h-4 w-4 text-destructive" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{actionLabels[entry.action] || entry.action}</p>
                            {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-display font-bold ${entry.points > 0 ? "text-primary" : "text-destructive"}`}>
                            {entry.points > 0 ? "+" : ""}{entry.points}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redeemed">
            <Card className="glass">
              <CardContent className="p-0">
                {redeemed.length === 0 ? (
                  <p className="text-muted-foreground text-center py-10">Nenhuma recompensa resgatada.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {redeemed.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                            <Trophy className="h-4 w-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{r.rewards?.title || "Recompensa"}</p>
                            <p className="text-xs text-muted-foreground">-{r.points_spent} pontos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status === "active" ? "Ativo" : r.status}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(r.redeemed_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default UserDashboard;
