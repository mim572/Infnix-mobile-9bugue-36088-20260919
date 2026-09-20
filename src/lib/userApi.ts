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
  is_admin: boolean;
  wallet_network: string | null;
  wallet_phone: string | null;
  wallet_name: string | null;
  registered_at: string;
}

export async function refreshUser(userId: string): Promise<PlatformUser | null> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('refreshUser error:', error);
    return null;
  }
  return data as PlatformUser;
}

function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function registerUser(
  name: string,
  phone: string,
  password: string,
  referralCode?: string
): Promise<PlatformUser> {
  // Check if phone already exists
  const { data: existing } = await supabase
    .from('platform_users')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (existing) {
    throw new Error('Phone number already registered.');
  }

  const password_hash = await hashPassword(password);

  // Find referrer if code provided
  let referredBy: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode.toUpperCase())
      .maybeSingle();
    if (referrer) referredBy = referrer.id;
  }

  // Generate unique referral code
  let newCode = generateReferralCode();
  let codeExists = true;
  while (codeExists) {
    const { data: check } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', newCode)
      .maybeSingle();
    if (!check) codeExists = false;
    else newCode = generateReferralCode();
  }

  const { data, error } = await supabase
    .from('platform_users')
    .insert({
      name,
      phone,
      password_hash,
      referral_code: newCode,
      referred_by: referredBy,
      wallet_balance: 7000,
      total_earnings: 7000,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Credit L1 referral commission (27%) — only if referrer exists
  if (referredBy) {
    // We don't apply commission on registration bonus, only on investments
    console.log('User registered with referral from:', referredBy);
  }

  return data as PlatformUser;
}

export async function login(phone: string, password: string): Promise<PlatformUser> {
  const { data: user, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!user) throw new Error('Phone number not found.');

  const password_hash = await hashPassword(password);
  if (user.password_hash !== password_hash) {
    throw new Error('Incorrect password.');
  }

  if (user.is_banned) {
    throw new Error('Your account has been banned. Contact support.');
  }

  return user as PlatformUser;
}

// Alias for backward compatibility
export const loginUser = login;

export async function buyPackage(params: {
  userId: string;
  userName: string;
  userPhone: string;
  productName: string;
  productGroup: string;
  amount: number;
  dailyIncome: number;
  durationDays: number;
}): Promise<void> {
  const { userId, userName, userPhone, productName, productGroup, amount, dailyIncome, durationDays } = params;

  // Fetch current wallet balance
  const { data: user, error: fetchError } = await supabase
    .from('platform_users')
    .select('wallet_balance, referred_by')
    .eq('id', userId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!user) throw new Error('User not found.');
  if (user.wallet_balance < amount) throw new Error('Insufficient wallet balance.');

  const now = new Date().toISOString();
  const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Deduct from wallet
  const newBalance = user.wallet_balance - amount;
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: newBalance })
    .eq('id', userId);

  if (walletError) throw new Error(walletError.message);

  // Create active investment package
  const { error: pkgError } = await supabase
    .from('investment_packages')
    .insert({
      user_id: userId,
      user_name: userName,
      user_phone: userPhone,
      product_name: productName,
      product_group: productGroup,
      amount,
      daily_income: dailyIncome,
      duration_days: durationDays,
      status: 'active',
      buy_date: now,
      expiry_date: expiryDate,
      last_income_date: now,
      payment_number: 'wallet',
      payment_network: 'Wallet',
    });

  if (pkgError) throw new Error(pkgError.message);

  // Credit L1 referral commission (27%) to referrer if exists
  if (user.referred_by) {
    const commission = Math.floor(amount * 0.27);
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
}

export async function submitWithdrawal(params: {
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  walletNetwork: string;
  walletPhone: string;
  walletName: string;
}): Promise<void> {
  const TAX_RATE = 0.18;
  const MIN_WITHDRAWAL = 7000;

  const { userId, userName, userPhone, amount, walletNetwork, walletPhone, walletName } = params;

  if (amount < MIN_WITHDRAWAL) {
    throw new Error(`Minimum withdrawal amount is UGX ${MIN_WITHDRAWAL.toLocaleString()}.`);
  }

  // Fetch current balance
  const { data: user, error: fetchError } = await supabase
    .from('platform_users')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!user) throw new Error('User not found.');
  if (user.wallet_balance < amount) throw new Error('Insufficient wallet balance.');

  const tax = Math.floor(amount * TAX_RATE);
  const netAmount = amount - tax;

  // Deduct from wallet
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance - amount,
      total_withdrawals: undefined, // Will be updated on approval by admin
    })
    .eq('id', userId);

  if (walletError) throw new Error(walletError.message);

  // Create withdrawal request
  const { error: wdError } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: userId,
      user_name: userName,
      user_phone: userPhone,
      amount,
      net_amount: netAmount,
      tax,
      wallet_network: walletNetwork,
      wallet_phone: walletPhone,
      wallet_name: walletName,
      status: 'pending',
    });

  if (wdError) throw new Error(wdError.message);
}

