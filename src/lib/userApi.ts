import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformUser {
  id: string;
  name: string;
  phone: string;
  password_hash: string;
  referral_code: string;
  referred_by: string | null;
  wallet_balance: number;
  total_earnings: number;
  total_withdrawals: number;
  referral_earnings: number;
  daily_earnings: number;
  is_banned: boolean;
  is_admin: boolean;
  wallet_network: string | null;
  wallet_phone: string | null;
  wallet_name: string | null;
  registered_at: string;
}

export interface InvestmentPackage {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  product_name: string;
  product_group: string;
  amount: number;
  daily_income: number;
  duration_days: number;
  status: string;
  buy_date: string | null;
  expiry_date: string | null;
  last_income_date: string | null;
  payment_number: string | null;
  payment_network: string | null;
  payment_proof: string | null;
  submitted_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  amount: number;
  net_amount: number;
  tax: number;
  wallet_network: string;
  wallet_phone: string;
  wallet_name: string;
  status: string;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(phone: string, password: string): Promise<{ user: PlatformUser | null; error: string | null }> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error || !data) return { user: null, error: 'Invalid phone number or password.' };

  const { hashPassword } = await import('@/lib/crypto');
  const hashed = await hashPassword(password);
  if (data.password_hash !== hashed) return { user: null, error: 'Invalid phone number or password.' };
  if (data.is_banned) return { user: null, error: 'Your account has been banned. Contact support.' };

  return { user: data as PlatformUser, error: null };
}

export async function registerUser(
  name: string,
  phone: string,
  password: string,
  referralCode?: string
): Promise<{ user: PlatformUser | null; error: string | null }> {
  // Check phone uniqueness
  const { data: existing } = await supabase
    .from('platform_users')
    .select('id')
    .eq('phone', phone)
    .single();

  if (existing) return { user: null, error: 'Phone number already registered.' };

  // Resolve referrer
  let referredBy: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode)
      .single();
    if (referrer) referredBy = referrer.id;
  }

  const { hashPassword } = await import('@/lib/crypto');
  const password_hash = await hashPassword(password);

  // Generate unique referral code
  const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('platform_users')
    .insert({
      name,
      phone,
      password_hash,
      referral_code: newReferralCode,
      referred_by: referredBy,
      wallet_balance: 7000,
      total_earnings: 7000,
    })
    .select()
    .single();

  if (error) return { user: null, error: error.message };
  return { user: data as PlatformUser, error: null };
}

export async function refreshUser(userId: string): Promise<PlatformUser | null> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as PlatformUser;
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export async function buyPackage(
  user: PlatformUser,
  product: { name: string; group: string; amount: number; dailyIncome: number; durationDays: number },
  paymentNumber: string,
  paymentNetwork: string,
  paymentProof: string
): Promise<{ error: string | null }> {
  if (user.wallet_balance < product.amount) {
    return { error: `Insufficient balance. You need ${product.amount.toLocaleString()} UGX.` };
  }

  const now = new Date();
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + product.durationDays);

  // Insert package as active immediately
  const { error: pkgError } = await supabase
    .from('investment_packages')
    .insert({
      user_id: user.id,
      user_name: user.name,
      user_phone: user.phone,
      product_name: product.name,
      product_group: product.group,
      amount: product.amount,
      daily_income: product.dailyIncome,
      duration_days: product.durationDays,
      status: 'pending',
      payment_number: paymentNumber,
      payment_network: paymentNetwork,
      payment_proof: paymentProof,
    });

  if (pkgError) return { error: pkgError.message };

  // Deduct from wallet
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: user.wallet_balance - product.amount })
    .eq('id', user.id);

  if (walletError) return { error: walletError.message };

  return { error: null };
}

export async function getUserPackages(userId: string): Promise<InvestmentPackage[]> {
  const { data, error } = await supabase
    .from('investment_packages')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) return [];
  return (data || []) as InvestmentPackage[];
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export async function requestWithdrawal(
  user: PlatformUser,
  amount: number
): Promise<{ error: string | null }> {
  if (amount < 7000) return { error: 'Minimum withdrawal is 7,000 UGX.' };
  if (user.wallet_balance < amount) return { error: 'Insufficient balance.' };

  const TAX_RATE = 0.18;
  const tax = Math.round(amount * TAX_RATE);
  const net_amount = amount - tax;

  if (!user.wallet_name || !user.wallet_phone || !user.wallet_network) {
    return { error: 'Please add your wallet details first.' };
  }

  // Check daily limit (2 per day)
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('withdrawal_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('requested_at', today + 'T00:00:00Z')
    .lte('requested_at', today + 'T23:59:59Z');

  if ((count ?? 0) >= 2) return { error: 'You have reached the daily withdrawal limit of 2.' };

  const { error } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: user.id,
      user_name: user.name,
      user_phone: user.phone,
      amount,
      net_amount,
      tax,
      wallet_network: user.wallet_network,
      wallet_phone: user.wallet_phone,
      wallet_name: user.wallet_name,
      status: 'pending',
    });

  if (error) return { error: error.message };
  return { error: null };
}

