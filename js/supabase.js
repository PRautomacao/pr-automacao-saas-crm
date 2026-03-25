/**
 * BIO ANÁLISE — Supabase Client
 * -----------------------------------------------------------
 * Edite apenas as duas constantes abaixo quando o EasyPanel
 * estiver configurado. Tudo o mais funciona automaticamente.
 * -----------------------------------------------------------
 */

const SUPABASE_URL      = 'https://supabase.lab-bioanalise.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// CDN do Supabase JS SDK v2 é carregado via <script> nos HTMLs.
// Aqui apenas inicializamos o client.
const _supa = (typeof supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Exporta o client para uso em data.js.
 * Se as credenciais ainda não foram configuradas, retorna null
 * e data.js cai automaticamente para o modo localStorage.
 */
const SUPA = _supa;
