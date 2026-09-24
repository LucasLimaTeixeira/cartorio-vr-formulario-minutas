-- Um rascunho por atendimento. Antes havia um único rascunho por cartório e tipo de formulário:
-- dois atendentes preenchendo ao mesmo tempo sobrescreviam os dados um do outro.
do $$
declare target text;
begin
  for target in select conname from pg_constraint where conrelid = 'public.form_drafts'::regclass and contype = 'u' loop
    execute format('alter table public.form_drafts drop constraint %I', target);
  end loop;
end;
$$;

alter table public.form_drafts
  add column if not exists title text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.form_drafts alter column created_by set default auth.uid();
alter table public.form_drafts drop constraint if exists form_drafts_title_size;
alter table public.form_drafts add constraint form_drafts_title_size check (char_length(title) <= 300) not valid;
create index if not exists form_drafts_workspace_type_idx on public.form_drafts (workspace_id, form_type, updated_at desc);

-- Rascunhos existentes passam a aparecer na lista de atendimentos com o nome do cliente.
update public.form_drafts set title = left(coalesce(case form_type
    when 'procuracao' then coalesce(nullif(trim(data -> 'outorgantes' -> 0 ->> 'nome'), ''), trim(data -> 'outorgados' -> 0 ->> 'nome'))
    when 'apostilamento' then trim(data -> 'requerentes' -> 0 ->> 'nome')
    when 'certidao' then trim(data -> 'requerentes' -> 0 ->> 'nome')
    when 'uniao-estavel' then (select string_agg(nullif(trim(p ->> 'nome'), ''), ' e ') from jsonb_array_elements(coalesce(data -> 'companheiros', '[]'::jsonb)) p)
    when 'pacto-antenupcial' then (select string_agg(nullif(trim(p ->> 'nome'), ''), ' e ') from jsonb_array_elements(coalesce(data -> 'nubentes', '[]'::jsonb)) p)
  end, ''), 300)
where title = '';

-- Data e autor da alteração vêm do banco; cartório, criador e data de criação não mudam.
create or replace function public.touch_form_draft()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.workspace_id := old.workspace_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists touch_form_draft on public.form_drafts;
create trigger touch_form_draft before insert or update on public.form_drafts
for each row execute function public.touch_form_draft();
revoke all on function public.touch_form_draft() from public, anon, authenticated;

-- Encerrar um atendimento apaga o rascunho e os dados pessoais preenchidos.
drop policy if exists "editors can delete drafts" on public.form_drafts;
create policy "editors can delete drafts" on public.form_drafts for delete using (public.can_edit_workspace(workspace_id));
grant delete on public.form_drafts to authenticated;
