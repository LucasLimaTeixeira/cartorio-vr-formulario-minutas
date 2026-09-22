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

function montarMinuta(params: {
  titulo: string;
  corpoLinhas: string[];
  fechamentoLinhas: string[];
  assinantes: string[];
}): MinutaGerada {
  const cabecalho = [nomeCartorio(), enderecoCartorio(), tabeliaoCartorio()].filter(
    (linha): linha is string => Boolean(linha)
  );
  const corpo = params.corpoLinhas.join('\n');
  const fechamento = params.fechamentoLinhas.join('\n');
  const blocoAssinaturas = params.assinantes
    .map((nome) => `_______________________________________________\n${nome || '(nome não informado)'}`)
    .join('\n\n');

  const textoCompleto = [cabecalho.join('\n'), params.titulo, corpo, fechamento, blocoAssinaturas]
    .filter((bloco) => bloco && bloco.trim().length > 0)
    .join('\n\n');

  return { cabecalho, titulo: params.titulo, corpo, fechamento, assinantes: params.assinantes, textoCompleto };
}

// ---------------------------------------------------------------------------
// Qualificação de pessoas
// ---------------------------------------------------------------------------

export function qualificacaoPessoa(p: Pessoa): string {
  const nome = p.nome?.trim() || '[NOME NÃO INFORMADO]';

  if (p.tipoDocumento === 'CNPJ') {
    return `${nome}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${p.documento || '[CNPJ não informado]'}, com sede na ${p.endereco || '[endereço não informado]'}`;
  }

  const partes = [
    nome,
    p.nacionalidade ? `nacionalidade ${p.nacionalidade}` : null,
    p.estadoCivil || null,
    p.profissao || null,
    `portador(a) da Cédula de Identidade RG nº ${p.rg || '[não informado]'}${
      p.orgaoExpedidor ? `, expedida por ${p.orgaoExpedidor}` : ''
    }${p.dataExpedicaoRg ? ` em ${formatarDataExtenso(p.dataExpedicaoRg)}` : ''}`,
    `inscrito(a) no CPF sob o nº ${p.documento || '[não informado]'}`,
    `residente e domiciliado(a) na ${p.endereco || '[endereço não informado]'}`,
    p.telefone ? `telefone ${p.telefone}` : null,
  ].filter(Boolean);

  return partes.join(', ');
}

export function qualificacaoTestemunha(t: Testemunha): string {
  const nome = t.nome?.trim() || '[NOME NÃO INFORMADO]';
  const partes = [
    nome,
    t.nacionalidade ? `nacionalidade ${t.nacionalidade}` : null,
    t.estadoCivil || null,
    t.profissao || null,
    `portador(a) da Cédula de Identidade RG nº ${t.rg || '[não informado]'}${
      t.orgaoExpedidor ? `, expedida por ${t.orgaoExpedidor}` : ''
    }${t.dataExpedicaoRg ? ` em ${formatarDataExtenso(t.dataExpedicaoRg)}` : ''}`,
    `inscrito(a) no CPF sob o nº ${t.documento || '[não informado]'}`,
    `residente e domiciliado(a) na ${t.endereco || '[endereço não informado]'}`,
    t.telefone ? `telefone ${t.telefone}` : null,
  ].filter(Boolean);
  return partes.join(', ');
}

export function qualificacaoRequerente(r: Requerente): string {
  const nome = r.nome?.trim() || '[NOME NÃO INFORMADO]';
  const partes = [
    nome,
    r.estadoCivil || null,
    r.profissao || null,
    `portador(a) da Cédula de Identidade RG nº ${r.rg || '[não informado]'}${
      r.orgaoExpedidor ? `, expedida por ${r.orgaoExpedidor}` : ''
    }${r.dataExpedicaoRg ? ` em ${formatarDataExtenso(r.dataExpedicaoRg)}` : ''}`,
    `inscrito(a) no CPF sob o nº ${r.cpf || '[não informado]'}`,
    `residente e domiciliado(a) na ${r.endereco || '[endereço não informado]'}`,
    r.telefone ? `telefone ${r.telefone}` : null,
    r.email ? `e-mail ${r.email}` : null,
  ].filter(Boolean);
  return partes.join(', ');
}

