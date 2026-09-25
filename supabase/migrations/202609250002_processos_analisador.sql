-- Perfil Analisador e controle de processos (o que entrou para lavratura), com certidões e exigências.
-- Desenho: docs/superpowers/specs/2026-09-25-processos-analisador-design.md

-- ---------------------------------------------------------------------------
-- Perfil 'analyst'
-- ---------------------------------------------------------------------------
do $$
declare restricao record;
begin
  for restricao in select conrelid::regclass as tabela, conname from pg_constraint
    where conrelid in ('public.workspace_members'::regclass, 'public.workspace_invites'::regclass)
      and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%' loop
    execute format('alter table %s drop constraint %I', restricao.tabela, restricao.conname);
  end loop;
end;
$$;
alter table public.workspace_members add constraint workspace_members_role_check
  check (role in ('owner', 'admin', 'analyst', 'attendant', 'viewer'));
alter table public.workspace_invites add constraint workspace_invites_role_check
  check (role in ('admin', 'analyst', 'attendant', 'viewer'));

-- Analisador edita formulários e agenda como o atendente.
create or replace function public.can_edit_workspace(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_members
  where workspace_id = target_workspace and user_id = auth.uid()
    and role in ('owner', 'admin', 'analyst', 'attendant')
) and public.workspace_is_writable(target_workspace); $$;

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
  if invite_role not in ('admin', 'analyst', 'attendant', 'viewer') then raise exception 'Perfil inválido.'; end if;
  generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.workspace_invites (workspace_id, code, role, created_by)
  values (target_workspace, generated_code, invite_role, auth.uid());
  return query select generated_code, now() + interval '14 days';
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
  if new_role not in ('admin', 'analyst', 'attendant', 'viewer') then raise exception 'Perfil inválido.'; end if;
  update public.workspace_members set role = new_role where workspace_id = target_workspace and user_id = member_id and role <> 'owner';
end;
$$;

