import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import PublicFormPage from './pages/PublicFormPage';
import InternalLogin from './pages/InternalLogin';
import Dashboard from './pages/internal/Dashboard';
import PipelineDetail from './pages/internal/PipelineDetail';
import TemplatesAdmin from './pages/internal/TemplatesAdmin';
import AuditLogPage from './pages/internal/AuditLogPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/novo/:slug" element={<PublicFormPage />} />
          <Route path="/interno" element={<InternalLogin />} />
          <Route path="/interno/painel" element={<Dashboard />} />
          <Route path="/interno/solicitacao/:id" element={<PipelineDetail />} />
          <Route path="/interno/modelos" element={<TemplatesAdmin />} />
          <Route path="/interno/auditoria" element={<AuditLogPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
