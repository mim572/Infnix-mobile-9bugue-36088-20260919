import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserAuthProvider, useUserAuth } from "@/contexts/UserAuthContext";
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Admin
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// User Pages
import LoginPage from "./pages/user/LoginPage";
import RegisterPage from "./pages/user/RegisterPage";
import HomePage from "./pages/user/HomePage";
import PackagesPage from "./pages/user/PackagesPage";
import BuyPackagePage from "./pages/user/BuyPackagePage";
import MyProductsPage from "./pages/user/MyProductsPage";
import WithdrawPage from "./pages/user/WithdrawPage";
import TeamPage from "./pages/user/TeamPage";
import MinePage from "./pages/user/MinePage";
import AboutUsPage from "./pages/user/AboutUsPage";
import RecordsPage from "./pages/user/RecordsPage";
import RedeemPage from "./pages/user/RedeemPage";
import RechargePage from "./pages/user/RechargePage";
import MissionCenterPage from "./pages/user/MissionCenterPage";

const queryClient = new QueryClient();

function DailyIncomePoller() {
  useEffect(() => {
    const run = () => {
      supabase.functions.invoke('process-daily-income', {}).then(({ data, error }) => {
        if (error) {
          console.error('[DailyIncome] Error:', error.message);
        }
      });
    };
    run();
    const interval = setInterval(run, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUserAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUserAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/Infnix-mobile-9bugue-36088-20260919">
        <UserAuthProvider>
          <DailyIncomePoller />
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/admin" element={<Index />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/packages" element={<ProtectedRoute><PackagesPage /></ProtectedRoute>} />
            <Route path="/buy" element={<ProtectedRoute><BuyPackagePage /></ProtectedRoute>} />
            <Route path="/my-products" element={<ProtectedRoute><MyProductsPage /></ProtectedRoute>} />
            <Route path="/withdraw" element={<ProtectedRoute><WithdrawPage /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
            <Route path="/mine" element={<ProtectedRoute><MinePage /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><AboutUsPage /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute><RecordsPage /></ProtectedRoute>} />
            <Route path="/redeem" element={<ProtectedRoute><RedeemPage /></ProtectedRoute>} />
            <Route path="/recharge" element={<ProtectedRoute><RechargePage /></ProtectedRoute>} />
            <Route path="/missions" element={<ProtectedRoute><MissionCenterPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </UserAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
