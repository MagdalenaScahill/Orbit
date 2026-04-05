'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { debouncedSync } from '@/lib/sync';
import { Send, Image, Mic, Video, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { MentionDropdown, MentionOption } from './MentionDropdown';

interface CommandBarProps {
  onNewNode: () => void;
  canAddNode?: () => boolean;
}

interface MentionState {
  active: boolean;
  triggerChar: '@' | '#';
  query: string;
  triggerIndex: number;
}

const DEFAULT_MENTION: MentionState = {
  active: false,
  triggerChar: '@',
  query: '',
  triggerIndex: -1,
};

export function CommandBar({ onNewNode, canAddNode }: CommandBarProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Array<{ type: 'image' | 'audio' | 'video'; data: string; name: string }>>([]);
  const [mention, setMention] = useState<MentionState>(DEFAULT_MENTION);
  const [mentionOptions, setMentionOptions] = useState<MentionOption[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Use refs to always have latest values inside handleSubmit (avoids stale closures)
  const inputRef = useRef(input);
  const attachmentsRef = useRef(attachments);
  const { theme } = useTheme();

  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);

  // Whenever mention query changes, search DB
  useEffect(() => {
    if (!mention.active) {
      setMentionOptions([]);
      setMentionLoading(false);
      return;
    }
    setMentionLoading(true);
    const search = async () => {
      const q = mention.query.toLowerCase();
      let nodes;
      if (mention.triggerChar === '@') {
        nodes = await db.nodes.where('type').equals('person').toArray();
      } else {
        nodes = await db.nodes.filter(n => n.type === 'project' || n.type === 'tag').toArray();
      }
      const filtered = nodes
        .filter(n => q === '' || n.label.toLowerCase().includes(q))
        .slice(0, 8)
        .map(n => ({ id: n.id, label: n.label, type: n.type }));
      setMentionOptions(filtered);
      setMentionLoading(false);
    };
    search();
  }, [mention]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setInput(val);

    // Find last @ or # before cursor — allow @ at position 0 (no leading space required)
    const textBeforeCursor = val.slice(0, cursor);
    // Match @ or # that is either at start or preceded by whitespace/punctuation
    const atMatch = textBeforeCursor.match(/(^|[\s,，])@([\w\u4e00-\u9fa5]*)$/);
    const hashMatch = textBeforeCursor.match(/(^|[\s,，])#([\w\u4e00-\u9fa5]*)$/);

    if (atMatch) {
      const triggerIdx = textBeforeCursor.lastIndexOf('@');
      setMention({ active: true, triggerChar: '@', query: atMatch[2], triggerIndex: triggerIdx });
    } else if (hashMatch) {
      const triggerIdx = textBeforeCursor.lastIndexOf('#');
      setMention({ active: true, triggerChar: '#', query: hashMatch[2], triggerIndex: triggerIdx });
    } else {
      setMention(DEFAULT_MENTION);
    }
  }, []);

  const handleMentionSelect = useCallback((opt: MentionOption) => {
    setInput(prev => {
      const before = prev.slice(0, mention.triggerIndex + 1); // include @ or #
      const after = prev.slice(mention.triggerIndex + 1 + mention.query.length);
      return before + opt.label + ' ' + after;
    });
    setMention(DEFAULT_MENTION);
    setMentionOptions([]);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = mention.triggerIndex + 1 + opt.label.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [mention.triggerIndex, mention.query.length]);

  // Use ref-based submit to avoid stale closure in handleKeyDown
  const handleSubmit = useCallback(async () => {
    const currentInput = inputRef.current;
    const currentAttachments = attachmentsRef.current;
    if (!currentInput.trim()) return;

    if (canAddNode && !canAddNode()) {
      onNewNode();
      return;
    }

    const personRegex = /@([\w\u4e00-\u9fa5]+)/g;
    const tagRegex = /#([\w\u4e00-\u9fa5]+)/g;
    const persons = [...currentInput.matchAll(personRegex)].map(m => m[1]);
    const tags = [...currentInput.matchAll(tagRegex)].map(m => m[1]);
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
      rawText: currentInput,
      mentionedNodes: mentionedNodeIds,
      timestamp: Date.now(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    });

    setInput('');
    setAttachments([]);
    setMention(DEFAULT_MENTION);
    onNewNode();
    debouncedSync();
  }, [canAddNode, onNewNode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.active && e.key === 'Escape') {
      e.preventDefault();
      setMention(DEFAULT_MENTION);
      return;
    }
    // Enter without Shift submits; but not when dropdown is open
    if (e.key === 'Enter' && !e.shiftKey && !mention.active) {
      e.preventDefault();
      handleSubmit();
    }
  }, [mention.active, handleSubmit]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments(prev => [...prev, { type, data: reader.result as string, name: file.name }]);
    };
    reader.readAsDataURL(file);
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
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                style={{ color: theme.danger }}
                className="hover:opacity-80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end relative">
        {/* Mention dropdown — fixed position, above textarea */}
        {mention.active && (
          <MentionDropdown
            options={mentionOptions}
            loading={mentionLoading}
            onSelect={handleMentionSelect}
            onClose={() => setMention(DEFAULT_MENTION)}
            anchorRef={textareaRef}
            triggerChar={mention.triggerChar}
          />
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
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
