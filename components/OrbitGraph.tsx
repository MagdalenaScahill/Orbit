'use client';
import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, NodeTypes, useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Node, deleteNode, deleteEdge } from '@/lib/db';
import { CustomNode } from './CustomNode';
import { CommandBar } from './CommandBar';
import { EntityPanel } from './EntityPanel';
import { AuthButton } from './AuthButton';
import { initMockData } from '@/lib/initData';
import { Download, Upload, Search, Palette } from 'lucide-react';
import { useTheme, themes } from './ThemeProvider';

const nodeTypes: NodeTypes = { custom: CustomNode };

export function OrbitGraph() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const { setCenter } = useReactFlow();
  const { theme, themeName, setThemeName } = useTheme();

  const dbNodes = useLiveQuery(() => db.nodes.toArray());
  const dbEdges = useLiveQuery(() => db.edges.toArray());

  useEffect(() => { initMockData(); }, []);

  useEffect(() => {
    if (dbNodes) {
      const filteredNodes = dbNodes.map(n => {
        const matches = !searchQuery ||
          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.metadata.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return {
          id: n.id, type: 'custom', position: n.position, data: n,
          selectable: true, deletable: true,
          style: { opacity: matches ? 1 : 0.2 }
        };
      });
      setNodes(filteredNodes);
      if (searchQuery) {
        const matches = filteredNodes.filter(n => n.style?.opacity === 1);
        if (matches.length === 1) {
          setCenter(matches[0].position.x, matches[0].position.y, { zoom: 1.5, duration: 800 });
        }
      }
    }
  }, [dbNodes, setNodes, searchQuery, setCenter]);

  useEffect(() => {
    if (dbEdges) {
      setEdges(dbEdges.map(e => ({
        id: e.id, source: e.source, target: e.target,
        label: e.label, selectable: true, deletable: true
      })));
    }
  }, [dbEdges, setEdges]);

  const onNodeDragStop = useCallback((_: unknown, node: { id: string; position: { x: number; y: number } }) => {
    db.nodes.update(node.id, { position: node.position });
  }, []);

  const onNodeClick = useCallback((_: unknown, node: { data: Node }) => {
    setSelectedNode(node.data);
  }, []);

  const onNodesDelete = useCallback(async (nodesToDelete: { id: string }[]) => {
    for (const node of nodesToDelete) await deleteNode(node.id);
  }, []);

  const onEdgesDelete = useCallback(async (edgesToDelete: { id: string }[]) => {
    for (const edge of edgesToDelete) await deleteEdge(edge.id);
  }, []);

  const handleExport = async () => {
    const data = {
      nodes: await db.nodes.toArray(),
      edges: await db.edges.toArray(),
      logs: await db.logs.toArray()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orbit-backup.json'; a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = JSON.parse(event.target?.result as string);
      await db.nodes.clear(); await db.edges.clear(); await db.logs.clear();
      await db.nodes.bulkAdd(data.nodes);
      await db.edges.bulkAdd(data.edges);
      await db.logs.bulkAdd(data.logs);
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Top Bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ background: theme.panelBg, borderBottom: `1px solid ${theme.border}` }}
      >
        {/* Logo */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-sm font-bold tracking-tight" style={{ color: theme.accent }}>ORBIT</span>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg"
          style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: theme.textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: theme.text }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: theme.cardBg, color: theme.textMuted }}
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
          <label
            className="p-1.5 rounded-lg transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: theme.cardBg, color: theme.textMuted }}
            title="Import"
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          {/* Theme picker */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: showThemePicker ? theme.accentMuted : theme.cardBg, color: theme.accent }}
              title="Change theme"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showThemePicker && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl shadow-2xl z-50 py-1 min-w-[160px]"
                style={{ background: theme.panelBg, border: `1px solid ${theme.border}` }}
              >
                {Object.entries(themes).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => { setThemeName(key); setShowThemePicker(false); }}
                    className="w-full text-left px-4 py-2 text-sm transition-opacity hover:opacity-80 flex items-center gap-2"
                    style={{
                      color: themeName === key ? theme.accent : theme.text,
                      background: themeName === key ? theme.accentMuted : 'transparent',
                    }}
                  >
                    {t.name}
                    {themeName === key && <span className="ml-auto text-xs" style={{ color: theme.accent }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auth */}
          <div className="ml-2 pl-2" style={{ borderLeft: `1px solid ${theme.border}` }}>
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Command Bar */}
      <CommandBar onNewNode={() => {}} />

      {/* Main layout: graph + right sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop} onNodeClick={onNodeClick}
            onNodesDelete={onNodesDelete} onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes} deleteKeyCode={['Backspace', 'Delete']} fitView
          >
            <Background color={theme.flowDot} gap={20} size={1} />
            <Controls />
            <MiniMap
              style={{ background: theme.panelBg }}
              maskColor={`${theme.bg}cc`}
            />
          </ReactFlow>
        </div>

        {/* Right sidebar — Timeline (always visible, fixed width) */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: '300px',
            borderLeft: `1px solid ${theme.border}`,
            background: theme.panelBg,
          }}
        >
          <EntityPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onNodeDeleted={() => setSelectedNode(null)}
          />
        </div>
      </div>
    </div>
  );
}
