import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
import WhatsAppButton from "./components/WhatsAppButton.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
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
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
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
              <Route path="analytics" element={<DashboardAnalytics />} />
              <Route path="participants" element={<DashboardParticipants />} />
              <Route path="prizes" element={<DashboardPrizes />} />
              <Route path="notifications" element={<DashboardNotifications />} />
              <Route path="white-label" element={<WhiteLabelConfig />} />
              <Route path="settings" element={<DashboardSettings />} />
            </Route>
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
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WhatsAppButton />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
