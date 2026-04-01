import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Users, Gift, Star, Check, Share2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Referral() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get referral code from profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .single();
      setReferralCode(prof?.referral_code || null);

      // Get referrals
      const { data: refs } = await supabase
        .from("referrals")
        .select("*, profiles!referrals_referred_id_fkey(display_name)")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      setReferrals(refs || []);

      // Get total points
      const { data: points } = await supabase
        .from("luck_points")
        .select("points")
        .eq("user_id", user.id);
      setTotalPoints(points?.reduce((s, p) => s + p.points, 0) || 0);
    };
    fetch();
  }, [user]);

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Bateu — Sorteios Premium",
        text: "Junta-te ao Bateu e ganha pontos para participar em sorteios incríveis! Usa o meu link:",
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-20 text-center">
          <Gift className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">Convida amigos, ganha pontos</h1>
          <p className="text-muted-foreground mb-6">Crie uma conta para começar a convidar amigos e acumular pontos</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => navigate("/login")} variant="outline">Entrar</Button>
            <Button onClick={() => navigate("/register")} className="glow-primary">Criar Conta</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const rewards = [
    { points: 50, reward: "1 bilhete grátis em sorteio diário" },
    { points: 150, reward: "3 bilhetes em qualquer sorteio gratuito" },
    { points: 500, reward: "Desconto de 20% em sorteio premium" },
    { points: 1000, reward: "Bilhete VIP em sorteio exclusivo" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-10">
          <Gift className="h-12 w-12 text-accent mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Convida & Ganha
          </h1>
          <p className="text-muted-foreground">
            Cada amigo que se regista com o teu link dá-te <span className="text-primary font-bold">50 pontos</span>. 
            Usa os pontos para participar em sorteios gratuitos!
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass">
              <CardContent className="p-5 text-center">
                <Star className="h-6 w-6 text-accent mx-auto mb-2" />
                <p className="font-display text-3xl font-bold text-foreground">{totalPoints}</p>
                <p className="text-xs text-muted-foreground">Pontos totais</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass">
              <CardContent className="p-5 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="font-display text-3xl font-bold text-foreground">{referrals.length}</p>
                <p className="text-xs text-muted-foreground">Amigos convidados</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass">
              <CardContent className="p-5 text-center">
                <Gift className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="font-display text-3xl font-bold text-foreground">{referrals.length * 50}</p>
                <p className="text-xs text-muted-foreground">Pontos de referral</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Share Link */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-xl mx-auto mb-10">
          <Card className="glass border-primary/20">
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-3">O teu link de convite</h2>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-secondary/50 border border-border px-4 py-2.5 text-sm text-foreground truncate">
                  {referralLink}
                </div>
                <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1 shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <Button onClick={handleShare} className="w-full mt-3 gap-2 glow-primary">
                <Share2 className="h-4 w-4" /> Partilhar com amigos
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Points Rewards */}
        <div className="grid gap-6 lg:grid-cols-2 max-w-4xl mx-auto">
          <Card className="glass">
            <CardHeader><CardTitle className="text-lg">O que podes ganhar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {rewards.map((r) => (
                <div key={r.points} className="flex items-center gap-3 rounded-xl bg-secondary/30 p-3">
                  <Badge className={`${totalPoints >= r.points ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {r.points} pts
                  </Badge>
                  <span className="text-sm text-foreground flex-1">{r.reward}</span>
                  {totalPoints >= r.points && <Check className="h-4 w-4 text-primary" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle className="text-lg">Amigos convidados</CardTitle></CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Ainda sem convites. Partilha o teu link!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                      <span className="text-sm text-foreground">{r.profiles?.display_name || "Utilizador"}</span>
                      <Badge className="bg-primary/20 text-primary">+{r.points_awarded} pts</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 max-w-2xl mx-auto">
          <h2 className="font-display text-xl font-bold text-foreground text-center mb-6">Como funciona</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {[
              { step: "1", text: "Partilha o teu link" },
              { step: "2", text: "O amigo regista-se" },
              { step: "3", text: "Ambos ganham 50 pontos" },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  {s.step}
                </div>
                <p className="text-sm text-foreground">{s.text}</p>
                {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
