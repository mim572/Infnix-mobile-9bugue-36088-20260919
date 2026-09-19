import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Copy, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { useUserAuth } from '@/contexts/UserAuthContext';
import { submitRecharge } from '@/lib/userApi';
import { toast } from 'sonner';

const ADMIN_NUMBERS = {
  MTN: { number: '0746085840', name: 'Nabakooza Milly', isMerchant: false },
  Airtel: { number: '7214223', name: 'Milly Nabakooza social investors', isMerchant: true },
};

const QUICK_AMOUNTS = [15000, 30000, 50000, 100000, 300000, 500000];

export default function RechargePage() {
  const { user, reloadUser } = useUserAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState<'MTN' | 'Airtel'>('MTN');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerName, setPayerName] = useState('');
  const [proof, setProof] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const adminNum = ADMIN_NUMBERS[network];
  const parsedAmount = parseInt(amount) || 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(adminNum.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`${(adminNum as any).isMerchant ? 'Merchant code' : 'Number'} copied!`);
  };

  const handleSubmit = async () => {
    if (!proof.trim()) { toast.error('Paste your payment confirmation SMS.'); return; }
    setLoading(true);
    const { error } = await submitRecharge(
      user,
      parsedAmount,
      payerName,
      payerPhone,
      network,
      proof
    );
    if (error) { toast.error(error); setLoading(false); return; }
    await reloadUser();
    toast.success('Recharge submitted! Admin will approve and credit your wallet.');
    navigate('/records');
  };

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
        <div>
          <h1 className="text-base font-bold text-white">Recharge Account</h1>
          <p className="text-muted-foreground text-xs">Min. deposit: 15,000 UGX</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                step > s ? 'bg-green-500 text-white' : step === s ? 'bg-accent text-white' : 'bg-secondary text-muted-foreground'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 rounded transition-colors ${step > s ? 'bg-green-500' : 'bg-secondary'}`} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Amount + Network ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Enter Amount & Network</h2>

            {/* Quick amount buttons */}
            <div>
              <p className="text-muted-foreground text-xs mb-2">Quick select amount (UGX)</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      parsedAmount === a
                        ? 'border-accent bg-accent/10 text-white'
                        : 'border-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    {a >= 1000000 ? (a / 1000000).toFixed(1) + 'M' : (a / 1000) + 'K'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Custom Amount (UGX)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 50000"
                min={15000}
                max={2000000}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
              />
              {parsedAmount > 0 && parsedAmount < 15000 && (
                <p className="text-red-400 text-xs mt-1">Minimum recharge is 15,000 UGX</p>
              )}
            </div>

            {/* Network Selection */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Payment Network</label>
              <div className="grid grid-cols-2 gap-3">
                {(['MTN', 'Airtel'] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setNetwork(n)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      network === n ? 'border-accent bg-accent/10' : 'border-border bg-secondary'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mb-2 ${n === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    <p className="font-bold text-white text-sm">{n}</p>
                    <p className="text-muted-foreground text-xs">Mobile Money</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sender details */}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Your Phone (sending from)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={payerPhone}
                  onChange={e => setPayerPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Your Name</label>
              <input
                type="text"
                value={payerName}
                onChange={e => setPayerName(e.target.value)}
                placeholder="As on Mobile Money"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3.5 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
              />
            </div>

            <button
              onClick={() => {
                if (parsedAmount < 15000) { toast.error('Minimum recharge is 15,000 UGX.'); return; }
                if (parsedAmount > 2000000) { toast.error('Maximum recharge is 2,000,000 UGX.'); return; }
                if (!payerPhone) { toast.error('Enter your phone number.'); return; }
                setStep(2);
              }}
              className="w-full bg-accent hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-sm transition-colors"
            >
              Continue — Send {parsedAmount > 0 ? parsedAmount.toLocaleString() + ' UGX' : ''}
            </button>
          </div>
        )}

        {/* ── STEP 2: Send Money ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Send Payment Now</h2>
            <p className="text-muted-foreground text-sm">
              Send exactly{' '}
              <span className="text-white font-bold">{parsedAmount.toLocaleString()} UGX</span>{' '}
              to this {network} number:
            </p>

            {/* Admin receiving number */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${network === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                <span className="text-white font-semibold">{network} Mobile Money</span>
              </div>
              {(adminNum as any).isMerchant && (
                <p className="text-xs text-yellow-400 font-semibold mb-1 uppercase tracking-wide">Merchant Code</p>
              )}
              <p className="text-4xl font-bold text-white mb-2 font-mono tracking-wider">{adminNum.number}</p>
              <p className="text-muted-foreground text-sm">
                {(adminNum as any).isMerchant ? 'Merchant Name' : 'Name'}:{' '}
                <span className="text-white font-semibold">{adminNum.name}</span>
              </p>
              <button
                onClick={handleCopy}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? '✓ Copied!' : (adminNum as any).isMerchant ? 'Copy Merchant Code' : 'Copy Number'}
              </button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="text-yellow-400 font-semibold">Steps:</span></p>
                <p>1. Copy the number above</p>
                <p>2. Open your {network} Mobile Money app</p>
                <p>3. Send <span className="text-white font-semibold">{parsedAmount.toLocaleString()} UGX</span> to {(adminNum as any).isMerchant ? 'merchant' : ''} <span className="text-white">{adminNum.number}</span></p>
                <p>4. Copy the confirmation SMS you receive</p>
                <p>5. Paste it on the next page as proof</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-secondary text-muted-foreground font-semibold py-4 rounded-xl text-sm"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-accent text-white font-bold py-4 rounded-xl text-sm"
              >
                I've Sent It →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Proof ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Submit Payment Proof</h2>
            <p className="text-muted-foreground text-sm">
              Paste the confirmation message from your Mobile Money SMS.
            </p>

            {/* Summary */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-green-400 text-sm font-semibold">Payment Summary</p>
                <p className="text-white text-sm">{network}: {payerPhone} · {payerName}</p>
                <p className="text-muted-foreground text-xs">Amount: {parsedAmount.toLocaleString()} UGX</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Payment Proof (SMS Message) <span className="text-red-400">*</span>
              </label>
              <textarea
                value={proof}
                onChange={e => setProof(e.target.value)}
                placeholder="Paste your Mobile Money confirmation SMS here..."
                rows={5}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm resize-none"
              />
            </div>

            {/* What happens next */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-accent" /> What happens next?
              </p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>1. Admin reviews your payment proof</p>
                <p>2. Once approved, your wallet balance is credited</p>
                <p>3. Use the balance to buy an investment package</p>
                <p>4. After buying a package, you can withdraw earnings anytime</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-secondary text-muted-foreground font-semibold py-4 rounded-xl text-sm"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-primary to-accent text-white font-bold py-4 rounded-xl text-sm disabled:opacity-60"
              >
                {loading ? 'Submitting...' : 'Submit Recharge'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
