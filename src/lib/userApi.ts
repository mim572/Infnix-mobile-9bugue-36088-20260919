/**
 * userApi.ts
 * Core business logic for Infinix Earnings Platform.
 *
 * Exports:
 *   - PlatformUser (type)
 *   - refreshUser
 *   - loginUser  (alias: login)
 *   - registerUser
 *   - buyPackage
 *   - submitWithdrawal
 *   - submitRecharge
 *   - redeemCode
 *   - checkIn
 *   - changePassword
 */

import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─────────────────────────────────────────────
// refreshUser
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// registerUser
// ─────────────────────────────────────────────

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
    .maybeSingle();

  if (existing) {
    return { user: null, error: 'Phone number already registered.' };
  }

  // Resolve referrer
  let referredById: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle();
    if (referrer) referredById = referrer.id;
  }

  const passwordHash = await hashPassword(password);
  const myReferralCode = generateReferralCode();

  const { data, error } = await supabase
    .from('platform_users')
    .insert({
      name,
      phone,
      password_hash: passwordHash,
      referral_code: myReferralCode,
      referred_by: referredById,
      wallet_balance: 7000,
      total_earnings: 7000,
      total_withdrawals: 0,
      referral_earnings: 0,
      daily_earnings: 0,
      is_banned: false,
      is_admin: false,
    })
    .select('*')
    .single();

  if (error) {
    console.error('registerUser error:', error);
    return { user: null, error: 'Registration failed. Please try again.' };
  }

  return { user: data as PlatformUser, error: null };
}

// ─────────────────────────────────────────────
// login / loginUser
// ─────────────────────────────────────────────

export async function login(
  phone: string,
  password: string
): Promise<{ user: PlatformUser | null; error: string | null }> {
  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error || !data) {
    return { user: null, error: 'Phone number not found.' };
  }

  const user = data as PlatformUser;

  if (user.is_banned) {
    return { user: null, error: 'Your account has been suspended.' };
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.password_hash) {
    return { user: null, error: 'Incorrect password.' };
  }

  return { user, error: null };
}

export const loginUser = login;

// ─────────────────────────────────────────────
// buyPackage
// ─────────────────────────────────────────────

export async function buyPackage(
  userId: string,
  productName: string,
  productGroup: string,
  amount: number,
  dailyIncome: number,
  durationDays: number
): Promise<{ success: boolean; error: string | null }> {
  // Fetch latest balance
  const { data: userData, error: userError } = await supabase
    .from('platform_users')
    .select('wallet_balance, name, phone')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'Failed to fetch user data.' };
  }

  if (userData.wallet_balance < amount) {
    return { success: false, error: 'Insufficient wallet balance.' };
  }

  const now = new Date().toISOString();
  const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Insert the package (auto-activated)
  const { error: pkgError } = await supabase.from('investment_packages').insert({
    user_id: userId,
    user_name: userData.name,
    user_phone: userData.phone,
    product_name: productName,
    product_group: productGroup,
    amount,
    daily_income: dailyIncome,
    duration_days: durationDays,
    status: 'active',
    buy_date: now,
    expiry_date: expiryDate,
    last_income_date: now,
    payment_number: '',
    payment_network: 'Wallet',
    payment_proof: '',
  });

  if (pkgError) {
    console.error('buyPackage insert error:', pkgError);
    return { success: false, error: 'Failed to create package.' };
  }

  // Deduct wallet balance
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: userData.wallet_balance - amount })
    .eq('id', userId);

  if (walletError) {
    console.error('buyPackage wallet deduction error:', walletError);
    return { success: false, error: 'Failed to deduct wallet balance.' };
  }

  // Credit L1 referral commission (27%)
  try {
    const { data: buyer } = await supabase
      .from('platform_users')
      .select('referred_by')
      .eq('id', userId)
      .single();

    if (buyer?.referred_by) {
      const l1Commission = Math.floor(amount * 0.27);
      const { data: l1Referrer } = await supabase
        .from('platform_users')
        .select('wallet_balance, referral_earnings, referred_by')
        .eq('id', buyer.referred_by)
        .single();

      if (l1Referrer) {
        await supabase
          .from('platform_users')
          .update({
            wallet_balance: l1Referrer.wallet_balance + l1Commission,
            referral_earnings: l1Referrer.referral_earnings + l1Commission,
          })
          .eq('id', buyer.referred_by);

        // L2 referral (2%)
        if (l1Referrer.referred_by) {
          const l2Commission = Math.floor(amount * 0.02);
          const { data: l2Referrer } = await supabase
            .from('platform_users')
            .select('wallet_balance, referral_earnings, referred_by')
            .eq('id', l1Referrer.referred_by)
            .single();

          if (l2Referrer) {
            await supabase
              .from('platform_users')
              .update({
                wallet_balance: l2Referrer.wallet_balance + l2Commission,
                referral_earnings: l2Referrer.referral_earnings + l2Commission,
              })
              .eq('id', l1Referrer.referred_by);

            // L3 referral (1%)
            if (l2Referrer.referred_by) {
              const l3Commission = Math.floor(amount * 0.01);
              const { data: l3Referrer } = await supabase
                .from('platform_users')
                .select('wallet_balance, referral_earnings')
                .eq('id', l2Referrer.referred_by)
                .single();

              if (l3Referrer) {
                await supabase
                  .from('platform_users')
                  .update({
                    wallet_balance: l3Referrer.wallet_balance + l3Commission,
                    referral_earnings: l3Referrer.referral_earnings + l3Commission,
                  })
                  .eq('id', l2Referrer.referred_by);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Referral commission error (non-fatal):', err);
  }

  return { success: true, error: null };
}

// ─────────────────────────────────────────────
// submitWithdrawal
// ─────────────────────────────────────────────

export async function submitWithdrawal(
  userId: string,
  amount: number
): Promise<{ success: boolean; error: string | null }> {
  const MIN_WITHDRAWAL = 7000;
  const TAX_RATE = 0.18;

  if (amount < MIN_WITHDRAWAL) {
    return { success: false, error: `Minimum withdrawal is UGX ${MIN_WITHDRAWAL.toLocaleString()}.` };
  }

  const { data: userData, error: userError } = await supabase
    .from('platform_users')
    .select('wallet_balance, name, phone, wallet_network, wallet_phone, wallet_name')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'Failed to fetch user data.' };
  }

  if (userData.wallet_balance < amount) {
    return { success: false, error: 'Insufficient wallet balance.' };
  }

  if (!userData.wallet_network || !userData.wallet_phone || !userData.wallet_name) {
    return { success: false, error: 'Please set your withdrawal wallet details first.' };
  }

  const tax = Math.floor(amount * TAX_RATE);
  const netAmount = amount - tax;

  const { error: insertError } = await supabase.from('withdrawal_requests').insert({
    user_id: userId,
    user_name: userData.name,
    user_phone: userData.phone,
    amount,
    net_amount: netAmount,
    tax,
    wallet_network: userData.wallet_network,
    wallet_phone: userData.wallet_phone,
    wallet_name: userData.wallet_name,
    status: 'pending',
  });

  if (insertError) {
    console.error('submitWithdrawal insert error:', insertError);
    return { success: false, error: 'Failed to submit withdrawal request.' };
  }

  // Deduct wallet balance immediately
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: userData.wallet_balance - amount })
    .eq('id', userId);

  if (walletError) {
    console.error('submitWithdrawal wallet deduction error:', walletError);
  }

  return { success: true, error: null };
}

// ─────────────────────────────────────────────
// submitRecharge
// ─────────────────────────────────────────────

export async function submitRecharge(
  userId: string,
  amount: number,
  paymentNetwork: string,
  paymentNumber: string,
  paymentProof: string
): Promise<{ success: boolean; error: string | null }> {
  const MIN_RECHARGE = 15000;

  if (amount < MIN_RECHARGE) {
    return { success: false, error: `Minimum recharge is UGX ${MIN_RECHARGE.toLocaleString()}.` };
  }

  const { data: userData, error: userError } = await supabase
    .from('platform_users')
    .select('name, phone')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'Failed to fetch user data.' };
  }

  const { error: insertError } = await supabase.from('investment_packages').insert({
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
    payment_proof: paymentProof,
  });

  if (insertError) {
    console.error('submitRecharge insert error:', insertError);
    return { success: false, error: 'Failed to submit recharge request.' };
  }

  return { success: true, error: null };
}

