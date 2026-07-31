import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { db } from '../../lib/dataStore';
import InternalLayout from '../../components/InternalLayout';
import Stepper from '../../components/Stepper';
import { useAuth } from '../../contexts/AuthContext';

const inputCls = "w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass";
function Field({ label, children }) {
  return <label className="block"><span className="text-xs font-medium text-ink-700">{label}</span><div className="mt-1">{children}</div></label>;
}

export default function PipelineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [request, setRequest] = useState(null);
  const [docs, setDocs] = useState([]);
  const [hrForm, setHrForm] = useState({});
  const [finForm, setFinForm] = useState({});
  const [comments, setComments] = useState('');

  async function refresh() {
    const r = await db.getContractRequest(id);
    setRequest(r);
    setDocs(r ? await db.getDocuments(r.contracted_party_id) : []);
    if (r?.hr) setHrForm(r.hr);
    if (r?.finance) setFinForm(r.finance);
  }

  useEffect(() => { refresh(); }, [id]);

  if (!request) return <InternalLayout><div className="p-8 text-ink/50 text-sm">Carregando...</div></InternalLayout>;

  const party = request.party || {};
  const name = party.full_name || party.company_name;

  return (
    <InternalLayout>
      <div className="px-8 py-6 border-b border-ink/10">
        <button onClick={() => navigate('/interno/painel')} className="inline-flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink mb-3">
          <ArrowLeft size={14} /> Voltar ao painel
        </button>
        <h1 className="font-display text-2xl text-ink">{name}</h1>
        <p className="text-sm text-ink/50 mb-4">{request.contract_type} · {request.company?.name} · protocolo {request.id}</p>
        <Stepper currentStage={request.current_stage} />
      </div>

      <div className="px-8 py-6 grid grid-cols-2 gap-6">
        {/* Dados do contratado */}
        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <p className="font-display text-base text-ink mb-3">Dados do cadastro</p>
          <dl className="text-sm space-y-1.5">
            {Object.entries(party).filter(([k, v]) => v && !['id', 'company_id'].includes(k)).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-ink/40 capitalize">{k.replaceAll('_', ' ')}</dt>
                <dd className="text-ink text-right">{String(v)}</dd>
              </div>
            ))}
          </dl>
          <p className="font-display text-base text-ink mt-5 mb-2">Documentos enviados</p>
          {docs.length === 0 ? <p className="text-xs text-ink/40">Nenhum documento.</p> : (
            <ul className="text-sm space-y-1">
              {docs.map(d => <li key={d.id} className="flex justify-between"><span className="text-ink/60">{d.document_type}</span><span className="font-mono text-xs text-brass-dark">{d.file_name}</span></li>)}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          {/* RH */}
          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <p className="font-display text-base text-ink mb-3">RH / DP</p>
            {!can('fill_hr') ? (
              <p className="text-xs text-ink/40">Visível apenas para o perfil RH / DP.{request.hr && ' Já preenchido.'}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cargo"><input className={inputCls} value={hrForm.position || ''} onChange={e => setHrForm(f => ({ ...f, position: e.target.value }))} /></Field>
                <Field label="Função"><input className={inputCls} value={hrForm.role_function || ''} onChange={e => setHrForm(f => ({ ...f, role_function: e.target.value }))} /></Field>
                <Field label="Carga horária"><input className={inputCls} value={hrForm.workload || ''} onChange={e => setHrForm(f => ({ ...f, workload: e.target.value }))} /></Field>
                <Field label="Escala"><input className={inputCls} value={hrForm.work_schedule || ''} onChange={e => setHrForm(f => ({ ...f, work_schedule: e.target.value }))} /></Field>
                <Field label="Local de trabalho"><input className={inputCls} value={hrForm.work_location || ''} onChange={e => setHrForm(f => ({ ...f, work_location: e.target.value }))} /></Field>
                <Field label="Remuneração"><input className={inputCls} value={hrForm.compensation || ''} onChange={e => setHrForm(f => ({ ...f, compensation: e.target.value }))} /></Field>
                <Field label="Data de início"><input type="date" className={inputCls} value={hrForm.start_date || ''} onChange={e => setHrForm(f => ({ ...f, start_date: e.target.value }))} /></Field>
                <Field label="Centro de custo"><input className={inputCls} value={hrForm.cost_center || ''} onChange={e => setHrForm(f => ({ ...f, cost_center: e.target.value }))} /></Field>
                <div className="col-span-2"><Field label="Descritivo das atividades"><textarea className={inputCls} rows={2} value={hrForm.activities_description || ''} onChange={e => setHrForm(f => ({ ...f, activities_description: e.target.value }))} /></Field></div>
                <button
                  className="col-span-2 bg-ink text-parchment rounded-md py-2 text-sm font-medium hover:bg-ink-700 transition"
                  onClick={async () => { await db.saveHrDetails(request.id, hrForm); refresh(); }}
                >Salvar dados de RH</button>
              </div>
            )}
          </div>

          {/* Financeiro */}
          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <p className="font-display text-base text-ink mb-3">Financeiro</p>
            {!can('fill_finance') ? (
              <p className="text-xs text-ink/40">Visível apenas para o perfil Financeiro.{request.finance && ' Já preenchido.'}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor contratado"><input className={inputCls} value={finForm.contracted_value || ''} onChange={e => setFinForm(f => ({ ...f, contracted_value: e.target.value }))} /></Field>
                <Field label="Forma de pagamento"><input className={inputCls} value={finForm.payment_method || ''} onChange={e => setFinForm(f => ({ ...f, payment_method: e.target.value }))} /></Field>
                <Field label="Periodicidade"><input className={inputCls} value={finForm.periodicity || ''} onChange={e => setFinForm(f => ({ ...f, periodicity: e.target.value }))} /></Field>
                <Field label="Centro de custo"><input className={inputCls} value={finForm.cost_center || ''} onChange={e => setFinForm(f => ({ ...f, cost_center: e.target.value }))} /></Field>
                <Field label="Natureza"><input className={inputCls} value={finForm.nature || ''} onChange={e => setFinForm(f => ({ ...f, nature: e.target.value }))} /></Field>
                <Field label="Tributação"><input className={inputCls} value={finForm.taxation || ''} onChange={e => setFinForm(f => ({ ...f, taxation: e.target.value }))} /></Field>
                <button
                  className="col-span-2 bg-ink text-parchment rounded-md py-2 text-sm font-medium hover:bg-ink-700 transition"
                  onClick={async () => { await db.saveFinanceDetails(request.id, finForm); refresh(); }}
                >Salvar dados financeiros</button>
              </div>
            )}
          </div>

          {/* Jurídico */}
          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <p className="font-display text-base text-ink mb-3">Validação Jurídica</p>
            {!can('legal_review') ? (
              <p className="text-xs text-ink/40">Visível apenas para o Jurídico.</p>
            ) : request.current_stage !== 'legal_review' ? (
              <p className="text-xs text-ink/40">Aguardando RH e Financeiro concluírem antes da validação.</p>
            ) : (
              <div>
                <textarea className={inputCls + ' mb-3'} rows={2} placeholder="Comentários (opcional)" value={comments} onChange={e => setComments(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={async () => { await db.addLegalReview(request.id, 'approved', comments); refresh(); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-signal-approve/10 text-signal-approve rounded-md py-2 text-sm font-medium hover:bg-signal-approve/20 transition">
                    <CheckCircle2 size={15} /> Aprovar
                  </button>
                  <button onClick={async () => { await db.addLegalReview(request.id, 'correction_requested', comments); refresh(); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-brass/10 text-brass-dark rounded-md py-2 text-sm font-medium hover:bg-brass/20 transition">
                    <RotateCcw size={15} /> Solicitar correção
                  </button>
                  <button onClick={async () => { await db.addLegalReview(request.id, 'rejected', comments); refresh(); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-signal-reject/10 text-signal-reject rounded-md py-2 text-sm font-medium hover:bg-signal-reject/20 transition">
                    <XCircle size={15} /> Rejeitar
                  </button>
                </div>
              </div>
            )}
            {request.current_stage === 'contract_generated_pending' && can('generate_contract') && (
              <button
                onClick={() => navigate(`/interno/modelos?requestId=${request.id}`)}
                className="w-full mt-3 bg-brass text-white rounded-md py-2 text-sm font-medium hover:bg-brass-dark transition"
              >
                Ir para Gerador de Contratos →
              </button>
            )}
          </div>
        </div>
      </div>
    </InternalLayout>
  );
}
