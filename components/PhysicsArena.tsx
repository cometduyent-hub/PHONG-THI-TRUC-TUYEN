"use client";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

type Section = "MCQ" | "TF" | "SHORT" | "ESSAY";
type Difficulty = "NB" | "TH" | "VD" | "VDC";

type SubTFItem = {
  id: string;
  content: string;
  key: boolean;
  difficulty: Difficulty;
};

type Question = {
  id: string;
  section: Section;
  subject: string;
  grade: string;
  topic: string;
  difficulty: Difficulty;
  content: string;
  videoUrl?: string;
  audioUrl?: string;
  imageUrl?: string;
  options?: { key: string; text: string }[];
  correctOption?: string;
  subTfs?: SubTFItem[];
  shortAnswer?: string;
  tolerance?: number;
  points: number;
};

type Matrix = {
  MCQ: Record<Difficulty, number>;
  TF: Record<Difficulty, number>;
  SHORT: Record<Difficulty, number>;
  ESSAY: Record<Difficulty, number>;
};

type Submission = {
  id?: string;
  exam_id: string;
  student_name: string;
  student_class: string;
  student_school: string;
  auto_score: number;
  essay_score?: number | null;
  final_score?: number | null;
  answers_data: Record<string, any>;
  submitted_at: string;
};

function scoreTF(userAns: Record<string, boolean> | undefined, subTfs: SubTFItem[] | undefined, totalPoint: number): number {
  if (!subTfs || !userAns) return 0;
  let wrongCount = 0;
  subTfs.forEach(sub => {
    const uVal = userAns[sub.id];
    if (uVal === undefined || uVal !== sub.key) {
      wrongCount++;
    }
  });
  let deduction = 0;
  if (wrongCount === 1) deduction = 0.50 * totalPoint;
  else if (wrongCount === 2) deduction = 0.75 * totalPoint;
  else if (wrongCount === 3) deduction = 0.90 * totalPoint;
  else if (wrongCount >= 4) deduction = totalPoint;
  return Math.max(0, totalPoint - deduction);
}

function getQuestionAutoScore(q: Question, answer: any): number {
  if (q.section === "MCQ") return answer === q.correctOption ? q.points : 0;
  if (q.section === "TF") return scoreTF(answer, q.subTfs, q.points);
  if (q.section === "SHORT") {
    if (answer === undefined || answer === null || String(answer).trim() === "") return 0;
    const n = Number(String(answer).trim().replace(",", "."));
    const key = Number(String(q.shortAnswer || "").trim().replace(",", "."));
    return Number.isFinite(n) && Number.isFinite(key) &&
      Math.abs(n - key) <= Number(q.tolerance || 0) ? q.points : 0;
  }
  return 0;
}

const seed: Question[] = [
  { 
    id: "KHTN001", 
    section: "MCQ", 
    subject: "Khoa học tự nhiên", 
    grade: "7", 
    topic: "Tốc độ chuyển động", 
    difficulty: "NB", 
    content: "Đại lượng cho biết mức độ nhanh hay chậm của chuyển động là:", 
    options: [{key:"A",text:"Khối lượng"},{key:"B",text:"Vận tốc"},{key:"C",text:"Lực"},{key:"D",text:"Áp suất"}], 
    correctOption: "B", 
    points: 0.25 
  },
  { 
    id: "KHTN002", 
    section: "TF", 
    subject: "Khoa học tự nhiên", 
    grade: "7", 
    topic: "Ánh sáng", 
    difficulty: "TH", 
    content: "Các nhận định về hiện tượng phản xạ ánh sáng:", 
    subTfs: [
      { id: "a", content: "Tia phản xạ nằm trong mặt phẳng chứa tia tới và pháp tuyến.", key: true, difficulty: "NB" },
      { id: "b", content: "Góc phản xạ luôn lớn hơn góc tới.", key: false, difficulty: "TH" },
      { id: "c", content: "Góc phản xạ bằng góc tới.", key: true, difficulty: "NB" },
      { id: "d", content: "Khi thay đổi góc tới thì góc phản xạ không đổi.", key: false, difficulty: "VD" }
    ], 
    points: 1.0 
  },
  { 
    id: "KHTN003", 
    section: "SHORT", 
    subject: "Khoa học tự nhiên", 
    grade: "7", 
    topic: "Âm thanh", 
    difficulty: "VD", 
    content: "Một nguồn âm dao động thực hiện 600 dao động trong 20 giây. Tần số dao động của nguồn âm là (Hz):", 
    shortAnswer: "30", 
    tolerance: 0.1, 
    points: 0.5 
  },
  { 
    id: "KHTN004", 
    section: "ESSAY", 
    subject: "Khoa học tự nhiên", 
    grade: "7", 
    topic: "Trao đổi chất", 
    difficulty: "VD", 
    content: "Viết phương trình hóa học minh họa cho phản ứng giữa axit HCl và kẽm Zn, giải thích hiện tượng?", 
    points: 2.0 
  }
];

const defaultMatrix: Matrix = {
  MCQ: { NB: 1, TH: 1, VD: 0, VDC: 0 },
  TF: { NB: 0, TH: 1, VD: 0, VDC: 0 },
  SHORT: { NB: 0, TH: 1, VD: 0, VDC: 0 },
  ESSAY: { NB: 0, TH: 0, VD: 1, VDC: 0 }
};

const sectionLabel: Record<Section, string> = { 
  MCQ: "Phần I: Trắc nghiệm nhiều lựa chọn", 
  TF: "Phần II: Trắc nghiệm đúng / sai", 
  SHORT: "Phần III: Trắc nghiệm trả lời ngắn", 
  ESSAY: "Phần IV: Tự luận" 
};

const diffLabel: Record<Difficulty, string> = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng", VDC: "Vận dụng cao" };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleExamSections(questionList: Question[]): Question[] {
  const mcq = questionList.filter(q => q.section === "MCQ");
  const tf = questionList.filter(q => q.section === "TF");
  const short = questionList.filter(q => q.section === "SHORT");
  const essay = questionList.filter(q => q.section === "ESSAY");
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  return [
    ...shuffleArray(mcq).map(q => q.options ? { ...q, options: shuffleArray(q.options) } : q),
    ...shuffleArray(tf),
    ...shuffleArray(short),
    ...shuffleArray(essay)
  ];
}

