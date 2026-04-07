alter table public.user_documents
  alter column payload drop not null;

insert into storage.buckets (id, name, public)
values ('document-payloads', 'document-payloads', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can view own document payloads" on storage.objects;
create policy "Users can view own document payloads"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'document-payloads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own document payloads" on storage.objects;
create policy "Users can upload own document payloads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'document-payloads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own document payloads" on storage.objects;
create policy "Users can update own document payloads"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'document-payloads'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'document-payloads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own document payloads" on storage.objects;
create policy "Users can delete own document payloads"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'document-payloads'
  and auth.uid()::text = (storage.foldername(name))[1]
);