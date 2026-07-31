import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, User, Upload, Check, ArrowRight, ArrowLeft, FileText } from 'lucide-react';
import { db } from '../lib/dataStore';
import Seal from '../components/Seal';

const CONTRACT_TYPES = [
  'Contrato Médico', 'Contrato PJ Interno', 'Contrato PJ Externo',
  'Contrato Multi Canaã', 'Contrato Multi Barcarena', 'Contrato Multi Acará', 'Contrato Avulso'
];

const PF_DOCS = ['CPF', 'RG', 'Comprovante de residência', 'Diploma', 'Registro profissional', 'Currículo'];
const PJ_DOCS = ['Contrato Social', 'Última Alteração Contratual', 'Cartão CNPJ', 'Certidões'];

function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-700">{label}{required && <span className="text-brass-dark"> *</span>}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-brass focus:ring-1 focus:ring-brass outline-none transition";

export default function PublicFormPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(undefined); // undefined = carregando, null = não encontrado

  useEffect(() => {
    let mounted = true;
    db.getCompanyBySlug(slug).then(c => { if (mounted) setCompany(c); });
    return () => { mounted = false; };
  }, [slug]);

  const [step, setStep] = useState(0);
  const [partyType, setPartyType] = useState(null);
  const [contractType, setContractType] = useState(CONTRACT_TYPES[0]);
  const [form, setForm] = useState({});
  const [docs, setDocs] = useState({});
  const [submittedId, setSubmittedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (company === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-parchment text-sm text-ink/40">Carregando...</div>;
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-6">
        <div className="text-center">
          <p className="font-display text-2xl text-ink">Link não encontrado</p>
          <p className="text-ink/60 mt-2 text-sm">Verifique o endereço ou solicite um novo link ao escritório.</p>
        </div>
      </div>
    );
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const docList = partyType === 'PF' ? PF_DOCS : PJ_DOCS;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const party = await db.createContractedParty(company.id, {
        party_type: partyType,
        ...form
      });
      for (const docType of docList) {
        if (docs[docType]) await db.addDocument(party.id, docType, docs[docType]);
      }
      const request = await db.createContractRequest(company.id, party.id, contractType);
      setSubmittedId(request.id);
      setStep(9);
    } catch (err) {
      setSubmitError('Não foi possível enviar o cadastro. Tente novamente em instantes.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-parchment font-body">
      <header className="border-b border-ink/10">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <Seal label={company.name.slice(0, 2).toUpperCase()} size={40} />
          <div>
            <p className="font-display text-lg leading-tight text-ink">{company.name}</p>
            <p className="text-xs text-ink/50 tracking-wide">Cadastro de Contratação · Ulysses Cabette Advogados</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {step < 9 && (
          <>
            <div className="flex items-center gap-2 mb-8 text-xs font-mono text-ink/40">
              {['Identificação', 'Dados', 'Documentos'].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`rounded-full w-6 h-6 flex items-center justify-center border ${i <= step ? 'bg-ink text-parchment border-ink' : 'border-ink/20'}`}>
                    {i < step ? <Check size={13} /> : i + 1}
                  </span>
                  <span className={i <= step ? 'text-ink' : ''}>{label}</span>
                  {i < 2 && <div className="w-8 h-px bg-ink/15" />}
                </div>
              ))}
            </div>

            {step === 0 && (
              <div>
                <h1 className="font-display text-3xl text-ink mb-2">Quem será contratado?</h1>
                <p className="text-ink/60 mb-8 text-sm">Selecione o tipo de contratação e o modelo pretendido. O restante do formulário se ajusta automaticamente.</p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setPartyType('PF')}
                    className={`rounded-lg border-2 p-6 text-left transition ${partyType === 'PF' ? 'border-brass bg-brass/5' : 'border-ink/10 hover:border-ink/25'}`}
                  >
                    <User className="mb-3 text-ink-700" size={26} />
                    <p className="font-display text-lg text-ink">Pessoa Física</p>
                    <p className="text-xs text-ink/50 mt-1">Profissionais, autônomos, colaboradores</p>
                  </button>
                  <button
                    onClick={() => setPartyType('PJ')}
                    className={`rounded-lg border-2 p-6 text-left transition ${partyType === 'PJ' ? 'border-brass bg-brass/5' : 'border-ink/10 hover:border-ink/25'}`}
                  >
                    <Building2 className="mb-3 text-ink-700" size={26} />
                    <p className="font-display text-lg text-ink">Pessoa Jurídica</p>
                    <p className="text-xs text-ink/50 mt-1">Empresas prestadoras de serviço</p>
                  </button>
                </div>
                <Field label="Tipo de contrato pretendido" required>
                  <select className={inputCls} value={contractType} onChange={e => setContractType(e.target.value)}>
                    {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <div className="flex justify-end mt-8">
                  <button
                    disabled={!partyType}
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 bg-ink text-parchment px-5 py-2.5 rounded-md text-sm font-medium disabled:opacity-30 hover:bg-ink-700 transition"
                  >
                    Continuar <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h1 className="font-display text-3xl text-ink mb-1">
                  {partyType === 'PF' ? 'Dados da Pessoa Física' : 'Dados da Pessoa Jurídica'}
                </h1>
                <p className="text-ink/60 mb-8 text-sm">Preencha com atenção — estes dados irão diretamente para o contrato.</p>

                {partyType === 'PF' ? (
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2"><Field label="Nome completo" required><input className={inputCls} onChange={set('full_name')} /></Field></div>
                    <Field label="CPF" required><input className={inputCls} onChange={set('cpf')} /></Field>
                    <Field label="RG" required><input className={inputCls} onChange={set('rg')} /></Field>
                    <Field label="Órgão expedidor"><input className={inputCls} onChange={set('rg_issuer')} /></Field>
                    <Field label="Estado civil"><input className={inputCls} onChange={set('marital_status')} /></Field>
                    <Field label="Data de nascimento"><input type="date" className={inputCls} onChange={set('birth_date')} /></Field>
                    <Field label="Profissão"><input className={inputCls} onChange={set('profession')} /></Field>
                    <Field label="Nacionalidade"><input className={inputCls} onChange={set('nationality')} /></Field>
                    <Field label="Conselho profissional (CRM, OAB...)"><input className={inputCls} onChange={set('professional_council')} /></Field>
                    <Field label="Número do registro"><input className={inputCls} onChange={set('council_number')} /></Field>
                    <Field label="Especialidade"><input className={inputCls} onChange={set('specialty')} /></Field>
                    <Field label="PIS"><input className={inputCls} onChange={set('pis')} /></Field>
                    <div className="col-span-2 pt-2 border-t border-ink/10" />
                    <div className="col-span-2"><Field label="Endereço completo" required><input className={inputCls} onChange={set('address_street')} /></Field></div>
                    <Field label="CEP"><input className={inputCls} onChange={set('cep')} /></Field>
                    <Field label="Cidade"><input className={inputCls} onChange={set('city')} /></Field>
                    <Field label="Estado"><input className={inputCls} onChange={set('state')} /></Field>
                    <Field label="Telefone"><input className={inputCls} onChange={set('phone')} /></Field>
                    <Field label="WhatsApp"><input className={inputCls} onChange={set('whatsapp')} /></Field>
                    <Field label="Email" required><input type="email" className={inputCls} onChange={set('email')} /></Field>
                    <div className="col-span-2 pt-2 border-t border-ink/10" />
                    <Field label="Banco"><input className={inputCls} onChange={set('bank_name')} /></Field>
                    <Field label="Agência"><input className={inputCls} onChange={set('bank_agency')} /></Field>
                    <Field label="Conta"><input className={inputCls} onChange={set('bank_account')} /></Field>
                    <Field label="PIX"><input className={inputCls} onChange={set('pix_key')} /></Field>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2"><Field label="Razão Social" required><input className={inputCls} onChange={set('company_name')} /></Field></div>
                    <Field label="Nome Fantasia"><input className={inputCls} onChange={set('trade_name')} /></Field>
                    <Field label="CNPJ" required><input className={inputCls} onChange={set('cnpj')} /></Field>
                    <Field label="Inscrição Estadual"><input className={inputCls} onChange={set('state_registration')} /></Field>
                    <Field label="Inscrição Municipal"><input className={inputCls} onChange={set('municipal_registration')} /></Field>
                    <div className="col-span-2"><Field label="Objeto Social"><input className={inputCls} onChange={set('corporate_purpose')} /></Field></div>
                    <div className="col-span-2 pt-2 border-t border-ink/10" />
                    <div className="col-span-2"><Field label="Endereço completo" required><input className={inputCls} onChange={set('address_street')} /></Field></div>
                    <Field label="CEP"><input className={inputCls} onChange={set('cep')} /></Field>
                    <Field label="Cidade"><input className={inputCls} onChange={set('city')} /></Field>
                    <Field label="Estado"><input className={inputCls} onChange={set('state')} /></Field>
                    <Field label="Telefone"><input className={inputCls} onChange={set('phone')} /></Field>
                    <Field label="WhatsApp"><input className={inputCls} onChange={set('whatsapp')} /></Field>
                    <Field label="Email" required><input type="email" className={inputCls} onChange={set('email')} /></Field>
                    <div className="col-span-2 pt-2 border-t border-ink/10" />
                    <Field label="Banco"><input className={inputCls} onChange={set('bank_name')} /></Field>
                    <Field label="Agência"><input className={inputCls} onChange={set('bank_agency')} /></Field>
                    <Field label="Conta"><input className={inputCls} onChange={set('bank_account')} /></Field>
                    <Field label="PIX"><input className={inputCls} onChange={set('pix_key')} /></Field>
                    <div className="col-span-2 pt-4 border-t border-ink/10">
                      <p className="font-display text-lg text-ink mb-3">Representante Legal</p>
                    </div>
                    <Field label="Nome"><input className={inputCls} onChange={set('rep_name')} /></Field>
                    <Field label="CPF"><input className={inputCls} onChange={set('rep_cpf')} /></Field>
                    <Field label="Cargo"><input className={inputCls} onChange={set('rep_position')} /></Field>
                    <Field label="Telefone"><input className={inputCls} onChange={set('rep_phone')} /></Field>
                  </div>
                )}

                <div className="flex justify-between mt-8">
                  <button onClick={() => setStep(0)} className="inline-flex items-center gap-2 text-ink/60 px-4 py-2.5 text-sm font-medium hover:text-ink transition">
                    <ArrowLeft size={16} /> Voltar
                  </button>
                  <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 bg-ink text-parchment px-5 py-2.5 rounded-md text-sm font-medium hover:bg-ink-700 transition">
                    Continuar <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h1 className="font-display text-3xl text-ink mb-1">Documentos</h1>
                <p className="text-ink/60 mb-8 text-sm">Envie os arquivos abaixo. Aceitos: PDF, Word, Excel, imagem ou ZIP.</p>
                <div className="space-y-3">
                  {docList.map(docType => (
                    <label key={docType} className="flex items-center justify-between rounded-md border border-ink/10 bg-white px-4 py-3 cursor-pointer hover:border-brass transition">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-ink/40" />
                        <span className="text-sm text-ink">{docType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {docs[docType] && <span className="text-xs text-signal-approve font-mono">{docs[docType].name}</span>}
                        <span className="text-xs text-brass-dark inline-flex items-center gap-1"><Upload size={14} /> Escolher</span>
                      </div>
                      <input type="file" className="hidden" onChange={e => setDocs(d => ({ ...d, [docType]: e.target.files[0] }))} />
                    </label>
                  ))}
                </div>
                <div className="flex justify-between mt-8">
                  <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-ink/60 px-4 py-2.5 text-sm font-medium hover:text-ink transition">
                    <ArrowLeft size={16} /> Voltar
                  </button>
                  <button disabled={submitting} onClick={handleSubmit} className="inline-flex items-center gap-2 bg-brass text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-brass-dark transition disabled:opacity-50">
                    {submitting ? 'Enviando...' : 'Enviar cadastro'} <Check size={16} />
                  </button>
                </div>
                {submitError && <p className="text-xs text-signal-reject mt-3 text-right">{submitError}</p>}
              </div>
            )}
          </>
        )}

        {step === 9 && (
          <div className="text-center py-16">
            <div className="flex justify-center mb-6"><Seal label="OK" size={64} /></div>
            <h1 className="font-display text-3xl text-ink mb-2">Cadastro recebido</h1>
            <p className="text-ink/60 max-w-md mx-auto text-sm">
              Seus dados foram enviados ao escritório Ulysses Cabette Advogados. As equipes internas de RH, Financeiro
              e Jurídico darão continuidade ao processo. Nenhuma ação adicional é necessária no momento.
            </p>
            <p className="mt-6 text-xs font-mono text-ink/40">Protocolo: {submittedId}</p>
          </div>
        )}
      </main>
    </div>
  );
}
