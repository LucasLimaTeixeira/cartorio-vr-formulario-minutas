import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { canEditWorkspace, loadWorkspaceState, removeWorkspaceState, saveWorkspaceState, workspaceProfile } from './workspaceStorage';

// ---------------------------------------------------------------------------
// Atendimentos
//
// Cada atendimento é um rascunho próprio na tabela form_drafts. Vários atendentes
// podem preencher o mesmo tipo de formulário ao mesmo tempo sem se sobrescrever.
// A aba do navegador lembra qual atendimento está aberto em cada formulário.
// ---------------------------------------------------------------------------

export type TipoFormulario = 'procuracao' | 'apostilamento' | 'certidao' | 'uniao-estavel' | 'pacto-antenupcial';

export const CHAVE_FORMULARIO: Record<TipoFormulario, string> = {
  procuracao: 'formulario-procuracao',
  apostilamento: 'formulario-apostilamento',
  certidao: 'formulario-certidao',
  'uniao-estavel': 'formulario-uniao-estavel',
  'pacto-antenupcial': 'formulario-pacto-antenupcial',
};

const TIPOS = Object.keys(CHAVE_FORMULARIO) as TipoFormulario[];
const chaveAtendimentoAtual = (tipo: TipoFormulario) => `atendimento-atual-${tipo}`;
const ESPERA_PARA_SALVAR_MS = 1000;

export interface ResumoAtendimento {
  id: string;
  titulo: string;
  atualizadoEm: string;
  atualizadoPor: string;
}

export type StatusAtendimento = 'novo' | 'pendente' | 'salvando' | 'salvo' | 'erro' | 'consulta';

const remoto = () => Boolean(supabase && workspaceProfile.workspaceId !== 'workspace-local-demo');

export async function listarAtendimentos(tipo: TipoFormulario): Promise<ResumoAtendimento[]> {
  if (!supabase || !remoto()) return [];
  const { data, error } = await supabase
    .from('form_drafts')
    .select('id, title, updated_at, updated_by, created_by')
    .eq('workspace_id', workspaceProfile.workspaceId)
    .eq('form_type', tipo)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  const linhas = data ?? [];
  const ids = [...new Set(linhas.map((l) => l.updated_by ?? l.created_by).filter(Boolean))];
  const { data: perfis } = ids.length ? await supabase.from('profiles').select('id, full_name, email').in('id', ids) : { data: [] };
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.full_name || p.email]));
  return linhas.map((l) => ({ id: l.id, titulo: l.title, atualizadoEm: l.updated_at, atualizadoPor: nomes.get(l.updated_by ?? l.created_by) ?? '' }));
}

async function buscarAtendimento(id: string): Promise<unknown | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('form_drafts').select('data').eq('id', id).maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

