# ระบบสำรวจระบบจำหน่ายไฟฟ้า กฟส.วัดสิงห์ — Starter v0.1

ชุดโครงสร้างเริ่มต้นตามข้อกำหนดที่ผู้ใช้ยืนยันแล้ว ประกอบด้วยหน้า PWA ภาษาไทย, Worker API เบื้องต้น และ D1 schema รุ่นแรก

> **สถานะสำคัญ:** เป็นโครงสร้างเริ่มต้นเพื่อพัฒนาต่อ ยังไม่ใช่ระบบพร้อมใช้งานภาคสนาม การเข้าสู่ระบบ การสร้างผู้ดูแล การตรวจสิทธิ์ การซิงค์ข้อมูลจริง การคำนวณ BOQ การส่งออก และโมเดล 3 มิติยังไม่ได้พัฒนาให้ครบ (Phase 1: มี first-admin, login, session, rate limiting แล้ว) ห้ามนำไปใช้กับข้อมูลจริงก่อนทดสอบและตรวจความปลอดภัย

## โครงสร้าง

- `public/` หน้าเว็บ PWA, CSS, JavaScript, manifest และ service worker
- `functions/api/` Pages Functions (Workers runtime) สำหรับ API health check และ setup status เท่านั้น
- `migrations/0001_initial.sql` โครงสร้าง D1 เบื้องต้น
- `wrangler.jsonc` ตัวอย่างการผูก Worker กับ D1

## ข้อกำหนดก่อนเริ่ม

1. ติดตั้ง Node.js LTS และ npm
2. มีบัญชี Cloudflare ที่ได้รับอนุญาต
3. สร้าง D1 database ชื่อ `survey-watsing-test-db` ใน Cloudflare หรือใช้ชื่ออื่นแล้วแก้ `wrangler.jsonc`
4. แทนค่า `51ac2d69-4fe2-49ab-8965-5c296f8598f2` ด้วย D1 database ID จริง
5. ห้ามใส่รหัสผ่านหรือ API token ในไฟล์ที่ commit เข้า Git

## ตั้งค่าครั้งแรก (ทำตามลำดับ)

1. `npm install`
2. `npx wrangler d1 create survey-watsing-test-db` แล้วนำ `database_id` ไปใส่ใน `wrangler.jsonc`
3. คัดลอก `.dev.vars.example` เป็น `.dev.vars` แล้วตั้ง `SETUP_TOKEN` เป็นค่าสุ่มยาวๆ (ใช้ตอนสร้างผู้ดูแลคนแรกเท่านั้น)
4. `npm run db:local` (รัน migration 0001 + 0002) แล้ว `npm run dev`
5. เปิดหน้าเว็บ จะเห็นฟอร์ม "สร้างผู้ดูแลระบบคนแรก"
6. ขึ้นระบบจริง: `npm run db:remote`, `npx wrangler pages secret put SETUP_TOKEN` แล้ว `npm run deploy:pages`

## ติดตั้ง dependencies

```bash
npm install
```

## เตรียม D1 ในเครื่องทดสอบ

```bash
npx wrangler d1 execute survey-watsing-test-db --local --file=./migrations/0001_initial.sql
```

คำสั่งนี้ต้องใช้หลังติดตั้ง Wrangler และตรวจสอบชื่อ database ในการตั้งค่าแล้วเท่านั้น

## ตรวจสอบ Worker

รัน Pages Functions ด้วย Wrangler หลังตั้งค่า D1 binding ให้ถูกต้อง แล้วตรวจ endpoint:

- `GET /api/health`
- `GET /api/setup/status`

หากยังไม่ได้รัน migration endpoint setup status จะแจ้งว่า database ยังไม่พร้อม

## ข้อควรระวัง

- API ใช้ same-origin ผ่าน Pages Functions ในโครงสร้างตั้งต้นนี้ จึงไม่ต้องเปิด CORS แบบ wildcard
- ยังไม่ได้ทำระบบ authentication/session, rate limiting หรือการจัดการบัญชีผู้ดูแลคนแรก
- `service-worker.js` แคชเฉพาะ shell และไม่แคช API หรือข้อมูลสำรวจ จึงยังไม่ใช่ระบบ offline-first ที่สมบูรณ์
- ยังไม่มีไอคอน PWA ขนาดจริง ต้องเพิ่มไฟล์ไอคอนก่อนตรวจรับ PWA
- ตรวจสอบกติกาทางวิศวกรรมและบัญชีอุปกรณ์มาตรฐานกับผู้รับผิดชอบก่อนใช้คำนวณ BOQ
- ห้าม deploy ทับระบบเดิมหรือสร้างทรัพยากร Cloudflare จริงโดยไม่ตรวจบัญชี/โดเมนและได้รับอนุญาตแยกต่างหาก


## Cloudflare deployment bundle (prepared)

The Cloudflare Pages project and D1 database have been created for this bundle.

- Pages project: `survey-watsing-test`
- URL after the first successful deployment: `https://survey-watsing-test.pages.dev`
- D1 database: `survey-watsing-test-db`
- D1 database ID: `9d3ae13d-5df8-40bc-9975-14ec3e6acc62`

### Deploy from Windows

1. Install Node.js LTS from https://nodejs.org/ and open PowerShell.
2. Extract this ZIP, then `cd` into the `survey-watsing-test-app` folder.
3. Run `npx wrangler login` and complete Cloudflare sign-in.
4. Run `./deploy-cloudflare.ps1`. When prompted, enter a long random `SETUP_TOKEN` (at least 24 characters); keep it private.
5. When deployment completes, check `/api/health` and `/api/setup/status` on the URL above.
6. Create the first administrator using the app's setup flow and the `SETUP_TOKEN` you set. Use a unique username and a password of at least 12 characters.

The script sets the Pages secret, applies the D1 migrations, and deploys `public/` together with the Pages Functions. Do not share the setup token. Do not use real field data until the authentication, permissions, backup/recovery, and workflows have been reviewed and tested.

### Cloudflare dashboard deployment

The repository-linked build must deploy this as a Pages project, not a Worker. Use this deploy command:
`npx wrangler pages deploy public --project-name survey-watsing-test`.


## Deployment configuration note

Cloudflare build settings use `npx wrangler pages deploy public --project-name survey-watsing-test` because this repository is deployed as a Cloudflare Pages project, not a standalone Worker.
