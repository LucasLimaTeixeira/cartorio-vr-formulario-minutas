create table if not exists public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('appointment', 'pending')),
  status text not null default 'active' check (status in ('active', 'realized', 'cancelled')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agenda_items_workspace_idx on public.agenda_items (workspace_id, kind, status);

alter table public.agenda_items enable row level security;

create policy "members can read agenda" on public.agenda_items for select using (public.is_workspace_member(workspace_id));
create policy "members can create agenda" on public.agenda_items for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "members can update agenda" on public.agenda_items for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members can delete agenda" on public.agenda_items for delete using (public.is_workspace_member(workspace_id));

alter publication supabase_realtime add table public.agenda_items;