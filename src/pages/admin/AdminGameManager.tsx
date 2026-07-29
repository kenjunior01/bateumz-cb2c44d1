import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Palette, Gamepad2, Settings2, Plus, Trash2, Save, Image as ImageIcon, Trophy } from "lucide-react";

export default function AdminGameManager() {
  const { region } = useRegionalTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("spin");
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (region) loadGames();
  }, [region, activeTab]);

  const loadGames = async () => {
    setLoading(true);
    const table = activeTab === "spin" ? "spin_wheel_games" : "millionaire_games";
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("region_id", region?.id);
    
    if (!error) setGames(data || []);
    setLoading(false);
  };

  const handleUpdateVisuals = async (gameId: string, updates: any) => {
    const table = activeTab === "spin" ? "spin_wheel_games" : "millionaire_games";
    const { error } = await supabase.from(table).update(updates).eq("id", gameId);
    
    if (error) {
      toast.error("Erro ao atualizar visual");
    } else {
      toast.success("Design atualizado com sucesso!");
      loadGames();
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Gestão de Jogos & Gamificação</h1>
          <p className="text-muted-foreground">Personalize a experiência de jogo para a sua região e empresas parceiras.</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => navigate("/admin/spin-wheel-manager")}>
            <Plus className="w-4 h-4" /> Nova Roda
          </Button>
          <Button className="gap-2" onClick={() => navigate("/admin/millionaire-manager")}>
            <Plus className="w-4 h-4" /> Novo Milionário
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-black/5 p-1">
          <TabsTrigger value="spin" className="gap-2">
            <Gamepad2 className="w-4 h-4" /> Roda da Sorte
          </TabsTrigger>
          <TabsTrigger value="millionaire" className="gap-2">
            <Trophy className="w-4 h-4" /> Quem Quer Ser Milionário
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-6">
          {games.map((game) => (
            <Card key={game.id} className="overflow-hidden border-primary/10">
              <div className="md:flex">
                <div 
                  className="md:w-64 h-48 md:h-auto bg-muted relative flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: game.background_color }}
                >
                  {game.background_image_url ? (
                    <img src={game.background_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  ) : (
                    <ImageIcon className="w-12 h-12 opacity-20" />
                  )}
                  <div className="relative z-10 text-center p-4">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Preview</p>
                    <p className="font-black text-white drop-shadow-md">{game.name}</p>
                  </div>
                </div>

                <CardContent className="flex-1 p-6 grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-sm uppercase tracking-wider">Identidade Visual do Jogo</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Cor de Fundo</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            className="w-12 h-10 p-1" 
                            defaultValue={game.background_color}
                            onBlur={(e) => handleUpdateVisuals(game.id, { background_color: e.target.value })}
                          />
                          <Input className="text-xs" defaultValue={game.background_color} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Cor Primária (UI)</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            className="w-12 h-10 p-1" 
                            defaultValue={game.primary_color || game.wheel_border_color}
                            onBlur={(e) => handleUpdateVisuals(game.id, activeTab === 'spin' ? { wheel_border_color: e.target.value } : { primary_color: e.target.value })}
                          />
                          <Input className="text-xs" defaultValue={game.primary_color || game.wheel_border_color} />
                        </div>
                      </div>
                    </div>

                      <div className="space-y-2">
                        <Label className="text-xs">URL da Imagem de Fundo (Empresa/Marca)</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="https://exemplo.com/banner.jpg" 
                            defaultValue={game.background_image_url}
                            onBlur={(e) => handleUpdateVisuals(game.id, { background_image_url: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">URL do Logótipo da Empresa</Label>
                          <Input 
                            placeholder="https://exemplo.com/logo.png" 
                            defaultValue={game.company_logo_url}
                            onBlur={(e) => handleUpdateVisuals(game.id, { company_logo_url: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Slogan da Empresa (Branding)</Label>
                          <Input 
                            placeholder="A sua sorte começa aqui!" 
                            defaultValue={game.company_slogan}
                            onBlur={(e) => handleUpdateVisuals(game.id, { company_slogan: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                  <div className="space-y-4 border-l border-border pl-8">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings2 className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-sm uppercase tracking-wider">Configurações de Gameplay</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase opacity-60">Custo por Jogada</Label>
                        <Input type="number" defaultValue={game.spin_cost || 0} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase opacity-60">Tempo (Segundos)</Label>
                        <Input type="number" defaultValue={game.time_per_question || game.rotation_duration} className="h-8" />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-2 text-xs"
                        onClick={() => {
                          if (activeTab === 'millionaire') {
                            window.location.href = '/admin/millionaire-manager';
                          } else {
                            toast.info("Editor de conteúdo para Roda da Sorte em desenvolvimento.");
                          }
                        }}
                      >
                        <Settings2 className="w-3 h-3" /> Editar Conteúdo
                      </Button>
                      <Button variant="destructive" size="icon" className="shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}

          {games.length === 0 && !loading && (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-50">
              <Gamepad2 className="w-12 h-12 mx-auto mb-4" />
              <p>Nenhum jogo configurado para esta região.</p>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="link" onClick={() => navigate("/admin/spin-wheel-manager")}>Criar primeira roda</Button>
                <Button variant="link" onClick={() => navigate("/admin/millionaire-manager")}>Criar primeiro milionário</Button>
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
