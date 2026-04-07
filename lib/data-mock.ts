/**
 * Dados mockados (remadas, turmas, alunos, planos + pagamentos em memória).
 *
 * Ative no `.env.local` (só servidor — não use `NEXT_PUBLIC_`):
 *   USE_DATA_MOCK=true
 *
 * Não ative em produção. O estado vive em `globalThis` e reinicia ao
 * reiniciar o processo Node (em serverless, cada instância tem a sua cópia).
 *
 * Fora do mock: login e outras áreas continuam a usar Supabase se configurado.
 * Ações de créditos que não foram adaptadas ainda falam com a API real.
 */
export function useDataMock(): boolean {
  return process.env.USE_DATA_MOCK === "true";
}
