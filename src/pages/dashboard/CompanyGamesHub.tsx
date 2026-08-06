import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gamepad2,
  Crown,
  CircleDot,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  Plus,
  Settings,
  Eye,
  ExternalLink,
  Search,
  TrendingUp,
  Users,
  Zap,
  Puzzle,
  Target,
  Swords,
  Dice5,
  Brain,
  Music,
  Globe,
  ChevronRight,
  Star,
  DollarSign,
  Play,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface GameConfig {
  id: string;
  game_id: string;
  game_label: string;
  is_enabled: boolean;
  is_published: boolean;
  settings: Record<string, any>;
  play_count: number;
  total_prizes_awarded: number;
  created_at: string;
}

interface GameDef {
  id: string;
  label: string;
  icon: string;
  category: string;
  players: string;
  color: string;
}

interface MillionaireGame {
  id: string;
  name: string;
  total_questions: number;
  is_published: boolean;
  is_active: boolean;
  primary_color: string;
  background_color: string;
  created_at: string;
}

interface SpinWheelGame {
  id: string;
  name: string;
  is_published: boolean;
  segment_count: number;
  spin_cost: number;
  created_at: string;
}

interface GameStat {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: string;
}

const GAME_CATALOG: GameDef[] = [
  { id: "millionaire", label: "Quem Quer Ser Milionario", icon: "crown", category: "Quiz", players: "Solo", color: "#fbbf24" },
  { id: "spin-wheel", label: "Roleta de Premios", icon: "circle-dot", category: "Sorte", players: "Solo", color: "#a855f7" },
  { id: "tictactoepro", label: "Jogo da Velha Pro", icon: "target", category: "Estrategia", players: "1v1 / Bot", color: "#22c55e" },
  { id: "connect4", label: "Liga 4", icon: "puzzle", category: "Estrategia", players: "1v1 / Bot", color: "#3b82f6" },
  { id: "snakebattle", label: "Batalha de Cobras", icon: "swords", category: "Arcade", players: "Multi", color: "#ef4444" },
  { id: "memorychallenge", label: "Desafio de Memoria", icon: "brain", category: "Puzzle", players: "Solo", color: "#ec4899" },
  { id: "typingracer", label: "Corrida de Digitacao", icon: "zap", category: "Reflexo", players: "Solo", color: "#f97316" },
  { id: "quizbattle", label: "Batalha de Quiz", icon: "brain", category: "Quiz", players: "1v1 / Bot", color: "#06b6d4" },
  { id: "wordchain", label: "Corrente de Palavras", icon: "globe", category: "Palavras", players: "Multi", color: "#14b8a6" },
  { id: "guessnumber100", label: "Adivinha o Numero", icon: "dice5", category: "Variado", players: "Solo", color: "#8b5cf6" },
  { id: "reactionrace", label: "Corrida de Reacao", icon: "zap", category: "Reflexo", players: "1v1", color: "#f43f5e" },
  { id: "battleshipgame", label: "Batalha Naval", icon: "target", category: "Estrategia", players: "1v1", color: "#0ea5e9" },
  { id: "chessgame", label: "Xadrez", icon: "swords", category: "Estrategia", players: "1v1 / Bot", color: "#78716c" },
  { id: "ludogame", label: "Ludo", icon: "dice5", category: "Cartas", players: "Multi", color: "#e11d48" },
  { id: "kahootmultiplayerquiz", label: "Kahoot Quiz", icon: "users", category: "Quiz", players: "Multi", color: "#7c3aed" },
  { id: "pongvs", label: "Pong VS", icon: "swords", category: "Arcade", players: "1v1", color: "#64748b" },
  { id: "flappybirdgame", label: "Flappy Bird", icon: "trending-up", category: "Arcade", players: "Solo", color: "#facc15" },
  { id: "2048game", label: "2048", icon: "puzzle", category: "Puzzle", players: "Solo", color: "#f59e0b" },
  { id: "rockpaperscissors", label: "Pedra Papel Tesoura", icon: "swords", category: "Variado", players: "1v1 / Bot", color: "#6366f1" },
  { id: "wordscramble", label: "Anagrama", icon: "globe", category: "Palavras", players: "Solo", color: "#10b981" },
  { id: "colorcatch", label: "Pega a Cor", icon: "target", category: "Reflexo", players: "Solo", color: "#f472b6" },
  { id: "checkersgame", label: "Damas", icon: "swords", category: "Estrategia", players: "1v1 / Bot", color: "#a16207" },
  { id: "carromboard", label: "Carrom", icon: "circle-dot", category: "Variado", players: "1v1 / Bot", color: "#ca8a04" },
  { id: "unocardgame", label: "UNO", icon: "dice5", category: "Cartas", players: "Multi", color: "#dc2626" },
];

const ICON_MAP: Record<string, any> = {
  crown: Crown,
  "circle-dot": CircleDot,
  target: Target,
  puzzle: Puzzle,
  swords: Swords,
  brain: Brain,
  zap: Zap,
  globe: Globe,
  dice5: Dice5,
  users: Users,
  "trending-up": TrendingUp,
  music: Music,
};

