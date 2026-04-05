'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchProStatus } from '@/lib/pro';

/**
 * useProStatus
 * Returns { isPro, loading } — synced with Supabase auth state.
 * Re-checks whenever auth state changes (login / logout).
 */
export function useProStatus() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      setLoading(true);
      const pro = await fetchProStatus();
      if (mounted) { setIsPro(pro); setLoading(false); }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isPro, loading };
}
