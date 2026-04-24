import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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
import BottomTabBar from "@/components/BottomTabBar";
import PopularLeaderboard from "@/components/PopularLeaderboard";
import ContestTypesShowcase from "@/components/ContestTypesShowcase";
import CountryRegionFilter from "@/components/CountryRegionFilter";
import StoriesCarousel from "@/components/StoriesCarousel";
import AIRecommendations from "@/components/AIRecommendations";
import TrustSignals from "@/components/TrustSignals";
import LiveTicker from "@/components/LiveTicker";

const Index = () => {
  const isMobile = useIsMobile();
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar />
      <LiveTicker />
      <StoriesCarousel />
      <div className="hidden lg:block">
        <ContestTypesShowcase />
      </div>
      <SearchBar />
      <CategoryNav selected={categoryFilter} onSelect={setCategoryFilter} />
      <section className="container mx-auto px-4 -mt-2 mb-2">
        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🌍 Filtrar por região:</span>
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

      <CTASection />
      <Footer />
      <BottomTabBar />
    </div>
  );
};

export default Index;
