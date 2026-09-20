// ============================================================
// userApi.ts — Core business logic for Infinix Earnings Platform
// DO NOT DELETE OR CLEAR THIS FILE via GitHub or any other method.
// Exports: PlatformUser, refreshUser, register, login, buyPackage,
//          submitWithdrawal, submitRecharge, redeemCode, checkIn,
//          changePassword, claimMission, getTeamStats
// ============================================================

import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';

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
  wallet_network: string | null;
  wallet_phone: string | null;
  wallet_name: string | null;
  registered_at: string;
  is_admin: boolean;
}

// ── Helpers ──────────────────────────────────────────────────

function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Auth ─────────────────────────────────────────────────────

export async function refreshUser(userId: string): Promise<PlatformUser | null> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as PlatformUser;
}

export async function register(
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
    .maybeSingle();
  if (existing) return { user: null, error: 'Phone number already registered.' };

  // Resolve referrer
  let referrerId: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle();
    if (referrer) referrerId = referrer.id;
  }

  const passwordHash = await hashPassword(password);
  let myCode = generateReferralCode();
  // Ensure uniqueness
  let tries = 0;
  while (tries < 5) {
    const { data: codeCheck } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', myCode)
      .maybeSingle();
    if (!codeCheck) break;
    myCode = generateReferralCode();
    tries++;
  }

  const { data, error } = await supabase
    .from('platform_users')
    .insert({
      name,
      phone,
      password_hash: passwordHash,
      referral_code: myCode,
      referred_by: referrerId,
      wallet_balance: 7000,
      total_earnings: 7000,
    })
    .select('*')
    .single();

  if (error || !data) return { user: null, error: error?.message || 'Registration failed.' };

  // Credit L1 referral commission (27%)
  if (referrerId) {
    await creditReferralCommission(referrerId, 7000, 0.27);
  }

  return { user: data as PlatformUser, error: null };
}

export async function login(
  phone: string,
  password: string
): Promise<{ user: PlatformUser | null; error: string | null }> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error || !data) return { user: null, error: 'Phone number not found.' };
  const user = data as PlatformUser;
  if (user.is_banned) return { user: null, error: 'Account suspended. Contact support.' };

  const hash = await hashPassword(password);
  if (hash !== user.password_hash) return { user: null, error: 'Incorrect password.' };

  return { user, error: null };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const { data } = await supabase
    .from('platform_users')
    .select('password_hash')
    .eq('id', userId)
    .single();
  if (!data) return { error: 'User not found.' };

  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== data.password_hash) return { error: 'Current password is incorrect.' };

  const newHash = await hashPassword(newPassword);
  const { error } = await supabase
    .from('platform_users')
    .update({ password_hash: newHash })
    .eq('id', userId);
  return { error: error?.message || null };
}

// ── Referral Commission ───────────────────────────────────────

async function creditReferralCommission(
  referrerId: string,
  baseAmount: number,
  rate: number
) {
  const commission = Math.floor(baseAmount * rate);
  if (commission <= 0) return;
  const { data: referrer } = await supabase
    .from('platform_users')
    .select('wallet_balance, referral_earnings, total_earnings')
    .eq('id', referrerId)
    .single();
  if (!referrer) return;
  await supabase
    .from('platform_users')
    .update({
      wallet_balance: referrer.wallet_balance + commission,
      referral_earnings: referrer.referral_earnings + commission,
      total_earnings: referrer.total_earnings + commission,
    })
    .eq('id', referrerId);
}

// ── Packages / Investment ─────────────────────────────────────

