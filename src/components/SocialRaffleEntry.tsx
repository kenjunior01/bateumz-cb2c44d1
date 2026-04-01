import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Instagram, Youtube, Music2, Check, Loader2, Trophy, Sparkles, Users, Share2, Heart, ArrowRight, Zap } from "lucide-react";
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

const platformConfig: Record<string, { icon: typeof Instagram; color: string; gradient: string; emoji: string }> = {
  instagram: { icon: Instagram, color: "text-pink-500", gradient: "from-purple-500 via-pink-500 to-orange-400", emoji: "📸" },
  youtube: { icon: Youtube, color: "text-red-500", gradient: "from-red-600 to-red-400", emoji: "🎬" },
  tiktok: { icon: Music2, color: "text-foreground", gradient: "from-cyan-400 via-pink-500 to-purple-500", emoji: "🎵" },
};

const actionLabels: Record<string, { label: string; icon: typeof Heart; verb: string }> = {
  follow: { label: "Seguir", icon: Users, verb: "Seguiu" },
  like: { label: "Curtir", icon: Heart, verb: "Curtiu" },
  subscribe: { label: "Subscrever", icon: ArrowRight, verb: "Subscreveu" },
  share: { label: "Partilhar", icon: Share2, verb: "Partilhou" },
};

export default function SocialRaffleEntry({ raffleId, socialActions, totalTickets, soldTickets }: Props) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [participation, setParticipation] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [animatingAction, setAnimatingAction] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(soldTickets);

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
  }, [user, raffleId]);

  const allCompleted = completedActions.length === socialActions.length && socialActions.length > 0;
  const progressPct = socialActions.length > 0 ? (completedActions.length / socialActions.length) * 100 : 0;

  const handleAction = async (action: SocialAction) => {
    const actionKey = `${action.platform}_${action.action}`;
    if (completedActions.includes(actionKey)) return;

    // Open URL in new tab
    if (action.url) {
      window.open(action.url, "_blank");
    }

    setAnimatingAction(actionKey);

    // Wait a moment for user to complete action
    await new Promise((r) => setTimeout(r, 1500));

    const newCompleted = [...completedActions, actionKey];
    setCompletedActions(newCompleted);
    setAnimatingAction(null);

    // Save progress
    if (user && username.trim()) {
      if (participation) {
        await supabase
          .from("social_participations")
          .update({ actions_completed: newCompleted, social_username: username.trim() })
          .eq("id", participation.id);
      }
    }

    // Check if all completed
    if (newCompleted.length === socialActions.length) {
      setTimeout(() => setShowSuccess(true), 500);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Faça login para participar");
      return;
    }
    if (!username.trim()) {
      toast.error("Insira o seu @username");
      return;
    }
    if (!allCompleted) {
      toast.error("Complete todas as acções sociais");
      return;
    }

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

      if (error) {
        toast.error("Erro ao registar participação");
        setSubmitting(false);
        return;
      }
      setParticipation(data);
    } else {
      await supabase
        .from("social_participations")
        .update({ actions_completed: completedActions, social_username: username.trim() })
        .eq("id", participation.id);
    }

    // Award luck points
    await supabase.from("luck_points").insert({
      user_id: user.id,
      points: 25,
      action: "social_engagement",
      description: `Participou no sorteio social — ${socialActions.length} acções completadas`,
      raffle_id: raffleId,
    });

    setParticipantCount((prev) => prev + 1);
    setSubmitting(false);
    setShowSuccess(true);
    toast.success("Participação registada! 🎉");
  };

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <Card className="glass border-primary/20 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" style={{ width: `${progressPct}%`, transition: "width 0.5s ease" }} />
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-bold text-foreground">Missões Sociais</h3>
            </div>
            <Badge variant="outline" className="text-xs">
              {completedActions.length}/{socialActions.length} completadas
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            Complete todas as missões para garantir a sua entrada no sorteio
          </p>
        </CardContent>
      </Card>

      {/* Username */}
      <Card className="glass">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Seu @username nas redes sociais
          </label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@seuusuario"
            className="bg-secondary/50 font-mono"
            disabled={!!participation?.verified}
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Usado para verificar que completou as acções. Use o mesmo nome em todas as plataformas.
          </p>
        </CardContent>
      </Card>

      {/* Social actions */}
      <div className="space-y-3">
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
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`glass transition-all ${completed ? "border-primary/30 bg-primary/5" : "hover:border-primary/20"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Platform icon with gradient bg */}
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                      <PlatformIcon className="h-6 w-6 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {config.emoji} {actionConfig.label} no {action.platform.charAt(0).toUpperCase() + action.platform.slice(1)}
                        </p>
                        {completed && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {action.label || `${actionConfig.label} a nossa página para ganhar entrada`}
                      </p>
                    </div>

                    {/* Action button */}
                    <Button
                      size="sm"
                      variant={completed ? "outline" : "default"}
                      disabled={completed || isAnimating}
                      onClick={() => handleAction(action)}
                      className={`shrink-0 gap-1.5 ${completed ? "border-primary/30 text-primary" : ""}`}
                    >
                      {isAnimating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : completed ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Feito
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

      {/* Participant count */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span><strong className="text-foreground">{participantCount}</strong> pessoas já participaram</span>
      </div>

      {/* Submit / Success */}
      <AnimatePresence mode="wait">
        {showSuccess || participation?.verified ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Card className="glass border-accent/30 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-accent via-primary to-accent" />
              <CardContent className="p-8">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.8 }}
                  className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 mb-4"
                >
                  <Trophy className="h-8 w-8 text-accent" />
                </motion.div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  {participation?.verified ? "✅ Participação Verificada!" : "🎉 Participação Registada!"}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {participation?.verified
                    ? "As suas acções foram verificadas. Está oficialmente no sorteio!"
                    : "Aguarde a verificação das suas acções sociais. Será notificado quando confirmado."}
                </p>
                <Badge className="bg-accent/20 text-accent">+25 Luck Points ganhos</Badge>

                {/* Animated particles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left: `${25 + Math.random() * 50}%`,
                      top: `${20 + Math.random() * 30}%`,
                      backgroundColor: i % 2 === 0 ? "hsl(var(--accent))" : "hsl(var(--primary))",
                    }}
                    initial={{ y: 0, opacity: 1, scale: 0 }}
                    animate={{ y: [0, -40, 10], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
                    transition={{ duration: 1.5, delay: i * 0.1 }}
                  />
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="submit">
            <Button
              onClick={handleSubmit}
              disabled={!allCompleted || !username.trim() || submitting}
              className="w-full h-14 text-base font-bold gap-2 glow-primary"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : allCompleted ? (
                <>
                  <Sparkles className="h-5 w-5" /> Confirmar Participação
                </>
              ) : (
                <>
                  Complete {socialActions.length - completedActions.length} missão(ões)
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How winner is selected */}
      <Card className="glass">
        <CardContent className="p-5">
          <h4 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" /> Como o vencedor é seleccionado?
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">1</span>
              <p>Todas as participações verificadas recebem um número sequencial automático</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">2</span>
              <p>Um algoritmo criptográfico gera o número vencedor de forma aleatória e imutável</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold shrink-0 mt-0.5">3</span>
              <p>O resultado é registado na blockchain Polygon, verificável por qualquer pessoa</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold shrink-0 mt-0.5">⚡</span>
              <p><strong className="text-foreground">Bónus:</strong> Quem completa as missões mais rápido ganha +10% de chance extra!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
