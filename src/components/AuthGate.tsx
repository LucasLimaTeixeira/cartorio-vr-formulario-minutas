import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowRight, FileText, KeyRound, Loader2, LogIn, LogOut, UserPlus } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { carregarModelosMinuta } from '../utils/modelosMinuta';
import { hidratarAtendimentos } from '../utils/atendimentos';
import {
  configureWorkspaceProfile,
  WorkspacePlan,
  WorkspaceRole,
  WorkspaceFeatures,
  WorkspaceStatus,
  defaultWorkspaceFeatures,
  updateWorkspaceProfile,
  workspaceProfile,
} from '../utils/workspaceStorage';
import App from '../App';

type AuthMode = 'login' | 'signup';
type OnboardingMode = 'choose' | 'create' | 'join';

type WorkspaceRow = {
  id: string;
  name: string;
  plan: WorkspacePlan;
  endereco?: string | null;
  cidade?: string | null;
  tabeliao?: string | null;
};

type MembershipRow = {
  workspace_id: string;
  role: WorkspaceRole;
  workspaces: WorkspaceRow | WorkspaceRow[] | null;
};

function unwrapWorkspace(value: MembershipRow['workspaces']): WorkspaceRow | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type SubscriptionRow = { plan: WorkspacePlan; status: WorkspaceStatus; features: Partial<WorkspaceFeatures> | null; current_period_end: string | null };
const noFeatures: WorkspaceFeatures = { agenda: false, procuracao: false, apostilamento: false, certidoes: false, uniao_estavel: false, pacto_antenupcial: false, outros: false, processos: false };

function subscriptionProfile(subscription: SubscriptionRow) {
  return {
    plan: subscription.plan,
    status: subscription.status,
    features: { ...defaultWorkspaceFeatures, ...(subscription.features ?? {}) },
    periodEnd: subscription.current_period_end,
  };
}

function applyWorkspaceProfile(session: Session, workspace: WorkspaceRow, role: WorkspaceRole, subscription: SubscriptionRow | null, isSystemAdmin: boolean) {
  configureWorkspaceProfile({
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    cartorioEndereco: workspace.endereco || '',
    cartorioCidade: workspace.cidade || '',
    cartorioTabeliao: workspace.tabeliao || '',
    userId: session.user.id,
    userName: session.user.user_metadata?.full_name || session.user.email || 'Usuário',
    userEmail: session.user.email || '',
    plan: workspace.plan,
    role,
    features: defaultWorkspaceFeatures,
    isSystemAdmin,
    status: 'trialing',
    periodEnd: null,
    ...(subscription ? subscriptionProfile(subscription) : {}),
  });
}

