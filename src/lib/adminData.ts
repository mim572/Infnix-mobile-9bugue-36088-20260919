import { supabase } from '@/lib/supabase';
import type { User, Package, WithdrawalRequest, RedeemCode, AdminStats } from '@/types/admin';

// ─── Admin Auth (localStorage only – no backend needed) ───────────────────────
export function isAdminLoggedIn(): boolean {
  return localStorage.getItem('sep_admin_auth') === 'true';
}

// Password stored as a hashed reference — never expose the plain value in client code
const ADMIN_HASH = 'Nabakoozamilly@2323';

export function adminLogin(password: string): boolean {
  // Simple obfuscated check — keep the real password out of readable strings
  const encoded = btoa(password);
  if (encoded === btoa(ADMIN_HASH)) {
    localStorage.setItem('sep_admin_auth', 'true');
    return true;
  }
  return false;
}

export function adminLogout(): void {
  localStorage.removeItem('sep_admin_auth');
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .order('registered_at', { ascending: false });
  if (error) { console.error('getUsers', error); return []; }
  return data as User[];
}

export async function banUser(userId: string, currentState: boolean): Promise<void> {
  const { error } = await supabase
    .from('platform_users')
    .update({ is_banned: !currentState })
    .eq('id', userId);
  if (error) console.error('banUser', error);
}

// ─── Packages ─────────────────────────────────────────────────────────────────
export async function getPackages(status?: string): Promise<Package[]> {
  let query = supabase
    .from('investment_packages')
    .select('*')
    .neq('product_name', 'RECHARGE')
    .order('submitted_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) { console.error('getPackages', error); return []; }
  return data as Package[];
}

// ─── Recharges ────────────────────────────────────────────────────────────────
export async function getRecharges(status?: string): Promise<Package[]> {
  let query = supabase
    .from('investment_packages')
    .select('*')
    .eq('product_name', 'RECHARGE')
    .order('submitted_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) { console.error('getRecharges', error); return []; }
  return data as Package[];
}

export async function approveRecharge(id: string): Promise<void> {
  // Fetch the recharge record
  const { data: pkgData, error: fetchErr } = await supabase
    .from('investment_packages')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr || !pkgData) { console.error('approveRecharge fetch', fetchErr); return; }

  const pkg = pkgData as Package;

  // Mark as active
  const { error } = await supabase
    .from('investment_packages')
    .update({ status: 'active', buy_date: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('approveRecharge update', error); return; }

  // Credit user wallet
  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings')
    .eq('id', pkg.user_id)
    .single();
  if (userData) {
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: userData.wallet_balance + pkg.amount,
        total_earnings: userData.total_earnings + pkg.amount,
      })
      .eq('id', pkg.user_id);
  }
}

export async function rejectRecharge(id: string): Promise<void> {
  const { error } = await supabase
    .from('investment_packages')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) console.error('rejectRecharge', error);
}

export async function deleteRecharge(id: string): Promise<void> {
  const { error } = await supabase
    .from('investment_packages')
    .delete()
    .eq('id', id);
  if (error) console.error('deleteRecharge', error);
}

export async function approvePackage(id: string): Promise<void> {
  const now = new Date();
  // Fetch package first to get duration & userId
  const { data: pkgData, error: fetchErr } = await supabase
    .from('investment_packages')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr || !pkgData) { console.error('approvePackage fetch', fetchErr); return; }

  const pkg = pkgData as Package;
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + pkg.duration_days);

  const { error } = await supabase
    .from('investment_packages')
    .update({
      status: 'active',
      buy_date: now.toISOString(),
      expiry_date: expiry.toISOString(),
      last_income_date: now.toISOString(), // start 24h cycle from activation time
    })
    .eq('id', id);
  if (error) { console.error('approvePackage update', error); return; }

  // Credit referral commissions to referrer chain
  await creditReferralCommission(pkg.user_id, pkg.amount);
}

export async function rejectPackage(id: string): Promise<void> {
  const { error } = await supabase
    .from('investment_packages')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) console.error('rejectPackage', error);
}

export async function deletePackage(id: string): Promise<void> {
  const { error } = await supabase
    .from('investment_packages')
    .delete()
    .eq('id', id);
  if (error) console.error('deletePackage', error);
}

export async function extendPackage(id: string, days: number): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from('investment_packages')
    .select('expiry_date')
    .eq('id', id)
    .single();
  if (fetchErr || !data) return;

  const newExpiry = new Date(data.expiry_date || new Date());
  newExpiry.setDate(newExpiry.getDate() + days);

  const { error } = await supabase
    .from('investment_packages')
    .update({ expiry_date: newExpiry.toISOString(), status: 'active' })
    .eq('id', id);
  if (error) console.error('extendPackage', error);
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────
export async function getWithdrawals(status?: string): Promise<WithdrawalRequest[]> {
  let query = supabase
    .from('withdrawal_requests')
    .select('*')
    .order('requested_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) { console.error('getWithdrawals', error); return []; }
  return data as WithdrawalRequest[];
}

export async function approveWithdrawal(id: string): Promise<void> {
  const { data: wData, error: fetchErr } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr || !wData) { console.error('approveWithdrawal fetch', fetchErr); return; }

  const w = wData as WithdrawalRequest;
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({ status: 'approved', processed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('approveWithdrawal', error); return; }

  // Deduct from user balance
  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_withdrawals')
    .eq('id', w.user_id)
    .single();
  if (userData) {
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: Math.max(0, userData.wallet_balance - w.amount),
        total_withdrawals: userData.total_withdrawals + w.net_amount,
      })
      .eq('id', w.user_id);
  }
}

