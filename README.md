# ĐẤU TRƯỜNG KHOA HỌC TỰ NHIÊN – V1.1

Ứng dụng Next.js + Supabase cho ngân hàng câu hỏi, ma trận tạo đề, thi online, chấm tự động, xem lại bài làm và xuất Excel.

## 1. Cấu trúc

- `app/PhysicsArena.tsx`: giao diện và logic chính.
- `app/page.tsx`: trang chính.
- `app/layout.tsx`: metadata/layout.
- `app/globals.css`: CSS tối thiểu.
- `supabase_schema_v1.sql`: tạo bảng Supabase.
- `.env.example`: mẫu biến môi trường.

## 2. Supabase

1. Tạo project Supabase.
2. Mở SQL Editor.
3. Chạy toàn bộ `supabase_schema_v1.sql`.
4. Lấy Project URL và anon/public key.

Không đưa `service_role` key vào biến `NEXT_PUBLIC_*`.

## 3. Chạy local

Tạo `.env.local` từ `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Sau đó:

```bash
npm install
npm run build
npm run dev
```

## 4. Deploy Vercel

- Push toàn bộ thư mục lên GitHub.
- Import repository vào Vercel.
- Framework: Next.js (Vercel tự nhận).
- Thêm 2 Environment Variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Deploy.

## 5. Chức năng V1.1

- Ngân hàng câu hỏi: nhập Excel/CSV/JSON, thêm câu.
- Ma trận theo 4 mức độ NB/TH/VD/VDC.
- Tạo đề ngẫu nhiên và đảo câu/đáp án.
- Xuất link đề theo mã đề.
- Học sinh làm bài trực tuyến.
- Đồng hồ dựa trên deadline tuyệt đối, giảm lỗi trôi thời gian khi tab bị treo.
- Tự động nộp khi hết giờ.
- Chấm MCQ, Đúng/Sai, trả lời ngắn.
- Hiển thị lại bài làm sau khi nộp, đánh dấu câu sai màu đỏ.
- Lưu bài làm lên Supabase.
- Giáo viên tải kết quả và xuất Excel.
- Ghi nhận việc học sinh rời tab ở mức cảnh báo phía trình duyệt.

## 6. Lưu ý V1

V1 sử dụng Supabase anon key phía trình duyệt và lưu dữ liệu đề có đáp án. Đây chưa phải kiến trúc chống gian lận tuyệt đối. V2 nên chuyển đáp án/chấm điểm sang server-side Edge Function/RPC và dùng Supabase Auth + RLS chặt chẽ.


## 7. AI tạo đề

Phiên bản nâng cấp bổ sung AI tạo câu hỏi và AI tạo toàn bộ đề theo ma trận.

- API server: `/api/ai/generate`
- AI key dùng phía server: `GEMINI_API_KEY`
- Có thể đặt `GEMINI_MODEL`; mặc định là `gemini-2.5-flash`.
- AI tạo toàn bộ đề theo đúng ma trận NB/TH/VD/VDC và 4 dạng MCQ/TF/SHORT/ESSAY.
- Đề AI tạo xong sẽ chuyển sang **Xem & Sửa đề** để giáo viên kiểm tra trước khi SAVE và phát mã đề.
- Chức năng tạo đề từ ngân hàng cũ vẫn giữ nguyên.
- Tài liệu TXT/MD/CSV/JSON/XLSX được trích xuất nội dung; PDF/hình ảnh có thể gửi trực tiếp cho AI theo khả năng của model.
- Không đưa `GEMINI_API_KEY` hoặc các biến `NEXT_PUBLIC_*` chứa khóa thật vào GitHub. Khóa thật phải đặt trong Vercel Environment Variables.

### Biến môi trường Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
# tùy chọn
GEMINI_MODEL=gemini-2.5-flash
```


## Bản sửa ma trận, AI và lưu trữ

1. API AI dùng endpoint đúng `/api/ai/generate` tại `app/api/ai/generate/route.ts`. Trước đây route bị đặt nhầm dưới `app/teacher/app/api/...`, khiến client nhận HTTP 404.
2. Mặc định dùng `gemini-2.5-flash`; có thể đặt `GEMINI_MODEL` trong Vercel. Cấu hình `GEMINI_API_KEY` trong Project Settings → Environment Variables rồi redeploy.
3. Trang Ma trận có bảng theo Chương, Nội dung/đơn vị kiến thức, 4 loại câu hỏi và 3 mức độ (Biết/Hiểu/Vận dụng). Bảng ma trận tổng hợp cũ vẫn giữ để không làm mất luồng tạo đề từ ngân hàng.
4. Chạy `supabase/migration_fix_matrix_ai_storage.sql` trong Supabase SQL Editor để bổ sung các cột mà code hiện tại sử dụng khi lưu đề, lưu ma trận và lưu bài nộp. Sao lưu dữ liệu trước khi chạy. Migration này dành cho schema legacy có `exams.id` kiểu text như `supabase_schema_v1.sql`; nếu dự án đang dùng schema mới có `exams.id` kiểu UUID thì cần đối chiếu schema trước, không chạy trực tiếp vì kiểu khóa chính không tương thích với mã đề dạng text.
5. Không đưa `.env.local` hoặc khóa bí mật vào ZIP/Git. Tệp `.env.example` chỉ chứa giá trị minh họa.
6. Nếu vẫn báo `Failed to fetch`, kiểm tra URL Supabase và anon key trong Vercel, project Supabase có hoạt động không, và RLS/network policies. Lỗi kết nối trình duyệt không thể khắc phục chỉ bằng code nếu biến môi trường hoặc dịch vụ bên ngoài sai.
