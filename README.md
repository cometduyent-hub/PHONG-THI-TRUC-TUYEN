# 🧪 KHTN SMART TEST

Web app nền tảng cho hệ thống kiểm tra Khoa học tự nhiên:

**NGÂN HÀNG CÂU HỎI → TẠO ĐỀ → THI ONLINE → CHẤM → THỐNG KÊ**

## Cấu trúc đề mặc định

- Phần I: 12 câu trắc nghiệm nhiều lựa chọn.
- Phần II: 2 câu Đúng/Sai, mỗi câu 4 ý a–d.
- Phần III: 4 câu trả lời ngắn.
- Phần IV: 3 câu tự luận.

### Chấm Đúng/Sai

Mỗi câu tối đa 1 điểm:

| Số ý sai | Điểm |
|---:|---:|
| 0 | 1,00 |
| 1 | 0,50 |
| 2 | 0,25 |
| 3 | 0,10 |
| 4 | 0,00 |

## Công nghệ

- Next.js + React + TypeScript
- Supabase (Auth/Postgres/Realtime/Storage ở các phiên bản tiếp theo)

## Chạy trên máy Windows

1. Cài Node.js LTS.
2. Mở Terminal/PowerShell tại thư mục dự án.
3. Chạy:

```bash
npm install
copy .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

> Nếu PowerShell không nhận `copy`, dùng `Copy-Item .env.example .env.local`.

## Kết nối Supabase

1. Tạo project Supabase.
2. Vào Project Settings → API.
3. Điền URL và Publishable Key vào `.env.local`.
4. Mở SQL Editor của Supabase và chạy toàn bộ `supabase/schema.sql`.
5. Tạo tài khoản giáo viên trong Authentication → Users.
6. Sau đó tạo profile tương ứng trong bảng `profiles`.

**Không đưa `.env.local` lên GitHub.** `.gitignore` đã loại file này.

## Trạng thái phiên bản

### V1 hiện có
- Landing page.
- Dashboard giáo viên.
- Khung ngân hàng 4 dạng câu hỏi.
- Form thêm câu hỏi (UI nền).
- Cấu trúc tạo đề 12–2–4–3.
- Màn hình học sinh vào thi.
- Supabase schema nền.
- Hàm chấm Đúng/Sai.

### V2–V5 sẽ triển khai tiếp
- V2: CRUD ngân hàng câu hỏi + import Excel.
- V3: Ma trận + sinh đề ngẫu nhiên + xáo đáp án + lưu mã đề.
- V4: Thi thật + timer + autosave + chống mất mạng + tự chấm.
- V5: Chấm tự luận + thống kê + xuất Excel/PDF.
