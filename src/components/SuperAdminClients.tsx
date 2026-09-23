import { FormEvent, useEffect, useState } from 'react';
import { Building2, KeyRound, Plus, Settings2, ShieldCheck, UsersRound, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

type FeatureKey = 'agenda' | 'procuracao' | 'apostilamento' | 'certidoes' | 'uniao_estavel' | 'pacto_antenupcial' | 'outros';
type Features = Record<FeatureKey, boolean>;
const defaultFeatures: Features = { agenda: true, procuracao: true, apostilamento: true, certidoes: true, uniao_estavel: true, pacto_antenupcial: true, outros: true };
const featureLabels: Record<FeatureKey, string> = { agenda: 'Agenda', procuracao: 'Procuração', apostilamento: 'Apostilamento', certidoes: 'Certidões', uniao_estavel: 'União estável', pacto_antenupcial: 'Pacto antenupcial', outros: 'Outros formulários' };
type Workspace = { id: string; nome: string; cidade: string; proprietario: string; email: string; plano: string; status: string; max_usuarios: number; recursos: Features | null };
type Role = 'admin' | 'attendant' | 'viewer';
type AdminUser = { id: string; nome: string; email: string; cargo: string; cartorio: string; papel: string };
const roles: Record<Role, string> = { admin: 'Admin do cartório', attendant: 'Operador', viewer: 'Consulta' };

export function SuperAdminClients() {
  const [allowed, setAllowed] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<Workspace | null>(null);
  const [entitlementTarget, setEntitlementTarget] = useState<Workspace | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [message, setMessage] = useState('');
  const load = async () => {
    if (!supabase) return;
    const [{ data: isAdmin }, { data: workspaceData, error: workspaceError }, { data: userData, error: usersError }] = await Promise.all([supabase.rpc('is_system_admin'), supabase.rpc('list_admin_workspaces'), supabase.rpc('list_admin_users')]);
    setAllowed(Boolean(isAdmin));
    if (workspaceError || usersError) setMessage(workspaceError?.message ?? usersError?.message ?? 'Não foi possível carregar os usuários.');
    else { setWorkspaces((workspaceData ?? []) as Workspace[]); setUsers((userData ?? []) as AdminUser[]); }
  };
  useEffect(() => { void load(); }, []);
  if (!allowed) return <section className="team-manager"><p className="team-info">Acesso restrito ao Super Admin.</p></section>;
  return <section className="super-admin-panel">
    <header className="super-admin-header"><div className="super-admin-title"><span><ShieldCheck /></span><div><p>Área restrita</p><h2>Administração geral</h2><small>Gerencie cartórios, usuários e acessos.</small></div></div><div className="super-admin-summary"><span><Building2 /> {workspaces.length} cartório{workspaces.length === 1 ? '' : 's'}</span><span><UsersRound /> {users.length} usuário{users.length === 1 ? '' : 's'}</span></div></header>
    {message && <p className="auth-error">{message}</p>}
    <AdminSection icon={<Building2 />} title="Cartórios" subtitle="Empresas cadastradas, planos e recursos liberados."><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cartório</th><th>Localização</th><th>Proprietário</th><th>Status</th><th /></tr></thead><tbody>{workspaces.map((workspace) => <tr key={workspace.id}><td><strong>{workspace.nome}</strong><small>{workspace.plano} · até {workspace.max_usuarios || 5} usuários</small></td><td>{workspace.cidade || 'Não informado'}</td><td><strong>{workspace.proprietario}</strong><small>{workspace.email}</small></td><td><span className="status-pill">{workspace.status}</span></td><td><button className="admin-action-button is-secondary" type="button" onClick={() => setEntitlementTarget(workspace)}><Settings2 /> Plano e recursos</button> <button className="admin-action-button" type="button" onClick={() => setSelected(workspace)}><Plus /> Usuário</button></td></tr>)}</tbody></table></div></AdminSection>
    <AdminSection icon={<UsersRound />} title="Usuários" subtitle="Redefina credenciais sem visualizar senhas."><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Usuário</th><th>Cartório</th><th>Perfil</th><th /></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.nome}</strong><small>{user.email}{user.cargo ? ` · ${user.cargo}` : ''}</small></td><td>{user.cartorio}</td><td><span className="role-pill">{user.papel}</span></td><td><button className="admin-action-button is-secondary" type="button" onClick={() => setPasswordTarget(user)}><KeyRound /> Redefinir senha</button></td></tr>)}</tbody></table></div></AdminSection>
    {selected && <UserModal workspace={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); void load(); }} />}
    {entitlementTarget && <EntitlementsModal workspace={entitlementTarget} onClose={() => setEntitlementTarget(null)} onSaved={() => { setEntitlementTarget(null); void load(); }} />}
    {passwordTarget && <PasswordModal user={passwordTarget} onClose={() => setPasswordTarget(null)} />}
  </section>;
}

