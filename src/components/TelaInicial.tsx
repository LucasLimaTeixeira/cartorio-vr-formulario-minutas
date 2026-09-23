import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Building, CalendarDays, Clock3, FileText, Info, Shield, ShieldCheck, User, UsersRound } from 'lucide-react';
import { AgendamentoAgenda, assinarAgenda, carregarAgenda } from '../utils/agendaService';
import { WorkspaceFeature, isWorkspaceWritable, useWorkspaceProfile } from '../utils/workspaceStorage';

type Atalho = { id: WorkspaceFeature; titulo: string; descricao: string; icon: typeof FileText };
const atalhos: Atalho[] = [
  { id: 'agenda', titulo: 'Agenda', descricao: 'Agende atendimentos, reserve salas e acompanhe a fila do dia.', icon: CalendarDays },
  { id: 'procuracao', titulo: 'Procuração', descricao: 'Outorgantes, procuradores, poderes e minuta pronta para revisão.', icon: FileText },
  { id: 'apostilamento', titulo: 'Apostilamento', descricao: 'Requerimento de apostila de documentos para uso no exterior.', icon: Shield },
  { id: 'certidoes', titulo: 'Certidões', descricao: 'Pedido de certidões com dados do requerente e do ato.', icon: FileText },
  { id: 'uniao_estavel', titulo: 'União Estável', descricao: 'Declaração de união estável com regime de bens e testemunhas.', icon: User },
  { id: 'pacto_antenupcial', titulo: 'Pacto Antenupcial', descricao: 'Pacto antenupcial com nubentes, regime e cláusulas.', icon: Building },
];
const roleLabels = { owner: 'Proprietário', admin: 'Admin do cartório', attendant: 'Operador', viewer: 'Consulta' };
const statusLabels = { trialing: 'Em avaliação', active: 'Ativo', past_due: 'Pagamento pendente', cancelled: 'Cancelado', suspended: 'Suspenso' };

const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const formatarData = (valor: string | null) => valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Não definido';
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

