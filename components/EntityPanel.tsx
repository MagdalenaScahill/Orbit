'use client';
import { X, Trash2, Pencil, Check, Clock, Bell, BellOff, Plus } from 'lucide-react';
import { Node, deleteNode, deleteLog, db } from '@/lib/db';
import { debouncedSync } from '@/lib/sync';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useMemo } from 'react';
import { useTheme } from './ThemeProvider';

interface EntityPanelProps {
  node: Node | null;
  onClose: () => void;
  onNodeDeleted?: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

function formatDateInput(ts: number | undefined): string {
  if (!ts) return '';
  return new Date(ts).toISOString().slice(0, 10);
}

export function EntityPanel({ node, onClose, onNodeDeleted }: EntityPanelProps) {
  const [editing, setEditing] = useState<'label' | 'role' | 'description' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const { theme } = useTheme();

  const logs = useLiveQuery(
    () => node ? db.logs.where('mentionedNodes').equals(node.id).reverse().sortBy('timestamp') : [],
    [node?.id]
  );

  // Last contact = most recent log timestamp
  const lastContact = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    return logs[0].timestamp;
  }, [logs]);

  // Reminder state
  const reminderAt = node?.metadata?.reminderAt;
  const reminderDate = reminderAt ? new Date(reminderAt) : null;
  const isReminderOverdue = reminderAt && reminderAt < Date.now();
  const isReminderSoon = reminderAt && reminderAt > Date.now() && reminderAt - Date.now() < 86400000 * 3;

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
    debouncedSync();
  };

  const saveReminder = async (dateStr: string) => {
    if (!node) return;
    const ts = dateStr ? new Date(dateStr).getTime() : undefined;
    await db.nodes.update(node.id, { metadata: { ...node.metadata, reminderAt: ts } });
    setShowReminderPicker(false);
    debouncedSync();
  };

  const clearReminder = async () => {
    if (!node) return;
    const meta = { ...node.metadata };
    delete meta.reminderAt;
    await db.nodes.update(node.id, { metadata: meta });
    debouncedSync();
  };

  const handleDeleteNode = async () => {
    if (!node) return;
    if (!confirm(`确定删除节点 "${node.label}" 吗？这将删除所有相关连接。`)) return;
    await deleteNode(node.id);
    debouncedSync();
    onClose();
    onNodeDeleted?.();
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteLog(logId);
    debouncedSync();
  };

  // Reminder color
  const reminderColor = isReminderOverdue
    ? theme.danger
    : isReminderSoon
    ? '#f59e0b'
    : theme.success;

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
        <div className="px-4 py-3 space-y-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
          {/* Type badge */}
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: theme.accentMuted, color: theme.accent }}
          >
            {node.type}
          </span>

          {/* Last contact */}
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: theme.textMuted }} />
            <span className="text-xs" style={{ color: theme.textMuted }}>上次联系：</span>
            <span className="text-xs font-medium" style={{ color: lastContact ? theme.text : theme.textMuted }}>
              {lastContact ? timeAgo(lastContact) : '暂无记录'}
            </span>
          </div>

          {/* Reminder */}
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 shrink-0" style={{ color: reminderAt ? reminderColor : theme.textMuted }} />
            <span className="text-xs" style={{ color: theme.textMuted }}>提醒：</span>
            {reminderDate ? (
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{ background: reminderColor + '22', color: reminderColor }}
                >
                  {reminderDate.toLocaleDateString('zh-CN')}
                  {isReminderOverdue && ' · 已过期'}
                  {isReminderSoon && !isReminderOverdue && ' · 即将到期'}
                </span>
                <button
                  onClick={() => setShowReminderPicker(true)}
                  style={{ color: theme.textMuted }}
                  className="hover:opacity-80"
                  title="修改提醒"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={clearReminder}
                  style={{ color: theme.textMuted }}
                  className="hover:opacity-80"
                  title="删除提醒"
                >
                  <BellOff className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowReminderPicker(true)}
                className="flex items-center gap-1 text-xs hover:opacity-80"
                style={{ color: theme.textMuted }}
              >
                <Plus className="w-3 h-3" />
                设置提醒
              </button>
            )}
          </div>

          {/* Reminder date picker */}
          {showReminderPicker && (
            <div
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}
            >
              <input
                type="date"
                defaultValue={formatDateInput(reminderAt)}
                min={new Date().toISOString().slice(0, 10)}
                className="flex-1 text-xs rounded px-2 py-1 outline-none"
                style={{ background: theme.inputBg, color: theme.text, border: `1px solid ${theme.border}` }}
                onKeyDown={(e) => { if (e.key === 'Enter') saveReminder((e.target as HTMLInputElement).value); }}
              />
              <button
                onClick={(e) => {
                  const input = (e.currentTarget.parentElement?.querySelector('input[type=date]') as HTMLInputElement);
                  saveReminder(input?.value ?? '');
                }}
                className="text-xs px-2 py-1 rounded"
                style={{ background: theme.accent, color: '#fff' }}
              >
                确定
              </button>
              <button
                onClick={() => setShowReminderPicker(false)}
                className="text-xs"
                style={{ color: theme.textMuted }}
              >
                取消
              </button>
            </div>
          )}

          {/* Role */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs shrink-0" style={{ color: theme.textMuted }}>职位：</span>
            {editing === 'role' ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  className="flex-1 px-2 py-0.5 rounded text-xs outline-none"
                  style={{ background: theme.inputBg, color: theme.text, border: `1px solid ${theme.accent}` }}
                  autoFocus
                />
                <button onClick={saveEdit} style={{ color: theme.success }}><Check className="w-3 h-3" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-xs truncate" style={{ color: node.metadata.role ? theme.text : theme.textMuted }}>
                  {node.metadata.role || '点击添加'}
                </span>
                <button onClick={() => startEdit('role', node.metadata.role || '')} style={{ color: theme.textMuted }} className="shrink-0 hover:opacity-80">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="flex items-start gap-1.5">
            <span className="text-xs shrink-0 mt-0.5" style={{ color: theme.textMuted }}>备注：</span>
            {editing === 'description' ? (
              <div className="flex items-start gap-1 flex-1">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  className="flex-1 px-2 py-0.5 rounded text-xs outline-none resize-none"
                  style={{ background: theme.inputBg, color: theme.text, border: `1px solid ${theme.accent}` }}
                  rows={2}
                  autoFocus
                />
                <button onClick={saveEdit} style={{ color: theme.success }} className="mt-0.5"><Check className="w-3 h-3" /></button>
              </div>
            ) : (
              <div className="flex items-start gap-1 flex-1 min-w-0">
                <span className="text-xs leading-relaxed flex-1" style={{ color: node.metadata.description ? theme.text : theme.textMuted }}>
                  {node.metadata.description || '点击添加'}
                </span>
                <button onClick={() => startEdit('description', node.metadata.description || '')} style={{ color: theme.textMuted }} className="shrink-0 hover:opacity-80">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>
          {node ? `互动记录 (${logs?.length ?? 0})` : 'Select a node'}
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
                  {new Date(log.timestamp).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        ) : node ? (
          <p className="text-sm" style={{ color: theme.textMuted }}>还没有互动记录，在下方输入框@{node.label}开始记录</p>
        ) : (
          <p className="text-sm" style={{ color: theme.textMuted }}>点击节点查看详情</p>
        )}
      </div>
    </div>
  );
}
