import { useState, useEffect } from 'react';
import { Gift, Plus, Copy, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RedeemCode {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  used_count: number;
  expires_at: string;
  created_at: string;
}

export default function RedeemTab() {
  const [amount, setAmount] = useState('500');
  const [maxUses, setMaxUses] = useState('100');
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<RedeemCode[]>([]);

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('redeem_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setCodes(data as RedeemCode[]);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'GAGA-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreate = async () => {
    if (!amount || !maxUses) {
      toast.error('Fill Amount and Max Uses');
      return;
    }

    setLoading(true);
    try {
      // THIS IS YOUR REQUEST: Admin enters custom code
      let finalCode = customCode.trim().toUpperCase();
      if (!finalCode) {
        finalCode = generateRandomCode();
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const { error } = await supabase.from('redeem_codes').insert({
        code: finalCode,
        amount: parseInt(amount),
        max_uses: parseInt(maxUses),
        used_count: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast.error('This code already exists! Try another code.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(`✅ Code Created: ${finalCode}`);
        setCustomCode('');
        fetchCodes();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied: ' + code);
  };

  const deleteCode = async (id: string) => {
    await supabase.from('redeem_codes').delete().eq('id', id);
    toast.success('Deleted');
    fetchCodes();
  };

  return (
    <div className="space-y-4">
      {/* Create Box */}
      <div className="bg-secondary/50 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-white">Create New Code</h3>
          </div>
          <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> 15-min expiry
          </span>
        </div>

        <div className="space-y-3">
          {/* ADMIN CUSTOM CODE INPUT - NEW */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Custom Code (Admin enters here)</label>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="e.g. GAGA500, WELCOME100 - Leave empty for random"
              className="w-full bg-[#12121a] border border-border rounded-xl px-3 py-3 text-white text-sm font-mono placeholder:text-muted-foreground/50 focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Amount (UGX)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#12121a] border border-border rounded-xl px-3 py-3 text-white text-sm focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Max Uses</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full bg-[#12121a] border border-border rounded-xl px-3 py-3 text-white text-sm focus:border-primary outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            {loading ? 'Creating...' : 'Create Redeem Code'}
          </button>
        </div>
      </div>

      {/* List of Codes */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-white px-1">Recent Codes</h4>
        {codes.map((c) => (
          <div key={c.id} className="bg-secondary/30 border border-border rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-white text-sm">{c.code}</div>
              <div className="text-xs text-muted-foreground">
                {c.amount} UGX • {c.used_count}/{c.max_uses} used • Exp: {new Date(c.expires_at).toLocaleTimeString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copyCode(c.code)} className="p-2 bg-secondary rounded-lg hover:bg-secondary/80">
                <Copy className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => deleteCode(c.id)} className="p-2 bg-red-900/30 rounded-lg hover:bg-red-900/50">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {codes.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">No codes yet</p>
        )}
      </div>
    </div>
  );
}
