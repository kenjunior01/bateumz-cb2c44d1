import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trophy, Plus, Settings, Trash2, Play, UserPlus, Users, Eye,
  Clock, CheckCircle, Pause, Crown, Swords, Gamepad2, ScrollText, Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  createLeague,
  updateLeague,
  getLeagues,
  startLeague,
  openRegistration,
  completeLeague,
  FORMAT_LABELS,
  FORMAT_DESCRIPTIONS,
  type League,
  type LeagueFormat,
  type LeagueStatus,
} from "@/lib/leagues";

const sb: any = supabase;

const GAME_TYPES = [
  "Galo PRO", "Ligar 4", "Xadrez", "RPG Arena", "Battle Royale",
  "Damas", "Batalha Naval", "Domino", "Uno", "Jogo da Velha PRO",
  "Pedra Papel Tesoura", "Trivia Quiz", "Palavras Cruzadas", "Forca",
  "Memoria", "Velocidade de Reacao", "Digitacao", "Snake",
];

const FORMAT_OPTIONS: { value: LeagueFormat; label: string; desc: string }[] = [
  { value: "single_elimination", label: "Eliminacao Simples", desc: "Bracket eliminatorio. Perde uma vez e esta fora!" },
  { value: "double_elimination", label: "Eliminacao Dupla", desc: "Dois brackets. So elimina na segunda derrota." },
  { value: "round_robin", label: "Todos contra Todos", desc: "Cada jogador enfrenta todos. Classificacao por pontos." },
  { value: "swiss", label: "Sistema Suico", desc: "Emparceiramento por pontos. Mesmo numero de rondas." },
  { value: "battle_royale", label: "Battle Royale", desc: "Todos ao mesmo tempo. Ultimo a sobreviver vence." },
  { value: "rpg_championship", label: "Campeonato RPG", desc: "Bracket com classes RPG. Escolha sua classe e lute!" },
];

const MAX_PARTICIPANTS = [4, 8, 16, 32, 64];
const BEST_OF = [1, 3, 5];
const MAP_SIZES = ["Pequeno", "Medio", "Grande", "Enorme"];
const SHRINK_SPEEDS = ["Lento", "Normal", "Rapido", "Extremo"];

const STATUS_CONFIG: Record<LeagueStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-400", icon: <Clock className="h-3.5 w-3.5" /> },
  registration: { label: "Inscricoes Abertas", color: "bg-emerald-500/20 text-emerald-300", icon: <UserPlus className="h-3.5 w-3.5" /> },
  active: { label: "Em Curso", color: "bg-amber-500/20 text-amber-300", icon: <Play className="h-3.5 w-3.5" /> },
  paused: { label: "Pausado", color: "bg-orange-500/20 text-orange-300", icon: <Pause className="h-3.5 w-3.5" /> },
  completed: { label: "Finalizado", color: "bg-slate-500/20 text-slate-400", icon: <CheckCircle className="h-3.5 w-3.5" /> },
};

interface CreateForm {
  name: string;
  description: string;
  format: LeagueFormat;
  game_type: string;
  max_participants: string;
  best_of: string;
  registration_opens_at: string;
  registration_closes_at: string;
  prize_pool: string;
  currency: string;
  prize_description: string;
  primary_color: string;
  secondary_color: string;
  is_public: boolean;
  requires_approval: boolean;
  // RPG
  rpg_toggle_classes: boolean;
  rpg_max_level: string;
  rpg_banned_abilities: string;
  // BR
  br_map_size: string;
  br_shrink_speed: string;
  br_max_bots: string;
}

const emptyForm: CreateForm = {
  name: "",
  description: "",
  format: "single_elimination",
  game_type: "",
  max_participants: "16",
  best_of: "1",
  registration_opens_at: "",
  registration_closes_at: "",
  prize_pool: "",
  currency: "AOA",
  prize_description: "",
  primary_color: "#6d28d9",
  secondary_color: "#2563eb",
  is_public: true,
  requires_approval: false,
  rpg_toggle_classes: true,
  rpg_max_level: "30",
  rpg_banned_abilities: "",
  br_map_size: "Medio",
  br_shrink_speed: "Normal",
  br_max_bots: "20",
};