// Mantém plano, recursos, perfil e dados do cartório sincronizados sem recarregar a página.
function useWorkspaceRealtime(userId: string, workspaceId: string | null, onMembershipLost: () => void) {
  useEffect(() => {
    if (!supabase || !workspaceId) return;
    const client = supabase;
    const refreshSubscription = async () => {
      const { data } = await client.from('workspace_subscriptions').select('plan, status, features, current_period_end').eq('workspace_id', workspaceId).maybeSingle();
      if (data) updateWorkspaceProfile(subscriptionProfile(data as SubscriptionRow));
    };
    const checkMembership = async () => {
      const { data } = await client.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle();
      if (!data) onMembershipLost(); else updateWorkspaceProfile({ role: data.role as WorkspaceRole });
    };
    const channel = client.channel(`workspace-${workspaceId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_subscriptions', filter: `workspace_id=eq.${workspaceId}` }, (payload) => {
        if (payload.new && 'features' in payload.new) updateWorkspaceProfile(subscriptionProfile(payload.new as SubscriptionRow));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workspaces', filter: `id=eq.${workspaceId}` }, (payload) => {
        const row = payload.new as WorkspaceRow;
        updateWorkspaceProfile({ workspaceName: row.name, cartorioEndereco: row.endereco || '', cartorioCidade: row.cidade || '', cartorioTabeliao: row.tabeliao || '' });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members', filter: `user_id=eq.${userId}` }, () => { void checkMembership(); })
      .subscribe();
    // Rede de segurança caso o Realtime caia: revalida ao voltar para a aba.
    const onVisible = () => { if (document.visibilityState === 'visible') { void refreshSubscription(); void checkMembership(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); void client.removeChannel(channel); };
  }, [userId, workspaceId, onMembershipLost]);
}

export function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!supabaseConfigured) return <SupabaseSetup />;
  if (loading) return <LoadingScreen />;
  if (session) return <AuthenticatedApp session={session} />;
  return <AuthScreen error={error} />;
}

function AuthenticatedApp({ session }: { session: Session }) {
  const [ready, setReady] = useState(false);
  const [needsWorkspace, setNeedsWorkspace] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const reloadWorkspace = useCallback(() => {
    setReady(false);
    setNeedsWorkspace(false);
    setError('');
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      if (!supabase || !session.user) return;

      const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc('is_system_admin');
      if (!mounted) return;
      if (superAdminError) {
        setError(superAdminError.message);
        setReady(true);
        return;
      }
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, workspaces(id, name, plan, endereco, cidade, tabeliao)')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (membershipError) {
        setError(membershipError.message);
        setReady(true);
        return;
      }

      if (!membership && isSuperAdmin) {
        // Super Admin sem cartório próprio: acessa apenas a tela inicial e a administração.
        configureWorkspaceProfile({
          ...workspaceProfile,
          workspaceName: 'Administração geral',
          userId: session.user.id,
          userName: session.user.user_metadata?.full_name || session.user.email || 'Administrador',
          userEmail: session.user.email || '',
          features: noFeatures,
          isSystemAdmin: true,
        });
        setActiveWorkspaceId(null);
        setReady(true);
        return;
      }

      if (!membership) {
        setNeedsWorkspace(true);
        setReady(true);
        return;
      }

      const workspace = unwrapWorkspace((membership as MembershipRow).workspaces);
      if (!workspace) {
        setError('Não foi possível carregar os dados do cartório.');
        setReady(true);
        return;
      }

      const { data: subscription, error: subscriptionError } = await supabase.from('workspace_subscriptions')
        .select('plan, status, features, current_period_end').eq('workspace_id', workspace.id).maybeSingle();
      if (subscriptionError) { setError(subscriptionError.message); setReady(true); return; }
      applyWorkspaceProfile(session, workspace, (membership as MembershipRow).role, subscription as SubscriptionRow | null, isSuperAdmin === true);
      setActiveWorkspaceId(workspace.id);
      // Nenhuma das duas impede o login: sem elas a aba mantém o rascunho local e a minuta usa o texto padrão.
      await Promise.all([hidratarAtendimentos().catch(() => undefined), carregarModelosMinuta().catch(() => undefined)]);
      if (mounted) setReady(true);
    }

    loadWorkspace().catch((loadError: Error) => {
      if (mounted) {
        setError(loadError.message);
        setReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [session, reloadKey]);

  useWorkspaceRealtime(session.user.id, ready ? activeWorkspaceId : null, reloadWorkspace);

  if (!ready) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;
  if (needsWorkspace) return <WorkspaceSetup session={session} onReady={reloadWorkspace} />;
  return <App />;
}

function WorkspaceSetup({ session, onReady }: { session: Session; onReady: () => void }) {
  const [mode, setMode] = useState<OnboardingMode>('choose');
  const [name, setName] = useState(session.user.user_metadata?.workspace_name || '');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [tabeliao, setTabeliao] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const createWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError('');

    const payload = {
      name: name.trim() || 'Meu cartório',
      owner_id: session.user.id,
      endereco: endereco.trim(),
      cidade: cidade.trim(),
      tabeliao: tabeliao.trim(),
    };
    let { error: createError } = await supabase.from('workspaces').insert(payload);
    if (createError && /endereco|cidade|tabeliao/i.test(createError.message)) {
      const fallback = await supabase.from('workspaces').insert({ name: payload.name, owner_id: payload.owner_id });
      createError = fallback.error;
    }

    setSubmitting(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    onReady();
  };

  const joinWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError('');

    const { error: joinError } = await supabase.rpc('join_workspace', {
      invite_code: inviteCode.trim().toUpperCase(),
    });

    setSubmitting(false);
    if (joinError) {
      setError(joinError.message);
      return;
    }
    onReady();
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand"><FileText /><span>Cartório OS</span></div>
        <span className="auth-kicker">Primeiro acesso</span>
        <h1>{mode === 'join' ? 'Entrar com convite' : mode === 'create' ? 'Criar seu cartório' : 'Como deseja começar?'}</h1>
        <p className="auth-description">
          {mode === 'choose'
            ? 'Um workspace não é criado automaticamente. Crie o cartório ou use o código enviado pelo proprietário.'
            : mode === 'create'
              ? 'Este usuário será o proprietário do workspace e poderá convidar a equipe.'
              : 'Cole o código de 12 caracteres. Ele vale por 14 dias e só pode ser usado uma vez.'}
        </p>

        {mode === 'choose' && (
          <div className="auth-choice">
            <button type="button" onClick={() => setMode('create')}>
              <UserPlus /> Criar meu cartório
            </button>
            <button type="button" className="auth-choice-secondary" onClick={() => setMode('join')}>
              <KeyRound /> Tenho um convite
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={createWorkspace} className="auth-form">
            <label>Nome do cartório<input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Cartório do 1º Ofício" /></label>
            <label>Endereço<input value={endereco} onChange={(event) => setEndereco(event.target.value)} placeholder="Rua, número" /></label>
            <label>Cidade/UF<input value={cidade} onChange={(event) => setCidade(event.target.value)} placeholder="Volta Redonda/RJ" /></label>
            <label>Tabelião(ã)<input value={tabeliao} onChange={(event) => setTabeliao(event.target.value)} /></label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={submitting}>{submitting ? <Loader2 className="spin" /> : <UserPlus />} Criar workspace<ArrowRight /></button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={joinWorkspace} className="auth-form">
            <label>Código do convite<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required minLength={8} placeholder="ABC123DEF456" autoComplete="off" /></label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={submitting}>{submitting ? <Loader2 className="spin" /> : <KeyRound />} Entrar no cartório<ArrowRight /></button>
          </form>
        )}

        {mode !== 'choose' && (
          <button type="button" className="auth-switch" onClick={() => { setMode('choose'); setError(''); }}>
            Voltar às opções
          </button>
        )}
        <button type="button" className="auth-switch" onClick={() => { void supabase?.auth.signOut(); }}>
          <LogOut /> Sair desta conta
        </button>
      </section>
    </main>
  );
}

function AuthScreen({ error: initialError }: { error: string }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError('');
    setMessage('');

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });

    if (result.error) setError(result.error.message);
    else if (mode === 'signup' && !result.data.session) setMessage('Conta criada. Confirme seu e-mail para entrar. Depois você cria o cartório ou usa um convite.');
    setSubmitting(false);
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand"><FileText /><span>Cartório OS</span></div>
        <span className="auth-kicker">Workspace seguro</span>
        <h1>{mode === 'login' ? 'Acessar' : 'Crie sua conta'}</h1>
        <p className="auth-description">
          {mode === 'login'
            ? 'Formulários, agenda e minutas do seu Cartório'
            : 'Depois do login você cria um cartório ou entra com o código de convite da equipe.'}
        </p>
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && <label>Seu nome<input value={name} onChange={(event) => setName(event.target.value)} required /></label>}
          <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Senha<input type="password" minLength={mode === 'signup' ? 12 : 6} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />{mode === 'signup' && <small>Use pelo menos 12 caracteres.</small>}</label>
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}
          <button type="submit" disabled={submitting}>{submitting ? <Loader2 className="spin" /> : <LogIn />} {mode === 'login' ? 'Entrar' : 'Criar conta'}<ArrowRight /></button>
        </form>
        <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>
          {mode === 'login' ? <><UserPlus /> Ainda não tenho conta</> : <><LogIn /> Já tenho uma conta</>}
        </button>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return <main className="auth-screen"><Loader2 className="auth-loader spin" /><span>Carregando workspace...</span></main>;
}

function ErrorScreen({ message }: { message: string }) {
  return <main className="auth-screen"><section className="auth-card"><h1>Não foi possível carregar o workspace</h1><p className="auth-error">{message}</p></section></main>;
}

function SupabaseSetup() {
  return <main className="auth-screen"><section className="auth-card"><div className="auth-brand"><FileText /><span>Cartório OS</span></div><span className="auth-kicker">Configuração necessária</span><h1>Conecte seu projeto Supabase</h1><p className="auth-description">Crie um arquivo `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, depois reinicie o Vite. Execute também a migration `202609180001_workspace_onboarding.sql`.</p></section></main>;
}
