-- UC CONTRACTS — Row Level Security
-- Garante que RH não veja dados financeiros, Financeiro não veja dados de RH,
-- e que o público só possa criar registros (nunca ler dados de outros contratados).

alter table companies enable row level security;
alter table contracted_parties enable row level security;
alter table legal_representatives enable row level security;
alter table documents enable row level security;
alter table contract_requests enable row level security;
alter table hr_details enable row level security;
alter table finance_details enable row level security;
alter table legal_reviews enable row level security;
alter table generated_contracts enable row level security;
alter table contract_templates enable row level security;
alter table contract_template_versions enable row level security;
alter table audit_log enable row level security;

-- Função auxiliar: usuário possui um papel específico (em qualquer empresa ou empresa alvo)
create or replace function has_role(target_company uuid, role_name text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
      and (target_company is null or ur.company_id = target_company or r.name = 'master_admin')
  );
$$;

-- Leitura pública: apenas para permitir o formulário externo montar a UI (nome/branding da empresa)
create policy "public_read_companies"
  on companies for select
  using (active = true);

-- Inserção pública em contracted_parties (o link externo cria o cadastro, sem login)
create policy "public_insert_contracted_parties"
  on contracted_parties for insert
  with check (true);

-- Leitura de contracted_parties: apenas usuários internos autenticados com papel na empresa
create policy "internal_read_contracted_parties"
  on contracted_parties for select
  using (
    has_role(company_id, 'master_admin') or
    has_role(company_id, 'legal') or
    has_role(company_id, 'hr') or
    has_role(company_id, 'finance') or
    has_role(company_id, 'manager') or
    has_role(company_id, 'internal_client')
  );

create policy "internal_update_contracted_parties"
  on contracted_parties for update
  using (has_role(company_id, 'master_admin') or has_role(company_id, 'legal'));

-- Documentos: upload público permitido (associado ao cadastro recém-criado), leitura restrita
create policy "public_insert_documents"
  on documents for insert
  with check (true);

create policy "internal_read_documents"
  on documents for select
  using (
    exists (
      select 1 from contracted_parties cp
      where cp.id = documents.contracted_party_id
        and (
          has_role(cp.company_id, 'master_admin') or
          has_role(cp.company_id, 'legal') or
          has_role(cp.company_id, 'hr') or
          has_role(cp.company_id, 'finance')
        )
    )
  );

-- RH só enxerga hr_details da própria empresa; Financeiro nunca enxerga hr_details
create policy "hr_manage_hr_details"
  on hr_details for all
  using (
    exists (
      select 1 from contract_requests cr
      where cr.id = hr_details.contract_request_id
        and (has_role(cr.company_id, 'hr') or has_role(cr.company_id, 'master_admin') or has_role(cr.company_id, 'legal'))
    )
  );

-- Financeiro só enxerga finance_details da própria empresa; RH nunca enxerga finance_details
create policy "finance_manage_finance_details"
  on finance_details for all
  using (
    exists (
      select 1 from contract_requests cr
      where cr.id = finance_details.contract_request_id
        and (has_role(cr.company_id, 'finance') or has_role(cr.company_id, 'master_admin') or has_role(cr.company_id, 'legal'))
    )
  );

-- Jurídico: acesso total de leitura/edição a contract_requests, legal_reviews, templates
create policy "legal_full_access_requests"
  on contract_requests for all
  using (
    has_role(company_id, 'legal') or
    has_role(company_id, 'master_admin') or
    has_role(company_id, 'hr') or
    has_role(company_id, 'finance') or
    has_role(company_id, 'manager')
  );

create policy "legal_manage_reviews"
  on legal_reviews for all
  using (
    exists (
      select 1 from contract_requests cr
      where cr.id = legal_reviews.contract_request_id
        and (has_role(cr.company_id, 'legal') or has_role(cr.company_id, 'master_admin'))
    )
  );

-- Templates: somente Jurídico e Master Admin podem gerenciar; leitura ampla para uso na geração
create policy "read_templates"
  on contract_templates for select
  using (true);

create policy "manage_templates"
  on contract_templates for all
  using (has_role(null, 'legal') or has_role(null, 'master_admin'));

create policy "read_template_versions"
  on contract_template_versions for select
  using (true);

create policy "manage_template_versions"
  on contract_template_versions for all
  using (has_role(null, 'legal') or has_role(null, 'master_admin'));

-- Contratos gerados: leitura para todos os papéis internos da empresa
create policy "read_generated_contracts"
  on generated_contracts for select
  using (
    exists (
      select 1 from contract_requests cr
      where cr.id = generated_contracts.contract_request_id
        and (
          has_role(cr.company_id, 'master_admin') or
          has_role(cr.company_id, 'legal') or
          has_role(cr.company_id, 'hr') or
          has_role(cr.company_id, 'finance') or
          has_role(cr.company_id, 'manager')
        )
    )
  );

create policy "legal_manage_generated_contracts"
  on generated_contracts for insert
  with check (has_role(null, 'legal') or has_role(null, 'master_admin'));

-- Auditoria: somente inserção via triggers/Edge Functions; leitura restrita ao Master Admin
create policy "insert_audit_log"
  on audit_log for insert
  with check (true);

create policy "master_read_audit_log"
  on audit_log for select
  using (has_role(null, 'master_admin'));
