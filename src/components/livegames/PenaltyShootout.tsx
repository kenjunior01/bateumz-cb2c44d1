import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RotateCcw, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, Goal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";

type Position = "tl" | "t" | "tr" | "l" | "c" | "r" | "bl" | "b" | "br";

interface Penalty {
  id: number;
  position: Position;
  scored: boolean;
}

const PenaltyShootout: React.FC = () => {
  const { t } = useLanguage();
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [gameState, setGameState] = useState<"start" | "playing" | "won" | "lost">("start");
  const [kickCount, setKickCount] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const positions: Position[] = ["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"];

  const startGame = () => {
    setPlayerScore(0);
    setOpponentScore(0);
    setPenalties([]);
    setKickCount(0);
    setGameState("playing");
    setResultMessage(null);
  };

  const takePenalty = async (position: Position) => {
    if (shooting) return;
    setShooting(true);

    // Random goalkeeper save position
    const goalkeeperPosition = positions[Math.floor(Math.random() * positions.length)];
    const scored = position !== goalkeeperPosition;

    const newPenalty: Penalty = {
      id: kickCount,
      position,
      scored,
    };

    setPenalties(prev => [...prev, newPenalty]);

    // Player score
    if (scored) {
      setPlayerScore(prev => prev + 1);
      setResultMessage("GOOOOL! ⚽");
    } else {
      setResultMessage("DEFENDIDO! 🧤");
    }

    // Opponent's turn
    await new Promise(resolve => setTimeout(resolve, 1500));
    const opponentScored = Math.random() > 0.3;
    if (opponentScored) {
      setOpponentScore(prev => prev + 1);
      setResultMessage("O adversário marcou 😅");
    } else {
      setResultMessage("O adversário errou! 🎉");
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const newKickCount = kickCount + 1;
    setKickCount(newKickCount);

    // Check for game end
    if (newKickCount >= 5) {
      if (playerScore > opponentScore) {
        setGameState("won");
        confetti({ particleCount: 300, spread: 100, origin: { y: 0.5 } });
      } else if (opponentScore > playerScore) {
        setGameState("lost");
      }
      // Sudden death if tied
    }

    setShooting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-900 text-white p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        <AnimatePresence>
          {gameState === "start" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto" />
              <h1 className="text-5xl font-black">Disputa de Pênaltis!</h1>
              <p className="text-xl text-green-200">
                Escolha o canto e marque gols para vencer!
              </p>
              <Button
                size="lg"
                className="text-2xl px-12 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                onClick={startGame}
              >
                Começar Jogo!
              </Button>
            </motion.div>
          )}

          {(gameState === "playing" || gameState === "won" || gameState === "lost") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full"
            >
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <Card className="bg-blue-900/40 border-blue-500/30">
                  <CardContent className="p-6 text-center">
                    <p className="text-lg text-gray-300 mb-2">Você</p>
                    <p className="text-5xl font-black">{playerScore}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-900/40 border-red-500/30">
                  <CardContent className="p-6 text-center">
                    <p className="text-lg text-gray-300 mb-2">Adversário</p>
                    <p className="text-5xl font-black">{opponentScore}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Scoreboard of penalties */}
              <div className="flex justify-center gap-2 mb-8">
                {penalties.map((penalty, index) => (
                  <div
                    key={penalty.id}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      penalty.scored ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {penalty.scored ? "⚽" : "❌"}
                  </div>
                ))}
              </div>

              {/* Result Message */}
              {resultMessage && (
                <div className="text-center mb-6">
                  <p className="text-2xl font-bold">{resultMessage}</p>
                </div>
              )}

              {/* Goal Area */}
              <div className="relative bg-green-700 rounded-3xl p-4 mb-8 border-4 border-white/20">
                {/* Goalposts */}
                <div className="border-t-8 border-l-8 border-r-8 border-white/30 rounded-t-3xl aspect-video relative">
                  {/* Grid of positions */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2 p-4">
                    {[
                      { pos: "tl", icon: <ChevronUp className="w-6 h-6 ml-auto rotate-45" /> },
                      { pos: "t", icon: <ChevronUp className="w-6 h-6 mx-auto" /> },
                      { pos: "tr", icon: <ChevronUp className="w-6 h-6 mr-auto -rotate-45" /> },
                      { pos: "l", icon: <ChevronLeft className="w-6 h-6" /> },
                      { pos: "c", icon: <Goal className="w-8 h-8 mx-auto" /> },
                      { pos: "r", icon: <ChevronRight className="w-6 h-6 ml-auto" /> },
                      { pos: "bl", icon: <ChevronDown className="w-6 h-6 ml-auto rotate-45" /> },
                      { pos: "b", icon: <ChevronDown className="w-6 h-6 mx-auto" /> },
                      { pos: "br", icon: <ChevronDown className="w-6 h-6 mr-auto -rotate-45" /> },
                    ].map(({ pos, icon }) => (
                      <button
                        key={pos}
                        onClick={() => gameState === "playing" && takePenalty(pos as Position)}
                        disabled={shooting || gameState !== "playing"}
                        className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all disabled:opacity-30"
                      >
                        <span className="opacity-70 hover:opacity-100">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Restart Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="border-white/30 hover:bg-white/20"
                  onClick={startGame}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === "won" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto" />
              <h1 className="text-5xl font-black">VOCÊ VENCEU!</h1>
              <p className="text-2xl text-green-200">
                {playerScore} a {opponentScore}
              </p>
              <Button
                size="lg"
                className="text-xl px-10 py-5 bg-gradient-to-r from-yellow-500 to-yellow-600"
                onClick={startGame}
              >
                <RotateCcw className="w-5 h-5 mr-2" /> Jogar Novamente
              </Button>
            </motion.div>
          )}

          {gameState === "lost" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <h1 className="text-5xl font-black text-red-400">VOCÊ PERDEU</h1>
              <p className="text-2xl text-gray-300">
                {playerScore} a {opponentScore}
              </p>
              <Button
                size="lg"
                className="text-xl px-10 py-5"
                onClick={startGame}
              >
                <RotateCcw className="w-5 h-5 mr-2" /> Tentar Novamente
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PenaltyShootout;
