import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, FolderOpen, ShieldCheck } from 'lucide-react';
import { CampoData } from './Campos';
import { AgendamentoAgenda, assinarAgenda, carregarAgenda } from '../utils/agendaService';
import { formatarDataAgenda, hojeIso } from '../utils/campos';
import { MembroEquipe, carregarEquipe } from '../utils/equipe';
import { Certidao, Processo, alertasDoProcesso, assinarProcessos, etapaEncerrada, listarCertidoes, listarProcessos, processosDisponiveis, rotuloEtapa, situacaoCertidao, somarDias } from '../utils/processos';
import { canManageProcessos, isWorkspaceWritable, useWorkspaceProfile } from '../utils/workspaceStorage';

const roleLabels = { owner: 'Proprietário', admin: 'Admin do cartório', analyst: 'Analisador', attendant: 'Operador', viewer: 'Consulta' };
const statusLabels = { trialing: 'Em avaliação', active: 'Ativo', past_due: 'Pagamento pendente', cancelled: 'Cancelado', suspended: 'Suspenso' };

const formatarData = (valor: string | null) => valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Não definido';
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const diaPorExtenso = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); };
const nomesDasPartes = (p: Processo) => p.partes.map((x) => x.nome).filter(Boolean).join(', ') || 'Partes não informadas';

