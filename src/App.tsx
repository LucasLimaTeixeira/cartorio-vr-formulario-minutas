import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2, Building, User, Phone, MapPin, CreditCard, Home, Printer, Car, Shield, Moon, Sun, Menu, X, CalendarDays, CalendarPlus, Clock3, DoorOpen, UsersRound, AlertTriangle, CheckCircle2, LogOut, LayoutDashboard, ScrollText } from 'lucide-react';
import {
  Pessoa,
  DadosBancarios,
  DadosImovel,
  DadosAdministracaoImovel,
  DadosVeiculo,
  OutrosPoderes,
  Testemunha,
  Requerente,
  FormularioApostilamento,
  FormularioCertidao,
  FormularioProcuracao,
  FormularioUniaoEstavel,
  FormularioPactoAntenupcial,
  PODERES_OPCOES,
  REGIMES_BENS,
  REGIMES_PACTO,
} from './types';
import { CampoData, CampoDocumento, CampoEstadoCivil } from './components/Campos';
import { converterDataAgenda, formatarDataAgenda, hoje, hojeIso, mascararData, opcoesCom } from './utils/campos';
import { formatarCPF, formatarDocumento } from './utils/documentos';
import { MinutaModal, TipoMinuta } from './components/MinutaModal';
import { SuperAdminClients } from './components/SuperAdminClients';
import { ModelosMinutaAdmin } from './components/ModelosMinutaAdmin';
import { WorkspaceFeature, canEditWorkspace, loadWorkspaceState, useWorkspaceProfile } from './utils/workspaceStorage';
import { useAtendimento } from './utils/atendimentos';
import { BarraAtendimento } from './components/BarraAtendimento';
import { TelaInicial } from './components/TelaInicial';
import { supabase } from './lib/supabase';
import { AgendamentoAgenda, CadastroAgenda, assinarAgenda, atualizarStatusAgendamento, carregarAgenda, removerItemAgenda, reservarAgendamento, salvarCadastro } from './utils/agendaService';
import { MembroEquipe, carregarEquipe } from './utils/equipe';

const itensMenu = [
  { id: 'inicio', label: 'Tela inicial', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'procuracao', label: 'Procuração', icon: FileText },
  { id: 'apostilamento', label: 'Apostilamento', icon: Shield },
  { id: 'certidoes', label: 'Certidões', icon: FileText },
  { id: 'uniao_estavel', label: 'União Estável', icon: User },
  { id: 'pacto_antenupcial', label: 'Pacto Antenupcial', icon: Building },
  { id: 'outros', label: 'Outros Formulários', icon: CreditCard },
  { id: 'super-admin', label: 'Administração', icon: Shield },
  { id: 'modelos-minuta', label: 'Modelos de Minutas', icon: ScrollText },
];

function TermosCondicoes() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Termos e Condições</h2>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
        <div className="text-sm text-gray-700 leading-relaxed print:text-xs print:leading-tight">
          <p className="mb-4">
            Nos termos dos artigos 29 e seguintes da Consolidação Normativa da Corregedoria de Justiça deste Estado. O requerente fica advertido da possibilidade de haver diferença no valor dos emolumentos, em função do número de páginas da certidão (art 411 e seus parágrafos da Consolidação Normativa da Corregedoria Geral da Justiça deste Estado). Tendo o mesmo requerente lido e conferido o requerimento.
          </p>
          <p>
            As exigências acima são em cumprimento ao artigo 2º e seus incisos do Provimento nº 61/2017 de 17/10/2017 da Corregedoria Nacional de Justiça.
          </p>
        </div>
      </div>
    </section>
  );
}

const horariosAgenda = Array.from({ length: 18 }, (_, index) => {
  const minutosDoDia = 8 * 60 + 30 + index * 30;
  const hora = Math.floor(minutosDoDia / 60).toString().padStart(2, '0');
  const minutos = (minutosDoDia % 60).toString().padStart(2, '0');
  return `${hora}:${minutos}`;
});
const salasAgenda = ['Sala 1', 'Sala 2', 'Sala 3'];
const atosSemSala = ['Certidão', 'Apostilamento'];

// Fixo: (21) 2345-6789 · Celular: (21) 98765-4321. Campo vazio continua vazio.
function formatarTelefone(valor: string) {
  const n = valor.replace(/\D/g, '').substring(0, 11);
  if (!n) return '';
  if (n.length <= 2) return `(${n}`;
  const meio = n.length === 11 ? 7 : 6;
  if (n.length <= meio) return `(${n.substring(0, 2)}) ${n.substring(2)}`;
  return `(${n.substring(0, 2)}) ${n.substring(2, meio)}-${n.substring(meio)}`;
}

