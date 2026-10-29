# ระบบสำรวจระบบจำหน่ายไฟฟ้า กฟส.วัดสิงห์ — Starter v0.1

โครงสร้างเริ่มต้นสำหรับพัฒนาระบบสำรวจภาคสนามด้วย Cloudflare Pages Functions และ D1

> **สถานะ:** ยังเป็น Prototype ไม่ใช่ระบบพร้อมใช้งานภาคสนาม ฟังก์ชันสำรวจ สิทธิ์ รายงาน BOQ การส่งออก และโมเดล 3 มิติยังไม่ครบ ต้องทดสอบและตรวจความปลอดภัยก่อนใช้ข้อมูลจริง

## โครงสร้าง

- `public/` หน้าเว็บ PWA
- `functions/api/` Pages Functions สำหรับ API
- `migrations/` โครงสร้างตาราง D1
- `scripts/create-admin-sql.mjs` เครื่องมือสร้าง SQL สำหรับผู้ดูแลคนแรกในเครื่องที่ได้รับอนุญาต

## ตั้งค่าและ Deploy

1. ติดตั้ง Node.js LTS และ npm
2. ลงชื่อเข้าใช้ Cloudflare ด้วย `npx wrangler login`
3. ตรวจสอบว่า D1 database `survey-watsing-test-db` และ binding ใน `wrangler.jsonc` ถูกต้อง
4. ติดตั้ง dependencies ด้วย `npm install`
5. ใช้ `npm run db:remote` เพื่อใช้ migrations กับฐานข้อมูลที่ตั้งค่าไว้
6. Deploy ด้วย `npm run deploy:pages` หรือรัน `./deploy-cloudflare.ps1` ใน PowerShell

## สร้างบัญชีผู้ดูแลคนแรก

ระบบ **ไม่มีหน้าเว็บสร้างผู้ดูแลคนแรกและไม่มี SETUP_TOKEN แล้ว** เพื่อไม่ให้บุคคลทั่วไปลองสร้างบัญชีผู้ดูแลผ่านหน้าเว็บได้

ทำขั้นตอนนี้จากเครื่องของผู้ดูแลที่ได้รับอนุญาตเท่านั้น:

1. เปิด PowerShell/Terminal ในโฟลเดอร์โปรเจกต์ และตรวจสอบว่า Wrangler ลงชื่อเข้าใช้บัญชี Cloudflare ที่ถูกต้อง
2. รัน `node ./scripts/create-admin-sql.mjs` แล้วกรอกชื่อผู้ใช้ ชื่อที่แสดง และรหัสผ่าน (รหัสผ่านจะไม่แสดงบนหน้าจอ)
3. ตรวจสอบไฟล์ `create-admin.sql` ที่สร้างขึ้น ว่าระบุผู้ใช้ที่ต้องการและไม่มีคำสั่งอื่นที่ไม่คาดหมาย
4. รันกับฐานข้อมูล D1 ที่ถูกต้องเท่านั้น:
   `npx wrangler d1 execute survey-watsing-test-db --remote --file=./create-admin.sql`
5. ทดลองเข้าสู่ระบบด้วยบัญชีที่สร้าง และลบไฟล์ `create-admin.sql` หลังใช้งาน

SQL ใช้ค่า hash ของรหัสผ่าน PBKDF2-SHA256 จำนวน 100,000 รอบและ salt สุ่มตามรูปแบบเดียวกับระบบล็อกอิน โดยคำสั่งจะสร้างบัญชีได้เฉพาะเมื่อยังไม่มีผู้ใช้ในตารางเท่านั้น หากฐานข้อมูลมีผู้ใช้แล้ว คำสั่งจะไม่เพิ่มบัญชีใหม่

**ข้อควรระวัง:** ชื่อฐานข้อมูลในคำสั่งเป็นชื่อที่ตั้งไว้ในโปรเจกต์นี้ ตรวจสอบบัญชี Cloudflare และฐานข้อมูลเป้าหมายทุกครั้งก่อนใช้ `--remote` ห้าม commit ไฟล์ `create-admin.sql` หรือข้อมูลรับรองใด ๆ เข้า Git

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
