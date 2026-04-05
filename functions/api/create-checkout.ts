/**
 * Cloudflare Pages Function: POST /api/create-checkout
 * Creates a Stripe Checkout session for Orbit Pro.
 *
 * Env vars needed (set in Cloudflare Pages dashboard):
 *   STRIPE_SECRET_KEY   — sk_live_... or sk_test_...
 *   NEXT_PUBLIC_SITE_URL — https://meorbit.life
 */

import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': env.NEXT_PUBLIC_SITE_URL ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { userId, email } = await request.json() as { userId: string; email: string };

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            product_data: {
              name: 'Orbit Pro',
              description: '无限节点、云同步、优先支持',
            },
            unit_amount: 900, // $9/month
          },
          quantity: 1,
        },
      ],
      metadata: { userId },
      success_url: `${env.NEXT_PUBLIC_SITE_URL}?pro=success`,
      cancel_url: `${env.NEXT_PUBLIC_SITE_URL}?pro=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
