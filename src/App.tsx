import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import BackgroundDecorations from "@/components/BackgroundDecorations";
import CountryLanguageSync from "@/components/CountryLanguageSync";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DynamicThemeProvider } from "@/contexts/DynamicThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { RegionalThemeProvider } from "@/contexts/RegionalThemeContext";
import { RegionalConfigProvider, useRegionalContext } from "@/hooks/useRegionalConfig.tsx";
import AdminRegionalBranding from "./pages/admin/AdminRegionalBranding.tsx";
import AdminRegionalDashboard from "./pages/admin/AdminRegionalDashboard.tsx";
import AdminSuperDashboard from "./pages/admin/AdminSuperDashboard.tsx";
import EngagementLeaderboard from "./pages/EngagementLeaderboard.tsx";
import EnhancedMillionaireGame from "./components/livegames/EnhancedMillionaireGame.tsx";
import PrizeWheel from "./components/livegames/PrizeWheel.tsx";
import { DEFAULT_WHEEL_PRIZES } from "./components/livegames/PrizeWheel.tsx";
import AdminMillionaireManager from "./pages/admin/AdminMillionaireManager.tsx";
import AdminSpinWheelManager from "./pages/admin/AdminSpinWheelManager.tsx";
import RegionalPreviewBar from "@/components/admin/RegionalPreviewBar";
import RegionalCEODashboard from "@/components/RegionalCEODashboard";
import PayPalProvider from "@/components/payments/PayPalProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import RaffleDetail from "./pages/RaffleDetail.tsx";
import UserDashboard from "./pages/UserDashboard.tsx";
import DashboardLayout from "./layouts/DashboardLayout.tsx";
import DashboardOverview from "./pages/dashboard/DashboardOverview.tsx";
import DashboardRaffles from "./pages/dashboard/DashboardRaffles.tsx";
import DashboardAnalytics from "./pages/dashboard/DashboardAnalytics.tsx";
import SocialAnalytics from "./pages/dashboard/SocialAnalytics.tsx";
import DashboardParticipants from "./pages/dashboard/DashboardParticipants.tsx";
import DashboardSettings from "./pages/dashboard/DashboardSettings.tsx";
import CreateRaffle from "./pages/dashboard/CreateRaffle.tsx";
import LiveDraw from "./pages/LiveDraw.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminRaffles from "./pages/admin/AdminRaffles.tsx";
import AdminRevenue from "./pages/admin/AdminRevenue.tsx";
import AdminPayments from "./pages/admin/AdminPayments.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminGameManager from "./pages/admin/AdminGameManager.tsx";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs.tsx";
import Contests from "./pages/Contests.tsx";
import ContestDetail from "./pages/ContestDetail.tsx";
import AdminCronJobs from "./pages/admin/AdminCronJobs.tsx";
import AdminCoFounders from "./pages/admin/AdminCoFounders.tsx";
import AdminRegionalRevenue from "./pages/admin/AdminRegionalRevenue.tsx";
import AdminRegionalManagers from "./pages/admin/AdminRegionalManagers.tsx";
import AdminPlans from "./pages/admin/AdminPlans.tsx";
import AdminVouchers from "./pages/admin/AdminVouchers.tsx";
import Install from "./pages/Install.tsx";
import Referral from "./pages/Referral.tsx";
import Community from "./pages/Community.tsx";
import WhiteLabelConfig from "./pages/dashboard/WhiteLabelConfig.tsx";
import GameBrandingConfig from "./pages/dashboard/GameBrandingConfig.tsx";
import DashboardPrizes from "./pages/dashboard/DashboardPrizes.tsx";
import DashboardNotifications from "./pages/dashboard/DashboardNotifications.tsx";
import Profile from "./pages/Profile.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import HowItWorks from "./pages/HowItWorks.tsx";
import FAQ from "./pages/FAQ.tsx";
import RaffleHistory from "./pages/RaffleHistory.tsx";
import MyTickets from "./pages/MyTickets.tsx";
import EditRaffle from "./pages/dashboard/EditRaffle.tsx";
import SocialRaffleManager from "./pages/dashboard/SocialRaffleManager.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPostDetail from "./pages/BlogPostDetail.tsx";
import AllGames from "./pages/AllGames.tsx";
import AdminContests from "./pages/admin/AdminContests.tsx";
import DashboardContests from "./pages/dashboard/DashboardContests.tsx";
import BusinessProfile from "./pages/BusinessProfile.tsx";
import BusinessDirectory from "./pages/BusinessDirectory.tsx";
import LiveHub from "./pages/LiveHub.tsx";
import LiveOverlay from "./pages/LiveOverlay.tsx";
import InstantWin from "./pages/InstantWin.tsx";
import Transparency from "./pages/Transparency.tsx";
import Prestacoes from "./pages/Prestacoes.tsx";
import PrestacoesCatalogo from "./pages/PrestacoesCatalogo.tsx";
import PrestacoesProduto from "./pages/PrestacoesProduto.tsx";
import DashboardPrestacoes from "./pages/dashboard/DashboardPrestacoes.tsx";
import DashboardLiveGames from "./pages/dashboard/DashboardLiveGames.tsx";
import DashboardLiveHistory from "./pages/dashboard/DashboardLiveHistory.tsx";
import DashboardLiveStats from "./pages/dashboard/DashboardLiveStats.tsx";
import CompanyPublicProfile from "./pages/CompanyPublicProfile.tsx";
import DashboardAmbassadors from "./pages/dashboard/DashboardAmbassadors.tsx";
import AmbassadorRedirect from "./pages/AmbassadorRedirect.tsx";
import LiveAmbassadorsRanking from "./pages/LiveAmbassadorsRanking.tsx";
import ScheduledLivePage from "./pages/ScheduledLivePage.tsx";
import DashboardScheduledLives from "./pages/dashboard/DashboardScheduledLives.tsx";
import LiveStudio from "./pages/dashboard/LiveStudio.tsx";
import OverlayLive from "./pages/OverlayLive.tsx";
import OverlayPro from "./pages/OverlayPro.tsx";
import CompanyLiveManager from "./pages/dashboard/CompanyLiveManager.tsx";
import LoadingScreen from "./components/LoadingScreen.tsx";
import NotificationBell from "./components/live/NotificationBell.tsx";
import LivesAgora from "./pages/LivesAgora.tsx";
import LiveParticipar from "./pages/LiveParticipar.tsx";
import TournamentsList from "./pages/tournaments/TournamentsList.tsx";
import TournamentDetail from "./pages/tournaments/TournamentDetail.tsx";
import DashboardTournaments from "./pages/dashboard/DashboardTournaments.tsx";
import DashboardLeagues from "./pages/dashboard/DashboardLeagues.tsx";
import DashboardBlog from "./pages/dashboard/DashboardBlog.tsx";
import LeaguesListPage from "./pages/leagues/LeaguesListPage.tsx";
import LeagueDetailPage from "./pages/leagues/LeagueDetailPage.tsx";
import EsportsHub from "./pages/esports/EsportsHub.tsx";
import ChampionshipDetailPage from "./pages/esports/ChampionshipDetailPage.tsx";
import TeamManagementPage from "./pages/esports/TeamManagementPage.tsx";
import DashboardEsports from "./pages/dashboard/DashboardEsports.tsx";
import DashboardEsportsAdvanced from "./pages/dashboard/DashboardEsportsAdvanced.tsx";
import SeasonsPage from "./pages/esports/SeasonsPage.tsx";
import BettingPage from "./pages/esports/BettingPage.tsx";
import LeaderboardPage from "./pages/esports/LeaderboardPage.tsx";
import TransfersPage from "./pages/esports/TransfersPage.tsx";
import AchievementsPage from "./pages/esports/AchievementsPage.tsx";

