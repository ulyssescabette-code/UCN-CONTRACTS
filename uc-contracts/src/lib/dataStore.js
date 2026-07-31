import { isDemoMode } from './supabaseClient';
import { db as demoDb } from './dataStore.demo';
import { db as supabaseDb } from './dataStore.supabase';

export { isDemoMode };
export const db = isDemoMode ? demoDb : supabaseDb;
