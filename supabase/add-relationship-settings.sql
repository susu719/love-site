-- Run this once in Supabase SQL Editor to sync relationship stats across devices.

create extension if not exists "pgcrypto";

create table if not exists public.relationship_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  start_date date not null default current_date,
  anniversaries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists relationship_settings_updated_at_idx
  on public.relationship_settings(updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_relationship_settings_updated_at on public.relationship_settings;
create trigger set_relationship_settings_updated_at
before update on public.relationship_settings
for each row execute function public.set_updated_at();

alter table public.relationship_settings enable row level security;

drop policy if exists "Users can manage own relationship settings" on public.relationship_settings;
create policy "Users can manage own relationship settings"
on public.relationship_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
