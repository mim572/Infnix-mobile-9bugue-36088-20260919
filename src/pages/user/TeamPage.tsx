import { useState, useEffect } from 'react';
import { Users, Copy, Share2, RefreshCw } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { getTeamData } from '@/lib/userApi';
import type { PlatformUser } from '@/lib/userApi';
import BottomNav from '@/components/user/BottomNav';
import { toast } from 'sonner';

export default function TeamPage() {
  const { user } = useUserAuth();
  const [team, setTeam] = useState<{ l1: PlatformUser[]; l2: PlatformUser[]; l3: PlatformUser[] }>({ l1: [], l2: [], l3: [] });
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3>(1);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setTeam(await getTeamData(user.id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  if (!user) return null;

  // FIXED - Full link with project name + hash for HashRouter
  const referralLink = `https://mim572.github.io/Infnix-mobile-9bugue-36088-20260919/#/register?ref=${encodeURIComponent(user.referral_code)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const handleShare = async () => {
  const msg = `Join Infinix Earnings and get 7,000 UGX bonus! Invest in Infinix Mobile packages and earn daily. Use my referral link:\n${referralLink}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Infinix Earnings',
        text: msg,
        url: referralLink,
      });
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    // User cancelled sharing — do nothing
  }
};

  const levelData = [
    { level: 1 as const, users: team.l1, rate: '27%', color: 'text-blue-400', bg: 'border-blue-500/30 bg-blue-500/10' },
    { level: 2 as const, users: team.l2, rate: '2%', color: 'text-green-400', bg: 'border-green-500/30 bg-green-500/10' },
    { level: 3 as const, users: team.l3, rate: '1%', color: 'text-yellow-400', bg: 'border-yellow-500/30 bg-yellow-500/10' },
  ];

  const activeData = levelData.find(l => l.level === activeLevel)!;
  const totalTeam = team.l1.length + team.l2.length + team.l3.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" /> My Team
        </h1>
        <button onClick={load} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Referral Code & Share */}
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 rounded-2xl p-4">
          <p className="text-muted-foreground text-sm mb-1">Your Referral Code</p>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-2xl font-bold text-white font-mono tracking-widest">{user.referral_code}</p>
            <button onClick={handleCopyLink} className="ml-auto w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <Copy className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-sm font-medium transition-colors"
            >
              <Copy className="w-4 h-4" /> Copy Link
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-3 gap-2">
          {levelData.map(l => (
            <div key={l.level} className={`border rounded-xl p-3 text-center ${l.bg}`}>
              <p className={`text-xl font-bold ${l.color}`}>{l.users.length}</p>
              <p className="text-muted-foreground text-xs">Level {l.level}</p>
              <p className={`text-xs font-semibold ${l.color}`}>{l.rate}</p>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Total Team</p>
            <p className="text-2xl font-bold text-white">{totalTeam}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">Referral Earnings</p>
            <p className="text-lg font-bold text-purple-400">{user.referral_earnings.toLocaleString()} UGX</p>
          </div>
        </div>

        {/* Level Tabs */}
        <div>
          <div className="flex gap-2 mb-4">
            {levelData.map(l => (
              <button
                key={l.level}
                onClick={() => setActiveLevel(l.level)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeLevel === l.level? 'bg-accent text-white' : 'bg-secondary text-muted-foreground'
                }`}
              >
                L{l.level} ({l.users.length})
              </button>
            ))}
          </div>

          {loading? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeData.users.length === 0? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No Level {activeLevel} members yet.</p>
              <p className="text-xs mt-1">Share your link to grow your team!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeData.users.map(u => (
                <div key={u.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${activeData.bg}`}>
                    <span className={activeData.color}>{u.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{u.name}</p>
                    <p className="text-muted-foreground text-xs">{u.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-xs text-white">{new Date(u.registered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commission Rules */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3">Commission Structure</h3>
          <div className="space-y-2">
            {[
              { level: 'L1 Direct', rate: '27%', desc: 'When your direct invite buys a package', color: 'text-blue-400' },
              { level: 'L2', rate: '2%', desc: "When your L1's invite buys a package", color: 'text-green-400' },
              { level: 'L3', rate: '1%', desc: "When your L2's invite buys a package", color: 'text-yellow-400' },
            ].map(r => (
              <div key={r.level} className="flex items-start gap-3 bg-secondary rounded-xl p-3">
                <span className={`font-bold text-sm min-w-[32px] ${r.color}`}>{r.rate}</span>
                <div>
                  <p className="text-white text-sm font-medium">{r.level}</p>
                  <p className="text-muted-foreground text-xs">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