export default function CompanyGamesHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([]);
  const [millionaireGames, setMillionaireGames] = useState<MillionaireGame[]>([]);
  const [spinWheels, setSpinWheels] = useState<SpinWheelGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("catalog");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [configRes, milRes, spinRes] = await Promise.all([
      supabase.from("company_game_configs").select("*").eq("company_id", user!.id),
      supabase.from("millionaire_games").select("*").eq("business_user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("spin_wheel_games").select("*").eq("business_user_id", user!.id).order("created_at", { ascending: false }),
    ]);
    if (configRes.data) setGameConfigs(configRes.data as unknown as GameConfig[]);
    if (milRes.data) setMillionaireGames(milRes.data as unknown as MillionaireGame[]);
    if (spinRes.data) setSpinWheels(spinRes.data as unknown as SpinWheelGame[]);
    setLoading(false);
  };

  const toggleGameEnabled = async (gameId: string, enabled: boolean) => {
    const existing = gameConfigs.find(c => c.game_id === gameId);
    if (existing) {
      const { error } = await supabase.from("company_game_configs").update({ is_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (!error) setGameConfigs(p => p.map(c => c.game_id === gameId ? { ...c, is_enabled: enabled } : c));
    } else {
      const def = GAME_CATALOG.find(g => g.id === gameId);
      const { error } = await supabase.from("company_game_configs").insert({ company_id: user!.id, game_id: gameId, game_label: def?.label || gameId, is_enabled: enabled });
      if (!error) setGameConfigs(p => [...p, { id: crypto.randomUUID(), game_id: gameId, game_label: def?.label || gameId, is_enabled: enabled, is_published: false, settings: {}, play_count: 0, total_prizes_awarded: 0, created_at: new Date().toISOString() }]);
    }
    toast.success(enabled ? "Game enabled" : "Game disabled");
  };

  const togglePublished = async (configId: string, published: boolean) => {
    const { error } = await supabase.from("company_game_configs").update({ is_published: published, updated_at: new Date().toISOString() }).eq("id", configId);
    if (!error) {
      setGameConfigs(p => p.map(c => c.id === configId ? { ...c, is_published: published } : c));
      toast.success(published ? "Game published" : "Game unpublished");
    }
  };

  const getConfigForGame = (gameId: string) => gameConfigs.find(c => c.game_id === gameId);

  const stats: GameStat[] = useMemo(() => {
    const enabledGames = gameConfigs.filter(c => c.is_enabled).length;
    const publishedGames = gameConfigs.filter(c => c.is_published).length;
    const totalPlays = gameConfigs.reduce((s, c) => s + c.play_count, 0);
    const totalPrizes = gameConfigs.reduce((s, c) => s + (c.total_prizes_awarded || 0), 0);
    return [
      { label: "Jogos Ativos", value: enabledGames, icon: Gamepad2, color: "#22c55e", trend: "+2 esta semana" },
      { label: "Publicados", value: publishedGames, icon: Eye, color: "#3b82f6" },
      { label: "Total de Jogadas", value: totalPlays.toLocaleString(), icon: Users, color: "#a855f7" },
      { label: "Premios Distribuidos", value: `${totalPrizes.toLocaleString()} MZN`, icon: DollarSign, color: "#fbbf24" },
    ];
  }, [gameConfigs]);

  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return GAME_CATALOG;
    const term = searchTerm.toLowerCase();
    return GAME_CATALOG.filter(g => g.label.toLowerCase().includes(term) || g.category.toLowerCase().includes(term));
  }, [searchTerm]);

  const copyGameLink = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/games/millionaire/${gameId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(gameId);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Link copiado!");
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            Centro de Jogos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerir todos os seus jogos, configurar e publicar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/millionaire-manager")} className="gap-2">
            <Crown className="w-4 h-4 text-amber-500" /> Gestor Milionario
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/spin-wheel-manager")} className="gap-2">
            <CircleDot className="w-4 h-4 text-purple-500" /> Gestor Roleta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  {stat.trend && <Badge variant="secondary" className="text-[10px]">{stat.trend}</Badge>}
                </div>
                <p className="text-2xl font-bold mt-3">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="catalog" className="gap-2"><Gamepad2 className="w-4 h-4" /> Catalogo</TabsTrigger>
          <TabsTrigger value="millionaire" className="gap-2"><Crown className="w-4 h-4" /> Milionario</TabsTrigger>
          <TabsTrigger value="wheels" className="gap-2"><CircleDot className="w-4 h-4" /> Roletas</TabsTrigger>
          <TabsTrigger value="active" className="gap-2"><ToggleRight className="w-4 h-4" /> Ativos</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Pesquisar jogos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((game, i) => {
              const config = getConfigForGame(game.id);
              const Icon = ICON_MAP[game.icon] || Gamepad2;
              const isEnabled = config?.is_enabled ?? false;
              const isPublished = config?.is_published ?? false;

              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`group transition-all duration-200 hover:shadow-lg ${isEnabled ? "border-primary/30" : "border-border/50"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${game.color}15` }}>
                            <Icon className="w-5 h-5" style={{ color: game.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm leading-tight">{game.label}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5">{game.category}</Badge>
                              <span className="text-[10px] text-muted-foreground">{game.players}</span>
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => toggleGameEnabled(game.id, checked)}
                        />
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={isPublished ? "default" : "outline"} className="text-[10px]">
                            {isPublished ? "Publicado" : "Rascunho"}
                          </Badge>
                          {config && (
                            <span className="text-[10px] text-muted-foreground">{config.play_count} jogadas</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {game.id === "millionaire" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/dashboard/millionaire-manager")}>
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {game.id === "spin-wheel" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/dashboard/spin-wheel-manager")}>
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isEnabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] gap-1"
                              onClick={() => togglePublished(config!.id, !isPublished)}
                            >
                              {isPublished ? <Eye className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                              {isPublished ? "Despublicar" : "Publicar"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="millionaire" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Jogo do Milionario</h2>
              <p className="text-sm text-muted-foreground">Gerir instancias do Quem Quer Ser Milionario</p>
            </div>
            <Button size="sm" onClick={() => navigate("/dashboard/millionaire-manager")} className="gap-2">
              <Plus className="w-4 h-4" /> Criar Novo
            </Button>
          </div>
          {millionaireGames.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Crown className="w-12 h-12 text-amber-500/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-1">Nenhum jogo de milionario</h3>
                <p className="text-sm text-muted-foreground mb-4">Crie o seu primeiro jogo do milionario com perguntas personalizadas</p>
                <Button onClick={() => navigate("/dashboard/millionaire-manager")} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Jogo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {millionaireGames.map((game) => (
                <Card key={game.id} className={`overflow-hidden ${game.is_published ? "border-amber-500/30" : ""}`}>
                  <div className="h-2" style={{ background: `linear-gradient(90deg, ${game.primary_color || "#fbbf24"}, ${game.background_color || "#020817"})` }} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold">{game.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={game.is_published ? "default" : "outline"} className="text-[10px]">
                            {game.is_published ? "Publicado" : "Rascunho"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">{game.total_questions} perguntas</Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => copyGameLink(game.id, e)}>
                        {copiedId === game.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/games/millionaire/${game.id}`)}>
                        <Play className="w-3.5 h-3.5" /> Jogar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => navigate("/dashboard/millionaire-manager")}>
                        <Settings className="w-3.5 h-3.5" /> Gerir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wheels" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><CircleDot className="w-5 h-5 text-purple-500" /> Roletas de Premios</h2>
              <p className="text-sm text-muted-foreground">Gerir as suas roletas configuraveis</p>
            </div>
            <Button size="sm" onClick={() => navigate("/dashboard/spin-wheel-manager")} className="gap-2">
              <Plus className="w-4 h-4" /> Criar Nova
            </Button>
          </div>
          {spinWheels.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <CircleDot className="w-12 h-12 text-purple-500/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-1">Nenhuma roleta criada</h3>
                <p className="text-sm text-muted-foreground mb-4">Crie roletas personalizadas com os seus proprios premios</p>
                <Button onClick={() => navigate("/dashboard/spin-wheel-manager")} className="gap-2">
                  <Plus className="w-4 h-4" /> Criar Roleta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spinWheels.map((wheel) => (
                <Card key={wheel.id} className={wheel.is_published ? "border-purple-500/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold">{wheel.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={wheel.is_published ? "default" : "outline"} className="text-[10px]">
                            {wheel.is_published ? "Publicado" : "Rascunho"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">{wheel.segment_count} segmentos</Badge>
                          {wheel.spin_cost > 0 && <Badge variant="secondary" className="text-[10px]">{wheel.spin_cost} MZN</Badge>}
                        </div>
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => copyGameLink(wheel.id, e)}>
                        {copiedId === wheel.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/games/spin-wheel/${wheel.id}`)}>
                        <Play className="w-3.5 h-3.5" /> Jogar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => navigate("/dashboard/spin-wheel-manager")}>
                        <Settings className="w-3.5 h-3.5" /> Gerir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><ToggleRight className="w-5 h-5 text-green-500" /> Jogos Ativos e Publicados</h2>
          {gameConfigs.filter(c => c.is_enabled && c.is_published).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <ToggleLeft className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-1">Nenhum jogo publicado</h3>
                <p className="text-sm text-muted-foreground">Ative e publique jogos no separador Catalogo para que aparecam aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameConfigs.filter(c => c.is_enabled && c.is_published).map((config) => {
                const def = GAME_CATALOG.find(g => g.id === config.game_id);
                const Icon = ICON_MAP[def?.icon || ""] || Gamepad2;
                const color = def?.color || "#64748b";
                return (
                  <Card key={config.id} className="border-green-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{config.game_label}</h3>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>{config.play_count} jogadas</span>
                            <span>{(config.total_prizes_awarded || 0).toLocaleString()} MZN</span>
                          </div>
                        </div>
                        <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-[10px]">ATIVO</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
