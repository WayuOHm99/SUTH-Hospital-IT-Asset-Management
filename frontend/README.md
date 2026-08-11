# Frontend

Vue 3 single-page application สำหรับ SUTH Hospital IT Asset Management

## Commands

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Development server เริ่มต้นที่ `http://localhost:5173` และ proxy `/api` ไปยัง
Express API ที่ `http://localhost:3000` ส่วน production จะใช้ `/api` บน origin
เดียวกันโดยปริยาย หาก API อยู่คนละ origin ให้ตั้ง `VITE_API_BASE_URL` ตาม
`frontend/.env.example`

โครงสร้างและขั้นตอนติดตั้งระบบทั้งหมดอยู่ที่ [`../README.md`](../README.md)
