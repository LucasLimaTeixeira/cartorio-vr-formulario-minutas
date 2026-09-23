import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CalendarClock, KeyRound, Plus, Search, Settings2, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

type FeatureKey = 'agenda' | 'procuracao' | 'apostilamento' | 'certidoes' | 'uniao_estavel' | 'pacto_antenupcial' | 'outros';
type Features = Record<FeatureKey, boolean>;
const defaultFeatures: Features = { agenda: true, procuracao: true, apostilamento: true, certidoes: true, uniao_estavel: true, pacto_antenupcial: true, outros: true };
const featureLabels: Record<FeatureKey, string> = { agenda: 'Agenda', procuracao: 'Procuração', apostilamento: 'Apostilamento', certidoes: 'Certidões', uniao_estavel: 'União estável', pacto_antenupcial: 'Pacto antenupcial', outros: 'Outros formulários' };
type Status = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'suspended';
type Cycle = 'monthly' | 'quarterly' | 'yearly';
type Workspace = {
  id: string; nome: string; cidade: string; endereco: string; tabeliao: string; proprietario: string; email: string;
  plano: string; status: Status; max_usuarios: number; recursos: Features | null; usuarios: number;
  criado_em: string; contratado_em: string | null; vencimento: string | null; ciclo: Cycle; valor: number | null; observacoes: string;
};
type Role = 'admin' | 'attendant' | 'viewer';
type Member = { id: string; nome: string; email: string; cargo: string; papel: Role | 'owner'; vinculado_em: string; ultimo_acesso: string | null };
type Tab = 'overview' | 'users' | 'contract';
const roles: Record<Role, string> = { admin: 'Admin do cartório', attendant: 'Operador', viewer: 'Consulta' };
const statusLabels: Record<Status, string> = { trialing: 'Em avaliação', active: 'Ativo', past_due: 'Pagamento pendente', cancelled: 'Cancelado', suspended: 'Suspenso' };
const planLabels: Record<string, string> = { trial: 'Avaliação', professional: 'Profissional' };
const cycleLabels: Record<Cycle, string> = { monthly: 'Mensal', quarterly: 'Trimestral', yearly: 'Anual' };
const cycleMonths: Record<Cycle, number> = { monthly: 1, quarterly: 3, yearly: 12 };

