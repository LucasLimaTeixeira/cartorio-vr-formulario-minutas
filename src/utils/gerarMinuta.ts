import {
  Pessoa,
  Testemunha,
  Requerente,
  FormularioProcuracao,
  FormularioApostilamento,
  FormularioCertidao,
  FormularioUniaoEstavel,
  FormularioPactoAntenupcial,
} from '../types';
import { workspaceProfile } from './workspaceStorage';
import { TipoMinuta, modeloMinuta, preencherModelo } from './modelosMinuta';

// ---------------------------------------------------------------------------
// Dados do cartório
//
// Os dados de cada cartório vêm do workspace autenticado. Enquanto não forem
// configurados, apenas o nome do workspace aparece no cabeçalho.
// ---------------------------------------------------------------------------
const nomeCartorio = () => workspaceProfile.workspaceName;
const enderecoCartorio = () => workspaceProfile.cartorioEndereco;
const tabeliaoCartorio = () => workspaceProfile.cartorioTabeliao;
const cidadeCartorio = () => workspaceProfile.cartorioCidade || '[cidade/UF]';

export interface MinutaGerada {
  cabecalho: string[];
  titulo: string;
  corpo: string;
  fechamento: string;
  assinantes: string[];
  textoCompleto: string;
}

// ---------------------------------------------------------------------------
// Helpers gerais
// ---------------------------------------------------------------------------

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function formatarDataExtenso(dataISO?: string): string {
  if (!dataISO) return '____/____/______';
  const partes = dataISO.split('-').map(Number);
  const [ano, mes, dia] = partes;
  if (!ano || !mes || !dia) return dataISO;
  return `${String(dia).padStart(2, '0')} de ${MESES[mes - 1]} de ${ano}`;
}

export function dataAtualExtenso(): string {
  const hoje = new Date();
  return `${String(hoje.getDate()).padStart(2, '0')} de ${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`;
}

function juntarComE(itens: string[]): string {
  const validos = itens.filter(Boolean);
  if (validos.length === 0) return '';
  if (validos.length === 1) return validos[0];
  return `${validos.slice(0, -1).join('; ')}; e ${validos[validos.length - 1]}`;
}

function paragrafos(itens: string[]): string {
  return itens.map((item) => `${item}.`).join('\n\n');
}

function dataOuNaoInformado(dataISO?: string): string {
  return dataISO ? formatarDataExtenso(dataISO) : '[não informado]';
}

function entrega(dataISO?: string, horario?: string): string {
  return `${dataOuNaoInformado(dataISO)}${horario ? `, às ${horario}` : ''}`;
}

// Título, corpo e fechamento vêm do modelo do tipo (padrão ou personalizado pelo Super Admin).
function montarMinuta(tipo: TipoMinuta, valores: Record<string, string>, assinantes: string[]): MinutaGerada {
  const modelo = modeloMinuta(tipo);
  const todos = {
    DATA_EXTENSO: dataAtualExtenso(),
    CIDADE: cidadeCartorio(),
    CARTORIO: nomeCartorio() || '',
    TABELIAO: tabeliaoCartorio() || '',
    ENDERECO_CARTORIO: enderecoCartorio() || '',
    ...valores,
  };
  const cabecalho = [nomeCartorio(), enderecoCartorio(), tabeliaoCartorio()].filter(
    (linha): linha is string => Boolean(linha)
  );
  const titulo = preencherModelo(modelo.titulo, todos);
  const corpo = preencherModelo(modelo.corpo, todos);
  const fechamento = preencherModelo(modelo.fechamento, todos);
  const blocoAssinaturas = assinantes
    .map((nome) => `_______________________________________________\n${nome || '(nome não informado)'}`)
    .join('\n\n');

  const textoCompleto = [cabecalho.join('\n'), titulo, corpo, fechamento, blocoAssinaturas]
    .filter((bloco) => bloco && bloco.trim().length > 0)
    .join('\n\n');

  return { cabecalho, titulo, corpo, fechamento, assinantes, textoCompleto };
}

// ---------------------------------------------------------------------------
// Qualificação de pessoas
// ---------------------------------------------------------------------------

// O texto de cada qualificação é editável em "Textos das variáveis" (modelo 'textos').
const textoVariavel = (id: string, valores: Record<string, string>) => preencherModelo(modeloMinuta('textos').trechos[id], valores);

