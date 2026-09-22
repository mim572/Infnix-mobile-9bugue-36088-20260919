import { supabase } from '@/lib/supabase';
import { hashPassword, generateReferralCode } from '@/lib/crypto';

export interface PlatformUser {
  id: string;
  name: string;
  phone: string;
  referral_code: string;
  referred_by: string | null;
  wallet_balance: number;
  total_earnings: number;
  total_withdrawals: number;
  referral_earnings: number;
  daily_earnings: number;
  is_banned: boolean;
  is_admin: boolean;
  wallet_network?: string;
  wallet_phone?: string;
  wallet_name?: string;
  registered_at: string;
}

export interface InvestmentPackage {
  id: string;
  user_id: string;
  product_name: string;
  product_group: string;
  amount: number;
  daily_income: number;
  duration_days: number;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  buy_date: string | null;
  expiry_date: string | null;
  last_payout_at: string | null;
  submitted_at: string;
  payment_number?: string;
  payment_network?: string;
  payment_proof?: string;
}
export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  net_amount: number;
  tax: number;
  wallet_network: string;
  wallet_phone: string;
  wallet_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at: string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function registerUser(
  name: string,
  phone: string,
  password: string,
  referralCode?: string
): Promise<{ user: PlatformUser | null; error: string | null }> {
  // Check if phone exists
  const { data: existing } = await supabase
    .from('platform_users')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();
  if (existing) return { user: null, error: 'Phone number already registered.' };

  let referredById: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle();
    if (referrer) referredById = referrer.id;
  }

  const pwHash = await hashPassword(password);
  let refCode = generateReferralCode();

  // ensure unique referral code
  let codeUnique = false;
  while (!codeUnique) {
    const { data: existing } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', refCode)
      .maybeSingle();
    if (!existing) codeUnique = true;
    else refCode = generateReferralCode();
  }

  const { data, error } = await supabase
    .from('platform_users')
    .insert({
      name,
      phone,
      password_hash: pwHash,
      referral_code: refCode,
      referred_by: referredById,
      wallet_balance: 7000,
      total_earnings: 7000,
    })
    .select()
    .single();

  if (error) return { user: null, error: error.message };
  return { user: data as PlatformUser, error: null };
}

export async function loginUser(
  phone: string,
  password: string
): Promise<{ user: PlatformUser | null; error: string | null }> {
  const pwHash = await hashPassword(password);
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .eq('password_hash', pwHash)
    .maybeSingle();

  if (error || !data) return { user: null, error: 'Invalid phone or password.' };
  if (data.is_banned) return { user: null, error: 'Your account has been banned. Contact support.' };
  return { user: data as PlatformUser, error: null };
}

export async function refreshUser(userId: string): Promise<PlatformUser | null> {
  const { data } = await supabase
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .single();
  return data as PlatformUser | null;
}

// ─── Wallet Setup ─────────────────────────────────────────────────────────────
export async function saveWallet(
  userId: string,
  network: 'MTN' | 'Airtel',
  phone: string,
  name: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('platform_users')
    .update({ wallet_network: network, wallet_phone: phone, wallet_name: name })
    .eq('id', userId);
  return { error: error?.message || null };
}

// ─── Packages ─────────────────────────────────────────────────────────────────
export async function getUserPackages(userId: string): Promise<InvestmentPackage[]> {
  const { data } = await supabase
    .from('investment_packages')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });
  return (data || []) as InvestmentPackage[];
}

