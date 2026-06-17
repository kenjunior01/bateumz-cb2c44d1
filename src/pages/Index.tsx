import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Trophy, Zap } from "lucide-react";

import PopularLeaderboard from "@/components/PopularLeaderboard";
import ContestTypesShowcase from "@/components/ContestTypesShowcase";
import CountryRegionFilter from "@/components/CountryRegionFilter";
import StoriesCarousel from "@/components/StoriesCarousel";
import AIRecommendations from "@/components/AIRecommendations";
import TrustSignals from "@/components/TrustSignals";
import LiveTicker from "@/components/LiveTicker";
import StayInLoop from "@/components/StayInLoop";

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
      
      {/* World Cup 2026 Banner */}
      <section className="container mx-auto px-4 py-6">
        <Card className="bg-gradient-to-r from-green-600 to-yellow-500 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Trophy className="h-12 w-12" />
                <div>
                  <h2 className="text-2xl font-bold">Copa do Mundo 2026</h2>
                  <p className="opacity-90">Acompanhe todos os jogos, equipes e notícias</p>
                </div>
              </div>
              <Button 
                onClick={() => navigate("/mundial")} 
                className="bg-white text-green-700 hover:bg-gray-100"
              >
                <Zap className="h-4 w-4 mr-2" />
                Ir para Central
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

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
