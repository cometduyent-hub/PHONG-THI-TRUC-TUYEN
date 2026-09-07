"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setMsg("Chưa cấu hình Supabase. Hãy tạo .env.local từ .env.example.");
      return;
    }
    
    // Thực hiện đăng nhập với Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
    } else {
      router.push("/teacher"); // Hoặc trang đích sau khi đăng nhập thành công
    }
  }

  return (
    <main className="login">
      <div className="card login-card">
        <div className="brand">
          <div className="brandmark">⚡</div>
          KHTN SMART TEST
        </div>
        <h1>Đăng nhập giáo viên</h1>
        <p className="subtitle">Hệ thống phòng thi trực tuyến</p>

        {msg && <div className="error-msg" style={{ color: "red", marginBottom: "1rem" }}>{msg}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của thầy/cô"
              required
            />
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Đăng nhập
          </button>
        </form>
      </div>
    </main>
  );
}
