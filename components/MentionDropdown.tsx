'use client';
import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

export interface MentionOption {
  id: string;
  label: string;
  type: string;
}

interface MentionDropdownProps {
  options: MentionOption[];
  onSelect: (option: MentionOption) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLTextAreaElement | null>;
  triggerChar: '@' | '#';
}

export function MentionDropdown({ options, onSelect, onClose, anchorRef, triggerChar }: MentionDropdownProps) {
  const { theme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<number>(0);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current !== e.target
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  if (options.length === 0) return null;

  const typeColor = (type: string) => {
    if (type === 'person') return theme.accent;
    if (type === 'project') return theme.success ?? '#22c55e';
    return theme.textMuted;
  };

  const typeLabel = (type: string) => {
    if (type === 'person') return '人';
    if (type === 'project') return '项目';
    return '标签';
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 rounded-xl shadow-2xl overflow-hidden"
      style={{
        bottom: '100%',
        left: 0,
        marginBottom: 6,
        minWidth: 200,
        maxWidth: 300,
        background: theme.panelBg,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div
        className="px-3 py-1.5 text-xs font-medium"
        style={{ color: theme.textMuted, borderBottom: `1px solid ${theme.border}` }}
      >
        {triggerChar === '@' ? '提及联系人' : '添加标签'}
      </div>
      {options.map((opt, i) => (
        <button
          key={opt.id}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:opacity-90"
          style={{
            background: i === selectedRef.current ? theme.cardBg : 'transparent',
            color: theme.text,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = theme.cardBg;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          onMouseDown={e => {
            e.preventDefault(); // prevent textarea blur
            onSelect(opt);
          }}
        >
          <span
            className="text-xs px-1.5 py-0.5 rounded-md font-medium shrink-0"
            style={{ background: typeColor(opt.type) + '22', color: typeColor(opt.type) }}
          >
            {typeLabel(opt.type)}
          </span>
          <span className="truncate">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
