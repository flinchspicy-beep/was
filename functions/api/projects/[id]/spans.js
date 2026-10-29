import { json, fail } from '../../../_lib/auth.js';
import { projectRole, canWrite, audit, isId, haversine, surveyActor } from '../../../_lib/access.js';
export async function onRequestGet(ctx) {
  const u = await surveyActor(ctx.env);
  if (!(await projectRole(ctx.env, u, ctx.params.id))) return fail(403, 'FORBIDDEN', 'ไม่มีสิทธิ์ในโครงการนี้');
  const { results } = await ctx.env.DB.prepare('SELECT id, from_point_id, to_point_id, voltage_class, work_action, wire_type, wire_size, measured_length_m, coordinate_length_m, length_source FROM spans WHERE project_id = ?').bind(ctx.params.id).all();
  return json({ ok: true, spans: results });
}
export async function onRequestPost(ctx) {
  const u = await surveyActor(ctx.env);
  const pid = ctx.params.id;
  if (!canWrite(await projectRole(ctx.env, u, pid))) return fail(403, 'FORBIDDEN', 'ไม่มีสิทธิ์บันทึกข้อมูลในโครงการนี้');
  const b = await ctx.request.json().catch(() => ({}));
  if (!isId(b.id) || !isId(b.fromPointId) || !isId(b.toPointId) || b.fromPointId === b.toPointId) return fail(400, 'INVALID_INPUT', 'ต้นทาง/ปลายทางไม่ถูกต้อง');
  if (!['high_voltage', 'low_voltage'].includes(b.voltageClass) || !['removal', 'installation', 'existing'].includes(b.workAction)) return fail(400, 'INVALID_INPUT', 'ประเภทสาย/งานไม่ถูกต้อง');
  const { results } = await ctx.env.DB.prepare('SELECT id, latitude, longitude FROM survey_points WHERE project_id = ? AND id IN (?, ?)').bind(pid, b.fromPointId, b.toPointId).all();
  if (results.length !== 2) return fail(422, 'POINT_NOT_FOUND', 'ไม่พบจุดเสาในโครงการนี้');
  const [p, q] = b.fromPointId === results[0].id ? results : [results[1], results[0]];
  const coordLen = Math.round(haversine(p.latitude, p.longitude, q.latitude, q.longitude) * 100) / 100;
  const measured = b.measuredLength === '' || b.measuredLength == null ? null : Number(b.measuredLength);
  if (measured !== null && !(measured >= 0)) return fail(400, 'INVALID_INPUT', 'ความยาวไม่ถูกต้อง');
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(`INSERT INTO spans (id, project_id, from_point_id, to_point_id, voltage_class, work_action, wire_type, wire_size, measured_length_m, coordinate_length_m, length_source, created_by, updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`)
      .bind(b.id, pid, b.fromPointId, b.toPointId, b.voltageClass, b.workAction, String(b.wireType || '').slice(0, 60) || null, String(b.wireSize || '').slice(0, 60) || null, measured, coordLen, measured === null ? 'coordinates' : 'field_measurement', u.id, u.id),
    audit(ctx.env, pid, u.id, 'span', b.id, 'created', { from: b.fromPointId, to: b.toPointId })
  ]);
  return json({ ok: true, coordinateLengthM: coordLen }, 201);
}
