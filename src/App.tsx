import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import RaffleDetail from "./pages/RaffleDetail.tsx";
import UserDashboard from "./pages/UserDashboard.tsx";
import DashboardLayout from "./layouts/DashboardLayout.tsx";
import DashboardOverview from "./pages/dashboard/DashboardOverview.tsx";
import DashboardRaffles from "./pages/dashboard/DashboardRaffles.tsx";
import DashboardAnalytics from "./pages/dashboard/DashboardAnalytics.tsx";
import DashboardParticipants from "./pages/dashboard/DashboardParticipants.tsx";
import CreateRaffle from "./pages/dashboard/CreateRaffle.tsx";
import LiveDraw from "./pages/LiveDraw.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/raffle/:id" element={<RaffleDetail />} />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
