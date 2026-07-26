import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import CategoryNav from "@/components/CategoryNav";
import SearchBar from "@/components/SearchBar";
import MobileActionButtons from "@/components/MobileActionButtons";
import ActiveRaffles from "@/components/ActiveRaffles";
import FeaturesGrid from "@/components/FeaturesGrid";
import WinnersSection from "@/components/WinnersSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import DesktopWidgets from "@/components/DesktopWidgets";
import LiveFeed from "@/components/LiveFeed";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, X, Gamepad2, ArrowRight, Users, Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import PopularLeaderboard from "@/components/PopularLeaderboard";
import ContestTypesShowcase from "@/components/ContestTypesShowcase";
import CountryRegionFilter from "@/components/CountryRegionFilter";
import StoriesCarousel from "@/components/StoriesCarousel";
import AIRecommendations from "@/components/AIRecommendations";
import TrustSignals from "@/components/TrustSignals";
import LiveTicker from "@/components/LiveTicker";
import StayInLoop from "@/components/StayInLoop";

const POPULAR_GAMES = [
  { id: "tictactoepro", label: "Galo PRO", emoji: "✖", grad: "from-violet-600 to-indigo-700", hasBot: true },
  { id: "connect4", label: "Ligar 4", emoji: "🔴", grad: "from-blue-500 to-yellow-500", hasBot: true },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "🐍", grad: "from-emerald-500 to-teal-600", hasBot: true },
  { id: "quickmath", label: "Duelo de Matemática", emoji: "🧮", grad: "from-cyan-500 to-blue-700", hasBot: true },
  { id: "rps", label: "Pedra Papel Tesoura", emoji: "✊", grad: "from-amber-500 to-orange-600", hasBot: true },
  { id: "memorycards", label: "Memória VS Cartas", emoji: "🃏", grad: "from-indigo-500 to-violet-600", hasBot: true },
  { id: "pongvs", label: "Pong VS", emoji: "🏓", grad: "from-blue-600 to-indigo-700", hasBot: false },
  { id: "whackamole", label: "Bate o Alvo", emoji: "🎯", grad: "from-emerald-500 to-green-600", hasBot: false },
];

const Index = () => {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");


  const handleCategorySelect = (category: string) => {
    if (category === "gaming") {
      navigate("/jogos");
    } else {
      setCategoryFilter(category);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar />
      <LiveTicker />

      <StoriesCarousel />
      <div className="hidden lg:block">
        <ContestTypesShowcase />
      </div>
      <SearchBar />
      <CategoryNav selected={categoryFilter} onSelect={handleCategorySelect} />
      <section className="container mx-auto px-4 -mt-2 mb-2">
        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("cat.filterByRegion")}</span>
          <CountryRegionFilter country={country} region={region} onCountry={setCountry} onRegion={setRegion} compact />
        </div>
      </section>
      <MobileActionButtons />

      <div className="container mx-auto px-4">
        <div className="relative flex gap-6">
          <div className="flex-1 min-w-0">
            <AIRecommendations />
            <ActiveRaffles categoryFilter={categoryFilter} country={country} region={region} />

            <PopularLeaderboard />

            {isMobile && (
              <section className="py-6">
                <LiveFeed />
              </section>
            )}

            <FeaturesGrid />

            {/* Jogos Populares */}
            <section className="py-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Gamepad2 className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold">Jogos Populares</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    <Users className="h-3 w-3" /> 50+ jogos
                  </span>
                </div>
                <Link to="/jogos" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                  Ver todos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {POPULAR_GAMES.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/lives?game=${g.id}`}
                      className="group block rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
                    >
                      <div className={`h-1 bg-gradient-to-r ${g.grad}`} />
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xl">{g.emoji}</span>
                          <span className="text-sm font-bold group-hover:text-primary transition-colors">{g.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">Online</span>
                          {g.hasBot && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">Bot IA</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-bold">Jogue contra o computador</p>
                    <p className="text-xs text-muted-foreground">6 jogos com IA em 3 níveis de dificuldade</p>
                  </div>
                </div>
                <Link to="/jogos" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
                  Jogar <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </section>

            {/* Blog / Dicas */}
            <section className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold">Blog & Dicas</h2>
                </div>
                <Link to="/blog" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                  Ver tudo <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { title: "Como Ganhar no Galo", slug: "como-ganhar-jogo-do-galo-estrategias", emoji: "♟️", cat: "Estratégia" },
                  { title: "10 Dicas para Sorteios", slug: "10-dicas-sorteios-online", emoji: "🎰", cat: "Sorteios" },
                  { title: "Jogos que Treinam o Cérebro", slug: "jogos-online-treinar-cerebro", emoji: "🧠", cat: "Ciência" },
                ].map((post, i) => (
                  <motion.div
                    key={post.slug}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link
                      to={`/blog/${post.slug}`}
                      className="group block rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
                    >
                      <div className="p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{post.cat}</span>
                        <h3 className="text-sm font-bold mt-1 group-hover:text-primary transition-colors line-clamp-2">{post.emoji} {post.title}</h3>
                        <span className="inline-flex items-center gap-1 text-xs text-primary mt-2 font-medium">
                          Ler mais <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>

            <WinnersSection />
            <HeroSection />
            <StatsBar />
            <TrustSignals />
          </div>

          {!isMobile && (
            <aside className="hidden lg:block w-80 shrink-0 py-12">
              <div className="sticky top-28">
                <DesktopWidgets />
              </div>
            </aside>
          )}
        </div>
      </div>

      <StayInLoop />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