create or replace function public.admin_set_member_role(target_workspace uuid, target_user uuid, target_role text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_system_admin() then raise exception 'Sem permissão.'; end if;
  if target_role not in ('admin', 'analyst', 'attendant', 'viewer') then raise exception 'Perfil inválido.'; end if;
  update public.workspace_members set role = target_role
  where workspace_id = target_workspace and user_id = target_user and role <> 'owner';
  if not found then raise exception 'Usuário não encontrado ou é o proprietário do cartório.'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Recurso 'processos' por cartório
-- ---------------------------------------------------------------------------
alter table public.workspace_subscriptions alter column features
  set default '{"agenda":true,"procuracao":true,"apostilamento":true,"certidoes":true,"uniao_estavel":true,"pacto_antenupcial":true,"outros":true,"processos":true}'::jsonb;
update public.workspace_subscriptions set features = features || '{"processos": true}'::jsonb where not (features ? 'processos');

create or replace function public.update_workspace_entitlements(target_workspace uuid, target_plan text, target_max_users integer, target_features jsonb)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_system_admin() then raise exception 'Sem permissão.'; end if;
  if target_plan not in ('trial', 'professional') then raise exception 'Plano inválido.'; end if;
  if target_max_users not between 1 and 100 then raise exception 'Limite de usuários inválido.'; end if;
  if target_features is null or jsonb_typeof(target_features) <> 'object' then raise exception 'Recursos inválidos.'; end if;
  update public.workspace_subscriptions
  set plan = target_plan, max_users = target_max_users,
      features = jsonb_build_object(
        'agenda', coalesce((target_features ->> 'agenda')::boolean, false),
        'procuracao', coalesce((target_features ->> 'procuracao')::boolean, false),
        'apostilamento', coalesce((target_features ->> 'apostilamento')::boolean, false),
        'certidoes', coalesce((target_features ->> 'certidoes')::boolean, false),
        'uniao_estavel', coalesce((target_features ->> 'uniao_estavel')::boolean, false),
        'pacto_antenupcial', coalesce((target_features ->> 'pacto_antenupcial')::boolean, false),
        'outros', coalesce((target_features ->> 'outros')::boolean, false),
        'processos', coalesce((target_features ->> 'processos')::boolean, false)),
      updated_at = now()
  where workspace_id = target_workspace;
  if not found then raise exception 'Cartório não encontrado.'; end if;
end;
$$;

-- Completar e acompanhar processo: proprietário, administrador e analisador.
create or replace function public.can_manage_processos(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.workspace_members
  where workspace_id = target_workspace and user_id = auth.uid() and role in ('owner', 'admin', 'analyst')
) and public.workspace_is_writable(target_workspace) and public.workspace_has_feature(target_workspace, 'processos'); $$;

-- Prazo de validade (em dias) de cada tipo de certidão, ajustável por cartório. Vazio = padrão do sistema.
alter table public.workspace_settings add column if not exists prazos_certidoes jsonb not null default '{}'::jsonb;
alter table public.workspace_settings drop constraint if exists workspace_settings_prazos_size;
alter table public.workspace_settings add constraint workspace_settings_prazos_size
  check (jsonb_typeof(prazos_certidoes) = 'object' and pg_column_size(prazos_certidoes) <= 4096);

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table if not exists public.processos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tipo_ato text not null check (char_length(tipo_ato) between 1 and 120),
  partes jsonb not null default '[]'::jsonb check (jsonb_typeof(partes) = 'array' and pg_column_size(partes) <= 16384),
  objeto text not null default '' check (char_length(objeto) <= 4000),
  gaveta text not null default '' check (char_length(gaveta) <= 60),
  data_entrada date not null default current_date,
  data_prevista date,
  etapa text not null default 'recebido' check (etapa in ('recebido', 'em_analise', 'em_exigencia', 'pronto', 'lavrado', 'cancelado')),
  responsavel_id uuid references auth.users(id) on delete set null,
  observacoes text not null default '' check (char_length(observacoes) <= 4000),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists processos_workspace_etapa_idx on public.processos (workspace_id, etapa, data_prevista);

create table if not exists public.processo_certidoes (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos(id) on delete cascade,
  tipo text not null check (char_length(tipo) between 1 and 120),
  referente text not null default '' check (char_length(referente) <= 200),
  data_emissao date,
  vencimento date,
  observacao text not null default '' check (char_length(observacao) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists processo_certidoes_processo_idx on public.processo_certidoes (processo_id);

create table if not exists public.processo_exigencias (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  cumprida boolean not null default false,
  cumprida_em timestamptz,
  cumprida_por uuid references auth.users(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists processo_exigencias_processo_idx on public.processo_exigencias (processo_id);

-- Cartório, autor e data de criação não mudam; autor e data da alteração vêm do banco.
create or replace function public.touch_processo()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.workspace_id := old.workspace_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists touch_processo on public.processos;
create trigger touch_processo before insert or update on public.processos
for each row execute function public.touch_processo();

-- Quem deu baixa e quando é registrado pelo banco.
create or replace function public.touch_processo_exigencia()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.processo_id := old.processo_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if new.cumprida and (tg_op = 'INSERT' or not old.cumprida) then
    new.cumprida_em := now(); new.cumprida_por := auth.uid();
  elsif not new.cumprida then
    new.cumprida_em := null; new.cumprida_por := null;
  end if;
  return new;
end;
$$;
drop trigger if exists touch_processo_exigencia on public.processo_exigencias;
create trigger touch_processo_exigencia before insert or update on public.processo_exigencias
for each row execute function public.touch_processo_exigencia();

create or replace function public.keep_processo_certidao()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.processo_id := old.processo_id;
  new.created_at := old.created_at;
  return new;
end;
$$;
drop trigger if exists keep_processo_certidao on public.processo_certidoes;
create trigger keep_processo_certidao before update on public.processo_certidoes
for each row execute function public.keep_processo_certidao();

revoke all on function public.touch_processo(), public.touch_processo_exigencia(), public.keep_processo_certidao() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Acesso
-- ---------------------------------------------------------------------------
alter table public.processos enable row level security;
alter table public.processo_certidoes enable row level security;
alter table public.processo_exigencias enable row level security;

drop policy if exists "members read processos" on public.processos;
drop policy if exists "editors create processos" on public.processos;
drop policy if exists "managers update processos" on public.processos;
drop policy if exists "managers delete processos" on public.processos;
create policy "members read processos" on public.processos for select
  using (public.is_workspace_member(workspace_id) and public.workspace_has_feature(workspace_id, 'processos'));
-- Atendente registra a entrada; o restante é com quem gerencia processos.
create policy "editors create processos" on public.processos for insert
  with check (public.can_edit_workspace(workspace_id) and public.workspace_has_feature(workspace_id, 'processos') and created_by = auth.uid());
create policy "managers update processos" on public.processos for update
  using (public.can_manage_processos(workspace_id)) with check (public.can_manage_processos(workspace_id));
create policy "managers delete processos" on public.processos for delete
  using (public.can_manage_processos(workspace_id));

drop policy if exists "members read certidoes" on public.processo_certidoes;
drop policy if exists "managers write certidoes" on public.processo_certidoes;
create policy "members read certidoes" on public.processo_certidoes for select
  using (exists (select 1 from public.processos p where p.id = processo_id));
create policy "managers write certidoes" on public.processo_certidoes for all
  using (exists (select 1 from public.processos p where p.id = processo_id and public.can_manage_processos(p.workspace_id)))
  with check (exists (select 1 from public.processos p where p.id = processo_id and public.can_manage_processos(p.workspace_id)));

drop policy if exists "members read exigencias" on public.processo_exigencias;
drop policy if exists "managers write exigencias" on public.processo_exigencias;
create policy "members read exigencias" on public.processo_exigencias for select
  using (exists (select 1 from public.processos p where p.id = processo_id));
create policy "managers write exigencias" on public.processo_exigencias for all
  using (exists (select 1 from public.processos p where p.id = processo_id and public.can_manage_processos(p.workspace_id)))
  with check (exists (select 1 from public.processos p where p.id = processo_id and public.can_manage_processos(p.workspace_id)));

revoke all on public.processos, public.processo_certidoes, public.processo_exigencias from anon;
revoke truncate, trigger, references on public.processos, public.processo_certidoes, public.processo_exigencias from authenticated;
grant select, insert, update, delete on public.processos, public.processo_certidoes, public.processo_exigencias to authenticated;
revoke all on function public.can_manage_processos(uuid) from public, anon;
grant execute on function public.can_manage_processos(uuid) to authenticated;

-- Vários analisadores trabalham na mesma lista: mudanças chegam em tempo real.
do $$
declare alvo text;
begin
  foreach alvo in array array['processos', 'processo_certidoes', 'processo_exigencias'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = alvo) then
      execute format('alter publication supabase_realtime add table public.%I', alvo);
    end if;
  end loop;
end;
$$;