// ---------------------------------------------------------------------------
// Cláusulas de poderes (Procuração)
//
// O texto de cada cláusula é uma string simples — para ajustar a redação
// jurídica de algum poder, basta editar o texto correspondente abaixo.
// ---------------------------------------------------------------------------

function clausulasPoderes(f: FormularioProcuracao): string[] {
  const clausulas: string[] = [];

  if (f.poderesOutorgados.includes('BANCÁRIA')) {
    let texto =
      'BANCÁRIA: para, junto a instituições bancárias e financeiras, abrir, movimentar e encerrar contas correntes, contas-poupança e contas de depósito de qualquer natureza; efetuar depósitos, saques, transferências, PIX, TED e DOC; emitir, endossar, sustar e cancelar cheques; solicitar talões de cheque, cartões magnéticos, de crédito e de débito; contratar e resgatar aplicações financeiras; obter saldos, extratos, informes de rendimentos e demais documentos; e praticar todos os demais atos necessários à plena movimentação bancária do(s) outorgante(s).';

    if (f.dadosBancarios.length > 0) {
      const lista = f.dadosBancarios
        .map((b) => {
          const campos = [
            b.banco && `Banco: ${b.banco}`,
            b.agencia && `Agência: ${b.agencia}`,
            b.conta && `Conta: ${b.conta}`,
            b.numeroBeneficio && `Benefício vinculado nº: ${b.numeroBeneficio}`,
          ]
            .filter(Boolean)
            .join(' — ');
          return campos;
        })
        .filter(Boolean);
      if (lista.length) {
        texto += `\nEspecialmente perante: ${lista.join('; ')}.`;
      }
    }
    clausulas.push(texto);
  }

  if (f.poderesOutorgados.includes('INSS')) {
    clausulas.push(
      'INSS: para, perante o Instituto Nacional do Seguro Social – INSS e demais órgãos da Previdência Social, requerer, acompanhar, receber e levantar benefícios previdenciários e assistenciais de qualquer espécie, inclusive aposentadorias, pensões, auxílios e parcelas atrasadas; requerer perícias médicas e reabilitação profissional; solicitar extratos, históricos de contribuições, senhas e demais documentos; assinar requerimentos e declarações; e praticar todos os demais atos necessários ao pleno exercício deste mandato junto à Previdência Social.'
    );
  }

  if (f.poderesOutorgados.includes('FARMÁCIA')) {
    clausulas.push(
      'FARMÁCIA: para adquirir, em farmácias e drogarias, medicamentos de uso contínuo ou eventual do(s) outorgante(s), inclusive os sujeitos a controle especial e retenção de receita, podendo para tanto apresentar receituários, assinar livros de controle e praticar os demais atos necessários a tais aquisições.'
    );
  }

  if (f.poderesOutorgados.includes('ÓRGÃOS PÚBLICOS')) {
    clausulas.push(
      'ÓRGÃOS PÚBLICOS: para representar o(s) outorgante(s) perante repartições públicas federais, estaduais e municipais, autarquias, fundações e demais entes da Administração Pública direta e indireta, podendo requerer, retirar e apresentar documentos, certidões, alvarás e declarações, preencher e assinar formulários e requerimentos, e praticar todos os demais atos necessários à defesa dos interesses do(s) outorgante(s) junto a tais órgãos.'
    );
  }

  if (f.poderesOutorgados.includes('CBS')) {
    clausulas.push(
      'CBS: para, perante a Caixa Beneficente dos Empregados da CSN – CBS Previdência, requerer, acompanhar, receber e levantar benefícios de previdência complementar de qualquer espécie, inclusive suplementações de aposentadoria e pensão; solicitar extratos, informes e demais documentos; assinar requerimentos e declarações; e praticar todos os demais atos necessários ao pleno exercício deste mandato junto àquela entidade.'
    );
  }

  if (f.poderesOutorgados.includes('PREFEITURAS')) {
    clausulas.push(
      'PREFEITURAS: para representar o(s) outorgante(s) perante a Prefeitura Municipal e seus órgãos, podendo requerer e retirar certidões, alvarás, guias e declarações, efetuar cadastros, atualizações e baixas, tratar de lançamentos e pagamentos de tributos municipais, como IPTU e taxas, e praticar todos os demais atos necessários à defesa dos interesses do(s) outorgante(s) junto à Administração Municipal.'
    );
  }

  if (f.poderesOutorgados.includes('COMPRA OU VENDA DE IMÓVEL') && f.dadosImovel.length > 0) {
    f.dadosImovel.forEach((im, idx) => {
      const verbo = im.tipoTransacao === 'compra' ? 'comprar' : 'vender';
      const extensao = im.tipoVenda === 'total' ? 'a totalidade' : 'a fração mínima ideal';
      const pagamento = im.formaPagamento === 'vista' ? 'à vista' : 'de forma financiada';
      const numero = f.dadosImovel.length > 1 ? ` (imóvel ${idx + 1})` : '';
      clausulas.push(
        `COMPRA OU VENDA DE IMÓVEL${numero}: para, em nome do(s) outorgante(s), ${verbo} ${extensao} do imóvel abaixo descrito, pelo valor de R$ ${
          im.valorTransacao || '[valor não informado]'
        }, a ser pago ${pagamento}, podendo ajustar cláusulas e condições, assinar compromisso e/ou escritura definitiva de compra e venda, quitar o preço ajustado, receber e dar recibos e quitações, outorgar posse e praticar todos os demais atos necessários à efetivação e ao registro do negócio.\nImóvel: ${
          im.dadosImovel || '[dados do imóvel não informados]'
        }`
      );
    });
  }

  if (f.poderesOutorgados.includes('ADMINISTRAÇÃO DE IMÓVEL') && f.dadosAdministracaoImovel.length > 0) {
    f.dadosAdministracaoImovel.forEach((im, idx) => {
      const numero = f.dadosAdministracaoImovel.length > 1 ? ` (imóvel ${idx + 1})` : '';
      clausulas.push(
        `ADMINISTRAÇÃO DE IMÓVEL${numero}: para administrar, em nome do(s) outorgante(s), o imóvel abaixo descrito, podendo locá-lo e sublocá-lo, fixar e reajustar aluguéis, receber e dar quitação de valores, promover cobrança e ação de despejo, representar perante inquilino(s), síndico e condomínio, contratar reparos e serviços, e praticar todos os demais atos necessários à sua regular administração.\nImóvel: ${
          im.dadosImovel || '[dados do imóvel não informados]'
        }`
      );
    });
  }

  if (f.poderesOutorgados.includes('SEGURADORA/REMOÇÃO DO PÁTIO') && f.dadosVeiculo.length > 0) {
    f.dadosVeiculo.forEach((v, idx) => {
      const numero = f.dadosVeiculo.length > 1 ? ` (veículo ${idx + 1})` : '';
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
      clausulas.push(
        `SEGURADORA/REMOÇÃO DO PÁTIO${numero}: para representar o(s) outorgante(s) perante companhias seguradoras, pátios de recolhimento, órgãos de trânsito e demais entidades correlatas, no que se refere ao veículo abaixo descrito, podendo comunicar sinistros, acompanhar e receber indenizações, retirar o veículo do pátio de remoção, assinar termos de entrega e responsabilidade, e praticar todos os demais atos necessários à sua regularização e liberação.\nVeículo: ${
          detalhes || '[dados do veículo não informados]'
        }`
      );
    });
  }

  if (f.poderesOutorgados.includes('AD JUDICIA')) {
    clausulas.push(
      'AD JUDICIA: para o foro em geral, com poderes para propor e/ou contestar ações e seus incidentes, em qualquer Juízo, Instância ou Tribunal, podendo transigir, desistir, firmar compromissos, receber e dar quitação, substabelecer esta procuração, com ou sem reserva de poderes, e praticar todos os demais atos necessários ao fiel cumprimento deste mandato judicial.'
    );
  }

  if (f.poderesOutorgados.includes('OUTROS PODERES ESPECIFICOS') && f.outros.length > 0) {
    const validos = f.outros.filter((o) => o.outros && o.outros.trim().length > 0);
    validos.forEach((o, idx) => {
      const numero = validos.length > 1 ? ` ${idx + 1}` : '';
      clausulas.push(`OUTROS PODERES ESPECÍFICOS${numero}: ${o.outros}`);
    });
  }

  return clausulas;
}

