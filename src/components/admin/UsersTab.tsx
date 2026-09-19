import { useState, useEffect } from 'react';
import { Search, Users, ChevronDown, ChevronRight, Ban, Wallet, RefreshCw, PlusCircle, MinusCircle, X, AlertCircle } from 'lucide-react';
import { getUsers, banUser, getPackages, adjustUserBalance } from '@/lib/adminData';
import type { User, Package, ReferralNode } from '@/types/admin';
import { toast } from 'sonner';

// ─── Adjust Balance Modal ────────────────────────────────────────────────────
interface AdjustModalProps {
  user: User;
  onClose: () => void;
  onDone: () => void;
}

function AdjustBalanceModal({ user, onClose, onDone }: AdjustModalProps) {
  const [type, setType] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const presets = [5000, 10000, 20000, 50000, 100000];

  const handleSubmit = async () => {
    if (!isValid) { toast.error('Enter a valid amount.'); return; }
    if (type === 'deduct' && parsedAmount > user.wallet_balance) {
      toast.error(`Cannot deduct more than current balance (${user.wallet_balance.toLocaleString()} UGX).`);
      return;
    }
    setLoading(true);
    const { error } = await adjustUserBalance(user.id, parsedAmount, type);
    if (error) {
      toast.error(error);
    } else {
      toast.success(
        type === 'add'
          ? `+${parsedAmount.toLocaleString()} UGX added to ${user.name}'s wallet.`
          : `-${parsedAmount.toLocaleString()} UGX deducted from ${user.name}'s wallet.`
      );
      onDone();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div className="bg-card border border-border rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-base">Adjust Balance</h3>
            <p className="text-muted-foreground text-xs mt-0.5">{user.name} · {user.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Balance */}
        <div className="bg-secondary rounded-2xl p-3 mb-4 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Current Balance</span>
          <span className="text-green-400 font-bold text-base">{user.wallet_balance.toLocaleString()} UGX</span>
        </div>

        {/* Add / Deduct Toggle */}
        <div className="flex bg-secondary rounded-xl p-1 mb-4">
          <button
            onClick={() => setType('add')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              type === 'add' ? 'bg-green-600 text-white shadow-lg' : 'text-muted-foreground'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Add
          </button>
          <button
            onClick={() => setType('deduct')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              type === 'deduct' ? 'bg-red-600 text-white shadow-lg' : 'text-muted-foreground'
            }`}
          >
            <MinusCircle className="w-4 h-4" /> Deduct
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1.5 block">Amount (UGX)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 10000"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white text-base font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {/* Preset Amounts */}
        <div className="flex gap-2 flex-wrap mb-4">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => setAmount(p.toString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                parsedAmount === p
                  ? 'bg-accent text-white border-accent'
                  : 'bg-secondary text-muted-foreground border-border hover:border-accent/50'
              }`}
            >
              {p >= 1000 ? `${p / 1000}K` : p}
            </button>
          ))}
        </div>

        {/* Preview */}
        {isValid && (
          <div className={`rounded-xl px-4 py-3 mb-4 flex items-center gap-2 ${
            type === 'add' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 ${type === 'add' ? 'text-green-400' : 'text-red-400'}`} />
            <p className={`text-xs leading-relaxed ${type === 'add' ? 'text-green-300' : 'text-red-300'}`}>
              Balance will change from{' '}
              <span className="font-bold">{user.wallet_balance.toLocaleString()} UGX</span> →{' '}
              <span className="font-bold">
                {(type === 'add'
                  ? user.wallet_balance + parsedAmount
                  : Math.max(0, user.wallet_balance - parsedAmount)
                ).toLocaleString()} UGX
              </span>
            </p>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-sm transition-all disabled:opacity-40 ${
            type === 'add'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {type === 'add' ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
              {type === 'add' ? 'Add' : 'Deduct'} {isValid ? parsedAmount.toLocaleString() : '—'} UGX
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Referral Tree ────────────────────────────────────────────────────────────
function buildTree(user: User, allUsers: User[], allPackages: Package[], level = 0): ReferralNode {
  const children = allUsers
    .filter(u => u.referred_by === user.id)
    .map(u => buildTree(u, allUsers, allPackages, level + 1));

  const pkgs = allPackages.filter(p => p.user_id === user.id && p.status !== 'pending');
  return {
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    level,
    children,
    totalInvested: pkgs.reduce((s, p) => s + p.amount, 0),
    joinedAt: user.registered_at,
  };
}

function TreeNode({ node }: { node: ReferralNode }) {
  const [open, setOpen] = useState(false);
  const colors = ['text-blue-400', 'text-green-400', 'text-yellow-400'];

  return (
    <div className={`${node.level > 0 ? 'ml-5 border-l border-border pl-3' : ''}`}>
      <div
        className="flex items-center gap-2 py-2 cursor-pointer hover:bg-secondary/50 rounded-lg px-2 transition-colors"
        onClick={() => node.children.length > 0 && setOpen(!open)}
      >
        {node.children.length > 0 ? (
          open ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${colors[Math.min(node.level - 1, 2)] || 'text-white'}`}>
              L{node.level}
            </span>
            <span className="text-white text-sm truncate">{node.userName}</span>
            {node.children.length > 0 && (
              <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{node.children.length}</span>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{node.userPhone} • {node.totalInvested.toLocaleString()} UGX invested</p>
        </div>
      </div>
      {open && node.children.map(child => <TreeNode key={child.userId} node={child} />)}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showTree, setShowTree] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<User | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [u, p] = await Promise.all([getUsers(), getPackages()]);
    setUsers(u);
    setAllPackages(p);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleBan = async (userId: string, currentState: boolean) => {
    await banUser(userId, currentState);
    toast.success(currentState ? 'User unbanned.' : 'User banned.');
    refresh();
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search)
  );

  const getReferralCount = (userId: string) => users.filter(u => u.referred_by === userId).length;
  const getActivePackageCount = (userId: string) => allPackages.filter(p => p.user_id === userId && p.status === 'active').length;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Adjust Balance Modal */}
      {adjustTarget && (
        <AdjustBalanceModal
          user={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onDone={() => { setAdjustTarget(null); refresh(); }}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">All Users ({filtered.length})</h2>
        <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-xl text-sm hover:bg-accent/10 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(user => (
            <div key={user.id} className={`bg-card border rounded-2xl p-4 ${user.is_banned ? 'border-red-500/40 opacity-70' : 'border-border'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">{user.name}</h3>
                    {user.is_banned && (
                      <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Banned</span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{user.phone}</p>
                  <p className="text-muted-foreground text-xs">Joined: {new Date(user.registered_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold text-sm">{user.wallet_balance.toLocaleString()} UGX</p>
                  <p className="text-muted-foreground text-xs">Balance</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Total Earned', value: user.total_earnings.toLocaleString() + ' UGX', color: 'text-blue-400' },
                  { label: 'Withdrawn', value: user.total_withdrawals.toLocaleString() + ' UGX', color: 'text-orange-400' },
                  { label: 'Active Pkgs', value: getActivePackageCount(user.id).toString(), color: 'text-green-400' },
                  { label: 'Referrals', value: getReferralCount(user.id).toString(), color: 'text-purple-400' },
                ].map(s => (
                  <div key={s.label} className="bg-secondary rounded-lg p-2 text-center">
                    <p className={`font-bold text-xs ${s.color}`}>{s.value}</p>
                    <p className="text-muted-foreground text-xs leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>

              {(user.wallet_network && user.wallet_phone) && (
                <div className="flex items-center gap-2 bg-secondary rounded-xl p-2 mb-3">
                  <Wallet className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{user.wallet_network}: {user.wallet_phone} — {user.wallet_name}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-3">
                Referral Code: <span className="text-accent font-mono">{user.referral_code}</span>
                {user.referred_by && (
                  <span className="ml-2 text-muted-foreground">
                    • Invited by: {users.find(u => u.id === user.referred_by)?.name || 'Unknown'}
                  </span>
                )}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowTree(showTree === user.id ? null : user.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent/20 hover:bg-accent/30 text-accent font-medium py-2 rounded-xl text-sm transition-colors"
                >
                  <Users className="w-4 h-4" />
                  {showTree === user.id ? 'Hide Team' : 'View Team'}
                </button>

                {/* Adjust Balance */}
                <button
                  onClick={() => setAdjustTarget(user)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-colors bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/20"
                >
                  <Wallet className="w-4 h-4" />
                  Adjust
                </button>

                <button
                  onClick={() => handleBan(user.id, user.is_banned)}
                  className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                    user.is_banned
                      ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                      : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  {user.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>

              {showTree === user.id && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" /> Referral Tree
                  </p>
                  {getReferralCount(user.id) === 0 ? (
                    <p className="text-muted-foreground text-sm">No referrals yet.</p>
                  ) : (
                    users
                      .filter(u => u.referred_by === user.id)
                      .map(child => (
                        <TreeNode key={child.id} node={buildTree(child, users, allPackages, 1)} />
                      ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