export async function buyPackage(
  user: PlatformUser,
  product: {
    name: string;
    group: string;
    amount: number;
    dailyIncome: number;
    durationDays: number;
  },
  paymentPhone: string,
  paymentNetwork: string,
  paymentNumber: string
): Promise<{ error: string | null }> {
  if (user.wallet_balance < product.amount) {
    return { error: 'Insufficient wallet balance.' };
  }

  const now = new Date().toISOString();
  const expiryDate = new Date(Date.now() + product.durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Deduct from wallet
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: user.wallet_balance - product.amount })
    .eq('id', user.id);
  if (walletError) return { error: walletError.message };

  // Create active package
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
      status: 'active',
      buy_date: now,
      expiry_date: expiryDate,
      last_income_date: now,
      payment_number: paymentPhone,
      payment_network: 'Wallet',
    });
  if (pkgError) {
    // Rollback wallet deduction
    await supabase
      .from('platform_users')
      .update({ wallet_balance: user.wallet_balance })
      .eq('id', user.id);
    return { error: pkgError.message };
  }

  // Credit L1 referral commission on purchase (27%)
  if (user.referred_by) {
    await creditReferralCommission(user.referred_by, product.amount, 0.27);
  }

  return { error: null };
}

// ── Withdrawals ───────────────────────────────────────────────

export async function submitWithdrawal(
  user: PlatformUser,
  amount: number
): Promise<{ error: string | null }> {
  const MIN_WITHDRAWAL = 7000;
  if (amount < MIN_WITHDRAWAL) return { error: `Minimum withdrawal is ${MIN_WITHDRAWAL.toLocaleString()} UGX.` };
  if (user.wallet_balance < amount) return { error: 'Insufficient wallet balance.' };

  const TAX_RATE = 0.18;
  const tax = Math.floor(amount * TAX_RATE);
  const netAmount = amount - tax;

  if (!user.wallet_network || !user.wallet_phone || !user.wallet_name) {
    return { error: 'Please set up your withdrawal wallet in your profile first.' };
  }

  // Deduct from wallet immediately
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance - amount,
      total_withdrawals: user.total_withdrawals + amount,
    })
    .eq('id', user.id);
  if (walletError) return { error: walletError.message };

  const { error } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: user.id,
      user_name: user.name,
      user_phone: user.phone,
      amount,
      net_amount: netAmount,
      tax,
      wallet_network: user.wallet_network,
      wallet_phone: user.wallet_phone,
      wallet_name: user.wallet_name,
      status: 'pending',
    });
  if (error) {
    // Rollback
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: user.wallet_balance,
        total_withdrawals: user.total_withdrawals,
      })
      .eq('id', user.id);
    return { error: error.message };
  }
  return { error: null };
}

// ── Recharge ──────────────────────────────────────────────────

export async function submitRecharge(
  user: PlatformUser,
  amount: number,
  network: string,
  transactionId: string
): Promise<{ error: string | null }> {
  const MIN_RECHARGE = 15000;
  if (amount < MIN_RECHARGE) return { error: `Minimum recharge is ${MIN_RECHARGE.toLocaleString()} UGX.` };

  const { error } = await supabase
    .from('investment_packages')
    .insert({
      user_id: user.id,
      user_name: user.name,
      user_phone: user.phone,
      product_name: 'Account Recharge',
      product_group: 'Recharge',
      amount,
      daily_income: 0,
      duration_days: 0,
      status: 'pending',
      payment_number: transactionId,
      payment_network: network,
      payment_proof: transactionId,
    });
  if (error) return { error: error.message };
  return { error: null };
}

// ── Redeem Codes ──────────────────────────────────────────────

export async function redeemCode(
  user: PlatformUser,
  code: string
): Promise<{ amount: number | null; error: string | null }> {
  const { data: codeData, error: fetchError } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle();

  if (fetchError || !codeData) return { amount: null, error: 'Invalid or expired redeem code.' };
  if (new Date(codeData.expires_at) < new Date()) return { amount: null, error: 'This code has expired.' };
  if (codeData.used_count >= codeData.max_uses) return { amount: null, error: 'This code has reached its usage limit.' };

  // Check if already used by this user
  const { data: usageData } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', codeData.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (usageData) return { amount: null, error: 'You have already used this code.' };

  // Credit wallet
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance + codeData.amount,
      total_earnings: user.total_earnings + codeData.amount,
    })
    .eq('id', user.id);
  if (walletError) return { amount: null, error: walletError.message };

  // Record usage
  await supabase.from('redeem_usages').insert({ code_id: codeData.id, user_id: user.id });

  // Increment used_count
  await supabase
    .from('redeem_codes')
    .update({ used_count: codeData.used_count + 1 })
    .eq('id', codeData.id);

  return { amount: codeData.amount, error: null };
}

