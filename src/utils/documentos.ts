// ---------------------------------------------------------------------------
// CPF e CNPJ: máscara e validação dos dígitos verificadores.
//
// Desde julho de 2026 a Receita Federal emite CNPJ alfanumérico: as 12 primeiras
// posições aceitam letras e números, e os 2 dígitos verificadores continuam
// numéricos. Os CNPJs só com números seguem válidos pela mesma regra.
// ---------------------------------------------------------------------------

export type TipoDocumento = 'CPF' | 'CNPJ';

export function formatarCPF(valor: string) {
  const n = valor.replace(/\D/g, '').substring(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.substring(0, 3)}.${n.substring(3)}`;
  if (n.length <= 9) return `${n.substring(0, 3)}.${n.substring(3, 6)}.${n.substring(6)}`;
  return `${n.substring(0, 3)}.${n.substring(3, 6)}.${n.substring(6, 9)}-${n.substring(9)}`;
}

// Letras e números nas 12 primeiras posições; só números nos 2 dígitos verificadores.
function caracteresCNPJ(valor: string) {
  const limpo = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const base = limpo.substring(0, 12);
  const dv = limpo.substring(12).replace(/\D/g, '').substring(0, 2);
  return base + dv;
}

export function formatarCNPJ(valor: string) {
  const c = caracteresCNPJ(valor);
  if (c.length <= 2) return c;
  if (c.length <= 5) return `${c.substring(0, 2)}.${c.substring(2)}`;
  if (c.length <= 8) return `${c.substring(0, 2)}.${c.substring(2, 5)}.${c.substring(5)}`;
  if (c.length <= 12) return `${c.substring(0, 2)}.${c.substring(2, 5)}.${c.substring(5, 8)}/${c.substring(8)}`;
  return `${c.substring(0, 2)}.${c.substring(2, 5)}.${c.substring(5, 8)}/${c.substring(8, 12)}-${c.substring(12)}`;
}

export const formatarDocumento = (valor: string, tipo: TipoDocumento) => (tipo === 'CPF' ? formatarCPF(valor) : formatarCNPJ(valor));

export function cpfValido(valor: string) {
  const n = valor.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const digito = (tamanho: number) => {
    const soma = [...n.substring(0, tamanho)].reduce((total, d, i) => total + Number(d) * (tamanho + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(n[9]) && digito(10) === Number(n[10]);
}

export function cnpjValido(valor: string) {
  const c = caracteresCNPJ(valor);
  if (c.length !== 14 || !/^\d{2}$/.test(c.substring(12)) || /^(\d)\1{13}$/.test(c)) return false;
  // Cada caractere vale seu código ASCII menos 48: '0'..'9' = 0..9, 'A' = 17, 'B' = 18...
  const valores = [...c].map((ch) => ch.charCodeAt(0) - 48);
  const digito = (tamanho: number) => {
    const pesos = [...Array(tamanho)].map((_, i) => ((tamanho - 1 - i) % 8) + 2);
    const soma = valores.slice(0, tamanho).reduce((total, v, i) => total + v * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === valores[12] && digito(13) === valores[13];
}

// Mensagem para mostrar abaixo do campo. Número incompleto só é apontado depois que a pessoa sai do campo.
export function problemaDocumento(valor: string, tipo: TipoDocumento, saiuDoCampo: boolean) {
  const tamanho = tipo === 'CPF' ? valor.replace(/\D/g, '').length : caracteresCNPJ(valor).length;
  const esperado = tipo === 'CPF' ? 11 : 14;
  if (tamanho === 0) return '';
  if (tamanho < esperado) return saiuDoCampo ? `${tipo} incompleto.` : '';
  const valido = tipo === 'CPF' ? cpfValido(valor) : cnpjValido(valor);
  return valido ? '' : `${tipo} inválido: confira os números digitados.`;
}
