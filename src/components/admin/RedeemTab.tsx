import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Clock, CheckCircle, XCircle, Share2 } from 'lucide-react';
import { getRedeems, createRedeemCode, deleteRedeemCode, toggleRedeemCode } from '@/lib/adminData';
import type { RedeemCode } from '@/types/admin';
import { toast } from 'sonner';

export default function RedeemTab() {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState('500');
  const [maxUses, setMaxUses] = useState('100');
  const [customCode, setCustomCode] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async () => {
    setLoading(true);
    setCodes(await getRedeems());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const getShareUrl = (code: RedeemCode) => {
    const message = [
      '🎁 REDEEM CODE',
      '',
      `💰 Amount: UGX ${code.amount.toLocaleString()}`,
      `🔑 Code: ${code.code}`,
      `👥 Available uses: ${code.max_uses}`,
      '⏰ Valid for 15 minutes only!',
      '',
      'Open the app and redeem it now!'
    ].join('\n');

    return `https://t.me/share/url?url=${encodeURIComponent(code.code)}&text=${encodeURIComponent(message)}`;
  };

  const handleCreate = async () => {
    const amt = parseInt(amount);
    const uses = parseInt(maxUses);
    const normalizedCode = customCode.trim().toUpperCase();

    if (!amt || amt < 100) { toast.error('Minimum amount is 100 UGX'); return; }
    if (!uses || uses < 1) { toast.error('At least 1 use required'); return; }
    if (normalizedCode && !/^[A-Z0-9-]{3,20}$/.test(normalizedCode)) {
      toast.error('Redeem code can only use letters, numbers and hyphens.');
      return;
    }

    setCreating(true);
    const result = await createRedeemCode(amt, uses, normalizedCode || undefined);
    if (result) {
      toast.success(normalizedCode ? 'Custom redeem code created.' : 'Redeem code created. Share it from the code list when ready.');
      setCustomCode('');
    } else {
      toast.error('Failed to create code. It may already exist or be invalid.');
    }
    setCreating(false);
    await refresh();
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const handleShare = (code: RedeemCode) => {
    window.open(getShareUrl(code), '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (id: string) => {
    await deleteRedeemCode(id);
    toast.success('Code deleted.');
    refresh();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleRedeemCode(id, current);
    refresh();
  };

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return { label: 'Expired', expired: true, percent: 0 };
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const total = 15 * 60 * 1000;
    return { label: `${mins}m ${secs}s left`, expired: false, percent: Math.round((diff / total) * 100) };
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Redeem Codes</h2>
        <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">15-min expiry</span>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent" /> Create New Code
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="redeem-amount" className="text-xs text-muted-foreground mb-1 block">Amount (UGX)</label>
            <input
              id="redeem-amount"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="500"
            />
          </div>
          <div>
            <label htmlFor="redeem-max-uses" className="text-xs text-muted-foreground mb-1 block">Max Uses</label>
            <input
              id="redeem-max-uses"
              type="number"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="100"
            />
          </div>
        </div>

        <div className="mb-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
          <label htmlFor="custom-redeem-code" className="text-sm font-medium text-white mb-1 block">
            Custom Redeem Code <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="custom-redeem-code"
            type="text"
            value={customCode}
            onChange={e => setCustomCode(e.target.value.toUpperCase())}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-white text-sm uppercase focus:outline-none focus:ring-2 focus:ring-accent/50"
            placeholder="e.g. SEP-ABC123"
            maxLength={20}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Enter 3–20 letters, numbers, or hyphens. Leave blank to generate a code automatically.
          </p>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full bg-accent hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> {creating ? 'Creating...' : 'Create Redeem Code'}
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No redeem codes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map(code => {
            const { label, expired, percent } = getTimeLeft(code.expires_at);
            const isExpired = expired || !code.is_active;

            return (
              <div key={code.id} className={`bg-card border rounded-2xl p-4 ${isExpired ? 'border-border opacity-60' : 'border-accent/30'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-lg tracking-widest">{code.code}</span>
                      <button onClick={() => handleCopy(code.code)} className="text-muted-foreground hover:text-accent transition-colors" title="Copy code">
                        <Copy className="w-4 h-4" />
                      </button>
                      {!isExpired && (
                        <button onClick={() => handleShare(code)} className="text-muted-foreground hover:text-accent transition-colors" title="Share on Telegram">
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">{code.amount.toLocaleString()} UGX • Max {code.max_uses} uses • Used {code.used_count}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!expired && (
                      <button
                        onClick={() => handleToggle(code.id, code.is_active)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {code.is_active ? <CheckCircle className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                      </button>
                    )}
                    <button onClick={() => handleDelete(code.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {!expired && code.is_active && (
                  <>
                    <div className="w-full bg-secondary rounded-full h-1.5 mb-1">
                      <div className="bg-gradient-to-r from-accent to-green-500 h-1.5 rounded-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="text-xs text-accent font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {label}
                    </p>
                  </>
                )}

                {(expired || !code.is_active) && (
                  <span className="text-xs text-red-400 font-medium">
                    {expired ? 'Expired' : 'Deactivated'} • Used by {code.used_count} users
                  </span>
                )}

                <p className="text-muted-foreground text-xs mt-1">
                  Created: {new Date(code.created_at).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
