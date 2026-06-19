import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Users, Target, Zap, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import confetti from 'canvas-confetti';

interface Challenge {
  id: string;
  title: string;
  description: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimit: number;
  category: 'predictions' | 'trivia' | 'statistics';
}

interface WorldCupChallengeProps {
  challenge: Challenge;
  onComplete?: (points: number, correct: boolean) => void;
  onSkip?: () => void;
}

const MOCK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: 'Quem Vence a Copa?',
    description: 'Preveja o campeão da Copa do Mundo 2026',
    question: 'Qual equipa vencerá a Copa do Mundo 2026?',
    options: ['Brasil', 'França', 'Argentina', 'Alemanha'],
    correctAnswer: 0,
    difficulty: 'hard',
    points: 500,
    timeLimit: 30,
    category: 'predictions'
  },
  {
    id: '2',
    title: 'Trivia da Copa',
    description: 'Teste seus conhecimentos sobre a Copa do Mundo',
    question: 'Em que ano foi a primeira Copa do Mundo?',
    options: ['1930', '1932', '1928', '1935'],
    correctAnswer: 0,
    difficulty: 'easy',
    points: 100,
    timeLimit: 20,
    category: 'trivia'
  },
  {
    id: '3',
    title: 'Estatísticas',
    description: 'Adivinhe estatísticas de jogadores famosos',
    question: 'Quantos golos Pelé marcou em Copas do Mundo?',
    options: ['10', '12', '15', '8'],
    correctAnswer: 1,
    difficulty: 'medium',
    points: 250,
    timeLimit: 25,
    category: 'statistics'
  },
];

const WorldCupChallenge: React.FC<WorldCupChallengeProps> = ({
  challenge,
  onComplete,
  onSkip
}) => {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(challenge.timeLimit);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    if (answered || timeLeft <= 0) return;

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
  }, [answered, timeLeft]);

  const handleTimeout = () => {
    setAnswered(true);
    setIsCorrect(false);
    if (onComplete) onComplete(0, false);
  };

  const handleAnswer = (index: number) => {
    if (answered) return;

    setSelectedAnswer(index);
    setAnswered(true);

    const correct = index === challenge.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
    }

    if (onComplete) {
      onComplete(correct ? challenge.points : 0, correct);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCategoryIcon = () => {
    switch (challenge.category) {
      case 'predictions': return <Target className="w-5 h-5" />;
      case 'trivia': return <Trophy className="w-5 h-5" />;
      case 'statistics': return <Zap className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  const timePercentage = (timeLeft / challenge.timeLimit) * 100;
  const timeColor = timePercentage > 50 ? 'text-green-400' : timePercentage > 25 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getCategoryIcon()}
              <Badge className={getDifficultyColor(challenge.difficulty)}>
                {challenge.difficulty.toUpperCase()}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Award className="w-3 h-3" />
                {challenge.points} pts
              </Badge>
            </div>
            <div className={`text-2xl font-black ${timeColor}`}>
              {timeLeft}s
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-black italic">
            {challenge.title}
          </CardTitle>
          <p className="text-sm text-gray-400 mt-2">{challenge.description}</p>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-blue-500"
              initial={{ width: '100%' }}
              animate={{ width: `${timePercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Question */}
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {challenge.question}
            </h2>

            {/* Options */}
            <div className="grid gap-3">
              {challenge.options.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={answered}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border-2 transition-all text-left font-semibold text-lg ${
                    selectedAnswer === index
                      ? isCorrect
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-red-500/20 border-red-500 text-red-400'
                      : answered && index === challenge.correctAnswer
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50 text-white'
                  } ${answered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-black">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span>{option}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Result */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-6 rounded-xl border-2 text-center ${
                  isCorrect
                    ? 'bg-green-500/10 border-green-500/50'
                    : 'bg-red-500/10 border-red-500/50'
                }`}
              >
                <p className={`text-xl font-black mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? '✓ CORRETO!' : '✗ INCORRETO'}
                </p>
                <p className="text-gray-400 mb-4">
                  {isCorrect
                    ? `Parabéns! Ganhou ${challenge.points} pontos!`
                    : `A resposta correta era: ${challenge.options[challenge.correctAnswer]}`}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={onSkip} variant="outline" className="rounded-full">
                    Próximo Desafio
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorldCupChallenge;
