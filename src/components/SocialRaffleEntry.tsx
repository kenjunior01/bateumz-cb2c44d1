import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram, Youtube, Music2, Check, Loader2, Trophy, Sparkles, Users,
  Share2, Heart, ArrowRight, Zap, Star, Crown, Shield, Clock, Gift,
  Flame, Target, Award, TrendingUp, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface SocialAction {
  platform: string;
  action: string;
  url?: string;
  label?: string;
}

interface Props {
  raffleId: string;
  socialActions: SocialAction[];
  totalTickets: number;
  soldTickets: number;
}

const platformConfig: Record<string, { icon: typeof Instagram; color: string; gradient: string; emoji: string; bg: string }> = {
  instagram: { icon: Instagram, color: "text-pink-500", gradient: "from-purple-600 via-pink-500 to-orange-400", emoji: "📸", bg: "bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-orange-400/20" },
  youtube: { icon: Youtube, color: "text-red-500", gradient: "from-red-600 to-red-400", emoji: "🎬", bg: "bg-red-500/10" },
  tiktok: { icon: Music2, color: "text-foreground", gradient: "from-cyan-400 via-pink-500 to-purple-500", emoji: "🎵", bg: "bg-gradient-to-br from-cyan-400/20 to-purple-500/20" },
  facebook: { icon: MessageCircle, color: "text-blue-500", gradient: "from-blue-600 to-blue-400", emoji: "👍", bg: "bg-blue-500/10" },
  twitter: { icon: Share2, color: "text-sky-500", gradient: "from-sky-500 to-blue-400", emoji: "🐦", bg: "bg-sky-500/10" },
};

const actionLabels: Record<string, { label: string; icon: typeof Heart; verb: string; points: number }> = {
  follow: { label: "Seguir", icon: Users, verb: "Seguiu", points: 10 },
  like: { label: "Curtir", icon: Heart, verb: "Curtiu", points: 5 },
  subscribe: { label: "Subscrever", icon: ArrowRight, verb: "Subscreveu", points: 15 },
  share: { label: "Partilhar", icon: Share2, verb: "Partilhou", points: 20 },
  comment: { label: "Comentar", icon: MessageCircle, verb: "Comentou", points: 15 },
};

const TIER_CONFIG = [
  { min: 0, label: "Iniciante", color: "text-muted-foreground", icon: Star, multiplier: "1x" },
  { min: 50, label: "Engajado", color: "text-blue-500", icon: Flame, multiplier: "1.5x" },
  { min: 75, label: "Super Fã", color: "text-accent", icon: Crown, multiplier: "2x" },
  { min: 100, label: "Lenda", color: "text-primary", icon: Award, multiplier: "3x" },
];

function getTier(pct: number) {
  return [...TIER_CONFIG].reverse().find(t => pct >= t.min) || TIER_CONFIG[0];
}

