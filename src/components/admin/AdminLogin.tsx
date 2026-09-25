import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, Plus } from 'lucide-react';
import { adminLogin } from '@/lib/adminData';
import { toast } from 'sonner';

interface Props {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [showRedeemSection, setShowRedeemSection] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (adminLogin(password)) {
        toast.success('Welcome, Admin!');
        onLogin();
      } else {
        toast.error('Invalid password. Access denied.');
      }
      setLoading(false);
    }, 600);
  };

  const handleAddRedeemCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) {
      toast.error('Please enter a redeem code');
      return;
    }

    setRedeemLoading(true);
    setTimeout(() => {
      // TODO: Add your redeem code logic here
      // Example: addRedeemCode(redeemCode)
      toast.success(`Redeem code "${redeemCode}" added successfully!`);
      setRedeemCode('');
      setRedeemLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-red-800 mb-4 shadow-lg shadow-primary/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Infinix Mobile Earning Platform</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Secure Access Required</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-primary hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Access Dashboard
                </>
              )}
            </button>
          </form>

          {/* Redeem Code Section */}
          <div className="mt-6 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setShowRedeemSection(!showRedeemSection)}
              className="w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Redeem Code
              </span>
              <span className="text-lg">{showRedeemSection ? '−' : '+'}</span>
            </button>

            {showRedeemSection && (
              <form onSubmit={handleAddRedeemCode} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Redeem Code
                  </label>
                  <input
                    type="text"
                    value={redeemCode}
                    onChange={e => setRedeemCode(e.target.value)}
                    placeholder="Enter new redeem code"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={redeemLoading || !redeemCode}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {redeemLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Code
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-4">
          Unauthorized access is prohibited and monitored.
        </p>
      </div>
    </div>
  );
}
