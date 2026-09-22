-- Equipe, convites e perfis. Execute depois das migrations anteriores.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists auth_user_profile on auth.users;
create trigger auth_user_profile after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.create_profile_for_user();

insert into public.profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data ->> 'full_name', ''), coalesce(email, '') from auth.users
on conflict (id) do nothing;

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null unique,
  role text not null default 'attendant' check (role in ('admin', 'attendant', 'viewer')),
  created_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.is_workspace_admin(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_members
  where workspace_id = target_workspace and user_id = auth.uid() and role in ('owner', 'admin')
); $$;

create or replace function public.can_edit_workspace(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_members
  where workspace_id = target_workspace and user_id = auth.uid() and role in ('owner', 'admin', 'attendant')
); $$;

-- Leitores podem consultar o workspace, mas não alterar documentos ou agenda.
drop policy if exists "members can create drafts" on public.form_drafts;
drop policy if exists "members can update drafts" on public.form_drafts;
drop policy if exists "editors can create drafts" on public.form_drafts;
drop policy if exists "editors can update drafts" on public.form_drafts;
create policy "editors can create drafts" on public.form_drafts for insert with check (public.can_edit_workspace(workspace_id) and created_by = auth.uid());
create policy "editors can update drafts" on public.form_drafts for update using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
drop policy if exists "members can create agenda" on public.agenda_items;
drop policy if exists "members can update agenda" on public.agenda_items;
drop policy if exists "members can delete agenda" on public.agenda_items;
drop policy if exists "editors can create agenda" on public.agenda_items;
drop policy if exists "editors can update agenda" on public.agenda_items;
drop policy if exists "editors can delete agenda" on public.agenda_items;
create policy "editors can create agenda" on public.agenda_items for insert with check (public.can_edit_workspace(workspace_id) and created_by = auth.uid());
create policy "editors can update agenda" on public.agenda_items for update using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "editors can delete agenda" on public.agenda_items for delete using (public.can_edit_workspace(workspace_id));

alter table public.profiles enable row level security;
alter table public.workspace_invites enable row level security;

drop policy if exists "members can read profiles" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "admins can read invites" on public.workspace_invites;
create policy "members can read profiles" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.workspace_members mine
    join public.workspace_members peer on peer.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid() and peer.user_id = profiles.id
  )
);
create policy "users can update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admins can read invites" on public.workspace_invites for select using (public.is_workspace_admin(workspace_id));

-- Só o trigger de criação do workspace pode criar um proprietário. O dono não
-- consegue promover uma conta adicional para owner pelo console do navegador.
drop policy if exists "owners can add members" on public.workspace_members;
drop policy if exists "owners can add non-owner members" on public.workspace_members;
create policy "owners can add non-owner members" on public.workspace_members for insert
with check (exists (
  select 1 from public.workspaces
  where id = workspace_id and owner_id = auth.uid()
) and role <> 'owner');

create or replace function public.create_workspace_invite(invite_role text default 'attendant')
returns table(code text, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare target_workspace uuid; generated_code text;
begin
  select workspace_id into target_workspace from public.workspace_members
  where user_id = auth.uid() order by created_at limit 1;
  if target_workspace is null or not exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid() and role = 'owner') then
    raise exception 'Você não tem permissão para criar convites.';
  end if;
  if invite_role not in ('admin', 'attendant', 'viewer') then raise exception 'Perfil inválido.'; end if;
  generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.workspace_invites (workspace_id, code, role, created_by)
  values (target_workspace, generated_code, invite_role, auth.uid());
  return query select generated_code, now() + interval '14 days';
end;
$$;

create or replace function public.join_workspace(invite_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare invitation public.workspace_invites%rowtype;
begin
  select * into invitation from public.workspace_invites
  where code = upper(trim(invite_code)) and used_at is null and expires_at > now() for update;
  if invitation.id is null then raise exception 'Convite inválido, usado ou expirado.'; end if;
  if exists (select 1 from public.workspace_members where user_id = auth.uid()) then raise exception 'Esta conta já pertence a um workspace.'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (invitation.workspace_id, auth.uid(), invitation.role);
  update public.workspace_invites set used_at = now(), used_by = auth.uid() where id = invitation.id;
  return invitation.workspace_id;
end;
$$;

create or replace function public.update_workspace_member_role(member_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public
as $$
declare target_workspace uuid;
begin
  select workspace_id into target_workspace from public.workspace_members where user_id = auth.uid() order by created_at limit 1;
  if not exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid() and role = 'owner') then
    raise exception 'Somente o proprietário pode alterar perfis.';
  end if;
  if new_role not in ('admin', 'attendant', 'viewer') then raise exception 'Perfil inválido.'; end if;
  update public.workspace_members set role = new_role where workspace_id = target_workspace and user_id = member_id and role <> 'owner';
end;
$$;

revoke execute on function public.create_workspace_invite(text) from public, anon;
revoke execute on function public.join_workspace(text) from public, anon;
revoke execute on function public.update_workspace_member_role(uuid, text) from public, anon;
grant execute on function public.create_workspace_invite(text), public.join_workspace(text), public.update_workspace_member_role(uuid, text) to authenticated;