const formatDate = (value: string | null) => { if (!value) return 'Não informado'; const [y, m, d] = value.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const formatDateTime = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca acessou';
const formatMoney = (value: number | null) => value === null ? 'Não informado' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const daysUntil = (value: string | null) => value ? Math.round((Date.parse(value.slice(0, 10)) - Date.parse(todayIso())) / 86400000) : null;
const addMonths = (value: string, months: number) => { const [y, m, d] = value.split('-').map(Number); const date = new Date(Date.UTC(y, m - 1 + months, 1)); const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(); date.setUTCDate(Math.min(d, last)); return date.toISOString().slice(0, 10); };
const errorMessage = async (error: { message: string; context?: unknown }) => { const body = error.context instanceof Response ? await error.context.json().catch(() => null) : null; return body?.error ?? error.message; };

function dueInfo(workspace: Workspace) {
  const days = daysUntil(workspace.vencimento);
  if (days === null) return { text: 'Sem vencimento definido', tone: 'muted' };
  if (days < 0) return { text: `Vencido há ${-days} dia${days === -1 ? '' : 's'}`, tone: 'danger' };
  if (days === 0) return { text: 'Vence hoje', tone: 'danger' };
  if (days <= 7) return { text: `Vence em ${days} dia${days === 1 ? '' : 's'}`, tone: 'warning' };
  return { text: `Vence em ${formatDate(workspace.vencimento)}`, tone: 'muted' };
}

export function SuperAdminClients() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    if (!supabase) return;
    const [{ data: isAdmin }, { data, error }] = await Promise.all([supabase.rpc('is_system_admin'), supabase.rpc('list_admin_workspaces')]);
    setAllowed(Boolean(isAdmin));
    if (error) { setMessage(error.message); return; }
    const list = (data ?? []) as Workspace[];
    setWorkspaces(list);
    setSelectedId((current) => current && list.some((w) => w.id === current) ? current : list[0]?.id ?? null);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workspaces.filter((w) => (statusFilter === 'all' || w.status === statusFilter)
      && (!term || [w.nome, w.cidade, w.proprietario, w.email].some((field) => field?.toLowerCase().includes(term))));
  }, [workspaces, search, statusFilter]);
  const summary = useMemo(() => ({
    active: workspaces.filter((w) => w.status === 'active').length,
    trial: workspaces.filter((w) => w.status === 'trialing').length,
    attention: workspaces.filter((w) => { const d = daysUntil(w.vencimento); return w.status !== 'cancelled' && ((d !== null && d <= 7) || w.status === 'past_due'); }).length,
    users: workspaces.reduce((total, w) => total + (w.usuarios ?? 0), 0),
  }), [workspaces]);
  const selected = workspaces.find((w) => w.id === selectedId) ?? null;

  if (allowed === null) return <section className="team-manager"><p className="team-info">Carregando...</p></section>;
  if (!allowed) return <section className="team-manager"><p className="team-info">Acesso restrito ao Super Admin.</p></section>;
  return <section className="super-admin-panel">
    <header className="super-admin-header"><div className="super-admin-title"><span><ShieldCheck /></span><div><p>Área restrita</p><h2>Administração geral</h2><small>Selecione um cartório para ver contrato, usuários e recursos.</small></div></div></header>
    <div className="admin-kpis">
      <Kpi label="Cartórios" value={workspaces.length} />
      <Kpi label="Ativos" value={summary.active} />
      <Kpi label="Em avaliação" value={summary.trial} />
      <Kpi label="Exigem atenção" value={summary.attention} tone={summary.attention ? 'warning' : undefined} hint="Vencidos, vencendo em até 7 dias ou com pagamento pendente" />
      <Kpi label="Usuários" value={summary.users} />
    </div>
    {message && <p className="auth-error">{message}</p>}
    <div className="admin-workspace-layout">
      <aside className="admin-section admin-workspace-list">
        <div className="admin-list-filters">
          <label className="admin-search"><Search /><input placeholder="Buscar cartório, cidade ou responsável" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          <select aria-label="Filtrar por status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}><option value="all">Todos os status</option>{(Object.keys(statusLabels) as Status[]).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select>
        </div>
        <ul>
          {filtered.map((w) => { const due = dueInfo(w); return <li key={w.id}><button type="button" className={w.id === selectedId ? 'is-selected' : ''} onClick={() => { setSelectedId(w.id); setTab('overview'); }}>
            <span className="admin-list-top"><strong>{w.nome}</strong><StatusPill status={w.status} /></span>
            <small>{w.cidade || 'Cidade não informada'} · {planLabels[w.plano] ?? w.plano} · {w.usuarios}/{w.max_usuarios} usuários</small>
            <small className={`admin-due is-${due.tone}`}>{due.text}</small>
          </button></li>; })}
          {!filtered.length && <li className="admin-empty">Nenhum cartório encontrado.</li>}
        </ul>
      </aside>
      {selected ? <WorkspaceDetail key={selected.id} workspace={selected} tab={tab} onTab={setTab} onChanged={load} /> : <section className="admin-section admin-empty">Selecione um cartório.</section>}
    </div>
  </section>;
}

function Kpi({ label, value, tone, hint }: { label: string; value: number; tone?: string; hint?: string }) { return <div className={`admin-kpi${tone ? ` is-${tone}` : ''}`} title={hint}><small>{label}</small><strong>{value}</strong></div>; }
function StatusPill({ status }: { status: Status }) { return <span className={`status-pill is-${status}`}>{statusLabels[status] ?? status}</span>; }

