// ---------------------------------------------------------------------------
// Funções dos campos de formulário: datas e listas de opções.
// ---------------------------------------------------------------------------

export function hojeIso() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

export function formatarDataAgenda(dataIso: string) {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function converterDataAgenda(dataTexto: string) {
  const partes = dataTexto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) return null;

  const [, dia, mes, ano] = partes;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  if (data.getFullYear() !== Number(ano) || data.getMonth() !== Number(mes) - 1 || data.getDate() !== Number(dia)) return null;
  return `${ano}-${mes}-${dia}`;
}

// Insere as barras sozinho: quem digita 25092026 vê 25/09/2026.
export function mascararData(valor: string) {
  const n = valor.replace(/\D/g, '').substring(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.substring(0, 2)}/${n.substring(2)}`;
  return `${n.substring(0, 2)}/${n.substring(2, 4)}/${n.substring(4)}`;
}

// Limite de data com a mensagem mostrada quando ele é desrespeitado.
export interface LimiteData {
  data: string;
  mensagem: string;
}

export const ANO_MINIMO: LimiteData = { data: '1900-01-01', mensagem: 'Confira o ano digitado.' };
// Usado como máximo (nada no futuro) ou como mínimo (nada no passado).
export const hoje = (mensagem: string): LimiteData => ({ data: hojeIso(), mensagem });

// Mantém na lista um valor antigo que saiu das opções, para ele não sumir do formulário.
export const opcoesCom = (lista: string[], atual?: string) => (atual && !lista.includes(atual) ? [...lista, atual] : lista);
