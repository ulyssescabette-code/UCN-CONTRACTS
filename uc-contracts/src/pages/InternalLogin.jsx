import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isDemoMode } from '../lib/supabaseClient';
import Seal from '../components/Seal';

const ROLES = [
  { key: 'master_admin', label: 'Administrador Master', desc: 'Acesso total ao sistema' },
  { key: 'legal', label: 'Jurídico', desc: 'Valida, edita modelos e gera contratos' },
  { key: 'hr', label: 'RH / DP', desc: 'Complementa dados de cargo e admissão' },
  { key: 'finance', label: 'Financeiro', desc: 'Complementa dados de pagamento' },
  { key: 'manager', label: 'Gestor', desc: 'Acompanha o andamento' }
];

export default function InternalLogin() {
  const { loginDemo, loginReal } = useAuth();
  const navigate = useNavigate();

  // ---- modo demo ----
  const [name, setName] = useState('');
  const [role, setRole] = useState(null);

  // ---- modo real ----
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleEnterDemo() {
    if (!name || !role) return;
    loginDemo(name, role);
    navigate('/interno/painel');
  }

  async function handleEnterReal() {
    setError('');
    setSubmitting(true);
    const { error } = await loginReal(email, password);
    setSubmitting(false);
    if (error) { setError('E-mail ou senha inválidos, ou este usuário ainda não tem acesso liberado.'); return; }
    navigate('/interno/painel');
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-body">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Seal label="UC" size={56} />
          <p className="font-display text-2xl text-parchment mt-4">UC Contracts</p>
          <p className="text-parchment/50 text-sm">Painel interno · Ulysses Cabette Advogados</p>
        </div>

        <div className="bg-parchment rounded-lg p-6">
          {isDemoMode ? (
            <>
              <label className="block mb-4">
                <span className="text-sm font-medium text-ink-700">Seu nome</span>
                <input
                  className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass"
                  value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ana Paula"
                />
              </label>

              <span className="text-sm font-medium text-ink-700">Perfil de acesso</span>
              <div className="mt-1 space-y-2">
                {ROLES.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setRole(r.key)}
                    className={`w-full text-left rounded-md border px-3 py-2.5 transition ${role === r.key ? 'border-brass bg-brass/5' : 'border-ink/10 hover:border-ink/25'}`}
                  >
                    <p className="text-sm font-medium text-ink">{r.label}</p>
                    <p className="text-xs text-ink/50">{r.desc}</p>
                  </button>
                ))}
              </div>

              <button
                disabled={!name || !role}
                onClick={handleEnterDemo}
                className="w-full mt-6 bg-ink text-parchment rounded-md py-2.5 text-sm font-medium disabled:opacity-30 hover:bg-ink-700 transition"
              >
                Entrar no painel
              </button>
              <p className="text-center text-ink/30 text-xs mt-4">
                Modo demonstração — defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para exigir e-mail e senha reais.
              </p>
            </>
          ) : (
            <>
              <label className="block mb-4">
                <span className="text-sm font-medium text-ink-700">E-mail corporativo</span>
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass"
                  value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@ucnadv.com"
                />
              </label>
              <label className="block mb-4">
                <span className="text-sm font-medium text-ink-700">Senha</span>
                <input
                  type="password"
                  className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEnterReal()}
                />
              </label>
              {error && <p className="text-xs text-signal-reject mb-3">{error}</p>}
              <button
                disabled={!email || !password || submitting}
                onClick={handleEnterReal}
                className="w-full bg-ink text-parchment rounded-md py-2.5 text-sm font-medium disabled:opacity-30 hover:bg-ink-700 transition"
              >
                {submitting ? 'Entrando...' : 'Entrar no painel'}
              </button>
              <p className="text-center text-ink/30 text-xs mt-4">
                Seu acesso é criado pelo Administrador Master em Authentication → Users no Supabase.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
