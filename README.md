# ระบบสำรวจระบบจำหน่ายไฟฟ้า กฟส.วัดสิงห์ — Starter v0.1

โครงสร้างเริ่มต้นสำหรับพัฒนาระบบสำรวจภาคสนามด้วย Cloudflare Pages Functions และ D1

> **สถานะ:** ยังเป็น Prototype ไม่ใช่ระบบพร้อมใช้งานภาคสนาม ฟังก์ชันสำรวจ สิทธิ์ รายงาน BOQ การส่งออก และโมเดล 3 มิติยังไม่ครบ ต้องทดสอบและตรวจความปลอดภัยก่อนใช้ข้อมูลจริง

> **โหมดปัจจุบัน:** ปิดระบบเข้าสู่ระบบชั่วคราวเพื่อพัฒนาหน้าสำรวจ ทุกคนที่เข้าถึงลิงก์สามารถดู/สร้างโครงการและบันทึกข้อมูลได้ จึงใช้เฉพาะทดสอบข้อมูลเท่านั้น ห้ามใส่ข้อมูลจริงหรือเผยแพร่ลิงก์สาธารณะจนกว่าจะเพิ่มระบบสิทธิ์กลับมา

## โครงสร้าง

- `public/` หน้าเว็บ PWA
- `functions/api/` Pages Functions สำหรับ API
- `migrations/` โครงสร้างตาราง D1



## ตรวจสอบระบบ

- `GET /api/health`
- `GET /api/setup/status` — ตรวจว่ามีบัญชีผู้ใช้แล้วหรือยัง ไม่สร้างบัญชี
- `GET /api/auth/me` — ตรวจสอบ session (จะตอบ 401 เมื่อยังไม่ได้เข้าสู่ระบบ)

## ข้อควรระวังเพิ่มเติม

- API ใช้ same-origin ไม่ควรเปิด CORS แบบ wildcard
- `service-worker.js` แคชเฉพาะ shell ไม่แคช API หรือข้อมูลสำรวจ
- ตรวจสอบกติกาทางวิศวกรรมและบัญชีอุปกรณ์มาตรฐานกับผู้รับผิดชอบก่อนใช้คำนวณ BOQ
- ห้ามนำไปใช้กับข้อมูลจริงก่อนตรวจสอบสิทธิ์ การสำรอง/กู้คืน และ workflow ทั้งหมด

## Cloudflare Pages

- Pages project ที่ระบุใน deployment script: `survey-watsing-test`
- D1 database ที่ระบุใน deployment script: `survey-watsing-test-db`
- Deploy command: `npx wrangler pages deploy public --project-name survey-watsing-test`

<!-- Cloudflare Pages deployment trigger: project connected to survey-watsing-app. -->
