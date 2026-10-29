import { readToken, sha256, sessionCookie, json } from '../../_lib/auth.js';
export async function onRequestPost({ env, request }) {
  const token = readToken(request);
  if (token && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
}