function parseRow(r: Record<string, any>): Question {
  const section = String(r.section || "MCQ").toUpperCase() as Section;
  const options = ["A", "B", "C", "D"].map(k => ({ key: k, text: String(r[`option${k}`] ?? r[`option_${k.toLowerCase()}`] ?? "") })).filter(x => x.text);
  
  const subTfs: SubTFItem[] = ["a", "b", "c", "d"].map((id) => ({
    id,
    content: String(r[`tf_content_${id}`] || `Nhận định ${id.toUpperCase()}`),
    key: String(r[`tf_key_${id}`]).toLowerCase() === "true" || r[`tf_key_${id}`] === 1 || r[`tf_key_${id}`] === "1",
    difficulty: (String(r[`tf_diff_${id}`] || "TH").toUpperCase() as Difficulty)
  }));

  return {
    id: String(r.id || crypto.randomUUID()),
    section,
    subject: String(r.subject || "Khoa học tự nhiên"),
    grade: String(r.grade || "7"),
    topic: String(r.topic || "Chủ đề mới"),
    difficulty: (String(r.difficulty || "TH").toUpperCase() as Difficulty),
    content: String(r.content || ""),
    videoUrl: String(r.videoUrl || "") || undefined,
    audioUrl: String(r.audioUrl || "") || undefined,
    imageUrl: String(r.imageUrl || "") || undefined,
    options: options.length ? options : (section === "MCQ" ? [{key:"A",text:"Đáp án A"},{key:"B",text:"Đáp án B"},{key:"C",text:"Đáp án C"},{key:"D",text:"Đáp án D"}] : undefined),
    correctOption: String(r.correctOption || "A"),
    subTfs: section === "TF" ? subTfs : undefined,
    shortAnswer: String(r.shortAnswer ?? "") || undefined,
    tolerance: Number(r.tolerance || 0),
    points: Number(r.points || (section === "MCQ" ? 0.25 : section === "TF" ? 1.0 : section === "SHORT" ? 0.5 : 2.0))
  };
}

