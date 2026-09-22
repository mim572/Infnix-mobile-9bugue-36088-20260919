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

  if (error ||!data) return { user: null, error: 'Invalid phone or password.' };
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

export async function getUserPackages(userId: string): Promise<InvestmentPackage[]> {
  const { data } = await supabase
   .from('investment_packages')
   .select('*')
   .eq('user_id', userId)
   .order('submitted_at', { ascending: false });
  return (data || []) as InvestmentPackage[];
}

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

  const newBalance = user.wallet_balance - product.amount;
  const { error: deductErr } = await supabase
   .from('platform_users')
   .update({ wallet_balance: newBalance })
   .eq('id', user.id);
  if (deductErr) return { error: deductErr.message };

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
    last_payout_at: now.toISOString(),
    payment_network: 'Wallet',
    payment_proof: 'Auto-activated — paid from wallet balance',
  });

  if (error) {
    await supabase
     .from('platform_users')
     .update({ wallet_balance: user.wallet_balance })
     .eq('id', user.id);
    return { error: error.message };
  }

  await creditReferralCommissionUser(user.id, product.amount);
  return { error: null };
}

export async function getUserRecharges(userId: string): Promise<InvestmentPackage[]> {
  const { data } = await supabase
   .from('investment_packages')
   .select('*')
   .eq('user_id', userId)
   .eq('product_name', 'RECHARGE')
   .order('submitted_at', { ascending: false });
  return (data || []) as InvestmentPackage[];
}

export async function submitWithdrawal(
  user: PlatformUser,
  amount: number
): Promise<{ error: string | null }> {
  if (amount < 7000) return { error: 'Minimum withdrawal is 7,000 UGX.' };
  if (user.wallet_balance < amount) return { error: 'Insufficient balance.' };
  if (!user.wallet_network ||!user.wallet_phone) {
    return { error: 'Please set up your withdrawal wallet first.' };
  }

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

export async function doCheckIn(userId: string): Promise<{ success: boolean; error: string | null }> {
  const today = new Date
