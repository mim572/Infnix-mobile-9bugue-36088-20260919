import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/crypto';

export interface PlatformUser {
  id: string; name: string; phone: string; password_hash: string;
  referral_code: string; referred_by: string | null; wallet_balance: number;
  total_earnings: number; total_withdrawals: number; referral_earnings: number;
  daily_earnings: number; is_banned: boolean; is_admin: boolean;
  wallet_network: string | null; wallet_phone: string | null; wallet_name: string | null;
  registered_at: string;
}
function generateReferralCode(): string { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

export async function refreshUser(userId: string): Promise<PlatformUser | null> {
  const { data } = await supabase.from('platform_users').select('*').eq('id', userId).single();
  return (data as PlatformUser) || null;
}
export async function registerUser(name: string, phone: string, password: string, referralCode?: string): Promise<{ user: PlatformUser | null; error: string | null }> {
  const { data: existing } = await supabase.from('platform_users').select('id').eq('phone', phone).maybeSingle();
  if (existing) return { user: null, error: 'Phone number already registered.' };
  let referredById: string | null = null;
  if (referralCode) { const { data: r } = await supabase.from('platform_users').select('id').eq('referral_code', referralCode.toUpperCase()).maybeSingle(); if (r) referredById = r.id; }
  const hash = await hashPassword(password);
  const { data, error } = await supabase.from('platform_users').insert({ name, phone, password_hash: hash, referral_code: generateReferralCode(), referred_by: referredById, wallet_balance: 7000, total_earnings: 7000 }).select('*').single();
  if (error) return { user: null, error: 'Registration failed.' };
  return { user: data as PlatformUser, error: null };
}
export async function login(phone: string, password: string): Promise<{ user: PlatformUser | null; error: string | null }> {
  const { data } = await supabase.from('platform_users').select('*').eq('phone', phone).maybeSingle();
  if (!data) return { user: null, error: 'Phone number not found.' };
  if (data.is_banned) return { user: null, error: 'Account suspended.' };
  if (await hashPassword(password)!== data.password_hash) return { user: null, error: 'Incorrect password.' };
  return { user: data as PlatformUser, error: null };
}
export const loginUser = login;

// ── FIXED FOR HomePage.tsx ──
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('check_ins').select('id').eq('user_id', userId).gte('checked_at', `${today}T00:00:00.000Z`).lte('checked_at', `${today}T23:59:59.999Z`).maybeSingle();
  return!!data;
}
export async function doCheckIn(userId: string): Promise<{ success: boolean; error: string | null }> {
  if (await hasCheckedInToday(userId)) return { success: false, error: 'Already checked in today' };
  const { data: user } = await supabase.from('platform_users').select('wallet_balance, total_earnings').eq('id', userId).single();
  if (!user) return { success: false, error: 'User not found' };
  await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance + 200, total_earnings: user.total_earnings + 200 }).eq('id', userId);
  await supabase.from('check_ins').insert({ user_id: userId });
  return { success: true, error: null };
}
export async function redeemCode(userId: string, code: string): Promise<{ success?: boolean; amount?: number; error: string | null }> {
  const { data: c } = await supabase.from('redeem_codes').select('*').eq('code', code.toUpperCase()).eq('is_active', true).maybeSingle();
  if (!c) return { amount: 0, error: 'Invalid code.' };
  if (new Date(c.expires_at) < new Date()) return { amount: 0, error: 'Code expired.' };
  if (c.used_count >= c.max_uses) return { amount: 0, error: 'Code limit reached.' };
  const { data: used } = await supabase.from('redeem_usages').select('id').eq('code_id', c.id).eq('user_id', userId).maybeSingle();
  if (used) return { amount: 0, error: 'Already used.' };
  const { data: user } = await supabase.from('platform_users').select('wallet_balance, total_earnings').eq('id', userId).single();
  if (user) await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance + c.amount, total_earnings: user.total_earnings + c.amount }).eq('id', userId);
  await supabase.from('redeem_usages').insert({ code_id: c.id, user_id: userId });
  await supabase.from('redeem_codes').update({ used_count: c.used_count + 1 }).eq('id', c.id);
  return { success: true, amount: c.amount, error: null };
}
export async function getUserRecharges(userId: string) {
  const { data } = await supabase.from('investment_packages').select('*').eq('user_id', userId).eq('product_name', 'Recharge').order('submitted_at', { ascending: false });
  return data || [];
}

