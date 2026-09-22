import { supabase } from '../lib/supabase';
import { canEditWorkspace, workspaceProfile } from './workspaceStorage';

export type CadastroAgenda = {
  id: number;
  remoteId?: string;
  formulario: string;
  descricao: string;
  cliente: string;
  usaSala: boolean;
};

export type AgendamentoAgenda = {
  id: string;
  data: string;
  horario: string;
  sala: string;
  atendente: string;
  ato: string;
  cliente: string;
  usaSala: boolean;
  realizado?: boolean;
};

type AgendaRecord = {
  id: string;
  kind: 'appointment' | 'pending';
  status: 'active' | 'realized' | 'cancelled';
  data: Record<string, unknown>;
};

export const atosAgendaIniciais: AgendamentoAgenda[] = [
  { id: 'demo-1', data: '2026-09-13', horario: '08:30', sala: 'Sala 1', atendente: 'ana', ato: 'Procuração pública', cliente: 'Mariana Souza', usaSala: true },
  { id: 'demo-2', data: '2026-09-13', horario: '09:30', sala: 'Sala 1', atendente: 'ana', ato: 'Escritura de compra e venda', cliente: 'Rafael Oliveira', usaSala: true },
  { id: 'demo-3', data: '2026-09-13', horario: '09:30', sala: 'Sala 2', atendente: 'bruno', ato: 'Pacto antenupcial', cliente: 'Beatriz Lima', usaSala: true },
  { id: 'demo-4', data: '2026-09-13', horario: '09:30', sala: 'Sala 3', atendente: 'carla', ato: 'União estável', cliente: 'João e Camila', usaSala: true },
  { id: 'demo-5', data: '2026-09-13', horario: '10:30', sala: 'Sem sala', atendente: 'diego', ato: 'Certidão', cliente: 'Luciana Alves', usaSala: false },
  { id: 'demo-6', data: '2026-09-13', horario: '10:30', sala: 'Sem sala', atendente: 'ana', ato: 'Apostilamento', cliente: 'Pedro Martins', usaSala: false },
  { id: 'demo-7', data: '2026-09-13', horario: '11:30', sala: 'Sala 3', atendente: 'bruno', ato: 'Procuração pública', cliente: 'Fernanda Costa', usaSala: true },
  { id: 'demo-8', data: '2026-09-13', horario: '14:30', sala: 'Sala 1', atendente: 'carla', ato: 'Escritura declaratória', cliente: 'Carlos Mendes', usaSala: true },
];

const remotoDisponivel = () => Boolean(supabase && workspaceProfile.workspaceId !== 'workspace-local-demo');

function registroParaAgendamento(record: AgendaRecord): AgendamentoAgenda {
  return { ...(record.data as unknown as AgendamentoAgenda), id: record.id, realizado: record.status === 'realized' };
}

function registroParaCadastro(record: AgendaRecord): CadastroAgenda {
  return { ...(record.data as unknown as CadastroAgenda), id: Number(record.data.id) || Date.now(), remoteId: record.id };
}

export async function carregarAgenda(): Promise<{ agendamentos: AgendamentoAgenda[]; cadastros: CadastroAgenda[] }> {
  if (!remotoDisponivel()) return { agendamentos: atosAgendaIniciais, cadastros: [] };

  const { data, error } = await supabase!
    .from('agenda_items')
    .select('id, kind, status, data')
    .eq('workspace_id', workspaceProfile.workspaceId)
    .in('status', ['active', 'realized']);
  if (error) throw error;

  return {
    agendamentos: (data as AgendaRecord[]).filter((record) => record.kind === 'appointment').map(registroParaAgendamento),
    cadastros: (data as AgendaRecord[]).filter((record) => record.kind === 'pending').map(registroParaCadastro),
  };
}

export async function salvarCadastro(cadastro: CadastroAgenda) {
  if (!remotoDisponivel() || !canEditWorkspace()) return;
  const { data: sessionData } = await supabase!.auth.getSession();
  if (!sessionData.session) return;
  const { error } = await supabase!.from('agenda_items').upsert({
    id: cadastro.remoteId || crypto.randomUUID(),
    workspace_id: workspaceProfile.workspaceId,
    created_by: sessionData.session.user.id,
    kind: 'pending',
    status: 'active',
    data: cadastro,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function reservarAgendamento(agendamento: AgendamentoAgenda, cadastro?: CadastroAgenda) {
  if (!remotoDisponivel()) return agendamento;
  if (!canEditWorkspace()) throw new Error('Seu perfil é somente para consulta.');
  const { data, error } = await supabase!.rpc('schedule_agenda_appointment', {
    p_pending_id: cadastro?.remoteId ?? null,
    p_data: agendamento,
  });
  if (error) throw error;
  return registroParaAgendamento(data as AgendaRecord);
}

export async function removerItemAgenda(id: string) {
  if (!remotoDisponivel() || !canEditWorkspace() || id.startsWith('demo-')) return;
  const { error } = await supabase!.rpc('cancel_agenda_appointment', { p_id: id });
  if (error) throw error;
}

export async function atualizarStatusAgendamento(agendamento: AgendamentoAgenda) {
  if (!remotoDisponivel() || !canEditWorkspace() || agendamento.id.startsWith('demo-')) return;
  const { error } = await supabase!.rpc('set_agenda_appointment_realized', {
    p_id: agendamento.id,
    p_realized: Boolean(agendamento.realizado),
  });
  if (error) throw error;
}

export function assinarAgenda(onChange: () => void) {
  if (!remotoDisponivel()) return () => undefined;
  // O React StrictMode monta e desmonta efeitos em sequência durante o desenvolvimento.
  // Um nome exclusivo impede que o cliente Realtime reutilize um canal que ainda está
  // sendo removido e receba callbacks depois de já ter feito subscribe().
  const channel = supabase!.channel(`agenda-${workspaceProfile.workspaceId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items', filter: `workspace_id=eq.${workspaceProfile.workspaceId}` }, onChange)
    .subscribe();
  return () => { void supabase!.removeChannel(channel); };
}

export async function removerCadastro(cadastro: CadastroAgenda) {
  if (!remotoDisponivel() || !canEditWorkspace()) return;
  const { error } = await supabase!.from('agenda_items')
    .delete()
    .eq('workspace_id', workspaceProfile.workspaceId)
    .eq('kind', 'pending')
    .eq('id', cadastro.remoteId || '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}
