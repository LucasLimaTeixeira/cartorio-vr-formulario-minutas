import { useState } from 'react';
import { FilePlus2, FolderOpen, Trash2 } from 'lucide-react';
import type { ControleAtendimento, StatusAtendimento } from '../utils/atendimentos';

const textoStatus: Record<StatusAtendimento, string> = {
  novo: 'Novo atendimento · será salvo ao preencher',
  pendente: 'Alterações ainda não salvas',
  salvando: 'Salvando...',
  salvo: 'Salvo no cartório',
  erro: 'Não foi possível salvar. Verifique a conexão; o sistema tenta de novo na próxima alteração.',
  consulta: 'Perfil de consulta: as alterações não são salvas',
};

const formatarHora = (valor: string) => new Date(valor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function BarraAtendimento({ controle, cliente }: { controle: ControleAtendimento; cliente: string }) {
  const [erro, setErro] = useState('');
  const outros = controle.lista.filter((a) => a.id !== controle.id);
  const executar = (acao: () => Promise<void>) => { setErro(''); void acao().catch((e: Error) => setErro(e.message)); };
  const encerrar = () => {
    const nome = cliente || 'este atendimento';
    if (!window.confirm(`Encerrar ${nome}? Os dados preenchidos serão apagados do sistema. Gere e imprima a minuta antes, se ainda precisar dela.`)) return;
    executar(controle.encerrar);
  };

  return <div className={`atendimento-bar is-${controle.status} print:hidden`}>
    <div className="atendimento-atual">
      <span>Atendimento em edição</span>
      <strong>{cliente || 'Cliente não informado'}</strong>
      <small role="status">{textoStatus[controle.status]}</small>
      {erro && <small className="atendimento-erro">{erro}</small>}
    </div>
    <div className="atendimento-acoes">
      <label className="atendimento-abrir">
        <FolderOpen aria-hidden />
        <select value="" aria-label="Abrir outro atendimento" onFocus={() => void controle.recarregar()} onChange={(e) => { if (e.target.value) executar(() => controle.abrir(e.target.value)); }}>
          <option value="">{outros.length ? `Abrir outro atendimento (${outros.length})` : 'Nenhum outro atendimento em aberto'}</option>
          {outros.map((a) => <option key={a.id} value={a.id}>{a.titulo || 'Cliente não informado'} · {formatarHora(a.atualizadoEm)}{a.atualizadoPor ? ` · ${a.atualizadoPor}` : ''}</option>)}
        </select>
      </label>
      <button type="button" className="atendimento-botao" onClick={() => executar(controle.novo)}><FilePlus2 aria-hidden /> Novo atendimento</button>
      {controle.status !== 'consulta' && <button type="button" className="atendimento-botao is-danger" onClick={encerrar}><Trash2 aria-hidden /> Encerrar</button>}
    </div>
  </div>;
}
