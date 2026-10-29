import { createHash, randomBytes, randomUUID, pbkdf2Sync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { writeFile } from 'node:fs/promises';

const ITERATIONS = 100000;
const sql = value => "'" + String(value).replace(/'/g, "''") + "'";

async function askHidden(prompt) {
  stdout.write(prompt);
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('ต้องเปิดสคริปต์ใน Terminal/PowerShell แบบโต้ตอบ เพื่อไม่ให้รหัสผ่านแสดงบนหน้าจอ');
  }
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = chunk => {
      for (const ch of chunk.toString('utf8')) {
        if (ch === '\\u0003') {
          cleanup();
          reject(new Error('ยกเลิกแล้ว'));
          return;
        }
        if (ch === '\\r' || ch === '\\n') {
          cleanup();
          stdout.write('\\n');
          resolve(value);
          return;
        }
        if (ch === '\\u007f' || ch === '\\b') {
          value = value.slice(0, -1);
        } else if (ch >= ' ' && ch !== '\\u001b') {
          value += ch;
        }
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

const rl = createInterface({ input: stdin, output: stdout });
try {
  console.log('สร้าง SQL สำหรับผู้ดูแลคนแรก (รหัสผ่านจะไม่แสดงและไม่ถูกบันทึกเป็นข้อความธรรมดา)');
  const username = (await rl.question('ชื่อผู้ใช้ (A-Z, 0-9, . _ -; 3-40 ตัว): ')).trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('ชื่อผู้ใช้ไม่ถูกต้อง');
  const displayName = (await rl.question('ชื่อที่แสดง: ')).trim();
  if (!displayName || displayName.length > 100) throw new Error('ชื่อที่แสดงต้องมี 1-100 ตัวอักษร');
  rl.close();
  const password = await askHidden('รหัสผ่าน (อย่างน้อย 12 ตัวอักษร): ');
  if (password.length < 12 || password.length > 200) throw new Error('รหัสผ่านต้องมี 12-200 ตัวอักษร');

  const id = randomUUID();
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  const saltB64 = salt.toString('base64');
  const hashB64 = hash.toString('base64');
  const auditId = randomUUID();
  const output = `-- Generated locally by scripts/create-admin-sql.mjs. Contains only a password hash, not the password.
-- Safe to run once against the intended remote D1 database.
INSERT INTO users (id, username, password_hash, password_salt, role, display_name)
SELECT ${sql(id)}, ${sql(username)}, ${sql(hashB64)}, ${sql(saltB64)}, 'admin', ${sql(displayName)}
WHERE NOT EXISTS (SELECT 1 FROM users);

INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action)
SELECT ${sql(auditId)}, ${sql(id)}, 'user', ${sql(id)}, 'first_admin_created'
WHERE EXISTS (SELECT 1 FROM users WHERE id = ${sql(id)});
`;
  await writeFile('create-admin.sql', output, { flag: 'wx', mode: 0o600 });
  console.log('สร้างไฟล์ create-admin.sql แล้ว');
  console.log('ถัดไปตรวจชื่อฐานข้อมูลให้ถูกต้อง แล้วรัน:');
  console.log('npx wrangler d1 execute survey-watsing-test-db --remote --file=./create-admin.sql');
  console.log('ถ้ามีบัญชีผู้ใช้อยู่แล้ว คำสั่งจะไม่สร้างผู้ดูแลเพิ่ม ไฟล์ SQL มี hash ของรหัสผ่าน ควรลบทิ้งหลังใช้งาน');
} catch (error) {
  console.error('ไม่สามารถสร้างไฟล์ได้:', error.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
