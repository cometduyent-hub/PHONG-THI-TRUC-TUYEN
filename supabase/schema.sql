-- KHTN SMART TEST - Supabase schema
create extension if not exists pgcrypto;

do $$ begin
  create type question_type as enum ('multiple_choice','true_false','short_answer','essay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type difficulty_level as enum ('nhan_biet','thong_hieu','van_dung','van_dung_cao');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'teacher' check (role in ('teacher','student','admin')),
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade int,
  teacher_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) on delete set null,
  subject text not null default 'KHTN',
  grade int,
  topic text,
  lesson text,
  type question_type not null,
  difficulty difficulty_level not null default 'thong_hieu',
  content text not null,
  explanation text,
  points numeric(6,2) not null default 0.25,
  short_answer numeric(14,6),
  short_tolerance numeric(14,6),
  short_text_answers text[],
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  option_key text not null check (option_key in ('A','B','C','D')),
  content text not null,
  is_correct boolean not null default false
);

create table if not exists true_false_items (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  item_key text not null check (item_key in ('a','b','c','d')),
  content text not null,
  is_correct boolean not null
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) on delete set null,
  title text not null,
  grade int,
  duration_minutes int not null default 45,
  access_code text unique,
  status text not null default 'draft' check (status in ('draft','published','running','closed')),
  created_at timestamptz not null default now()
);

create table if not exists exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  source_question_id uuid not null references questions(id) on delete restrict,
  section int not null check (section between 1 and 4),
  position int not null,
  points numeric(6,2) not null,
  shuffled_options jsonb,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete set null,
  full_name text not null,
  student_code text,
  created_at timestamptz not null default now()
);

create table if not exists exam_sessions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','graded')),
  total_score numeric(7,2) default 0
);

create table if not exists student_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references exam_sessions(id) on delete cascade,
  exam_question_id uuid not null references exam_questions(id) on delete cascade,
  answer_json jsonb,
  auto_score numeric(7,2),
  teacher_score numeric(7,2),
  teacher_feedback text,
  saved_at timestamptz not null default now(),
  unique(session_id, exam_question_id)
);

create table if not exists tf_scoring_rules (
  wrong_count int primary key check (wrong_count between 0 and 4),
  score numeric(5,2) not null
);
insert into tf_scoring_rules(wrong_count,score) values (0,1.00),(1,0.50),(2,0.25),(3,0.10),(4,0.00)
on conflict (wrong_count) do update set score=excluded.score;

alter table profiles enable row level security;
alter table classes enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table true_false_items enable row level security;
alter table exams enable row level security;
alter table exam_questions enable row level security;
alter table students enable row level security;
alter table exam_sessions enable row level security;
alter table student_answers enable row level security;
alter table tf_scoring_rules enable row level security;

-- Development-friendly policies. Tighten these before production deployment.
create policy if not exists "authenticated read profiles" on profiles for select to authenticated using (true);
create policy if not exists "own profile insert" on profiles for insert to authenticated with check (id = auth.uid());
create policy if not exists "teachers manage questions" on questions for all to authenticated using (teacher_id = auth.uid() or teacher_id is null) with check (teacher_id = auth.uid() or teacher_id is null);
create policy if not exists "authenticated read options" on question_options for select to authenticated using (true);
create policy if not exists "authenticated manage options" on question_options for all to authenticated using (true) with check (true);
create policy if not exists "authenticated read tf" on true_false_items for select to authenticated using (true);
create policy if not exists "authenticated manage tf" on true_false_items for all to authenticated using (true) with check (true);
create policy if not exists "teachers manage exams" on exams for all to authenticated using (teacher_id = auth.uid() or teacher_id is null) with check (teacher_id = auth.uid() or teacher_id is null);
create policy if not exists "authenticated read exam questions" on exam_questions for select to authenticated using (true);
create policy if not exists "teachers manage exam questions" on exam_questions for all to authenticated using (true) with check (true);
create policy if not exists "authenticated read classes" on classes for select to authenticated using (true);
create policy if not exists "teachers manage classes" on classes for all to authenticated using (teacher_id = auth.uid() or teacher_id is null) with check (teacher_id = auth.uid() or teacher_id is null);
create policy if not exists "authenticated read students" on students for select to authenticated using (true);
create policy if not exists "teachers manage students" on students for all to authenticated using (true) with check (true);
create policy if not exists "authenticated manage sessions" on exam_sessions for all to authenticated using (true) with check (true);
create policy if not exists "authenticated manage answers" on student_answers for all to authenticated using (true) with check (true);
create policy if not exists "authenticated read scoring" on tf_scoring_rules for select to authenticated using (true);