export async function getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false });

  if (error) return [];
  return (data || []) as WithdrawalRequest[];
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

export async function performCheckIn(userId: string): Promise<{ error: string | null; alreadyDone: boolean }> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('checked_at', today + 'T00:00:00Z')
    .lte('checked_at', today + 'T23:59:59Z')
    .single();

  if (existing) return { error: null, alreadyDone: true };

  const { error: ciError } = await supabase
    .from('check_ins')
    .insert({ user_id: userId });

  if (ciError) return { error: ciError.message, alreadyDone: false };

  // Credit 100 UGX
  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings, daily_earnings')
    .eq('id', userId)
    .single();

  if (userData) {
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: userData.wallet_balance + 100,
        total_earnings: userData.total_earnings + 100,
        daily_earnings: userData.daily_earnings + 100,
      })
      .eq('id', userId);
  }

  return { error: null, alreadyDone: false };
}

export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('checked_at', today + 'T00:00:00Z')
    .lte('checked_at', today + 'T23:59:59Z')
    .single();
  return !!data;
}

// ─── Redeem Codes ─────────────────────────────────────────────────────────────

export async function redeemCode(
  userId: string,
  code: string
): Promise<{ amount: number; error: string | null }> {
  const now = new Date().toISOString();

  const { data: codeData, error: codeError } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (codeError || !codeData) return { amount: 0, error: 'Invalid redeem code.' };
  if (!codeData.is_active) return { amount: 0, error: 'This code is no longer active.' };
  if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) return { amount: 0, error: 'This code has expired.' };
  if (codeData.used_count >= codeData.max_uses) return { amount: 0, error: 'This code has reached its usage limit.' };

  // Check if already used
  const { data: usageData } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', codeData.id)
    .eq('user_id', userId)
    .single();

  if (usageData) return { amount: 0, error: 'You have already used this code.' };

  // Record usage
  const { error: usageError } = await supabase
    .from('redeem_usages')
    .insert({ code_id: codeData.id, user_id: userId });

  if (usageError) return { amount: 0, error: usageError.message };

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

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function updateWallet(
  userId: string,
  walletNetwork: string,
  walletPhone: string,
  walletName: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('platform_users')
    .update({
      wallet_network: walletNetwork,
      wallet_phone: walletPhone,
      wallet_name: walletName,
    })
    .eq('id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export async function getTeamTree(userId: string): Promise<{
  l1: PlatformUser[];
  l2: PlatformUser[];
  l3: PlatformUser[];
}> {
  // L1: directly referred by userId
  const { data: l1Data } = await supabase
    .from('platform_users')
    .select('*')
    .eq('referred_by', userId);

  const l1 = (l1Data || []) as PlatformUser[];
  const l1Ids = l1.map(u => u.id);

  if (!l1Ids.length) return { l1, l2: [], l3: [] };

  // L2: referred by L1
  const { data: l2Data } = await supabase
    .from('platform_users')
    .select('*')
    .in('referred_by', l1Ids);

  const l2 = (l2Data || []) as PlatformUser[];
  const l2Ids = l2.map(u => u.id);

  if (!l2Ids.length) return { l1, l2, l3: [] };

  // L3: referred by L2
  const { data: l3Data } = await supabase
    .from('platform_users')
    .select('*')
    .in('referred_by', l2Ids);

  const l3 = (l3Data || []) as PlatformUser[];

  return { l1, l2, l3 };
}

// ─── Missions ─────────────────────────────────────────────────────────────────

export async function claimMission(
  userId: string,
  missionId: string,
  reward: number
): Promise<{ error: string | null }> {
  // Check already claimed
  const { data: existing } = await supabase
    .from('mission_claims')
    .select('id')
    .eq('user_id', userId)
    .eq('mission_id', missionId)
    .single();

  if (existing) return { error: 'Mission already claimed.' };

  const { error: claimError } = await supabase
    .from('mission_claims')
    .insert({ user_id: userId, mission_id: missionId });

  if (claimError) return { error: claimError.message };

  // Credit reward
  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings')
    .eq('id', userId)
    .single();

  if (userData) {
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: userData.wallet_balance + reward,
        total_earnings: userData.total_earnings + reward,
      })
      .eq('id', userId);
  }

  return { error: null };
}

export async function getClaimedMissions(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('mission_claims')
    .select('mission_id')
    .eq('user_id', userId);

  return (data || []).map(d => d.mission_id);
}
