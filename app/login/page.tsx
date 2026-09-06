"use client";
import {FormEvent,useState} from "react";
import {createClient} from "@/lib/supabase";
import {useRouter} from "next/navigation";

export default function Login(){const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [msg,setMsg]=useState("");const router=useRouter();
 async function submit(e:FormEvent){e.preventDefault();const sb=createClient();if(!sb){setMsg("Chưa cấu hình Supabase. Hãy tạo .env.local từ .env.example.");return;}const {error}=await sb.auth.signInWithPassword({email,password});if(error){setMsg(error.message);return;}router.push("/teacher");}
 return <main className="login"><div className="card login-card"><div className="brand"><div className="brandmark">🧪</div>KHTN SMART TEST</div><h1>Đăng nhập giáo viên</h1><p className="muted">Kết nối Supabase để quản lý ngân hàng và kỳ thi.</p><form className="form" onSubmit={submit}><div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div><div><label className="label">Mật khẩu</label><input className="input" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></div>{msg&&<div className="notice">{msg}</div>}<button className="btn btn-primary" type="submit">Đăng nhập</button></form></div></main>}
