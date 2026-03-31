/**
 * BIO ANÁLISE — Supabase Client
 * -----------------------------------------------------------
 * Edite apenas as duas constantes abaixo quando o EasyPanel
 * estiver configurado. Tudo o mais funciona automaticamente.
 * -----------------------------------------------------------
 */

const SUPABASE_URL      = 'https://supabase.lab-bioanalise.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZWFrenh3cWV0ZHJwcWxwamN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDQ2NTQsImV4cCI6MjA4NzYyMDY1NH0.G2POYmbFQj7kYEx2iVV_tQMoJXZ5O8Km9RHD_RLwPyM';

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
