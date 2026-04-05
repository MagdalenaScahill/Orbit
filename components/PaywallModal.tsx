'use client';
import { useState } from 'react';
import { Zap, Check, X, Lock } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { startCheckout, FREE_NODE_LIMIT } from '@/lib/pro';

interface PaywallModalProps {
  nodeCount: number;
  onClose: () => void;
}

const PRO_FEATURES = [
  '无限节点与连接',
  '多端云同步',
  '提醒与日历整合',
  '数据导出（CSV / JSON）',
  '优先客户支持',
];

export function PaywallModal({ nodeCount, onClose }: PaywallModalProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    await startCheckout();
    setLoading(false);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: theme.panelBg, border: `1px solid ${theme.border}` }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:opacity-70"
          style={{ color: theme.textMuted }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 text-center"
          style={{ background: `linear-gradient(135deg, ${theme.accentMuted}, ${theme.cardBg})` }}
        >
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
            style={{ background: theme.accent }}
          >
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold mb-1" style={{ color: theme.text }}>
            已达到免费上限
          </h2>
          <p className="text-sm" style={{ color: theme.textMuted }}>
            你已添加 <span style={{ color: theme.accent, fontWeight: 600 }}>{nodeCount}</span> 个节点，
            免费版最多 <strong>{FREE_NODE_LIMIT}</strong> 个。
            升级 Pro 解锁全部功能。
          </p>
        </div>

        {/* Price */}
        <div className="px-6 py-4 text-center" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-end justify-center gap-1">
            <span className="text-4xl font-bold" style={{ color: theme.text }}>$9</span>
            <span className="text-sm mb-1.5" style={{ color: theme.textMuted }}>/月</span>
          </div>
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>随时取消 · 无套路</p>
        </div>

        {/* Features */}
        <div className="px-6 py-4 space-y-2.5">
          {PRO_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5">
              <div
                className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: theme.success + '22' }}
              >
                <Check className="w-2.5 h-2.5" style={{ color: theme.success }} />
              </div>
              <span className="text-sm" style={{ color: theme.text }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-2 space-y-2">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: theme.accent, color: '#fff' }}
          >
            {loading ? (
              <span className="animate-pulse">跳转中...</span>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                升级到 Orbit Pro
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-xs hover:opacity-70 transition-opacity"
            style={{ color: theme.textMuted }}
          >
            暂不升级，继续免费版
          </button>
        </div>
      </div>
    </div>
  );
}
