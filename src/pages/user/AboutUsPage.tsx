import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, CheckCircle, Users, TrendingUp, Shield, Clock } from 'lucide-react';

const PRODUCTS_TABLE = [
  { name: 'Infinix Smart 8', invest: '15,000', daily: '3,000', days: 60, total: '180,000', group: 'Group 1' },
  { name: 'Infinix Hot 40i', invest: '30,000', daily: '7,000', days: 60, total: '420,000', group: 'Group 1' },
  { name: 'Infinix Hot 40', invest: '50,000', daily: '12,500', days: 180, total: '2,250,000', group: 'Group 2' },
  { name: 'Infinix Note 40', invest: '100,000', daily: '26,000', days: 180, total: '4,680,000', group: 'Group 2' },
  { name: 'Infinix Note 40 Pro', invest: '150,000', daily: '40,000', days: 180, total: '7,200,000', group: 'Group 2' },
  { name: 'Infinix Zero 30', invest: '300,000', daily: '90,000', days: 210, total: '18,900,000', group: 'Group 3' },
  { name: 'Infinix Zero 30 5G', invest: '500,000', daily: '160,000', days: 210, total: '33,600,000', group: 'Group 3' },
  { name: 'Infinix Zero 40', invest: '800,000', daily: '280,200', days: 210, total: '58,842,000', group: 'Group 3' },
  { name: 'Infinix Zero Ultra', invest: '1,200,000', daily: '450,000', days: 210, total: '94,500,000', group: 'Group 3' },
  { name: 'Infinix GT 20 Pro', invest: '1,300,000', daily: '600,000', days: 210, total: '126,000,000', group: 'Group 3' },
  { name: 'Infinix Zero Fold VIP', invest: '2,000,000', daily: '800,000', days: 210, total: '168,000,000', group: 'Group 3' },
];

const GROUP_BADGE: Record<string, string> = {
  'Group 1': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Group 2': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  'Group 3': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
};

