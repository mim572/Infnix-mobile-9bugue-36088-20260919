import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/user/BottomNav';

const FALLBACK = [
  { id: '1', name: 'Starter Saver', group: 'Starter', amount: 20000, dailyIncome: 1000, durationDays: 30, totalReturn: 30000, image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=500' },
  { id: '2', name: 'Growth Plan', group: 'Popular', amount: 50000, dailyIncome: 3000, durationDays: 30, totalReturn: 90000, image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=500' },
  { id: '3', name: 'Super Saver', group: 'VIP', amount: 100000, dailyIncome: 7000, durationDays: 30, totalReturn: 210000, image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500' },
  { id: '4', name: 'VIP Investor', group: 'VIP', amount: 200000, dailyIncome: 15000, durationDays: 30, totalReturn: 450000, image: 'https://images.unsplash.com/photo-1559526324-4f8172775c24?w=500' },
];

export default function PackagesPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('products').select('*').order('price', { ascending: true });
        if (data && data.length > 0) {
          setProducts(data.map((p: any) => ({
            id: p.id,
            name: p.name,
            group: p.group || p.category || 'Invest',
            amount: p.price || p.amount || 0,
            dailyIncome: p.daily_return || p.dailyIncome || 0,
            durationDays: p.duration_days || p.durationDays || 30,
            totalReturn: (p.daily_return || 0) * (p.duration_days || 30),
            image: p.image_url || p.image || FALLBACK[0].image
          })));
        }
      } catch (e) { console.log('fallback', e) }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold text-white flex items-center gap-2"><Package className="w-5 h-5 text-accent"/> Invest</h1>
        <p className="text-muted-foreground text-xs">Choose package to earn daily income</p>
      </div>
      <div className="px-5 py-4 grid gap-4">
        {products.map(p => (
          <div key={p.id} onClick={() => navigate('/buy', { state: { product: p } })} className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent/50 transition-all">
            <div className="h-32 relative bg-secondary">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={(e:any)=> e.target.src=FALLBACK[0].image}/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
              <div className="absolute bottom-3 left-4">
                <h3 className="text-white font-bold text-sm">{p.name}</h3>
                <p className="text-white/70 text-xs">{p.group} • {p.durationDays} days</p>
              </div>
              <div className="absolute top-3 right-3 bg-accent text-white text-[10px] px-2 py-1 rounded-full font-bold">HOT</div>
            </div>
            <div className="p-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary rounded-xl p-2"><p className="text-[10px] text-muted-foreground">Invest</p><p className="text-blue-400 font-bold text-sm">{Number(p.amount).toLocaleString()} UGX</p></div>
              <div className="bg-secondary rounded-xl p-2"><p className="text-[10px] text-muted-foreground">Daily</p><p className="text-green-400 font-bold text-sm">+{Number(p.dailyIncome).toLocaleString()}</p></div>
              <div className="bg-secondary rounded-xl p-2"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-yellow-400 font-bold text-sm">{Number(p.totalReturn).toLocaleString()}</p></div>
            </div>
            <div className="px-4 pb-4">
              <button className="w-full bg-accent hover:bg-accent/90 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><TrendingUp className="w-4 h-4"/> Invest Now</button>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
