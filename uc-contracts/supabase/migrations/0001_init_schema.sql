-- UC CONTRACTS — Schema inicial
-- Fase 1 da arquitetura: empresas, contratados, pipeline, templates, RBAC, auditoria

create extension if not exists "pgcrypto";

-- ===================== EMPRESAS / TENANTS =====================
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  brand_logo_url text,
  brand_primary_color text default '#101B2D',
  brand_secondary_color text default '#A67C42',
  active boolean default true,
  created_at timestamptz default now()
);

create table company_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  public_token text unique not null,
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ===================== CONTRATADOS (PF / PJ) =====================
create table contracted_parties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  party_type text check (party_type in ('PF','PJ')) not null,

  email text,
  phone text,
  whatsapp text,
  address_street text,
  address_number text,
  address_complement text,
  cep text,
  city text,
  state text,
  bank_name text,
  bank_agency text,
  bank_account text,
  pix_key text,

  full_name text,
  cpf text,
  rg text,
  rg_issuer text,
  marital_status text,
  birth_date date,
  profession text,
  nationality text,
  pis text,
  cnh text,
  professional_council text,
  council_number text,
  specialty text,

  company_name text,
  trade_name text,
  cnpj text,
  state_registration text,
  municipal_registration text,
  corporate_purpose text,

  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table legal_representatives (
  id uuid primary key default gen_random_uuid(),
  contracted_party_id uuid references contracted_parties(id) on delete cascade,
  full_name text,
  cpf text,
  rg text,
  marital_status text,
  profession text,
  position text,
  phone text,
  email text,
  address text
);

-- ===================== DOCUMENTOS =====================
create table documents (
  id uuid primary key default gen_random_uuid(),
  contracted_party_id uuid references contracted_parties(id) on delete cascade,
  document_type text not null,
  file_path text not null,
  file_name text,
  mime_type text,
  uploaded_by uuid,
  uploaded_at timestamptz default now()
);

-- ===================== PIPELINE =====================
create table contract_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  contracted_party_id uuid references contracted_parties(id),
  contract_type text not null,
  current_stage text default 'registration',
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table hr_details (
  id uuid primary key default gen_random_uuid(),
  contract_request_id uuid unique references contract_requests(id) on delete cascade,
  position text,
  role_function text,
  activities_description text,
  workload text,
  work_schedule text,
  work_location text,
  compensation numeric,
  benefits text,
  start_date date,
  expected_date date,
  cost_center text,
  manager_name text,
  notes text,
  filled_by uuid,
  filled_at timestamptz
);

create table finance_details (
  id uuid primary key default gen_random_uuid(),
  contract_request_id uuid unique references contract_requests(id) on delete cascade,
  contracted_value numeric,
  payment_method text,
  periodicity text,
  cost_center text,
  nature text,
  accounting_account text,
  contracting_type text,
  withholdings text,
  taxation text,
  notes text,
  filled_by uuid,
  filled_at timestamptz
);

create table legal_reviews (
  id uuid primary key default gen_random_uuid(),
  contract_request_id uuid references contract_requests(id) on delete cascade,
  reviewed_by uuid,
  decision text check (decision in ('approved','rejected','correction_requested')),
  comments text,
  reviewed_at timestamptz default now()
);

-- ===================== TEMPLATES =====================
create table contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_master boolean default true,
  created_at timestamptz default now()
);

create table contract_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references contract_templates(id) on delete cascade,
  version_number int not null,
  file_path text not null,
  variables_schema jsonb,
  created_by uuid,
  is_active boolean default false,
  created_at timestamptz default now()
);

create table contract_clauses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text,
  reusable boolean default true,
  created_at timestamptz default now()
);

-- ===================== CONTRATOS GERADOS =====================
create table generated_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_request_id uuid references contract_requests(id) on delete cascade,
  template_version_id uuid references contract_template_versions(id),
  version_number int not null,
  file_path text not null,
  generated_by uuid,
  generated_at timestamptz default now(),
  status text default 'draft'
);

create table amendments (
  id uuid primary key default gen_random_uuid(),
  generated_contract_id uuid references generated_contracts(id) on delete cascade,
  file_path text,
  reason text,
  created_by uuid,
  created_at timestamptz default now()
);

create table terminations (
  id uuid primary key default gen_random_uuid(),
  generated_contract_id uuid references generated_contracts(id) on delete cascade,
  file_path text,
  reason text,
  created_by uuid,
  created_at timestamptz default now()
);

create table contract_dispatches (
  id uuid primary key default gen_random_uuid(),
  generated_contract_id uuid references generated_contracts(id) on delete cascade,
  recipients text[],
  cc text[],
  bcc text[],
  message text,
  attachments text[],
  sent_by uuid,
  sent_at timestamptz default now()
);

-- ===================== RBAC =====================
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null
);

create table role_permissions (
  role_id uuid references roles(id) on delete cascade,
  permission_id uuid references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role_id uuid references roles(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  primary key (user_id, role_id, company_id)
);

-- ===================== AUDITORIA =====================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  performed_by uuid,
  ip_address text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Seed inicial de papéis
insert into roles (name) values
  ('master_admin'), ('legal'), ('hr'), ('finance'), ('manager'), ('internal_client'), ('viewer');

-- Seed inicial de empresas da holding
insert into companies (name, slug) values
  ('Multicorp', 'multicorp'),
  ('Tríade', 'triade'),
  ('Centro TEA', 'centro-tea'),
  ('RF', 'rf'),
  ('Holding', 'holding');
