import { getUser, json, fail } from '../../_lib/auth.js';
export async function onRequestGet({ env, request }) {
  if (!env.DB) return fail(503, 'D1_NOT_CONFIGURED', 'ยังไม่ได้ผูก D1');
  const user = await getUser(env, request);
  return user ? json({ ok: true, user }) : fail(401, 'UNAUTHENTICATED', 'ยังไม่ได้เข้าสู่ระบบ');
}
