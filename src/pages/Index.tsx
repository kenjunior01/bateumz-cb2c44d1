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
import FeaturedContestsCarousel from "@/components/FeaturedContestsCarousel";

const Index = () => {
  const isMobile = useIsMobile();
  const [categoryFilter, setCategoryFilter] = useState("todos");

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar />
      <HeroSection />
      <FeaturedContestsCarousel />
      <SearchBar />
      <StatsBar />
      <CategoryNav selected={categoryFilter} onSelect={setCategoryFilter} />
      <MobileActionButtons />

      <div className="container mx-auto px-4">
        <div className="relative flex gap-6">
          <div className="flex-1 min-w-0">
            <ActiveRaffles categoryFilter={categoryFilter} />

            <PopularLeaderboard />

            {isMobile && (
              <section className="py-6">
                <LiveFeed />
              </section>
            )}

            <FeaturesGrid />
            <WinnersSection />
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
