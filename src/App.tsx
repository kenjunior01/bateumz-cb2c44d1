import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BackgroundDecorations from "@/components/BackgroundDecorations";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { RegionalThemeProvider } from "@/contexts/RegionalThemeContext";
import AdminRegionalBranding from "./pages/admin/AdminRegionalBranding.tsx";
import RegionalPreviewBar from "@/components/admin/RegionalPreviewBar";
import PayPalProvider from "@/components/payments/PayPalProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
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
import AdminAuditLogs from "./pages/admin/AdminAuditLogs.tsx";
import AdminCronJobs from "./pages/admin/AdminCronJobs.tsx";
import AdminCoFounders from "./pages/admin/AdminCoFounders.tsx";
import AdminRegionalRevenue from "./pages/admin/AdminRegionalRevenue.tsx";
import Install from "./pages/Install.tsx";
import Referral from "./pages/Referral.tsx";
import Community from "./pages/Community.tsx";
import WhiteLabelConfig from "./pages/dashboard/WhiteLabelConfig.tsx";
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
import Contests from "./pages/Contests.tsx";
import ContestDetail from "./pages/ContestDetail.tsx";
import AdminContests from "./pages/admin/AdminContests.tsx";
import DashboardContests from "./pages/dashboard/DashboardContests.tsx";
import BusinessProfile from "./pages/BusinessProfile.tsx";
import BusinessDirectory from "./pages/BusinessDirectory.tsx";
import InstantWin from "./pages/InstantWin.tsx";
import LiveHub from "./pages/LiveHub.tsx";
import LiveOverlay from "./pages/LiveOverlay.tsx";
import Transparency from "./pages/Transparency.tsx";
import Prestacoes from "./pages/Prestacoes.tsx";
import PrestacoesCatalogo from "./pages/PrestacoesCatalogo.tsx";
import PrestacoesProduto from "./pages/PrestacoesProduto.tsx";
import DashboardPrestacoes from "./pages/dashboard/DashboardPrestacoes.tsx";
import DashboardLiveGames from "./pages/dashboard/DashboardLiveGames.tsx";
import DashboardLiveHistory from "./pages/dashboard/DashboardLiveHistory.tsx";
import DashboardAmbassadors from "./pages/dashboard/DashboardAmbassadors.tsx";
import AmbassadorRedirect from "./pages/AmbassadorRedirect.tsx";
import LiveAmbassadorsRanking from "./pages/LiveAmbassadorsRanking.tsx";
import ScheduledLivePage from "./pages/ScheduledLivePage.tsx";
import DashboardScheduledLives from "./pages/dashboard/DashboardScheduledLives.tsx";
import LiveStudio from "./pages/dashboard/LiveStudio.tsx";
import OverlayLive from "./pages/OverlayLive.tsx";

import MascotBuddy from "./components/MascotBuddy.tsx";
import SupportChatbot from "./components/SupportChatbot.tsx";
import MobileTopBar from "./components/MobileTopBar.tsx";
import BottomTabBar from "./components/BottomTabBar.tsx";
const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
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
          <Route path="/como-funciona" element={<HowItWorks />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/historico" element={<RaffleHistory />} />
          <Route path="/concursos" element={<Contests />} />
          <Route path="/concursos/:id" element={<ContestDetail />} />
          <Route path="/empresas" element={<BusinessDirectory />} />
          <Route path="/empresa/:id" element={<BusinessProfile />} />
          <Route path="/instant-win" element={<InstantWin />} />
          <Route path="/lives" element={<LiveHub />} />
          <Route path="/lives/overlay" element={<LiveOverlay />} />
          <Route path="/lives/:liveCode/ranking" element={<LiveAmbassadorsRanking />} />
          <Route path="/transparencia" element={<Transparency />} />
          <Route path="/prestacoes" element={<Prestacoes />} />
          <Route path="/prestacoes/catalogo" element={<PrestacoesCatalogo />} />
          <Route path="/prestacoes/:id" element={<PrestacoesProduto />} />
          <Route path="/e/:businessId/:refCode" element={<AmbassadorRedirect />} />
          <Route path="/live-evento/:slug" element={<ScheduledLivePage />} />
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
            <Route path="contests" element={<DashboardContests />} />
            <Route path="prestacoes" element={<DashboardPrestacoes />} />
            <Route path="live-games" element={<DashboardLiveGames />} />
            <Route path="live-history" element={<DashboardLiveHistory />} />
            <Route path="ambassadors" element={<DashboardAmbassadors />} />
            <Route path="scheduled-lives" element={<DashboardScheduledLives />} />
            <Route path="live-studio/:id" element={<LiveStudio />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
          <Route path="/overlay/live/:id" element={<OverlayLive />} />
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
            <Route path="contests" element={<AdminContests />} />
            <Route path="co-founders" element={<AdminCoFounders />} />
            <Route path="regional-revenue" element={<AdminRegionalRevenue />} />
            <Route path="regional-branding" element={<AdminRegionalBranding />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <LanguageProvider>
    <CurrencyProvider>
    <RegionalThemeProvider>
    <PayPalProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BackgroundDecorations />
        <BrowserRouter>
          <MobileTopBar />
          <AnimatedRoutes />
          <MascotBuddy />
          <SupportChatbot />
          <BottomTabBar />
          <RegionalPreviewBar />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </PayPalProvider>
    </RegionalThemeProvider>
    </CurrencyProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
