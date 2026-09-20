import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';

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

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function register(
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

  // Resolve referrer
  let referrerId: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode)
      .single();
    if (referrer) referrerId = referrer.id;
  }

  const passwordHash = await hashPassword(password);
  const newReferralCode = generateReferralCode();

  const { data, error } = await supabase
    .from('platform_users')
    .insert({
      name,
      phone,
      password_hash: passwordHash,
      referral_code: newReferralCode,
      referred_by: referrerId,
      wallet_balance: 7000,
      total_earnings: 7000,
      total_withdrawals: 0,
      referral_earnings: 0,
      daily_earnings: 0,
      is_banned: false,
      is_admin: false,
    })
    .select()
    .single();

  if (error) {
    console.error('register error:', error);
    return { user: null, error: 'Registration failed. Please try again.' };
  }

  return { user: data as PlatformUser, error: null };
}

export async function login(
  phone: string,
  password: string
): Promise<{ user: PlatformUser | null; error: string | null }> {
  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .eq('password_hash', passwordHash)
    .single();

  if (error || !data) {
    return { user: null, error: 'Invalid phone number or password.' };
  }

  const user = data as PlatformUser;

  if (user.is_banned) {
    return { user: null, error: 'Your account has been suspended. Contact support.' };
  }

  return { user, error: null };
}

// Alias for login to support both import names
export const loginUser = login;

export interface InvestmentPackageInput {
  productName: string;
  productGroup: string;
  amount: number;
  dailyIncome: number;
  durationDays: number;
}

export async function buyPackage(
  userId: string,
  pkg: InvestmentPackageInput
): Promise<{ success: boolean; error: string | null }> {
  // Fetch latest user data
  const { data: userData, error: userError } = await supabase
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'Failed to fetch user data.' };
  }

  const user = userData as PlatformUser;

  if (user.wallet_balance < pkg.amount) {
    return { success: false, error: 'Insufficient wallet balance.' };
  }

  const now = new Date().toISOString();
  const expiryDate = new Date(Date.now() + pkg.durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Deduct wallet balance
  const newBalance = user.wallet_balance - pkg.amount;

  const { error: updateError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    console.error('buyPackage wallet deduction error:', updateError);
    return { success: false, error: 'Failed to deduct wallet balance.' };
  }

  // Create investment package record (auto-activated)
  const { error: pkgError } = await supabase
    .from('investment_packages')
    .insert({
      user_id: userId,
      user_name: user.name,
      user_phone: user.phone,
      product_name: pkg.productName,
      product_group: pkg.productGroup,
      amount: pkg.amount,
      daily_income: pkg.dailyIncome,
      duration_days: pkg.durationDays,
      status: 'active',
      buy_date: now,
      expiry_date: expiryDate,
      last_income_date: now,
      payment_number: user.phone,
      payment_network: 'Wallet',
    });

  if (pkgError) {
    console.error('buyPackage insert error:', pkgError);
    // Rollback wallet deduction
    await supabase
      .from('platform_users')
      .update({ wallet_balance: user.wallet_balance })
      .eq('id', userId);
    return { success: false, error: 'Failed to create investment package.' };
  }

  // Credit L1 referral commission (27%)
  if (user.referred_by) {
    const commission = Math.floor(pkg.amount * 0.27);
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

  return { success: true, error: null };
}

export async function submitWithdrawal(
  userId: string,
  amount: number
): Promise<{ success: boolean; error: string | null }> {
  const { data: userData, error: userError } = await supabase
    .from('platform_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'Failed to fetch user data.' };
  }

  const user = userData as PlatformUser;

  if (amount < 7000) {
    return { success: false, error: 'Minimum withdrawal is UGX 7,000.' };
  }

  if (user.wallet_balance < amount) {
    return { success: false, error: 'Insufficient wallet balance.' };
  }

  if (!user.wallet_network || !user.wallet_phone || !user.wallet_name) {
    return { success: false, error: 'Please set up your withdrawal wallet details first.' };
  }

  const tax = Math.floor(amount * 0.18);
  const netAmount = amount - tax;

  // Deduct wallet
  const { error: updateError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: user.wallet_balance - amount,
      total_withdrawals: user.total_withdrawals + amount,
    })
    .eq('id', userId);

  if (updateError) {
    return { success: false, error: 'Failed to process withdrawal.' };
  }

  // Create withdrawal request
  const { error: insertError } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: userId,
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

  if (insertError) {
    // Rollback
    await supabase
      .from('platform_users')
      .update({
        wallet_balance: user.wallet_balance,
        total_withdrawals: user.total_withdrawals,
      })
      .eq('id', userId);
    return { success: false, error: 'Failed to create withdrawal request.' };
  }

  return { success: true, error: null };
}

