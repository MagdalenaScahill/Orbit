'use client';
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, Briefcase, Tag, Zap } from 'lucide-react';
import { Node } from '@/lib/db';
import { useTheme } from './ThemeProvider';

export const CustomNode = memo(({ data }: NodeProps<Node>) => {
  const { theme } = useTheme();
  const color = theme.nodeColors[data.type] ?? theme.nodeColors.default;

  const getShape = () => {
    switch (data.type) {
      case 'person':  return 'rounded-full w-14 h-14';
      case 'project': return 'rounded-xl w-16 h-16';
      case 'event':   return 'rounded-lg w-16 h-16';
      default:        return 'rounded-full px-4 py-2 w-auto h-auto';
    }
  };

  const getIcon = () => {
    switch (data.type) {
      case 'person':  return <User className="w-5 h-5" />;
      case 'project': return <Briefcase className="w-5 h-5" />;
      case 'event':   return <Zap className="w-5 h-5" />;
      default:        return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={`${getShape()} flex items-center justify-center text-white transition-all relative`}
      style={{
        background: `${color}22`,
        border: `2px solid ${color}`,
        color,
        boxShadow: `0 0 12px ${color}44`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, border: 'none', width: 8, height: 8 }} />
      {getIcon()}
      <Handle type="source" position={Position.Bottom} style={{ background: color, border: 'none', width: 8, height: 8 }} />
      <div
        className="absolute -bottom-5 text-xs whitespace-nowrap font-medium"
        style={{ color: `${color}dd` }}
      >
        {data.label}
      </div>
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
