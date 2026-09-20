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

function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function register(
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
    .single();

  if (existing) throw new Error('Phone number already registered.');

  // Resolve referrer
  let referredById: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode.toUpperCase())
      .single();
    if (referrer) referredById = referrer.id;
  }

  const passwordHash = await hashPassword(password);

  // Generate unique referral code
  let newReferralCode = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: codeCheck } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', newReferralCode)
      .single();
    if (!codeCheck) break;
    newReferralCode = generateReferralCode();
    attempts++;
  }

  const { data, error } = await supabase
    .from('platform_users')
    .insert({
      name,
      phone,
      password_hash: passwordHash,
      referral_code: newReferralCode,
      referred_by: referredById,
      wallet_balance: 7000,
      total_earnings: 7000,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PlatformUser;
}

export async function login(phone: string, password: string): Promise<PlatformUser> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error || !data) throw new Error('Phone number not found.');

  const user = data as PlatformUser;
  if (user.is_banned) throw new Error('Your account has been banned. Contact support.');

  const passwordHash = await hashPassword(password);
  if ((data as { password_hash: string }).password_hash !== passwordHash) {
    throw new Error('Incorrect password.');
  }

  return user;
}

export const loginUser = login;

export async function buyPackage(
  userId: string,
  productName: string,
  productGroup: string,
  amount: number,
  dailyIncome: number,
  durationDays: number
): Promise<void> {
  // Fetch latest balance
  const { data: userData, error: userError } = await supabase
    .from('platform_users')
    .select('wallet_balance, name, phone')
    .eq('id', userId)
    .single();

  if (userError || !userData) throw new Error('Failed to fetch user data.');

  const { wallet_balance, name, phone } = userData as {
    wallet_balance: number;
    name: string;
    phone: string;
  };

  if (wallet_balance < amount) throw new Error('Insufficient wallet balance.');

  const now = new Date().toISOString();
  const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Deduct wallet
  const { error: deductError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: wallet_balance - amount })
    .eq('id', userId);

  if (deductError) throw new Error('Failed to deduct wallet balance.');

  // Create package (auto-activated)
  const { error: pkgError } = await supabase
    .from('investment_packages')
    .insert({
      user_id: userId,
      user_name: name,
      user_phone: phone,
      product_name: productName,
      product_group: productGroup,
      amount,
      daily_income: dailyIncome,
      duration_days: durationDays,
      status: 'active',
      buy_date: now,
      expiry_date: expiryDate,
      last_income_date: now,
      payment_network: 'Wallet',
    });

  if (pkgError) throw new Error('Failed to create investment package.');

  // Credit L1 referral commission (27%)
  try {
    const { data: referralData } = await supabase
      .from('platform_users')
      .select('referred_by')
      .eq('id', userId)
      .single();

    if (referralData?.referred_by) {
      const commission = Math.floor(amount * 0.27);
      const { data: l1Referrer } = await supabase
        .from('platform_users')
        .select('wallet_balance, referral_earnings')
        .eq('id', referralData.referred_by)
        .single();

      if (l1Referrer) {
        await supabase
          .from('platform_users')
          .update({
            wallet_balance: (l1Referrer as { wallet_balance: number }).wallet_balance + commission,
            referral_earnings: (l1Referrer as { referral_earnings: number }).referral_earnings + commission,
            total_earnings: (l1Referrer as { wallet_balance: number }).wallet_balance + commission,
          })
          .eq('id', referralData.referred_by);
      }

      // L2 commission (2%)
      const { data: l1Data } = await supabase
        .from('platform_users')
        .select('referred_by')
        .eq('id', referralData.referred_by)
        .single();

      if (l1Data?.referred_by) {
        const l2Commission = Math.floor(amount * 0.02);
        const { data: l2Referrer } = await supabase
          .from('platform_users')
          .select('wallet_balance, referral_earnings, total_earnings')
          .eq('id', l1Data.referred_by)
          .single();

        if (l2Referrer) {
          await supabase
            .from('platform_users')
            .update({
              wallet_balance: (l2Referrer as { wallet_balance: number }).wallet_balance + l2Commission,
              referral_earnings: (l2Referrer as { referral_earnings: number }).referral_earnings + l2Commission,
              total_earnings: (l2Referrer as { total_earnings: number }).total_earnings + l2Commission,
            })
            .eq('id', l1Data.referred_by);
        }

        // L3 commission (1%)
        const { data: l2Data } = await supabase
          .from('platform_users')
          .select('referred_by')
          .eq('id', l1Data.referred_by)
          .single();

        if (l2Data?.referred_by) {
          const l3Commission = Math.floor(amount * 0.01);
          const { data: l3Referrer } = await supabase
            .from('platform_users')
            .select('wallet_balance, referral_earnings, total_earnings')
            .eq('id', l2Data.referred_by)
            .single();

          if (l3Referrer) {
            await supabase
              .from('platform_users')
              .update({
                wallet_balance: (l3Referrer as { wallet_balance: number }).wallet_balance + l3Commission,
                referral_earnings: (l3Referrer as { referral_earnings: number }).referral_earnings + l3Commission,
                total_earnings: (l3Referrer as { total_earnings: number }).total_earnings + l3Commission,
              })
              .eq('id', l2Data.referred_by);
          }
        }
      }
    }
  } catch (refErr) {
    console.error('Referral commission error (non-fatal):', refErr);
  }
}

