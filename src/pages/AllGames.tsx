import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Search, Gamepad2, Users, Brain, Zap, Swords, Grid3X3, Target, Sparkles, Dices, LayoutGrid, Hash, Shuffle, Palette, Map, Crosshair, Layers, Radio, Trophy, Pencil, Bomb, SmilePlus, Anchor, CircleDot, Package, RotateCcw, Vote, Skull, Heart, Lock, ChevronRight, Spade, Globe, Crown, Swords as SwordsIcon, Cherry, Keyboard, Shield, Coins } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { COUNTRIES } from "@/lib/regions";
import { useSoundEffects } from '@/hooks/useSoundEffects';
import ShimmerText from '@/components/ui/ShimmerText';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import HolographicCard from '@/components/ui/HolographicCard';

interface GameDef {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  grad: string;
  category: string;
  players: string;
  icon: any;
  hasBot: boolean;
  regions?: string[];
}

const ALL_GAMES: GameDef[] = [
  { id: "tictactoepro", label: "Galo PRO", emoji: "\u2715", desc: "Galo Ultimate \u2014 9 mini-tabuleiros, estrategia avancada!", grad: "from-violet-600 to-indigo-700", category: "Estrategia", players: "1v1 / Bot", icon: Grid3X3, hasBot: true },
  { id: "connect4", label: "Ligar 4", emoji: "\ud83d\udd34", desc: "Estrategia pura: ligue 4 pecas em linha para vencer!", grad: "from-blue-500 to-yellow-500", category: "Estrategia", players: "1v1 / Bot", icon: LayoutGrid, hasBot: true },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "\ud83d\udc0d", desc: "Duas cobras, um tabuleiro \u2014 quem cresce mais ganha!", grad: "from-emerald-500 to-teal-600", category: "Arcade", players: "1v1 / Bot", icon: Gamepad2, hasBot: true },
  { id: "quickmath", label: "Duelo de Matematica", emoji: "\ud83e\uddee", desc: "Contas rapidas \u2014 quem resolve primeiro marca ponto!", grad: "from-cyan-500 to-blue-700", category: "Puzzle", players: "1v1 / Bot", icon: Brain, hasBot: true },
  { id: "memorycards", label: "Memoria VS Cartas", emoji: "\ud83c\udccf", desc: "Encontre os pares no tabuleiro partilhado!", grad: "from-indigo-500 to-violet-600", category: "Puzzle", players: "1v1 / Bot", icon: Brain, hasBot: true },
  { id: "guessnumber100", label: "Adivinha 1 a 100", emoji: "\ud83d\udd22", desc: "Quente/Frio \u2014 quem adivinha o numero secreto primeiro?", grad: "from-teal-500 to-cyan-700", category: "Puzzle", players: "1v1 / Bot", icon: Hash, hasBot: true },
  { id: "pongvs", label: "Pong VS", emoji: "\ud83c\udfd3", desc: "Classico Pong arcade \u2014 primeiro a 5 pontos!", grad: "from-blue-600 to-indigo-700", category: "Arcade", players: "1v1 / Bot", icon: Gamepad2, hasBot: false },
  { id: "whackamole", label: "Bate o Alvo", emoji: "\ud83c\udfaf", desc: "Toque nas criaturas que aparecem \u2014 30 segundos de caos!", grad: "from-emerald-500 to-green-600", category: "Arcade", players: "1v1 / Bot", icon: Target, hasBot: false },
  { id: "colorcatch", label: "Pesca Cores", emoji: "\ud83c\udfa8", desc: "Clique nas cores certas o mais rapido possivel!", grad: "from-pink-500 to-rose-600", category: "Reflexo", players: "Solo / Bot", icon: Palette, hasBot: false },
  { id: "diceluel", label: "Duelo de Dados", emoji: "\ud83c\udfb2", desc: "Banco ou Arriscar? Corrida a 100 pontos!", grad: "from-amber-600 to-yellow-600", category: "Sorte", players: "1v1 / Bot", icon: Dices, hasBot: false },
  { id: "spotdifference", label: "Encontre Diferencas", emoji: "\ud83d\udd0d", desc: "Encontre 5 diferencas entre cenas geradas!", grad: "from-amber-500 to-yellow-600", category: "Puzzle", players: "Solo", icon: Search, hasBot: false },
  { id: "wordchain", label: "Corrente de Palavras", emoji: "\ud83d\udd17", desc: "A ultima letra vira a primeira \u2014 nao repita!", grad: "from-teal-500 to-emerald-600", category: "Palavras", players: "1v1 / Bot", icon: Shuffle, hasBot: false },
  { id: "numbertetris", label: "Numeros Caindo", emoji: "\ud83d\udd22", desc: "Numeros caem e combinam \u2014 estilo Tetris 2048!", grad: "from-orange-600 to-red-700", category: "Puzzle", players: "Solo", icon: LayoutGrid, hasBot: false },
  { id: "cannonbattle", label: "Batalha de Canhoes", emoji: "\ud83d\udca3", desc: "Ajuste angulo e forca \u2014 destrua o adversario!", grad: "from-red-600 to-orange-700", category: "Estrategia", players: "1v1 / Bot", icon: Crosshair, hasBot: false },
  { id: "towerstack", label: "Torre VS", emoji: "\ud83c\udfd7\ufe0f", desc: "Empilhe blocos com precisao \u2014 quem constroi mais alto!", grad: "from-sky-500 to-blue-600", category: "Arcade", players: "1v1 / Bot", icon: Layers, hasBot: false },
  { id: "match4", label: "Combina 4", emoji: "\u2728", desc: "Combine 4+ pecas iguais \u2014 cascatas e combos!", grad: "from-pink-500 to-rose-600", category: "Puzzle", players: "1v1 / Bot", icon: Sparkles, hasBot: false },
  { id: "mazerace", label: "Corrida no Labirinto", emoji: "\ud83e\udde9", desc: "Quem sai do labirinto primeiro?", grad: "from-green-600 to-emerald-700", category: "Arcade", players: "1v1 / Bot", icon: Map, hasBot: false },
  { id: "slotsvs", label: "Caca-Niqueis VS", emoji: "\ud83c\udfb0", desc: "Gire as maquinas \u2014 quem acumula mais moedas vence!", grad: "from-amber-500 to-yellow-500", category: "Sorte", players: "1v1 / Bot", icon: Sparkles, hasBot: false },
  { id: "triviaflash", label: "Trivia Flash", emoji: "\u2757", desc: "Verdadeiro ou Falso \u2014 20 perguntas, velocidade conta!", grad: "from-emerald-500 to-teal-700", category: "Quiz", players: "Solo / Bot", icon: Brain, hasBot: false },
  { id: "patternmemory", label: "Memoria de Padroes", emoji: "\ud83e\udde9", desc: "Memorize o padrao de celulas iluminadas!", grad: "from-purple-500 to-violet-700", category: "Puzzle", players: "Solo / Bot", icon: Grid3X3, hasBot: false },
  { id: "targettap", label: "Alvo Rapido", emoji: "\ud83c\udfaf", desc: "Toque nos alvos certos antes que desaparecam!", grad: "from-orange-500 to-red-600", category: "Reflexo", players: "Solo", icon: Target, hasBot: false },
  { id: "colormatch", label: "Cor versus Palavra", emoji: "\ud83c\udfa8", desc: "Teste Stroop \u2014 identifique a COR do texto!", grad: "from-pink-500 to-rose-700", category: "Reflexo", players: "Solo / Bot", icon: Palette, hasBot: true },
  { id: "wordscramble", label: "Palavras Embaralhadas", emoji: "\ud83d\udc24", desc: "Descubra a palavra escondida nas letras misturadas!", grad: "from-rose-500 to-pink-600", category: "Palavras", players: "Solo / Bot", icon: Shuffle, hasBot: false },
  { id: "reactionrace", label: "Corrida de Reacao", emoji: "\u26a1", desc: "Quem reage mais rapido ao sinal?", grad: "from-yellow-500 to-red-600", category: "Reflexo", players: "1v1 / Bot", icon: Zap, hasBot: false },
  { id: "ballbreaker", label: "Quebra-Bloco VS", emoji: "\ud83e\udde6", desc: "Destrua todos os blocos \u2014 quem limpa primeiro!", grad: "from-red-500 to-orange-600", category: "Arcade", players: "1v1 / Bot", icon: Gamepad2, hasBot: false },
  { id: "spaceshooter", label: "Nave Espacial VS", emoji: "\ud83d\ude80", desc: "Destrua naves inimigas \u2014 quem faz mais pontos!", grad: "from-slate-500 to-blue-700", category: "Arcade", players: "1v1 / Bot", icon: Zap, hasBot: false },
  { id: "colorsequence", label: "Sequencia de Cores", emoji: "\ud83d\udfe2", desc: "Memorize a sequencia de cores e repita!", grad: "from-violet-500 to-fuchsia-600", category: "Puzzle", players: "1v1 / Bot", icon: Sparkles, hasBot: true },
  { id: "rps", label: "Pedra Papel Tesoura", emoji: "\u270a", desc: "Jokenpo classico \u2014 melhor de 3, 5 ou 7 rounds!", grad: "from-amber-500 to-orange-600", category: "Sorte", players: "1v1 / Bot", icon: Swords, hasBot: true },
  { id: "tictactoe", label: "Galo VS", emoji: "\u2715", desc: "Rapido, com apostas, streaks e modo velocidade!", grad: "from-violet-500 to-pink-500", category: "Estrategia", players: "1v1 / Bot", icon: CircleDot, hasBot: false },
  { id: "checkers", label: "Damas", emoji: "\u265f\ufe0f", desc: "Jogo classico com capturas e promocao a rei!", grad: "from-amber-700 to-red-800", category: "Estrategia", players: "1v1 / Bot", icon: Grid3X3, hasBot: false },
  { id: "battleship", label: "Batalha Naval", emoji: "\ud83d\udea2", desc: "Esconda os navios e afunde a frota inimiga!", grad: "from-slate-600 to-blue-900", category: "Estrategia", players: "1v1 / Bot", icon: Anchor, hasBot: false },
  { id: "dominoes", label: "Domino", emoji: "\ud83c\udfb2", desc: "Encaixe as pecas e esvazie a mao!", grad: "from-slate-600 to-zinc-700", category: "Estrategia", players: "1v1 / Bot", icon: LayoutGrid, hasBot: false },
  { id: "ludo", label: "Ludo", emoji: "\ud83c\udfb2", desc: "4 jogadores, dado, pecas e estrategia!", grad: "from-emerald-600 to-teal-700", category: "Estrategia", players: "1v1 / Bot", icon: Dices, hasBot: false },
  { id: "uno", label: "UNO Cartas", emoji: "\ud83c\udccf", desc: "Cartas com cores, especiais e UNO!", grad: "from-indigo-500 to-purple-600", category: "Cartas", players: "1v1 / Bot", icon: Sparkles, hasBot: false },
  { id: "tap", label: "Tap Battle", emoji: "\u26a1", desc: "Batalha de toques: 1v1 ou contra o bot!", grad: "from-amber-500 to-orange-500", category: "Reflexo", players: "1v1 / Bot", icon: Zap, hasBot: true },
  { id: "quiz", label: "Quiz Battle", emoji: "\ud83e\udde0", desc: "Trivia ao vivo, sozinho ou com convidado!", grad: "from-sky-500 to-blue-500", category: "Quiz", players: "1v1 / Bot", icon: Brain, hasBot: false },
  { id: "millionaire", label: "Quem Quer Ser Milionario?", emoji: "\ud83d\udcb0", desc: "Perguntas e respostas para o premio maximo!", grad: "from-purple-500 to-violet-500", category: "Quiz", players: "Solo", icon: Trophy, hasBot: false },
  { id: "wheel", label: "Roda de Premios", emoji: "\ud83c\udfb0", desc: "Sorteie premios reais com probabilidades configuraveis!", grad: "from-violet-500 to-fuchsia-500", category: "Sorte", players: "Solo", icon: RotateCcw, hasBot: false },
  { id: "mystery", label: "Caixa Misteriosa", emoji: "\ud83c\udf81", desc: "4 caixas, premios escondidos!", grad: "from-emerald-500 to-teal-500", category: "Sorte", players: "Solo", icon: Package, hasBot: false },
  { id: "emoji", label: "Batalha de Emojis", emoji: "\ud83d\udca5", desc: "Vote ao vivo, vencedores entram no sorteio!", grad: "from-pink-500 to-rose-500", category: "Social", players: "Multi", icon: Vote, hasBot: false },
  { id: "keyword", label: "Caca a Palavra", emoji: "\ud83d\udd0e", desc: "Audiencia adivinha a palavra-chave secreta!", grad: "from-amber-500 to-orange-500", category: "Social", players: "Multi", icon: Search, hasBot: false },
  { id: "truthordare", label: "Verdade ou Desafio", emoji: "\ud83d\udd25", desc: "Verdades picantes e desafios engracados!", grad: "from-rose-500 to-red-600", category: "Social", players: "Multi", icon: Heart, hasBot: false },
  { id: "mmorpg", label: "MMORPG Bateu", emoji: "\uD83C\uDF0D", desc: "Mundo persistente multijogador! Duelos PVP reais, economia P2P, chat global, ranking e World Boss!", grad: "from-blue-600 to-purple-700", category: "MMORPG", players: "Multiplayer", icon: Globe, hasBot: false },
  { id: "punishment", label: "Roleta de Castigos", emoji: "\ud83d\udc80", desc: "Gire a roleta e cumpra o castigo!", grad: "from-red-600 to-rose-700", category: "Social", players: "Multi", icon: Skull, hasBot: false },
  { id: "guessEmoji", label: "Adivinhe o Emoji", emoji: "\ud83d\ude0e", desc: "Decifre a frase a partir dos emojis!", grad: "from-yellow-500 to-amber-600", category: "Quiz", players: "Multi", icon: SmilePlus, hasBot: false },
  { id: "quickdraw", label: "Desenho Rapido", emoji: "\ud83c\udfa8", desc: "Desenhe e deixe o publico adivinhar!", grad: "from-emerald-500 to-teal-600", category: "Social", players: "Multi", icon: Pencil, hasBot: false },
  { id: "hotpotato", label: "Batata Quente", emoji: "\ud83d\udca3", desc: "Passe a batata \u2014 quem tiver quando explodir, sai!", grad: "from-orange-500 to-red-600", category: "Social", players: "Multi", icon: Bomb, hasBot: false },
  { id: "chaos", label: "Desafio Caotico", emoji: "\ud83c\udf2a\ufe0f", desc: "Desafios aleatorios contra o relogio!", grad: "from-rose-500 to-pink-600", category: "Social", players: "Multi", icon: Shuffle, hasBot: false },
  { id: "boknowledge", label: "Batalha de Conhecimentos", emoji: "\ud83d\udcda", desc: "Trivia VS com bonus de streak \u2014 10 perguntas!", grad: "from-cyan-500 to-purple-600", category: "Quiz", players: "1v1 / Bot", icon: Brain, hasBot: false },
  { id: "numguess", label: "Adivinha o Numero VS", emoji: "\ud83d\udd22", desc: "Duelo \u2014 quem adivinha o numero secreto primeiro?", grad: "from-violet-500 to-fuchsia-600", category: "Puzzle", players: "1v1 / Bot", icon: Hash, hasBot: false },
  { id: "speed", label: "Duelo de Velocidade", emoji: "\u26a1", desc: "Quem reage mais rapido?", grad: "from-cyan-500 to-blue-600", category: "Reflexo", players: "1v1 / Bot", icon: Zap, hasBot: false },
  { id: "vsduel", label: "Arena de Duelo VS", emoji: "\u2694\ufe0f", desc: "Duelo 1v1: reacao, matematica e palavras!", grad: "from-red-500 to-orange-600", category: "Variado", players: "1v1", icon: Swords, hasBot: false },
  { id: "challenge", label: "Roleta de Desafios", emoji: "\ud83c\udfad", desc: "Gire a roleta e cumpra o desafio ao vivo!", grad: "from-fuchsia-500 to-pink-500", category: "Social", players: "Multi", icon: RotateCcw, hasBot: false },
  { id: "kahoot", label: "Quiz ao Vivo", emoji: "\ud83c\udfaf", desc: "Quiz multiplayer \u2014 a audiencia joga em tempo real!", grad: "from-sky-500 to-indigo-600", category: "Quiz", players: "Multi", icon: Brain, hasBot: false },
  { id: "bingo", label: "Bingo ao Vivo", emoji: "\ud83c\udfb1", desc: "Cartao virtual com numeros sorteados em tempo real!", grad: "from-emerald-500 to-teal-600", category: "Sorte", players: "Multi", icon: Trophy, hasBot: false },
  { id: "memory", label: "Jogo da Memoria VS", emoji: "\ud83e\udde0", desc: "Batalha de pares \u2014 quem tem melhor memoria?", grad: "from-indigo-500 to-purple-600", category: "Puzzle", players: "1v1 / Bot", icon: Brain, hasBot: false },
  { id: "mexerica", label: "Mexerica", emoji: "\u270b", desc: "Bate a Mao \u2014 jogo mocambicano de reflexos!", grad: "from-amber-600 to-red-700", category: "Mocambicano", players: "1v1 / Bot", icon: Zap, hasBot: true },
  { id: "chigogo", label: "Chigogo", emoji: "\ud83e\udea8", desc: "Adivinha a Pedrinha \u2014 esconda e descubra!", grad: "from-yellow-700 to-amber-800", category: "Mocambicano", players: "1v1 / Bot", icon: Target, hasBot: true },
  { id: "urusse", label: "Urusse", emoji: "\ud83e\uddf4", desc: "Mancala mocambicano \u2014 semeie, capture e venca!", grad: "from-green-700 to-amber-900", category: "Mocambicano", players: "1v1 / Bot", icon: Gamepad2, hasBot: true },
  { id: "capulanaquiz", label: "Capulana Quiz", emoji: "\ud83d\udc57", desc: "Quiz de cultura mocambicana!", grad: "from-yellow-500 to-green-700", category: "Mocambicano", players: "1v1 / Bot", icon: Brain, hasBot: true },
  { id: "kabaddiraid", label: "Kabaddi Raid", emoji: "\uD83E\uDDD4", desc: "Raid epico de Kabaddi - tempo e reflexos!", grad: "from-orange-500 to-red-600", category: "Indiano", players: "Solo", icon: Zap, hasBot: false, regions: ["IN"] },
  { id: "carromboard", label: "Carrom", emoji: "\uD83C\uDFB1", desc: "Jogo classico de carrom indiano - encace as pecas!", grad: "from-amber-600 to-orange-500", category: "Indiano", players: "1v1 / Bot", icon: Target, hasBot: true, regions: ["IN"] },
  { id: "teenpatti", label: "Teen Patti", emoji: "\uD83C\uDCCF", desc: "Poker indiano - quem tem a melhor mao?", grad: "from-emerald-600 to-green-500", category: "Indiano", players: "1v1 / Bot", icon: Spade, hasBot: true, regions: ["IN"] },
  { id: "rpgarena", label: "RPG Arena Battle", emoji: "\u2694\uFE0F", desc: "Combate turn-based RPG: Guerreiro, Mago, Arqueiro, Ladino!", grad: "from-red-600 to-purple-800", category: "RPG", players: "1v1 / Bot", icon: Swords, hasBot: true },
  { id: "battleroyale", label: "Battle Royale", emoji: "\uD83C\uDFB1", desc: "Sobreviva na zona! 40 jogadores, armas, loot e zona a fechar!", grad: "from-amber-500 to-red-700", category: "Battle Royale", players: "Solo / Bot", icon: Target, hasBot: true },
  { id: "chess", label: "Xadrez", emoji: "\u265A", desc: "Xadrez completo: roque, en passant, promocao e checkmate!", grad: "from-slate-700 to-zinc-900", category: "Estrategia", players: "1v1 / Bot", icon: Crown, hasBot: true },
  { id: "flappybird", label: "Flappy Bird", emoji: "\uD83D\uDC26", desc: "Desvie dos canos! Classico viciante com medalhas!", grad: "from-sky-400 to-green-500", category: "Arcade", players: "Solo / Bot", icon: Gamepad2, hasBot: true },
  { id: "fruitninja", label: "Fruta Ninja", emoji: "\uD83C\uDF4E", desc: "Corte frutas e evite bombas! Combos e multiplicadores!", grad: "from-red-500 to-orange-500", category: "Acao", players: "Solo / Bot", icon: Sparkles, hasBot: true },
  { id: "typingracer", label: "Corrida de Digitacao", emoji: "\u26A1", desc: "Digite o mais rapido! Corrida de carros com WPM!", grad: "from-cyan-500 to-blue-600", category: "Digitacao", players: "Solo / Bot", icon: Keyboard, hasBot: true },
  { id: "campaignrpg", label: "Campanha RPG", emoji: "\u2694\uFE0F", desc: "5 mundos epicos, 6 classes, chefes devastadores. Campanha completa com equipamentos!", grad: "from-yellow-600 to-red-700", category: "RPG", players: "Solo / PVP", icon: Shield, hasBot: true },
  { id: "p2pbet", label: "Arena de Apostas P2P", emoji: "\uD83D\uDCB0", desc: "Aposta contra outros jogadores! Estacas, desafios e grandes vitorias!", grad: "from-amber-500 to-yellow-400", category: "Apostas", players: "P2P / Bot", icon: Coins, hasBot: true },
  { id: "ntchuva", label: "Ntchuva", emoji: "\u270B", desc: "Jogo tradicional mocambicano de reacao! Sera o mais rapido?", grad: "from-amber-600 to-red-700", category: "Mocambicano", players: "1v1 / Bot", icon: Zap, hasBot: true },
  { id: "djikota", label: "Djikota", emoji: "\uD83C\uDFAF", desc: "Jogo de estrategia tradicional! Desafia os teus amigos.", grad: "from-green-600 to-teal-700", category: "Mocambicano", players: "1v1 / Bot", icon: Target, hasBot: true },
  { id: "bicho", label: "Jogo do Bicho", emoji: "\uD83E\uDD8E", desc: "Classico jogo de apostas brasileiro! Adivinha o animal!", grad: "from-emerald-500 to-green-600", category: "Apostas", players: "1v1 / Bot", icon: Dices, hasBot: true },
  { id: "uri", label: "Uri", emoji: "\uD83D\uDC46", desc: "Desafio rapido de reacao! Sera o mais veloz?", grad: "from-orange-500 to-red-600", category: "Mocambicano", players: "1v1 / Bot", icon: Zap, hasBot: true },
];