function WorkspaceDetail({ workspace, tab, onTab, onChanged }: { workspace: Workspace; tab: Tab; onTab: (tab: Tab) => void; onChanged: () => Promise<void> }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Member | null>(null);
  const loadMembers = useCallback(async () => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase.rpc('list_admin_workspace_users', { target_workspace: workspace.id });
    if (loadError) setError(loadError.message); else setMembers((data ?? []) as Member[]);
  }, [workspace.id]);
  useEffect(() => { void loadMembers(); }, [loadMembers]);
  const refresh = async () => { await Promise.all([loadMembers(), onChanged()]); };
  const changeRole = async (member: Member, role: Role) => {
    if (!supabase) return; setError('');
    const { error: roleError } = await supabase.rpc('admin_set_member_role', { target_workspace: workspace.id, target_user: member.id, target_role: role });
    if (roleError) setError(roleError.message);
    await loadMembers();
  };
  const removeMember = async (member: Member) => {
    if (!supabase || !window.confirm(`Remover ${member.nome} do cartório ${workspace.nome}? A conta de login continua existindo, mas perde o acesso a este cartório.`)) return;
    setError('');
    const { error: removeError } = await supabase.rpc('admin_remove_member', { target_workspace: workspace.id, target_user: member.id });
    if (removeError) setError(removeError.message);
    await refresh();
  };
  const features = { ...defaultFeatures, ...(workspace.recursos ?? {}) };
  const due = dueInfo(workspace);
  const atLimit = workspace.usuarios >= workspace.max_usuarios;
  const alert = workspace.status === 'suspended' ? 'Cartório suspenso: os usuários só conseguem consultar, sem editar.'
    : workspace.status === 'cancelled' ? 'Contrato cancelado: os usuários só conseguem consultar, sem editar.'
    : workspace.status === 'past_due' ? `Pagamento pendente. ${due.text}.`
    : due.tone !== 'muted' ? `${due.text}.` : '';
  const tabs: [Tab, string, React.ReactNode][] = [['overview', 'Visão geral', <Building2 key="i" />], ['users', `Usuários (${workspace.usuarios})`, <UsersRound key="i" />], ['contract', 'Contrato e recursos', <Settings2 key="i" />]];

  return <section className="admin-section admin-workspace-detail">
    <header className="admin-detail-header">
      <div><h3>{workspace.nome}</h3><p>{workspace.proprietario} · {workspace.email || 'sem e-mail'}</p></div>
      <div className="admin-detail-badges"><StatusPill status={workspace.status} /><span className="role-pill">{planLabels[workspace.plano] ?? workspace.plano}</span></div>
    </header>
    <nav className="admin-tabs" role="tablist">
      {tabs.map(([id, label, icon]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => onTab(id)}>{icon}{label}</button>)}
    </nav>
    {error && <p className="auth-error admin-detail-error">{error}</p>}

    {tab === 'overview' && <div className="admin-detail-body">
      {alert && <p className={`admin-alert is-${due.tone === 'danger' ? 'danger' : 'warning'}`}><AlertTriangle />{alert}</p>}
      <div className="admin-info-grid">
        <InfoCard title="Contrato" icon={<CalendarClock />} rows={[
          ['Plano', planLabels[workspace.plano] ?? workspace.plano], ['Status', statusLabels[workspace.status]],
          ['Contratado em', formatDate(workspace.contratado_em)], ['Vencimento', workspace.vencimento ? formatDate(workspace.vencimento) : 'Não definido'],
          ['Cobrança', cycleLabels[workspace.ciclo] ?? workspace.ciclo], ['Valor', formatMoney(workspace.valor)],
        ]} />
        <InfoCard title="Cartório" icon={<Building2 />} rows={[
          ['Proprietário', workspace.proprietario], ['E-mail', workspace.email || 'Não informado'], ['Tabelião', workspace.tabeliao || 'Não informado'],
          ['Cidade', workspace.cidade || 'Não informada'], ['Endereço', workspace.endereco || 'Não informado'], ['Cadastrado em', formatDate(workspace.criado_em)],
        ]} />
      </div>
      <div className="admin-info-card">
        <h4><UsersRound /> Usuários</h4>
        <div className="admin-usage"><span style={{ width: `${Math.min(100, (workspace.usuarios / workspace.max_usuarios) * 100)}%` }} className={atLimit ? 'is-full' : ''} /></div>
        <p className="admin-usage-label">{workspace.usuarios} de {workspace.max_usuarios} usuários{atLimit ? ' · limite atingido' : ''}</p>
      </div>
      <div className="admin-info-card">
        <h4><Settings2 /> Recursos liberados</h4>
        <div className="admin-feature-chips">{(Object.keys(featureLabels) as FeatureKey[]).map((key) => <span key={key} className={features[key] ? 'is-on' : 'is-off'}>{featureLabels[key]}</span>)}</div>
      </div>
      {workspace.observacoes && <div className="admin-info-card"><h4>Observações</h4><p className="admin-notes">{workspace.observacoes}</p></div>}
    </div>}

    {tab === 'users' && <div className="admin-detail-body">
      <div className="admin-users-toolbar"><p>{workspace.usuarios} de {workspace.max_usuarios} usuários</p><button className="admin-action-button" type="button" disabled={atLimit} title={atLimit ? 'Aumente o limite em "Contrato e recursos"' : undefined} onClick={() => setAdding(true)}><Plus /> Adicionar usuário</button></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Último acesso</th><th /></tr></thead><tbody>
        {members.map((member) => <tr key={member.id}>
          <td><strong>{member.nome}</strong><small>{member.email}{member.cargo ? ` · ${member.cargo}` : ''}</small></td>
          <td>{member.papel === 'owner' ? <span className="role-pill">Proprietário</span> : <select className="admin-inline-select" aria-label={`Perfil de ${member.nome}`} value={member.papel} onChange={(e) => void changeRole(member, e.target.value as Role)}>{(Object.keys(roles) as Role[]).map((r) => <option key={r} value={r}>{roles[r]}</option>)}</select>}</td>
          <td><strong>{formatDateTime(member.ultimo_acesso)}</strong><small>Vinculado em {formatDate(member.vinculado_em)}</small></td>
          <td className="admin-row-actions"><button className="admin-action-button is-secondary" type="button" onClick={() => setPasswordTarget(member)}><KeyRound /> Senha</button>{member.papel !== 'owner' && <button className="admin-action-button is-danger" type="button" onClick={() => void removeMember(member)}><Trash2 /> Remover</button>}</td>
        </tr>)}
        {!members.length && <tr><td colSpan={4}>Nenhum usuário vinculado.</td></tr>}
      </tbody></table></div>
    </div>}

    {tab === 'contract' && <ContractForm workspace={workspace} onSaved={async () => { await onChanged(); onTab('overview'); }} />}
    {adding && <UserModal workspace={workspace} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); void refresh(); }} />}
    {passwordTarget && <PasswordModal user={passwordTarget} onClose={() => setPasswordTarget(null)} />}
  </section>;
}

