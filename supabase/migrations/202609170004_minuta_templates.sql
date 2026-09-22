alter table public.form_drafts drop constraint if exists form_drafts_form_type_check;
alter table public.form_drafts add constraint form_drafts_form_type_check check (form_type in ('procuracao', 'apostilamento', 'certidao', 'uniao-estavel', 'pacto-antenupcial', 'minuta-template'));
