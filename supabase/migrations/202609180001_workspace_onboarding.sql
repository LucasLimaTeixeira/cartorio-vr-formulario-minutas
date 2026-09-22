-- Dados do cartório no workspace e atualização pelo proprietário/admin.

alter table public.workspaces
  add column if not exists endereco text not null default '',
  add column if not exists cidade text not null default '',
  add column if not exists tabeliao text not null default '';

drop policy if exists "owners can update workspace" on public.workspaces;
drop policy if exists "admins can update workspace" on public.workspaces;
create policy "admins can update workspace" on public.workspaces
  for update
  using (owner_id = auth.uid() or public.is_workspace_admin(id))
  with check (owner_id = auth.uid() or public.is_workspace_admin(id));
