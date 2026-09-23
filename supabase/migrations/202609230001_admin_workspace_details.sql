-- Dados de contrato por cartório e consultas detalhadas para a tela do Super Admin.
alter table public.workspace_subscriptions
  add column if not exists contracted_at date,
  add column if not exists billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'quarterly', 'yearly')),
  add column if not exists price numeric(10, 2) check (price is null or price >= 0),
  add column if not exists notes text not null default '' check (char_length(notes) <= 2000);

update public.workspace_subscriptions s set contracted_at = w.created_at::date
from public.workspaces w where w.id = s.workspace_id and s.contracted_at is null;

drop function if exists public.list_admin_workspaces();
create function public.list_admin_workspaces()
returns table (
  id uuid, nome text, cidade text, endereco text, tabeliao text, proprietario text, email text,
  plano text, status text, max_usuarios integer, recursos jsonb, usuarios integer,
  criado_em timestamptz, contratado_em date, vencimento date, ciclo text, valor numeric, observacoes text
)
language sql stable security definer set search_path = public
as $$
  select w.id, w.name, w.cidade, w.endereco, w.tabeliao, coalesce(p.full_name, 'Sem proprietário'), coalesce(p.email, ''),
    coalesce(s.plan, w.plan), coalesce(s.status, 'trialing'), coalesce(s.max_users, 5), s.features,
    (select count(*)::integer from public.workspace_members m where m.workspace_id = w.id),
    w.created_at, s.contracted_at, (s.current_period_end at time zone 'America/Sao_Paulo')::date,
    coalesce(s.billing_cycle, 'monthly'), s.price, coalesce(s.notes, '')
  from public.workspaces w
  left join public.workspace_subscriptions s on s.workspace_id = w.id
  left join public.profiles p on p.id = w.owner_id
  where public.is_system_admin()
  order by w.created_at desc;
$$;

create or replace function public.list_admin_workspace_users(target_workspace uuid)
returns table (id uuid, nome text, email text, cargo text, papel text, vinculado_em timestamptz, ultimo_acesso timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.id, coalesce(p.full_name, 'Sem nome'), coalesce(p.email, ''), coalesce(p.cargo, ''),
    m.role, m.created_at, u.last_sign_in_at
  from public.workspace_members m
  join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where public.is_system_admin() and m.workspace_id = target_workspace
  order by case m.role when 'owner' then 0 when 'admin' then 1 when 'attendant' then 2 else 3 end, p.full_name;
$$;

create or replace function public.update_workspace_contract(
  target_workspace uuid, target_plan text, target_status text, target_contracted_at date, target_period_end date,
  target_cycle text, target_price numeric, target_notes text, target_max_users integer, target_features jsonb)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_system_admin() then raise exception 'Sem permissão.'; end if;
  if target_status not in ('trialing', 'active', 'past_due', 'cancelled', 'suspended') then raise exception 'Status inválido.'; end if;
  if target_cycle not in ('monthly', 'quarterly', 'yearly') then raise exception 'Ciclo de cobrança inválido.'; end if;
  if target_contracted_at is not null and target_period_end is not null and target_period_end < target_contracted_at then
    raise exception 'O vencimento não pode ser anterior à contratação.';
  end if;
  if target_max_users < (select count(*) from public.workspace_members where workspace_id = target_workspace) then
    raise exception 'O limite não pode ser menor que a quantidade atual de usuários.';
  end if;
  perform public.update_workspace_entitlements(target_workspace, target_plan, target_max_users, target_features);
  update public.workspace_subscriptions
  set status = target_status, contracted_at = target_contracted_at,
      current_period_end = case when target_period_end is null then null
        else (target_period_end + time '23:59:59') at time zone 'America/Sao_Paulo' end,
      billing_cycle = target_cycle, price = target_price, notes = left(coalesce(target_notes, ''), 2000), updated_at = now()
  where workspace_id = target_workspace;
end;
$$;

-- Owner só muda pela transferência do cartório; aqui o Super Admin ajusta os demais perfis.
create or replace function public.admin_set_member_role(target_workspace uuid, target_user uuid, target_role text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_system_admin() then raise exception 'Sem permissão.'; end if;
  if target_role not in ('admin', 'attendant', 'viewer') then raise exception 'Perfil inválido.'; end if;
  update public.workspace_members set role = target_role
  where workspace_id = target_workspace and user_id = target_user and role <> 'owner';
  if not found then raise exception 'Usuário não encontrado ou é o proprietário do cartório.'; end if;
end;
$$;

-- Remove apenas o vínculo com o cartório; a conta de login continua existindo.
create or replace function public.admin_remove_member(target_workspace uuid, target_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_system_admin() then raise exception 'Sem permissão.'; end if;
  delete from public.workspace_members
  where workspace_id = target_workspace and user_id = target_user and role <> 'owner';
  if not found then raise exception 'Usuário não encontrado ou é o proprietário do cartório.'; end if;
end;
$$;

revoke all on function public.list_admin_workspaces() from public, anon;
revoke all on function public.list_admin_workspace_users(uuid) from public, anon;
revoke all on function public.update_workspace_contract(uuid, text, text, date, date, text, numeric, text, integer, jsonb) from public, anon;
revoke all on function public.admin_set_member_role(uuid, uuid, text) from public, anon;
revoke all on function public.admin_remove_member(uuid, uuid) from public, anon;
grant execute on function public.list_admin_workspaces() to authenticated;
grant execute on function public.list_admin_workspace_users(uuid) to authenticated;
grant execute on function public.update_workspace_contract(uuid, text, text, date, date, text, numeric, text, integer, jsonb) to authenticated;
grant execute on function public.admin_set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.admin_remove_member(uuid, uuid) to authenticated;
