import { json, fail } from '../../_lib/auth.js';
import { audit, isId, surveyActor } from '../../_lib/access.js';
export async function onRequestGet(ctx) {
  const u = await surveyActor(ctx.env);
  const q = u.role === 'admin'
    ? ctx.env.DB.prepare("SELECT id, project_code, name, area_name, status FROM projects WHERE status <> 'archived' ORDER BY created_at DESC")
    : ctx.env.DB.prepare("SELECT p.id, p.project_code, p.name, p.area_name, p.status FROM projects p JOIN project_members m ON m.project_id = p.id WHERE m.user_id = ? AND p.status <> 'archived' ORDER BY p.created_at DESC").bind(u.id);
  return json({ ok: true, projects: (await q.all()).results });
}
export async function onRequestPost(ctx) {
  const u = await surveyActor(ctx.env);
  const b = await ctx.request.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  if (!name || name.length > 150 || !isId(b.id)) return fail(400, 'INVALID_INPUT', 'กรุณาระบุชื่อโครงการ');
  const code = b.projectCode ? String(b.projectCode).trim().slice(0, 40) : null;
  try {
    await ctx.env.DB.batch([
      ctx.env.DB.prepare('INSERT INTO projects (id, project_code, name, area_name, created_by) VALUES (?,?,?,?,?)').bind(b.id, code, name, String(b.areaName || '').slice(0, 150) || null, u.id),
      ctx.env.DB.prepare("INSERT INTO project_members (project_id, user_id, role, assigned_by) VALUES (?,?,'project_manager',?)").bind(b.id, u.id, u.id),
      audit(ctx.env, b.id, u.id, 'project', b.id, 'created', { name })
    ]);
  } catch { return fail(409, 'DUPLICATE', 'รหัสโครงการซ้ำ'); }
  return json({ ok: true }, 201);
}
