create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  language text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages_select_all" on public.messages for select using (true);
create policy "messages_insert_all" on public.messages for insert with check (
  length(name) between 1 and 40 and length(content) between 1 and 1000
);

alter publication supabase_realtime add table public.messages;
alter table public.messages replica identity full;
