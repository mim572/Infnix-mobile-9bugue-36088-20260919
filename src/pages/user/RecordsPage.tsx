import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, RefreshCw, ReceiptText, ArrowDownCircle } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { getUserRecharges, getUserWithdrawals } from '@/lib/userApi';
import type { InvestmentPackage, WithdrawalRequest } from '@/lib/userApi';
import { toast } from 'sonner';

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: Clock,
  active: CheckCircle,
  approved: CheckCircle,
  expired: XCircle,
  rejected: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  active: 'text-green-400 bg-green-400/10 border-green-400/20',
  approved: 'text-green-400 bg-green-400/10 border-green-400/20',
  expired: 'text-muted-foreground bg-secondary border-border',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
};

const NETWORK_DOT: Record<string, string> = {
  MTN: 'bg-yellow-400',
  Airtel: 'bg-red-400',
};

export default function RecordsPage() {
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'recharge' | 'withdraw'>('recharge');
  const [recharges, setRecharges] = useState<InvestmentPackage[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [r, w] = await Promise.all([
      getUserRecharges(user.id),
      getUserWithdrawals(user.id),
    ]);
    setRecharges(r);
    setWithdrawals(w);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleRefresh = async () => {
    await loadData();
    toast.success('Records refreshed.');
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-base font-bold text-white flex-1">My Records</h1>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="px-5 pt-5">
        <div className="grid grid-cols-2 bg-secondary rounded-2xl p-1 mb-5">
          <button
            onClick={() => setTab('recharge')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === 'recharge' ? 'bg-accent text-white shadow' : 'text-muted-foreground'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            Recharge
          </button>
          <button
            onClick={() => setTab('withdraw')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === 'withdraw' ? 'bg-accent text-white shadow' : 'text-muted-foreground'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Withdrawals
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'recharge' ? (
          <RechargeList records={recharges} />
        ) : (
          <WithdrawList records={withdrawals} />
        )}
      </div>
    </div>
  );
}

function RechargeList({ records }: { records: InvestmentPackage[] }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16">
        <ReceiptText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground text-sm">No recharge records yet.</p>
        <p className="text-muted-foreground text-xs mt-1">Recharge to start investing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map(r => {
        const Icon = STATUS_ICON[r.status] || Clock;
        const colorClass = STATUS_COLOR[r.status] || STATUS_COLOR.pending;
        const network = r.payment_network || '';

        return (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <p className="text-white font-bold text-base">
                  {r.amount.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">UGX</span>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {network && (
                    <>
                      <div className={`w-2 h-2 rounded-full ${NETWORK_DOT[network] || 'bg-gray-400'}`} />
                      <span className="text-muted-foreground text-xs">{network} Mobile Money</span>
                    </>
                  )}
                </div>
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}>
                <Icon className="w-3 h-3" />
                {r.status === 'active' ? 'Approved' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </span>
            </div>

            {r.payment_number && (
              <p className="text-muted-foreground text-xs mb-1">
                Paid from: <span className="text-white">{r.payment_number}</span>
              </p>
            )}

            <p className="text-muted-foreground text-xs">
              Submitted: {new Date(r.submitted_at).toLocaleString()}
            </p>

            {r.status === 'pending' && (
              <div className="mt-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                <p className="text-yellow-400 text-xs font-medium">⏳ Awaiting admin approval — funds will be credited once approved.</p>
              </div>
            )}
            {r.status === 'active' && (
              <div className="mt-2.5 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                <p className="text-green-400 text-xs font-medium">✓ Funds credited to your wallet.</p>
              </div>
            )}
            {r.status === 'rejected' && (
              <div className="mt-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <p className="text-red-400 text-xs font-medium">✗ Payment was rejected. Contact support.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WithdrawList({ records }: { records: WithdrawalRequest[] }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16">
        <ArrowDownCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground text-sm">No withdrawal records yet.</p>
        <p className="text-muted-foreground text-xs mt-1">Withdraw your earnings anytime.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map(w => {
        const Icon = STATUS_ICON[w.status] || Clock;
        const colorClass = STATUS_COLOR[w.status] || STATUS_COLOR.pending;

        return (
          <div key={w.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <p className="text-white font-bold text-base">
                  {w.amount.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">UGX</span>
                </p>
                <p className="text-green-400 text-xs mt-0.5">
                  Received: {w.net_amount.toLocaleString()} UGX
                </p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}>
                <Icon className="w-3 h-3" />
                {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
              </span>
            </div>

            <div className="space-y-1 mb-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${NETWORK_DOT[w.wallet_network] || 'bg-gray-400'}`} />
                <p className="text-muted-foreground text-xs">
                  {w.wallet_network}: <span className="text-white">{w.wallet_phone}</span>
                  {w.wallet_name && <span className="text-muted-foreground"> · {w.wallet_name}</span>}
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                Tax deducted: <span className="text-red-400">{w.tax.toLocaleString()} UGX (18%)</span>
              </p>
            </div>

            <p className="text-muted-foreground text-xs">
              Requested: {new Date(w.requested_at).toLocaleString()}
            </p>
            {w.processed_at && (
              <p className="text-muted-foreground text-xs">
                Processed: {new Date(w.processed_at).toLocaleString()}
              </p>
            )}
            {w.admin_note && (
              <div className="mt-2 bg-secondary rounded-xl px-3 py-2">
                <p className="text-muted-foreground text-xs">Note: <span className="text-white">{w.admin_note}</span></p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
