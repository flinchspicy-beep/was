const enc = new TextEncoder();
const ITERATIONS = 100000; // ค่าสูงสุดที่ Workers runtime รองรับสำหรับ PBKDF2
const SESSION_DAYS = 7;
export const MAX_ATTEMPTS = 5;
export const WINDOW_MIN = 15;

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
export const fail = (status, error, message) => json({ ok: false, error, message }, status);

async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
}
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { hash: b64(await derive(password, salt)), salt: b64(salt) };
}
export async function verifyPassword(password, hash, salt) {
  const a = new Uint8Array(await derive(password, unb64(salt)));
  const b = unb64(hash);
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ (b[i] ?? 0);
  return diff === 0;
}
export const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

const isHttps = request => new URL(request.url).protocol === 'https:';
export function sessionCookie(request, token, maxAge) {
  return `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(request) ? '; Secure' : ''}`;
}
export async function createSession(env, request, userId) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c]));
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), userId, expires).run();
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
  return sessionCookie(request, token, SESSION_DAYS * 86400);
}
export const readToken = request => /(?:^|;\s*)session=([^;]+)/.exec(request.headers.get('Cookie') || '')?.[1] || null;

export async function getUser(env, request) {
  const token = readToken(request);
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ? AND u.is_active = 1`
  ).bind(await sha256(token), new Date().toISOString()).first();
}
// ใช้ในเอนด์พอยต์ถัดไป: const user = await requireUser(ctx, ['admin']); if (user instanceof Response) return user;
export async function requireUser({ env, request }, roles) {
  const user = await getUser(env, request);
  if (!user) return fail(401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
  if (roles && !roles.includes(user.role)) return fail(403, 'FORBIDDEN', 'ไม่มีสิทธิ์ใช้งานส่วนนี้');
  return user;
}
