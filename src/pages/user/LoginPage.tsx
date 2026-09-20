import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Smartphone } from 'lucide-react';
import { loginUser } from '@/lib/userApi';
import { adminLogin } from '@/lib/adminData';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useUserAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) { toast.error('Fill in all fields.'); return; }
    setLoading(true);
    const { user, error } = await loginUser(phone.trim(), password);
    if (error || !user) {
      toast.error(error || 'Login failed.');
      setLoading(false);
      return;
    }

    // FIXED: Check admin by is_admin OR phone 0750757774
    const isAdminPhone = phone.includes('750757774') || (user as any).phone?.includes('750757774');
    const isAdminFlag = (user as any).is_admin === true;

    if (isAdminPhone || isAdminFlag) {
      // Use REAL admin password from adminData.ts
      adminLogin('Nabakoozamilly@2323');
      setUser(user);
      toast.success('Admin detected - redirecting to admin panel');
      navigate('/admin');
      return;
    }

    setUser(user);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-gradient-to-b from-[#1a0505] via-[#0a0f1e] to-background px-6 pt-16 pb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
          <Smartphone className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Infinix Earnings</h1>
        <p className="text-muted-foreground text-sm">Uganda's Most Trusted Investment Platform</p>
      </div>
      <div className="flex-1 px-6 py-8">
        <h2 className="text-xl font-bold text-white mb-6">Welcome Back</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="w-full bg-secondary border border-border rounded-xl pl-10 pr-11 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-4 rounded-xl transition-opacity disabled:opacity-60 text-sm mt-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-muted-foreground text-sm mt-6">New here? <Link to="/register" className="text-accent font-semibold">Create Account</Link></p>
      </div>
    </div>
  );
}
