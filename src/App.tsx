import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { UserAuthProvider } from '@/contexts/UserAuthContext';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/user/LoginPage';
import RegisterPage from '@/pages/user/RegisterPage';
import HomePage from '@/pages/user/HomePage';
import PackagesPage from '@/pages/user/PackagesPage';
import BuyPackagePage from '@/pages/user/BuyPackagePage';
import MyProductsPage from '@/pages/user/MyProductsPage';
import WithdrawPage from '@/pages/user/WithdrawPage';
import TeamPage from '@/pages/user/TeamPage';
import MinePage from '@/pages/user/MinePage';
import AboutUsPage from '@/pages/user/AboutUsPage';
import RecordsPage from '@/pages/user/RecordsPage';
import RedeemPage from '@/pages/user/RedeemPage';
import RechargePage from '@/pages/user/RechargePage';
import MissionCenterPage from '@/pages/user/MissionCenterPage';
import AdminPanel from '@/pages/AdminPanel';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <UserAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/packages/:id" element={<BuyPackagePage />} />
          <Route path="/my-products" element={<MyProductsPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/mine" element={<MinePage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/redeem" element={<RedeemPage />} />
          <Route path="/recharge" element={<RechargePage />} />
          <Route path="/missions" element={<MissionCenterPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </UserAuthProvider>
  );
}
