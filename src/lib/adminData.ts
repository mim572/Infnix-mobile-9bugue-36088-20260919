import { supabase } from '@/lib/supabase';
import type { AdminStats } from '@/types/admin';
export interface RedeemCode { id: string; code: string; amount: number; max_uses: number; used_count: number; is_active: boolean; expires_at: string; created_at: string; }

// Auth
export function isAdminLoggedIn(){return!!localStorage.getItem('admin_session')}
export function adminLogin(p:string){if(p==='admin123'){localStorage.setItem('admin_session','true');return true}return false}
export function adminLogout(){localStorage.removeItem('admin_session');localStorage.removeItem('admin_logged')}

// Stats
export async function getAdminStats(): Promise<AdminStats> {
 try{
  const {count:totalUsers}=await supabase.from('platform_users').select('id',{count:'exact',head:true});
  const {data:packages}=await supabase.from('user_packages').select('status');
  const {data:deposits}=await supabase.from('recharge_requests').select('amount').eq('status','approved');
  const {data:withdrawals}=await supabase.from('withdrawal_requests').select('amount,status');
  return { totalUsers:totalUsers||0, totalActivePackages:packages?.filter((p:any)=>p.status==='active').length||0, totalPendingPackages:packages?.filter((p:any)=>p.status==='pending').length||0, totalEarningsDistributed:0, totalDeposits:deposits?.reduce((s:any,r:any)=>s+(r.amount||0),0)||0, totalWithdrawals:withdrawals?.filter((w:any)=>w.status==='approved').reduce((s:any,r:any)=>s+(r.amount||0),0)||0, pendingWithdrawals:withdrawals?.filter((w:any)=>w.status==='pending').length||0, totalReferralEarnings:0 };
 }catch{return {totalUsers:0,totalActivePackages:0,totalPendingPackages:0,totalEarningsDistributed:0,totalDeposits:0,totalWithdrawals:0,pendingWithdrawals:0,totalReferralEarnings:0}}
}
export async function processDailyIncome(){try{const{error}=await supabase.rpc('process_daily_income');if(error)return{error:error.message,message:''};return{message:'Daily income processed',error:''}}catch(e:any){return{error:e.message,message:''}}}

// --- HELPER TO ATTACH USER DETAILS - THIS FIXES YOUR ISSUE ---
async function attachUsers(list:any[]){
  if(!list || list.length===0) return [];
  const ids=[...new Set(list.map((x:any)=>x.user_id).filter(Boolean))];
  if(ids.length===0) return list;
  const {data:users}=await supabase.from('platform_users').select('*').in('id',ids);
  const map=new Map((users||[]).map((u:any)=>[u.id,u]));
  return list.map((x:any)=>{
    const u:any=map.get(x.user_id)||{};
    return {
     ...x,
      // these fields will now show in admin panel
      user_email: u.email,
      user_phone: u.phone || u.mobile || u.whatsapp,
      user_name: u.full_name || u.username || u.name || u.email,
      user_joined: u.created_at,
      user_wallet: u.wallet_balance,
      user_referral_code: u.referral_code || u.own_referral_code,
      referred_by: u.referred_by,
      user_obj: u
    }
  });
}

// PACKAGES WITH USER DETAILS
export async function getPackages(){const{data}=await supabase.from('user_packages').select('*').order('created_at',{ascending:false});return attachUsers(data||[])}
export const getAllPackages=getPackages;export const getPayments=getPackages;
export async function updatePackageStatus(id:string,status:string){const{error}=await supabase.from('user_packages').update({status}).eq('id',id);if(error)throw error}
export async function approvePackage(id:string){return updatePackageStatus(id,'active')}
export async function rejectPackage(id:string){return updatePackageStatus(id,'rejected')}
export async function deletePackage(id:string){const{error}=await supabase.from('user_packages').delete().eq('id',id);if(error)throw error}
export async function extendPackage(id:string,days:number=30){try{const{data}=await supabase.from('user_packages').select('expires_at,end_date').eq('id',id).single();const base=(data as any)?.expires_at||(data as any)?.end_date||new Date().toISOString();const nd=new Date(base);nd.setDate(nd.getDate()+days);await supabase.from('user_packages').update({expires_at:nd.toISOString(),end_date:nd.toISOString()}).eq('id',id)}catch{}}