// ─────────────────────────────────────────────
// redeemCode
// ─────────────────────────────────────────────

export async function redeemCode(
  userId: string,
  code: string
): Promise<{ success: boolean; amount: number; error: string | null }> {
  const { data: codeData, error: codeError } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (codeError || !codeData) {
    return { success: false, amount: 0, error: 'Invalid or expired redeem code.' };
  }

  if (new Date(codeData.expires_at) < new Date()) {
    return { success: false, amount: 0, error: 'This redeem code has expired.' };
  }

  if (codeData.used_count >= codeData.max_uses) {
    return { success: false, amount: 0, error: 'This redeem code has reached its usage limit.' };
  }

  // Check if already used by this user
  const { data: usageData } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', codeData.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (usageData) {
    return { success: false, amount: 0, error: 'You have already used this redeem code.' };
  }

  // Record usage
  const { error: usageError } = await supabase.from('redeem_usages').insert({
    code_id: codeData.id,
    user_id: userId,
  });

  if (usageError) {
    console.error('redeemCode usage insert error:', usageError);
    return { success: false, amount: 0, error: 'Failed to redeem code.' };
  }

  // Increment used_count
  await supabase
    .from('redeem_codes')
    .update({ used_count: codeData.used_count + 1 })
    .eq('id', codeData.id);

  // Credit wallet
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

  return { success: true, amount: codeData.amount, error: null };
}

// ─────────────────────────────────────────────
// checkIn
// ─────────────────────────────────────────────

const CHECK_IN_REWARD = 200;

export async function checkIn(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const today = new Date().toISOString().split('T')[0];

  // Check if already checked in today
  const { data: existing } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('checked_at', `${today}T00:00:00.000Z`)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'You have already checked in today.' };
  }

  const { error: ciError } = await supabase.from('check_ins').insert({ user_id: userId });

  if (ciError) {
    console.error('checkIn insert error:', ciError);
    return { success: false, error: 'Check-in failed. Please try again.' };
  }

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
        wallet_balance: userData.wallet_balance + CHECK_IN_REWARD,
        total_earnings: userData.total_earnings + CHECK_IN_REWARD,
      })
      .eq('id', userId);
  }

  return { success: true, error: null };
}

// ─────────────────────────────────────────────
// changePassword
// ─────────────────────────────────────────────

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  const { data: userData, error: userError } = await supabase
    .from('platform_users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    return { success: false, error: 'Failed to fetch user data.' };
  }

  const oldHash = await hashPassword(oldPassword);
  if (oldHash !== userData.password_hash) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  const newHash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from('platform_users')
    .update({ password_hash: newHash })
    .eq('id', userId);

  if (updateError) {
    console.error('changePassword update error:', updateError);
    return { success: false, error: 'Failed to update password.' };
  }

  return { success: true, error: null };
}

// ─────────────────────────────────────────────
// updateWalletDetails
// ─────────────────────────────────────────────

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
    console.error('updateWalletDetails error:', error);
    return { success: false, error: 'Failed to update wallet details.' };
  }

  return { success: true, error: null };
}
