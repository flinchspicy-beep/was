export async function projectRole(env, user, projectId) {
  if (user.role === 'admin') return 'admin';
  const r = await env.DB.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').bind(projectId, user.id).first();
  return r?.role || null;
}
export const canWrite = r => ['admin', 'project_manager', 'surveyor'].includes(r);
export const canManage = r => ['admin', 'project_manager'].includes(r);
export const audit = (env, projectId, userId, type, id, action, data) =>
  env.DB.prepare('INSERT INTO audit_logs (id, project_id, actor_user_id, entity_type, entity_id, action, new_value_json) VALUES (?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), projectId, userId, type, id, action, JSON.stringify(data ?? null));
export const isId = s => typeof s === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(s);
export function haversine(a, b, c, d) {
  const R = 6371000, r = x => x * Math.PI / 180, dLat = r(c - a), dLon = r(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