// ─── Internal: credit referral chain on package purchase ─────────────────────
async function creditReferralCommissionUser(userId: string, amount: number): Promise<void> {
  const RATES = [0.27, 0.02, 0.01];
  const { data: buyer } = await supabase
    .from('platform_users')
    .select('referred_by')
    .eq('id', userId)
    .single();
  if (!buyer?.referred_by) return;

  let currentId: string | null = buyer.referred_by;
  let level = 0;

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

export async function buyPackage(
  user: PlatformUser,
  product: {
    name: string;
    group: string;
    amount: number;
    dailyIncome: number;
    durationDays: number;
  },
  _paymentNumber?: string,
  _paymentNetwork?: string,
  _paymentProof?: string
): Promise<{ error: string | null }> {
  if (user.wallet_balance < product.amount) {
    return { error: `Insufficient balance. Please recharge your account first.` };
  }

  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + product.durationDays);

  // Deduct investment from wallet — earnings start after 24h via edge function
  const newBalance = user.wallet_balance - product.amount;
  const { error: deductErr } = await supabase
    .from('platform_users')
    .update({ wallet_balance: newBalance })
    .eq('id', user.id);
  if (deductErr) return { error: deductErr.message };

  // Insert package as immediately ACTIVE
  const { error } = await supabase.from('investment_packages').insert({
    user_id: user.id,
    user_name: user.name,
    user_phone: user.phone,
    product_name: product.name,
    product_group: product.group,
    amount: product.amount,
    daily_income: product.dailyIncome,
    duration_days: product.durationDays,
    status: 'active',
    buy_date: now.toISOString(),
    expiry_date: expiry.toISOString(),
    last_income_date: now.toISOString(),
    payment_network: 'Wallet',
    payment_proof: 'Auto-activated — paid from wallet balance',
  });

  if (error) {
    // Refund on error
    await supabase
      .from('platform_users')
      .update({ wallet_balance: user.wallet_balance })
      .eq('id', user.id);
    return { error: error.message };
  }

  // Credit referral commissions automatically
  await creditReferralCommissionUser(user.id, product.amount);

  return { error: null };
}

// ─── Recharge Records ───────────────────────────────────────────────────────
export async function getUserRecharges(userId: string): Promise<InvestmentPackage[]> {
  const { data } = await supabase
    .from('investment_packages')
    .select('*')
    .eq('user_id', userId)
    .eq('product_name', 'RECHARGE')
    .order('submitted_at', { ascending: false });
  return (data || []) as InvestmentPackage[];
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────
export async function submitWithdrawal(
  user: PlatformUser,
  amount: number
): Promise<{ error: string | null }> {
  if (amount < 7000) return { error: 'Minimum withdrawal is 7,000 UGX.' };
  if (user.wallet_balance < amount) return { error: 'Insufficient balance.' };
  if (!user.wallet_network || !user.wallet_phone) {
    return { error: 'Please set up your withdrawal wallet first.' };
  }

  // Must have recharged AND submitted at least one product package before withdrawing
  const { data: recharges } = await supabase
    .from('investment_packages')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_name', 'RECHARGE')
    .limit(1);
  const { data: packages } = await supabase
    .from('investment_packages')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'active', 'expired'])
    .neq('product_name', 'RECHARGE')
    .limit(1);
  if (!recharges || recharges.length === 0) {
    return { error: 'You must recharge your account before making a withdrawal.' };
  }
  if (!packages || packages.length === 0) {
    return { error: 'You must buy a product package before making a withdrawal.' };
  }

  // Check daily limit (2 per day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('id')
    .eq('user_id', user.id)
    .gte('requested_at', today.toISOString());
  if ((todayWithdrawals?.length || 0) >= 2) {
    return { error: 'Daily withdrawal limit reached (2 per day).' };
  }

  const tax = Math.floor(amount * 0.18);
  const netAmount = amount - tax;

  const { error } = await supabase.from('withdrawal_requests').insert({
    user_id: user.id,
    user_name: user.name,
    user_phone: user.phone,
    amount,
    net_amount: netAmount,
    tax,
    wallet_network: user.wallet_network,
    wallet_phone: user.wallet_phone,
    wallet_name: user.wallet_name || '',
  });

  return { error: error?.message || null };
}

export async function getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
  const { data } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });
  return (data || []) as WithdrawalRequest[];
}

// ─── Check In ─────────────────────────────────────────────────────────────────
export async function doCheckIn(userId: string): Promise<{ success: boolean; error: string | null }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if already checked in today
  const { data: existing } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('checked_at', today.toISOString())
    .lt('checked_at', tomorrow.toISOString())
    .maybeSingle();

  if (existing) return { success: false, error: 'Already checked in today. Come back tomorrow!' };

  const { error } = await supabase.from('check_ins').insert({ user_id: userId });
  if (error) return { success: false, error: error.message };

  // Award 200 UGX
  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings, daily_earnings')
    .eq('id', userId)
    .single();
  if (userData) {
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: userData.wallet_balance + 200,
        total_earnings: userData.total_earnings + 200,
        daily_earnings: userData.daily_earnings + 200,
      })
      .eq('id', userId);
  }
  return { success: true, error: null };
}

