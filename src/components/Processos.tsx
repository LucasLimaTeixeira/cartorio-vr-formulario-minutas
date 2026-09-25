import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ClipboardList, Copy, FolderOpen, Plus, Printer, Save, Settings2, Trash2, X } from 'lucide-react';
import { CampoData } from './Campos';
import { formatarDataAgenda, hojeIso } from '../utils/campos';
import { MembroEquipe, carregarEquipe } from '../utils/equipe';
import { canEditWorkspace, canManageProcessos, useWorkspaceProfile } from '../utils/workspaceStorage';
import {
  Certidao, ETAPAS, Etapa, Exigencia, NovoProcesso, Parte, Prazos, Processo, TIPOS_ATO, TIPOS_CERTIDAO, TIPO_CERTIDAO_OUTRA,
  adicionarCertidao, adicionarExigencia, alertasDoProcesso, assinarProcessos, carregarPrazos, criarProcesso, etapaEncerrada, excluirProcesso,
  listarCertidoes, listarExigencias, listarProcessos, marcarExigencia, prazoDe, processosDisponiveis, removerCertidao,
  removerExigencia, rotuloEtapa, salvarPrazos, salvarProcesso, situacaoCertidao, textoNotaExigencia, vencimentoSugerido,
} from '../utils/processos';

const dataCurta = (iso: string) => (iso ? formatarDataAgenda(iso) : '—');
const textoSituacao = { vencida: 'Vencida', vencendo: 'Vencendo', ok: 'Em dia', sem_data: 'Sem vencimento' };
const mensagemErro = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível concluir a operação.');

interface ProcessosProps {
  // Dados vindos do botão "Abrir processo" de um formulário.
  rascunho: NovoProcesso | null;
  onRascunhoUsado: () => void;
}