// ── FIXED FOR BuyPackagePage.tsx — SUPPORTS YOUR EXACT CALL ──
export async function buyPackage(...args: any[]): Promise<{ success?: boolean; error: string | null }> {
  // Your page calls: buyPackage(userObj, {name, group, amount, dailyIncome, durationDays}, phone, network, proof)
  let userId: string, productName: string, productGroup: string, amount: number, dailyIncome: number, durationDays: number, userName: string, userPhone: string, referredBy: string | null = null, walletBalance: number;

  if (typeof args[0] === 'object' && args[0]!== null && args[0].id) {
    // New style from BuyPackagePage.tsx
    const user = args[0] as PlatformUser;
    const product = args[1] as { name: string; group: string; amount: number; dailyIncome: number; durationDays: number };
    userId = user.id; userName = user.name; userPhone = user.phone; walletBalance = user.wallet_balance; referredBy = user.referred_by;
    productName = product.name; productGroup = product.group; amount = product.amount; dailyIncome = product.dailyIncome; durationDays = product.durationDays;
  } else {
    // Old style: buyPackage(userId, productName, productGroup, amount, dailyIncome, durationDays)
    [userId, productName, productGroup, amount, dailyIncome, durationDays] = args;
    const { data: u } = await supabase.from('platform_users').select('wallet_balance, name, phone, referred_by').eq('id', userId).single();
    if (!u) return { success: false, error: 'User not found' };
    walletBalance = u.wallet_balance; userName = u.name; userPhone = u.phone; referredBy = u.referred_by;
  }

  if (walletBalance < amount) return { success: false, error: 'Insufficient wallet balance. Please recharge first.' };

  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + durationDays * 86400000).toISOString();

  const { error: pkgError } = await supabase.from('investment_packages').insert({
    user_id: userId, user_name: userName, user_phone: userPhone,
    product_name: productName, product_group: productGroup,
    amount, daily_income: dailyIncome, duration_days: durationDays,
    status: 'active', buy_date: now, expiry_date: expiry, last_income_date: now,
    payment_network: 'Wallet', payment_number: 'wallet'
  });
  if (pkgError) return { success: false, error: pkgError.message };

  await supabase.from('platform_users').update({ wallet_balance: walletBalance - amount }).eq('id', userId);

  // L1 commission 27%
  if (referredBy) {
    const commission = Math.floor(amount * 0.27);
    const { data: ref } = await supabase.from('platform_users').select('wallet_balance, referral_earnings').eq('id', referredBy).single();
    if (ref) await supabase.from('platform_users').update({ wallet_balance: ref.wallet_balance + commission, referral_earnings: ref.referral_earnings + commission, total_earnings: ref.referral_earnings + commission }).eq('id', referredBy);
  }

  return { success: true, error: null };
}

// ── Other helpers ──
export async function submitWithdrawal(userId: string, amount: number) {
  if (amount < 7000) return { success: false, error: 'Min 7000 UGX' };
  const { data: user } = await supabase.from('platform_users').select('*').eq('id', userId).single();
  if (!user || user.wallet_balance < amount) return { success: false, error: 'Insufficient balance' };
  const tax = Math.floor(amount * 0.18); const net = amount - tax;
  await supabase.from('withdrawal_requests').insert({ user_id: userId, user_name: user.name, user_phone: user.phone, amount, net_amount: net, tax, wallet_network: user.wallet_network, wallet_phone: user.wallet_phone, wallet_name: user.wallet_name, status: 'pending' });
  await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance - amount }).eq('id', userId);
  return { success: true, error: null };
}
export async function submitRecharge(userId: string, amount: number, network: string, number: string, proof: string) {
  if (amount < 15000) return { success: false, error: 'Min 15000 UGX' };
  const { data: user } = await supabase.from('platform_users').select('name, phone').eq('id', userId).single();
  await supabase.from('investment_packages').insert({ user_id: userId, user_name: user?.name, user_phone: user?.phone, product_name: 'Recharge', product_group: 'Recharge', amount, daily_income: 0, duration_days: 0, status: 'pending', payment_network: network, payment_number: number, payment_proof: proof });
  return { success: true, error: null };
}
export const checkIn = doCheckIn;
export const performCheckIn = doCheckIn;
export async function changePassword(userId: string, oldP: string, newP: string) {
  const { data: u } = await supabase.from('platform_users').select('password_hash').eq('id', userId).single();
  if (!u) return { success: false, error: 'User not found' };
  if (await hashPassword(oldP)!== u.password_hash) return { success: false, error: 'Current password incorrect' };
  await supabase.from('platform_users').update({ password_hash: await hashPassword(newP) }).eq('id', userId);
  return { success: true, error: null };
}
export async function updateWalletDetails(userId: string, net: string, phone: string, name: string) {
  await supabase.from('platform_users').update({ wallet_network: net, wallet_phone: phone, wallet_name: name }).eq('id', userId);
  return { success: true, error: null };
}
export async function getUserPackages(userId: string) { const { data } = await supabase.from('investment_packages').select('*').eq('user_id', userId).order('submitted_at', { ascending: false }); return data || []; }
export async function getUserWithdrawals(userId: string) { const { data } = await supabase.from('withdrawal_requests').select('*').eq('user_id', userId).order('requested_at', { ascending: false }); return data || []; }
export async function getClaimedMissions(userId: string) { const { data } = await supabase.from('mission_claims').select('mission_id').eq('user_id', userId); return (data || []).map((d: any) => d.mission_id); }
export async function claimMission(userId: string, missionId: string, reward: number) {
  const { data: user } = await supabase.from('platform_users').select('wallet_balance, total_earnings').eq('id', userId).single();
  if (user) await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance + reward, total_earnings: user.total_earnings + reward }).eq('id', userId);
  await supabase.from('mission_claims').insert({ user_id: userId, mission_id: missionId });
}
export async function getTeamStats(userId: string) {
  const { data: l1 } = await supabase.from('platform_users').select('*').eq('referred_by', userId);
  return { l1Members: l1 || [], l2Members: [], l3Members: [], totalTeam: l1?.length || 0 };
}
export const getTeamTree = getTeamStats;
export const updateWalletSettings = updateWalletDetails;
export const updateWallet = updateWalletDetails;
export const saveWallet = updateWalletDetails;
export const requestWithdrawal = submitWithdrawal;
