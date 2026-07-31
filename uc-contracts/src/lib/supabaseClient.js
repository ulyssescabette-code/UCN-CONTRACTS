import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isDemoMode = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const supabase = isDemoMode
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (isDemoMode && typeof window !== 'undefined') {
  console.info(
    '[UC Contracts] Rodando em MODO DEMO (localStorage). ' +
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em um arquivo .env para usar o banco real.'
  );
}
