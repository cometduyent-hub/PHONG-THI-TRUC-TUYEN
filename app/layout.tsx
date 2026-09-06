import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Đấu trường Khoa học tự nhiên',
  description: 'Hệ thống ngân hàng câu hỏi, tạo đề, thi trực tuyến và thống kê KHTN',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
