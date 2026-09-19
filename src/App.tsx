import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import LoginPage from '@/pages/user/LoginPage';
import RegisterPage from '@/pages/user/RegisterPage';
import HomePage from '@/pages/user/HomePage';
import MinePage from '@/pages/user/MinePage';
import PackagesPage from '@/pages/user/PackagesPage';
import BuyPackagePage from '@/pages/user/BuyPackagePage';
import MyProductsPage from '@/pages/user/MyProductsPage';
import TeamPage from '@/pages/user/TeamPage';
import WithdrawPage from '@/pages/user/WithdrawPage';
import RechargePage from '@/pages/user/RechargePage';
import RecordsPage from '@/pages/user/RecordsPage';
import RedeemPage from '@/pages/user/RedeemPage';
import MissionCenterPage from '@/pages/user/MissionCenterPage';
import AboutUsPage from '@/pages/user/AboutUsPage';
import { UserAuthProvider } from '@/contexts/UserAuthContext';

const App = () => {
  return (
    <UserAuthProvider>
      <BrowserRouter basename="/Infnix-mobile-9bugue-36088-20260919/">
        <Routes>
          {/* Admin */}
          <Route path="/admin" element={<Index />} />

          {/* User Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* User Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/mine" element={<MinePage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/buy/:packageId" element={<BuyPackagePage />} />
          <Route path="/my-products" element={<MyProductsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/recharge" element={<RechargePage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/redeem" element={<RedeemPage />} />
          <Route path="/missions" element={<MissionCenterPage />} />
          <Route path="/about" element={<AboutUsPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </UserAuthProvider>
  );
};

export default App;
