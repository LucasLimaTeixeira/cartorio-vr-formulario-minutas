-- Alterações de contrato, recursos e equipe chegam em tempo real aos usuários e ao Super Admin.
do $$
declare target text;
begin
  foreach target in array array['workspace_subscriptions', 'workspace_members', 'workspaces'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = target) then
      execute format('alter publication supabase_realtime add table public.%I', target);
    end if;
  end loop;
end;
$$;

-- Sem REPLICA IDENTITY FULL o Realtime não informa workspace_id/user_id em exclusões de membros.
alter table public.workspace_members replica identity full;

-- O Realtime respeita RLS: o Super Admin precisa de leitura direta para receber os eventos.
drop policy if exists "system admins can read workspaces" on public.workspaces;
create policy "system admins can read workspaces" on public.workspaces for select using (public.is_system_admin());
drop policy if exists "system admins can read memberships" on public.workspace_members;
create policy "system admins can read memberships" on public.workspace_members for select using (public.is_system_admin());
drop policy if exists "system admins can read subscriptions" on public.workspace_subscriptions;
create policy "system admins can read subscriptions" on public.workspace_subscriptions for select using (public.is_system_admin());

-- Recurso desabilitado também bloqueia o salvamento do rascunho no servidor, não só o menu.
create or replace function public.form_type_feature(form_type text)
returns text language sql immutable set search_path = public
as $$ select case form_type
  when 'procuracao' then 'procuracao'
  when 'apostilamento' then 'apostilamento'
  when 'certidao' then 'certidoes'
  when 'uniao-estavel' then 'uniao_estavel'
  when 'pacto-antenupcial' then 'pacto_antenupcial'
  else 'outros' end; $$;

drop policy if exists "editors can create drafts" on public.form_drafts;
drop policy if exists "editors can update drafts" on public.form_drafts;
create policy "editors can create drafts" on public.form_drafts for insert
with check (public.can_edit_workspace(workspace_id) and created_by = auth.uid()
  and public.workspace_has_feature(workspace_id, public.form_type_feature(form_type)));
create policy "editors can update drafts" on public.form_drafts for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id) and public.workspace_has_feature(workspace_id, public.form_type_feature(form_type)));

revoke all on function public.form_type_feature(text) from public, anon;
grant execute on function public.form_type_feature(text) to authenticated;