export async function submitRecharge(params: {
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  paymentNumber: string;
  paymentNetwork: string;
  paymentProof?: string;
}): Promise<void> {
  const MIN_RECHARGE = 15000;
  const { amount } = params;

  if (amount < MIN_RECHARGE) {
    throw new Error(`Minimum recharge amount is UGX ${MIN_RECHARGE.toLocaleString()}.`);
  }

  // Insert recharge as pending investment (admin approves = credits wallet)
  const { error } = await supabase
    .from('investment_packages')
    .insert({
      user_id: params.userId,
      user_name: params.userName,
      user_phone: params.userPhone,
      product_name: 'Recharge',
      product_group: 'Recharge',
      amount: params.amount,
      daily_income: 0,
      duration_days: 0,
      status: 'pending',
      payment_number: params.paymentNumber,
      payment_network: params.paymentNetwork,
      payment_proof: params.paymentProof || null,
    });

  if (error) throw new Error(error.message);
}

export async function redeemCode(userId: string, code: string): Promise<number> {
  // Find active redeem code
  const { data: codeData, error: codeError } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (codeError) throw new Error(codeError.message);
  if (!codeData) throw new Error('Invalid or expired redeem code.');
  if (new Date(codeData.expires_at) < new Date()) throw new Error('This redeem code has expired.');
  if (codeData.used_count >= codeData.max_uses) throw new Error('This redeem code has reached its usage limit.');

  // Check if user already used this code
  const { data: usageCheck } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', codeData.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (usageCheck) throw new Error('You have already used this redeem code.');

  // Get current user balance
  const { data: user, error: userError } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings')
    .eq('id', userId)
    .single();

  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('User not found.');

  // Credit wallet
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance + codeData.amount,
      total_earnings: user.total_earnings + codeData.amount,
    })
    .eq('id', userId);

  if (walletError) throw new Error(walletError.message);

  // Record usage
  await supabase.from('redeem_usages').insert({
    code_id: codeData.id,
    user_id: userId,
  });

  // Increment used count
  await supabase
    .from('redeem_codes')
    .update({ used_count: codeData.used_count + 1 })
    .eq('id', codeData.id);

  return codeData.amount;
}

export async function checkIn(userId: string): Promise<void> {
  const CHECKIN_REWARD = 200;
  const today = new Date().toISOString().split('T')[0];

  // Check if already checked in today
  const { data: existing } = await supabase
    .from('check_ins')
    .select('id, checked_at')
    .eq('user_id', userId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const lastDate = new Date(existing.checked_at).toISOString().split('T')[0];
    if (lastDate === today) {
      throw new Error('You have already checked in today. Come back tomorrow!');
    }
  }

  // Get current user balance
  const { data: user, error: userError } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings, daily_earnings')
    .eq('id', userId)
    .single();

  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('User not found.');

  // Credit check-in reward
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance + CHECKIN_REWARD,
      total_earnings: user.total_earnings + CHECKIN_REWARD,
      daily_earnings: user.daily_earnings + CHECKIN_REWARD,
    })
    .eq('id', userId);

  if (walletError) throw new Error(walletError.message);

  // Record check-in
  const { error: checkInError } = await supabase
    .from('check_ins')
    .insert({ user_id: userId });

  if (checkInError) throw new Error(checkInError.message);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Verify current password
  const { data: user, error: fetchError } = await supabase
    .from('platform_users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!user) throw new Error('User not found.');

  const currentHash = await hashPassword(currentPassword);
  if (user.password_hash !== currentHash) {
    throw new Error('Current password is incorrect.');
  }

  const newHash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from('platform_users')
    .update({ password_hash: newHash })
    .eq('id', userId);

  if (updateError) throw new Error(updateError.message);
}

export async function updateWalletInfo(
  userId: string,
  walletNetwork: string,
  walletPhone: string,
  walletName: string
): Promise<void> {
  const { error } = await supabase
    .from('platform_users')
    .update({
      wallet_network: walletNetwork,
      wallet_phone: walletPhone,
      wallet_name: walletName,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
