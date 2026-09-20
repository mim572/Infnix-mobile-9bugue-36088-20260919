import { supabase } from '@/lib/supabase';

export interface PlatformUser {
  id: string; name: string; phone: string; password_hash?: string;
  referral_code: string; referred_by: string | null; wallet_balance: number;
  total_earnings: number; total_withdrawals: number; referral_earnings: number;
  daily_earnings: number; is_banned: boolean; is_admin: boolean;
  wallet_network: string | null; wallet_phone: string | null; wallet_name: string | null;
  registered_at: string;
}
export interface InvestmentPackage {
  id: string; user_id: string; user_name: string; user_phone: string;
  product_name: string; product_group: string; amount: number; daily_income: number;
  duration_days: number; status: string; buy_date: string | null; expiry_date: string | null;
  last_income_date: string | null; payment_number: string | null; payment_network: string | null;
  payment_proof: string | null; submitted_at: string;
}
export interface WithdrawalRequest {
  id: string; user_id: string; user_name: string; user_phone: string; amount: number;
  net_amount: number; tax: number; wallet_network: string; wallet_phone: string;
  wallet_name: string; status: string; admin_note: string | null;
  requested_at: string; processed_at: string | null;
}

export async function loginUser(phone: string, password: string) {
  const { data, error } = await supabase.from('platform_users').select('*').eq('phone', phone).single();
  if (error ||!data) return { user: null, error: 'Invalid phone number or password.' };
  const { hashPassword } = await import('@/lib/crypto');
  const hashed = await hashPassword(password);
  if (data.password_hash!== hashed) return { user: null, error: 'Invalid phone number or password.' };
  if (data.is_banned) return { user: null, error: 'Your account has been banned.' };
  return { user: data as PlatformUser, error: null };
}
export async function registerUser(name: string, phone: string, password: string, referralCode?: string) {
  const { data: existing } = await supabase.from('platform_users').select('id').eq('phone', phone).maybeSingle();
  if (existing) return { user: null, error: 'Phone number already registered.' };
  let referredBy: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase.from('platform_users').select('id').eq('referral_code', referralCode).maybeSingle();
    if (referrer) referredBy = referrer.id;
  }
  const { hashPassword } = await import('@/lib/crypto');
  const password_hash = await hashPassword(password);
  const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase.from('platform_users').insert({ name, phone, password_hash, referral_code: newReferralCode, referred_by: referredBy, wallet_balance: 7000, total_earnings: 7000 }).select().single();
  if (error) return { user: null, error: error.message };
  return { user: data as PlatformUser, error: null };
}
export async function refreshUser(userId: string) {
  const { data } = await supabase.from('platform_users').select('*').eq('id', userId).single();
  return data as PlatformUser | null;
}

async function creditReferralCommissionUser(userId: string, amount: number) {
  try {
    const RATES = [0.27, 0.02, 0.01];
    const { data: buyer } = await supabase.from('platform_users').select('referred_by').eq('id', userId).maybeSingle();
    if (!buyer?.referred_by) return;
    let currentId: string | null = buyer.referred_by; let level = 0;
    while (currentId && level < 3) {
      const { data: referrer } = await supabase.from('platform_users').select('id, wallet_balance, referral_earnings, total_earnings, referred_by').eq('id', currentId).maybeSingle();
      if (!referrer) break;
      const commission = Math.floor(amount * RATES[level]);
      if (commission > 0) await supabase.from('platform_users').update({ wallet_balance: referrer.wallet_balance + commission, referral_earnings: (referrer.referral_earnings || 0) + commission, total_earnings: (referrer.total_earnings || 0) + commission }).eq('id', currentId);
      currentId = referrer.referred_by || null; level++;
    }
  } catch {}
}