// USERS
export async function getUsers(){const{data}=await supabase.from('platform_users').select('*').order('created_at',{ascending:false});return data||[]}
export const getAllUsers=getUsers;
export async function deleteUser(id:string){const{error}=await supabase.from('platform_users').delete().eq('id',id);if(error)throw error}
export async function banUser(id:string){try{await supabase.from('platform_users').update({is_blocked:true,is_banned:true}).eq('id',id)}catch{}}
export async function unbanUser(id:string){try{await supabase.from('platform_users').update({is_blocked:false,is_banned:false}).eq('id',id)}catch{}}
export async function blockUser(id:string){return banUser(id)}
export async function unblockUser(id:string){return unbanUser(id)}
export async function adjustUserBalance(userId:string, amount:number){
  try{
    const{data:user}=await supabase.from('platform_users').select('wallet_balance').eq('id',userId).single();
    const nb=(user?.wallet_balance||0)+amount;
    const{error}=await supabase.from('platform_users').update({wallet_balance:nb}).eq('id',userId);
    if(error) throw error;
  }catch(e){console.error(e); throw e;}
}
export async function addUserBalance(id:string,amt:number){return adjustUserBalance(id,Math.abs(amt))}
export async function deductUserBalance(id:string,amt:number){return adjustUserBalance(id,-Math.abs(amt))}

// RECHARGES WITH USER DETAILS
export async function getRecharges(){const{data}=await supabase.from('recharge_requests').select('*').order('created_at',{ascending:false});return attachUsers(data||[])}
export const getRechargeRequests=getRecharges;
export async function updateRechargeStatus(id:string,status:string){const{error}=await supabase.from('recharge_requests').update({status}).eq('id',id);if(error)throw error}
export async function approveRecharge(id:string){return updateRechargeStatus(id,'approved')}
export async function rejectRecharge(id:string){return updateRechargeStatus(id,'rejected')}
export async function deleteRecharge(id:string){const{error}=await supabase.from('recharge_requests').delete().eq('id',id);if(error)throw error}

// WITHDRAWALS WITH USER DETAILS - NOW ADMIN CAN SEE WHO REQUESTED
export async function getWithdrawals(){const{data}=await supabase.from('withdrawal_requests').select('*').order('created_at',{ascending:false});return attachUsers(data||[])}
export const getWithdrawalRequests=getWithdrawals;
export async function updateWithdrawalStatus(id:string,status:string){const{error}=await supabase.from('withdrawal_requests').update({status}).eq('id',id);if(error)throw error}
export async function approveWithdrawal(id:string){return updateWithdrawalStatus(id,'approved')}
export async function rejectWithdrawal(id:string){return updateWithdrawalStatus(id,'rejected')}
export async function deleteWithdrawal(id:string){const{error}=await supabase.from('withdrawal_requests').delete().eq('id',id);if(error)throw error}
export const deleteWithdrawals=deleteWithdrawal; export const deleteRecharges=deleteRecharge;

// MISSIONS / BROADCAST
export async function getMissions(){try{const{data}=await supabase.from('missions').select('*');return data||[]}catch{return[]}}
export async function createMission(d:any){try{const{data,error}=await supabase.from('missions').insert(d).select().single();if(error)throw error;return data}catch{return null}}
export async function deleteMission(id:string){const{error}=await supabase.from('missions').delete().eq('id',id);if(error)throw error}
export async function sendBroadcast(_m:string){} export async function getBroadcasts(){return[]}

// Redeem
export async function getRedeems():Promise<RedeemCode[]>{const{data}=await supabase.from('redeem_codes').select('*').order('created_at',{ascending:false});return (data as RedeemCode[])||[]}
export async function createRedeemCode(amount:number,maxUses:number,customCode?:string):Promise<RedeemCode|null>{const c=(customCode||'').trim().toUpperCase()||'SEP-'+Math.random().toString(36).substring(2,8).toUpperCase();if(!/^[A-Z0-9-]{3,20}$/.test(c))return null;const{data:ex}=await supabase.from('redeem_codes').select('id').eq('code',c).maybeSingle();if(ex)return null;const exp=new Date(Date.now()+15*60*1000).toISOString();const{data,error}=await supabase.from('redeem_codes').insert({code:c,amount,max_uses:maxUses,used_count:0,is_active:true,expires_at:exp}).select().single();if(error)return null;return data as RedeemCode}
export async function deleteRedeemCode(id:string){const{error}=await supabase.from('redeem_codes').delete().eq('id',id);if(error)throw new Error(error.message)}
export async function toggleRedeemCode(id:string,cur:boolean){const{error}=await supabase.from('redeem_codes').update({is_active:!cur}).eq('id',id);if(error)throw new Error(error.message)}
async function creditReferralCommission(userId:string,amount:number){const RATES=[0.27,0.02,0.01];const{data:buyer}=await supabase.from('platform_users').select('referred_by').eq('id',userId).single();if(!buyer?.referred_by)return;let cur=buyer.referred_by;let lvl=0;while(cur&&lvl<3){const{data:ref}=await supabase.from('platform_users').select('id,wallet_balance,referral_earnings,total_earnings,referred_by').eq('id',cur).single();if(!ref)break;const com=Math.floor(amount*RATES[lvl]);if(com>0)await supabase.from('platform_users').update({wallet_balance:ref.wallet_balance+com,referral_earnings:(ref.referral_earnings||0)+com,total_earnings:(ref.total_earnings||0)+com}).eq('id',ref.id);cur=ref.referred_by;lvl++}}
export {creditReferralCommission};
