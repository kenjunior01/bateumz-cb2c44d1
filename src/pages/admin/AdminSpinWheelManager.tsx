import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { PRESET_THEMES } from "@/lib/themes";

interface Segment {
  id?: string;
  segment_number?: number;
  label: string;
  description?: string;
  background_color: string;
  text_color: string;
  reward_type: string;
  reward_value: string;
  reward_image_url?: string;
  weight: number;
  max_wins_per_day?: number | null;
  max_wins_total?: number | null;
  effect_type?: string;
}

interface Game {
  id: string;
  name: string;
  description?: string;
  segment_count: number;
  rotation_duration: number;
  wheel_background_color?: string;
  wheel_border_color?: string;
  spin_cost?: number;
  sound_enabled?: boolean;
  particle_effects?: boolean;
  background_image_url?: string;
  background_color?: string;
  company_logo_url?: string;
  company_slogan?: string;
  is_active?: boolean;
  is_published?: boolean;
  created_at: string;
  created_by?: string;
  region_id?: string;
  default_effect?: string;
}

const DEFAULT_SEGMENTS: Segment[] = [
  { label: "10% OFF", background_color: "#22c55e", text_color: "#fff", reward_type: "discount", reward_value: "10%", weight: 25, effect_type: "confetti" },
  { label: "Tenta Outra", background_color: "#334155", text_color: "#fff", reward_type: "none", reward_value: "", weight: 35 },
  { label: "Brinde", background_color: "#eab308", text_color: "#000", reward_type: "prize", reward_value: "Brinde", weight: 15, effect_type: "stars" },
  { label: "Tenta Outra", background_color: "#1e293b", text_color: "#fff", reward_type: "none", reward_value: "", weight: 15 },
  { label: "PRÉMIO!", background_color: "#8b5cf6", text_color: "#fff", reward_type: "grand_prize", reward_value: "Grande Prémio", weight: 5, effect_type: "fireworks" },
  { label: "5% OFF", background_color: "#ef4444", text_color: "#fff", reward_type: "discount", reward_value: "5%", weight: 5, effect_type: "poppers" },
];