export default function PhysicsArena() {
  const [mode, setMode] = useState<"teacher" | "student">("teacher");
  const [tab, setTab] = useState<"bank" | "matrix" | "exam" | "grading" | "stats">("bank");
  const [questions, setQuestions] = useState<Question[]>(seed);
  const [matrix, setMatrix] = useState<Matrix>(defaultMatrix);
  const [examMinutes, setExamMinutes] = useState<number>(45); 
  const [exam, setExam] = useState<Question[]>([]);
  const [examCodeId, setExamCodeId] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const answersRef = useRef<Record<string, any>>({});
  const examRef = useRef<Question[]>([]);
  const [submitted, setSubmitted] = useState(false);
  
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentSchool, setStudentSchool] = useState("");
  const [seconds, setSeconds] = useState(45 * 60);
  const [essayScores, setEssayScores] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");
  const [antiCheatWarnings, setAntiCheatWarnings] = useState(0);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [activeEssayQId, setActiveEssayQId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Tham chiếu textarea đang được chọn để chèn ký hiệu hóa học / toán học
  const essayTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const deadlineRef = useRef<number | null>(null);
  const submitExamRef = useRef<() => void>(() => undefined);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { examRef.current = exam; }, [exam]);

  useEffect(() => {
    if (mode === "student" && exam.length > 0 && !submitted && !deadlineRef.current) {
      const startSeconds = Math.max(1, seconds || examMinutes * 60);
      deadlineRef.current = Date.now() + startSeconds * 1000;
      setSeconds(startSeconds);
    }
  }, [mode, exam.length, submitted]);

  useEffect(() => {
    if (mode !== "student" || exam.length === 0 || submitted || !deadlineRef.current) return;
    const tick = () => {
      const remain = Math.max(0, Math.ceil((deadlineRef.current! - Date.now()) / 1000));
      setSeconds(remain);
      if (remain <= 0) submitExamRef.current();
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [mode, exam.length, submitted]);

  useEffect(() => {
    if (mode !== "student" || exam.length === 0 || submitted) return;
    const onVisibility = () => {
      if (document.hidden) {
        setAntiCheatWarnings(v => v + 1);
        setNotice("Cảnh báo: bạn vừa rời khỏi màn hình làm bài. Hệ thống đã ghi nhận.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mode, exam.length, submitted]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const examId = params.get("exam");
    if (examId) {
      setMode("student");
      setExamCodeId(examId);
      async function fetchExamFromCloud() {
        if (!supabase) {
          setNotice("Chưa cấu hình Supabase. Hãy kiểm tra biến môi trường trên Vercel.");
          return;
        }
        const { data, error } = await supabase.from("exams").select("questions_data, duration").eq("id", examId).single();
        if (error) {
          setNotice("Không tải được đề thi: " + error.message);
          return;
        }
        if (data?.questions_data) {
          const loadedExam = data.questions_data as Question[];
          const duration = Number(data.duration || 45);
          setExam(loadedExam);
          setExamMinutes(duration);
          deadlineRef.current = Date.now() + duration * 60 * 1000;
          setSeconds(duration * 60);
          setNotice(`Đã tải thành công đề thi (${examId}) cho học sinh.`);
        } else {
          setNotice("Không tìm thấy mã đề thi này hoặc link không hợp lệ.");
        }
      }
      fetchExamFromCloud();
    }
  }, []);

  const autoScore = useMemo(() => exam.reduce((sum, q) => sum + getQuestionAutoScore(q, answers[q.id]), 0), [exam, answers]);
  const essayTotalScore = Object.values(essayScores).reduce((a, b) => a + b, 0);
  const finalScore = autoScore + essayTotalScore;

  function generateExam() {
    const selected: Question[] = [];
    (Object.keys(matrix) as Section[]).forEach(sec => {
      (Object.keys(matrix[sec]) as Difficulty[]).forEach(d => {
        const n = matrix[sec][d];
        const pool = questions.filter(q => q.section === sec && q.difficulty === d);
        selected.push(...shuffle(pool).slice(0, n));
      });
    });
    const randomized = shuffleExamSections(selected);
    if (randomized.length === 0) {
      setNotice("Ma trận chưa chọn câu hỏi hoặc ngân hàng chưa có câu phù hợp.");
      return;
    }
    const requestedCount = (Object.keys(matrix) as Section[]).reduce(
      (sum, sec) => sum + (Object.keys(matrix[sec]) as Difficulty[]).reduce(
        (s, d) => s + matrix[sec][d], 0
      ), 0
    );
    setExam(randomized);
    setAnswers({});
    setSubmitted(false);
    setEssayScores({});
    deadlineRef.current = null;
    setSeconds(examMinutes * 60);
    setTab("exam");
    setNotice(
      randomized.length < requestedCount
        ? `Đã tạo ${randomized.length}/${requestedCount} câu. Ngân hàng chưa đủ câu theo ma trận.`
        : `Đã tạo đề ${randomized.length} câu thành công với thời gian ${examMinutes} phút.`
    );
  }

  async function handlePublishAndGetLink() {
    if (!supabase) {
      alert("Chưa cấu hình Supabase. Hãy thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trên Vercel.");
      return;
    }
    if (exam.length === 0) {
      alert("Chưa có đề thi nào được tạo! Thầy hãy bấm 'Tạo đề thi' trước.");
      return;
    }
    const examCode = "KHTN_" + crypto.randomUUID().split("-").join("").substring(0, 8).toUpperCase();
    setExamCodeId(examCode);
    const { error } = await supabase.from('exams').insert([{ 
      id: examCode, 
      title: "Kiểm tra Khoa học tự nhiên", 
      duration: examMinutes,
      questions_data: exam 
    }]);
    if (error) {
      alert("Lỗi khi lưu đề lên hệ thống: " + error.message);
    } else {
      const shareLink = `${window.location.origin}/?exam=${examCode}`;
      prompt("Đã xuất link thành công! Thầy hãy copy đường link sau gửi cho học sinh:", shareLink);
    }
  }

  function updateMatrix(sec: Section, d: Difficulty, value: number) {
    setMatrix(m => ({ ...m, [sec]: { ...m[sec], [d]: Math.max(0, Math.floor(value || 0)) } }));
  }

  function downloadExcelTemplate() {
    const templateData = [
      {
        id: "KHTN_MCQ_01",
        section: "MCQ",
        subject: "Khoa học tự nhiên",
        grade: "7",
        topic: "Tốc độ chuyển động",
        difficulty: "NB",
        content: "Đại lượng cho biết mức độ nhanh hay chậm của chuyển động là gì?",
        optionA: "Khối lượng",
        optionB: "Vận tốc",
        optionC: "Lực",
        optionD: "Áp suất",
        correctOption: "B",
        points: 0.25,
        shortAnswer: "",
        tolerance: 0,
        tf_content_a: "", tf_key_a: "", tf_diff_a: "",
        tf_content_b: "", tf_key_b: "", tf_diff_b: "",
        tf_content_c: "", tf_key_c: "", tf_diff_c: "",
        tf_content_d: "", tf_key_d: "", tf_diff_d: "",
        imageUrl: "", videoUrl: "", audioUrl: ""
      },
      {
        id: "KHTN_TF_01",
        section: "TF",
        subject: "Khoa học tự nhiên",
        grade: "7",
        topic: "Ánh sáng",
        difficulty: "TH",
        content: "Các nhận định về hiện tượng phản xạ ánh sáng:",
        optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "",
        points: 1.0, shortAnswer: "", tolerance: 0,
        tf_content_a: "Tia phản xạ nằm trong mặt phẳng chứa tia tới và pháp tuyến.", tf_key_a: "TRUE", tf_diff_a: "NB",
        tf_content_b: "Góc phản xạ luôn lớn hơn góc tới.", tf_key_b: "FALSE", tf_diff_b: "TH",
        tf_content_c: "Góc phản xạ bằng góc tới.", tf_key_c: "TRUE", tf_diff_c: "NB",
        tf_content_d: "Khi thay đổi góc tới thì góc phản xạ không đổi.", tf_key_d: "FALSE", tf_diff_d: "VD",
        imageUrl: "", videoUrl: "", audioUrl: ""
      },
      {
        id: "KHTN_SHORT_01",
        section: "SHORT",
        subject: "Khoa học tự nhiên",
        grade: "7",
        topic: "Âm thanh",
        difficulty: "VD",
        content: "Một nguồn âm dao động thực hiện 600 dao động trong 20 giây. Tần số dao động là (Hz):",
        optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "",
        points: 0.5, shortAnswer: "30", tolerance: 0.1,
        tf_content_a: "", tf_key_a: "", tf_diff_a: "",
        tf_content_b: "", tf_key_b: "", tf_diff_b: "",
        tf_content_c: "", tf_key_c: "", tf_diff_c: "",
        tf_content_d: "", tf_key_d: "", tf_diff_d: "",
        imageUrl: "", videoUrl: "", audioUrl: ""
      },
      {
        id: "KHTN_ESSAY_01",
        section: "ESSAY",
        subject: "Khoa học tự nhiên",
        grade: "7",
        topic: "Trao đổi chất",
        difficulty: "VD",
        content: "Giải thích vai trò của quá trình quang hợp đối với sự sống trên Trái Đất?",
        optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "",
        points: 2.0, shortAnswer: "", tolerance: 0,
        tf_content_a: "", tf_key_a: "", tf_diff_a: "",
        tf_content_b: "", tf_key_b: "", tf_diff_b: "",
        tf_content_c: "", tf_key_c: "", tf_diff_c: "",
        tf_content_d: "", tf_key_d: "", tf_diff_d: "",
        imageUrl: "", videoUrl: "", audioUrl: ""
      }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, "Mau_4_Dang_Cau_Hoi");
    XLSX.writeFile(wb, "File_Mau_Ngan_Hang_KHTN_Full.xlsx");
  }

  function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        let rows: Record<string, any>[] = [];
        if (file.name.endsWith(".json")) rows = JSON.parse(String(data));
        else {
          const wb = XLSX.read(data, { type: "array" });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }
        const parsed = rows.map(parseRow).filter(q => q.content);
        setQuestions(parsed);
        setNotice(`Đã cập nhật ${parsed.length} câu hỏi từ ${file.name}.`);
      } catch { 
        setNotice("Không đọc được file. Hãy kiểm tra định dạng mẫu."); 
      }
    };
    if (file.name.endsWith(".json")) reader.readAsText(file); else reader.readAsArrayBuffer(file);
  }

  function handleMediaUpload(qId: string, type: "imageUrl" | "videoUrl" | "audioUrl", file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, [type]: res } : q));
      setExam(prev => prev.map(q => q.id === qId ? { ...q, [type]: res } : q));
    };
    reader.readAsDataURL(file);
  }

  // Chèn ký hiệu / công thức hóa học vào textarea tự luận tại vị trí con trỏ
  function insertSymbolToEssay(qId: string, symbol: string) {
    const textarea = essayTextareaRefs.current[qId];
    const currentVal = answers[qId] || "";
    if (!textarea) {
      setAnswers(prev => ({ ...prev, [qId]: currentVal + symbol }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newVal = currentVal.substring(0, start) + symbol + currentVal.substring(end);
    setAnswers(prev => ({ ...prev, [qId]: newVal }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  }

  async function submitExam() {
    if (submitted) return;
    const currentAnswers = answersRef.current;
    const currentExam = examRef.current;
    const score = currentExam.reduce((sum, q) => sum + getQuestionAutoScore(q, currentAnswers[q.id]), 0);
    setSubmitted(true);
    setSeconds(0);
    setTab("grading");
    if (!supabase) {
      setNotice("Bài đã được chấm trên máy. Chưa lưu Cloud vì Supabase chưa được cấu hình.");
      return;
    }
    const { error } = await supabase.from("student_submissions").insert([{
      exam_id: examCodeId || "LOCAL_TEST",
      student_name: studentName.trim(),
      student_class: studentClass.trim(),
      student_school: studentSchool.trim(),
      auto_score: score,
      essay_score: 0,
      final_score: score,
      answers_data: currentAnswers,
      submitted_at: new Date().toISOString()
    }]);
    if (error) {
      console.error("Không thể lưu kết quả lên Cloud:", error.message);
      setNotice("Bài đã được chấm nhưng chưa lưu được lên Cloud: " + error.message);
      return;
    }
    setNotice("Bài đã được nộp, chấm tự động và lưu trên Supabase thành công!");
  }
  submitExamRef.current = submitExam;

  async function loadSubmissions() {
    if (!supabase || !examCodeId) {
      setNotice("Chưa có kết nối Supabase hoặc chưa có mã đề.");
      return;
    }
    const { data, error } = await supabase.from("student_submissions")
      .select("id, exam_id, student_name, student_class, student_school, auto_score, essay_score, final_score, answers_data, submitted_at")
      .eq("exam_id", examCodeId)
      .order("submitted_at", { ascending: false });
    if (error) { setNotice("Không tải được kết quả: " + error.message); return; }
    setSubmissions((data || []) as Submission[]);
  }

  function exportSubmissionsExcel() {
    if (!submissions.length) { setNotice("Chưa có kết quả để xuất Excel."); return; }
    const rows = submissions.map((s, i) => ({
      STT: i + 1, Họ_tên: s.student_name, Lớp: s.student_class, Trường: s.student_school,
      Điểm_tự_động: s.auto_score, Điểm_tự_luận: s.essay_score ?? 0, Tổng_điểm: s.final_score ?? s.auto_score,
      Thời_gian_nộp: s.submitted_at
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Kết quả");
    XLSX.writeFile(wb, `Ket_qua_${examCodeId || "KHTN"}.xlsx`);
  }

  return (
    <main className="app-shell" style={{ 
      fontFamily: "Inter, system-ui, Arial, sans-serif", 
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", 
      minHeight: "100vh", 
      paddingBottom: "40px",
      color: "#0f172a"
    }}>
      <header className="topbar" style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "16px 28px", background: "#ffffff", 
        borderBottom: "3px solid #0d9488", 
        boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.15)" 
      }}>
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span className="atom" style={{ fontSize: "32px", background: "#ccfbf1", padding: "8px 12px", borderRadius: "14px", border: "2px solid #2dd4bf" }}>🔬</span>
          <div>
            <h1 style={{ 
              fontSize: "22px", margin: 0, fontWeight: "900", color: "#0f766e",
              textShadow: "2px 2px 0px #99f6e4, 4px 4px 0px rgba(13,148,136,0.2)",
              letterSpacing: "0.5px"
            }}>
              ĐẤU TRƯỜNG KHOA HỌC TỰ NHIÊN
            </h1>
            <div style={{ fontSize: "12px", color: "#047857", fontWeight: "700", marginTop: "2px" }}>
              Hệ thống ôn tập & kiểm tra trực tuyến chuẩn cấp 2 (54 Tuệ Tĩnh, Phú Xuân, Huế)
            </div>
          </div>
        </div>
        <div className="top-actions" style={{ display: "flex", gap: "10px" }}>
          {mode === "teacher" ? (
            <button onClick={() => setMode("student")} style={{ padding: "8px 14px", background: "#f0fdf4", border: "1px solid #5eead4", borderRadius: "8px", cursor: "pointer", fontWeight: "700", color: "#0f766e" }}>🔓 Thoát quyền GV</button>
          ) : (
            <button onClick={() => {
              const pass = prompt("Nhập mật khẩu giáo viên:");
              if (pass === "123456") setMode("teacher");
              else if (pass !== null) alert("Sai mật khẩu!");
            }} style={{ padding: "8px 14px", background: "#f0fdf4", border: "1px solid #5eead4", borderRadius: "8px", cursor: "pointer", fontWeight: "700", color: "#0f766e" }}>🔒 Giáo viên</button>
          )}
          <button onClick={() => setMode("student")} style={{ padding: "8px 14px", background: mode === "student" ? "#0d9488" : "#f0fdf4", color: mode === "student" ? "#fff" : "#0f766e", border: "1px solid #5eead4", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>👨‍🎓 Học sinh</button>
        </div>
      </header>

      {notice && <div className="notice" style={{ background: "#f0fdf4", border: "1px solid #5eead4", padding: "12px 24px", margin: "20px 28px", borderRadius: "10px", color: "#115e59", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}><span>{notice}</span><button onClick={() => setNotice("")} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "16px", color: "#0f766e" }}>×</button></div>}

      {mode === "teacher" ? (
        <section className="workspace" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "24px", padding: "0 28px", marginTop: "24px" }}>
          <aside className="sidebar" style={{ background: "#ffffff", padding: "18px", borderRadius: "14px", border: "1px solid #cbd5e1", height: "fit-content", boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.05)" }}>
            <div className="side-title" style={{ fontSize: "11px", fontWeight: "700", color: "#0d9488", marginBottom: "12px", letterSpacing: "1px" }}>BẢNG ĐIỀU KHIỂN KHTN</div>
            {[
              ["bank", "📚", "Ngân hàng câu hỏi"],
              ["matrix", "🧩", "Ma trận & tạo đề"],
              ["exam", "📝", "Xem & Sửa đề"],
              ["grading", "✍️", "Chấm bài tự luận"],
              ["stats", "📊", "Thống kê phổ điểm"]
            ].map(([id, icon, label]) => (
              <button key={id} onClick={() => setTab(id as any)} style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: tab === id ? "#ccfbf1" : "transparent", color: tab === id ? "#115e59" : "#334155", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: tab === id ? "700" : "500", display: "flex", gap: "10px", marginBottom: "6px", transition: "all 0.2s" }}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </aside>
          
          <div className="content" style={{ background: "#ffffff", padding: "24px", borderRadius: "14px", border: "1px solid #cbd5e1", boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.05)" }}>
            {tab === "bank" && (
              <div>
                <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                  <div><h2 style={{ fontSize: "20px", margin: 0, color: "#0f766e" }}>Ngân hàng câu hỏi KHTN</h2><p style={{ color: "#64748b", margin: 0, fontSize: "13px" }}>Hỗ trợ đầy đủ 4 dạng: Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận kèm file mẫu chuẩn.</p></div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button onClick={downloadExcelTemplate} style={{ background: "#059669", color: "#fff", border: "none", padding: "10px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>📥 Tải file mẫu 4 dạng đề</button>
                    <label style={{ background: "#0d9488", color: "#fff", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}>📤 Nhập file Excel/JSON
                      <input hidden type="file" accept=".xlsx,.csv,.json" onChange={importFile} />
                    </label>
                    <button style={{ background: "#0284c7", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }} onClick={() => {
                      const newQ: Question = {
                        id: "KHTN_" + Date.now(),
                        section: "MCQ",
                        subject: "Khoa học tự nhiên",
                        grade: "7",
                        topic: "Chủ đề mới",
                        difficulty: "TH",
                        content: "Nội dung câu hỏi mới...",
                        options: [{ key: "A", text: "Đáp án A" }, { key: "B", text: "Đáp án B" }, { key: "C", text: "Đáp án C" }, { key: "D", text: "Đáp án D" }],
                        correctOption: "A",
                        points: 0.25
                      };
                      setQuestions(prev => [newQ, ...prev]);
                    }}>➕ Thêm câu mới</button>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", color: "#0f766e" }}>
                        <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>ID</th>
                        <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>Phần / Dạng</th>
                        <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>Nội dung</th>
                        <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>Điểm</th>
                        <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>Media</th>
                        <th style={{ padding: "10px", border: "1px solid #cbd5e1" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((q, index) => (
                        <tr key={q.id || index}>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1" }}><b>{q.id}</b></td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1" }}>{sectionLabel[q.section]}</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1" }}>{q.content}</td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1" }}><b>{q.points}đ</b></td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              {q.imageUrl && <span style={{ color: "#0284c7" }}>🖼️</span>}
                              {q.videoUrl && <span style={{ color: "#7c3aed" }}>🎥</span>}
                              {q.audioUrl && <span style={{ color: "#059669" }}>🔊</span>}
                              {!q.imageUrl && !q.videoUrl && !q.audioUrl && <span style={{ color: "#94a3b8" }}>-</span>}
                            </div>
                          </td>
                          <td style={{ padding: "10px", border: "1px solid #cbd5e1" }}>
                            <button style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" }} onClick={() => { if (confirm("Xóa câu này?")) setQuestions(prev => prev.filter((_, i) => i !== index)); }}>🗑️ Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "matrix" && (
              <div>
                <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                  <div><h2 style={{ fontSize: "20px", margin: 0, color: "#0f766e" }}>Ma trận & Tạo đề</h2><p style={{ color: "#64748b", margin: 0, fontSize: "13px" }}>Cấu hình số lượng câu hỏi, phân mức độ nhận thức và chọn thời gian bài thi.</p></div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f0fdf4", padding: "6px 12px", borderRadius: "8px", border: "1px solid #5eead4" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f766e" }}>⏱️ Thời gian:</span>
                      <select value={examMinutes} onChange={e => setExamMinutes(Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: "600" }}>
                        <option value={15}>15 phút</option>
                        <option value={30}>30 phút</option>
                        <option value={45}>45 phút</option>
                        <option value={60}>60 phút</option>
                        <option value={90}>90 phút</option>
                      </select>
                    </div>
                    <button onClick={generateExam} style={{ background: "#0d9488", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>Tạo đề thi</button>
                    <button onClick={handlePublishAndGetLink} style={{ background: "#0284c7", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>🔗 Xuất link gửi học sinh</button>
                  </div>
                </div>
                {(Object.keys(matrix) as Section[]).map(sec => (
                  <div key={sec} style={{ display: "grid", gridTemplateColumns: "220px repeat(4, 1fr)", gap: "12px", alignItems: "center", marginBottom: "12px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <strong style={{ color: "#0f766e", fontSize: "13px" }}>{sectionLabel[sec]}</strong>
                    {(["NB", "TH", "VD", "VDC"] as Difficulty[]).map(d => (
                      <div key={d} style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: "11px", color: "#0d9488", fontWeight: "600" }}>{diffLabel[d]}</label>
                        <input type="number" min="0" value={matrix[sec][d]} onChange={e => updateMatrix(sec, d, Number(e.target.value))} style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff" }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {tab === "exam" && (
              <div>
                <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div><h2 style={{ fontSize: "20px", margin: 0, color: "#0f766e" }}>Xem & Chỉnh sửa đề thi hiện tại</h2><p style={{ color: "#64748b", margin: 0, fontSize: "13px" }}>Quản lý thang điểm, nội dung, Media và cấu hình mức độ từng ý Đúng/Sai.</p></div>
                  <button onClick={generateExam} style={{ background: "#f0fdf4", border: "1px solid #5eead4", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#0f766e" }}>🔄 Tạo đề mới</button>
                </div>
                {exam.length === 0 ? <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Chưa có đề. Vui lòng vào Ma trận & tạo đề.</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {exam.map((q, i) => (
                      <div key={q.id} style={{ border: "1px solid #cbd5e1", padding: "16px", borderRadius: "10px", background: "#fdfefe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                          <span style={{ fontWeight: "700", color: "#0d9488" }}>Câu {i + 1} ({sectionLabel[q.section]})</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Thang điểm:</span>
                            <input 
                              type="number" 
                              step="0.25"
                              value={q.points} 
                              onChange={e => {
                                const p = Number(e.target.value);
                                setExam(prev => prev.map((item, idx) => idx === i ? { ...item, points: p } : item));
                              }}
                              style={{ width: "65px", padding: "4px", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: "700", color: "#0f766e" }} 
                            />
                          </div>
                        </div>
                        <input 
                          type="text" 
                          value={q.content} 
                          onChange={e => {
                            const val = e.target.value;
                            setExam(prev => prev.map((item, idx) => idx === i ? { ...item, content: val } : item));
                          }}
                          style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", marginBottom: "10px", fontWeight: "600" }} 
                        />
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "8px", background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: "700", color: "#0284c7", display: "block", marginBottom: "4px" }}>🖼️ Tải Ảnh lên:</label>
                            <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleMediaUpload(q.id, "imageUrl", e.target.files[0]); }} style={{ fontSize: "11px", width: "100%" }} />
                            {q.imageUrl && <span style={{ fontSize: "10px", color: "#059669", display: "block", marginTop: "2px" }}>✓ Đã có ảnh</span>}
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: "700", color: "#7c3aed", display: "block", marginBottom: "4px" }}>🎥 Tải Video lên:</label>
                            <input type="file" accept="video/*" onChange={e => { if (e.target.files?.[0]) handleMediaUpload(q.id, "videoUrl", e.target.files[0]); }} style={{ fontSize: "11px", width: "100%" }} />
                            {q.videoUrl && <span style={{ fontSize: "10px", color: "#059669", display: "block", marginTop: "2px" }}>✓ Đã có video</span>}
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", fontWeight: "700", color: "#059669", display: "block", marginBottom: "4px" }}>🔊 Tải Ghi âm lên:</label>
                            <input type="file" accept="audio/*" onChange={e => { if (e.target.files?.[0]) handleMediaUpload(q.id, "audioUrl", e.target.files[0]); }} style={{ fontSize: "11px", width: "100%" }} />
                            {q.audioUrl && <span style={{ fontSize: "10px", color: "#059669", display: "block", marginTop: "2px" }}>✓ Đã có audio</span>}
                          </div>
                        </div>

                        {q.section === "SHORT" && (
                          <div style={{ marginTop: "10px", background: "#f8fafc", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", display: "flex", gap: "10px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f766e" }}>Đáp án chuẩn:</span>
                            <input 
                              type="text" 
                              value={q.shortAnswer || ""} 
                              onChange={e => {
                                const val = e.target.value;
                                setExam(prev => prev.map((item, idx) => idx === i ? { ...item, shortAnswer: val } : item));
                              }}
                              style={{ padding: "6px 10px", fontSize: "13px", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: "600" }} 
                            />
                          </div>
                        )}

                        {q.section === "TF" && q.subTfs && (
                          <div style={{ marginTop: "12px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f766e", marginBottom: "8px" }}>Cấu hình 4 ý (a, b, c, d) & Mức độ nhận thức:</div>
                            {q.subTfs.map((sub, sIdx) => (
                              <div key={sub.id} style={{ display: "grid", gridTemplateColumns: "30px 1fr 130px 90px", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                                <b style={{ color: "#0284c7" }}>{sub.id.toUpperCase()}.</b>
                                <input 
                                  type="text" 
                                  value={sub.content} 
                                  onChange={e => {
                                    const val = e.target.value;
                                    setExam(prev => prev.map((item, idx) => idx === i ? {
                                      ...item,
                                      subTfs: item.subTfs?.map((s, sI) => sI === sIdx ? { ...s, content: val } : s)
                                    } : item));
                                  }}
                                  style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                />
                                <select 
                                  value={sub.difficulty}
                                  onChange={e => {
                                    const val = e.target.value as Difficulty;
                                    setExam(prev => prev.map((item, idx) => idx === i ? {
                                      ...item,
                                      subTfs: item.subTfs?.map((s, sI) => sI === sIdx ? { ...s, difficulty: val } : s)
                                    } : item));
                                  }}
                                  style={{ padding: "6px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: "600", color: "#0f766e" }}
                                >
                                  <option value="NB">Nhận biết</option>
                                  <option value="TH">Thông hiểu</option>
                                  <option value="VD">Vận dụng</option>
                                  <option value="VDC">Vận dụng cao</option>
                                </select>
                                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "600" }}>
                                  <input 
                                    type="checkbox" 
                                    checked={sub.key} 
                                    onChange={e => {
                                      const val = e.target.checked;
                                      setExam(prev => prev.map((item, idx) => idx === i ? {
                                        ...item,
                                        subTfs: item.subTfs?.map((s, sI) => sI === sIdx ? { ...s, key: val } : s)
                                      } : item));
                                    }}
                                  /> Đúng
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "grading" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div><h2 style={{ fontSize: "20px", color: "#0f766e", marginBottom: "6px" }}>Chấm bài & Kết quả</h2>
                  <p style={{ color: "#64748b", fontSize: "13px" }}>Tải kết quả từ Supabase, chấm tự luận và xuất Excel.</p></div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={loadSubmissions} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #5eead4", background: "#f0fdf4", cursor: "pointer" }}>🔄 Tải kết quả</button>
                    <button onClick={exportSubmissionsExcel} style={{ padding: "9px 12px", borderRadius: 8, border: "none", background: "#0284c7", color: "#fff", cursor: "pointer" }}>📊 Xuất Excel</button>
                  </div>
                </div>
                <div style={{ marginTop: 18, background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  <b>Đề hiện tại: {examCodeId || "chưa xuất mã"}</b> · Điểm tự động của bài đang xem: <b>{autoScore.toFixed(2)}</b>
                </div>
                {submissions.length > 0 && <div style={{ overflowX: "auto", marginTop: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ background: "#f8fafc" }}>{["STT","Họ tên","Lớp","Điểm tự động","Tự luận","Tổng","Nộp lúc"].map(h => <th key={h} style={{ padding: 9, border: "1px solid #cbd5e1", textAlign: "left" }}>{h}</th>)}</tr></thead>
                    <tbody>{submissions.map((s,i)=><tr key={s.id || i}>
                      <td style={{ padding: 9, border: "1px solid #cbd5e1" }}>{i+1}</td><td style={{ padding: 9, border: "1px solid #cbd5e1" }}>{s.student_name}</td><td style={{ padding: 9, border: "1px solid #cbd5e1" }}>{s.student_class}</td>
                      <td style={{ padding: 9, border: "1px solid #cbd5e1" }}>{Number(s.auto_score || 0).toFixed(2)}</td><td style={{ padding: 9, border: "1px solid #cbd5e1" }}>{Number(s.essay_score || 0).toFixed(2)}</td>
                      <td style={{ padding: 9, border: "1px solid #cbd5e1", fontWeight: 800 }}>{Number(s.final_score ?? s.auto_score ?? 0).toFixed(2)}</td><td style={{ padding: 9, border: "1px solid #cbd5e1" }}>{new Date(s.submitted_at).toLocaleString("vi-VN")}</td>
                    </tr>)}</tbody>
                  </table>
                </div>}
              </div>
            )}

            {tab === "stats" && (
              <div>
                <h2 style={{ fontSize: "20px", color: "#0f766e", marginBottom: "10px" }}>Thống kê phổ điểm</h2>
                <p style={{ color: "#64748b", fontSize: "13px" }}>Phân tích kết quả làm bài của toàn bộ học sinh.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section style={{ maxWidth: "900px", margin: "24px auto", background: "#fff", padding: "30px", borderRadius: "14px", border: "1px solid #cbd5e1", boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)" }}>
          {!submitted ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0d9488", paddingBottom: "15px", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: 0, color: "#0f766e", fontSize: "20px" }}>Bài kiểm tra Khoa học tự nhiên</h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>Điền thông tin và hoàn thành đầy đủ các phần câu hỏi bên dưới.</p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button onClick={() => setShowDrawingModal(true)} style={{ background: "#0284c7", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "13px" }}>✏️ Bảng vẽ hình / Nháp</button>
                  <div style={{ background: "#ccfbf1", color: "#115e59", padding: "8px 14px", borderRadius: "8px", fontWeight: "700", border: "1px solid #2dd4bf" }}>
                    ⏱️ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                <input type="text" placeholder="Họ và tên học sinh" value={studentName} onChange={e => setStudentName(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
                <input type="text" placeholder="Lớp (Ví dụ: 7A)" value={studentClass} onChange={e => setStudentClass(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
                <input type="text" placeholder="Trường học" value={studentSchool} onChange={e => setStudentSchool(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>

              {exam.length > 0 && (
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f766e", marginBottom: "8px" }}>Danh sách câu hỏi (Xanh: Đã làm · Trắng: Chưa làm):</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {exam.map((q, qIdx) => {
                      const hasAns = answers[q.id] !== undefined && answers[q.id] !== "" && (typeof answers[q.id] !== "object" || Object.keys(answers[q.id]).length > 0);
                      return (
                        <a 
                          key={q.id} 
                          href={`#question_${qIdx}`}
                          style={{ 
                            width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", 
                            borderRadius: "6px", textDecoration: "none", fontSize: "12px", fontWeight: "700",
                            background: hasAns ? "#10b981" : "#ffffff", 
                            color: hasAns ? "#ffffff" : "#334155", 
                            border: hasAns ? "1px solid #059669" : "1px solid #cbd5e1"
                          }}
                        >
                          {qIdx + 1}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MODAL VẼ HÌNH / BẢNG NHÁP */}
              {showDrawingModal && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", width: "520px", maxWidth: "95%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong>Bảng vẽ hình / Sơ đồ tư duy</strong>
                      <button onClick={() => setShowDrawingModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
                    </div>
                    <canvas 
                      ref={canvasRef}
                      width={480}
                      height={280}
                      style={{ border: "1px solid #cbd5e1", background: "#fdfefe", borderRadius: "6px", cursor: "crosshair", width: "100%" }}
                      onMouseDown={(e) => {
                        setIsDrawing(true);
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        const rect = canvas.getBoundingClientRect();
                        ctx.beginPath();
                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                      }}
                      onMouseMove={(e) => {
                        if (!isDrawing) return;
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        const rect = canvas.getBoundingClientRect();
                        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                        ctx.strokeStyle = "#0f766e";
                        ctx.lineWidth = 2;
                        ctx.stroke();
                      }}
                      onMouseUp={() => setIsDrawing(false)}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                      <button onClick={() => {
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                      }} style={{ padding: "6px 12px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Xóa bảng</button>
                      <button onClick={() => {
                        const canvas = canvasRef.current;
                        if (!canvas || !activeEssayQId) {
                          setShowDrawingModal(false);
                          return;
                        }
                        const dataUrl = canvas.toDataURL("image/png");
                        setAnswers(prev => ({ ...prev, [activeEssayQId]: (prev[activeEssayQId] || "") + ` [Đã đính kèm hình vẽ nháp]` }));
                        setShowDrawingModal(false);
                      }} style={{ padding: "6px 14px", background: "#0d9488", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Đưa hình vào bài tự luận</button>
                    </div>
                  </div>
                </div>
              )}

              {exam.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Chưa có đề thi nào được tải. Vui lòng kiểm tra lại đường link hoặc yêu cầu giáo viên cung cấp đề.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {exam.map((q, qIdx) => (
                    <div key={q.id} id={`question_${qIdx}`} style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontWeight: "700", color: "#0f766e" }}>Câu {qIdx + 1} ({sectionLabel[q.section]})</span>
                        <span style={{ fontSize: "11px", background: "#ccfbf1", color: "#0f766e", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>({q.points} điểm)</span>
                      </div>
                      <div style={{ fontWeight: "600", color: "#334155", marginBottom: "8px" }}>{q.content}</div>
                      
                      {q.imageUrl && <img src={q.imageUrl} alt="minh họa" style={{ maxWidth: "100%", maxHeight: "220px", borderRadius: "6px", marginBottom: "10px" }} />}
                      {q.videoUrl && <video src={q.videoUrl} controls style={{ width: "100%", maxHeight: "240px", borderRadius: "6px", marginBottom: "10px" }} />}
                      {q.audioUrl && <audio src={q.audioUrl} controls style={{ width: "100%", marginBottom: "10px" }} />}

                      {q.section === "MCQ" && q.options && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {q.options.map(opt => (
                            <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                              <input 
                                type="radio" 
                                name={`q_${q.id}`} 
                                checked={answers[q.id] === opt.key} 
                                onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))} 
                              />
                              <b>{opt.key}.</b> {opt.text}
                            </label>
                          ))}
                        </div>
                      )}

                      {q.section === "TF" && q.subTfs && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {q.subTfs.map(sub => (
                            <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", flexWrap: "wrap", gap: "8px" }}>
                              <span style={{ fontSize: "13px" }}><b>{sub.id.toUpperCase()}.</b> {sub.content}</span>
                              <div style={{ display: "flex", gap: "12px" }}>
                                <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <input 
                                    type="radio" 
                                    name={`tf_${q.id}_${sub.id}`} 
                                    checked={answers[q.id]?.[sub.id] === true}
                                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: { ...(prev[q.id] || {}), [sub.id]: true } }))}
                                  /> Đúng
                                </label>
                                <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <input 
                                    type="radio" 
                                    name={`tf_${q.id}_${sub.id}`} 
                                    checked={answers[q.id]?.[sub.id] === false}
                                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: { ...(prev[q.id] || {}), [sub.id]: false } }))}
                                  /> Sai
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.section === "SHORT" && (
                        <div style={{ marginTop: "8px" }}>
                          <input 
                            type="text" 
                            placeholder="Nhập kết quả trả lời ngắn của bạn..."
                            value={answers[q.id] || ""}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600", background: "#fff" }}
                          />
                        </div>
                      )}

                      {/* TỰ LUẬN: ĐỦ TÍNH NĂNG CŨ (TẢI FILE, CHỤP ẢNH) + BỘ CÔNG THỨC HÓA HỌC / KÝ HIỆU TOÁN HỌC & VẼ HÌNH */}
                      {q.section === "ESSAY" && (
                        <div style={{ marginTop: "8px" }}>
                          {/* THANH CÔNG CỤ CHÈN CÔNG THỨC HÓA HỌC & KÝ HIỆU TOÁN HỌC */}
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "6px", background: "#edf2f7", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569", alignSelf: "center", marginRight: "4px" }}>Chèn ký hiệu:</span>
                            {[
                              ["²", "𝑥²"], ["³", "𝑥³"], ["₁", "ₓ₁"], ["₂", "ₓ₂"], 
                              ["₊", "+"], ["₋", "-"], ["→", "→"], ["⇄", "⇄"], 
                              ["Δ", "Δ"], ["°C", "°C"], ["≤", "≤"], ["≥", "≥"], 
                              ["·", "·"], [" / ", " / "]
                            ].map(([symbol, label]) => (
                              <button 
                                key={symbol}
                                type="button"
                                onClick={() => insertSymbolToEssay(q.id, symbol)}
                                style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "2px 8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", color: "#0f766e" }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          <textarea 
                            ref={el => { essayTextareaRefs.current[q.id] = el; }}
                            rows={4}
                            placeholder="Trình bày bài làm tự luận chi tiết của bạn vào đây..."
                            value={answers[q.id] || ""}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", background: "#fff" }}
                          />

                          <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                            <label style={{ background: "#f0fdf4", border: "1px solid #5eead4", color: "#0f766e", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                              📁 Tải file bài làm lên
                              <input type="file" hidden onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setAnswers(prev => ({ ...prev, [q.id]: (prev[q.id] || "") + ` [Đã đính kèm file: ${f.name}]` }));
                                }
                              }} />
                            </label>
                            <label style={{ background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                              📷 Chụp ảnh bài làm từ điện thoại
                              <input type="file" accept="image/*" capture="environment" hidden onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setAnswers(prev => ({ ...prev, [q.id]: (prev[q.id] || "") + ` [Đã chụp ảnh bài làm: ${f.name}]` }));
                                }
                              }} />
                            </label>
                            <button 
                              type="button" 
                              onClick={() => {
                                setActiveEssayQId(q.id);
                                setShowDrawingModal(true);
                              }}
                              style={{ background: "#faf5ff", border: "1px solid #d8b4fe", color: "#7e22ce", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                            >
                              ✏️ Vẽ hình / Sơ đồ bài làm
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <button onClick={submitExam} style={{ background: "#0d9488", color: "#fff", border: "none", padding: "12px 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", fontSize: "15px", marginTop: "10px" }}>
                    Nộp bài thi
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "10px 0" }}>
              <div style={{ textAlign: "center", padding: "10px 10px 22px" }}>
                <h2 style={{ color: "#0f766e", marginBottom: "6px" }}>🎉 Hoàn thành bài thi!</h2>
                <p style={{ color: "#64748b", marginTop: 0 }}>Học sinh có thể xem lại điểm số và toàn bộ bài làm của mình dưới đây.</p>
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginTop: "14px" }}>
                  <div style={{ background: "#f0fdf4", border: "1px solid #5eead4", padding: "14px 20px", borderRadius: "10px", minWidth: "190px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>ĐIỂM TRẮC NGHIỆM</div>
                    <strong style={{ fontSize: "24px", color: "#0f766e" }}>{autoScore.toFixed(2)}</strong>
                  </div>
                  <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", padding: "14px 20px", borderRadius: "10px", minWidth: "190px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>TỔNG ĐIỂM HIỆN TẠI</div>
                    <strong style={{ fontSize: "24px", color: "#1d4ed8" }}>{finalScore.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
