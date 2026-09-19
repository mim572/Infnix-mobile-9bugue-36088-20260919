import { Users, Package, TrendingUp, Wallet, Clock, ArrowDownCircle } from 'lucide-react';

interface Props {
  stats: {
    totalUsers: number;
    totalActivePackages: number;
    totalPendingPackages: number;
    totalEarningsDistributed: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
    totalReferralEarnings: number;
  };
}

function fmt(n: number) {
  return n.toLocaleString() + ' UGX';
}

export default function StatsOverview({ stats }: Props) {
  const cards = [
    { label: 'Total Users', value: stats.totalUsers.toString(), icon: Users, color: 'from-blue-600 to-blue-800', light: 'text-blue-400' },
    { label: 'Active Packages', value: stats.totalActivePackages.toString(), icon: Package, color: 'from-green-600 to-green-800', light: 'text-green-400' },
    { label: 'Pending Packages', value: stats.totalPendingPackages.toString(), icon: Clock, color: 'from-yellow-600 to-yellow-800', light: 'text-yellow-400' },
    { label: 'Total Deposits', value: fmt(stats.totalDeposits), icon: TrendingUp, color: 'from-purple-600 to-purple-800', light: 'text-purple-400' },
    { label: 'Total Withdrawals', value: fmt(stats.totalWithdrawals), icon: ArrowDownCircle, color: 'from-red-600 to-red-800', light: 'text-red-400' },
    { label: 'Pending Payouts', value: fmt(stats.pendingWithdrawals), icon: Wallet, color: 'from-orange-600 to-orange-800', light: 'text-orange-400' },
    { label: 'Earnings Distributed', value: fmt(stats.totalEarningsDistributed), icon: TrendingUp, color: 'from-teal-600 to-teal-800', light: 'text-teal-400' },
    { label: 'Referral Earnings', value: fmt(stats.totalReferralEarnings), icon: Users, color: 'from-pink-600 to-pink-800', light: 'text-pink-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(card => (
        <div key={card.label} className="bg-card border border-border rounded-xl p-4">
          <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${card.color} mb-3`}>
            <card.icon className="w-4 h-4 text-white" />
          </div>
          <p className="text-muted-foreground text-xs mb-1">{card.label}</p>
          <p className={`font-bold text-sm ${card.light}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
