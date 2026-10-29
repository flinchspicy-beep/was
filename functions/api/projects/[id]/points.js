import { json, fail } from '../../../_lib/auth.js';
import { projectRole, canWrite, audit, isId, surveyActor } from '../../../_lib/access.js';
export async function onRequestGet(ctx) {
  const u = await surveyActor(ctx.env);
  if (!(await projectRole(ctx.env, u, ctx.params.id))) return fail(403, 'FORBIDDEN', 'ไม่มีสิทธิ์ในโครงการนี้');
  const { results } = await ctx.env.DB.prepare('SELECT id, sequence_no, point_code, point_type, status, latitude, longitude, gps_accuracy_m, notes, version FROM survey_points WHERE project_id = ? ORDER BY sequence_no').bind(ctx.params.id).all();
  return json({ ok: true, points: results });
}
export async function onRequestPost(ctx) {
  const u = await surveyActor(ctx.env);
  const pid = ctx.params.id;
  if (!canWrite(await projectRole(ctx.env, u, pid))) return fail(403, 'FORBIDDEN', 'ไม่มีสิทธิ์บันทึกข้อมูลในโครงการนี้');
  const b = await ctx.request.json().catch(() => ({}));
  const lat = Number(b.latitude), lon = Number(b.longitude);
  if (!isId(b.id) || !(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180) || b.latitude == null) return fail(400, 'INVALID_INPUT', 'พิกัดไม่ถูกต้อง');
  const type = ['pole', 'transformer', 'meter', 'other'].includes(b.pointType) ? b.pointType : 'pole';
  const status = ['existing', 'new_installation', 'removal'].includes(b.status) ? b.status : 'existing';
  const acc = Number.isFinite(Number(b.gpsAccuracy)) && b.gpsAccuracy !== null ? Number(b.gpsAccuracy) : null;
  // id จากฝั่งไคลเอนต์ + ON CONFLICT DO NOTHING ทำให้ส่งซ้ำตอนซิงค์ไม่สร้างข้อมูลซ้ำ
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(`INSERT INTO survey_points (id, project_id, point_code, sequence_no, point_type, status, latitude, longitude, gps_accuracy_m, gps_captured_at, notes, created_by, updated_by)
      VALUES (?,?,?, (SELECT COALESCE(MAX(sequence_no),0)+1 FROM survey_points WHERE project_id = ?), ?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`)
      .bind(b.id, pid, String(b.pointCode || '').slice(0, 40) || null, pid, type, status, lat, lon, acc, b.capturedAt ? String(b.capturedAt).slice(0, 30) : null, String(b.notes || '').slice(0, 500) || null, u.id, u.id),
    audit(ctx.env, pid, u.id, 'point', b.id, 'created', { lat, lon, type, status })
  ]);
  return json({ ok: true }, 201);
}
