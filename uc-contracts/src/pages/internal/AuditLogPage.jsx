import { useEffect, useState } from 'react';
import { db } from '../../lib/dataStore';
import InternalLayout from '../../components/InternalLayout';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { db.getAuditLog().then(setLogs); }, []);

  return (
    <InternalLayout>
      <div className="px-8 py-6 border-b border-ink/10">
        <h1 className="font-display text-2xl text-ink">Auditoria</h1>
        <p className="text-sm text-ink/50">Todo evento do sistema fica registrado — quem, quando, o quê.</p>
      </div>
      <div className="px-8 py-6">
        {logs.length === 0 ? (
          <p className="text-sm text-ink/40">Nenhum evento registrado ainda.</p>
        ) : (
          <div className="rounded-lg border border-ink/10 bg-white divide-y divide-ink/5">
            {logs.map(l => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-xs text-brass-dark">{l.entity_type}</span>
                  <span className="text-ink/40 mx-2">·</span>
                  <span className="text-ink">{l.action}</span>
                </div>
                <span className="text-xs text-ink/30 font-mono">{new Date(l.created_at).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </InternalLayout>
  );
}
