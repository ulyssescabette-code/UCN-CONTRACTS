# UC Contracts

Sistema inteligente de gestão contratual, coleta automatizada de dados e geração de contratos —
Ulysses Cabette Advogados.

O projeto roda em dois modos, automaticamente:
- **Modo demo** (sem configurar nada): dados no `localStorage`, útil para testar o fluxo rapidamente.
- **Modo real** (com Supabase configurado): dados no Postgres, autenticação real, upload de
  documentos, geração de PDF e envio de e-mail de verdade.

---

## Colocando o sistema real no ar — passo a passo

### 1. Pré-requisitos locais
- Node.js 18 ou superior instalado (`node -v`)
- Descompacte este projeto em uma pasta

### 2. Criar o projeto no Supabase
1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.
2. Anote a **senha do banco** que você definir (vai precisar dela para a CLI, se usar).

### 3. Rodar as migrações (cria todas as tabelas, RLS, buckets e os 7 modelos de contrato)
No painel do Supabase, vá em **SQL Editor** e rode, **nesta ordem exata**, o conteúdo de cada
arquivo em `supabase/migrations/`:

1. `0001_init_schema.sql` — cria as tabelas (empresas, contratados, pipeline, RBAC, auditoria)
2. `0002_rls_policies.sql` — ativa as políticas de segurança por papel/empresa
3. `0003_storage.sql` — cria os buckets `documents` e `contracts` e suas permissões
4. `0004_template_seed.sql` — adiciona os 7 modelos de contrato já prontos para uso

### 4. Configurar o frontend
Em **Project Settings → API**, copie a "Project URL" e a "anon public key". Crie um arquivo
`.env` na raiz do projeto:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Depois:
```bash
npm install
npm run dev
```
A partir daqui o site já está em modo real (você vai ver a tela de login pedir e-mail/senha
em vez do seletor de papel).

### 5. Criar os usuários internos (RH, Financeiro, Jurídico, Master Admin)
1. No painel do Supabase, vá em **Authentication → Users → Invite user** e convide cada pessoa
   pelo e-mail corporativo (ela recebe um e-mail para definir a senha).
2. Depois de convidada, abra `supabase/seed/assign_role.sql`, edite o e-mail/papel/empresa no
   topo do arquivo e rode no **SQL Editor** — isso atribui o papel (RH, Financeiro, Jurídico,
   Gestor ou Master Admin) à pessoa. Repita para cada usuário.

### 6. Publicar as Edge Functions (geração de PDF e envio de e-mail)
Isso precisa da [Supabase CLI](https://supabase.com/docs/guides/cli) instalada na sua máquina:

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU-PROJECT-REF
supabase functions deploy generate-contract
supabase functions deploy send-contract
```

### 7. (Opcional, mas recomendado) Configurar envio de e-mail real
A função `send-contract` usa o [Resend](https://resend.com) (tem plano gratuito):
1. Crie uma conta no Resend e verifique um domínio ou use o domínio de teste deles.
2. Configure o secret no Supabase:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   ```
3. Edite a linha `from: 'UC Contracts <contratos@ucnadv.com>'` dentro de
   `supabase/functions/send-contract/index.ts` para usar o remetente verificado no seu Resend,
   e rode `supabase functions deploy send-contract` novamente.

Sem essa configuração, o sistema continua funcionando normalmente — só não dispara o e-mail de
verdade (o registro de envio e a mudança de status acontecem do mesmo jeito).

### 8. Testar
- Acesse `/novo/multicorp` (ou qualquer outro slug de empresa) e envie um cadastro de teste.
- Entre em `/interno` com um usuário RH, depois Financeiro, depois Jurídico, seguindo o pipeline.
- Em **Modelos & Geração**, gere o contrato — o PDF real é criado e salvo no bucket `contracts`.
- Clique em **Enviar** para dispará-lo (por e-mail, se o Resend estiver configurado).

---

## Estrutura do projeto

```
src/
  lib/supabaseClient.js     → cliente Supabase + detecção automática de modo demo/real
  lib/dataStore.demo.js     → camada de dados em localStorage (modo demo)
  lib/dataStore.supabase.js → camada de dados real (Postgres + Storage + Edge Functions)
  lib/dataStore.js          → escolhe automaticamente qual das duas usar
  contexts/AuthContext.jsx  → autenticação (Supabase Auth real, ou seletor de papel em demo)
  pages/PublicFormPage.jsx  → formulário público inteligente PF/PJ
  pages/internal/           → Painel, detalhe do pipeline, gerador de contratos, auditoria
supabase/
  migrations/               → schema, RLS, storage e seed dos modelos de contrato (rodar em ordem)
  functions/generate-contract/ → Edge Function que gera o PDF e versiona o contrato
  functions/send-contract/     → Edge Function que envia o contrato por e-mail
  seed/assign_role.sql         → script para atribuir papel a um usuário convidado
```

## Limitações conhecidas deste MVP (próximos incrementos)

- O PDF gerado hoje é texto simples (via `pdf-lib`), sem a formatação visual completa do HTML.
  Para um PDF com o layout exato, trocar essa etapa por um renderizador HTML→PDF
  (ex: Gotenberg, Browserless, ou uma API como PDFShift) — a interface da função já está pronta
  para essa troca.
- Assinatura eletrônica (Clicksign/DocuSign/GOV.BR) ainda não integrada.
- Motor de notificações automáticas por atraso ainda não implementado.
- Comparação lado a lado entre versões de contrato ainda não implementada.
- Biblioteca de cláusulas reutilizáveis no editor de templates ainda não implementada.
- Integração com UC 360 ainda não implementada.
- Pesquisa global (nome, CPF, CNPJ, empresa, CRM/OAB etc.) ainda não implementada.

Consulte também `UC_CONTRACTS_ARQUITETURA.md` (documento de arquitetura completo, entregue
separadamente) para o detalhamento total do modelo de dados e das decisões de design.
