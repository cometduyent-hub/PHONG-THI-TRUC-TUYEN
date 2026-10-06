"use client";
import {useState} from "react";
export default function NewQuestion(){const [type,setType]=useState("multiple_choice");return <><div className="page-title"><div><h1>Thêm câu hỏi</h1><p className="muted">V1 cung cấp biểu mẫu nền; V2 sẽ lưu trực tiếp vào Supabase.</p></div></div><div className="card"><div className="form"><div><label className="label">Dạng câu hỏi</label><select className="select" value={type} onChange={e=>setType(e.target.value)}><option value="multiple_choice">Nhiều lựa chọn</option><option value="true_false">Đúng/Sai</option><option value="short_answer">Trả lời ngắn</option><option value="essay">Tự luận</option></select></div><div><label className="label">Lớp</label><select className="select"><option>KHTN 6</option><option>KHTN 7</option><option>KHTN 8</option><option>KHTN 9</option></select></div><div><label className="label">Nội dung câu hỏi</label><textarea className="textarea" placeholder="Nhập câu hỏi..."></textarea></div><div><label className="label">Chủ đề</label><input className="input" placeholder="Ví dụ: Áp suất chất lỏng"/></div><button className="btn btn-primary" type="button">Lưu câu hỏi (V2)</button></div></div></>}
'use client';

import { useState } from 'react';

// Khai báo kiểu dữ liệu cho câu hỏi nhận về từ AI
interface Question {
  content: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function AIGeneratePage() {
  // State quản lý Form nhập liệu
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('6');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('Thông hiểu');

  // State quản lý trạng thái tải và danh sách câu hỏi nhận về
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // HÀM XỬ LÝ CHÍNH Ở BƯỚC 4
  const handleGenerateFromAI = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn trang reload khi ấn Submit Form

    if (!topic.trim()) {
      alert('Vui lòng nhập chủ đề câu hỏi!');
      return;
    }

    setLoading(true); // Bật trạng thái Loading
    setQuestions([]);  // Xóa danh sách câu hỏi cũ (nếu có)

    try {
      // Gọi API Route đã viết ở Bước 3
      const response = await fetch('/api/teacher/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          grade,
          count: Number(count),
          difficulty,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Cập nhật mảng câu hỏi nhận được vào State để hiển thị ra giao diện
        setQuestions(result.data);
      } else {
        alert(`Lỗi từ hệ thống: ${result.message}`);
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền!');
    } finally {
      setLoading(false); // Tắt trạng thái Loading dù thành công hay thất bại
    }
  };

  return (
    // Phần giao diện bên dưới...
