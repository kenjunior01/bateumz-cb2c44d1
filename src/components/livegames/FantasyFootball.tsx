import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Calendar, TrendingUp, Plus, Minus, Coins, Zap, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { fetchPlayers, fetchFixtures, fetchPlayerStats, ApiPlayer, ApiMatch } from "@/lib/api-football";

interface PlayerStats {
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
  clean_sheets: number;
  saves: number;
  last_updated: string;
}

interface Player {
  id: string;
  name: string;
  team: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  price: number;
  points: number;
  image?: string;
  stats?: PlayerStats;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  status?: "scheduled" | "live" | "finished";
  score?: string;
}

const SAMPLE_PLAYERS: Player[] = [
  { id: "1", name: "Cristiano Ronaldo", team: "Portugal", position: "FWD", price: 120, points: 85, stats: { goals: 3, assists: 2, yellow_cards: 0, red_cards: 0, minutes_played: 360, clean_sheets: 2, saves: 0, last_updated: new Date().toISOString() } },
  { id: "2", name: "Lionel Messi", team: "Argentina", position: "FWD", price: 118, points: 88, stats: { goals: 4, assists: 3, yellow_cards: 1, red_cards: 0, minutes_played: 380, clean_sheets: 1, saves: 0, last_updated: new Date().toISOString() } },
  { id: "3", name: "Kylian Mbappé", team: "France", position: "FWD", price: 115, points: 82, stats: { goals: 2, assists: 4, yellow_cards: 0, red_cards: 0, minutes_played: 340, clean_sheets: 1, saves: 0, last_updated: new Date().toISOString() } },
  { id: "4", name: "Neymar Jr", team: "Brazil", position: "FWD", price: 110, points: 78 },
  { id: "5", name: "Kevin De Bruyne", team: "Belgium", position: "MID", price: 105, points: 80 },
  { id: "6", name: "Luka Modrić", team: "Croatia", position: "MID", price: 100, points: 77 },
  { id: "7", name: "Virgil van Dijk", team: "Netherlands", position: "DEF", price: 95, points: 75 },
  { id: "8", name: "Manuel Neuer", team: "Germany", position: "GK", price: 90, points: 70 },
  { id: "9", name: "Erling Haaland", team: "Norway", position: "FWD", price: 112, points: 84 },
  { id: "10", name: "Jude Bellingham", team: "England", position: "MID", price: 102, points: 79 },
  { id: "11", name: "Gianluigi Donnarumma", team: "Italy", position: "GK", price: 92, points: 72 },
  { id: "12", name: "Trent Alexander-Arnold", team: "England", position: "DEF", price: 94, points: 74 },
];

const SAMPLE_MATCHES: Match[] = [
  { id: "1", homeTeam: "Portugal", awayTeam: "France", date: "2026-06-20 20:00", status: "live", score: "2-1" },
  { id: "2", homeTeam: "Brazil", awayTeam: "Argentina", date: "2026-06-21 16:00", status: "scheduled" },
  { id: "3", homeTeam: "Germany", awayTeam: "England", date: "2026-06-22 18:00", status: "scheduled" },
];

const INITIAL_BUDGET = 1000;
const TEAM_SIZE = 11;