// Painel de controle de cada usuário: seus agendamentos por data e seus processos.
export function TelaInicial({ onNavegar }: { onNavegar: (aba: string) => void }) {
  const profile = useWorkspaceProfile();
  const hoje = hojeIso();
  const [data, setData] = useState(hoje);
  const [pessoa, setPessoa] = useState(profile.userId);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoAgenda[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [certidoes, setCertidoes] = useState<Certidao[]>([]);
  const agendaLiberada = profile.features.agenda;
  const processosLiberados = profile.features.processos && processosDisponiveis();
  const semCartorio = profile.workspaceId === 'workspace-local-demo';
  const gestor = profile.role === 'owner' || profile.role === 'admin';

  useEffect(() => {
    if (!agendaLiberada) return;
    let ativo = true;
    const carregar = () => { void carregarAgenda().then(({ agendamentos: lista }) => { if (ativo) setAgendamentos(lista); }).catch(() => undefined); };
    carregar();
    const cancelar = assinarAgenda(carregar);
    return () => { ativo = false; cancelar(); };
  }, [agendaLiberada]);

  useEffect(() => {
    if (!processosLiberados) return;
    let ativo = true;
    const carregar = () => {
      void Promise.all([listarProcessos(), listarCertidoes()]).then(([p, c]) => { if (ativo) { setProcessos(p); setCertidoes(c); } }).catch(() => undefined);
    };
    carregar();
    const cancelar = assinarProcessos(carregar);
    return () => { ativo = false; cancelar(); };
  }, [processosLiberados]);

  // Proprietário e administrador podem acompanhar o painel de qualquer colega.
  useEffect(() => {
    if (!gestor || semCartorio) return;
    void carregarEquipe().then(setEquipe).catch(() => undefined);
  }, [gestor, semCartorio]);

  const doDia = useMemo(
    () => agendamentos.filter((a) => a.atendente === pessoa && a.data === data).sort((a, b) => a.horario.localeCompare(b.horario)),
    [agendamentos, pessoa, data],
  );
  const proximaSemana = useMemo(
    () => agendamentos.filter((a) => a.atendente === pessoa && !a.realizado && a.data > hoje && a.data <= somarDias(hoje, 7)).length,
    [agendamentos, pessoa, hoje],
  );
  const meusProcessos = useMemo(
    () => processos.filter((p) => p.responsavelId === pessoa && !etapaEncerrada(p.etapa))
      .sort((a, b) => (a.dataPrevista || '9999').localeCompare(b.dataPrevista || '9999')),
    [processos, pessoa],
  );
  // Certidões com alerta em qualquer processo em andamento do cartório.
  const certidoesComAlerta = useMemo(() => processos.flatMap((p) => alertasDoProcesso(p, certidoes).map((c) => ({ certidao: c, processo: p })))
    .sort((a, b) => a.certidao.vencimento.localeCompare(b.certidao.vencimento)), [processos, certidoes]);

  const nomeDaPessoa = pessoa === profile.userId ? 'Você' : equipe.find((m) => m.id === pessoa)?.nome ?? 'Colega';
  const diasParaVencer = profile.periodEnd ? Math.ceil((new Date(profile.periodEnd).getTime() - Date.now()) / 86400000) : null;
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

    {profile.isSystemAdmin && <button type="button" className="home-admin-card" onClick={() => onNavegar('super-admin')}>
      <span className="home-shortcut-icon"><ShieldCheck /></span>
      <div><strong>Administração geral</strong><small>Cartórios, contratos, vencimentos, usuários e recursos liberados.</small></div>
      <ArrowRight />
    </button>}

    {!semCartorio && <>
      {gestor && equipe.length > 1 && <label className="painel-pessoa">Painel de
        <select value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
          <option value={profile.userId}>Você ({profile.userName})</option>
          {equipe.filter((m) => m.id !== profile.userId).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </label>}

      <div className="painel-grid">
        {agendaLiberada && <div className="home-card painel-agenda">
          <div className="painel-card-heading">
            <h4><CalendarDays /> Agendamentos · {nomeDaPessoa}</h4>
            <div className="painel-data">
              <button type="button" aria-label="Dia anterior" onClick={() => setData(somarDias(data, -1))}><ChevronLeft /></button>
              <CampoData value={data} onChange={(v) => { if (v) setData(v); }} className="" />
              <button type="button" aria-label="Próximo dia" onClick={() => setData(somarDias(data, 1))}><ChevronRight /></button>
              {data !== hoje && <button type="button" className="painel-hoje" onClick={() => setData(hoje)}>Hoje</button>}
            </div>
          </div>
          <p className="painel-dia">{data === hoje ? 'Hoje, ' : ''}{diaPorExtenso(data)}</p>
          <div className="home-stats">
            <div><strong>{doDia.length}</strong><small>no dia</small></div>
            <div><strong>{doDia.filter((a) => a.realizado).length}</strong><small>realizados</small></div>
            <div><strong>{proximaSemana}</strong><small>nos próximos 7 dias</small></div>
          </div>
          {doDia.length ? <ul className="home-next">{doDia.map((a) => <li key={a.id} className={a.realizado ? 'is-done' : ''}>
            <span>{a.realizado ? <CheckCircle2 /> : <Clock3 />}{a.horario}</span>
            <div><strong>{a.cliente}</strong><small>{a.ato}{a.usaSala ? ` · ${a.sala}` : ' · sem sala'}{a.realizado ? ' · realizado' : ''}</small></div>
          </li>)}</ul> : <p className="home-muted">Nenhum agendamento em {formatarDataAgenda(data)}.</p>}
          <button type="button" className="home-link" onClick={() => onNavegar('agenda')}>Abrir agenda <ArrowRight /></button>
        </div>}

        {processosLiberados && <div className="home-card">
          <h4><FolderOpen /> Processos sob responsabilidade · {nomeDaPessoa}</h4>
          {meusProcessos.length ? <ul className="painel-processos">{meusProcessos.slice(0, 8).map((p) => {
            const alertas = alertasDoProcesso(p, certidoes).length;
            const atrasado = p.dataPrevista && p.dataPrevista < hoje;
            return <li key={p.id}>
              <div><strong>{nomesDasPartes(p)}</strong><small>{p.tipoAto} · {rotuloEtapa(p.etapa)}{p.gaveta ? ` · gaveta ${p.gaveta}` : ''}</small></div>
              <span className={atrasado ? 'is-late' : ''}>{p.dataPrevista ? formatarDataAgenda(p.dataPrevista) : 'sem data'}{alertas ? <b title="Certidões vencendo"><AlertTriangle /> {alertas}</b> : null}</span>
            </li>;
          })}</ul> : <p className="home-muted">Nenhum processo em andamento sob responsabilidade.</p>}
          {meusProcessos.length > 8 && <p className="home-muted">E mais {meusProcessos.length - 8} processo(s).</p>}
          <button type="button" className="home-link" onClick={() => onNavegar('processos')}>Abrir processos <ArrowRight /></button>
        </div>}

        {processosLiberados && canManageProcessos() && <div className="home-card">
          <h4><AlertTriangle /> Certidões vencendo no cartório</h4>
          {certidoesComAlerta.length ? <ul className="painel-processos">{certidoesComAlerta.slice(0, 8).map(({ certidao, processo }) => {
            const vencida = situacaoCertidao(certidao, processo.dataPrevista) === 'vencida';
            return <li key={certidao.id}>
              <div><strong>{certidao.tipo}</strong><small>{nomesDasPartes(processo)}{certidao.referente ? ` · ${certidao.referente}` : ''}</small></div>
              <span className={vencida ? 'is-late' : 'is-warning'}>{vencida ? 'venceu' : 'vence'} {formatarDataAgenda(certidao.vencimento)}</span>
            </li>;
          })}</ul> : <p className="home-muted">Nenhuma certidão vencida ou vencendo.</p>}
          {certidoesComAlerta.length > 8 && <p className="home-muted">E mais {certidoesComAlerta.length - 8} certidão(ões).</p>}
        </div>}
      </div>

      {!agendaLiberada && !processosLiberados && <p className="home-empty">Nenhum recurso de acompanhamento liberado para este cartório. Use o menu para abrir os formulários.</p>}
    </>}
  </section>;
}
