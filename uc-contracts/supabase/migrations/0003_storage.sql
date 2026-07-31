-- UC CONTRACTS — Storage
-- Buckets: "documents" (uploads do contratado) e "contracts" (PDFs gerados)

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

-- Upload público de documentos (o formulário externo não exige login)
create policy "public_upload_documents"
  on storage.objects for insert
  with check (bucket_id = 'documents');

-- Leitura de documentos: apenas usuários internos autenticados
create policy "internal_read_documents_bucket"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

-- Contratos gerados: apenas a service role (Edge Functions) grava;
-- leitura liberada para usuários internos autenticados
create policy "internal_read_contracts_bucket"
  on storage.objects for select
  using (bucket_id = 'contracts' and auth.role() = 'authenticated');

create policy "service_write_contracts_bucket"
  on storage.objects for insert
  with check (bucket_id = 'contracts' and auth.role() = 'service_role');