// ── Daily Check-In ────────────────────────────────────────────

export async function checkIn(
  user: PlatformUser
): Promise<{ error: string | null; alreadyCheckedIn: boolean }> {
  const today = new Date().toISOString().split('T')[0];

  // Check if already checked in today
  const { data: existing } = await supabase
    .from('check_ins')
    .select('id, checked_at')
    .eq('user_id', user.id)
    .gte('checked_at', today + 'T00:00:00.000Z')
    .lt('checked_at', today + 'T23:59:59.999Z')
    .maybeSingle();

  if (existing) return { error: null, alreadyCheckedIn: true };

  const CHECKIN_REWARD = 200;
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance + CHECKIN_REWARD,
      total_earnings: user.total_earnings + CHECKIN_REWARD,
      daily_earnings: user.daily_earnings + CHECKIN_REWARD,
    })
    .eq('id', user.id);
  if (walletError) return { error: walletError.message, alreadyCheckedIn: false };

  await supabase.from('check_ins').insert({ user_id: user.id });

  return { error: null, alreadyCheckedIn: false };
}

// ── Missions ──────────────────────────────────────────────────

export async function claimMission(
  userId: string,
  missionId: string,
  rewardAmount: number,
  currentBalance: number,
  currentEarnings: number
): Promise<{ error: string | null }> {
  // Check not already claimed
  const { data: existing } = await supabase
    .from('mission_claims')
    .select('id')
    .eq('user_id', userId)
    .eq('mission_id', missionId)
    .maybeSingle();
  if (existing) return { error: 'Mission already claimed.' };

  // Credit reward
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: currentBalance + rewardAmount,
      total_earnings: currentEarnings + rewardAmount,
    })
    .eq('id', userId);
  if (walletError) return { error: walletError.message };

  // Record claim
  const { error: claimError } = await supabase
    .from('mission_claims')
    .insert({ user_id: userId, mission_id: missionId });
  if (claimError) return { error: claimError.message };

  return { error: null };
}

// ── Team / Referrals ──────────────────────────────────────────

export async function getTeamStats(userId: string): Promise<{
  l1Members: PlatformUser[];
  l2Members: PlatformUser[];
  l3Members: PlatformUser[];
  totalTeam: number;
  totalReferralEarnings: number;
}> {
  // L1
  const { data: l1Data } = await supabase
    .from('platform_users')
    .select('*')
    .eq('referred_by', userId);
  const l1Members = (l1Data || []) as PlatformUser[];

  // L2
  const l1Ids = l1Members.map(m => m.id);
  let l2Members: PlatformUser[] = [];
  if (l1Ids.length > 0) {
    const { data: l2Data } = await supabase
      .from('platform_users')
      .select('*')
      .in('referred_by', l1Ids);
    l2Members = (l2Data || []) as PlatformUser[];
  }

  // L3
  const l2Ids = l2Members.map(m => m.id);
  let l3Members: PlatformUser[] = [];
  if (l2Ids.length > 0) {
    const { data: l3Data } = await supabase
      .from('platform_users')
      .select('*')
      .in('referred_by', l2Ids);
    l3Members = (l3Data || []) as PlatformUser[];
  }

  const { data: meData } = await supabase
    .from('platform_users')
    .select('referral_earnings')
    .eq('id', userId)
    .single();

  return {
    l1Members,
    l2Members,
    l3Members,
    totalTeam: l1Members.length + l2Members.length + l3Members.length,
    totalReferralEarnings: meData?.referral_earnings || 0,
  };
}

// ── Wallet Settings ───────────────────────────────────────────

export async function updateWalletSettings(
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
  return { error: error?.message || null };
}
