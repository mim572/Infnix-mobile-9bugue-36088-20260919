import { useState, useEffect } from 'react';
import { Package, RefreshCw, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { getUserPackages } from '@/lib/userApi';
import type { InvestmentPackage } from '@/lib/userApi';
import BottomNav from '@/components/user/BottomNav';

type FilterTab = 'all' | 'active' | 'pending' | 'expired' | 'rejected';

const STATUS_STYLE: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Active', icon: CheckCircle },
  pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Pending', icon: Clock },
  expired: { color: 'bg-secondary/50 text-muted-foreground border-border', label: 'Expired', icon: XCircle },
  rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Rejected', icon: XCircle },
};

export default function MyProductsPage() {
  const { user } = useUserAuth();
  const [packages, setPackages] = useState<InvestmentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setPackages(await getUserPackages(user.id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = filter === 'all' ? packages : packages.filter(p => p.status === filter);
  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'expired', label: 'Expired' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const getDaysLeft = (expiry: string | null) => {
    if (!expiry) return null;
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-accent" /> My Products
        </h1>
        <button onClick={load} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-5 py-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === t.key ? 'bg-accent text-white' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {t.label}
              <span className="ml-1 text-xs opacity-60">
                ({(t.key === 'all' ? packages : packages.filter(p => p.status === t.key)).length})
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No {filter === 'all' ? '' : filter} packages</p>
            <p className="text-xs mt-1">Visit Invest tab to buy a package</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(pkg => {
              // Skip recharge entries
              if (pkg.product_name === 'RECHARGE') return null;
              const s = STATUS_STYLE[pkg.status] || STATUS_STYLE.pending;
              const daysLeft = getDaysLeft(pkg.expiry_date);

              return (
                <div key={pkg.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white">{pkg.product_name}</h3>
                      <p className="text-muted-foreground text-xs">{pkg.product_group}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${s.color}`}>
                      <s.icon className="w-3 h-3" />
                      {s.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-muted-foreground text-xs mb-0.5">Invested</p>
                      <p className="font-bold text-white text-sm">{pkg.amount.toLocaleString()} UGX</p>
                    </div>
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-muted-foreground text-xs mb-0.5">Daily Income</p>
                      <p className="font-bold text-green-400 text-sm flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +{pkg.daily_income.toLocaleString()} UGX
                      </p>
                    </div>
                  </div>

                  {pkg.status === 'active' && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-secondary rounded-lg p-2 text-center">
                        <p className="text-muted-foreground text-[10px]">Buy Date</p>
                        <p className="text-white text-xs font-medium">{pkg.buy_date ? new Date(pkg.buy_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</p>
                      </div>
                      <div className="bg-secondary rounded-lg p-2 text-center">
                        <p className="text-muted-foreground text-[10px]">Expires</p>
                        <p className="text-white text-xs font-medium">{pkg.expiry_date ? new Date(pkg.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</p>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${daysLeft !== null && daysLeft < 10 ? 'bg-red-500/10' : 'bg-secondary'}`}>
                        <p className="text-muted-foreground text-[10px]">Days Left</p>
                        <p className={`text-xs font-bold ${daysLeft !== null && daysLeft < 10 ? 'text-red-400' : 'text-blue-400'}`}>{daysLeft ?? '—'}</p>
                      </div>
                    </div>
                  )}

                  {pkg.status === 'pending' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                      <p className="text-yellow-400 text-xs">⏳ Awaiting admin approval. Your package will be activated once payment is verified.</p>
                    </div>
                  )}

                  <p className="text-muted-foreground text-xs mt-2">
                    Submitted: {new Date(pkg.submitted_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
