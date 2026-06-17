import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Calendar, TrendingUp, Plus, Minus, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";

interface Player {
  id: string;
  name: string;
  team: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  price: number;
  points: number;
  image?: string;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
}

const SAMPLE_PLAYERS: Player[] = [
  { id: "1", name: "Cristiano Ronaldo", team: "Portugal", position: "FWD", price: 120, points: 85 },
  { id: "2", name: "Lionel Messi", team: "Argentina", position: "FWD", price: 118, points: 88 },
  { id: "3", name: "Kylian Mbappé", team: "France", position: "FWD", price: 115, points: 82 },
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
  { id: "1", homeTeam: "Portugal", awayTeam: "France", date: "2026-06-20 20:00" },
  { id: "2", homeTeam: "Brazil", awayTeam: "Argentina", date: "2026-06-21 16:00" },
  { id: "3", homeTeam: "Germany", awayTeam: "England", date: "2026-06-22 18:00" },
];

const INITIAL_BUDGET = 1000;
const TEAM_SIZE = 11;

const FantasyFootball: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [budget, setBudget] = useState(INITIAL_BUDGET);
  const [activeTab, setActiveTab] = useState<"team" | "players" | "matches" | "prizes">("team");
  const [myPoints, setMyPoints] = useState(0);

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

  const simulateGameWeek = () => {
    const newPoints = selectedPlayers.reduce((sum, p) => sum + Math.floor(Math.random() * 15), 0);
    setMyPoints(prev => prev + newPoints);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
            {t("fantasy.title")}
          </h1>
          <p className="text-xl text-gray-400 mt-2">{t("fantasy.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t("fantasy.budget")}</p>
                  <p className="text-3xl font-black text-yellow-400">{budget} <Coins className="inline w-6 h-6 ml-1" /></p>
                </div>
                <Coins className="w-12 h-12 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t("fantasy.myPoints")}</p>
                  <p className="text-3xl font-black text-blue-400">{myPoints}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t("fantasy.myTeam")}</p>
                  <p className="text-3xl font-black text-green-400">{selectedPlayers.length}/{TEAM_SIZE}</p>
                </div>
                <Users className="w-12 h-12 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Next Matchday</p>
                  <p className="text-xl font-black text-purple-400">Matchday 1</p>
                </div>
                <Calendar className="w-12 h-12 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: "team", label: t("fantasy.myTeam"), icon: <Users className="w-4 h-4" /> },
            { id: "players", label: t("fantasy.players"), icon: <TrendingUp className="w-4 h-4" /> },
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
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>{t("fantasy.myTeam")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPlayers.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
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
                          className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-purple-500 transition-all"
                        >
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <span className="text-2xl font-black">{player.name.charAt(0)}</span>
                            </div>
                            <p className="font-bold">{player.name}</p>
                            <p className="text-xs text-gray-400">{player.team} • {player.position}</p>
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
                    <Button className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" onClick={simulateGameWeek}>
                      <Trophy className="w-4 h-4 mr-2" />
                      Simulate Matchday
                    </Button>
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
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>{t("fantasy.players")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {SAMPLE_PLAYERS.map(player => {
                      const isSelected = selectedPlayers.find(p => p.id === player.id);
                      const canAfford = budget >= player.price;
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-purple-500/20 border-purple-500"
                              : canAfford
                              ? "bg-gray-700/30 border-gray-600 hover:border-blue-500"
                              : "bg-gray-700/10 border-gray-700 opacity-50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-black text-lg">
                              {player.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold">{player.name}</p>
                              <p className="text-sm text-gray-400">{player.team} • {player.position}</p>
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
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>{t("fantasy.nextMatch")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {SAMPLE_MATCHES.map(match => (
                      <div key={match.id} className="p-4 bg-gray-700/30 rounded-xl border border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <p className="font-bold text-lg">{match.homeTeam}</p>
                          </div>
                          <div className="px-4">
                            <p className="text-2xl font-black text-gray-500">VS</p>
                            <p className="text-xs text-gray-400">{match.date}</p>
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
              <Card className="bg-gray-800/50 border-gray-700">
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
