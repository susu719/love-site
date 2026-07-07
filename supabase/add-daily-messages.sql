-- Run this once in Supabase SQL Editor to sync daily messages across devices.

create extension if not exists "pgcrypto";

create table if not exists public.daily_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  message_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_messages_user_id_date_idx
  on public.daily_messages(user_id, message_date desc, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_daily_messages_updated_at on public.daily_messages;
create trigger set_daily_messages_updated_at
before update on public.daily_messages
for each row execute function public.set_updated_at();

alter table public.daily_messages enable row level security;

drop policy if exists "Users can manage own daily messages" on public.daily_messages;
create policy "Users can manage own daily messages"
on public.daily_messages for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
