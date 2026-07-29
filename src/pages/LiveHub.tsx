import { useEffect, useRef, useState, Component, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Zap, Brain, Package, RotateCcw, Sparkles, Trophy, Users, Plus, Copy, Check, Search, Vote, Play, Square, Lock, Loader2, Gamepad2, Skull, Swords, Pencil, Bomb, Hash, SmilePlus, Shuffle, Flame, Heart, Grid3X3, Anchor, Dices, CircleDot, LayoutGrid, Target, Palette, Map, Crosshair, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import TapBattle from "@/components/livegames/TapBattle";
import QuizBattle from "@/components/livegames/QuizBattle";
import MysteryBox from "@/components/livegames/MysteryBox";
import KeywordHunt from "@/components/livegames/KeywordHunt";
import EmojiBattle from "@/components/livegames/EmojiBattle";
import PrizeWheel, { DEFAULT_WHEEL_PRIZES, WheelPrize } from "@/components/livegames/PrizeWheel";
import EnhancedMillionaireGame from "@/components/livegames/EnhancedMillionaireGame";
import KahootMultiplayerQuiz from "@/components/livegames/KahootMultiplayerQuiz";
import LiveBingo from "@/components/livegames/LiveBingo";
import ChallengeRoulette from "@/components/livegames/ChallengeRoulette";
import VSDuelArena from "@/components/livegames/VSDuelArena";
import SpeedReaction from "@/components/livegames/SpeedReaction";
import TruthOrDare from "@/components/livegames/TruthOrDare";
import MemoryChallenge from "@/components/livegames/MemoryChallenge";
import PunishmentWheel from "@/components/livegames/PunishmentWheel";
import BattleOfKnowledge from "@/components/livegames/BattleOfKnowledge";
import GuessTheEmoji from "@/components/livegames/GuessTheEmoji";
import QuickDrawChallenge from "@/components/livegames/QuickDrawChallenge";
import HotPotatoGame from "@/components/livegames/HotPotatoGame";
import NumberGuessBattle from "@/components/livegames/NumberGuessBattle";
import ChaosChallenge from "@/components/livegames/ChaosChallenge";
import CheckersGame from "@/components/livegames/CheckersGame";
import LudoGame from "@/components/livegames/LudoGame";
import ConnectFourGame from "@/components/livegames/ConnectFourGame";
import BattleshipGame from "@/components/livegames/BattleshipGame";
import TicTacToeVS from "@/components/livegames/TicTacToeVS";
import UnoCardGame from "@/components/livegames/UnoCardGame";
import SnakeBattle from "@/components/livegames/SnakeBattle";
import RockPaperScissors from "@/components/livegames/RockPaperScissors";
import ColorSequence from "@/components/livegames/ColorSequence";
import SpaceShooter from "@/components/livegames/SpaceShooter";
import BallBreaker from "@/components/livegames/BallBreaker";
import ReactionRace from "@/components/livegames/ReactionRace";
import QuickMath from "@/components/livegames/QuickMath";
import MemoryCardsVS from "@/components/livegames/MemoryCardsVS";
import WordScramble from "@/components/livegames/WordScramble";
import TicTacToePro from "@/components/livegames/TicTacToePro";
import GuessNumber100 from "@/components/livegames/GuessNumber100";
import ColorMatch from "@/components/livegames/ColorMatch";
import TargetTap from "@/components/livegames/TargetTap";
import DiceDuel from "@/components/livegames/DiceDuel";
import PatternMemory from "@/components/livegames/PatternMemory";
import TriviaFlash from "@/components/livegames/TriviaFlash";
import Dominoes from "@/components/livegames/Dominoes";
import MazeRace from "@/components/livegames/MazeRace";
import SlotsVS from "@/components/livegames/SlotsVS";
import Match4Grid from "@/components/livegames/Match4Grid";
import TowerStack from "@/components/livegames/TowerStack";
import CannonBattle from "@/components/livegames/CannonBattle";
import SpotDifference from "@/components/livegames/SpotDifference";
import WordChain from "@/components/livegames/WordChain";
import NumberTetris from "@/components/livegames/NumberTetris";
import PongVS from "@/components/livegames/PongVS";
import WhackAMole from "@/components/livegames/WhackAMole";
import ColorCatch from "@/components/livegames/ColorCatch";
import MexericaGame from "@/components/livegames/MexericaGame";
import ChigogoGame from "@/components/livegames/ChigogoGame";
import UrusseGame from "@/components/livegames/UrusseGame";
import CapulanaQuiz from "@/components/livegames/CapulanaQuiz";
import LiveLeaderboard, { LeaderEntry } from "@/components/livegames/LiveLeaderboard";
import LiveControlPanel from "@/components/livegames/LiveControlPanel";
import LiveGameSettings, { DEFAULT_CONFIG, LiveGameConfig, CompanyBranding, DEFAULT_BRANDING } from "@/components/livegames/LiveGameSettings";
import { publish, subscribe, readLatest } from "@/lib/liveBus";
import { ParticleBackground } from "@/components/effects";
import { appendHistory } from "@/lib/liveHistory";
import { useToast } from "@/hooks/use-toast";
import AmbassadorPanel from "@/components/ambassadors/AmbassadorPanel";
import { useAuth } from "@/contexts/AuthContext";
import { getGameManagerPath } from "@/lib/game-manager-paths";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


// Per-game error boundary so one crashing game does not kill the whole page
class GameErrorBoundary extends Component<{children: ReactNode; gameName: string}, {hasError: boolean}> {
  constructor(props: {children: ReactNode; gameName: string}) { super(props); this.state = {hasError: false}; }
  static getDerivedStateFromError() { return {hasError: true}; }
  componentDidCatch(err: Error) { console.error(`[GameErrorBoundary] ${this.props.gameName}:`, err); }
  render() {
    if (this.state.hasError) return (
      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5">
        <div className="text-4xl mb-3">🎮</div>
        <p className="text-sm font-bold mb-1">Erro ao carregar {this.props.gameName}</p>
        <p className="text-xs text-muted-foreground mb-3">Tente selecionar outro jogo</p>
        <button onClick={() => this.setState({hasError: false})} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Tentar novamente</button>
      </div>
    );
    return this.props.children;
  }
}
type GameId = "wheel" | "tap" | "quiz" | "mystery" | "keyword" | "emoji" | "millionaire" | "kahoot" | "bingo" | "challenge" | "vsduel" | "speed" | "truthordare" | "memory" | "punishment" | "boknowledge" | "guessEmoji" | "quickdraw" | "hotpotato" | "numguess" | "chaos" | "checkers" | "ludo" | "connect4" | "battleship" | "tictactoe" | "uno" | "snakebattle" | "rps" | "colorsequence" | "spaceshooter" | "ballbreaker" | "reactionrace" | "quickmath" | "memorycards" | "wordscramble" | "tictactoepro" | "guessnumber100" | "colormatch" | "targettap" | "diceluel" | "patternmemory" | "triviaflash" | "dominoes" | "mazerace" | "slotsvs" | "match4" | "towerstack" | "cannonbattle" | "spotdifference" | "wordchain" | "numbertetris" | "pongvs" | "whackamole" | "colorcatch" | "mexerica" | "chigogo" | "urusse" | "capulanaquiz";

interface SavedWheelGame {
  id: string;
  name: string;
  is_published?: boolean;
  segment_count?: number;
  rotation_duration?: number;
  wheel_background_color?: string;
  wheel_border_color?: string;
  spin_cost?: number;
  sound_enabled?: boolean;
  particle_effects?: boolean;
  background_image_url?: string;
  background_color?: string;
  company_logo_url?: string;
  company_slogan?: string;
  default_effect?: string;
}

const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string }[] = [
  { id: "wheel", label: "Roda de Prémios", icon: RotateCcw, emoji: "🎰", desc: "Sorteie prémios reais com probabilidades configuráveis.", grad: "from-violet-500 to-fuchsia-500" },
  { id: "keyword", label: "Caça à Palavra", icon: Search, emoji: "🔎", desc: "Audiência adivinha a palavra-chave secreta.", grad: "from-amber-500 to-orange-500" },
  { id: "emoji", label: "Batalha de Emojis", icon: Vote, emoji: "💥", desc: "Vote ao vivo, vencedores entram no sorteio.", grad: "from-pink-500 to-rose-500" },
  { id: "tap", label: "Tap Battle", icon: Zap, emoji: "⚡", desc: "Batalha de toques: 1v1 ou contra o bot.", grad: "from-amber-500 to-orange-500" },
  { id: "quiz", label: "Quiz Battle", icon: Brain, emoji: "🧠", desc: "Trivia ao vivo, sozinho ou com convidado.", grad: "from-sky-500 to-blue-500" },
  { id: "mystery", label: "Caixa Misteriosa", icon: Package, emoji: "🎁", desc: "4 caixas, prémios escondidos.", grad: "from-emerald-500 to-teal-500" },
  { id: "millionaire", label: "Quem Quer Ser Milionário?", icon: Trophy, emoji: "💰", desc: "Perguntas e respostas para ganhar o prêmio máximo!", grad: "from-purple-500 to-violet-500" },
  { id: "kahoot", label: "Quiz ao Vivo", icon: Brain, emoji: "🎯", desc: "Quiz multiplayer — a audiência joga em tempo real!", grad: "from-sky-500 to-indigo-600" },
  { id: "bingo", label: "Bingo ao Vivo", icon: Trophy, emoji: "🎱", desc: "Cartão virtual com números sorteados em tempo real!", grad: "from-emerald-500 to-teal-600" },
  { id: "challenge", label: "Roleta de Desafios", icon: RotateCcw, emoji: "🎭", desc: "Gire a roleta e cuma o desafio sorteado ao vivo!", grad: "from-fuchsia-500 to-pink-500" },
  { id: "vsduel", label: "Arena de Duelo VS", icon: Swords, emoji: "⚔️", desc: "Duelo 1v1: reação, matemática e palavras ao vivo!", grad: "from-red-500 to-orange-600" },
  { id: "speed", label: "Duelo de Velocidade", icon: Zap, emoji: "⚡", desc: "Quem reage mais rápido? Teste de reflexo 1v1!", grad: "from-cyan-500 to-blue-600" },
  { id: "truthordare", label: "Verdade ou Desafio", icon: Heart, emoji: "🔥", desc: "Verdades picantes e desafios engraçados ao vivo!", grad: "from-rose-500 to-red-600" },
  { id: "memory", label: "Jogo da Memória VS", icon: Brain, emoji: "🧠", desc: "Batalha de pares — quem tem melhor memória?", grad: "from-indigo-500 to-purple-600" },
  { id: "punishment", label: "Roleta de Castigos", icon: Skull, emoji: "💀", desc: "Gire a roleta e cumpra o castigo sorteado!", grad: "from-red-600 to-rose-700" },
  { id: "boknowledge", label: "Batalha de Conhecimentos", icon: Brain, emoji: "📚", desc: "Trivia VS com bônus de streak — 10 perguntas!", grad: "from-cyan-500 to-purple-600" },
  { id: "guessEmoji", label: "Adivinhe o Emoji", icon: SmilePlus, emoji: "😎", desc: "Decifre a frase a partir dos emojis!", grad: "from-yellow-500 to-amber-600" },
  { id: "quickdraw", label: "Desenho Rápido", icon: Pencil, emoji: "🎨", desc: "Desenhe e deixe o público adivinhar a palavra!", grad: "from-emerald-500 to-teal-600" },
  { id: "hotpotato", label: "Batata Quente", icon: Bomb, emoji: "💣", desc: "Passe a batata — quem tiver com ela quando explodir, sai!", grad: "from-orange-500 to-red-600" },
  { id: "numguess", label: "Adivinha o Número VS", icon: Hash, emoji: "🔢", desc: "Duelo — quem adivinha o número secreto primeiro?", grad: "from-violet-500 to-fuchsia-600" },
  { id: "chaos", label: "Desafio Caótico", icon: Shuffle, emoji: "🌪️", desc: "Desafios aleatórios contra o relógio: físico, mental, talento!", grad: "from-rose-500 to-pink-600" },
  { id: "checkers", label: "Damas", icon: Grid3X3, emoji: "♟️", desc: "Jogo clássico de damas com capturas obrigatórias e promoção a rei!", grad: "from-amber-700 to-red-800" },
  { id: "ludo", label: "Ludo", icon: Dices, emoji: "🎲", desc: "4 jogadores, dado, peças e muita estratégia para chegar a casa!", grad: "from-emerald-600 to-teal-700" },
  { id: "connect4", label: "Ligar 4", icon: LayoutGrid, emoji: "🔴", desc: "Estratégia pura: ligue 4 peças em linha para vencer o VS!", grad: "from-blue-500 to-yellow-500" },
  { id: "battleship", label: "Batalha Naval", icon: Anchor, emoji: "🚢", desc: "Esconda os navios e afunde a frota inimiga!", grad: "from-slate-600 to-blue-900" },
  { id: "tictactoe", label: "Galo VS", icon: CircleDot, emoji: "✕", desc: "Rápido, com apostas, streaks e modo velocidade!", grad: "from-violet-500 to-pink-500" },
  { id: "uno", label: "UNO Cartas", icon: Sparkles, emoji: "🃏", desc: "Jogo de cartas clássico com cores, especiais e UNO!", grad: "from-indigo-500 to-purple-600" },
  { id: "snakebattle", label: "Batalha de Cobras", icon: Gamepad2, emoji: "🐍", desc: "Duas cobras, um tabuleiro — quem cresce mais ganha!", grad: "from-emerald-500 to-teal-600" },
  { id: "rps", label: "Pedra Papel Tesoura", icon: Swords, emoji: "✊", desc: "Clássico Jokenpô VS — melhor de 3, 5 ou 7 rounds!", grad: "from-amber-500 to-orange-600" },
  { id: "colorsequence", label: "Sequência de Cores", icon: Sparkles, emoji: "🟢", desc: "Memorize a sequência de cores e repita — quem vai mais longe?", grad: "from-violet-500 to-fuchsia-600" },
  { id: "spaceshooter", label: "Nave Espacial VS", icon: Zap, emoji: "🚀", desc: "Destrua naves inimigas — quem faz mais pontos!", grad: "from-slate-500 to-blue-700" },
  { id: "ballbreaker", label: "Quebra-Bloco VS", icon: Gamepad2, emoji: "🧱", desc: "Destrua todos os blocos — lado a lado, quem limpa primeiro!", grad: "from-red-500 to-orange-600" },
  { id: "reactionrace", label: "Corrida de Reação", icon: Zap, emoji: "⚡", desc: "Quem reage mais rápido ao sinal? Teste de reflexos puro!", grad: "from-yellow-500 to-red-600" },
  { id: "quickmath", label: "Duelo de Matemática", icon: Brain, emoji: "🧮", desc: "Contas rápidas — quem resolve primeiro marca ponto!", grad: "from-cyan-500 to-blue-700" },
  { id: "memorycards", label: "Memória VS Cartas", icon: Brain, emoji: "🃏", desc: "Encontre os pares no tabuleiro partilhado — turno a turno!", grad: "from-indigo-500 to-violet-600" },
  { id: "wordscramble", label: "Palavras Embaralhadas", icon: Shuffle, emoji: "🔤", desc: "Descubra a palavra escondida nas letras misturadas!", grad: "from-rose-500 to-pink-600" },
  { id: "tictactoepro", label: "Galo PRO", icon: Grid3X3, emoji: "✖", desc: "Galo Ultimate — 9 mini-tabuleiros, estratégia avançada!", grad: "from-violet-600 to-indigo-700" },
  { id: "guessnumber100", label: "Adivinha 1 a 100", icon: Hash, emoji: "🔢", desc: "Quente/Frio — quem adivinha o número secreto primeiro?", grad: "from-teal-500 to-cyan-700" },
  { id: "colormatch", label: "Cor versus Palavra", icon: Palette, emoji: "🎨", desc: "Teste Stroop — identifique a COR do texto, não a palavra!", grad: "from-pink-500 to-rose-700" },
  { id: "targettap", label: "Alvo Rápido", icon: Target, emoji: "🎯", desc: "Toque nos alvos certos antes que desapareçam!", grad: "from-orange-500 to-red-600" },
  { id: "diceluel", label: "Duelo de Dados", icon: Dices, emoji: "🎲", desc: "Banco ou Arriscar? Corrida a 100 ou melhor de rounds!", grad: "from-amber-600 to-yellow-600" },
  { id: "patternmemory", label: "Memória de Padrões", icon: Grid3X3, emoji: "🧩", desc: "Memorize o padrão de células iluminadas e repita!", grad: "from-purple-500 to-violet-700" },
  { id: "triviaflash", label: "Trivia Flash", icon: Brain, emoji: "❗", desc: "Verdadeiro ou Falso rápido — 20 perguntas, velocidade conta!", grad: "from-emerald-500 to-teal-700" },
  { id: "dominoes", label: "Dominó", icon: LayoutGrid, emoji: "🎲", desc: "Dominó clássico — encaixe as peças e esvazie a mão!", grad: "from-slate-600 to-zinc-700" },
  { id: "mazerace", label: "Corrida no Labirinto", icon: Map, emoji: "🧩", desc: "Quem sai do labirinto primeiro? Labirintos aleatórios!", grad: "from-green-600 to-emerald-700" },
  { id: "slotsvs", label: "Caça-Níqueis VS", icon: Sparkles, emoji: "🎰", desc: "Gire as máquinas — quem acumula mais moedas vence!", grad: "from-amber-500 to-yellow-500" },
  { id: "match4", label: "Combina 4", icon: Sparkles, emoji: "✨", desc: "Combine 4+ peças iguais — cascatas e combos!", grad: "from-pink-500 to-rose-600" },
  { id: "towerstack", label: "Torre VS", icon: Layers, emoji: "🏗️", desc: "Empilhe blocos com precisão — quem constrói mais alto!", grad: "from-sky-500 to-blue-600" },
  { id: "cannonbattle", label: "Batalha de Canhões", icon: Crosshair, emoji: "💣", desc: "Ajuste ângulo e força — destrua o adversário!", grad: "from-red-600 to-orange-700" },
  { id: "spotdifference", label: "Encontre Diferenças", icon: Search, emoji: "🔍", desc: "Encontre 5 diferenças entre cenas geradas!", grad: "from-amber-500 to-yellow-600" },
  { id: "wordchain", label: "Corrente de Palavras", icon: Shuffle, emoji: "🔗", desc: "A última letra vira a primeira — não repita palavras!", grad: "from-teal-500 to-emerald-600" },
  { id: "numbertetris", label: "Números Caindo", icon: LayoutGrid, emoji: "🔢", desc: "Números caem e combinam — estilo Tetris 2048!", grad: "from-orange-600 to-red-700" },
  { id: "pongvs", label: "Pong VS", icon: Gamepad2, emoji: "🏓", desc: "Clássico Pong arcade — 1v1 ou contra o bot, primeiro a 5!", grad: "from-blue-600 to-indigo-700" },
  { id: "whackamole", label: "Bate o Alvo", icon: Target, emoji: "🎯", desc: "Toque nas criaturas que aparecem — quem marca mais pontos em 30s!", grad: "from-emerald-500 to-green-600" },
  { id: "colorcatch", label: "Pesca Cores", icon: Palette, emoji: "🎨", desc: "Clique nas cores certas o mais rápido possível!", grad: "from-pink-500 to-rose-600" },
  { id: "mexerica", label: "Mexerica", icon: Zap, emoji: "✋", desc: "Bate a Mao — jogo mocambicano de reflexos! Toque nas maos antes que sumam!", grad: "from-amber-600 to-red-700" },
  { id: "chigogo", label: "Chigogo", icon: Target, emoji: "🪨", desc: "Adivinha a Pedrinha — esconda e adivinhe! Jogo tradicional mocambicano!", grad: "from-yellow-700 to-amber-800" },
  { id: "urusse", label: "Urusse", icon: Gamepad2, emoji: "🟤", desc: "Mancala mocambicano — semeie, capture e venca! Jogo de tabuleiro classico!", grad: "from-green-700 to-amber-900" },
  { id: "capulanaquiz", label: "Capulana Quiz", icon: Brain, emoji: "👗", desc: "Quiz de cultura mocambicana: geografia, gastronomia, historia e mais!", grad: "from-yellow-500 to-green-700" },
];

const genCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

const LiveHub = () => {
  const { toast: uiToast } = useToast();
  const { user, role } = useAuth();
  const spinWheelManagerPath = getGameManagerPath(role, "spin-wheel");
  const [active, setActive] = useState<GameId>(() => {
    try { return (localStorage.getItem("liveActiveGame") as GameId) || "wheel"; } catch { return "wheel"; }
  });
  const [config, setConfig] = useState<LiveGameConfig>(() => {
    try {
      const s = localStorage.getItem("liveGameConfig");
      return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    try {
      const s = localStorage.getItem("liveBranding");
      return s ? { ...DEFAULT_BRANDING, ...JSON.parse(s) } : DEFAULT_BRANDING;
    } catch { return DEFAULT_BRANDING; }
  });
  const [wheelPrizes, setWheelPrizes] = useState<WheelPrize[]>(() => {
    try {
      const s = localStorage.getItem("liveWheelPrizes");
      return s ? JSON.parse(s) : DEFAULT_WHEEL_PRIZES;
    } catch { return DEFAULT_WHEEL_PRIZES; }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>(() => {
    try {
      const s = localStorage.getItem("liveLeaderboard");
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [savedGames, setSavedGames] = useState<SavedWheelGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loadingGames, setLoadingGames] = useState(false);

  // Persist branding to localStorage
  useEffect(() => {
    localStorage.setItem("liveBranding", JSON.stringify(branding));
  }, [branding]);

  // Apply branding to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', branding.primaryColor);
    root.style.setProperty('--theme-secondary', branding.secondaryColor);
    root.style.setProperty('--theme-accent', branding.accentColor);
    root.style.setProperty('--theme-background', branding.backgroundColor);
    root.style.setProperty('--theme-text', branding.textColor);
  }, [branding]);

  // Load saved games from database
  useEffect(() => {
    if (!user) return;

    const loadSavedGames = async () => {
      setLoadingGames(true);
      try {
        const { data, error } = await supabase
          .from("spin_wheel_games")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setSavedGames(data || []);
      } catch (error) {
        console.error("Error loading saved games:", error);
        toast.error("Erro ao carregar jogos salvos");
      } finally {
        setLoadingGames(false);
      }
    };

    loadSavedGames();
  }, [user]);

  // Live session lifecycle
  const [isLive, setIsLive] = useState<boolean>(() => {
    try { return localStorage.getItem("liveActive") === "1"; } catch { return false; }
  });
  const [liveCode, setLiveCode] = useState<string>(() => {
    try { return localStorage.getItem("liveCurrentCode") || ""; } catch { return ""; }
  });
  const [startedAt, setStartedAt] = useState<number>(() => {
    try { return Number(localStorage.getItem("liveStartedAt") || 0); } catch { return 0; }
  });
  const winnersRef = useRef<{ name: string; meta?: string; at: number }[]>([]);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Session timer
  useEffect(() => {
    if (!isLive || !startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [isLive, startedAt]);

  // Persist & broadcast
  useEffect(() => {
    try { localStorage.setItem("liveGameConfig", JSON.stringify(config)); } catch {}
    publish({ type: "config", payload: config });
  }, [config]);
  useEffect(() => {
    try { localStorage.setItem("liveWheelPrizes", JSON.stringify(wheelPrizes)); } catch {}
    publish({ type: "wheelPrizes", payload: wheelPrizes });
  }, [wheelPrizes]);
  useEffect(() => {
    try { localStorage.setItem("liveLeaderboard", JSON.stringify(leaderboard)); } catch {}
    publish({ type: "leaderboard", payload: leaderboard });
    if (isLive) {
      const myScore = leaderboard.filter((e) => e.game === active).reduce((a, b) => a + b.score, 0);
      publish({
        type: "roundState",
        payload: { game: active, phase: "running", timeLeft: 0, score: myScore, at: Date.now() },
      });
    }
  }, [leaderboard, isLive, active]);
  useEffect(() => {
    try { localStorage.setItem("liveActiveGame", active); } catch {}
    publish({ type: "activeGame", payload: active });
    if (isLive) publish({ type: "roundState", payload: { game: active, phase: "running", timeLeft: 0, at: Date.now() } });
  }, [active, isLive]);

  // Listen for active-game changes from the dashboard tab
  useEffect(() => {
    const unsub = subscribe((evt) => {
      if (evt.type === "activeGame" && (evt.payload as GameId) !== active) {
        setActive(evt.payload as GameId);
      }
    });
    // Hydrate latest from bus
    const latest = readLatest<string>("activeGame");
    if (latest && latest !== active) setActive(latest as GameId);
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const recordScore = (game: string) => (name: string, score: number) => {
    if (!name || !isLive) return;
    setLeaderboard((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },
    ]);
  };

  const broadcastWinner = (name: string, meta?: string) => {
    if (!isLive) return;
    const w = { name, meta, at: Date.now() };
    winnersRef.current = [...winnersRef.current, w];
    publish({ type: "winner", payload: w });
  };

  const resetConfig = () => { setConfig(DEFAULT_CONFIG); setWheelPrizes(DEFAULT_WHEEL_PRIZES); };

  const startLive = () => {
    const code = genCode();
    const now = Date.now();
    setLiveCode(code);
    setStartedAt(now);
    setIsLive(true);
    setLeaderboard([]);
    winnersRef.current = [];
    try {
      localStorage.setItem("liveCurrentCode", code);
      localStorage.setItem("liveStartedAt", String(now));
      localStorage.setItem("liveActive", "1");
    } catch {}
    publish({ type: "liveCode", payload: code });
    publish({ type: "liveStarted", payload: { code, at: now } });
    publish({ type: "roundState", payload: { game: active, phase: "running", timeLeft: 0, at: now } });
    (toast as any)({ title: "Live iniciada", description: `Código gerado: ${code}` });
  };

  const [endOpen, setEndOpen] = useState(false);
  const [endCountdown, setEndCountdown] = useState(3);
  const [ending, setEnding] = useState(false);

  // Countdown timer for end-live confirmation
  useEffect(() => {
    if (!endOpen) return;
    setEndCountdown(3);
    const t = setInterval(() => {
      setEndCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [endOpen]);

  const requestEndLive = () => {
    if (!isLive || !liveCode || ending) return;
    setEndOpen(true);
  };

  const confirmEndLive = () => {
    if (ending || endCountdown > 0) return;
    setEnding(true);
    const endedAt = Date.now();
    appendHistory({
      code: liveCode,
      startedAt: startedAt || endedAt,
      endedAt,
      durationSec: Math.max(1, Math.floor((endedAt - (startedAt || endedAt)) / 1000)),
      activeGame: active,
      winners: winnersRef.current,
      leaderboard,
    });
    publish({ type: "liveEnded", payload: { code: liveCode, at: endedAt } });
    publish({ type: "roundState", payload: { game: active, phase: "ended", timeLeft: 0, at: endedAt } });
    publish({ type: "liveCode", payload: "" });
    setIsLive(false);
    setLiveCode("");
    setStartedAt(0);
    setElapsed(0);
    try {
      localStorage.removeItem("liveCurrentCode");
      localStorage.removeItem("liveStartedAt");
      localStorage.setItem("liveActive", "0");
    } catch {}
    (toast as any)({ title: "Live encerrada", description: "Vencedores e ranking guardados no histórico." });
    setEndOpen(false);
    setEnding(false);
  };

  const copyCode = async () => {
    if (!liveCode) return;
    await navigator.clipboard.writeText(`${window.location.origin}/lives?code=${liveCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const activeMeta = GAMES.find((g) => g.id === active);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10" />
        <ParticleBackground preset="stars" count={25} className="absolute inset-0 pointer-events-none" />
        <div className="relative container mx-auto px-4 py-6 md:py-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold mb-3">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              LIVE ENGAGEMENT
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">
              Jogos para a sua <span className="text-primary">Live</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-4">
              Plataforma dedicada para empresas animarem lives com roda de prémios, batalhas, quizzes e caixas misteriosas — tudo configurável.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {isLive ? (
                <>
                  <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">AO VIVO · {fmtTime(elapsed)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Código:</span>
                    <span className="font-mono text-sm font-bold text-primary">{liveCode}</span>
                    <button onClick={copyCode} className="p-1 rounded hover:bg-secondary" aria-label="Copiar">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button onClick={requestEndLive} disabled={ending} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 disabled:opacity-50">
                    <Square className="h-3.5 w-3.5 fill-current" /> Encerrar Live
                  </button>
                </>
              ) : (
                <>
                  <button onClick={startLive} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-shadow">
                    <Play className="h-4 w-4 fill-current" /> Iniciar Live
                  </button>
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-muted-foreground text-[11px] font-medium">
                    <Lock className="h-3 w-3" /> Sem código ativo
                  </div>
                </>
              )}
              <LiveGameSettings 
                config={config} 
                onChange={setConfig} 
                branding={branding}
                onBrandingChange={setBranding}
              />
              <Link
                to="/dashboard/raffles/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Criar Sorteio Vinculado
              </Link>
            </div>

            {activeMeta && (
              <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-2.5">
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${activeMeta.grad} flex items-center justify-center text-lg`}>{activeMeta.emoji}</div>
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Jogo ativo no painel</p>
                  <p className="text-sm font-bold leading-tight">{activeMeta.label}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLive ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {isLive ? "transmitindo" : "em espera"}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {!isLive && (
        <div className="container mx-auto px-3 sm:px-4 pt-3">
          <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
            🔒 Pontuações e vencedores só são contabilizados depois de <strong>iniciar a live</strong>. Configure os jogos no painel da empresa.
          </div>
        </div>
      )}

      <section className="container mx-auto px-3 sm:px-4 pt-2 md:py-8 pb-4 sm:pb-8">
        <MobileDiscoveryHeader
          title="Jogos da Live"
          searchValue=""
          onSearchChange={() => {}}
          searchPlaceholder="Procurar jogo..."
          categories={GAMES.map((g) => ({ id: g.id, label: g.label, icon: g.emoji }))}
          activeCategory={active}
          onCategoryChange={(id) => setActive(id as GameId)}
        />

        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 mt-4">
          {GAMES.map((g) => {
            const isActive = active === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setActive(g.id)}
                className={`text-left rounded-2xl border-2 p-4 transition-all ${
                  isActive ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${g.grad} mb-2`}>
                  <g.icon className="h-5 w-5 text-white" />
                </div>
                <p className="font-display text-sm font-bold mb-1">{g.label}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{g.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-4 lg:mt-0">
          <div>
            <AnimatePresence mode="wait">
              {active === "wheel" && (
                <motion.div key="wheel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Gamepad2 className="w-5 h-5" />
                        {selectedGameId ? "Jogo Selecionado" : "Escolha um Jogo Salvo"}
                      </h3>
                      <Link
                        to={spinWheelManagerPath}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                      >
                        <Plus className="h-3.5 w-3.5" /> Criar/Editar Jogo
                      </Link>
                    </div>
                    
                    {loadingGames ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : savedGames.length === 0 ? (
                      <div className="text-center py-8 bg-card border border-dashed border-border rounded-2xl">
                        <p className="text-muted-foreground mb-4">Ainda não tens nenhum jogo salvo!</p>
                        <Link
                          to={spinWheelManagerPath}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                        >
                          <Plus className="h-3.5 w-3.5" /> Criar Primeiro Jogo
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <button
                          onClick={() => setSelectedGameId(null)}
                          className={`p-4 rounded-2xl border-2 transition-all text-left ${
                            !selectedGameId ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <p className="font-bold">Modo Rápido</p>
                          <p className="text-xs text-muted-foreground">Edita prêmios diretamente aqui</p>
                        </button>

                        {savedGames.map(game => (
                          <button
                            key={game.id}
                            onClick={() => setSelectedGameId(game.id)}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${
                              selectedGameId === game.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <p className="font-bold">{game.name}</p>
                              {game.is_published ? (
                                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-bold">
                                  Publicado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold">
                                  Rascunho
                                </span>
                              )}
                            </div>
                            {game.company_slogan && <p className="text-xs text-muted-foreground mt-1">{game.company_slogan}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <PrizeWheel 
                    prizes={wheelPrizes} 
                    onChange={setWheelPrizes} 
                    gameId={selectedGameId || undefined}
                    branding={branding}
                  />
                </motion.div>
              )}
              {active === "tap" && (
                <motion.div key="tap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TapBattle duration={config.tapDuration} onScore={recordScore("Tap Battle")} />
                </motion.div>
              )}
              {active === "quiz" && (
                <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <QuizBattle totalQuestions={config.quizQuestions} timePerQ={config.quizTimePerQ} onScore={recordScore("Quiz Battle")} />
                </motion.div>
              )}
              {active === "mystery" && (
                <motion.div key="mystery" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <MysteryBox
                    highChance={config.mysteryHigh}
                    lowChance={config.mysteryLow}
                    noneChance={config.mysteryNone}
                    onScore={recordScore("Caixa Misteriosa")}
                  />
                </motion.div>
              )}
              {active === "keyword" && (
                <motion.div key="keyword" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <KeywordHunt
                    liveCode={liveCode}
                    onScore={recordScore("Caça à Palavra")}
                    onWinner={(name, kw) => broadcastWinner(name, `Caça à Palavra · "${kw}"`)}
                  />
                </motion.div>
              )}
              {active === "emoji" && (
                <motion.div key="emoji" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <EmojiBattle
                    onScore={recordScore("Batalha de Emojis")}
                    onWinner={(label, votes) => broadcastWinner(label, `Batalha de Emojis · ${votes} votos`)}
                  />
                </motion.div>
              )}
              {active === "millionaire" && (
                <motion.div key="millionaire" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <EnhancedMillionaireGame />
                </motion.div>
              )}
              {active === "kahoot" && (
                <motion.div key="kahoot" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <KahootMultiplayerQuiz scheduledLiveId={undefined} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "bingo" && (
                <motion.div key="bingo" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <LiveBingo liveCode={liveCode} />
                </motion.div>
              )}
              {active === "challenge" && (
                <motion.div key="challenge" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ChallengeRoulette />
                </motion.div>
              )}
              {active === "vsduel" && (
                <motion.div key="vsduel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <VSDuelArena onScore={recordScore("Arena de Duelo VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "speed" && (
                <motion.div key="speed" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <SpeedReaction onScore={recordScore("Duelo de Velocidade")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "truthordare" && (
                <motion.div key="truthordare" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TruthOrDare onScore={recordScore("Verdade ou Desafio")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "memory" && (
                <motion.div key="memory" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <MemoryChallenge onScore={recordScore("Jogo da Memória VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "punishment" && (
                <motion.div key="punishment" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <PunishmentWheel />
                </motion.div>
              )}
              {active === "boknowledge" && (
                <motion.div key="boknowledge" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <BattleOfKnowledge onScore={recordScore("Batalha de Conhecimentos")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "guessEmoji" && (
                <motion.div key="guessEmoji" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <GuessTheEmoji onScore={recordScore("Adivinhe o Emoji")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "quickdraw" && (
                <motion.div key="quickdraw" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <QuickDrawChallenge onScore={recordScore("Desenho Rápido")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "hotpotato" && (
                <motion.div key="hotpotato" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <HotPotatoGame onScore={recordScore("Batata Quente")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "numguess" && (
                <motion.div key="numguess" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <NumberGuessBattle onScore={recordScore("Adivinha o Número VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "chaos" && (
                <motion.div key="chaos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ChaosChallenge onScore={recordScore("Desafio Caótico")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "checkers" && (
                <motion.div key="checkers" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <CheckersGame onScore={recordScore("Damas")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "ludo" && (
                <motion.div key="ludo" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <LudoGame onScore={recordScore("Ludo")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "connect4" && (
                <motion.div key="connect4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ConnectFourGame onScore={recordScore("Ligar 4")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "battleship" && (
                <motion.div key="battleship" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <BattleshipGame onScore={recordScore("Batalha Naval")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "tictactoe" && (
                <motion.div key="tictactoe" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TicTacToeVS onScore={recordScore("Galo VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "uno" && (
                <motion.div key="uno" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <UnoCardGame onScore={recordScore("UNO Cartas")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "snakebattle" && (
                <motion.div key="snakebattle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <SnakeBattle onScore={recordScore("Batalha de Cobras")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "rps" && (
                <motion.div key="rps" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <RockPaperScissors onScore={recordScore("Pedra Papel Tesoura")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "colorsequence" && (
                <motion.div key="colorsequence" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ColorSequence onScore={recordScore("Sequência de Cores")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "spaceshooter" && (
                <motion.div key="spaceshooter" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <SpaceShooter onScore={recordScore("Nave Espacial VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "ballbreaker" && (
                <motion.div key="ballbreaker" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <BallBreaker onScore={recordScore("Quebra-Bloco VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "reactionrace" && (
                <motion.div key="reactionrace" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ReactionRace onScore={recordScore("Corrida de Reação")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "quickmath" && (
                <motion.div key="quickmath" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <QuickMath onScore={recordScore("Duelo de Matemática")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "memorycards" && (
                <motion.div key="memorycards" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <MemoryCardsVS onScore={recordScore("Memória VS Cartas")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "wordscramble" && (
                <motion.div key="wordscramble" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <WordScramble onScore={recordScore("Palavras Embaralhadas")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "tictactoepro" && (
                <motion.div key="tictactoepro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TicTacToePro onScore={recordScore("Galo PRO")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "guessnumber100" && (
                <motion.div key="guessnumber100" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <GuessNumber100 onScore={recordScore("Adivinha 1 a 100")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "colormatch" && (
                <motion.div key="colormatch" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ColorMatch onScore={recordScore("Cor versus Palavra")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "targettap" && (
                <motion.div key="targettap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TargetTap onScore={recordScore("Alvo Rápido")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "diceluel" && (
                <motion.div key="diceluel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <DiceDuel onScore={recordScore("Duelo de Dados")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "patternmemory" && (
                <motion.div key="patternmemory" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <PatternMemory onScore={recordScore("Memória de Padrões")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "triviaflash" && (
                <motion.div key="triviaflash" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TriviaFlash onScore={recordScore("Trivia Flash")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "dominoes" && (
                <motion.div key="dominoes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Dominoes onScore={recordScore("Dominó")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "mazerace" && (
                <motion.div key="mazerace" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <MazeRace onScore={recordScore("Corrida no Labirinto")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "slotsvs" && (
                <motion.div key="slotsvs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <SlotsVS onScore={recordScore("Caça-Níqueis VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "match4" && (
                <motion.div key="match4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Match4Grid onScore={recordScore("Combina 4")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "towerstack" && (
                <motion.div key="towerstack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TowerStack onScore={recordScore("Torre VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "cannonbattle" && (
                <motion.div key="cannonbattle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <CannonBattle onScore={recordScore("Batalha de Canhões")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "spotdifference" && (
                <motion.div key="spotdifference" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <SpotDifference onScore={recordScore("Encontre Diferenças")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "wordchain" && (
                <motion.div key="wordchain" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <WordChain onScore={recordScore("Corrente de Palavras")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "numbertetris" && (
                <motion.div key="numbertetris" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <NumberTetris onScore={recordScore("Números Caindo")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "pongvs" && (
                <motion.div key="pongvs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <PongVS onScore={recordScore("Pong VS")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "whackamole" && (
                <motion.div key="whackamole" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <WhackAMole onScore={recordScore("Bate o Alvo")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "colorcatch" && (
                <motion.div key="colorcatch" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ColorCatch onScore={recordScore("Pesca Cores")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "mexerica" && (
                <motion.div key="mexerica" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <MexericaGame onScore={recordScore("Mexerica")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "chigogo" && (
                <motion.div key="chigogo" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ChigogoGame onScore={recordScore("Chigogo")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "urusse" && (
                <motion.div key="urusse" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <UrusseGame onScore={recordScore("Urusse")} liveCode={liveCode} />
                </motion.div>
              )}
              {active === "capulanaquiz" && (
                <motion.div key="capulanaquiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <CapulanaQuiz onScore={recordScore("Capulana Quiz")} liveCode={liveCode} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="space-y-4">
            <LiveControlPanel
              liveCode={liveCode}
              entries={leaderboard}
              onClear={() => setLeaderboard([])}
              onResetConfig={resetConfig}
              isLive={isLive}
              elapsedSec={elapsed}
              activeGameLabel={activeMeta?.label}
              onStartLive={startLive}
              onEndLive={requestEndLive}
              onBroadcastWinner={broadcastWinner}
            />
            <LiveLeaderboard entries={leaderboard} onClear={() => setLeaderboard([])} />
            {user && (
              <AmbassadorPanel
                businessUserId={user.id}
                businessName={user.email?.split("@")[0] || "esta empresa"}
                liveCode={liveCode}
                compact
              />
            )}

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold">Dicas para a sua Live</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Configure os prémios e probabilidades antes de começar.</li>
                <li>Partilhe o código da live para os participantes.</li>
                <li>Use o leaderboard para coroar o vencedor no fim.</li>
                <li>Vincule um sorteio para distribuir prémios reais.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold">Modo Multi-jogador</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Tap Battle e Quiz Battle suportam 1v1 ou contra bot — perfeito para desafios entre o anfitrião e convidados.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
      <BottomTabBar />

      <AnimatePresence>
        {endOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !ending && setEndOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center">
                  <Square className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Encerrar a Live?</h3>
                  <p className="text-xs text-muted-foreground">O código <span className="font-mono font-bold text-foreground">{liveCode}</span> será invalidado e o ranking será arquivado no histórico.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-muted/40 border border-border p-4 mb-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Confirmação disponível em</p>
                <p className={`font-mono text-3xl font-bold ${endCountdown === 0 ? "text-destructive" : "text-primary"}`}>
                  {endCountdown > 0 ? `${endCountdown}s` : "Pronto"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => !ending && setEndOpen(false)}
                  disabled={ending}
                  className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-foreground text-sm font-bold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmEndLive}
                  disabled={endCountdown > 0 || ending}
                  className="flex-1 px-4 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ending ? "A encerrar…" : "Encerrar Live"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveHub;
