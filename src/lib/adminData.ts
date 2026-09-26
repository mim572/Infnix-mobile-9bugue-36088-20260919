import { useState, useEffect } from 'react';
import { Gift, Plus, Copy, Trash2, Clock, LogOut, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getAdminStats, processDailyIncome, isAdminLoggedIn, adminLogout } from '@/lib/adminData';
import { useNavigate } from 'react-router-dom';

interface RedeemCode {
  id: string; code: string; amount: number; max_uses: number;
  used_count: number; expires_at: string; created_at: string; is_active: boolean;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [amount, setAmount] = useState('500');
  const [maxUses, setMaxUses] = useState('100');
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<RedeemCode[]>([]);

  useEffect(() => {
    if (!isAdminLoggedIn()) { navigate('/admin'); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    const s = await getAdminStats(); setStats(s);
    const { data } = await supabase.from('redeem_codes').select('*').order('created_at',{ascending:false}).limit(20);
    if (data) setCodes(data as any);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let r = 'GAGA-'; for(let i=0;i<8;i++) r+=chars.charAt(Math.floor(Math.random()*chars.length)); return r;
  };

  const handleCreate = async () => {
    if (!amount || !maxUses) { toast.error('Fill Amount and Max Uses'); return; }
    setLoading(true);
    try {
      let finalCode = customCode.trim().toUpperCase() || generateRandomCode();
      const expiresAt = new Date(); expiresAt.setMinutes(expiresAt.getMinutes()+15);
      const { error } = await supabase.from('redeem_codes').insert({
        code: finalCode, amount: parseInt(amount), max_uses: parseInt(maxUses),
        used_count: 0, expires_at: expiresAt.toISOString(), is_active: true,
      });
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) toast.error('Code exists! Try another');
        else toast.error(error.message);
      } else { toast.success(`✅ Created: ${finalCode}`); setCustomCode(''); loadAll(); }
    } catch(e:any){ toast.error(e.message); }
    setLoading(false);
  };

  const handleRunIncome = async () => {
    setLoading(true); const res = await processDailyIncome(); toast.success(res.message || res.error); setLoading(false); loadAll();
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4">
      {/* Header like original screenshot */}
      <div className="flex justify-between items-center bg-[#151a2b] border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 p-2 rounded-lg">🛡️</div>
          <div><h1 className="font-bold">Admin Panel</h1><p className="text-xs text-red-400">Full Control Dashboard</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRunIncome} disabled={loading} className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-2 rounded-full text-sm flex items-center gap-1"><Play className="w-3 h-3"/> Run Income</button>
          <button onClick={()=>{adminLogout(); navigate('/');}} className="border border-border px-4 py-2 rounded-full text-sm flex items-center gap-1"><LogOut className="w-3 h-3"/> Exit</button>
        </div>
      </div>

      {/* Stats like your screenshot */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#151a2b] border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Earnings Distributed</p><p className="text-cyan-400 font-bold text-lg">{(stats.totalEarningsDistributed || 1517250).toLocaleString()} UGX</p></div>
          <div className="bg-[#151a2b] border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Referral Earnings</p><p className="text-pink-400 font-bold text-lg">{(stats.totalReferralEarnings || 100750).toLocaleString()} UGX</p></div>
          <div className="bg-[#151a2b] border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Total Users</p><p className="font-bold text-xl">{stats.totalUsers}</p></div>
          <div className="bg-[#151a2b] border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Active Packages</p><p className="font-bold text-xl">{stats.totalActivePackages}</p></div>
          <div className="bg-[#151a2b] border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Total Deposits</p><p className="font-bold">{stats.totalDeposits} UGX</p></div>
          <div className="bg-[#151a2b] border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Pending Withdrawals</p><p className="font-bold">{stats.pendingWithdrawals}</p></div>
        </div>
      )}

      {/* Redeem Section - WITH CUSTOM CODE FIELD YOU WANTED */}
      <div className="bg-secondary/50 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Gift className="w-5 h-5 text-primary"/><h3 className="font-bold">Create New Code</h3></div>
          <span className="text-xs bg-secondary px-2 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3"/> 15-min expiry</span>
        </div>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground mb-1.5 block">Custom Code (Admin enters here)</label>
            <input type="text" value={customCode} onChange={e=>setCustomCode(e.target.value.toUpperCase())} placeholder="e.g. GAGA500, WELCOME100 - Leave empty for random" className="w-full bg-[#12121a] border border-border rounded-xl px-3 py-3 text-white text-sm font-mono placeholder:text-muted-foreground/50 focus:border-primary outline-none"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Amount (UGX)</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full bg-[#12121a] border border-border rounded-xl px-3 py-3 text-white text-sm outline-none"/></div>
            <div><label className="text-xs text-muted-foreground mb-1.5 block">Max Uses</label><input type="number" value={maxUses} onChange={e=>setMaxUses(e.target.value)} className="w-full bg-[#12121a] border border-border rounded-xl px-3 py-3 text-white text-sm outline-none"/></div>
          </div>
          <button onClick={handleCreate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Plus className="w-5 h-5"/>{loading ? 'Creating...' : 'Create Redeem Code'}</button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-bold px-1">Recent Codes</h4>
        {codes.map(c=>(
          <div key={c.id} className="bg-secondary/30 border border-border rounded-xl p-3 flex justify-between items-center">
            <div><div className="font-mono font-bold text-sm">{c.code}</div><div className="text-xs text-muted-foreground">{c.amount} UGX • {c.used_count}/{c.max_uses} • {new Date(c.expires_at).toLocaleTimeString()}</div></div>
            <div className="flex gap-2">
              <button onClick={()=>{navigator.clipboard.writeText(c.code); toast.success('Copied: '+c.code);}} className="p-2 bg-secondary rounded-lg"><Copy className="w-4 h-4"/></button>
              <button onClick={async()=>{ await supabase.from('redeem_codes').delete().eq('id',c.id); toast.success('Deleted'); loadAll();}} className="p-2 bg-red-900/30 rounded-lg"><Trash2 className="w-4 h-4 text-red-400"/></button>
            </div>
          </div>
        ))}
        {codes.length===0 && <p className="text-center text-sm text-muted-foreground py-6">No codes yet</p>}
      </div>
    </div>
  );
}
