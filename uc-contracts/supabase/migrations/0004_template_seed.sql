-- UC CONTRACTS — Corpo do template versionado (armazenado como HTML com placeholders)
-- Simplificação de MVP: o texto fica direto no banco (coluna body_html), em vez de
-- exigir upload de um arquivo .docx para cada versão. O campo file_path continua
-- disponível em contract_template_versions para quando o Jurídico quiser anexar
-- a matriz original em Word/PDF como referência.

alter table contract_template_versions
  add column if not exists body_html text;

alter table contract_template_versions
  alter column file_path drop not null;

-- Seed: 7 modelos de contrato, cada um com sua primeira versão ativa
do $$
declare
  tpl_id uuid;
begin
  -- Contrato Médico
  insert into contract_templates (name, description) values ('Contrato Médico', 'Prestação de serviços médicos') returning id into tpl_id;
  insert into contract_template_versions (template_id, version_number, is_active, variables_schema, body_html)
  values (tpl_id, 1, true, '["NOME","CPF","CRM","ESPECIALIDADE","EMPRESA","REMUNERACAO","DATA_INICIO","OBJETO"]',
    '<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS MÉDICOS</h2><p><strong>{{EMPRESA}}</strong> contrata o(a) profissional <strong>{{NOME}}</strong>, CPF {{CPF}}, CRM {{CRM}}, especialidade {{ESPECIALIDADE}}.</p><p><strong>Objeto:</strong> {{OBJETO}}</p><p><strong>Remuneração:</strong> {{REMUNERACAO}}</p><p><strong>Início:</strong> {{DATA_INICIO}}</p>');

  -- Contrato PJ Interno
  insert into contract_templates (name, description) values ('Contrato PJ Interno', 'Prestação de serviços PJ interno') returning id into tpl_id;
  insert into contract_template_versions (template_id, version_number, is_active, variables_schema, body_html)
  values (tpl_id, 1, true, '["NOME","CNPJ","EMPRESA","OBJETO","VALOR","DATA_INICIO"]',
    '<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS — PJ INTERNO</h2><p><strong>{{EMPRESA}}</strong> contrata <strong>{{NOME}}</strong>, CNPJ {{CNPJ}}.</p><p><strong>Objeto:</strong> {{OBJETO}}</p><p><strong>Valor:</strong> {{VALOR}}</p><p><strong>Início:</strong> {{DATA_INICIO}}</p>');

  -- Contrato PJ Externo
  insert into contract_templates (name, description) values ('Contrato PJ Externo', 'Prestação de serviços PJ externo') returning id into tpl_id;
  insert into contract_template_versions (template_id, version_number, is_active, variables_schema, body_html)
  values (tpl_id, 1, true, '["NOME","CNPJ","EMPRESA","OBJETO","VALOR","DATA_INICIO"]',
    '<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS — PJ EXTERNO</h2><p><strong>{{EMPRESA}}</strong> contrata externamente <strong>{{NOME}}</strong>, CNPJ {{CNPJ}}.</p><p><strong>Objeto:</strong> {{OBJETO}}</p><p><strong>Valor:</strong> {{VALOR}}</p><p><strong>Início:</strong> {{DATA_INICIO}}</p>');

  -- Contrato Multi Canaã
  insert into contract_templates (name, description) values ('Contrato Multi Canaã', 'Modalidade Multi Canaã') returning id into tpl_id;
  insert into contract_template_versions (template_id, version_number, is_active, variables_schema, body_html)
  values (tpl_id, 1, true, '["NOME","CPF","EMPRESA","OBJETO","REMUNERACAO","DATA_INICIO"]',
    '<h2>CONTRATO — MULTI CANAÃ</h2><p>{{EMPRESA}} contrata {{NOME}} ({{CPF}}). Objeto: {{OBJETO}}. Remuneração: {{REMUNERACAO}}. Início: {{DATA_INICIO}}.</p>');

  -- Contrato Multi Barcarena
  insert into contract_templates (name, description) values ('Contrato Multi Barcarena', 'Modalidade Multi Barcarena') returning id into tpl_id;
  insert into contract_template_versions (template_id, version_number, is_active, variables_schema, body_html)
  values (tpl_id, 1, true, '["NOME","CPF","EMPRESA","OBJETO","REMUNERACAO","DATA_INICIO"]',
    '<h2>CONTRATO — MULTI BARCARENA</h2><p>{{EMPRESA}} contrata {{NOME}} ({{CPF}}). Objeto: {{OBJETO}}. Remuneração: {{REMUNERACAO}}. Início: {{DATA_INICIO}}.</p>');

  -- Contrato Multi Acará
  insert into contract_templates (name, description) values ('Contrato Multi Acará', 'Modalidade Multi Acará') returning id into tpl_id;
  insert into contract_template_versions (template_id, version_number, is_active, variables_schema, body_html)
  values (tpl_id, 1, true, '["NOME","CPF","EMPRESA","OBJETO","REMUNERACAO","DATA_INICIO"]',
    '<h2>CONTRATO — MULTI ACARÁ</h2><p>{{EMPRESA}} contrata {{NOME}} ({{CPF}}). Objeto: {{OBJETO}}. Remuneração: {{REMUNERACAO}}. Início: {{DATA_INICIO}}.</p>');

  -- Contrato Avulso
  insert into contract_templates (name, description) values ('Contrato Avulso', 'Contratação avulsa') returning id into tpl_id;
  insert into contract_template_versions (template_id, version_number, is_active, variables_schema, body_html)
  values (tpl_id, 1, true, '["NOME","EMPRESA","OBJETO","VALOR","DATA_INICIO"]',
    '<h2>CONTRATO AVULSO</h2><p>{{EMPRESA}} contrata {{NOME}}. Objeto: {{OBJETO}}. Valor: {{VALOR}}. Início: {{DATA_INICIO}}.</p>');
end $$;
