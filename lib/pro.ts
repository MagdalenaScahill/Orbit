/**
 * lib/pro.ts
 * Utilities to check and manage Orbit Pro status.
 * Pro status is stored in Supabase `profiles` table.
 */

import { supabase } from './supabase';

export const FREE_NODE_LIMIT = 20;

export interface Profile {
  id: string;
  is_pro: boolean;
  stripe_customer_id?: string;
  updated_at?: string;
}

/** Fetch current user's pro status from Supabase */
export async function fetchProStatus(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_pro')
    .eq('id', user.id)
    .single();

  if (error || !data) return false;
  return data.is_pro === true;
}

/** Start Stripe checkout — redirects to Stripe hosted page */
export async function startCheckout(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert('请先登录');
    return;
  }

  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id, email: user.email }),
  });

  const { url, error } = await res.json();
  if (error) { alert(`结账失败: ${error}`); return; }
  window.location.href = url;
}