export function Processos({ rascunho, onRascunhoUsado }: ProcessosProps) {
  const profile = useWorkspaceProfile();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [certidoes, setCertidoes] = useState<Certidao[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [prazos, setPrazos] = useState<Prazos>({});
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState<NovoProcesso | null>(null);
  const [editandoPrazos, setEditandoPrazos] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<'andamento' | 'todos' | Etapa>('andamento');
  const [soAlertas, setSoAlertas] = useState(false);
  const podeCriar = canEditWorkspace() && profile.features.processos;
  const gestor = profile.role === 'owner' || profile.role === 'admin';

  const recarregar = useCallback(async () => {
    try {
      const [lista, certs] = await Promise.all([listarProcessos(), listarCertidoes()]);
      setProcessos(lista); setCertidoes(certs); setErro('');
    } catch (e) { setErro(mensagemErro(e)); }
  }, []);

  useEffect(() => {
    if (!processosDisponiveis()) return;
    void recarregar();
    void carregarEquipe().then(setEquipe).catch(() => undefined);
    void carregarPrazos().then(setPrazos).catch(() => undefined);
    return assinarProcessos(() => { void recarregar(); });
  }, [recarregar]);

  useEffect(() => {
    if (rascunho) { setNovo(rascunho); setAberto(null); onRascunhoUsado(); }
  }, [rascunho, onRascunhoUsado]);

  const nomeDe = (id: string) => equipe.find((m) => m.id === id)?.nome ?? '';

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return processos.filter((p) => {
      if (filtroEtapa === 'andamento' && etapaEncerrada(p.etapa)) return false;
      if (filtroEtapa !== 'andamento' && filtroEtapa !== 'todos' && p.etapa !== filtroEtapa) return false;
      if (soAlertas && !alertasDoProcesso(p, certidoes).length) return false;
      if (!termo) return true;
      return [p.tipoAto, p.gaveta, p.objeto, ...p.partes.flatMap((x) => [x.nome, x.documento])].some((v) => v.toLowerCase().includes(termo));
    });
  }, [processos, certidoes, busca, filtroEtapa, soAlertas]);

  if (!processosDisponiveis()) return <p className="home-empty">Processos precisam do banco do cartório configurado.</p>;

  const processoAberto = processos.find((p) => p.id === aberto);
  if (processoAberto) {
    return <DetalheProcesso
      processo={processoAberto}
      certidoes={certidoes.filter((c) => c.processoId === processoAberto.id)}
      equipe={equipe}
      prazos={prazos}
      onVoltar={() => setAberto(null)}
      onAlterado={() => void recarregar()}
    />;
  }

  return <section className="proc-screen">
    <header className="proc-header">
      <div><span className="agenda-kicker"><FolderOpen className="w-4 h-4" /> Controle de entrada</span><h2>Processos</h2><p>O que entrou para lavratura: gaveta, data prevista, certidões e exigências.</p></div>
      <div className="proc-header-actions">
        {gestor && <button type="button" className="proc-button is-ghost" onClick={() => setEditandoPrazos(true)}><Settings2 /> Prazos das certidões</button>}
        {podeCriar && <button type="button" className="proc-button" onClick={() => setNovo({ tipoAto: TIPOS_ATO[0], partes: [{ nome: '', documento: '' }], objeto: '', observacoes: '' })}><Plus /> Novo processo</button>}
      </div>
    </header>

    {erro && <p className="auth-error">{erro}</p>}
    {novo && <NovoProcessoForm inicial={novo} equipe={equipe} onCancelar={() => setNovo(null)} onCriado={(p) => { setNovo(null); setProcessos((l) => [p, ...l]); setAberto(p.id); }} />}
    {editandoPrazos && <PrazosForm prazos={prazos} onFechar={() => setEditandoPrazos(false)} onSalvo={(p) => { setPrazos(p); setEditandoPrazos(false); }} />}

    <div className="proc-filters">
      <label>Buscar<input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Parte, CPF/CNPJ, gaveta ou ato" /></label>
      <label>Etapa<select value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value as typeof filtroEtapa)}>
        <option value="andamento">Em andamento</option><option value="todos">Todos</option>
        {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}
      </select></label>
      <label className="proc-check"><input type="checkbox" checked={soAlertas} onChange={(e) => setSoAlertas(e.target.checked)} /> Só com certidão vencendo</label>
    </div>

    {filtrados.length ? <div className="proc-list">{filtrados.map((p) => {
      const alertas = alertasDoProcesso(p, certidoes);
      const atrasado = !etapaEncerrada(p.etapa) && p.dataPrevista && p.dataPrevista < hojeIso();
      return <button type="button" key={p.id} className="proc-item" onClick={() => setAberto(p.id)}>
        <div className="proc-item-main">
          <strong>{p.partes.map((x) => x.nome).filter(Boolean).join(', ') || 'Partes não informadas'}</strong>
          <small>{p.tipoAto}{p.responsavelId ? ` · ${nomeDe(p.responsavelId) || 'responsável'}` : ''}</small>
        </div>
        <div className="proc-item-meta">
          <span>Gaveta <b>{p.gaveta || '—'}</b></span>
          <span className={atrasado ? 'is-late' : ''}>Previsto <b>{dataCurta(p.dataPrevista)}</b></span>
          <span className={`proc-etapa is-${p.etapa}`}>{rotuloEtapa(p.etapa)}</span>
          {alertas.length > 0 && <span className="proc-alerta"><AlertTriangle /> {alertas.length} certidão(ões)</span>}
        </div>
      </button>;
    })}</div> : <p className="home-empty">Nenhum processo encontrado com esses filtros.</p>}
  </section>;
}

// ---------------------------------------------------------------------------
// Partes (nome + CPF/CNPJ), usado no cadastro e no processo aberto
// ---------------------------------------------------------------------------