// ---------------------------------------------------------------------------
// Geradores de minuta por tipo de formulário
// ---------------------------------------------------------------------------

export function gerarMinutaProcuracao(f: FormularioProcuracao): MinutaGerada {
  const dataExtenso = dataAtualExtenso();
  const linhas: string[] = [];

  const outorgantesQualif = juntarComE(
    f.outorgantes.map(
      (o, i) => `${f.outorgantes.length > 1 ? `${i + 1}) ` : ''}${qualificacaoPessoa(o)}`
    )
  );
  const outorgadosQualif = juntarComE(
    f.outorgados.map(
      (o, i) => `${f.outorgados.length > 1 ? `${i + 1}) ` : ''}${qualificacaoPessoa(o)}`
    )
  );

  linhas.push(
    `SAIBAM todos quantos este instrumento particular de mandato virem que, aos ${dataExtenso}, nesta cidade de ${cidadeCartorio()}, perante mim, Tabelião(a) deste Ofício, compareceu(ram) como OUTORGANTE(S):`
  );
  linhas.push('');
  linhas.push(`${outorgantesQualif}.`);
  linhas.push('');
  linhas.push('E como OUTORGADO(S):');
  linhas.push('');
  linhas.push(`${outorgadosQualif}.`);
  linhas.push('');
  linhas.push(
    'Pelo(s) outorgante(s), me foi dito que, por este instrumento e na melhor forma de direito, nomeia(m) e constitui(em) seu(s) bastante(s) procurador(es) o(s) outorgado(s) acima qualificado(s), a quem confere(m) os seguintes poderes especiais:'
  );
  linhas.push('');

  const clausulas = clausulasPoderes(f);
  if (clausulas.length > 0) {
    clausulas.forEach((c) => {
      linhas.push(c);
      linhas.push('');
    });
  } else {
    linhas.push('[Nenhum poder foi selecionado no formulário.]');
    linhas.push('');
  }

  linhas.push(
    'O presente mandato é outorgado por prazo indeterminado, podendo ser revogado a qualquer tempo pelo(s) outorgante(s), respondendo o(s) outorgado(s) pelos atos que exceder(em) os poderes aqui conferidos.'
  );

  if (f.testemunhas.length > 0) {
    linhas.push('');
    linhas.push('TESTEMUNHAS:');
    linhas.push('');
    f.testemunhas.forEach((t, i, arr) => {
      linhas.push(`${qualificacaoTestemunha(t)}.`);
      if (i < arr.length - 1) linhas.push('');
    });
  }

  const assinantes = [
    ...f.outorgantes.map((o) => o.nome || 'Outorgante'),
    ...f.testemunhas.map((t) => t.nome || 'Testemunha'),
  ];

  return montarMinuta({
    titulo: 'PROCURAÇÃO',
    corpoLinhas: linhas,
    fechamentoLinhas: [
      'Assim o(s) outorgante(s) o disse(ram), do que dou fé.',
      `${cidadeCartorio()}, ${dataExtenso}.`,
    ],
    assinantes,
  });
}

