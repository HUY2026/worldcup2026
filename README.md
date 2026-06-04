# 🏆 WC2026 Predictor

Web app dự đoán kết quả World Cup 2026 cho nhóm bạn.

---

## 🚀 Hướng dẫn deploy (từng bước)

### BƯỚC 1 — Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → Đăng ký / Đăng nhập (free)
2. Nhấn **New Project** → Đặt tên, chọn region (Singapore gần nhất)
3. Vào **SQL Editor** → Paste toàn bộ nội dung file `supabase_schema.sql` → Nhấn **Run**
4. Vào **Project Settings → API**:
   - Copy **Project URL** → đây là `REACT_APP_SUPABASE_URL`
   - Copy **anon/public key** → đây là `REACT_APP_SUPABASE_ANON_KEY`

### BƯỚC 2 — Push code lên GitHub

```bash
git init
git add .
git commit -m "WC2026 Predictor init"
# Tạo repo mới trên github.com, rồi:
git remote add origin https://github.com/your-username/wc2026-predictor.git
git push -u origin main
```

### BƯỚC 3 — Deploy lên Vercel

1. Vào [vercel.com](https://vercel.com) → **New Project** → Import repo vừa tạo
2. Vercel tự nhận đây là React app (Create React App)
3. Vào **Environment Variables**, thêm 3 biến:
   ```
   REACT_APP_SUPABASE_URL     = https://xxx.supabase.co
   REACT_APP_SUPABASE_ANON_KEY = eyJxxx...
   REACT_APP_ADMIN_PASSWORD   = (mật khẩu admin bạn muốn)
   ```
4. Nhấn **Deploy** → Xong! 🎉

---

## 📋 Hướng dẫn sử dụng

### User thường
- Vào web → nhập tên → dự đoán ngay
- Vòng bảng: chọn **Thắng / Hòa / Thua** (khóa khi trận bắt đầu)
- Vòng loại trực tiếp: chọn **đội đi tiếp + tỷ số dự đoán**
- Xem **Bảng xếp hạng** bất kỳ lúc nào

### Admin
- Nhập tên → bật "Đăng nhập Admin" → nhập mật khẩu
- Vào tab **Admin** → nhập tỷ số từng trận → hệ thống tự tính điểm
- Thêm trận vòng loại trực tiếp bằng nút **+ Thêm trận**

---

## 🎯 Hệ thống tính điểm

| Loại | Điều kiện | Điểm |
|------|-----------|------|
| Vòng bảng | Đoán đúng Thắng/Hòa/Thua | **2đ** |
| Vòng bảng | Đoán sai | 0đ |
| Loại trực tiếp | Đoán đúng đội đi tiếp | **3đ** |
| Loại trực tiếp | Đúng đội + đúng tỷ số | **7đ** |
| Loại trực tiếp | Sai đội | 0đ |

---

## 🛠️ Chạy local (dev)

```bash
# Copy file env
cp .env.example .env
# Điền SUPABASE_URL và ANON_KEY vào .env

npm install
npm start
```