function InfoCard({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: [string, string][] }) {
  return <div className="admin-info-card"><h4>{icon}{title}</h4><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>;
}

function ContractForm({ workspace, onSaved }: { workspace: Workspace; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    plan: workspace.plano === 'professional' ? 'professional' : 'trial', status: workspace.status,
    contractedAt: workspace.contratado_em ?? '', periodEnd: workspace.vencimento ?? '', cycle: workspace.ciclo ?? 'monthly',
    price: workspace.valor === null ? '' : String(workspace.valor).replace('.', ','), maxUsers: workspace.max_usuarios || 5, notes: workspace.observacoes ?? '',
  });
  const [features, setFeatures] = useState<Features>({ ...defaultFeatures, ...(workspace.recursos ?? {}) });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const renew = () => setForm((current) => {
    const base = current.periodEnd && current.periodEnd > todayIso() ? current.periodEnd : todayIso();
    return { ...current, periodEnd: addMonths(base, cycleMonths[current.cycle]), status: 'active', contractedAt: current.contractedAt || todayIso() };
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase) return; setSaving(true); setError('');
    const rawPrice = form.price.trim();
    const price = rawPrice === '' ? null : Number(rawPrice.includes(',') ? rawPrice.replace(/\./g, '').replace(',', '.') : rawPrice);
    if (price !== null && Number.isNaN(price)) { setSaving(false); setError('Valor inválido.'); return; }
    const { error: saveError } = await supabase.rpc('update_workspace_contract', {
      target_workspace: workspace.id, target_plan: form.plan, target_status: form.status,
      target_contracted_at: form.contractedAt || null, target_period_end: form.periodEnd || null, target_cycle: form.cycle,
      target_price: price, target_notes: form.notes, target_max_users: form.maxUsers, target_features: features,
    });
    setSaving(false);
    if (saveError) setError(saveError.message); else await onSaved();
  };
  return <form className="admin-detail-body admin-contract-form" onSubmit={submit}>
    <fieldset><legend>Contrato</legend>
      <label>Plano<select value={form.plan} onChange={(e) => set('plan', e.target.value)}><option value="trial">Avaliação</option><option value="professional">Profissional</option></select></label>
      <label>Status<select value={form.status} onChange={(e) => set('status', e.target.value as Status)}>{(Object.keys(statusLabels) as Status[]).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label>
      <label>Data de contratação<input type="date" value={form.contractedAt} onChange={(e) => set('contractedAt', e.target.value)} /></label>
      <label>Data de vencimento<input type="date" value={form.periodEnd} min={form.contractedAt || undefined} onChange={(e) => set('periodEnd', e.target.value)} /></label>
      <label>Ciclo de cobrança<select value={form.cycle} onChange={(e) => set('cycle', e.target.value as Cycle)}>{(Object.keys(cycleLabels) as Cycle[]).map((c) => <option key={c} value={c}>{cycleLabels[c]}</option>)}</select></label>
      <label>Valor por ciclo (R$)<input inputMode="decimal" placeholder="0,00" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^\d,.]/g, ''))} /></label>
      <button type="button" className="admin-action-button is-secondary admin-renew" onClick={renew}><CalendarClock /> Renovar por mais um ciclo ({cycleLabels[form.cycle].toLowerCase()})</button>
    </fieldset>
    <fieldset><legend>Limites e recursos</legend>
      <label>Máximo de usuários<input type="number" min={Math.max(1, workspace.usuarios)} max={100} value={form.maxUsers} onChange={(e) => set('maxUsers', Number(e.target.value))} /></label>
      <div className="admin-feature-list">{(Object.keys(featureLabels) as FeatureKey[]).map((key) => <label key={key}><input type="checkbox" checked={features[key]} onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })} /> {featureLabels[key]}</label>)}</div>
    </fieldset>
    <label className="admin-notes-field">Observações internas<textarea rows={3} maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Forma de pagamento, contato financeiro, negociações..." /></label>
    <p className="admin-modal-hint">Os status Pagamento pendente, Cancelado e Suspenso bloqueiam alterações no cartório. Os usuários continuam podendo consultar.</p>
    {error && <p className="auth-error">{error}</p>}
    <div className="admin-modal-actions"><button disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar contrato'}</button></div>
  </form>;
}