export function gerarMinutaApostilamento(f: FormularioApostilamento): MinutaGerada {
  const dataExtenso = dataAtualExtenso();
  const linhas: string[] = [];

  linhas.push(
    `Aos ${dataExtenso}, neste Ofício, compareceu(ram) o(s) requerente(s) abaixo qualificado(s), solicitando o apostilamento de documento(s) para uso no exterior, nos termos da Convenção da Apostila da Haia (Convenção de 5 de outubro de 1961):`
  );
  linhas.push('');
  linhas.push('REQUERENTE(S):');
  linhas.push('');
  f.requerentes.forEach((r, i, arr) => {
    linhas.push(`${qualificacaoRequerente(r)}.`);
    if (i < arr.length - 1) linhas.push('');
  });
  linhas.push('');
  linhas.push('DADOS DA SOLICITAÇÃO:');
  linhas.push('');
  linhas.push(`País de destino: ${f.paisDestino || '[não informado]'}`);
  linhas.push(`Quantidade de documentos: ${f.quantidadeDocumentos || '[não informado]'}`);
  linhas.push(`Documento(s) a apostilar: ${f.quaisDocumentos || '[não informado]'}`);
  linhas.push(`Assinatura a ser apostilada: ${f.assinaturaApostilada || '[não informado]'}`);
  linhas.push(
    `Data e horário previstos para entrega: ${
      f.dataEntrega ? formatarDataExtenso(f.dataEntrega) : '[não informado]'
    }${f.horarioEntrega ? `, às ${f.horarioEntrega}` : ''}`
  );
  linhas.push('');
  linhas.push(
    'O(s) requerente(s) declara(m) estar de acordo com os dados acima informados, responsabilizando-se pela veracidade das informações prestadas.'
  );

  return montarMinuta({
    titulo: 'TERMO DE SOLICITAÇÃO DE APOSTILAMENTO',
    corpoLinhas: linhas,
    fechamentoLinhas: [`${cidadeCartorio()}, ${dataExtenso}.`],
    assinantes: f.requerentes.map((r) => r.nome || 'Requerente'),
  });
}

