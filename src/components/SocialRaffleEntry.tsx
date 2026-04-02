import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Instagram, Youtube, Music2, Check, Loader2, Trophy, Sparkles, Users,
  Share2, Heart, ArrowRight, Zap, Star, Crown, Shield, Clock,
  Flame, Target, Award, TrendingUp, MessageCircle, Upload, Camera, X,
  CheckCircle2, AlertCircle, Eye,
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
  requires_proof?: boolean;
  requires_approval?: boolean;
}

interface Props {
  raffleId: string;
  socialActions: SocialAction[];
  totalTickets: number;
  soldTickets: number;
}

const platformConfig: Record<string, { icon: typeof Instagram; color: string; gradient: string; emoji: string }> = {
  instagram: { icon: Instagram, color: "text-pink-500", gradient: "from-purple-600 via-pink-500 to-orange-400", emoji: "📸" },
  youtube: { icon: Youtube, color: "text-red-500", gradient: "from-red-600 to-red-400", emoji: "🎬" },
  tiktok: { icon: Music2, color: "text-foreground", gradient: "from-cyan-400 via-pink-500 to-purple-500", emoji: "🎵" },
  facebook: { icon: MessageCircle, color: "text-blue-500", gradient: "from-blue-600 to-blue-400", emoji: "👍" },
  twitter: { icon: Share2, color: "text-sky-500", gradient: "from-sky-500 to-blue-400", emoji: "🐦" },
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

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pendente", color: "text-amber-500", icon: Clock },
  under_review: { label: "Em Análise", color: "text-blue-500", icon: Eye },
  approved: { label: "Aprovado", color: "text-primary", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "text-destructive", icon: AlertCircle },
};

