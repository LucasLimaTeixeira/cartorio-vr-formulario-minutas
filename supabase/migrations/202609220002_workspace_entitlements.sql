-- Recursos e limites administrados por cartório.
alter table public.workspace_subscriptions
  add column if not exists max_users integer not null default 5 check (max_users between 1 and 100),
  add column if not exists features jsonb not null default '{"agenda":true,"procuracao":true,"apostilamento":true,"certidoes":true,"uniao_estavel":true,"pacto_antenupcial":true,"outros":true}'::jsonb;

create or replace function public.workspace_has_feature(target_workspace uuid, feature_key text)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((features ->> feature_key)::boolean, false)
  from public.workspace_subscriptions where workspace_id = target_workspace; $$;

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
        'outros', coalesce((target_features ->> 'outros')::boolean, false)),
      updated_at = now()
  where workspace_id = target_workspace;
  if not found then raise exception 'Cartório não encontrado.'; end if;
end;
$$;

drop function if exists public.list_admin_workspaces();
create function public.list_admin_workspaces()
returns table (id uuid, nome text, cidade text, proprietario text, email text, plano text, status text, max_usuarios integer, recursos jsonb)
language sql stable security definer set search_path = public
as $$
  select w.id, w.name, w.cidade, coalesce(p.full_name, 'Sem proprietário'), coalesce(p.email, ''),
    coalesce(s.plan, w.plan), coalesce(s.status, 'trialing'), coalesce(s.max_users, 5), s.features
  from public.workspaces w
  left join public.workspace_subscriptions s on s.workspace_id = w.id
  left join public.profiles p on p.id = w.owner_id
  where public.is_system_admin()
  order by w.created_at desc;
$$;

revoke all on function public.update_workspace_entitlements(uuid, text, integer, jsonb) from public, anon;
grant execute on function public.update_workspace_entitlements(uuid, text, integer, jsonb) to authenticated;
revoke all on function public.workspace_has_feature(uuid, text) from public, anon;
grant execute on function public.workspace_has_feature(uuid, text) to authenticated;

create or replace function public.schedule_agenda_appointment(p_pending_id uuid, p_data jsonb)
returns public.agenda_items
language plpgsql security definer set search_path = public
as $$
declare target_workspace uuid; appointment public.agenda_items; appointment_date date; appointment_time time; uses_room boolean; room_name text;
begin
  if p_pending_id is not null then select workspace_id into target_workspace from public.agenda_items where id = p_pending_id and kind = 'pending' and status = 'active';
  else select workspace_id into target_workspace from public.workspace_members where user_id = auth.uid() order by created_at limit 1; end if;
  if target_workspace is null or not public.can_edit_workspace(target_workspace) or not public.workspace_has_feature(target_workspace, 'agenda') then raise exception 'Sem permissão para usar a agenda.'; end if;
  begin appointment_date := (p_data ->> 'data')::date; appointment_time := (p_data ->> 'horario')::time; exception when others then raise exception 'Data ou horário inválido.'; end;
  if appointment_date is null or appointment_time < time '08:30' or appointment_time > time '17:00' or extract(minute from appointment_time)::integer not in (0, 30) then raise exception 'Horário fora da grade permitida.'; end if;
  uses_room := coalesce((p_data ->> 'usaSala')::boolean, true); room_name := p_data ->> 'sala';
  if uses_room and room_name not in ('Sala 1', 'Sala 2', 'Sala 3') then raise exception 'Sala inválida.'; end if;
  perform pg_advisory_xact_lock(hashtext(target_workspace::text || appointment_date::text || appointment_time::text));
  if uses_room and exists (select 1 from public.agenda_items where workspace_id = target_workspace and kind = 'appointment' and status = 'active' and coalesce((data ->> 'usaSala')::boolean, true) and data ->> 'data' = appointment_date::text and data ->> 'horario' = to_char(appointment_time, 'HH24:MI') and data ->> 'sala' = room_name) then raise exception 'A sala já está ocupada neste horário.'; end if;
  if uses_room and (select count(*) from public.agenda_items where workspace_id = target_workspace and kind = 'appointment' and status = 'active' and coalesce((data ->> 'usaSala')::boolean, true) and data ->> 'data' = appointment_date::text and data ->> 'horario' = to_char(appointment_time, 'HH24:MI')) >= 3 then raise exception 'O horário já atingiu o limite de três salas.'; end if;
  insert into public.agenda_items (workspace_id, created_by, kind, status, data) values (target_workspace, auth.uid(), 'appointment', 'active', p_data - 'id') returning * into appointment;
  update public.agenda_items set data = jsonb_set(appointment.data, '{id}', to_jsonb(appointment.id::text)), updated_at = now() where id = appointment.id returning * into appointment;
  if p_pending_id is not null then update public.agenda_items set status = 'cancelled', updated_at = now() where id = p_pending_id and workspace_id = target_workspace; end if;
  return appointment;
end;
$$;
