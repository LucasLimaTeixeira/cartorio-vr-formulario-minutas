export interface Pessoa {
  id: string;
  nome: string;
  documento: string;
  tipoDocumento: 'CPF' | 'CNPJ';
  nacionalidade: string;
  rg: string;
  dataExpedicaoRg: string;
  orgaoExpedidor: string;
  endereco: string;
  telefone?: string;
  profissao: string;
  estadoCivil: string;
}

export interface DadosBancarios {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  numeroBeneficio: string;
}

export interface DadosImovel {
  id: string;
  tipoTransacao: 'compra' | 'venda';
  valorTransacao: string;
  tipoVenda: 'minima' | 'total';
  formaPagamento: 'vista' | 'financiada';
  dadosImovel: string;
}

export interface DadosAdministracaoImovel {
  id: string;
  dadosImovel: string;
}

export interface DadosVeiculo {
  id: string;
  marcaModelo: string;
  placa: string;
  renavam: string;
  chassi: string;
  especieTipo: string;
  anoFabricacao: string;
  anoModelo: string;
  enderecoNomePatio: string;
}

export interface OutrosPoderes {
  id: string;
  outros: string;
}

export interface Testemunha {
  id: string;
  nome: string;
  documento: string;
  tipoDocumento: 'CPF';
  nacionalidade: string;
  rg: string;
  dataExpedicaoRg: string;
  orgaoExpedidor: string;
  endereco: string;
  telefone: string;
  profissao: string;
  estadoCivil: string;
}

export interface Requerente {
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  dataExpedicaoRg: string;
  orgaoExpedidor: string;
  endereco: string;
  telefone: string;
  profissao: string;
  estadoCivil: string;
  email: string;
  dataNascimento: string;
  filiacao: string;
}

export interface FormularioApostilamento {
  dataEntrega: string;
  horarioEntrega: string;
  requerentes: Requerente[];
  paisDestino: string;
  quantidadeDocumentos: string;
  quaisDocumentos: string;
  assinaturaApostilada: string;
}

export interface FormularioCertidao {
  dataEntrega: string;
  horarioEntrega: string;
  requerentes: Requerente[];
  tipoCertidao: 'procuracao' | 'escritura' | 'testamento' | '';
  nomeOutorgantes: string;
  nomeOutorgados: string;
  livro: string;
  folha: string;
  data: string;
  finalidade: string;
}

export interface FormularioProcuracao {
  outorgantes: Pessoa[];
  outorgados: Pessoa[];
  testemunhas: Testemunha[];
  poderesOutorgados: string[];
  dadosBancarios: DadosBancarios[];
  dadosImovel: DadosImovel[];
  dadosAdministracaoImovel: DadosAdministracaoImovel[];
  dadosVeiculo: DadosVeiculo[];
  outros: OutrosPoderes[];
}

export interface FormularioUniaoEstavel {
  companheiros: Pessoa[];
  dataInicioUniao: string;
  regimeBens: string;
  enderecoComum: string;
  filhos: string;
  testemunhas: Testemunha[];
}

export interface FormularioPactoAntenupcial {
  nubentes: Pessoa[];
  regimeBens: string;
  clausulasEspecificas: string;
  dataPrevistaCasamento: string;
  bensParticulares: string;
  testemunhas: Testemunha[];
}

export const REGIMES_BENS = [
  'Comunhão Parcial de Bens',
  'Comunhão Universal de Bens',
  'Separação Total de Bens',
  'Participação Final nos Aquestos',
];

export const PODERES_OPCOES = [
  'BANCÁRIA',
  'INSS',
  'FARMÁCIA',
  'ÓRGÃOS PÚBLICOS',
  'CBS',
  'PREFEITURAS',
  'COMPRA OU VENDA DE IMÓVEL',
  'ADMINISTRAÇÃO DE IMÓVEL',
  'SEGURADORA/REMOÇÃO DO PÁTIO',
  'AD JUDICIA',
  'OUTROS PODERES ESPECIFICOS'
];

export const ESTADOS_CIVIS = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável'
];