import MascotBuddy from "./components/MascotBuddy.tsx";
import SupportChatbot from "./components/SupportChatbot.tsx";
import MobileTopBar from "./components/MobileTopBar.tsx";
import BottomTabBar from "./components/BottomTabBar.tsx";
import MobileMenuDrawer from "./components/mobile/MobileMenuDrawer.tsx";
import { MobileNavProvider } from "./contexts/MobileNavigationContext.tsx";
import RecentPagesTracker from "./components/mobile/RecentPagesTracker.tsx";
import PushNotificationBanner from "./components/notifications/PushNotificationBanner.tsx";
import Wallet from "./pages/Wallet.tsx";
import RegionalManagerPanel from "./pages/RegionalManagerPanel.tsx";

// New live entertainment pages
import KahootMultiplayerQuiz from "./components/livegames/KahootMultiplayerQuiz.tsx";
import LiveBingo from "./components/livegames/LiveBingo.tsx";
import ChallengeRoulette from "./components/livegames/ChallengeRoulette.tsx";
import { useParams } from "react-router-dom";
import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

function PrizeWheelWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  return <PrizeWheel prizes={DEFAULT_WHEEL_PRIZES} gameId={gameId} />;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          <Route path="/register" element={<Register />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/raffle/:slug" element={<RaffleDetail />} />
          <Route path="/raffle/:slug/live" element={<LiveDraw />} />
          <Route path="/install" element={<Install />} />
          <Route path="/referral" element={<Referral />} />
          <Route path="/community" element={<Community />} />
          <Route path="/termos" element={<Terms />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/privacy" element={<Navigate to="/privacidade" replace />} />
          <Route path="/como-funciona" element={<HowItWorks />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/historico" element={<RaffleHistory />} />
          <Route path="/concursos" element={<Contests />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPostDetail />} />
          <Route path="/jogos" element={<AllGames />} />
          <Route path="/pontos" element={<EngagementLeaderboard />} />
          <Route path="/games/millionaire/:gameId" element={<EnhancedMillionaireGame />} />
          <Route path="/games/spin-wheel/:gameId" element={<PrizeWheelWrapper />} />
          <Route path="/instant-win" element={<InstantWin />} />
          <Route path="/concursos/:id" element={<ContestDetail />} />
          <Route path="/empresas" element={<BusinessDirectory />} />
          <Route path="/empresa/:id" element={<BusinessProfile />} />
          <Route path="/empresa/:id/publico" element={<CompanyPublicProfile />} />
          <Route path="/lives" element={<LiveHub />} />
          <Route path="/lives/overlay" element={<LiveOverlay />} />
          <Route path="/lives/overlay-pro" element={<OverlayPro />} />
          <Route path="/lives/:liveCode/ranking" element={<LiveAmbassadorsRanking />} />
          <Route path="/transparencia" element={<Transparency />} />
          <Route path="/prestacoes" element={<Prestacoes />} />
          <Route path="/prestacoes/catalogo" element={<PrestacoesCatalogo />} />
          <Route path="/prestacoes/:id" element={<PrestacoesProduto />} />
          <Route path="/e/:businessId/:refCode" element={<AmbassadorRedirect />} />
          <Route path="/live-evento/:slug" element={<ScheduledLivePage />} />
          <Route path="/lives-agora" element={<LivesAgora />} />
          <Route path="/participar" element={<LiveParticipar />} />
          <Route path="/tournaments" element={<TournamentsList />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/ligas" element={<LeaguesListPage />} />
          <Route path="/ligas/:slug" element={<LeagueDetailPage />} />
          <Route path="/esports" element={<EsportsHub />} />
          <Route path="/esports/:slug" element={<ChampionshipDetailPage />} />
          <Route path="/esports/equipas" element={<ProtectedRoute><TeamManagementPage /></ProtectedRoute>} />
          <Route path="/esports/seasons" element={<SeasonsPage />} />
          <Route path="/esports/betting" element={<ProtectedRoute><BettingPage /></ProtectedRoute>} />
          <Route path="/esports/leaderboard" element={<LeaderboardPage />} />
          <Route path="/esports/transfers" element={<ProtectedRoute><TransfersPage /></ProtectedRoute>} />
          <Route path="/esports/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute blockRoles={["business", "admin"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute>
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-points"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regional-panel"
            element={
              <ProtectedRoute>
                <RegionalManagerPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="business">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="raffles" element={<DashboardRaffles />} />
            <Route path="raffles/create" element={<CreateRaffle />} />
            <Route path="raffles/:id/edit" element={<EditRaffle />} />
            <Route path="raffles/:id/social" element={<SocialRaffleManager />} />
            <Route path="analytics" element={<DashboardAnalytics />} />
            <Route path="social-analytics" element={<SocialAnalytics />} />
            <Route path="participants" element={<DashboardParticipants />} />
            <Route path="prizes" element={<DashboardPrizes />} />
            <Route path="notifications" element={<DashboardNotifications />} />
            <Route path="white-label" element={<WhiteLabelConfig />} />
            <Route path="game-branding" element={<GameBrandingConfig />} />
            <Route path="contests" element={<DashboardContests />} />
            <Route path="prestacoes" element={<DashboardPrestacoes />} />
            <Route path="live-games" element={<DashboardLiveGames />} />
            <Route path="spin-wheel-manager" element={<AdminSpinWheelManager />} />
            <Route path="millionaire-manager" element={<AdminMillionaireManager />} />
            <Route path="live-history" element={<DashboardLiveHistory />} />
            <Route path="live-stats" element={<DashboardLiveStats />} />
            <Route path="ambassadors" element={<DashboardAmbassadors />} />
            <Route path="scheduled-lives" element={<DashboardScheduledLives />} />
            <Route path="live-studio/:id" element={<LiveStudio />} />
            <Route path="live-manager" element={<CompanyLiveManager />} />
            <Route path="tournaments" element={<DashboardTournaments />} />
            <Route path="leagues" element={<DashboardLeagues />} />
            <Route path="esports" element={<DashboardEsports />} />
            <Route path="esports-advanced" element={<DashboardEsportsAdvanced />} />
            <Route path="blog" element={<DashboardBlog />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
          <Route path="/overlay/live/:id" element={<OverlayLive />} />
          <Route path="/overlay/pro" element={<OverlayPro />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="raffles" element={<AdminRaffles />} />
            <Route path="revenue" element={<AdminRevenue />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="audit" element={<AdminAuditLogs />} />
            <Route path="cron" element={<AdminCronJobs />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="games" element={<AdminGameManager />} />
            <Route path="contests" element={<AdminContests />} />
            <Route path="co-founders" element={<AdminCoFounders />} />
            <Route path="regional-revenue" element={<AdminRegionalRevenue />} />
            <Route path="regional-branding" element={<AdminRegionalBranding />} />
            <Route path="regional-dashboard" element={<AdminRegionalDashboard />} />
            <Route path="super-dashboard" element={<AdminSuperDashboard />} />
            <Route path="millionaire-manager" element={<AdminMillionaireManager />} />
            <Route path="spin-wheel-manager" element={<AdminSpinWheelManager />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="regional-config" element={<RegionalCEODashboard />} />
            <Route path="regional-managers" element={<AdminRegionalManagers />} />
            <Route path="vouchers" element={<AdminVouchers />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
}

const AppContent = () => {
  const [showLoading, setShowLoading] = useState(true);
  const { loading: configLoading } = useRegionalContext();
  const { user, loading: authLoading } = useAuth();
  const [isOverlay, setIsOverlay] = useState(false);
  useEffect(() => {
    const check = () => {
      const p = window.location.pathname;
      setIsOverlay(p.startsWith("/lives/overlay") || p.startsWith("/overlay/"));
    };
    check();
    const id = setInterval(check, 300);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 4000);

    if (!configLoading) {
      const quickTimer = setTimeout(() => {
        setShowLoading(false);
      }, 1800);
      return () => { clearTimeout(timer); clearTimeout(quickTimer); };
    }


    return () => clearTimeout(timer);
  }, [configLoading]);

  if (showLoading && !isOverlay) {
    return <LoadingScreen />;
  }

  return (
    <TooltipProvider>
      {!isOverlay && <><Toaster /><Sonner /><BackgroundDecorations /></>}
      <BrowserRouter>
        {!isOverlay && <>
          {!authLoading && user && <PushNotificationBanner />}
          <MobileNavProvider>
            <MobileTopBar />
            <MobileMenuDrawer />
            <BottomTabBar />
            <RecentPagesTracker />
          </MobileNavProvider>
        </>}
        <AnimatedRoutes />
        {!isOverlay && <><MascotBuddy />
        <SupportChatbot />
        <NotificationBell />
        <RegionalPreviewBar /></>}
      </BrowserRouter>
    </TooltipProvider>
  );
};

class AppErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean; error: Error | null}> {
  constructor(props: {children: ReactNode}) { super(props); this.state = {hasError: false, error: null}; }
  static getDerivedStateFromError(error: Error) { return {hasError: true, error}; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('AppErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
      <div className="min-h-screen flex items-center justify-center p-6 overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="text-center space-y-5 max-w-md relative z-10"
        >
          <motion.div
            className="text-7xl"
            animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            ⚠️
          </motion.div>
          <h2 className="text-2xl font-display font-bold">Algo correu mal</h2>
          <p className="text-muted-foreground text-sm">Ocorreu um erro inesperado. Tente recarregar a página.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline" className="gap-2 rounded-full px-6">
              Tentar novamente
            </Button>
            <Button onClick={() => window.location.reload()} className="gap-2 rounded-full px-6">
              Recarregar Página
          </Button>
          </div>
        </motion.div>
      </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <RegionalConfigProvider>
        <ThemeProvider>
          <DynamicThemeProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <RegionalThemeProvider>
                  <CountryLanguageSync />
                  <PayPalProvider>
                    <AuthProvider>
                      <AppErrorBoundary>
                        <AppContent />
                      </AppErrorBoundary>
                    </AuthProvider>
                  </PayPalProvider>
                </RegionalThemeProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </DynamicThemeProvider>
        </ThemeProvider>
      </RegionalConfigProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
