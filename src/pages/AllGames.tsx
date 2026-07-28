import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Search, Gamepad2, Users, Brain, Zap, Swords, Grid3X3, Target, Sparkles, Dices, LayoutGrid, Hash, Shuffle, Palette, Map, Crosshair, Layers, Radio, Trophy, Pencil, Bomb, SmilePlus, Anchor, CircleDot, Package, RotateCcw, Vote, Skull, Heart, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
}

const ALL_GAMES: GameDef[] = [
  { id: "tictactoepro", label: "Galo PRO", emoji: "✖", desc: "Galo Ultimate — 9 mini-tabuleiros, estratégia avançada!", grad: "from-violet-600 to-indigo-700", category: "Estratégia", players: "1v1 / Bot", icon: Grid3X3, hasBot: true },
  { id: "connect4", label: "Ligar 4", emoji: "🔴", desc: "Estratégia pura: ligue 4 peças em linha para vencer!", grad: "from-blue-500 to-yellow-500", category: "Estratégia", players: "1v1 / Bot", icon: LayoutGrid, hasBot: true },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "🐍", desc: "Duas cobras, um tabuleiro — quem cresce mais ganha!", grad: "from-emerald-500 to-teal-600", category: "Arcade", players: "1v1 / Bot", icon: Gamepad2, hasBot: true },
  { id: "quickmath", label: "Duelo de Matemática", emoji: "🧮", desc: "Contas rápidas — quem resolve primeiro marca ponto!", grad: "from-cyan-500 to-blue-700", category: "Puzzle", players: "1v1 / Bot", icon: Brain, hasBot: true },
  { id: "memorycards", label: "Memória VS Cartas", emoji: "🃏", desc: "Encontre os pares no tabuleiro partilhado!", grad: "from-indigo-500 to-violet-600", category: "Puzzle", players: "1v1 / Bot", icon: Brain, hasBot: true },
  { id: "guessnumber100", label: "Adivinha 1 a 100", emoji: "🔢", desc: "Quente/Frio — quem adivinha o número secreto primeiro?", grad: "from-teal-500 to-cyan-700", category: "Puzzle", players: "1v1 / Bot", icon: Hash, hasBot: true },
  { id: "pongvs", label: "Pong VS", emoji: "🏓", desc: "Clássico Pong arcade — primeiro a 5 pontos!", grad: "from-blue-600 to-indigo-700", category: "Arcade", players: "1v1 / Bot", icon: Gamepad2, hasBot: false },
  { id: "whackamole", label: "Bate o Alvo", emoji: "🎯", desc: "Toque nas criaturas que aparecem — 30 segundos de caos!", grad: "from-emerald-500 to-green-600", category: "Arcade", players: "1v1 / Bot", icon: Target, hasBot: false },
  { id: "colorcatch", label: "Pesca Cores", emoji: "🎨", desc: "Clique nas cores certas o mais rápido possível!", grad: "from-pink-500 to-rose-600", category: "Reflexo", players: "Solo / Bot", icon: Palette, hasBot: false },
  { id: "diceluel", label: "Duelo de Dados", emoji: "🎲", desc: "Banco ou Arriscar? Corrida a 100 pontos!", grad: "from-amber-600 to-yellow-600", category: "Sorte", players: "1v1 / Bot", icon: Dices, hasBot: false },
  { id: "spotdifference", label: "Encontre Diferenças", emoji: "🔍", desc: "Encontre 5 diferenças entre cenas geradas!", grad: "from-amber-500 to-yellow-600", category: "Puzzle", players: "Solo", icon: Search, hasBot: false },
  { id: "wordchain", label: "Corrente de Palavras", emoji: "🔗", desc: "A última letra vira a primeira — não repita!", grad: "from-teal-500 to-emerald-600", category: "Palavras", players: "1v1 / Bot", icon: Shuffle, hasBot: false },
  { id: "numbertetris", label: "Números Caindo", emoji: "🔢", desc: "Números caem e combinam — estilo Tetris 2048!", grad: "from-orange-600 to-red-700", category: "Puzzle", players: "Solo", icon: LayoutGrid, hasBot: false },
  { id: "cannonbattle", label: "Batalha de Canhões", emoji: "💣", desc: "Ajuste ângulo e força — destrua o adversário!", grad: "from-red-600 to-orange-700", category: "Estratégia", players: "1v1 / Bot", icon: Crosshair, hasBot: false },
  { id: "towerstack", label: "Torre VS", emoji: "🏗️", desc: "Empilhe blocos com precisão — quem constrói mais alto!", grad: "from-sky-500 to-blue-600", category: "Arcade", players: "1v1 / Bot", icon: Layers, hasBot: false },
  { id: "match4", label: "Combina 4", emoji: "✨", desc: "Combine 4+ peças iguais — cascatas e combos!", grad: "from-pink-500 to-rose-600", category: "Puzzle", players: "1v1 / Bot", icon: Sparkles, hasBot: false },
  { id: "mazerace", label: "Corrida no Labirinto", emoji: "🧩", desc: "Quem sai do labirinto primeiro?", grad: "from-green-600 to-emerald-700", category: "Arcade", players: "1v1 / Bot", icon: Map, hasBot: false },
  { id: "slotsvs", label: "Caça-Níqueis VS", emoji: "🎰", desc: "Gire as máquinas — quem acumula mais moedas vence!", grad: "from-amber-500 to-yellow-500", category: "Sorte", players: "1v1 / Bot", icon: Sparkles, hasBot: false },
  { id: "triviaflash", label: "Trivia Flash", emoji: "❗", desc: "Verdadeiro ou Falso — 20 perguntas, velocidade conta!", grad: "from-emerald-500 to-teal-700", category: "Quiz", players: "Solo / Bot", icon: Brain, hasBot: false },
  { id: "patternmemory", label: "Memória de Padrões", emoji: "🧩", desc: "Memorize o padrão de células iluminadas!", grad: "from-purple-500 to-violet-700", category: "Puzzle", players: "Solo / Bot", icon: Grid3X3, hasBot: false },
  { id: "targettap", label: "Alvo Rápido", emoji: "🎯", desc: "Toque nos alvos certos antes que desapareçam!", grad: "from-orange-500 to-red-600", category: "Reflexo", players: "Solo", icon: Target, hasBot: false },
  { id: "colormatch", label: "Cor versus Palavra", emoji: "🎨", desc: "Teste Stroop — identifique a COR do texto!", grad: "from-pink-500 to-rose-700", category: "Reflexo", players: "Solo / Bot", icon: Palette, hasBot: true },
  { id: "wordscramble", label: "Palavras Embaralhadas", emoji: "🔤", desc: "Descubra a palavra escondida nas letras misturadas!", grad: "from-rose-500 to-pink-600", category: "Palavras", players: "Solo / Bot", icon: Shuffle, hasBot: false },
  { id: "reactionrace", label: "Corrida de Reação", emoji: "⚡", desc: "Quem reage mais rápido ao sinal?", grad: "from-yellow-500 to-red-600", category: "Reflexo", players: "1v1 / Bot", icon: Zap, hasBot: false },
  { id: "ballbreaker", label: "Quebra-Bloco VS", emoji: "🧱", desc: "Destrua todos os blocos — quem limpa primeiro!", grad: "from-red-500 to-orange-600", category: "Arcade", players: "1v1 / Bot", icon: Gamepad2, hasBot: false },
  { id: "spaceshooter", label: "Nave Espacial VS", emoji: "🚀", desc: "Destrua naves inimigas — quem faz mais pontos!", grad: "from-slate-500 to-blue-700", category: "Arcade", players: "1v1 / Bot", icon: Zap, hasBot: false },
  { id: "colorsequence", label: "Sequência de Cores", emoji: "🟢", desc: "Memorize a sequência de cores e repita!", grad: "from-violet-500 to-fuchsia-600", category: "Puzzle", players: "1v1 / Bot", icon: Sparkles, hasBot: true },
  { id: "rps", label: "Pedra Papel Tesoura", emoji: "✊", desc: "Jokenpô clássico — melhor de 3, 5 ou 7 rounds!", grad: "from-amber-500 to-orange-600", category: "Sorte", players: "1v1 / Bot", icon: Swords, hasBot: true },
  { id: "tictactoe", label: "Galo VS", emoji: "✕", desc: "Rápido, com apostas, streaks e modo velocidade!", grad: "from-violet-500 to-pink-500", category: "Estratégia", players: "1v1 / Bot", icon: CircleDot, hasBot: false },
  { id: "checkers", label: "Damas", emoji: "♟️", desc: "Jogo clássico com capturas e promoção a rei!", grad: "from-amber-700 to-red-800", category: "Estratégia", players: "1v1 / Bot", icon: Grid3X3, hasBot: false },
  { id: "battleship", label: "Batalha Naval", emoji: "🚢", desc: "Esconda os navios e afunde a frota inimiga!", grad: "from-slate-600 to-blue-900", category: "Estratégia", players: "1v1 / Bot", icon: Anchor, hasBot: false },
  { id: "dominoes", label: "Dominó", emoji: "🎲", desc: "Encaixe as peças e esvazie a mão!", grad: "from-slate-600 to-zinc-700", category: "Estratégia", players: "1v1 / Bot", icon: LayoutGrid, hasBot: false },
  { id: "ludo", label: "Ludo", emoji: "🎲", desc: "4 jogadores, dado, peças e estratégia!", grad: "from-emerald-600 to-teal-700", category: "Estratégia", players: "1v1 / Bot", icon: Dices, hasBot: false },
  { id: "uno", label: "UNO Cartas", emoji: "🃏", desc: "Cartas com cores, especiais e UNO!", grad: "from-indigo-500 to-purple-600", category: "Cartas", players: "1v1 / Bot", icon: Sparkles, hasBot: false },
  { id: "tap", label: "Tap Battle", emoji: "⚡", desc: "Batalha de toques: 1v1 ou contra o bot!", grad: "from-amber-500 to-orange-500", category: "Reflexo", players: "1v1 / Bot", icon: Zap, hasBot: true },
  { id: "quiz", label: "Quiz Battle", emoji: "🧠", desc: "Trivia ao vivo, sozinho ou com convidado!", grad: "from-sky-500 to-blue-500", category: "Quiz", players: "1v1 / Bot", icon: Brain, hasBot: false },
  { id: "millionaire", label: "Quem Quer Ser Milionário?", emoji: "💰", desc: "Perguntas e respostas para o prêmio máximo!", grad: "from-purple-500 to-violet-500", category: "Quiz", players: "Solo", icon: Trophy, hasBot: false },
  { id: "wheel", label: "Roda de Prémios", emoji: "🎰", desc: "Sorteie prémios reais com probabilidades configuráveis!", grad: "from-violet-500 to-fuchsia-500", category: "Sorte", players: "Solo", icon: RotateCcw, hasBot: false },
  { id: "mystery", label: "Caixa Misteriosa", emoji: "🎁", desc: "4 caixas, prémios escondidos!", grad: "from-emerald-500 to-teal-500", category: "Sorte", players: "Solo", icon: Package, hasBot: false },
  { id: "emoji", label: "Batalha de Emojis", emoji: "💥", desc: "Vote ao vivo, vencedores entram no sorteio!", grad: "from-pink-500 to-rose-500", category: "Social", players: "Multi", icon: Vote, hasBot: false },
  { id: "keyword", label: "Caça à Palavra", emoji: "🔎", desc: "Audiência adivinha a palavra-chave secreta!", grad: "from-amber-500 to-orange-500", category: "Social", players: "Multi", icon: Search, hasBot: false },
  { id: "truthordare", label: "Verdade ou Desafio", emoji: "🔥", desc: "Verdades picantes e desafios engraçados!", grad: "from-rose-500 to-red-600", category: "Social", players: "Multi", icon: Heart, hasBot: false },
  { id: "punishment", label: "Roleta de Castigos", emoji: "💀", desc: "Gire a roleta e cumpra o castigo!", grad: "from-red-600 to-rose-700", category: "Social", players: "Multi", icon: Skull, hasBot: false },
  { id: "guessEmoji", label: "Adivinhe o Emoji", emoji: "😎", desc: "Decifre a frase a partir dos emojis!", grad: "from-yellow-500 to-amber-600", category: "Quiz", players: "Multi", icon: SmilePlus, hasBot: false },
  { id: "quickdraw", label: "Desenho Rápido", emoji: "🎨", desc: "Desenhe e deixe o público adivinhar!", grad: "from-emerald-500 to-teal-600", category: "Social", players: "Multi", icon: Pencil, hasBot: false },
  { id: "hotpotato", label: "Batata Quente", emoji: "💣", desc: "Passe a batata — quem tiver quando explodir, sai!", grad: "from-orange-500 to-red-600", category: "Social", players: "Multi", icon: Bomb, hasBot: false },
  { id: "chaos", label: "Desafio Caótico", emoji: "🌪️", desc: "Desafios aleatórios contra o relógio!", grad: "from-rose-500 to-pink-600", category: "Social", players: "Multi", icon: Shuffle, hasBot: false },
  { id: "boknowledge", label: "Batalha de Conhecimentos", emoji: "📚", desc: "Trivia VS com bônus de streak — 10 perguntas!", grad: "from-cyan-500 to-purple-600", category: "Quiz", players: "1v1 / Bot", icon: Brain, hasBot: false },
  { id: "numguess", label: "Adivinha o Número VS", emoji: "🔢", desc: "Duelo — quem adivinha o número secreto primeiro?", grad: "from-violet-500 to-fuchsia-600", category: "Puzzle", players: "1v1 / Bot", icon: Hash, hasBot: false },
  { id: "speed", label: "Duelo de Velocidade", emoji: "⚡", desc: "Quem reage mais rápido?", grad: "from-cyan-500 to-blue-600", category: "Reflexo", players: "1v1 / Bot", icon: Zap, hasBot: false },
  { id: "vsduel", label: "Arena de Duelo VS", emoji: "⚔️", desc: "Duelo 1v1: reação, matemática e palavras!", grad: "from-red-500 to-orange-600", category: "Variado", players: "1v1", icon: Swords, hasBot: false },
  { id: "challenge", label: "Roleta de Desafios", emoji: "🎭", desc: "Gire a roleta e cumpra o desafio ao vivo!", grad: "from-fuchsia-500 to-pink-500", category: "Social", players: "Multi", icon: RotateCcw, hasBot: false },
  { id: "kahoot", label: "Quiz ao Vivo", emoji: "🎯", desc: "Quiz multiplayer — a audiência joga em tempo real!", grad: "from-sky-500 to-indigo-600", category: "Quiz", players: "Multi", icon: Brain, hasBot: false },
  { id: "bingo", label: "Bingo ao Vivo", emoji: "🎱", desc: "Cartão virtual com números sorteados em tempo real!", grad: "from-emerald-500 to-teal-600", category: "Sorte", players: "Multi", icon: Trophy, hasBot: false },
  { id: "memory", label: "Jogo da Memória VS", emoji: "🧠", desc: "Batalha de pares — quem tem melhor memória?", grad: "from-indigo-500 to-purple-600", category: "Puzzle", players: "1v1 / Bot", icon: Brain, hasBot: false },
];

