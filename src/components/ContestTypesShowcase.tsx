import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChefHat,
  Music,
  Camera,
  Palette,
  Video,
  Mic,
  Dumbbell,
  Shirt,
  Sparkles,
  ArrowRight,
  Lightbulb,
  Smile,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ContestType {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  example: string;
  evaluation: "votes" | "views";
  gradient: string;
  iconColor: string;
}

const contestTypes: ContestType[] = [
  {
    icon: ChefHat,
    title: "Culinária",
    description: "Receitas, pratos típicos e criações gastronómicas",
    example: "Ex: Melhor caldo de Benny",
    evaluation: "votes",
    gradient: "from-orange-500/20 to-red-500/20",
    iconColor: "text-orange-500",
  },
  {
    icon: Music,
    title: "Música & Dança",
    description: "Performances musicais, coreografias e talentos",
    example: "Ex: Melhor afro-beat moçambicano",
    evaluation: "views",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  {
    icon: Camera,
    title: "Fotografia",
    description: "Capture momentos, paisagens e a beleza de Moçambique",
    example: "Ex: Melhor pôr do sol em Maputo",
    evaluation: "votes",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Video,
    title: "Vídeo Viral",
    description: "Vídeos curtos, criativos e cheios de humor",
    example: "Ex: TikTok mais engraçado",
    evaluation: "views",
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-500",
  },
  {
    icon: Palette,
    title: "Arte & Design",
    description: "Pinturas, ilustrações, design gráfico e artesanato",
    example: "Ex: Melhor logo de marca local",
    evaluation: "votes",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: Mic,
    title: "Comédia & Stand-up",
    description: "Faça rir Moçambique com o seu talento",
    example: "Ex: Melhor piada em changana",
    evaluation: "views",
    gradient: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-500",
  },
  {
    icon: Shirt,
    title: "Moda & Estilo",
    description: "Looks, capulanas modernas e tendências",
    example: "Ex: Melhor look com capulana",
    evaluation: "votes",
    gradient: "from-fuchsia-500/20 to-purple-500/20",
    iconColor: "text-fuchsia-500",
  },
  {
    icon: Dumbbell,
    title: "Desporto & Fitness",
    description: "Desafios físicos, jogadas e habilidades",
    example: "Ex: Melhor golo amador",
    evaluation: "views",
    gradient: "from-green-500/20 to-lime-500/20",
    iconColor: "text-green-500",
  },
  {
    icon: Lightbulb,
    title: "Inovação & Negócios",
    description: "Ideias empreendedoras e projectos sociais",
    example: "Ex: Melhor pitch de startup",
    evaluation: "votes",
    gradient: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-500",
  },
  {
    icon: Smile,
    title: "Crianças & Família",
    description: "Talentos infantis, desenhos e momentos em família",
    example: "Ex: Desenho mais criativo",
    evaluation: "votes",
    gradient: "from-cyan-500/20 to-sky-500/20",
    iconColor: "text-cyan-500",
  },
];

const ContestTypesShowcase = () => {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-5 flex items-center gap-2"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20"
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight">
              Tipos de Concursos
            </h2>
            <p className="text-xs text-muted-foreground">
              Mostre o seu talento e ganhe prémios
            </p>
          </div>
          <Link
            to="/concursos"
            className="ml-auto text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {contestTypes.map((type, i) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 200 }}
                whileHover={{ y: -4, scale: 1.03 }}
              >
                <Link to="/concursos">
                  <div
                    className={`relative h-full overflow-hidden rounded-xl glass border border-border/50 hover:border-primary/40 transition-all p-3 group cursor-pointer bg-gradient-to-br ${type.gradient}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg bg-background/60 backdrop-blur ${type.iconColor}`}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 bg-background/60 backdrop-blur border-border/50"
                      >
                        {type.evaluation === "views" ? "👁️" : "❤️"}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground mb-0.5 line-clamp-1">
                      {type.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">
                      {type.description}
                    </p>
                    <p className="text-[10px] font-medium text-primary/80 line-clamp-1 italic">
                      {type.example}
                    </p>

                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      whileHover={{ x: 0, opacity: 1 }}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowRight className="h-3 w-3 text-primary" />
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-4 text-center"
        >
          <Link
            to="/concursos"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            Tem uma ideia de concurso? Sugira à comunidade
            <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ContestTypesShowcase;