function valoresDocumentoIdentidade(p: { nome?: string; rg: string; orgaoExpedidor: string; dataExpedicaoRg: string; endereco: string; telefone?: string; profissao: string; estadoCivil: string }) {
  return {
    NOME: p.nome?.trim() || '[NOME NÃO INFORMADO]',
    ESTADO_CIVIL: p.estadoCivil || '',
    PROFISSAO: p.profissao || '',
    RG: p.rg || '[não informado]',
    ORGAO_EXPEDIDOR: p.orgaoExpedidor || '',
    DATA_EXPEDICAO: p.dataExpedicaoRg ? formatarDataExtenso(p.dataExpedicaoRg) : '',
    ENDERECO: p.endereco || '[endereço não informado]',
    TELEFONE: p.telefone || '',
  };
}

export function qualificacaoPessoa(p: Pessoa): string {
  if (p.tipoDocumento === 'CNPJ') {
    return textoVariavel('QUALIFICACAO_PJ', {
      NOME: p.nome?.trim() || '[NOME NÃO INFORMADO]',
      CNPJ: p.documento || '[CNPJ não informado]',
      ENDERECO: p.endereco || '[endereço não informado]',
    });
  }
  return textoVariavel('QUALIFICACAO_PESSOA', { ...valoresDocumentoIdentidade(p), NACIONALIDADE: p.nacionalidade || '', CPF: p.documento || '[não informado]' });
}

export function qualificacaoTestemunha(t: Testemunha): string {
  return textoVariavel('QUALIFICACAO_TESTEMUNHA', { ...valoresDocumentoIdentidade(t), NACIONALIDADE: t.nacionalidade || '', CPF: t.documento || '[não informado]' });
}

export function qualificacaoRequerente(r: Requerente): string {
  return textoVariavel('QUALIFICACAO_REQUERENTE', { ...valoresDocumentoIdentidade(r), CPF: r.cpf || '[não informado]', EMAIL: r.email || '' });
}

// ---------------------------------------------------------------------------
// Cláusulas de poderes (Procuração)
//
// O texto de cada cláusula é um trecho do modelo de procuração, editável na
// aba "Modelos de Minutas" (ver MODELOS_PADRAO em modelosMinuta.ts).
// ---------------------------------------------------------------------------

