/**
 * Dados mockados (remadas, turmas, alunos, planos + pagamentos em memória).
 *
 * Prioridade:
 * - `USE_DATA_MOCK=true` ou `1` → sempre mock
 * - `USE_DATA_MOCK=false` ou `0` → sempre Supabase (se configurado)
 * - Sem variável: em **development** ou **test** → mock por defeito (trabalhar sem backend)
 * - Produção sem `USE_DATA_MOCK`: com credenciais Supabase → Supabase; sem credenciais → mock
 *
 * O estado vive em `globalThis` e reinicia ao reiniciar o processo Node.
 *
 * Para ligar ao Supabase em desenvolvimento: `USE_DATA_MOCK=false` no `.env.local`.
 */
export function useDataMock(): boolean {
  const raw = process.env.USE_DATA_MOCK?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;

  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

  if (!hasSupabase) return true;

  const env = process.env.NODE_ENV;
  if (env === "development" || env === "test") {
    return true;
  }

  return false;
}
