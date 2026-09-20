import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/user/BottomNav';

const PRODUCTS = [
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
].map(p => ({...p, id: p.name, totalReturn: p.dailyIncome * p.durationDays }));

export default function PackagesPage() {
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState('All');
  const groups = ['All', 'Group 1', 'Group 2', 'Group 3'];

  const filtered = activeGroup === 'All'? PRODUCTS : PRODUCTS.filter(p => p.group === activeGroup);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold text-white">Invest</h1>
        <p className="text-muted-foreground text-xs">Choose Infinix package to earn daily</p>
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {groups.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeGroup===g? 'bg-accent text-white' : 'bg-secondary text-muted-foreground'}`}>{g}</button>
          ))}
        </div>
      </div>
      <div className="px-5 py-4 grid gap-4">
        {filtered.map(p => (
          <div key={p.id} onClick={() => navigate(`/buy/${encodeURIComponent(p.name)}`, { state: { product: p } })} className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent/50 transition">
            <div className="relative h-36 bg-secondary">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
              <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                <div><h3 className="text-white font-bold text-sm">{p.name}</h3><p className="text-white/70 text-xs">{p.group} • {p.durationDays} days</p></div>
                {(p as any).badge && <div className="bg-accent text-white text-[10px] px-2 py-1 rounded-full font-bold">{(p as any).badge}</div>}
              </div>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary rounded-xl p-2"><p className="text-[10px] text-muted-foreground">Invest</p><p className="text-blue-400 font-bold text-xs">{p.amount.toLocaleString()}</p></div>
              <div className="bg-secondary rounded-xl p-2"><p className="text-[10px] text-muted-foreground">Daily</p><p className="text-green-400 font-bold text-xs">+{p.dailyIncome.toLocaleString()}</p></div>
              <div className="bg-secondary rounded-xl p-2"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-yellow-400 font-bold text-xs">{p.totalReturn.toLocaleString()}</p></div>
            </div>
            <div className="px-3 pb-3"><button className="w-full bg-accent hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs">Invest Now</button></div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
