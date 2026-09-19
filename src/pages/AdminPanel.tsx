import { useState, useEffect, useCallback } from 'react';
import { LogOut, Shield, CreditCard, ArrowDownCircle, Gift, Package, Users, Banknote, Play, Trophy, Megaphone } from 'lucide-react';
import { adminLogout, getAdminStats, processDailyIncome } from '@/lib/adminData';
import type { AdminStats } from '@/types/admin';
import { toast } from 'sonner';
import StatsOverview from '@/components/admin/StatsOverview';
import PaymentsTab from '@/components/admin/PaymentsTab';
import WithdrawalsTab from '@/components/admin/WithdrawalsTab';
import RedeemTab from '@/components/admin/RedeemTab';
import PackagesTab from '@/components/admin/PackagesTab';
import UsersTab from '@/components/admin/UsersTab';
import RechargesTab from '@/components/admin/RechargesTab';
import MissionsTab from '@/components/admin/MissionsTab';
import BroadcastTab from '@/components/admin/BroadcastTab';

type Tab = 'recharges' | 'payments' | 'withdrawals' | 'redeem' | 'packages' | 'users' | 'missions' | 'broadcast';

interface Props {
  onLogout: () => void;
}

const EMPTY_STATS: AdminStats = {
  totalUsers: 0,
  totalActivePackages: 0,
  totalPendingPackages: 0,
  totalEarningsDistributed: 0,
  totalDeposits: 0,
  totalWithdrawals: 0,
  pendingWithdrawals: 0,
  totalReferralEarnings: 0,
};

export default function AdminPanel({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('recharges');
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [runningIncome, setRunningIncome] = useState(false);

  const handleRunDailyIncome = async () => {
    setRunningIncome(true);
    const result = await processDailyIncome();
    if (result.error) {
      toast.error('Error: ' + result.error);
    } else {
      toast.success(`✅ ${result.message}`);
      refreshStats();
    }
    setRunningIncome(false);
  };

  const refreshStats = useCallback(async () => {
    const s = await getAdminStats();
    setStats(s);
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const handleLogout = () => {
    adminLogout();
    onLogout();
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'recharges', label: 'Recharges', icon: Banknote },
    { key: 'payments', label: 'Packages', icon: CreditCard },
    { key: 'withdrawals', label: 'Withdrawals', icon: ArrowDownCircle },
    { key: 'redeem', label: 'Redeem', icon: Gift },
    { key: 'packages', label: 'All Pkgs', icon: Package },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'missions', label: 'Missions', icon: Trophy },
    { key: 'broadcast', label: 'Broadcast', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#1a0505] to-[#0a0f1e] border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-red-800 flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">Admin Panel</h1>
              <p className="text-primary text-xs font-medium">Full Control Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDailyIncome}
              disabled={runningIncome}
              title="Run daily income for all active packages"
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-400 hover:bg-green-600/20 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${runningIncome ? 'animate-pulse' : ''}`} />
              {runningIncome ? 'Running...' : 'Run Income'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground hover:text-white hover:border-primary rounded-xl text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Exit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); refreshStats(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Overview */}
        <StatsOverview stats={stats} />

        {/* Tab Content */}
        <div>
          {activeTab === 'recharges' && <RechargesTab />}
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'withdrawals' && <WithdrawalsTab />}
          {activeTab === 'redeem' && <RedeemTab />}
          {activeTab === 'packages' && <PackagesTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'missions' && <MissionsTab />}
          {activeTab === 'broadcast' && <BroadcastTab />}
        </div>
      </div>
    </div>
  );
}