export async function buyPackage(user: PlatformUser, product: { name: string; group: string; amount: number; dailyIncome: number; durationDays: number }, paymentNumber = 'Wallet', paymentNetwork = 'Wallet', paymentProof = 'Auto-activated') {
  if (user.wallet_balance < product.amount) return { error: `Insufficient balance. You need ${product.amount.toLocaleString()} UGX.` };
  const now = new Date(); const expiryDate = new Date(now); expiryDate.setDate(expiryDate.getDate() + product.durationDays);
  const { error: pkgError } = await supabase.from('investment_packages').insert({ user_id: user.id, user_name: user.name, user_phone: user.phone, product_name: product.name, product_group: product.group, amount: product.amount, daily_income: product.dailyIncome, duration_days: product.durationDays, status: 'active', buy_date: now.toISOString(), expiry_date: expiryDate.toISOString(), last_income_date: now.toISOString(), payment_number: paymentNumber, payment_network: paymentNetwork, payment_proof: paymentProof });
  if (pkgError) return { error: `Purchase failed: ${pkgError.message}` };
  const { error: walletError } = await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance - product.amount }).eq('id', user.id);
  if (walletError) return { error: walletError.message };
  await creditReferralCommissionUser(user.id, product.amount);
  return { error: null };
}

export async function getUserPackages(userId: string) {
  const { data } = await supabase.from('investment_packages').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
  return (data || []) as InvestmentPackage[];
}
export async function getUserRecharges(userId: string) {
  const { data } = await supabase.from('investment_packages').select('*').eq('user_id', userId).eq('product_name', 'RECHARGE').order('submitted_at', { ascending: false });
  return (data || []) as InvestmentPackage[];
}
export async function submitRecharge(user: PlatformUser, amount: number, payerName: string, payerPhone: string, network: 'MTN' | 'Airtel', proofMessage: string) {
  const { error } = await supabase.from('investment_packages').insert({ user_id: user.id, user_name: user.name, user_phone: user.phone, product_name: 'RECHARGE', product_group: 'Recharge', amount, daily_income: 0, duration_days: 0, status: 'pending', payment_number: payerPhone, payment_network: network, payment_proof: `Name: ${payerName} | Phone: ${payerPhone} | Proof: ${proofMessage}` });
  return { error: error?.message || null };
}

export async function requestWithdrawal(user: PlatformUser, amount: number) {
  if (amount < 7000) return { error: 'Minimum withdrawal is 7,000 UGX.' };
  if (user.wallet_balance < amount) return { error: 'Insufficient balance.' };
  if (!user.wallet_name ||!user.wallet_phone ||!user.wallet_network) return { error: 'Please add your wallet details first.' };
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('requested_at', today + 'T00:00:00Z').lte('requested_at', today + 'T23:59:59Z');
  if ((count?? 0) >= 2) return { error: 'You have reached the daily withdrawal limit of 2.' };
  const tax = Math.round(amount * 0.18); const net_amount = amount - tax;
  const { error } = await supabase.from('withdrawal_requests').insert({ user_id: user.id, user_name: user.name, user_phone: user.phone, amount, net_amount, tax, wallet_network: user.wallet_network, wallet_phone: user.wallet_phone, wallet_name: user.wallet_name, status: 'pending' });
  return { error: error?.message || null };
}
export async function getUserWithdrawals(userId: string) {
  const { data } = await supabase.from('withdrawal_requests').select('*').eq('user_id', userId).order('requested_at', { ascending: false });
  return (data || []) as WithdrawalRequest[];
}

