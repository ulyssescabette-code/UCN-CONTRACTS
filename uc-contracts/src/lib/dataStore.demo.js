// UC CONTRACTS — Camada de acesso a dados (MODO DEMO)
// Roda 100% local (localStorage), sem precisar configurar nada.
// Todas as funções são async para manter a mesma assinatura da versão real (dataStore.supabase.js).

// ---------------------------------------------------------------------------
// DEMO STORE (localStorage) — mesma "forma" de dados do schema Postgres real
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'uc_contracts_demo_v1';

const SEED = {
  companies: [
    { id: 'multicorp', name: 'Multicorp', slug: 'multicorp', brand_primary_color: '#101B2D', brand_secondary_color: '#A67C42' },
    { id: 'triade', name: 'Tríade', slug: 'triade', brand_primary_color: '#1B2A1F', brand_secondary_color: '#6E8B5E' },
    { id: 'centro-tea', name: 'Centro TEA', slug: 'centro-tea', brand_primary_color: '#20233B', brand_secondary_color: '#7C86C9' },
    { id: 'rf', name: 'RF', slug: 'rf', brand_primary_color: '#2B1B1F', brand_secondary_color: '#B0654F' },
    { id: 'holding', name: 'Holding', slug: 'holding', brand_primary_color: '#101B2D', brand_secondary_color: '#A67C42' }
  ],
  contractedParties: [],
  contractRequests: [],
  hrDetails: [],
  financeDetails: [],
  legalReviews: [],
  documents: [],
  templates: [
    {
      id: 'tpl-medico', name: 'Contrato Médico', is_master: true,
      variables: ['NOME', 'CPF', 'CRM', 'ESPECIALIDADE', 'EMPRESA', 'REMUNERACAO', 'DATA_INICIO', 'OBJETO'],
      body_html: `<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS MÉDICOS</h2>
<p>Pelo presente instrumento, <strong>{{EMPRESA}}</strong> contrata o(a) profissional <strong>{{NOME}}</strong>, portador(a) do CPF {{CPF}}, inscrito(a) no CRM sob o número {{CRM}}, especialidade {{ESPECIALIDADE}}.</p>
<p><strong>Objeto:</strong> {{OBJETO}}</p>
<p><strong>Remuneração:</strong> {{REMUNERACAO}}</p>
<p><strong>Início:</strong> {{DATA_INICIO}}</p>`
    },
    {
      id: 'tpl-pj-interno', name: 'Contrato PJ Interno', is_master: true,
      variables: ['NOME', 'CNPJ', 'EMPRESA', 'OBJETO', 'VALOR', 'DATA_INICIO'],
      body_html: `<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS — PJ INTERNO</h2>
<p><strong>{{EMPRESA}}</strong> contrata a pessoa jurídica <strong>{{NOME}}</strong>, CNPJ {{CNPJ}}.</p>
<p><strong>Objeto:</strong> {{OBJETO}}</p>
<p><strong>Valor:</strong> {{VALOR}}</p>
<p><strong>Início:</strong> {{DATA_INICIO}}</p>`
    },
    {
      id: 'tpl-pj-externo', name: 'Contrato PJ Externo', is_master: true,
      variables: ['NOME', 'CNPJ', 'EMPRESA', 'OBJETO', 'VALOR', 'DATA_INICIO'],
      body_html: `<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS — PJ EXTERNO</h2>
<p><strong>{{EMPRESA}}</strong> contrata externamente <strong>{{NOME}}</strong>, CNPJ {{CNPJ}}.</p>
<p><strong>Objeto:</strong> {{OBJETO}}</p>
<p><strong>Valor:</strong> {{VALOR}}</p>
<p><strong>Início:</strong> {{DATA_INICIO}}</p>`
    },
    {
      id: 'tpl-multi-canaa', name: 'Contrato Multi Canaã', is_master: true,
      variables: ['NOME', 'CPF', 'EMPRESA', 'OBJETO', 'REMUNERACAO', 'DATA_INICIO'],
      body_html: `<h2>CONTRATO — MULTI CANAÃ</h2><p>{{EMPRESA}} contrata {{NOME}} ({{CPF}}). Objeto: {{OBJETO}}. Remuneração: {{REMUNERACAO}}. Início: {{DATA_INICIO}}.</p>`
    },
    {
      id: 'tpl-multi-barcarena', name: 'Contrato Multi Barcarena', is_master: true,
      variables: ['NOME', 'CPF', 'EMPRESA', 'OBJETO', 'REMUNERACAO', 'DATA_INICIO'],
      body_html: `<h2>CONTRATO — MULTI BARCARENA</h2><p>{{EMPRESA}} contrata {{NOME}} ({{CPF}}). Objeto: {{OBJETO}}. Remuneração: {{REMUNERACAO}}. Início: {{DATA_INICIO}}.</p>`
    },
    {
      id: 'tpl-multi-acara', name: 'Contrato Multi Acará', is_master: true,
      variables: ['NOME', 'CPF', 'EMPRESA', 'OBJETO', 'REMUNERACAO', 'DATA_INICIO'],
      body_html: `<h2>CONTRATO — MULTI ACARÁ</h2><p>{{EMPRESA}} contrata {{NOME}} ({{CPF}}). Objeto: {{OBJETO}}. Remuneração: {{REMUNERACAO}}. Início: {{DATA_INICIO}}.</p>`
    },
    {
      id: 'tpl-avulso', name: 'Contrato Avulso', is_master: true,
      variables: ['NOME', 'EMPRESA', 'OBJETO', 'VALOR', 'DATA_INICIO'],
      body_html: `<h2>CONTRATO AVULSO</h2><p>{{EMPRESA}} contrata {{NOME}}. Objeto: {{OBJETO}}. Valor: {{VALOR}}. Início: {{DATA_INICIO}}.</p>`
    }
  ],
  generatedContracts: [],
  auditLog: []
};

function loadDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return structuredClone(SEED);
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return structuredClone(SEED);
  }
}

function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function log(db, entity_type, entity_id, action, performed_by = 'demo-user', metadata = {}) {
  db.auditLog.unshift({
    id: uid('log'), entity_type, entity_id, action, performed_by,
    metadata, created_at: new Date().toISOString()
  });
}

export const db = {
  // ---------- Empresas ----------
  async getCompanies() {
    return loadDb().companies;
  },
  async getCompanyBySlug(slug) {
    return loadDb().companies.find(c => c.slug === slug) || null;
  },

  // ---------- Contratados ----------
  async createContractedParty(companyId, data) {
    const store = loadDb();
    const party = { id: uid('party'), company_id: companyId, status: 'pending', created_at: new Date().toISOString(), ...data };
    store.contractedParties.push(party);
    log(store, 'contracted_parties', party.id, 'created', 'public_form');
    saveDb(store);
    return party;
  },
  async getContractedParty(id) {
    return loadDb().contractedParties.find(p => p.id === id) || null;
  },

  // ---------- Documentos (metadados apenas neste modo — o modo Supabase envia o arquivo de verdade) ----------
  async addDocument(contractedPartyId, documentType, fileOrName) {
    const fileName = fileOrName instanceof File ? fileOrName.name : fileOrName;
    const store = loadDb();
    const doc = { id: uid('doc'), contracted_party_id: contractedPartyId, document_type: documentType, file_name: fileName, uploaded_at: new Date().toISOString() };
    store.documents.push(doc);
    saveDb(store);
    return doc;
  },
  async getDocuments(contractedPartyId) {
    return loadDb().documents.filter(d => d.contracted_party_id === contractedPartyId);
  },

  // ---------- Pipeline: contract_requests ----------
  async createContractRequest(companyId, contractedPartyId, contractType) {
    const store = loadDb();
    const request = {
      id: uid('req'), company_id: companyId, contracted_party_id: contractedPartyId,
      contract_type: contractType, current_stage: 'hr_pending',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    store.contractRequests.push(request);
    log(store, 'contract_requests', request.id, 'created');
    saveDb(store);
    return request;
  },
  async listContractRequests(companyId = null) {
    const store = loadDb();
    let reqs = store.contractRequests;
    if (companyId) reqs = reqs.filter(r => r.company_id === companyId);
    return reqs.map(r => ({
      ...r,
      party: store.contractedParties.find(p => p.id === r.contracted_party_id),
      company: store.companies.find(c => c.id === r.company_id),
      hr: store.hrDetails.find(h => h.contract_request_id === r.id),
      finance: store.financeDetails.find(f => f.contract_request_id === r.id),
      reviews: store.legalReviews.filter(l => l.contract_request_id === r.id),
      generated: store.generatedContracts.filter(g => g.contract_request_id === r.id)
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async getContractRequest(id) {
    return (await this.listContractRequests()).find(r => r.id === id) || null;
  },
  async updateStage(requestId, stage) {
    const store = loadDb();
    const req = store.contractRequests.find(r => r.id === requestId);
    if (req) {
      req.current_stage = stage;
      req.updated_at = new Date().toISOString();
      log(store, 'contract_requests', requestId, `stage_changed:${stage}`);
      saveDb(store);
    }
    return req;
  },

  // ---------- RH ----------
  async saveHrDetails(requestId, data) {
    const store = loadDb();
    let hr = store.hrDetails.find(h => h.contract_request_id === requestId);
    if (hr) Object.assign(hr, data);
    else { hr = { id: uid('hr'), contract_request_id: requestId, ...data }; store.hrDetails.push(hr); }
    hr.filled_at = new Date().toISOString();
    log(store, 'hr_details', requestId, 'updated_by_hr');
    const req = store.contractRequests.find(r => r.id === requestId);
    if (req && req.current_stage === 'hr_pending') req.current_stage = 'finance_pending';
    saveDb(store);
    return hr;
  },

  // ---------- Financeiro ----------
  async saveFinanceDetails(requestId, data) {
    const store = loadDb();
    let fin = store.financeDetails.find(f => f.contract_request_id === requestId);
    if (fin) Object.assign(fin, data);
    else { fin = { id: uid('fin'), contract_request_id: requestId, ...data }; store.financeDetails.push(fin); }
    fin.filled_at = new Date().toISOString();
    log(store, 'finance_details', requestId, 'updated_by_finance');
    const req = store.contractRequests.find(r => r.id === requestId);
    if (req && req.current_stage === 'finance_pending') req.current_stage = 'legal_review';
    saveDb(store);
    return fin;
  },

  // ---------- Jurídico ----------
  async addLegalReview(requestId, decision, comments) {
    const store = loadDb();
    const review = { id: uid('rev'), contract_request_id: requestId, decision, comments, reviewed_at: new Date().toISOString() };
    store.legalReviews.push(review);
    const req = store.contractRequests.find(r => r.id === requestId);
    if (req) {
      if (decision === 'approved') req.current_stage = 'contract_generated_pending';
      if (decision === 'rejected') req.current_stage = 'rejected';
      if (decision === 'correction_requested') req.current_stage = 'hr_pending';
    }
    log(store, 'legal_reviews', requestId, `review:${decision}`);
    saveDb(store);
    return review;
  },

  // ---------- Templates ----------
  async getTemplates() {
    return loadDb().templates;
  },
  async getTemplate(id) {
    return loadDb().templates.find(t => t.id === id) || null;
  },

  // ---------- Geração de contrato ----------
  async generateContract(requestId, templateId, values) {
    const store = loadDb();
    const template = store.templates.find(t => t.id === templateId);
    let html = template.body_html;
    for (const [key, val] of Object.entries(values)) {
      html = html.replaceAll(`{{${key}}}`, val || `<mark>{{${key}}}</mark>`);
    }
    const existing = store.generatedContracts.filter(g => g.contract_request_id === requestId);
    const contract = {
      id: uid('gc'), contract_request_id: requestId, template_id: templateId,
      version_number: existing.length + 1, rendered_html: html, status: 'draft',
      generated_at: new Date().toISOString()
    };
    store.generatedContracts.push(contract);
    const req = store.contractRequests.find(r => r.id === requestId);
    if (req) req.current_stage = 'under_review';
    log(store, 'generated_contracts', contract.id, 'generated');
    saveDb(store);
    return contract;
  },
  async markContractStatus(contractId, status) {
    const store = loadDb();
    const c = store.generatedContracts.find(g => g.id === contractId);
    if (c) {
      c.status = status;
      log(store, 'generated_contracts', contractId, `status:${status}`);
      const req = store.contractRequests.find(r => r.id === c.contract_request_id);
      if (req && status === 'sent') req.current_stage = 'sent';
      if (req && status === 'signed') req.current_stage = 'signed';
      saveDb(store);
    }
    return c;
  },

  // ---------- Auditoria ----------
  async getAuditLog() {
    return loadDb().auditLog;
  },

  // ---------- Dashboard ----------
  async getStats() {
    const reqs = loadDb().contractRequests;
    const generated = loadDb().generatedContracts;
    return {
      total: reqs.length,
      pending: reqs.filter(r => !['sent', 'signed', 'rejected'].includes(r.current_stage)).length,
      generated: generated.length,
      signed: reqs.filter(r => r.current_stage === 'signed').length,
      byCompany: loadDb().companies.map(c => ({
        name: c.name,
        count: reqs.filter(r => r.company_id === c.id).length
      }))
    };
  }
};
