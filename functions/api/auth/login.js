import { verifyPassword, hashPassword, createSession, json, fail, MAX_ATTEMPTS, WINDOW_MIN } from '../../_lib/auth.js';

export async function onRequestPost({ env, request }) {
  if (!env.DB) return fail(503, 'D1_NOT_CONFIGURED', 'ยังไม่ได้ผูก D1');
  const body = await request.json().catch(() => null);
  const username = String(body?.username || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!username || !password || password.length > 200) return fail(400, 'INVALID_INPUT', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');

  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const keys = [`u:${username}`, `ip:${ip}`];
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
  for (const k of keys) {
    const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE attempt_key = ? AND created_at > ?').bind(k, since).first();
    if (c.n >= MAX_ATTEMPTS * (k.startsWith('ip:') ? 4 : 1)) return fail(429, 'RATE_LIMITED', `ลองผิดหลายครั้งเกินไป กรุณารอ ${WINDOW_MIN} นาที`);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').bind(username).first();
  let ok = false;
  if (user) ok = await verifyPassword(password, user.password_hash, user.password_salt);
  else await hashPassword(password); // ใช้เวลาเท่ากันเพื่อไม่เปิดเผยว่ามีบัญชีหรือไม่
  if (!ok) {
    await env.DB.batch(keys.map(k => env.DB.prepare('INSERT INTO login_attempts (attempt_key) VALUES (?)').bind(k)));
    return fail(401, 'INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE attempt_key = ?').bind(keys[0]).run();
  const cookie = await createSession(env, request, user.id);
  return json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } }, 200, { 'Set-Cookie': cookie });
}
