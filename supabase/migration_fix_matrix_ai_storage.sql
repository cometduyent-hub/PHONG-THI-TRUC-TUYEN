-- Migration: repair legacy exam/submission persistence for PhysicsArena
-- Run in Supabase SQL Editor after backing up the project.
create table if not exists public.exams (
  id text primary key,
  title text not null default 'Kiểm tra Khoa học tự nhiên',
  duration integer not null default 45,
  questions_data jsonb not null default '[]'::jsonb,
  topic text,
  created_at timestamptz not null default now()
);
create table if not exists public.student_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null references public.exams(id) on delete cascade,
  student_name text not null default '',
  student_class text not null default '',
  student_school text not null default '',
  grade text,
  exit_count integer not null default 0,
  attachments_data jsonb not null default '{}'::jsonb,
  essay_grading jsonb not null default '{}'::jsonb,
  auto_score numeric(8,2) not null default 0,
  essay_score numeric(8,2) not null default 0,
  final_score numeric(8,2) not null default 0,
  answers_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);
alter table public.exams
  add column if not exists topic text,
  add column if not exists matrix_data jsonb not null default '[]'::jsonb,
  add column if not exists title text not null default 'Kiểm tra Khoa học tự nhiên',
  add column if not exists duration integer not null default 45,
  add column if not exists questions_data jsonb not null default '[]'::jsonb;

alter table public.student_submissions
  add column if not exists grade text,
  add column if not exists exit_count integer not null default 0,
  add column if not exists attachments_data jsonb not null default '{}'::jsonb,
  add column if not exists essay_grading jsonb not null default '{}'::jsonb,
  add column if not exists essay_score numeric(8,2) not null default 0,
  add column if not exists final_score numeric(8,2) not null default 0,
  add column if not exists answers_data jsonb not null default '{}'::jsonb,
  add column if not exists auto_score numeric(8,2) not null default 0,
  add column if not exists student_name text not null default '',
  add column if not exists student_class text not null default '',
  add column if not exists student_school text not null default '',
  add column if not exists submitted_at timestamptz not null default now();

create index if not exists idx_student_submissions_exam_id
  on public.student_submissions(exam_id);
create index if not exists idx_student_submissions_submitted_at
  on public.student_submissions(submitted_at desc);

alter table public.exams enable row level security;
alter table public.student_submissions enable row level security;

drop policy if exists "v1_public_read_exams" on public.exams;
drop policy if exists "v1_public_insert_exams" on public.exams;
drop policy if exists "v1_public_read_submissions" on public.student_submissions;
drop policy if exists "v1_public_insert_submissions" on public.student_submissions;

create policy "v1_public_read_exams" on public.exams
  for select to anon, authenticated using (true);
create policy "v1_public_insert_exams" on public.exams
  for insert to anon, authenticated with check (true);
create policy "v1_public_update_exams" on public.exams
  for update to anon, authenticated using (true) with check (true);
create policy "v1_public_read_submissions" on public.student_submissions
  for select to anon, authenticated using (true);
create policy "v1_public_insert_submissions" on public.student_submissions
  for insert to anon, authenticated with check (true);
create policy "v1_public_update_submissions" on public.student_submissions
  for update to anon, authenticated using (true) with check (true);