export default function AboutUsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-base font-bold text-white">About Us</h1>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-primary/30 to-accent/30 border border-white/10 rounded-2xl p-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3 shadow-xl">
            <span className="text-2xl font-black text-white">IE</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Infinix Earnings</h2>
          <p className="text-accent text-sm font-semibold mb-3">Uganda's Most Trusted Investment Platform</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Infinix Earnings connects everyday Ugandans with high-return investment opportunities through
            Infinix Mobile phone packages — invest once, earn daily, withdraw freely.
          </p>
        </div>

        {/* Key Benefits */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" /> Platform Highlights
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'Registration Bonus', value: 'UGX 7,000 instantly on sign-up' },
              { label: 'Minimum Investment', value: 'UGX 15,000' },
              { label: 'Minimum Withdrawal', value: 'UGX 7,000' },
              { label: 'Withdrawal Tax', value: '18% deducted at source' },
              { label: 'Daily Withdrawals', value: 'Up to 2 per day, 24/7' },
              { label: 'Daily Check-In', value: '+100 UGX every 24 hours' },
              { label: 'Earnings Settled', value: 'Automatically every 24 hours' },
            ].map(item => (
              <div key={item.label} className="flex items-start justify-between gap-3">
                <p className="text-muted-foreground text-sm">{item.label}</p>
                <p className="text-white text-sm font-medium text-right max-w-[55%]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Investment Packages Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-white">Investment Plans</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">Product</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium">Invest (UGX)</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium">Daily (UGX)</th>
                  <th className="text-right px-3 py-2.5 text-muted-foreground font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTS_TABLE.map((p, i) => (
                  <tr key={p.name} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                    <td className="px-3 py-2.5">
                      <p className="text-white font-medium leading-tight">{p.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${GROUP_BADGE[p.group]}`}>
                        {p.group}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 text-blue-400 font-semibold">{p.invest}</td>
                    <td className="text-right px-3 py-2.5 text-green-400 font-semibold">{p.daily}</td>
                    <td className="text-right px-3 py-2.5 text-white">{p.days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-secondary/30">
            <p className="text-muted-foreground text-xs">
              * You must recharge and buy a product before withdrawing. Balance reduces only after admin approval.
            </p>
          </div>
        </div>

        {/* Commission Structure */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" /> Referral Commission Structure
          </h3>
          <div className="space-y-3">
            {[
              {
                level: 'Level 1 — Direct Invite',
                rate: '30%',
                desc: 'Invite a friend directly. When they invest, you instantly earn 30% of their investment amount.',
                color: 'border-blue-500/30 bg-blue-500/10',
                rateColor: 'text-blue-400',
                badge: 'L1',
              },
              {
                level: 'Level 2 — Your L1\'s Invite',
                rate: '2%',
                desc: "When someone your L1 invited invests, you receive 2% of that investment.",
                color: 'border-green-500/30 bg-green-500/10',
                rateColor: 'text-green-400',
                badge: 'L2',
              },
              {
                level: 'Level 3 — Your L2\'s Invite',
                rate: '1%',
                desc: "When someone your L2 invited invests, you receive 1% of that investment.",
                color: 'border-yellow-500/30 bg-yellow-500/10',
                rateColor: 'text-yellow-400',
                badge: 'L3',
              },
            ].map(c => (
              <div key={c.level} className={`border rounded-xl p-3.5 ${c.color}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.color} ${c.rateColor}`}>{c.badge}</span>
                    <p className="text-white text-sm font-semibold">{c.level}</p>
                  </div>
                  <span className={`text-xl font-black ${c.rateColor}`}>{c.rate}</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-secondary rounded-xl p-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Commission is credited to your account balance instantly after admin approves the referred user's package. You can withdraw it immediately.
            </p>
          </div>
        </div>

        {/* Withdrawal Rules */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" /> Withdrawal Rules
          </h3>
          <div className="space-y-2.5">
            {[
              { rule: 'Minimum Amount', detail: 'UGX 7,000 per request' },
              { rule: 'Tax Deduction', detail: '18% deducted from withdrawal amount' },
              { rule: 'Daily Limit', detail: 'Maximum 2 withdrawals per day' },
              { rule: 'Processing Time', detail: 'Within 24 hours after admin approval' },
              { rule: 'Pre-Condition', detail: 'Must recharge & buy a product first' },
              { rule: 'Balance Update', detail: 'Balance only deducted after admin approves' },
              { rule: 'Supported Networks', detail: 'MTN Mobile Money & Airtel Money' },
            ].map(r => (
              <div key={r.rule} className="flex items-start gap-3 bg-secondary/50 rounded-xl px-3 py-2.5">
                <Clock className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">{r.rule}</p>
                  <p className="text-muted-foreground text-xs">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-white mb-3">How It Works</h3>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Register', desc: 'Sign up with your phone number and receive a 7,000 UGX welcome bonus.' },
              { step: '2', title: 'Recharge', desc: 'Deposit funds (min 15,000 UGX) via MTN or Airtel Mobile Money.' },
              { step: '3', title: 'Buy a Package', desc: 'Choose an Infinix Mobile package that fits your budget.' },
              { step: '4', title: 'Earn Daily', desc: 'After admin approval, income is automatically added to your balance every 24 hours.' },
              { step: '5', title: 'Invite & Earn More', desc: 'Share your referral link. Earn 30%/2%/1% commissions from your team.' },
              { step: '6', title: 'Withdraw', desc: 'Request payouts anytime. Admin sends to your MTN or Airtel account.' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{s.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Rules */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <h3 className="font-bold text-red-400 mb-3">Important Platform Rules</h3>
          <div className="space-y-2">
            {[
              '1 Account per person — multiple accounts result in a Permanent Ban',
              'Fake payment proof submissions will lead to immediate account suspension',
              'Fake referrals or bot registrations = Permanent Ban',
              'Daily income runs from your purchase time, automatically for the package duration',
              'Expired packages stop earning — buy a new package to continue',
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 text-xs font-bold mt-0.5 shrink-0">⚠</span>
                <p className="text-muted-foreground text-xs leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Support Links */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-bold text-white">Customer Support</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Join our Telegram channels for assistance and updates</p>
          </div>
          <a
            href="https://t.me/+5hk-VcavLmwyMzFk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Join Official Telegram Support</p>
              <p className="text-muted-foreground text-xs">Direct help from the admin team</p>
            </div>
          </a>
          <a
            href="https://t.me/+5hk-VcavLmwyMzFk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors border-b border-border"
          >
            <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Community Group Chat</p>
              <p className="text-muted-foreground text-xs">Connect with other investors & get tips</p>
            </div>
          </a>
          <a
            href="https://chat.whatsapp.com/Jb1To8jH9zl1c3J2A3PoaQ?s=cl&p=a&mlu=4&ilr=4"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/20 flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-[#25D366]" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">WhatsApp Support</p>
              <p className="text-muted-foreground text-xs">Chat with us on WhatsApp</p>
            </div>
          </a>
        </div>

        <p className="text-center text-muted-foreground text-xs pb-2">
          Infinix Earnings Platform · Uganda © 2026
        </p>
      </div>
    </div>
  );
}
