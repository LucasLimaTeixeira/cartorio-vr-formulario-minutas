import { useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Modelos de minuta
//
// O texto padrão de cada minuta é um modelo com variáveis no formato {{NOME}}.
// Trechos entre {{#NOME}} e {{/NOME}} só aparecem quando a variável tem valor.
// O Super Admin pode substituir qualquer modelo pela aba "Modelos de Minutas";
// o que não foi personalizado continua usando o texto definido aqui.
// ---------------------------------------------------------------------------

export type TipoMinuta = 'procuracao' | 'apostilamento' | 'certidoes' | 'uniao_estavel' | 'pacto_antenupcial';
// 'textos' guarda o texto gerado pelas variáveis compartilhadas (qualificações, regimes de bens).
export type TipoModeloMinuta = TipoMinuta | 'textos';

export interface ModeloMinuta {
  titulo: string;
  corpo: string;
  fechamento: string;
  trechos: Record<string, string>;
}

export interface VariavelModelo {
  nome: string;
  descricao: string;
}

export interface TrechoModelo {
  id: string;
  rotulo: string;
  variaveis: VariavelModelo[];
}

export interface DefinicaoModelo {
  rotulo: string;
  variaveis: VariavelModelo[];
  trechos: TrechoModelo[];
  rotuloTrechos?: string;
  // Sem título, corpo e fechamento: só os trechos são editáveis.
  somenteTrechos?: boolean;
}

const variaveisGerais: VariavelModelo[] = [
  { nome: 'DATA_EXTENSO', descricao: 'Data de hoje por extenso' },
  { nome: 'CIDADE', descricao: 'Cidade do cartório' },
  { nome: 'CARTORIO', descricao: 'Nome do cartório' },
  { nome: 'TABELIAO', descricao: 'Tabelião responsável' },
  { nome: 'ENDERECO_CARTORIO', descricao: 'Endereço do cartório' },
];

const variavelTestemunhas: VariavelModelo = { nome: 'TESTEMUNHAS', descricao: 'Qualificação das testemunhas (vazio se não houver)' };
const variavelRequerentes: VariavelModelo = { nome: 'REQUERENTES', descricao: 'Qualificação dos requerentes' };
const variavelEntrega: VariavelModelo = { nome: 'ENTREGA', descricao: 'Data e horário previstos para entrega' };
const variaveisQualificacao: VariavelModelo[] = [
  { nome: 'NOME', descricao: 'Nome' },
  { nome: 'NACIONALIDADE', descricao: 'Nacionalidade (vazio se não informada)' },
  { nome: 'ESTADO_CIVIL', descricao: 'Estado civil (vazio se não informado)' },
  { nome: 'PROFISSAO', descricao: 'Profissão (vazio se não informada)' },
  { nome: 'RG', descricao: 'Número do RG' },
  { nome: 'ORGAO_EXPEDIDOR', descricao: 'Órgão expedidor do RG (vazio se não informado)' },
  { nome: 'DATA_EXPEDICAO', descricao: 'Data de expedição do RG por extenso (vazio se não informada)' },
  { nome: 'CPF', descricao: 'CPF' },
  { nome: 'ENDERECO', descricao: 'Endereço' },
  { nome: 'TELEFONE', descricao: 'Telefone (vazio se não informado)' },
];
const variaveisRegime: VariavelModelo[] = [
  { nome: 'PESSOA', descricao: '"cônjuge" no pacto ou "companheiro(a)" na união estável' },
  { nome: 'PESSOAS', descricao: '"cônjuges" ou "companheiros"' },
  { nome: 'VINCULO', descricao: '"casamento" ou "união"' },
  { nome: 'CASAR', descricao: '"casar" ou "iniciar a união"' },
];
const variavelNumero = (item: string): VariavelModelo => ({ nome: 'NUMERO', descricao: `Numeração quando há mais de um ${item}, ex.: " (${item} 2)"` });

export const DEFINICOES_MODELOS: Record<TipoModeloMinuta, DefinicaoModelo> = {
  procuracao: {
    rotulo: 'Procuração',
    variaveis: [
      ...variaveisGerais,
      { nome: 'OUTORGANTES', descricao: 'Qualificação dos outorgantes' },
      { nome: 'OUTORGADOS', descricao: 'Qualificação dos outorgados' },
      { nome: 'PODERES', descricao: 'Cláusulas dos poderes marcados no formulário' },
      variavelTestemunhas,
    ],
    trechos: [
      { id: 'BANCARIA', rotulo: 'Bancária', variaveis: [{ nome: 'CONTAS', descricao: 'Bancos, agências e contas informados' }] },
      { id: 'INSS', rotulo: 'INSS', variaveis: [] },
      { id: 'FARMACIA', rotulo: 'Farmácia', variaveis: [] },
      { id: 'ORGAOS_PUBLICOS', rotulo: 'Órgãos públicos', variaveis: [] },
      { id: 'CBS', rotulo: 'CBS', variaveis: [] },
      { id: 'PREFEITURAS', rotulo: 'Prefeituras', variaveis: [] },
      {
        id: 'COMPRA_VENDA_IMOVEL',
        rotulo: 'Compra ou venda de imóvel',
        variaveis: [
          variavelNumero('imóvel'),
          { nome: 'VERBO', descricao: '"comprar" ou "vender"' },
          { nome: 'EXTENSAO', descricao: '"a totalidade" ou "a fração mínima ideal"' },
          { nome: 'VALOR', descricao: 'Valor da transação' },
          { nome: 'PAGAMENTO', descricao: '"à vista" ou "de forma financiada"' },
          { nome: 'IMOVEL', descricao: 'Dados do imóvel' },
        ],
      },
      { id: 'ADMINISTRACAO_IMOVEL', rotulo: 'Administração de imóvel', variaveis: [variavelNumero('imóvel'), { nome: 'IMOVEL', descricao: 'Dados do imóvel' }] },
      { id: 'SEGURADORA_PATIO', rotulo: 'Seguradora/remoção do pátio', variaveis: [variavelNumero('veículo'), { nome: 'VEICULO', descricao: 'Dados do veículo' }] },
      { id: 'AD_JUDICIA', rotulo: 'Ad judicia', variaveis: [] },
      { id: 'OUTROS', rotulo: 'Outros poderes específicos', variaveis: [{ nome: 'NUMERO', descricao: 'Numeração quando há mais de um, ex.: " 2"' }, { nome: 'TEXTO', descricao: 'Texto digitado no formulário' }] },
    ],
    rotuloTrechos: 'Cláusulas de poderes',
  },
  apostilamento: {
    rotulo: 'Apostilamento',
    variaveis: [
      ...variaveisGerais,
      variavelRequerentes,
      { nome: 'PAIS_DESTINO', descricao: 'País de destino' },
      { nome: 'QUANTIDADE_DOCUMENTOS', descricao: 'Quantidade de documentos' },
      { nome: 'DOCUMENTOS', descricao: 'Documentos a apostilar' },
      { nome: 'ASSINATURA', descricao: 'Assinatura a ser apostilada' },
      variavelEntrega,
    ],
    trechos: [],
  },
  certidoes: {
    rotulo: 'Certidões',
    variaveis: [
      ...variaveisGerais,
      variavelRequerentes,
      { nome: 'TIPO_CERTIDAO', descricao: 'Procuração, Escritura ou Testamento' },
      { nome: 'TESTAMENTO', descricao: 'Preenchida só em certidão de testamento (use como condição)' },
      { nome: 'OUTORGANTES', descricao: 'Nome dos outorgantes do ato' },
      { nome: 'OUTORGADOS', descricao: 'Nome dos outorgados do ato' },
      { nome: 'LIVRO', descricao: 'Livro' },
      { nome: 'FOLHA', descricao: 'Folha' },
      { nome: 'DATA_ATO', descricao: 'Data do ato por extenso' },
      { nome: 'FINALIDADE', descricao: 'Finalidade da certidão' },
      variavelEntrega,
    ],
    trechos: [],
  },
  uniao_estavel: {
    rotulo: 'União estável',
    variaveis: [
      ...variaveisGerais,
      { nome: 'DECLARANTES', descricao: 'Qualificação dos companheiros' },
      { nome: 'DATA_INICIO', descricao: 'Início da união por extenso' },
      { nome: 'ENDERECO_COMUM', descricao: 'Endereço em comum' },
      { nome: 'REGIME_BENS', descricao: 'Regime de bens com a descrição legal' },
      { nome: 'FILHOS', descricao: 'Filhos informados (vazio se não houver)' },
      variavelTestemunhas,
    ],
    trechos: [],
  },
  pacto_antenupcial: {
    rotulo: 'Pacto antenupcial',
    variaveis: [
      ...variaveisGerais,
      { nome: 'NUBENTES', descricao: 'Qualificação dos nubentes' },
      { nome: 'DATA_CASAMENTO', descricao: 'Data prevista do casamento (vazio se não informada)' },
      { nome: 'REGIME_BENS', descricao: 'Regime de bens com a descrição legal' },
      { nome: 'BENS_PARTICULARES', descricao: 'Bens particulares (vazio se não houver)' },
      { nome: 'CLAUSULAS_ESPECIFICAS', descricao: 'Cláusulas específicas (vazio se não houver)' },
      variavelTestemunhas,
    ],
    trechos: [],
  },
  textos: {
    rotulo: 'Textos das variáveis',
    variaveis: [],
    somenteTrechos: true,
    trechos: [
      { id: 'QUALIFICACAO_PESSOA', rotulo: 'Qualificação de pessoa física ({{OUTORGANTES}}, {{OUTORGADOS}}, {{DECLARANTES}}, {{NUBENTES}})', variaveis: variaveisQualificacao },
      { id: 'QUALIFICACAO_PJ', rotulo: 'Qualificação de pessoa jurídica (CNPJ)', variaveis: [
        { nome: 'NOME', descricao: 'Razão social' }, { nome: 'CNPJ', descricao: 'CNPJ' }, { nome: 'ENDERECO', descricao: 'Endereço da sede' },
      ] },
      { id: 'QUALIFICACAO_TESTEMUNHA', rotulo: 'Qualificação de testemunha ({{TESTEMUNHAS}})', variaveis: variaveisQualificacao },
      { id: 'QUALIFICACAO_REQUERENTE', rotulo: 'Qualificação de requerente ({{REQUERENTES}})', variaveis: [
        ...variaveisQualificacao.filter((v) => v.nome !== 'NACIONALIDADE'), { nome: 'EMAIL', descricao: 'E-mail (vazio se não informado)' },
      ] },
      { id: 'REGIME_PARCIAL', rotulo: 'Regime: Comunhão Parcial de Bens ({{REGIME_BENS}})', variaveis: variaveisRegime },
      { id: 'REGIME_UNIVERSAL', rotulo: 'Regime: Comunhão Universal de Bens ({{REGIME_BENS}})', variaveis: variaveisRegime },
      { id: 'REGIME_SEPARACAO', rotulo: 'Regime: Separação Total de Bens ({{REGIME_BENS}})', variaveis: variaveisRegime },
      { id: 'REGIME_AQUESTOS', rotulo: 'Regime: Participação Final nos Aquestos ({{REGIME_BENS}})', variaveis: variaveisRegime },
    ],
  },
};

export const TIPOS_MODELO = Object.keys(DEFINICOES_MODELOS) as TipoModeloMinuta[];

const blocoTestemunhas = `{{#TESTEMUNHAS}}

TESTEMUNHAS:

{{TESTEMUNHAS}}{{/TESTEMUNHAS}}`;

const qualificacaoPadrao = '{{NOME}}{{#NACIONALIDADE}}, nacionalidade {{NACIONALIDADE}}{{/NACIONALIDADE}}{{#ESTADO_CIVIL}}, {{ESTADO_CIVIL}}{{/ESTADO_CIVIL}}{{#PROFISSAO}}, {{PROFISSAO}}{{/PROFISSAO}}, portador(a) da Cédula de Identidade RG nº {{RG}}{{#ORGAO_EXPEDIDOR}}, expedida por {{ORGAO_EXPEDIDOR}}{{/ORGAO_EXPEDIDOR}}{{#DATA_EXPEDICAO}} em {{DATA_EXPEDICAO}}{{/DATA_EXPEDICAO}}, inscrito(a) no CPF sob o nº {{CPF}}, residente e domiciliado(a) na {{ENDERECO}}{{#TELEFONE}}, telefone {{TELEFONE}}{{/TELEFONE}}';

const fechamentoEscritura = `Assim o disseram e me pediram que lavrasse a presente escritura, que, feita, leram e acharam conforme, outorgam e assinam.
{{CIDADE}}, {{DATA_EXTENSO}}.`;

export const MODELOS_PADRAO: Record<TipoModeloMinuta, ModeloMinuta> = {
  procuracao: {
    titulo: 'PROCURAÇÃO',
    corpo: `SAIBAM todos quantos este instrumento particular de mandato virem que, aos {{DATA_EXTENSO}}, nesta cidade de {{CIDADE}}, perante mim, Tabelião(a) deste Ofício, compareceu(ram) como OUTORGANTE(S):

{{OUTORGANTES}}.

E como OUTORGADO(S):

{{OUTORGADOS}}.

Pelo(s) outorgante(s), me foi dito que, por este instrumento e na melhor forma de direito, nomeia(m) e constitui(em) seu(s) bastante(s) procurador(es) o(s) outorgado(s) acima qualificado(s), a quem confere(m) os seguintes poderes especiais:

{{PODERES}}

O presente mandato é outorgado por prazo indeterminado, podendo ser revogado a qualquer tempo pelo(s) outorgante(s), respondendo o(s) outorgado(s) pelos atos que exceder(em) os poderes aqui conferidos.${blocoTestemunhas}`,
    fechamento: `Assim o(s) outorgante(s) o disse(ram), do que dou fé.
{{CIDADE}}, {{DATA_EXTENSO}}.`,
    trechos: {
      BANCARIA: `BANCÁRIA: para, junto a instituições bancárias e financeiras, abrir, movimentar e encerrar contas correntes, contas-poupança e contas de depósito de qualquer natureza; efetuar depósitos, saques, transferências, PIX, TED e DOC; emitir, endossar, sustar e cancelar cheques; solicitar talões de cheque, cartões magnéticos, de crédito e de débito; contratar e resgatar aplicações financeiras; obter saldos, extratos, informes de rendimentos e demais documentos; e praticar todos os demais atos necessários à plena movimentação bancária do(s) outorgante(s).{{#CONTAS}}
Especialmente perante: {{CONTAS}}.{{/CONTAS}}`,
      INSS: 'INSS: para, perante o Instituto Nacional do Seguro Social – INSS e demais órgãos da Previdência Social, requerer, acompanhar, receber e levantar benefícios previdenciários e assistenciais de qualquer espécie, inclusive aposentadorias, pensões, auxílios e parcelas atrasadas; requerer perícias médicas e reabilitação profissional; solicitar extratos, históricos de contribuições, senhas e demais documentos; assinar requerimentos e declarações; e praticar todos os demais atos necessários ao pleno exercício deste mandato junto à Previdência Social.',
      FARMACIA: 'FARMÁCIA: para adquirir, em farmácias e drogarias, medicamentos de uso contínuo ou eventual do(s) outorgante(s), inclusive os sujeitos a controle especial e retenção de receita, podendo para tanto apresentar receituários, assinar livros de controle e praticar os demais atos necessários a tais aquisições.',
      ORGAOS_PUBLICOS: 'ÓRGÃOS PÚBLICOS: para representar o(s) outorgante(s) perante repartições públicas federais, estaduais e municipais, autarquias, fundações e demais entes da Administração Pública direta e indireta, podendo requerer, retirar e apresentar documentos, certidões, alvarás e declarações, preencher e assinar formulários e requerimentos, e praticar todos os demais atos necessários à defesa dos interesses do(s) outorgante(s) junto a tais órgãos.',
      CBS: 'CBS: para, perante a Caixa Beneficente dos Empregados da CSN – CBS Previdência, requerer, acompanhar, receber e levantar benefícios de previdência complementar de qualquer espécie, inclusive suplementações de aposentadoria e pensão; solicitar extratos, informes e demais documentos; assinar requerimentos e declarações; e praticar todos os demais atos necessários ao pleno exercício deste mandato junto àquela entidade.',
      PREFEITURAS: 'PREFEITURAS: para representar o(s) outorgante(s) perante a Prefeitura Municipal e seus órgãos, podendo requerer e retirar certidões, alvarás, guias e declarações, efetuar cadastros, atualizações e baixas, tratar de lançamentos e pagamentos de tributos municipais, como IPTU e taxas, e praticar todos os demais atos necessários à defesa dos interesses do(s) outorgante(s) junto à Administração Municipal.',
      COMPRA_VENDA_IMOVEL: `COMPRA OU VENDA DE IMÓVEL{{NUMERO}}: para, em nome do(s) outorgante(s), {{VERBO}} {{EXTENSAO}} do imóvel abaixo descrito, pelo valor de R$ {{VALOR}}, a ser pago {{PAGAMENTO}}, podendo ajustar cláusulas e condições, assinar compromisso e/ou escritura definitiva de compra e venda, quitar o preço ajustado, receber e dar recibos e quitações, outorgar posse e praticar todos os demais atos necessários à efetivação e ao registro do negócio.
Imóvel: {{IMOVEL}}`,
      ADMINISTRACAO_IMOVEL: `ADMINISTRAÇÃO DE IMÓVEL{{NUMERO}}: para administrar, em nome do(s) outorgante(s), o imóvel abaixo descrito, podendo locá-lo e sublocá-lo, fixar e reajustar aluguéis, receber e dar quitação de valores, promover cobrança e ação de despejo, representar perante inquilino(s), síndico e condomínio, contratar reparos e serviços, e praticar todos os demais atos necessários à sua regular administração.
Imóvel: {{IMOVEL}}`,
      SEGURADORA_PATIO: `SEGURADORA/REMOÇÃO DO PÁTIO{{NUMERO}}: para representar o(s) outorgante(s) perante companhias seguradoras, pátios de recolhimento, órgãos de trânsito e demais entidades correlatas, no que se refere ao veículo abaixo descrito, podendo comunicar sinistros, acompanhar e receber indenizações, retirar o veículo do pátio de remoção, assinar termos de entrega e responsabilidade, e praticar todos os demais atos necessários à sua regularização e liberação.
Veículo: {{VEICULO}}`,
      AD_JUDICIA: 'AD JUDICIA: para o foro em geral, com poderes para propor e/ou contestar ações e seus incidentes, em qualquer Juízo, Instância ou Tribunal, podendo transigir, desistir, firmar compromissos, receber e dar quitação, substabelecer esta procuração, com ou sem reserva de poderes, e praticar todos os demais atos necessários ao fiel cumprimento deste mandato judicial.',
      OUTROS: 'OUTROS PODERES ESPECÍFICOS{{NUMERO}}: {{TEXTO}}',
    },
  },
  apostilamento: {
    titulo: 'TERMO DE SOLICITAÇÃO DE APOSTILAMENTO',
    corpo: `Aos {{DATA_EXTENSO}}, neste Ofício, compareceu(ram) o(s) requerente(s) abaixo qualificado(s), solicitando o apostilamento de documento(s) para uso no exterior, nos termos da Convenção da Apostila da Haia (Convenção de 5 de outubro de 1961):

REQUERENTE(S):

{{REQUERENTES}}

DADOS DA SOLICITAÇÃO:

País de destino: {{PAIS_DESTINO}}
Quantidade de documentos: {{QUANTIDADE_DOCUMENTOS}}
Documento(s) a apostilar: {{DOCUMENTOS}}
Assinatura a ser apostilada: {{ASSINATURA}}
Data e horário previstos para entrega: {{ENTREGA}}

O(s) requerente(s) declara(m) estar de acordo com os dados acima informados, responsabilizando-se pela veracidade das informações prestadas.`,
    fechamento: '{{CIDADE}}, {{DATA_EXTENSO}}.',
    trechos: {},
  },
  certidoes: {
    titulo: 'TERMO DE SOLICITAÇÃO DE CERTIDÃO',
    corpo: `Aos {{DATA_EXTENSO}}, neste Ofício, compareceu(ram) o(s) requerente(s) abaixo qualificado(s), solicitando a expedição de certidão de {{TIPO_CERTIDAO}}, nos termos a seguir:

REQUERENTE(S):

{{REQUERENTES}}{{#TESTAMENTO}}

ATENÇÃO – CERTIDÃO DE TESTAMENTO: nos termos do art. 297 do Código de Normas da Corregedoria Geral da Justiça do Estado do Rio de Janeiro, a certidão de testamento somente poderá ser fornecida ao próprio testador ou mediante ordem judicial; após o falecimento, poderá ser fornecida ao solicitante que apresentar a certidão de óbito.{{/TESTAMENTO}}

DADOS DO ATO A SER CERTIFICADO:

Outorgante(s): {{OUTORGANTES}}
Outorgado(s): {{OUTORGADOS}}
Livro: {{LIVRO}}    Folha: {{FOLHA}}    Data do ato: {{DATA_ATO}}
Finalidade da certidão: {{FINALIDADE}}
Data e horário previstos para entrega: {{ENTREGA}}

O(s) requerente(s) declara(m) estar de acordo com os dados acima informados, responsabilizando-se pela veracidade das informações prestadas.`,
    fechamento: '{{CIDADE}}, {{DATA_EXTENSO}}.',
    trechos: {},
  },
  uniao_estavel: {
    titulo: 'ESCRITURA PÚBLICA DECLARATÓRIA DE UNIÃO ESTÁVEL',
    corpo: `SAIBAM todos quantos esta escritura pública declaratória de união estável virem que, aos {{DATA_EXTENSO}}, nesta cidade de {{CIDADE}}, perante mim, Tabelião(a) deste Ofício, compareceram como DECLARANTES:

{{DECLARANTES}}.

E, pelos declarantes, devidamente identificados e capazes, me foi dito que vivem em união estável, configurada por convivência pública, contínua e duradoura, estabelecida com o objetivo de constituição de família, nos termos do art. 1.723 do Código Civil, desde {{DATA_INICIO}}, residindo em comum no seguinte endereço: {{ENDERECO_COMUM}}.

Que, nos termos do art. 1.725 do Código Civil, regulam os efeitos patrimoniais desta união estável pelo regime da {{REGIME_BENS}}.{{#FILHOS}}

Que da união resultou(aram) o(s) seguinte(s) filho(s): {{FILHOS}}.{{/FILHOS}}

Que esta declaração produz efeitos entre os declarantes e perante terceiros, nos termos da legislação civil, podendo ser levada a registro e utilizada para os fins de direito, inclusive previdenciários, patrimoniais e sucessórios.${blocoTestemunhas}`,
    fechamento: fechamentoEscritura,
    trechos: {},
  },
  textos: {
    titulo: '',
    corpo: '',
    fechamento: '',
    trechos: {
      QUALIFICACAO_PESSOA: qualificacaoPadrao,
      QUALIFICACAO_PJ: '{{NOME}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{CNPJ}}, com sede na {{ENDERECO}}',
      QUALIFICACAO_TESTEMUNHA: qualificacaoPadrao,
      QUALIFICACAO_REQUERENTE: '{{NOME}}{{#ESTADO_CIVIL}}, {{ESTADO_CIVIL}}{{/ESTADO_CIVIL}}{{#PROFISSAO}}, {{PROFISSAO}}{{/PROFISSAO}}, portador(a) da Cédula de Identidade RG nº {{RG}}{{#ORGAO_EXPEDIDOR}}, expedida por {{ORGAO_EXPEDIDOR}}{{/ORGAO_EXPEDIDOR}}{{#DATA_EXPEDICAO}} em {{DATA_EXPEDICAO}}{{/DATA_EXPEDICAO}}, inscrito(a) no CPF sob o nº {{CPF}}, residente e domiciliado(a) na {{ENDERECO}}{{#TELEFONE}}, telefone {{TELEFONE}}{{/TELEFONE}}{{#EMAIL}}, e-mail {{EMAIL}}{{/EMAIL}}',
      REGIME_PARCIAL: 'Comunhão Parcial de Bens, pelo qual se comunicam os bens que sobrevierem ao casal na constância do(a) {{VINCULO}}, excluídos os bens que cada {{PESSOA}} já possuía antes de {{CASAR}} e os que vier a adquirir, na constância do(a) {{VINCULO}}, por doação ou sucessão, nos termos dos arts. 1.658 a 1.666 do Código Civil',
      REGIME_UNIVERSAL: 'Comunhão Universal de Bens, pelo qual se comunicam todos os bens presentes e futuros dos {{PESSOAS}} e suas dívidas passivas, ressalvadas as exceções previstas em lei, nos termos dos arts. 1.667 a 1.671 do Código Civil',
      REGIME_SEPARACAO: 'Separação Total de Bens, pelo qual permanecem incomunicáveis os bens presentes e futuros de cada {{PESSOA}}, competindo a cada um a exclusiva propriedade, administração e disposição de seu próprio patrimônio, nos termos do art. 1.687 do Código Civil',
      REGIME_AQUESTOS: 'Participação Final nos Aquestos, pelo qual, na constância do(a) {{VINCULO}}, vigora entre os {{PESSOAS}} a separação de bens, competindo a cada um a exclusiva administração e disposição de seu patrimônio, cabendo a cada um, em caso de dissolução, o direito à metade dos bens adquiridos pelo casal a título oneroso durante o(a) {{VINCULO}}, nos termos dos arts. 1.672 a 1.686 do Código Civil',
    },
  },
  pacto_antenupcial: {
    titulo: 'ESCRITURA PÚBLICA DE PACTO ANTENUPCIAL',
    corpo: `SAIBAM todos quantos esta escritura pública de pacto antenupcial virem que, aos {{DATA_EXTENSO}}, nesta cidade de {{CIDADE}}, perante mim, Tabelião(a) deste Ofício, compareceram como NUBENTES:

{{NUBENTES}}.

E, pelos nubentes, devidamente identificados e capazes, me foi dito que pretendem contrair matrimônio{{#DATA_CASAMENTO}}, com previsão para {{DATA_CASAMENTO}},{{/DATA_CASAMENTO}} e que, antes da celebração do casamento, resolvem regular, por meio deste pacto antenupcial, nos termos do art. 1.653 e seguintes do Código Civil, o regime de bens que vigorará entre ambos, optando pelo regime de {{REGIME_BENS}}.{{#BENS_PARTICULARES}}

Declaram os nubentes que possuem, antes do casamento, os seguintes bens particulares, que permanecerão sob titularidade exclusiva de cada um, na forma do regime ora pactuado: {{BENS_PARTICULARES}}.{{/BENS_PARTICULARES}}{{#CLAUSULAS_ESPECIFICAS}}

CLÁUSULAS ESPECÍFICAS: {{CLAUSULAS_ESPECIFICAS}}{{/CLAUSULAS_ESPECIFICAS}}

O presente pacto somente produzirá efeitos perante terceiros após a celebração do casamento e o registro deste instrumento no Livro de Registro de Pactos Antenupciais do Ofício de Registro de Imóveis do domicílio dos cônjuges, nos termos do art. 1.657 do Código Civil.${blocoTestemunhas}`,
    fechamento: fechamentoEscritura,
    trechos: {},
  },
};

// ---------------------------------------------------------------------------
// Preenchimento
// ---------------------------------------------------------------------------

const SECAO = /\{\{#([A-Za-z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const VARIAVEL = /\{\{([A-Za-z0-9_]+)\}\}/g;

export function preencherModelo(modelo: string, valores: Record<string, string>): string {
  const valor = (nome: string) => valores[nome.toUpperCase()];
  // Valores inseridos numa única passada: texto digitado no formulário nunca é tratado como variável.
  return modelo
    .replace(SECAO, (_, nome: string, conteudo: string) => (valor(nome)?.trim() ? conteudo : ''))
    .replace(VARIAVEL, (marca, nome: string) => valor(nome) ?? marca)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Variáveis usadas no texto que não existem para este modelo (erros de digitação, por exemplo).
export function variaveisDesconhecidas(texto: string, permitidas: VariavelModelo[]): string[] {
  const nomes = new Set(permitidas.map((v) => v.nome));
  const usadas = [...texto.matchAll(/\{\{[#/]?([A-Za-z0-9_]+)\}\}/g)].map((m) => m[1].toUpperCase());
  return [...new Set(usadas.filter((nome) => !nomes.has(nome)))];
}

// ---------------------------------------------------------------------------
// Modelos personalizados (tabela minuta_templates, editável só pelo Super Admin)
// ---------------------------------------------------------------------------

export interface ModeloPersonalizado {
  modelo: ModeloMinuta;
  atualizadoEm: string;
}

type ModelosPersonalizados = Partial<Record<TipoModeloMinuta, ModeloPersonalizado>>;

let personalizados: ModelosPersonalizados = {};
const listeners = new Set<() => void>();

function definirPersonalizados(proximos: ModelosPersonalizados) {
  personalizados = proximos;
  listeners.forEach((listener) => listener());
}

function normalizarModelo(tipo: TipoModeloMinuta, salvo: Partial<ModeloMinuta> | null | undefined): ModeloMinuta {
  const padrao = MODELOS_PADRAO[tipo];
  const texto = (valor: unknown, alternativa: string) => (typeof valor === 'string' ? valor : alternativa);
  const trechos = Object.fromEntries(Object.entries(padrao.trechos).map(([id, original]) => [id, texto(salvo?.trechos?.[id], original)]));
  return { titulo: texto(salvo?.titulo, padrao.titulo), corpo: texto(salvo?.corpo, padrao.corpo), fechamento: texto(salvo?.fechamento, padrao.fechamento), trechos };
}

export function modeloMinuta(tipo: TipoModeloMinuta): ModeloMinuta {
  return personalizados[tipo]?.modelo ?? MODELOS_PADRAO[tipo];
}

export function modelosIguais(a: ModeloMinuta, b: ModeloMinuta) {
  return a.titulo === b.titulo && a.corpo === b.corpo && a.fechamento === b.fechamento
    && Object.keys(b.trechos).every((id) => a.trechos[id] === b.trechos[id]);
}

export function useModelosPersonalizados() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => personalizados);
}

export async function carregarModelosMinuta() {
  if (!supabase) return;
  const { data, error } = await supabase.from('minuta_templates').select('tipo, modelo, updated_at');
  if (error) throw error;
  const proximos: ModelosPersonalizados = {};
  (data ?? []).forEach((linha: { tipo: string; modelo: Partial<ModeloMinuta>; updated_at: string }) => {
    if (!(linha.tipo in MODELOS_PADRAO)) return;
    const tipo = linha.tipo as TipoModeloMinuta;
    proximos[tipo] = { modelo: normalizarModelo(tipo, linha.modelo), atualizadoEm: linha.updated_at };
  });
  definirPersonalizados(proximos);
}

// Salvar um texto idêntico ao original equivale a restaurar o padrão.
export async function salvarModeloMinuta(tipo: TipoModeloMinuta, modelo: ModeloMinuta) {
  if (!supabase) throw new Error('Banco de dados não configurado.');
  if (modelosIguais(modelo, MODELOS_PADRAO[tipo])) return restaurarModeloPadrao(tipo);
  const { error } = await supabase.from('minuta_templates').upsert({ tipo, modelo }, { onConflict: 'tipo' });
  if (error) throw error;
  await carregarModelosMinuta();
}

export async function restaurarModeloPadrao(tipo: TipoModeloMinuta) {
  if (!supabase) throw new Error('Banco de dados não configurado.');
  const { error } = await supabase.from('minuta_templates').delete().eq('tipo', tipo);
  if (error) throw error;
  await carregarModelosMinuta();
}
