import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, X, Eye, Clock, Users, Search, Filter, CheckCircle2,
  AlertCircle, Camera, Instagram, Youtube, Music2, Share2, MessageCircle,
  Crown, Shield, Loader2, ChevronDown, Trophy, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Entry {
  id: string;
  raffle_id: string;
  user_id: string;
  social_username: string | null;
  missions_completed: string[];
  proofs: { mission_key: string; url: string }[];
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Raffle {
  id: string;
  title: string;
  social_actions: any[];
  total_tickets: number;
}

const platformIcons: Record<string, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  facebook: MessageCircle,
  twitter: Share2,
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendente", color: "text-amber-500", bg: "bg-amber-500/10" },
  under_review: { label: "Em Análise", color: "text-blue-500", bg: "bg-blue-500/10" },
  approved: { label: "Aprovado", color: "text-primary", bg: "bg-primary/10" },
  rejected: { label: "Rejeitado", color: "text-destructive", bg: "bg-destructive/10" },
};

export default function SocialRaffleManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [proofViewUrl, setProofViewUrl] = useState<string | null>(null);
  const [drawingWinner, setDrawingWinner] = useState(false);
  const [winner, setWinner] = useState<any>(null);

  useEffect(() => {
    if (!id || !user) return;
    const fetchData = async () => {
      const [raffleRes, entriesRes] = await Promise.all([
        supabase.from("raffles").select("id, title, social_actions, total_tickets").eq("id", id).single(),
        (supabase as any).from("social_raffle_entries").select("*").eq("raffle_id", id).order("created_at", { ascending: false }),
      ]);
      if (raffleRes.data) setRaffle(raffleRes.data as any);
      if (entriesRes.data) {
        setEntries(entriesRes.data as unknown as Entry[]);
        // Fetch profiles
        const userIds = (entriesRes.data as unknown as Entry[]).map(e => e.user_id);
        if (userIds.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles").select("user_id, display_name").in("user_id", userIds);
          if (profileData) {
            const map: Record<string, string> = {};
            profileData.forEach(p => { map[p.user_id] = p.display_name || "Anónimo"; });
            setProfiles(map);
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  const handleApprove = async (entry: Entry) => {
    setProcessing(true);
    const { error } = await (supabase as any)
      .from("social_raffle_entries")
      .update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", entry.id);
    if (error) { toast.error("Erro: " + error.message); }
    else {
      toast.success(`✅ Participação de @${entry.social_username} aprovada!`);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "approved", reviewed_at: new Date().toISOString() } : e));
    }
    setProcessing(false);
    setSelectedEntry(null);
  };

  const handleReject = async (entry: Entry) => {
    if (!rejectionReason.trim()) { toast.error("Indique o motivo da rejeição"); return; }
    setProcessing(true);
    const { error } = await (supabase as any)
      .from("social_raffle_entries")
      .update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), rejection_reason: rejectionReason.trim() })
      .eq("id", entry.id);
    if (error) { toast.error("Erro: " + error.message); }
    else {
      toast.success(`Participação de @${entry.social_username} rejeitada.`);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "rejected", rejection_reason: rejectionReason.trim() } : e));
    }
    setProcessing(false);
    setSelectedEntry(null);
    setRejectionReason("");
  };

  const handleBulkApprove = async () => {
    const pending = filteredEntries.filter(e => e.status === "pending");
    if (pending.length === 0) return;
    setProcessing(true);
    const ids = pending.map(e => e.id);
    const { error } = await (supabase as any)
      .from("social_raffle_entries")
      .update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .in("id", ids);
    if (error) { toast.error("Erro: " + error.message); }
    else {
      toast.success(`✅ ${pending.length} participações aprovadas!`);
      setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: "approved" } : e));
    }
    setProcessing(false);
  };

  const filteredEntries = entries.filter(e => {
    if (filter !== "all" && e.status !== filter) return false;
    if (search && !e.social_username?.toLowerCase().includes(search.toLowerCase())
      && !profiles[e.user_id]?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: entries.length,
    pending: entries.filter(e => e.status === "pending").length,
    approved: entries.filter(e => e.status === "approved").length,
    rejected: entries.filter(e => e.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/dashboard/raffles")}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Gestão Social</h1>
          <p className="text-sm text-muted-foreground">{raffle?.title} — Verificar participações</p>
        </div>
        {stats.pending > 0 && (
          <Button onClick={handleBulkApprove} disabled={processing} size="sm" className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Aprovar Todos ({stats.pending})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
          { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: "Aprovados", value: stats.approved, icon: CheckCircle2, color: "text-primary" },
          { label: "Rejeitados", value: stats.rejected, icon: AlertCircle, color: "text-destructive" },
        ].map((s, i) => (
          <Card key={i} className="glass">
            <CardContent className="p-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por username..." className="pl-10 bg-secondary/50" />
        </div>
        <div className="flex gap-1.5">
          {[
            { id: "all", label: "Todos" },
            { id: "pending", label: "Pendentes" },
            { id: "approved", label: "Aprovados" },
            { id: "rejected", label: "Rejeitados" },
          ].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                filter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Entry List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 && (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma participação encontrada</p>
            </CardContent>
          </Card>
        )}

        {filteredEntries.map((entry) => {
          const st = statusConfig[entry.status] || statusConfig.pending;
          return (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {(entry.social_username || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">@{entry.social_username || "—"}</p>
                        <Badge className={`${st.bg} ${st.color} border-0 text-[10px]`}>{st.label}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {profiles[entry.user_id] || "Utilizador"} • {entry.missions_completed?.length || 0} missões •{" "}
                        {entry.proofs?.length || 0} comprovativos
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setSelectedEntry(entry)} className="gap-1">
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </Button>
                      {entry.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => handleApprove(entry)} disabled={processing} className="gap-1 bg-primary">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setSelectedEntry(entry); setRejectionReason(""); }} disabled={processing} className="gap-1">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Proof thumbnails */}
                  {entry.proofs && entry.proofs.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {entry.proofs.map((proof, i) => (
                        <button key={i} onClick={() => setProofViewUrl(proof.url)}
                          className="shrink-0 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors">
                          <img src={proof.url} alt={`Prova ${i + 1}`} className="h-16 w-20 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Participação</DialogTitle>
            <DialogDescription>@{selectedEntry?.social_username} — {profiles[selectedEntry?.user_id || ""] || "Utilizador"}</DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge className={`${statusConfig[selectedEntry.status]?.bg} ${statusConfig[selectedEntry.status]?.color} border-0`}>
                  {statusConfig[selectedEntry.status]?.label}
                </Badge>
                {selectedEntry.rejection_reason && (
                  <p className="text-xs text-destructive">Motivo: {selectedEntry.rejection_reason}</p>
                )}
              </div>

              {/* Missions */}
              <div>
                <p className="text-sm font-bold text-foreground mb-2">Missões Completadas ({selectedEntry.missions_completed?.length || 0})</p>
                <div className="space-y-1.5">
                  {(raffle?.social_actions || []).map((sa: any, i: number) => {
                    const key = `${sa.platform}_${sa.action}`;
                    const done = selectedEntry.missions_completed?.includes(key);
                    const Icon = platformIcons[sa.platform] || Instagram;
                    return (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${done ? "bg-primary/5" : "bg-secondary/30"}`}>
                        <Icon className={`h-4 w-4 ${done ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs flex-1">{sa.action} — {sa.platform}</span>
                        {done ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground/50" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Proofs */}
              {selectedEntry.proofs && selectedEntry.proofs.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-foreground mb-2">Comprovativos ({selectedEntry.proofs.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEntry.proofs.map((proof, i) => (
                      <button key={i} onClick={() => setProofViewUrl(proof.url)}
                        className="rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all">
                        <img src={proof.url} alt={proof.mission_key} className="w-full h-32 object-cover" />
                        <div className="p-1.5 bg-secondary/50">
                          <p className="text-[10px] text-muted-foreground truncate">{proof.mission_key}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedEntry.status === "pending" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <Button onClick={() => handleApprove(selectedEntry)} disabled={processing} className="w-full gap-2">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Aprovar Participação
                  </Button>
                  <div className="space-y-2">
                    <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Motivo da rejeição (ex: screenshot não mostra que seguiu a página)" rows={2} />
                    <Button variant="destructive" onClick={() => handleReject(selectedEntry)} disabled={processing} className="w-full gap-2">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                      Rejeitar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof Lightbox */}
      <Dialog open={!!proofViewUrl} onOpenChange={() => setProofViewUrl(null)}>
        <DialogContent className="max-w-2xl p-2">
          <DialogHeader>
            <DialogTitle>Comprovativo</DialogTitle>
            <DialogDescription>Verifique se a acção foi realizada correctamente</DialogDescription>
          </DialogHeader>
          {proofViewUrl && (
            <img src={proofViewUrl} alt="Comprovativo" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
