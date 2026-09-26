import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, RefreshCw, Phone, TrendingDown, Clock, History, AlertCircle, Mail, Calendar, Wallet } from 'lucide-react';
import { getWithdrawals, approveWithdrawal, rejectWithdrawal, deleteWithdrawal } from '@/lib/adminData';
import { toast } from 'sonner';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_STYLE: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Rejected' },
};

export default function WithdrawalsTab() {
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectNote, setRejectNote] = useState<{ id: string; note: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    const data = await getWithdrawals() as any[];
    console.log('Withdrawals with user details:', data[0]); // debug
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

  const filtered = filter === 'all'? withdrawals : withdrawals.filter((w:any) => w.status === filter);
  const approvedTotal = withdrawals.filter((w:any) => w.status === 'approved').reduce((s:number, w:any) => s + (w.net_amount||0), 0);
  const pendingTotal = withdrawals.filter((w:any) => w.status === 'pending').reduce((s:number, w:any) => s + (w.amount||0), 0);
  const rejectedCount = withdrawals.filter((w:any) => w.status === 'rejected').length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {rejectNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-white font-bold text-base mb-1">Reject Withdrawal</h3>
            <textarea value={rejectNote.note} onChange={e => setRejectNote({...rejectNote, note: e.target.value })} placeholder="Reason (optional)..." rows={3} className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-white text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setRejectNote(null)} className="flex-1 py-3 rounded-xl bg-secondary text-muted-foreground text-sm">Cancel</button>
              <button onClick={() => handleReject(rejectNote.id, rejectNote.note || undefined)} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Withdrawal Requests - Full User Details</h2>
        <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-xl text-sm"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 text-center"><Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" /><p className="text-yellow-400 font-bold text-sm">{pendingTotal.toLocaleString()}</p><p className="text-muted-foreground text-[10px]">Pending UGX</p></div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 text-center"><TrendingDown className="w-4 h-4 text-green-400 mx-auto mb-1" /><p className="text-green-400 font-bold text-sm">{approvedTotal.toLocaleString()}</p><p className="text-muted-foreground text-[10px]">Paid Out UGX</p></div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center"><XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" /><p className="text-red-400 font-bold text-sm">{rejectedCount}</p><p className="text-muted-foreground text-[10px]">Rejected</p></div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === t.key? 'bg-accent text-white' : 'bg-secondary text-muted-foreground'}`}>{t.label} ({(t.key === 'all'? withdrawals : withdrawals.filter((w:any) => w.status === t.key)).length})</button>
        ))}
      </div>

      {filtered.length === 0? (
        <div className="text-center py-16 text-muted-foreground"><CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No {filter} requests</p></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((w:any) => {
            const s = STATUS_STYLE[w.status] || STATUS_STYLE.pending;
            return (
              <div key={w.id} className="bg-card border border-border rounded-2xl p-4">
                {/* USER WHO REQUESTED - NOW FULL DETAILS */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{w.user_name || w.user_obj?.full_name || 'Unknown User'}</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1"><Phone className="w-3 h-3"/>{w.user_phone || w.user_phone}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${s.color}`}><s.icon className="w-3 h-3" />{s.label}</span>
                </div>

                {/* NEW - FULL USER DETAILS BOX */}
                <div className="bg-secondary/50 border border-border rounded-xl p-3 mb-3">
                  <p className="text-accent text-[11px] font-bold mb-2">USER DETAILS (Joined Website)</p>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    <div className="flex items-center gap-2"><Mail className="w-3 h-3 text-muted-foreground"/><span className="text-muted-foreground">Email:</span><span className="text-white font-medium">{w.user_email || w.user_obj?.email || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-muted-foreground"/><span className="text-muted-foreground">Phone:</span><span className="text-white font-medium">{w.user_phone || w.user_obj?.phone || w.user_obj?.mobile || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-muted-foreground"/><span className="text-muted-foreground">Joined:</span><span className="text-white font-medium">{w.user_joined? new Date(w.user_joined).toLocaleDateString() : w.user_obj?.created_at? new Date(w.user_obj.created_at).toLocaleDateString() : 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><Wallet className="w-3 h-3 text-muted-foreground"/><span className="text-muted-foreground">Wallet Balance:</span><span className="text-green-400 font-bold">₹{w.user_wallet?? w.user_obj?.wallet_balance?? 0}</span></div>
                    <div className="flex items-center gap-2"><span className="text-muted-foreground">Referral Code:</span><span className="text-white">{w.user_obj?.referral_code || w.user_referral_code || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><span className="text-muted-foreground">User ID:</span><span className="text-white text-[10px]">{w.user_id}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-secondary rounded-xl p-3"><p className="text-muted-foreground text-[10px]">Requested</p><p className="font-bold text-white text-sm">{w.amount?.toLocaleString()}</p></div>
                  <div className="bg-secondary rounded-xl p-3"><p className="text-muted-foreground text-[10px]">Tax (18%)</p><p className="font-bold text-red-400 text-sm">-{w.tax?.toLocaleString()}</p></div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3"><p className="text-muted-foreground text-[10px]">Net Pay</p><p className="font-bold text-green-400 text-sm">{w.net_amount?.toLocaleString()}</p></div>
                </div>

                <div className="bg-secondary rounded-xl p-3 mb-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center"><Phone className="w-4 h-4 text-yellow-400" /></div>
                  <div className="flex-1"><p className="text-muted-foreground text-xs">Send via {w.wallet_network}</p><p className="font-bold text-white text-sm">{w.wallet_phone}</p><p className="text-muted-foreground text-xs">{w.wallet_name}</p></div>
                </div>

                <div className="flex gap-2">
                  {w.status === 'pending' && <>
                    <button onClick={() => handleApprove(w.id)} className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-semibold">Approve</button>
                    <button onClick={() => setRejectNote({ id: w.id, note: '' })} className="flex-1 bg-red-600 text-white py-3 rounded-xl text-sm font-semibold">Reject</button>
                  </>}
                  <button onClick={() => handleDelete(w.id)} className="w-12 bg-secondary rounded-xl flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
