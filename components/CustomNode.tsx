'use client';
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, Briefcase, Tag, Zap } from 'lucide-react';
import { Node } from '@/lib/db';
import { useTheme } from './ThemeProvider';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; shape: string; label: string }> = {
  person:  { icon: <User  className="w-5 h-5" />, shape: 'rounded-full',  label: 'Person'  },
  project: { icon: <Briefcase className="w-5 h-5" />, shape: 'rounded-2xl', label: 'Project' },
  event:   { icon: <Zap   className="w-5 h-5" />, shape: 'rounded-xl',   label: 'Event'   },
  tag:     { icon: <Tag   className="w-4 h-4" />, shape: 'rounded-full', label: 'Tag'     },
};

export const CustomNode = memo(({ data, selected }: NodeProps<Node>) => {
  const { theme } = useTheme();
  const color = theme.nodeColors[data.type] ?? theme.nodeColors.default;
  const cfg = TYPE_CONFIG[data.type] ?? TYPE_CONFIG.tag;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none" style={{ minWidth: 72 }}>
      {/* Node body */}
      <div
        className={`${cfg.shape} w-14 h-14 flex items-center justify-center transition-all duration-150`}
        style={{
          background: `${color}18`,
          border: `2px solid ${color}`,
          color,
          boxShadow: selected
            ? `0 0 0 3px ${color}55, 0 0 20px ${color}44`
            : `0 0 10px ${color}33`,
        }}
      >
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: color, border: `2px solid ${theme.bg}`, width: 9, height: 9, top: -5 }}
        />
        {cfg.icon}
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: color, border: `2px solid ${theme.bg}`, width: 9, height: 9, bottom: -5 }}
        />
      </div>

      {/* Label below node */}
      <div
        className="flex flex-col items-center gap-0.5"
      >
        <span
          className="text-[13px] font-semibold leading-tight text-center"
          style={{
            color: theme.text,
            textShadow: theme.nodeLabelShadow ?? '0 1px 3px rgba(0,0,0,0.6)',
            maxWidth: 100,
            wordBreak: 'break-word',
          }}
        >
          {data.label}
        </span>
        <span
          className="text-[10px] font-medium uppercase tracking-widest"
          style={{ color: `${color}bb` }}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
