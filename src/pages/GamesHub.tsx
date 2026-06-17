
import { Link } from "react-router-dom";
import {
  Trophy,
  Gamepad2,
  Zap,
  Users,
  Globe,
  MessageSquare,
  RotateCcw,
  Search,
  Vote,
  Brain,
  Package,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";

interface GameCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  games: {
    id: string;
    title: string;
    description: string;
    emoji: string;
    link: string;
    isNew?: boolean;
  }[];
}

const GAME_CATEGORIES: GameCategory[] = [
  {
    id: "live",
    title: "Jogos de Live",
    subtitle: "Jogos interativos para suas transmissões ao vivo",
    icon: Gamepad2,
    color: "from-emerald-500 to-teal-500",
    games: [
      {
        id: "live-hub",
        title: "Live Hub",
        description: "Central de jogos para lives com roda, quiz, tap battle e mais",
        emoji: "🎥",
        link: "/lives",
      },
    ],
  },
  {
    id: "standalone",
    title: "Jogos Individuais",
    subtitle: "Jogue sem precisar de uma transmissão ao vivo",
    icon: Trophy,
    color: "from-violet-500 to-fuchsia-500",
    games: [
      {
        id: "wheel",
        title: "Roda da Sorte",
        description: "Gire a roda e ganhe prêmios",
        emoji: "🎡",
        link: "/instant-win",
      },
      {
        id: "millionaire",
        title: "Quem Quer Ser Milionário?",
        description: "Jogo de perguntas e respostas para ganhar prêmios",
        emoji: "🤑",
        link: "/lives",
      },
    ],
  },
  {
    id: "world-cup",
    title: "Mundial 2026",
    subtitle: "Jogos e atividades especiais para o Mundial",
    icon: Globe,
    color: "from-amber-500 to-orange-500",
    games: [
      {
        id: "world-cup-central",
        title: "Central do Mundial",
        description: "Acompanhe jogos, equipes e notícias do Mundial",
        emoji: "🏆",
        link: "/mundial",
        isNew: true,
      },
      {
        id: "predictions",
        title: "Predictor - Bolão do Mundial",
        description: "Faça suas previsões e acumule pontos",
        emoji: "🎯",
        link: "/bolao",
        isNew: true,
      },
      {
        id: "fantasy",
        title: "Fantasy Football",
        description: "Monte sua equipe com os melhores jogadores",
        emoji: "⚽",
        link: "/fantasy",
        isNew: true,
      },
      {
        id: "penalty",
        title: "Disputa de Pênaltis",
        description: "Marque gols e vença na disputa de pênaltis",
        emoji: "🥅",
        link: "/lives",
        isNew: true,
      },
      {
        id: "forum",
        title: "Fórum do Mundial",
        description: "Discuta sobre os jogos e equipes",
        emoji: "💬",
        link: "/forum-mundial",
      },
    ],
  },
  {
    id: "party",
    title: "Jogos de Festa",
    subtitle: "Jogos para jogar com amigos e familiares",
    icon: Users,
    color: "from-pink-500 to-rose-500",
    games: [
      {
        id: "tap",
        title: "Tap Battle",
        description: "Batalha de toques com 2 jogadores",
        emoji: "⚡",
        link: "/lives",
      },
      {
        id: "quiz",
        title: "Quiz Battle",
        description: "Trivia competitiva",
        emoji: "🧠",
        link: "/lives",
      },
      {
        id: "emoji",
        title: "Batalha de Emojis",
        description: "Votação com emojis",
        emoji: "💥",
        link: "/lives",
      },
      {
        id: "keyword",
        title: "Caça à Palavra",
        description: "Adivinhe a palavra secreta",
        emoji: "🔎",
        link: "/lives",
      },
      {
        id: "mystery",
        title: "Caixa Misteriosa",
        description: "Abra caixas e descubra prêmios",
        emoji: "🎁",
        link: "/lives",
      },
    ],
  },
];

const GamesHub = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4 mx-auto">
            <Trophy className="h-4 w-4" />
            TODOS OS JOGOS
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Hub de <span className="text-primary">Jogos</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Explore todos os jogos disponíveis na plataforma — desde jogos de live até atividades especiais do Mundial!
          </p>
        </div>
        
        {/* Categories */}
        <div className="space-y-10">
          {GAME_CATEGORIES.map((category) => (
            <section key={category.id}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white text-2xl shadow-lg`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">{category.title}</h2>
                  <p className="text-muted-foreground text-sm">{category.subtitle}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {category.games.map((game) => (
                  <Link
                    key={game.id}
                    to={game.link}
                    className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
                  >
                    {game.isNew && (
                      <div className="absolute -top-3 -right-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-md">
                          NOVO
                        </span>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3">
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {game.emoji}
                      </div>
                      
                      <div>
                        <h3 className="font-display text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                          {game.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {game.description}
                        </p>
                      </div>
                      
                      <div className="mt-auto pt-4 flex items-center gap-2 text-primary text-sm font-medium">
                        <span>Jogar agora</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      
      <Footer />
      <BottomTabBar />
    </div>
  );
};

export default GamesHub;
