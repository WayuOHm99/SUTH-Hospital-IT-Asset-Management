# SUTH Hospital IT Asset Management

ระบบเว็บภายในสำหรับบริหารทรัพย์สิน IT ของโรงพยาบาล ติดตามอุปกรณ์ สัญญา
ยอดพิมพ์ และค่าใช้จ่ายตามปีงบประมาณไทย

## Technology

- Backend: Node.js, Express, MySQL และ JWT
- Frontend: Vue 3, Vite, Tailwind CSS และ Chart.js
- Database: MySQL schema, ordered migrations และข้อมูลจำลอง

## Repository layout

```text
backend/   Express application and HTTP routes
frontend/  Vue single-page application
database/  Fresh schema, ordered migrations, and development seeds
docs/      Architecture, handoff notes, fixes, and import samples
```

รายละเอียดสถาปัตยกรรมอยู่ที่
[`docs/architecture/project-overview.md`](docs/architecture/project-overview.md)

## Local setup

ต้องมี Node.js, npm และ MySQL ก่อนเริ่มงาน

1. สร้างฐานข้อมูลจาก schema และรัน migration ตามลำดับชื่อไฟล์:

   ```sh
   mysql -u root -p your_database < database/schema.sql
   mysql -u root -p your_database < database/migrations/001_unique_print_transactions.sql
   mysql -u root -p your_database < database/migrations/002_add_fiscal_year_range.sql
   ```

   สำหรับฐานข้อมูลใหม่ `schema.sql` มีโครงสร้างจาก migration รวมอยู่แล้ว
   จึงไม่ต้องรัน migration ซ้ำ ส่วน migration ใช้กับฐานข้อมูลที่สร้างจาก schema รุ่นเก่า

2. ถ้าต้องการข้อมูลสำหรับพัฒนา:

   ```sh
   mysql -u root -p your_database < database/seeds/seed_dummy_data.sql
   ```

3. ตั้งค่าและเปิด backend:

   ```sh
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```

4. เปิด frontend ในอีก terminal:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

Backend เริ่มต้นที่ `http://localhost:3000` และ frontend ที่
`http://localhost:5173`

## Verification

```sh
cd backend
npm test

cd frontend
npm run build
```

หลัง automated tests ให้ smoke-test `GET /` และ authenticated flows ที่ได้รับ
ผลกระทบกับฐานข้อมูลทดสอบ

## Documentation

- [Project overview](docs/architecture/project-overview.md)
- [Current handoff](docs/handoff/project-handoff.md)
- [Sample device import](docs/samples/mock-import-devices.csv)
- [Fiscal-year fix note](docs/fixes/fiscal-year-print-usage.md)

## Security

ห้าม commit `.env`, credential, token หรือข้อมูล production ตรวจ CSV/XLSX
ทุกไฟล์ก่อนนำเข้า และใช้ `JWT_SECRET` ที่แข็งแรงในทุก environment