function clausulasPoderes(f: FormularioProcuracao): string[] {
  const trechos = modeloMinuta('procuracao').trechos;
  const clausulas: string[] = [];
  const trecho = (id: string, valores: Record<string, string> = {}) => clausulas.push(preencherModelo(trechos[id], valores));
  const numero = (lista: unknown[], idx: number, item: string) => (lista.length > 1 ? ` (${item} ${idx + 1})` : '');

  if (f.poderesOutorgados.includes('BANCÁRIA')) {
    const contas = f.dadosBancarios
      .map((b) =>
        [
          b.banco && `Banco: ${b.banco}`,
          b.agencia && `Agência: ${b.agencia}`,
          b.conta && `Conta: ${b.conta}`,
          b.numeroBeneficio && `Benefício vinculado nº: ${b.numeroBeneficio}`,
        ]
          .filter(Boolean)
          .join(' — ')
      )
      .filter(Boolean);
    trecho('BANCARIA', { CONTAS: contas.join('; ') });
  }

  if (f.poderesOutorgados.includes('INSS')) trecho('INSS');
  if (f.poderesOutorgados.includes('FARMÁCIA')) trecho('FARMACIA');
  if (f.poderesOutorgados.includes('ÓRGÃOS PÚBLICOS')) trecho('ORGAOS_PUBLICOS');
  if (f.poderesOutorgados.includes('CBS')) trecho('CBS');
  if (f.poderesOutorgados.includes('PREFEITURAS')) trecho('PREFEITURAS');

  if (f.poderesOutorgados.includes('COMPRA OU VENDA DE IMÓVEL')) {
    f.dadosImovel.forEach((im, idx) => {
      trecho('COMPRA_VENDA_IMOVEL', {
        NUMERO: numero(f.dadosImovel, idx, 'imóvel'),
        VERBO: im.tipoTransacao === 'compra' ? 'comprar' : 'vender',
        EXTENSAO: im.tipoVenda === 'total' ? 'a totalidade' : 'a fração mínima ideal',
        VALOR: im.valorTransacao || '[valor não informado]',
        PAGAMENTO: im.formaPagamento === 'vista' ? 'à vista' : 'de forma financiada',
        IMOVEL: im.dadosImovel || '[dados do imóvel não informados]',
      });
    });
  }

  if (f.poderesOutorgados.includes('ADMINISTRAÇÃO DE IMÓVEL')) {
    f.dadosAdministracaoImovel.forEach((im, idx) => {
      trecho('ADMINISTRACAO_IMOVEL', {
        NUMERO: numero(f.dadosAdministracaoImovel, idx, 'imóvel'),
        IMOVEL: im.dadosImovel || '[dados do imóvel não informados]',
      });
    });
  }

  if (f.poderesOutorgados.includes('SEGURADORA/REMOÇÃO DO PÁTIO')) {
    f.dadosVeiculo.forEach((v, idx) => {
      const detalhes = [
        v.marcaModelo && `Marca/Modelo: ${v.marcaModelo}`,
        v.placa && `Placa: ${v.placa}`,
        v.renavam && `RENAVAM: ${v.renavam}`,
        v.chassi && `Chassi: ${v.chassi}`,
        v.especieTipo && `Espécie/Tipo: ${v.especieTipo}`,
        (v.anoFabricacao || v.anoModelo) && `Ano Fab./Modelo: ${v.anoFabricacao || '—'}/${v.anoModelo || '—'}`,
        v.enderecoNomePatio && `Pátio: ${v.enderecoNomePatio}`,
      ]
        .filter(Boolean)
        .join(' — ');
      trecho('SEGURADORA_PATIO', {
        NUMERO: numero(f.dadosVeiculo, idx, 'veículo'),
        VEICULO: detalhes || '[dados do veículo não informados]',
      });
    });
  }

  if (f.poderesOutorgados.includes('AD JUDICIA')) trecho('AD_JUDICIA');

  if (f.poderesOutorgados.includes('OUTROS PODERES ESPECIFICOS')) {
    const validos = f.outros.filter((o) => o.outros && o.outros.trim().length > 0);
    validos.forEach((o, idx) => {
      trecho('OUTROS', { NUMERO: validos.length > 1 ? ` ${idx + 1}` : '', TEXTO: o.outros });
    });
  }

  return clausulas;
}

// ---------------------------------------------------------------------------
// Geradores de minuta por tipo de formulário
// ---------------------------------------------------------------------------

function qualificacaoNumerada(pessoas: Pessoa[]): string {
  return juntarComE(pessoas.map((p, i) => `${pessoas.length > 1 ? `${i + 1}) ` : ''}${qualificacaoPessoa(p)}`));
}

export function gerarMinutaProcuracao(f: FormularioProcuracao): MinutaGerada {
  const clausulas = clausulasPoderes(f);
  const assinantes = [
    ...f.outorgantes.map((o) => o.nome || 'Outorgante'),
    ...f.testemunhas.map((t) => t.nome || 'Testemunha'),
  ];

  return montarMinuta('procuracao', {
    OUTORGANTES: qualificacaoNumerada(f.outorgantes),
    OUTORGADOS: qualificacaoNumerada(f.outorgados),
    PODERES: clausulas.length > 0 ? clausulas.join('\n\n') : '[Nenhum poder foi selecionado no formulário.]',
    TESTEMUNHAS: paragrafos(f.testemunhas.map(qualificacaoTestemunha)),
  }, assinantes);
}

export function gerarMinutaApostilamento(f: FormularioApostilamento): MinutaGerada {
  return montarMinuta('apostilamento', {
    REQUERENTES: paragrafos(f.requerentes.map(qualificacaoRequerente)),
    PAIS_DESTINO: f.paisDestino || '[não informado]',
    QUANTIDADE_DOCUMENTOS: f.quantidadeDocumentos || '[não informado]',
    DOCUMENTOS: f.quaisDocumentos || '[não informado]',
    ASSINATURA: f.assinaturaApostilada || '[não informado]',
    ENTREGA: entrega(f.dataEntrega, f.horarioEntrega),
  }, f.requerentes.map((r) => r.nome || 'Requerente'));
}