export async function submitRecharge(
  userId: string,
  amount: number,
  paymentNumber: string,
  paymentNetwork: string,
  paymentProof?: string
): Promise<{ success: boolean; error: string | null }> {
  if (amount < 15000) {
    return { success: false, error: 'Minimum recharge is UGX 15,000.' };
  }

  const { data: userData } = await supabase
    .from('platform_users')
    .select('name, phone')
    .eq('id', userId)
    .single();

  if (!userData) {
    return { success: false, error: 'User not found.' };
  }

  const { error } = await supabase
    .from('investment_packages')
    .insert({
      user_id: userId,
      user_name: userData.name,
      user_phone: userData.phone,
      product_name: 'Recharge',
      product_group: 'Recharge',
      amount,
      daily_income: 0,
      duration_days: 0,
      status: 'pending',
      payment_number: paymentNumber,
      payment_network: paymentNetwork,
      payment_proof: paymentProof || null,
    });

  if (error) {
    console.error('submitRecharge error:', error);
    return { success: false, error: 'Failed to submit recharge request.' };
  }

  return { success: true, error: null };
}

export async function redeemCode(
  userId: string,
  code: string
): Promise<{ success: boolean; amount?: number; error: string | null }> {
  // Find the redeem code
  const { data: codeData, error: codeError } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (codeError || !codeData) {
    return { success: false, error: 'Invalid or expired redeem code.' };
  }

  // Check expiry
  if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
    return { success: false, error: 'This redeem code has expired.' };
  }

  // Check max uses
  if (codeData.used_count >= codeData.max_uses) {
    return { success: false, error: 'This redeem code has reached its maximum uses.' };
  }

  // Check if user already used this code
  const { data: usageData } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', codeData.id)
    .eq('user_id', userId)
    .single();

  if (usageData) {
    return { success: false, error: 'You have already used this redeem code.' };
  }

  // Fetch user
  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings')
    .eq('id', userId)
    .single();

  if (!userData) {
    return { success: false, error: 'User not found.' };
  }

  // Credit wallet
  const { error: updateError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: userData.wallet_balance + codeData.amount,
      total_earnings: userData.total_earnings + codeData.amount,
    })
    .eq('id', userId);

  if (updateError) {
    return { success: false, error: 'Failed to credit wallet.' };
  }

  // Record usage
  await supabase.from('redeem_usages').insert({
    code_id: codeData.id,
    user_id: userId,
  });

  // Increment used_count
  await supabase
    .from('redeem_codes')
    .update({ used_count: codeData.used_count + 1 })
    .eq('id', codeData.id);

  return { success: true, amount: codeData.amount, error: null };
}

export async function checkIn(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const today = new Date().toISOString().split('T')[0];

  // Check if already checked in today
  const { data: existing } = await supabase
    .from('check_ins')
    .select('id, checked_at')
    .eq('user_id', userId)
    .gte('checked_at', `${today}T00:00:00.000Z`)
    .lte('checked_at', `${today}T23:59:59.999Z`)
    .single();

  if (existing) {
    return { success: false, error: 'You have already checked in today.' };
  }

  // Record check-in
  const { error: checkInError } = await supabase
    .from('check_ins')
    .insert({ user_id: userId });

  if (checkInError) {
    return { success: false, error: 'Failed to record check-in.' };
  }

  // Credit 200 UGX
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

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  const oldHash = await hashPassword(oldPassword);

  const { data: userData } = await supabase
    .from('platform_users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (!userData || userData.password_hash !== oldHash) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  const newHash = await hashPassword(newPassword);

  const { error } = await supabase
    .from('platform_users')
    .update({ password_hash: newHash })
    .eq('id', userId);

  if (error) {
    return { success: false, error: 'Failed to update password.' };
  }

  return { success: true, error: null };
}

export async function updateWalletDetails(
  userId: string,
  walletNetwork: string,
  walletPhone: string,
  walletName: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('platform_users')
    .update({
      wallet_network: walletNetwork,
      wallet_phone: walletPhone,
      wallet_name: walletName,
    })
    .eq('id', userId);

  if (error) {
    return { success: false, error: 'Failed to update wallet details.' };
  }

  return { success: true, error: null };
}
