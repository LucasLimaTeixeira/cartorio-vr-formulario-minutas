-- Lista de contas para a tela do Super Admin. Senhas nunca são expostas pelo banco.
create or replace function public.list_admin_users()
returns table (id uuid, nome text, email text, cargo text, cartorio text, papel text)
language sql stable security definer set search_path = public
as $$
  select p.id,
    coalesce(p.full_name, 'Sem nome'),
    coalesce(p.email, ''),
    coalesce(p.cargo, ''),
    coalesce(w.name, 'Sem cartório'),
    coalesce(wm.role, case when sa.user_id is not null then 'super_admin' else 'sem vínculo' end)
  from public.profiles p
  left join public.workspace_members wm on wm.user_id = p.id
  left join public.workspaces w on w.id = wm.workspace_id
  left join public.system_admins sa on sa.user_id = p.id
  where public.is_system_admin()
  order by p.full_name, p.email;
$$;

revoke all on function public.list_admin_users() from public, anon;
grant execute on function public.list_admin_users() to authenticated;
