import { requireUser, json, fail } from '../../../_lib/auth.js';
import { projectRole, canManage, audit } from '../../../_lib/access.js';
export async function onRequestGet(ctx) {
  const u = await requireUser(ctx); if (u instanceof Response) return u;
  if (!(await projectRole(ctx.env, u, ctx.params.id))) return fail(403, 'FORBIDDEN', 'ไม่มีสิทธิ์ในโครงการนี้');
  const { results } = await ctx.env.DB.prepare('SELECT u.id, u.username, u.display_name, m.role FROM project_members m JOIN users u ON u.id = m.user_id WHERE m.project_id = ?').bind(ctx.params.id).all();
  return json({ ok: true, members: results });
}
export async function onRequestPost(ctx) {
  const u = await requireUser(ctx); if (u instanceof Response) return u;
  const pid = ctx.params.id;
  if (!canManage(await projectRole(ctx.env, u, pid))) return fail(403, 'FORBIDDEN', 'ไม่มีสิทธิ์จัดการสมาชิก');
  const b = await ctx.request.json().catch(() => ({}));
  if (!['project_manager', 'surveyor', 'approver', 'viewer'].includes(b.role)) return fail(400, 'INVALID_INPUT', 'บทบาทไม่ถูกต้อง');
  const t = await ctx.env.DB.prepare('SELECT id FROM users WHERE username = ? AND is_active = 1').bind(String(b.username || '').trim()).first();
  if (!t) return fail(404, 'USER_NOT_FOUND', 'ไม่พบผู้ใช้');
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('INSERT INTO project_members (project_id, user_id, role, assigned_by) VALUES (?,?,?,?) ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role').bind(pid, t.id, b.role, u.id),
    audit(ctx.env, pid, u.id, 'member', t.id, 'set_role', { role: b.role })
  ]);
  return json({ ok: true });
}
