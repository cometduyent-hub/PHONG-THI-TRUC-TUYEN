-- SUPABASE SCHEMA V1.1 - ĐẤU TRƯỜNG KHOA HỌC TỰ NHIÊN
-- Dùng cho phiên bản client-side hiện tại.
-- Lưu ý: V1 dùng anon key ở trình duyệt nên chưa phải mô hình chống gian lận tuyệt đối.

create extension if not exists pgcrypto;

create table if not exists public.exams (
  id text primary key,
  title text not null default 'Kiểm tra Khoa học tự nhiên',
  duration integer not null default 45 check (duration between 1 and 300),
  questions_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.student_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null references public.exams(id) on delete cascade,
  student_name text not null default '',
  student_class text not null default '',
  student_school text not null default '',
  auto_score numeric(8,2) not null default 0,
  essay_score numeric(8,2) not null default 0,
  final_score numeric(8,2) not null default 0,
  answers_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_student_submissions_exam_id
  on public.student_submissions(exam_id);

create index if not exists idx_student_submissions_submitted_at
  on public.student_submissions(submitted_at desc);

alter table public.exams enable row level security;
alter table public.student_submissions enable row level security;

-- Xóa policy cũ nếu chạy lại script.
drop policy if exists "v1_public_read_exams" on public.exams;
drop policy if exists "v1_public_insert_exams" on public.exams;
drop policy if exists "v1_public_read_submissions" on public.student_submissions;
drop policy if exists "v1_public_insert_submissions" on public.student_submissions;

-- V1: cho phép ứng dụng trình duyệt đọc đề theo mã và giáo viên xuất đề.
-- Đây là cấu hình đơn giản để deploy nhanh; V2 nên dùng Supabase Auth + RPC/Edge Function.
create policy "v1_public_read_exams"
on public.exams for select
to anon, authenticated
using (true);

create policy "v1_public_insert_exams"
on public.exams for insert
to anon, authenticated
with check (true);

create policy "v1_public_read_submissions"
on public.student_submissions for select
to anon, authenticated
using (true);

create policy "v1_public_insert_submissions"
on public.student_submissions for insert
to anon, authenticated
with check (true);
