'use client';
import { useState, useEffect } from 'react';
import { supabase, SupabaseUser } from '@/lib/supabase';
import { syncOnLogin } from '@/lib/sync';
import { useTheme } from './ThemeProvider';

export function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    // 获取当前登录状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听登录/登出变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // 登录成功后触发同步
      if (_event === 'SIGNED_IN' && session?.user) {
        syncOnLogin().catch(console.error);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div
        className="px-3 py-1.5 rounded-lg text-sm"
        style={{ background: theme.cardBg, color: theme.textMuted }}
      >
        ...
      </div>
    );
  }

  if (user) {
    const name = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || '用户';
    const avatar = user.user_metadata?.avatar_url;

    return (
      <div className="flex items-center gap-2">
        {avatar && (
          <img
            src={avatar}
            alt={name}
            className="w-6 h-6 rounded-full"
          />
        )}
        <span className="text-sm" style={{ color: theme.text }}>{name}</span>
        <button
          onClick={handleLogout}
          className="px-2 py-1 rounded-lg text-xs transition-opacity hover:opacity-70"
          style={{ background: theme.cardBg, color: theme.textMuted }}
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
      style={{ background: theme.accent, color: '#fff' }}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      用 Google 登录
    </button>
  );
}
