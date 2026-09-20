import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, User, Gift, Smartphone } from 'lucide-react';
import { registerUser } from '@/lib/userApi';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { toast } from 'sonner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useUserAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [referral, setReferral] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // FIXED: Read ref from BOTH?ref= before # and after #/register?ref=
  useEffect(() => {
    let ref = searchParams.get('ref');

    if (!ref) {
      // For HashRouter: link is /#/register?ref=CODE
      // window.location.hash contains "#/register?ref=CODE"
      const hash = window.location.hash;
      if (hash.includes('ref=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        ref = params.get('ref');
      }
    }

    if (!ref) {
      // Fallback: check full URL string
      const fullUrl = window.location.href;
      const match = fullUrl.match(/[?&]ref=([^&]+)/);
      if (match) ref = match[1];
    }

    if (ref) {
      setReferral(decodeURIComponent(ref).toUpperCase());
    }
  }, [searchParams]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name ||!phone ||!password) { toast.error('Fill in all required fields.'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (password!== confirm) { toast.error('Passwords do not match.'); return; }
    if (!phone.match(/^0[0-9]{9}$/)) { toast.error('Enter a valid Ugandan phone number (e.g. 07XXXXXXXX).'); return; }

    setLoading(true);
    const { user, error } = await registerUser(name.trim(), phone.trim(), password, referral.trim() || undefined);
    if (error ||!user) {
      toast.error(error || 'Registration failed.');
      setLoading(false);
      return;
    }
    setUser(user);
    toast.success('Welcome! You received 7,000 UGX bonus 🎉');
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-gradient-to-b from-[#1a0505] via-[#0a0f1e] to-background px-6 pt-12 pb-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3 shadow-xl shadow-primary/20">
          <Smartphone className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Create Account</h1>
        <p className="text-muted-foreground text-sm">Get 7,000 UGX registration bonus instantly</p>
      </div>

      <div className="flex-1 px-6 py-6 pb-8">
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Full Name <span className="text-red-400">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Phone Number <span className="text-red-400">*</span></label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPw? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-11 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Confirm Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Referral Code (Optional)</label>
            <div className="relative">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={referral}
                onChange={e => setReferral(e.target.value.toUpperCase())}
                placeholder="Enter referral code"
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm font-mono"
              />
            </div>
            {referral && (
              <p className="text-xs text-green-400 mt-1">✓ Referral code applied: {referral}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-4 rounded-xl transition-opacity disabled:opacity-60 text-sm mt-2"
          >
            {loading? 'Creating Account...' : 'Create Account & Get Bonus'}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-semibold">Sign In</Link>
        </p>

        <div className="mt-6 bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ 1 account per person. Fake accounts = Permanent Ban.
          </p>
        </div>
      </div>
    </div>
  );
}