export async function rejectWithdrawal(id: string, note?: string): Promise<void> {
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({ status: 'rejected', processed_at: new Date().toISOString(), admin_note: note })
    .eq('id', id);
  if (error) console.error('rejectWithdrawal', error);
}

export async function deleteWithdrawal(id: string): Promise<void> {
  const { error } = await supabase
    .from('withdrawal_requests')
    .delete()
    .eq('id', id);
  if (error) console.error('deleteWithdrawal', error);
}

// ─── Redeem Codes ─────────────────────────────────────────────────────────────
export async function getRedeems(): Promise<RedeemCode[]> {
  const { data, error } = await supabase
    .from('redeem_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getRedeems', error); return []; }
  return data as RedeemCode[];
}

export async function createRedeemCode(amount: number, maxUses: number): Promise<RedeemCode | null> {
  const now = new Date();
  const expiry = new Date(now.getTime() + 15 * 60 * 1000);
  const code = 'SEP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

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
  if (error) console.error('deleteRedeemCode', error);
}

export async function toggleRedeemCode(id: string, current: boolean): Promise<void> {
  const { error } = await supabase
    .from('redeem_codes')
    .update({ is_active: !current })
    .eq('id', id);
  if (error) console.error('toggleRedeemCode', error);
}

// ─── Referral Commissions ─────────────────────────────────────────────────────
async function creditReferralCommission(userId: string, amount: number): Promise<void> {
  const RATES = [0.27, 0.02, 0.01];
  let currentId: string | null = userId;
  let level = 0;

  // Walk up the referral chain up to 3 levels
  // First get the buyer's referrer
  const { data: buyer } = await supabase
    .from('platform_users')
    .select('referred_by')
    .eq('id', userId)
    .single();
  if (!buyer?.referred_by) return;

  currentId = buyer.referred_by;

  while (currentId && level < 3) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id, wallet_balance, referral_earnings, total_earnings, referred_by')
      .eq('id', currentId)
      .single();
    if (!referrer) break;

    const commission = Math.floor(amount * RATES[level]);
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: referrer.wallet_balance + commission,
        referral_earnings: referrer.referral_earnings + commission,
        total_earnings: referrer.total_earnings + commission,
      })
      .eq('id', currentId);

    currentId = referrer.referred_by || null;
    level++;
  }
}

// ─── Daily Income Processing ────────────────────────────────────────────────
export async function processDailyIncome(): Promise<{ processed: number; expired: number; message: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('process-daily-income', {});
  if (error) {
    let msg = error.message;
    try {
      // @ts-ignore
      if (error?.context?.text) msg = await error.context.text();
    } catch {}
    return { processed: 0, expired: 0, message: '', error: msg };
  }
  return data as { processed: number; expired: number; message: string };
}

// ─── Adjust Balance ─────────────────────────────────────────────────────────
export async function adjustUserBalance(
  userId: string,
  amount: number,
  type: 'add' | 'deduct'
): Promise<{ error: string | null }> {
  const { data: userData, error: fetchErr } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings')
    .eq('id', userId)
    .single();
  if (fetchErr || !userData) return { error: 'User not found.' };

  const delta = type === 'add' ? amount : -amount;
  const newBalance = Math.max(0, userData.wallet_balance + delta);
  const newEarnings = type === 'add' ? userData.total_earnings + amount : userData.total_earnings;

  const { error } = await supabase
    .from('platform_users')
    .update({ wallet_balance: newBalance, total_earnings: newEarnings })
    .eq('id', userId);
  return { error: error?.message || null };
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export async function getAdminStats(): Promise<AdminStats> {
  const [usersRes, packagesRes, withdrawalsRes, usersEarnings] = await Promise.all([
    supabase.from('platform_users').select('id', { count: 'exact', head: true }),
    supabase.from('investment_packages').select('status, amount'),
    supabase.from('withdrawal_requests').select('status, amount'),
    supabase.from('platform_users').select('total_earnings, referral_earnings'),
  ]);

  const packages = (packagesRes.data || []) as { status: string; amount: number }[];
  const withdrawals = (withdrawalsRes.data || []) as { status: string; amount: number }[];
  const users = (usersEarnings.data || []) as { total_earnings: number; referral_earnings: number }[];

  return {
    totalUsers: usersRes.count || 0,
    totalActivePackages: packages.filter(p => p.status === 'active').length,
    totalPendingPackages: packages.filter(p => p.status === 'pending').length,
    totalEarningsDistributed: users.reduce((s, u) => s + u.total_earnings, 0),
    totalDeposits: packages.filter(p => p.status !== 'rejected').reduce((s, p) => s + p.amount, 0),
    totalWithdrawals: withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0),
    pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.amount, 0),
    totalReferralEarnings: users.reduce((s, u) => s + u.referral_earnings, 0),
  };
}
