// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
// 1. Crie um projeto gratuito em https://supabase.com
// 2. Vá em Project Settings > API
// 3. Copie a "Project URL" e cole em SUPABASE_URL abaixo
// 4. Copie a chave "anon public" e cole em SUPABASE_ANON_KEY abaixo
// 5. Rode o arquivo schema.sql no SQL Editor do seu projeto Supabase
// ============================================================

const SUPABASE_URL = "https://bdeanyzamkkkxwegxioq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TZ1DlFNHjk8ysfdmoTs-oA_gSEvSgzt";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);