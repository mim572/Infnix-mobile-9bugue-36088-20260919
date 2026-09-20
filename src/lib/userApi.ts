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

// ─── Refresh user from database ──────────────────────────────────────────────
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

// ─── Generate a unique referral code ─────────────────────────────────────────
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Register ────────────────────────────────────────────────────────────────
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
    .maybeSingle();

  if (existing) throw new Error('Phone number already registered');

  const passwordHash = await hashPassword(password);
  const myReferralCode = generateReferralCode();

  let referredById: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('id')
      .eq('referral_code', referralCode.toUpperCase())
      .maybeSingle();
    if (referrer) referredById = referrer.id;
  }

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
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PlatformUser;
}

// ─── Login ───────────────────────────────────────────────────────────────────
export async function login(phone: string, password: string): Promise<PlatformUser> {
  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from('platform_users')
    .select('*')
    .eq('phone', phone)
    .eq('password_hash', passwordHash)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Invalid phone number or password');
  if (data.is_banned) throw new Error('Your account has been suspended. Contact support.');

  return data as PlatformUser;
}

export const loginUser = login;

// ─── Buy package (wallet deduction, auto-activate) ───────────────────────────
export async function buyPackage(
  userId: string,
  userName: string,
  userPhone: string,
  productName: string,
  productGroup: string,
  amount: number,
  dailyIncome: number,
  durationDays: number
): Promise<void> {
  // Fetch fresh balance
  const fresh = await refreshUser(userId);
  if (!fresh) throw new Error('Could not load account data');
  if (fresh.wallet_balance < amount) throw new Error('Insufficient wallet balance');

  const now = new Date().toISOString();
  const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Insert investment package (auto-activated)
  const { error: pkgError } = await supabase.from('investment_packages').insert({
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
    payment_number: userPhone,
    payment_network: 'Wallet',
    submitted_at: now,
  });
  if (pkgError) throw new Error(pkgError.message);

  // Deduct from wallet
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: fresh.wallet_balance - amount })
    .eq('id', userId);
  if (walletError) throw new Error(walletError.message);

  // Credit L1 referral commission (27%)
  if (fresh.referred_by) {
    const commission = Math.floor(amount * 0.27);
    const { data: referrer } = await supabase
      .from('platform_users')
      .select('wallet_balance, referral_earnings, total_earnings')
      .eq('id', fresh.referred_by)
      .single();
    if (referrer) {
      await supabase
        .from('platform_users')
        .update({
          wallet_balance: referrer.wallet_balance + commission,
          referral_earnings: referrer.referral_earnings + commission,
          total_earnings: referrer.total_earnings + commission,
        })
        .eq('id', fresh.referred_by);
    }

    // L2 commission (2%)
    const { data: l1User } = await supabase
      .from('platform_users')
      .select('referred_by')
      .eq('id', fresh.referred_by)
      .single();
    if (l1User?.referred_by) {
      const l2Commission = Math.floor(amount * 0.02);
      const { data: l2Referrer } = await supabase
        .from('platform_users')
        .select('wallet_balance, referral_earnings, total_earnings')
        .eq('id', l1User.referred_by)
        .single();
      if (l2Referrer) {
        await supabase
          .from('platform_users')
          .update({
            wallet_balance: l2Referrer.wallet_balance + l2Commission,
            referral_earnings: l2Referrer.referral_earnings + l2Commission,
            total_earnings: l2Referrer.total_earnings + l2Commission,
          })
          .eq('id', l1User.referred_by);
      }

      // L3 commission (1%)
      const { data: l2User } = await supabase
        .from('platform_users')
        .select('referred_by')
        .eq('id', l1User.referred_by)
        .single();
      if (l2User?.referred_by) {
        const l3Commission = Math.floor(amount * 0.01);
        const { data: l3Referrer } = await supabase
          .from('platform_users')
          .select('wallet_balance, referral_earnings, total_earnings')
          .eq('id', l2User.referred_by)
          .single();
        if (l3Referrer) {
          await supabase
            .from('platform_users')
            .update({
              wallet_balance: l3Referrer.wallet_balance + l3Commission,
              referral_earnings: l3Referrer.referral_earnings + l3Commission,
              total_earnings: l3Referrer.total_earnings + l3Commission,
            })
            .eq('id', l2User.referred_by);
        }
      }
    }
  }
}

