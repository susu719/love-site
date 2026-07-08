-- Run this once in Supabase SQL Editor to support two Google accounts sharing one space.

create extension if not exists "pgcrypto";

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default '兩個人的日常',
  invite_code text not null unique,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create table if not exists public.relationship_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  start_date date not null,
  anniversaries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.memories
  add column if not exists space_id uuid references public.spaces(id) on delete cascade;
alter table public.photos
  add column if not exists space_id uuid references public.spaces(id) on delete cascade;
alter table public.daily_messages
  add column if not exists space_id uuid references public.spaces(id) on delete cascade;
alter table public.relationship_settings
  add column if not exists space_id uuid unique references public.spaces(id) on delete cascade;
alter table public.bucket_list
  add column if not exists space_id uuid references public.spaces(id) on delete cascade;

create index if not exists spaces_invite_code_idx on public.spaces(invite_code);
create index if not exists space_members_user_id_idx on public.space_members(user_id);
create index if not exists space_members_space_id_idx on public.space_members(space_id);
create index if not exists memories_space_id_memory_date_idx
  on public.memories(space_id, memory_date desc);
create index if not exists photos_space_id_idx on public.photos(space_id);
create index if not exists daily_messages_space_id_date_idx
  on public.daily_messages(space_id, message_date desc, created_at desc);
create index if not exists bucket_list_space_id_status_idx
  on public.bucket_list(space_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_spaces_updated_at on public.spaces;
create trigger set_spaces_updated_at
before update on public.spaces
for each row execute function public.set_updated_at();

drop trigger if exists set_relationship_settings_updated_at on public.relationship_settings;
create trigger set_relationship_settings_updated_at
before update on public.relationship_settings
for each row execute function public.set_updated_at();

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.relationship_settings enable row level security;

drop policy if exists "Users can create spaces" on public.spaces;
create policy "Users can create spaces"
on public.spaces for insert
with check (auth.uid() = owner_id);

drop policy if exists "Members can read own spaces" on public.spaces;
create policy "Members can read own spaces"
on public.spaces for select
using (
  auth.uid() is not null
  or
  owner_id = auth.uid()
  or exists (
    select 1 from public.space_members
    where space_members.space_id = spaces.id
      and space_members.user_id = auth.uid()
  )
);

drop policy if exists "Owners can update own spaces" on public.spaces;
create policy "Owners can update own spaces"
on public.spaces for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can read own memberships" on public.space_members;
create policy "Users can read own memberships"
on public.space_members for select
using (user_id = auth.uid());

drop policy if exists "Users can join spaces" on public.space_members;
create policy "Users can join spaces"
on public.space_members for insert
with check (user_id = auth.uid());

drop policy if exists "Users can leave spaces" on public.space_members;
create policy "Users can leave spaces"
on public.space_members for delete
using (user_id = auth.uid());

drop policy if exists "Members can manage shared memories" on public.memories;
create policy "Members can manage shared memories"
on public.memories for all
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.space_members
    where space_members.space_id = memories.space_id
      and space_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.space_members
    where space_members.space_id = memories.space_id
      and space_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can manage shared photos" on public.photos;
create policy "Members can manage shared photos"
on public.photos for all
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.space_members
    where space_members.space_id = photos.space_id
      and space_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.space_members
    where space_members.space_id = photos.space_id
      and space_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can manage shared daily messages" on public.daily_messages;
create policy "Members can manage shared daily messages"
on public.daily_messages for all
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.space_members
    where space_members.space_id = daily_messages.space_id
      and space_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.space_members
    where space_members.space_id = daily_messages.space_id
      and space_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can manage shared relationship settings" on public.relationship_settings;
drop policy if exists "Users can manage own relationship settings" on public.relationship_settings;
create policy "Users can manage own relationship settings"
on public.relationship_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Members can manage shared relationship settings"
on public.relationship_settings for all
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.space_members
    where space_members.space_id = relationship_settings.space_id
      and space_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.space_members
    where space_members.space_id = relationship_settings.space_id
      and space_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can manage shared bucket list" on public.bucket_list;
create policy "Members can manage shared bucket list"
on public.bucket_list for all
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.space_members
    where space_members.space_id = bucket_list.space_id
      and space_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.space_members
    where space_members.space_id = bucket_list.space_id
      and space_members.user_id = auth.uid()
  )
);
