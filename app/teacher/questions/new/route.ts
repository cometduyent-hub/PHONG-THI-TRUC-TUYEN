import { NextResponse } from 'next/server';

// Khai báo kiểu dữ liệu cho Body gửi lên từ Frontend
interface RequestBody {
  topic: string;
  grade: string;
  count: number;
  difficulty: string;
}

export async function POST(req: Request) {
  try {
    // 1. Nhận dữ liệu gửi từ Frontend
    const body: RequestBody = await req.json();
    const { topic, grade, count, difficulty } = body;

    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!topic || !count) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin chủ đề hoặc số lượng câu hỏi.' },
        { status: 400 }
      );
    }

    // 2. Xây dựng Prompt chuẩn hóa đầu ra dạng JSON
    const systemPrompt = `Bạn là một chuyên gia soạn đề thi trắc nghiệm giáo dục. 
Hãy tạo đúng ${count} câu hỏi trắc nghiệm thuộc môn học/chủ đề "${topic}", dành cho học sinh lớp ${grade}, với mức độ tư duy: "${difficulty}".

Yêu cầu về cấu trúc đầu ra:
- BẮT BUỘC trả về một mảng JSON thuần túy (Mô hình: Array of Objects).
- KHÔNG thêm bất kỳ văn bản giải thích nào ngoài chuỗi JSON.
- KHÔNG bọc JSON trong các thẻ markdown dạng \`\`\`json.

Mỗi đối tượng câu hỏi phải có chính xác các trường sau:
{
  "content": "Nội dung câu hỏi?",
  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  "correctAnswer": 0, // Chỉ số của đáp án đúng trong mảng options (0 = A, 1 = B, 2 = C, 3 = D)
  "explanation": "Lời giải chi tiết ngắn gọn giải thích tại sao chọn đáp án đó"
}`;

    // 3. Gọi API của Gemini (Sử dụng fetch trực tiếp REST API)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Chưa cấu hình GEMINI_API_KEY trên Server.' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: systemPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7, // Độ sáng tạo vừa phải
            responseMimeType: "application/json", // Tùy chọn bắt buộc Gemini trả về JSON
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Lỗi từ Gemini API:', errorData);
      throw new Error('Không thể kết nối đến dịch vụ AI');
    }

    const data = await response.json();

    // 4. Trích xuất văn bản phản hồi từ AI
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Dữ liệu AI trả về bị rỗng');
    }

    // 5. Làm sạch chuỗi văn bản và Parse về JSON
    const cleanJsonString = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const questions = JSON.parse(cleanJsonString);

    // 6. Trả kết quả thành công về cho Frontend
    return NextResponse.json({
      success: true,
      data: questions,
    });

  } catch (error: any) {
    console.error('API Generate Questions Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Đã xảy ra lỗi trong quá trình tạo câu hỏi từ AI.',
      },
      { status: 500 }
    );
  }
}
