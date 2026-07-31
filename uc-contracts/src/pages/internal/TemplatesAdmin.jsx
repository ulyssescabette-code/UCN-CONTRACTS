import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, CheckCircle2, FileDown } from 'lucide-react';
import { db } from '../../lib/dataStore';
import InternalLayout from '../../components/InternalLayout';
import { useAuth } from '../../contexts/AuthContext';

const inputCls = "w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass";

export default function TemplatesAdmin() {
  const { can } = useAuth();
  const [searchParams] = useSearchParams();
  const requestIdParam = searchParams.get('requestId');

  const [requests, setRequests] = useState([]);
  const [selectedReqId, setSelectedReqId] = useState(requestIdParam || '');
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [values, setValues] = useState({});
  const [contract, setContract] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    db.getTemplates().then(setTemplates);
  }, []);

  async function loadRequests() {
    const all = await db.listContractRequests();
    setRequests(all.filter(r => ['contract_generated_pending', 'under_review', 'sent', 'signed'].includes(r.current_stage)));
  }

  useEffect(() => { loadRequests(); }, []);

  const request = useMemo(() => requests.find(r => r.id === selectedReqId), [requests, selectedReqId]);
  const template = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);

  useEffect(() => {
    if (!request || templates.length === 0) return;
    const matchingTpl = templates.find(t => t.name === request.contract_type) || templates[0];
    setTemplateId(matchingTpl.id);
  }, [request, templates]);

  useEffect(() => {
    if (!template || !request) return;
    const p = request.party || {};
    const auto = {
      NOME: p.full_name || p.company_name || '',
      CPF: p.cpf || '',
      CNPJ: p.cnpj || '',
      CRM: p.council_number || '',
      ESPECIALIDADE: p.specialty || '',
      EMPRESA: request.company?.name || '',
      OBJETO: request.hr?.activities_description || '',
      REMUNERACAO: request.hr?.compensation ? `R$ ${request.hr.compensation}` : '',
      VALOR: request.finance?.contracted_value ? `R$ ${request.finance.contracted_value}` : '',
      DATA_INICIO: request.hr?.start_date || ''
    };
    setValues(auto);
    setContract(request.generated?.[request.generated.length - 1] || null);
  }, [template, request]);

  if (!can('generate_contract')) {
    return (
      <InternalLayout>
        <div className="p-8 text-sm text-ink/50">Esta área é exclusiva do perfil Jurídico / Administrador Master.</div>
      </InternalLayout>
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const c = await db.generateContract(request.id, templateId, values);
      setContract(c);
      await loadRequests();
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    await db.markContractStatus(contract.id, 'sent');
    setContract({ ...contract, status: 'sent' });
  }

  async function handleSign() {
    await db.markContractStatus(contract.id, 'signed');
    setContract({ ...contract, status: 'signed' });
  }

  const missing = template ? template.variables.filter(v => !values[v]) : [];

  return (
    <InternalLayout>
      <div className="px-8 py-6 border-b border-ink/10">
        <h1 className="font-display text-2xl text-ink">Modelos & Geração de Contratos</h1>
        <p className="text-sm text-ink/50">Matriz nunca é alterada — cada geração cria uma nova versão do contrato.</p>
      </div>

      <div className="px-8 py-6 grid grid-cols-[320px,1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-ink/10 bg-white p-4">
            <p className="text-xs font-medium text-ink-700 mb-2">Solicitação aprovada</p>
            <select className={inputCls} value={selectedReqId} onChange={e => setSelectedReqId(e.target.value)}>
              <option value="">Selecione...</option>
              {requests.map(r => (
                <option key={r.id} value={r.id}>{r.party?.full_name || r.party?.company_name} — {r.contract_type}</option>
              ))}
            </select>
          </div>

          {request && (
            <div className="rounded-lg border border-ink/10 bg-white p-4">
              <p className="text-xs font-medium text-ink-700 mb-2">Modelo</p>
              <select className={inputCls} value={templateId} onChange={e => setTemplateId(e.target.value)}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {template && (
            <div className="rounded-lg border border-ink/10 bg-white p-4">
              <p className="text-xs font-medium text-ink-700 mb-3">Variáveis</p>
              <div className="space-y-2.5">
                {template.variables.map(v => (
                  <label key={v} className="block">
                    <span className="text-[11px] font-mono text-ink/40">{'{{' + v + '}}'}</span>
                    <input
                      className={inputCls + (missing.includes(v) ? ' border-brass' : '')}
                      value={values[v] || ''}
                      onChange={e => setValues(f => ({ ...f, [v]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <button onClick={handleGenerate} disabled={generating} className="w-full mt-4 bg-ink text-parchment rounded-md py-2 text-sm font-medium hover:bg-ink-700 transition disabled:opacity-50">
                {generating ? 'Gerando...' : 'Gerar contrato (nova versão)'}
              </button>
              {missing.length > 0 && <p className="text-[11px] text-brass-dark mt-2">{missing.length} campo(s) vazio(s) — destacados na prévia.</p>}
            </div>
          )}
        </div>

        <div>
          {!request ? (
            <div className="rounded-lg border border-dashed border-ink/20 py-24 text-center text-sm text-ink/40">
              Selecione uma solicitação para pré-visualizar o contrato.
            </div>
          ) : (
            <div className="rounded-lg border border-ink/10 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between bg-ink/5">
                <p className="text-xs font-mono text-ink/50">Prévia · v{contract?.version_number || '—'} · status: {contract?.status || 'não gerado'}</p>
                {contract && (
                  <div className="flex gap-2">
                    {contract.status === 'draft' && (
                      <button onClick={handleSend} className="inline-flex items-center gap-1.5 text-xs bg-brass/10 text-brass-dark rounded-md px-3 py-1.5 hover:bg-brass/20 transition">
                        <Send size={13} /> Enviar
                      </button>
                    )}
                    {contract.status === 'sent' && (
                      <button onClick={handleSign} className="inline-flex items-center gap-1.5 text-xs bg-signal-approve/10 text-signal-approve rounded-md px-3 py-1.5 hover:bg-signal-approve/20 transition">
                        <CheckCircle2 size={13} /> Marcar como assinado
                      </button>
                    )}
                    <button className="inline-flex items-center gap-1.5 text-xs bg-ink/5 text-ink/60 rounded-md px-3 py-1.5">
                      <FileDown size={13} /> Exportar PDF
                    </button>
                  </div>
                )}
              </div>
              <div className="p-8 font-body text-sm leading-relaxed min-h-[400px]">
                {contract ? (
                  <div className="prose-sm max-w-none [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mb-4 [&_p]:mb-3 [&_mark]:bg-brass/20 [&_mark]:text-brass-dark [&_mark]:px-1 [&_mark]:rounded"
                    dangerouslySetInnerHTML={{ __html: contract.rendered_html }} />
                ) : (
                  <p className="text-ink/30">Preencha as variáveis e clique em "Gerar contrato".</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </InternalLayout>
  );
}
