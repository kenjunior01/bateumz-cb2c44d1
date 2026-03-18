import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import CategoryNav from "@/components/CategoryNav";
import MobileActionButtons from "@/components/MobileActionButtons";
import ActiveRaffles from "@/components/ActiveRaffles";
import FeaturesGrid from "@/components/FeaturesGrid";
import WinnersSection from "@/components/WinnersSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import DesktopWidgets from "@/components/DesktopWidgets";
import LiveFeed from "@/components/LiveFeed";

const Index = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <CategoryNav />
      <MobileActionButtons />

      {/* Main content with sidebar widgets on desktop */}
      <div className="container mx-auto px-4">
        <div className="relative flex gap-6">
          <div className="flex-1 min-w-0">
            <ActiveRaffles />

            {/* Mobile live feed - social proof */}
            {isMobile && (
              <section className="py-6">
                <LiveFeed />
              </section>
            )}

            <FeaturesGrid />
            <WinnersSection />
          </div>

          {/* Desktop sidebar widgets */}
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
    </div>
  );
};

export default Index;
