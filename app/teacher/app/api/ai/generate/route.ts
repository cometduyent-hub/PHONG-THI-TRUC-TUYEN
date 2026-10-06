import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const topic = formData.get("topic") as string;
    const grade = formData.get("grade") as string;
    const section = formData.get("section") as string;
    const count = Number(formData.get("count") || 3);
    const documentText = (formData.get("documentText") as string) || "";
    const file = formData.get("file") as File | null;

    let parts: any[] = [];

    // Tải file đính kèm nếu có (PDF, Word, TXT...)
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      parts.push({
        inlineData: {
          mimeType: file.type || "application/octet-stream",
          data: base64,
        },
      });
    }

    if (documentText) {
      parts.push({ text: `Nội dung tài liệu tham khảo:\n${documentText}` });
    }

    const promptText = `
Bạn là chuyên gia biên soạn đề thi môn Khoa học tự nhiên cấp THCS (Lớp ${grade}).
Hãy trích xuất hoặc biên soạn ${count} câu hỏi bám sát kiến thức từ tài liệu/chủ đề sau:
- Chủ đề: ${topic}
- Dạng câu hỏi (section): ${section} (Gồm MCQ: Trắc nghiệm 4 lựa chọn, TF: Đúng/Sai 4 ý a/b/c/d, SHORT: Trả lời ngắn, ESSAY: Tự luận).

Yêu cầu trả về đúng định dạng JSON chuẩn như sau:

Nếu dạng là MCQ:
{
  "questions": [
    {
      "section": "MCQ",
      "grade": "${grade}",
      "topic": "${topic}",
      "difficulty": "TH",
      "content": "Nội dung câu hỏi...",
      "options": [
        {"key": "A", "text": "Phương án A"},
        {"key": "B", "text": "Phương án B"},
        {"key": "C", "text": "Phương án C"},
        {"key": "D", "text": "Phương án D"}
      ],
      "correctOption": "A",
      "points": 0.25
    }
  ]
}

Nếu dạng là TF (Đúng/Sai):
{
  "questions": [
    {
      "section": "TF",
      "grade": "${grade}",
      "topic": "${topic}",
      "difficulty": "TH",
      "content": "Câu lệnh dẫn...",
      "subTfs": [
        {"id": "a", "content": "Ý a...", "key": true, "difficulty": "NB"},
        {"id": "b", "content": "Ý b...", "key": false, "difficulty": "TH"},
        {"id": "c", "content": "Ý c...", "key": true, "difficulty": "TH"},
        {"id": "d", "content": "Ý d...", "key": false, "difficulty": "VD"}
      ],
      "points": 1.0
    }
  ]
}

Nếu dạng là SHORT:
{
  "questions": [
    {
      "section": "SHORT",
      "grade": "${grade}",
      "topic": "${topic}",
      "difficulty": "VD",
      "content": "Nội dung câu hỏi...",
      "shortAnswer": "30",
      "tolerance": 0.1,
      "points": 0.5
    }
  ]
}

Nếu dạng là ESSAY:
{
  "questions": [
    {
      "section": "ESSAY",
      "grade": "${grade}",
      "topic": "${topic}",
      "difficulty": "VD",
      "content": "Nội dung câu hỏi tự luận...",
      "points": 2.0
    }
  ]
}
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi xử lý AI" },
      { status: 500 }
    );
  }
}
