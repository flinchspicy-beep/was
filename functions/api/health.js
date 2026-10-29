export async function onRequestGet() {
  return Response.json({
    ok: true,
    service: "pea-watsing-survey-api",
    stage: "scaffold",
    timestamp: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
