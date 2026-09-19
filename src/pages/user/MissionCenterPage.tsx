import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, CheckCircle, Lock, Gift, RefreshCw, Target } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { getTeamData } from '@/lib/userApi';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const MILESTONES = [
  {
    id: 'mission_l1_5',
    title: 'Starter Recruiter',
    desc: 'Invite 5 L1 investors who buy any package',
    target: 5,
    reward: 5000,
    color: 'from-blue-600/30 to-blue-800/10 border-blue-500/30',
    iconColor: 'text-blue-400',
    bgIcon: 'bg-blue-500/20',
    tier: 'Bronze',
    tierColor: 'text-amber-600',
  },
  {
    id: 'mission_l1_15',
    title: 'Rising Leader',
    desc: 'Invite 15 L1 investors who buy any package',
    target: 15,
    reward: 16000,
    color: 'from-purple-600/30 to-purple-800/10 border-purple-500/30',
    iconColor: 'text-purple-400',
    bgIcon: 'bg-purple-500/20',
    tier: 'Silver',
    tierColor: 'text-slate-300',
  },
  {
    id: 'mission_l1_50',
    title: 'Top Earner',
    desc: 'Invite 50 L1 investors who buy any package',
    target: 50,
    reward: 40000,
    color: 'from-yellow-600/30 to-orange-800/10 border-yellow-500/30',
    iconColor: 'text-yellow-400',
    bgIcon: 'bg-yellow-500/20',
    tier: 'Gold',
    tierColor: 'text-yellow-400',
  },
];