// R$ 1.234.567,89 — os dígitos entram pela direita, como em caixa eletrônico.
function formatarMoeda(valor: string) {
  const n = valor.replace(/\D/g, '').replace(/^0+/, '').substring(0, 15);
  if (!n) return '';
  const centavos = n.padStart(3, '0');
  const inteiro = centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${inteiro},${centavos.slice(-2)}`;
}

const somenteDigitos = (valor: string, limite: number) => valor.replace(/\D/g, '').substring(0, limite);

const classeCampo = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm';
const classeRotulo = 'block text-sm font-medium text-gray-700 mb-2 print:mb-1';

function inicioDaSemana(data: Date) {
  const resultado = new Date(data);
  const diaDaSemana = resultado.getDay();
  const diferenca = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
  resultado.setDate(resultado.getDate() + diferenca);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
}

function converterDataParaDate(dataIso: string) {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

interface PainelAtendenteProps {
  atendente: MembroEquipe;
  agendamentos: AgendamentoAgenda[];
  onVoltar: () => void;
}

function PainelAtendente({ atendente, agendamentos, onVoltar }: PainelAtendenteProps) {
  const [buscaCliente, setBuscaCliente] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');
  const hoje = new Date();
  const inicioSemana = inicioDaSemana(hoje);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const agendamentosDoAtendente = useMemo(
    () => agendamentos.filter((item) => item.atendente === atendente.id),
    [agendamentos, atendente.id],
  );
  const atosRealizados = useMemo(
    () => agendamentosDoAtendente.filter((item) => item.realizado),
    [agendamentosDoAtendente],
  );
  const quantidadeNoPeriodo = (inicio: Date, fim?: Date) => atosRealizados.filter((item) => {
    const data = converterDataParaDate(item.data);
    return data >= inicio && (!fim || data <= fim);
  }).length;
  const agendamentosFiltrados = useMemo(() => {
    const buscaNormalizada = buscaCliente.toLowerCase();
    return agendamentosDoAtendente.filter((item) => {
      const correspondeCliente = item.cliente.toLowerCase().includes(buscaNormalizada);
      return correspondeCliente && (!dataFiltro || item.data === dataFiltro);
    });
  }, [agendamentosDoAtendente, buscaCliente, dataFiltro]);

  return (
    <div className="attendant-dashboard">
      <div className="attendant-dashboard-heading">
        <button type="button" className="attendant-back-button" onClick={onVoltar}>Voltar para agenda</button>
        <div className="attendant-profile-heading">
          <span className="attendant-avatar" aria-label={`Iniciais de ${atendente.nome}`}>{atendente.iniciais}</span>
          <div><span className="agenda-kicker"><UsersRound className="w-4 h-4" /> Painel do atendente</span><h2>{atendente.nome}</h2><p>{atendente.funcao} · visão operacional de atendimentos</p></div>
        </div>
      </div>

      <div className="attendant-metrics">
        <div><span>Realizados no mês</span><strong>{quantidadeNoPeriodo(inicioMes)}</strong></div>
        <div><span>Realizados na semana</span><strong>{quantidadeNoPeriodo(inicioSemana, new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 6))}</strong></div>
        <div><span>Realizados no ano</span><strong>{quantidadeNoPeriodo(new Date(hoje.getFullYear(), 0, 1), new Date(hoje.getFullYear(), 11, 31))}</strong></div>
        <div><span>Total na agenda</span><strong>{agendamentosDoAtendente.length}</strong></div>
      </div>

      <section className="agenda-section">
        <div className="agenda-section-heading"><div><span className="agenda-kicker"><CalendarDays className="w-4 h-4" /> Histórico e agenda</span><h3>Todos os agendamentos</h3></div><span className="agenda-section-note">{agendamentosFiltrados.length} resultado(s)</span></div>
        <div className="attendant-filters">
          <label>Buscar cliente<input type="search" value={buscaCliente} onChange={(event) => setBuscaCliente(event.target.value)} placeholder="Nome do cliente" /></label>
          <label>Filtrar por data<CampoData value={dataFiltro} onChange={setDataFiltro} className="" /></label>
        </div>
        <div className="attendant-appointments">
          {agendamentosFiltrados.length > 0 ? agendamentosFiltrados.map((agendamento) => <article className={`attendant-appointment ${agendamento.realizado ? 'is-done' : ''}`} key={agendamento.id}><div><strong>{agendamento.cliente}</strong><span>{agendamento.ato} · {agendamento.sala}</span></div><div><b>{formatarDataAgenda(agendamento.data)} às {agendamento.horario}</b><small>{agendamento.realizado ? 'Realizado' : 'Agendado'}</small></div></article>) : <p className="pending-empty">Nenhum agendamento encontrado para os filtros selecionados.</p>}
        </div>
      </section>
    </div>
  );
}

interface AgendaAtendimentosProps {
  cadastrosAguardando: CadastroAgenda[];
  onCadastroAgendado: (id: number) => void;
  onAgendamentoRemarcado: (cadastro: CadastroAgenda) => void;
}

function AgendaAtendimentos({ cadastrosAguardando = [], onCadastroAgendado, onAgendamentoRemarcado }: AgendaAtendimentosProps) {
  const profile = useWorkspaceProfile();
  const [dataAgenda, setDataAgenda] = useState(hojeIso);
  const [dataAgendaTexto, setDataAgendaTexto] = useState(() => formatarDataAgenda(hojeIso()));
  const [agendamentos, setAgendamentos] = useState<AgendamentoAgenda[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [atendenteSelecionado, setAtendenteSelecionado] = useState('');
  const [horarioSelecionado, setHorarioSelecionado] = useState('13:30');
  const [salaSelecionada, setSalaSelecionada] = useState('Sala 1');
  const [atoSelecionado, setAtoSelecionado] = useState('Novo atendimento');
  const [cadastroSelecionado, setCadastroSelecionado] = useState('');
  const [clienteAvulso, setClienteAvulso] = useState('');
  const [mensagemAgenda, setMensagemAgenda] = useState('');
  const [atendenteEmFoco, setAtendenteEmFoco] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void carregarAgenda().then(({ agendamentos }) => {
      if (mounted) setAgendamentos(agendamentos);
    }).catch(() => {
      if (mounted) setMensagemAgenda('Não foi possível carregar a agenda compartilhada.');
    });
    const unsubscribe = assinarAgenda(() => {
      void carregarAgenda().then(({ agendamentos }) => {
        if (mounted) setAgendamentos(agendamentos);
      });
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Equipe real do cartório; quem está logado já vem selecionado para o próximo agendamento.
  useEffect(() => {
    let mounted = true;
    void carregarEquipe().then((membros) => {
      if (!mounted) return;
      setEquipe(membros);
      setAtendenteSelecionado((atual) => atual || (membros.find((m) => m.id === profile.userId) ?? membros[0])?.id || '');
    }).catch(() => {
      if (mounted) setMensagemAgenda('Não foi possível carregar a equipe do cartório.');
    });
    return () => { mounted = false; };
  }, [profile.userId]);

  const agendamentosDoDia = useMemo(
    () => agendamentos.filter((item) => item.data === dataAgenda),
    [agendamentos, dataAgenda],
  );
  const agendamentosComSala = useMemo(
    () => agendamentosDoDia.filter((item) => item.usaSala !== false),
    [agendamentosDoDia],
  );
  const agendamentosSemSala = useMemo(
    () => agendamentosDoDia.filter((item) => item.usaSala === false),
    [agendamentosDoDia],
  );
  const horariosCheios = useMemo(
    () => horariosAgenda.filter((horario) => agendamentosComSala.filter((item) => item.horario === horario).length >= salasAgenda.length),
    [agendamentosComSala],
  );
  const salasLivres = useMemo(
    () => salasAgenda.filter((sala) => !agendamentosComSala.some((item) => item.horario === horarioSelecionado && item.sala === sala)),
    [agendamentosComSala, horarioSelecionado],
  );
  const totalAtos = agendamentosDoDia.length;
  // Sem escolha explícita, o primeiro da fila já vem selecionado; 'avulso' agenda sem cadastro.
  const cadastroParaAgendar = cadastroSelecionado === 'avulso'
    ? undefined
    : cadastrosAguardando.find((cadastro) => cadastro.id.toString() === cadastroSelecionado) ?? cadastrosAguardando[0];
  // Certidão e apostilamento são atendidos no balcão, sem sala.
  const usaSalaSelecionada = cadastroParaAgendar?.usaSala ?? !atosSemSala.includes(atoSelecionado);
  const podeEditar = canEditWorkspace();

  // Agendamentos de quem saiu da equipe continuam mostrando o nome gravado na reserva.
  const nomeAtendente = (agendamento: AgendamentoAgenda) => equipe.find((m) => m.id === agendamento.atendente)?.nome ?? agendamento.atendenteNome ?? 'Atendente removido';
  const atendenteSelecionadoParaPainel = equipe.find((atendente) => atendente.id === atendenteEmFoco);

  if (atendenteSelecionadoParaPainel) {
    return <PainelAtendente atendente={atendenteSelecionadoParaPainel} agendamentos={agendamentos} onVoltar={() => setAtendenteEmFoco(null)} />;
  }

  const cancelarAgendamento = (id: string) => {
    const agendamento = agendamentos.find((item) => item.id === id);
    const confirmarCancelamento = window.confirm(
      `Deseja cancelar o atendimento de ${agendamento?.cliente ?? 'Cliente não informado'}?`
    );

    if (!confirmarCancelamento) return;

    setAgendamentos((atuais) => atuais.filter((agendamento) => agendamento.id !== id));
    setMensagemAgenda('Agendamento cancelado.');
    removerItemAgenda(id).catch(() => desfazerFalha('Não foi possível cancelar o agendamento. A agenda foi recarregada.'));
  };

  // A tela muda na hora; se o banco recusar, a agenda volta a mostrar o que está gravado.
  const desfazerFalha = (mensagem: string) => {
    setMensagemAgenda(mensagem);
    void carregarAgenda().then(({ agendamentos }) => setAgendamentos(agendamentos)).catch(() => undefined);
  };

  const alternarRealizado = (id: string) => {
    const agendamento = agendamentos.find((item) => item.id === id);
    if (!agendamento) return;
    const atualizado = { ...agendamento, realizado: !agendamento.realizado };
    setAgendamentos((atuais) => atuais.map((item) => (item.id === id ? atualizado : item)));
    setMensagemAgenda('Status do atendimento atualizado.');
    atualizarStatusAgendamento(atualizado).catch(() => desfazerFalha('Não foi possível atualizar o status. A agenda foi recarregada.'));
  };

  const remarcarAgendamento = (agendamento: AgendamentoAgenda) => {
    setAgendamentos((atuais) => atuais.filter((item) => item.id !== agendamento.id));
    removerItemAgenda(agendamento.id).catch(() => desfazerFalha('Não foi possível remarcar. A agenda foi recarregada.'));
    onAgendamentoRemarcado({
      id: Date.now(),
      formulario: agendamento.ato,
      descricao: agendamento.ato,
      cliente: agendamento.cliente,
      usaSala: agendamento.usaSala !== false,
    });
    setCadastroSelecionado('');
    setAtendenteSelecionado(agendamento.atendente);
    setHorarioSelecionado(agendamento.horario);
    setSalaSelecionada(agendamento.sala);
    setMensagemAgenda(`${agendamento.cliente} voltou para aguardando agendamento.`);
  };

  const agendarAtendimento = async () => {
    const atendente = equipe.find((m) => m.id === atendenteSelecionado);
    if (!atendente) {
      setMensagemAgenda('Escolha quem vai fazer o atendimento.');
      return;
    }
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    if (dataAgenda < hojeIso() || (dataAgenda === hojeIso() && horarioSelecionado < horaAtual)) {
      setMensagemAgenda('Não é possível agendar em data ou horário que já passou.');
      return;
    }
    const atosNoHorario = agendamentosComSala.filter((item) => item.horario === horarioSelecionado);
    const salaOcupada = agendamentosComSala.some((item) => item.horario === horarioSelecionado && item.sala === salaSelecionada);

    if (usaSalaSelecionada && atosNoHorario.length >= salasAgenda.length) {
      setMensagemAgenda(`O horário das ${horarioSelecionado} já atingiu o limite de ${salasAgenda.length} salas.`);
      return;
    }

    if (usaSalaSelecionada && salaOcupada) {
      setMensagemAgenda(`${salaSelecionada} já está ocupada às ${horarioSelecionado}. Escolha outra sala.`);
      return;
    }

    const novoAgendamento: AgendamentoAgenda = {
        id: crypto.randomUUID(),
        data: dataAgenda,
        horario: horarioSelecionado,
        sala: usaSalaSelecionada ? salaSelecionada : 'Sem sala',
        atendente: atendente.id,
        atendenteNome: atendente.nome,
        ato: cadastroParaAgendar?.descricao ?? atoSelecionado,
        cliente: cadastroParaAgendar?.cliente ?? (clienteAvulso.trim() || 'Cliente não informado'),
        usaSala: usaSalaSelecionada,
        realizado: false,
      };
    try {
      const agendamentoSalvo = await reservarAgendamento(novoAgendamento, cadastroParaAgendar);
      setAgendamentos((atuais) => [...atuais, agendamentoSalvo]);
      if (cadastroParaAgendar) onCadastroAgendado(cadastroParaAgendar.id);
      else setClienteAvulso('');
      setMensagemAgenda('Atendimento reservado na agenda.');
    } catch (error) {
      setMensagemAgenda(error instanceof Error ? error.message : 'Não foi possível reservar o atendimento.');
    }
  };

  return (
    <div className="agenda-screen">
      <div className="agenda-heading">
        <div>
          <p className="agenda-kicker"><CalendarDays className="w-4 h-4" /> Central de atendimento</p>
          <h2>Agenda do cartório</h2>
          <p>Uma visão rápida de quem atende, onde e quando. A grade respeita o limite de três salas por horário.</p>
        </div>
        <label className="agenda-date-field">
          <span>Dia em foco</span>
          <input
            type="text"
            value={dataAgendaTexto}
            onChange={(event) => {
              const texto = mascararData(event.target.value);
              setDataAgendaTexto(texto);
              const dataIso = converterDataAgenda(texto);
              if (dataIso) setDataAgenda(dataIso);
            }}
            onBlur={() => setDataAgendaTexto(formatarDataAgenda(dataAgenda))}
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            aria-label="Dia em foco no formato dia, mês e ano"
          />
        </label>
      </div>

      <div className="agenda-summary">
        <div className="agenda-summary-item"><Clock3 /><div><strong>{totalAtos}</strong><span>atos agendados</span></div></div>
        <div className="agenda-summary-item"><DoorOpen /><div><strong>{salasAgenda.length}</strong><span>salas disponíveis</span></div></div>
        <div className={`agenda-summary-item ${horariosCheios.length > 0 ? 'is-warning' : 'is-ok'}`}>
          {horariosCheios.length > 0 ? <AlertTriangle /> : <CheckCircle2 />}
          <div><strong>{horariosCheios.length}</strong><span>horários no limite</span></div>
        </div>
      </div>

      <section className="agenda-section">
        <div className="agenda-section-heading"><div><span className="agenda-kicker"><UsersRound className="w-4 h-4" /> Equipe em serviço</span><h3>Atos por atendente</h3></div><span className="agenda-section-note">{formatarDataAgenda(dataAgenda)}</span></div>
        <div className="attendant-grid">
          {equipe.length === 0 && <p className="pending-empty">Nenhum atendente na equipe. Os usuários do cartório aparecem aqui assim que forem cadastrados.</p>}
          {equipe.map((atendente) => (
            <button type="button" className="attendant-card" key={atendente.id} onClick={() => setAtendenteEmFoco(atendente.id)}>
              <span className="attendant-avatar" aria-label={`Iniciais de ${atendente.nome}`}>{atendente.iniciais}</span>
              <div><strong>{atendente.nome}</strong><span>{atendente.funcao}</span></div>
              <b>{agendamentosDoDia.filter((item) => item.atendente === atendente.id).length}<small> atos</small></b>
            </button>
          ))}
        </div>
      </section>

      <section className="agenda-section pending-section">
        <div className="agenda-section-heading"><div><span className="agenda-kicker"><Clock3 className="w-4 h-4" /> Fila de atendimento</span><h3>Aguardando agendamento</h3></div><span className="agenda-section-note">{cadastrosAguardando.length} cadastro(s)</span></div>
        {cadastrosAguardando.length > 0 ? <div className="pending-grid">{cadastrosAguardando.map((cadastro) => <article className="pending-card" key={cadastro.id}><span>{cadastro.formulario}</span><strong>{cadastro.cliente}</strong><small>{cadastro.descricao} · pronto para escolher horário e sala</small></article>)}</div> : <p className="pending-empty">Nenhum formulário aguardando agendamento. Cadastre um formulário para ele aparecer aqui.</p>}
      </section>

      <section className="agenda-section no-room-section">
        <div className="agenda-section-heading"><div><span className="agenda-kicker"><FileText className="w-4 h-4" /> Fluxo sem sala</span><h3>Certidões e apostilamentos</h3></div><span className="agenda-section-note">{agendamentosSemSala.length} atendimento(s)</span></div>
        {agendamentosSemSala.length > 0 ? <div className="no-room-grid">{agendamentosSemSala.map((atendimento) => <article className={`no-room-card ${atendimento.realizado ? 'is-done' : ''}`} key={atendimento.id}><div><span>{atendimento.realizado && <CheckCircle2 className="done-icon" />} {atendimento.horario} · {atendimento.ato}</span><strong>{atendimento.cliente}</strong><small>Atendimento sem utilização de sala · {nomeAtendente(atendimento)}</small></div>{podeEditar && <div className="schedule-actions"><button type="button" className="realized-action" onClick={() => alternarRealizado(atendimento.id)}>{atendimento.realizado ? 'Desfazer' : 'Realizado'}</button><button type="button" onClick={() => remarcarAgendamento(atendimento)}>Remarcar</button><button type="button" onClick={() => cancelarAgendamento(atendimento.id)}>Cancelar</button></div>}</article>)}</div> : <p className="pending-empty">Nenhuma certidão ou apostilamento agendado para este dia.</p>}
      </section>

      <div className="agenda-columns">
        <section className="agenda-section schedule-section">
          <div className="agenda-section-heading"><div><span className="agenda-kicker"><DoorOpen className="w-4 h-4" /> Operação</span><h3>Mapa de salas</h3></div><span className="agenda-section-note">Máximo: 3 atos / horário</span></div>
          <div className="schedule-grid">
            <div className="schedule-grid-header"><span>Horário</span>{salasAgenda.map((sala) => <span key={sala}>{sala}</span>)}</div>
            {horariosAgenda.map((horario) => {
              const atosDoHorario = agendamentosComSala.filter((item) => item.horario === horario);
              return <div className={`schedule-grid-row ${atosDoHorario.length === 3 ? 'is-full' : ''}`} key={horario}>
                <strong>{horario}</strong>
                {salasAgenda.map((sala) => {
                  const atendimento = atosDoHorario.find((item) => item.sala === sala);
                  return <div className={`schedule-room ${atendimento ? 'is-booked' : 'is-free'} ${atendimento?.realizado ? 'is-done' : ''}`} key={sala}>
                    {atendimento ? <><b>{atendimento.realizado && <CheckCircle2 className="done-icon" />} {atendimento.ato}</b><span className="schedule-client">Cliente: {atendimento.cliente}</span><span>{nomeAtendente(atendimento)}</span>{podeEditar && <div className="schedule-actions"><button type="button" className="realized-action" onClick={() => alternarRealizado(atendimento.id)}>{atendimento.realizado ? 'Desfazer' : 'Realizado'}</button><button type="button" onClick={() => remarcarAgendamento(atendimento)}>Remarcar</button><button type="button" onClick={() => cancelarAgendamento(atendimento.id)}>Cancelar</button></div>}</> : <span>Livre</span>}
                  </div>;
                })}
              </div>;
            })}
          </div>
        </section>

        <section className="agenda-section booking-section">
          <div className="agenda-section-heading"><div><span className="agenda-kicker"><Plus className="w-4 h-4" /> Ação rápida</span><h3>Novo atendimento</h3></div></div>
          <div className="booking-form">
            <label>Cadastro<select value={cadastroParaAgendar?.id.toString() ?? 'avulso'} onChange={(event) => setCadastroSelecionado(event.target.value)}><option value="avulso">Atendimento avulso</option>{cadastrosAguardando.map((cadastro) => <option value={cadastro.id} key={cadastro.id}>{cadastro.cliente} · {cadastro.descricao}</option>)}</select></label>
            {!cadastroParaAgendar && <label>Cliente<input type="text" value={clienteAvulso} onChange={(event) => setClienteAvulso(event.target.value)} placeholder="Nome do cliente" /></label>}
            <label>Atendente<select value={atendenteSelecionado} onChange={(event) => setAtendenteSelecionado(event.target.value)}>{!equipe.length && <option value="">Nenhum atendente cadastrado</option>}{equipe.map((atendente) => <option value={atendente.id} key={atendente.id}>{atendente.nome}</option>)}</select></label>
            {!cadastroParaAgendar && <label>Tipo de ato<select value={atoSelecionado} onChange={(event) => setAtoSelecionado(event.target.value)}><option>Novo atendimento</option><option>Procuração pública</option><option>Escritura</option><option>Certidão</option><option>Apostilamento</option></select></label>}
            <label>Horário<select value={horarioSelecionado} onChange={(event) => setHorarioSelecionado(event.target.value)}>{horariosAgenda.map((horario) => <option value={horario} key={horario}>{horario}{horariosCheios.includes(horario) ? ' · lotado' : ''}</option>)}</select></label>
            {usaSalaSelecionada && <label>Sala<select value={salaSelecionada} onChange={(event) => setSalaSelecionada(event.target.value)}>{salasAgenda.map((sala) => <option value={sala} key={sala}>{sala}{!salasLivres.includes(sala) ? ' · ocupada' : ''}</option>)}</select></label>}
            <button type="button" onClick={() => void agendarAtendimento()} className="booking-button" disabled={!podeEditar || !atendenteSelecionado || (usaSalaSelecionada && (horariosCheios.includes(horarioSelecionado) || !salasLivres.includes(salaSelecionada)))}><CheckCircle2 className="w-4 h-4" /> {usaSalaSelecionada ? 'Reservar sala e horário' : 'Reservar horário sem sala'}</button>
            {mensagemAgenda && <p className="booking-feedback">{mensagemAgenda}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

// Formulários em branco, usados ao abrir um novo atendimento.
function formularioProcuracaoVazio(): FormularioProcuracao {
  return {
    outorgantes: [{
      id: '1',
      nome: '',
      documento: '',
      tipoDocumento: 'CPF',
      nacionalidade: 'Brasileira',
      rg: '',
      dataExpedicaoRg: '',
       orgaoExpedidor: '',
      endereco: '',
      telefone: '',
      profissao: '',
      estadoCivil: ''
    }],
    outorgados: [{
      id: '1',
      nome: '',
      documento: '',
      tipoDocumento: 'CPF',
      nacionalidade: 'Brasileira',
      rg: '',
      dataExpedicaoRg: '',
      orgaoExpedidor: '',
      endereco: '',
      profissao: '',
      estadoCivil: ''
    }],
    testemunhas: [],
    poderesOutorgados: [],
    dadosBancarios: [],
    dadosImovel: [],
    dadosAdministracaoImovel: [],
    dadosVeiculo: [],
   outros: [],
  };
}

function formularioApostilamentoVazio(): FormularioApostilamento {
  return {
    dataEntrega: '',
    horarioEntrega: '',
    requerentes: [{
      id: '1',
      nome: '',
      cpf: '',
      rg: '',
      dataExpedicaoRg: '',
      orgaoExpedidor: '',
      endereco: '',
      telefone: '',
      profissao: '',
      estadoCivil: '',
      email: '',
      dataNascimento: '',
      filiacao: ''
    }],
    paisDestino: '',
    quantidadeDocumentos: '',
    quaisDocumentos: '',
    assinaturaApostilada: ''
  };
}

function formularioCertidaoVazio(): FormularioCertidao {
  return {
    dataEntrega: '',
    horarioEntrega: '',
    requerentes: [{
      id: '1',
      nome: '',
      cpf: '',
      rg: '',
      dataExpedicaoRg: '',
      orgaoExpedidor: '',
      endereco: '',
      telefone: '',
      profissao: '',
      estadoCivil: '',
      email: '',
      dataNascimento: '',
      filiacao: ''
    }],
    tipoCertidao: '',
    nomeOutorgantes: '',
    nomeOutorgados: '',
    livro: '',
    folha: '',
    data: '',
    finalidade: ''
  };
}

function formularioUniaoEstavelVazio(): FormularioUniaoEstavel {
  return {
    companheiros: [
      { id: '1', nome: '', documento: '', tipoDocumento: 'CPF', nacionalidade: 'Brasileira', rg: '', dataExpedicaoRg: '', orgaoExpedidor: '', endereco: '', telefone: '', profissao: '', estadoCivil: '' },
      { id: '2', nome: '', documento: '', tipoDocumento: 'CPF', nacionalidade: 'Brasileira', rg: '', dataExpedicaoRg: '', orgaoExpedidor: '', endereco: '', telefone: '', profissao: '', estadoCivil: '' },
    ],
    dataInicioUniao: '',
    regimeBens: '',
    enderecoComum: '',
    filhos: '',
    testemunhas: [],
  };
}

function formularioPactoAntenupcialVazio(): FormularioPactoAntenupcial {
  return {
    nubentes: [
      { id: '1', nome: '', documento: '', tipoDocumento: 'CPF', nacionalidade: 'Brasileira', rg: '', dataExpedicaoRg: '', orgaoExpedidor: '', endereco: '', telefone: '', profissao: '', estadoCivil: '' },
      { id: '2', nome: '', documento: '', tipoDocumento: 'CPF', nacionalidade: 'Brasileira', rg: '', dataExpedicaoRg: '', orgaoExpedidor: '', endereco: '', telefone: '', profissao: '', estadoCivil: '' },
    ],
    regimeBens: '',
    clausulasEspecificas: '',
    dataPrevistaCasamento: '',
    bensParticulares: '',
    testemunhas: [],
  };
}

const nomesDe = (pessoas: { nome?: string }[]) => pessoas.map((p) => p.nome?.trim()).filter(Boolean).join(' e ');
const clienteProcuracao = (f: FormularioProcuracao) => f.outorgantes[0]?.nome?.trim() || f.outorgados[0]?.nome?.trim() || '';
const clienteRequerente = (f: FormularioApostilamento | FormularioCertidao) => f.requerentes[0]?.nome?.trim() || '';
const clienteUniaoEstavel = (f: FormularioUniaoEstavel) => nomesDe(f.companheiros);
const clientePacto = (f: FormularioPactoAntenupcial) => nomesDe(f.nubentes);

function App() {
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const profile = useWorkspaceProfile();
  // Recursos desabilitados somem do menu na hora e a aba aberta volta para a tela inicial.
  const abasSuperAdmin = ['super-admin', 'modelos-minuta'];
  const podeAcessar = (aba: string) => aba === 'inicio' || (abasSuperAdmin.includes(aba) ? profile.isSystemAdmin : Boolean(profile.features[aba as WorkspaceFeature]));
  const abaVisivel = podeAcessar(abaAtiva) ? abaAtiva : 'inicio';
  useEffect(() => { if (abaVisivel !== abaAtiva) setAbaAtiva(abaVisivel); }, [abaVisivel, abaAtiva]);
  const abrirAba = (aba: string) => { setAbaAtiva(aba); setMenuAberto(false); window.scrollTo({ top: 0 }); };
  const [minutaAberta, setMinutaAberta] = useState<TipoMinuta | null>(null);
  const [temaEscuro, setTemaEscuro] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [cadastrosAguardando, setCadastrosAguardando] = useState<CadastroAgenda[]>([]);

  useEffect(() => {
    let mounted = true;
    void carregarAgenda().then(({ cadastros }) => {
      if (mounted) setCadastrosAguardando(cadastros);
    });
    const unsubscribe = assinarAgenda(() => {
      void carregarAgenda().then(({ cadastros }) => {
        if (mounted) setCadastrosAguardando(cadastros);
      });
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const cadastrarNaAgenda = (formulario: string, descricao: string, cliente: string, usaSala = true) => {
    if (!canEditWorkspace()) {
      window.alert('Seu perfil é somente para consulta: não é possível cadastrar na agenda.');
      return;
    }
    const cadastro: CadastroAgenda = {
      id: Date.now(), remoteId: crypto.randomUUID(), formulario, descricao, cliente: cliente.trim() || 'Cliente não informado', usaSala,
    };
    setCadastrosAguardando((atuais) => [
      ...atuais,
      cadastro,
    ]);
    void salvarCadastro(cadastro);
    setAbaAtiva('agenda');
    setMenuAberto(false);
  };

  const removerCadastroAgendado = (id: number) => {
    setCadastrosAguardando((atuais) => atuais.filter((item) => item.id !== id));
  };

  const adicionarCadastroAguardando = (cadastro: CadastroAgenda) => {
    const cadastroComId = cadastro.remoteId ? cadastro : { ...cadastro, remoteId: crypto.randomUUID() };
    setCadastrosAguardando((atuais) => [...atuais, cadastroComId]);
    void salvarCadastro(cadastroComId);
  };
  const [formulario, setFormulario] = useState<FormularioProcuracao>(() => loadWorkspaceState('formulario-procuracao', formularioProcuracaoVazio()));

  const [formularioApostilamento, setFormularioApostilamento] = useState<FormularioApostilamento>(() => loadWorkspaceState('formulario-apostilamento', formularioApostilamentoVazio()));

  const [formularioCertidao, setFormularioCertidao] = useState<FormularioCertidao>(() => loadWorkspaceState('formulario-certidao', formularioCertidaoVazio()));

  const adicionarPessoa = (tipo: 'outorgantes' | 'outorgados') => {
    const novaPessoa: Pessoa = {
      id: Date.now().toString(),
      nome: '',
      documento: '',
      tipoDocumento: 'CPF',
      nacionalidade: 'Brasileira',
      rg: '',
      dataExpedicaoRg: '',
      orgaoExpedidor: '',
      endereco: '',
      profissao: '',
      estadoCivil: '',
      ...(tipo === 'outorgantes' && { telefone: '' })
    };

    setFormulario(prev => ({
      ...prev,
      [tipo]: [...prev[tipo], novaPessoa]
    }));
  };

  const adicionarRequerente = () => {
    const novoRequerente: Requerente = {
      id: Date.now().toString(),
      nome: '',
      cpf: '',
      rg: '',
dataExpedicaoRg: '',
orgaoExpedidor: '',
      endereco: '',
      telefone: '',
      profissao: '',
      estadoCivil: '',
      email: '',
      dataNascimento: '',
      filiacao: ''
    };
  
    setFormularioApostilamento(prev => ({
      ...prev,
      requerentes: [...prev.requerentes, novoRequerente]
    }));
  };

  const removerRequerente = (id: string) => {
    setFormularioApostilamento(prev => ({
      ...prev,
      requerentes: prev.requerentes.filter(requerente => requerente.id !== id)
    }));
  };

  const atualizarRequerente = (id: string, campo: string, valor: string) => {
    let valorFormatado = valor;
    
    if (campo === 'cpf') {
      valorFormatado = formatarCPF(valor);
    }
    
    if (campo === 'telefone') {
      valorFormatado = formatarTelefone(valor);
    }
    
    setFormularioApostilamento(prev => ({
      ...prev,
      requerentes: prev.requerentes.map(requerente => 
        requerente.id === id ? { ...requerente, [campo]: valorFormatado } : requerente
      )
    }));
  };

  const atualizarCampoApostilamento = (campo: string, valor: string) => {
    setFormularioApostilamento(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const removerPessoa = (tipo: 'outorgantes' | 'outorgados', id: string) => {
    setFormulario(prev => ({
      ...prev,
      [tipo]: prev[tipo].filter(pessoa => pessoa.id !== id)
    }));
  };

  const atualizarPessoa = (tipo: 'outorgantes' | 'outorgados', id: string, campo: string, valor: string) => {
    let valorFormatado = valor;
    
    if (campo === 'documento') {
      const pessoa = formulario[tipo].find(p => p.id === id);
      if (pessoa) {
        valorFormatado = formatarDocumento(valor, pessoa.tipoDocumento);
      }
    }
    
    if (campo === 'telefone') {
      valorFormatado = formatarTelefone(valor);
    }
    
    setFormulario(prev => ({
      ...prev,
      [tipo]: prev[tipo].map(pessoa => 
        pessoa.id === id ? { ...pessoa, [campo]: valorFormatado } : pessoa
      )
    }));
  };

  const adicionarRequerenteCertidao = () => {
    const novoRequerente: Requerente = {
      id: Date.now().toString(),
      nome: '',
      cpf: '',
      rg: '',
dataExpedicaoRg: '',
orgaoExpedidor: '',
      endereco: '',
      telefone: '',
      profissao: '',
      estadoCivil: '',
      email: '',
      dataNascimento: '',
      filiacao: ''
    };
  
    setFormularioCertidao(prev => ({
      ...prev,
      requerentes: [...prev.requerentes, novoRequerente]
    }));
  };
  
  const removerRequerenteCertidao = (id: string) => {
    setFormularioCertidao(prev => ({
      ...prev,
      requerentes: prev.requerentes.filter(requerente => requerente.id !== id)
    }));
  };
  
  const atualizarRequerenteCertidao = (id: string, campo: string, valor: string) => {
    let valorFormatado = valor;
    
    if (campo === 'cpf') {
      valorFormatado = formatarCPF(valor);
    }
    
    if (campo === 'telefone') {
      valorFormatado = formatarTelefone(valor);
    }
    
    setFormularioCertidao(prev => ({
      ...prev,
      requerentes: prev.requerentes.map(requerente => 
        requerente.id === id ? { ...requerente, [campo]: valorFormatado } : requerente
      )
    }));
  };
  
  const atualizarCampoCertidao = (campo: string, valor: string) => {
    setFormularioCertidao(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // --- União Estável ---

  const [formularioUniaoEstavel, setFormularioUniaoEstavel] = useState<FormularioUniaoEstavel>(() => loadWorkspaceState('formulario-uniao-estavel', formularioUniaoEstavelVazio()));

  const adicionarCompanheiro = () => {
    const novoCompanheiro: Pessoa = {
      id: Date.now().toString(),
      nome: '',
      documento: '',
      tipoDocumento: 'CPF',
      nacionalidade: 'Brasileira',
      rg: '',
      dataExpedicaoRg: '',
      orgaoExpedidor: '',
      endereco: '',
      telefone: '',
      profissao: '',
      estadoCivil: '',
    };
    setFormularioUniaoEstavel(prev => ({ ...prev, companheiros: [...prev.companheiros, novoCompanheiro] }));
  };

  const removerCompanheiro = (id: string) => {
    setFormularioUniaoEstavel(prev => ({ ...prev, companheiros: prev.companheiros.filter(c => c.id !== id) }));
  };

  const atualizarCompanheiro = (id: string, campo: string, valor: string) => {
    let valorFormatado = valor;
    if (campo === 'documento') valorFormatado = formatarDocumento(valor, 'CPF');
    if (campo === 'telefone') valorFormatado = formatarTelefone(valor);
    setFormularioUniaoEstavel(prev => ({
      ...prev,
      companheiros: prev.companheiros.map(c => c.id === id ? { ...c, [campo]: valorFormatado } : c)
    }));
  };

  const adicionarTestemunhaUniao = () => {
    const novaTestemunha: Testemunha = {
      id: Date.now().toString(), nome: '', documento: '', tipoDocumento: 'CPF', nacionalidade: 'Brasileira',
      rg: '', dataExpedicaoRg: '', orgaoExpedidor: '', endereco: '', telefone: '', profissao: '', estadoCivil: '',
    };
    setFormularioUniaoEstavel(prev => ({ ...prev, testemunhas: [...prev.testemunhas, novaTestemunha] }));
  };

  const removerTestemunhaUniao = (id: string) => {
    setFormularioUniaoEstavel(prev => ({ ...prev, testemunhas: prev.testemunhas.filter(t => t.id !== id) }));
  };

  const atualizarTestemunhaUniao = (id: string, campo: string, valor: string) => {
    let valorFormatado = valor;
    if (campo === 'documento') valorFormatado = formatarDocumento(valor, 'CPF');
    if (campo === 'telefone') valorFormatado = formatarTelefone(valor);
    setFormularioUniaoEstavel(prev => ({
      ...prev,
      testemunhas: prev.testemunhas.map(t => t.id === id ? { ...t, [campo]: valorFormatado } : t)
    }));
  };

  const atualizarCampoUniaoEstavel = (campo: string, valor: string) => {
    setFormularioUniaoEstavel(prev => ({ ...prev, [campo]: valor }));
  };

  // --- Pacto Antenupcial ---

  const [formularioPactoAntenupcial, setFormularioPactoAntenupcial] = useState<FormularioPactoAntenupcial>(() => loadWorkspaceState('formulario-pacto-antenupcial', formularioPactoAntenupcialVazio()));

  const atendimentoProcuracao = useAtendimento('procuracao', formulario, setFormulario, formularioProcuracaoVazio, clienteProcuracao);
  const atendimentoApostilamento = useAtendimento('apostilamento', formularioApostilamento, setFormularioApostilamento, formularioApostilamentoVazio, clienteRequerente);
  const atendimentoCertidao = useAtendimento('certidao', formularioCertidao, setFormularioCertidao, formularioCertidaoVazio, clienteRequerente);
  const atendimentoUniaoEstavel = useAtendimento('uniao-estavel', formularioUniaoEstavel, setFormularioUniaoEstavel, formularioUniaoEstavelVazio, clienteUniaoEstavel);
  const atendimentoPacto = useAtendimento('pacto-antenupcial', formularioPactoAntenupcial, setFormularioPactoAntenupcial, formularioPactoAntenupcialVazio, clientePacto);

  const adicionarNubente = () => {
    const novoNubente: Pessoa = {
      id: Date.now().toString(),
      nome: '',
      documento: '',
      tipoDocumento: 'CPF',
      nacionalidade: 'Brasileira',
      rg: '',
      dataExpedicaoRg: '',
      orgaoExpedidor: '',
      endereco: '',
      telefone: '',
      profissao: '',
      estadoCivil: '',
    };
    setFormularioPactoAntenupcial(prev => ({ ...prev, nubentes: [...prev.nubentes, novoNubente] }));
  };

  const removerNubente = (id: string) => {
    setFormularioPactoAntenupcial(prev => ({ ...prev, nubentes: prev.nubentes.filter(n => n.id !== id) }));
  };

  const atualizarNubente = (id: string, campo: string, valor: string) => {
    let valorFormatado = valor;
    if (campo === 'documento') valorFormatado = formatarDocumento(valor, 'CPF');
    if (campo === 'telefone') valorFormatado = formatarTelefone(valor);
    setFormularioPactoAntenupcial(prev => ({
      ...prev,
      nubentes: prev.nubentes.map(n => n.id === id ? { ...n, [campo]: valorFormatado } : n)
    }));
  };

  const adicionarTestemunhaPacto = () => {
    const novaTestemunha: Testemunha = {
      id: Date.now().toString(), nome: '', documento: '', tipoDocumento: 'CPF', nacionalidade: 'Brasileira',
      rg: '', dataExpedicaoRg: '', orgaoExpedidor: '', endereco: '', telefone: '', profissao: '', estadoCivil: '',
    };
    setFormularioPactoAntenupcial(prev => ({ ...prev, testemunhas: [...prev.testemunhas, novaTestemunha] }));
  };

  const removerTestemunhaPacto = (id: string) => {
    setFormularioPactoAntenupcial(prev => ({ ...prev, testemunhas: prev.testemunhas.filter(t => t.id !== id) }));
  };

  const atualizarTestemunhaPacto = (id: string, campo: string, valor: string) => {
    let valorFormatado = valor;
    if (campo === 'documento') valorFormatado = formatarDocumento(valor, 'CPF');
    if (campo === 'telefone') valorFormatado = formatarTelefone(valor);
    setFormularioPactoAntenupcial(prev => ({
      ...prev,
      testemunhas: prev.testemunhas.map(t => t.id === id ? { ...t, [campo]: valorFormatado } : t)
    }));
  };

  const atualizarCampoPacto = (campo: string, valor: string) => {
    setFormularioPactoAntenupcial(prev => ({ ...prev, [campo]: valor }));
  };

  const togglePoder = (poder: string) => {
    setFormulario(prev => {
      const novosPoderes = prev.poderesOutorgados.includes(poder)
        ? prev.poderesOutorgados.filter(p => p !== poder)
        : [...prev.poderesOutorgados, poder];
  
      const novoFormulario = { ...prev, poderesOutorgados: novosPoderes };
  
      // Limpar dados quando poder é removido
      if (!novosPoderes.includes('BANCÁRIA')) {
        novoFormulario.dadosBancarios = [];
      } else if (prev.dadosBancarios.length === 0 && novosPoderes.includes('BANCÁRIA')) {
        // Adicionar primeiro banco quando BANCÁRIA é selecionada
        novoFormulario.dadosBancarios = [{
          id: Date.now().toString(),
          banco: '',
          agencia: '',
          conta: '',
          numeroBeneficio: ''
        }];
      }
  
      if (!novosPoderes.includes('COMPRA OU VENDA DE IMÓVEL')) {
        novoFormulario.dadosImovel = [];
      } else if (prev.dadosImovel.length === 0 && novosPoderes.includes('COMPRA OU VENDA DE IMÓVEL')) {
        novoFormulario.dadosImovel = [{
          id: Date.now().toString(),
          tipoTransacao: 'compra',
          valorTransacao: '',
          tipoVenda: 'total',
          formaPagamento: 'vista',
          dadosImovel: ''
        }];
      }
  
      if (!novosPoderes.includes('ADMINISTRAÇÃO DE IMÓVEL')) {
        novoFormulario.dadosAdministracaoImovel = [];
      } else if (prev.dadosAdministracaoImovel.length === 0 && novosPoderes.includes('ADMINISTRAÇÃO DE IMÓVEL')) {
        novoFormulario.dadosAdministracaoImovel = [{
          id: Date.now().toString(),
          dadosImovel: ''
        }];
      }
  
      if (!novosPoderes.includes('OUTROS PODERES ESPECIFICOS')) {
        novoFormulario.outros = [];
      } else if (prev.outros.length === 0 && novosPoderes.includes('OUTROS PODERES ESPECIFICOS')) {
        novoFormulario.outros = [{
          id: Date.now().toString(),
          outros: ''
        }];
      }
  
      if (!novosPoderes.includes('SEGURADORA/REMOÇÃO DO PÁTIO')) {
        novoFormulario.dadosVeiculo = [];
      } else if (prev.dadosVeiculo.length === 0 && novosPoderes.includes('SEGURADORA/REMOÇÃO DO PÁTIO')) {
        novoFormulario.dadosVeiculo = [{
          id: Date.now().toString(),
          marcaModelo: '',
          placa: '',
          renavam: '',
          chassi: '',
          especieTipo: '',
          anoFabricacao: '',
          anoModelo: '',
          enderecoNomePatio: ''
        }];
      }
  
      return novoFormulario;
    });
  };

  const adicionarDadosBancarios = () => {
    const novoDado: DadosBancarios = {
      id: Date.now().toString(),
      banco: '',
      agencia: '',
      conta: '',
      numeroBeneficio: ''
    };
    setFormulario(prev => ({
      ...prev,
      dadosBancarios: [...prev.dadosBancarios, novoDado]
    }));
  };

  const removerDadosBancarios = (id: string) => {
    setFormulario(prev => ({
      ...prev,
      dadosBancarios: prev.dadosBancarios.filter(dado => dado.id !== id)
    }));
  };

  const atualizarDadosBancarios = (id: string, campo: keyof DadosBancarios, valor: string) => {
    setFormulario(prev => ({
      ...prev,
      dadosBancarios: prev.dadosBancarios.map(dado =>
        dado.id === id ? { ...dado, [campo]: valor } : dado
      )
    }));
  };

  const adicionarDadosImovel = () => {
    const novoDado: DadosImovel = {
      id: Date.now().toString(),
      tipoTransacao: 'compra',
      valorTransacao: '',
      tipoVenda: 'total',
      formaPagamento: 'vista',
      dadosImovel: ''
    };
    setFormulario(prev => ({
      ...prev,
      dadosImovel: [...prev.dadosImovel, novoDado]
    }));
  };

  const removerDadosImovel = (id: string) => {
    setFormulario(prev => ({
      ...prev,
      dadosImovel: prev.dadosImovel.filter(dado => dado.id !== id)
    }));
  };

  const atualizarDadosImovel = (id: string, campo: keyof DadosImovel, valor: string) => {
    const valorFormatado = campo === 'valorTransacao' ? formatarMoeda(valor) : valor;
    setFormulario(prev => ({
      ...prev,
      dadosImovel: prev.dadosImovel.map(dado =>
        dado.id === id ? { ...dado, [campo]: valorFormatado } : dado
      )
    }));
  };

  const adicionarDadosAdministracaoImovel = () => {
    const novoDado: DadosAdministracaoImovel = {
      id: Date.now().toString(),
      dadosImovel: ''
    };
    setFormulario(prev => ({
      ...prev,
      dadosAdministracaoImovel: [...prev.dadosAdministracaoImovel, novoDado]
    }));
  };

  const removerDadosAdministracaoImovel = (id: string) => {
    setFormulario(prev => ({
      ...prev,
      dadosAdministracaoImovel: prev.dadosAdministracaoImovel.filter(dado => dado.id !== id)
    }));
  };

  const atualizarDadosAdministracaoImovel = (id: string, campo: keyof DadosAdministracaoImovel, valor: string) => {
    setFormulario(prev => ({
      ...prev,
      dadosAdministracaoImovel: prev.dadosAdministracaoImovel.map(dado =>
        dado.id === id ? { ...dado, [campo]: valor } : dado
      )
    }));
  };

  const adicionarDadosVeiculo = () => {
    const novoDado: DadosVeiculo = {
      id: Date.now().toString(),
      marcaModelo: '',
      placa: '',
      renavam: '',
      chassi: '',
      especieTipo: '',
      anoFabricacao: '',
      anoModelo: '',
      enderecoNomePatio: ''
    };
    setFormulario(prev => ({
      ...prev,
      dadosVeiculo: [...prev.dadosVeiculo, novoDado]
    }));
  };

  const removerDadosVeiculo = (id: string) => {
    setFormulario(prev => ({
      ...prev,
      dadosVeiculo: prev.dadosVeiculo.filter(dado => dado.id !== id)
    }));
  };

  // Placa (antiga ABC-1234 ou Mercosul ABC1D23) e chassi em maiúsculas; RENAVAM e anos só com números.
  const mascarasVeiculo: Partial<Record<keyof DadosVeiculo, (valor: string) => string>> = {
    placa: (v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 8),
    chassi: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 17),
    renavam: (v) => somenteDigitos(v, 11),
    anoFabricacao: (v) => somenteDigitos(v, 4),
    anoModelo: (v) => somenteDigitos(v, 4),
  };

  const atualizarDadosVeiculo = (id: string, campo: keyof DadosVeiculo, valor: string) => {
    const valorFormatado = mascarasVeiculo[campo]?.(valor) ?? valor;
    setFormulario(prev => ({
      ...prev,
      dadosVeiculo: prev.dadosVeiculo.map(dado =>
        dado.id === id ? { ...dado, [campo]: valorFormatado } : dado
      )
    }));
  };

  const adicionarOutrosPoderes = () => {
    const novoDado: OutrosPoderes = {
      id: Date.now().toString(),
      outros: ''
    };
    setFormulario(prev => ({
      ...prev,
      outros: [...prev.outros, novoDado]
    }));
  };
  
  const removerOutrosPoderes = (id: string) => {
    setFormulario(prev => ({
      ...prev,
      outros: prev.outros.filter(dado => dado.id !== id)
    }));
  };
  
  const atualizarOutrosPoderes = (id: string, campo: keyof OutrosPoderes, valor: string) => {
    setFormulario(prev => ({
      ...prev,
      outros: prev.outros.map(dado =>
        dado.id === id ? { ...dado, [campo]: valor } : dado
      )
    }));
  };

  const adicionarTestemunha = () => {
    const novaTestemunha: Testemunha = {
      id: Date.now().toString(),
      nome: '',
      documento: '',
      tipoDocumento: 'CPF',
      nacionalidade: 'Brasileira',
      rg: '',
dataExpedicaoRg: '',
orgaoExpedidor: '',
      endereco: '',
      telefone: '',
      profissao: '',
      estadoCivil: ''
    };
  
    setFormulario(prev => ({
      ...prev,
      testemunhas: [...prev.testemunhas, novaTestemunha]
    }));
  };
  
  const removerTestemunha = (id: string) => {
    setFormulario(prev => ({
      ...prev,
      testemunhas: prev.testemunhas.filter(testemunha => testemunha.id !== id)
    }));
  };
  
  const atualizarTestemunha = (id: string, campo: string, valor: string) => {
    let valorFormatado = valor;
    
    if (campo === 'documento') {
      const testemunha = formulario.testemunhas.find(t => t.id === id);
      if (testemunha) {
        valorFormatado = formatarDocumento(valor, testemunha.tipoDocumento);
      }
    }
    
    if (campo === 'telefone') {
      valorFormatado = formatarTelefone(valor);
    }
    
    setFormulario(prev => ({
      ...prev,
      testemunhas: prev.testemunhas.map(testemunha => 
        testemunha.id === id ? { ...testemunha, [campo]: valorFormatado } : testemunha
      )
    }));
  };

  const imprimirFormulario = () => {
    window.print();
  };

  const testamento = formularioCertidao.tipoCertidao === 'testamento';

  // Datas que não podem estar no futuro (documentos, fatos passados) ou no passado (entregas, casamento).
  const limiteExpedicao = hoje('A data de expedição não pode ser futura.');
  const limiteNascimento = hoje('A data de nascimento não pode ser futura.');
  const limiteDataAto = hoje('A data do ato não pode ser futura.');
  const limiteInicioUniao = hoje('O início da união não pode ser uma data futura.');
  const limiteEntrega = hoje('A data de entrega não pode estar no passado.');
  const limiteCasamento = hoje('A data prevista do casamento não pode estar no passado.');
  // A expedição do RG não pode ser anterior ao nascimento, quando ele foi informado.
  const expedicaoAposNascimento = (dataNascimento: string) => (dataNascimento
    ? { data: dataNascimento, mensagem: 'A expedição do RG não pode ser anterior à data de nascimento.' }
    : undefined);

  const renderizarCamposPessoa = (
    pessoa: Pessoa,
    index: number,
    titulo: string,
    onChange: (campo: string, valor: string) => void,
    podeRemover: boolean,
    onRemover: () => void,
    mostrarTelefone: boolean = true,
    permitirCnpj: boolean = true,
    perguntarUniaoEstavel: boolean = true
  ) => {
    // Pessoa jurídica não tem RG, profissão, nacionalidade nem estado civil.
    const juridica = permitirCnpj && pessoa.tipoDocumento === 'CNPJ';
    return (
    <div key={pessoa.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:border print:border-gray-400 print:bg-white">
      <div className="flex items-center justify-between mb-4 print:mb-2">
      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600 print:hidden" />
          {titulo} {index + 1}
        </h4>
        {podeRemover && (
          <button
            onClick={onRemover}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors print:hidden"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-3 print:gap-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">{juridica ? 'Razão Social' : 'Nome Completo'}</label>
          <input
            type="text"
            value={pessoa.nome}
            onChange={(e) => onChange('nome', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder={juridica ? 'Razão social da empresa' : 'Digite o nome completo'}
          />
        </div>

        {permitirCnpj && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Tipo de Documento</label>
          <select
            value={pessoa.tipoDocumento}
            onChange={(e) => {
              // O número digitado no outro formato não serve: CPF tem 11 dígitos e CNPJ, 14.
              onChange('tipoDocumento', e.target.value);
              onChange('documento', '');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          >
            <option value="CPF">CPF (pessoa física)</option>
            <option value="CNPJ">CNPJ (pessoa jurídica)</option>
          </select>
        </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">
            {juridica ? 'CNPJ' : 'CPF'}
          </label>
          <CampoDocumento
            value={pessoa.documento}
            tipo={juridica ? 'CNPJ' : 'CPF'}
            onChange={(valor) => onChange('documento', valor)}
            className={classeCampo}
          />
        </div>
        {!juridica && <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">RG</label>
          <input
            type="text"
            value={pessoa.rg}
            onChange={(e) => onChange('rg', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="00.000.000-0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Expedição RG</label>
          <CampoData
            value={pessoa.dataExpedicaoRg}
            onChange={(value) => onChange('dataExpedicaoRg', value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            maximo={limiteExpedicao}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Órgão Expedidor</label>
          <input
            type="text"
            value={pessoa.orgaoExpedidor}
            onChange={(e) => onChange('orgaoExpedidor', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="Ex: SSP/RJ, DETRAN/RJ"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Profissão</label>
          <input
            type="text"
            value={pessoa.profissao}
            onChange={(e) => onChange('profissao', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="Digite a profissão"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nacionalidade</label>
          <input
            type="text"
            value={pessoa.nacionalidade}
            onChange={(e) => onChange('nacionalidade', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="Ex: Brasileira"
          />
        </div>

        <CampoEstadoCivil
          estadoCivil={pessoa.estadoCivil}
          uniaoEstavel={pessoa.uniaoEstavel}
          regimeUniao={pessoa.regimeUniao}
          onChange={onChange}
          className={classeCampo}
          labelClassName={classeRotulo}
          perguntarUniaoEstavel={perguntarUniaoEstavel}
        />
        </>}

        {mostrarTelefone && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4 print:hidden" />
              Telefone
            </label>
            <input
              type="tel"
              value={pessoa.telefone || ''}
              onChange={(e) => onChange('telefone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
              placeholder="(00) 00000-0000"
            />
          </div>
        )}

        <div className="md:col-span-2 print:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 print:hidden" />
            {juridica ? 'Endereço da Sede' : 'Endereço Completo'}
          </label>
          <textarea
            value={pessoa.endereco}
            onChange={(e) => onChange('endereco', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:rows-2"
            placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
          />
        </div>

        {juridica && <>
          <h5 className="md:col-span-2 print:col-span-2 text-sm font-semibold text-gray-800 mt-2">Representante legal (quem assina pela empresa)</h5>
          <div>
            <label className={classeRotulo}>Nome do Representante</label>
            <input
              type="text"
              value={pessoa.representanteNome ?? ''}
              onChange={(e) => onChange('representanteNome', e.target.value)}
              className={classeCampo}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className={classeRotulo}>CPF do Representante</label>
            <CampoDocumento
              value={pessoa.representanteCpf ?? ''}
              tipo="CPF"
              onChange={(valor) => onChange('representanteCpf', valor)}
              className={classeCampo}
            />
          </div>
          <div className="md:col-span-2 print:col-span-2">
            <label className={classeRotulo}>Cargo ou Qualidade</label>
            <input
              type="text"
              value={pessoa.representanteCargo ?? ''}
              onChange={(e) => onChange('representanteCargo', e.target.value)}
              className={classeCampo}
              placeholder="Ex: sócio-administrador, diretor, procurador"
            />
          </div>
        </>}
      </div>
    </div>
    );
  };

  const renderizarCamposRequerente = (requerente: Requerente, index: number) => (
  <div key={requerente.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:border print:border-gray-400 print:bg-white">
    <div className="flex items-center justify-between mb-4 print:mb-2">
      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600 print:hidden" />
        Requerente {index + 1}
      </h4>
      {formularioApostilamento.requerentes.length > 1 && (
        <button
          onClick={() => removerRequerente(requerente.id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors print:hidden"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nome Completo</label>
        <input
          type="text"
          value={requerente.nome}
          onChange={(e) => atualizarRequerente(requerente.id, 'nome', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Digite o nome completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">CPF</label>
        <CampoDocumento value={requerente.cpf} tipo="CPF" onChange={(valor) => atualizarRequerente(requerente.id, 'cpf', valor)} className={classeCampo} />
      </div>
<div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">RG</label>
          <input
            type="text"
            value={requerente.rg}
            onChange={(e) => atualizarRequerente(requerente.id, 'rg', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="00.000.000-0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Expedição RG</label>
          <CampoData
            value={requerente.dataExpedicaoRg}
            onChange={(value) => atualizarRequerente(requerente.id, 'dataExpedicaoRg', value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            maximo={limiteExpedicao}
            minimo={expedicaoAposNascimento(requerente.dataNascimento)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Órgão Expedidor</label>
          <input
            type="text"
            value={requerente.orgaoExpedidor}
            onChange={(e) => atualizarRequerente(requerente.id, 'orgaoExpedidor', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="Ex: SSP/RJ, DETRAN/RJ"
          />
        </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Profissão</label>
        <input
          type="text"
          value={requerente.profissao}
          onChange={(e) => atualizarRequerente(requerente.id, 'profissao', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Digite a profissão"
        />
      </div>

      <CampoEstadoCivil estadoCivil={requerente.estadoCivil} uniaoEstavel={requerente.uniaoEstavel} regimeUniao={requerente.regimeUniao} onChange={(campo, valor) => atualizarRequerente(requerente.id, campo, valor)} className={classeCampo} labelClassName={classeRotulo} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4 print:hidden" />
          Telefone
        </label>
        <input
          type="text"
          value={requerente.telefone}
          onChange={(e) => atualizarRequerente(requerente.id, 'telefone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="(00) 00000-0000"
          maxLength={15}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Email</label>
        <input
          type="email"
          value={requerente.email}
          onChange={(e) => atualizarRequerente(requerente.id, 'email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="email@exemplo.com"
        />
      </div>

      <div className="md:col-span-1 print:col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Nascimento</label>
          <CampoData
            value={requerente.dataNascimento}
            onChange={(value) => atualizarRequerente(requerente.id, 'dataNascimento', value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            maximo={limiteNascimento}
          />
      </div>

      <div className="md:col-span-2 print:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Filiação</label>
        <input
          type="text"
          value={requerente.filiacao}
          onChange={(e) => atualizarRequerente(requerente.id, 'filiacao', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Nome dos pais (ex: João Silva e Maria Silva)"
        />
      </div>

      <div className="md:col-span-2 print:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 print:hidden" />
          Endereço Completo
        </label>
        <textarea
          value={requerente.endereco}
          onChange={(e) => atualizarRequerente(requerente.id, 'endereco', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:rows-2"
          placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
        />
      </div>
    </div>
  </div>
);
const renderizarCamposRequerenteCertidao = (requerente: Requerente, index: number) => (
  <div key={requerente.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:border print:border-gray-400 print:bg-white">
    <div className="flex items-center justify-between mb-4 print:mb-2">
      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600 print:hidden" />
        Requerente {index + 1}
      </h4>
      {formularioCertidao.requerentes.length > 1 && (
        <button
          onClick={() => removerRequerenteCertidao(requerente.id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors print:hidden"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nome Completo</label>
        <input
          type="text"
          value={requerente.nome}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'nome', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Digite o nome completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">CPF</label>
        <CampoDocumento value={requerente.cpf} tipo="CPF" onChange={(valor) => atualizarRequerenteCertidao(requerente.id, 'cpf', valor)} className={classeCampo} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">RG</label>
        <input
          type="text"
          value={requerente.rg}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'rg', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="00.000.000-0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Expedição RG</label>
        <CampoData
          value={requerente.dataExpedicaoRg}
          onChange={(value) => atualizarRequerenteCertidao(requerente.id, 'dataExpedicaoRg', value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            maximo={limiteExpedicao}
            minimo={expedicaoAposNascimento(requerente.dataNascimento)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Órgão Expedidor</label>
        <input
          type="text"
          value={requerente.orgaoExpedidor}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'orgaoExpedidor', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Ex: SSP/RJ, DETRAN/RJ"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Profissão</label>
        <input
          type="text"
          value={requerente.profissao}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'profissao', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Digite a profissão"
        />
      </div>

      <CampoEstadoCivil estadoCivil={requerente.estadoCivil} uniaoEstavel={requerente.uniaoEstavel} regimeUniao={requerente.regimeUniao} onChange={(campo, valor) => atualizarRequerenteCertidao(requerente.id, campo, valor)} className={classeCampo} labelClassName={classeRotulo} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4 print:hidden" />
          Telefone
        </label>
        <input
          type="text"
          value={requerente.telefone}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'telefone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="(00) 00000-0000"
          maxLength={15}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Email</label>
        <input
          type="email"
          value={requerente.email}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="email@exemplo.com"
        />
      </div>

      <div className="md:col-span-1 print:col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Nascimento</label>
        <CampoData
          value={requerente.dataNascimento}
          onChange={(value) => atualizarRequerenteCertidao(requerente.id, 'dataNascimento', value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            maximo={limiteNascimento}
        />
      </div>

      <div className="md:col-span-2 print:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Filiação</label>
        <input
          type="text"
          value={requerente.filiacao}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'filiacao', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Nome dos pais (ex: João Silva e Maria Silva)"
        />
      </div>

      <div className="md:col-span-2 print:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 print:hidden" />
          Endereço Completo
        </label>
        <textarea
          value={requerente.endereco}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'endereco', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:rows-2"
          placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
        />
      </div>
    </div>
  </div>
);

const renderizarCamposTestemunha = (
  testemunha: Testemunha,
  index: number,
  onChange: (campo: string, valor: string) => void,
  onRemover: () => void
) => (
  <div key={testemunha.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:border print:border-gray-400 print:bg-white">
    <div className="flex items-center justify-between mb-4 print:mb-2">
      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <User className="w-5 h-5 text-purple-600 print:hidden" />
        Testemunha {index + 1}
      </h4>
      <button
        onClick={onRemover}
        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors print:hidden"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nome Completo</label>
        <input
          type="text"
          value={testemunha.nome}
          onChange={(e) => onChange('nome', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Digite o nome completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">CPF</label>
        <CampoDocumento value={testemunha.documento} tipo="CPF" onChange={(valor) => onChange('documento', valor)} className={classeCampo} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">RG</label>
        <input
          type="text"
          value={testemunha.rg}
          onChange={(e) => onChange('rg', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="00.000.000-0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Expedição RG</label>
        <CampoData
          value={testemunha.dataExpedicaoRg}
          onChange={(value) => onChange('dataExpedicaoRg', value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          maximo={limiteExpedicao}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Órgão Expedidor</label>
        <input
          type="text"
          value={testemunha.orgaoExpedidor}
          onChange={(e) => onChange('orgaoExpedidor', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Ex: SSP/RJ, DETRAN/RJ"
        />
      </div>
 
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Profissão</label>
        <input
          type="text"
          value={testemunha.profissao}
          onChange={(e) => onChange('profissao', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Digite a profissão"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nacionalidade</label>
        <input
          type="text"
          value={testemunha.nacionalidade}
          onChange={(e) => onChange('nacionalidade', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Ex: Brasileira"
        />
      </div>

      <CampoEstadoCivil estadoCivil={testemunha.estadoCivil} uniaoEstavel={testemunha.uniaoEstavel} regimeUniao={testemunha.regimeUniao} onChange={onChange} className={classeCampo} labelClassName={classeRotulo} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4 print:hidden" />
          Telefone
        </label>
        <input
          type="text"
          value={testemunha.telefone}
          onChange={(e) => onChange('telefone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="(00) 00000-0000"
          maxLength={15}
        />
      </div>
  
      <div className="md:col-span-2 print:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 print:hidden" />
          Endereço Completo
        </label>
        <textarea
          value={testemunha.endereco}
          onChange={(e) => onChange('endereco', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:rows-2"
          placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
        />
      </div>
    </div>
  </div>
);

  if (minutaAberta) {
    return (
      <MinutaModal
        tipo={minutaAberta}
        formulario={formulario}
        formularioApostilamento={formularioApostilamento}
        formularioCertidao={formularioCertidao}
        formularioUniaoEstavel={formularioUniaoEstavel}
        formularioPactoAntenupcial={formularioPactoAntenupcial}
        onVoltar={() => setMinutaAberta(null)}
      />
    );
  }

  return (
    <div className={temaEscuro ? 'app-shell dark min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 print:bg-white' : 'app-shell min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 print:bg-white'}>
      <button
        type="button"
        className="dashboard-menu-button print:hidden"
        onClick={() => setMenuAberto((aberto) => !aberto)}
        aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuAberto}
      >
        {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {menuAberto && <button type="button" className="dashboard-overlay print:hidden" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" />}

      <aside className={`dashboard-sidebar print:hidden ${menuAberto ? 'is-open' : ''}`}>
        <div className="dashboard-brand">
          <FileText className="w-7 h-7" />
          <div>
            <span>Cartório OS</span>
            <strong>Formulários</strong>
          </div>
        </div>
        <div className="dashboard-workspace" title={profile.userEmail}>
          <span className="dashboard-workspace-label">Workspace ativo</span>
          <strong>{profile.workspaceName}</strong>
          <span>{profile.userName} · {profile.plan === 'trial' ? 'Avaliação' : 'Profissional'}</span>
          <button type="button" className="dashboard-signout" onClick={() => { void supabase?.auth.signOut(); }}><LogOut /> Sair</button>
        </div>
        <p className="dashboard-menu-title">Navegação</p>
        <nav className="dashboard-nav" aria-label="Formulários">
          {itensMenu.filter(({ id }) => podeAcessar(id)).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => abrirAba(id)}
              className={`dashboard-nav-item ${abaVisivel === id ? 'is-active' : ''}`}
              aria-current={abaVisivel === id ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="dashboard-main">
      <div className="container mx-auto px-4 py-8 max-w-6xl print:px-2 print:py-4">
        <div className="flex justify-end mb-4 print:hidden">
          <button
            type="button"
            onClick={() => setTemaEscuro((temaAtual) => !temaAtual)}
            className="theme-toggle inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            aria-label={temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
          >
            {temaEscuro ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {temaEscuro ? 'Tema claro' : 'Tema escuro'}
          </button>
        </div>
        {!['inicio', ...abasSuperAdmin].includes(abaVisivel) && <header className="app-header text-center mb-8 print:mb-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3 print:text-2xl print:mb-1">
  <FileText className="w-10 h-10 text-blue-600 print:hidden" />
  Cartório OS · Plataforma de Formulários
</h1>
<p className="text-gray-600 text-lg print:text-sm print:mb-2">Sistema de Geração de Formulários</p>
        </header>}

        {!['inicio', 'agenda', ...abasSuperAdmin].includes(abaVisivel) && <aside className="app-notice mb-8 px-5 py-4 print:hidden" role="note">
          <p>
            Os rascunhos ficam salvos na conta do cartório e só os usuários dele têm acesso. Evite compartilhar telas, textos copiados ou arquivos impressos que contenham dados pessoais.
          </p>
          <p>
            As minutas são modelos de apoio ao atendimento e devem ser revisadas por profissional responsável antes de sua utilização oficial. O sistema não substitui conferência jurídica, documental ou cartorária.
          </p>
        </aside>}

        {/* Área do formulário ativo */}
        <div className="app-panel bg-white rounded-lg shadow-lg mb-8 print:shadow-none print:mb-4">
          <div className="p-6 print:p-2">
            {abaVisivel === 'agenda' && <AgendaAtendimentos cadastrosAguardando={cadastrosAguardando} onCadastroAgendado={removerCadastroAgendado} onAgendamentoRemarcado={adicionarCadastroAguardando} />}
            {abaVisivel === 'inicio' && <TelaInicial onNavegar={abrirAba} cadastrosAguardando={cadastrosAguardando.length} />}
            {abaVisivel === 'super-admin' && <SuperAdminClients />}
            {abaVisivel === 'modelos-minuta' && <ModelosMinutaAdmin />}
            {abaVisivel === 'outros' && <p className="home-empty">Outros formulários estarão disponíveis em breve.</p>}

            {abaVisivel === 'procuracao' && (
              <div className="space-y-8 print:space-y-4">
                <BarraAtendimento controle={atendimentoProcuracao} cliente={clienteProcuracao(formulario)} />
                {/* Seção Outorgantes */}
                <section>
                  <div className="flex items-center justify-between mb-6 print:mb-3">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
                      <Building className="w-6 h-6 text-blue-600 print:hidden" />
                      Outorgantes
                    </h2>
                    <button
                      onClick={() => adicionarPessoa('outorgantes')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 print:hidden"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Outorgante
                    </button>
                  </div>
                  <div className="space-y-4 print:space-y-2">
                    {formulario.outorgantes.map((outorgante, index) =>
                      renderizarCamposPessoa(
                        outorgante,
                        index,
                        'Outorgante',
                        (campo, valor) => atualizarPessoa('outorgantes', outorgante.id, campo, valor),
                        formulario.outorgantes.length > 1,
                        () => removerPessoa('outorgantes', outorgante.id),
                        true
                      )
                    )}
                  </div>
                </section>

                {/* Seção Outorgados */}
                <section>
                  <div className="flex items-center justify-between mb-6 print:mb-3">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
                      <User className="w-6 h-6 text-green-600 print:hidden" />
                      Outorgados
                    </h2>
                    <button
                      onClick={() => adicionarPessoa('outorgados')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 print:hidden"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Outorgado
                    </button>
                  </div>
                  <div className="space-y-4 print:space-y-2">
                    {formulario.outorgados.map((outorgado, index) =>
                      renderizarCamposPessoa(
                        outorgado,
                        index,
                        'Outorgado',
                        (campo, valor) => atualizarPessoa('outorgados', outorgado.id, campo, valor),
                        formulario.outorgados.length > 1,
                        () => removerPessoa('outorgados', outorgado.id),
                        false
                      )
                    )}
                  </div>
                </section>
{/* Seção Testemunhas */}
<section>
  <div className="flex items-center justify-between mb-6 print:mb-3">
    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
      <User className="w-6 h-6 text-purple-600 print:hidden" />
      Testemunhas
    </h2>
    <button
      onClick={adicionarTestemunha}
      className="witness-button px-4 py-2 rounded-lg transition-colors flex items-center gap-2 print:hidden"
    >
      <Plus className="w-4 h-4" />
      Adicionar Testemunha
    </button>
  </div>
  <div className="space-y-4 print:space-y-2">
    {formulario.testemunhas.length > 0 ? (
      formulario.testemunhas.map((testemunha, index) =>
        renderizarCamposTestemunha(
          testemunha,
          index,
          (campo, valor) => atualizarTestemunha(testemunha.id, campo, valor),
          () => removerTestemunha(testemunha.id)
        )
      )
    ) : (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
        <p className="text-gray-500">Nenhuma testemunha adicionada. Clique no botão acima para adicionar.</p>
      </div>
    )}
  </div>
</section>
                {/* Seção Poderes Outorgados */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Poderes Outorgados</h2>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 print:grid-cols-2 print:gap-2 print:mb-3">
                    {PODERES_OPCOES.map((poder) => (
  <label 
    key={poder} 
    className={`flex items-center space-x-3 cursor-pointer print:space-x-2 ${
      !formulario.poderesOutorgados.includes(poder) ? 'print:hidden' : ''
    }`}
  >
    <input
      type="checkbox"
      checked={formulario.poderesOutorgados.includes(poder)}
      onChange={() => togglePoder(poder)}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 print:w-3 print:h-3"
    />
    <span className="text-sm font-medium text-gray-700 print:text-xs">{poder}</span>
  </label>
))}
                    </div>

                    {/* Campos Bancários */}
                    {formulario.poderesOutorgados.includes('BANCÁRIA') && (
                      <div className="border-t border-gray-200 pt-6 print:pt-3">
                        <div className="flex items-center justify-between mb-4 print:mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 print:text-base">
                            <CreditCard className="w-5 h-5 text-blue-600 print:hidden" />
                            Dados Bancários
                          </h3>
                          <button
                            onClick={adicionarDadosBancarios}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1 print:hidden"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar Banco
                          </button>
                        </div>
                        <div className="space-y-4 print:space-y-2">
                          {formulario.dadosBancarios.map((dadoBancario, index) => (
                            <div key={dadoBancario.id} className="bg-white p-4 rounded border border-gray-200 print:border-gray-400 print:p-2">
                              <div className="flex items-center justify-between mb-3 print:mb-1">
                                <h4 className="font-medium text-gray-700 print:text-sm">Banco {index + 1}</h4>
                                {formulario.dadosBancarios.length > 1 && (
                                  <button
                                    onClick={() => removerDadosBancarios(dadoBancario.id)}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded print:hidden"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-1">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Banco</label>
                                  <input
                                    type="text"
                                    value={dadoBancario.banco}
                                    onChange={(e) => atualizarDadosBancarios(dadoBancario.id, 'banco', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Nome do banco"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Agência</label>
                                  <input
                                    type="text"
                                    value={dadoBancario.agencia}
                                    onChange={(e) => atualizarDadosBancarios(dadoBancario.id, 'agencia', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Número da agência"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Conta</label>
                                  <input
                                    type="text"
                                    value={dadoBancario.conta}
                                    onChange={(e) => atualizarDadosBancarios(dadoBancario.id, 'conta', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Número da conta"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Nº Benefício</label>
                                  <input
                                    type="text"
                                    value={dadoBancario.numeroBeneficio}
                                    onChange={(e) => atualizarDadosBancarios(dadoBancario.id, 'numeroBeneficio', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Número do benefício"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Campos de Compra/Venda de Imóvel */}
                    {formulario.poderesOutorgados.includes('COMPRA OU VENDA DE IMÓVEL') && (
                      <div className="border-t border-gray-200 pt-6 print:pt-3">
                        <div className="flex items-center justify-between mb-4 print:mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 print:text-base">
                            <Home className="w-5 h-5 text-orange-600 print:hidden" />
                            Compra ou Venda de Imóvel
                          </h3>
                          <button
                            onClick={adicionarDadosImovel}
                            className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition-colors flex items-center gap-1 print:hidden"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar Imóvel
                          </button>
                        </div>
                        <div className="space-y-4 print:space-y-2">
                          {formulario.dadosImovel.map((dadoImovel, index) => (
                            <div key={dadoImovel.id} className="bg-white p-4 rounded border border-gray-200 print:border-gray-400 print:p-2">
                              <div className="flex items-center justify-between mb-3 print:mb-1">
                                <h4 className="font-medium text-gray-700 print:text-sm">Imóvel {index + 1}</h4>
                                {formulario.dadosImovel.length > 1 && (
                                  <button
                                    onClick={() => removerDadosImovel(dadoImovel.id)}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded print:hidden"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-1">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Tipo de Transação</label>
                                  <select
                                    value={dadoImovel.tipoTransacao}
                                    onChange={(e) => atualizarDadosImovel(dadoImovel.id, 'tipoTransacao', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                  >
                                    <option value="compra">Compra</option>
                                    <option value="venda">Venda</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Tipo de Venda</label>
                                  <select
                                    value={dadoImovel.tipoVenda}
                                    onChange={(e) => atualizarDadosImovel(dadoImovel.id, 'tipoVenda', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                  >
                                    <option value="total">Venda/Compra Total</option>
                                    <option value="minima">Venda/Compra Mínima</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Valor da Transação</label>
                                  <input
                                    type="text"
                                    value={dadoImovel.valorTransacao}
                                    onChange={(e) => atualizarDadosImovel(dadoImovel.id, 'valorTransacao', e.target.value)}
                                    inputMode="numeric"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="R$ 0,00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Forma de Pagamento</label>
                                  <select
                                    value={dadoImovel.formaPagamento}
                                    onChange={(e) => atualizarDadosImovel(dadoImovel.id, 'formaPagamento', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                  >
                                    <option value="vista">À Vista</option>
                                    <option value="financiada">Financiada</option>
                                  </select>
                                </div>
                                <div className="md:col-span-2 print:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Dados do Imóvel</label>
                                  <textarea
                                    value={dadoImovel.dadosImovel}
                                    onChange={(e) => atualizarDadosImovel(dadoImovel.id, 'dadosImovel', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Descrição completa do imóvel (endereço, matrícula, características, etc.)"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Campos de Administração de Imóvel */}
                    {formulario.poderesOutorgados.includes('ADMINISTRAÇÃO DE IMÓVEL') && (
                      <div className="border-t border-gray-200 pt-6 print:pt-3">
                        <div className="flex items-center justify-between mb-4 print:mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 print:text-base">
                            <Building className="w-5 h-5 text-purple-600 print:hidden" />
                            Administração de Imóvel
                          </h3>
                          <button
                            onClick={adicionarDadosAdministracaoImovel}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors flex items-center gap-1 print:hidden"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar Imóvel
                          </button>
                        </div>
                        <div className="space-y-4 print:space-y-2">
                          {formulario.dadosAdministracaoImovel.map((dadoAdmin, index) => (
                            <div key={dadoAdmin.id} className="bg-white p-4 rounded border border-gray-200 print:border-gray-400 print:p-2">
                              <div className="flex items-center justify-between mb-3 print:mb-1">
                                <h4 className="font-medium text-gray-700 print:text-sm">Imóvel para Administração {index + 1}</h4>
                                {formulario.dadosAdministracaoImovel.length > 1 && (
                                  <button
                                    onClick={() => removerDadosAdministracaoImovel(dadoAdmin.id)}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded print:hidden"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Dados do Imóvel</label>
                                <textarea
                                  value={dadoAdmin.dadosImovel}
                                  onChange={(e) => atualizarDadosAdministracaoImovel(dadoAdmin.id, 'dadosImovel', e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                  placeholder="Descrição completa do imóvel (endereço, matrícula, características, etc.)"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
{/* Campos de Outros Poderes */}
{formulario.poderesOutorgados.includes('OUTROS PODERES ESPECIFICOS') && (
  <div className="border-t border-gray-200 pt-6 print:pt-3">
    <div className="flex items-center justify-between mb-4 print:mb-2">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 print:text-base">
        <FileText className="w-5 h-5 text-indigo-600 print:hidden" />
        Outros Poderes Específicos
      </h3>
      <button
        onClick={adicionarOutrosPoderes}
        className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1 print:hidden"
      >
        <Plus className="w-3 h-3" />
        Adicionar Poder
      </button>
    </div>
    <div className="space-y-4 print:space-y-2">
      {formulario.outros.map((outrosPoderes, index) => (
        <div key={outrosPoderes.id} className="bg-white p-4 rounded border border-gray-200 print:border-gray-400 print:p-2">
          <div className="flex items-center justify-between mb-3 print:mb-1">
            <h4 className="font-medium text-gray-700 print:text-sm">Poder Específico {index + 1}</h4>
            {formulario.outros.length > 1 && (
              <button
                onClick={() => removerOutrosPoderes(outrosPoderes.id)}
                className="text-red-500 hover:bg-red-50 p-1 rounded print:hidden"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Descrição do Poder</label>
            <textarea
              value={outrosPoderes.outros}
              onChange={(e) => atualizarOutrosPoderes(outrosPoderes.id, 'outros', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:px-2 print:py-1"
              placeholder="Descreva detalhadamente o poder específico a ser outorgado..."
            />
          </div>
        </div>
      ))}
    </div>
  </div>
)}
                    {/* Campos de Seguradora/Remoção do Pátio */}
                    {formulario.poderesOutorgados.includes('SEGURADORA/REMOÇÃO DO PÁTIO') && (
                      <div className="border-t border-gray-200 pt-6 print:pt-3">
                        <div className="flex items-center justify-between mb-4 print:mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 print:text-base">
                            <Car className="w-5 h-5 text-red-600 print:hidden" />
                            Seguradora/Remoção do Pátio
                          </h3>
                          <button
                            onClick={adicionarDadosVeiculo}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center gap-1 print:hidden"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar Veículo
                          </button>
                        </div>
                        <div className="space-y-4 print:space-y-2">
                          {formulario.dadosVeiculo.map((dadoVeiculo, index) => (
                            <div key={dadoVeiculo.id} className="bg-white p-4 rounded border border-gray-200 print:border-gray-400 print:p-2">
                              <div className="flex items-center justify-between mb-3 print:mb-1">
                                <h4 className="font-medium text-gray-700 print:text-sm">Veículo {index + 1}</h4>
                                {formulario.dadosVeiculo.length > 1 && (
                                  <button
                                    onClick={() => removerDadosVeiculo(dadoVeiculo.id)}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded print:hidden"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-1">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Marca/Modelo</label>
                                  <input
                                    type="text"
                                    value={dadoVeiculo.marcaModelo}
                                    onChange={(e) => atualizarDadosVeiculo(dadoVeiculo.id, 'marcaModelo', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Ex: Honda Civic"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Placa</label>
                                  <input
                                    type="text"
                                    value={dadoVeiculo.placa}
                                    onChange={(e) => atualizarDadosVeiculo(dadoVeiculo.id, 'placa', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="ABC1D23 ou ABC-1234"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">RENAVAM</label>
                                  <input
                                    type="text"
                                    value={dadoVeiculo.renavam}
                                    onChange={(e) => atualizarDadosVeiculo(dadoVeiculo.id, 'renavam', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Número do RENAVAM"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Chassi</label>
                                  <input
                                    type="text"
                                    value={dadoVeiculo.chassi}
                                    onChange={(e) => atualizarDadosVeiculo(dadoVeiculo.id, 'chassi', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Número do chassi"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Espécie/Tipo</label>
                                  <input
                                    type="text"
                                    value={dadoVeiculo.especieTipo}
                                    onChange={(e) => atualizarDadosVeiculo(dadoVeiculo.id, 'especieTipo', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Ex: Automóvel"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Ano Fabricação</label>
                                  <input
                                    type="text"
                                    value={dadoVeiculo.anoFabricacao}
                                    onChange={(e) => atualizarDadosVeiculo(dadoVeiculo.id, 'anoFabricacao', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="2020"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Ano Modelo</label>
                                  <input
                                    type="text"
                                    value={dadoVeiculo.anoModelo}
                                    onChange={(e) => atualizarDadosVeiculo(dadoVeiculo.id, 'anoModelo', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="2021"
                                  />
                                </div>
                                <div className="md:col-span-2 print:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">Endereço e Nome do Pátio</label>
                                  <textarea
                                    value={dadoVeiculo.enderecoNomePatio}
                                    onChange={(e) => atualizarDadosVeiculo(dadoVeiculo.id, 'enderecoNomePatio', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:px-2 print:py-1"
                                    placeholder="Nome do pátio e endereço completo"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

{/* Seção Assinaturas */}
<section>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Assinaturas</h2>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
                    <div className="space-y-8 print:space-y-6">
                      {formulario.outorgantes.map((outorgante, index) => (
                        <div key={outorgante.id} className="flex flex-col">
                          <div className="border-b-2 border-gray-800 mb-2 h-8 print:h-6"></div>
                          <p className="text-sm text-gray-600 print:text-xs">
                            {outorgante.nome || `Outorgante ${index + 1}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Botões de Ação */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 print:hidden">
                  <button
                    onClick={() => cadastrarNaAgenda('Procuração', 'Procuração pública', clienteProcuracao(formulario))}
                    className="agenda-register-button px-5 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Cadastrar na agenda
                  </button>
                  <button
                    onClick={() => setMinutaAberta('procuracao')}
                    className="minuta-button px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Gerar Minuta
                  </button>
                  <button 
                    onClick={imprimirFormulario}
                    className="print-button px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>
            )}

            {abaVisivel === 'apostilamento' && (
              <div className="space-y-8 print:space-y-4">
                <BarraAtendimento controle={atendimentoApostilamento} cliente={clienteRequerente(formularioApostilamento)} />
                {/* Seção Dados de Entrega */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600 print:hidden" />
                    Dados de Entrega
                  </h2>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Entrega</label>
                        <CampoData
                          value={formularioApostilamento.dataEntrega}
                          onChange={(value) => atualizarCampoApostilamento('dataEntrega', value)}
                          minimo={limiteEntrega}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
                        />
                      </div>
                      <div>
  <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Horário de Entrega</label>
  <select
    value={formularioApostilamento.horarioEntrega}
    onChange={(e) => atualizarCampoApostilamento('horarioEntrega', e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
  >
    <option value="">Selecione o horário</option>
    <option value="08:30">08:30</option>
    <option value="09:30">09:30</option>
    <option value="10:30">10:30</option>
    <option value="11:30">11:30</option>
    <option value="12:30">12:30</option>
    <option value="13:30">13:30</option>
    <option value="14:30">14:30</option>
    <option value="15:30">15:30</option>
    <option value="16:30">16:30</option>
    <option value="17:30">17:30</option>
    <option value="18:00">18:00</option>
  </select>
</div>
                    </div>
                  </div>
                </section>

                {/* Seção Requerentes */}
                <section>
                  <div className="flex items-center justify-between mb-6 print:mb-3">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
                      <User className="w-6 h-6 text-blue-600 print:hidden" />
                      Requerentes
                    </h2>
                    <button
                      onClick={adicionarRequerente}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 print:hidden"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Requerente
                    </button>
                  </div>
                  <div className="space-y-4 print:space-y-2">
                    {formularioApostilamento.requerentes.map((requerente, index) =>
                      renderizarCamposRequerente(requerente, index)
                    )}
                  </div>
                </section>

                {/* Seção Dados do Apostilamento */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Dados do Apostilamento</h2>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">País a ser enviada a apostila</label>
                        <input
                          type="text"
                          value={formularioApostilamento.paisDestino}
                          onChange={(e) => atualizarCampoApostilamento('paisDestino', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
                          placeholder="Digite o país de destino"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Quantidade de Documentos</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formularioApostilamento.quantidadeDocumentos}
                          onChange={(e) => atualizarCampoApostilamento('quantidadeDocumentos', somenteDigitos(e.target.value, 3))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
                          placeholder="Número de documentos"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Quais Documentos</label>
                      <textarea
                        value={formularioApostilamento.quaisDocumentos}
                        onChange={(e) => atualizarCampoApostilamento('quaisDocumentos', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
                        placeholder="Descreva detalhadamente quais documentos serão apostilados (ex: Certidão de Nascimento, Diploma, etc.)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Assinatura a ser apostilada</label>
                      <textarea
                        value={formularioApostilamento.assinaturaApostilada}
                        onChange={(e) => atualizarCampoApostilamento('assinaturaApostilada', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
                        placeholder="Descreva a assinatura que será apostilada (ex: nome do signatário, cargo, etc.)"
                      />
                    </div>
                  </div>
                </section>

{/* Seção Assinaturas */}
<section>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Assinaturas</h2>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
                    <div className="space-y-8 print:space-y-6">
                      {formularioApostilamento.requerentes.map((requerente, index) => (
                        <div key={requerente.id} className="flex flex-col">
                         <div className="border-b-2 border-gray-800 mb-2 h-8 print:assinatura-linha"></div>
                          <p className="text-sm text-gray-600 print:text-xs">
                            {requerente.nome || `Requerente ${index + 1}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Botões de Ação */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 print:hidden">
                  <button
                    onClick={() => cadastrarNaAgenda('Apostilamento', 'Apostilamento', clienteRequerente(formularioApostilamento), false)}
                    className="agenda-register-button px-5 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Cadastrar na agenda
                  </button>
                  <button 
                    onClick={imprimirFormulario}
                    className="print-button px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>
            )}
{abaVisivel === 'certidoes' && (
  <div className="space-y-8 print:space-y-4">
    <BarraAtendimento controle={atendimentoCertidao} cliente={clienteRequerente(formularioCertidao)} />
    {/* Seção Dados de Entrega */}
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3 flex items-center gap-2">
        <FileText className="w-6 h-6 text-green-600 print:hidden" />
        Dados de Entrega
      </h2>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Entrega</label>
            <CampoData
              value={formularioCertidao.dataEntrega}
              onChange={(value) => atualizarCampoCertidao('dataEntrega', value)}
              minimo={limiteEntrega}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Horário de Entrega</label>
            <select
              value={formularioCertidao.horarioEntrega}
              onChange={(e) => atualizarCampoCertidao('horarioEntrega', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            >
              <option value="">Selecione o horário</option>
              <option value="08:30">08:30</option>
              <option value="09:30">09:30</option>
              <option value="10:30">10:30</option>
              <option value="11:30">11:30</option>
              <option value="12:30">12:30</option>
              <option value="13:30">13:30</option>
              <option value="14:30">14:30</option>
              <option value="15:30">15:30</option>
              <option value="16:30">16:30</option>
              <option value="17:30">17:30</option>
              <option value="18:00">18:00</option>
            </select>
          </div>
        </div>

      </div>
    </section>

    {/* Seção Requerentes */}
    <section>
      <div className="flex items-center justify-between mb-6 print:mb-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
          <User className="w-6 h-6 text-blue-600 print:hidden" />
          Requerentes
        </h2>
        <button
          onClick={adicionarRequerenteCertidao}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 print:hidden"
        >
          <Plus className="w-4 h-4" />
          Adicionar Requerente
        </button>
      </div>
      <div className="space-y-4 print:space-y-2">
        {formularioCertidao.requerentes.map((requerente, index) =>
          renderizarCamposRequerenteCertidao(requerente, index)
        )}
      </div>
    </section>

    {/* Seção Dados da Certidão */}
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Dados da Certidão</h2>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
        {/* Tipo de Certidão */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Tipo de Certidão</label>
          <select
            value={formularioCertidao.tipoCertidao}
            onChange={(e) => atualizarCampoCertidao('tipoCertidao', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          >
            <option value="">Selecione o tipo de certidão</option>
            <option value="procuracao">Certidão de Procuração</option>
            <option value="escritura">Certidão de Escritura</option>
            <option value="testamento">Certidão de Testamento</option>
          </select>
        </div>

        {/* Aviso para Certidão de Testamento */}
        {formularioCertidao.tipoCertidao === 'testamento' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 print:bg-gray-100 print:border-gray-400">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center print:hidden">
                  <span className="text-yellow-800 text-sm font-bold">!</span>
                </div>
              </div>
              <div className="text-sm text-yellow-800 print:text-gray-800 print:text-xs">
                <p className="font-semibold mb-2 print:font-bold">IMPORTANTE - CERTIDÃO DE TESTAMENTO:</p>
                <p>
                  De acordo com o <strong>CÓDIGO DE NORMAS DA CORREGEDORIA GERAL DO ESTADO DO RIO DE JANEIRO</strong>: 
                  Art. 297. A certidão de testamento somente poderá ser fornecida ao próprio testador ou mediante ordem judicial. 
                  Parágrafo único. Após o falecimento, a certidão de testamento poderá ser fornecida ao solicitante que apresentar a certidão de óbito.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Campos da Certidão */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
          <div className="md:col-span-2 print:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">{testamento ? 'Nome do Testador' : 'Nome do(s) Outorgante(s)'}</label>
            <textarea
              value={formularioCertidao.nomeOutorgantes}
              onChange={(e) => atualizarCampoCertidao('nomeOutorgantes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
              placeholder={testamento ? 'Nome completo de quem fez o testamento' : 'Digite o nome completo do(s) outorgante(s)'}
            />
          </div>

          {/* Testamento não tem outorgado: só o testador. */}
          {!testamento && <div className="md:col-span-2 print:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nome do(s) Outorgado(s)</label>
            <textarea
              value={formularioCertidao.nomeOutorgados}
              onChange={(e) => atualizarCampoCertidao('nomeOutorgados', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
              placeholder="Digite o nome completo do(s) outorgado(s)"
            />
          </div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Livro</label>
            <input
              type="text"
              value={formularioCertidao.livro}
              onChange={(e) => atualizarCampoCertidao('livro', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
              placeholder="Número do livro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Folha</label>
            <input
              type="text"
              value={formularioCertidao.folha}
              onChange={(e) => atualizarCampoCertidao('folha', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
              placeholder="Número da folha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data</label>
            <CampoData
              value={formularioCertidao.data}
              onChange={(value) => atualizarCampoCertidao('data', value)}
              maximo={limiteDataAto}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            />
          </div>

          <div className="md:col-span-2 print:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Finalidade</label>
            <textarea
              value={formularioCertidao.finalidade}
              onChange={(e) => atualizarCampoCertidao('finalidade', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
              placeholder="Descreva a finalidade da certidão solicitada"
            />
          </div>
        </div>

      </div>
    </section>

    {/* Seção Termos Legais */}
    <TermosCondicoes />

    {/* Seção Assinaturas */}
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Assinaturas</h2>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
        <div className="space-y-8 print:space-y-6">
          {formularioCertidao.requerentes.map((requerente, index) => (
            <div key={requerente.id} className="flex flex-col">
              <div className="border-b-2 border-gray-800 mb-2 h-8 print:h-6"></div>
              <p className="text-sm text-gray-600 print:text-xs">
                {requerente.nome || `Requerente ${index + 1}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Botões de Ação */}
    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 print:hidden">
      <button
        onClick={() => cadastrarNaAgenda('Certidões', 'Certidão', clienteRequerente(formularioCertidao), false)}
        className="agenda-register-button px-5 py-3 rounded-lg transition-colors flex items-center gap-2"
      >
        <CalendarPlus className="w-4 h-4" />
        Cadastrar na agenda
      </button>
      <button 
        onClick={imprimirFormulario}
        className="print-button px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  </div>
)}

{abaVisivel === 'uniao_estavel' && (
  <div className="space-y-8 print:space-y-4">
    <BarraAtendimento controle={atendimentoUniaoEstavel} cliente={clienteUniaoEstavel(formularioUniaoEstavel)} />
    {/* Seção Companheiros */}
    <section>
      <div className="flex items-center justify-between mb-6 print:mb-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
          <User className="w-6 h-6 text-blue-600 print:hidden" />
          Companheiros
        </h2>
        {formularioUniaoEstavel.companheiros.length < 2 && (
        <button
          onClick={adicionarCompanheiro}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 print:hidden"
        >
          <Plus className="w-4 h-4" />
          Adicionar Companheiro(a)
        </button>
        )}
      </div>
      <div className="space-y-4 print:space-y-2">
        {formularioUniaoEstavel.companheiros.map((companheiro, index) =>
          renderizarCamposPessoa(
            companheiro,
            index,
            'Companheiro(a)',
            (campo, valor) => atualizarCompanheiro(companheiro.id, campo, valor),
            formularioUniaoEstavel.companheiros.length > 2,
            () => removerCompanheiro(companheiro.id),
            true,
            false,
            false
          )
        )}
      </div>
    </section>

    {/* Seção Dados da União */}
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Dados da União</h2>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Início da União</label>
            <CampoData
              value={formularioUniaoEstavel.dataInicioUniao}
              onChange={(value) => atualizarCampoUniaoEstavel('dataInicioUniao', value)}
              maximo={limiteInicioUniao}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Regime de Bens</label>
            <select
              value={formularioUniaoEstavel.regimeBens}
              onChange={(e) => atualizarCampoUniaoEstavel('regimeBens', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            >
              <option value="">Selecione o regime de bens</option>
              {opcoesCom(REGIMES_BENS, formularioUniaoEstavel.regimeBens).map((regime) => (
                <option key={regime} value={regime}>{regime}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 print:hidden" />
            Endereço Comum do Casal
          </label>
          <textarea
            value={formularioUniaoEstavel.enderecoComum}
            onChange={(e) => atualizarCampoUniaoEstavel('enderecoComum', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
            placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Filhos da União (opcional)</label>
          <textarea
            value={formularioUniaoEstavel.filhos}
            onChange={(e) => atualizarCampoUniaoEstavel('filhos', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
            placeholder="Nomes e datas de nascimento, se houver. Deixe em branco se não houver filhos."
          />
        </div>
      </div>
    </section>

    {/* Seção Testemunhas */}
    <section>
      <div className="flex items-center justify-between mb-6 print:mb-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
          <User className="w-6 h-6 text-purple-600 print:hidden" />
          Testemunhas
        </h2>
        <button
          onClick={adicionarTestemunhaUniao}
          className="witness-button px-4 py-2 rounded-lg transition-colors flex items-center gap-2 print:hidden"
        >
          <Plus className="w-4 h-4" />
          Adicionar Testemunha
        </button>
      </div>
      <div className="space-y-4 print:space-y-2">
        {formularioUniaoEstavel.testemunhas.length > 0 ? (
          formularioUniaoEstavel.testemunhas.map((testemunha, index) =>
            renderizarCamposTestemunha(
              testemunha,
              index,
              (campo, valor) => atualizarTestemunhaUniao(testemunha.id, campo, valor),
              () => removerTestemunhaUniao(testemunha.id)
            )
          )
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
            <p className="text-gray-500">Nenhuma testemunha adicionada. Clique no botão acima para adicionar.</p>
          </div>
        )}
      </div>
    </section>

    {/* Botões de Ação */}
    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 print:hidden">
      <button
        onClick={() => cadastrarNaAgenda('União Estável', 'União estável', clienteUniaoEstavel(formularioUniaoEstavel))}
        className="agenda-register-button px-5 py-3 rounded-lg transition-colors flex items-center gap-2"
      >
        <CalendarPlus className="w-4 h-4" />
        Cadastrar na agenda
      </button>
      <button
        onClick={() => setMinutaAberta('uniao_estavel')}
        className="minuta-button px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        Gerar Minuta
      </button>
      <button
        onClick={imprimirFormulario}
        className="print-button px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  </div>
)}

{abaVisivel === 'pacto_antenupcial' && (
  <div className="space-y-8 print:space-y-4">
    <BarraAtendimento controle={atendimentoPacto} cliente={clientePacto(formularioPactoAntenupcial)} />
    {/* Seção Nubentes */}
    <section>
      <div className="flex items-center justify-between mb-6 print:mb-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
          <User className="w-6 h-6 text-blue-600 print:hidden" />
          Nubentes
        </h2>
        {formularioPactoAntenupcial.nubentes.length < 2 && (
        <button
          onClick={adicionarNubente}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 print:hidden"
        >
          <Plus className="w-4 h-4" />
          Adicionar Nubente
        </button>
        )}
      </div>
      <div className="space-y-4 print:space-y-2">
        {formularioPactoAntenupcial.nubentes.map((nubente, index) =>
          renderizarCamposPessoa(
            nubente,
            index,
            'Nubente',
            (campo, valor) => atualizarNubente(nubente.id, campo, valor),
            formularioPactoAntenupcial.nubentes.length > 2,
            () => removerNubente(nubente.id),
            true,
            false
          )
        )}
      </div>
    </section>

    {/* Seção Dados do Pacto */}
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Dados do Pacto</h2>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data Prevista do Casamento</label>
            <CampoData
              value={formularioPactoAntenupcial.dataPrevistaCasamento}
              onChange={(value) => atualizarCampoPacto('dataPrevistaCasamento', value)}
              minimo={limiteCasamento}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Regime de Bens</label>
            <select
              value={formularioPactoAntenupcial.regimeBens}
              onChange={(e) => atualizarCampoPacto('regimeBens', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            >
              <option value="">Selecione o regime de bens</option>
              {opcoesCom(REGIMES_PACTO, formularioPactoAntenupcial.regimeBens).map((regime) => (
                <option key={regime} value={regime}>{regime}</option>
              ))}
            </select>
            {formularioPactoAntenupcial.regimeBens && !REGIMES_PACTO.includes(formularioPactoAntenupcial.regimeBens) && (
              <small className="campo-erro" role="alert">Este regime não depende de pacto antenupcial: a comunhão parcial vale sem pacto e a separação obrigatória é imposta pela lei.</small>
            )}
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Bens Particulares (opcional)</label>
          <textarea
            value={formularioPactoAntenupcial.bensParticulares}
            onChange={(e) => atualizarCampoPacto('bensParticulares', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
            placeholder="Bens que cada nubente já possui antes do casamento, se desejar registrar"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Cláusulas Específicas (opcional)</label>
          <textarea
            value={formularioPactoAntenupcial.clausulasEspecificas}
            onChange={(e) => atualizarCampoPacto('clausulasEspecificas', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
            placeholder="Cláusulas adicionais combinadas entre os nubentes, além do regime de bens escolhido"
          />
        </div>
      </div>
    </section>

    {/* Seção Testemunhas */}
    <section>
      <div className="flex items-center justify-between mb-6 print:mb-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 print:text-lg">
          <User className="w-6 h-6 text-purple-600 print:hidden" />
          Testemunhas
        </h2>
        <button
          onClick={adicionarTestemunhaPacto}
          className="witness-button px-4 py-2 rounded-lg transition-colors flex items-center gap-2 print:hidden"
        >
          <Plus className="w-4 h-4" />
          Adicionar Testemunha
        </button>
      </div>
      <div className="space-y-4 print:space-y-2">
        {formularioPactoAntenupcial.testemunhas.length > 0 ? (
          formularioPactoAntenupcial.testemunhas.map((testemunha, index) =>
            renderizarCamposTestemunha(
              testemunha,
              index,
              (campo, valor) => atualizarTestemunhaPacto(testemunha.id, campo, valor),
              () => removerTestemunhaPacto(testemunha.id)
            )
          )
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
            <p className="text-gray-500">Nenhuma testemunha adicionada. Clique no botão acima para adicionar.</p>
          </div>
        )}
      </div>
    </section>

    {/* Botões de Ação */}
    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 print:hidden">
      <button
        onClick={() => cadastrarNaAgenda('Pacto Antenupcial', 'Pacto antenupcial', clientePacto(formularioPactoAntenupcial))}
        className="agenda-register-button px-5 py-3 rounded-lg transition-colors flex items-center gap-2"
      >
        <CalendarPlus className="w-4 h-4" />
        Cadastrar na agenda
      </button>
      <button
        onClick={() => setMinutaAberta('pacto_antenupcial')}
        className="minuta-button px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        Gerar Minuta
      </button>
      <button
        onClick={imprimirFormulario}
        className="print-button px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  </div>
)}
          </div>
        </div>
      </div>
      </div>

      {/* Estilos de Impressão Otimizados */}
      <style>{`
        @media print {
          @page {
            margin: 0.5cm;
            size: A4;
          }
          
          * {
            font-size: 10px !important;
            line-height: 1.2 !important;
          }
          
          h1 { font-size: 16px !important; margin-bottom: 8px !important; }
          h2 { font-size: 14px !important; margin-bottom: 6px !important; }
          h3 { font-size: 12px !important; margin-bottom: 4px !important; }
          h4 { font-size: 11px !important; margin-bottom: 3px !important; }
          
          .print\\:hidden { display: none !important; }
          .print\\:compact { 
            padding: 4px !important; 
            margin-bottom: 8px !important; 
            border: 1px solid #666 !important;
          }
          
          /* Layout em grid compacto */
          .print\\:grid-3 { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr 1fr !important; 
            gap: 4px !important; 
          }
          .print\\:grid-2 { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 4px !important; 
          }
          
          /* Campos compactos */
          input, textarea, select {
            padding: 2px 4px !important;
            font-size: 9px !important;
            border: 1px solid #333 !important;
            margin-bottom: 2px !important;
          }
          
          label {
            font-weight: bold !important;
            font-size: 8px !important;
            margin-bottom: 1px !important;
            display: block !important;
          }
          
          /* Seções inline para economia de espaço */
          .print\\:inline-section {
            display: inline-block !important;
            width: 48% !important;
            vertical-align: top !important;
            margin-right: 2% !important;
            margin-bottom: 10px !important;
          }
          
          /* Poderes em formato compacto */
          .print\\:poderes-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 2px !important;
            font-size: 8px !important;
          }
          
          /* Assinaturas compactas */
          .print\\:assinatura-linha {
            border-bottom: 1px solid #000 !important;
            height: 20px !important;
            margin-bottom: 4px !important;
          }
          
          /* Remove espaçamentos desnecessários */
          .space-y-8 > * + * { margin-top: 6px !important; }
          .space-y-4 > * + * { margin-top: 4px !important; }
          .mb-6 { margin-bottom: 6px !important; }
          .mb-4 { margin-bottom: 4px !important; }
          .mb-3 { margin-bottom: 3px !important; }
          .p-6 { padding: 6px !important; }
          
          /* Quebra de página inteligente */
          .print\\:page-break-before { page-break-before: always !important; }
          .print\\:avoid-break { page-break-inside: avoid !important; }
        }
      `}</style>
    </div>
  );
}

export default App;