const TIPO_CERTIDAO_LABEL: Record<string, string> = {
  procuracao: 'Procuração',
  escritura: 'Escritura',
  testamento: 'Testamento',
  '': '[não informado]',
};

export function gerarMinutaCertidao(f: FormularioCertidao): MinutaGerada {
  const dataExtenso = dataAtualExtenso();
  const linhas: string[] = [];

  linhas.push(
    `Aos ${dataExtenso}, neste Ofício, compareceu(ram) o(s) requerente(s) abaixo qualificado(s), solicitando a expedição de certidão de ${
      TIPO_CERTIDAO_LABEL[f.tipoCertidao] ?? f.tipoCertidao
    }, nos termos a seguir:`
  );
  linhas.push('');
  linhas.push('REQUERENTE(S):');
  linhas.push('');
  f.requerentes.forEach((r, i, arr) => {
    linhas.push(`${qualificacaoRequerente(r)}.`);
    if (i < arr.length - 1) linhas.push('');
  });

  if (f.tipoCertidao === 'testamento') {
    linhas.push('');
    linhas.push(
      'ATENÇÃO – CERTIDÃO DE TESTAMENTO: nos termos do art. 297 do Código de Normas da Corregedoria Geral da Justiça do Estado do Rio de Janeiro, a certidão de testamento somente poderá ser fornecida ao próprio testador ou mediante ordem judicial; após o falecimento, poderá ser fornecida ao solicitante que apresentar a certidão de óbito.'
    );
  }

  linhas.push('');
  linhas.push('DADOS DO ATO A SER CERTIFICADO:');
  linhas.push('');
  linhas.push(`Outorgante(s): ${f.nomeOutorgantes || '[não informado]'}`);
  linhas.push(`Outorgado(s): ${f.nomeOutorgados || '[não informado]'}`);
  linhas.push(
    `Livro: ${f.livro || '[não informado]'}    Folha: ${f.folha || '[não informado]'}    Data do ato: ${
      f.data ? formatarDataExtenso(f.data) : '[não informado]'
    }`
  );
  linhas.push(`Finalidade da certidão: ${f.finalidade || '[não informado]'}`);
  linhas.push(
    `Data e horário previstos para entrega: ${
      f.dataEntrega ? formatarDataExtenso(f.dataEntrega) : '[não informado]'
    }${f.horarioEntrega ? `, às ${f.horarioEntrega}` : ''}`
  );
  linhas.push('');
  linhas.push(
    'O(s) requerente(s) declara(m) estar de acordo com os dados acima informados, responsabilizando-se pela veracidade das informações prestadas.'
  );

  return montarMinuta({
    titulo: 'TERMO DE SOLICITAÇÃO DE CERTIDÃO',
    corpoLinhas: linhas,
    fechamentoLinhas: [`${cidadeCartorio()}, ${dataExtenso}.`],
    assinantes: f.requerentes.map((r) => r.nome || 'Requerente'),
  });
}

// ---------------------------------------------------------------------------
// Regimes de bens (compartilhado entre União Estável e Pacto Antenupcial)
// ---------------------------------------------------------------------------

