import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, Users, RefreshCw, CheckCircle, Gift, ShoppingBag, Send, PlusCircle, Copy, Share2, Trophy, X, Bell, Megaphone } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { doCheckIn, hasCheckedInToday, redeemCode, getUserRecharges } from '@/lib/userApi';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/user/BottomNav';
import { toast } from 'sonner';

export default function HomePage() {
  const { user, reloadUser } = useUserAuth();
  const navigate = useNavigate();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPendingRecharge, setHasPendingRecharge] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [tickerItems, setTickerItems] = useState<string[]>([]);
  const [activeBroadcasts, setActiveBroadcasts] = useState<{id:string;title:string;message:string;type:string}[]>([]);

  useEffect(() => {
    if (user) {
      hasCheckedInToday(user.id).then(setCheckedIn);
      getUserRecharges(user.id).then(recharges => {
        setHasPendingRecharge(recharges.some(r => r.status === 'pending'));
      });
      const shown = sessionStorage.getItem('infinix_announcement_shown');
      if (!shown) setShowAnnouncement(true);
    }
    loadTicker();
    loadBroadcasts();
  }, [user]);

  const loadBroadcasts = async () => {
    const { data } = await supabase
     .from('broadcasts')
     .select('id, title, message, type')
     .eq('is_active', true)
     .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
     .order('created_at', { ascending: false })
     .limit(3);
    setActiveBroadcasts((data || []) as any);
  };

  const loadTicker = async () => {
    const fallback = [
      'User ****12 withdrew UGX 45,000',
      'User ****87 earned UGX 18,000 today',
      'User ****34 invested in Infinix Note 40',
      'User ****56 withdrew UGX 120,000',
      'User ****21 earned UGX 6,500 today',
      'User ****99 joined the platform',
      'User ****44 invested in Infinix Hot 40i',
      'User ****73 withdrew UGX 78,000',
    ];
    const [withdrawRes, pkgRes] = await Promise.all([
      supabase.from('withdrawal_requests').select('user_phone, net_amount, requested_at').eq('status', 'approved').order('processed_at', { ascending: false }).limit(10),
      supabase.from('investment_packages').select('user_phone, amount, product_name, buy_date').in('status', ['active', 'expired']).neq('product_name', 'RECHARGE').order('buy_date', { ascending: false })
    ]);
    const items: string[] = [];
    (withdrawRes.data || []).forEach((w: any) => {
      const masked = maskPhone(w.user_phone);
      items.push(`User ${masked} withdrew UGX ${Number(w.net_amount).toLocaleString()}`);
    });
    (pkgRes.data || []).forEach((p: any) => {
      const masked = maskPhone(p.user_phone);
      items.push(`User ${masked} invested in ${p.product_name}`);
    });
    setTickerItems(items.length >= 4? items : fallback);
  };

  const maskPhone = (phone: string): string => {
    if (!phone) return '****XX';
    const clean = phone.replace(/\D/g, '');
    return '****' + clean.slice(-2);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await reloadUser();
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setCheckInLoading(true);
    const { success, error } = await doCheckIn(user.id);
    if (success) {
      toast.success('+200 UGX! Check-in bonus added to your wallet 🎉');
      setCheckedIn(true);
      await reloadUser();
    } else {
      toast.error(error || 'Check-in failed.');
    }
    setCheckInLoading(false);
  };

  const handleRedeem = async () => {
    if (!user ||!redeemInput.trim()) { toast.error('Enter a redeem code.'); return; }
    setRedeemLoading(true);
    const { amount, error } = await redeemCode(user.id, redeemInput.trim());
    if (error) {
      toast.error(error);
    } else {
      toast.success(`+${amount?.toLocaleString()} UGX redeemed successfully! 🎁`);
      setRedeemInput('');
      await reloadUser();
    }
    setRedeemLoading(false);
  };

  const handleCloseAnnouncement = () => {
    sessionStorage.setItem('infinix_announcement_shown', '1');
    setShowAnnouncement(false);
  };

  if (!user) return null;

  const referralLink = `${window.location.origin}${import.meta.env.BASE_URL}#/register?ref=${user.referral_code}`;

  const stats = [
    { label: 'Wallet Balance', value: user.wallet_balance.toLocaleString() + ' UGX', color: 'text-green-400', bg: 'from-green-600/20 to-green-800/10 border-green-500/20' },
    { label: 'Total Earnings', value: user.total_earnings.toLocaleString() + ' UGX', color: 'text-blue-400', bg: 'from-blue-600/20 to-blue-800/10 border-blue-500/20' },
    { label: 'Referral Earnings', value: user.referral_earnings.toLocaleString() + ' UGX', color: 'text-purple-400', bg: 'from-purple-600/20 to-purple-800/10 border-purple-500/20' },
    { label: 'Total Withdrawn', value: user.total_withdrawals.toLocaleString() + ' UGX', color: 'text-orange-400', bg: 'from-orange-600/20 to-orange-800/10 border-orange-500/20' },
  ];

  const quickActions = [
    { icon: PlusCircle, label: 'Recharge', color: 'text-green-400 bg-green-500/10', to: '/recharge' },
    { icon: ShoppingBag, label: 'Invest', color: 'text-blue-400 bg-blue-500/10', to: '/packages' },
    { icon: Send, label: 'Withdraw', color: 'text-orange-400 bg-orange-500/10', to: '/withdraw' },
    { icon: Users, label: 'My Team', color: 'text-purple-400 bg-purple-500/10', to: '/team' },
    { icon: Trophy, label: 'Missions', color: 'text-yellow-400 bg-yellow-500/10', to: '/missions' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {showAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-card border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="relative bg-gradient-to-b from-[#1a0a2e] to-[#0d1a3a] pt-6 pb-4 px-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-7 h-7 text-yellow-400" />
              </div>
              <h2 className="text-white font-bold text-xl tracking-wide">NOTIFY</h2>
              <p className="text-accent text-xs font-semibold mt-1">Infinix Earnings Platform — Uganda</p>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Infinix Earnings is Uganda's leading mobile investment platform. Invest in Infinix Mobile product packages and earn guaranteed daily income. Withdraw anytime once you've recharged and earn more through referrals. This is the official home for updates, bonuses, and support.
              </p>
              <div className="space-y-2 mt-1">
                {[
                  { icon: '🎁', text: 'Get 7,000 UGX registration bonus instantly' },
                  { icon: '💳', text: 'Min. recharge 15,000 UGX via MTN / Airtel' },
                  { icon: '📈', text: 'Earn daily income — auto-credited every 24h' },
                  { icon: '👥', text: '27% L1 commission when your invites invest' },
                  { icon: '✅', text: 'Check in daily for +200 UGX bonus reward' },
                  { icon: '💸', text: 'Withdraw anytime, min 7,000 UGX (18% tax)' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                    <p className="text-muted-foreground text-xs leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5 space-y-2">
              <button onClick={handleCloseAnnouncement} className="w-full bg-white hover:bg-gray-100 text-black font-bold py-3.5 rounded-2xl text-sm transition-colors">OK</button>
              <a href="https://t.me/+5hk-VcavLmwyMzFk" target="_blank" rel="noopener noreferrer" onClick={handleCloseAnnouncement} className="w-full flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1a8ec5] text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors">
                Join Official Telegram Channel
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="bg-gradient-to-br from-[#1a0505] to-[#0a0f1e] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold text-white">{user.name}</h1>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <RefreshCw className={`w-4 h-4 ${refreshing? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="bg-gradient-to-br from-primary/30 to-accent/30 border border-white/10 rounded-2xl p-5 mb-1">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-white/70" />
            <p className="text-white/70 text-sm">Wallet Balance</p>
          </div>
          <p className="text-3xl font-bold text-white">{user.wallet_balance.toLocaleString()}</p>
          <p className="text-white/60 text-sm">UGX</p>
        </div>
      </div>
      <div className="px-5 py-5 space-y-5">
        {tickerItems.length > 0 && <ActivityTicker items={tickerItems} />}
        <div className="grid grid-cols-5 gap-2">
          {quickActions.map(a => (
            <button key={a.to} onClick={() => navigate(a.to)} className={`flex flex-col items-center gap-2 p-2.5 rounded-2xl border border-border ${a.color} transition-transform active:scale-95`}>
              <a.icon className="w-5 h-5" />
              <span className="text-[10px] text-foreground font-medium">{a.label}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.bg} border rounded-xl p-4`}>
              <p className="text-muted-foreground text-xs mb-1">{s.label}</p>
              <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Daily Check-In</h3>
              <p className="text-muted-foreground text-xs mt-0.5">Check in every 24 hours to earn +200 UGX</p>
            </div>
            <span className="text-xl">🎯</span>
          </div>
          {checkedIn? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <p className="text-green-400 text-sm font-medium">✓ Checked in today! Come back tomorrow.</p>
            </div>
          ) : (
            <button onClick={handleCheckIn} disabled={checkInLoading} className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-60">
              {checkInLoading? 'Processing...' : 'Check In (+200 UGX)'}
            </button>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-3"><Gift className="w-4 h-4 text-yellow-400" /> Redeem Gift Code</h3>
          <p className="text-muted-foreground text-xs mb-3">Get codes from our Telegram group. Valid for 15 minutes only!</p>
          <div className="flex gap-2">
            <input type="text" value={redeemInput} onChange={e => setRedeemInput(e.target.value.toUpperCase())} placeholder="Enter code (e.g. SEP-ABC123)" className="flex-1 bg-secondary border border-border rounded-xl px-3 py-3 text-white placeholder:text-muted-foreground text-sm outline-none" />
            <button onClick={handleRedeem} disabled={redeemLoading} className="px-4 py-3 bg-accent hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 w-[120px]">
              {redeemLoading ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>
        </div>

        {/* FIXED Referral Link Banner */}
        <div className="bg-gradient-to-r from-purple-700/30 to-blue-800/20 border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-400" />
            <p className="text-white font-bold text-sm">Your Referral Link</p>
            <span className="ml-auto text-xs text-purple-300 font-semibold bg-purple-500/20 px-2 py-0.5 rounded-full">27% Commission</span>
          </div>
          <p className="text-muted-foreground text-xs mb-3">Share your link — earn 30% when your friends invest!</p>
          <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2.5 mb-3">
            <p className="flex-1 text-white text-xs font-mono truncate">{referralLink}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Referral link copied!'); }} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium py-2.5 rounded-xl text-xs transition-colors">
              <Copy className="w-4 h-4" /> Copy Link
            </button>
            <button onClick={() => { const msg = `Join Infinix Earnings Uganda & get UGX 7,000 bonus!\n\nInvest in Infinix Mobile packages and earn daily income. Use my referral link:\n${referralLink}`; navigator.share ? navigator.share({ title: 'Infinix Earnings', text: msg }) : window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); }} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium py-2.5 rounded-xl text-xs transition-colors">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>

        {activeBroadcasts.length > 0 && (
          <div className="space-y-2">
            {activeBroadcasts.map(b => {
              const configs: Record<string,{bg:string;color:string;icon:string}> = { info: { bg: 'bg-blue-500/10 border-blue-500/30', color: 'text-blue-400', icon: 'ℹ' }, success: { bg: 'bg-green-500/10 border-green-500/30', color: 'text-green-400', icon: '✓' }, warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', color: 'text-yellow-400', icon: '⚠' } };
              const cfg = configs[b.type] || configs.info;
              return (<div key={b.id} className={`border rounded-2xl p-4 flex items-start gap-3 ${cfg.bg}`}><span className="text-base shrink-0 mt-0.5">{cfg.icon}</span><div><p className={`font-bold text-sm ${cfg.color}`}>{b.title}</p><p className="text-muted-foreground text-xs mt-1 leading-relaxed">{b.message}</p></div></div>);
            })}
          </div>
        )}
        {hasPendingRecharge && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5"><span className="text-base">⏳</span></div>
            <div className="flex-1"><p className="text-yellow-400 font-bold text-sm">Recharge Under Review</p><p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">Your recharge is being processed. You will get a notification after confirmation.</p></div>
          </div>
        )}
        <div onClick={() => navigate('/missions')} className="bg-gradient-to-r from-yellow-600/20 to-orange-700/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.99]">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0"><Trophy className="w-6 h-6 text-yellow-400" /></div>
          <div className="flex-1"><p className="text-white font-bold text-sm">Mission Center</p><p className="text-muted-foreground text-xs mt-0.5">Invite investors — earn up to 40,000 UGX bonus rewards.</p></div>
        </div>
        <div onClick={() => navigate('/recharge')} className="bg-gradient-to-r from-green-700/30 to-emerald-800/20 border border-green-500/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.99]">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0"><PlusCircle className="w-6 h-6 text-green-400" /></div>
          <div className="flex-1"><p className="text-white font-bold text-sm">Recharge Account</p><p className="text-muted-foreground text-xs mt-0.5">Deposit via MTN or Airtel Money · Min 15,000 UGX</p></div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3">Platform Rules</h3>
          <div className="space-y-2 text-xs text-muted-foreground">{['💰 Min. Deposit: 15,000 UGX | Min. Withdrawal: 7,000 UGX','📈 Earn daily income automatically once package is approved','👥 Referral commissions: up to 27% on direct referrals','✅ Daily check-in reward: +200 UGX','💸 Tax: 18% applies on withdrawal amounts'].map((rule, i) => <p key={i}>{rule}</p>)}</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function ActivityTicker({ items }: { items: string[] }) {
  const displayItems = [...items,...items];
  return (
    <div className="relative flex items-center bg-black/30 border border-white/8 rounded-full px-3 py-2 overflow-hidden gap-2">
      <div className="shrink-0 flex items-center justify-center w-5 h-5"><Megaphone className="w-3.5 h-3.5 text-yellow-400" /></div>
      <div className="absolute left-8 top-0 h-full w-8 bg-gradient-to-r from-black/30 to-transparent z-10 pointer-events-none" />
      <div className="flex-1 overflow-hidden">
        <div className="flex gap-0 whitespace-nowrap" style={{ animation: 'ticker-scroll 32s linear infinite' }}>
          {displayItems.map((item, i) => (<span key={i} className="text-xs text-muted-foreground px-4 shrink-0"><span className="text-green-400 font-medium">●</span>{' '}{item}</span>))}
        </div>
      </div>
      <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-black/60 to-transparent z-10 pointer-events-none" />
    </div>
  );
}
