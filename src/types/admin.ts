export interface User {
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
  registered_at: string;
  is_banned: boolean;
  wallet_network?: 'MTN' | 'Airtel';
  wallet_phone?: string;
  wallet_name?: string;
}

export interface Package {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  product_name: string;
  product_group: string;
  amount: number;
  daily_income: number;
  duration_days: number;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  buy_date: string | null;
  expiry_date: string | null;
  last_income_date: string | null;
  payment_proof?: string;
  payment_number?: string;
  payment_network?: 'MTN' | 'Airtel';
  submitted_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  amount: number;
  net_amount: number;
  tax: number;
  wallet_network: 'MTN' | 'Airtel';
  wallet_phone: string;
  wallet_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  admin_note?: string;
}

export interface RedeemCode {
  id: string;
  code: string;
  amount: number;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  used_count: number;
  max_uses: number;
}

export interface ReferralNode {
  userId: string;
  userName: string;
  userPhone: string;
  level: number;
  children: ReferralNode[];
  totalInvested: number;
  joinedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalActivePackages: number;
  totalPendingPackages: number;
  totalEarningsDistributed: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalReferralEarnings: number;
}
