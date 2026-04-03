import { v4 as uuidv4 } from 'uuid';
import { db, Node, Edge } from './db';

export async function initMockData() {
  const nodeCount = await db.nodes.count();
  if (nodeCount > 0) return;

  const nodes: Node[] = [
    {
      id: uuidv4(),
      type: 'person',
      label: 'Alex',
      position: { x: 100, y: 100 },
      metadata: { role: 'UI Designer' },
      createdAt: Date.now()
    },
    {
      id: uuidv4(),
      type: 'person',
      label: 'Sam',
      position: { x: 300, y: 150 },
      metadata: { role: 'Backend Dev' },
      createdAt: Date.now()
    },
    {
      id: uuidv4(),
      type: 'project',
      label: '前端优化',
      position: { x: 200, y: 300 },
      metadata: { description: 'Performance improvements' },
      createdAt: Date.now()
    },
    {
      id: uuidv4(),
      type: 'tag',
      label: 'React',
      position: { x: 400, y: 250 },
      metadata: {},
      createdAt: Date.now()
    }
  ];

  await db.nodes.bulkAdd(nodes);

  const edges: Edge[] = [
    { id: uuidv4(), source: nodes[0].id, target: nodes[2].id, label: 'works on' },
    { id: uuidv4(), source: nodes[1].id, target: nodes[2].id, label: 'collaborates' },
    { id: uuidv4(), source: nodes[2].id, target: nodes[3].id }
  ];

  await db.edges.bulkAdd(edges);
}
