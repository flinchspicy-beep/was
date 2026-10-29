$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Survey Wat Sing - Cloudflare Pages deployment" -ForegroundColor Cyan
Write-Host "Project: survey-watsing-test"
Write-Host "Database: survey-watsing-test-db"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "ไม่พบ Node.js กรุณาติดตั้ง Node.js LTS ก่อน: https://nodejs.org/"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "ไม่พบ npm กรุณาติดตั้ง Node.js LTS ก่อน"
}

npm install
if ($LASTEXITCODE -ne 0) { throw "npm install ล้มเหลว" }

Write-Host ""
Write-Host "ขั้นตอนนี้จะเปิดให้กำหนด SETUP_TOKEN ซึ่งใช้สร้างบัญชีผู้ดูแลระบบครั้งแรก" -ForegroundColor Yellow
Write-Host "ตั้งค่าเป็นค่าสุ่มยาวอย่างน้อย 24 ตัวอักษร และเก็บไว้เป็นความลับ"
npx wrangler pages secret put SETUP_TOKEN --project-name survey-watsing-test
if ($LASTEXITCODE -ne 0) { throw "ตั้งค่า SETUP_TOKEN ไม่สำเร็จ" }

Write-Host ""
Write-Host "กำลังติดตั้งโครงสร้างตารางฐานข้อมูลบน Cloudflare D1..."
npm run db:remote
if ($LASTEXITCODE -ne 0) { throw "ติดตั้ง D1 migrations ไม่สำเร็จ" }

Write-Host ""
Write-Host "กำลัง Deploy หน้าเว็บและ Pages Functions..."
npm run deploy:pages
if ($LASTEXITCODE -ne 0) { throw "Deploy ไม่สำเร็จ" }

Write-Host ""
Write-Host "เสร็จแล้ว ตรวจสอบ https://survey-watsing-test.pages.dev/api/health และ /api/setup/status"
Write-Host "ก่อนใช้งานจริง ให้ทดสอบสร้างผู้ดูแลระบบและการเข้าสู่ระบบก่อน"
