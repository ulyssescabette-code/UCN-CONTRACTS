import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db } from '../lib/dataStore';
import Seal from '../components/Seal';

export default function Home() {
  const [companies, setCompanies] = useState([]);
  useEffect(() => { db.getCompanies().then(setCompanies); }, []);
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-body">
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center mb-5"><Seal label="UC" size={64} /></div>
        <h1 className="font-display text-3xl text-parchment mb-2">UC Contracts</h1>
        <p className="text-parchment/50 text-sm mb-10">Escolha um link de empresa (formulário público) ou entre no painel interno.</p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {companies.map(c => (
            <Link
              key={c.id}
              to={`/novo/${c.slug}`}
              className="rounded-md border border-parchment/15 px-4 py-3 text-left hover:border-brass transition"
            >
              <p className="text-parchment text-sm font-medium">{c.name}</p>
              <p className="text-parchment/30 text-xs font-mono">/novo/{c.slug}</p>
            </Link>
          ))}
        </div>

        <Link to="/interno" className="inline-block bg-brass text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-brass-dark transition">
          Entrar no painel interno →
        </Link>
      </div>
    </div>
  );
}
