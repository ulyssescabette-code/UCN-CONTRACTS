import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isDemoMode } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const ROLE_LABELS = {
  master_admin: 'Administrador Master',
  legal: 'Jurídico',
  hr: 'RH / DP',
  finance: 'Financeiro',
  manager: 'Gestor',
  internal_client: 'Cliente Interno',
  viewer: 'Consulta'
};

// Se o usuário tiver mais de um papel (em empresas diferentes), usamos o de maior
// privilégio só para fins de exibição — o controle de acesso de verdade é feito
// pelas políticas RLS no banco, não por este mapeamento no frontend.
const ROLE_PRIORITY = ['master_admin', 'legal', 'finance', 'hr', 'manager', 'internal_client', 'viewer'];

async function fetchRoleForUser(userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role:roles(name)')
    .eq('user_id', userId);
  if (error || !data || data.length === 0) return null;
  const names = data.map(r => r.role?.name).filter(Boolean);
  return ROLE_PRIORITY.find(r => names.includes(r)) || names[0];
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!isDemoMode) return null;
    const raw = sessionStorage.getItem('uc_contracts_session');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode) return;

    let mounted = true;
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = await fetchRoleForUser(session.user.id);
        if (mounted) setUser({
          id: session.user.id,
          name: session.user.email,
          email: session.user.email,
          role,
          label: role ? ROLE_LABELS[role] : 'Sem papel atribuído'
        });
      }
      if (mounted) setLoading(false);
    }
    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) { setUser(null); return; }
      const role = await fetchRoleForUser(session.user.id);
      setUser({
        id: session.user.id,
        name: session.user.email,
        email: session.user.email,
        role,
        label: role ? ROLE_LABELS[role] : 'Sem papel atribuído'
      });
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isDemoMode) return;
    if (user) sessionStorage.setItem('uc_contracts_session', JSON.stringify(user));
    else sessionStorage.removeItem('uc_contracts_session');
  }, [user]);

  // Modo demo: login "manual" escolhendo um papel, sem senha
  function loginDemo(name, role) {
    setUser({ name, role, label: ROLE_LABELS[role] });
  }

  // Modo real: login por e-mail/senha (o usuário precisa ter sido convidado antes
  // pelo Master Admin em Authentication → Users, e ter um papel em user_roles)
  async function loginReal(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    return { data };
  }

  async function logout() {
    if (isDemoMode) { setUser(null); return; }
    await supabase.auth.signOut();
    setUser(null);
  }

  function can(action) {
    if (!user) return false;
    if (user.role === 'master_admin') return true;
    const map = {
      fill_hr: ['hr'],
      fill_finance: ['finance'],
      legal_review: ['legal'],
      manage_templates: ['legal'],
      generate_contract: ['legal'],
      view_all: ['legal', 'manager']
    };
    return (map[action] || []).includes(user.role);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginDemo, loginReal, logout, can, ROLE_LABELS }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
