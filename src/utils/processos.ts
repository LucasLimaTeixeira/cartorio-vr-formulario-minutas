import { supabase } from '../lib/supabase';
import { workspaceProfile } from './workspaceStorage';
import { hojeIso } from './campos';

// ---------------------------------------------------------------------------
// Processos: o que entrou no cartório para lavratura, com gaveta, data prevista,
// certidões e exigências. Desenho em docs/superpowers/specs/2026-09-25-processos-analisador-design.md
// ---------------------------------------------------------------------------

export type Etapa = 'recebido' | 'em_analise' | 'em_exigencia' | 'pronto' | 'lavrado' | 'cancelado';

export const ETAPAS: { id: Etapa; rotulo: string }[] = [
  { id: 'recebido', rotulo: 'Recebido' },
  { id: 'em_analise', rotulo: 'Em análise' },
  { id: 'em_exigencia', rotulo: 'Em exigência' },
  { id: 'pronto', rotulo: 'Pronto para lavratura' },
  { id: 'lavrado', rotulo: 'Lavrado' },
  { id: 'cancelado', rotulo: 'Cancelado' },
];
export const rotuloEtapa = (etapa: Etapa) => ETAPAS.find((e) => e.id === etapa)?.rotulo ?? etapa;
// Lavrado e cancelado saem do acompanhamento: não geram alerta.
export const etapaEncerrada = (etapa: Etapa) => etapa === 'lavrado' || etapa === 'cancelado';

// Lista inicial; os campos próprios de cada ato serão detalhados depois.
export const TIPOS_ATO = [
  'Escritura de compra e venda',
  'Escritura de doação',
  'Escritura de inventário',
  'Escritura de divórcio',
  'Procuração',
  'União estável',
  'Pacto antenupcial',
  'Ata notarial',
  'Testamento',
  'Outro',
];

export interface Parte {
  nome: string;
  documento: string;
}