function CamposPartes({ partes, onChange, desabilitado }: { partes: Parte[]; onChange: (partes: Parte[]) => void; desabilitado?: boolean }) {
  const alterar = (i: number, campo: keyof Parte, valor: string) => onChange(partes.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  return <div className="proc-partes">
    {partes.map((parte, i) => <div className="proc-parte" key={i}>
      <input value={parte.nome} disabled={desabilitado} onChange={(e) => alterar(i, 'nome', e.target.value)} placeholder="Nome ou razão social" aria-label={`Nome da parte ${i + 1}`} />
      <input value={parte.documento} disabled={desabilitado} onChange={(e) => alterar(i, 'documento', e.target.value)} placeholder="CPF ou CNPJ" aria-label={`Documento da parte ${i + 1}`} />
      {!desabilitado && partes.length > 1 && <button type="button" className="proc-icon" onClick={() => onChange(partes.filter((_, j) => j !== i))} aria-label="Remover parte"><Trash2 /></button>}
    </div>)}
    {!desabilitado && <button type="button" className="proc-button is-ghost is-small" onClick={() => onChange([...partes, { nome: '', documento: '' }])}><Plus /> Adicionar parte</button>}
  </div>;
}

function NovoProcessoForm({ inicial, equipe, onCancelar, onCriado }: { inicial: NovoProcesso; equipe: MembroEquipe[]; onCancelar: () => void; onCriado: (p: Processo) => void }) {
  const [form, setForm] = useState<NovoProcesso>(inicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const gerencia = canManageProcessos();
  useEffect(() => { setForm(inicial); }, [inicial]);

  const salvar = async () => {
    if (!form.partes.some((p) => p.nome.trim())) { setErro('Informe ao menos o nome de uma parte.'); return; }
    setSalvando(true); setErro('');
    try { onCriado(await criarProcesso(form)); } catch (e) { setErro(mensagemErro(e)); } finally { setSalvando(false); }
  };

  return <div className="proc-card">
    <h3><ClipboardList /> Novo processo</h3>
    <div className="proc-grid">
      <label>Tipo de ato<select value={form.tipoAto} onChange={(e) => setForm({ ...form, tipoAto: e.target.value })}>{[...new Set([...TIPOS_ATO, form.tipoAto])].map((t) => <option key={t}>{t}</option>)}</select></label>
      <label>Data de entrada<CampoData value={form.dataEntrada ?? hojeIso()} onChange={(v) => setForm({ ...form, dataEntrada: v })} className="" /></label>
      {gerencia && <>
        <label>Gaveta<input value={form.gaveta ?? ''} onChange={(e) => setForm({ ...form, gaveta: e.target.value })} placeholder="Ex.: 12-B" /></label>
        <label>Data prevista<CampoData value={form.dataPrevista ?? ''} onChange={(v) => setForm({ ...form, dataPrevista: v })} className="" /></label>
        <label>Responsável<select value={form.responsavelId ?? ''} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}><option value="">Sem responsável</option>{equipe.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>
      </>}
    </div>
    <p className="proc-label">Partes</p>
    <CamposPartes partes={form.partes} onChange={(partes) => setForm({ ...form, partes })} />
    <label className="proc-full">Imóvel ou objeto do ato<textarea rows={2} value={form.objeto} onChange={(e) => setForm({ ...form, objeto: e.target.value })} placeholder="Matrícula, endereço, descrição..." /></label>
    <label className="proc-full">Observações<textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
    {!gerencia && <p className="proc-hint">Gaveta, data prevista, certidões e exigências são preenchidas pelo analisador.</p>}
    {erro && <p className="auth-error">{erro}</p>}
    <div className="proc-actions">
      <button type="button" className="proc-button is-ghost" onClick={onCancelar}><X /> Cancelar</button>
      <button type="button" className="proc-button" disabled={salvando} onClick={() => void salvar()}><Save /> {salvando ? 'Salvando...' : 'Registrar entrada'}</button>
    </div>
  </div>;
}

function PrazosForm({ prazos, onFechar, onSalvo }: { prazos: Prazos; onFechar: () => void; onSalvo: (p: Prazos) => void }) {
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(TIPOS_CERTIDAO.map((t) => [t.tipo, String(prazoDe(t.tipo, prazos) ?? t.prazoPadrao)])));
  const [erro, setErro] = useState('');
  const salvar = async () => {
    const novos: Prazos = {};
    for (const t of TIPOS_CERTIDAO) {
      const dias = Number(valores[t.tipo]);
      if (!Number.isInteger(dias) || dias < 1 || dias > 365) { setErro(`Prazo inválido para ${t.tipo}: use de 1 a 365 dias.`); return; }
      if (dias !== t.prazoPadrao) novos[t.tipo] = dias;
    }
    try { await salvarPrazos(novos); onSalvo(novos); } catch (e) { setErro(mensagemErro(e)); }
  };
  return <div className="proc-card">
    <h3><Settings2 /> Prazos de validade das certidões</h3>
    <p className="proc-hint">Dias de validade contados da emissão. Ajuste conforme as normas do seu estado; o vencimento de certidões já cadastradas não muda.</p>
    <div className="proc-prazos">{TIPOS_CERTIDAO.map((t) => <label key={t.tipo}>{t.tipo}<span><input type="text" inputMode="numeric" value={valores[t.tipo]} onChange={(e) => setValores({ ...valores, [t.tipo]: e.target.value.replace(/\D/g, '').slice(0, 3) })} /> dias</span></label>)}</div>
    {erro && <p className="auth-error">{erro}</p>}
    <div className="proc-actions"><button type="button" className="proc-button is-ghost" onClick={onFechar}><X /> Fechar</button><button type="button" className="proc-button" onClick={() => void salvar()}><Save /> Salvar prazos</button></div>
  </div>;
}

// ---------------------------------------------------------------------------
// Processo aberto
// ---------------------------------------------------------------------------

interface DetalheProps {
  processo: Processo;
  certidoes: Certidao[];
  equipe: MembroEquipe[];
  prazos: Prazos;
  onVoltar: () => void;
  onAlterado: () => void;
}

function DetalheProcesso({ processo, certidoes, equipe, prazos, onVoltar, onAlterado }: DetalheProps) {
  const profile = useWorkspaceProfile();
  const gerencia = canManageProcessos();
  // base = versão do banco que o formulário está editando.
  const [base, setBase] = useState(processo);
  const [form, setForm] = useState(processo);
  const [exigencias, setExigencias] = useState<Exigencia[]>([]);
  const [novaExigencia, setNovaExigencia] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const vazia = { tipo: TIPOS_CERTIDAO[0].tipo, referente: '', dataEmissao: '', vencimento: '', observacao: '' };
  const [certidao, setCertidao] = useState(vazia);
  const alterado = JSON.stringify(form) !== JSON.stringify(base);

  // Mudança feita por outro usuário chega pelo tempo real e só substitui o formulário se não houver edição local.
  if (processo !== base) {
    if (!alterado) setForm(processo);
    setBase(processo);
  }
  // O recarregamento em tempo real troca a lista de certidões; aproveita para buscar as exigências de novo.
  const carregarExigencias = useCallback(() => { void listarExigencias(processo.id).then(setExigencias).catch((e) => setErro(mensagemErro(e))); }, [processo.id]);
  useEffect(() => { carregarExigencias(); }, [carregarExigencias, certidoes]);

  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    setErro(''); setMensagem('');
    try { await acao(); setMensagem(sucesso); onAlterado(); } catch (e) { setErro(mensagemErro(e)); }
  };

  const salvar = () => executar(async () => setForm(await salvarProcesso(form)), 'Processo salvo.');
  const alterarTipoCertidao = (tipo: string) => setCertidao((c) => ({ ...c, tipo, vencimento: tipo === TIPO_CERTIDAO_OUTRA ? c.vencimento : vencimentoSugerido(tipo, c.dataEmissao, prazos) }));
  const alterarEmissao = (dataEmissao: string) => setCertidao((c) => ({ ...c, dataEmissao, vencimento: c.tipo === TIPO_CERTIDAO_OUTRA ? c.vencimento : vencimentoSugerido(c.tipo, dataEmissao, prazos) }));
  const incluirCertidao = () => {
    if (!certidao.vencimento) { setErro('Informe a data de emissão ou o vencimento da certidão.'); return; }
    void executar(async () => { await adicionarCertidao({ ...certidao, processoId: processo.id }); setCertidao(vazia); }, 'Certidão incluída.');
  };
  const incluirExigencia = () => {
    if (!novaExigencia.trim()) return;
    void executar(async () => { const e = await adicionarExigencia(processo.id, novaExigencia); setExigencias((l) => [...l, e]); setNovaExigencia(''); }, 'Exigência incluída.');
  };
  const nota = () => textoNotaExigencia(form, exigencias, profile.workspaceName, profile.cartorioCidade);
  const imprimirNota = () => {
    const janela = window.open('', '_blank', 'width=800,height=900');
    if (!janela) { setErro('O navegador bloqueou a janela de impressão.'); return; }
    const pre = janela.document.createElement('pre');
    pre.textContent = nota();
    pre.style.cssText = 'font: 13pt/1.6 Georgia, serif; white-space: pre-wrap; margin: 2.5cm;';
    janela.document.title = 'Nota de exigência';
    janela.document.body.appendChild(pre);
    janela.print();
  };

  return <section className="proc-screen">
    <button type="button" className="attendant-back-button" onClick={onVoltar}><ArrowLeft className="w-4 h-4" /> Voltar para processos</button>
    <header className="proc-header">
      <div><span className="agenda-kicker"><FolderOpen className="w-4 h-4" /> {form.tipoAto}</span><h2>{form.partes.map((p) => p.nome).filter(Boolean).join(', ') || 'Partes não informadas'}</h2><p>Entrada em {dataCurta(form.dataEntrada)} · {rotuloEtapa(processo.etapa)}</p></div>
      {gerencia && <div className="proc-header-actions">
        <button type="button" className="proc-button is-ghost is-danger" onClick={() => { if (window.confirm('Excluir este processo, com certidões e exigências? Para encerrar sem apagar, use a etapa "Cancelado".')) void executar(async () => { await excluirProcesso(processo.id); onVoltar(); }, 'Processo excluído.'); }}><Trash2 /> Excluir</button>
        <button type="button" className="proc-button" disabled={!alterado} onClick={() => void salvar()}><Save /> Salvar</button>
      </div>}
    </header>
    {!gerencia && <p className="proc-hint">Somente consulta: quem completa o processo é o analisador, o administrador ou o proprietário.</p>}
    {erro && <p className="auth-error">{erro}</p>}
    {mensagem && !erro && <p className="proc-ok">{mensagem}</p>}

    <div className="proc-card">
      <h3><ClipboardList /> Dados do processo</h3>
      <div className="proc-grid">
        <label>Etapa<select disabled={!gerencia} value={form.etapa} onChange={(e) => setForm({ ...form, etapa: e.target.value as Etapa })}>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}</select></label>
        <label>Gaveta<input disabled={!gerencia} value={form.gaveta} onChange={(e) => setForm({ ...form, gaveta: e.target.value })} placeholder="Ex.: 12-B" /></label>
        <label>Data prevista<CampoData disabled={!gerencia} value={form.dataPrevista} onChange={(v) => setForm({ ...form, dataPrevista: v })} className="" /></label>
        <label>Responsável<select disabled={!gerencia} value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}><option value="">Sem responsável</option>{equipe.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>
        <label>Tipo de ato<select disabled={!gerencia} value={form.tipoAto} onChange={(e) => setForm({ ...form, tipoAto: e.target.value })}>{[...new Set([...TIPOS_ATO, form.tipoAto])].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Data de entrada<CampoData disabled={!gerencia} value={form.dataEntrada} onChange={(v) => setForm({ ...form, dataEntrada: v })} className="" /></label>
      </div>
      <p className="proc-label">Partes</p>
      <CamposPartes partes={form.partes.length ? form.partes : [{ nome: '', documento: '' }]} onChange={(partes) => setForm({ ...form, partes })} desabilitado={!gerencia} />
      <label className="proc-full">Imóvel ou objeto do ato<textarea disabled={!gerencia} rows={2} value={form.objeto} onChange={(e) => setForm({ ...form, objeto: e.target.value })} /></label>
      <label className="proc-full">Observações<textarea disabled={!gerencia} rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
      {gerencia && alterado && <p className="proc-hint">Há alterações não salvas.</p>}
    </div>

    <div className="proc-card">
      <h3><AlertTriangle /> Certidões</h3>
      {certidoes.length ? <table className="proc-table"><thead><tr><th>Certidão</th><th>Referente a</th><th>Emissão</th><th>Vencimento</th><th>Situação</th>{gerencia && <th />}</tr></thead>
        <tbody>{certidoes.map((c) => { const s = etapaEncerrada(processo.etapa) ? 'ok' : situacaoCertidao(c, form.dataPrevista); return <tr key={c.id}>
          <td>{c.tipo}{c.observacao && <small>{c.observacao}</small>}</td><td>{c.referente || '—'}</td><td>{dataCurta(c.dataEmissao)}</td><td>{dataCurta(c.vencimento)}</td>
          <td><span className={`proc-situacao is-${s}`}>{textoSituacao[s]}</span></td>
          {gerencia && <td><button type="button" className="proc-icon" aria-label="Remover certidão" onClick={() => { if (window.confirm('Remover esta certidão?')) void executar(() => removerCertidao(c.id), 'Certidão removida.'); }}><Trash2 /></button></td>}
        </tr>; })}</tbody></table> : <p className="home-muted">Nenhuma certidão cadastrada.</p>}
      {gerencia && <div className="proc-grid proc-add">
        <label>Tipo<select value={certidao.tipo} onChange={(e) => alterarTipoCertidao(e.target.value)}>{TIPOS_CERTIDAO.map((t) => <option key={t.tipo}>{t.tipo}</option>)}<option>{TIPO_CERTIDAO_OUTRA}</option></select></label>
        <label>Referente a<input value={certidao.referente} onChange={(e) => setCertidao({ ...certidao, referente: e.target.value })} placeholder="Imóvel ou nome da parte" /></label>
        <label>Emissão<CampoData value={certidao.dataEmissao} onChange={alterarEmissao} className="" maximo={{ data: hojeIso(), mensagem: 'A emissão não pode ser futura.' }} /></label>
        <label>Vencimento<CampoData value={certidao.vencimento} onChange={(v) => setCertidao({ ...certidao, vencimento: v })} className="" /></label>
        <label className="proc-full">Observação<input value={certidao.observacao} onChange={(e) => setCertidao({ ...certidao, observacao: e.target.value })} placeholder="Opcional" /></label>
        <div className="proc-actions proc-full"><button type="button" className="proc-button" onClick={incluirCertidao}><Plus /> Incluir certidão</button></div>
      </div>}
    </div>

    <div className="proc-card">
      <h3><ClipboardList /> Exigências</h3>
      {exigencias.length ? <ul className="proc-exigencias">{exigencias.map((e) => <li key={e.id} className={e.cumprida ? 'is-done' : ''}>
        <label><input type="checkbox" disabled={!gerencia} checked={e.cumprida} onChange={() => void executar(async () => { const atual = await marcarExigencia(e.id, !e.cumprida); setExigencias((l) => l.map((x) => (x.id === e.id ? atual : x))); }, e.cumprida ? 'Exigência reaberta.' : 'Exigência cumprida.')} /> <span>{e.texto}</span></label>
        {e.cumprida && <small>Cumprida em {new Date(e.cumpridaEm).toLocaleDateString('pt-BR')}</small>}
        {gerencia && <button type="button" className="proc-icon" aria-label="Remover exigência" onClick={() => { if (window.confirm('Remover esta exigência?')) void executar(async () => { await removerExigencia(e.id); setExigencias((l) => l.filter((x) => x.id !== e.id)); }, 'Exigência removida.'); }}><Trash2 /></button>}
      </li>)}</ul> : <p className="home-muted">Nenhuma exigência registrada.</p>}
      {gerencia && <div className="proc-nova-exigencia">
        <textarea rows={2} value={novaExigencia} onChange={(e) => setNovaExigencia(e.target.value)} placeholder="Ex.: Apresentar certidão de casamento atualizada, emitida há menos de 90 dias." />
        <button type="button" className="proc-button" onClick={incluirExigencia}><Plus /> Incluir exigência</button>
      </div>}
      {exigencias.length > 0 && <div className="proc-actions">
        <button type="button" className="proc-button is-ghost" onClick={() => void navigator.clipboard.writeText(nota()).then(() => setMensagem('Nota de exigência copiada.'))}><Copy /> Copiar nota</button>
        <button type="button" className="proc-button is-ghost" onClick={imprimirNota}><Printer /> Imprimir nota</button>
      </div>}
      {exigencias.length > 0 && exigencias.every((e) => e.cumprida) && <p className="proc-ok"><Check className="w-4 h-4" /> Todas as exigências foram cumpridas.</p>}
    </div>
  </section>;
}
