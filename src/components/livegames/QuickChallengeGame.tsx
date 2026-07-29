import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Users, Clock, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';

interface QuickChallenge {
  id: string;
  title: string;
  question: string;
  correctAnswer: string;
  options: string[];
  timeLimit: number;
  pointsReward: number;
  category: string;
}

interface QuickChallengeGameProps {
  challenges?: QuickChallenge[];
  onChallengeComplete?: (points: number, correct: boolean) => void;
  onGameEnd?: (totalPoints: number, correctAnswers: number) => void;
  maxChallenges?: number;
}

const DEFAULT_CHALLENGES: QuickChallenge[] = [
  {
    id: '1',
    title: 'Qual é a Capital do Brasil?',
    question: 'Qual é a capital do Brasil?',
    correctAnswer: 'Brasília',
    options: ['São Paulo', 'Brasília', 'Rio de Janeiro', 'Salvador'],
    timeLimit: 10,
    pointsReward: 50,
    category: 'Geography'
  },
  {
    id: '2',
    title: 'Quantos Continentes Existem?',
    question: 'Quantos continentes existem?',
    correctAnswer: '7',
    options: ['5', '6', '7', '8'],
    timeLimit: 8,
    pointsReward: 50,
    category: 'Geography'
  },
  {
    id: '3',
    title: 'Qual é o Maior Oceano?',
    question: 'Qual é o maior oceano do mundo?',
    correctAnswer: 'Oceano Pacífico',
    options: ['Oceano Atlântico', 'Oceano Índico', 'Oceano Pacífico', 'Oceano Ártico'],
    timeLimit: 10,
    pointsReward: 50,
    category: 'Geography'
  },
];

const QuickChallengeGame: React.FC<QuickChallengeGameProps> = ({
  challenges = DEFAULT_CHALLENGES,
  onChallengeComplete,
  onGameEnd,
  maxChallenges = 5
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(challenges[0]?.timeLimit || 10);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [streak, setStreak] = useState(0);

  const currentChallenge = challenges[currentIndex];

  useEffect(() => {
    if (answered || !currentChallenge || gameEnded) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [answered, currentChallenge, gameEnded]);

  const handleTimeout = () => {
    setAnswered(true);
    setStreak(0);
  };

  const handleAnswer = (answer: string) => {
    if (answered) return;

    setSelectedAnswer(answer);
    setAnswered(true);

    const isCorrect = answer === currentChallenge?.correctAnswer;

    if (isCorrect) {
      const points = currentChallenge?.pointsReward || 50;
      setTotalPoints(prev => prev + points);
      setCorrectCount(prev => prev + 1);
      setStreak(prev => prev + 1);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
    } else {
      setStreak(0);
    }

    if (onChallengeComplete) {
      onChallengeComplete(isCorrect ? currentChallenge?.pointsReward || 50 : 0, isCorrect);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= Math.min(maxChallenges, challenges.length)) {
      setGameEnded(true);
      if (onGameEnd) {
        onGameEnd(totalPoints, correctCount);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(challenges[currentIndex + 1]?.timeLimit || 10);
      setSelectedAnswer(null);
      setAnswered(false);
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
              <h2 className="text-4xl font-black text-white mb-2">JOGO TERMINADO!</h2>
              <p className="text-gray-400">Você completou todos os desafios</p>
            </div>
            <div className="space-y-4 bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Pontos Totais:</span>
                <span className="text-3xl font-black text-primary">{totalPoints}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Acertos:</span>
                <span className="text-2xl font-black text-green-400">{correctCount}/{Math.min(maxChallenges, challenges.length)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Taxa de Acerto:</span>
                <span className="text-2xl font-black text-blue-400">
                  {Math.round((correctCount / Math.min(maxChallenges, challenges.length)) * 100)}%
                </span>
              </div>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full h-12 rounded-full font-black text-lg">
              JOGAR NOVAMENTE
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentChallenge) {
    return null;
  }

  const timePercentage = (timeLeft / currentChallenge.timeLimit) * 100;
  const isCorrect = selectedAnswer === currentChallenge.correctAnswer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <Zap className="w-3 h-3" />
                {currentIndex + 1} de {Math.min(maxChallenges, challenges.length)}
              </Badge>
              {streak > 0 && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 gap-1">
                  <Trophy className="w-3 h-3" />
                  Sequência: {streak}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Pontos</div>
              <div className="text-2xl font-black text-primary">{totalPoints}</div>
            </div>
          </div>

          <Progress value={timePercentage} className="mb-4 h-2" />

          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black italic">
              {currentChallenge.title}
            </CardTitle>
            <div className={`text-2xl font-black ${timePercentage > 50 ? 'text-green-400' : timePercentage > 25 ? 'text-yellow-400' : 'text-red-400'}`}>
              {timeLeft}s
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">
            {currentChallenge.question}
          </h2>

          <div className="grid gap-3">
            {currentChallenge.options.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={answered}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border-2 transition-all text-left font-semibold text-lg ${
                  selectedAnswer === option
                    ? isCorrect
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-red-500/20 border-red-500 text-red-400'
                    : answered && option === currentChallenge.correctAnswer
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50 text-white'
                } ${answered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-black text-sm">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span>{option}</span>
                </div>
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border-2 text-center ${
                  isCorrect
                    ? 'bg-green-500/10 border-green-500/50'
                    : 'bg-red-500/10 border-red-500/50'
                }`}
              >
                <p className={`font-black mb-3 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? '✓ CORRETO!' : '✗ INCORRETO'}
                </p>
                <Button onClick={handleNext} className="w-full rounded-full">
                  {currentIndex + 1 >= Math.min(maxChallenges, challenges.length) ? 'VER RESULTADO' : 'PRÓXIMO'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickChallengeGame;
