-- Correções da auditoria de segurança de 23/09/2026.

-- [T15] Dono não pode mais inserir qualquer usuário no cartório pela API (sem convite e sem limite).
-- Entrada de membros acontece só por join_workspace (convite) ou pela Edge Function do Super Admin.
drop policy if exists "owners can add non-owner members" on public.workspace_members;

-- [T01/T02] Cartório novo sempre nasce em avaliação e cada conta pertence a um único cartório.
create or replace function public.enforce_workspace_creation()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.plan := 'trial';
  if exists (select 1 from public.workspace_members where user_id = new.owner_id) then
    raise exception 'Esta conta já pertence a um cartório.';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_workspace_creation on public.workspaces;
create trigger enforce_workspace_creation before insert on public.workspaces
for each row execute function public.enforce_workspace_creation();
revoke all on function public.enforce_workspace_creation() from public, anon, authenticated;

-- Convite respeita o limite de usuários contratado.
create or replace function public.join_workspace(invite_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare invitation public.workspace_invites%rowtype; user_limit integer;
begin
  select * into invitation from public.workspace_invites
  where code = upper(trim(invite_code)) and used_at is null and expires_at > now() for update;
  if invitation.id is null then raise exception 'Convite inválido, usado ou expirado.'; end if;
  if exists (select 1 from public.workspace_members where user_id = auth.uid()) then raise exception 'Esta conta já pertence a um workspace.'; end if;
  select coalesce(max_users, 5) into user_limit from public.workspace_subscriptions where workspace_id = invitation.workspace_id for update;
  if (select count(*) from public.workspace_members where workspace_id = invitation.workspace_id) >= coalesce(user_limit, 5) then
    raise exception 'Este cartório atingiu o limite de usuários do plano.';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (invitation.workspace_id, auth.uid(), invitation.role);
  update public.workspace_invites set used_at = now(), used_by = auth.uid() where id = invitation.id;
  return invitation.workspace_id;
end;
$$;

-- [T14] Usuário só altera o próprio nome. E-mail, CPF e cargo vêm do cadastro feito pelo Super Admin.
revoke update on public.profiles from authenticated;
grant update (full_name, updated_at) on public.profiles to authenticated;

-- [T16] Pela tabela só se gerenciam clientes aguardando horário; agendamentos passam pelas
-- funções que validam grade, sala e lotação. Agenda desabilitada também bloqueia escrita.
drop policy if exists "editors can create agenda" on public.agenda_items;
drop policy if exists "editors can update agenda" on public.agenda_items;
drop policy if exists "editors can delete agenda" on public.agenda_items;
create policy "editors can create agenda" on public.agenda_items for insert
with check (kind = 'pending' and created_by = auth.uid() and public.can_edit_workspace(workspace_id) and public.workspace_has_feature(workspace_id, 'agenda'));
create policy "editors can update agenda" on public.agenda_items for update
using (kind = 'pending' and public.can_edit_workspace(workspace_id))
with check (kind = 'pending' and public.can_edit_workspace(workspace_id) and public.workspace_has_feature(workspace_id, 'agenda'));
create policy "editors can delete agenda" on public.agenda_items for delete
using (kind = 'pending' and public.can_edit_workspace(workspace_id) and public.workspace_has_feature(workspace_id, 'agenda'));

-- [T17] Limites de tamanho contra abuso de armazenamento (maior rascunho real hoje: ~34 KB).
alter table public.form_drafts drop constraint if exists form_drafts_data_size;
alter table public.form_drafts add constraint form_drafts_data_size check (pg_column_size(data) <= 524288) not valid;
alter table public.agenda_items drop constraint if exists agenda_items_data_size;
alter table public.agenda_items add constraint agenda_items_data_size check (pg_column_size(data) <= 16384) not valid;
alter table public.workspaces drop constraint if exists workspaces_text_size;
alter table public.workspaces add constraint workspaces_text_size
  check (char_length(name) between 1 and 160 and char_length(endereco) <= 300 and char_length(cidade) <= 120 and char_length(tabeliao) <= 160) not valid;

-- Modelos de minuta servem a todos os formulários e não dependem de um recurso específico.
create or replace function public.form_type_feature(form_type text)
returns text language sql immutable set search_path = public
as $$ select case form_type
  when 'procuracao' then 'procuracao'
  when 'apostilamento' then 'apostilamento'
  when 'certidao' then 'certidoes'
  when 'uniao-estavel' then 'uniao_estavel'
  when 'pacto-antenupcial' then 'pacto_antenupcial'
  else null end; $$;
drop policy if exists "editors can create drafts" on public.form_drafts;
drop policy if exists "editors can update drafts" on public.form_drafts;
create policy "editors can create drafts" on public.form_drafts for insert
with check (public.can_edit_workspace(workspace_id) and created_by = auth.uid()
  and (public.form_type_feature(form_type) is null or public.workspace_has_feature(workspace_id, public.form_type_feature(form_type))));
create policy "editors can update drafts" on public.form_drafts for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id)
  and (public.form_type_feature(form_type) is null or public.workspace_has_feature(workspace_id, public.form_type_feature(form_type))));

-- Defesa em profundidade: visitante anônimo não precisa de nenhuma tabela, e TRUNCATE ignora RLS.
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;
revoke execute on function public.is_workspace_member(uuid), public.is_workspace_admin(uuid),
  public.can_edit_workspace(uuid), public.workspace_is_writable(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid), public.is_workspace_admin(uuid),
  public.can_edit_workspace(uuid), public.workspace_is_writable(uuid) to authenticated;
