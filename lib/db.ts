import Dexie, { Table } from 'dexie';

export interface Node {
  id: string;
  type: 'person' | 'project' | 'tag' | 'event';
  label: string;
  position: { x: number; y: number };
  metadata: {
    role?: string;
    description?: string;
  };
  createdAt: number;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Log {
  id: string;
  rawText: string;
  mentionedNodes: string[];
  timestamp: number;
  attachments?: {
    type: 'image' | 'audio' | 'video';
    data: string;
    name?: string;
  }[];
}

export class OrbitDB extends Dexie {
  nodes!: Table<Node>;
  edges!: Table<Edge>;
  logs!: Table<Log>;

  constructor() {
    super('OrbitDB');
    this.version(1).stores({
      nodes: 'id, type, label',
      edges: 'id, source, target',
      logs: 'id, timestamp, *mentionedNodes'
    });
  }
}

export const db = new OrbitDB();

export const deleteNode = async (nodeId: string) => {
  await db.nodes.delete(nodeId);
  await db.edges.where('source').equals(nodeId).delete();
  await db.edges.where('target').equals(nodeId).delete();
  
  const allLogs = await db.logs.toArray();
  for (const log of allLogs) {
    if (log.mentionedNodes.includes(nodeId)) {
      await db.logs.update(log.id, {
        mentionedNodes: log.mentionedNodes.filter(id => id !== nodeId)
      });
    }
  }
};

export const deleteEdge = async (edgeId: string) => {
  await db.edges.delete(edgeId);
};

export const deleteLog = async (logId: string) => {
  await db.logs.delete(logId);
};
