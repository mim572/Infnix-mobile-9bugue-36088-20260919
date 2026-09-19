import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, PlusCircle, Package as PkgIcon, TrendingUp, Clock, CheckCircle, XCircle, History, Calendar, Zap } from 'lucide-react';
import { getPackages, deletePackage, extendPackage } from '@/lib/adminData';
import type { Package } from '@/types/admin';
import { toast } from 'sonner';

type FilterTab = 'all' | 'active' | 'expired' | 'pending' | 'rejected';

const STATUS_STYLE: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  active:   { color: 'bg-green-500/20 text-green-400 border-green-500/30',    icon: CheckCircle, label: 'Active'   },
  pending:  { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock,       label: 'Pending'  },
  expired:  { color: 'bg-secondary/80 text-muted-foreground border-border',   icon: XCircle,     label: 'Expired'  },
  rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30',          icon: XCircle,     label: 'Rejected' },
};

function calcTotalEarned(pkg: Package): number {
  if (!pkg.buy_date || !pkg.daily_income) return 0;
  const start = new Date(pkg.buy_date);
  const end = pkg.status === 'expired' && pkg.expiry_date ? new Date(pkg.expiry_date) : new Date();
  const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
  return days * pkg.daily_income;
}

function getDaysLeft(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function PackagesTab() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState('30');

  const refresh = async () => {
    setLoading(true);
    setPackages(await getPackages());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id: string) => {
    await deletePackage(id);
    toast.success('Package deleted.');
    refresh();
  };

  const handleExtend = async (id: string) => {
    const days = parseInt(extendDays);
    if (!days || days < 1) { toast.error('Enter valid days.'); return; }
    await extendPackage(id, days);
    toast.success(`Package extended by ${days} days.`);
    setExtendId(null);
    refresh();
  };

  const filtered = filter === 'all' ? packages : packages.filter(p => p.status === filter);

  // Summary stats
  const activeCount   = packages.filter(p => p.status === 'active').length;
  const expiredCount  = packages.filter(p => p.status === 'expired').length;
  const totalInvested = packages.filter(p => ['active', 'expired'].includes(p.status)).reduce((s, p) => s + p.amount, 0);
  const totalEarned   = packages.filter(p => ['active', 'expired'].includes(p.status)).reduce((s, p) => s + calcTotalEarned(p), 0);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'active',   label: 'Active'   },
    { key: 'expired',  label: 'Expired'  },
    { key: 'pending',  label: 'Pending'  },
    { key: 'rejected', label: 'Rejected' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">User Packages</h2>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-xl text-sm hover:bg-accent/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-green-400" />
            <p className="text-muted-foreground text-xs">Active Packages</p>
          </div>
          <p className="text-green-400 font-bold text-xl">{activeCount}</p>
          <p className="text-muted-foreground text-[10px]">{expiredCount} expired</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <p className="text-muted-foreground text-xs">Total Invested</p>
          </div>
          <p className="text-blue-400 font-bold text-sm">{(totalInvested / 1000).toFixed(0)}K UGX</p>
          <p className="text-muted-foreground text-[10px]">Across all packages</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <p className="text-muted-foreground text-xs">Income Distributed</p>
          </div>
          <p className="text-yellow-400 font-bold text-sm">
            {totalEarned >= 1000000
              ? `${(totalEarned / 1000000).toFixed(2)}M`
              : `${(totalEarned / 1000).toFixed(0)}K`} UGX
          </p>
          <p className="text-muted-foreground text-[10px]">Est. total paid out</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <PkgIcon className="w-4 h-4 text-purple-400" />
            <p className="text-muted-foreground text-xs">Total Packages</p>
          </div>
          <p className="text-purple-400 font-bold text-xl">{packages.length}</p>
          <p className="text-muted-foreground text-[10px]">All statuses</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === t.key ? 'bg-accent text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs opacity-70">
              ({(t.key === 'all' ? packages : packages.filter(p => p.status === t.key)).length})
            </span>
          </button>
        ))}
      </div>

      {/* History Banner */}
      {(filter === 'active' || filter === 'expired') && filtered.length > 0 && (
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2.5 mb-4">
          <History className="w-4 h-4 text-accent shrink-0" />
          <p className="text-muted-foreground text-xs">
            {filter === 'active'
              ? `${filtered.length} active package${filtered.length > 1 ? 's' : ''} · Est. daily payout: ${filtered.reduce((s, p) => s + p.daily_income, 0).toLocaleString()} UGX/day`
              : `${filtered.length} expired package${filtered.length > 1 ? 's' : ''} · Total was invested: ${filtered.reduce((s, p) => s + p.amount, 0).toLocaleString()} UGX`
            }
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PkgIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No {filter === 'all' ? '' : filter} packages</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(pkg => {
            const s = STATUS_STYLE[pkg.status] || STATUS_STYLE.pending;
            const daysLeft = getDaysLeft(pkg.expiry_date);
            const totalEarnedPkg = calcTotalEarned(pkg);
            const roi = pkg.amount > 0 ? Math.round((pkg.daily_income * pkg.duration_days / pkg.amount) * 100) : 0;
            const isHistory = pkg.status === 'active' || pkg.status === 'expired';

            return (
              <div
                key={pkg.id}
                className={`bg-card border rounded-2xl p-4 ${
                  pkg.status === 'active'  ? 'border-green-500/20' :
                  pkg.status === 'expired' ? 'border-border'       :
                  pkg.status === 'rejected'? 'border-red-500/20'   :
                  'border-border'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white">{pkg.user_name}</h3>
                    <p className="text-muted-foreground text-sm">{pkg.user_phone}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${s.color}`}>
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </span>
                </div>

                {/* Product Info */}
                <div className="bg-secondary rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-white text-sm">{pkg.product_name}</p>
                    <span className="text-xs text-muted-foreground bg-border px-2 py-0.5 rounded-full">{pkg.product_group}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{pkg.duration_days} days · ROI {roi}%</p>
                </div>

                {/* Amount Breakdown */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Invested</p>
                    <p className="font-bold text-blue-400 text-sm">
                      {pkg.amount >= 1000000 ? `${(pkg.amount/1000000).toFixed(1)}M` : `${(pkg.amount/1000).toFixed(0)}K`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">UGX</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Daily</p>
                    <p className="font-bold text-green-400 text-sm">
                      +{pkg.daily_income >= 1000000
                        ? `${(pkg.daily_income/1000000).toFixed(1)}M`
                        : pkg.daily_income >= 1000
                        ? `${(pkg.daily_income/1000).toFixed(0)}K`
                        : pkg.daily_income}
                    </p>
                    <p className="text-[10px] text-muted-foreground">UGX/day</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${
                    isHistory ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-secondary'
                  }`}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Est. Earned</p>
                    <p className={`font-bold text-sm ${isHistory ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                      {totalEarnedPkg >= 1000000
                        ? `${(totalEarnedPkg/1000000).toFixed(2)}M`
                        : totalEarnedPkg >= 1000
                        ? `${(totalEarnedPkg/1000).toFixed(0)}K`
                        : totalEarnedPkg || '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">UGX</p>
                  </div>
                </div>

                {/* Dates Row (for active + expired) */}
                {isHistory && (pkg.buy_date || pkg.expiry_date) && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-secondary rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Buy Date</p>
                      </div>
                      <p className="text-white text-xs font-medium">
                        {pkg.buy_date
                          ? new Date(pkg.buy_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Expires</p>
                      </div>
                      <p className="text-white text-xs font-medium">
                        {pkg.expiry_date
                          ? new Date(pkg.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${
                      pkg.status === 'expired'
                        ? 'bg-secondary'
                        : daysLeft !== null && daysLeft < 10
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-secondary'
                    }`}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        {pkg.status === 'expired' ? 'Completed' : 'Days Left'}
                      </p>
                      <p className={`text-xs font-bold ${
                        pkg.status === 'expired'
                          ? 'text-muted-foreground'
                          : daysLeft !== null && daysLeft < 10
                          ? 'text-red-400'
                          : 'text-white'
                      }`}>
                        {pkg.status === 'expired' ? '✓ Done' : (daysLeft ?? '—')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submitted timestamp */}
                <p className="text-muted-foreground text-xs mb-3">
                  Submitted: {new Date(pkg.submitted_at).toLocaleString()}
                  {pkg.status === 'active' && daysLeft !== null && daysLeft < 10 && (
                    <span className="ml-2 text-red-400 font-semibold">⚠ Expiring soon</span>
                  )}
                </p>

                {/* Extend input */}
                {extendId === pkg.id && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="number"
                      value={extendDays}
                      onChange={e => setExtendDays(e.target.value)}
                      className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="Days to extend"
                    />
                    <button
                      onClick={() => handleExtend(pkg.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-xl font-medium transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setExtendId(null)}
                      className="px-4 py-2 bg-secondary hover:bg-border text-muted-foreground text-sm rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {pkg.status === 'active' && extendId !== pkg.id && (
                    <button
                      onClick={() => setExtendId(pkg.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-accent/20 hover:bg-accent/30 text-accent font-medium py-2.5 rounded-xl text-sm transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" /> Extend
                    </button>
                  )}

                  {/* History badge for completed/expired packages */}
                  {pkg.status === 'expired' && (
                    <div className="flex-1 flex items-center justify-center gap-2 bg-secondary border border-border text-muted-foreground py-2.5 rounded-xl text-xs font-semibold">
                      <History className="w-3.5 h-3.5" /> Completed · {pkg.duration_days}d Term
                    </div>
                  )}

                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="flex items-center justify-center gap-2 bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-red-400 font-medium py-2.5 px-4 rounded-xl text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
