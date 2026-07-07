-- Supabase schema for the couple website MVP.
-- Run this in Supabase SQL Editor after Authentication is enabled.

create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values ('memory-photos', 'memory-photos', true)
on conflict (id) do nothing;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  partner_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text,
  memory_date date not null,
  mood text,
  location text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references public.memories(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  image_url text not null,
  caption text,
  latitude double precision,
  longitude double precision,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  message_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.photos
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create table if not exists public.bucket_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.timeline (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete set null,
  bucket_list_id uuid references public.bucket_list(id) on delete set null,
  event_type text not null
    check (event_type in ('memory', 'photo', 'bucket_list', 'anniversary', 'note')),
  title text not null,
  description text,
  event_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_partner_id_idx on public.users(partner_id);
create index if not exists memories_user_id_memory_date_idx
  on public.memories(user_id, memory_date desc);
create index if not exists memories_created_at_idx
  on public.memories(created_at desc);
create index if not exists memories_coordinates_idx
  on public.memories(latitude, longitude)
  where latitude is not null and longitude is not null;
create index if not exists photos_memory_id_sort_order_idx
  on public.photos(memory_id, sort_order);
create index if not exists photos_user_id_idx on public.photos(user_id);
create index if not exists photos_coordinates_idx
  on public.photos(latitude, longitude)
  where latitude is not null and longitude is not null;
create index if not exists daily_messages_user_id_date_idx
  on public.daily_messages(user_id, message_date desc, created_at desc);
create index if not exists bucket_list_user_id_status_idx
  on public.bucket_list(user_id, status);
create index if not exists timeline_user_id_event_date_idx
  on public.timeline(user_id, event_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_memories_updated_at on public.memories;
create trigger set_memories_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

drop trigger if exists set_bucket_list_updated_at on public.bucket_list;
create trigger set_bucket_list_updated_at
before update on public.bucket_list
for each row execute function public.set_updated_at();

drop trigger if exists set_daily_messages_updated_at on public.daily_messages;
create trigger set_daily_messages_updated_at
before update on public.daily_messages
for each row execute function public.set_updated_at();

drop trigger if exists set_timeline_updated_at on public.timeline;
create trigger set_timeline_updated_at
before update on public.timeline
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.memories enable row level security;
alter table public.photos enable row level security;
alter table public.daily_messages enable row level security;
alter table public.bucket_list enable row level security;
alter table public.timeline enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage own memories" on public.memories;
create policy "Users can manage own memories"
on public.memories for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own photos" on public.photos;
create policy "Users can manage own photos"
on public.photos for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own daily messages" on public.daily_messages;
create policy "Users can manage own daily messages"
on public.daily_messages for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own bucket list" on public.bucket_list;
create policy "Users can manage own bucket list"
on public.bucket_list for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own timeline" on public.timeline;
create policy "Users can manage own timeline"
on public.timeline for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read memory photos" on storage.objects;
create policy "Users can read memory photos"
on storage.objects for select
using (bucket_id = 'memory-photos');

drop policy if exists "Users can upload own memory photos" on storage.objects;
create policy "Users can upload own memory photos"
on storage.objects for insert
with check (
  bucket_id = 'memory-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own memory photos" on storage.objects;
create policy "Users can update own memory photos"
on storage.objects for update
using (
  bucket_id = 'memory-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'memory-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own memory photos" on storage.objects;
create policy "Users can delete own memory photos"
on storage.objects for delete
using (
  bucket_id = 'memory-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
