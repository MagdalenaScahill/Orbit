'use client';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { Send, Image, Mic, Video, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface CommandBarProps {
  onNewNode: () => void;
}

export function CommandBar({ onNewNode }: CommandBarProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Array<{ type: 'image' | 'audio' | 'video'; data: string; name: string }>>([]);
  const { theme } = useTheme();

  const parseInput = (text: string) => {
    const personRegex = /@(\w+)/g;
    const tagRegex = /#([\w\u4e00-\u9fa5]+)/g;
    const persons = [...text.matchAll(personRegex)].map(m => m[1]);
    const tags = [...text.matchAll(tagRegex)].map(m => m[1]);
    return { persons, tags };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments([...attachments, { type, data: reader.result as string, name: file.name }]);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const { persons, tags } = parseInput(input);
    const mentionedNodeIds: string[] = [];

    for (const person of persons) {
      let node = await db.nodes.where('label').equals(person).first();
      if (!node) {
        const id = uuidv4();
        node = { id, type: 'person', label: person, position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }, metadata: {}, createdAt: Date.now() };
        await db.nodes.add(node);
      }
      mentionedNodeIds.push(node.id);
    }

    for (const tag of tags) {
      let node = await db.nodes.where('label').equals(tag).first();
      if (!node) {
        const id = uuidv4();
        node = { id, type: 'project', label: tag, position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }, metadata: {}, createdAt: Date.now() };
        await db.nodes.add(node);
      }
      mentionedNodeIds.push(node.id);
    }

    if (mentionedNodeIds.length > 1) {
      for (let i = 0; i < mentionedNodeIds.length - 1; i++) {
        await db.edges.add({ id: uuidv4(), source: mentionedNodeIds[i], target: mentionedNodeIds[i + 1] });
      }
    }

    await db.logs.add({
      id: uuidv4(),
      rawText: input,
      mentionedNodes: mentionedNodeIds,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined
    });

    setInput('');
    setAttachments([]);
    onNewNode();
  };

  return (
    <div
      className="px-3 py-2 shrink-0"
      style={{ background: theme.panelBg, borderBottom: `1px solid ${theme.border}` }}
    >
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
              style={{ background: theme.cardBg, color: theme.text, border: `1px solid ${theme.border}` }}
            >
              {att.type === 'image' && <Image className="w-3.5 h-3.5" />}
              {att.type === 'audio' && <Mic className="w-3.5 h-3.5" />}
              {att.type === 'video' && <Video className="w-3.5 h-3.5" />}
              <span className="max-w-[100px] truncate">{att.name}</span>
              <button
                onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                style={{ color: theme.danger }}
                className="hover:opacity-80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="今天和 @Alex 讨论了 #重构项目 的进展..."
          className="flex-1 p-2.5 rounded-lg resize-none focus:outline-none text-sm leading-relaxed"
          style={{
            background: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.border}`,
          }}
          rows={2}
        />
        <div className="flex flex-col gap-1.5 pb-0.5">
          <label
            className="p-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: theme.cardBg, color: theme.textMuted }}
            title="Attach image"
          >
            <Image className="w-4 h-4" />
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" />
          </label>
          <label
            className="p-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: theme.cardBg, color: theme.textMuted }}
            title="Attach audio"
          >
            <Mic className="w-4 h-4" />
            <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} className="hidden" />
          </label>
          <label
            className="p-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: theme.cardBg, color: theme.textMuted }}
            title="Attach video"
          >
            <Video className="w-4 h-4" />
            <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" />
          </label>
        </div>
        <button
          onClick={handleSubmit}
          className="px-3 py-2 rounded-lg transition-opacity hover:opacity-80 self-end mb-0.5"
          style={{ background: theme.accent, color: '#fff' }}
          title="Submit"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
