import { requireUser, hashPassword, json, fail } from '../../_lib/auth.js';
const ROLES = ['project_manager', 'surveyor', 'approver'];
export async function onRequestGet(ctx) {
  const u = await requireUser(ctx, ['admin', 'project_manager']); if (u instanceof Response) return u;
  const { results } = await ctx.env.DB.prepare('SELECT id, username, display_name, role, is_active FROM users ORDER BY username').all();
  return json({ ok: true, users: results });
}
export async function onRequestPost(ctx) {
  const u = await requireUser(ctx, ['admin']); if (u instanceof Response) return u;
  const b = await ctx.request.json().catch(() => ({}));
  const username = String(b.username || '').trim();
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(username) || !String(b.displayName || '').trim() || !ROLES.includes(b.role)) return fail(400, 'INVALID_INPUT', 'ข้อมูลไม่ถูกต้อง');
  if (String(b.password || '').length < 12) return fail(400, 'WEAK_PASSWORD', 'รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร');
  const { hash, salt } = await hashPassword(b.password);
  try {
    await ctx.env.DB.prepare('INSERT INTO users (id, username, password_hash, password_salt, role, display_name) VALUES (?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), username, hash, salt, b.role, String(b.displayName).trim()).run();
  } catch { return fail(409, 'USERNAME_TAKEN', 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'); }
  return json({ ok: true }, 201);
}
