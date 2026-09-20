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

export async function refreshUser(userId: string): Promise<PlatformUser | null> {
  const { data, error } = await supabase.from('platform_users').select('*').eq('id', userId).single();
  if (error) { console.error('refreshUser error:', error); return null; }
  return data as PlatformUser;
}
function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = ''; for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}
export async function registerUser(name: string, phone: string, password: string, referralCode?: string): Promise<PlatformUser> {
  const { data: existing } = await supabase.from('platform_users').select('id').eq('phone', phone).maybeSingle();
  if (existing) throw new Error('Phone number already registered.');
  const password_hash = await hashPassword(password);
  let referredBy: string | null = null;
  if (referralCode) {
    const { data: referrer } = await supabase.from('platform_users').select('id').eq('referral_code', referralCode.toUpperCase()).maybeSingle();
    if (referrer) referredBy = referrer.id;
  }
  let newCode = generateReferralCode(); let codeExists = true;
  while (codeExists) {
    const { data: check } = await supabase.from('platform_users').select('id').eq('referral_code', newCode).maybeSingle();
    if (!check) codeExists = false; else newCode = generateReferralCode();
  }
  const { data, error } = await supabase.from('platform_users').insert({ name, phone, password_hash, referral_code: newCode, referred_by: referredBy, wallet_balance: 7000, total_earnings: 7000 }).select().single();
  if (error) throw new Error(error.message);
  return data as PlatformUser;
}
export const register = async (name:string, phone:string, password:string, referralCode?:string) => {
  try { const user = await registerUser(name,phone,password,referralCode); return { user, error: null }; }
  catch(e:any){ return { user: null, error: e.message }; }
};
export async function login(phone: string, password: string): Promise<PlatformUser> {
  const { data: user, error } = await supabase.from('platform_users').select('*').eq('phone', phone).maybeSingle();
  if (error) throw new Error(error.message);
  if (!user) throw new Error('Phone number not found.');
  const password_hash = await hashPassword(password);
  if (user.password_hash!== password_hash) throw new Error('Incorrect password.');
  if (user.is_banned) throw new Error('Your account has been banned. Contact support.');
  return user as PlatformUser;
}
export const loginUser = login;

// Flexible buyPackage — supports BOTH old and new call styles
export async function buyPackage(params: any): Promise<void> {
  let userId, userName, userPhone, productName, productGroup, amount, dailyIncome, durationDays;
  if (params && params.user && params.product) {
    // old style: buyPackage(user, product)
    const user = params.user; const product = params.product;
    userId = user.id; userName = user.name; userPhone = user.phone;
    productName = product.name; productGroup = product.group; amount = product.amount;
    dailyIncome = product.dailyIncome; durationDays = product.durationDays;
  } else {
    ({ userId, userName, userPhone, productName, productGroup, amount, dailyIncome, durationDays } = params);
  }
  const { data: user, error: fetchError } = await supabase.from('platform_users').select('wallet_balance, referred_by').eq('id', userId).single();
  if (fetchError) throw new Error(fetchError.message);
  if (!user) throw new Error('User not found.');
  if (user.wallet_balance < amount) throw new Error('Insufficient wallet balance.');
  const now = new Date().toISOString();
  const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const { error: walletError } = await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance - amount }).eq('id', userId);
  if (walletError) throw new Error(walletError.message);
  const { error: pkgError } = await supabase.from('investment_packages').insert({ user_id: userId, user_name: userName, user_phone: userPhone, product_name: productName, product_group: productGroup, amount, daily_income: dailyIncome, duration_days: durationDays, status: 'active', buy_date: now, expiry_date: expiryDate, last_income_date: now, payment_number: 'wallet', payment_network: 'Wallet' });
  if (pkgError) throw new Error(pkgError.message);
  if (user.referred_by) {
    const commission = Math.floor(amount * 0.27);
    const { data: referrer } = await supabase.from('platform_users').select('wallet_balance, referral_earnings, total_earnings').eq('id', user.referred_by).single();
    if (referrer) await supabase.from('platform_users').update({ wallet_balance: referrer.wallet_balance + commission, referral_earnings: referrer.referral_earnings + commission, total_earnings: referrer.total_earnings + commission }).eq('id', user.referred_by);
  }
}

