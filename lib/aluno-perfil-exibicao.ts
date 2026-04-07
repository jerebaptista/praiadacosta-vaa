/** Formatação só para UI do perfil / drawer. */

export function formatarCpfExibicao(cpf: string | null | undefined): string | null {
  if (cpf == null || String(cpf).trim() === "") return null;
  const d = String(cpf).replace(/\D/g, "");
  if (d.length !== 11) return String(cpf).trim();
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Ex.: `Av. Brasil, 500, Sala 2, Copacabana, Rio de Janeiro/RJ - 22021-000`
 * (Logradouro, número, complemento, bairro, cidade/UF - CEP)
 */
export function montarEnderecoUmaLinha(row: Record<string, unknown>): string | null {
  const log = row.logradouro ? String(row.logradouro).trim() : "";
  const num = row.numero ? String(row.numero).trim() : "";
  const comp = row.complemento ? String(row.complemento).trim() : "";
  const bairro = row.bairro ? String(row.bairro).trim() : "";
  const cidade = row.cidade ? String(row.cidade).trim() : "";
  const uf = row.estado ? String(row.estado).trim().toUpperCase() : "";
  const cepRaw = row.cep != null ? String(row.cep).replace(/\D/g, "") : "";
  const cepFmt =
    cepRaw.length === 8 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : row.cep ? String(row.cep).trim() : "";

  const trechos: string[] = [];
  for (const p of [log, num, comp, bairro]) {
    if (p) trechos.push(p);
  }

  const cidadeUf =
    cidade && uf ? `${cidade}/${uf}` : cidade || uf || "";
  if (cidadeUf) trechos.push(cidadeUf);

  let linha = trechos.join(", ");
  if (cepFmt) {
    linha = linha ? `${linha} - ${cepFmt}` : cepFmt;
  }

  return linha.length ? linha : null;
}
