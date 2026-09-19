import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, Wallet, TrendingUp, Clock, ChevronRight, ShoppingBag } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { buyPackage } from '@/lib/userApi';
import { toast } from 'sonner';

// Same list as PackagesPage — so refresh still works
const RAW_PRODUCTS = [
  { name: 'Infinix Smart 8', group: 'Group 1', amount: 15000, dailyIncome: 3000, durationDays: 60, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80' },
  { name: 'Infinix Hot 40i', group: 'Group 1', amount: 30000, dailyIncome: 7000, durationDays: 60, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80' },
  { name: 'Infinix Hot 40', group: 'Group 2', amount: 50000, dailyIncome: 12500, durationDays: 180, image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&q=80' },
  { name: 'Infinix Note 40', group: 'Group 2', amount: 100000, dailyIncome: 26000, durationDays: 180, image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&q=80' },
  { name: 'Infinix Note 40 Pro', group: 'Group 2', amount: 150000, dailyIncome: 40000, durationDays: 180, image: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&q=80' },
  { name: 'Infinix Zero 30', group: 'Group 3', amount: 300000, dailyIncome: 90000, durationDays: 210, image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&q=80' },
  { name: 'Infinix Zero 30 5G', group: 'Group 3', amount: 500000, dailyIncome: 160000, durationDays: 210, image: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400&q=80', badge: 'Popular' },
  { name: 'Infinix Zero 40', group: 'Group 3', amount: 800000, dailyIncome: 280200, durationDays: 210, image: 'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=400&q=80' },
  { name: 'Infinix Zero Ultra', group: 'Group 3', amount: 1200000, dailyIncome: 450000, durationDays: 210, image: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=400&q=80' },
  { name: 'Infinix GT 20 Pro', group: 'Group 3', amount: 1300000, dailyIncome: 600000, durationDays: 210, image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&q=80' },
  { name: 'Infinix Zero Fold VIP', group: 'Group 3', amount: 2000000, dailyIncome: 800000, durationDays: 210, image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80', badge: 'VIP' },
].map(p => ({ ...p, totalReturn: p.dailyIncome * p.durationDays }));

export default function BuyPackagePage() {
  const { user, reloadUser } = useUserAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { productId } = useParams();

  // FIX: if state is lost on refresh, recover from productId
  const product = state?.product || (productId ? RAW_PRODUCTS.find(p => p.name === decodeURIComponent(productId)) : null);

  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      setBalanceLoading(true);
      await reloadUser();
      setBalanceLoading(false);
    };
    refresh();
  }, []);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <p className="text-muted-foreground mb-4">Product not found. Please select again.</p>
        <button onClick={() => navigate('/packages')} className="bg-accent text-white px-6 py-3 rounded-xl">Go to Packages</button>
      </div>
    );
  }

  if (!user) return null;

  const canAfford = user.wallet_balance >= product.amount;
  const balanceAfter = user.wallet_balance - product.amount;
  const roi = Math.round((product.totalReturn / product.amount) * 100);

  const handleConfirm = async () => {
    if (!canAfford) {
      toast.error(`Insufficient balance. Please recharge first.`);
      return;
    }
    setLoading(true);
    const { error } = await buyPackage(
      user,
      {
        name: product.name,
        group: product.group,
        amount: product.amount,
        dailyIncome: product.dailyIncome,
        durationDays: product.durationDays,
      },
      user.phone,
      'MTN',
      'Paid from wallet balance'
    );
    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }
    await reloadUser();
    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-5 shadow-xl shadow-green-500/20">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Investment Active!</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-1">
          Your <span className="text-white font-semibold">{product.name}</span> package is now <span className="text-green-400 font-bold">live and earning</span>.
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          Daily income of <span className="text-green-400 font-bold">+{product.dailyIncome.toLocaleString()} UGX</span> is automatically credited to your wallet every 24 hours.
        </p>
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 mb-6 text-left space-y-2.5">
          {[
            { label: 'Package', value: product.name },
            { label: 'Amount Invested', value: `${product.amount.toLocaleString()} UGX`, color: 'text-blue-400' },
            { label: 'Daily Earnings', value: `+${product.dailyIncome.toLocaleString()} UGX/day`, color: 'text-green-400' },
            { label: 'Duration', value: `${product.durationDays} days` },
            { label: 'Total Return', value: `${product.totalReturn.toLocaleString()} UGX`, color: 'text-yellow-400' },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className={`font-semibold ${r.color || 'text-white'}`}>{r.value}</span>
            </div>
          ))}
        </div>
        <div className="w-full max-w-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex gap-3 mb-6">
          <Clock className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <p className="text-green-300 text-xs leading-relaxed">
            Your first daily income of <span className="font-bold">{product.dailyIncome.toLocaleString()} UGX</span> will be automatically credited exactly <span className="font-bold">24 hours</span> from now.
          </p>
        </div>
        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={() => navigate('/my-products')} className="flex-1 bg-accent hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm">View My Products</button>
          <button onClick={() => navigate('/home')} className="flex-1 bg-secondary text-muted-foreground font-semibold py-3.5 rounded-xl text-sm">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">Invest in {product.name}</h1>
          <p className="text-muted-foreground text-xs">{product.group} • {product.durationDays} Days</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {product.image && (
          <div className="relative h-44 rounded-2xl overflow-hidden bg-secondary">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-4">
              <h2 className="text-xl font-bold text-white drop-shadow-lg">{product.name}</h2>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-white text-sm">Package Details</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Investment</p>
                <p className="text-blue-400 font-bold text-base">{(product.amount / 1000).toLocaleString()}K</p>
                <p className="text-muted-foreground text-[10px]">UGX</p>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Daily Income</p>
                <p className="text-green-400 font-bold text-base">
                  +{product.dailyIncome >= 1000000 ? (product.dailyIncome / 1000000).toFixed(1) + 'M' : product.dailyIncome >= 1000 ? (product.dailyIncome / 1000).toFixed(0) + 'K' : product.dailyIncome}
                </p>
                <p className="text-muted-foreground text-[10px]">UGX/day</p>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Duration</p>
                <p className="text-orange-400 font-bold text-base">{product.durationDays}</p>
                <p className="text-muted-foreground text-[10px]">Days</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-muted-foreground">Total Return</span>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-sm">{product.totalReturn >= 1000000 ? `UGX ${(product.totalReturn / 1000000).toFixed(1)}M` : `UGX ${(product.totalReturn / 1000).toFixed(0)}K`}</p>
                <p className="text-yellow-400 text-xs font-bold">ROI {roi}%</p>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex gap-2.5">
              <Clock className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <p className="text-xs text-green-300 leading-relaxed">
                Your package activates <span className="font-bold">instantly</span> upon purchase. First income of <span className="font-bold">{product.dailyIncome.toLocaleString()} UGX</span> is credited <span className="font-bold">24 hours after purchase</span>, then every 24 hours thereafter.
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${balanceLoading ? 'bg-secondary border-border' : canAfford ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className={`w-4 h-4 ${balanceLoading ? 'text-muted-foreground' : canAfford ? 'text-green-400' : 'text-red-400'}`} />
            <h3 className={`font-bold text-sm ${balanceLoading ? 'text-muted-foreground' : canAfford ? 'text-green-400' : 'text-red-400'}`}>
              {balanceLoading ? 'Loading Balance...' : canAfford ? 'Sufficient Balance' : 'Insufficient Balance'}
            </h3>
            {balanceLoading && <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin ml-1" />}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Balance</span><span className="text-white font-semibold">{user.wallet_balance.toLocaleString()} UGX</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Investment Cost</span><span className="text-red-400 font-semibold">- {product.amount.toLocaleString()} UGX</span></div>
            <div className="h-px bg-border" />
            <div className="flex justify-between"><span className="text-muted-foreground">Balance After</span><span className={`font-bold ${canAfford ? 'text-white' : 'text-red-400'}`}>{canAfford ? balanceAfter.toLocaleString() : `Need ${(product.amount - user.wallet_balance).toLocaleString()} more`} UGX</span></div>
          </div>
          {!canAfford && <button onClick={() => navigate('/recharge')} className="mt-3 w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl text-sm">Recharge Account First →</button>}
        </div>

        {canAfford && (
          <button onClick={() => setConfirmed(!confirmed)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border ${confirmed ? 'bg-accent/10 border-accent/30' : 'bg-card border-border'}`}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${confirmed ? 'bg-accent border-accent' : 'border-muted-foreground'}`}>{confirmed && <CheckCircle className="w-3.5 h-3.5 text-white" />}</div>
            <p className="text-sm text-left text-muted-foreground leading-relaxed">I confirm investing <span className="text-white font-semibold">{product.amount.toLocaleString()} UGX</span> from my wallet into this package. I understand this is non-refundable once activated.</p>
          </button>
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex gap-2.5">
          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">Investment is deducted from your wallet and activated instantly. Daily income is credited automatically every 24 hours. Package cannot be cancelled once active.</p>
        </div>

        <button onClick={handleConfirm} disabled={!canAfford || !confirmed || loading || balanceLoading} className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-base disabled:opacity-40">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ChevronRight className="w-5 h-5" /> Invest {product.amount.toLocaleString()} UGX Now</>}
        </button>
      </div>
    </div>
  );
}
