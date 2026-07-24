import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trophy, Plus, Settings, Trash2, Play, CheckCircle, Clock,
} from "lucide-react";
import TournamentCard from "@/components/tournaments/TournamentCard";
import {
  createTournament,
  updateTournamentStatus,
  type Tournament,
  type TournamentStatus,
} from "@/lib/tournaments";

interface CreateForm {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  prize_description: string;
  prize_value: string;
  currency: string;
  max_participants: string;
  rules: string;
}

const emptyForm: CreateForm = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  prize_description: "",
  prize_value: "",
  currency: "AOA",
  max_participants: "",
  rules: "",
};

export default function DashboardTournaments() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadTournaments = () => {
    if (!user) return;
    supabase
      .from("tournaments")
      .select("*")
      .eq("business_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTournaments((data ?? []) as Tournament[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadTournaments();
  }, [user]);

  const handleCreate = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast({ title: t("tournament.fillRequired"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createTournament({
        business_id: user!.id,
        name: form.name,
        description: form.description || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
        status: "draft",
        prize_description: form.prize_description || undefined,
        prize_value: form.prize_value ? Number(form.prize_value) : undefined,
        currency: form.currency || undefined,
        max_participants: form.max_participants ? Number(form.max_participants) : undefined,
        rules: form.rules || undefined,
      });
      toast({ title: t("tournament.createSuccess") });
      setForm(emptyForm);
      setShowCreate(false);
      loadTournaments();
    } catch {
      toast({ title: t("tournament.createError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: TournamentStatus) => {
    try {
      await updateTournamentStatus(id, status);
      loadTournaments();
      toast({ title: t("tournament.statusUpdated") });
    } catch {
      toast({ title: t("tournament.statusError"), variant: "destructive" });
    }
  };

  const update = (key: keyof CreateForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("tournament.manage")}</h1>
            <p className="text-xs text-muted-foreground">{t("tournament.manageDesc")}</p>
          </div>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("tournament.create")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("tournament.create")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>{t("tournament.formName")} *</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("tournament.formDescription")}</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("tournament.formStartDate")} *</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => update("start_date", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("tournament.formEndDate")} *</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => update("end_date", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("tournament.formPrizeDesc")}</Label>
                  <Input
                    value={form.prize_description}
                    onChange={(e) => update("prize_description", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>{t("tournament.formPrizeValue")}</Label>
                    <Input
                      type="number"
                      value={form.prize_value}
                      onChange={(e) => update("prize_value", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("tournament.formCurrency")}</Label>
                    <Input
                      value={form.currency}
                      onChange={(e) => update("currency", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("tournament.formMaxParticipants")}</Label>
                <Input
                  type="number"
                  value={form.max_participants}
                  onChange={(e) => update("max_participants", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("tournament.formRules")}</Label>
                <Textarea
                  rows={4}
                  value={form.rules}
                  onChange={(e) => update("rules", e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={submitting}>
                {submitting ? "..." : t("tournament.create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tournament list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("tournament.no_tournaments")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {tournaments.map((tourn) => (
              <motion.div
                key={tourn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Card>
                  <CardContent className="p-0">
                    <div
                      className="cursor-pointer"
                      onClick={() => navigate(`/tournaments/${tourn.id}`)}
                    >
                      <TournamentCard tournament={tourn} onClick={() => {}} />
                    </div>
                    {/* Actions bar */}
                    <div className="flex items-center justify-end gap-2 border-t border-border/50 px-4 py-2.5">
                      {tourn.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(tourn.id, "active")}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" />
                          {t("tournament.activate")}
                        </Button>
                      )}
                      {tourn.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(tourn.id, "completed")}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          {t("tournament.finalize")}
                        </Button>
                      )}
                      <Badge
                        variant={
                          tourn.status === "active"
                            ? "default"
                            : tourn.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[11px]"
                      >
                        {tourn.status === "active"
                          ? t("tournament.active")
                          : tourn.status === "completed"
                          ? t("tournament.completed")
                          : t("tournament.upcoming")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
