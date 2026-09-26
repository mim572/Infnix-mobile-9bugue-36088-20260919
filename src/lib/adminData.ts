import { supabase } from '@/integrations/supabase/client';
import type { AdminStats } from '@/types/admin';

export interface RedeemCode {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

// --- Auth ---
export function adminLogout() {
  localStorage.removeItem('admin_session');
}

// --- Stats ---
export async function getAdminStats(): Promise<AdminStats> {
  try {
    const { count: totalUsers } = await supabase.from('platform_users').select('id', { count: 'exact', head: true });
    const { data: packages } = await supabase.from('user_packages').select('status');
    const { data: deposits } = await supabase.from('recharge_requests').select('amount').eq('status', 'approved');
    const { data: withdrawals } = await supabase.from('withdrawal_requests').select('amount, status');

    const totalActivePackages = packages?.filter(p => p.status === 'active').length || 0;
    const totalPendingPackages = packages?.filter(p => p.status === 'pending').length || 0;
    const totalDeposits = deposits?.reduce((s, r) => s + (r.amount || 0), 0) || 0;
    const totalWithdrawals = withdrawals?.filter(w => w.status === 'approved').reduce((s, r) => s + (r.amount || 0), 0) || 0;
    const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;

    return {
      totalUsers: totalUsers || 0,
      totalActivePackages,
      totalPendingPackages,
      totalEarningsDistributed: 0,
      totalDeposits,
      totalWithdrawals,
      pendingWithdrawals,
      totalReferralEarnings: 0,
    };
  } catch {
    return {
      totalUsers: 0,
      totalActivePackages: 0,
      totalPendingPackages: 0,
      totalEarningsDistributed: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingWithdrawals: 0,
      totalReferralEarnings: 0,
    };
  }
}

export async function processDailyIncome() {
  try {
    const { error } = await supabase.rpc('process_daily_income');
    if (error) return { error: error.message };
    return { message: 'Daily income processed for all active packages' };
  } catch (e: any) {
    return { error: e.message };
  }
}

// --- Redeem Codes ---
export async function getRedeems(): Promise<RedeemCode[]> {
  const { data, error } = await supabase.from('redeem_codes').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getRedeems', error); return []; }
  return data as RedeemCode[];
}

export async function createRedeemCode(amount: number, maxUses: number, customCode?: string): Promise<RedeemCode | null> {
  const normalizedCode = (customCode || '').trim().toUpperCase();
  const code = normalizedCode || 'SEP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
    console.error('Invalid redeem code format');
    return null;
  }

  const { data: existingCode } = await supabase
   .from('redeem_codes')
   .select('id')
   .eq('code', code)
   .maybeSingle();

  if (existingCode) {
    console.error('Redeem code already exists');
    return null;
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + 15 * 60 * 1000);

  const { data, error } = await supabase
   .from('redeem_codes')
   .insert({
      code,
      amount,
      max_uses: maxUses,
      used_count: 0,
      is_active: true,
      expires_at: expiry.toISOString(),
    })
   .select()
   .single();

  if (error) { console.error('createRedeemCode', error); return null; }
  return data as RedeemCode;
}

export async function deleteRedeemCode(id: string): Promise<void> {
  const { error } = await supabase.from('redeem_codes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleRedeemCode(id: string, current: boolean): Promise<void> {
  const { error } = await supabase.from('redeem_codes').update({ is_active:!current }).eq('id', id);
  if (error) throw new Error(error.message);
}

// --- Referral Commission (THIS WAS THE BROKEN PART - NOW FIXED) ---
async function creditReferralCommission(userId: string, amount: number): Promise<void> {
  const RATES = [0.27, 0.02, 0.01];
  let currentId: string | null = userId;
  let level = 0;
  const { data: buyer } = await supabase.from('platform_users').select('referred_by').eq('id', userId).single();
  if (!buyer?.referred_by) return;
  currentId = buyer.referred_by;
  while (currentId && level < 3) {
    const { data: referrer } = await supabase.from('platform_users').select('id, wallet_balance, referral_earnings, total_earnings, referred_by').eq('id', currentId).single();
    if (!referrer) break;
    const commission = Math.floor(amount * RATES[level]);

    if (commission > 0) {
      await supabase.from('platform_users').update({
        wallet_balance: referrer.wallet_balance + commission,
        referral_earnings: (referrer.referral_earnings || 0) + commission,
        total_earnings: (referrer.total_earnings || 0) + commission,
      }).eq('id', referrer.id);
    }

    currentId = referrer.referred_by;
    level++;
  }
}

export { creditReferralCommission };
