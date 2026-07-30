import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Flame, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface TruthOrDareProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface Player {
  name: string;
  score: number;
  completed: boolean;
  coward: boolean;
}

type Phase = 'setup' | 'spinning' | 'choice' | 'reveal';

const TRUTHS: string[] = [
  'Qual é a coisa mais vergonhosa que você já fez na internet?',
  'Já deu match com alguém e se arrependeu imediatamente?',
  'Qual foi a pior mentira que você já contou para os pais?',
  'Qual é o seu guilty pleasure que ninguém sabe?',
  'Já fingiu estar doente para não sair com alguém?',
  'Qual é a coisa mais bizarra que você já pesquisou no Google?',
  'Já olhou o celular do ex? O que encontrou?',
  'Qual foi o seu pior primeiro encontro?',
  'Quem foi a última pessoa que você deletou das redes sociais?',
  'Já mandou mensagem para a pessoa errada? O que disse?',
  'Qual é a maior besteira que você já fez por amor?',
  'Já chorou assistindo um filme que ninguém chora? Qual?',
  'Qual é o segredo mais constrangedor da sua infância?',
  'Já fingiu gostar de uma música para impressionar alguém?',
  'Qual é a pior foto que existe de você? Onde está?',
  'Já foi rejeitado(a) de forma pública? Como foi?',
  'Qual é a coisa mais ridícula que você já comprou?',
  'Já falou o nome da pessoa errada na hora H?',
  'Qual é o seu maior medo que ninguém imagina?',
  'Já ficou acordado até as 5h da manhã por quê?',
  'Qual é a pior desculpa que você já usou para faltar no trabalho?',
  'Já se passou por outra pessoa online?',
  'Qual foi a pior comida que você já fez pra alguém?',
  'Já mandou áudio cantando para alguém de quem gostava?',
  'Qual é a coisa mais infantil que você ainda faz?',
  'Já ficou preso(a) em algum lugar vergonhoso?',
  'Qual é o perfil que você mais acessa no Instagram?',
  'Já desistiu de alguém por causa de uma mania bizarra?',
  'Qual é a frase mais cringe que você já disse na vida?',
  'Já foi pego(a) falando mal de alguém pelo grupo?',
];

const DARES: string[] = [
  'Faça uma imitação de um famoso por 30 segundos.',
  'Mande uma mensagem de voz cantando para o último contato do seu WhatsApp.',
  'Faça 10 flexões agora mesmo na live.',
  'Mostre a última foto salva no seu celular.',
  'Faça uma dança trending do TikTok agora.',
  'Ligue para o 3º contato da sua lista e diga "Eu te amo".',
  'Fique de olhos fechados por 1 minuto enquanto fala sobre você.',
  'Imite um animal por 20 segundos e deixe o chat adivinhar.',
  'Escreva "EU SOU LINDO(A)" no braço e mostre na câmera.',
  'Faça o discurso de formatura mais dramático possível em 30 segundos.',
  'Tente fazer a careta mais feia possível e segure por 10 segundos.',
  'Deixe o chat escolher uma música pra você dançar agora.',
  'Fale em idioma inventado por 30 segundos como se fosse sério.',
  'Faça uma pose de revista fashion por 15 segundos.',
  'Conte uma piada sem rir. Se rir, repete o desafio.',
  'Faça uma homenagem exagerada ao jogador da sua esquerda.',
  'Cante o hino nacional com emoção teatral.',
  'Faça uma propaganda inventada de um produto absurdo em 20 segundos.',
  'Escreva no chat "Eu tenho medo de rato" e espere as reações.',
  'Faça um freestyle de 30 segundos sobre o tema que o chat escolher.',
  'Dê um elogio gigante e sincero para o próximo jogador.',
  'Imite uma apresentadora de TV fazendo previsão do tempo.',
  'Tente equilibrar um objeto na cabeça por 15 segundos.',
  'Faça a voz mais grave possível e fale sobre pizza por 20 segundos.',
  'Leia o último story da primeira pessoa do seu feed em voz alta.',
  'Faça uma coreografia de 15 segundos só com os braços.',
  'Desafie alguém do chat a fazer o mesmo desafio amanhã.',
  'Cante uma música de ninar assustadora em voz baixa.',
  'Faça um comercial de shampoo com 200% de drama.',
  'Cumprimente cada jogador como se fosse de outro país.',
];

