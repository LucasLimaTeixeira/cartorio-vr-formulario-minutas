const STORAGE_PREFIX = 'cartorio-saas:';
import { supabase } from '../lib/supabase';

export type WorkspacePlan = 'trial' | 'professional';
export type WorkspaceRole = 'owner' | 'admin' | 'attendant' | 'viewer';

export interface WorkspaceProfile {
  workspaceId: string;
  workspaceName: string;
  cartorioEndereco: string;
  cartorioCidade: string;
  cartorioTabeliao: string;
  userName: string;
  userEmail: string;
  plan: WorkspacePlan;
  role: WorkspaceRole;
}

export let workspaceProfile: WorkspaceProfile = {
  workspaceId: 'workspace-local-demo',
  workspaceName: 'Meu Cartório',
  cartorioEndereco: '',
  cartorioCidade: '',
  cartorioTabeliao: '',
  userName: 'Operação local',
  userEmail: 'admin@workspace.local',
  plan: 'trial',
  role: 'owner',
};

export function configureWorkspaceProfile(profile: WorkspaceProfile) {
  workspaceProfile = profile;
}

export function isWorkspaceOwner() {
  return workspaceProfile.role === 'owner';
}

export function canEditWorkspace() {
  return ['owner', 'admin', 'attendant'].includes(workspaceProfile.role);
}

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${workspaceProfile.workspaceId}:${key}`;
}

function formTypeForKey(key: string) {
  const types: Record<string, string> = {
    'formulario-procuracao': 'procuracao',
    'formulario-apostilamento': 'apostilamento',
    'formulario-certidao': 'certidao',
    'formulario-uniao-estavel': 'uniao-estavel',
    'formulario-pacto-antenupcial': 'pacto-antenupcial',
  };
  return types[key];
}

export function loadWorkspaceState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const saved = window.localStorage.getItem(storageKey(key));
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveWorkspaceState<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    return;
  }

  const formType = formTypeForKey(key);
  if (!supabase || !formType || workspaceProfile.workspaceId === 'workspace-local-demo') return;

  void supabase.auth.getSession().then(({ data }) => {
    if (!data.session) return;
    return supabase.from('form_drafts').upsert({
      workspace_id: workspaceProfile.workspaceId,
      created_by: data.session.user.id,
      form_type: formType,
      data: value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,form_type' });
  });
}

export async function hydrateWorkspaceDrafts() {
  if (!supabase || workspaceProfile.workspaceId === 'workspace-local-demo') return;

  const { data, error } = await supabase
    .from('form_drafts')
    .select('form_type, data')
    .eq('workspace_id', workspaceProfile.workspaceId);

  if (error) throw error;
  const keys: Record<string, string> = {
    procuracao: 'formulario-procuracao',
    apostilamento: 'formulario-apostilamento',
    certidao: 'formulario-certidao',
    'uniao-estavel': 'formulario-uniao-estavel',
    'pacto-antenupcial': 'formulario-pacto-antenupcial',
  };

  data.forEach((draft) => {
    const key = keys[draft.form_type];
    if (key) window.localStorage.setItem(storageKey(key), JSON.stringify(draft.data));
  });
}