export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('checked_at', today.toISOString())
    .lt('checked_at', tomorrow.toISOString())
    .maybeSingle();

  return !!data;
}

// ─── Redeem ───────────────────────────────────────────────────────────────────
export async function redeemCode(
  userId: string,
  code: string
): Promise<{ amount: number | null; error: string | null }> {
  const { data: codeData } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (!codeData) return { amount: null, error: 'Invalid or inactive redeem code.' };
  if (new Date(codeData.expires_at) < new Date()) return { amount: null, error: 'This code has expired.' };
  if (codeData.used_count >= codeData.max_uses) return { amount: null, error: 'Code has reached maximum uses.' };

  // Check if user already used this code
  const { data: usageData } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', codeData.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (usageData) return { amount: null, error: 'You have already used this code.' };

  // Record usage
  const { error: usageErr } = await supabase
    .from('redeem_usages')
    .insert({ code_id: codeData.id, user_id: userId });
  if (usageErr) return { amount: null, error: usageErr.message };

  // Increment used_count
  await supabase
    .from('redeem_codes')
    .update({ used_count: codeData.used_count + 1 })
    .eq('id', codeData.id);

  // Credit user
  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings')
    .eq('id', userId)
    .single();
  if (userData) {
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: userData.wallet_balance + codeData.amount,
        total_earnings: userData.total_earnings + codeData.amount,
      })
      .eq('id', userId);
  }

  return { amount: codeData.amount, error: null };
}

// ─── Team ─────────────────────────────────────────────────────────────────────
export async function getTeamData(userId: string): Promise<{
  l1: PlatformUser[];
  l2: PlatformUser[];
  l3: PlatformUser[];
}> {
  const { data: l1 } = await supabase
    .from('platform_users')
    .select('*')
    .eq('referred_by', userId);

  const l1Users = (l1 || []) as PlatformUser[];
  const l1Ids = l1Users.map(u => u.id);

  let l2Users: PlatformUser[] = [];
  if (l1Ids.length > 0) {
    const { data: l2 } = await supabase
      .from('platform_users')
      .select('*')
      .in('referred_by', l1Ids);
    l2Users = (l2 || []) as PlatformUser[];
  }

  const l2Ids = l2Users.map(u => u.id);
  let l3Users: PlatformUser[] = [];
  if (l2Ids.length > 0) {
    const { data: l3 } = await supabase
      .from('platform_users')
      .select('*')
      .in('referred_by', l2Ids);
    l3Users = (l3 || []) as PlatformUser[];
  }

  return { l1: l1Users, l2: l2Users, l3: l3Users };
}

// ─── Change Password ─────────────────────────────────────────────────────────
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const currentHash = await hashPassword(currentPassword);
  // Verify current password
  const { data, error: fetchErr } = await supabase
    .from('platform_users')
    .select('id')
    .eq('id', userId)
    .eq('password_hash', currentHash)
    .maybeSingle();
  if (fetchErr || !data) return { error: 'Current password is incorrect.' };

  const newHash = await hashPassword(newPassword);
  const { error } = await supabase
    .from('platform_users')
    .update({ password_hash: newHash })
    .eq('id', userId);
  return { error: error?.message || null };
}

// ─── Recharge (top-up via deposit to admin) ───────────────────────────────────
export async function submitRecharge(
  user: PlatformUser,
  amount: number,
  payerName: string,
  payerPhone: string,
  network: 'MTN' | 'Airtel',
  proofMessage: string
): Promise<{ error: string | null }> {
  // Recharge is stored as a pending "recharge" package with special product name
  const { error } = await supabase.from('investment_packages').insert({
    user_id: user.id,
    user_name: user.name,
    user_phone: user.phone,
    product_name: 'RECHARGE',
    product_group: 'Recharge',
    amount,
    daily_income: 0,
    duration_days: 0,
    status: 'pending',
    payment_number: payerPhone,
    payment_network: network,
    payment_proof: `Name: ${payerName} | Phone: ${payerPhone} | Proof: ${proofMessage}`,
  });
  return { error: error?.message || null };
}
