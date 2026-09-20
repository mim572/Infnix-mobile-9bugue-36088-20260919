import { HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { UserAuthProvider } from '@/contexts/UserAuthContext';
import LandingPage from '@/pages/LandingPage';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import LoginPage from '@/pages/user/LoginPage';
import RegisterPage from '@/pages/user/RegisterPage';
import HomePage from '@/pages/user/HomePage';
import PackagesPage from '@/pages/user/PackagesPage';
import BuyPackagePage from '@/pages/user/BuyPackagePage';
import RechargePage from '@/pages/user/RechargePage';
import WithdrawPage from '@/pages/user/WithdrawPage';
import TeamPage from '@/pages/user/TeamPage';
import MinePage from '@/pages/user/MinePage';
import MyProductsPage from '@/pages/user/MyProductsPage';
import RecordsPage from '@/pages/user/RecordsPage';
import AboutUsPage from '@/pages/user/AboutUsPage';
import RedeemPage from '@/pages/user/RedeemPage';
import MissionCenterPage from '@/pages/user/MissionCenterPage';

export default function App() {
  return (
    <HashRouter>
      <UserAuthProvider>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/admin" element={<Index />} />

          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/home" element={<HomePage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/buy" element={<BuyPackagePage />} />
          <Route path="/buy/:productId" element={<BuyPackagePage />} />
          <Route path="/recharge" element={<RechargePage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/mine" element={<MinePage />} />
          <Route path="/my-products" element={<MyProductsPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/redeem" element={<RedeemPage />} />
          <Route path="/missions" element={<MissionCenterPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </UserAuthProvider>
    </HashRouter>
  );
}
