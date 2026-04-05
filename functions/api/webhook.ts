/**
 * Cloudflare Pages Function: POST /api/webhook
 * Handles Stripe webhook events to update user pro status in Supabase.
 *
 * Env vars needed:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   — whsec_...  (from Stripe dashboard → Webhooks)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service_role key (NOT anon key)
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-03-31.basil',
  });

  const body = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad signature';
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Helper: upsert profile is_pro
  const setPro = async (userId: string, isPro: boolean, stripeCustomerId?: string) => {
    await supabase.from('profiles').upsert({
      id: userId,
      is_pro: isPro,
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      updated_at: new Date().toISOString(),
    });
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId) {
        await setPro(userId, true, session.customer as string);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      // Find user by stripe_customer_id
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', sub.customer)
        .single();
      if (data?.id) {
        await setPro(data.id, false);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', invoice.customer)
        .single();
      if (data?.id) {
        await setPro(data.id, false);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
