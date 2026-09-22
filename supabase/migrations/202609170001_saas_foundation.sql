create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'trial' check (plan in ('trial', 'professional')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'attendant', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.form_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  form_type text not null check (form_type in ('procuracao', 'apostilamento', 'certidao', 'uniao-estavel', 'pacto-antenupcial')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (workspace_id, form_type)
);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid()); $$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.form_drafts enable row level security;

create policy "members can read workspaces" on public.workspaces for select using (public.is_workspace_member(id) or owner_id = auth.uid());
create policy "users can create workspaces" on public.workspaces for insert with check (owner_id = auth.uid());
create policy "members can read membership" on public.workspace_members for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
create policy "owners can add members" on public.workspace_members for insert with check (exists (select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));
create policy "members can read drafts" on public.form_drafts for select using (public.is_workspace_member(workspace_id));
create policy "members can create drafts" on public.form_drafts for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "members can update drafts" on public.form_drafts for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create or replace function public.create_owner_membership()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.workspace_members (workspace_id, user_id, role) values (new.id, new.owner_id, 'owner'); return new; end; $$;

drop trigger if exists workspace_owner_membership on public.workspaces;
create trigger workspace_owner_membership after insert on public.workspaces for each row execute function public.create_owner_membership();