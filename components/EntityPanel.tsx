'use client';
import { X, Trash2, Pencil, Check } from 'lucide-react';
import { Node, deleteNode, deleteLog, db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';

interface EntityPanelProps {
  node: Node | null;
  onClose: () => void;
  onNodeDeleted?: () => void;
}

export function EntityPanel({ node, onClose, onNodeDeleted }: EntityPanelProps) {
  const [editing, setEditing] = useState<'label' | 'role' | 'description' | null>(null);
  const [editValue, setEditValue] = useState('');
  const { theme } = useTheme();

  const logs = useLiveQuery(
    () => node ? db.logs.where('mentionedNodes').equals(node.id).reverse().sortBy('timestamp') : [],
    [node?.id]
  );

  const startEdit = (field: 'label' | 'role' | 'description', value: string) => {
    setEditing(field);
    setEditValue(value || '');
  };

  const saveEdit = async () => {
    if (!editing || !node) return;
    if (editing === 'label') {
      await db.nodes.update(node.id, { label: editValue });
    } else {
      await db.nodes.update(node.id, { metadata: { ...node.metadata, [editing]: editValue } });
    }
    setEditing(null);
  };

  const handleDeleteNode = async () => {
    if (!node) return;
    if (!confirm(`确定删除节点 "${node.label}" 吗？这将删除所有相关连接。`)) return;
    await deleteNode(node.id);
    onClose();
    onNodeDeleted?.();
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteLog(logId);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: theme.panelBg, borderLeft: `1px solid ${theme.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
        {node ? (
          <>
            {editing === 'label' ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  className="flex-1 px-2 py-1 rounded text-sm outline-none"
                  style={{ background: theme.inputBg, color: theme.text, border: `1px solid ${theme.accent}` }}
                  autoFocus
                />
                <button onClick={saveEdit} style={{ color: theme.success }}><Check className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base font-semibold truncate" style={{ color: theme.text }}>{node.label}</h2>
                <button onClick={() => startEdit('label', node.label)} style={{ color: theme.textMuted }} className="shrink-0 hover:opacity-80">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button onClick={handleDeleteNode} style={{ color: theme.danger }} className="hover:opacity-80" title="删除节点">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} style={{ color: theme.textMuted }} className="hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <h2 className="text-sm font-semibold" style={{ color: theme.textMuted }}>Timeline</h2>
          </div>
        )}
      </div>

      {/* Meta info */}
      {node && (
        <div className="px-4 py-3 space-y-1.5" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: theme.accentMuted, color: theme.accent }}
          >
            {node.type}
          </span>
          {node.metadata.role && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: theme.textMuted }}>Role:</span>
              {editing === 'role' ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  className="flex-1 px-2 py-0.5 rounded text-xs outline-none"
                  style={{ background: theme.inputBg, color: theme.text, border: `1px solid ${theme.accent}` }}
                  autoFocus
                />
              ) : (
                <span className="text-xs" style={{ color: theme.text }}>{node.metadata.role}</span>
              )}
              <button onClick={() => startEdit('role', node.metadata.role || '')} style={{ color: theme.textMuted }} className="hover:opacity-80">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          {node.metadata.description && (
            <div className="flex items-start gap-1.5">
              <span className="text-xs shrink-0" style={{ color: theme.textMuted }}>Desc:</span>
              {editing === 'description' ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  className="flex-1 px-2 py-0.5 rounded text-xs outline-none resize-none"
                  style={{ background: theme.inputBg, color: theme.text, border: `1px solid ${theme.accent}` }}
                  rows={2}
                  autoFocus
                />
              ) : (
                <span className="text-xs leading-relaxed" style={{ color: theme.text }}>{node.metadata.description}</span>
              )}
              <button onClick={() => startEdit('description', node.metadata.description || '')} style={{ color: theme.textMuted }} className="shrink-0 hover:opacity-80">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>
          {node ? 'Timeline' : 'Select a node'}
        </h3>
        {node && logs && logs.length > 0 ? (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="group relative rounded-lg p-3"
                style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}
              >
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-80"
                  style={{ color: theme.danger }}
                  title="删除日志"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <p className="text-sm pr-6 leading-relaxed" style={{ color: theme.text }}>{log.rawText}</p>
                {log.attachments && log.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {log.attachments.map((att, i) => (
                      <div key={i}>
                        {att.type === 'image' && <img src={att.data} alt={att.name} className="max-w-full rounded" />}
                        {att.type === 'audio' && <audio src={att.data} controls className="w-full" />}
                        {att.type === 'video' && <video src={att.data} controls className="w-full rounded" />}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 text-xs" style={{ color: theme.textMuted }}>
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : node ? (
          <p className="text-sm" style={{ color: theme.textMuted }}>No interactions yet</p>
        ) : (
          <p className="text-sm" style={{ color: theme.textMuted }}>Click a node to see its timeline</p>
        )}
      </div>
    </div>
  );
}
