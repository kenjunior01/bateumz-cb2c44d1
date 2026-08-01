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
import { useLanguage } from "@/contexts/LanguageContext";

interface ContestType {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  exampleKey: string;
  evaluation: "votes" | "views";
  gradient: string;
  iconColor: string;
}

const contestTypes: ContestType[] = [
  {
    icon: ChefHat,
    titleKey: "contest.cooking.title",
    descriptionKey: "contest.cooking.desc",
    exampleKey: "contest.cooking.example",
    evaluation: "votes",
    gradient: "from-orange-500/20 to-red-500/20",
    iconColor: "text-orange-500",
  },
  {
    icon: Music,
    titleKey: "contest.music.title",
    descriptionKey: "contest.music.desc",
    exampleKey: "contest.music.example",
    evaluation: "views",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  {
    icon: Camera,
    titleKey: "contest.photography.title",
    descriptionKey: "contest.photography.desc",
    exampleKey: "contest.photography.example",
    evaluation: "votes",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Video,
    titleKey: "contest.viralVideo.title",
    descriptionKey: "contest.viralVideo.desc",
    exampleKey: "contest.viralVideo.example",
    evaluation: "views",
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-500",
  },
  {
    icon: Palette,
    titleKey: "contest.art.title",
    descriptionKey: "contest.art.desc",
    exampleKey: "contest.art.example",
    evaluation: "votes",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: Mic,
    titleKey: "contest.comedy.title",
    descriptionKey: "contest.comedy.desc",
    exampleKey: "contest.comedy.example",
    evaluation: "views",
    gradient: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-500",
  },
  {
    icon: Shirt,
    titleKey: "contest.fashion.title",
    descriptionKey: "contest.fashion.desc",
    exampleKey: "contest.fashion.example",
    evaluation: "votes",
    gradient: "from-fuchsia-500/20 to-purple-500/20",
    iconColor: "text-fuchsia-500",
  },
  {
    icon: Dumbbell,
    titleKey: "contest.sports.title",
    descriptionKey: "contest.sports.desc",
    exampleKey: "contest.sports.example",
    evaluation: "views",
    gradient: "from-green-500/20 to-lime-500/20",
    iconColor: "text-green-500",
  },
  {
    icon: Lightbulb,
    titleKey: "contest.innovation.title",
    descriptionKey: "contest.innovation.desc",
    exampleKey: "contest.innovation.example",
    evaluation: "votes",
    gradient: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-500",
  },
  {
    icon: Smile,
    titleKey: "contest.kids.title",
    descriptionKey: "contest.kids.desc",
    exampleKey: "contest.kids.example",
    evaluation: "votes",
    gradient: "from-cyan-500/20 to-sky-500/20",
    iconColor: "text-cyan-500",
  },
];

const ContestTypesShowcase = () => {
  const { t } = useLanguage();

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
              {t("contest.showcase.title")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("contest.showcase.subtitle")}
            </p>
          </div>
          <Link
            to="/concursos"
            className="ml-auto text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            {t("contest.showcase.seeAll")} <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {contestTypes.map((type, i) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={type.titleKey}
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
                        {type.evaluation === "views" ? "\u{1F441}\uFE0F" : "\u2764\uFE0F"}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground mb-0.5 line-clamp-1">
                      {t(type.titleKey)}
                    </h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">
                      {t(type.descriptionKey)}
                    </p>
                    <p className="text-[10px] font-medium text-primary/80 line-clamp-1 italic">
                      {t(type.exampleKey)}
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
            {t("contest.showcase.suggest")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ContestTypesShowcase;
