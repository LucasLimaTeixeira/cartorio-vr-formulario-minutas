-- Modelos de minuta do sistema: todos os usuários autenticados leem, só o Super Admin altera.
-- Sem linha para um tipo, o app usa o texto original definido no código.
create table if not exists public.minuta_templates (
  tipo text primary key check (tipo in ('procuracao', 'apostilamento', 'certidoes', 'uniao_estavel', 'pacto_antenupcial', 'textos')),
  modelo jsonb not null check (jsonb_typeof(modelo) = 'object' and pg_column_size(modelo) <= 262144),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function public.touch_minuta_template()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists touch_minuta_template on public.minuta_templates;
create trigger touch_minuta_template before insert or update on public.minuta_templates
for each row execute function public.touch_minuta_template();
revoke all on function public.touch_minuta_template() from public, anon, authenticated;

alter table public.minuta_templates enable row level security;
drop policy if exists "authenticated can read minuta templates" on public.minuta_templates;
create policy "authenticated can read minuta templates" on public.minuta_templates for select to authenticated using (true);
drop policy if exists "system admins can create minuta templates" on public.minuta_templates;
create policy "system admins can create minuta templates" on public.minuta_templates for insert to authenticated with check (public.is_system_admin());
drop policy if exists "system admins can update minuta templates" on public.minuta_templates;
create policy "system admins can update minuta templates" on public.minuta_templates for update to authenticated
using (public.is_system_admin()) with check (public.is_system_admin());
drop policy if exists "system admins can delete minuta templates" on public.minuta_templates;
create policy "system admins can delete minuta templates" on public.minuta_templates for delete to authenticated using (public.is_system_admin());

revoke all on public.minuta_templates from anon, authenticated;
grant select, insert, update, delete on public.minuta_templates to authenticated;
