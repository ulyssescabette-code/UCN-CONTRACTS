// UC CONTRACTS — Camada de acesso a dados (MODO PRODUÇÃO / SUPABASE REAL)
// Mesma "forma" de retorno da versão demo (dataStore.demo.js), para que as páginas
// React não precisem saber qual modo está ativo.

import { supabase } from './supabaseClient';

async function logAudit(entity_type, entity_id, action, metadata = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_log').insert({
    entity_type, entity_id, action,
    performed_by: user?.id || null,
    metadata
  });
}

// Caminho de pasta: {empresa}/{contratado}/... — espelha a árvore exigida no escopo
function partyFolder(companySlug, partyId, partyName) {
  const safeName = (partyName || 'contratado').replace(/[^\w-]+/g, '_').slice(0, 40);
  return `${companySlug}/${partyId}_${safeName}`;
}

export const db = {
  // ---------- Empresas ----------
  async getCompanies() {
    const { data, error } = await supabase.from('companies').select('*').eq('active', true).order('name');
    if (error) throw error;
    return data;
  },
  async getCompanyBySlug(slug) {
    const { data, error } = await supabase.from('companies').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data;
  },

  // ---------- Contratados ----------
  async createContractedParty(companyId, data) {
    const { data: party, error } = await supabase
      .from('contracted_parties')
      .insert({ company_id: companyId, status: 'pending', ...data })
      .select()
      .single();
    if (error) throw error;
    await logAudit('contracted_parties', party.id, 'created', { source: 'public_form' });
    return party;
  },
  async getContractedParty(id) {
    const { data, error } = await supabase.from('contracted_parties').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  // ---------- Documentos (upload real para o Storage) ----------
  async addDocument(contractedPartyId, documentType, file) {
    let filePath = null;
    let fileName = file;

    if (file instanceof File) {
      const party = await this.getContractedParty(contractedPartyId);
      const company = party ? await supabase.from('companies').select('slug').eq('id', party.company_id).maybeSingle() : null;
      const slug = company?.data?.slug || 'sem-empresa';
      const folder = partyFolder(slug, contractedPartyId, party?.full_name || party?.company_name);
      const safeFileName = file.name.replace(/[^\w.-]+/g, '_');
      filePath = `${folder}/documentos/${Date.now()}_${safeFileName}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;
      fileName = file.name;
    }

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        contracted_party_id: contractedPartyId,
        document_type: documentType,
        file_path: filePath,
        file_name: fileName,
        mime_type: file instanceof File ? file.type : null
      })
      .select()
      .single();
    if (error) throw error;
    return doc;
  },
  async getDocuments(contractedPartyId) {
    const { data, error } = await supabase.from('documents').select('*').eq('contracted_party_id', contractedPartyId);
    if (error) throw error;
    return data;
  },

  // ---------- Pipeline: contract_requests ----------
  async createContractRequest(companyId, contractedPartyId, contractType) {
    const { data: request, error } = await supabase
      .from('contract_requests')
      .insert({ company_id: companyId, contracted_party_id: contractedPartyId, contract_type: contractType, current_stage: 'hr_pending' })
      .select()
      .single();
    if (error) throw error;
    await logAudit('contract_requests', request.id, 'created');
    return request;
  },

  async listContractRequests(companyId = null) {
    let query = supabase
      .from('contract_requests')
      .select(`
        *,
        party:contracted_parties(*),
        company:companies(*),
        hr:hr_details(*),
        finance:finance_details(*),
        reviews:legal_reviews(*),
        generated:generated_contracts(*)
      `)
      .order('created_at', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    // Supabase retorna hr/finance como array (1:1) — normaliza para objeto único
    return data.map(r => ({
      ...r,
      current_stage: r.current_stage,
      hr: Array.isArray(r.hr) ? r.hr[0] : r.hr,
      finance: Array.isArray(r.finance) ? r.finance[0] : r.finance
    }));
  },

  async getContractRequest(id) {
    const { data, error } = await supabase
      .from('contract_requests')
      .select(`
        *,
        party:contracted_parties(*),
        company:companies(*),
        hr:hr_details(*),
        finance:finance_details(*),
        reviews:legal_reviews(*),
        generated:generated_contracts(*)
      `)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      hr: Array.isArray(data.hr) ? data.hr[0] : data.hr,
      finance: Array.isArray(data.finance) ? data.finance[0] : data.finance
    };
  },

  async updateStage(requestId, stage) {
    const { data, error } = await supabase
      .from('contract_requests')
      .update({ current_stage: stage, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw error;
    await logAudit('contract_requests', requestId, `stage_changed:${stage}`);
    return data;
  },

  // ---------- RH ----------
  async saveHrDetails(requestId, data) {
    const { data: hr, error } = await supabase
      .from('hr_details')
      .upsert({ contract_request_id: requestId, ...data, filled_at: new Date().toISOString() }, { onConflict: 'contract_request_id' })
      .select()
      .single();
    if (error) throw error;
    await supabase.from('contract_requests').update({ current_stage: 'finance_pending' }).eq('id', requestId).eq('current_stage', 'hr_pending');
    await logAudit('hr_details', requestId, 'updated_by_hr');
    return hr;
  },

  // ---------- Financeiro ----------
  async saveFinanceDetails(requestId, data) {
    const { data: fin, error } = await supabase
      .from('finance_details')
      .upsert({ contract_request_id: requestId, ...data, filled_at: new Date().toISOString() }, { onConflict: 'contract_request_id' })
      .select()
      .single();
    if (error) throw error;
    await supabase.from('contract_requests').update({ current_stage: 'legal_review' }).eq('id', requestId).eq('current_stage', 'finance_pending');
    await logAudit('finance_details', requestId, 'updated_by_finance');
    return fin;
  },

  // ---------- Jurídico ----------
  async addLegalReview(requestId, decision, comments) {
    const { data: review, error } = await supabase
      .from('legal_reviews')
      .insert({ contract_request_id: requestId, decision, comments })
      .select()
      .single();
    if (error) throw error;

    const nextStage = decision === 'approved' ? 'contract_generated_pending'
      : decision === 'rejected' ? 'rejected'
      : 'hr_pending';
    await supabase.from('contract_requests').update({ current_stage: nextStage }).eq('id', requestId);
    await logAudit('legal_reviews', requestId, `review:${decision}`);
    return review;
  },

  // ---------- Templates ----------
  async getTemplates() {
    const { data, error } = await supabase
      .from('contract_template_versions')
      .select('id, variables_schema, body_html, template:contract_templates(name)')
      .eq('is_active', true);
    if (error) throw error;
    return data.map(v => ({
      id: v.id,
      name: v.template?.name,
      variables: v.variables_schema || [],
      body_html: v.body_html
    }));
  },
  async getTemplate(templateVersionId) {
    const list = await this.getTemplates();
    return list.find(t => t.id === templateVersionId) || null;
  },

  // ---------- Geração de contrato (via Edge Function) ----------
  async generateContract(requestId, templateVersionId, values) {
    const { data, error } = await supabase.functions.invoke('generate-contract', {
      body: { contract_request_id: requestId, template_version_id: templateVersionId, values }
    });
    if (error) throw error;
    // A função já grava em generated_contracts e audit_log; devolvemos o registro no mesmo formato usado nas páginas
    return {
      id: data.id,
      version_number: data.version_number,
      rendered_html: data.rendered_html,
      status: data.status,
      generated_at: data.generated_at
    };
  },

  async markContractStatus(contractId, status, dispatchInfo = {}) {
    if (status === 'sent') {
      const { data, error } = await supabase.functions.invoke('send-contract', {
        body: { generated_contract_id: contractId, ...dispatchInfo }
      });
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase
      .from('generated_contracts')
      .update({ status })
      .eq('id', contractId)
      .select()
      .single();
    if (error) throw error;
    if (status === 'signed') {
      await supabase.from('contract_requests').update({ current_stage: 'signed' }).eq('id', data.contract_request_id);
    }
    await logAudit('generated_contracts', contractId, `status:${status}`);
    return data;
  },

  // ---------- Auditoria ----------
  async getAuditLog() {
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return data;
  },

  // ---------- Dashboard ----------
  async getStats() {
    const [{ count: total }, requests, { count: generated }] = await Promise.all([
      supabase.from('contract_requests').select('*', { count: 'exact', head: true }),
      this.listContractRequests(),
      supabase.from('generated_contracts').select('*', { count: 'exact', head: true })
    ]);
    const pending = requests.filter(r => !['sent', 'signed', 'rejected'].includes(r.current_stage)).length;
    const signed = requests.filter(r => r.current_stage === 'signed').length;
    const companies = await this.getCompanies();
    return {
      total: total || 0,
      pending,
      generated: generated || 0,
      signed,
      byCompany: companies.map(c => ({ name: c.name, count: requests.filter(r => r.company_id === c.id).length }))
    };
  }
};
