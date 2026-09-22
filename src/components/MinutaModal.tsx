import React, { useMemo, useState } from 'react';
import { ArrowLeft, Printer, Copy, Check } from 'lucide-react';
import {
  FormularioProcuracao,
  FormularioApostilamento,
  FormularioCertidao,
  FormularioUniaoEstavel,
  FormularioPactoAntenupcial,
} from '../types';
import {
  gerarMinutaProcuracao,
  gerarMinutaApostilamento,
  gerarMinutaCertidao,
  gerarMinutaUniaoEstavel,
  gerarMinutaPactoAntenupcial,
  MinutaGerada,
} from '../utils/gerarMinuta';
import { loadWorkspaceState } from '../utils/workspaceStorage';
import type { MinutaModels } from './MinutaModelsEditor';

export type TipoMinuta =
  | 'procuracao'
  | 'apostilamento'
  | 'certidoes'
  | 'uniao_estavel'
  | 'pacto_antenupcial';

interface MinutaModalProps {
  tipo: TipoMinuta;
  formulario: FormularioProcuracao;
  formularioApostilamento: FormularioApostilamento;
  formularioCertidao: FormularioCertidao;
  formularioUniaoEstavel: FormularioUniaoEstavel;
  formularioPactoAntenupcial: FormularioPactoAntenupcial;
  onVoltar: () => void;
}

function dividirParagrafos(texto: string): string[] {
  return texto.split('\n\n').filter((p) => p.trim().length > 0);
}

function ehRotulo(paragrafo: string): boolean {
  const linhas = paragrafo.split('\n');
  return linhas.length === 1 && linhas[0].trim().length < 45 && linhas[0].trim().endsWith(':');
}

function renderizarLinhas(paragrafo: string) {
  const linhas = paragrafo.split('\n');
  return linhas.map((linha, i) => (
    <React.Fragment key={i}>
      {linha}
      {i < linhas.length - 1 && <br />}
    </React.Fragment>
  ));
}