const TIPO_CERTIDAO_LABEL: Record<string, string> = {
  procuracao: 'Procuração',
  escritura: 'Escritura',
  testamento: 'Testamento',
  '': '[não informado]',
};

export function gerarMinutaCertidao(f: FormularioCertidao): MinutaGerada {
  return montarMinuta('certidoes', {
    REQUERENTES: paragrafos(f.requerentes.map(qualificacaoRequerente)),
    TIPO_CERTIDAO: TIPO_CERTIDAO_LABEL[f.tipoCertidao] ?? f.tipoCertidao,
    TESTAMENTO: f.tipoCertidao === 'testamento' ? 'sim' : '',
    OUTORGANTES: f.nomeOutorgantes || '[não informado]',
    OUTORGADOS: f.nomeOutorgados || '[não informado]',
    LIVRO: f.livro || '[não informado]',
    FOLHA: f.folha || '[não informado]',
    DATA_ATO: dataOuNaoInformado(f.data),
    FINALIDADE: f.finalidade || '[não informado]',
    ENTREGA: entrega(f.dataEntrega, f.horarioEntrega),
  }, f.requerentes.map((r) => r.nome || 'Requerente'));
}


// ---------------------------------------------------------------------------
// Regimes de bens (compartilhado entre União Estável e Pacto Antenupcial)
// ---------------------------------------------------------------------------

function textoRegimeBens(regime: string, contexto: 'casamento' | 'uniao'): string {
  const palavras =
    contexto === 'casamento'
      ? { PESSOA: 'cônjuge', PESSOAS: 'cônjuges', VINCULO: 'casamento', CASAR: 'casar' }
      : { PESSOA: 'companheiro(a)', PESSOAS: 'companheiros', VINCULO: 'união', CASAR: 'iniciar a união' };
  const trechos: Record<string, string> = {
    'Comunhão Parcial de Bens': 'REGIME_PARCIAL',
    'Comunhão Universal de Bens': 'REGIME_UNIVERSAL',
    'Separação Total de Bens': 'REGIME_SEPARACAO',
    'Participação Final nos Aquestos': 'REGIME_AQUESTOS',
  };
  return trechos[regime] ? textoVariavel(trechos[regime], palavras) : regime || '[regime de bens não informado]';
}

// ---------------------------------------------------------------------------
// Declaratória de União Estável
// ---------------------------------------------------------------------------

export function gerarMinutaUniaoEstavel(f: FormularioUniaoEstavel): MinutaGerada {
  const assinantes = [
    ...f.companheiros.map((c) => c.nome || 'Declarante'),
    ...f.testemunhas.map((t) => t.nome || 'Testemunha'),
  ];

  return montarMinuta('uniao_estavel', {
    DECLARANTES: qualificacaoNumerada(f.companheiros),
    DATA_INICIO: f.dataInicioUniao ? formatarDataExtenso(f.dataInicioUniao) : '[data não informada]',
    ENDERECO_COMUM: f.enderecoComum || '[endereço não informado]',
    REGIME_BENS: textoRegimeBens(f.regimeBens, 'uniao'),
    FILHOS: f.filhos?.trim() ?? '',
    TESTEMUNHAS: paragrafos(f.testemunhas.map(qualificacaoTestemunha)),
  }, assinantes);
}

// ---------------------------------------------------------------------------
// Pacto Antenupcial
// ---------------------------------------------------------------------------

export function gerarMinutaPactoAntenupcial(f: FormularioPactoAntenupcial): MinutaGerada {
  const assinantes = [
    ...f.nubentes.map((n) => n.nome || 'Nubente'),
    ...f.testemunhas.map((t) => t.nome || 'Testemunha'),
  ];

  return montarMinuta('pacto_antenupcial', {
    NUBENTES: qualificacaoNumerada(f.nubentes),
    DATA_CASAMENTO: f.dataPrevistaCasamento ? formatarDataExtenso(f.dataPrevistaCasamento) : '',
    REGIME_BENS: textoRegimeBens(f.regimeBens, 'casamento'),
    BENS_PARTICULARES: f.bensParticulares?.trim() ?? '',
    CLAUSULAS_ESPECIFICAS: f.clausulasEspecificas?.trim() ?? '',
    TESTEMUNHAS: paragrafos(f.testemunhas.map(qualificacaoTestemunha)),
  }, assinantes);
}