function PasswordModal({ user, onClose }: { user: Member; onClose: () => void }) {
  const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setSaving(true); setError(''); const { data, error: invokeError } = await supabase.functions.invoke('super-admin-reset-user-password', { body: { userId: user.id, password } }); setSaving(false); if (invokeError) setError(await errorMessage(invokeError)); else if (!data?.ok) setError(data?.error ?? 'Não foi possível redefinir a senha.'); else onClose(); };
  return <Modal title="Redefinir senha" onClose={onClose}><form className="admin-modal-form" onSubmit={submit}><p className="admin-modal-user">{user.nome}<small>{user.email}</small></p><label>Nova senha<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><p className="admin-modal-hint">Use ao menos 8 caracteres. A senha atual não será exibida.</p>{error && <p className="auth-error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={onClose}>Cancelar</button><button disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar nova senha'}</button></div></form></Modal>;
}

function UserModal({ workspace, onClose, onSaved }: { workspace: Workspace; onClose: () => void; onSaved: () => void }) { const [form, setForm] = useState({ nome: '', email: '', cpf: '', cargo: '', role: 'attendant' as Role }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase) return; setSaving(true); setError(''); const { error: invokeError } = await supabase.functions.invoke('super-admin-create-user', { body: { workspaceId: workspace.id, ...form } }); setSaving(false); if (invokeError) setError(await errorMessage(invokeError)); else onSaved(); }; return <Modal title="Cadastrar usuário" onClose={onClose}><form className="admin-modal-form" onSubmit={submit}><p className="admin-modal-user">{workspace.nome}<small>{workspace.usuarios} de {workspace.max_usuarios} usuários em uso</small></p><label>Nome<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label><label>E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>CPF<input required inputMode="numeric" maxLength={11} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, '') })} /></label><label>Cargo<input required value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></label><label>Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{(Object.keys(roles) as Role[]).map((role) => <option value={role} key={role}>{roles[role]}</option>)}</select></label>{error && <p className="auth-error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-cancel-button" onClick={onClose}>Cancelar</button><button disabled={saving} type="submit">{saving ? 'Salvando...' : 'Enviar convite'}</button></div></form></Modal>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-overlay"><section className="admin-modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Fechar"><X /></button></header>{children}</section></div>; }
