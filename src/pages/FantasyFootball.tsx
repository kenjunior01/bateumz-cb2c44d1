import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Users, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface FantasyTeam {
  id: string;
  team_name: string;
  description: string;
  league_type: string;
  points: number;
  players_count: number;
}

interface WorldCupTeam {
  id: string;
  team_name: string;
  flag_emoji: string;
  country_code: string;
}

interface Player {
  id: string;
  player_name: string;
  player_position: string;
  world_cup_team_id: string;
  points: number;
}

export default function FantasyFootball() {
  const { user, loading: authLoading } = useAuth();
  const { region } = useRegionalTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fantasyTeams, setFantasyTeams] = useState<FantasyTeam[]>([]);
  const [worldCupTeams, setWorldCupTeams] = useState<WorldCupTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("midfielder");
  const [newPlayerTeamId, setNewPlayerTeamId] = useState("");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load user's fantasy teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("fantasy_teams")
        .select("*")
        .eq("user_id", user!.id);

      if (teamsError) throw teamsError;

      // Count players for each team
      const teamsWithCount = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from("fantasy_team_players")
            .select("*", { count: "exact", head: true })
            .eq("fantasy_team_id", team.id);
          return { ...team, players_count: count || 0 };
        })
      );

      setFantasyTeams(teamsWithCount);
      if (teamsWithCount.length > 0) {
        setSelectedTeamId(teamsWithCount[0].id);
      }

      // Load world cup teams
      const { data: wcTeams, error: wcError } = await supabase
        .from("world_cup_teams")
        .select("id, team_name, flag_emoji, country_code")
        .order("team_name");

      if (wcError) throw wcError;
      setWorldCupTeams(wcTeams || []);
    } catch (error) {
      console.error("Error loading fantasy data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadTeamPlayers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from("fantasy_team_players")
        .select(`
          id,
          player_name,
          player_position,
          world_cup_team_id,
          points,
          world_cup_teams(team_name, flag_emoji)
        `)
        .eq("fantasy_team_id", teamId)
        .order("player_position");

      if (error) throw error;
      setTeamPlayers(data || []);
    } catch (error) {
      console.error("Error loading team players:", error);
      toast.error("Erro ao carregar jogadores");
    }
  };

  const createFantasyTeam = async () => {
    if (!user || !newTeamName.trim()) {
      toast.error("Nome do time é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("fantasy_teams")
        .insert({
          user_id: user.id,
          region_id: region?.id || "default-region-id",
          team_name: newTeamName,
          description: newTeamDescription,
          league_type: "public",
        })
        .select()
        .single();

      if (error) throw error;

      setFantasyTeams([...fantasyTeams, { ...data, players_count: 0 }]);
      setNewTeamName("");
      setNewTeamDescription("");
      toast.success("Time criado com sucesso!");
    } catch (error) {
      console.error("Error creating fantasy team:", error);
      toast.error("Erro ao criar time");
    } finally {
      setSaving(false);
    }
  };

  const addPlayerToTeam = async () => {
    if (!selectedTeamId || !newPlayerName.trim() || !newPlayerTeamId) {
      toast.error("Preencha todos os campos");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("fantasy_team_players")
        .insert({
          fantasy_team_id: selectedTeamId,
          player_name: newPlayerName,
          player_position: newPlayerPosition,
          world_cup_team_id: newPlayerTeamId,
        })
        .select()
        .single();

      if (error) throw error;

      setTeamPlayers([...teamPlayers, data]);
      setNewPlayerName("");
      setNewPlayerPosition("midfielder");
      setNewPlayerTeamId("");
      toast.success("Jogador adicionado!");
    } catch (error) {
      console.error("Error adding player:", error);
      toast.error("Erro ao adicionar jogador");
    } finally {
      setSaving(false);
    }
  };

  const deletePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from("fantasy_team_players")
        .delete()
        .eq("id", playerId);

      if (error) throw error;

      setTeamPlayers(teamPlayers.filter((p) => p.id !== playerId));
      toast.success("Jogador removido");
    } catch (error) {
      console.error("Error deleting player:", error);
      toast.error("Erro ao remover jogador");
    }
  };

  const deleteFantasyTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from("fantasy_teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;

      setFantasyTeams(fantasyTeams.filter((t) => t.id !== teamId));
      if (selectedTeamId === teamId) {
        setSelectedTeamId(fantasyTeams.length > 1 ? fantasyTeams[0].id : null);
        setTeamPlayers([]);
      }
      toast.success("Time removido");
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Erro ao remover time");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const selectedTeam = fantasyTeams.find((t) => t.id === selectedTeamId);
  const totalTeamPoints = teamPlayers.reduce((sum, p) => sum + (p.points || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-bold">Fantasy Football</h1>
          </div>
          <p className="text-muted-foreground">
            Monta tua equipe com os melhores jogadores do Mundial
          </p>
        </div>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Meus Times
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            {/* Create New Team */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Novo Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome do Time</Label>
                  <Input
                    placeholder="Ex: Meu Time Dream"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Descreve teu time..."
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                  />
                </div>
                <Button onClick={createFantasyTeam} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Criar Time
                </Button>
              </CardContent>
            </Card>

            {/* Teams List */}
            <div className="grid gap-4 md:grid-cols-2">
              {fantasyTeams.map((team) => (
                <Card
                  key={team.id}
                  className={`cursor-pointer transition-all ${
                    selectedTeamId === team.id
                      ? "ring-2 ring-primary"
                      : "hover:shadow-lg"
                  }`}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    loadTeamPlayers(team.id);
                  }}
                >
                  <CardContent className="py-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{team.team_name}</h3>
                        {team.description && (
                          <p className="text-sm text-muted-foreground">
                            {team.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFantasyTeam(team.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {team.players_count}/11 Jogadores
                      </Badge>
                      <span className="font-bold">{team.points} pts</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Team Details */}
            {selectedTeam && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Jogadores de {selectedTeam.team_name}</span>
                    <span className="text-lg">{totalTeamPoints} pts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Player */}
                  <div className="border-t pt-6">
                    <h3 className="font-bold mb-4">Adicionar Jogador</h3>
                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input
                          placeholder="Nome do jogador"
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Posição</Label>
                        <select
                          value={newPlayerPosition}
                          onChange={(e) => setNewPlayerPosition(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="goalkeeper">Goleiro</option>
                          <option value="defender">Defensor</option>
                          <option value="midfielder">Meio-campo</option>
                          <option value="forward">Atacante</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Seleção</Label>
                        <select
                          value={newPlayerTeamId}
                          onChange={(e) => setNewPlayerTeamId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="">Escolhe...</option>
                          {worldCupTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.flag_emoji} {team.team_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button onClick={addPlayerToTeam} disabled={saving}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Players List */}
                  <div>
                    <h3 className="font-bold mb-4">Elenco</h3>
                    {teamPlayers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhum jogador adicionado ainda
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {["goalkeeper", "defender", "midfielder", "forward"].map(
                          (position) => {
                            const positionPlayers = teamPlayers.filter(
                              (p) => p.player_position === position
                            );
                            if (positionPlayers.length === 0) return null;

                            const positionLabel: Record<string, string> = {
                              goalkeeper: "Goleiros",
                              defender: "Defensores",
                              midfielder: "Meio-campo",
                              forward: "Atacantes",
                            };

                            return (
                              <div key={position}>
                                <p className="text-xs font-bold text-muted-foreground mb-2">
                                  {positionLabel[position]}
                                </p>
                                {positionPlayers.map((player: any) => (
                                  <div
                                    key={player.id}
                                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg">
                                        {player.world_cup_teams?.flag_emoji}
                                      </span>
                                      <div>
                                        <p className="font-medium">{player.player_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {player.world_cup_teams?.team_name}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold">{player.points} pts</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deletePlayer(player.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking Global</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Ranking em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
