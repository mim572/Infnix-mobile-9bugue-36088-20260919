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

export async function refreshUser(userId: string): Promise<PlatformUser | null> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as PlatformUser;
}

function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function registerUser(
  name: string,
  phone: string,
  password: string,
  referralCode?: string
): Promise<{ user: PlatformUser | null; error: string | null }> {
  // Check if phone already exists
  const { data: existing } = await supabase
    .from('platform_users')
    .select('id')
    .eq('phone', phone)
    .single();

  if (existing) {
    return { user: null, error: 'Phone number already registered.' };
  }

  const passwordHash = await hashPassword(password);
  let referredById: string | null = null;

  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode)
      .single();
    if (referrer) referredById = referrer.id;
  }

  // Generate unique referral code
  let myCode = generateReferralCode();
  let codeExists = true;
  while (codeExists) {
    const { data: check } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', myCode)
      .single();
    codeExists = !!check;
    if (codeExists) myCode = generateReferralCode();
  }

  const { data, error } = await supabase
    .from('platform_users')
    .insert({
      name,
      phone,
      password_hash: passwordHash,
      referral_code: myCode,
      referred_by: referredById,
      wallet_balance: 7000,
      total_earnings: 7000,
    })
    .select()
    .single();

  if (error || !data) {
    return { user: null, error: error?.message || 'Registration failed.' };
  }

  return { user: data as PlatformUser, error: null };
}

export async function loginUser(
  phone: string,
  password: string
): Promise<{ user: PlatformUser | null; error: string | null }> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return { user: null, error: 'Phone number not found.' };
  }

  const user = data as PlatformUser;

  if (user.is_banned) {
    return { user: null, error: 'Your account has been suspended. Contact support.' };
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.password_hash) {
    return { user: null, error: 'Incorrect password.' };
  }

  return { user, error: null };
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
  paymentNumber: string,
  paymentNetwork: string,
  paymentProof: string
): Promise<{ error: string | null }> {
  if (user.wallet_balance < product.amount) {
    return { error: 'Insufficient wallet balance.' };
  }

  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + product.durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Insert package
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
      expiry_date: expiry,
      last_income_date: now,
      payment_number: paymentNumber,
      payment_network: paymentNetwork,
      payment_proof: paymentProof,
    });

  if (pkgError) {
    return { error: pkgError.message };
  }

  // Deduct from wallet
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance - product.amount,
    })
    .eq('id', user.id);

  if (walletError) {
    return { error: walletError.message };
  }

  // Credit referral commission (27% L1)
  if (user.referred_by) {
    const commission = Math.floor(product.amount * 0.27);
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('wallet_balance, referral_earnings, total_earnings')
      .eq('id', user.referred_by)
      .single();

    if (referrer) {
      await supabase
        .from('platform_users')
        .update({
          wallet_balance: referrer.wallet_balance + commission,
          referral_earnings: referrer.referral_earnings + commission,
          total_earnings: referrer.total_earnings + commission,
        })
        .eq('id', user.referred_by);
    }
  }

  return { error: null };
}

export async function submitWithdrawal(
  user: PlatformUser,
  amount: number
): Promise<{ error: string | null }> {
  const minWithdrawal = 7000;
  if (amount < minWithdrawal) {
    return { error: `Minimum withdrawal is ${minWithdrawal.toLocaleString()} UGX.` };
  }
  if (user.wallet_balance < amount) {
    return { error: 'Insufficient wallet balance.' };
  }
  if (!user.wallet_network || !user.wallet_phone || !user.wallet_name) {
    return { error: 'Please set up your withdrawal wallet first.' };
  }

  const taxRate = 0.18;
  const tax = Math.floor(amount * taxRate);
  const netAmount = amount - tax;

  // Deduct from wallet first
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance - amount,
      total_withdrawals: user.total_withdrawals + amount,
    })
    .eq('id', user.id);

  if (walletError) return { error: walletError.message };

  const { error: reqError } = await supabase
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

  if (reqError) return { error: reqError.message };
  return { error: null };
}