function textoRegimeBens(regime: string, contexto: 'casamento' | 'uniao'): string {
  const p =
    contexto === 'casamento'
      ? { pessoa: 'cônjuge', pessoas: 'cônjuges', vinculo: 'casamento', casar: 'casar' }
      : { pessoa: 'companheiro(a)', pessoas: 'companheiros', vinculo: 'união', casar: 'iniciar a união' };

  switch (regime) {
    case 'Comunhão Parcial de Bens':
      return `Comunhão Parcial de Bens, pelo qual se comunicam os bens que sobrevierem ao casal na constância do(a) ${p.vinculo}, excluídos os bens que cada ${p.pessoa} já possuía antes de ${p.casar} e os que vier a adquirir, na constância do(a) ${p.vinculo}, por doação ou sucessão, nos termos dos arts. 1.658 a 1.666 do Código Civil`;
    case 'Comunhão Universal de Bens':
      return `Comunhão Universal de Bens, pelo qual se comunicam todos os bens presentes e futuros dos ${p.pessoas} e suas dívidas passivas, ressalvadas as exceções previstas em lei, nos termos dos arts. 1.667 a 1.671 do Código Civil`;
    case 'Separação Total de Bens':
      return `Separação Total de Bens, pelo qual permanecem incomunicáveis os bens presentes e futuros de cada ${p.pessoa}, competindo a cada um a exclusiva propriedade, administração e disposição de seu próprio patrimônio, nos termos do art. 1.687 do Código Civil`;
    case 'Participação Final nos Aquestos':
      return `Participação Final nos Aquestos, pelo qual, na constância do(a) ${p.vinculo}, vigora entre os ${p.pessoas} a separação de bens, competindo a cada um a exclusiva administração e disposição de seu patrimônio, cabendo a cada um, em caso de dissolução, o direito à metade dos bens adquiridos pelo casal a título oneroso durante o(a) ${p.vinculo}, nos termos dos arts. 1.672 a 1.686 do Código Civil`;
    default:
      return regime || '[regime de bens não informado]';
  }
}

// ---------------------------------------------------------------------------
// Declaratória de União Estável
// ---------------------------------------------------------------------------

export function gerarMinutaUniaoEstavel(f: FormularioUniaoEstavel): MinutaGerada {
  const dataExtenso = dataAtualExtenso();
  const linhas: string[] = [];

  const companheirosQualif = juntarComE(
    f.companheiros.map(
      (c, i) => `${f.companheiros.length > 1 ? `${i + 1}) ` : ''}${qualificacaoPessoa(c)}`
    )
  );

  linhas.push(
    `SAIBAM todos quantos esta escritura pública declaratória de união estável virem que, aos ${dataExtenso}, nesta cidade de ${cidadeCartorio()}, perante mim, Tabelião(a) deste Ofício, compareceram como DECLARANTES:`
  );
  linhas.push('');
  linhas.push(`${companheirosQualif}.`);
  linhas.push('');
  linhas.push(
    `E, pelos declarantes, devidamente identificados e capazes, me foi dito que vivem em união estável, configurada por convivência pública, contínua e duradoura, estabelecida com o objetivo de constituição de família, nos termos do art. 1.723 do Código Civil, desde ${
      f.dataInicioUniao ? formatarDataExtenso(f.dataInicioUniao) : '[data não informada]'
    }, residindo em comum no seguinte endereço: ${f.enderecoComum || '[endereço não informado]'}.`
  );
  linhas.push('');
  linhas.push(
    `Que, nos termos do art. 1.725 do Código Civil, regulam os efeitos patrimoniais desta união estável pelo regime da ${textoRegimeBens(
      f.regimeBens,
      'uniao'
    )}.`
  );

  if (f.filhos && f.filhos.trim().length > 0) {
    linhas.push('');
    linhas.push(`Que da união resultou(aram) o(s) seguinte(s) filho(s): ${f.filhos}.`);
  }

  linhas.push('');
  linhas.push(
    'Que esta declaração produz efeitos entre os declarantes e perante terceiros, nos termos da legislação civil, podendo ser levada a registro e utilizada para os fins de direito, inclusive previdenciários, patrimoniais e sucessórios.'
  );

  if (f.testemunhas.length > 0) {
    linhas.push('');
    linhas.push('TESTEMUNHAS:');
    linhas.push('');
    f.testemunhas.forEach((t, i, arr) => {
      linhas.push(`${qualificacaoTestemunha(t)}.`);
      if (i < arr.length - 1) linhas.push('');
    });
  }

  const assinantes = [
    ...f.companheiros.map((c) => c.nome || 'Declarante'),
    ...f.testemunhas.map((t) => t.nome || 'Testemunha'),
  ];

  return montarMinuta({
    titulo: 'ESCRITURA PÚBLICA DECLARATÓRIA DE UNIÃO ESTÁVEL',
    corpoLinhas: linhas,
    fechamentoLinhas: [
      'Assim o disseram e me pediram que lavrasse a presente escritura, que, feita, leram e acharam conforme, outorgam e assinam.',
      `${cidadeCartorio()}, ${dataExtenso}.`,
    ],
    assinantes,
  });
}

