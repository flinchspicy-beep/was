# แผนพัฒนา

## Phase 1 — Foundation
- [x] โครงสร้าง Pages/Workers/D1 สำหรับเริ่มพัฒนา
- [x] D1 schema draft
- [x] หน้า PWA prototype และ API health check
- [ ] ยืนยัน schema กับผู้ใช้งานและบัญชีอุปกรณ์จริง
- [ ] ตั้งค่า Pages/Workers/D1 ในบัญชีที่ถูกต้อง
- [x] Authentication: first-admin setup, password hashing, sessions, rate limiting
- [x] Project membership and server-side authorization

## Phase 2 — Survey + offline
- [ ] Project picker and map-provider adapter
- [x] GPS sampling with accuracy display
- [x] Point/span forms (equipment forms ยังไม่มี)
- [~] Ordered sync queue (localStorage, idempotent) — ยังไม่ใช่ IndexedDB/conflict review
- [ ] Conflict review and persistent undo journal
- [ ] Import coordinates with preview and duplicate detection

## Phase 3 — BOQ and exports
- [ ] Catalog management and review of temporary items
- [ ] Removal/install/remnant BOQ engine with test fixtures
- [ ] Data completeness gate
- [ ] KML/CSV/PDF exports
- [ ] Google Sheets/Drive OAuth and export integration

## Phase 4 — 3D
- [ ] Three.js pole and equipment models
- [ ] Sagged conductor geometry and attachment points
- [ ] Before/after views, top view, per-pole focus
- [ ] Reduced-detail mode for mobile

## Phase 5 — acceptance
- [ ] Multi-user concurrency tests
- [ ] Offline/reconnect/retry tests
- [ ] Authorization and security tests
- [ ] BOQ verification against approved examples
- [ ] Print layout verification
- [ ] Pilot field test before production use
