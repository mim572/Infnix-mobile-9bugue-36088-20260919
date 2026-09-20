import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';

export interface PlatformUser {
  id: string;
  name: string;
  phone: string;
  password_hash?: string;
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

// ─── Refresh user ─────────────────────────
export async function refreshUser(userId: string): Promise<PlatformUser | null> {
  const { data, error } = await supabase.from('platform_users').select('*').eq('id', userId).single();
  if (error) { console.error('refreshUser error:', error); return null; }
  return data as PlatformUser;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = ''; for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// ─── Register (supports BOTH styles) ──────
export async function register(name: string, phone: string, password: string, referralCode?: string): Promise<PlatformUser> {
  const { data: existing } = await supabase.from('platform_users').select('id').eq('phone', phone).maybeSingle();
  if (existing) throw new Error('Phone number already registered');
  const passwordHash = await hashPassword(password);
  const myReferralCode = generateReferralCode();
  let referredById: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase.from('platform_users').select('id').eq('referral_code', referralCode.toUpperCase()).maybeSingle();
    if (referrer) referredById = referrer.id;
  }
  const { data, error } = await supabase.from('platform_users').insert({ name, phone, password_hash: passwordHash, referral_code: myReferralCode, referred_by: referredById, wallet_balance: 7000, total_earnings: 7000 }).select().single();
  if (error) throw new Error(error.message);
  return data as PlatformUser;
}

// Wrapper for RegisterPage.tsx which expects {user, error}
export async function registerUser(name: string, phone: string, password: string, referralCode?: string): Promise<{ user: PlatformUser | null; error: string | null }> {
  try {
    const user = await register(name, phone, password, referralCode);
    return { user, error: null };
  } catch (e: any) {
    return { user: null, error: e.message || 'Registration failed' };
  }
}

// ─── Login ────────────────────────────────
export async function login(phone: string, password: string): Promise<PlatformUser> {
  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase.from('platform_users').select('*').eq('phone', phone).eq('password_hash', passwordHash).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Invalid phone number or password');
  if (data.is_banned) throw new Error('Your account has been suspended. Contact support.');
  return data as PlatformUser;
}
export const loginUser = login;

// Compatibility wrapper for pages that expect {user, error}
export async function loginUserSafe(phone: string, password: string): Promise<{ user: PlatformUser | null; error: string | null }> {
  try { const user = await login(phone, password); return { user, error: null }; } catch (e: any) { return { user: null, error: e.message }; }
}

// ─── Check-in helpers for HomePage.tsx ───
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = new Date(today + 'T00:00:00.000Z').toISOString();
  const endOfDay = new Date(today + 'T23:59:59.999Z').toISOString();
  const { data } = await supabase.from('check_ins').select('id').eq('user_id', userId).gte('checked_at', startOfDay).lte('checked_at', endOfDay).maybeSingle();
  return!!data;
}

export async function doCheckIn(userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    if (await hasCheckedInToday(userId)) return { success: false, error: 'Already checked in today' };
    const fresh = await refreshUser(userId);
    if (!fresh) return { success: false, error: 'Could not load account data' };
    await supabase.from('check_ins').insert({ user_id: userId, checked_at: new Date().toISOString() });
    await supabase.from('platform_users').update({ wallet_balance: fresh.wallet_balance + 200, total_earnings: fresh.total_earnings + 200, daily_earnings: (fresh.daily_earnings || 0) + 200 }).eq('id', userId);
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
export async function checkIn(userId: string): Promise<void> {
  const res = await doCheckIn(userId);
  if (!res.success) throw new Error(res.error || 'Check-in failed');
}
export const performCheckIn = doCheckIn;

// ─── Buy Package - FLEXIBLE (fixes white screen) ───
export async function buyPackage(...args: any[]): Promise<{ success?: boolean; error: string | null } | void> {
  try {
    let userId: string, userName: string, userPhone: string, productName: string, productGroup: string, amount: number, dailyIncome: number, durationDays: number, referredBy: string | null = null, walletBalance: number;

    // NEW STYLE: buyPackage(userObj, {name, group, amount, dailyIncome, durationDays}, phone, network, proof)
    if (typeof args[0] === 'object' && args[0]?.id) {
      const user = args[0] as PlatformUser;
      const product = args[1] as any;
      userId = user.id; userName = user.name; userPhone = user.phone; walletBalance = user.wallet_balance; referredBy = user.referred_by || null;
      productName = product.name; productGroup = product.group; amount = product.amount; dailyIncome = product.dailyIncome; durationDays = product.durationDays;
    }
    // OLD STYLE: buyPackage(userId, userName, userPhone, productName, productGroup, amount, dailyIncome, durationDays)
    else if (args.length >= 8) {
      [userId, userName, userPhone, productName, productGroup, amount, dailyIncome, durationDays] = args;
      const fresh = await refreshUser(userId);
      if (!fresh) throw new Error('Could not load account data');
      walletBalance = fresh.wallet_balance; referredBy = fresh.referred_by;
    }
    // MIDDLE STYLE: buyPackage(userId, productName, productGroup, amount, dailyIncome, durationDays)
    else {
      [userId, productName, productGroup, amount, dailyIncome, durationDays] = args;
      const fresh = await refreshUser(userId);
      if (!fresh) throw new Error('Could not load account data');
      walletBalance = fresh.wallet_balance; userName = fresh.name; userPhone = fresh.phone; referredBy = fresh.referred_by;
    }

    if (walletBalance < amount) throw new Error('Insufficient wallet balance. Please recharge first.');

    const now = new Date().toISOString();
    const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: pkgError } = await supabase.from('investment_packages').insert({
      user_id: userId, user_name: userName, user_phone: userPhone, product_name: productName, product_group: productGroup,
      amount, daily_income: dailyIncome, duration_days: durationDays, status: 'active', buy_date: now, expiry_date: expiryDate,
      last_income_date: now, payment_number: userPhone, payment_network: 'Wallet', submitted_at: now,
    });
    if (pkgError) throw new Error(pkgError.message);

    await supabase.from('platform_users').update({ wallet_balance: walletBalance - amount }).eq('id', userId);

    if (referredBy) {
      const commission = Math.floor(amount * 0.27);
      const { data: ref } = await supabase.from('platform_users').select('wallet_balance, referral_earnings, total_earnings').eq('id', referredBy).single();
      if (ref) await supabase.from('platform_users').update({ wallet_balance: ref.wallet_balance + commission, referral_earnings: ref.referral_earnings + commission, total_earnings: ref.total_earnings + commission }).eq('id', referredBy);
    }

    return { success: true, error: null };
  } catch (e: any) {
    // Return error object for BuyPackagePage.tsx (expects {error})
    return { success: false, error: e.message || 'Failed to buy package' };
  }
}

