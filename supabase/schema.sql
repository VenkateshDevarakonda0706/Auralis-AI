create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text,
  image text,
  provider text not null default 'credentials',
  google_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_google_id on public.users (google_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  response_style text not null default 'detailed',
  language text,
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  response text not null,
  is_important boolean not null default true,
  timestamp timestamptz not null default now()
);

create index if not exists idx_chat_memory_user_timestamp on public.chat_memory (user_id, timestamp desc);
create index if not exists idx_chat_memory_user_important on public.chat_memory (user_id, is_important);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row
execute function public.set_updated_at();
