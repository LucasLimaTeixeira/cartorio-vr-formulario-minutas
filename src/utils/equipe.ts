import { supabase } from '../lib/supabase';
import { workspaceProfile } from './workspaceStorage';

export interface MembroEquipe {
  id: string;
  nome: string;
  iniciais: string;
  funcao: string;
}

const funcaoPorPapel: Record<string, string> = { owner: 'Proprietário', admin: 'Administrador', analyst: 'Analisador', attendant: 'Atendente' };

// Equipe fictícia só para o modo demonstração, sem banco configurado.
const equipeDemonstracao: MembroEquipe[] = [
  { id: 'ana', nome: 'Ana Martins', iniciais: 'AM', funcao: 'Escrevente' },
  { id: 'bruno', nome: 'Bruno Costa', iniciais: 'BC', funcao: 'Substituto' },
  { id: 'carla', nome: 'Carla Mendes', iniciais: 'CM', funcao: 'Escrevente' },
  { id: 'diego', nome: 'Diego Alves', iniciais: 'DA', funcao: 'Auxiliar' },
];

export function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

// Quem pode atender: proprietário, administradores e atendentes. Perfis de consulta ficam de fora.
export async function carregarEquipe(): Promise<MembroEquipe[]> {
  if (!supabase || workspaceProfile.workspaceId === 'workspace-local-demo') return equipeDemonstracao;

  const { data: membros, error } = await supabase
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceProfile.workspaceId)
    .neq('role', 'viewer')
    .order('created_at');
  if (error) throw error;
  if (!membros?.length) return [];

  const { data: perfis, error: erroPerfis } = await supabase
    .from('profiles')
    .select('id, full_name, email, cargo')
    .in('id', membros.map((m) => m.user_id));
  if (erroPerfis) throw erroPerfis;

  const porId = new Map((perfis ?? []).map((p) => [p.id, p]));
  return membros.map((m) => {
    const perfil = porId.get(m.user_id);
    const nome = perfil?.full_name?.trim() || perfil?.email || 'Usuário sem nome';
    return { id: m.user_id, nome, iniciais: iniciaisDe(nome), funcao: perfil?.cargo?.trim() || funcaoPorPapel[m.role] || 'Atendente' };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
