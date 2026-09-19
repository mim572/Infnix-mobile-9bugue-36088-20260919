import { useState, useEffect } from 'react';
import { ArrowDownCircle, Wallet, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { submitWithdrawal, getUserWithdrawals, saveWallet } from '@/lib/userApi';
import type { WithdrawalRequest } from '@/lib/userApi';
import BottomNav from '@/components/user/BottomNav';
import { toast } from 'sonner';

export default function WithdrawPage() {
  const { user, reloadUser } = useUserAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [wNetwork, setWNetwork] = useState<'MTN' | 'Airtel'>('MTN');
  const [wPhone, setWPhone] = useState('');
  const [wName, setWName] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);

  const loadHistory = async () => {
    if (!user) return;
    setHistLoading(true);
    setHistory(await getUserWithdrawals(user.id));
    setHistLoading(false);
  };

  useEffect(() => { loadHistory(); }, [user]);

  const handleWithdraw = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < 7000) { toast.error('Minimum withdrawal is 7,000 UGX.'); return; }
    if (!user) return;
    setLoading(true);
    const { error } = await submitWithdrawal(user, amt);
    if (error) { toast.error(error); setLoading(false); return; }
    toast.success('Withdrawal request submitted! Admin will process within 24 hours.');
    setAmount('');
    await reloadUser();
    loadHistory();
    setLoading(false);
  };

  const handleSaveWallet = async () => {
    if (!user || !wPhone || !wName) { toast.error('Fill in all wallet fields.'); return; }
    setSavingWallet(true);
    const { error } = await saveWallet(user.id, wNetwork, wPhone, wName);
    if (error) { toast.error(error); } else { toast.success('Wallet saved!'); await reloadUser(); setShowWalletForm(false); }
    setSavingWallet(false);
  };

  const tax = amount ? Math.floor(parseInt(amount || '0') * 0.18) : 0;
  const net = amount ? parseInt(amount || '0') - tax : 0;

  const STATUS_ICON: Record<string, React.ElementType> = { pending: Clock, approved: CheckCircle, rejected: XCircle };
  const STATUS_COLOR: Record<string, string> = {
    pending: 'text-yellow-400',
    approved: 'text-green-400',
    rejected: 'text-red-400',
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <ArrowDownCircle className="w-5 h-5 text-accent" /> Withdraw
        </h1>
        <button onClick={loadHistory} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${histLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Balance */}
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 rounded-2xl p-4">
          <p className="text-muted-foreground text-sm mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-white">{user?.wallet_balance.toLocaleString()} <span className="text-sm text-muted-foreground">UGX</span></p>
        </div>

        {/* Wallet Display / Setup */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2"><Wallet className="w-4 h-4 text-accent" /> My Wallet</h3>
            <button onClick={() => setShowWalletForm(!showWalletForm)} className="text-xs text-accent font-semibold">
              {user?.wallet_phone ? 'Edit' : 'Set Up'}
            </button>
          </div>

          {user?.wallet_phone ? (
            <div className="flex items-center gap-3 bg-secondary rounded-xl p-3">
              <div className={`w-3 h-3 rounded-full ${user.wallet_network === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'}`} />
              <div>
                <p className="text-white text-sm font-medium">{user.wallet_network}: {user.wallet_phone}</p>
                <p className="text-muted-foreground text-xs">{user.wallet_name}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-2">No wallet set up yet. Add one to withdraw.</p>
          )}

          {showWalletForm && (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-2">
                {(['MTN', 'Airtel'] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setWNetwork(n)}
                    className={`p-3 rounded-xl border transition-all text-sm font-medium ${wNetwork === n ? 'border-accent bg-accent/10 text-white' : 'border-border bg-secondary text-muted-foreground'}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full mb-1 ${n === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    {n} Money
                  </button>
                ))}
              </div>
              <input type="tel" value={wPhone} onChange={e => setWPhone(e.target.value)} placeholder="07XXXXXXXX"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <input type="text" value={wName} onChange={e => setWName(e.target.value)} placeholder="Account Name"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <button onClick={handleSaveWallet} disabled={savingWallet}
                className="w-full bg-accent hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
                {savingWallet ? 'Saving...' : 'Save Wallet'}
              </button>
            </div>
          )}
        </div>

        {/* Withdraw Form */}
        {user?.wallet_phone && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-white mb-3">Request Withdrawal</h3>
            <div className="mb-3">
              <label className="text-sm text-muted-foreground mb-1.5 block">Amount (UGX)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Min 7,000 UGX"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
              />
            </div>

            {amount && parseInt(amount) > 0 && (
              <div className="bg-secondary rounded-xl p-3 mb-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-white">{parseInt(amount).toLocaleString()} UGX</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">18% Tax</span>
                  <span className="text-red-400">-{tax.toLocaleString()} UGX</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1.5">
                  <span className="text-white">You Receive</span>
                  <span className="text-green-400">{net.toLocaleString()} UGX</span>
                </div>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-muted-foreground text-xs"><span className="text-yellow-400 font-semibold">Note:</span> You must recharge and purchase a product before withdrawing. Balance is deducted only after admin approves. Limit: 2 withdrawals/day.</p>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-4 rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? 'Processing...' : 'Request Withdrawal'}
            </button>
          </div>
        )}

        {/* History */}
        <div>
          <h3 className="font-semibold text-white mb-3">Withdrawal History</h3>
          {histLoading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No withdrawal history yet.</div>
          ) : (
            <div className="space-y-3">
              {history.map(w => {
                const Icon = STATUS_ICON[w.status] || Clock;
                return (
                  <div key={w.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-white">{w.amount.toLocaleString()} UGX</p>
                      <div className={`flex items-center gap-1 text-xs font-semibold ${STATUS_COLOR[w.status]}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs">Net: {w.net_amount.toLocaleString()} UGX • Via {w.wallet_network}</p>
                    <p className="text-muted-foreground text-xs">{new Date(w.requested_at).toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
