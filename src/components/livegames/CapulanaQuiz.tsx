import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];
const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];

interface CapulanaQuizProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

interface Question {
  q: string;
  options: string[];
  correct: number;
  category: string;
  emoji: string;
}

const QUESTIONS: Question[] = [
  { q: "Qual e a capital de Mocambique?", options: ["Maputo", "Beira", "Nampula", "Quelimane"], correct: 0, category: "Geografia", emoji: "🗺️" },
  { q: "Qual e a moeda oficial de Mocambique?", options: ["Rand", "Metical", "Escudo", "Dolar"], correct: 1, category: "Cultura", emoji: "💰" },
  { q: "Em que ano Mocambique ficou independente?", options: ["1965", "1975", "1985", "1970"], correct: 1, category: "Historia", emoji: "📅" },
  { q: "Qual e a maior provincia de Mocambique?", options: ["Nampula", "Zambezia", "Cabo Delgado", "Tete"], correct: 1, category: "Geografia", emoji: "🌍" },
  { q: "Qual e a lingua oficial de Mocambique?", options: ["Ingles", "Frances", "Portugues", "Xichuana"], correct: 2, category: "Cultura", emoji: "🗣️" },
  { q: "Quem foi o primeiro presidente de Mocambique?", options: ["Armando Guebuza", "Samora Machel", "Joaquim Chissano", "Filipe Nyusi"], correct: 1, category: "Historia", emoji: "👤" },
  { q: "Qual e o rio mais longo de Mocambique?", options: ["Limpopo", "Save", "Zambeze", "Rovuma"], correct: 2, category: "Geografia", emoji: "🏞️" },
  { q: "Qual e a dancar tradicional mais conhecida de Mocambique?", options: ["Marabaixa", "Pandza", "Marrabenta", "Kizomba"], correct: 2, category: "Musica", emoji: "💃" },
  { q: "Qual e a ilha famosa em Mocambique com arquitetura arabe?", options: ["Ilha de Mocambique", "Bazaruto", "Inhaca", "Quirimbas"], correct: 0, category: "Geografia", emoji: "🏝️" },
  { q: "Qual artista mocambicano e conhecido internacionalmente?", options: ["Neyma", "Stitch", "Azagaia", "Todas as opcoes"], correct: 3, category: "Musica", emoji: "🎤" },
  { q: "Qual prato tipico e feito com farinha de milho?", options: ["Matapa", "Xima", "Piri-piri", "Chamuca"], correct: 1, category: "Gastronomia", emoji: "🍲" },
  { q: "O que e o Matapa?", options: ["Dancar", "Prato de folhas de mandioca", "Jogo", "Instrumento"], correct: 1, category: "Gastronomia", emoji: "🥬" },
  { q: "Qual e o desporto mais popular em Mocambique?", options: ["Basquetebol", "Cricket", "Futebol", "Rugby"], correct: 2, category: "Desporto", emoji: "⚽" },
  { q: "Qual e o aeroporto internacional de Maputo?", options: ["Mavalane", "Beira", "Nampula", "Vilankulo"], correct: 0, category: "Geografia", emoji: "✈️" },
  { q: "Quantas provincias tem Mocambique?", options: ["8", "10", "11", "13"], correct: 2, category: "Geografia", emoji: "🏛️" },
  { q: "Qual oceano banha a costa de Mocambique?", options: ["Atlantico", "Indico", "Pacifico", "Artico"], correct: 1, category: "Geografia", emoji: "🌊" },
  { q: "Qual e a maior etnia de Mocambique?", options: ["Macua", "Tsonga", "Shona", "Makonde"], correct: 0, category: "Cultura", emoji: "👥" },
  { q: "O que e Capulana?", options: ["Comida", "Pano tradicional", "Dancar", "Instrumento musical"], correct: 1, category: "Cultura", emoji: "👗" },
  { q: "Em que continente fica Mocambique?", options: ["Asia", "Europa", "Africa", "America do Sul"], correct: 2, category: "Geografia", emoji: "🌍" },
  { q: "Qual e a cidade mais populosa depois de Maputo?", options: ["Nampula", "Beira", "Chimoio", "Nacala"], correct: 0, category: "Geografia", emoji: "🏙️" },
];

const BOT_SPEED = { Facil: 4000, Medio: 2500, Dificil: 1200 };
const BOT_WRONG = { Facil: 0.35, Medio: 0.12, Dificil: 0.03 };
const TOTAL_QUESTIONS = 10;

