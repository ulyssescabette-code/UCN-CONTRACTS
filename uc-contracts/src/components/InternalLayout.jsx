import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileSignature, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Seal from './Seal';

export default function InternalLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/interno');
    return null;
  }

  function handleLogout() {
    logout();
    navigate('/interno');
  }

  const linkCls = ({ isActive }) =>
    `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${isActive ? 'bg-brass/15 text-brass-dark font-medium' : 'text-ink/60 hover:bg-ink/5'}`;

  return (
    <div className="min-h-screen bg-parchment font-body flex">
      <aside className="w-60 border-r border-ink/10 flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-ink/10">
          <Seal label="UC" size={34} />
          <div>
            <p className="font-display text-sm leading-tight text-ink">UC Contracts</p>
            <p className="text-[11px] text-ink/40">Painel interno</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/interno/painel" className={linkCls}><LayoutDashboard size={16} /> Painel</NavLink>
          <NavLink to="/interno/modelos" className={linkCls}><FileSignature size={16} /> Modelos & Geração</NavLink>
          <NavLink to="/interno/auditoria" className={linkCls}><ShieldCheck size={16} /> Auditoria</NavLink>
        </nav>
        <div className="px-5 py-4 border-t border-ink/10">
          <p className="text-sm text-ink font-medium">{user.name}</p>
          <p className="text-xs text-brass-dark">{user.label}</p>
          <button onClick={handleLogout} className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink transition">
            <LogOut size={13} /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
