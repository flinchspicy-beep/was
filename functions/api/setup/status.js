export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json({ ok: false, error: "D1_NOT_CONFIGURED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first();
    return Response.json({ ok: true, setupRequired: Number(result?.count ?? 0) === 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({
      ok: false,
      error: "DATABASE_NOT_INITIALIZED",
      message: "ตรวจสอบว่าได้สร้าง D1 และรัน migration แล้ว"
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