export default function SocialRaffleEntry({ raffleId, socialActions, totalTickets, soldTickets }: Props) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [participation, setParticipation] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [animatingAction, setAnimatingAction] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(soldTickets);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchParticipation = async () => {
      const { data } = await supabase
        .from("social_participations")
        .select("*")
        .eq("raffle_id", raffleId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setParticipation(data);
        setUsername(data.social_username || "");
        setCompletedActions((data.actions_completed as string[]) || []);
      }
    };
    fetchParticipation();

    // Count total social participants
    supabase.from("social_participations").select("id", { count: "exact", head: true })
      .eq("raffle_id", raffleId).then(({ count }) => {
        if (count) setParticipantCount(count);
      });
  }, [user, raffleId]);

  const allCompleted = completedActions.length === socialActions.length && socialActions.length > 0;
  const progressPct = socialActions.length > 0 ? (completedActions.length / socialActions.length) * 100 : 0;
  const tier = getTier(progressPct);
  const TierIcon = tier.icon;

  const totalPointsEarned = completedActions.reduce((sum, key) => {
    const action = key.split("_").slice(1).join("_");
    return sum + (actionLabels[action]?.points || 5);
  }, 0);

  const handleAction = async (action: SocialAction) => {
    const actionKey = `${action.platform}_${action.action}`;
    if (completedActions.includes(actionKey)) return;

    if (action.url) window.open(action.url, "_blank");

    setAnimatingAction(actionKey);
    await new Promise((r) => setTimeout(r, 2000));

    const newCompleted = [...completedActions, actionKey];
    setCompletedActions(newCompleted);
    setAnimatingAction(null);
    setStreak(s => s + 1);

    // Streak bonus notification
    if (newCompleted.length >= 2) {
      toast.success(`🔥 Combo x${newCompleted.length}! +${actionLabels[action.action]?.points || 5} pontos`, { duration: 2000 });
    }

    // Save progress
    if (user && username.trim()) {
      if (participation) {
        await supabase
          .from("social_participations")
          .update({ actions_completed: newCompleted, social_username: username.trim() })
          .eq("id", participation.id);
      }
    }

    if (newCompleted.length === socialActions.length) {
      setShowConfetti(true);
      setTimeout(() => setShowSuccess(true), 800);
    }
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Faça login para participar"); return; }
    if (!username.trim()) { toast.error("Insira o seu @username"); return; }
    if (!allCompleted) { toast.error("Complete todas as missões sociais"); return; }

    setSubmitting(true);

    if (!participation) {
      const { data, error } = await supabase
        .from("social_participations")
        .insert({
          raffle_id: raffleId,
          user_id: user.id,
          social_username: username.trim(),
          actions_completed: completedActions,
          verified: false,
        })
        .select()
        .single();

      if (error) { toast.error("Erro ao registar participação"); setSubmitting(false); return; }
      setParticipation(data);
    } else {
      await supabase
        .from("social_participations")
        .update({ actions_completed: completedActions, social_username: username.trim() })
        .eq("id", participation.id);
    }

    // Award luck points based on tier
    const bonusPoints = progressPct === 100 ? 50 : 25;
    await supabase.from("luck_points").insert({
      user_id: user.id,
      points: bonusPoints,
      action: "social_engagement",
      description: `Completou ${socialActions.length} missões sociais — Nível ${tier.label}`,
      raffle_id: raffleId,
    });

    setParticipantCount((prev) => prev + 1);
    setSubmitting(false);
    setShowSuccess(true);
    setShowConfetti(true);
    toast.success("🎉 Participação registada com sucesso!");
  };

  return (
    <div className="space-y-5 relative">
      {/* Confetti overlay */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5],
                }}
                initial={{ top: -20, rotate: 0, opacity: 1 }}
                animate={{ top: '110vh', rotate: 360 * (Math.random() > 0.5 ? 1 : -1), opacity: 0 }}
                transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, ease: "easeIn" }}
                onAnimationComplete={() => { if (i === 0) setShowConfetti(false); }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Hero Banner */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="relative bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
                >
                  <Target className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Missões Sociais</h3>
                  <p className="text-xs text-muted-foreground">Complete missões → Ganhe entrada gratuita</p>
                </div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Badge className={`${tier.color} bg-background/80 border gap-1 px-3 py-1.5`}>
                  <TierIcon className="h-3.5 w-3.5" />
                  <span className="font-bold">{tier.label}</span>
                  <span className="text-[10px] opacity-70">{tier.multiplier} chance</span>
                </Badge>
              </motion.div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{completedActions.length} de {socialActions.length} missões</span>
                <span className="font-bold text-foreground">{Math.round(progressPct)}%</span>
              </div>
              <div className="relative">
                <Progress value={progressPct} className="h-3" />
                {progressPct > 0 && progressPct < 100 && (
                  <motion.div
                    className="absolute top-0 h-3 w-3 rounded-full bg-white shadow-lg border-2 border-primary"
                    style={{ left: `calc(${progressPct}% - 6px)` }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-accent">
                  <Zap className="h-3 w-3" /> +{totalPointsEarned} pontos ganhos
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" /> {participantCount} participantes
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Username input */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
              <span className="text-lg">@</span>
            </div>
            <div className="flex-1">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seuusuario (sem @)"
                className="bg-secondary/50 font-mono h-9 text-sm"
                disabled={!!participation?.verified}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mission Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent" /> Missões Disponíveis
          </h4>
          {streak >= 2 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Badge variant="outline" className="text-accent border-accent/30 gap-1">
                <Flame className="h-3 w-3" /> Combo x{streak}!
              </Badge>
            </motion.div>
          )}
        </div>

        {socialActions.map((action, i) => {
          const actionKey = `${action.platform}_${action.action}`;
          const completed = completedActions.includes(actionKey);
          const isAnimating = animatingAction === actionKey;
          const config = platformConfig[action.platform] || platformConfig.instagram;
          const actionConfig = actionLabels[action.action] || actionLabels.follow;
          const ActionIcon = actionConfig.icon;
          const PlatformIcon = config.icon;

          return (
            <motion.div
              key={actionKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`overflow-hidden transition-all duration-300 ${
                completed
                  ? "border-primary/40 shadow-md shadow-primary/10"
                  : isAnimating
                    ? "border-accent/40 shadow-lg shadow-accent/20"
                    : "glass hover:border-primary/20 hover:shadow-md"
              }`}>
                {/* Animated top bar when completing */}
                {isAnimating && (
                  <motion.div
                    className="h-1 bg-gradient-to-r from-primary via-accent to-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "linear" }}
                  />
                )}
                {completed && <div className="h-1 bg-gradient-to-r from-primary to-accent" />}

                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Platform icon */}
                    <motion.div
                      className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-lg relative`}
                      animate={isAnimating ? { rotate: [0, 360], scale: [1, 1.1, 1] } : completed ? {} : {}}
                      transition={{ duration: 2, ease: "linear" }}
                    >
                      <PlatformIcon className="h-7 w-7 text-white" />
                      {completed && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary border-2 border-background flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {actionConfig.label} no {action.platform.charAt(0).toUpperCase() + action.platform.slice(1)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {action.label || `${actionConfig.label} para desbloquear entrada`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                          <Zap className="h-2.5 w-2.5 text-accent" /> +{actionConfig.points} pts
                        </Badge>
                        {i === 0 && !completed && (
                          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-accent/20 text-accent border-0">
                            Começar aqui
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <Button
                      size="sm"
                      variant={completed ? "outline" : "default"}
                      disabled={completed || isAnimating}
                      onClick={() => handleAction(action)}
                      className={`shrink-0 min-w-[100px] gap-1.5 ${
                        completed ? "border-primary/30 text-primary" :
                        isAnimating ? "bg-accent" : ""
                      }`}
                    >
                      {isAnimating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> A verificar...
                        </>
                      ) : completed ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Concluído
                        </>
                      ) : (
                        <>
                          <ActionIcon className="h-3.5 w-3.5" /> {actionConfig.label}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Submit / Success */}
      <AnimatePresence mode="wait">
        {showSuccess || participation?.verified ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl">
              <div className="h-1.5 bg-gradient-to-r from-accent via-primary to-accent" />
              <div className="relative bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-primary mb-4 shadow-2xl"
                >
                  <Trophy className="h-10 w-10 text-white" />
                </motion.div>

                <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                  {participation?.verified ? "✅ Verificado!" : "🎉 Participação Registada!"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  {participation?.verified
                    ? "As suas acções foram verificadas. Está oficialmente no sorteio com chances multiplicadas!"
                    : "A verificação das suas acções será feita em breve. Enquanto isso, partilhe com amigos para ganhar mais pontos!"}
                </p>

                <div className="flex items-center justify-center gap-3 mb-4">
                  <Badge className="bg-accent/20 text-accent border-0 gap-1 px-4 py-1.5">
                    <Zap className="h-4 w-4" /> +{progressPct === 100 ? 50 : 25} Luck Points
                  </Badge>
                  <Badge className={`${tier.color} bg-background border gap-1 px-4 py-1.5`}>
                    <TierIcon className="h-4 w-4" /> {tier.label} — {tier.multiplier}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-lg font-bold text-foreground">{completedActions.length}</p>
                    <p className="text-[10px] text-muted-foreground">Missões</p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-lg font-bold text-accent">{totalPointsEarned}</p>
                    <p className="text-[10px] text-muted-foreground">Pontos</p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-lg font-bold text-primary">{tier.multiplier}</p>
                    <p className="text-[10px] text-muted-foreground">Multiplicador</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="submit" className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={!allCompleted || !username.trim() || submitting}
              className="w-full h-14 text-base font-bold gap-2 glow-primary relative overflow-hidden"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : allCompleted ? (
                <>
                  <Sparkles className="h-5 w-5" /> Confirmar Participação — Nível {tier.label}
                </>
              ) : (
                <>
                  <Target className="h-5 w-5" /> Complete {socialActions.length - completedActions.length} missão(ões) restantes
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works - redesigned */}
      <Card className="glass overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-3 border-b border-border/50">
            <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Como funciona o Sorteio Social?
            </h4>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Target, color: "text-primary", bg: "bg-primary/10", title: "Complete Missões", desc: "Siga, curta e partilhe nas redes sociais para ganhar entrada" },
                { icon: TrendingUp, color: "text-accent", bg: "bg-accent/10", title: "Suba de Nível", desc: "Quanto mais missões, maior o seu multiplicador de chance" },
                { icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10", title: "Verificação Segura", desc: "As acções são verificadas para garantir participação legítima" },
                { icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10", title: "Vencedor Justo", desc: "Seleção aleatória verificável na blockchain Polygon" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                  <div className={`h-9 w-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-accent/5 border border-accent/10 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-accent">⚡ Sistema de Níveis:</strong> Iniciante (1x) → Engajado (1.5x) → Super Fã (2x) → Lenda (3x).
                Completar missões mais rápido pode te dar chances extra de ganhar!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