export default function AdminSpinWheelManager() {
  const { user, role } = useAuth();
  const { region } = useRegionalTheme();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [saving, setSaving] = useState(false);

  // Game form states
  const [gameName, setGameName] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [segmentCount, setSegmentCount] = useState(8);
  const [rotationDuration, setRotationDuration] = useState(5);
  const [wheelBackgroundColor, setWheelBackgroundColor] = useState("#334155");
  const [wheelBorderColor, setWheelBorderColor] = useState("#fbbf24");
  const [spinCost, setSpinCost] = useState(0);
  const [soundEnabled, setSoundEnabledGame] = useState(true);
  const [particleEffects, setParticleEffects] = useState(true);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#0f172a");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [companySlogan, setCompanySlogan] = useState("");
  const [defaultEffect, setDefaultEffect] = useState("confetti");
  const [rtpMode, setRtpMode] = useState<"normal" | "rain" | "hardcore">("normal");

  // Segment form
  const [segmentLabel, setSegmentLabel] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [segmentColor, setSegmentColor] = useState("#ef4444");
  const [segmentTextColor, setSegmentTextColor] = useState("#ffffff");
  const [rewardType, setRewardType] = useState("points");
  const [rewardValue, setRewardValue] = useState("");
  const [rewardImageUrl, setRewardImageUrl] = useState("");
  const [weight, setWeight] = useState(1);
  const [segmentEffectType, setSegmentEffectType] = useState("confetti");

  useEffect(() => {
    if (!user) return;
    if (role !== "admin" && role !== "superadmin" && role !== "business") return;
    loadGames();
  }, [user, role]);

  const loadGames = async () => {
    setLoading(true);
    try {
      let query = supabase.from("spin_wheel_games").select("*").order("created_at", { ascending: false });
      if (role !== "superadmin") {
        query = query.eq("created_by", user!.id);
      }
      const { data, error } = await query;

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error("Error loading games:", error);
      toast.error("Erro ao carregar jogos");
    } finally {
      setLoading(false);
    }
  };

  const loadSegments = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from("spin_wheel_segments")
        .select("*")
        .eq("wheel_id", gameId)
        .order("segment_number");

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error("Error loading segments:", error);
      toast.error("Erro ao carregar segmentos");
    }
  };

  const selectGameForEdit = (game: Game) => {
    setSelectedGame(game);
    setGameName(game.name);
    setGameDescription(game.description || "");
    setSegmentCount(game.segment_count);
    setRotationDuration(game.rotation_duration);
    setWheelBackgroundColor(game.wheel_background_color || "#334155");
    setWheelBorderColor(game.wheel_border_color || "#fbbf24");
    setSpinCost(game.spin_cost || 0);
    setSoundEnabledGame(game.sound_enabled ?? true);
    setParticleEffects(game.particle_effects ?? true);
    setBackgroundImageUrl(game.background_image_url || "");
    setBackgroundColor(game.background_color || "#0f172a");
    setCompanyLogoUrl(game.company_logo_url || "");
    setCompanySlogan(game.company_slogan || "");
    setDefaultEffect(game.default_effect || "confetti");
    setRtpMode((game as any).rtp_mode || "normal");
    loadSegments(game.id);
  };

  const createGame = async () => {
    if (!gameName.trim()) {
      toast.error("Nome do jogo é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const regionId = region?.id || (await supabase.from("regions").select("id").limit(1).single()).data?.id;

      if (!regionId) {
        toast.error("Erro: Nenhuma região encontrada.");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from("spin_wheel_games")
        .insert({
          name: gameName,
          description: gameDescription,
          segment_count: segmentCount,
          rotation_duration: rotationDuration,
          wheel_background_color: wheelBackgroundColor,
          wheel_border_color: wheelBorderColor,
          spin_cost: spinCost,
          sound_enabled: soundEnabled,
          particle_effects: particleEffects,
          background_image_url: backgroundImageUrl,
          background_color: backgroundColor,
          company_logo_url: companyLogoUrl,
          company_slogan: companySlogan,
          default_effect: defaultEffect,
          rtp_mode: rtpMode,
          region_id: regionId,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setGames([data, ...games]);
      setSelectedGame(data);
      resetGameForm();
      toast.success("Jogo criado com sucesso!");
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Erro ao criar jogo");
    } finally {
      setSaving(false);
    }
  };

  const updateGame = async () => {
    if (!selectedGame || !gameName.trim()) {
      toast.error("Nome do jogo é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("spin_wheel_games")
        .update({
          name: gameName,
          description: gameDescription,
          segment_count: segmentCount,
          rotation_duration: rotationDuration,
          wheel_background_color: wheelBackgroundColor,
          wheel_border_color: wheelBorderColor,
          spin_cost: spinCost,
          sound_enabled: soundEnabled,
          particle_effects: particleEffects,
          background_image_url: backgroundImageUrl,
          background_color: backgroundColor,
          company_logo_url: companyLogoUrl,
          company_slogan: companySlogan,
          default_effect: defaultEffect,
          rtp_mode: rtpMode
        })
        .eq("id", selectedGame.id);

      if (error) throw error;

      setGames(games.map(g => g.id === selectedGame.id ? { ...g, name: gameName } : g));
      toast.success("Jogo atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating game:", error);
      toast.error("Erro ao atualizar jogo");
    } finally {
      setSaving(false);
    }
  };

  const addSegment = async () => {
    if (!selectedGame || !segmentLabel.trim() || !rewardValue.trim()) {
      toast.error("Preenche todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const segmentNumber = segments.length + 1;

      const { data, error } = await supabase
        .from("spin_wheel_segments")
        .insert({
          wheel_id: selectedGame.id,
          segment_number: segmentNumber,
          label: segmentLabel,
          description: segmentDescription,
          background_color: segmentColor,
          text_color: segmentTextColor,
          reward_type: rewardType,
          reward_value: rewardValue,
          reward_image_url: rewardImageUrl,
          weight: weight,
          effect_type: segmentEffectType
        })
        .select()
        .single();

      if (error) throw error;

      setSegments([...segments, data]);
      resetSegmentForm();
      toast.success("Segmento adicionado!");
    } catch (error) {
      console.error("Error adding segment:", error);
      toast.error("Erro ao adicionar segmento");
    } finally {
      setSaving(false);
    }
  };

  const deleteSegment = async (segmentId: string) => {
    try {
      const { error } = await supabase
        .from("spin_wheel_segments")
        .delete()
        .eq("id", segmentId);

      if (error) throw error;

      setSegments(segments.filter((s) => s.id !== segmentId));
      toast.success("Segmento removido");
    } catch (error) {
      console.error("Error deleting segment:", error);
      toast.error("Erro ao remover segmento");
    }
  };

  const publishGame = async (gameId: string) => {
    try {
      const { error } = await supabase
        .from("spin_wheel_games")
        .update({ is_published: true })
        .eq("id", gameId);

      if (error) throw error;

      setGames(
        games.map((g) =>
          g.id === gameId ? { ...g, is_published: true } : g
        )
      );
      toast.success("Jogo publicado!");
    } catch (error) {
      console.error("Error publishing game:", error);
      toast.error("Erro ao publicar jogo");
    }
  };

  const resetGameForm = () => {
    setGameName("");
    setGameDescription("");
    setSegmentCount(8);
    setRotationDuration(5);
    setWheelBackgroundColor("#334155");
    setWheelBorderColor("#fbbf24");
    setSpinCost(0);
    setSoundEnabledGame(true);
    setParticleEffects(true);
    setBackgroundImageUrl("");
    setBackgroundColor("#0f172a");
    setCompanyLogoUrl("");
    setCompanySlogan("");
    setDefaultEffect("confetti");
    setRtpMode("normal");
  };

  const resetSegmentForm = () => {
    setSegmentLabel("");
    setSegmentDescription("");
    setSegmentColor("#ef4444");
    setSegmentTextColor("#ffffff");
    setRewardType("points");
    setRewardValue("");
    setRewardImageUrl("");
    setWeight(1);
    setSegmentEffectType("confetti");
  };

  if (role !== "admin" && role !== "superadmin" && role !== "business") {
    return <Navigate to="/profile" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Gerenciar Roda da Sorte</h1>

      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="games">Meus Jogos</TabsTrigger>
          <TabsTrigger value="create">{selectedGame ? "Editar Jogo" : "Criar Novo Jogo"}</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-4">
          {games.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum jogo criado ainda
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <Card
                  key={game.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => selectGameForEdit(game)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{game.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                          {game.description}
                        </p>
                      </div>
                      <Badge variant={game.is_published ? "default" : "outline"}>
                        {game.is_published ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {game.segment_count} segmentos
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          selectGameForEdit(game);
                        }}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        {!game.is_published && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              publishGame(game.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Publicar
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" asChild onClick={(e) => e.stopPropagation()}>
                          <a href={`/games/spin-wheel/${game.id}`} target="_blank" rel="noreferrer">
                            <Eye className="h-4 w-4 mr-2" />
                            Pré-visualizar
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{selectedGame ? "Editar Jogo" : "Criar Nova Roda"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do Jogo</Label>
                <Input
                  placeholder="Nome da roda da sorte"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descrição da roda"
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Tema</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {Object.entries(PRESET_THEMES).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setBackgroundColor(theme.backgroundColor);
                        setWheelBackgroundColor(theme.wheelBackgroundColor);
                        setWheelBorderColor(theme.primaryColor);
                        setCompanyLogoUrl(theme.primaryColor);
                      }}
                      className="w-full aspect-square rounded-lg border-2 border-border hover:border-primary transition-all p-2 flex flex-col items-center justify-center gap-1"
                      style={{ backgroundColor: theme.backgroundColor }}
                      title={theme.name}
                    >
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <span className="text-xs text-white font-medium">{theme.name.substring(0, 3)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Cor de Fundo (Hex)</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Cor da Roda (Hex)</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={wheelBackgroundColor}
                      onChange={(e) => setWheelBackgroundColor(e.target.value)}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input
                      value={wheelBackgroundColor}
                      onChange={(e) => setWheelBackgroundColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <ImageUpload
                  label="Imagem de Fundo (Marca)"
                  value={backgroundImageUrl}
                  onChange={setBackgroundImageUrl}
                  placeholder="URL da imagem de fundo"
                  bucketName="game-images"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <ImageUpload
                    label="Logo da Empresa"
                    value={companyLogoUrl}
                    onChange={setCompanyLogoUrl}
                    placeholder="URL do logo"
                    bucketName="game-images"
                  />
                </div>
                <div>
                  <Label>Slogan da Empresa</Label>
                  <Input
                    placeholder="Slogan..."
                    value={companySlogan}
                    onChange={(e) => setCompanySlogan(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Duração da Rotação (segundos)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={rotationDuration}
                    onChange={(e) => setRotationDuration(parseInt(e.target.value) || 5)}
                  />
                </div>
                <div>
                  <Label>Custo por Giro</Label>
                  <Input
                    type="number"
                    min="0"
                    value={spinCost}
                    onChange={(e) => setSpinCost(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Número de Segmentos</Label>
                  <Input
                    type="number"
                    min="2"
                    max="12"
                    value={segmentCount}
                    onChange={(e) => setSegmentCount(parseInt(e.target.value) || 8)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="flex items-center justify-between">
                  <Label>Ativar Efeitos Sonoros</Label>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabledGame}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ativar Efeitos de Partículas</Label>
                  <Switch
                    checked={particleEffects}
                    onCheckedChange={setParticleEffects}
                  />
                </div>
                <div>
                  <Label>Efeito Padrão do Jogo</Label>
                  <select
                    value={defaultEffect}
                    onChange={(e) => setDefaultEffect(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-card"
                  >
                    <option value="confetti">Confetti</option>
                    <option value="fireworks">Fireworks</option>
                    <option value="stars">Stars</option>
                    <option value="poppers">Poppers</option>
                    <option value="zap">Zap</option>
                  </select>
                </div>
                <div>
                  <Label>Modo de Jogo</Label>
                  <select
                    value={rtpMode}
                    onChange={(e) => setRtpMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-card"
                  >
                    <option value="normal">Normal</option>
                    <option value="rain">Chuva de Prémios 💰</option>
                    <option value="hardcore">Hardcore</option>
                  </select>
                </div>
              </div>

              <Button onClick={selectedGame ? updateGame : createGame} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {selectedGame ? "Atualizar Jogo" : "Criar Roda"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedGame && (
        <Card className="mt-8">
          <CardHeader><CardTitle>Segmentos - {selectedGame.name}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="font-bold mb-4">Adicionar Segmento</h3>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input placeholder="Rótulo do Segmento" value={segmentLabel} onChange={(e) => setSegmentLabel(e.target.value)} />
                  <Input placeholder="Valor do Prémio" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} />
                </div>

                <div>
                  <ImageUpload
                    label="Imagem do Prémio (opcional)"
                    value={rewardImageUrl}
                    onChange={setRewardImageUrl}
                    placeholder="URL da imagem do prémio"
                    bucketName="game-images"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <Label>Cor de Fundo:</Label>
                    <input
                      type="color"
                      value={segmentColor}
                      onChange={(e) => setSegmentColor(e.target.value)}
                      className="w-10 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input value={segmentColor} onChange={(e) => setSegmentColor(e.target.value)} className="flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Cor do Texto:</Label>
                    <input
                      type="color"
                      value={segmentTextColor}
                      onChange={(e) => setSegmentTextColor(e.target.value)}
                      className="w-10 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input value={segmentTextColor} onChange={(e) => setSegmentTextColor(e.target.value)} className="flex-1" />
                  </div>
                  <div>
                    <Label>Peso</Label>
                    <Input
                      type="number"
                      min="1"
                      value={weight}
                      onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Efeito do Segmento</Label>
                    <select
                      value={segmentEffectType}
                      onChange={(e) => setSegmentEffectType(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-card"
                    >
                      <option value="confetti">Confetti</option>
                      <option value="fireworks">Fireworks</option>
                      <option value="stars">Stars</option>
                      <option value="poppers">Poppers</option>
                      <option value="zap">Zap</option>
                    </select>
                  </div>
                </div>

                <Button onClick={addSegment} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Adicionar Segmento
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {segments.map((segment) => (
                <div key={segment.id} className="p-4 border rounded-lg flex justify-between items-start">
                  <div className="flex gap-3 items-start">
                    {segment.reward_image_url && (
                      <img 
                        src={segment.reward_image_url} 
                        alt={segment.label} 
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-bold">{segment.label}</p>
                      <p className="text-sm text-muted-foreground">{segment.reward_value}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteSegment(segment.id!)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
