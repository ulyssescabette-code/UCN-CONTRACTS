import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/dataStore';
import InternalLayout from '../../components/InternalLayout';
import Stepper from '../../components/Stepper';
import { useAuth } from '../../contexts/AuthContext';

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white px-5 py-4">
      <p className="text-xs text-ink/50 uppercase tracking-wide">{label}</p>
      <p className={`font-display text-3xl mt-1 ${accent || 'text-ink'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    Promise.all([db.listContractRequests(), db.getStats()]).then(([reqs, s]) => {
      if (mounted) { setRequests(reqs); setStats(s); }
    });
    return () => { mounted = false; };
  }, []);

  return (
    <InternalLayout>
      <div className="px-8 py-6 border-b border-ink/10 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Painel de Pendências</h1>
          <p className="text-sm text-ink/50">Acompanhamento em tempo real do pipeline contratual</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 px-8 py-6">
          <StatCard label="Solicitações totais" value={stats.total} />
          <StatCard label="Pendentes" value={stats.pending} accent="text-brass-dark" />
          <StatCard label="Contratos gerados" value={stats.generated} />
          <StatCard label="Assinados" value={stats.signed} accent="text-signal-approve" />
        </div>
      )}

      <div className="px-8 pb-10">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-lg text-ink">Solicitações</p>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink/20 py-16 text-center">
            <p className="text-ink/50 text-sm">Nenhuma solicitação ainda.</p>
            <p className="text-ink/30 text-xs mt-1">Envie o link público de uma empresa para criar o primeiro cadastro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <button
                key={r.id}
                onClick={() => navigate(`/interno/solicitacao/${r.id}`)}
                className="w-full text-left rounded-lg border border-ink/10 bg-white px-5 py-4 hover:border-brass transition block"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-ink text-sm">
                      {r.party?.full_name || r.party?.company_name || 'Contratado sem nome'}
                      <span className="text-ink/30 font-normal"> · {r.contract_type}</span>
                    </p>
                    <p className="text-xs text-ink/40">{r.company?.name} · protocolo {r.id}</p>
                  </div>
                  <span className="text-xs font-mono text-ink/30">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <Stepper currentStage={r.current_stage} />
              </button>
            ))}
          </div>
        )}
      </div>
    </InternalLayout>
  );
}