export async function submitWithdrawal(
  userId: string,
  amount: number
): Promise<void> {
  const { data: userData, error: userError } = await supabase
    .from('platform_users')
    .select('wallet_balance, name, phone, wallet_network, wallet_phone, wallet_name')
    .eq('id', userId)
    .single();

  if (userError || !userData) throw new Error('Failed to fetch user data.');

  const u = userData as {
    wallet_balance: number;
    name: string;
    phone: string;
    wallet_network: string | null;
    wallet_phone: string | null;
    wallet_name: string | null;
  };

  if (u.wallet_balance < amount) throw new Error('Insufficient wallet balance.');
  if (amount < 7000) throw new Error('Minimum withdrawal is UGX 7,000.');
  if (!u.wallet_network || !u.wallet_phone || !u.wallet_name) {
    throw new Error('Please set your withdrawal wallet details first.');
  }

  const tax = Math.floor(amount * 0.18);
  const netAmount = amount - tax;

  // Deduct wallet immediately
  const { error: deductError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: u.wallet_balance - amount,
      total_withdrawals: 0, // will be updated after confirmation
    })
    .eq('id', userId);

  if (deductError) throw new Error('Failed to deduct wallet balance.');

  const { error: wdError } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: userId,
      user_name: u.name,
      user_phone: u.phone,
      amount,
      net_amount: netAmount,
      tax,
      wallet_network: u.wallet_network,
      wallet_phone: u.wallet_phone,
      wallet_name: u.wallet_name,
      status: 'pending',
    });

  if (wdError) throw new Error('Failed to submit withdrawal request.');
}

export async function submitRecharge(
  userId: string,
  amount: number,
  paymentNetwork: string,
  paymentNumber: string,
  paymentProof?: string
): Promise<void> {
  if (amount < 15000) throw new Error('Minimum recharge is UGX 15,000.');

  const { data: userData } = await supabase
    .from('platform_users')
    .select('name, phone')
    .eq('id', userId)
    .single();

  if (!userData) throw new Error('User not found.');

  const u = userData as { name: string; phone: string };

  const { error } = await supabase
    .from('investment_packages')
    .insert({
      user_id: userId,
      user_name: u.name,
      user_phone: u.phone,
      product_name: 'Recharge',
      product_group: 'Recharge',
      amount,
      daily_income: 0,
      duration_days: 0,
      status: 'pending',
      payment_network: paymentNetwork,
      payment_number: paymentNumber,
      payment_proof: paymentProof || null,
    });

  if (error) throw new Error('Failed to submit recharge request.');
}

export async function redeemCode(userId: string, code: string): Promise<number> {
  const { data: codeData, error: codeError } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (codeError || !codeData) throw new Error('Invalid or expired redeem code.');

  const c = codeData as {
    id: string;
    amount: number;
    max_uses: number;
    used_count: number;
    expires_at: string;
  };

  if (new Date(c.expires_at) < new Date()) throw new Error('This redeem code has expired.');
  if (c.used_count >= c.max_uses) throw new Error('This redeem code has reached its usage limit.');

  // Check if user already used this code
  const { data: usageCheck } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', c.id)
    .eq('user_id', userId)
    .single();

  if (usageCheck) throw new Error('You have already used this redeem code.');

  // Record usage
  const { error: usageError } = await supabase
    .from('redeem_usages')
    .insert({ code_id: c.id, user_id: userId });

  if (usageError) throw new Error('Failed to record code usage.');

  // Increment used_count
  await supabase
    .from('redeem_codes')
    .update({ used_count: c.used_count + 1 })
    .eq('id', c.id);

  // Credit wallet
  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings')
    .eq('id', userId)
    .single();

  if (!userData) throw new Error('User not found.');

  const ud = userData as { wallet_balance: number; total_earnings: number };

  const { error: creditError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: ud.wallet_balance + c.amount,
      total_earnings: ud.total_earnings + c.amount,
    })
    .eq('id', userId);

  if (creditError) throw new Error('Failed to credit wallet.');

  return c.amount;
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
    .single();

  if (existing) {
    const lastDate = new Date((existing as { checked_at: string }).checked_at)
      .toISOString()
      .split('T')[0];
    if (lastDate === today) throw new Error('You have already checked in today.');
  }

  const { error: ciError } = await supabase
    .from('check_ins')
    .insert({ user_id: userId });

  if (ciError) throw new Error('Failed to record check-in.');

  const { data: userData } = await supabase
    .from('platform_users')
    .select('wallet_balance, total_earnings, daily_earnings')
    .eq('id', userId)
    .single();

  if (!userData) throw new Error('User not found.');

  const ud = userData as {
    wallet_balance: number;
    total_earnings: number;
    daily_earnings: number;
  };

  const { error: creditError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: ud.wallet_balance + CHECKIN_REWARD,
      total_earnings: ud.total_earnings + CHECKIN_REWARD,
      daily_earnings: ud.daily_earnings + CHECKIN_REWARD,
    })
    .eq('id', userId);

  if (creditError) throw new Error('Failed to credit check-in reward.');
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (error || !data) throw new Error('User not found.');

  const currentHash = await hashPassword(currentPassword);
  if ((data as { password_hash: string }).password_hash !== currentHash) {
    throw new Error('Current password is incorrect.');
  }

  const newHash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from('platform_users')
    .update({ password_hash: newHash })
    .eq('id', userId);

  if (updateError) throw new Error('Failed to update password.');
}

export async function updateWalletDetails(
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

  if (error) throw new Error('Failed to update wallet details.');
}
