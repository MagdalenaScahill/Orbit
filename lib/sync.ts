import { supabase } from './supabase';
import { db, Node, Edge, Log } from './db';

// Debounced 版本的 syncToCloud，2秒内多次调用只执行一次
let syncTimer: ReturnType<typeof setTimeout> | null = null;
export function debouncedSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToCloud().catch(console.error);
    syncTimer = null;
  }, 2000);
}

// 获取当前登录用户
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ==================== 上传本地数据到云端 ====================

export async function pushNodesToCloud(userId: string) {
  const nodes = await db.nodes.toArray();
  if (nodes.length === 0) return;

  const rows = nodes.map(n => ({
    id: n.id,
    user_id: userId,
    type: n.type,
    label: n.label,
    position: n.position,
    metadata: n.metadata,
    created_at: n.createdAt,
    updated_at: Date.now(),
  }));

  const { error } = await supabase
    .from('orbit_nodes')
    .upsert(rows, { onConflict: 'id,user_id' });

  if (error) console.error('pushNodesToCloud error:', error);
}

export async function pushEdgesToCloud(userId: string) {
  const edges = await db.edges.toArray();
  if (edges.length === 0) return;

  const rows = edges.map(e => ({
    id: e.id,
    user_id: userId,
    source: e.source,
    target: e.target,
    label: e.label ?? null,
    updated_at: Date.now(),
  }));

  const { error } = await supabase
    .from('orbit_edges')
    .upsert(rows, { onConflict: 'id,user_id' });

  if (error) console.error('pushEdgesToCloud error:', error);
}

export async function pushLogsToCloud(userId: string) {
  const logs = await db.logs.toArray();
  if (logs.length === 0) return;

  const rows = logs.map(l => ({
    id: l.id,
    user_id: userId,
    raw_text: l.rawText,
    mentioned_nodes: l.mentionedNodes,
    timestamp: l.timestamp,
    attachments: l.attachments ?? null,
    updated_at: Date.now(),
  }));

  const { error } = await supabase
    .from('orbit_logs')
    .upsert(rows, { onConflict: 'id,user_id' });

  if (error) console.error('pushLogsToCloud error:', error);
}

// ==================== 从云端拉取数据到本地 ====================

export async function pullNodesFromCloud(userId: string) {
  const { data, error } = await supabase
    .from('orbit_nodes')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return;

  await db.nodes.clear();
  await db.nodes.bulkPut(
    data.map(r => ({
      id: r.id,
      type: r.type,
      label: r.label,
      position: r.position,
      metadata: r.metadata,
      createdAt: r.created_at,
    }))
  );
}

export async function pullEdgesFromCloud(userId: string) {
  const { data, error } = await supabase
    .from('orbit_edges')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return;

  await db.edges.clear();
  await db.edges.bulkPut(
    data.map(r => ({
      id: r.id,
      source: r.source,
      target: r.target,
      label: r.label ?? undefined,
    }))
  );
}

export async function pullLogsFromCloud(userId: string) {
  const { data, error } = await supabase
    .from('orbit_logs')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return;

  await db.logs.clear();
  await db.logs.bulkPut(
    data.map(r => ({
      id: r.id,
      rawText: r.raw_text,
      mentionedNodes: r.mentioned_nodes,
      timestamp: r.timestamp,
      attachments: r.attachments ?? undefined,
    }))
  );
}

// ==================== 主同步入口 ====================

/**
 * 登录后调用：
 * - 如果云端有数据 → 拉取云端覆盖本地
 * - 如果云端无数据 → 上传本地数据到云端
 */
export async function syncOnLogin() {
  const user = await getCurrentUser();
  if (!user) return;

  const userId = user.id;

  // 检查云端是否有数据
  const { count } = await supabase
    .from('orbit_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (count && count > 0) {
    // 云端有数据 → 拉取
    console.log('[Orbit Sync] Pulling from cloud...');
    await pullNodesFromCloud(userId);
    await pullEdgesFromCloud(userId);
    await pullLogsFromCloud(userId);
    console.log('[Orbit Sync] Pull complete.');
  } else {
    // 云端无数据 → 推送本地
    console.log('[Orbit Sync] Pushing local data to cloud...');
    await pushNodesToCloud(userId);
    await pushEdgesToCloud(userId);
    await pushLogsToCloud(userId);
    console.log('[Orbit Sync] Push complete.');
  }
}

/**
 * 每次本地数据改动后调用（增量同步）
 */
export async function syncToCloud() {
  const user = await getCurrentUser();
  if (!user) return;

  await pushNodesToCloud(user.id);
  await pushEdgesToCloud(user.id);
  await pushLogsToCloud(user.id);
}