export default function MissionCenterPage() {
  const { user, reloadUser } = useUserAuth();
  const navigate = useNavigate();
  const [l1Count, setL1Count] = useState(0);
  const [l1WithPackage, setL1WithPackage] = useState(0);
  const [claimedMissions, setClaimedMissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Get L1 team
    const team = await getTeamData(user.id);
    setL1Count(team.l1.length);

    // Count L1 members who have bought at least one package
    const l1Ids = team.l1.map(u => u.id);
    let investorCount = 0;
    if (l1Ids.length > 0) {
      const { data: pkgs } = await supabase
        .from('investment_packages')
        .select('user_id')
        .in('user_id', l1Ids)
        .neq('product_name', 'RECHARGE')
        .in('status', ['active', 'expired']);
      const unique = new Set((pkgs || []).map((p: any) => p.user_id));
      investorCount = unique.size;
    }
    setL1WithPackage(investorCount);

    // Load claimed missions from mission_claims table
    const { data: claims } = await supabase
      .from('mission_claims')
      .select('mission_id')
      .eq('user_id', user.id);
    setClaimedMissions((claims || []).map((c: any) => c.mission_id));

    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleClaim = async (missionId: string, reward: number, target: number) => {
    if (!user) return;
    if (l1WithPackage < target) {
      toast.error(`You need ${target} investors — currently at ${l1WithPackage}.`);
      return;
    }
    if (claimedMissions.includes(missionId)) {
      toast.error('Already claimed.');
      return;
    }
    setClaimingId(missionId);

    // Insert mission claim
    const { error: claimErr } = await supabase
      .from('mission_claims')
      .insert({ user_id: user.id, mission_id: missionId });

    if (claimErr) {
      toast.error('Claim failed. Try again.');
      setClaimingId(null);
      return;
    }

    // Credit reward to wallet
    const { data: userData } = await supabase
      .from('platform_users')
      .select('wallet_balance, total_earnings')
      .eq('id', user.id)
      .single();

    if (userData) {
      await supabase
        .from('platform_users')
        .update({
          wallet_balance: userData.wallet_balance + reward,
          total_earnings: userData.total_earnings + reward,
        })
        .eq('id', user.id);
    }

    setClaimedMissions(prev => [...prev, missionId]);
    await reloadUser();
    toast.success(`+${reward.toLocaleString()} UGX mission reward claimed!`);
    setClaimingId(null);
  };

  if (!user) return null;

  const totalRewardsEarned = MILESTONES
    .filter(m => claimedMissions.includes(m.id))
    .reduce((s, m) => s + m.reward, 0);

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" /> Mission Center
          </h1>
          <p className="text-muted-foreground text-xs">Complete missions to earn bonus rewards</p>
        </div>
        <button
          onClick={load}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Summary Banner */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-800/10 border border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Referral Missions</h2>
              <p className="text-muted-foreground text-xs mt-0.5">Invite friends who invest to earn bonus UGX rewards</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/20 rounded-xl p-2.5 text-center">
              <p className="text-white font-bold text-lg">{l1Count}</p>
              <p className="text-muted-foreground text-[10px]">L1 Invites</p>
            </div>
            <div className="bg-black/20 rounded-xl p-2.5 text-center">
              <p className="text-green-400 font-bold text-lg">{l1WithPackage}</p>
              <p className="text-muted-foreground text-[10px]">Investors</p>
            </div>
            <div className="bg-black/20 rounded-xl p-2.5 text-center">
              <p className="text-yellow-400 font-bold text-sm">{totalRewardsEarned.toLocaleString()}</p>
              <p className="text-muted-foreground text-[10px]">Earned UGX</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" /> How Missions Work
          </h3>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>1. Share your referral link and invite friends to register</p>
            <p>2. Your L1 invite must <span className="text-white font-medium">buy at least one investment package</span></p>
            <p>3. Once you reach the milestone target, click Claim to receive your reward</p>
            <p>4. Each mission can only be claimed once</p>
          </div>
        </div>

        {/* Mission Cards */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {MILESTONES.map((m) => {
              const isClaimed = claimedMissions.includes(m.id);
              const progress = Math.min(l1WithPackage, m.target);
              const progressPct = Math.round((progress / m.target) * 100);
              const isReady = l1WithPackage >= m.target && !isClaimed;
              const isClaiming = claimingId === m.id;

              // Locked if previous milestone not claimed (optional UX — we allow claiming in order)
              const mIndex = MILESTONES.indexOf(m);
              const prevMission = mIndex > 0 ? MILESTONES[mIndex - 1] : null;
              const prevClaimed = prevMission ? claimedMissions.includes(prevMission.id) : true;
              const isLocked = !prevClaimed && !isClaimed;

              return (
                <div
                  key={m.id}
                  className={`bg-gradient-to-br ${m.color} border rounded-2xl p-4 transition-all ${
                    isClaimed ? 'opacity-70' : ''
                  }`}
                >
                  {/* Mission Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl ${m.bgIcon} flex items-center justify-center shrink-0`}>
                        {isClaimed ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : isLocked ? (
                          <Lock className={`w-5 h-5 ${m.iconColor} opacity-50`} />
                        ) : (
                          <Trophy className={`w-6 h-6 ${m.iconColor}`} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-bold text-sm">{m.title}</h3>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/20 ${m.tierColor}`}>
                            {m.tier}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">{m.desc}</p>
                      </div>
                    </div>

                    {/* Reward Badge */}
                    <div className="text-right shrink-0 ml-2">
                      <div className="flex items-center gap-1 justify-end">
                        <Gift className={`w-3.5 h-3.5 ${m.iconColor}`} />
                        <span className={`font-bold text-sm ${m.iconColor}`}>
                          {m.reward.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[10px]">UGX reward</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {progress} / {m.target} investors
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${
                        progressPct === 100 ? 'text-green-400' : m.iconColor
                      }`}>
                        {progressPct}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isClaimed
                            ? 'bg-green-500'
                            : progressPct === 100
                            ? 'bg-gradient-to-r from-green-500 to-green-400'
                            : `bg-gradient-to-r ${
                                m.iconColor === 'text-blue-400'   ? 'from-blue-600 to-blue-400'   :
                                m.iconColor === 'text-purple-400' ? 'from-purple-600 to-purple-400' :
                                'from-yellow-600 to-yellow-400'
                              }`
                        }`}
                        style={{ width: `${isClaimed ? 100 : progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Claim Button */}
                  {isClaimed ? (
                    <div className="w-full flex items-center justify-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 font-semibold py-3 rounded-xl text-sm">
                      <CheckCircle className="w-4 h-4" /> Reward Claimed!
                    </div>
                  ) : isLocked ? (
                    <div className="w-full flex items-center justify-center gap-2 bg-secondary border border-border text-muted-foreground font-semibold py-3 rounded-xl text-sm opacity-60">
                      <Lock className="w-4 h-4" /> Complete previous mission first
                    </div>
                  ) : (
                    <button
                      onClick={() => handleClaim(m.id, m.reward, m.target)}
                      disabled={!isReady || isClaiming}
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm transition-all ${
                        isReady
                          ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/20 active:scale-[0.98]'
                          : 'bg-secondary border border-border text-muted-foreground opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {isClaiming ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : isReady ? (
                        <>
                          <Gift className="w-4 h-4" />
                          Claim {m.reward.toLocaleString()} UGX Reward
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          Need {m.target - l1WithPackage} more investor{m.target - l1WithPackage > 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Share CTA */}
        <div
          onClick={() => navigate('/team')}
          className="bg-gradient-to-r from-accent/20 to-blue-800/20 border border-accent/30 rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Grow Your Team</p>
            <p className="text-muted-foreground text-xs mt-0.5">Share your referral link and invite more investors →</p>
          </div>
        </div>
      </div>
    </div>
  );
}