export default function SocialRaffleEntry({ raffleId, socialActions, totalTickets, soldTickets }: Props) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [proofFiles, setProofFiles] = useState<Record<string, File>>({});
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [entry, setEntry] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatingAction, setAnimatingAction] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(soldTickets);
  const [streak, setStreak] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement>>({});

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Check new social_raffle_entries table
      const { data } = await (supabase as any)
        .from("social_raffle_entries")
        .select("*")
        .eq("raffle_id", raffleId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEntry(data);
        setUsername(data.social_username || "");
        setCompletedActions((data.missions_completed as string[]) || []);
        const existingProofs = (data.proofs as any[]) || [];
        const urlMap: Record<string, string> = {};
        existingProofs.forEach((p: any) => { urlMap[p.mission_key] = p.url; });
        setProofUrls(urlMap);
      }
      // Count participants
      const { count } = await supabase
        .from("social_raffle_entries" as any)
        .select("id", { count: "exact", head: true })
        .eq("raffle_id", raffleId);
      if (count) setParticipantCount(count);
    };
    fetch();
  }, [user, raffleId]);

  const allCompleted = completedActions.length === socialActions.length && socialActions.length > 0;
  const progressPct = socialActions.length > 0 ? (completedActions.length / socialActions.length) * 100 : 0;
  const tier = getTier(progressPct);
  const TierIcon = tier.icon;

  const totalPointsEarned = completedActions.reduce((sum, key) => {
    const action = key.split("_").slice(1).join("_");
    return sum + (actionLabels[action]?.points || 5);
  }, 0);

  // Check if all proofs are provided for missions that require them
  const allProofsProvided = socialActions.every((sa) => {
    const key = `${sa.platform}_${sa.action}`;
    if (!sa.requires_proof) return true;
    return proofFiles[key] || proofUrls[key];
  });

  const needsApproval = socialActions.some(sa => sa.requires_approval);

  const handleAction = async (action: SocialAction) => {
    const actionKey = `${action.platform}_${action.action}`;
    if (completedActions.includes(actionKey)) return;
    if (action.url) window.open(action.url, "_blank");

    setAnimatingAction(actionKey);
    await new Promise((r) => setTimeout(r, 1500));

    const newCompleted = [...completedActions, actionKey];
    setCompletedActions(newCompleted);
    setAnimatingAction(null);
    setStreak(s => s + 1);

    if (newCompleted.length >= 2) {
      toast.success(`🔥 Combo x${newCompleted.length}! +${actionLabels[action.action]?.points || 5} pontos`, { duration: 2000 });
    }

    if (newCompleted.length === socialActions.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const handleProofUpload = (actionKey: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    setProofFiles(prev => ({ ...prev, [actionKey]: file }));
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Faça login para participar"); return; }
    if (!username.trim()) { toast.error("Insira o seu @username das redes sociais"); return; }
    if (!allCompleted) { toast.error("Complete todas as missões sociais"); return; }
    if (!allProofsProvided) { toast.error("Envie todos os comprovativos necessários"); return; }

    setSubmitting(true);

    // Upload proof files
    const uploadedProofs: { mission_key: string; url: string }[] = [];
    for (const [key, file] of Object.entries(proofFiles)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${raffleId}/${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("social-proofs").upload(path, file);
      if (error) { toast.error(`Erro ao enviar comprovativo: ${error.message}`); setSubmitting(false); return; }
      const { data: urlData } = supabase.storage.from("social-proofs").getPublicUrl(path);
      uploadedProofs.push({ mission_key: key, url: urlData.publicUrl });
    }
    // Keep previously uploaded proofs
    for (const [key, url] of Object.entries(proofUrls)) {
      if (!uploadedProofs.find(p => p.mission_key === key)) {
        uploadedProofs.push({ mission_key: key, url });
      }
    }

    const entryData = {
      raffle_id: raffleId,
      user_id: user.id,
      social_username: username.trim(),
      missions_completed: completedActions,
      proofs: uploadedProofs,
      status: needsApproval ? "pending" : "approved",
    };

    if (!entry) {
      const { data, error } = await supabase
        .from("social_raffle_entries" as any)
        .insert(entryData)
        .select()
        .single();
      if (error) { toast.error("Erro ao registar participação: " + error.message); setSubmitting(false); return; }
      setEntry(data);
    } else {
      const { error } = await supabase
        .from("social_raffle_entries" as any)
        .update({
          social_username: username.trim(),
          missions_completed: completedActions,
          proofs: uploadedProofs,
          status: needsApproval ? "pending" : "approved",
        })
        .eq("id", entry.id);
      if (error) { toast.error("Erro ao actualizar: " + error.message); setSubmitting(false); return; }
      setEntry({ ...entry, ...entryData });
    }

    // Award luck points
    const bonusPoints = progressPct === 100 ? 50 : 25;
    await supabase.from("luck_points").insert({
      user_id: user.id,
      points: bonusPoints,
      action: "social_engagement",
      description: `Completou ${socialActions.length} missões sociais — Nível ${tier.label}`,
      raffle_id: raffleId,
    });

    setParticipantCount(prev => prev + 1);
    setSubmitting(false);
    setShowConfetti(true);
    toast.success(needsApproval
      ? "🎉 Participação enviada! Aguarde a verificação do criador do sorteio."
      : "🎉 Participação confirmada automaticamente!"
    );
  };

  const entryStatus = entry?.status || null;
  const statusInfo = entryStatus ? STATUS_MAP[entryStatus] : null;
  const isEditable = !entryStatus || entryStatus === "pending" || entryStatus === "rejected";

  return (
    <div className="space-y-5 relative">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(30)].map((_, i) => (
              <motion.div key={i} className="absolute w-3 h-3 rounded-full"
                style={{ left: `${Math.random() * 100}%`, backgroundColor: ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5] }}
                initial={{ top: -20, rotate: 0, opacity: 1 }}
                animate={{ top: '110vh', rotate: 360 * (Math.random() > 0.5 ? 1 : -1), opacity: 0 }}
                transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5, ease: "easeIn" }}
                onAnimationComplete={() => { if (i === 0) setShowConfetti(false); }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Status Banner if already submitted */}
      {statusInfo && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`overflow-hidden border-0 shadow-lg`}>
            <div className={`h-1.5 bg-gradient-to-r ${entryStatus === 'approved' ? 'from-primary to-accent' : entryStatus === 'rejected' ? 'from-destructive to-destructive/50' : 'from-amber-500 to-amber-300'}`} />
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${entryStatus === 'approved' ? 'bg-primary/10' : entryStatus === 'rejected' ? 'bg-destructive/10' : 'bg-amber-500/10'}`}>
                  <statusInfo.icon className={`h-6 w-6 ${statusInfo.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground flex items-center gap-2">
                    Estado: {statusInfo.label}
                    <Badge className={`${statusInfo.color} bg-background border text-[10px]`}>{tier.label} — {tier.multiplier}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entryStatus === 'approved' && "A sua participação foi verificada! Está oficialmente no sorteio."}
                    {entryStatus === 'pending' && "Aguardando verificação pelo criador do sorteio. Você será notificado."}
                    {entryStatus === 'under_review' && "O criador está a analisar os seus comprovativos."}
                    {entryStatus === 'rejected' && `Motivo: ${entry?.rejection_reason || "Comprovativos insuficientes"}. Pode reenviar.`}
                  </p>
                </div>
              </div>
              {entryStatus === 'approved' && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-xl bg-secondary/50 p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{completedActions.length}</p>
                    <p className="text-[10px] text-muted-foreground">Missões</p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-3 text-center">
                    <p className="text-lg font-bold text-accent">{totalPointsEarned}</p>
                    <p className="text-[10px] text-muted-foreground">Pontos</p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-3 text-center">
                    <p className="text-lg font-bold text-primary">{tier.multiplier}</p>
                    <p className="text-[10px] text-muted-foreground">Multiplicador</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Hero Banner */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="relative bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                  className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Missões Sociais</h3>
                  <p className="text-xs text-muted-foreground">Complete as missões e envie comprovativos</p>
                </div>
              </div>
              <Badge className={`${tier.color} bg-background/80 border gap-1 px-3 py-1.5`}>
                <TierIcon className="h-3.5 w-3.5" />
                <span className="font-bold">{tier.label}</span>
                <span className="text-[10px] opacity-70">{tier.multiplier}</span>
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{completedActions.length} de {socialActions.length} missões</span>
                <span className="font-bold text-foreground">{Math.round(progressPct)}%</span>
              </div>
              <Progress value={progressPct} className="h-3" />
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-accent"><Zap className="h-3 w-3" /> +{totalPointsEarned} pontos</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" /> {participantCount} participantes</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Username */}
      {isEditable && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                <span className="text-lg">@</span>
              </div>
              <div className="flex-1">
                <Input value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="seuusuario (nas redes sociais)"
                  className="bg-secondary/50 font-mono h-9 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mission Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent" /> Missões & Regras
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
          const hasProof = proofFiles[actionKey] || proofUrls[actionKey];
          const requiresProof = action.requires_proof !== false; // default true

          return (
            <motion.div key={actionKey} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className={`overflow-hidden transition-all duration-300 ${
                completed ? "border-primary/40 shadow-md shadow-primary/10" : isAnimating ? "border-accent/40 shadow-lg" : "glass hover:border-primary/20"
              }`}>
                {isAnimating && (
                  <motion.div className="h-1 bg-gradient-to-r from-primary via-accent to-primary"
                    initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.5, ease: "linear" }} />
                )}
                {completed && <div className="h-1 bg-gradient-to-r from-primary to-accent" />}

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-lg relative`}
                      animate={isAnimating ? { rotate: [0, 360], scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1.5, ease: "linear" }}
                    >
                      <PlatformIcon className="h-7 w-7 text-white" />
                      {completed && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {actionConfig.label} no {action.platform.charAt(0).toUpperCase() + action.platform.slice(1)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {action.label || `${actionConfig.label} a conta/publicação indicada`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                          <Zap className="h-2.5 w-2.5 text-accent" /> +{actionConfig.points} pts
                        </Badge>
                        {requiresProof && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 border-amber-500/30 text-amber-600">
                            <Camera className="h-2.5 w-2.5" /> Comprovativo
                          </Badge>
                        )}
                        {action.requires_approval && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 border-blue-500/30 text-blue-500">
                            <Eye className="h-2.5 w-2.5" /> Revisão manual
                          </Badge>
                        )}
                      </div>
                    </div>

                    {isEditable && (
                      <Button size="sm" variant={completed ? "outline" : "default"}
                        disabled={completed || isAnimating}
                        onClick={() => handleAction(action)}
                        className={`shrink-0 min-w-[90px] gap-1.5 ${completed ? "border-primary/30 text-primary" : ""}`}>
                        {isAnimating ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificar...</> :
                          completed ? <><Check className="h-3.5 w-3.5" /> Feito</> :
                            <><ActionIcon className="h-3.5 w-3.5" /> {actionConfig.label}</>}
                      </Button>
                    )}
                  </div>

                  {/* Proof upload section */}
                  {requiresProof && completed && isEditable && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-accent" /> Envie o comprovativo (screenshot)
                      </p>
                      <input type="file" accept="image/*" className="hidden"
                        ref={(el) => { if (el) fileInputRefs.current[actionKey] = el; }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProofUpload(actionKey, f); }} />

                      {hasProof ? (
                        <div className="relative rounded-xl overflow-hidden border border-border bg-secondary/20">
                          <img
                            src={proofFiles[actionKey] ? URL.createObjectURL(proofFiles[actionKey]) : proofUrls[actionKey]}
                            alt="Comprovativo" className="w-full h-32 object-cover"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button onClick={() => {
                              const newFiles = { ...proofFiles };
                              delete newFiles[actionKey];
                              setProofFiles(newFiles);
                              const newUrls = { ...proofUrls };
                              delete newUrls[actionKey];
                              setProofUrls(newUrls);
                            }} className="h-7 w-7 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2">
                            <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1">
                              <Check className="h-3 w-3" /> Comprovativo enviado
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRefs.current[actionKey]?.click()}
                          className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/10 p-4 hover:border-primary/40 hover:bg-secondary/20 transition-all">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <div className="text-left">
                            <p className="text-xs font-medium text-foreground">Enviar screenshot</p>
                            <p className="text-[10px] text-muted-foreground">PNG, JPG até 5MB</p>
                          </div>
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Show existing proof if not editable */}
                  {requiresProof && !isEditable && proofUrls[actionKey] && (
                    <div className="border-t border-border pt-3">
                      <img src={proofUrls[actionKey]} alt="Comprovativo" className="w-full h-24 object-cover rounded-lg" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Submit Button */}
      {isEditable && (
        <motion.div className="space-y-3">
          <Button onClick={handleSubmit}
            disabled={!allCompleted || !username.trim() || submitting || !allProofsProvided}
            className="w-full h-14 text-base font-bold gap-2 glow-primary" size="lg">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> :
              !allCompleted ? <><Target className="h-5 w-5" /> Complete {socialActions.length - completedActions.length} missão(ões)</> :
                !allProofsProvided ? <><Camera className="h-5 w-5" /> Envie todos os comprovativos</> :
                  needsApproval ? <><Shield className="h-5 w-5" /> Enviar para Verificação</> :
                    <><Sparkles className="h-5 w-5" /> Confirmar Participação — {tier.label}</>}
          </Button>

          {needsApproval && allCompleted && allProofsProvided && (
            <p className="text-[11px] text-center text-muted-foreground">
              ⚠️ Este sorteio requer verificação manual. O criador irá analisar os seus comprovativos antes de aprovar a participação.
            </p>
          )}
        </motion.div>
      )}

      {/* How it works */}
      <Card className="glass overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-3 border-b border-border/50">
            <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Como funciona?
            </h4>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Target, color: "text-primary", bg: "bg-primary/10", title: "1. Complete Missões", desc: "Siga, curta e partilhe nas redes sociais conforme indicado" },
                { icon: Camera, color: "text-accent", bg: "bg-accent/10", title: "2. Envie Comprovativos", desc: "Tire screenshot de cada acção realizada como prova" },
                { icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10", title: "3. Verificação", desc: "O criador analisa os comprovativos e aprova a participação" },
                { icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10", title: "4. Vencedor Justo", desc: "Seleção aleatória entre todos os participantes aprovados" },
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
                Quanto mais missões completar, maior a chance de ganhar!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
