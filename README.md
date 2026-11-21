# Al-Itqan (مشروع الإتقان)

مشروع متكامل يتكون من:
- **Frontend**: مبني باستخدام Next.js (App Router), TypeScript, Tailwind CSS.
- **Backend**: مبني باستخدام Node.js, Express, TypeScript, Mongoose (MongoDB).

---

## 📁 هيكلية المشروع (Project Structure)

```
Al-Itqan/
├── frontend/             # تطبيق الـ Next.js
│   ├── src/
│   │   └── app/          # App Router صفحات ومكونات
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
│
└── backend/              # سيرفر الـ Node.js + Express
    ├── src/
    │   └── index.ts      # نقطة البداية وإعدادات Express و MongoDB
    ├── .env              # متغيرات البيئة (PORT, MONGO_URI)
    ├── .env.example
    ├── package.json
    └── tsconfig.json
```

---

## 🚀 طريقة تشغيل المشروع (How to Run)

### 1. تشغيل الـ Backend:
```bash
cd backend
npm run dev
```
- يعمل السيرفر افتراضياً على: `http://localhost:5000`
- فحص الحالة (Health Check): `http://localhost:5000/api/health`

### 2. تشغيل الـ Frontend:
```bash
cd frontend
npm run dev
```
- يعمل تطبيق Next.js على: `http://localhost:3000`
