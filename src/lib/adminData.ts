export async function getRedeems(): Promise<RedeemCode[]> {
  const { data, error } = await supabase.from('redeem_codes').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getRedeems', error); return []; }
  return data as RedeemCode[];
}

export async function createRedeemCode(amount: number, maxUses: number, customCode?: string): Promise<RedeemCode | null> {
  const normalizedCode = (customCode || '').trim().toUpperCase();
  const code = normalizedCode || 'SEP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
    console.error('Invalid redeem code format');
    return null;
  }

  const { data: existingCode } = await supabase
    .from('redeem_codes')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existingCode) {
    console.error('Redeem code already exists');
    return null;
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + 15 * 60 * 1000);

  const { data, error } = await supabase
    .from('redeem_codes')
    .insert({
      code,
      amount,
      max_uses: maxUses,
      used_count: 0,
      is_active: true,
      expires_at: expiry.toISOString(),
    })
    .select()
    .single();

  if (error) { console.error('createRedeemCode', error); return null; }
  return data as RedeemCode;
}

export async function deleteRedeemCode(id: string): Promise<void> {
  const { error } = await supabase.from('redeem_codes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleRedeemCode(id: string, current: boolean): Promise<void> {
  const { error } = await supabase.from('redeem_codes').update({ is_active: !current }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function creditReferralCommission(userId: string, amount: number): Promise<void> {
  const RATES = [0.27, 0.02, 0.01];
  let currentId: string | null = userId; let level = 0;
  const { data: buyer } = await supabase.from('platform_users').select('referred_by').eq('id', userId).single();
  if (!buyer?.referred_by) return;
  currentId = buyer.referred_by;
  while (currentId && level < 3) {
    const { data: referrer } = await supabase.from('platform_users').select('id, wallet_balance, referral_earnings, total_earnings, referred_by').eq('id', currentId).single();
    if (!referrer) break;
    const commission = Math.floor(amount * RATES[level]);