export async function submitRecharge(
  user: PlatformUser,
  amount: number,
  network: string,
  transactionId: string
): Promise<{ error: string | null }> {
  const minRecharge = 15000;
  if (amount < minRecharge) {
    return { error: `Minimum recharge is ${minRecharge.toLocaleString()} UGX.` };
  }

  const { error } = await supabase
    .from('investment_packages')
    .insert({
      user_id: user.id,
      user_name: user.name,
      user_phone: user.phone,
      product_name: 'Recharge',
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

export async function redeemCode(
  user: PlatformUser,
  code: string
): Promise<{ amount: number | null; error: string | null }> {
  // Find the code
  const { data: codeData, error: codeError } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (codeError || !codeData) {
    return { amount: null, error: 'Invalid or expired redeem code.' };
  }

  // Check expiry
  if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
    return { amount: null, error: 'This redeem code has expired.' };
  }

  // Check max uses
  if (codeData.used_count >= codeData.max_uses) {
    return { amount: null, error: 'This redeem code has reached its usage limit.' };
  }

  // Check if user already used this code
  const { data: usageCheck } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', codeData.id)
    .eq('user_id', user.id)
    .single();

  if (usageCheck) {
    return { amount: null, error: 'You have already used this redeem code.' };
  }

  // Record usage
  const { error: usageError } = await supabase
    .from('redeem_usages')
    .insert({ code_id: codeData.id, user_id: user.id });

  if (usageError) return { amount: null, error: usageError.message };

  // Update used count
  await supabase
    .from('redeem_codes')
    .update({ used_count: codeData.used_count + 1 })
    .eq('id', codeData.id);

  // Credit user wallet
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance + codeData.amount,
      total_earnings: user.total_earnings + codeData.amount,
    })
    .eq('id', user.id);

  if (walletError) return { amount: null, error: walletError.message };

  return { amount: codeData.amount, error: null };
}

export async function checkIn(
  user: PlatformUser
): Promise<{ error: string | null; alreadyCheckedIn: boolean }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', user.id)
    .gte('checked_at', todayStart.toISOString())
    .single();

  if (existing) {
    return { error: null, alreadyCheckedIn: true };
  }

  const { error: ciError } = await supabase
    .from('check_ins')
    .insert({ user_id: user.id });

  if (ciError) return { error: ciError.message, alreadyCheckedIn: false };

  const reward = 200;
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance + reward,
      total_earnings: user.total_earnings + reward,
      daily_earnings: user.daily_earnings + reward,
    })
    .eq('id', user.id);

  if (walletError) return { error: walletError.message, alreadyCheckedIn: false };
  return { error: null, alreadyCheckedIn: false };
}

export async function changePassword(
  user: PlatformUser,
  currentPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== user.password_hash) {
    return { error: 'Current password is incorrect.' };
  }

  const newHash = await hashPassword(newPassword);
  const { error } = await supabase
    .from('platform_users')
    .update({ password_hash: newHash })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateWalletInfo(
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

export async function getTeamData(userId: string) {
  // Get direct referrals (L1)
  const { data: l1 } = await supabase
    .from('platform_users')
    .select('id, name, phone, registered_at, wallet_balance, total_earnings')
    .eq('referred_by', userId);

  const l1List = l1 || [];

  // Get L2 (referred by L1 members)
  let l2List: typeof l1List = [];
  let l3List: typeof l1List = [];

  if (l1List.length > 0) {
    const l1Ids = l1List.map(u => u.id);
    const { data: l2 } = await supabase
      .from('platform_users')
      .select('id, name, phone, registered_at, wallet_balance, total_earnings')
      .in('referred_by', l1Ids);

    l2List = l2 || [];

    if (l2List.length > 0) {
      const l2Ids = l2List.map(u => u.id);
      const { data: l3 } = await supabase
        .from('platform_users')
        .select('id, name, phone, registered_at, wallet_balance, total_earnings')
        .in('referred_by', l2Ids);
      l3List = l3 || [];
    }
  }

  return { l1: l1List, l2: l2List, l3: l3List };
}

export async function getRecentActivity() {
  const { data: withdrawals } = await supabase
    .from('withdrawal_requests')
    .select('user_name, user_phone, amount, requested_at')
    .eq('status', 'approved')
    .order('requested_at', { ascending: false })
    .limit(10);

  const { data: packages } = await supabase
    .from('investment_packages')
    .select('user_name, user_phone, amount, daily_income, submitted_at')
    .eq('status', 'active')
    .order('submitted_at', { ascending: false })
    .limit(10);

  return { withdrawals: withdrawals || [], packages: packages || [] };
}

export async function getActiveBroadcasts() {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getMissionClaims(userId: string) {
  const { data } = await supabase
    .from('mission_claims')
    .select('mission_id, claimed_at')
    .eq('user_id', userId);
  return data || [];
}

export async function claimMission(
  user: PlatformUser,
  missionId: string,
  reward: number
): Promise<{ error: string | null }> {
  const { error: claimError } = await supabase
    .from('mission_claims')
    .insert({ user_id: user.id, mission_id: missionId });

  if (claimError) {
    if (claimError.code === '23505') return { error: 'Mission already claimed.' };
    return { error: claimError.message };
  }

  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance + reward,
      total_earnings: user.total_earnings + reward,
    })
    .eq('id', user.id);

  if (walletError) return { error: walletError.message };
  return { error: null };
}

export async function getPendingRecharges(userId: string): Promise<number> {
  const { data } = await supabase
    .from('investment_packages')
    .select('id')
    .eq('user_id', userId)
    .eq('product_group', 'Recharge')
    .eq('status', 'pending');
  return (data || []).length;
}
