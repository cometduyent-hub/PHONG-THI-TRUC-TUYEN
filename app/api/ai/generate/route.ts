import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonFromModel(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error("AI trả về nội dung không phải JSON hợp lệ. Hãy thử lại hoặc rút ngắn tài liệu.");
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY trong Environment Variables của Vercel." }, { status: 500 });

    const form = await req.formData();
    const mode = String(form.get("mode") || "question");
    const topic = String(form.get("topic") || "Khoa học tự nhiên");
    const grade = String(form.get("grade") || "6");
    const section = String(form.get("section") || "MCQ").toUpperCase();
    const count = Math.min(40, Math.max(1, Number(form.get("count") || 3)));
    const documentText = String(form.get("documentText") || "");
    const matrix = safeJson(String(form.get("matrix") || "{}"));
    const matrixRows = safeJson(String(form.get("matrixRows") || "[]"));
    const file = form.get("file");
    const parts: any[] = [];
    if (documentText.trim()) parts.push({ text: "TÀI LIỆU THAM KHẢO DO GIÁO VIÊN CUNG CẤP:\n" + documentText.slice(0, 50000) });
    if (file instanceof File && file.size > 0) {
      if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Tệp tài liệu tối đa 15 MB." }, { status: 413 });
      const mime = file.type || "application/octet-stream";
      if (!["application/pdf","image/png","image/jpeg","image/webp"].includes(mime)) {
        return NextResponse.json({ error: "AI hiện nhận PDF hoặc ảnh PNG/JPG/WEBP. Với DOCX, hãy sao chép nội dung vào ô tài liệu tham khảo." }, { status: 415 });
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      parts.push({ inlineData: { mimeType: mime, data: bytes.toString("base64") } });
    }

    let instruction = "";
    if (mode === "exam") {
      const rows = Array.isArray(matrixRows) ? matrixRows : [];
      const countByCell: Record<string, number> = {};
      if (rows.length) {
        for (const row of rows) for (const sec of ["MCQ","TF","SHORT","ESSAY"]) for (const d of ["NB","TH","VD"]) {
          const n = Math.max(0, Math.floor(Number(row?.counts?.[sec]?.[d] || 0)));
          if (n) countByCell[`${sec}-${d}`] = (countByCell[`${sec}-${d}`] || 0) + n;
        }
      } else {
        for (const sec of ["MCQ","TF","SHORT","ESSAY"]) for (const d of ["NB","TH","VD","VDC"]) {
          const n = Math.max(0, Math.floor(Number(matrix?.[sec]?.[d] || 0)));
          if (n) countByCell[`${sec}-${d}`] = (countByCell[`${sec}-${d}`] || 0) + n;
        }
      }
      const rawCellTotal = Object.values(countByCell).reduce((a,n)=>a+n,0);
      const tfItems = rows.reduce((sum: number, row: any) => sum + (["NB","TH","VD"] as const).reduce((n,d)=>n+Math.max(0,Math.floor(Number(row?.counts?.TF?.[d]||0))),0),0);
      const nonTfItems = rawCellTotal - tfItems;
      const tfQuestionCount = rows.length
        ? Object.values(rows.reduce((groups: Record<string, number>, row: any) => {
            const chapter = String(row?.chapter || row?.id || "Chủ đề chung");
            const n = (["NB","TH","VD"] as const).reduce((subtotal,d)=>subtotal+Math.max(0,Math.floor(Number(row?.counts?.TF?.[d]||0))),0);
            groups[chapter] = (groups[chapter] || 0) + n;
            return groups;
          }, {})).reduce((sum: number, n: any) => sum + Math.ceil(Number(n)/4), 0)
        : Math.ceil(tfItems / 4);
      const requested = rows.length ? nonTfItems + tfQuestionCount : rawCellTotal;
      if (!requested) return NextResponse.json({ error: "Ma trận chưa có số lượng câu hỏi." }, { status: 400 });
      if (requested > 40) return NextResponse.json({ error: "Mỗi lần tạo tối đa 40 câu hỏi." }, { status: 400 });
      instruction = `Tạo đúng ${requested} đối tượng câu hỏi cho đề kiểm tra KHTN lớp ${grade}, chủ đề ${topic}. Phân bổ số lượng ô theo ma trận: ${JSON.stringify(countByCell)}.
Với ma trận theo chương/bài, các số ở cột Đúng-Sai là số ý nhận định (mỗi ý 0,25 điểm), KHÔNG phải số câu Đúng-Sai hoàn chỉnh. Gom các ý theo chương thành câu Đúng-Sai có tối đa 4 ý a/b/c/d; giữ nguyên tổng số ý theo từng mức độ NB/TH/VD trong từng chương khi có thể. Mỗi câu Đúng-Sai có points tổng bằng số ý × 0,25.
Nếu có ma trận theo chương/bài bên dưới, câu hỏi phải bám đúng từng dòng và phân bổ đúng số lượng ở từng ô; không được tự ý thay đổi loại câu hoặc mức độ.
Ma trận chương/bài: ${JSON.stringify(rows)}.
Mỗi câu gồm section (MCQ/TF/SHORT/ESSAY), grade, topic, difficulty (NB/TH/VD/VDC), content, points. MCQ phải có options gồm đủ A-D và correctOption. TF phải có subTfs gồm a,b,c,d (ý cuối có thể bỏ nếu ít hơn 4), mỗi ý có content,key,difficulty. SHORT phải có shortAnswer và tolerance. ESSAY phải có nội dung, points; điểm của câu tự luận phải bám pointValues trong từng dòng ma trận.
Điểm mặc định: MCQ 0.25; mỗi ý TF 0.25; SHORT 0.5; ESSAY theo ma trận. Chỉ dùng kiến thức phù hợp chương trình lớp ${grade}. Trả về JSON thuần: {"questions":[...]}.`;
    } else {
      instruction = `Bạn là chuyên gia biên soạn câu hỏi Khoa học tự nhiên THCS. Tạo đúng ${count} câu cho lớp ${grade}, chủ đề ${topic}, loại ${section}. MCQ có 4 lựa chọn A-D và correctOption; TF có 4 ý a-d với key boolean; SHORT có shortAnswer; ESSAY có nội dung và điểm. Mỗi câu phải có section,grade,topic,difficulty (NB/TH/VD/VDC),content,points. Trả về JSON thuần dạng {"questions":[...]}.`;
    }
    parts.push({ text: instruction + "\nChỉ trả về JSON hợp lệ, không dùng Markdown." });
    const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" }
    });
    const result = await model.generateContent(parts);
    const data = jsonFromModel(result.response.text() || "");
    if (!Array.isArray(data.questions)) throw new Error("Phản hồi AI thiếu danh sách questions.");
    return NextResponse.json({ questions: data.questions });
  } catch (err: any) {
    console.error("AI generation failed:", err);
    const message = String(err?.message || "Không thể tạo câu hỏi bằng AI.");
    const status = /404|not found|model/i.test(message) ? 502 : 500;
    return NextResponse.json({ error: message.includes("API key") ? "GEMINI_API_KEY không hợp lệ hoặc chưa được cấp quyền Gemini API." : message }, { status });
  }
}
function safeJson(s: string): any { try { return JSON.parse(s); } catch { return {}; } }