const CATEGORIES = [
  { id: "todos", label: "Todos", emoji: "\ud83c\udfae" },
  { id: "Estrategia", label: "Estrategia", emoji: "\u265f\ufe0f" },
  { id: "Arcade", label: "Arcade", emoji: "\ud83d\udc7e" },
  { id: "Puzzle", label: "Puzzle", emoji: "\ud83e\udde9" },
  { id: "Reflexo", label: "Reflexo", emoji: "\u26a1" },
  { id: "Quiz", label: "Quiz", emoji: "\ud83e\udde0" },
  { id: "Sorte", label: "Sorte", emoji: "\ud83c\udfb2" },
  { id: "Social", label: "Social", emoji: "\ud83d\udc65" },
  { id: "Palavras", label: "Palavras", emoji: "\ud83d\udc24" },
  { id: "Cartas", label: "Cartas", emoji: "\ud83c\udccf" },
  { id: "Variado", label: "Variado", emoji: "\ud83c\udfa3" },
  { id: "Apostas", label: "Apostas", emoji: "\uD83D\uDCB0" },
  { id: "Mocambicano", label: "Mocambicano", emoji: "\ud83c\uddf2" },
  { id: "Indiano", label: "Indiano", emoji: "\uD83C\uDDEE\uD83C\uDDF3" },
  { id: "RPG", label: "RPG", emoji: "\u2694\uFE0F" },
  { id: "Battle Royale", label: "Battle Royale", emoji: "\uD83C\uDFB1" },
  { id: "Acao", label: "Acao", emoji: "\uD83D\uDCA5" },
  { id: "Digitacao", label: "Digitacao", emoji: "\u2328\uFE0F" },
  { id: "Campanha", label: "Campanha", emoji: "\uD83C\uDFD5\uFE0F" },
  { id: "MMORPG", label: "MMORPG", emoji: "\uD83C\uDF0D" },
];

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
// Steam/CrazyGames inspired green theme
const THEME_P = "#2ea043";
const THEME_S = "#58a6ff";
const THEME_A = "#f78166";

