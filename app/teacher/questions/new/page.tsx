"use client";

import React, { useState } from "react";

export default function NewQuestionPage() {
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("6");
  const [section, setSection] = useState("MCQ");
  const [count, setCount] = useState(3);
  const [documentText, setDocumentText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);

  const handleGenerateFromAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("topic", topic);
      formData.append("grade", grade);
      formData.append("section", section);
      formData.append("count", count.toString());
      formData.append("documentText", documentText);
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.questions) {
        setQuestions(data.questions);
      } else {
        alert("Lỗi khi tạo câu hỏi: " + (data.error || "Không rõ lỗi"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối AI: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg my-8">
      <h1 className="text-2xl font-bold mb-4">Tạo câu hỏi tự động bằng AI</h1>
      <form onSubmit={handleGenerateFromAI} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Chủ đề bài học</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ví dụ: Quang hợp ở thực vật, Năng lượng..."
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Khối lớp</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="6">Lớp 6</option>
              <option value="7">Lớp 7</option>
              <option value="8">Lớp 8</option>
              <option value="9">Lớp 9</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dạng câu hỏi</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="MCQ">Trắc nghiệm (MCQ)</option>
              <option value="TF">Đúng / Sai (TF)</option>
              <option value="SHORT">Trả lời ngắn (SHORT)</option>
              <option value="ESSAY">Tự luận (ESSAY)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Số lượng câu</label>
            <input
              type="number"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Dán văn bản tài liệu (nếu có)</label>
          <textarea
            rows={4}
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Dán nội dung kiến thức bài học vào đây..."
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tải file tài liệu (Ảnh / PDF)</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "AI đang tạo câu hỏi, vui lòng đợi..." : "Tạo câu hỏi tự động"}
        </button>
      </form>

      {questions.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-bold">Danh sách câu hỏi AI vừa tạo:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(questions, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
