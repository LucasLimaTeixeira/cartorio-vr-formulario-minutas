-- Governança SaaS: assinatura, limites, auditoria e proteção do plano.
-- Esta migration deve ser aplicada depois das migrations de workspace e agenda.

create table if not exists public.workspace_subscriptions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial', 'professional')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled', 'suspended')),
  provider_customer_id text unique,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null check (action in ('created', 'updated', 'cancelled', 'realized')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_workspace_created_idx on public.audit_events (workspace_id, created_at desc);

insert into public.workspace_subscriptions (workspace_id, plan, status)
select id, plan, 'trialing' from public.workspaces
on conflict (workspace_id) do nothing;

insert into public.workspace_settings (workspace_id)
select id from public.workspaces
on conflict (workspace_id) do nothing;

create or replace function public.create_workspace_saas_records()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.workspace_subscriptions (workspace_id, plan, status) values (new.id, new.plan, 'trialing');
  insert into public.workspace_settings (workspace_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists workspace_saas_records on public.workspaces;
create trigger workspace_saas_records after insert on public.workspaces
for each row execute function public.create_workspace_saas_records();

create or replace function public.workspace_is_writable(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_subscriptions
  where workspace_id = target_workspace and status in ('trialing', 'active')
); $$;

-- Leitores continuam podendo consultar seus dados, mas apenas assinaturas ativas
-- permitem alteração. Esta função já é usada pelas políticas de escrita existentes.
create or replace function public.can_edit_workspace(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_members
  where workspace_id = target_workspace and user_id = auth.uid()
    and role in ('owner', 'admin', 'attendant')
) and public.workspace_is_writable(target_workspace); $$;

-- O plano só pode ser alterado por um webhook/backend com service role. A aplicação
-- autenticada mantém permissão apenas para editar os dados operacionais do cartório.
revoke update on public.workspaces from authenticated;
grant update (name, endereco, cidade, tabeliao) on public.workspaces to authenticated;

alter table public.workspace_subscriptions enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.audit_events enable row level security;

create policy "members can read subscription" on public.workspace_subscriptions for select
using (public.is_workspace_member(workspace_id));
create policy "members can read settings" on public.workspace_settings for select
using (public.is_workspace_member(workspace_id));
create policy "admins can update settings" on public.workspace_settings for update
using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));
create policy "admins can read audit events" on public.audit_events for select
using (public.is_workspace_admin(workspace_id));

create or replace function public.audit_agenda_item_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  event_action text;
  event_workspace uuid;
  event_id uuid;
begin
  event_workspace := coalesce(new.workspace_id, old.workspace_id);
  event_id := coalesce(new.id, old.id);
  if tg_op = 'INSERT' then event_action := 'created';
  elsif new.status = 'cancelled' then event_action := 'cancelled';
  elsif new.status = 'realized' then event_action := 'realized';
  else event_action := 'updated'; end if;
  insert into public.audit_events (workspace_id, actor_id, entity, entity_id, action, metadata)
  values (event_workspace, auth.uid(), 'agenda_item', event_id, event_action,
    jsonb_build_object('kind', coalesce(new.kind, old.kind), 'status', coalesce(new.status, old.status)));
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_agenda_item_change on public.agenda_items;
create trigger audit_agenda_item_change after insert or update or delete on public.agenda_items
for each row execute function public.audit_agenda_item_change();

revoke all on public.workspace_subscriptions, public.audit_events from anon, authenticated;
grant select on public.workspace_subscriptions, public.audit_events to authenticated;
grant select, update on public.workspace_settings to authenticated;
