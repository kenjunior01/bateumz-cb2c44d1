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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  Shield,
  Users,
  Plus,
  ArrowLeft,
  Trophy,
  TrendingUp,
  Edit3,
  Trash2,
  UserPlus,
  CheckCircle,
  Gamepad2,
  Star,
  Globe,
} from "lucide-react";
import {
  type EsportTeam,
  type TeamMember,
  getTeams,
  createTeam,
  updateTeam,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  calculateElo,
} from "@/lib/esports";

const sb: any = supabase;

const ROLE_LABELS: Record<string, string> = {
  capitao: "Capitao",
  jogador: "Jogador",
  suplente: "Suplente",
  treinador: "Treinador",
  gerente: "Gerente",
  membro: "Membro",
};

const ROLE_COLORS: Record<string, string> = {
  capitao: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  jogador: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suplente: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  treinador: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  gerente: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  membro: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

interface TeamForm {
  name: string;
  tag: string;
  description: string;
  country: string;
  discord_url: string;
  logo_url: string;
  banner_url: string;
}

const emptyForm: TeamForm = {
  name: "",
  tag: "",
  description: "",
  country: "",
  discord_url: "",
  logo_url: "",
  banner_url: "",
};

interface MemberProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function TeamManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<EsportTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<EsportTeam | null>(null);
  const [members, setMembers] = useState<(TeamMember & MemberProfile)[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [form, setForm] = useState<TeamForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [champHistory, setChampHistory] = useState<any[]>([]);

  const loadTeams = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const myTeams = await getTeams({ limit: 50 });
      const owned = myTeams.filter((t) => t.owner_id === user.id);
      const memberTeamIds: string[] = [];
      const { data: myMemberships } = await sb
        .from("esport_team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (myMemberships) {
        for (const m of myMemberships) {
          if (!memberTeamIds.includes(m.team_id)) memberTeamIds.push(m.team_id);
        }
      }
      const memberTeams = myTeams.filter((t) => memberTeamIds.includes(t.id) && t.owner_id !== user.id);
      setTeams([...owned, ...memberTeams]);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const loadTeamDetail = useCallback(async (team: EsportTeam) => {
    setSelectedTeam(team);
    setMembersLoading(true);
    try {
      const teamMembers = await getTeamMembers(team.id);
      const profiles: MemberProfile[] = [];
      for (const m of teamMembers) {
        const { data: p } = await sb
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("user_id", m.user_id)
          .maybeSingle();
        if (p) profiles.push(p);
        else profiles.push({ id: m.user_id, display_name: "Desconhecido", avatar_url: null });
      }
      const merged = teamMembers.map((m, i) => ({
        ...m,
        ...profiles[i],
      }));
      setMembers(merged);
      const { data: history } = await sb
        .from("esport_champ_teams")
        .select("placement, prize_won, esport_championships(name, game_id, status)")
        .eq("team_id", team.id)
        .order("registered_at", { ascending: false })
        .limit(20);
      setChampHistory(history ?? []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message });
    } finally {
      setMembersLoading(false);
    }
  }, [toast]);

  const isOwner = selectedTeam?.owner_id === user?.id;

  const handleCreateTeam = async () => {
    if (!user || !form.name.trim() || !form.tag.trim()) {
      toast({ title: "Preencha os campos obrigatorios", description: "Nome e tag sao obrigatorios." });
      return;
    }
    if (form.tag.length < 3 || form.tag.length > 5) {
      toast({ title: "Tag invalida", description: "A tag deve ter entre 3 e 5 caracteres." });
      return;
    }
    setFormLoading(true);
    try {
      await createTeam({
        name: form.name,
        tag: form.tag,
        description: form.description || undefined,
        country: form.country || undefined,
        discord_url: form.discord_url || undefined,
        logo_url: form.logo_url || undefined,
        banner_url: form.banner_url || undefined,
        owner_id: user.id,
      });
      toast({ title: "Time criado com sucesso!" });
      setCreateOpen(false);
      setForm(emptyForm);
      loadTeams();
    } catch (err: any) {
      toast({ title: "Erro ao criar time", description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !form.name.trim() || !form.tag.trim()) return;
    setFormLoading(true);
    try {
      await updateTeam(selectedTeam.id, {
        name: form.name,
        tag: form.tag,
        description: form.description || null,
        country: form.country || null,
        discord_url: form.discord_url || null,
        logo_url: form.logo_url || null,
        banner_url: form.banner_url || null,
      });
      toast({ title: "Time atualizado!" });
      setEditOpen(false);
      loadTeams();
      loadTeamDetail({ ...selectedTeam, ...form });
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!selectedTeam) return;
    try {
      await removeTeamMember(selectedTeam.id, userId);
      toast({ title: "Membro removido" });
      loadTeamDetail(selectedTeam);
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message });
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      await updateTeamMemberRole(memberId, role);
      toast({ title: "Cargo atualizado" });
      if (selectedTeam) loadTeamDetail(selectedTeam);
    } catch (err: any) {
      toast({ title: "Erro ao alterar cargo", description: err.message });
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !addMemberQuery.trim()) return;
    setAddMemberLoading(true);
    try {
      const { data: found } = await sb
        .from("profiles")
        .select("user_id, display_name")
        .or(`display_name.ilike.%${addMemberQuery}%,user_id.eq.${addMemberQuery}`)
        .limit(1)
        .single();
      if (!found) {
        toast({ title: "Usuario nao encontrado", description: "Verifique o nome ou ID." });
        setAddMemberLoading(false);
        return;
      }
      await addTeamMember(selectedTeam.id, { user_id: found.user_id });
      toast({ title: `${found.display_name || "Usuario"} adicionado ao time!` });
      setAddMemberOpen(false);
      setAddMemberQuery("");
      loadTeamDetail(selectedTeam);
    } catch (err: any) {
      toast({ title: "Erro ao adicionar", description: err.message });
    } finally {
      setAddMemberLoading(false);
    }
  };

  const openEditDialog = () => {
    if (!selectedTeam) return;
    setForm({
      name: selectedTeam.name,
      tag: selectedTeam.tag || "",
      description: selectedTeam.description || "",
      country: selectedTeam.country || "",
      discord_url: selectedTeam.discord_url || "",
      logo_url: selectedTeam.logo_url || "",
      banner_url: selectedTeam.banner_url || "",
    });
    setEditOpen(true);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 1600) return "text-red-400";
    if (rating >= 1400) return "text-orange-400";
    if (rating >= 1200) return "text-yellow-400";
    if (rating >= 1000) return "text-emerald-400";
    return "text-zinc-400";
  };

  const winRate = (w: number, l: number) => {
    const total = w + l;
    if (total === 0) return "0%";
    return Math.round((w / total) * 100) + "%";
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <AnimatePresence mode="wait">
        {!selectedTeam ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="w-6 h-6 text-primary" />
                  Meus Times
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie suas equipas de esports
                </p>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Time
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Time</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Nome do Time *</Label>
                      <Input
                        placeholder="Ex: Lobos Ferozes"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tag (3-5 caracteres) *</Label>
                      <Input
                        placeholder="Ex: WLF"
                        maxLength={5}
                        className="uppercase"
                        value={form.tag}
                        onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descricao</Label>
                      <Textarea
                        placeholder="Descreva o seu time..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pais</Label>
                      <Input
                        placeholder="Ex: Brasil"
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL</Label>
                      <Input
                        placeholder="https://..."
                        value={form.logo_url}
                        onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Banner URL</Label>
                      <Input
                        placeholder="https://..."
                        value={form.banner_url}
                        onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discord URL</Label>
                      <Input
                        placeholder="https://discord.gg/..."
                        value={form.discord_url}
                        onChange={(e) => setForm({ ...form, discord_url: e.target.value })}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleCreateTeam}
                      disabled={formLoading}
                    >
                      {formLoading ? "Criando..." : "Criar Time"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {teams.length === 0 ? (
              <Card className="p-8 text-center">
                <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum time encontrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie o seu primeiro time de esports e comece a competir!
                </p>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Criar Time
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <motion.div
                    key={team.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className="cursor-pointer hover:border-primary/50 transition-all"
                      onClick={() => loadTeamDetail(team)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={team.logo_url || undefined} />
                            <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base flex items-center gap-2">
                              {team.name}
                              {team.is_verified && (
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              )}
                            </CardTitle>
                            {team.tag && (
                              <Badge variant="outline" className="text-xs font-mono">
                                [{team.tag}]
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Membros
                          </span>
                          <span className="font-medium">--</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5" />
                            V / D
                          </span>
                          <span className="font-medium">
                            {team.total_wins} / {team.total_losses}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Star className="w-3.5 h-3.5" />
                            Rating
                          </span>
                          <Badge
                            variant="secondary"
                            className={getRatingColor(team.rating)}
                          >
                            {team.rating}
                          </Badge>
                        </div>
                        {team.owner_id === user?.id && (
                          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                            Dono
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Button variant="ghost" onClick={() => setSelectedTeam(null)} className="gap-2 mb-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Times
            </Button>

            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20 rounded-xl">
                  <AvatarImage src={selectedTeam.logo_url || undefined} />
                  <AvatarFallback className="text-2xl">{selectedTeam.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{selectedTeam.name}</h1>
                    {selectedTeam.is_verified && (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    )}
                    {selectedTeam.tag && (
                      <Badge variant="outline" className="font-mono">
                        [{selectedTeam.tag}]
                      </Badge>
                    )}
                  </div>
                  {selectedTeam.description && (
                    <p className="text-muted-foreground mt-1 text-sm max-w-lg">
                      {selectedTeam.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {selectedTeam.country && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        {selectedTeam.country}
                      </span>
                    )}
                    <span className={`font-semibold ${getRatingColor(selectedTeam.rating)}`}>
                      <Star className="w-3.5 h-3.5 inline mr-1" />
                      {selectedTeam.rating}
                    </span>
                  </div>
                  {isOwner && (
                    <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={openEditDialog}>
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar Time
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Elenco
                    </CardTitle>
                    {isOwner && (
                      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-2">
                            <UserPlus className="w-4 h-4" />
                            Adicionar Membro
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Adicionar Membro</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label>Nome de usuario ou ID</Label>
                              <Input
                                placeholder="Buscar usuario..."
                                value={addMemberQuery}
                                onChange={(e) => setAddMemberQuery(e.target.value)}
                              />
                            </div>
                            <Button
                              className="w-full"
                              onClick={handleAddMember}
                              disabled={addMemberLoading || !addMemberQuery.trim()}
                            >
                              {addMemberLoading ? "Adicionando..." : "Adicionar"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {membersLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-lg" />
                      ))
                    ) : members.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhum membro no time.
                      </p>
                    ) : (
                      members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={m.avatar_url || undefined} />
                            <AvatarFallback>{(m.display_name || "?").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {m.display_name || "Desconhecido"}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${ROLE_COLORS[m.role] || ROLE_COLORS.membro}`}
                              >
                                {ROLE_LABELS[m.role] || m.role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {m.game_username && <span>IGN: {m.game_username}</span>}
                              {m.game_uid && <span>UID: {m.game_uid}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOwner && m.user_id !== user?.id && (
                              <>
                                <Select
                                  value={m.role}
                                  onValueChange={(v) => handleChangeRole(m.id, v)}
                                >
                                  <SelectTrigger className="w-28 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                                      <SelectItem key={key} value={key} className="text-xs">
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => handleRemoveMember(m.id, m.user_id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Historico de Campeonatos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {champHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum campeonato participado ainda.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {champHistory.map((h, i) => {
                          const champ = h.esport_championships;
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div>
                                <p className="font-medium text-sm">{champ?.name || "Campeonato"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {h.placement ? `Colocacao: #${h.placement}` : "Em andamento"}
                                </p>
                              </div>
                              {h.prize_won && h.prize_won > 0 && (
                                <Badge className="bg-yellow-500/20 text-yellow-400">
                                  {h.prize_won.toLocaleString()} AOA
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Estatisticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Campeonatos</span>
                      <span className="font-semibold">{selectedTeam.total_tournaments}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Taxa de Vitoria</span>
                      <span className="font-semibold text-emerald-400">
                        {winRate(selectedTeam.total_wins, selectedTeam.total_losses)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Vitorias</span>
                      <span className="font-semibold text-emerald-400">{selectedTeam.total_wins}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Derrotas</span>
                      <span className="font-semibold text-red-400">{selectedTeam.total_losses}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ganhos Totais</span>
                      <span className="font-semibold text-yellow-400">
                        {selectedTeam.total_earnings.toLocaleString()} AOA
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rating Atual</span>
                      <span className={`font-bold text-lg ${getRatingColor(selectedTeam.rating)}`}>
                        {selectedTeam.rating}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {selectedTeam.discord_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <a
                        href={selectedTeam.discord_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block"
                      >
                        Discord do Time
                      </a>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome do Time *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tag (3-5 caracteres) *</Label>
              <Input
                maxLength={5}
                className="uppercase"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pais</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Banner URL</Label>
              <Input
                value={form.banner_url}
                onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Discord URL</Label>
              <Input
                value={form.discord_url}
                onChange={(e) => setForm({ ...form, discord_url: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleUpdateTeam} disabled={formLoading}>
              {formLoading ? "Salvando..." : "Salvar Alteracoes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
