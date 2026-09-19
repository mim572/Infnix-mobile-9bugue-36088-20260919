import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Sparkles, CheckCircle, ExternalLink } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { redeemCode } from '@/lib/userApi';
import { toast } from 'sonner';

export default function RedeemPage() {
  const { user, reloadUser } = useUserAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [successAmount, setSuccessAmount] = useState<number | null>(null);

  const handleRedeem = async () => {
    if (!user) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { toast.error('Please enter a redeem code.'); return; }
    setLoading(true);
    const { amount, error } = await redeemCode(user.id, trimmed);
    if (error) {
      toast.error(error);
    } else {
      setSuccessAmount(amount!);
      setCode('');
      await reloadUser();
    }
    setLoading(false);
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
        <h1 className="text-base font-bold text-white">Redeem Gift Code</h1>
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/10 border border-yellow-500/30 rounded-2xl p-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-yellow-500/20">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Claim Your Reward</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Enter a gift code shared on our Telegram channels to instantly credit UGX to your wallet.
          </p>
        </div>

        {/* Code Input Card */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <label className="text-sm text-muted-foreground mb-2 block font-medium">Gift Code</label>
          <div className="relative mb-4">
            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              placeholder="Enter code (e.g. SEP-ABC123)"
              maxLength={20}
              className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-sm font-mono tracking-widest uppercase"
            />
          </div>

          <button
            onClick={handleRedeem}
            disabled={loading || !code.trim()}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Redeeming...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Redeem Code</>
            )}
          </button>
        </div>

        {/* How It Works */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3 text-sm">How Gift Codes Work</h3>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Join our Telegram group chat to receive gift codes.', color: 'bg-yellow-500' },
              { step: '2', text: 'Codes are posted by admins and are valid for 15 minutes only.', color: 'bg-orange-500' },
              { step: '3', text: 'Enter the code here before it expires to credit your wallet.', color: 'bg-red-500' },
              { step: '4', text: 'Each code can only be used once per account.', color: 'bg-purple-500' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full ${item.color} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>
                  {item.step}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed pt-0.5">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Telegram Links */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-white text-sm font-semibold">Get Codes on Telegram</p>
          </div>
          <a
            href="https://t.me/+adk1usHyKF4yYzQ0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <ExternalLink className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Official Support Channel</p>
              <p className="text-muted-foreground text-xs">Admin posts gift codes here</p>
            </div>
          </a>
          <a
            href="https://t.me/+kH7QuzE6dp0xZmVk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
              <ExternalLink className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Community Group Chat</p>
              <p className="text-muted-foreground text-xs">Community discussions & code alerts</p>
            </div>
          </a>
        </div>
      </div>

      {/* Success Modal */}
      {successAmount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setSuccessAmount(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-card border border-border rounded-3xl p-8 w-full max-w-xs text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Glow ring */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-yellow-400/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <p className="text-muted-foreground text-sm mb-1">You received</p>
            <p className="text-4xl font-black text-white mb-1">
              {successAmount.toLocaleString()}
            </p>
            <p className="text-yellow-400 font-bold text-lg mb-4">UGX</p>

            <p className="text-muted-foreground text-xs mb-6 leading-relaxed">
              The amount has been instantly credited to your wallet balance. You can withdraw it anytime!
            </p>

            <button
              onClick={() => setSuccessAmount(null)}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3.5 rounded-xl text-sm"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
