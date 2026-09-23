-- A auditoria da agenda registrava exclusões como "updated" e impedia apagar um cartório com
-- itens na agenda: o evento apontava para um workspace que já estava sendo removido.
alter table public.audit_events drop constraint if exists audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check
  check (action in ('created', 'updated', 'cancelled', 'realized', 'deleted'));

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
  if tg_op = 'DELETE' then
    -- Exclusão em cascata do cartório: não há mais onde registrar o evento.
    if not exists (select 1 from public.workspaces where id = event_workspace) then return old; end if;
    event_action := 'deleted';
  elsif tg_op = 'INSERT' then event_action := 'created';
  elsif new.status = 'cancelled' then event_action := 'cancelled';
  elsif new.status = 'realized' then event_action := 'realized';
  else event_action := 'updated'; end if;
  insert into public.audit_events (workspace_id, actor_id, entity, entity_id, action, metadata)
  values (event_workspace, auth.uid(), 'agenda_item', event_id, event_action,
    jsonb_build_object('kind', coalesce(new.kind, old.kind), 'status', coalesce(new.status, old.status)));
  return coalesce(new, old);
end;
$$;
revoke all on function public.audit_agenda_item_change() from public, anon, authenticated;
