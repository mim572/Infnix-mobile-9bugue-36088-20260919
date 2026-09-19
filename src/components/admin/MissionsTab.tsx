import { useState, useEffect } from 'react';
import { Trophy, Users, CheckCircle, Gift, RefreshCw, Target, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface MissionClaim {
  id: string;
  user_id: string;
  mission_id: string;
  claimed_at: string;
  user?: {
    name: string;
    phone: string;
  };
}

interface MissionStats {
  mission_id: string;
  title: string;
  reward: number;
  claimCount: number;
  totalPaid: number;
}

const MILESTONES = [
  { id: 'mission_l1_5',  title: 'Starter Recruiter', desc: 'Invite 5 L1 investors',  target: 5,  reward: 5000,  tier: 'Bronze', color: 'text-amber-600' },
  { id: 'mission_l1_15', title: 'Rising Leader',      desc: 'Invite 15 L1 investors', target: 15, reward: 16000, tier: 'Silver', color: 'text-slate-300' },
  { id: 'mission_l1_50', title: 'Top Earner',          desc: 'Invite 50 L1 investors', target: 50, reward: 40000, tier: 'Gold',   color: 'text-yellow-400' },
];

export default function MissionsTab() {
  const [claims, setClaims] = useState<MissionClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMission, setFilterMission] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mission_claims')
      .select('id, user_id, mission_id, claimed_at')
      .order('claimed_at', { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    // Enrich with user info
    const enriched: MissionClaim[] = [];
    for (const claim of (data || [])) {
      const { data: u } = await supabase
        .from('platform_users')
        .select('name, phone')
        .eq('id', claim.user_id)
        .single();
      enriched.push({ ...claim, user: u || undefined });
    }
    setClaims(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this mission claim? This does NOT refund the reward.')) return;
    setDeletingId(id);
    const { error } = await supabase.from('mission_claims').delete().eq('id', id);
    if (error) { toast.error('Delete failed.'); }
    else { toast.success('Claim removed.'); setClaims(prev => prev.filter(c => c.id !== id)); }
    setDeletingId(null);
  };

  // Compute stats per milestone
  const missionStats: MissionStats[] = MILESTONES.map(m => ({
    mission_id: m.id,
    title: m.title,
    reward: m.reward,
    claimCount: claims.filter(c => c.mission_id === m.id).length,
    totalPaid: claims.filter(c => c.mission_id === m.id).length * m.reward,
  }));

  const totalPaidOut = missionStats.reduce((s, m) => s + m.totalPaid, 0);
  const totalClaims = claims.length;

  const filtered = filterMission === 'all'
    ? claims
    : claims.filter(c => c.mission_id === filterMission);

  const getMilestone = (id: string) => MILESTONES.find(m => m.id === id);

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalClaims}</p>
          <p className="text-muted-foreground text-xs mt-1">Total Claims</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{totalPaidOut.toLocaleString()}</p>
          <p className="text-muted-foreground text-xs mt-1">UGX Paid Out</p>
        </div>
      </div>

      {/* Per-Mission Breakdown */}
      <div className="space-y-2">
        {missionStats.map(ms => {
          const m = MILESTONES.find(x => x.id === ms.mission_id)!;
          return (
            <div key={ms.mission_id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Trophy className={`w-5 h-5 ${m.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{ms.title}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/20 ${m.color}`}>{m.tier}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{m.desc} · {m.reward.toLocaleString()} UGX each</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">{ms.claimCount}</p>
                <p className="text-muted-foreground text-[10px]">claims</p>
                <p className="text-yellow-400 text-xs font-semibold">{ms.totalPaid.toLocaleString()} UGX</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter + Refresh */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-none">
          {[{ key: 'all', label: 'All' }, ...MILESTONES.map(m => ({ key: m.id, label: m.tier }))].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterMission(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterMission === f.key
                  ? 'bg-accent text-white'
                  : 'bg-secondary text-muted-foreground hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No mission claims yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(claim => {
            const m = getMilestone(claim.mission_id);
            return (
              <div key={claim.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-sm">{claim.user?.name || 'Unknown'}</p>
                        {m && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/20 ${m.color}`}>
                            {m.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">{claim.user?.phone || claim.user_id.slice(0, 8)}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {m?.title || claim.mission_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 justify-end mb-1">
                      <Gift className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-sm">{m?.reward.toLocaleString()} UGX</span>
                    </div>
                    <p className="text-muted-foreground text-[10px]">
                      {new Date(claim.claimed_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {new Date(claim.claimed_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Delete */}
                <div className="mt-3 pt-3 border-t border-border flex justify-end">
                  <button
                    onClick={() => handleDelete(claim.id)}
                    disabled={deletingId === claim.id}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingId === claim.id ? 'Removing...' : 'Remove Claim'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
