import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileText, ListChecks, RotateCcw, ScrollText } from 'lucide-react';
import {
  DEFINICOES_MODELOS, MODELOS_PADRAO, ModeloMinuta, TIPOS_MODELO, TipoModeloMinuta, VariavelModelo,
  carregarModelosMinuta, modeloMinuta, modelosIguais, restaurarModeloPadrao, salvarModeloMinuta, useModelosPersonalizados, variaveisDesconhecidas,
} from '../utils/modelosMinuta';
import { useWorkspaceProfile } from '../utils/workspaceStorage';

type Aba = 'texto' | 'clausulas';
// Campo que recebe a variável clicada: 'titulo', 'corpo', 'fechamento' ou o id de uma cláusula.
type Campo = string;

const formatarDataHora = (valor: string) => new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function ModelosMinutaAdmin() {
  const profile = useWorkspaceProfile();
  const personalizados = useModelosPersonalizados();
  const [tipo, setTipo] = useState<TipoModeloMinuta>('procuracao');
  const [rascunho, setRascunho] = useState<ModeloMinuta>(() => modeloMinuta('procuracao'));
  const [aba, setAba] = useState<Aba>('texto');
  const [campo, setCampo] = useState<Campo>('corpo');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const campos = useRef<Record<Campo, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const definicao = DEFINICOES_MODELOS[tipo];
  const salvo = personalizados[tipo];
  const atual = salvo?.modelo ?? MODELOS_PADRAO[tipo];
  const alterado = !modelosIguais(rascunho, atual);

  useEffect(() => { void carregarModelosMinuta().catch((e: Error) => setErro(e.message)); }, []);
  // Quando os modelos chegam do banco (ou mudam após salvar), a tela acompanha se não houver edição pendente.
  const atualRef = useRef(atual);
  useEffect(() => {
    if (atualRef.current === atual) return;
    setRascunho((r) => (modelosIguais(r, atualRef.current) ? atual : r));
    atualRef.current = atual;
  }, [atual]);

  const trechoAtivo = definicao.trechos.find((t) => t.id === campo);
  const variaveisDoCampo: VariavelModelo[] = trechoAtivo ? trechoAtivo.variaveis : definicao.variaveis;
  const avisos = useMemo(() => {
    const lista: string[] = [];
    const principais = variaveisDesconhecidas([rascunho.titulo, rascunho.corpo, rascunho.fechamento].join('\n'), definicao.variaveis);
    if (principais.length) lista.push(`Texto principal: ${principais.map((n) => `{{${n}}}`).join(', ')}`);
    definicao.trechos.forEach((t) => {
      const desconhecidas = variaveisDesconhecidas(rascunho.trechos[t.id] ?? '', t.variaveis);
      if (desconhecidas.length) lista.push(`${t.rotulo}: ${desconhecidas.map((n) => `{{${n}}}`).join(', ')}`);
    });
    return lista;
  }, [rascunho, definicao]);

  if (!profile.isSystemAdmin) return <section className="team-manager"><p className="team-info">Acesso restrito ao Super Admin.</p></section>;

  const trocarTipo = (proximo: TipoModeloMinuta) => {
    if (proximo === tipo) return;
    if (alterado && !window.confirm('Há alterações não salvas neste modelo. Descartar e trocar de minuta?')) return;
    setTipo(proximo); setRascunho(modeloMinuta(proximo)); atualRef.current = personalizados[proximo]?.modelo ?? MODELOS_PADRAO[proximo];
    const def = DEFINICOES_MODELOS[proximo];
    setAba(def.somenteTrechos ? 'clausulas' : 'texto'); setCampo(def.somenteTrechos ? def.trechos[0].id : 'corpo'); setErro(''); setMensagem('');
  };
  const alterarCampo = (id: Campo, valor: string) => {
    setMensagem('');
    setRascunho((r) => (['titulo', 'corpo', 'fechamento'].includes(id) ? { ...r, [id]: valor } : { ...r, trechos: { ...r.trechos, [id]: valor } }));
  };
  const valorCampo = (id: Campo) => (['titulo', 'corpo', 'fechamento'].includes(id) ? rascunho[id as 'titulo' | 'corpo' | 'fechamento'] : rascunho.trechos[id] ?? '');
  const inserirVariavel = (nome: string) => {
    const elemento = campos.current[campo];
    const texto = valorCampo(campo);
    const marca = `{{${nome}}}`;
    const inicio = elemento?.selectionStart ?? texto.length;
    const fim = elemento?.selectionEnd ?? texto.length;
    alterarCampo(campo, texto.slice(0, inicio) + marca + texto.slice(fim));
    requestAnimationFrame(() => { elemento?.focus(); elemento?.setSelectionRange(inicio + marca.length, inicio + marca.length); });
  };
  const salvar = async (event: FormEvent) => {
    event.preventDefault(); setSalvando(true); setErro(''); setMensagem('');
    try { await salvarModeloMinuta(tipo, rascunho); setMensagem('Modelo salvo. As próximas minutas de todos os cartórios já usam este texto.'); }
    catch (e) { setErro((e as Error).message); }
    finally { setSalvando(false); }
  };
  const restaurar = async () => {
    if (!window.confirm(`Restaurar o texto original de ${definicao.rotulo}? A versão personalizada será apagada.`)) return;
    setSalvando(true); setErro(''); setMensagem('');
    try { await restaurarModeloPadrao(tipo); setRascunho(MODELOS_PADRAO[tipo]); setMensagem('Texto original restaurado.'); }
    catch (e) { setErro((e as Error).message); }
    finally { setSalvando(false); }
  };
  const propsCampo = (id: Campo) => ({
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => { campos.current[id] = el; },
    value: valorCampo(id),
    onFocus: () => setCampo(id),
    onChange: (e: { target: { value: string } }) => alterarCampo(id, e.target.value),
  });

  return <section className="super-admin-panel">
    <header className="super-admin-header"><div className="super-admin-title"><span><ScrollText /></span><div><p>Área restrita</p><h2>Modelos de minutas</h2><small>Texto padrão usado nas minutas de todos os cartórios.</small></div></div></header>
    <div className="admin-workspace-layout">
      <aside className="admin-section admin-workspace-list">
        <ul>
          {TIPOS_MODELO.map((id) => <li key={id}><button type="button" className={id === tipo ? 'is-selected' : ''} onClick={() => trocarTipo(id)}>
            <span className="admin-list-top"><strong>{DEFINICOES_MODELOS[id].rotulo}</strong>{personalizados[id] ? <span className="role-pill">Personalizado</span> : <span className="status-pill is-cancelled">Original</span>}</span>
            <small>{personalizados[id] ? `Alterado em ${formatarDataHora(personalizados[id]!.atualizadoEm)}` : id === 'textos' ? 'Qualificações e regimes de bens' : 'Texto original do sistema'}</small>
          </button></li>)}
        </ul>
      </aside>

      <form className="admin-section admin-workspace-detail" onSubmit={salvar}>
        <header className="admin-detail-header">
          <div><h3>{definicao.rotulo}</h3><p>{salvo ? `Personalizado em ${formatarDataHora(salvo.atualizadoEm)}` : 'Usando o texto original do sistema'}{alterado ? ' · alterações não salvas' : ''}</p></div>
        </header>
        {definicao.trechos.length > 0 && !definicao.somenteTrechos && <nav className="admin-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'texto'} className={aba === 'texto' ? 'is-active' : ''} onClick={() => { setAba('texto'); setCampo('corpo'); }}><FileText />Texto principal</button>
          <button type="button" role="tab" aria-selected={aba === 'clausulas'} className={aba === 'clausulas' ? 'is-active' : ''} onClick={() => { setAba('clausulas'); setCampo(definicao.trechos[0].id); }}><ListChecks />{definicao.rotuloTrechos}</button>
        </nav>}

        <div className="admin-detail-body admin-contract-form modelos-minuta-form">
          <div className="modelos-variaveis">
            <p>Variáveis{trechoAtivo ? ` de: ${trechoAtivo.rotulo}` : ''}. Clique para inserir no campo selecionado:</p>
            {variaveisDoCampo.length ? <div>{variaveisDoCampo.map((v) => <button key={v.nome} type="button" title={v.descricao} onMouseDown={(e) => e.preventDefault()} onClick={() => inserirVariavel(v.nome)}>{`{{${v.nome}}}`}</button>)}</div>
              : <small>Esta cláusula não usa variáveis.</small>}
            <small>Para um trecho que só aparece quando o dado existir, use <code>{'{{#FILHOS}}'}</code> texto <code>{'{{/FILHOS}}'}</code>. O cabeçalho do cartório e as linhas de assinatura são incluídos automaticamente.{definicao.somenteTrechos ? ' Estes textos valem para todas as minutas que usam a variável.' : ' O texto das qualificações e dos regimes de bens é editado em "Textos das variáveis".'}</small>
          </div>

          {aba === 'texto' ? <>
            <label>Título<input {...propsCampo('titulo')} maxLength={300} /></label>
            <label>Corpo da minuta<textarea {...propsCampo('corpo')} rows={22} spellCheck /></label>
            <label>Fechamento<textarea {...propsCampo('fechamento')} rows={4} spellCheck /></label>
          </> : definicao.trechos.map((t) => <label key={t.id}>{t.rotulo}<textarea {...propsCampo(t.id)} rows={t.variaveis.length > 1 ? 7 : 5} spellCheck /></label>)}

          {avisos.length > 0 && <p className="admin-alert is-warning"><AlertTriangle />Variáveis não reconhecidas (aparecerão como texto na minuta): {avisos.join(' · ')}</p>}
          {erro && <p className="auth-error">{erro}</p>}
          {mensagem && <p className="team-message">{mensagem}</p>}
          <div className="admin-modal-actions modelos-acoes">
            <button type="button" className="admin-action-button is-danger" disabled={!salvo || salvando} onClick={() => void restaurar()}><RotateCcw /> Restaurar original</button>
            <button type="button" className="admin-cancel-button" disabled={!alterado || salvando} onClick={() => { setRascunho(atual); setMensagem(''); }}>Descartar alterações</button>
            <button type="submit" disabled={!alterado || salvando}>{salvando ? 'Salvando...' : 'Salvar modelo'}</button>
          </div>
        </div>
      </form>
    </div>
  </section>;
}
