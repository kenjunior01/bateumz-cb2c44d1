import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Calendar, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  group?: string;
  stage?: string;
}

interface Prediction {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}

const WORLD_CUP_MATCHES: Match[] = [
  { id: "1", homeTeam: "Brazil", awayTeam: "Argentina", date: "2026-06-20 16:00", group: "A" },
  { id: "2", homeTeam: "Germany", awayTeam: "France", date: "2026-06-20 18:00", group: "B" },
  { id: "3", homeTeam: "Portugal", awayTeam: "Spain", date: "2026-06-21 20:00", group: "C" },
  { id: "4", homeTeam: "England", awayTeam: "Italy", date: "2026-06-21 16:00", group: "D" },
  { id: "5", homeTeam: "Netherlands", awayTeam: "Belgium", date: "2026-06-22 18:00", group: "E" },
];

const WorldCupPredictor: React.FC = () => {
  const { t } = useLanguage();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const matchesPerPage = 2;

  const currentMatches = WORLD_CUP_MATCHES.slice(
    currentPage * matchesPerPage,
    (currentPage + 1) * matchesPerPage
  );

  const totalPages = Math.ceil(WORLD_CUP_MATCHES.length / matchesPerPage);

  const updatePrediction = (matchId: string, homeGoals: number, awayGoals: number) => {
    setPredictions(prev => {
      const existing = prev.find(p => p.matchId === matchId);
      if (existing) {
        return prev.map(p =>
          p.matchId === matchId
            ? { ...p, homeGoals, awayGoals }
            : p
        );
      }
      return [...prev, { matchId, homeGoals, awayGoals }];
    });
  };

  const getPrediction = (matchId: string): Prediction | undefined => {
    return predictions.find(p => p.matchId === matchId);
  };

  const submitPredictions = () => {
    confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-emerald-900 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            🏆 Copa do Mundo 2026 - Predictor
          </h1>
          <p className="text-xl text-gray-300">
            Faça suas apostas e ganhe pontos!
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <p className="text-sm text-gray-300">Predições Feitas</p>
              <p className="text-3xl font-black text-yellow-400">{predictions.length}/{WORLD_CUP_MATCHES.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <p className="text-sm text-gray-300">Pontos Atuais</p>
              <p className="text-3xl font-black text-blue-400">0</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-6">
              <p className="text-sm text-gray-300">Ranking</p>
              <p className="text-3xl font-black text-green-400">#--</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {currentMatches.map(match => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card className="bg-white/10 border-white/20">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>
                        {match.group && (
                          <Badge variant="outline" className="mr-2">{match.group}</Badge>
                        )}
                        {match.stage || "Fase de Grupos"}
                      </CardTitle>
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {match.date}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-center text-xl font-bold">{match.homeTeam}</p>
                      </div>

                      <div className="flex gap-2 bg-black/30 rounded-xl p-2">
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={getPrediction(match.id)?.homeGoals ?? ""}
                          onChange={(e) =>
                            updatePrediction(match.id, Number(e.target.value), getPrediction(match.id)?.awayGoals ?? 0)
                          }
                          className="w-16 text-center text-2xl font-bold bg-white/20 border-white/30"
                        />
                        <div className="text-2xl font-black px-2 self-center">X</div>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={getPrediction(match.id)?.awayGoals ?? ""}
                          onChange={(e) =>
                            updatePrediction(match.id, getPrediction(match.id)?.homeGoals ?? 0, Number(e.target.value))
                          }
                          className="w-16 text-center text-2xl font-bold bg-white/20 border-white/30"
                        />
                      </div>

                      <div className="flex-1">
                        <p className="text-center text-xl font-bold">{match.awayTeam}</p>
                      </div>

                      {getPrediction(match.id) && (
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="border-white/30 hover:bg-white/20"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
            </Button>
            <p className="text-lg">
              Página {currentPage + 1} de {totalPages}
            </p>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="border-white/30 hover:bg-white/20"
            >
              Próxima <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <Button
            className="w-full mt-8 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-lg font-bold py-6"
            onClick={submitPredictions}
            disabled={predictions.length < WORLD_CUP_MATCHES.length}
          >
            <Trophy className="w-6 h-6 mr-2" /> Enviar Todas as Predições
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorldCupPredictor;
