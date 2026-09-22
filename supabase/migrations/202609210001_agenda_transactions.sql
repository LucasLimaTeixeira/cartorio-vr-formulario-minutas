-- Operações atômicas para a agenda compartilhada.
-- A trava por workspace/data/horário impede duas reservas concorrentes da mesma sala.

create or replace function public.schedule_agenda_appointment(p_pending_id uuid, p_data jsonb)
returns public.agenda_items
language plpgsql security definer set search_path = public
as $$
declare
  target_workspace uuid;
  appointment public.agenda_items;
  appointment_date date;
  appointment_time time;
  uses_room boolean;
  room_name text;
begin
  if p_pending_id is not null then
    select workspace_id into target_workspace from public.agenda_items
    where id = p_pending_id and kind = 'pending' and status = 'active';
  else
    select workspace_id into target_workspace from public.workspace_members
    where user_id = auth.uid() order by created_at limit 1;
  end if;

  if target_workspace is null or not public.can_edit_workspace(target_workspace) then
    raise exception 'Sem permissão para alterar esta agenda.';
  end if;

  begin
    appointment_date := (p_data ->> 'data')::date;
    appointment_time := (p_data ->> 'horario')::time;
  exception when others then
    raise exception 'Data ou horário inválido.';
  end;
  if appointment_date is null or appointment_time < time '08:30' or appointment_time > time '17:00'
    or extract(minute from appointment_time)::integer not in (0, 30) then
    raise exception 'Horário fora da grade permitida.';
  end if;

  uses_room := coalesce((p_data ->> 'usaSala')::boolean, true);
  room_name := p_data ->> 'sala';
  if uses_room and room_name not in ('Sala 1', 'Sala 2', 'Sala 3') then
    raise exception 'Sala inválida.';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_workspace::text || appointment_date::text || appointment_time::text));

  if uses_room and exists (
    select 1 from public.agenda_items
    where workspace_id = target_workspace and kind = 'appointment' and status = 'active'
      and coalesce((data ->> 'usaSala')::boolean, true)
      and data ->> 'data' = appointment_date::text and data ->> 'horario' = to_char(appointment_time, 'HH24:MI')
      and data ->> 'sala' = room_name
  ) then
    raise exception 'A sala já está ocupada neste horário.';
  end if;

  if uses_room and (select count(*) from public.agenda_items
    where workspace_id = target_workspace and kind = 'appointment' and status = 'active'
      and coalesce((data ->> 'usaSala')::boolean, true)
      and data ->> 'data' = appointment_date::text and data ->> 'horario' = to_char(appointment_time, 'HH24:MI')) >= 3 then
    raise exception 'O horário já atingiu o limite de três salas.';
  end if;

  insert into public.agenda_items (workspace_id, created_by, kind, status, data)
  values (target_workspace, auth.uid(), 'appointment', 'active', p_data - 'id')
  returning * into appointment;
  update public.agenda_items set data = jsonb_set(appointment.data, '{id}', to_jsonb(appointment.id::text)), updated_at = now()
  where id = appointment.id returning * into appointment;

  if p_pending_id is not null then
    update public.agenda_items set status = 'cancelled', updated_at = now()
    where id = p_pending_id and workspace_id = target_workspace;
  end if;
  return appointment;
end;
$$;

create or replace function public.cancel_agenda_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.agenda_items set status = 'cancelled', updated_at = now()
  where id = p_id and kind = 'appointment' and status = 'active'
    and public.can_edit_workspace(workspace_id);
  if not found then raise exception 'Agendamento não encontrado ou sem permissão.'; end if;
end;
$$;

create or replace function public.set_agenda_appointment_realized(p_id uuid, p_realized boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.agenda_items set status = case when p_realized then 'realized' else 'active' end, updated_at = now()
  where id = p_id and kind = 'appointment' and status in ('active', 'realized')
    and public.can_edit_workspace(workspace_id);
  if not found then raise exception 'Agendamento não encontrado ou sem permissão.'; end if;
end;
$$;

revoke execute on function public.schedule_agenda_appointment(uuid, jsonb), public.cancel_agenda_appointment(uuid), public.set_agenda_appointment_realized(uuid, boolean) from public, anon;
grant execute on function public.schedule_agenda_appointment(uuid, jsonb), public.cancel_agenda_appointment(uuid), public.set_agenda_appointment_realized(uuid, boolean) to authenticated;
