// ป้องกัน CSRF: คำขอที่เปลี่ยนข้อมูลต้องมาจาก origin เดียวกันเท่านั้น
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('Origin');
    if (!origin || origin !== url.origin) {
      return Response.json({ ok: false, error: 'BAD_ORIGIN', message: 'คำขอไม่ได้มาจากเว็บไซต์นี้' }, { status: 403 });
    }
  }
  return next();
}
