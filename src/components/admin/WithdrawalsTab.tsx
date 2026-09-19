import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, RefreshCw, Phone, TrendingDown, Clock, History, AlertCircle } from 'lucide-react';
import { getWithdrawals, approveWithdrawal, rejectWithdrawal, deleteWithdrawal } from '@/lib/adminData';
import type { WithdrawalRequest } from '@/types/admin';
import { toast } from 'sonner';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_STYLE: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  pending:  { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',  icon: Clock,        label: 'Pending'  },
  approved: { color: 'bg-green-500/20 text-green-400 border-green-500/30',    icon: CheckCircle,  label: 'Approved' },
  rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30',          icon: XCircle,      label: 'Rejected' },
};

export default function WithdrawalsTab() {
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectNote, setRejectNote] = useState<{ id: string; note: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    const data = await getWithdrawals();
    setWithdrawals(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleApprove = async (id: string) => {
    await approveWithdrawal(id);
    toast.success('Withdrawal approved. Balance deducted.');
    refresh();
  };

  const handleReject = async (id: string, note?: string) => {
    await rejectWithdrawal(id, note);
    toast.error('Withdrawal rejected.');
    setRejectNote(null);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteWithdrawal(id);
    toast.success('Record deleted.');
    refresh();
  };

  const filtered = filter === 'all' ? withdrawals : withdrawals.filter(w => w.status === filter);

  // Summary stats
  const approvedTotal = withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.net_amount, 0);
  const pendingTotal  = withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.amount, 0);
  const rejectedCount = withdrawals.filter(w => w.status === 'rejected').length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending',  label: 'Pending'  },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all',      label: 'All'      },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Reject Note Modal */}
      {rejectNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-white font-bold text-base mb-1">Reject Withdrawal</h3>
            <p className="text-muted-foreground text-xs mb-3">Optionally add a reason note for the user.</p>
            <textarea
              value={rejectNote.note}
              onChange={e => setRejectNote({ ...rejectNote, note: e.target.value })}
              placeholder="Reason (optional)..."
              rows={3}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectNote(null)}
                className="flex-1 py-3 rounded-xl bg-secondary text-muted-foreground text-sm font-medium"
              >Cancel</button>
              <button
                onClick={() => handleReject(rejectNote.id, rejectNote.note || undefined)}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
              >Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Withdrawal Requests</h2>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-xl text-sm hover:bg-accent/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 text-center">
          <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-yellow-400 font-bold text-sm">{pendingTotal.toLocaleString()}</p>
          <p className="text-muted-foreground text-[10px]">Pending UGX</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 text-center">
          <TrendingDown className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-green-400 font-bold text-sm">{approvedTotal.toLocaleString()}</p>
          <p className="text-muted-foreground text-[10px]">Paid Out UGX</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
          <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-red-400 font-bold text-sm">{rejectedCount}</p>
          <p className="text-muted-foreground text-[10px]">Rejected</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === t.key
                ? 'bg-accent text-white'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs opacity-70">
              ({(t.key === 'all' ? withdrawals : withdrawals.filter(w => w.status === t.key)).length})
            </span>
          </button>
        ))}
      </div>

      {/* History Banner for approved/rejected */}
      {(filter === 'approved' || filter === 'rejected') && filtered.length > 0 && (
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2.5 mb-4">
          <History className="w-4 h-4 text-accent shrink-0" />
          <p className="text-muted-foreground text-xs">
            {filter === 'approved'
              ? `${filtered.length} approved withdrawal${filtered.length > 1 ? 's' : ''} · Total paid out: ${approvedTotal.toLocaleString()} UGX (net)`
              : `${filtered.length} rejected withdrawal${filtered.length > 1 ? 's' : ''}`
            }
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No {filter === 'all' ? '' : filter} withdrawal requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(w => {
            const s = STATUS_STYLE[w.status] || STATUS_STYLE.pending;
            const isHistory = w.status === 'approved' || w.status === 'rejected';

            return (
              <div
                key={w.id}
                className={`bg-card border rounded-2xl p-4 ${
                  w.status === 'approved' ? 'border-green-500/20' :
                  w.status === 'rejected' ? 'border-red-500/20' :
                  'border-border'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{w.user_name}</h3>
                    <p className="text-muted-foreground text-sm">{w.user_phone}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${s.color}`}>
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </span>
                </div>

                {/* Amount breakdown */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-muted-foreground text-[10px] mb-0.5">Requested</p>
                    <p className="font-bold text-white text-sm">{w.amount.toLocaleString()}</p>
                    <p className="text-muted-foreground text-[10px]">UGX</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3">
                    <p className="text-muted-foreground text-[10px] mb-0.5">Tax (18%)</p>
                    <p className="font-bold text-red-400 text-sm">-{w.tax.toLocaleString()}</p>
                    <p className="text-muted-foreground text-[10px]">UGX</p>
                  </div>
                  <div className={`rounded-xl p-3 ${
                    w.status === 'approved' ? 'bg-green-500/10 border border-green-500/20' : 'bg-secondary'
                  }`}>
                    <p className="text-muted-foreground text-[10px] mb-0.5">Net Pay</p>
                    <p className={`font-bold text-sm ${
                      w.status === 'approved' ? 'text-green-400' : 'text-white'
                    }`}>{w.net_amount.toLocaleString()}</p>
                    <p className="text-muted-foreground text-[10px]">UGX</p>
                  </div>
                </div>

                {/* Wallet destination */}
                <div className="bg-secondary rounded-xl p-3 mb-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    w.wallet_network === 'MTN' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  }`}>
                    <Phone className={`w-4 h-4 ${
                      w.wallet_network === 'MTN' ? 'text-yellow-400' : 'text-red-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground text-xs">Send via {w.wallet_network}</p>
                    <p className="font-bold text-white text-sm truncate">{w.wallet_phone}</p>
                    <p className="text-muted-foreground text-xs truncate">{w.wallet_name}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    w.wallet_network === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                </div>

                {/* Admin note (rejected) */}
                {w.status === 'rejected' && (w as any).admin_note && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-3 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 text-xs font-semibold">Rejection Reason</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{(w as any).admin_note}</p>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mb-4">
                  <span>📅 Requested: {new Date(w.requested_at).toLocaleString()}</span>
                  {w.processed_at && (
                    <span className={w.status === 'approved' ? 'text-green-400' : 'text-red-400'}>
                      ✓ Processed: {new Date(w.processed_at).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {w.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(w.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectNote({ id: w.id, note: '' })}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  {isHistory && (
                    <div className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold ${
                      w.status === 'approved'
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                      {w.status === 'approved'
                        ? <><CheckCircle className="w-4 h-4" /> Payment Sent</>  
                        : <><XCircle className="w-4 h-4" /> Rejected</>}
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="w-12 flex items-center justify-center bg-secondary hover:bg-border text-muted-foreground hover:text-foreground rounded-xl transition-colors"
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
