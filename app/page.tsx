import Link from "next/link";

export default function Home(){return <>
  <header className="topbar"><div className="brand"><div className="brandmark">🧪</div>KHTN SMART TEST</div><Link className="btn btn-secondary" href="/login">Đăng nhập giáo viên</Link></header>
  <main className="container"><section className="hero"><div><div className="badge">KHOA HỌC TỰ NHIÊN • 6–9</div><h1>Kiểm tra thông minh, ra đề theo ma trận.</h1><p>Ngân hàng câu hỏi → tạo đề → thi online → chấm điểm → thống kê. Hệ thống được thiết kế riêng cho giáo viên KHTN với 4 phần: 12 lựa chọn, 2 đúng/sai, 4 trả lời ngắn và 3 tự luận.</p><div className="actions"><Link className="btn btn-primary" href="/login">Vào khu vực giáo viên</Link><Link className="btn btn-secondary" href="/student">Học sinh vào thi</Link></div></div><div className="card"><h2>🎯 Cấu trúc đề mặc định</h2><p><b>Phần I:</b> 12 câu nhiều lựa chọn</p><p><b>Phần II:</b> 2 câu Đúng/Sai × 4 ý</p><p><b>Phần III:</b> 4 câu trả lời ngắn</p><p><b>Phần IV:</b> 3 câu tự luận</p><div className="notice">Đúng/Sai: 0 sai = 1,00; 1 sai = 0,50; 2 sai = 0,25; 3 sai = 0,10; 4 sai = 0.</div></div></section></main>
  <div className="footer">KHTN SMART TEST • Phiên bản nền tảng V1</div>
</>}
