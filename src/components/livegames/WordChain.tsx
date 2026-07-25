import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Timer, Send, Heart, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const WORDS: string[] = [
  "GATO","CACHORRO","ELEFANTE","TIGRE","LEAO","ABELHA","RATO","BOI","URSO","CAMELO",
  "PAPAGAIO","TARTARUGA","GOLFINHO","BORBOLETA","PENGUIM","CROCODILO","GIRASSOL","MONTANHA",
  "RIO","MAR","TERRA","LUZ","SOL","LUA","ESTRELA","NUVEM","CHUVA","VENTO","FOGO",
  "AGUA","PEDRA","AREIA","FLORESTA","JARDIM","CASA","PORTA","JANELA","TELA","MESA",
  "CADEIRA","LIVRO","CANETA","PAPEL","TELEFONE","COMPUTADOR","CARRO","BICICLETA","AVIAO",
  "BARCO","TREM","PONTE","ESTRADA","CIDADE","PRACA","MERCADO","ESCOLA","HOSPITAL",
  "RESTAURANTE","HOTEL","BANCO","BIBLIOTECA","MUSEU","CINEMA","TEATRO","IGREJA",
  "FUTEBOL","BASQUETE","TENIS","NATACAO","VOLEI","BOXE","SURFE","CORRIDA","DANCA",
  "MUSICA","GUITARRA","PIANO","TAMBOR","FLAUTA","VIOLAO","CANTAR","TOCAR",
  "ARROZ","FEIJAO","MACARRAO","CARNE","FRANGO","PEIXE","SALADA","SOPA","BOLO",
  "CHOCOLATE","MORANGO","BANANA","ABACAXI","LARANJA","MANGA","CEREJA","UVA",
  "MEL","ACUCAR","SAL","LEITE","CAFE","SUCO","GOIABA","VERMELHO","AZUL",
  "VERDE","AMARELO","ROXO","BRANCO","PRETO","CINZA","FELIZ","TRISTE",
  "RAIVA","MEDO","AMOR","PAZ","GUERRA","VIDA","NOITE","MANHA","TARDE",
  "HORA","MINUTO","SEMANA","MES","ANO","PORTUGAL","BRASIL","FRANCA","ITALIA",
  "JAPAO","MEXICO","ALEMANHA","CHILE","EUROPA","AMERICA","AFRICA","ASIA",
  "OCEANO","CONTINENTE","ILHA","VULCAO","DINHEIRO","MOEDA","OURO","PRATA",
  "DIAMANTE","TESOURO","RIQUEZA","CABECA","CORACAO","FORCA","GRANDE","PEQUENO",
  "FORTE","RAPIDO","LENTO","ALTO","BAIXO","QUENTE","FRIO","BOM",
  "ABERTO","FECHADO","LIMPO","SUJO","NOVO","VELHO","BONITO","FEIO",
  "FACIL","DIFICIL","VERDADE","MENTIRA","HISTORIA","POEMA","ROMANCE",
  "TRABALHO","FESTA","NATAL","VERAO","INVERNO","PRIMAVERA","OUTONO",
  "DINOSSAURO","PIRATA","NINJA","SAMURAI","CAVALEIRO","PRINCESA","DRAGAO","FADA",
  "GUERREIRO","MAGICO","SECRETO","ORIGAMI","SAFARI","AVENTURA","MISTERIO","DESCOBERTA",
  "VIAGEM","CAMINHO","DESTINO","HORIZONTE","AURORA","TEMPESTADE","TROVAO","RELAMPAGO",
  "ARCOIRIS","CACHOEIRA","LAGO","DESERTO","GELO","NEVE","FOGUEIRA","ACAMPAMENTO",
];

const normalize = (w: string) => w.trim().toUpperCase().replace(/[^A-Z\u00C0-\u00FF]/g, "");

const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];

