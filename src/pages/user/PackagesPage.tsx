import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ChevronRight, Star, Wallet, PlusCircle } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import BottomNav from '@/components/user/BottomNav';

interface Product {
  name: string;
  group: string;
  amount: number;
  dailyIncome: number;
  durationDays: number;
  totalReturn: number;
  image: string;
  badge?: string;
}

const RAW_PRODUCTS = [
  // Group 1
  { name: 'Infinix Smart 8',       group: 'Group 1', amount: 15000,   dailyIncome: 3000,   durationDays: 60,  image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80' },
  { name: 'Infinix Hot 40i',        group: 'Group 1', amount: 30000,   dailyIncome: 7000,   durationDays: 60,  image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80' },
  // Group 2
  { name: 'Infinix Hot 40',         group: 'Group 2', amount: 50000,   dailyIncome: 12500,  durationDays: 180, image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&q=80' },
  { name: 'Infinix Note 40',        group: 'Group 2', amount: 100000,  dailyIncome: 26000,  durationDays: 180, image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&q=80' },
  { name: 'Infinix Note 40 Pro',    group: 'Group 2', amount: 150000,  dailyIncome: 40000,  durationDays: 180, image: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&q=80' },
  // Group 3
  { name: 'Infinix Zero 30',        group: 'Group 3', amount: 300000,  dailyIncome: 90000,  durationDays: 210, image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&q=80' },
  { name: 'Infinix Zero 30 5G',     group: 'Group 3', amount: 500000,  dailyIncome: 160000, durationDays: 210, image: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400&q=80', badge: 'Popular' },
  { name: 'Infinix Zero 40',        group: 'Group 3', amount: 800000,  dailyIncome: 280200, durationDays: 210, image: 'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=400&q=80' },
  { name: 'Infinix Zero Ultra',     group: 'Group 3', amount: 1200000, dailyIncome: 450000, durationDays: 210, image: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=400&q=80' },
  { name: 'Infinix GT 20 Pro',      group: 'Group 3', amount: 1300000, dailyIncome: 600000, durationDays: 210, image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&q=80' },
  { name: 'Infinix Zero Fold VIP',  group: 'Group 3', amount: 2000000, dailyIncome: 800000, durationDays: 210, image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80', badge: 'VIP' },
];

// totalReturn is always computed as dailyIncome × durationDays — never hardcoded
const PRODUCTS: Product[] = RAW_PRODUCTS.map(p => ({
  ...p,
  totalReturn: p.dailyIncome * p.durationDays,
  badge: (p as any).badge,
}));

const GROUP_COLORS: Record<string, string> = {
  'Group 1': 'from-blue-600/20 to-blue-800/10 border-blue-500/30',
  'Group 2': 'from-purple-600/20 to-purple-800/10 border-purple-500/30',
  'Group 3': 'from-yellow-600/20 to-yellow-800/10 border-yellow-500/30',
};

export default function PackagesPage() {
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState<string>('All');
  const groups = ['All', 'Group 1', 'Group 2', 'Group 3'];

  const filtered = activeGroup === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.group === activeGroup);

  const handleBuy = (product: Product) => {
    navigate('/buy', { state: { product } });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#1a0505] to-[#0a0f1e] border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-accent" />
          Infinix Investment Packages
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">Balance: <span className="text-green-400 font-semibold">{user?.wallet_balance.toLocaleString()} UGX</span></p>
      </div>

      <div className="px-5 py-4">
        {/* Group Filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeGroup === g ? 'bg-accent text-white shadow-lg' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Product Cards */}
        <div className="space-y-4">
          {filtered.map(product => {
            const canAfford = (user?.wallet_balance || 0) >= product.amount;
            const roi = Math.round((product.totalReturn / product.amount) * 100);
            return (
              <div key={product.name} className={`bg-gradient-to-br ${GROUP_COLORS[product.group]} border rounded-2xl overflow-hidden`}>
                {/* Phone Image */}
                <div className="relative h-48 overflow-hidden bg-secondary">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Group badge top-right */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      product.group === 'Group 1' ? 'bg-blue-500 text-white' :
                      product.group === 'Group 2' ? 'bg-purple-500 text-white' : 'bg-yellow-500 text-black'
                    }`}>
                      {product.group.replace('Group ', 'G')}
                    </span>
                  </div>

                  {/* Badge top-left */}
                  {product.badge && (
                    <div className="absolute top-3 left-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        product.badge === 'VIP' ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'
                      }`}>
                        {product.badge === 'Popular' && <Star className="w-3 h-3" />}
                        {product.badge}
                      </span>
                    </div>
                  )}

                  {/* Name overlay bottom */}
                  <div className="absolute bottom-3 left-4">
                    <h3 className="font-bold text-white text-lg drop-shadow-lg">{product.name}</h3>
                    <p className="text-white/70 text-xs">{product.group} • {product.durationDays} Days</p>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-black/20 rounded-xl p-2.5 text-center">
                      <p className="text-muted-foreground text-[10px] mb-0.5">Investment</p>
                      <p className="text-blue-400 font-bold text-sm">
                        {product.amount >= 1000000
                          ? 'UGX ' + (product.amount / 1000000).toFixed(1) + 'M'
                          : 'UGX ' + (product.amount / 1000).toFixed(0) + 'K'}
                      </p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-2.5 text-center">
                      <p className="text-muted-foreground text-[10px] mb-0.5">Daily</p>
                      <p className="text-green-400 font-bold text-sm">
                        +{product.dailyIncome >= 1000000
                          ? (product.dailyIncome / 1000000).toFixed(2) + 'M'
                          : product.dailyIncome >= 1000
                          ? (product.dailyIncome / 1000).toFixed(0) + 'K'
                          : product.dailyIncome}
                      </p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-2.5 text-center">
                      <p className="text-muted-foreground text-[10px] mb-0.5">Duration</p>
                      <p className="text-orange-400 font-bold text-sm">{product.durationDays}d</p>
                    </div>
                  </div>

                  {/* Total returns */}
                  <div className="bg-black/20 rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Total Returns</span>
                    <div className="text-right">
                      <span className="text-white font-semibold text-sm">
                        UGX {product.totalReturn >= 1000000
                          ? (product.totalReturn / 1000000).toFixed(1) + 'M'
                          : (product.totalReturn / 1000).toFixed(0) + 'K'}
                      </span>
                      <span className="ml-2 text-yellow-400 text-xs font-bold">ROI {roi}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuy(product)}
                    className={`w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm transition-all active:scale-98 ${
                      canAfford
                        ? 'bg-accent hover:bg-blue-700 text-white'
                        : 'bg-secondary text-muted-foreground cursor-not-allowed'
                    }`}
                    disabled={!canAfford}
                  >
                    {canAfford ? (
                      <><ChevronRight className="w-4 h-4" /> Buy Now — UGX {product.amount.toLocaleString()}</>
                    ) : (
                      `Requires UGX ${product.amount.toLocaleString()}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Balance Bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2 pointer-events-none">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Wallet Balance</p>
              <p className="text-green-400 font-bold text-sm leading-tight">{(user?.wallet_balance || 0).toLocaleString()} UGX</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/recharge')}
            className="flex items-center gap-1.5 bg-accent hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Recharge
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