export function TelaInicial({ onNavegar, cadastrosAguardando }: { onNavegar: (aba: string) => void; cadastrosAguardando: number }) {
  const profile = useWorkspaceProfile();
  const [agendamentos, setAgendamentos] = useState<AgendamentoAgenda[]>([]);
  const agendaLiberada = profile.features.agenda;

  useEffect(() => {
    if (!agendaLiberada) return;
    let ativo = true;
    const carregar = () => { void carregarAgenda().then(({ agendamentos: lista }) => { if (ativo) setAgendamentos(lista); }).catch(() => undefined); };
    carregar();
    const cancelar = assinarAgenda(carregar);
    return () => { ativo = false; cancelar(); };
  }, [agendaLiberada]);

  const hoje = hojeIso();
  const deHoje = useMemo(() => agendamentos.filter((a) => a.data === hoje).sort((a, b) => a.horario.localeCompare(b.horario)), [agendamentos, hoje]);
  const proximos = deHoje.filter((a) => !a.realizado).slice(0, 4);
  const liberados = atalhos.filter((a) => profile.features[a.id]);
  const semCartorio = profile.workspaceName === 'Administração geral' && !liberados.length;
  const diasParaVencer = profile.periodEnd ? Math.ceil((new Date(profile.periodEnd).getTime() - Date.now()) / 86400000) : null;
  const gestor = profile.role === 'owner' || profile.role === 'admin';
  const aviso = !isWorkspaceWritable()
    ? `A assinatura do cartório está "${statusLabels[profile.status]}". Os dados podem ser consultados, mas alterações estão bloqueadas. Procure o suporte para regularizar.`
    : gestor && diasParaVencer !== null && diasParaVencer <= 7
      ? diasParaVencer < 0 ? `A assinatura venceu em ${formatarData(profile.periodEnd)}. Procure o suporte para renovar.` : `A assinatura vence em ${diasParaVencer} dia${diasParaVencer === 1 ? '' : 's'} (${formatarData(profile.periodEnd)}).`
      : '';

  return <section className="home-screen">
    <header className="home-hero">
      <div>
        <p>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h2>{saudacao()}, {profile.userName.split(' ')[0]}</h2>
        <span>{semCartorio ? 'Você está conectado como administrador do sistema.' : `${profile.workspaceName}${profile.cartorioCidade ? ` · ${profile.cartorioCidade}` : ''}`}</span>
      </div>
      {!semCartorio && <div className="home-hero-badges"><span>{profile.plan === 'professional' ? 'Profissional' : 'Avaliação'}</span><span>{roleLabels[profile.role]}</span></div>}
    </header>

    {aviso && <p className="home-alert"><AlertTriangle />{aviso}</p>}

    <div className="home-grid">
      <div className="home-main">
        <h3 className="home-section-title">Acesso rápido</h3>
        {liberados.length ? <div className="home-shortcuts">{liberados.map(({ id, titulo, descricao, icon: Icon }) => <button key={id} type="button" className="home-shortcut" onClick={() => onNavegar(id)}>
          <span className="home-shortcut-icon"><Icon /></span>
          <strong>{titulo}</strong>
          <small>{descricao}</small>
          <span className="home-shortcut-go">Abrir <ArrowRight /></span>
        </button>)}</div> : <p className="home-empty">{semCartorio ? 'Esta conta não está vinculada a um cartório. Use a Administração geral para gerenciar os clientes.' : 'Nenhum recurso liberado para este cartório. Procure o suporte.'}</p>}
        {profile.isSystemAdmin && <button type="button" className="home-admin-card" onClick={() => onNavegar('super-admin')}>
          <span className="home-shortcut-icon"><ShieldCheck /></span>
          <div><strong>Administração geral</strong><small>Cartórios, contratos, vencimentos, usuários e recursos liberados.</small></div>
          <ArrowRight />
        </button>}
      </div>

      <aside className="home-side">
        {agendaLiberada && <div className="home-card">
          <h4><CalendarDays /> Hoje na agenda</h4>
          <div className="home-stats">
            <div><strong>{deHoje.length}</strong><small>atendimentos</small></div>
            <div><strong>{deHoje.filter((a) => a.realizado).length}</strong><small>realizados</small></div>
            <div><strong>{cadastrosAguardando}</strong><small>aguardando horário</small></div>
          </div>
          {proximos.length ? <ul className="home-next">{proximos.map((a) => <li key={a.id}><span><Clock3 />{a.horario}</span><div><strong>{a.cliente}</strong><small>{a.ato}{a.usaSala ? ` · ${a.sala}` : ''}</small></div></li>)}</ul> : <p className="home-muted">Nenhum atendimento pendente para hoje.</p>}
          <button type="button" className="home-link" onClick={() => onNavegar('agenda')}>Abrir agenda <ArrowRight /></button>
        </div>}

        {!semCartorio && <div className="home-card">
          <h4><UsersRound /> Sua conta</h4>
          <dl className="home-details">
            <div><dt>Cartório</dt><dd>{profile.workspaceName}</dd></div>
            {profile.cartorioTabeliao && <div><dt>Tabelião</dt><dd>{profile.cartorioTabeliao}</dd></div>}
            <div><dt>Usuário</dt><dd>{profile.userEmail}</dd></div>
            <div><dt>Perfil</dt><dd>{roleLabels[profile.role]}</dd></div>
            <div><dt>Assinatura</dt><dd>{statusLabels[profile.status]}</dd></div>
            {gestor && <div><dt>Vencimento</dt><dd>{formatarData(profile.periodEnd)}</dd></div>}
          </dl>
        </div>}

        <div className="home-card home-info">
          <h4><Info /> Orientações</h4>
          <p>Os rascunhos ficam salvos na conta do cartório e só os usuários dele têm acesso. Evite compartilhar telas, textos copiados ou impressos com dados pessoais.</p>
          <p>As minutas são modelos de apoio e devem ser revisadas por profissional responsável antes do uso oficial.</p>
        </div>
      </aside>
    </div>
  </section>;
}
