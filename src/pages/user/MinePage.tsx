import { useState } from 'react';
import { User, LogOut, Wallet, ChevronRight, Shield, ExternalLink, RefreshCw, Lock, Eye, EyeOff, Info, ReceiptText, Gift } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import { saveWallet, changePassword } from '@/lib/userApi';
import BottomNav from '@/components/user/BottomNav';
import { toast } from 'sonner';

export default function MinePage() {
  const { user, logout, reloadUser } = useUserAuth();
  const navigate = useNavigate();
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [wNetwork, setWNetwork] = useState<'MTN' | 'Airtel'>((user?.wallet_network as 'MTN' | 'Airtel') || 'MTN');
  const [wPhone, setWPhone] = useState(user?.wallet_phone || '');
  const [wName, setWName] = useState(user?.wallet_name || '');
  const [savingWallet, setSavingWallet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  if (!user) return null;

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error('Fill in all password fields.'); return; }
    if (newPw.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { toast.error('New passwords do not match.'); return; }
    if (currentPw === newPw) { toast.error('New password must be different from current password.'); return; }
    setChangingPw(true);
    const { error } = await changePassword(user.id, currentPw, newPw);
    if (error) { toast.error(error); } else {
      toast.success('Password changed successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setShowChangePw(false);
    }
    setChangingPw(false);
  };

  const handleSaveWallet = async () => {
    if (!wPhone || !wName) { toast.error('Fill in all wallet fields.'); return; }
    setSavingWallet(true);
    const { error } = await saveWallet(user.id, wNetwork, wPhone, wName);
    if (error) { toast.error(error); } else { toast.success('Wallet saved!'); await reloadUser(); setShowWalletForm(false); }
    setSavingWallet(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await reloadUser();
    setRefreshing(false);
    toast.success('Account refreshed.');
  };

  const stats = [
    { label: 'Wallet Balance', value: user.wallet_balance.toLocaleString() + ' UGX', color: 'text-green-400' },
    { label: 'Total Earnings', value: user.total_earnings.toLocaleString() + ' UGX', color: 'text-blue-400' },
    { label: 'Total Withdrawn', value: user.total_withdrawals.toLocaleString() + ' UGX', color: 'text-orange-400' },
    { label: 'Referral Earnings', value: user.referral_earnings.toLocaleString() + ' UGX', color: 'text-purple-400' },
    { label: 'Daily Earnings', value: user.daily_earnings.toLocaleString() + ' UGX', color: 'text-yellow-400' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-accent" /> My Account
        </h1>
        <button onClick={handleRefresh} disabled={refreshing} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-muted-foreground text-sm">{user.phone}</p>
            </div>
          </div>
          <div className="bg-black/20 rounded-xl p-3">
            <p className="text-muted-foreground text-xs mb-0.5">Your Referral Code</p>
            <p className="text-white font-bold font-mono tracking-widest text-lg">{user.referral_code}</p>
          </div>
        </div>

        {/* Earnings Stats */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3">My Earnings</h3>
          <div className="space-y-2.5">
            {stats.map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">{s.label}</p>
                <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2"><Wallet className="w-4 h-4 text-accent" /> Withdrawal Wallet</h3>
            <button onClick={() => setShowWalletForm(!showWalletForm)} className="text-accent text-xs font-semibold">
              {user.wallet_phone ? 'Edit' : 'Add Wallet'}
            </button>
          </div>

          {user.wallet_phone ? (
            <div className="flex items-center gap-3 bg-secondary rounded-xl p-3">
              <div className={`w-3 h-3 rounded-full ${user.wallet_network === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'}`} />
              <div>
                <p className="text-white text-sm font-medium">{user.wallet_network}: {user.wallet_phone}</p>
                <p className="text-muted-foreground text-xs">{user.wallet_name}</p>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowWalletForm(true)} className="w-full bg-secondary hover:bg-border text-muted-foreground py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Wallet className="w-4 h-4" /> Add Withdrawal Wallet
            </button>
          )}

          {showWalletForm && (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-2">
                {(['MTN', 'Airtel'] as const).map(n => (
                  <button key={n} onClick={() => setWNetwork(n)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${wNetwork === n ? 'border-accent bg-accent/10 text-white' : 'border-border bg-secondary text-muted-foreground'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full mb-1 ${n === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    {n} Money
                  </button>
                ))}
              </div>
              <input type="tel" value={wPhone} onChange={e => setWPhone(e.target.value)} placeholder="07XXXXXXXX"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <input type="text" value={wName} onChange={e => setWName(e.target.value)} placeholder="Account Name"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <button onClick={handleSaveWallet} disabled={savingWallet}
                className="w-full bg-accent text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
                {savingWallet ? 'Saving...' : 'Save Wallet'}
              </button>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowChangePw(!showChangePw)}
            className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/50 transition-colors"
          >
            <Lock className="w-4 h-4 text-accent" />
            <span className="text-white text-sm font-medium flex-1">Change Password</span>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showChangePw ? 'rotate-90' : ''}`} />
          </button>

          {showChangePw && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {/* Current Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Current password"
                  className="w-full bg-secondary border border-border rounded-xl pl-10 pr-11 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* New Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full bg-secondary border border-border rounded-xl pl-10 pr-11 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm New Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              {newPw && confirmPw && newPw !== confirmPw && (
                <p className="text-red-400 text-xs">Passwords do not match.</p>
              )}
              {newPw && newPw.length > 0 && newPw.length < 6 && (
                <p className="text-yellow-400 text-xs">Password must be at least 6 characters.</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowChangePw(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                  className="flex-1 bg-secondary text-muted-foreground font-semibold py-3 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPw}
                  className="flex-1 bg-accent text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
                >
                  {changingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {[
            { icon: Info, label: 'About Us', to: '/about' },
            { icon: ReceiptText, label: 'My Records', to: '/records' },
            { icon: Gift, label: 'Redeem Gift Code', to: '/redeem' },
            { icon: User, label: 'My Team', to: '/team' },
            { icon: Shield, label: 'My Products', to: '/my-products' },
          ].map((item, i) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/50 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <item.icon className="w-4 h-4 text-accent" />
              <span className="text-white text-sm font-medium flex-1">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Support */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {[
            { label: 'Official Support', href: 'https://t.me/+5hk-VcavLmwyMzFk', color: 'text-blue-400' },
            { label: 'Group Chat', href: 'https://t.me/+kH7QuzE6dp0xZmVk', color: 'text-green-400' },
            { label: 'WhatsApp Support', href: 'https://chat.whatsapp.com/Jb1To8jH9zl1c3J2A3PoaQ?s=cl&p=a&mlu=4&ilr=4', color: 'text-[#25D366]' },
          ].map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <ExternalLink className={`w-4 h-4 ${item.color}`} />
              <span className="text-white text-sm font-medium flex-1">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold py-4 rounded-xl text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <p className="text-center text-muted-foreground text-xs pb-2">
          Infinix Earnings Platform • Uganda's Most Trusted Investment
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
