-- Funções usadas exclusivamente por triggers nunca devem ficar expostas como RPC.
-- Triggers são executados pelo banco e não dependem de EXECUTE concedido ao cliente.
revoke all on function public.create_owner_membership() from public, anon, authenticated;
revoke all on function public.create_profile_for_user() from public, anon, authenticated;
revoke all on function public.create_workspace_saas_records() from public, anon, authenticated;
revoke all on function public.audit_agenda_item_change() from public, anon, authenticated;
