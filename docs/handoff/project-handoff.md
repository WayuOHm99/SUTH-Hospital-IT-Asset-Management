# Handoff: สถานะระบบปัจจุบัน

## Authentication

- `POST /api/auth/login` ตรวจรหัสผ่านด้วย `bcrypt` และออก JWT
- Routes ที่เป็นข้อมูลระบบบังคับผ่าน authentication middleware
- การเพิ่ม แก้ไข ลบ และ import ข้อมูลบังคับสิทธิ์ `admin`
- ตั้งค่า `JWT_SECRET` ผ่าน `backend/.env`; ห้ามใช้ค่าตัวอย่างใน production

## Database

- Fresh install ใช้ `database/schema.sql`
- ฐานข้อมูลเดิมต้องรันไฟล์ใน `database/migrations/` ตามเลขนำหน้า
- ข้อมูลจำลองสำหรับ development อยู่ที่ `database/seeds/seed_dummy_data.sql`
- ปีงบประมาณไทยใช้ช่วงเดือนตุลาคม–กันยายนจาก `fiscal_year.start_month`
  และ `fiscal_year.end_month`

## Import workflow

1. ตรวจว่าไฟล์ไม่มีข้อมูล production ที่ไม่ควรเผยแพร่
2. ใช้หน้า `/admin/import-devices` สำหรับ `.csv`, `.xlsx` หรือ `.xls`
3. ทดสอบรูปแบบด้วย `docs/samples/mock-import-devices.csv`
4. ระบบแปลงชื่อ master data เป็น ID ก่อนบันทึก ห้าม import เข้าตารางโดยตรง

ไฟล์ `docs/samples/source-device-register.xlsx` เป็นไฟล์อ้างอิงต้นฉบับที่ถูกติดตามใน
repository ต้องทบทวนการจัดชั้นข้อมูลและสิทธิ์เข้าถึงก่อนเผยแพร่ repository

## Verification before handoff

- รัน `npm run build` ใน `frontend/`
- เปิด backend แล้วตรวจ `GET /`
- smoke-test login และ flow ที่ได้รับผลกระทบด้วยฐานข้อมูลทดสอบ
- ตรวจ fresh schema และ migration path แยกกันเมื่อมีการเปลี่ยนฐานข้อมูล