export default function DashboardLeagues() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const loadLeagues = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getLeagues({ creator_id: user.id });
      setLeagues(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeagues();
  }, [user]);

  const updateField = (field: keyof CreateForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user || !form.name.trim()) {
      toast({ title: "Preencha o nome da liga", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const rpgConfig: Record<string, any> = {};
      if (form.format === "rpg_championship") {
        rpgConfig.toggle_classes = form.rpg_toggle_classes;
        rpgConfig.max_level = Number(form.rpg_max_level) || 30;
        rpgConfig.banned_abilities = form.rpg_banned_abilities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const brConfig: Record<string, any> = {};
      if (form.format === "battle_royale") {
        brConfig.map_size = form.br_map_size;
        brConfig.shrink_speed = form.br_shrink_speed;
        brConfig.max_bots = Number(form.br_max_bots) || 20;
      }

      await createLeague({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        format: form.format,
        game_type: form.game_type,
        max_participants: Number(form.max_participants) || 16,
        wins_needed: Number(form.best_of) || 1,
        registration_opens_at: form.registration_opens_at || undefined,
        registration_closes_at: form.registration_closes_at || undefined,
        prize_pool: Number(form.prize_pool) || 0,
        currency: form.currency,
        prize_description: form.prize_description.trim() || undefined,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        is_public: form.is_public,
        requires_approval: form.requires_approval,
        rpg_config: rpgConfig,
        battle_royale_config: brConfig,
        creator_id: user.id,
      });

      toast({ title: "Liga criada com sucesso!" });
      setDialogOpen(false);
      setForm({ ...emptyForm });
      loadLeagues();
    } catch (e: any) {
      toast({ title: "Erro ao criar liga", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAction = async (leagueId: string, action: "start" | "register" | "complete") => {
    try {
      if (action === "start") await startLeague(leagueId);
      else if (action === "register") await openRegistration(leagueId);
      else if (action === "complete") await completeLeague(leagueId);
      toast({ title: "Liga actualizada!" });
      loadLeagues();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta liga?")) return;
    try {
      await sb.from("leagues").delete().eq("id", id);
      toast({ title: "Liga excluida." });
      loadLeagues();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] p-4 md:p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-purple-400" /> Minhas Ligas
          </h1>
          <p className="text-white/40 text-sm mt-1">Gerencie suas ligas e campeonatos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Criar Liga
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#12121e] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Nova Liga</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Nome *</Label>
                <Input
                  placeholder="Ex: Copa Bateu 2025"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Descricao</Label>
                <Textarea
                  placeholder="Descreva sua liga..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Formato</Label>
                  <Select value={form.format} onValueChange={(v) => updateField("format", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {FORMAT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value} className="text-white focus:bg-white/10">
                          <div>
                            <div className="font-medium text-xs">{f.label}</div>
                            <div className="text-[10px] text-white/40">{f.desc}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Tipo de Jogo</Label>
                  <Select value={form.game_type} onValueChange={(v) => updateField("game_type", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {GAME_TYPES.map((g) => (
                        <SelectItem key={g} value={g} className="text-white focus:bg-white/10">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Max Participantes</Label>
                  <Select value={form.max_participants} onValueChange={(v) => updateField("max_participants", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {MAX_PARTICIPANTS.map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-white focus:bg-white/10">
                          {n} jogadores
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Melhor de</Label>
                  <Select value={form.best_of} onValueChange={(v) => updateField("best_of", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {BEST_OF.map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-white focus:bg-white/10">
                          Melhor de {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Inscricoes abrem</Label>
                  <Input
                    type="datetime-local"
                    value={form.registration_opens_at}
                    onChange={(e) => updateField("registration_opens_at", e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Inscricoes fecham</Label>
                  <Input
                    type="datetime-local"
                    value={form.registration_closes_at}
                    onChange={(e) => updateField("registration_closes_at", e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Premio Total</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.prize_pool}
                    onChange={(e) => updateField("prize_pool", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Moeda</Label>
                  <Select value={form.currency} onValueChange={(v) => updateField("currency", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {[
                        { value: "AOA", label: "AOA (Kz)" },
                        { value: "BRL", label: "BRL (R$)" },
                        { value: "USD", label: "USD ($)" },
                        { value: "EUR", label: "EUR (e)" },
                      ].map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-white focus:bg-white/10">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Descricao do Premio</Label>
                  <Input
                    placeholder="Ex: Transferencia"
                    value={form.prize_description}
                    onChange={(e) => updateField("prize_description", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Cor Primaria</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="h-9 w-12 rounded border border-white/10 bg-transparent cursor-pointer"
                    />
                    <Input
                      value={form.primary_color}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="bg-white/5 border-white/10 text-white font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Cor Secundaria</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      className="h-9 w-12 rounded border border-white/10 bg-transparent cursor-pointer"
                    />
                    <Input
                      value={form.secondary_color}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      className="bg-white/5 border-white/10 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {form.format === "rpg_championship" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Separator className="bg-white/10 mb-4" />
                    <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                      <ScrollText className="h-4 w-4" /> Configuracao RPG
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <Label className="text-white/70 text-sm">Ativar classes</Label>
                        <button
                          type="button"
                          onClick={() => updateField("rpg_toggle_classes", !form.rpg_toggle_classes)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${form.rpg_toggle_classes ? "bg-purple-600" : "bg-white/20"}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.rpg_toggle_classes ? "translate-x-5" : ""}`}
                          />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm">Nivel Maximo</Label>
                        <Input
                          type="number"
                          value={form.rpg_max_level}
                          onChange={(e) => updateField("rpg_max_level", e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label className="text-white/70 text-sm">Habilidades Banidas (separadas por virgula)</Label>
                      <Input
                        placeholder="Ex: Teleporte, Invisibilidade"
                        value={form.rpg_banned_abilities}
                        onChange={(e) => updateField("rpg_banned_abilities", e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {form.format === "battle_royale" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Separator className="bg-white/10 mb-4" />
                    <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4" /> Configuracao Battle Royale
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm">Tamanho do Mapa</Label>
                        <Select value={form.br_map_size} onValueChange={(v) => updateField("br_map_size", v)}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a2e] border-white/10">
                            {MAP_SIZES.map((s) => (
                              <SelectItem key={s} value={s} className="text-white focus:bg-white/10">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm">Velocidade de Encolhimento</Label>
                        <Select value={form.br_shrink_speed} onValueChange={(v) => updateField("br_shrink_speed", v)}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a2e] border-white/10">
                            {SHRINK_SPEEDS.map((s) => (
                              <SelectItem key={s} value={s} className="text-white focus:bg-white/10">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/70 text-sm">Max Bots</Label>
                        <Input
                          type="number"
                          value={form.br_max_bots}
                          onChange={(e) => updateField("br_max_bots", e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Separator className="bg-white/10" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <Label className="text-white/70 text-sm">Publica</Label>
                    <p className="text-[10px] text-white/30">Visivel para todos</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("is_public", !form.is_public)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.is_public ? "bg-emerald-600" : "bg-white/20"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.is_public ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <Label className="text-white/70 text-sm">Requer Aprovacao</Label>
                    <p className="text-[10px] text-white/30">Aprovar jogadores manualmente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("requires_approval", !form.requires_approval)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.requires_approval ? "bg-amber-600" : "bg-white/20"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.requires_approval ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {submitting ? "Criando..." : "Criar Liga"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : leagues.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Trophy className="h-9 w-9 text-white/20" />
          </div>
          <h3 className="text-white/40 font-semibold text-lg mb-1">Nenhuma liga criada</h3>
          <p className="text-white/25 text-sm max-w-sm mb-4">
            Crie sua primeira liga e comece a organizar campeonatos incriveis.
          </p>
          <Button
            variant="outline"
            className="border-white/10 text-white/50 hover:bg-white/5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Criar Primeira Liga
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {leagues.map((league, i) => {
            const sc = STATUS_CONFIG[league.status];
            return (
              <motion.div
                key={league.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
                  <div
                    className="h-20 relative"
                    style={{
                      background: `linear-gradient(135deg, ${league.primary_color || "#6d28d9"}, ${league.secondary_color || "#2563eb"})`,
                    }}
                  />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-white text-sm font-semibold truncate">{league.name}</h3>
                        <p className="text-[11px] text-white/40">{FORMAT_LABELS[league.format]}</p>
                      </div>
                      <Badge className={`text-[10px] border-0 shrink-0 ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {league.current_participants}/{league.max_participants}
                      </span>
                      <span>{league.game_type}</span>
                    </div>

                    {league.prize_pool > 0 && (
                      <p className="text-xs text-amber-300/60 font-medium">
                        {league.prize_pool.toLocaleString()} {league.currency}
                      </p>
                    )}

                    <Separator className="bg-white/5" />

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-[11px] border-white/10 text-white/60 hover:bg-white/10"
                        onClick={() => navigate(`/leagues/${league.slug}`)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Ver
                      </Button>
                      {league.status === "draft" && (
                        <Button
                          size="sm"
                          className="flex-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleStatusAction(league.id, "register")}
                        >
                          <UserPlus className="h-3 w-3 mr-1" /> Abrir
                        </Button>
                      )}
                      {league.status === "registration" && (
                        <Button
                          size="sm"
                          className="flex-1 text-[11px] bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => handleStatusAction(league.id, "start")}
                        >
                          <Play className="h-3 w-3 mr-1" /> Iniciar
                        </Button>
                      )}
                      {league.status === "active" && (
                        <Button
                          size="sm"
                          className="flex-1 text-[11px] bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => handleStatusAction(league.id, "complete")}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Finalizar
                        </Button>
                      )}
                      {(league.status === "draft" || league.status === "completed") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[11px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(league.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