export function MinutaModal({
  tipo,
  formulario,
  formularioApostilamento,
  formularioCertidao,
  formularioUniaoEstavel,
  formularioPactoAntenupcial,
  onVoltar,
}: MinutaModalProps) {
  const [copiado, setCopiado] = useState(false);

  const minutaBase: MinutaGerada = useMemo(() => {
    if (tipo === 'procuracao') return gerarMinutaProcuracao(formulario);
    if (tipo === 'apostilamento') return gerarMinutaApostilamento(formularioApostilamento);
    if (tipo === 'certidoes') return gerarMinutaCertidao(formularioCertidao);
    if (tipo === 'uniao_estavel') return gerarMinutaUniaoEstavel(formularioUniaoEstavel);
    return gerarMinutaPactoAntenupcial(formularioPactoAntenupcial);
  }, [
    tipo,
    formulario,
    formularioApostilamento,
    formularioCertidao,
    formularioUniaoEstavel,
    formularioPactoAntenupcial,
  ]);

  const minuta: MinutaGerada = useMemo(() => {
    const modelos = loadWorkspaceState<MinutaModels>('modelos-minuta', {});
    const modelo = modelos[tipo];
    if (!modelo) return minutaBase;
    const corpo = modelo.replaceAll('[CORPO_GERADO]', minutaBase.corpo);
    return { ...minutaBase, corpo, textoCompleto: [minutaBase.cabecalho.join('\n'), minutaBase.titulo, corpo, minutaBase.fechamento, minutaBase.assinantes.join('\n')].filter(Boolean).join('\n\n') };
  }, [minutaBase, tipo]);

  const paragrafosCorpo = useMemo(() => dividirParagrafos(minuta.corpo), [minuta.corpo]);
  const paragrafosFechamento = useMemo(() => dividirParagrafos(minuta.fechamento), [minuta.fechamento]);

  const copiarTexto = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(minuta.textoCompleto);
      } else {
        throw new Error('Clipboard API indisponível');
      }
    } catch {
      const area = document.createElement('textarea');
      area.value = minuta.textoCompleto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      try {
        document.execCommand('copy');
      } catch {
        // Sem mais fallback razoável se isso também falhar.
      }
      document.body.removeChild(area);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100 minuta-tela">
      {/* Barra de ferramentas — não aparece na impressão */}
      <div className="max-w-4xl mx-auto px-4 py-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg shadow px-4 py-3">
          <button
            onClick={onVoltar}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Formulário
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={copiarTexto}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copiado ? 'Copiado!' : 'Copiar Texto'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir Minuta
            </button>
          </div>
        </div>
      </div>

      {/* "Papel" do documento */}
      <div className="max-w-4xl mx-auto px-4 pb-16 print:p-0 print:max-w-none">
        <div className="minuta-papel bg-white shadow-lg px-10 py-14 sm:px-16 sm:py-20 print:shadow-none print:px-0 print:py-0">
          <div className="minuta-cabecalho-bloco">
            {minuta.cabecalho.map((linha, i) => (
              <p key={i} className={i === 0 ? 'minuta-cartorio-nome' : 'minuta-cartorio-info'}>
                {linha}
              </p>
            ))}
          </div>

          <h2 className="minuta-titulo">{minuta.titulo}</h2>

          {paragrafosCorpo.map((paragrafo, i) => (
            <p key={`corpo-${i}`} className={ehRotulo(paragrafo) ? 'minuta-rotulo' : 'minuta-paragrafo'}>
              {renderizarLinhas(paragrafo)}
            </p>
          ))}

          {paragrafosFechamento.map((paragrafo, i) => (
            <p key={`fechamento-${i}`} className="minuta-paragrafo minuta-fechamento">
              {renderizarLinhas(paragrafo)}
            </p>
          ))}

          <div className="minuta-assinaturas">
            {minuta.assinantes.map((nome, i) => (
              <div key={i} className="minuta-linha-assinatura">
                <div className="minuta-linha" />
                <p>{nome || '(nome não informado)'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .minuta-papel {
          font-family: Georgia, 'Times New Roman', Times, serif;
          color: #1a1a1a;
        }
        .minuta-cartorio-nome {
          text-align: center;
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 0.15em;
        }
        .minuta-cartorio-info {
          text-align: center;
          font-size: 0.85rem;
          color: #444;
          margin-bottom: 0.15em;
        }
        .minuta-titulo {
          text-align: center;
          font-weight: 700;
          font-size: 1.2rem;
          letter-spacing: 0.06em;
          margin: 1.8em 0 1.6em;
          text-transform: uppercase;
        }
        .minuta-paragrafo {
          text-align: justify;
          line-height: 1.85;
          font-size: 0.98rem;
          margin-bottom: 1.15em;
          text-indent: 1.5em;
        }
        .minuta-rotulo {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin: 1.8em 0 0.7em;
          text-indent: 0;
          text-align: left;
          font-size: 0.9rem;
        }
        .minuta-fechamento {
          margin-top: 1.8em;
        }
        .minuta-assinaturas {
          margin-top: 3.5em;
          display: flex;
          flex-direction: column;
          gap: 2.5em;
        }
        .minuta-linha-assinatura {
          text-align: center;
          max-width: 380px;
          margin: 0 auto;
        }
        .minuta-linha {
          border-bottom: 1px solid #1a1a1a;
          height: 2.6em;
        }
        .minuta-linha-assinatura p {
          margin-top: 0.5em;
          font-size: 0.9rem;
        }
        @media print {
          @page {
            size: A4;
            margin: 2.5cm 2cm;
          }
          html, body {
            background: white !important;
          }
          .minuta-tela {
            background: white !important;
          }
          .minuta-paragrafo, .minuta-rotulo, .minuta-linha-assinatura {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