const FantasyFootball: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [budget, setBudget] = useState(INITIAL_BUDGET);
  const [activeTab, setActiveTab] = useState<"team" | "players" | "matches" | "prizes" | "battle">("team");
  const [myPoints, setMyPoints] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [players, setPlayers] = useState<Player[]>(SAMPLE_PLAYERS);
  const [matches, setMatches] = useState<Match[]>(SAMPLE_MATCHES);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [opponentPlayers, setOpponentPlayers] = useState<Player[]>([]);
  const [opponentPoints, setOpponentPoints] = useState(0);
  const [battleActive, setBattleActive] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Try to fetch real players from 2026 World Cup
        const playersData = await fetchPlayers(1, 2026);
        console.log("Players data:", playersData);
        
        // Try to fetch fixtures from 2026 World Cup
        const fixturesData = await fetchFixtures(1, 2026);
        console.log("Fixtures data:", fixturesData);

        // If we got real data, transform it
        if (playersData.response && playersData.response.length > 0) {
          const transformedPlayers = playersData.response.slice(0, 20).map((playerData: any, index: number) => {
            const player = playerData.player;
            const team = playerData.statistics[0]?.team;
            const stats = playerData.statistics[0];
            
            return {
              id: player.id.toString(),
              name: player.name,
              team: team?.name || "Unknown",
              position: mapPosition(player.position),
              price: 50 + Math.floor(Math.random() * 100),
              points: 50 + Math.floor(Math.random() * 50),
              image: player.photo,
              stats: {
                goals: stats?.goals?.total || 0,
                assists: stats?.goals?.assists || 0,
                yellow_cards: stats?.cards?.yellow || 0,
                red_cards: stats?.cards?.red || 0,
                minutes_played: stats?.games?.minutes || 0,
                clean_sheets: stats?.clean_sheets || 0,
                saves: stats?.goals?.saves || 0,
                last_updated: new Date().toISOString(),
              }
            };
          });
          setPlayers(transformedPlayers);
        }

        if (fixturesData.response && fixturesData.response.length > 0) {
          const transformedFixtures = fixturesData.response.slice(0, 5).map((fixture: ApiMatch) => ({
            id: fixture.fixture.id.toString(),
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            date: new Date(fixture.fixture.date).toLocaleString("pt-PT"),
            status: mapStatus(fixture.fixture.status.short),
            score: fixture.goals.home !== null && fixture.goals.away !== null 
              ? `${fixture.goals.home}-${fixture.goals.away}` 
              : undefined,
          }));
          setMatches(transformedFixtures);
        }

      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.info("Usando dados de exemplo por enquanto.");
      } finally {
        setLoadingInitialData(false);
      }
    };

    loadInitialData();
  }, []);

  const mapPosition = (pos: string): "GK" | "DEF" | "MID" | "FWD" => {
    switch (pos) {
      case "Goalkeeper": return "GK";
      case "Defender": return "DEF";
      case "Midfielder": return "MID";
      case "Attacker": return "FWD";
      default: return "MID";
    }
  };

  const mapStatus = (status: string): "scheduled" | "live" | "finished" => {
    switch (status) {
      case "1H":
      case "2H":
      case "HT":
      case "ET":
      case "P":
        return "live";
      case "FT":
      case "AET":
      case "PEN":
        return "finished";
      default:
        return "scheduled";
    }
  };

  // Function to fetch real-time data via API-Football
  const fetchRealTimeStats = async () => {
    setLoadingStats(true);
    try {
      toast.info("Atualizando estatísticas em tempo real...");
      
      const playersData = await fetchPlayers(1, 2026);
      console.log("Fetched updated football data:", playersData);
      
      if (playersData.response && playersData.response.length > 0) {
        const updatedPlayers = playersData.response.slice(0, players.length).map((playerData: any, index: number) => {
          const player = playerData.player;
          const team = playerData.statistics[0]?.team;
          const stats = playerData.statistics[0];
          
          return {
            id: player.id.toString(),
            name: player.name,
            team: team?.name || players[index]?.team || "Unknown",
            position: mapPosition(player.position),
            price: players[index]?.price || 80,
            points: 50 + Math.floor(Math.random() * 50),
            image: player.photo,
            stats: {
              goals: stats?.goals?.total || 0,
              assists: stats?.goals?.assists || 0,
              yellow_cards: stats?.cards?.yellow || 0,
              red_cards: stats?.cards?.red || 0,
              minutes_played: stats?.games?.minutes || 0,
              clean_sheets: stats?.clean_sheets || 0,
              saves: stats?.goals?.saves || 0,
              last_updated: new Date().toISOString(),
            }
          };
        });
        setPlayers(updatedPlayers);
      } else {
        // Fallback to random stats
        const updatedPlayers = players.map(p => ({
          ...p,
          stats: {
            goals: Math.floor(Math.random() * 5),
            assists: Math.floor(Math.random() * 4),
            yellow_cards: Math.floor(Math.random() * 2),
            red_cards: 0,
            minutes_played: 180 + Math.floor(Math.random() * 200),
            clean_sheets: Math.floor(Math.random() * 3),
            saves: p.position === "GK" ? Math.floor(Math.random() * 15) : 0,
            last_updated: new Date().toISOString(),
          }
        }));
        setPlayers(updatedPlayers);
      }
      
      toast.success("Estatísticas atualizadas com sucesso!");
    } catch (error) {
      console.error("Error fetching real-time stats:", error);
      toast.error("Falha ao buscar estatísticas em tempo real.");
    } finally {
      setLoadingStats(false);
    }
  };

  const togglePlayer = (player: Player) => {
    const isSelected = selectedPlayers.find(p => p.id === player.id);
    
    if (isSelected) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
      setBudget(prev => prev + player.price);
    } else {
      if (selectedPlayers.length >= TEAM_SIZE) {
        return;
      }
      if (budget >= player.price) {
        setSelectedPlayers(prev => [...prev, player]);
        setBudget(prev => prev - player.price);
      }
    }
  };

  const createRandomOpponentTeam = () => {
    const availablePlayers = players.filter(p => !selectedPlayers.find(sp => sp.id === p.id));
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
    setOpponentPlayers(shuffled.slice(0, TEAM_SIZE));
  };

  const startBattle = () => {
    if (selectedPlayers.length < TEAM_SIZE) {
      toast.error(`Selecione ${TEAM_SIZE} jogadores para começar a batalha!`);
      return;
    }
    if (opponentPlayers.length === 0) {
      createRandomOpponentTeam();
    }
    setBattleActive(true);
    toast.success("Batalha iniciada!");
  };

  const calculateTeamPoints = (team: Player[]) => {
    return team.reduce((sum, p) => {
      let playerPoints = 2; // Base points
      if (p.stats) {
        playerPoints += p.stats.goals * 5;
        playerPoints += p.stats.assists * 3;
        playerPoints += p.stats.clean_sheets * 4;
        playerPoints += p.stats.saves * 1;
        playerPoints -= p.stats.yellow_cards * 1;
        playerPoints -= p.stats.red_cards * 3;
      }
      return sum + playerPoints;
    }, 0);
  };

  const simulateBattle = () => {
    const myBattlePoints = calculateTeamPoints(selectedPlayers);
    const opponentBattlePoints = calculateTeamPoints(opponentPlayers);
    
    setMyPoints(prev => prev + myBattlePoints);
    setOpponentPoints(prev => prev + opponentBattlePoints);
    
    if (myBattlePoints > opponentBattlePoints) {
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
      toast.success(`Você venceu! ${myBattlePoints} vs ${opponentBattlePoints}!`);
    } else if (myBattlePoints < opponentBattlePoints) {
      toast.error(`Você perdeu! ${myBattlePoints} vs ${opponentBattlePoints}!`);
    } else {
      toast.info(`Empate! ${myBattlePoints} vs ${opponentBattlePoints}!`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center items-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
              {t("fantasy.title")}
            </h1>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={fetchRealTimeStats} 
              disabled={loadingStats}
              className="gap-2"
            >
              {loadingStats ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Atualizar Estatísticas
            </Button>
          </div>
          <p className="text-xl text-muted-foreground mt-2">{t("fantasy.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("fantasy.budget")}</p>
                  <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400">{budget} <Coins className="inline w-6 h-6 ml-1" /></p>
                </div>
                <Coins className="w-12 h-12 text-yellow-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("fantasy.myPoints")}</p>
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{myPoints}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("fantasy.myTeam")}</p>
                  <p className="text-3xl font-black text-green-600 dark:text-green-400">{selectedPlayers.length}/{TEAM_SIZE}</p>
                </div>
                <Users className="w-12 h-12 text-green-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Next Matchday</p>
                  <p className="text-xl font-black text-purple-600 dark:text-purple-400">Matchday 1</p>
                </div>
                <Calendar className="w-12 h-12 text-purple-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: "team", label: t("fantasy.myTeam"), icon: <Users className="w-4 h-4" /> },
            { id: "players", label: t("fantasy.players"), icon: <TrendingUp className="w-4 h-4" /> },
            { id: "battle", label: "Batalha", icon: <Zap className="w-4 h-4" /> },
            { id: "matches", label: t("fantasy.nextMatch"), icon: <Calendar className="w-4 h-4" /> },
            { id: "prizes", label: t("fantasy.prizes"), icon: <Trophy className="w-4 h-4" /> },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2"
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "team" && (
            <motion.div
              key="team"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>{t("fantasy.myTeam")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPlayers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg">No players selected yet</p>
                      <p className="text-sm">Go to the Players tab to build your team</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {selectedPlayers.map(player => (
                        <motion.div
                          key={player.id}
                          layout
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-muted rounded-xl p-4 border border-muted-foreground/20 hover:border-primary transition-all">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-2 flex items-center justify-center overflow-hidden">
                              {player.image ? (
                                <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl font-black">{player.name.charAt(0)}</span>
                              )}
                            </div>
                            <p className="font-bold">{player.name}</p>
                            <p className="text-xs text-gray-400">{player.team} • {player.position}</p>
                            {player.stats && (
                              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-center">
                                <Badge variant="outline">⚽{player.stats.goals}</Badge>
                                <Badge variant="outline">🅰️{player.stats.assists}</Badge>
                              </div>
                            )}
                            <div className="flex justify-between items-center mt-2 text-xs">
                              <Badge variant="outline">{player.points} pts</Badge>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => togglePlayer(player)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {selectedPlayers.length === TEAM_SIZE && (
                    <Button className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700" onClick={() => setActiveTab("battle")}>
                      <Zap className="w-4 h-4 mr-2" />
                      Ir para Batalha
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "battle" && (
            <motion.div
              key="battle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Batalha Jogador vs Jogador</CardTitle>
                </CardHeader>
                <CardContent>
                  {!battleActive ? (
                    <div className="text-center py-12 space-y-4">
                      <p className="text-lg">Prepare sua equipe e desafie um oponente!</p>
                      <div className="flex gap-4 justify-center flex-wrap">
                        <Button onClick={createRandomOpponentTeam} disabled={players.length < TEAM_SIZE * 2}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Gerar Oponente Aleatório
                        </Button>
                        <Button onClick={startBattle} disabled={selectedPlayers.length < TEAM_SIZE} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                          <Zap className="w-4 h-4 mr-2" />
                          Iniciar Batalha
                        </Button>
                      </div>
                      {opponentPlayers.length > 0 && (
                        <div className="mt-8">
                          <p className="font-bold mb-4">Equipe do Oponente:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {opponentPlayers.map(player => (
                              <div
                                key={player.id}
                                className="bg-muted rounded-xl p-4 border border-destructive/30">
                                <div className="text-center">
                                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center overflow-hidden">
                                    {player.image ? (
                                      <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xl font-black">{player.name.charAt(0)}</span>
                                    )}
                                  </div>
                                  <p className="font-bold text-sm">{player.name}</p>
                                  <p className="text-xs text-muted-foreground">{player.team}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-3 gap-4 text-center">
                        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30">
                          <h3 className="font-bold text-lg mb-2">Sua Equipe</h3>
                          <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{myPoints}</p>
                          <p className="text-sm text-muted-foreground mt-2">Total de Pontos</p>
                        </div>

                        <div className="p-6 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-3xl font-black">VS</p>
                          </div>
                        </div>

                        <div className="p-6 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30">
                          <h3 className="font-bold text-lg mb-2">Oponente</h3>
                          <p className="text-4xl font-black text-red-600 dark:text-red-400">{opponentPoints}</p>
                          <p className="text-sm text-muted-foreground mt-2">Total de Pontos</p>
                        </div>
                      </div>

                      <Button onClick={simulateBattle} className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Simular Batalha!
                      </Button>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-bold mb-4">Sua Equipe:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedPlayers.map(player => (
                              <div key={player.id} className="bg-muted p-2 rounded-lg text-center">
                                <p className="font-bold text-xs">{player.name}</p>
                                <p className="text-xs text-muted-foreground">{player.team}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold mb-4">Equipe do Oponente:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {opponentPlayers.map(player => (
                              <div key={player.id} className="bg-muted p-2 rounded-lg text-center">
                                <p className="font-bold text-xs">{player.name}</p>
                                <p className="text-xs text-muted-foreground">{player.team}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "players" && (
            <motion.div
              key="players"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>{t("fantasy.players")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInitialData ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {players.map(player => {
                      const isSelected = selectedPlayers.find(p => p.id === player.id);
                      const canAfford = budget >= player.price;
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary"
                              : canAfford
                              ? "bg-muted border-muted-foreground/30 hover:border-primary"
                              : "bg-muted/50 border-muted-foreground/10 opacity-50"
                          }`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-black text-lg overflow-hidden">
                              {player.image ? (
                                <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{player.name.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold">{player.name}</p>
                              <p className="text-sm text-gray-400">{player.team} • {player.position}</p>
                              {player.stats && (
                                <div className="mt-1 flex gap-2 text-xs">
                                  <span className="text-green-400">⚽{player.stats.goals}</span>
                                  <span className="text-blue-400">🅰️{player.stats.assists}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-yellow-400 font-bold">{player.price}</p>
                              <p className="text-xs text-gray-400">{player.points} pts</p>
                            </div>
                            <Button
                              size="sm"
                              variant={isSelected ? "destructive" : "default"}
                              onClick={() => togglePlayer(player)}
                              disabled={!isSelected && (!canAfford || selectedPlayers.length >= TEAM_SIZE)}
                            >
                              {isSelected ? (
                                <Minus className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "matches" && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>{t("fantasy.nextMatch")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loadingInitialData ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : matches.map(match => (
                      <div key={match.id} className="p-4 bg-muted rounded-xl border border-muted-foreground/20">
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <p className="font-bold text-lg">{match.homeTeam}</p>
                          </div>
                          <div className="px-4 text-center">
                            <p className="text-2xl font-black text-gray-500">
                              {match.status === "live" ? (
                                <span className="text-red-500 animate-pulse">{match.score}</span>
                              ) : "VS"}
                            </p>
                            <p className="text-xs text-gray-400">{match.date}</p>
                            {match.status === "live" && (
                              <Badge variant="destructive" className="mt-1">Ao Vivo</Badge>
                            )}
                          </div>
                          <div className="text-center flex-1">
                            <p className="font-bold text-lg">{match.awayTeam}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "prizes" && (
            <motion.div
              key="prizes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>{t("fantasy.prizes")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { rank: 1, prize: "10,000 MZN", color: "from-yellow-400 to-amber-500" },
                      { rank: 2, prize: "5,000 MZN", color: "from-gray-300 to-gray-400" },
                      { rank: 3, prize: "2,500 MZN", color: "from-orange-400 to-red-500" },
                      { rank: "4-10", prize: "500 MZN", color: "from-blue-400 to-indigo-500" },
                    ].map(prize => (
                      <div
                        key={prize.rank}
                        className="p-4 rounded-xl border bg-gradient-to-r opacity-80"
                        style={{
                          borderColor: "rgba(255,255,255,0.1)",
                          background: `linear-gradient(to right, ${prize.color.split(" ")[0].replace("from-", "#")}, ${prize.color.split(" ")[1].replace("to-", "#")})`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-black text-white">Rank #{prize.rank}</p>
                            </div>
                          </div>
                          <p className="text-2xl font-black text-white">{prize.prize}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FantasyFootball;