const AllGames = () => {
  const { sfx } = useSoundEffects();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [regionFilter, setRegionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "category">("name");
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const filtered = useMemo(() => {
    let list = ALL_GAMES;
    if (category !== "todos") list = list.filter((g) => g.category === category);
    if (regionFilter !== "all") list = list.filter((g) => !g.regions || g.regions.includes(regionFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.label.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
    }
    if (sortBy === "name") list = [...list].sort((a, b) => a.label.localeCompare(b.label));
    else list = [...list].sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
    return list;
  }, [search, category, sortBy, regionFilter]);

  const botGames = useMemo(() => ALL_GAMES.filter((g) => g.hasBot), []);
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { todos: ALL_GAMES.length };
    ALL_GAMES.forEach((g) => { m[g.category] = (m[g.category] || 0) + 1; });
    return m;
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ background: 'var(--area-bg, #0d1117)', color: 'var(--area-text, #e6edf3)' }}>
      <Helmet>
        <title>90+ Jogos Online Gratis \u2014 Bateu</title>
        <meta name="description" content="Jogue mais de 90 jogos online gratis: estrategia, arcade, puzzle, quiz, reflexo e muito mais. Jogue contra amigos ou contra o computador!" />
        <meta property="og:title" content="90+ Jogos Online Gratis \u2014 Bateu" />
        <meta property="og:description" content="Jogue mais de 90 jogos online gratis: estrategia, arcade, puzzle, quiz, reflexo e muito mais. Jogue contra amigos ou contra o computador!" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${window.location.origin}/jogos`} />
      </Helmet>
      {/* Grid pattern background - Steam feel */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(${THEME_P} 1px, transparent 1px),
                            linear-gradient(90deg, ${THEME_P} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="dir-hero-bg relative overflow-hidden hidden md:block"
        style={{ minHeight: "380px" }}
      >
        <div className="aurora-hero">
          <div className="aurora-blob aurora-blob-1" style={{ background: 'rgba(46, 160, 67, 0.2)' }} />
          <div className="aurora-blob aurora-blob-2" style={{ background: 'rgba(88, 166, 255, 0.12)' }} />
          <div className="aurora-blob aurora-blob-3" style={{ background: 'rgba(247, 129, 102, 0.1)' }} />
        </div>
        <div className="hero-grid-overlay" style={{ "--grid-color": "rgba(255,255,255,0.5)" } as any} />
        <div
          className="hero-mouse-light"
          style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(46,160,67,0.06), transparent 40%)` }}
        />
        <div className="hero-bottom-fade" />

        <div className="relative z-10 container mx-auto px-4 py-14">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 }} className="max-w-2xl">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: 0.15 }}
            >
              <Gamepad2 className="h-4 w-4" style={{ color: THEME_P }} />
              <span className="text-xs font-bold" style={{ color: '#7d8590' }}><AnimatedNumber value={ALL_GAMES.length} /> JOGOS DISPONIVEIS</span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-3 jogos-glow-green">
              <ShimmerText colors={['#2ea043', '#58a6ff', '#f78166', '#2ea043']} speed={5}>Todos os Jogos</ShimmerText>
            </h1>
            <p className="text-base mb-6 max-w-xl" style={{ color: '#7d8590' }}>
              Mais de 90 jogos online gratis. Estrategia, arcade, puzzle, quiz, reflexos e muito mais \u2014 jogue contra amigos ou contra o computador!
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <span className="jogos-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold">
                <Users className="h-3.5 w-3.5" /> <AnimatedNumber value={botGames.length} /> jogos com Bot IA
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(247,129,102,0.1)', color: '#f78166', border: '1px solid rgba(247,129,102,0.15)' }}>
                <Zap className="h-3.5 w-3.5" /> Jogo instantaneo
              </span>
              <span className="jogos-badge-players inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold">
                <Radio className="h-3.5 w-3.5" /> Modo Live
              </span>
            </div>

            <div className="dir-search-wrap max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Procurar jogo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => sfx.inputFocus()}
                  className="w-full pl-11 pr-4 py-3 rounded-full bg-white/[0.03] border-white/[0.06] text-sm focus:outline-none focus:border-hsl(220 70% 18% / 0.4) transition-all input-focus-glow"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4 pb-2 relative z-20">
        <motion.div
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide custom-scrollbar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {CATEGORIES.map((c, i) => {
            const isActive = category === c.id;
            return (
              <motion.button
                key={c.id}
                onClick={() => { sfx.tabClick(); setCategory(c.id); }}
                className={"section-tab-v2 relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap " + (isActive ? "active" : "")}
                style={{
                  backgroundColor: isActive ? "hsl(220 70% 18% / 0.12)" : "rgba(255,255,255,0.03)",
                  color: isActive ? THEME_P : "hsl(var(--muted-foreground))",
                  border: isActive ? "1px solid hsl(220 70% 18% / 0.25)" : "1px solid rgba(255,255,255,0.05)",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.35 + i * 0.03 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="tab-glow rounded-full" style={{ background: "radial-gradient(ellipse at center, hsl(220 70% 18% / 0.08), transparent 70%)" }} />
                <span className="relative z-10">{c.emoji}</span>
                <span className="relative z-10">{c.label}</span>
                <span className="relative z-10 text-[10px] opacity-50 ml-0.5">(<AnimatedNumber value={categoryCounts[c.id] || 0} />)</span>
              </motion.button>
            );
          })}
        </motion.div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          {(["name", "category"] as const).map((s) => (
            <motion.button
              key={s}
              onClick={() => { sfx.click(); setSortBy(s); }}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: sortBy === s ? "hsl(220 70% 18% / 0.1)" : "transparent",
                color: sortBy === s ? THEME_P : "hsl(var(--muted-foreground))",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {s === "name" ? "Nome" : "Categoria"}
            </motion.button>
          ))}
          <span className="text-xs text-muted-foreground mx-1">|</span>
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-background/50 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="all">Todos os paises</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground ml-auto"><AnimatedNumber value={filtered.length} /> jogo{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <section className="container mx-auto px-4 pb-8 relative z-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={category + search + sortBy}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 card-appear"
          >
            {filtered.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...SPRING, delay: Math.min(i, 18) * 0.03 }}
              >
                <HolographicCard
                  glowColor="#2ea043"
                  intensity="medium"
                  className="block"
                >
                  <Link
                    to={`/lives?game=${game.id}`}
                    className="game-card-v2 block cursor-pointer card-hover-lift btn-press btn-glow rounded-xl"
                    style={{ border: "1px solid rgba(255,255,255,0.05)", "--glow-color": "#2ea043" } as React.CSSProperties}
                    onClick={() => sfx.click()}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${game.grad} rounded-t-xl`} />
                    <div className="p-3 md:p-4">
                      <div className={`game-visual inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${game.grad} mb-3 text-xl shadow-lg`}>
                        {game.emoji}
                      </div>
                      <h3 className="text-sm font-bold leading-tight mb-1 line-clamp-1">{game.label}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{game.desc}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "hsl(var(--muted-foreground))" }}>
                          {game.players}
                        </span>
                        {game.hasBot && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "hsl(220 60% 40% / 0.15)", color: "hsl(220 60% 40%)" }}>
                            Bot IA
                          </span>
                        )}
                      </div>
                      <div className="mt-3 pt-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <span className="text-[10px] text-muted-foreground/50">{game.category}</span>
                        <motion.span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: THEME_P }}>
                          Jogar <ChevronRight className="h-3 w-3" />
                        </motion.span>
                      </div>
                    </div>
                  </Link>
                </HolographicCard>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="empty-state-v2 text-center py-20">
            <div className="empty-orb" style={{ backgroundColor: THEME_P, width: 120, height: 120, top: "20%", left: "40%" }} />
            <motion.div className="empty-float inline-block relative">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.1), hsl(352 73% 50% / 0.05))", border: "1px dashed hsl(220 70% 18% / 0.2)" }}>
                <Gamepad2 className="h-11 w-11 text-muted-foreground/20" />
              </div>
            </motion.div>
            <p className="text-lg font-bold text-muted-foreground">Nenhum jogo encontrado</p>
            <p className="text-sm text-muted-foreground/50 mt-1">Tenta outro termo de pesquisa ou categoria</p>
          </div>
        )}
      </section>

      {category === "todos" && !search && (
        <section className="container mx-auto px-4 pb-12 relative z-20">
          <motion.div
            className="dir-cta-banner"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="p-7 md:p-8 rounded-[1.25rem]" style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.06), hsl(352 73% 50% / 0.03))" }}>
              <div className="flex items-start gap-4">
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shrink-0"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <span>\ud83e\udd16</span>
                </motion.div>
                <div className="flex-1">
                  <h2 className="text-xl font-black font-display mb-1">Jogue contra o Computador</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    <AnimatedNumber value={botGames.length} /> jogos tem inteligencia artificial integrada com 3 niveis de dificuldade. Nao precisa de parceiro \u2014 jogue quando quiser!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {botGames.slice(0, 8).map((g) => (
                      <Link
                        key={g.id}
                        to={`/lives?game=${g.id}`}
                        className="game-card-v2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                        onClick={() => sfx.click()}
                      >
                        <span>{g.emoji}</span> <span>{g.label}</span>
                      </Link>
                    ))}
                    {botGames.length > 8 && (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs text-muted-foreground">
                        <span>+{botGames.length - 8} mais</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default AllGames;
