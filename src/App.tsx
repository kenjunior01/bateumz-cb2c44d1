import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import BackgroundDecorations from "@/components/BackgroundDecorations";
import CountryLanguageSync from "@/components/CountryLanguageSync";
import { BrowserRouter, Route, Routes, useLocation, Navigate, useParams, useNavigate } from "react-router-dom";
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
import { useSwipeBack } from "@/hooks/useSwipeBack";
import EnhancedMillionaireGame from "./components/livegames/EnhancedMillionaireGame.tsx";
import PrizeWheel from "./components/livegames/PrizeWheel.tsx";
import { DEFAULT_WHEEL_PRIZES } from "./components/livegames/PrizeWheel.tsx";
import RegionalPreviewBar from "@/components/admin/RegionalPreviewBar";
import WorldSwitcher from "@/components/WorldSwitcher";
import RegionalCEODashboard from "@/components/RegionalCEODashboard";
import PayPalProvider from "@/components/payments/PayPalProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import LoadingScreen from "./components/LoadingScreen.tsx";
import NotificationBell from "./components/live/NotificationBell.tsx";

import MascotBuddy from "./components/MascotBuddy.tsx";
import SupportChatbot from "./components/SupportChatbot.tsx";
import MobileTopBar from "./components/MobileTopBar.tsx";
import BottomTabBar from "./components/BottomTabBar.tsx";
import MobileMenuDrawer from "./components/mobile/MobileMenuDrawer.tsx";
import { MobileNavProvider } from "./contexts/MobileNavigationContext.tsx";
import RecentPagesTracker from "./components/mobile/RecentPagesTracker.tsx";
import PushNotificationBanner from "./components/notifications/PushNotificationBanner.tsx";
import LivePulseBar from "./components/LivePulseBar.tsx";