export async function performCheckIn(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('check_ins').select('id').eq('user_id', userId).gte('checked_at', today + 'T00:00:00Z').lte('checked_at', today + 'T23:59:59Z').maybeSingle();
  if (existing) return { error: null, alreadyDone: true };
  const { error: ciError } = await supabase.from('check_ins').insert({ user_id: userId });
  if (ciError) return { error: ciError.message, alreadyDone: false };
  const { data: userData } = await supabase.from('platform_users').select('wallet_balance, total_earnings, daily_earnings').eq('id', userId).single();
  if (userData) await supabase.from('platform_users').update({ wallet_balance: userData.wallet_balance + 100, total_earnings: userData.total_earnings + 100, daily_earnings: userData.daily_earnings + 100 }).eq('id', userId);
  return { error: null, alreadyDone: false };
}
export async function hasCheckedInToday(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('check_ins').select('id').eq('user_id', userId).gte('checked_at', today + 'T00:00:00Z').lte('checked_at', today + 'T23:59:59Z').maybeSingle();
  return!!data;
}
export async function redeemCode(userId: string, code: string) {
  const { data: codeData } = await supabase.from('redeem_codes').select('*').eq('code', code.toUpperCase()).maybeSingle();
  if (!codeData) return { amount: 0, error: 'Invalid redeem code.' };
  if (!codeData.is_active) return { amount: 0, error: 'This code is no longer active.' };
  if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) return { amount: 0, error: 'This code has expired.' };
  if (codeData.used_count >= codeData.max_uses) return { amount: 0, error: 'This code has reached its usage limit.' };
  const { data: usageData } = await supabase.from('redeem_usages').select('id').eq('code_id', codeData.id).eq('user_id', userId).maybeSingle();
  if (usageData) return { amount: 0, error: 'You have already used this code.' };
  const { error: usageError } = await supabase.from('redeem_usages').insert({ code_id: codeData.id, user_id: userId });
  if (usageError) return { amount: 0, error: usageError.message };
  await supabase.from('redeem_codes').update({ used_count: codeData.used_count + 1 }).eq('id', codeData.id);
  const { data: userData } = await supabase.from('platform_users').select('wallet_balance, total_earnings').eq('id', userId).single();
  if (userData) await supabase.from('platform_users').update({ wallet_balance: userData.wallet_balance + codeData.amount, total_earnings: userData.total_earnings + codeData.amount }).eq('id', userId);
  return { amount: codeData.amount, error: null };
}
export async function updateWallet(userId: string, walletNetwork: string, walletPhone: string, walletName: string) {
  const { error } = await supabase.from('platform_users').update({ wallet_network: walletNetwork, wallet_phone: walletPhone, wallet_name: walletName }).eq('id', userId);
  return { error: error?.message || null };
}
export async function getTeamTree(userId: string) {
  const { data: l1Data } = await supabase.from('platform_users').select('*').eq('referred_by', userId);
  const l1 = (l1Data || []) as PlatformUser[]; const l1Ids = l1.map(u => u.id);
  if (!l1Ids.length) return { l1, l2: [], l3: [] };
  const { data: l2Data } = await supabase.from('platform_users').select('*').in('referred_by', l1Ids);
  const l2 = (l2Data || []) as PlatformUser[]; const l2Ids = l2.map(u => u.id);
  if (!l2Ids.length) return { l1, l2, l3: [] };
  const { data: l3Data } = await supabase.from('platform_users').select('*').in('referred_by', l2Ids);
  const l3 = (l3Data || []) as PlatformUser[];
  return { l1, l2, l3 };
}
export async function claimMission(userId: string, missionId: string, reward: number) {
  const { data: existing } = await supabase.from('mission_claims').select('id').eq('user_id', userId).eq('mission_id', missionId).maybeSingle();
  if (existing) return { error: 'Mission already claimed.' };
  const { error: claimError } = await supabase.from('mission_claims').insert({ user_id: userId, mission_id: missionId });
  if (claimError) return { error: claimError.message };
  const { data: userData } = await supabase.from('platform_users').select('wallet_balance, total_earnings').eq('id', userId).single();
  if (userData) await supabase.from('platform_users').update({ wallet_balance: userData.wallet_balance + reward, total_earnings: userData.total_earnings + reward }).eq('id', userId);
  return { error: null };
}
export async function getClaimedMissions(userId: string) {
  const { data } = await supabase.from('mission_claims').select('mission_id').eq('user_id', userId);
  return (data || []).map(d => d.mission_id);
}
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const { hashPassword } = await import('@/lib/crypto');
  const currentHash = await hashPassword(currentPassword);
  const { data } = await supabase.from('platform_users').select('id').eq('id', userId).eq('password_hash', currentHash).maybeSingle();
  if (!data) return { error: 'Current password is incorrect.' };
  const newHash = await hashPassword(newPassword);
  const { error } = await supabase.from('platform_users').update({ password_hash: newHash }).eq('id', userId);
  return { error: error?.message || null };
}

// COMPATIBILITY - these make old pages work without crashing
export function submitWithdrawal(user: PlatformUser, amount: number) { return requestWithdrawal(user, amount); }
export function saveWallet(userId: string, network: string, phone: string, name: string) { return updateWallet(userId, network, phone, name); }
export function doCheckIn(userId: string) { return performCheckIn(userId); }
export function getTeamData(userId: string) { return getTeamTree(userId); }
export function getTeam(userId: string) { return getTeamTree(userId); }