// ---------------------------------------------------------------------------
// Pacto Antenupcial
// ---------------------------------------------------------------------------

export function gerarMinutaPactoAntenupcial(f: FormularioPactoAntenupcial): MinutaGerada {
  const dataExtenso = dataAtualExtenso();
  const linhas: string[] = [];

  const nubentesQualif = juntarComE(
    f.nubentes.map((n, i) => `${f.nubentes.length > 1 ? `${i + 1}) ` : ''}${qualificacaoPessoa(n)}`)
  );

  linhas.push(
    `SAIBAM todos quantos esta escritura pública de pacto antenupcial virem que, aos ${dataExtenso}, nesta cidade de ${cidadeCartorio()}, perante mim, Tabelião(a) deste Ofício, compareceram como NUBENTES:`
  );
  linhas.push('');
  linhas.push(`${nubentesQualif}.`);
  linhas.push('');
  linhas.push(
    `E, pelos nubentes, devidamente identificados e capazes, me foi dito que pretendem contrair matrimônio${
      f.dataPrevistaCasamento ? `, com previsão para ${formatarDataExtenso(f.dataPrevistaCasamento)},` : ''
    } e que, antes da celebração do casamento, resolvem regular, por meio deste pacto antenupcial, nos termos do art. 1.653 e seguintes do Código Civil, o regime de bens que vigorará entre ambos, optando pelo regime de ${textoRegimeBens(
      f.regimeBens,
      'casamento'
    )}.`
  );

  if (f.bensParticulares && f.bensParticulares.trim().length > 0) {
    linhas.push('');
    linhas.push(
      `Declaram os nubentes que possuem, antes do casamento, os seguintes bens particulares, que permanecerão sob titularidade exclusiva de cada um, na forma do regime ora pactuado: ${f.bensParticulares}.`
    );
  }

  if (f.clausulasEspecificas && f.clausulasEspecificas.trim().length > 0) {
    linhas.push('');
    linhas.push(`CLÁUSULAS ESPECÍFICAS: ${f.clausulasEspecificas}`);
  }

  linhas.push('');
  linhas.push(
    'O presente pacto somente produzirá efeitos perante terceiros após a celebração do casamento e o registro deste instrumento no Livro de Registro de Pactos Antenupciais do Ofício de Registro de Imóveis do domicílio dos cônjuges, nos termos do art. 1.657 do Código Civil.'
  );

  if (f.testemunhas.length > 0) {
    linhas.push('');
    linhas.push('TESTEMUNHAS:');
    linhas.push('');
    f.testemunhas.forEach((t, i, arr) => {
      linhas.push(`${qualificacaoTestemunha(t)}.`);
      if (i < arr.length - 1) linhas.push('');
    });
  }

  const assinantes = [
    ...f.nubentes.map((n) => n.nome || 'Nubente'),
    ...f.testemunhas.map((t) => t.nome || 'Testemunha'),
  ];

  return montarMinuta({
    titulo: 'ESCRITURA PÚBLICA DE PACTO ANTENUPCIAL',
    corpoLinhas: linhas,
    fechamentoLinhas: [
      'Assim o disseram e me pediram que lavrasse a presente escritura, que, feita, leram e acharam conforme, outorgam e assinam.',
      `${cidadeCartorio()}, ${dataExtenso}.`,
    ],
    assinantes,
  });
}