// New live entertainment pages
import KahootMultiplayerQuiz from "./components/livegames/KahootMultiplayerQuiz.tsx";
import LiveBingo from "./components/livegames/LiveBingo.tsx";
import ChallengeRoulette from "./components/livegames/ChallengeRoulette.tsx";
import { useState, useEffect, useRef, Component, lazy, Suspense, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

// Layout components (used as route wrappers, NOT lazy-loaded)
import EsportsLayout from "./pages/esports/EsportsLayout.tsx";
import SorteiosLayout from "./pages/sorteios/SorteiosLayout.tsx";
import JogosLayout from "./pages/jogos/JogosLayout.tsx";

// ============================================================
// Lazy-loaded page components (~110 pages)
// ============================================================
const AdminRegionalBranding = lazy(() => import("./pages/admin/AdminRegionalBranding.tsx"));
const AdminRegionalDashboard = lazy(() => import("./pages/admin/AdminRegionalDashboard.tsx"));
const AdminSuperDashboard = lazy(() => import("./pages/admin/AdminSuperDashboard.tsx"));
const EngagementLeaderboard = lazy(() => import("./pages/EngagementLeaderboard.tsx"));
const AdminMillionaireManager = lazy(() => import("./pages/admin/AdminMillionaireManager.tsx"));
const AdminSpinWheelManager = lazy(() => import("./pages/admin/AdminSpinWheelManager.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Marketplace = lazy(() => import("./pages/Marketplace.tsx"));
const RaffleDetail = lazy(() => import("./pages/RaffleDetail.tsx"));
const UserDashboard = lazy(() => import("./pages/UserDashboard.tsx"));
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview.tsx"));
const DashboardRaffles = lazy(() => import("./pages/dashboard/DashboardRaffles.tsx"));
const DashboardAnalytics = lazy(() => import("./pages/dashboard/DashboardAnalytics.tsx"));
const SocialAnalytics = lazy(() => import("./pages/dashboard/SocialAnalytics.tsx"));
const DashboardParticipants = lazy(() => import("./pages/dashboard/DashboardParticipants.tsx"));
const DashboardSettings = lazy(() => import("./pages/dashboard/DashboardSettings.tsx"));
const CreateRaffle = lazy(() => import("./pages/dashboard/CreateRaffle.tsx"));
const LiveDraw = lazy(() => import("./pages/LiveDraw.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminRaffles = lazy(() => import("./pages/admin/AdminRaffles.tsx"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue.tsx"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminGameManager = lazy(() => import("./pages/admin/AdminGameManager.tsx"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs.tsx"));
const Contests = lazy(() => import("./pages/Contests.tsx"));
const ContestDetail = lazy(() => import("./pages/ContestDetail.tsx"));
const AdminCronJobs = lazy(() => import("./pages/admin/AdminCronJobs.tsx"));
const AdminCoFounders = lazy(() => import("./pages/admin/AdminCoFounders.tsx"));
const AdminRegionalRevenue = lazy(() => import("./pages/admin/AdminRegionalRevenue.tsx"));
const AdminRegionalManagers = lazy(() => import("./pages/admin/AdminRegionalManagers.tsx"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans.tsx"));
const AdminVouchers = lazy(() => import("./pages/admin/AdminVouchers.tsx"));
const Install = lazy(() => import("./pages/Install.tsx"));
const Referral = lazy(() => import("./pages/Referral.tsx"));
const Community = lazy(() => import("./pages/Community.tsx"));
const WhiteLabelConfig = lazy(() => import("./pages/dashboard/WhiteLabelConfig.tsx"));
const GameBrandingConfig = lazy(() => import("./pages/dashboard/GameBrandingConfig.tsx"));
const DashboardPrizes = lazy(() => import("./pages/dashboard/DashboardPrizes.tsx"));
const DashboardNotifications = lazy(() => import("./pages/dashboard/DashboardNotifications.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const HowItWorks = lazy(() => import("./pages/HowItWorks.tsx"));
const FAQ = lazy(() => import("./pages/FAQ.tsx"));
const RaffleHistory = lazy(() => import("./pages/RaffleHistory.tsx"));
const MyTickets = lazy(() => import("./pages/MyTickets.tsx"));
const EditRaffle = lazy(() => import("./pages/dashboard/EditRaffle.tsx"));
const SocialRaffleManager = lazy(() => import("./pages/dashboard/SocialRaffleManager.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const BlogPostDetail = lazy(() => import("./pages/BlogPostDetail.tsx"));
const AllGames = lazy(() => import("./pages/AllGames.tsx"));
const AdminContests = lazy(() => import("./pages/admin/AdminContests.tsx"));
const DashboardContests = lazy(() => import("./pages/dashboard/DashboardContests.tsx"));
const BusinessProfile = lazy(() => import("./pages/BusinessProfile.tsx"));
const BusinessDirectory = lazy(() => import("./pages/BusinessDirectory.tsx"));
const LiveHub = lazy(() => import("./pages/LiveHub.tsx"));
const LiveOverlay = lazy(() => import("./pages/LiveOverlay.tsx"));
const InstantWin = lazy(() => import("./pages/InstantWin.tsx"));
const Transparency = lazy(() => import("./pages/Transparency.tsx"));
const Prestacoes = lazy(() => import("./pages/Prestacoes.tsx"));
const PrestacoesCatalogo = lazy(() => import("./pages/PrestacoesCatalogo.tsx"));
const PrestacoesProduto = lazy(() => import("./pages/PrestacoesProduto.tsx"));
const DashboardPrestacoes = lazy(() => import("./pages/dashboard/DashboardPrestacoes.tsx"));
const DashboardLiveGames = lazy(() => import("./pages/dashboard/DashboardLiveGames.tsx"));
const DashboardLiveHistory = lazy(() => import("./pages/dashboard/DashboardLiveHistory.tsx"));
const DashboardLiveStats = lazy(() => import("./pages/dashboard/DashboardLiveStats.tsx"));
const CompanyPublicProfile = lazy(() => import("./pages/CompanyPublicProfile.tsx"));
const DashboardAmbassadors = lazy(() => import("./pages/dashboard/DashboardAmbassadors.tsx"));
const AmbassadorRedirect = lazy(() => import("./pages/AmbassadorRedirect.tsx"));
const LiveAmbassadorsRanking = lazy(() => import("./pages/LiveAmbassadorsRanking.tsx"));
const ScheduledLivePage = lazy(() => import("./pages/ScheduledLivePage.tsx"));
const DashboardScheduledLives = lazy(() => import("./pages/dashboard/DashboardScheduledLives.tsx"));
const LiveStudio = lazy(() => import("./pages/dashboard/LiveStudio.tsx"));
const OverlayLive = lazy(() => import("./pages/OverlayLive.tsx"));
const OverlayPro = lazy(() => import("./pages/OverlayPro.tsx"));
const CompanyLiveManager = lazy(() => import("./pages/dashboard/CompanyLiveManager.tsx"));
const LivesAgora = lazy(() => import("./pages/LivesAgora.tsx"));
const Battles = lazy(() => import("./pages/Battles.tsx"));
const LiveParticipar = lazy(() => import("./pages/LiveParticipar.tsx"));
const TournamentsList = lazy(() => import("./pages/tournaments/TournamentsList.tsx"));
const TournamentDetail = lazy(() => import("./pages/tournaments/TournamentDetail.tsx"));
const DashboardTournaments = lazy(() => import("./pages/dashboard/DashboardTournaments.tsx"));
const DashboardLeagues = lazy(() => import("./pages/dashboard/DashboardLeagues.tsx"));
const DashboardBlog = lazy(() => import("./pages/dashboard/DashboardBlog.tsx"));
const LeaguesListPage = lazy(() => import("./pages/leagues/LeaguesListPage.tsx"));
const LeagueDetailPage = lazy(() => import("./pages/leagues/LeagueDetailPage.tsx"));
const EsportsHub = lazy(() => import("./pages/esports/EsportsHub.tsx"));
const ChampionshipDetailPage = lazy(() => import("./pages/esports/ChampionshipDetailPage.tsx"));
const TeamManagementPage = lazy(() => import("./pages/esports/TeamManagementPage.tsx"));
const DashboardEsports = lazy(() => import("./pages/dashboard/DashboardEsports.tsx"));
const DashboardEsportsAdvanced = lazy(() => import("./pages/dashboard/DashboardEsportsAdvanced.tsx"));
const SeasonsPage = lazy(() => import("./pages/esports/SeasonsPage.tsx"));
const BettingPage = lazy(() => import("./pages/esports/BettingPage.tsx"));
const DuelosPage = lazy(() => import("./pages/esports/DuelosPage.tsx"));
const LeaderboardPage = lazy(() => import("./pages/esports/LeaderboardPage.tsx"));
const TransfersPage = lazy(() => import("./pages/esports/TransfersPage.tsx"));
const AchievementsPage = lazy(() => import("./pages/esports/AchievementsPage.tsx"));
const TeamProfilePage = lazy(() => import("./pages/esports/TeamProfilePage.tsx"));
const MillionairePage = lazy(() => import("./pages/games/MillionairePage.tsx"));
const CompanyGamesHub = lazy(() => import("./pages/dashboard/CompanyGamesHub.tsx"));
const Wallet = lazy(() => import("./pages/Wallet.tsx"));
const RegionalManagerPanel = lazy(() => import("./pages/RegionalManagerPanel.tsx"));

const queryClient = new QueryClient();

const MinimalPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function PrizeWheelWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  return <PrizeWheel prizes={DEFAULT_WHEEL_PRIZES} gameId={gameId} />;
}

function AnimatedRoutes() {
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  useSwipeBack(pageRef);
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Suspense fallback={<MinimalPageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/register" element={<Register />} />

            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/marketplace" element={<SorteiosLayout />}>            <Route index element={<Marketplace />} />          </Route>
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
            <Route path="/concursos" element={<SorteiosLayout />}>            <Route index element={<Contests />} />          </Route>
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostDetail />} />
            <Route path="/jogos" element={<JogosLayout />}>            <Route index element={<AllGames />} />          </Route>
            <Route path="/pontos" element={<EngagementLeaderboard />} />
            <Route path="/games/millionaire/:gameId" element={<MillionairePage />} />
            <Route path="/games/spin-wheel/:gameId" element={<PrizeWheelWrapper />} />
            <Route path="/instant-win" element={<SorteiosLayout />}>            <Route index element={<InstantWin />} />          </Route>
            <Route path="/concursos/:id" element={<ContestDetail />} />
            <Route path="/empresas" element={<BusinessDirectory />} />
            <Route path="/empresa/:id" element={<BusinessProfile />} />
            <Route path="/empresa/:id/publico" element={<CompanyPublicProfile />} />
            <Route path="/mmorpg" element={<Navigate to="/lives?game=mmorpg" replace />} />
            <Route path="/jogos/mmorpg" element={<Navigate to="/lives?game=mmorpg" replace />} />
            <Route path="/lives" element={<JogosLayout />}>            <Route index element={<LiveHub />} />          </Route>
            <Route path="/batalhas" element={<Battles />} />
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
            <Route path="/esports" element={<EsportsLayout />}>            <Route index element={<EsportsHub />} />            <Route path="seasons" element={<SeasonsPage />} />            <Route path="betting" element={<ProtectedRoute><BettingPage /></ProtectedRoute>} />            <Route path="duelos" element={<ProtectedRoute><DuelosPage /></ProtectedRoute>} />            <Route path="leaderboard" element={<LeaderboardPage />} />            <Route path="transfers" element={<ProtectedRoute><TransfersPage /></ProtectedRoute>} />            <Route path="achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />            <Route path="equipas" element={<ProtectedRoute><TeamManagementPage /></ProtectedRoute>} />            <Route path="team/:id" element={<TeamProfilePage />} />            <Route path=":slug" element={<ChampionshipDetailPage />} />          </Route>
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
                <ProtectedRoute requiredRole="regional_manager">
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
              <Route path="games-hub" element={<CompanyGamesHub />} />
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
        </Suspense>
      </PageTransition>
    </AnimatePresence>
  );
}

const AppContent = () => {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <AppShell />
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
          <h2 className="text-2xl font-display font-bold">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">An unexpected error occurred. Try reloading the page.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline" className="gap-2 rounded-full px-6">
              Try again
            </Button>
            <Button onClick={() => window.location.reload()} className="gap-2 rounded-full px-6">
              Reload page
          </Button>
          </div>
        </motion.div>
      </div>
      );
    }
    return this.props.children;
  }
}

// Inside BrowserRouter — safe to use useLocation, useAuth, etc.
function AppShell() {
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  const { loading: configLoading } = useRegionalContext();
  const { user, loading: authLoading } = useAuth();
  const isOverlay = location.pathname.startsWith("/lives/overlay") || location.pathname.startsWith("/overlay/");

  useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 4000);
    if (!configLoading) {
      const quickTimer = setTimeout(() => setShowLoading(false), 1800);
      return () => { clearTimeout(timer); clearTimeout(quickTimer); };
    }
    return () => clearTimeout(timer);
  }, [configLoading]);

  if (showLoading && !isOverlay) return <LoadingScreen />;

  return (
    <>
      {!isOverlay && <><Toaster /><Sonner /><BackgroundDecorations /></>}
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
      <RegionalPreviewBar />
      <WorldSwitcher />
      <LivePulseBar /></>}
    </>
  );
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