export interface Processo {
  id: string;
  tipoAto: string;
  partes: Parte[];
  objeto: string;
  gaveta: string;
  dataEntrada: string;
  dataPrevista: string;
  etapa: Etapa;
  responsavelId: string;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Certidao {
  id: string;
  processoId: string;
  tipo: string;
  referente: string;
  dataEmissao: string;
  vencimento: string;
  observacao: string;
}

export interface Exigencia {
  id: string;
  processoId: string;
  texto: string;
  cumprida: boolean;
  cumpridaEm: string;
}

// ---------------------------------------------------------------------------
// Certidões e validade
// ---------------------------------------------------------------------------

export const TIPO_CERTIDAO_OUTRA = 'Outra';

// Prazo padrão de 30 dias: cada cartório ajusta conforme as normas do seu estado.
export const TIPOS_CERTIDAO: { tipo: string; prazoPadrao: number }[] = [
  { tipo: 'Ônus Reais (Registro de Imóveis)', prazoPadrao: 30 },
  { tipo: 'Interdição e Tutela', prazoPadrao: 30 },
  { tipo: 'Distribuição de Ações Cíveis — Justiça Estadual', prazoPadrao: 30 },
  { tipo: 'Distribuição de Ações Fiscais — Justiça Estadual', prazoPadrao: 30 },
  { tipo: 'Distribuição de Ações Cíveis e Fiscais — Justiça Federal', prazoPadrao: 30 },
  { tipo: 'Distribuição de Ações — Justiça do Trabalho', prazoPadrao: 30 },
];

export type Prazos = Record<string, number>;

export function prazoDe(tipo: string, prazos: Prazos): number | null {
  const padrao = TIPOS_CERTIDAO.find((t) => t.tipo === tipo)?.prazoPadrao;
  if (padrao === undefined) return null;
  const ajustado = prazos[tipo];
  return Number.isInteger(ajustado) && ajustado > 0 ? ajustado : padrao;
}

export function somarDias(dataIso: string, dias: number) {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia + dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

// Vencimento sugerido pela emissão + prazo do tipo. "Outra" não tem prazo: a validade é digitada.
export function vencimentoSugerido(tipo: string, dataEmissao: string, prazos: Prazos) {
  const prazo = prazoDe(tipo, prazos);
  return dataEmissao && prazo ? somarDias(dataEmissao, prazo) : '';
}

export type SituacaoCertidao = 'ok' | 'vencendo' | 'vencida' | 'sem_data';
export const DIAS_AVISO = 5;

// Vencendo: vence em até 5 dias ou antes da data prevista da lavratura.
export function situacaoCertidao(certidao: Pick<Certidao, 'vencimento'>, dataPrevista: string, hoje = hojeIso()): SituacaoCertidao {
  if (!certidao.vencimento) return 'sem_data';
  if (certidao.vencimento < hoje) return 'vencida';
  if (certidao.vencimento <= somarDias(hoje, DIAS_AVISO)) return 'vencendo';
  if (dataPrevista && certidao.vencimento < dataPrevista) return 'vencendo';
  return 'ok';
}

// Alertas de um processo em andamento: certidões vencidas ou vencendo antes da lavratura.
export function alertasDoProcesso(processo: Processo, certidoes: Certidao[]) {
  if (etapaEncerrada(processo.etapa)) return [];
  return certidoes.filter((c) => c.processoId === processo.id && ['vencida', 'vencendo'].includes(situacaoCertidao(c, processo.dataPrevista)));
}

// ---------------------------------------------------------------------------
// Banco
// ---------------------------------------------------------------------------

type LinhaProcesso = {
  id: string; tipo_ato: string; partes: Parte[] | null; objeto: string; gaveta: string; data_entrada: string;
  data_prevista: string | null; etapa: Etapa; responsavel_id: string | null; observacoes: string; created_at: string; updated_at: string;
};
type LinhaCertidao = { id: string; processo_id: string; tipo: string; referente: string; data_emissao: string | null; vencimento: string | null; observacao: string };
type LinhaExigencia = { id: string; processo_id: string; texto: string; cumprida: boolean; cumprida_em: string | null };

const paraProcesso = (l: LinhaProcesso): Processo => ({
  id: l.id, tipoAto: l.tipo_ato, partes: l.partes ?? [], objeto: l.objeto, gaveta: l.gaveta, dataEntrada: l.data_entrada,
  dataPrevista: l.data_prevista ?? '', etapa: l.etapa, responsavelId: l.responsavel_id ?? '', observacoes: l.observacoes,
  criadoEm: l.created_at, atualizadoEm: l.updated_at,
});
const paraCertidao = (l: LinhaCertidao): Certidao => ({
  id: l.id, processoId: l.processo_id, tipo: l.tipo, referente: l.referente, dataEmissao: l.data_emissao ?? '', vencimento: l.vencimento ?? '', observacao: l.observacao,
});
const paraExigencia = (l: LinhaExigencia): Exigencia => ({ id: l.id, processoId: l.processo_id, texto: l.texto, cumprida: l.cumprida, cumpridaEm: l.cumprida_em ?? '' });

const banco = () => {
  if (!supabase || workspaceProfile.workspaceId === 'workspace-local-demo') throw new Error('Processos precisam do banco do cartório.');
  return supabase;
};

export const processosDisponiveis = () => Boolean(supabase && workspaceProfile.workspaceId !== 'workspace-local-demo');

export async function listarProcessos(): Promise<Processo[]> {
  const { data, error } = await banco().from('processos').select('*').eq('workspace_id', workspaceProfile.workspaceId)
    .order('data_prevista', { ascending: true, nullsFirst: false }).limit(1000);
  if (error) throw error;
  return (data as LinhaProcesso[]).map(paraProcesso);
}

// Todas as certidões dos processos do cartório (o RLS já limita ao cartório do usuário).
export async function listarCertidoes(): Promise<Certidao[]> {
  const { data, error } = await banco().from('processo_certidoes').select('*').order('vencimento', { ascending: true }).limit(5000);
  if (error) throw error;
  return (data as LinhaCertidao[]).map(paraCertidao);
}

export async function listarExigencias(processoId: string): Promise<Exigencia[]> {
  const { data, error } = await banco().from('processo_exigencias').select('*').eq('processo_id', processoId).order('created_at');
  if (error) throw error;
  return (data as LinhaExigencia[]).map(paraExigencia);
}

export type NovoProcesso = Pick<Processo, 'tipoAto' | 'partes' | 'objeto' | 'observacoes'> & Partial<Pick<Processo, 'gaveta' | 'dataPrevista' | 'etapa' | 'responsavelId' | 'dataEntrada'>>;

const partesLimpas = (partes: Parte[]) => partes.map((p) => ({ nome: p.nome.trim(), documento: p.documento.trim() })).filter((p) => p.nome || p.documento);

export async function criarProcesso(p: NovoProcesso): Promise<Processo> {
  const { data, error } = await banco().from('processos').insert({
    workspace_id: workspaceProfile.workspaceId,
    tipo_ato: p.tipoAto.trim(),
    partes: partesLimpas(p.partes),
    objeto: p.objeto.trim(),
    observacoes: p.observacoes.trim(),
    gaveta: p.gaveta?.trim() ?? '',
    data_prevista: p.dataPrevista || null,
    data_entrada: p.dataEntrada || hojeIso(),
    etapa: p.etapa ?? 'recebido',
    responsavel_id: p.responsavelId || null,
  }).select('*').single();
  if (error) throw error;
  return paraProcesso(data as LinhaProcesso);
}

export async function salvarProcesso(p: Processo): Promise<Processo> {
  const { data, error } = await banco().from('processos').update({
    tipo_ato: p.tipoAto.trim(),
    partes: partesLimpas(p.partes),
    objeto: p.objeto.trim(),
    gaveta: p.gaveta.trim(),
    data_entrada: p.dataEntrada,
    data_prevista: p.dataPrevista || null,
    etapa: p.etapa,
    responsavel_id: p.responsavelId || null,
    observacoes: p.observacoes.trim(),
  }).eq('id', p.id).select('*').single();
  if (error) throw error;
  return paraProcesso(data as LinhaProcesso);
}

export async function excluirProcesso(id: string) {
  const { error } = await banco().from('processos').delete().eq('id', id);
  if (error) throw error;
}

export async function adicionarCertidao(c: Omit<Certidao, 'id'>): Promise<Certidao> {
  const { data, error } = await banco().from('processo_certidoes').insert({
    processo_id: c.processoId, tipo: c.tipo, referente: c.referente.trim(), data_emissao: c.dataEmissao || null,
    vencimento: c.vencimento || null, observacao: c.observacao.trim(),
  }).select('*').single();
  if (error) throw error;
  return paraCertidao(data as LinhaCertidao);
}

export async function removerCertidao(id: string) {
  const { error } = await banco().from('processo_certidoes').delete().eq('id', id);
  if (error) throw error;
}

export async function adicionarExigencia(processoId: string, texto: string): Promise<Exigencia> {
  const { data, error } = await banco().from('processo_exigencias').insert({ processo_id: processoId, texto: texto.trim() }).select('*').single();
  if (error) throw error;
  return paraExigencia(data as LinhaExigencia);
}

export async function marcarExigencia(id: string, cumprida: boolean): Promise<Exigencia> {
  const { data, error } = await banco().from('processo_exigencias').update({ cumprida }).eq('id', id).select('*').single();
  if (error) throw error;
  return paraExigencia(data as LinhaExigencia);
}

export async function removerExigencia(id: string) {
  const { error } = await banco().from('processo_exigencias').delete().eq('id', id);
  if (error) throw error;
}

export async function carregarPrazos(): Promise<Prazos> {
  if (!processosDisponiveis()) return {};
  const { data, error } = await banco().from('workspace_settings').select('prazos_certidoes').eq('workspace_id', workspaceProfile.workspaceId).maybeSingle();
  if (error) throw error;
  return (data?.prazos_certidoes as Prazos | undefined) ?? {};
}

export async function salvarPrazos(prazos: Prazos) {
  const { error } = await banco().from('workspace_settings').update({ prazos_certidoes: prazos, updated_at: new Date().toISOString() }).eq('workspace_id', workspaceProfile.workspaceId);
  if (error) throw error;
}

// Qualquer mudança em processos, certidões ou exigências do cartório dispara o recarregamento.
export function assinarProcessos(aoMudar: () => void) {
  if (!processosDisponiveis()) return () => undefined;
  const cliente = banco();
  const canal = cliente.channel(`processos-${workspaceProfile.workspaceId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'processos', filter: `workspace_id=eq.${workspaceProfile.workspaceId}` }, aoMudar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'processo_certidoes' }, aoMudar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'processo_exigencias' }, aoMudar)
    .subscribe();
  return () => { void cliente.removeChannel(canal); };
}

// Texto da nota de exigência, para copiar ou imprimir.
export function textoNotaExigencia(processo: Processo, exigencias: Exigencia[], cartorio: string, cidade: string) {
  const pendentes = exigencias.filter((e) => !e.cumprida);
  const partes = processo.partes.map((p) => p.nome).filter(Boolean).join(', ') || '[partes não informadas]';
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return [
    cartorio,
    'NOTA DE EXIGÊNCIA',
    `Ato: ${processo.tipoAto}\nPartes: ${partes}${processo.gaveta ? `\nGaveta: ${processo.gaveta}` : ''}`,
    'Para prosseguimento do ato, solicitamos o atendimento das seguintes exigências:',
    pendentes.length ? pendentes.map((e, i) => `${i + 1}. ${e.texto}`).join('\n') : 'Não há exigências pendentes.',
    `${cidade ? `${cidade}, ` : ''}${hoje}.`,
  ].filter(Boolean).join('\n\n');
}
