"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Trophy,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  MapPin,
  Settings,
  Zap,
  CircleDot,
  Clock,
} from "lucide-react";
import {
  type Championship,
  type ChampStatus,
  type EsportGame,
  type EsportMatch,
  type MatchFormat,
  type Platform,
  type TournamentFormat,
  type VerificationMethod,
  type RegionServer,
  type ChampTeam,
  type MatchPlacement,
  type MatchResultStatus,
  getChampionships,
  getChampionship,
  createChampionship,
  updateChampionship,
  updateChampionshipStatus,
  getEsportGames,
  getChampTeams,
  getChampMatches,
  getMatchPlacements,
  submitPlacements,
  reportMatchResult,
  updateMatchStatus,
  GAME_EMOJIS,
  STATUS_LABELS,
  FORMAT_LABELS,
  PLATFORM_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  VERIFICATION_LABELS,
  DEFAULT_BR_PLACEMENT_POINTS,
} from "@/lib/esports";

const sb: any = supabase;

const STEP_LABELS = ["Basico", "Jogo e Formato", "Registo", "Premios", "Regras e Config", "Visual e Stream"];

const STATUS_COLORS: Record<ChampStatus, string> = {
  draft: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  registration_open: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  registration_closed: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  check_in: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  live: "bg-red-500/20 text-red-400 border-red-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-500 border-zinc-500/30",
};

const MATCH_STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-500/20 text-zinc-300",
  in_progress: "bg-red-500/20 text-red-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  disputed: "bg-orange-500/20 text-orange-400",
  cancelled: "bg-zinc-500/20 text-zinc-500",
};

const REGION_SERVER_LABELS: Record<RegionServer, string> = {
  br: "Brasil",
  na: "America do Norte",
  eu: "Europa",
  asia: "Asia",
  latam: "America Latina",
};

interface ChampForm {
  name: string;
  description: string;
  cover_image_url: string;
  logo_url: string;
  game_id: string;
  match_format: MatchFormat;
  platform: Platform;
  tournament_format: TournamentFormat;
  best_of: number;
  total_rounds: number;
  max_teams: number;
  min_teams: number;
  max_players_per_team: number;
  registration_opens_at: string;
  registration_closes_at: string;
  check_in_opens_at: string;
  check_in_closes_at: string;
  starts_at: string;
  ends_at: string;
  require_team: boolean;
  prize_pool: number;
  currency: string;
  prize_description: string;
  prize_image_url: string;
  prize_p1: number;
  prize_p2: number;
  prize_p3: number;
  sponsorship_banners: { image_url: string; link: string }[];
  custom_rules: string;
  map_pool: string[];
  mode_config: string;
  points_per_kill: number;
  placement_points: Record<number, number>;
  verification_method: VerificationMethod;
  region_server: RegionServer;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  stream_url: string;
  stream_platform: string;
  secondary_stream_url: string;
  allow_spectating: boolean;
  allow_predictions: boolean;
  allow_trash_talk: boolean;
  is_featured: boolean;
}

const defaultForm = (): ChampForm => ({
  name: "",
  description: "",
  cover_image_url: "",
  logo_url: "",
  game_id: "",
  match_format: "squad",
  platform: "mobile",
  tournament_format: "single_elim",
  best_of: 1,
  total_rounds: 3,
  max_teams: 16,
  min_teams: 4,
  max_players_per_team: 4,
  registration_opens_at: "",
  registration_closes_at: "",
  check_in_opens_at: "",
  check_in_closes_at: "",
  starts_at: "",
  ends_at: "",
  require_team: true,
  prize_pool: 0,
  currency: "AOA",
  prize_description: "",
  prize_image_url: "",
  prize_p1: 60,
  prize_p2: 30,
  prize_p3: 10,
  sponsorship_banners: [],
  custom_rules: "",
  map_pool: [],
  mode_config: "",
  points_per_kill: 0,
  placement_points: { ...DEFAULT_BR_PLACEMENT_POINTS },
  verification_method: "screenshot",
  region_server: "br",
  primary_color: "#8b5cf6",
  secondary_color: "#1e1b4b",
  accent_color: "#f59e0b",
  stream_url: "",
  stream_platform: "twitch",
  secondary_stream_url: "",
  allow_spectating: true,
  allow_predictions: true,
  allow_trash_talk: true,
  is_featured: false,
});

