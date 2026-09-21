import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const INCOME_INTERVAL_MS = 24 * 60 * 60 * 1000;

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
    const cutoff = new Date(now.getTime() - INCOME_INTERVAL_MS);

    // buy_date is set to the approval time. Only active investment packages
    // are eligible; RECHARGE records never earn daily income.
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

      if (expiryDate && expiryDate <= now) {
        const { error: expireErr } = await supabase
          .from('investment_packages')
          .update({ status: 'expired' })
          .eq('id', pkg.id)
          .eq('status', 'active');

        if (expireErr) {
          console.error(`Failed to expire package ${pkg.id}: ${expireErr.message}`);
        } else {
          expiredCount++;
          console.log(`Expired package ${pkg.id} for user ${pkg.user_id}`);
        }
        continue;
      }

      // last_income_date is initialized to the approval time by approvePackage.
      // For older rows where it is null, use buy_date (also the approval time).
      // Never treat a missing timestamp as immediately due.
      const lastIncomeDate = pkg.last_income_date
        ? new Date(pkg.last_income_date)
        : pkg.buy_date
          ? new Date(pkg.buy_date)
          : null;

      if (!lastIncomeDate || Number.isNaN(lastIncomeDate.getTime())) {
        console.error(`Package ${pkg.id} has no valid approval time; skipping income.`);
        continue;
      }

      // The first payment is exactly one 24-hour interval after approval.
      if (lastIncomeDate > cutoff) {
        console.log(`Package ${pkg.id} income is not yet due.`);
        continue;
      }

      const { data: user, error: userErr } = await supabase
        .from('platform_users')
        .select('wallet_balance, total_earnings, daily_earnings')
        .eq('id', pkg.user_id)
        .single();

      if (userErr || !user) {
        console.error(`User not found for package ${pkg.id}: ${userErr?.message}`);
        continue;
      }

      const { error: updateUserErr } = await supabase
        .from('platform_users')
        .update({
          wallet_balance: (user.wallet_balance || 0) + pkg.daily_income,
          total_earnings: (user.total_earnings || 0) + pkg.daily_income,
          daily_earnings: (user.daily_earnings || 0) + pkg.daily_income,
        })
        .eq('id', pkg.user_id);

      if (updateUserErr) {
        console.error(`Failed to credit user ${pkg.user_id}: ${updateUserErr.message}`);
        continue;
      }

      const { error: timestampErr } = await supabase
        .from('investment_packages')
        .update({ last_income_date: now.toISOString() })
        .eq('id', pkg.id)
        .eq('status', 'active');

      if (timestampErr) {
        console.error(`Failed to update package ${pkg.id}: ${timestampErr.message}`);
        continue;
      }

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
