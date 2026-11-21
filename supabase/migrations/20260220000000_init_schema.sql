-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone" 
  on public.profiles for select using (true);

create policy "Users can update their own profile" 
  on public.profiles for update using (auth.uid() = id);

-- Trigger to auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Quizzes Table
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text default '',
  source_type text default 'manual', -- 'file', 'prompt', 'manual'
  theme text default 'default',
  cover_image_url text default '',
  default_timer_seconds integer default 20 not null,
  default_points integer default 1000 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.quizzes enable row level security;

create policy "Hosts can view their own quizzes"
  on public.quizzes for select
  using (auth.uid() = owner_id);

create policy "Hosts can insert their own quizzes"
  on public.quizzes for insert
  with check (auth.uid() = owner_id);

create policy "Hosts can update their own quizzes"
  on public.quizzes for update
  using (auth.uid() = owner_id);

create policy "Hosts can delete their own quizzes"
  on public.quizzes for delete
  using (auth.uid() = owner_id);

-- 3. Questions Table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  text text not null,
  options jsonb not null, -- array of strings e.g. ["Option A", "Option B", ...]
  correct_index integer not null,
  timer_seconds integer default 20 not null,
  points integer default 1000 not null,
  image_url text default '',
  order_index integer default 0 not null,
  created_at timestamptz default now() not null
);

alter table public.questions enable row level security;

create policy "Hosts can manage questions of their own quizzes"
  on public.questions for all
  using (
    exists (
      select 1 from public.quizzes
      where public.quizzes.id = questions.quiz_id
      and public.quizzes.owner_id = auth.uid()
    )
  );

-- 4. Sessions Table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  host_id uuid references auth.users(id) on delete cascade not null,
  room_code varchar(8) unique not null,
  status text default 'lobby' check (status in ('scheduled', 'lobby', 'live', 'question_ended', 'leaderboard', 'ended', 'cancelled')),
  scheduled_at timestamptz,
  timezone text default 'UTC',
  public_slug text,
  current_question_index integer default 0 not null,
  question_started_at timestamptz,
  settings jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.sessions enable row level security;

create policy "Hosts can view their own sessions"
  on public.sessions for select
  using (auth.uid() = host_id);

create policy "Hosts can manage their own sessions"
  on public.sessions for all
  using (auth.uid() = host_id);

-- Public read for session status check by room_code (without sensitive host data)
create policy "Anyone can lookup active session by room_code"
  on public.sessions for select
  using (true);

-- 5. Invites Table
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  email text not null,
  status text default 'sent' check (status in ('sent', 'opened', 'joined')),
  sent_at timestamptz default now() not null,
  opened_at timestamptz,
  joined_at timestamptz
);

alter table public.invites enable row level security;

create policy "Hosts can manage invites for their sessions"
  on public.invites for all
  using (
    exists (
      select 1 from public.sessions
      where public.sessions.id = invites.session_id
      and public.sessions.host_id = auth.uid()
    )
  );

-- 6. Players Table (Anonymous room participants)
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  display_name text not null,
  avatar text default '1' not null,
  token text not null,
  score integer default 0 not null,
  connected_at timestamptz default now() not null,
  kicked boolean default false not null,
  unique(session_id, token)
);

alter table public.players enable row level security;

create policy "Hosts can view players in their sessions"
  on public.players for select
  using (
    exists (
      select 1 from public.sessions
      where public.sessions.id = players.session_id
      and public.sessions.host_id = auth.uid()
    )
  );

create policy "Hosts can update/kick players in their sessions"
  on public.players for update
  using (
    exists (
      select 1 from public.sessions
      where public.sessions.id = players.session_id
      and public.sessions.host_id = auth.uid()
    )
  );

-- 7. Answers Table
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  player_id uuid references public.players(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  selected_index integer not null,
  is_correct boolean default false not null,
  response_time_ms integer default 0 not null,
  points_awarded integer default 0 not null,
  submitted_at timestamptz default now() not null,
  unique(player_id, question_id)
);

alter table public.answers enable row level security;

create policy "Hosts can view answers for their sessions"
  on public.answers for select
  using (
    exists (
      select 1 from public.sessions
      where public.sessions.id = answers.session_id
      and public.sessions.host_id = auth.uid()
    )
  );

-- 8. AI Usage Table (for host rate limiting e.g. 20 generations/day)
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  provider text not null,
  tokens integer default 0 not null
);

alter table public.ai_usage enable row level security;

create policy "Hosts can view their own AI usage"
  on public.ai_usage for select
  using (auth.uid() = owner_id);

create policy "Hosts can insert AI usage"
  on public.ai_usage for insert
  with check (auth.uid() = owner_id);

-- Storage bucket for quiz media and uploaded documents
insert into storage.buckets (id, name, public)
values ('quiz-assets', 'quiz-assets', true)
on conflict (id) do nothing;

create policy "Public access to quiz assets"
  on storage.objects for select
  using (bucket_id = 'quiz-assets');

create policy "Authenticated users can upload quiz assets"
  on storage.objects for insert
  with check (bucket_id = 'quiz-assets' and auth.role() = 'authenticated');

-- 9. Permissions & Schema Grants (Required for PostgREST & RLS)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

