import { useEffect, useState } from 'react';
import { ESTADOS_CIVIS, ESTADOS_CIVIS_COM_UNIAO_ESTAVEL, REGIMES_BENS, DadosUniaoEstavel } from '../types';
import { TipoDocumento, formatarDocumento, problemaDocumento } from '../utils/documentos';
import { ANO_MINIMO, LimiteData, converterDataAgenda, formatarDataAgenda, mascararData, opcoesCom } from '../utils/campos';

// ---------------------------------------------------------------------------
// Campos reaproveitados pelos formulários: data, CPF/CNPJ e estado civil.
// ---------------------------------------------------------------------------

interface CampoDataProps {
  value: string;
  onChange: (value: string) => void;
  className: string;
  minimo?: LimiteData;
  maximo?: LimiteData;
  disabled?: boolean;
}

// Data fora dos limites não é aceita: o campo volta ao valor anterior e explica o motivo.
export function CampoData({ value, onChange, className, minimo = ANO_MINIMO, maximo, disabled }: CampoDataProps) {
  const [texto, setTexto] = useState(value ? formatarDataAgenda(value) : '');
  const [erro, setErro] = useState('');

  useEffect(() => {
    setTexto(value ? formatarDataAgenda(value) : '');
  }, [value]);

  const problema = (dataIso: string) => {
    if (dataIso < minimo.data) return minimo.mensagem;
    if (maximo && dataIso > maximo.data) return maximo.mensagem;
    return '';
  };

  return (
    <>
      <input
        type="text"
        value={texto}
        onChange={(event) => {
          const novoTexto = mascararData(event.target.value);
          setTexto(novoTexto);
          const dataIso = converterDataAgenda(novoTexto);
          if (!dataIso) {
            setErro(novoTexto.length === 10 ? 'Data inexistente.' : '');
            return;
          }
          const motivo = problema(dataIso);
          setErro(motivo);
          if (!motivo) onChange(dataIso);
        }}
        onBlur={() => {
          const dataIso = converterDataAgenda(texto);
          if (dataIso && !problema(dataIso)) {
            onChange(dataIso);
            setTexto(formatarDataAgenda(dataIso));
          } else if (!texto) {
            setErro('');
            onChange('');
          } else {
            setTexto(value ? formatarDataAgenda(value) : '');
          }
        }}
        className={className}
        placeholder="dd/mm/aaaa"
        inputMode="numeric"
        maxLength={10}
        disabled={disabled}
        aria-invalid={Boolean(erro)}
      />
      {erro && <small className="campo-erro" role="alert">{erro}</small>}
    </>
  );
}

interface CampoDocumentoProps {
  value: string;
  tipo: TipoDocumento;
  onChange: (value: string) => void;
  className: string;
}

export function CampoDocumento({ value, tipo, onChange, className }: CampoDocumentoProps) {
  const [saiuDoCampo, setSaiuDoCampo] = useState(false);
  const erro = problemaDocumento(value, tipo, saiuDoCampo);
  return (
    <>
      <input
        type="text"
        inputMode={tipo === 'CPF' ? 'numeric' : 'text'}
        value={value}
        onChange={(e) => { setSaiuDoCampo(false); onChange(formatarDocumento(e.target.value, tipo)); }}
        onBlur={() => setSaiuDoCampo(true)}
        className={className}
        placeholder={tipo === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
        maxLength={18}
        aria-invalid={Boolean(erro)}
      />
      {erro && <small className="campo-erro" role="alert">{erro}</small>}
    </>
  );
}

interface CampoEstadoCivilProps extends DadosUniaoEstavel {
  estadoCivil: string;
  onChange: (campo: 'estadoCivil' | 'uniaoEstavel' | 'regimeUniao', valor: string) => void;
  className: string;
  labelClassName: string;
  // Na própria declaração de união estável a pergunta não faz sentido.
  perguntarUniaoEstavel?: boolean;
  opcoes?: string[];
}

// Estado civil e, para quem não é casado, se convive em união estável e em qual regime.
export function CampoEstadoCivil({ estadoCivil, uniaoEstavel, regimeUniao, onChange, className, labelClassName, perguntarUniaoEstavel = true, opcoes = ESTADOS_CIVIS }: CampoEstadoCivilProps) {
  const podeTerUniao = perguntarUniaoEstavel && ESTADOS_CIVIS_COM_UNIAO_ESTAVEL.includes(estadoCivil);
  return (
    <>
      <div>
        <label className={labelClassName}>Estado Civil</label>
        <select value={estadoCivil} onChange={(e) => onChange('estadoCivil', e.target.value)} className={className}>
          <option value="">Selecione o estado civil</option>
          {opcoesCom(opcoes, estadoCivil).map((estado) => <option key={estado} value={estado}>{estado}</option>)}
        </select>
      </div>
      {podeTerUniao && (
        <div>
          <label className={labelClassName}>Convive em união estável?</label>
          <select value={uniaoEstavel ?? ''} onChange={(e) => onChange('uniaoEstavel', e.target.value)} className={className}>
            <option value="">Não informado</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
      )}
      {podeTerUniao && uniaoEstavel === 'sim' && (
        <div>
          <label className={labelClassName}>Regime de bens da união estável</label>
          <select value={regimeUniao ?? ''} onChange={(e) => onChange('regimeUniao', e.target.value)} className={className}>
            <option value="">Selecione o regime</option>
            {opcoesCom(REGIMES_BENS, regimeUniao).map((regime) => <option key={regime} value={regime}>{regime}</option>)}
          </select>
        </div>
      )}
    </>
  );
}
