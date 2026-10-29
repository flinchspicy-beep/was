import { hashPassword, createSession, json, fail } from '../../_lib/auth.js';

export async function onRequestPost({ env, request }) {
  if (!env.DB) return fail(503, 'D1_NOT_CONFIGURED', 'ยังไม่ได้ผูก D1');
  if (!env.SETUP_TOKEN) return fail(503, 'SETUP_NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า SETUP_TOKEN บนเซิร์ฟเวอร์');
  const body = await request.json().catch(() => null);
  if (!body || body.setupToken !== env.SETUP_TOKEN) return fail(403, 'SETUP_TOKEN_INVALID', 'รหัสตั้งค่าเริ่มต้นไม่ถูกต้อง');
  const username = String(body.username || '').trim();
  const displayName = String(body.displayName || '').trim();
  const password = String(body.password || '');
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) return fail(400, 'INVALID_INPUT', 'ชื่อผู้ใช้ใช้ได้เฉพาะ A-Z 0-9 . _ - ความยาว 3-40 ตัว');
  if (!displayName || displayName.length > 100) return fail(400, 'INVALID_INPUT', 'กรุณาระบุชื่อที่แสดง');
  if (password.length < 12) return fail(400, 'WEAK_PASSWORD', 'รหัสผ่านต้องยาวอย่างน้อย 12 ตัวอักษร');

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  // แทรกเฉพาะเมื่อยังไม่มีผู้ใช้เลย (atomic ป้องกันการแย่งสร้างผู้ดูแล)
  const r = await env.DB.prepare(
    `INSERT INTO users (id, username, password_hash, password_salt, role, display_name)
     SELECT ?, ?, ?, ?, 'admin', ? WHERE NOT EXISTS (SELECT 1 FROM users)`
  ).bind(id, username, hash, salt, displayName).run();
  if (!r.meta.changes) return fail(409, 'SETUP_DONE', 'ระบบถูกตั้งค่าผู้ดูแลแล้ว');
  await env.DB.prepare('INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), id, 'user', id, 'first_admin_created').run();
  const cookie = await createSession(env, request, id);
  return json({ ok: true, user: { id, username, display_name: displayName, role: 'admin' } }, 201, { 'Set-Cookie': cookie });
}