function EntitlementsModal({ workspace, onClose, onSaved }: { workspace: Workspace; onClose: () => void; onSaved: () => void }) {
  const [plan, setPlan] = useState(workspace.plano === 'professional' ? 'professional' : 'trial');
  const [maxUsers, setMaxUsers] = useState(workspace.max_usuarios || 5);
  const [features, setFeatures] = useState<Features>({ ...defaultFeatures, ...(workspace.recursos ?? {}) });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setSaving(true); setError(''); const { error: saveError } = await supabase.rpc('update_workspace_entitlements', { target_workspace: workspace.id, target_plan: plan, target_max_users: maxUsers, target_features: features }); setSaving(false); if (saveError) setError(saveError.message); else onSaved(); };
  return <Modal title="Plano e recursos" onClose={onClose}><form className="admin-modal-form" onSubmit={submit}><p className="admin-modal-user">{workspace.nome}<small>Marque exatamente o que este cartório poderá usar.</small></p><label>Plano<select value={plan} onChange={(e) => setPlan(e.target.value)}><option value="trial">Avaliação</option><option value="professional">Profissional</option></select></label><label>Máximo de usuários<input type="number" min={1} max={100} value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} /></label><fieldset className="admin-feature-list"><legend>Recursos liberados</legend>{(Object.keys(featureLabels) as FeatureKey[]).map((key) => <label key={key}><input type="checkbox" checked={features[key]} onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })} /> {featureLabels[key]}</label>)}</fieldset>{error && <p className="auth-error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={onClose}>Cancelar</button><button disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar permissões'}</button></div></form></Modal>;
}

function AdminSection({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) { return <section className="admin-section"><div className="admin-section-heading"><span>{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>{children}</section>; }

function PasswordModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setSaving(true); setError(''); const { data, error: invokeError } = await supabase.functions.invoke('super-admin-reset-user-password', { body: { userId: user.id, password } }); setSaving(false); if (invokeError) { const response = invokeError.context instanceof Response ? await invokeError.context.json().catch(() => null) : null; setError(response?.error ?? invokeError.message); } else if (!data?.ok) setError(data?.error ?? 'Não foi possível redefinir a senha.'); else onClose(); };
  return <Modal title="Redefinir senha" onClose={onClose}><form className="admin-modal-form" onSubmit={submit}><p className="admin-modal-user">{user.nome}<small>{user.email}</small></p><label>Nova senha<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><p className="admin-modal-hint">Use ao menos 8 caracteres. A senha atual não será exibida.</p>{error && <p className="auth-error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={onClose}>Cancelar</button><button disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar nova senha'}</button></div></form></Modal>;
}

function UserModal({ workspace, onClose, onSaved }: { workspace: Workspace; onClose: () => void; onSaved: () => void }) { const [form, setForm] = useState({ nome: '', email: '', cpf: '', cargo: '', role: 'attendant' as Role }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setSaving(true); setError(''); const { error: invokeError } = await supabase.functions.invoke('super-admin-create-user', { body: { workspaceId: workspace.id, ...form } }); setSaving(false); if (invokeError) setError(invokeError.message); else onSaved(); }; return <Modal title="Cadastrar usuário" onClose={onClose}><form className="admin-modal-form" onSubmit={submit}><p className="admin-modal-user">{workspace.nome}</p><label>Nome<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label><label>E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>CPF<input required inputMode="numeric" maxLength={11} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, '') })} /></label><label>Cargo<input required value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></label><label>Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{(Object.keys(roles) as Role[]).map((role) => <option value={role} key={role}>{roles[role]}</option>)}</select></label>{error && <p className="auth-error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={onClose}>Cancelar</button><button disabled={saving} type="submit">{saving ? 'Salvando...' : 'Enviar convite'}</button></div></form></Modal>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-overlay"><section className="admin-modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Fechar"><X /></button></header>{children}</section></div>; }