// ─── Submit withdrawal request ───────────────────────────────────────────────
export async function submitWithdrawal(
  userId: string,
  userName: string,
  userPhone: string,
  amount: number,
  walletNetwork: string,
  walletPhone: string,
  walletName: string
): Promise<void> {
  const TAX_RATE = 0.18;
  const tax = Math.floor(amount * TAX_RATE);
  const netAmount = amount - tax;

  const fresh = await refreshUser(userId);
  if (!fresh) throw new Error('Could not load account data');
  if (fresh.wallet_balance < amount) throw new Error('Insufficient wallet balance');
  if (amount < 7000) throw new Error('Minimum withdrawal is 7,000 UGX');

  // Deduct from wallet immediately
  const { error: walletError } = await supabase
    .from('platform_users')
    .update({ wallet_balance: fresh.wallet_balance - amount })
    .eq('id', userId);
  if (walletError) throw new Error(walletError.message);

  const { error } = await supabase.from('withdrawal_requests').insert({
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
  if (error) throw new Error(error.message);
}

// ─── Submit recharge request ─────────────────────────────────────────────────
export async function submitRecharge(
  userId: string,
  userName: string,
  userPhone: string,
  amount: number,
  paymentNetwork: string,
  paymentNumber: string,
  paymentProof?: string
): Promise<void> {
  if (amount < 15000) throw new Error('Minimum recharge amount is 15,000 UGX');

  const { error } = await supabase.from('investment_packages').insert({
    user_id: userId,
    user_name: userName,
    user_phone: userPhone,
    product_name: 'Recharge',
    product_group: 'Recharge',
    amount,
    daily_income: 0,
    duration_days: 0,
    status: 'recharge_pending',
    payment_number: paymentNumber,
    payment_network: paymentNetwork,
    payment_proof: paymentProof || null,
    submitted_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// ─── Redeem code ─────────────────────────────────────────────────────────────
export async function redeemCode(userId: string, code: string): Promise<number> {
  const upperCode = code.toUpperCase().trim();

  const { data: redeemData, error: redeemError } = await supabase
    .from('redeem_codes')
    .select('*')
    .eq('code', upperCode)
    .eq('is_active', true)
    .maybeSingle();

  if (redeemError) throw new Error(redeemError.message);
  if (!redeemData) throw new Error('Invalid or expired redeem code');

  const now = new Date();
  if (redeemData.expires_at && new Date(redeemData.expires_at) < now) {
    throw new Error('This redeem code has expired');
  }
  if (redeemData.used_count >= redeemData.max_uses) {
    throw new Error('This redeem code has reached its maximum uses');
  }

  // Check if user already used this code
  const { data: usageData } = await supabase
    .from('redeem_usages')
    .select('id')
    .eq('code_id', redeemData.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (usageData) throw new Error('You have already used this redeem code');

  // Record usage
  const { error: usageError } = await supabase.from('redeem_usages').insert({
    code_id: redeemData.id,
    user_id: userId,
  });
  if (usageError) throw new Error(usageError.message);

  // Increment used count
  await supabase
    .from('redeem_codes')
    .update({ used_count: redeemData.used_count + 1 })
    .eq('id', redeemData.id);

  // Credit wallet
  const fresh = await refreshUser(userId);
  if (!fresh) throw new Error('Could not load account data');

  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: fresh.wallet_balance + redeemData.amount,
      total_earnings: fresh.total_earnings + redeemData.amount,
    })
    .eq('id', userId);
  if (walletError) throw new Error(walletError.message);

  return redeemData.amount;
}

// ─── Daily check-in (+200 UGX) ───────────────────────────────────────────────
export async function checkIn(userId: string): Promise<void> {
  const CHECKIN_REWARD = 200;
  const today = new Date().toISOString().split('T')[0];

  // Check if already checked in today
  const startOfDay = new Date(today + 'T00:00:00.000Z').toISOString();
  const endOfDay = new Date(today + 'T23:59:59.999Z').toISOString();

  const { data: existing } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('checked_at', startOfDay)
    .lte('checked_at', endOfDay)
    .maybeSingle();

  if (existing) throw new Error('Already checked in today. Come back tomorrow!');

  // Record check-in
  const { error: checkInError } = await supabase.from('check_ins').insert({
    user_id: userId,
    checked_at: new Date().toISOString(),
  });
  if (checkInError) throw new Error(checkInError.message);

  // Credit reward
  const fresh = await refreshUser(userId);
  if (!fresh) throw new Error('Could not load account data');

  const { error: walletError } = await supabase
    .from('platform_users')
    .update({
      wallet_balance: fresh.wallet_balance + CHECKIN_REWARD,
      total_earnings: fresh.total_earnings + CHECKIN_REWARD,
      daily_earnings: fresh.daily_earnings + CHECKIN_REWARD,
    })
    .eq('id', userId);
  if (walletError) throw new Error(walletError.message);
}

// ─── Change password ─────────────────────────────────────────────────────────
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const currentHash = await hashPassword(currentPassword);

  const { data, error } = await supabase
    .from('platform_users')
    .select('id')
    .eq('id', userId)
    .eq('password_hash', currentHash)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Current password is incorrect');

  const newHash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from('platform_users')
    .update({ password_hash: newHash })
    .eq('id', userId);
  if (updateError) throw new Error(updateError.message);
}

// ─── Update wallet details ────────────────────────────────────────────────────
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
  if (error) throw new Error(error.message);
}
