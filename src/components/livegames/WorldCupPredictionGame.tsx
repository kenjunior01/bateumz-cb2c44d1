import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, TrendingUp, Users, Clock, Award, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import confetti from 'canvas-confetti';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  status: 'upcoming' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
  homeFlag: string;
  awayFlag: string;
}

interface Prediction {
  matchId: string;
  prediction: 'home' | 'draw' | 'away';
  points: number;
  correct: boolean;
}

interface WorldCupPredictionGameProps {
  matches?: Match[];
  onPredictionMade?: (prediction: Prediction) => void;
  onGameEnd?: (totalPoints: number, correctPredictions: number) => void;
}

const DEFAULT_MATCHES: Match[] = [
  {
    id: '1',
    homeTeam: 'Brasil',
    awayTeam: 'Portugal',
    date: '2026-06-21',
    status: 'upcoming',
    homeFlag: '🇧🇷',
    awayFlag: '🇵🇹'
  },
  {
    id: '2',
    homeTeam: 'Argentina',
    awayTeam: 'França',
    date: '2026-06-22',
    status: 'upcoming',
    homeFlag: '🇦🇷',
    awayFlag: '🇫🇷'
  },
  {
    id: '3',
    homeTeam: 'Alemanha',
    awayTeam: 'Espanha',
    date: '2026-06-23',
    status: 'upcoming',
    homeFlag: '🇩🇪',
    awayFlag: '🇪🇸'
  },
];

const WorldCupPredictionGame: React.FC<WorldCupPredictionGameProps> = ({
  matches = DEFAULT_MATCHES,
  onPredictionMade,
  onGameEnd
}) => {
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);

  const currentMatch = matches[currentMatchIndex];
  const currentPrediction = predictions[currentMatch?.id];

  const handlePrediction = (prediction: 'home' | 'draw' | 'away') => {
    if (currentPrediction) return;

    // Calculate points (simplified logic)
    const points = prediction === 'draw' ? 150 : 100;
    
    const newPrediction: Prediction = {
      matchId: currentMatch.id,
      prediction,
      points,
      correct: false // Will be determined when match ends
    };

    setPredictions(prev => ({
      ...prev,
      [currentMatch.id]: newPrediction
    }));

    setTotalPoints(prev => prev + points);
    setSelectedPrediction(prediction);

    if (onPredictionMade) {
      onPredictionMade(newPrediction);
    }

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500']
    });
  };

  const handleNext = () => {
    if (currentMatchIndex + 1 >= matches.length) {
      setGameEnded(true);
      if (onGameEnd) {
        onGameEnd(totalPoints, Object.keys(predictions).length);
      }
    } else {
      setCurrentMatchIndex(prev => prev + 1);
      setSelectedPrediction(null);
    }
  };

  if (gameEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-white/10 bg-black/50 backdrop-blur-xl">
          <CardContent className="p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.5)]">
              <Trophy className="w-12 h-12 text-black" />
            </div>
            <div>
              <h2 className="text-4xl font-black text-white mb-2">PREVISÕES ENVIADAS!</h2>
              <p className="text-gray-400">Acompanhe os resultados</p>
            </div>
            <div className="space-y-4 bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Pontos Acumulados:</span>
                <span className="text-3xl font-black text-primary">{totalPoints}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Previsões Feitas:</span>
                <span className="text-2xl font-black text-blue-400">{Object.keys(predictions).length}</span>
              </div>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full h-12 rounded-full font-black text-lg">
              FAZER NOVAS PREVISÕES
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentMatch) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3" />
              {currentMatchIndex + 1} de {matches.length}
            </Badge>
            <div className="text-right">
              <div className="text-sm text-gray-400">Pontos</div>
              <div className="text-2xl font-black text-primary">{totalPoints}</div>
            </div>
          </div>
          <CardTitle className="text-2xl font-black italic">
            Faça Sua Previsão
          </CardTitle>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-8 space-y-8">
          {/* Match Card */}
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-400 mb-2">
                {new Date(currentMatch.date).toLocaleDateString('pt-PT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </p>
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-5xl mb-2">{currentMatch.homeFlag}</div>
                  <p className="font-bold text-lg">{currentMatch.homeTeam}</p>
                </div>
                <div className="text-3xl font-black text-gray-500">VS</div>
                <div className="text-center">
                  <div className="text-5xl mb-2">{currentMatch.awayFlag}</div>
                  <p className="font-bold text-lg">{currentMatch.awayTeam}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Prediction Options */}
          <div className="grid grid-cols-3 gap-4">
            <motion.button
              onClick={() => handlePrediction('home')}
              disabled={!!currentPrediction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-6 rounded-2xl border-2 transition-all font-bold text-lg ${
                selectedPrediction === 'home'
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50 text-white'
              } ${currentPrediction ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className="text-3xl mb-2">🏠</div>
              <p className="text-sm uppercase tracking-widest">Vitória</p>
              <p className="text-xs text-gray-400 mt-1">+100 pts</p>
            </motion.button>

            <motion.button
              onClick={() => handlePrediction('draw')}
              disabled={!!currentPrediction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-6 rounded-2xl border-2 transition-all font-bold text-lg ${
                selectedPrediction === 'draw'
                  ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-yellow-500/50 text-white'
              } ${currentPrediction ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className="text-3xl mb-2">🤝</div>
              <p className="text-sm uppercase tracking-widest">Empate</p>
              <p className="text-xs text-gray-400 mt-1">+150 pts</p>
            </motion.button>

            <motion.button
              onClick={() => handlePrediction('away')}
              disabled={!!currentPrediction}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-6 rounded-2xl border-2 transition-all font-bold text-lg ${
                selectedPrediction === 'away'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/50 text-white'
              } ${currentPrediction ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className="text-3xl mb-2">✈️</div>
              <p className="text-sm uppercase tracking-widest">Vitória</p>
              <p className="text-xs text-gray-400 mt-1">+100 pts</p>
            </motion.button>
          </div>

          {/* Next Button */}
          <AnimatePresence>
            {currentPrediction && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button onClick={handleNext} className="w-full h-14 rounded-full font-black text-lg gap-2">
                  <Target className="w-5 h-5" />
                  {currentMatchIndex + 1 >= matches.length ? 'VER RESUMO' : 'PRÓXIMO JOGO'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorldCupPredictionGame;
