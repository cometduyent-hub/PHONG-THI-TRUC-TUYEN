import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "KHTN SMART TEST", description: "Hệ thống kiểm tra và đánh giá Khoa học tự nhiên" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <div className="shell">{children}</div>; }