export default function DashboardEsports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [champs, setChamps] = useState<Championship[]>([]);
  const [games, setGames] = useState<EsportGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChamp, setEditingChamp] = useState<Championship | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ChampForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [selectedChamp, setSelectedChamp] = useState<Championship | null>(null);
  const [matches, setMatches] = useState<EsportMatch[]>([]);
  const [champTeams, setChampTeams] = useState<ChampTeam[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [newMap, setNewMap] = useState("");
  const [newSponsor, setNewSponsor] = useState({ image_url: "", link: "" });
  const [brPlacements, setBrPlacements] = useState<Record<string, { placement: number; kills: number; deaths: number; damage_dealt: number }>>({});
  const [activeTab, setActiveTab] = useState("champs");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [myChamps, allGames] = await Promise.all([
        getChampionships({ creator_id: user.id, limit: 50 }),
        getEsportGames(),
      ]);
      setChamps(myChamps);
      setGames(allGames);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMatchManagement = useCallback(async (champ: Championship) => {
    setSelectedChamp(champ);
    setMatchLoading(true);
    setActiveTab("matches");
    try {
      const [m, ct] = await Promise.all([
        getChampMatches(champ.id),
        getChampTeams(champ.id),
      ]);
      setMatches(m);
      setChampTeams(ct);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    } finally {
      setMatchLoading(false);
    }
  }, [toast]);

  const gameMap = new Map(games.map((g) => [g.id, g]));

  const totalPrize = champs.reduce((s, c) => s + (c.prize_pool ?? 0), 0);
  const totalRegistered = champs.reduce((s, c) => s + (c.registered_teams ?? 0), 0);

  const openCreateDialog = () => {
    setEditingChamp(null);
    setForm(defaultForm());
    setStep(0);
    setDialogOpen(true);
  };

  const openEditDialog = (champ: Championship) => {
    setEditingChamp(champ);
    setForm({
      name: champ.name,
      description: champ.description || "",
      cover_image_url: champ.cover_image_url || "",
      logo_url: champ.logo_url || "",
      game_id: champ.game_id,
      match_format: champ.match_format,
      platform: champ.platform || "mobile",
      tournament_format: champ.tournament_format,
      best_of: champ.best_of,
      total_rounds: champ.total_rounds,
      max_teams: champ.max_teams,
      min_teams: champ.min_teams,
      max_players_per_team: champ.max_players_per_team,
      registration_opens_at: champ.registration_opens_at ? champ.registration_opens_at.slice(0, 16) : "",
      registration_closes_at: champ.registration_closes_at ? champ.registration_closes_at.slice(0, 16) : "",
      check_in_opens_at: champ.check_in_opens_at ? champ.check_in_opens_at.slice(0, 16) : "",
      check_in_closes_at: champ.check_in_closes_at ? champ.check_in_closes_at.slice(0, 16) : "",
      starts_at: champ.starts_at ? champ.starts_at.slice(0, 16) : "",
      ends_at: champ.ends_at ? champ.ends_at.slice(0, 16) : "",
      require_team: champ.require_team,
      prize_pool: champ.prize_pool,
      currency: champ.currency,
      prize_description: champ.prize_description || "",
      prize_image_url: champ.prize_image_url || "",
      prize_p1: champ.prize_distribution?.["1"] ?? 60,
      prize_p2: champ.prize_distribution?.["2"] ?? 30,
      prize_p3: champ.prize_distribution?.["3"] ?? 10,
      sponsorship_banners: (champ.sponsorship_banners as any[])?.map((s: any) => ({ image_url: s.image_url || s, link: s.link || "" })) || [],
      custom_rules: champ.custom_rules || "",
      map_pool: champ.map_pool || [],
      mode_config: champ.mode_config?.mode || "",
      points_per_kill: champ.points_per_kill,
      placement_points: champ.points_per_placement || { ...DEFAULT_BR_PLACEMENT_POINTS },
      verification_method: champ.verification_method || "screenshot",
      region_server: champ.region_server || "br",
      primary_color: champ.primary_color || "#8b5cf6",
      secondary_color: champ.secondary_color || "#1e1b4b",
      accent_color: champ.accent_color || "#f59e0b",
      stream_url: champ.stream_url || "",
      stream_platform: champ.stream_platform || "twitch",
      secondary_stream_url: champ.secondary_stream_url || "",
      allow_spectating: champ.allow_spectating,
      allow_predictions: champ.allow_predictions,
      allow_trash_talk: champ.allow_trash_talk,
      is_featured: champ.is_featured,
    });
    setStep(0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim() || !form.game_id) {
      toast({ title: "Preencha nome e jogo", description: "Campos obrigatorios." });
      return;
    }
    setSaving(true);
    try {
      const prize_distribution: Record<string, number> = {
        "1": form.prize_p1 / 100,
        "2": form.prize_p2 / 100,
        "3": form.prize_p3 / 100,
      };
      const payload: any = {
        name: form.name,
        description: form.description || null,
        cover_image_url: form.cover_image_url || null,
        logo_url: form.logo_url || null,
        game_id: form.game_id,
        match_format: form.match_format,
        platform: form.platform,
        tournament_format: form.tournament_format,
        best_of: form.best_of,
        total_rounds: form.total_rounds,
        max_teams: form.max_teams,
        min_teams: form.min_teams,
        max_players_per_team: form.max_players_per_team,
        registration_opens_at: form.registration_opens_at || null,
        registration_closes_at: form.registration_closes_at || null,
        check_in_opens_at: form.check_in_opens_at || null,
        check_in_closes_at: form.check_in_closes_at || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        require_team: form.require_team,
        prize_pool: form.prize_pool,
        currency: form.currency,
        prize_description: form.prize_description || null,
        prize_image_url: form.prize_image_url || null,
        prize_distribution,
        sponsorship_banners: form.sponsorship_banners,
        custom_rules: form.custom_rules || null,
        map_pool: form.map_pool,
        mode_config: form.mode_config ? { mode: form.mode_config } : null,
        points_per_kill: form.points_per_kill,
        points_per_placement: form.placement_points,
        verification_method: form.verification_method,
        region_server: form.region_server,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        stream_url: form.stream_url || null,
        stream_platform: form.stream_platform || null,
        secondary_stream_url: form.secondary_stream_url || null,
        allow_spectating: form.allow_spectating,
        allow_predictions: form.allow_predictions,
        allow_trash_talk: form.allow_trash_talk,
        is_featured: form.is_featured,
        creator_id: user.id,
        status: editingChamp ? editingChamp.status : ("draft" as ChampStatus),
        is_published: editingChamp ? editingChamp.is_published : false,
        is_public: editingChamp ? editingChamp.is_public : true,
      };
      if (editingChamp) {
        await updateChampionship(editingChamp.id, payload);
        toast({ title: "Campeonato atualizado!" });
      } else {
        await createChampionship(payload);
        toast({ title: "Campeonato criado!" });
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (champ: Championship, status: ChampStatus) => {
    try {
      await updateChampionshipStatus(champ.id, status);
      toast({ title: `Status alterado para: ${STATUS_LABELS[status]}` });
      loadData();
      if (selectedChamp?.id === champ.id) {
        loadMatchManagement({ ...champ, status });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    }
  };

  const handleDeleteChamp = async (champ: Championship) => {
    try {
      await sb.from("esport_championships").delete().eq("id", champ.id);
      toast({ title: "Campeonato eliminado" });
      loadData();
      if (selectedChamp?.id === champ.id) setSelectedChamp(null);
    } catch (err: any) {
      toast({ title: "Erro ao eliminar", description: err.message });
    }
  };

  const handleUpdateMatch = async (match: EsportMatch, data: any) => {
    try {
      const { error } = await sb.from("esport_matches").update({ ...data, updated_at: new Date().toISOString() }).eq("id", match.id);
      if (error) throw new Error(error.message);
      toast({ title: "Partida atualizada" });
      if (selectedChamp) loadMatchManagement(selectedChamp);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    }
  };

  const handleSetWinner = async (match: EsportMatch, winnerId: string) => {
    try {
      const loserId = match.team1_id === winnerId ? match.team2_id : match.team1_id;
      await reportMatchResult(match.id, {
        team1_score: match.team1_score ?? 0,
        team2_score: match.team2_score ?? 0,
        winner_id: winnerId,
        loser_id: loserId || null,
        completed_at: new Date().toISOString(),
      });
      toast({ title: "Vencedor definido!" });
      if (selectedChamp) loadMatchManagement(selectedChamp);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    }
  };

  const handleSubmitBRPlacements = async (match: EsportMatch) => {
    const placements = Object.entries(brPlacements).map(([ctId, d]) => ({
      champ_team_id: ctId,
      team_name: champTeams.find((ct) => ct.id === ctId)?.team_id ? champTeams.find((ct) => ct.id === ctId)?.player_name || "" : "",
      placement: d.placement,
      kills: d.kills,
      deaths: d.deaths,
      damage_dealt: d.damage_dealt,
    }));
    if (placements.length === 0) {
      toast({ title: "Preencha pelo menos uma colocacao" });
      return;
    }
    try {
      await submitPlacements(
        match.id,
        placements,
        selectedChamp?.points_per_placement || undefined,
        selectedChamp?.points_per_kill || undefined,
      );
      toast({ title: "Colocacoes enviadas!" });
      setBrPlacements({});
      if (selectedChamp) loadMatchManagement(selectedChamp);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    }
  };

  const groupedMatches: Record<number, EsportMatch[]> = {};
  for (const m of matches) {
    if (!groupedMatches[m.round_number]) groupedMatches[m.round_number] = [];
    groupedMatches[m.round_number].push(m);
  }

  const stepIndicator = (
    <div className="flex items-center justify-center gap-1 mb-8 px-2">
      {STEP_LABELS.map((label, i) => {
        const isCompleted = i < step;
        const isCurrent = i === step;
        return (
          <div key={i} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-6 sm:w-10 h-0.5 mx-1 ${i <= step ? "bg-emerald-500" : "bg-zinc-700"}`}
              />
            )}
            <button
              type="button"
              onClick={() => setStep(i)}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-zinc-700 text-zinc-400"
                }`}
              >
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] hidden sm:block ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderStep = () => {
    const f = form;
    const set = (patch: Partial<ChampForm>) => setForm({ ...f, ...patch });

    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Campeonato *</Label>
              <Input placeholder="Ex: Copa Bateu 2025" value={f.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea placeholder="Descreva o campeonato..." value={f.description} onChange={(e) => set({ description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Imagem de Capa URL</Label>
              <div className="flex gap-2">
                <Input placeholder="https://..." value={f.cover_image_url} onChange={(e) => set({ cover_image_url: e.target.value })} />
                <Button variant="outline" size="icon" className="shrink-0">
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <div className="flex gap-2">
                <Input placeholder="https://..." value={f.logo_url} onChange={(e) => set({ logo_url: e.target.value })} />
                <Button variant="outline" size="icon" className="shrink-0">
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jogo *</Label>
              <Select value={f.game_id} onValueChange={(v) => set({ game_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar jogo" /></SelectTrigger>
                <SelectContent>
                  {games.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {GAME_EMOJIS[g.slug] || "\uD83C\uDFAE"} {g.name} {g.genre ? `(${g.genre})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato de Partida</Label>
              <Select value={f.match_format} onValueChange={(v) => set({ match_format: v as MatchFormat })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={f.platform} onValueChange={(v) => set({ platform: v as Platform })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato do Torneio</Label>
              <Select value={f.tournament_format} onValueChange={(v) => set({ tournament_format: v as TournamentFormat })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TOURNAMENT_FORMAT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Best of</Label>
                <Select value={String(f.best_of)} onValueChange={(v) => set({ best_of: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 3, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>Bo{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total de Rodadas</Label>
                <Input type="number" min={1} value={f.total_rounds} onChange={(e) => set({ total_rounds: Number(e.target.value) || 1 })} />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Equipas</Label>
                <Select value={String(f.max_teams)} onValueChange={(v) => set({ max_teams: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[4, 8, 16, 32, 64, 128].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Equipas</Label>
                <Input type="number" min={2} value={f.min_teams} onChange={(e) => set({ min_teams: Number(e.target.value) || 2 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Jogadores por Equipa</Label>
              <Input type="number" min={1} max={10} value={f.max_players_per_team} onChange={(e) => set({ max_players_per_team: Number(e.target.value) || 1 })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Abertura Inscricoes</Label>
                <Input type="datetime-local" value={f.registration_opens_at} onChange={(e) => set({ registration_opens_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fecho Inscricoes</Label>
                <Input type="datetime-local" value={f.registration_closes_at} onChange={(e) => set({ registration_closes_at: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Abre</Label>
                <Input type="datetime-local" value={f.check_in_opens_at} onChange={(e) => set({ check_in_opens_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Check-in Fecha</Label>
                <Input type="datetime-local" value={f.check_in_closes_at} onChange={(e) => set({ check_in_closes_at: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inicio</Label>
                <Input type="datetime-local" value={f.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="datetime-local" value={f.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={f.require_team} onCheckedChange={(v) => set({ require_team: v })} />
              <Label>Exigir equipa para inscricao</Label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Premio Total</Label>
                <Input type="number" min={0} value={f.prize_pool || ""} onChange={(e) => set({ prize_pool: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={f.currency} onValueChange={(v) => set({ currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[
                      ["AOA", "AOA (Kwanza)"],
                      ["BRL", "BRL (Real)"],
                      ["USD", "USD (Dolar)"],
                      ["EUR", "EUR (Euro)"],
                    ].map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descricao do Premio</Label>
              <Textarea placeholder="Detalhes sobre os premios..." value={f.prize_description} onChange={(e) => set({ prize_description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Imagem do Premio URL</Label>
              <div className="flex gap-2">
                <Input placeholder="https://..." value={f.prize_image_url} onChange={(e) => set({ prize_image_url: e.target.value })} />
                <Button variant="outline" size="icon" className="shrink-0">
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Separator />
            <Label className="text-sm font-medium">Distribuicao de Premios (%)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">1o Lugar (%)</Label>
                <Input type="number" min={0} max={100} value={f.prize_p1} onChange={(e) => set({ prize_p1: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">2o Lugar (%)</Label>
                <Input type="number" min={0} max={100} value={f.prize_p2} onChange={(e) => set({ prize_p2: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">3o Lugar (%)</Label>
                <Input type="number" min={0} max={100} value={f.prize_p3} onChange={(e) => set({ prize_p3: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <Separator />
            <Label className="text-sm font-medium">Banners de Patrocinadores</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {f.sponsorship_banners.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Imagem URL" value={s.image_url} onChange={(e) => {
                    const updated = [...f.sponsorship_banners];
                    updated[i] = { ...s, image_url: e.target.value };
                    set({ sponsorship_banners: updated });
                  }} className="flex-1" />
                  <Input placeholder="Link" value={s.link} onChange={(e) => {
                    const updated = [...f.sponsorship_banners];
                    updated[i] = { ...s, link: e.target.value };
                    set({ sponsorship_banners: updated });
                  }} className="flex-1" />
                  <Button variant="ghost" size="icon" className="text-red-400 shrink-0" onClick={() => set({ sponsorship_banners: f.sponsorship_banners.filter((_, j) => j !== i) })}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Imagem URL do patrocinador" value={newSponsor.image_url} onChange={(e) => setNewSponsor({ ...newSponsor, image_url: e.target.value })} />
              <Input placeholder="Link" value={newSponsor.link} onChange={(e) => setNewSponsor({ ...newSponsor, link: e.target.value })} />
              <Button variant="outline" size="icon" className="shrink-0" onClick={() => {
                if (newSponsor.image_url.trim()) {
                  set({ sponsorship_banners: [...f.sponsorship_banners, { ...newSponsor }] });
                  setNewSponsor({ image_url: "", link: "" });
                }
              }}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Regras Personalizadas</Label>
              <Textarea placeholder="Regras do campeonato..." value={f.custom_rules} onChange={(e) => set({ custom_rules: e.target.value })} rows={4} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Map Pool</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {f.map_pool.map((m, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    <MapPin className="w-3 h-3" />
                    {m}
                    <button type="button" className="ml-1 hover:text-red-400" onClick={() => set({ map_pool: f.map_pool.filter((_, j) => j !== i) })}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Nome do mapa" value={newMap} onChange={(e) => setNewMap(e.target.value)} onKeyDown={(e) => {
                  if (e.key === "Enter" && newMap.trim()) {
                    set({ map_pool: [...f.map_pool, newMap.trim()] });
                    setNewMap("");
                  }
                }} />
                <Button variant="outline" onClick={() => {
                  if (newMap.trim()) {
                    set({ map_pool: [...f.map_pool, newMap.trim()] });
                    setNewMap("");
                  }
                }}>Adicionar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Modo de Jogo</Label>
              <Input placeholder="Ex: Ranked, Casual, Custom..." value={f.mode_config} onChange={(e) => set({ mode_config: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Pontos por Abate (BR)</Label>
              <Input type="number" min={0} value={f.points_per_kill} onChange={(e) => set({ points_per_kill: Number(e.target.value) || 0 })} />
            </div>
            <Separator />
            <Label className="text-sm font-medium">Pontos por Colocacao (BR)</Label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-6">#{p}</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 text-sm"
                    value={f.placement_points[p] ?? 0}
                    onChange={(e) => {
                      const updated = { ...f.placement_points, [p]: Number(e.target.value) || 0 };
                      set({ placement_points: updated });
                    }}
                  />
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Metodo de Verificacao</Label>
              <Select value={f.verification_method} onValueChange={(v) => set({ verification_method: v as VerificationMethod })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VERIFICATION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Servidor da Regiao</Label>
              <Select value={f.region_server} onValueChange={(v) => set({ region_server: v as RegionServer })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REGION_SERVER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Cores</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Cor Primaria</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={f.primary_color} onChange={(e) => set({ primary_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={f.primary_color} onChange={(e) => set({ primary_color: e.target.value })} className="flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cor Secundaria</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={f.secondary_color} onChange={(e) => set({ secondary_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={f.secondary_color} onChange={(e) => set({ secondary_color: e.target.value })} className="flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cor de Destaque</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={f.accent_color} onChange={(e) => set({ accent_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={f.accent_color} onChange={(e) => set({ accent_color: e.target.value })} className="flex-1 font-mono text-xs" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>URL da Transmissao</Label>
              <Input placeholder="https://twitch.tv/..." value={f.stream_url} onChange={(e) => set({ stream_url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Plataforma de Stream</Label>
              <Select value={f.stream_platform} onValueChange={(v) => set({ stream_platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitch">Twitch</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="trovo">Trovo</SelectItem>
                  <SelectItem value="kick">Kick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL de Stream Secundaria</Label>
              <Input placeholder="https://..." value={f.secondary_stream_url} onChange={(e) => set({ secondary_stream_url: e.target.value })} />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Permitir Espectadores</Label>
                <Switch checked={f.allow_spectating} onCheckedChange={(v) => set({ allow_spectating: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Permitir Palpites</Label>
                <Switch checked={f.allow_predictions} onCheckedChange={(v) => set({ allow_predictions: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Permitir Trash Talk</Label>
                <Switch checked={f.allow_trash_talk} onCheckedChange={(v) => set({ allow_trash_talk: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Campeonato em Destaque</Label>
                <Switch checked={f.is_featured} onCheckedChange={(v) => set({ is_featured: v })} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStatusActions = (champ: Championship) => {
    const actions: { label: string; icon: any; status: ChampStatus; variant?: "default" | "destructive" | "outline" }[] = [];
    if (champ.status === "draft") {
      actions.push({ label: "Abrir Inscricoes", icon: Users, status: "registration_open" });
    }
    if (champ.status === "registration_open") {
      actions.push({ label: "Iniciar Check-in", icon: Clock, status: "check_in" });
    }
    if (champ.status === "registration_closed" || champ.status === "check_in") {
      actions.push({ label: "Iniciar Campeonato", icon: Play, status: "live" });
    }
    if (champ.status === "live") {
      actions.push({ label: "Pausar", icon: Pause, status: "registration_closed", variant: "outline" });
      actions.push({ label: "Finalizar", icon: CheckCircle, status: "completed" });
    }
    if (champ.status !== "live" && champ.status !== "completed") {
      actions.push({ label: "Eliminar", icon: Trash2, status: "cancelled", variant: "destructive" });
    }
    return actions;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="champs" className="gap-2">
            <Trophy className="w-4 h-4" />
            Campeonatos
          </TabsTrigger>
          {selectedChamp && (
            <TabsTrigger value="matches" className="gap-2">
              <Settings className="w-4 h-4" />
              Partidas - {selectedChamp.name}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="champs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-7 h-7 text-primary" />
                Campeonatos Esports
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Crie e gerencie campeonatos competitivos
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white"
                  onClick={openCreateDialog}
                >
                  <Plus className="w-5 h-5" />
                  Criar Campeonato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingChamp ? "Editar Campeonato" : "Novo Campeonato"}
                  </DialogTitle>
                </DialogHeader>
                {stepIndicator}
                {renderStep()}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  {step < 5 ? (
                    <Button onClick={() => setStep(step + 1)} className="gap-2">
                      Proximo
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      <Zap className="w-4 h-4" />
                      {saving ? "Salvando..." : editingChamp ? "Salvar Alteracoes" : "Criar Campeonato"}
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-violet-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Meus Campeonatos</p>
                  <p className="text-xl font-bold">{champs.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Equipas Inscritas</p>
                  <p className="text-xl font-bold">{totalRegistered}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Premios Totais</p>
                  <p className="text-xl font-bold">{totalPrize.toLocaleString()} AOA</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {champs.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum campeonato criado</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Crie o seu primeiro campeonato de esports e comece a receber inscricoes!
              </p>
              <Button
                className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white"
                onClick={openCreateDialog}
              >
                <Plus className="w-4 h-4" />
                Criar Primeiro Campeonato
              </Button>
            </Card>
          ) : (
            <AnimatePresence>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {champs.map((champ) => {
                  const game = gameMap.get(champ.game_id);
                  const emoji = game ? (GAME_EMOJIS[game.slug] || "\uD83C\uDFAE") : "\uD83C\uDFAE";
                  return (
                    <motion.div
                      key={champ.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Card className="overflow-hidden hover:border-primary/40 transition-all">
                        <div
                          className="h-24"
                          style={{
                            background: champ.cover_image_url
                              ? `url(${champ.cover_image_url}) center/cover`
                              : `linear-gradient(135deg, ${champ.primary_color || "#8b5cf6"}, ${champ.secondary_color || "#1e1b4b"})`,
                          }}
                        />
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate">{champ.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm">{emoji}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {game?.name || "Jogo"}
                                </Badge>
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[champ.status]}`}>
                              {STATUS_LABELS[champ.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {champ.registered_teams}/{champ.max_teams}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {champ.starts_at
                                ? new Date(champ.starts_at).toLocaleDateString("pt-BR")
                                : "--"}
                            </span>
                          </div>
                          <div className="flex items-center flex-wrap gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => openEditDialog(champ)}
                            >
                              <Edit3 className="w-3 h-3" />
                              Editar
                            </Button>
                            {champ.status === "live" || champ.status === "check_in" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => loadMatchManagement(champ)}
                              >
                                <Eye className="w-3 h-3" />
                                Partidas
                              </Button>
                            ) : null}
                            {renderStatusActions(champ).map((action) => (
                              <Button
                                key={action.status}
                                variant={action.variant || "default"}
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleStatusChange(champ, action.status)}
                              >
                                <action.icon className="w-3 h-3" />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="matches">
          {selectedChamp && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Gestao de Partidas
                  </h2>
                  <p className="text-sm text-muted-foreground">Campeonato: {selectedChamp.name}</p>
                </div>
                <Badge variant="outline" className={STATUS_COLORS[selectedChamp.status]}>
                  {STATUS_LABELS[selectedChamp.status]}
                </Badge>
              </div>

              {matchLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : matches.length === 0 ? (
                <Card className="p-8 text-center">
                  <CircleDot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma partida encontrada</h3>
                  <p className="text-sm text-muted-foreground">
                    As partidas serao geradas quando o campeonato iniciar.
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedMatches).sort(([a], [b]) => Number(a) - Number(b)).map(([round, roundMatches]) => (
                    <Card key={round}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          Rodada {round}
                          <Badge variant="secondary" className="text-xs">
                            {roundMatches.length} {roundMatches.length === 1 ? "partida" : "partidas"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {roundMatches.map((match) => (
                          <div
                            key={match.id}
                            className="p-4 rounded-lg border bg-muted/30 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Partida #{match.match_number}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-xs ${MATCH_STATUS_COLORS[match.status]}`}>
                                  {match.status === "pending"
                                    ? "Pendente"
                                    : match.status === "in_progress"
                                    ? "Em Andamento"
                                    : match.status === "completed"
                                    ? "Concluida"
                                    : match.status === "disputed"
                                    ? "Disputada"
                                    : "Cancelada"}
                                </Badge>
                                {match.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 text-red-400"
                                    onClick={() => handleUpdateMatch(match, { status: "in_progress" as MatchResultStatus, result_status: "in_progress" as MatchResultStatus, started_at: new Date().toISOString() })}
                                  >
                                    <Play className="w-3 h-3" />
                                    Ao Vivo
                                  </Button>
                                )}
                              </div>
                            </div>

                            {selectedChamp.tournament_format === "battle_royale" ? (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">
                                  Resultados por colocacao (BR)
                                </p>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {champTeams.map((ct) => {
                                    const teamName = ct.player_name || ct.team_id || "--";
                                    const existing = brPlacements[ct.id];
                                    return (
                                      <div key={ct.id} className="flex items-center gap-2">
                                        <span className="text-xs w-28 truncate">{teamName}</span>
                                        <Input
                                          type="number"
                                          min={1}
                                          max={100}
                                          placeholder="#"
                                          className="w-16 h-7 text-xs"
                                          value={existing?.placement ?? ""}
                                          onChange={(e) =>
                                            setBrPlacements({
                                              ...brPlacements,
                                              [ct.id]: {
                                                placement: Number(e.target.value) || 0,
                                                kills: existing?.kills || 0,
                                                deaths: existing?.deaths || 0,
                                                damage_dealt: existing?.damage_dealt || 0,
                                              },
                                            })
                                          }
                                        />
                                        <Input
                                          type="number"
                                          min={0}
                                          placeholder="Kills"
                                          className="w-16 h-7 text-xs"
                                          value={existing?.kills ?? ""}
                                          onChange={(e) =>
                                            setBrPlacements({
                                              ...brPlacements,
                                              [ct.id]: {
                                                ...existing,
                                                placement: existing?.placement || 0,
                                                kills: Number(e.target.value) || 0,
                                              },
                                            })
                                          }
                                        />
                                        <Input
                                          type="number"
                                          min={0}
                                          placeholder="Deaths"
                                          className="w-16 h-7 text-xs"
                                          value={existing?.deaths ?? ""}
                                          onChange={(e) =>
                                            setBrPlacements({
                                              ...brPlacements,
                                              [ct.id]: {
                                                ...existing,
                                                placement: existing?.placement || 0,
                                                deaths: Number(e.target.value) || 0,
                                              },
                                            })
                                          }
                                        />
                                        <Input
                                          type="number"
                                          min={0}
                                          placeholder="Dano"
                                          className="w-20 h-7 text-xs"
                                          value={existing?.damage_dealt ?? ""}
                                          onChange={(e) =>
                                            setBrPlacements({
                                              ...brPlacements,
                                              [ct.id]: {
                                                ...existing,
                                                placement: existing?.placement || 0,
                                                damage_dealt: Number(e.target.value) || 0,
                                              },
                                            })
                                          }
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                <Button
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleSubmitBRPlacements(match)}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Enviar Resultados
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Equipa 1</p>
                                    <p className="font-medium text-sm truncate">
                                      {match.team1_name || "TBD"}
                                    </p>
                                  </div>
                                  <div className="space-y-1 text-right">
                                    <p className="text-xs text-muted-foreground">Equipa 2</p>
                                    <p className="font-medium text-sm truncate">
                                      {match.team2_name || "TBD"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-center gap-4">
                                  <Input
                                    type="number"
                                    min={0}
                                    className="w-16 h-9 text-center text-lg font-bold"
                                    value={match.team1_score ?? ""}
                                    onChange={(e) => handleUpdateMatch(match, { team1_score: Number(e.target.value) || null })}
                                  />
                                  <span className="text-sm font-bold text-muted-foreground">VS</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    className="w-16 h-9 text-center text-lg font-bold"
                                    value={match.team2_score ?? ""}
                                    onChange={(e) => handleUpdateMatch(match, { team2_score: Number(e.target.value) || null })}
                                  />
                                </div>
                                {match.team1_id && match.team2_id && (
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      size="sm"
                                      variant={match.winner_id === match.team1_id ? "default" : "outline"}
                                      className="text-xs"
                                      onClick={() => handleSetWinner(match, match.team1_id)}
                                    >
                                      {match.team1_name || "T1"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={match.winner_id === match.team2_id ? "default" : "outline"}
                                      className="text-xs"
                                      onClick={() => handleSetWinner(match, match.team2_id)}
                                    >
                                      {match.team2_name || "T2"}
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}

                            <Separator />

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Codigo da Sala</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Ex: ABC123"
                                  value={match.lobby_id || ""}
                                  onChange={(e) => handleUpdateMatch(match, { lobby_id: e.target.value || null })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Senha</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Senha"
                                  value={match.lobby_password || ""}
                                  onChange={(e) => handleUpdateMatch(match, { lobby_password: e.target.value || null })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Mapa</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Nome do mapa"
                                  value={match.map_name || ""}
                                  onChange={(e) => handleUpdateMatch(match, { map_name: e.target.value || null })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Modo</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Modo de jogo"
                                  value={match.mode_name || ""}
                                  onChange={(e) => handleUpdateMatch(match, { mode_name: e.target.value || null })}
                                />
                              </div>
                            </div>

                            {match.status === "disputed" && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                                <span className="text-xs text-orange-400">
                                  Partida disputada: {match.dispute_reason || "Sem motivo informado"}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