const CATEGORIES = [
  { id: "todos", label: "Todos", emoji: "🎮" },
  { id: "Estratégia", label: "Estratégia", emoji: "♟️" },
  { id: "Arcade", label: "Arcade", emoji: "👾" },
  { id: "Puzzle", label: "Puzzle", emoji: "🧩" },
  { id: "Reflexo", label: "Reflexo", emoji: "⚡" },
  { id: "Quiz", label: "Quiz", emoji: "🧠" },
  { id: "Sorte", label: "Sorte", emoji: "🎲" },
  { id: "Social", label: "Social", emoji: "👥" },
  { id: "Palavras", label: "Palavras", emoji: "🔤" },
  { id: "Cartas", label: "Cartas", emoji: "🃏" },
  { id: "Variado", label: "Variado", emoji: "🎪" },
];

const AllGames = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [sortBy, setSortBy] = useState<"name" | "category">("name");

  const filtered = useMemo(() => {
    let list = ALL_GAMES;
    if (category !== "todos") list = list.filter((g) => g.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.label.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
    }
    if (sortBy === "name") list = [...list].sort((a, b) => a.label.localeCompare(b.label));
    else list = [...list].sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
    return list;
  }, [search, category, sortBy]);

  const botGames = useMemo(() => ALL_GAMES.filter((g) => g.hasBot), []);
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { todos: ALL_GAMES.length };
    ALL_GAMES.forEach((g) => { m[g.category] = (m[g.category] || 0) + 1; });
    return m;
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 animate-page-enter bg-cosmic bg-noise">
      <Helmet>
        <title>50+ Jogos Online Grátis — Bateu</title>
        <meta name="description" content="Jogue mais de 50 jogos online grátis: estratégia, arcade, puzzle, quiz, reflexo e muito mais. Jogue contra amigos ou contra o computador!" />
        <meta property="og:title" content="50+ Jogos Online Grátis — Bateu" />
        <meta property="og:description" content="Jogue mais de 50 jogos online grátis: estratégia, arcade, puzzle, quiz, reflexo e muito mais. Jogue contra amigos ou contra o computador!" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${window.location.origin}/jogos`} />
      </Helmet>

      <Navbar />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 animate-mesh-bg" style={{ backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)/0.1), hsl(var(--background)) 40%, hsl(var(--accent)/0.05) 70%)', backgroundSize: '400% 400%' }} />
        <div className="absolute -top-1/2 -right-1/3 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl animate-aurora" />
        <div className="relative container mx-auto px-4 py-8 md:py-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 25 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 text-primary text-xs font-bold mb-3 border border-primary/15"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              {ALL_GAMES.length} JOGOS DISPONÍVEIS
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-3xl md:text-5xl font-bold mb-2"
            >
              Todos os <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">Jogos</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-muted-foreground text-sm md:text-base mb-5"
            >
              Mais de 50 jogos online grátis. Estratégia, arcade, puzzle, quiz, reflexos e muito mais — jogue contra amigos ou contra o computador!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex flex-wrap gap-3 mb-6"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 text-xs font-bold border border-emerald-500/15">
                <Users className="h-3.5 w-3.5" /> {botGames.length} jogos com Bot IA
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-xs font-bold border border-blue-500/15">
                <Zap className="h-3.5 w-3.5" /> Jogo instantâneo
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 px-3 py-1.5 text-xs font-bold border border-violet-500/15">
                <Radio className="h-3.5 w-3.5" /> Modo Live
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="relative max-w-md"
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Procurar jogo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all shadow-sm"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 pt-4 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
        >
          {CATEGORIES.map((c) => (
            <motion.button
              key={c.id}
              onClick={() => setCategory(c.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                category === c.id ? "text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {category === c.id && (
                <motion.div
                  layoutId="allGamesCat"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{c.emoji}</span>
              <span className="relative z-10">{c.label}</span>
              <span className="relative z-10 opacity-70">({categoryCounts[c.id] || 0})</span>
            </motion.button>
          ))}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex items-center gap-2 mt-2"
        >
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setSortBy("name")}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${sortBy === "name" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >Nome</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setSortBy("category")}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${sortBy === "category" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >Categoria</motion.button>
          <span className="text-xs text-muted-foreground ml-auto animate-count-up" key={filtered.length}>{filtered.length} jogo{filtered.length !== 1 ? "s" : ""}</span>
        </motion.div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            key={category + search + sortBy}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
          >
            {filtered.map((game, i) => (
              <motion.div
                key={game.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(i * 0.025, 0.5), type: "spring", stiffness: 280, damping: 24 }}
              >
                <Link
                  to={`/lives?game=${game.id}`}
                  className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 game-card-shine border-morph block"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${game.grad}`} />
                  <div className="p-3">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${game.grad} mb-2 text-lg shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      {game.emoji}
                    </div>
                    <h3 className="text-sm font-bold leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">
                      {game.label}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{game.desc}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-secondary text-[10px] font-medium text-muted-foreground">
                        {game.players}
                      </span>
                      {game.hasBot && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Bot IA
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-16"
          >
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-5xl mb-4"
            >🎮</motion.div>
            <h3 className="text-lg font-bold mb-1">Nenhum jogo encontrado</h3>
            <p className="text-sm text-muted-foreground">Tenta outro termo de pesquisa ou categoria</p>
          </motion.div>
        )}
        </AnimatePresence>
      </section>

      {category === "todos" && !search && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="container mx-auto px-4 pb-12"
        >
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 20 }}
                className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-emerald-500/20"
              >
                🤖
              </motion.div>
              <div>
                <h2 className="text-xl font-bold mb-1">Jogue contra o Computador</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {botGames.length} jogos têm inteligência artificial integrada com 3 níveis de dificuldade. Não precisa de parceiro — jogue quando quiser!
                </p>
                <div className="flex flex-wrap gap-2">
                  {botGames.slice(0, 8).map((g, i) => (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.65 + i * 0.05 }}
                    >
                      <Link
                        to={`/lives?game=${g.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <span>{g.emoji}</span> {g.label}
                      </Link>
                    </motion.div>
                  ))}
                  {botGames.length > 8 && (
                    <span className="inline-flex items-center px-3 py-1.5 text-xs text-muted-foreground">
                      +{botGames.length - 8} mais
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      <Footer />
    </div>
  );
};

export default AllGames;