export async function submitWithdrawal(params: any): Promise<void> {
  const TAX_RATE = 0.18; const MIN_WITHDRAWAL = 7000;
  let userId, userName, userPhone, amount, walletNetwork, walletPhone, walletName;
  if (params && params.amount && params.user) { // old style submitWithdrawal(user, amount)
    const user = params.user; amount = params.amount;
    userId = user.id; userName = user.name; userPhone = user.phone;
    walletNetwork = user.wallet_network; walletPhone = user.wallet_phone; walletName = user.wallet_name;
  } else {
    ({ userId, userName, userPhone, amount, walletNetwork, walletPhone, walletName } = params);
  }
  if (amount < MIN_WITHDRAWAL) throw new Error(`Minimum withdrawal amount is UGX ${MIN_WITHDRAWAL.toLocaleString()}.`);
  const { data: user, error: fetchError } = await supabase.from('platform_users').select('wallet_balance').eq('id', userId).single();
  if (fetchError) throw new Error(fetchError.message);
  if (!user) throw new Error('User not found.');
  if (user.wallet_balance < amount) throw new Error('Insufficient wallet balance.');
  const tax = Math.floor(amount * TAX_RATE); const netAmount = amount - tax;
  const { error: walletError } = await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance - amount }).eq('id', userId);
  if (walletError) throw new Error(walletError.message);
  const { error: wdError } = await supabase.from('withdrawal_requests').insert({ user_id: userId, user_name: userName, user_phone: userPhone, amount, net_amount: netAmount, tax, wallet_network: walletNetwork, wallet_phone: walletPhone, wallet_name: walletName, status: 'pending' });
  if (wdError) throw new Error(wdError.message);
}
export async function submitRecharge(params: any): Promise<void> {
  const MIN_RECHARGE = 15000; if (params.amount < MIN_RECHARGE) throw new Error(`Minimum recharge amount is UGX ${MIN_RECHARGE.toLocaleString()}.`);
  const { error } = await supabase.from('investment_packages').insert({ user_id: params.userId, user_name: params.userName, user_phone: params.userPhone, product_name: 'Recharge', product_group: 'Recharge', amount: params.amount, daily_income: 0, duration_days: 0, status: 'pending', payment_number: params.paymentNumber, payment_network: params.paymentNetwork, payment_proof: params.paymentProof || null });
  if (error) throw new Error(error.message);
}
export async function redeemCode(userId: string, code: string): Promise<number> {
  const { data: codeData, error: codeError } = await supabase.from('redeem_codes').select('*').eq('code', code.toUpperCase()).eq('is_active', true).maybeSingle();
  if (codeError) throw new Error(codeError.message);
  if (!codeData) throw new Error('Invalid or expired redeem code.');
  if (new Date(codeData.expires_at) < new Date()) throw new Error('This redeem code has expired.');
  if (codeData.used_count >= codeData.max_uses) throw new Error('This redeem code has reached its usage limit.');
  const { data: usageCheck } = await supabase.from('redeem_usages').select('id').eq('code_id', codeData.id).eq('user_id', userId).maybeSingle();
  if (usageCheck) throw new Error('You have already used this redeem code.');
  const { data: user, error: userError } = await supabase.from('platform_users').select('wallet_balance, total_earnings').eq('id', userId).single();
  if (userError) throw new Error(userError.message); if (!user) throw new Error('User not found.');
  const { error: walletError } = await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance + codeData.amount, total_earnings: user.total_earnings + codeData.amount }).eq('id', userId);
  if (walletError) throw new Error(walletError.message);
  await supabase.from('redeem_usages').insert({ code_id: codeData.id, user_id: userId });
  await supabase.from('redeem_codes').update({ used_count: codeData.used_count + 1 }).eq('id', codeData.id);
  return codeData.amount;
}
export async function checkIn(userId: string): Promise<void> {
  const CHECKIN_REWARD = 200; const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('check_ins').select('id, checked_at').eq('user_id', userId).order('checked_at', { ascending: false }).limit(1).maybeSingle();
  if (existing) { const lastDate = new Date(existing.checked_at).toISOString().split('T')[0]; if (lastDate === today) throw new Error('You have already checked in today. Come back tomorrow!'); }
  const { data: user, error: userError } = await supabase.from('platform_users').select('wallet_balance, total_earnings, daily_earnings').eq('id', userId).single();
  if (userError) throw new Error(userError.message); if (!user) throw new Error('User not found.');
  const { error: walletError } = await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance + CHECKIN_REWARD, total_earnings: user.total_earnings + CHECKIN_REWARD, daily_earnings: user.daily_earnings + CHECKIN_REWARD }).eq('id', userId);
  if (walletError) throw new Error(walletError.message);
  const { error: checkInError } = await supabase.from('check_ins').insert({ user_id: userId });
  if (checkInError) throw new Error(checkInError.message);
}
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const { data: user, error: fetchError } = await supabase.from('platform_users').select('password_hash').eq('id', userId).single();
  if (fetchError) throw new Error(fetchError.message); if (!user) throw new Error('User not found.');
  const currentHash = await hashPassword(currentPassword);
  if (user.password_hash!== currentHash) throw new Error('Current password is incorrect.');
  const newHash = await hashPassword(newPassword);
  const { error: updateError } = await supabase.from('platform_users').update({ password_hash: newHash }).eq('id', userId);
  if (updateError) throw new Error(updateError.message);
}
export async function updateWalletInfo(userId: string, walletNetwork: string, walletPhone: string, walletName: string): Promise<void> {
  const { error } = await supabase.from('platform_users').update({ wallet_network: walletNetwork, wallet_phone: walletPhone, wallet_name: walletName }).eq('id', userId);
  if (error) throw new Error(error.message);
}

