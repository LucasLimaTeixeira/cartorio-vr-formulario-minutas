const STORAGE_PREFIX = 'cartorio-saas:';
import { useSyncExternalStore } from 'react';

export type WorkspacePlan = 'trial' | 'professional';
export type WorkspaceRole = 'owner' | 'admin' | 'attendant' | 'viewer';
export type WorkspaceFeature = 'agenda' | 'procuracao' | 'apostilamento' | 'certidoes' | 'uniao_estavel' | 'pacto_antenupcial' | 'outros';
export type WorkspaceFeatures = Record<WorkspaceFeature, boolean>;
export type WorkspaceStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'suspended';
export const defaultWorkspaceFeatures: WorkspaceFeatures = { agenda: true, procuracao: true, apostilamento: true, certidoes: true, uniao_estavel: true, pacto_antenupcial: true, outros: true };

export interface WorkspaceProfile {
  workspaceId: string;
  workspaceName: string;
  cartorioEndereco: string;
  cartorioCidade: string;
  cartorioTabeliao: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: WorkspacePlan;
  role: WorkspaceRole;
  features: WorkspaceFeatures;
  isSystemAdmin: boolean;
  status: WorkspaceStatus;
  periodEnd: string | null;
}

export let workspaceProfile: WorkspaceProfile = {
  workspaceId: 'workspace-local-demo',
  workspaceName: 'Meu Cartório',
  cartorioEndereco: '',
  cartorioCidade: '',
  cartorioTabeliao: '',
  userId: '',
  userName: 'Operação local',
  userEmail: 'admin@workspace.local',
  plan: 'trial',
  role: 'owner',
  features: defaultWorkspaceFeatures,
  isSystemAdmin: false,
  status: 'trialing',
  periodEnd: null,
};

const profileListeners = new Set<() => void>();

export function configureWorkspaceProfile(profile: WorkspaceProfile) {
  workspaceProfile = profile;
  profileListeners.forEach((listener) => listener());
}

export function updateWorkspaceProfile(changes: Partial<WorkspaceProfile>) {
  configureWorkspaceProfile({ ...workspaceProfile, ...changes });
}

function subscribeWorkspaceProfile(listener: () => void) {
  profileListeners.add(listener);
  return () => { profileListeners.delete(listener); };
}

// Componentes que usam este hook re-renderizam quando contrato, recursos ou perfil mudam.
export function useWorkspaceProfile() {
  return useSyncExternalStore(subscribeWorkspaceProfile, () => workspaceProfile);
}

export function isWorkspaceWritable() {
  return workspaceProfile.status === 'trialing' || workspaceProfile.status === 'active';
}

export function isWorkspaceOwner() {
  return workspaceProfile.role === 'owner';
}

export function canEditWorkspace() {
  return ['owner', 'admin', 'attendant'].includes(workspaceProfile.role);
}

export function hasWorkspaceFeature(feature: WorkspaceFeature) {
  return workspaceProfile.features[feature];
}

export function isSystemAdmin() {
  return workspaceProfile.isSystemAdmin;
}

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${workspaceProfile.workspaceId}:${key}`;
}

export function loadWorkspaceState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const saved = window.sessionStorage.getItem(storageKey(key));
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Cópia local da aba do navegador. A gravação no banco é feita por atendimento (utils/atendimentos.ts).
export function saveWorkspaceState<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    return;
  }
}

export function removeWorkspaceState(key: string) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(storageKey(key));
  } catch {
    return;
  }
}
