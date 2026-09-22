create table if not exists public.system_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists cpf_hash text unique,
  add column if not exists cargo text;

create or replace function public.is_system_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.system_admins where user_id = auth.uid()); $$;

alter table public.system_admins enable row level security;
create policy "super admins can read system admins" on public.system_admins for select using (public.is_system_admin());

create or replace function public.list_admin_workspaces()
returns table (id uuid, nome text, cidade text, proprietario text, email text, plano text, status text)
language sql stable security definer set search_path = public
as $$
  select w.id, w.name, w.cidade, coalesce(p.full_name, 'Sem proprietário'), coalesce(p.email, ''),
    coalesce(s.plan, w.plan), coalesce(s.status, 'trialing')
  from public.workspaces w
  left join public.workspace_subscriptions s on s.workspace_id = w.id
  left join public.profiles p on p.id = w.owner_id
  where public.is_system_admin()
  order by w.created_at desc;
$$;

revoke all on function public.list_admin_workspaces() from public, anon;
grant execute on function public.list_admin_workspaces() to authenticated;
revoke all on public.system_admins from anon, authenticated;
grant select on public.system_admins to authenticated;