export default function TruthOrDare({ onScore, liveCode }: TruthOrDareProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [spinDisplayIdx, setSpinDisplayIdx] = useState(0);
  const [challengeType, setChallengeType] = useState<'verdade' | 'desafio' | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [usedTruths, setUsedTruths] = useState<Set<number>>(new Set());
  const [usedDares, setUsedDares] = useState<Set<number>>(new Set());
  const [revealKey, setRevealKey] = useState(0);
  const [roundHistory, setRoundHistory] = useState<{ player: string; type: string; text: string; done: boolean }[]>([]);

  const addPlayer = () => {
    const n = nameInput.trim();
    if (n && !players.some(p => p.name === n)) {
      setPlayers(prev => [...prev, { name: n, score: 0, completed: false, coward: false }]);
      setNameInput('');
    }
  };

  const removePlayer = (name: string) => {
    setPlayers(prev => prev.filter(p => p.name !== name));
  };

  const resetGame = () => {
    setPlayers(prev => prev.map(p => ({ ...p, score: 0, completed: false, coward: false })));
    setRoundHistory([]);
    setUsedTruths(new Set());
    setUsedDares(new Set());
    setPhase('setup');
    setSelectedPlayer('');
    setChallengeType(null);
    setCurrentText('');
  };

  const pickUnusedIndex = useCallback((pool: string[], used: Set<number>): number => {
    if (used.size >= pool.length) return Math.floor(Math.random() * pool.length);
    let idx: number;
    do { idx = Math.floor(Math.random() * pool.length); } while (used.has(idx));
    return idx;
  }, []);

  const startSpin = useCallback(() => {
    if (players.length < 2) return;
    setPhase('spinning');
    let count = 0;
    const total = 25 + Math.floor(Math.random() * 15);
    const baseSpeed = 60;
    const interval = setInterval(() => {
      count++;
      const delay = baseSpeed + (count / total) * 200;
      setSpinDisplayIdx(prev => (prev + 1) % players.length);
      if (count >= total) {
        clearInterval(interval);
        const finalIdx = Math.floor(Math.random() * players.length);
        setSpinDisplayIdx(finalIdx);
        setSelectedPlayer(players[finalIdx].name);
        setTimeout(() => setPhase('choice'), 600);
      }
    }, baseSpeed);
  }, [players]);

  const selectChallenge = (type: 'verdade' | 'desafio') => {
    setChallengeType(type);
    const pool = type === 'verdade' ? TRUTHS : DARES;
    const used = type === 'verdade' ? usedTruths : usedDares;
    const setUsed = type === 'verdade' ? setUsedTruths : setUsedDares;
    if (used.size >= pool.length) setUsed(new Set());
    const idx = pickUnusedIndex(pool, used);
    setCurrentText(pool[idx]);
    setUsed(prev => new Set([...prev, idx]));
    setRevealKey(k => k + 1);
    setPhase('reveal');
  };

  const resolveRound = (completed: boolean) => {
    if (!selectedPlayer) return;
    const pts = completed ? (challengeType === 'desafio' ? 3 : 2) : 0;
    setPlayers(prev => prev.map(p => {
      if (p.name !== selectedPlayer) return p;
      return {
        ...p,
        score: p.score + pts,
        completed: p.completed || completed,
        coward: p.coward || !completed,
      };
    }));
    onScore?.(selectedPlayer, pts);
    setRoundHistory(prev => [{
      player: selectedPlayer,
      type: challengeType === 'verdade' ? 'Verdade' : 'Desafio',
      text: currentText,
      done: completed,
    }, ...prev]);
    setPhase('setup');
    setChallengeType(null);
    setCurrentText('');
  };

  useEffect(() => {
    if (liveCode) setPhase('setup');
  }, [liveCode]);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const cardVariants = {
    hidden: { rotateY: 90, opacity: 0, scale: 0.7 },
    visible: { rotateY: 0, opacity: 1, scale: 1, transition: { type: 'spring', bounce: 0.25, duration: 0.7 } },
    exit: { rotateY: -90, opacity: 0, scale: 0.7, transition: { duration: 0.3 } },
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <span className="text-2xl">🎯</span> Verdade ou Desafio
        </h2>
        <div className="flex items-center gap-2">
          {roundHistory.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetGame} className="h-7 text-xs text-zinc-400 hover:text-white">
              <RefreshCw className="w-3 h-3 mr-1" /> Reiniciar
            </Button>
          )}
          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
            <Users className="w-3 h-3 mr-1" />{players.length} jogador{players.length !== 1 ? 'es' : ''}
          </Badge>
        </div>
      </div>

      {phase === 'setup' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-zinc-400">Adicione pelo menos 2 jogadores para começar</p>
              <div className="flex gap-2">
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPlayer()}
                  placeholder="Nome do jogador..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-purple-500 transition"
                />
                <Button size="sm" onClick={addPlayer} disabled={!nameInput.trim()}>+</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {players.map(p => (
                  <Badge
                    key={p.name}
                    variant="secondary"
                    className={`cursor-pointer transition-all ${
                      p.coward ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-700' :
                      p.completed ? 'bg-green-900/40 text-green-300 border border-green-700' :
                      'hover:bg-red-500/20'
                    }`}
                    onClick={() => removePlayer(p.name)}
                  >
                    {p.name}
                    {p.coward && <span className="ml-1"> coward 😨</span>}
                    {p.completed && !p.coward && <span className="ml-1"> ✓</span>}
                    <span className="ml-1 text-red-400">×</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {players.length >= 2 && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <Button
                onClick={startSpin}
                className="w-full py-6 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25 transition-all"
              >
                <RefreshCw className="w-5 h-5 mr-2" /> Girar a Roleta
              </Button>
            </motion.div>
          )}

          {players.length >= 2 && (
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-zinc-300">🏆 Placar</p>
                <div className="space-y-1">
                  {sortedPlayers.map((p, i) => (
                    <div key={p.name} className="flex justify-between items-center text-sm">
                      <span className="text-zinc-300 flex items-center gap-1">
                        {i === 0 && p.score > 0 && <span>👑</span>}
                        {p.name}
                        {p.coward && <span className="text-yellow-500 text-xs">(covarde)</span>}
                        {p.completed && !p.coward && <span className="text-green-500 text-xs">✓</span>}
                      </span>
                      <span className="font-mono font-bold text-purple-400">{p.score} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {roundHistory.length > 0 && (
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-zinc-300">📜 Histórico ({roundHistory.length} rodadas)</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {roundHistory.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                      <Badge variant="outline" className={`text-[10px] h-5 shrink-0 ${
                        r.type === 'Verdade' ? 'border-blue-600 text-blue-400' : 'border-orange-600 text-orange-400'
                      }`}>{r.type}</Badge>
                      <span className="text-zinc-300 font-medium shrink-0">{r.player}</span>
                      <span className="truncate">{r.text}</span>
                      <span className={r.done ? 'text-green-400 shrink-0' : 'text-yellow-500 shrink-0'}>
                        {r.done ? '✓' : '🐔'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'spinning' && (
          <motion.div
            key="spin"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="py-8"
          >
            <div className="relative w-56 h-56 mx-auto mb-6">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-purple-500/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-pink-500/20"
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center z-20">
                  <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.3 }}>
                    <RefreshCw className="w-5 h-5 text-purple-400" />
                  </motion.div>
                </div>
              </div>
              {players.map((p, i) => {
                const angle = (i / players.length) * 360 - 90;
                const isActive = i === spinDisplayIdx;
                return (
                  <motion.div
                    key={p.name}
                    className="absolute inset-0 flex items-center justify-center"
                    animate={isActive ? {
                      scale: [1, 1.2, 1.05],
                    } : { scale: 0.85 }}
                    transition={{ duration: 0.12 }}
                  >
                    <span
                      className={`absolute text-xs sm:text-sm font-bold px-2 py-1 rounded-full whitespace-nowrap transition-all duration-100 ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white scale-110 shadow-lg shadow-purple-500/50 z-10'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                      style={{
                        transform: `rotate(${angle}deg) translateY(-100px) rotate(-${angle}deg)`,
                      }}
                    >
                      {p.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
            <p className="text-center text-zinc-400 animate-pulse text-sm">Girando a roleta...</p>
          </motion.div>
        )}

        {phase === 'choice' && (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="space-y-5 py-6"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className="text-center"
            >
              <p className="text-lg text-zinc-400">Foi escolhido:</p>
              <p className="text-3xl font-black text-white mt-1 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {selectedPlayer}
              </p>
            </motion.div>

            <p className="text-center text-lg font-bold text-white">Escolha sua sorte:</p>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectChallenge('verdade')}
                className="flex flex-col items-center justify-center gap-3 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all"
              >
                <Heart className="w-10 h-10" />
                Verdade
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectChallenge('desafio')}
                className="flex flex-col items-center justify-center gap-3 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 transition-all"
              >
                <Flame className="w-10 h-10" />
                Desafio
              </motion.button>
            </div>
          </motion.div>
        )}

        {phase === 'reveal' && challengeType && (
          <motion.div
            key={`reveal-${revealKey}`}
            variants={cardVariants as any}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ perspective: 1000 }}
            className="space-y-4 py-2"
          >
            <div className="text-center mb-2">
              <Badge className={challengeType === 'verdade' ? 'bg-blue-600' : 'bg-orange-500'}>
                {challengeType === 'verdade' ? <Heart className="w-3 h-3 mr-1" /> : <Flame className="w-3 h-3 mr-1" />}
                {challengeType === 'verdade' ? 'VERDADE' : 'DESAFIO'}
              </Badge>
              <p className="text-sm text-zinc-400 mt-2">
                Para <span className="text-white font-semibold">{selectedPlayer}</span>
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className={`border-2 ${
                challengeType === 'verdade'
                  ? 'border-blue-500/50 bg-blue-950/40'
                  : 'border-orange-500/50 bg-orange-950/40'
              }`}>
                <CardContent className="p-6 text-center">
                  <p className="text-lg sm:text-xl font-semibold text-white leading-relaxed">
                    {currentText}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 gap-3"
            >
              <Button
                onClick={() => resolveRound(true)}
                className={`font-bold py-5 text-base ${
                  challengeType === 'verdade'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-orange-600 hover:bg-orange-500'
                }`}
              >
                ✅ Cumpriu! (+{challengeType === 'desafio' ? 3 : 2} pts)
              </Button>
              <Button
                variant="outline"
                onClick={() => resolveRound(false)}
                className="border-zinc-700 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300 font-bold py-5 text-base"
              >
                😨 Covarde
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
