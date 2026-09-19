import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Fetch all active investment packages (exclude RECHARGE records)
    const { data: packages, error: pkgErr } = await supabase
      .from('investment_packages')
      .select('*')
      .eq('status', 'active')
      .neq('product_name', 'RECHARGE');

    if (pkgErr) throw new Error(`Fetch packages error: ${pkgErr.message}`);
    if (!packages || packages.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, expired: 0, message: 'No active packages found.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let expiredCount = 0;

    for (const pkg of packages) {
      const expiryDate = pkg.expiry_date ? new Date(pkg.expiry_date) : null;

      // Check if package has expired
      if (expiryDate && expiryDate < now) {
        await supabase
          .from('investment_packages')
          .update({ status: 'expired' })
          .eq('id', pkg.id);
        expiredCount++;
        console.log(`Expired package ${pkg.id} for user ${pkg.user_id}`);
        continue;
      }

      // Check if income is due (last_income_date is null or > 24h ago)
      const lastIncomeDate = pkg.last_income_date ? new Date(pkg.last_income_date) : null;
      const isDue = !lastIncomeDate || lastIncomeDate <= cutoff;

      if (!isDue) {
        console.log(`Package ${pkg.id} income not yet due.`);
        continue;
      }

      // Fetch user current balances
      const { data: user, error: userErr } = await supabase
        .from('platform_users')
        .select('wallet_balance, total_earnings, daily_earnings')
        .eq('id', pkg.user_id)
        .single();

      if (userErr || !user) {
        console.error(`User not found for package ${pkg.id}: ${userErr?.message}`);
        continue;
      }

      // Credit daily income to user
      const { error: updateUserErr } = await supabase
        .from('platform_users')
        .update({
          wallet_balance: user.wallet_balance + pkg.daily_income,
          total_earnings: user.total_earnings + pkg.daily_income,
          daily_earnings: user.daily_earnings + pkg.daily_income,
        })
        .eq('id', pkg.user_id);

      if (updateUserErr) {
        console.error(`Failed to credit user ${pkg.user_id}: ${updateUserErr.message}`);
        continue;
      }

      // Update last_income_date
      await supabase
        .from('investment_packages')
        .update({ last_income_date: now.toISOString() })
        .eq('id', pkg.id);

      processed++;
      console.log(`Credited ${pkg.daily_income} UGX to user ${pkg.user_id} for package ${pkg.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        expired: expiredCount,
        message: `Processed ${processed} income payments, expired ${expiredCount} packages.`,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('process-daily-income error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