const CapulanaBg = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="capquiz" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M10 0L20 10L10 20L0 10Z" fill="none" stroke="#FFD700" strokeWidth="0.5" />
      <circle cx="10" cy="10" r="2" fill="#FF0000" opacity="0.2" />
    </pattern></defs>
    <rect width="100%" height="100%" fill="url(#capquiz)" />
  </svg>
);

export default function CapulanaQuiz({ onScore, liveCode }: CapulanaQuizProps) {
  const [mode, setMode] = useState<"bot" | "pvp">("bot");
  const [difficulty, setDifficulty] = useState<"Facil" | "Medio" | "Dificil">("Medio");
  const [phase, setPhase] = useState<"menu" | "playing" | "answered" | "gameOver">("menu");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const [botAnswer, setBotAnswer] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const p1Label = mode === "bot" ? "Voce" : "Jogador 1";
  const p2Label = mode === "bot" ? "Computador" : "Jogador 2";

  const startGame = useCallback(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, TOTAL_QUESTIONS);
    setQuestions(shuffled);
    setCurrentQ(0);
    setScores({ p1: 0, p2: 0 });
    setSelected(null);
    setBotAnswer(null);
    setStreak(0);
    setPhase("playing");
  }, []);

  /* Bot answers */
  useEffect(() => {
    if (phase !== "playing" || mode !== "bot" || !questions[currentQ]) return;
    const q = questions[currentQ];
    const speed = BOT_SPEED[difficulty];
    const wrongChance = BOT_WRONG[difficulty];
    botTimer.current = setTimeout(() => {
      let answer: number;
      if (Math.random() < wrongChance) {
        const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correct);
        answer = wrong[Math.floor(Math.random() * wrong.length)];
      } else {
        answer = q.correct;
      }
      setBotAnswer(answer);
    }, speed + Math.random() * 1000);
    return () => { if (botTimer.current) clearTimeout(botTimer.current); };
  }, [phase, currentQ, mode, difficulty, questions]);

  const handleAnswer = useCallback((optionIdx: number) => {
    if (phase !== "playing" || selected !== null) return;
    setSelected(optionIdx);
    const q = questions[currentQ];
    if (!q) return;

    let p1Points = 0;
    let p2Points = 0;
    const p1Correct = optionIdx === q.correct;
    const p2Correct = mode === "bot" ? (botAnswer === q.correct) : false;

    if (p1Correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      p1Points = 1 + (newStreak >= 3 ? 1 : 0); // bonus for 3+ streak
    } else {
      setStreak(0);
    }
    if (p2Correct) p2Points = 1;

    setScores((s) => ({ p1: s.p1 + p1Points, p2: s.p2 + p2Points }));
    setPhase("answered");
  }, [phase, selected, questions, currentQ, mode, botAnswer, streak]);

  const nextQuestion = useCallback(() => {
    if (currentQ + 1 >= questions.length) {
      setPhase("gameOver");
      if (onScore) onScore("Capulana Quiz", Math.max(scores.p1, scores.p2));
    } else {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setBotAnswer(null);
      setPhase("playing");
    }
  }, [currentQ, questions.length, onScore, scores]);

  const q = questions[currentQ];
  const winner = scores.p1 > scores.p2 ? p1Label : scores.p2 > scores.p1 ? p2Label : "Empate";
  const isP1Win = scores.p1 > scores.p2;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl border-2 border-amber-800/40 overflow-hidden"
      style={{ background: "linear-gradient(145deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)" }}>
      <CapulanaBg />

      <div className="relative z-10 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xl"
              style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>👗</div>
            <div>
              <h2 className="font-bold text-base" style={{ color: "#FFD700" }}>Capulana Quiz</h2>
              <p className="text-[10px]" style={{ color: "#CD853F" }}>Cultura Mocambicana</p>
            </div>
          </div>
          {phase !== "menu" && (
            <div className="flex items-center gap-3">
              <div className="text-center"><p className="text-[10px]" style={{ color: "#009140" }}>{p1Label}</p><p className="text-lg font-black" style={{ color: "#009140" }}>{scores.p1}</p></div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,215,0,0.1)", color: "#FFD700" }}>{currentQ + 1}/{questions.length}</span>
              <div className="text-center"><p className="text-[10px]" style={{ color: "#FF6B35" }}>{p2Label}</p><p className="text-lg font-black" style={{ color: "#FF6B35" }}>{scores.p2}</p></div>
            </div>
          )}
        </div>

        {phase === "menu" && (
          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: "#DEB887" }}>
              Testa os teus conhecimentos sobre Mocambique! {TOTAL_QUESTIONS} perguntas de cultura, geografia, gastronomia e mais.
            </p>
            <div className="flex justify-center gap-2">
              {_MODES.map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-xl text-sm font-bold ${mode === m ? "text-black" : ""}`}
                  style={mode === m ? { background: "linear-gradient(135deg, #FFD700, #FF6B35)" } : { background: "rgba(255,215,0,0.1)", color: "#CD853F" }}>
                  {m === "bot" ? "vs Computador" : "vs Jogador"}
                </button>
              ))}
            </div>
            {mode === "bot" && (
              <div className="flex justify-center gap-2">
                {_DIFFS.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${difficulty === d ? "text-black" : ""}`}
                    style={difficulty === d ? { background: d === "Facil" ? "#009140" : d === "Medio" ? "#FF6B35" : "#FF0000" } : { background: "rgba(255,255,255,0.05)", color: "#CD853F" }}>{d}</button>
                ))}
              </div>
            )}
            <button onClick={startGame} className="w-full py-3 rounded-xl text-black font-black text-lg"
              style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>Comecar Quiz</button>
          </div>
        )}

        {(phase === "playing" || phase === "answered") && q && (
          <div className="space-y-4">
            {/* Category + emoji */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{q.emoji}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,145,64,0.15)", color: "#009140" }}>{q.category}</span>
              {streak >= 3 && <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ background: "rgba(255,0,0,0.15)", color: "#FFD700" }}>🔥 Streak {streak}</span>}
            </div>

            {/* Question */}
            <h3 className="text-lg font-bold text-center" style={{ color: "#FFD700" }}>{q.q}</h3>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correct;
                const isP1Selected = selected === i;
                const isBotSelected = botAnswer === i && phase === "answered";
                const showResult = phase === "answered";
                let bgColor = "rgba(255,215,0,0.05)";
                let borderColor = "rgba(255,215,0,0.15)";
                if (showResult) {
                  if (isCorrect) { bgColor = "rgba(0,145,64,0.2)"; borderColor = "#009140"; }
                  else if (isP1Selected && !isCorrect) { bgColor = "rgba(255,0,0,0.2)"; borderColor = "#FF0000"; }
                }

                return (
                  <motion.button key={i} whileTap={phase === "playing" ? { scale: 0.97 } : {}}
                    onClick={() => handleAnswer(i)} disabled={phase === "answered"}
                    className={`relative p-3 rounded-xl text-sm font-medium text-left transition-all ${phase === "playing" ? "cursor-pointer" : ""}`}
                    style={{ background: bgColor, border: `2px solid ${borderColor}`, color: "#DEB887" }}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{ background: isP1Selected ? "#009140" : isBotSelected ? "#FF6B35" : "rgba(255,215,0,0.1)", color: (isP1Selected || isBotSelected) ? "white" : "#CD853F" }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </span>
                    {showResult && isCorrect && <span className="absolute top-1 right-2 text-green-400">✓</span>}
                    {showResult && isP1Selected && !isCorrect && <span className="absolute top-1 right-2 text-red-400">✗</span>}
                    {showResult && isBotSelected && <span className="absolute bottom-1 right-2 text-[10px]" style={{ color: "#FF6B35" }}>Bot</span>}
                  </motion.button>
                );
              })}
            </div>

            {phase === "answered" && (
              <button onClick={nextQuestion} className="w-full py-2.5 rounded-xl text-black font-bold"
                style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>
                {currentQ + 1 >= questions.length ? "Ver Resultado" : "Proxima Pergunta"}
              </button>
            )}
          </div>
        )}

        {phase === "gameOver" && (
          <div className="text-center py-8 space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl">{isP1Win ? "🏆" : "🤝"}</motion.div>
            <h3 className="text-2xl font-black" style={{ color: "#FFD700" }}>{winner}{winner !== "Empate" ? " venceu!" : "!"}</h3>
            <div className="flex justify-center gap-8">
              <div><p className="text-xs" style={{ color: "#009140" }}>{p1Label}</p><p className="text-3xl font-black" style={{ color: "#009140" }}>{scores.p1}</p></div>
              <div className="text-xl font-bold self-center" style={{ color: "#FFD700" }}>vs</div>
              <div><p className="text-xs" style={{ color: "#FF6B35" }}>{p2Label}</p><p className="text-3xl font-black" style={{ color: "#FF6B35" }}>{scores.p2}</p></div>
            </div>
            <button onClick={() => setPhase("menu")} className="px-8 py-2.5 rounded-xl text-black font-bold"
              style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>Jogar Novamente</button>
          </div>
        )}
      </div>
    </div>
  );
}