// ─── Withdrawal ───────────────────────────
export async function submitWithdrawal(...args: any[]): Promise<{ success: boolean; error: string | null } | void> {
  try {
    let userId: string, amount: number, walletNetwork: string, walletPhone: string, walletName: string, userName: string, userPhone: string;
    if (args.length === 2) {
      [userId, amount] = args;
      const fresh = await refreshUser(userId);
      if (!fresh) throw new Error('Could not load account data');
      if (fresh.wallet_balance < amount) throw new Error('Insufficient wallet balance');
      if (amount < 7000) throw new Error('Minimum withdrawal is 7,000 UGX');
      if (!fresh.wallet_network) throw new Error('Set wallet details first');
      userName = fresh.name; userPhone = fresh.phone; walletNetwork = fresh.wallet_network!; walletPhone = fresh.wallet_phone!; walletName = fresh.wallet_name!;
      const tax = Math.floor(amount * 0.18); const net = amount - tax;
      await supabase.from('platform_users').update({ wallet_balance: fresh.wallet_balance - amount }).eq('id', userId);
      await supabase.from('withdrawal_requests').insert({ user_id: userId, user_name: userName, user_phone: userPhone, amount, net_amount: net, tax, wallet_network: walletNetwork, wallet_phone: walletPhone, wallet_name: walletName, status: 'pending' });
    } else {
      [userId, userName, userPhone, amount, walletNetwork, walletPhone, walletName] = args;
      const TAX_RATE = 0.18; const tax = Math.floor(amount * TAX_RATE); const netAmount = amount - tax;
      const fresh = await refreshUser(userId);
      if (!fresh) throw new Error('Could not load account data');
      if (fresh.wallet_balance < amount) throw new Error('Insufficient wallet balance');
      if (amount < 7000) throw new Error('Minimum withdrawal is 7,000 UGX');
      await supabase.from('platform_users').update({ wallet_balance: fresh.wallet_balance - amount }).eq('id', userId);
      await supabase.from('withdrawal_requests').insert({ user_id: userId, user_name: userName, user_phone: userPhone, amount, net_amount: netAmount, tax, wallet_network: walletNetwork, wallet_phone: walletPhone, wallet_name: walletName, status: 'pending' });
    }
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
export const requestWithdrawal = submitWithdrawal;

// ─── Recharge ─────────────────────────────
export async function submitRecharge(...args: any[]): Promise<{ success: boolean; error: string | null } | void> {
  try {
    let userId: string, amount: number, paymentNetwork: string, paymentNumber: string, paymentProof: string | undefined, userName: string, userPhone: string;
    if (args.length >= 3 && typeof args[1] === 'number') {
      [userId, amount, paymentNetwork, paymentNumber, paymentProof] = args;
      const fresh = await refreshUser(userId);
      userName = fresh?.name || ''; userPhone = fresh?.phone || '';
    } else {
      [userId, userName, userPhone, amount, paymentNetwork, paymentNumber, paymentProof] = args;
    }
    if (amount < 15000) throw new Error('Minimum recharge amount is 15,000 UGX');
    await supabase.from('investment_packages').insert({ user_id: userId, user_name: userName, user_phone: userPhone, product_name: 'Recharge', product_group: 'Recharge', amount, daily_income: 0, duration_days: 0, status: 'recharge_pending', payment_number: paymentNumber, payment_network: paymentNetwork, payment_proof: paymentProof || null, submitted_at: new Date().toISOString() });
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Redeem - FIXED FOR HomePage (expects {amount, error}) ───
export async function redeemCode(userId: string, code: string): Promise<{ success?: boolean; amount?: number; error: string | null } | number> {
  try {
    const upperCode = code.toUpperCase().trim();
    const { data: redeemData } = await supabase.from('redeem_codes').select('*').eq('code', upperCode).eq('is_active', true).maybeSingle();
    if (!redeemData) throw new Error('Invalid or expired redeem code');
    if (redeemData.expires_at && new Date(redeemData.expires_at) < new Date()) throw new Error('This redeem code has expired');
    if (redeemData.used_count >= redeemData.max_uses) throw new Error('This redeem code has reached its maximum uses');
    const { data: usageData } = await supabase.from('redeem_usages').select('id').eq('code_id', redeemData.id).eq('user_id', userId).maybeSingle();
    if (usageData) throw new Error('You have already used this redeem code');
    await supabase.from('redeem_usages').insert({ code_id: redeemData.id, user_id: userId });
    await supabase.from('redeem_codes').update({ used_count: redeemData.used_count + 1 }).eq('id', redeemData.id);
    const fresh = await refreshUser(userId);
    if (fresh) await supabase.from('platform_users').update({ wallet_balance: fresh.wallet_balance + redeemData.amount, total_earnings: fresh.total_earnings + redeemData.amount }).eq('id', userId);
    // Return shape HomePage.tsx expects: {amount, error}
    return { success: true, amount: redeemData.amount, error: null };
  } catch (e: any) {
    return { amount: 0, error: e.message };
  }
}

// ─── Change password ──────────────────────
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success?: boolean; error?: string | null } | void> {
  try {
    const currentHash = await hashPassword(currentPassword);
    const { data } = await supabase.from('platform_users').select('id').eq('id', userId).eq('password_hash', currentHash).maybeSingle();
    if (!data) throw new Error('Current password is incorrect');
    const newHash = await hashPassword(newPassword);
    await supabase.from('platform_users').update({ password_hash: newHash }).eq('id', userId);
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Wallet details ───────────────────────
export async function updateWalletDetails(userId: string, walletNetwork: string, walletPhone: string, walletName: string): Promise<{ success: boolean; error: string | null } | void> {
  const { error } = await supabase.from('platform_users').update({ wallet_network: walletNetwork, wallet_phone: walletPhone, wallet_name: walletName }).eq('id', userId);
  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

// ─── Extra helpers used by other pages ───
export async function getUserRecharges(userId: string) {
  const { data } = await supabase.from('investment_packages').select('*').eq('user_id', userId).eq('product_name', 'Recharge').order('submitted_at', { ascending: false });
  return data || [];
}
export async function getUserPackages(userId: string) {
  const { data } = await supabase.from('investment_packages').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
  return data || [];
}
export async function getUserWithdrawals(userId: string) {
  const { data } = await supabase.from('withdrawal_requests').select('*').eq('user_id', userId).order('requested_at', { ascending: false });
  return data || [];
}
export async function getClaimedMissions(userId: string) {
  const { data } = await supabase.from('mission_claims').select('mission_id').eq('user_id', userId);
  return (data || []).map((d: any) => d.mission_id);
}
export async function claimMission(userId: string, missionId: string, reward: number) {
  const fresh = await refreshUser(userId);
  if (fresh) await supabase.from('platform_users').update({ wallet_balance: fresh.wallet_balance + reward, total_earnings: fresh.total_earnings + reward }).eq('id', userId);
  await supabase.from('mission_claims').insert({ user_id: userId, mission_id: missionId });
}
export async function getTeamStats(userId: string) {
  const { data: l1 } = await supabase.from('platform_users').select('*').eq('referred_by', userId);
  const l1Ids = (l1 || []).map((m: any) => m.id);
  let l2: any[] = []; if (l1Ids.length > 0) { const { data } = await supabase.from('platform_users').select('*').in('referred_by', l1Ids); l2 = data || []; }
  const l2Ids = l2.map((m: any) => m.id);
  let l3: any[] = []; if (l2Ids.length > 0) { const { data } = await supabase.from('platform_users').select('*').in('referred_by', l2Ids); l3 = data || []; }
  return { l1Members: l1 || [], l2Members: l2, l3Members: l3, totalTeam: (l1?.length || 0) + l2.length + l3.length };
}
export const getTeamTree = getTeamStats;
export const getTeamData = getTeamStats;
export const getTeam = getTeamStats;
export const updateWalletSettings = updateWalletDetails;
export const updateWallet = updateWalletDetails;
export const saveWallet = updateWalletDetails;