// ── FIX: Missing exports that cause your build failure ──
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('check_ins').select('id').eq('user_id', userId).gte('checked_at', today + 'T00:00:00.000Z').lt('checked_at', today + 'T23:59:59.999Z').maybeSingle();
  return!!data;
}
export const doCheckIn = checkIn;
export const performCheckIn = checkIn;

export async function getUserPackages(userId: string) {
  const { data } = await supabase.from('investment_packages').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
  return data || [];
}
export async function getUserRecharges(userId: string) {
  const { data } = await supabase.from('investment_packages').select('*').eq('user_id', userId).eq('product_name', 'Recharge').order('submitted_at', { ascending: false });
  return data || [];
}
export async function getUserWithdrawals(userId: string) {
  const { data } = await supabase.from('withdrawal_requests').select('*').eq('user_id', userId).order('requested_at', { ascending: false });
  return data || [];
}
export async function getClaimedMissions(userId: string) {
  const { data } = await supabase.from('mission_claims').select('mission_id').eq('user_id', userId);
  return (data || []).map((d:any)=>d.mission_id);
}
export async function claimMission(userId: string, missionId: string, rewardAmount: number) {
  const { data: existing } = await supabase.from('mission_claims').select('id').eq('user_id', userId).eq('mission_id', missionId).maybeSingle();
  if (existing) throw new Error('Mission already claimed');
  const { data: user } = await supabase.from('platform_users').select('wallet_balance, total_earnings').eq('id', userId).single();
  if (user) await supabase.from('platform_users').update({ wallet_balance: user.wallet_balance + rewardAmount, total_earnings: user.total_earnings + rewardAmount }).eq('id', userId);
  await supabase.from('mission_claims').insert({ user_id: userId, mission_id: missionId });
}
export async function getTeamStats(userId: string) {
  const { data: l1Data } = await supabase.from('platform_users').select('*').eq('referred_by', userId);
  const l1Members = (l1Data || []) as PlatformUser[]; const l1Ids = l1Members.map(m=>m.id); let l2Members: PlatformUser[] = [];
  if (l1Ids.length>0){ const {data:l2Data}=await supabase.from('platform_users').select('*').in('referred_by',l1Ids); l2Members=(l2Data||[])as PlatformUser[]; }
  const l2Ids=l2Members.map(m=>m.id); let l3Members:PlatformUser[]=[];
  if(l2Ids.length>0){ const {data:l3Data}=await supabase.from('platform_users').select('*').in('referred_by',l2Ids); l3Members=(l3Data||[])as PlatformUser[]; }
  const { data: meData } = await supabase.from('platform_users').select('referral_earnings').eq('id', userId).single();
  return { l1Members, l2Members, l3Members, totalTeam: l1Members.length+l2Members.length+l3Members.length, totalReferralEarnings: meData?.referral_earnings||0 };
}
export const getTeamTree = async (userId:string)=>{ const s=await getTeamStats(userId); return{l1:s.l1Members,l2:s.l2Members,l3:s.l3Members}; };
export const getTeamData = getTeamTree;
export const getTeam = getTeamTree;
export const updateWalletSettings = updateWalletInfo;
export const updateWallet = updateWalletInfo;
export const saveWallet = updateWalletInfo;
export const requestWithdrawal = submitWithdrawal;