async function gravarAtendimento(id: string, tipo: TipoFormulario, titulo: string, dados: unknown) {
  if (!supabase) return;
  const { error } = await supabase.from('form_drafts').upsert(
    { id, workspace_id: workspaceProfile.workspaceId, form_type: tipo, title: titulo.slice(0, 300), data: dados },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

async function apagarAtendimento(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('form_drafts').delete().eq('id', id);
  if (error) throw error;
}

// No login: se um colega encerrou o atendimento que esta aba tinha aberto, o formulário volta limpo.
export async function hidratarAtendimentos() {
  if (!supabase || !remoto()) return;
  const abertos = TIPOS.map((tipo) => [tipo, loadWorkspaceState<string | null>(chaveAtendimentoAtual(tipo), null)] as const)
    .filter((par): par is readonly [TipoFormulario, string] => Boolean(par[1]));
  if (!abertos.length) return;

  const { data, error } = await supabase.from('form_drafts').select('id').in('id', abertos.map(([, id]) => id));
  if (error) throw error;
  const existentes = new Set((data ?? []).map((linha) => linha.id));
  abertos.forEach(([tipo, id]) => {
    if (existentes.has(id)) return;
    removeWorkspaceState(chaveAtendimentoAtual(tipo));
    removeWorkspaceState(CHAVE_FORMULARIO[tipo]);
  });
}

export interface ControleAtendimento {
  id: string;
  lista: ResumoAtendimento[];
  status: StatusAtendimento;
  recarregar: () => Promise<void>;
  abrir: (id: string) => Promise<void>;
  novo: () => Promise<void>;
  encerrar: () => Promise<void>;
}

// Grava o formulário 1s depois da última alteração, uma gravação por vez, sempre no atendimento aberto.
export function useAtendimento<T extends object>(
  tipo: TipoFormulario,
  valor: T,
  definir: (valor: T) => void,
  vazio: () => T,
  titulo: (valor: T) => string,
): ControleAtendimento {
  const [id, setId] = useState(() => loadWorkspaceState<string | null>(chaveAtendimentoAtual(tipo), null) ?? crypto.randomUUID());
  const [lista, setLista] = useState<ResumoAtendimento[]>([]);
  const [status, setStatus] = useState<StatusAtendimento>(() => (canEditWorkspace() ? 'novo' : 'consulta'));
  const ultimoSalvo = useRef(JSON.stringify(valor));
  const vazioJson = useRef(JSON.stringify(vazio()));
  const fila = useRef<Promise<void>>(Promise.resolve());
  const temporizador = useRef<number | undefined>(undefined);
  const atual = useRef({ id, valor, titulo, lista });
  atual.current = { id, valor, titulo, lista };

  useEffect(() => { saveWorkspaceState(chaveAtendimentoAtual(tipo), id); }, [tipo, id]);
  useEffect(() => { saveWorkspaceState(CHAVE_FORMULARIO[tipo], valor); }, [tipo, valor]);

  const recarregar = useCallback(async () => {
    try { setLista(await listarAtendimentos(tipo)); } catch { /* a lista volta na próxima tentativa */ }
  }, [tipo]);
  useEffect(() => { void recarregar(); }, [recarregar]);
  // Atendimento reaberto após recarregar a página já existe no banco.
  useEffect(() => {
    if (lista.some((a) => a.id === id)) setStatus((s) => (s === 'novo' ? 'salvo' : s));
  }, [lista, id]);

  const gravar = useCallback(async () => {
    const { id: idAtual, valor: dados, titulo: tituloDe, lista: listaAtual } = atual.current;
    const json = JSON.stringify(dados);
    if (json === ultimoSalvo.current || !remoto() || !canEditWorkspace()) return;
    // Formulário em branco que nunca foi salvo não vira atendimento.
    if (json === vazioJson.current && !listaAtual.some((a) => a.id === idAtual)) { ultimoSalvo.current = json; setStatus('novo'); return; }
    setStatus('salvando');
    try {
      const nome = tituloDe(dados).trim();
      await gravarAtendimento(idAtual, tipo, nome, dados);
      ultimoSalvo.current = json;
      if (atual.current.id === idAtual) setStatus(JSON.stringify(atual.current.valor) === json ? 'salvo' : 'pendente');
      const resumo: ResumoAtendimento = { id: idAtual, titulo: nome, atualizadoEm: new Date().toISOString(), atualizadoPor: workspaceProfile.userName };
      setLista((l) => [resumo, ...l.filter((a) => a.id !== idAtual)]);
    } catch {
      setStatus('erro');
    }
  }, [tipo]);

  // Pendências entram numa fila: uma gravação lenta nunca chega depois de uma mais nova.
  const salvarAgora = useCallback(() => {
    window.clearTimeout(temporizador.current);
    temporizador.current = undefined;
    fila.current = fila.current.then(gravar);
    return fila.current;
  }, [gravar]);

  useEffect(() => {
    if (!canEditWorkspace() || JSON.stringify(valor) === ultimoSalvo.current) return;
    setStatus('pendente');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => { void salvarAgora(); }, ESPERA_PARA_SALVAR_MS);
  }, [valor, salvarAgora]);

  // Ao sair da aba ou fechar o navegador, tenta gravar o que ainda estiver pendente.
  // Quando a conexão volta, grava o que falhou.
  useEffect(() => {
    const aoEsconder = () => { if (document.visibilityState === 'hidden' && temporizador.current !== undefined) void salvarAgora(); };
    const aoReconectar = () => { void salvarAgora(); };
    document.addEventListener('visibilitychange', aoEsconder);
    window.addEventListener('online', aoReconectar);
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder);
      window.removeEventListener('online', aoReconectar);
      if (temporizador.current !== undefined) void salvarAgora();
    };
  }, [salvarAgora]);

  // Antes de trocar de atendimento, o atual precisa estar gravado; senão as alterações se perderiam.
  const garantirSalvo = useCallback(async () => {
    await salvarAgora();
    const pendente = JSON.stringify(atual.current.valor) !== ultimoSalvo.current;
    if (pendente && remoto() && canEditWorkspace()) throw new Error('Não foi possível salvar este atendimento. Verifique a conexão antes de trocar.');
  }, [salvarAgora]);

  const carregar = useCallback((novoId: string, dados: T) => {
    ultimoSalvo.current = JSON.stringify(dados);
    definir(dados);
    setId(novoId);
  }, [definir]);

  const novo = useCallback(async () => {
    await garantirSalvo();
    carregar(crypto.randomUUID(), vazio());
    setStatus(canEditWorkspace() ? 'novo' : 'consulta');
  }, [garantirSalvo, carregar, vazio]);

  const abrir = useCallback(async (outroId: string) => {
    if (outroId === atual.current.id) return;
    await garantirSalvo();
    const dados = await buscarAtendimento(outroId);
    if (!dados) { await recarregar(); throw new Error('Este atendimento já foi encerrado por outro usuário.'); }
    carregar(outroId, { ...vazio(), ...(dados as Partial<T>) });
    setStatus(canEditWorkspace() ? 'salvo' : 'consulta');
  }, [garantirSalvo, recarregar, carregar, vazio]);

  const encerrar = useCallback(async () => {
    window.clearTimeout(temporizador.current);
    temporizador.current = undefined;
    await fila.current;
    const idAtual = atual.current.id;
    // Apaga mesmo sem constar na lista: uma gravação pode ter terminado antes da tela atualizar.
    if (remoto() && canEditWorkspace()) await apagarAtendimento(idAtual);
    setLista((l) => l.filter((a) => a.id !== idAtual));
    carregar(crypto.randomUUID(), vazio());
    setStatus('novo');
  }, [carregar, vazio]);

  return { id, lista, status, recarregar, abrir, novo, encerrar };
}