const WordChain = ({ onScore, liveCode }: Props) => {
  const [chain, setChain] = useState<string[]>([]);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [current, setCurrent] = useState<1 | 2>(1);
  const [lives, setLives] = useState({ p1: 3, p2: 3 });
  const [timer, setTimer] = useState(15);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [message, setMessage] = useState("");
  const [started, setStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const requiredLetter = chain.length > 0
    ? normalize(chain[chain.length - 1]).slice(-1)
    : null;

  const startGame = useCallback(() => {
    const first = getRandomWord();
    setChain([first]);
    setUsed(new Set([normalize(first)]));
    setCurrent(1);
    setLives({ p1: 3, p2: 3 });
    setTimer(15);
    setGameOver(false);
    setWinner(null);
    setMessage("");
    setStarted(true);
    setInput("");
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          loseLife();
          return 15;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, gameOver, current]);

  const loseLife = useCallback(() => {
    setLives(prev => {
      const next = current === 1
        ? { ...prev, p1: prev.p1 - 1 }
        : { ...prev, p2: prev.p2 - 1 };
      const dead = current === 1 ? next.p1 <= 0 : next.p2 <= 0;
      if (dead) {
        setGameOver(true);
        setWinner(current === 1 ? 2 : 1);
        setMessage(`Jogador ${current === 1 ? 2 : 1} Venceu!`);
        onScore?.(current === 1 ? "Jogador 2" : "Jogador 1", (chain.length) * 10 + (current === 1 ? next.p2 : next.p1) * 5);
      } else {
        setMessage("Tempo esgotado! Vida perdida.");
        setCurrent(current === 1 ? 2 : 1);
        setTimer(15);
      }
      return next;
    });
  }, [current, chain.length, onScore]);

  const submitWord = useCallback(() => {
    const word = normalize(input);
    if (!word || word.length < 3) {
      setMessage("M\u00ednimo 3 letras!");
      return;
    }
    if (requiredLetter && word[0] !== requiredLetter) {
      setMessage(`Deve come\u00e7ar com "${requiredLetter}"!`);
      return;
    }
    if (used.has(word)) {
      setMessage("Palavra j\u00e1 usada!");
      return;
    }
    setMessage("");
    const newChain = [...chain, word];
    setChain(newChain);
    setUsed(prev => new Set([...prev, word]));
    setInput("");
    setCurrent(current === 1 ? 2 : 1);
    setTimer(15);
  }, [input, requiredLetter, used, chain, current]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") submitWord();
  }, [submitWord]);

  useEffect(() => { inputRef.current?.focus(); }, [current, started]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20">
        <div className="text-center flex-1">
          <p className={cn("text-sm font-bold", current === 1 ? "text-cyan-400" : "text-slate-500")}>Jogador 1</p>
          <div className="flex gap-1 justify-center mt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart key={i} className={cn("w-4 h-4", i < lives.p1 ? "text-red-500 fill-red-500" : "text-slate-700")} />
            ))}
          </div>
        </div>
        <div className="text-center px-3">
          <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">CORRENTE DE PALAVRAS</Badge>
          <p className="text-[10px] text-slate-500 mt-1">Palavras: {chain.length}</p>
          {started && !gameOver && (
            <Badge className={cn("mt-1", timer <= 5 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300")}>{timer}s</Badge>
          )}
        </div>
        <div className="text-center flex-1">
          <p className={cn("text-sm font-bold", current === 2 ? "text-pink-400" : "text-slate-500")}>Jogador 2</p>
          <div className="flex gap-1 justify-center mt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart key={i} className={cn("w-4 h-4", i < lives.p2 ? "text-red-500 fill-red-500" : "text-slate-700")} />
            ))}
          </div>
        </div>
      </div>

      {!started ? (
        <div className="text-center py-12">
          <Type className="w-16 h-16 text-violet-400 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white mb-2">Corrente de Palavras</h3>
          <p className="text-sm text-slate-400 mb-6">A \u00faltima letra vira a primeira. N\u00e3o repita palavras!</p>
          <Button onClick={startGame} className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl">Iniciar Jogo</Button>
        </div>
      ) : (
        <>
          {requiredLetter && (
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Pr\u00f3xima letra:</p>
              <motion.div
                key={requiredLetter}
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40"
              >
                <span className="text-6xl font-black text-amber-400">{requiredLetter}</span>
              </motion.div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2 px-1">
            {chain.map((w, i) => (
              <motion.div
                key={`${i}-${w}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="shrink-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
              >
                {w.split("").map((c, ci) => (
                  <span
                    key={ci}
                    className={cn(
                      ci === w.length - 1 && i < chain.length - 1 && "text-amber-400 font-bold"
                    )}
                  >{c}</span>
                ))}
              </motion.div>
            ))}
            <span className="shrink-0 text-slate-600 flex items-center">\u2192</span>
          </div>

          {message && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-center text-sm font-medium",
                message.includes("usada") || message.includes("come\u00e7ar") || message.includes("M\u00ednimo")
                  ? "text-red-400"
                  : "text-amber-400"
              )}
            >{message}</motion.p>
          )}

          {!gameOver && (
            <div className={cn(
              "p-4 rounded-2xl border transition-all",
              current === 1 ? "bg-cyan-500/5 border-cyan-500/30" : "bg-pink-500/5 border-pink-500/30"
            )}>
              <p className={cn(
                "text-xs mb-2 font-bold",
                current === 1 ? "text-cyan-400" : "text-pink-400"
              )}>Vez de Jogador {current}</p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={`Palavra com "${requiredLetter || "?"}"...`}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
                />
                <Button onClick={submitWord} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl">
                  <Send className="w-4 h-4 mr-1" /> Enviar
                </Button>
              </div>
            </div>
          )}

          {gameOver && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
              <div className="text-5xl">🏆</div>
              <h3 className="text-xl font-black text-white">{message}</h3>
              <p className="text-sm text-slate-400">{chain.length} palavras na corrente</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl">Jogar Novamente</Button>
            </motion.div>
          )}
        </>
      )}

      <div className="flex justify-center">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={startGame}><RotateCcw className="w-3.5 h-3.5 mr-1" />Reiniciar</Button>
      </div>
    </div>
  );
};

export default WordChain;
