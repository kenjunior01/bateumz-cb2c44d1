import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Game {
  id: string;
  name: string;
  description: string;
  segment_count: number;
  is_active: boolean;
  is_published: boolean;
  created_at: string;
}

interface Segment {
  id: string;
  segment_number: number;
  label: string;
  description: string;
  background_color: string;
  text_color: string;
  reward_type: string;
  reward_value: string;
  weight: number;
}

export default function AdminSpinWheelManager() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [saving, setSaving] = useState(false);

  // Game form
  const [gameName, setGameName] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [segmentCount, setSegmentCount] = useState(8);
  const [rotationDuration, setRotationDuration] = useState(5);
  const [wheelBackgroundColor, setWheelBackgroundColor] = useState("#2d2d2d");
  const [wheelBorderColor, setWheelBorderColor] = useState("#FFD700");
  const [spinCost, setSpinCost] = useState(0);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#0f172a");

  // Segment form
  const [segmentLabel, setSegmentLabel] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [segmentColor, setSegmentColor] = useState("#FF6B6B");
  const [segmentTextColor, setSegmentTextColor] = useState("#FFFFFF");
  const [rewardType, setRewardType] = useState("points");
  const [rewardValue, setRewardValue] = useState("");
  const [weight, setWeight] = useState(1);

  useEffect(() => {
    if (!user || (role !== "admin" && role !== "superadmin")) return;
    loadGames();
  }, [user, role]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("spin_wheel_games")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });

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

  const createGame = async () => {
    if (!gameName.trim()) {
      toast.error("Nome do jogo é obrigatório");
      return;
    }

    setSaving(true);
    try {
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
	          background_image_url: backgroundImageUrl,
	          background_color: backgroundColor,
	          created_by: user!.id,
	          region_id: "default-region",
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
          weight: weight,
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
    setWheelBackgroundColor("#2d2d2d");
    setWheelBorderColor("#FFD700");
    setSpinCost(0);
  };

  const resetSegmentForm = () => {
    setSegmentLabel("");
    setSegmentDescription("");
    setSegmentColor("#FF6B6B");
    setSegmentTextColor("#FFFFFF");
    setRewardType("points");
    setRewardValue("");
    setWeight(1);
  };

  if (role !== "admin" && role !== "superadmin") {
    return <Navigate to="/admin" replace />;
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
          <TabsTrigger value="create">Criar Novo Jogo</TabsTrigger>
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
                  onClick={() => {
                    setSelectedGame(game);
                    loadSegments(game.id);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{game.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">{game.description}</p>
                      </div>
                      <Badge variant={game.is_published ? "default" : "outline"}>
                        {game.is_published ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">{game.segment_count} segmentos</p>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); publishGame(game.id); }}>
                        <Eye className="h-4 w-4 mr-2" /> Publicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Criar Nova Roda</CardTitle></CardHeader>
            <CardContent className="space-y-4">
	              <Input placeholder="Nome do Jogo" value={gameName} onChange={(e) => setGameName(e.target.value)} />
	              <Textarea placeholder="Descrição" value={gameDescription} onChange={(e) => setGameDescription(e.target.value)} />
	              <div className="grid grid-cols-2 gap-4">
	                <div className="space-y-2">
	                  <Label>Cor de Fundo (Hex)</Label>
	                  <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
	                </div>
	                <div className="space-y-2">
	                  <Label>Cor da Roda (Hex)</Label>
	                  <Input type="color" value={wheelBackgroundColor} onChange={(e) => setWheelBackgroundColor(e.target.value)} />
	                </div>
	              </div>
	              <Input placeholder="URL da Imagem de Fundo (Marca)" value={backgroundImageUrl} onChange={(e) => setBackgroundImageUrl(e.target.value)} />
	              <Button onClick={createGame} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Criar Roda
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
                <Input placeholder="Rótulo" value={segmentLabel} onChange={(e) => setSegmentLabel(e.target.value)} />
                <Input placeholder="Valor do Prêmio" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} />
                <Button onClick={addSegment} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Adicionar Segmento
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {segments.map((segment) => (
                <div key={segment.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{segment.label}</p>
                    <p className="text-sm text-muted-foreground">{segment.reward_value}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteSegment(segment.id)}>
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
