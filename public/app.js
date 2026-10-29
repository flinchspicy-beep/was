const statusBadge = document.querySelector('#connectionBadge');
const apiStatus = document.querySelector('#apiStatus');
const refreshButton = document.querySelector('#refreshButton');
const installButton = document.querySelector('#installButton');
let installPrompt = null;

function updateConnection() {
  const online = navigator.onLine;
  statusBadge.textContent = online ? 'ออนไลน์' : 'ออฟไลน์';
  statusBadge.style.color = online ? '#d7efdf' : '#ffe2a6';
  statusBadge.style.borderColor = online ? '#7acb94' : '#e4bf69';
  if (!online) apiStatus.textContent = 'อุปกรณ์ออฟไลน์: หน้านี้เปิดได้ แต่การเชื่อม API ยังต้องใช้อินเทอร์เน็ต';
}

async function checkApi() {
  if (!navigator.onLine) {
    apiStatus.textContent = 'ออฟไลน์: ยังตรวจสอบ API ไม่ได้';
    return;
  }
  apiStatus.textContent = 'กำลังตรวจสอบ API...';
  try {
    const response = await fetch('/api/health', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error('API response not ready');
    apiStatus.textContent = `API ติดต่อได้ · ${result.stage === 'scaffold' ? 'โครงสร้างเริ่มต้น' : 'พร้อมใช้งาน'}`;
  } catch {
    apiStatus.textContent = 'ยังเชื่อม API ไม่ได้: ตรวจสอบว่าได้ตั้งค่า Pages Functions/Workers และ D1 แล้ว';
  }
}

refreshButton?.addEventListener('click', checkApi);
window.addEventListener('online', () => { updateConnection(); checkApi(); });
window.addEventListener('offline', updateConnection);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
if ('serviceWorker' in navigator && location.protocol.startsWith('https')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
}

const $ = s => document.querySelector(s);
async function api(path, method = 'GET', body) {
  try {
    const r = await fetch(path, { method, credentials: 'same-origin', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  } catch { return { ok: false, data: { message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' } }; }
}
let currentUser = null;
const ROLE_TH = { admin: 'ผู้ดูแลระบบ', project_manager: 'ผู้จัดการโครงการ', surveyor: 'ผู้สำรวจ', approver: 'ผู้อนุมัติ' };
function showAuth(state, user) {
  $('#sessionBox').hidden = state !== 'session';
  $('#setupForm').hidden = state !== 'setup';
  $('#loginForm').hidden = state !== 'login';
  if (user) { $('#whoami').textContent = `${user.display_name} · ${ROLE_TH[user.role] || user.role}`; currentUser = user; }
  $('#workspace').hidden = state !== 'session';
  if (state === 'session') initWorkspace();
}
async function loadAuth() {
  const me = await api('/api/auth/me');
  if (me.ok) return showAuth('session', me.data.user);
  const st = await api('/api/setup/status');
  showAuth(st.data?.setupRequired ? 'setup' : 'login');
}
for (const id of ['#setupForm', '#loginForm']) {
  $(id).addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget, err = form.querySelector('.form-error'), btn = form.querySelector('button');
    err.textContent = ''; btn.disabled = true;
    const res = await api(id === '#setupForm' ? '/api/setup/admin' : '/api/auth/login', 'POST', Object.fromEntries(new FormData(form)));
    btn.disabled = false;
    if (!res.ok) { err.textContent = res.data.message || 'ดำเนินการไม่สำเร็จ'; return; }
    form.reset(); showAuth('session', res.data.user);
  });
}
$('#logoutButton').addEventListener('click', async () => { await api('/api/auth/logout', 'POST'); loadAuth(); });
updateConnection();
checkApi();
loadAuth();

// ===== งานสำรวจ =====
const uid = () => crypto.randomUUID();
const QKEY = 'syncQueue.v1';
const getQ = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { return []; } };
const setQ = q => localStorage.setItem(QKEY, JSON.stringify(q));
let projectId = null, gps = null, points = [], inited = false;

function renderQueue() {
  const n = getQ().length, el = $('#queueNote');
  el.hidden = !n; el.textContent = n ? `มี ${n} รายการรอซิงค์ (จะส่งอัตโนมัติเมื่อมีสัญญาณ)` : '';
}
// ส่งตามลำดับ: หยุดเมื่อเครือข่ายล้ม, ทิ้งรายการที่เซิร์ฟเวอร์ปฏิเสธถาวร (4xx) พร้อมแจ้งเตือน
async function flush() {
  const q = getQ(); let rejected = 0;
  while (q.length) {
    const r = await fetch(q[0].path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q[0].body) }).catch(() => null);
    if (!r || r.status >= 500 || r.status === 401) break;
    if (!r.ok) rejected++;
    q.shift(); setQ(q);
  }
  renderQueue();
  if (rejected) alert(`มี ${rejected} รายการถูกเซิร์ฟเวอร์ปฏิเสธ (เช่น ไม่มีสิทธิ์หรือข้อมูลไม่ถูกต้อง) กรุณาตรวจสอบรายการล่าสุด`);
  if (projectId) loadProject();
}
async function send(path, body) {
  setQ([...getQ(), { path, body }]); renderQueue();
  if (navigator.onLine) await flush();
}
function opt(sel, items, label) {
  sel.replaceChildren(...items.map(i => Object.assign(document.createElement('option'), { value: i.id, textContent: label(i) })));
}
async function loadProjects() {
  const res = await api('/api/projects');
  const list = res.data.projects || [];
  opt($('#projectSelect'), list, p => `${p.project_code ? p.project_code + ' · ' : ''}${p.name}`);
  $('#projectForm').hidden = !['admin', 'project_manager'].includes(currentUser?.role);
  projectId = list[0]?.id || null; $('#projectBody').hidden = !projectId;
  if (projectId) loadProject();
}
async function loadProject() {
  projectId = $('#projectSelect').value || projectId;
  const [p, s] = await Promise.all([api(`/api/projects/${projectId}/points`), api(`/api/projects/${projectId}/spans`)]);
  points = p.data.points || [];
  const li = pt => Object.assign(document.createElement('li'), { textContent: `#${pt.sequence_no} ${pt.point_code || ''} · ${pt.point_type} · ${pt.latitude.toFixed(6)}, ${pt.longitude.toFixed(6)}${pt.gps_accuracy_m != null ? ` (±${Math.round(pt.gps_accuracy_m)} ม.)` : ''}` });
  $('#pointList').replaceChildren(...points.map(li));
  for (const n of ['fromPointId', 'toPointId']) opt($(`#spanForm [name=${n}]`), points, pt => `#${pt.sequence_no} ${pt.point_code || ''}`);
  const name = id => { const pt = points.find(x => x.id === id); return pt ? `#${pt.sequence_no}` : '?'; };
  $('#spanList').replaceChildren(...(s.data.spans || []).map(sp => Object.assign(document.createElement('li'), { textContent: `${name(sp.from_point_id)} → ${name(sp.to_point_id)} · ${sp.voltage_class === 'high_voltage' ? 'แรงสูง' : 'แรงต่ำ'} · ${sp.coordinate_length_m} ม. (พิกัด)${sp.measured_length_m != null ? ` / ${sp.measured_length_m} ม. (วัดจริง)` : ''}` })));
}
$('#gpsButton').addEventListener('click', () => {
  $('#gpsInfo').textContent = 'กำลังอ่านตำแหน่ง...';
  navigator.geolocation?.getCurrentPosition(
    p => { gps = { latitude: p.coords.latitude, longitude: p.coords.longitude, gpsAccuracy: p.coords.accuracy, capturedAt: new Date(p.timestamp).toISOString() };
      $('#gpsInfo').textContent = `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} · ความแม่นยำ ±${Math.round(gps.gpsAccuracy)} ม.${gps.gpsAccuracy > 20 ? ' (ค่อนข้างต่ำ ควรอ่านใหม่)' : ''}`; },
    e => { gps = null; $('#gpsInfo').textContent = 'อ่านตำแหน่งไม่ได้: ' + e.message; },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
});
$('#projectSelect').addEventListener('change', loadProject);
$('#projectForm').addEventListener('submit', async e => {
  e.preventDefault();
  const res = await api('/api/projects', 'POST', { id: uid(), ...Object.fromEntries(new FormData(e.currentTarget)) });
  if (!res.ok) return alert(res.data.message || 'สร้างโครงการไม่สำเร็จ');
  e.currentTarget.reset(); loadProjects();
});
$('#pointForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.currentTarget, err = f.querySelector('.form-error');
  if (!gps) { err.textContent = 'กรุณาอ่านตำแหน่ง GPS ก่อนบันทึก'; return; }
  err.textContent = '';
  await send(`/api/projects/${projectId}/points`, { id: uid(), ...gps, ...Object.fromEntries(new FormData(f)) });
  f.reset(); gps = null; $('#gpsInfo').textContent = 'ยังไม่ได้อ่านตำแหน่ง';
});
$('#spanForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.currentTarget, err = f.querySelector('.form-error'), d = Object.fromEntries(new FormData(f));
  if (d.fromPointId === d.toPointId) { err.textContent = 'ต้นทางและปลายทางต้องเป็นคนละจุด'; return; }
  err.textContent = '';
  await send(`/api/projects/${projectId}/spans`, { id: uid(), ...d });
  f.reset();
});
function initWorkspace() { if (inited) return; inited = true; renderQueue(); loadProjects(); if (navigator.onLine) flush(); }
window.addEventListener('online', () => { if (inited) flush(); });
