import React, { useState } from 'react';
import { FileText, Plus, Trash2, Building, User, Phone, MapPin, CreditCard, Home, Printer, Car, Shield, Calculator, DollarSign, AlertCircle, CheckCircle, Copy, Download } from 'lucide-react';
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
  PODERES_OPCOES,
  ESTADOS_CIVIS,
} from './types';
import { MinutaModal, TipoMinuta } from './components/MinutaModal';

function App() {
  const [abaAtiva, setAbaAtiva] = useState('procuracao');
  const [subabaEscritura, setSubabaEscritura] = useState('pagamento');
  const [minutaAberta, setMinutaAberta] = useState<TipoMinuta | null>(null);
  const [formulario, setFormulario] = useState<FormularioProcuracao>({
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
  });

  // Estado do formulário de pagamento
  const [formularioPagamento, setFormularioPagamento] = useState({
    imovel: '',
    precoTotal: '',
    pagamentos: {
      especie: { valor: '', usado: false },
      cheque: { 
        valor: '', 
        numero: '', 
        agencia: '', 
        conta: '', 
        banco: '', 
        titular: '',
        usado: false 
      },
      transferencia1: {
        valor: '',
        contaOrigem: '',
        agenciaOrigem: '',
        bancoOrigem: '',
        titularOrigem: '',
        contaDestino: '',
        agenciaDestino: '',
        bancoDestino: '',
        titularDestino: '',
        usado: false
      },
      transferencia2: {
        valor: '',
        numeroTransferencia: '',
        contaOrigem: '',
        agenciaOrigem: '',
        bancoOrigem: '',
        titularOrigem: '',
        contaDestino: '',
        agenciaDestino: '',
        bancoDestino: '',
        titularDestino: '',
        usado: false
      },
      tedDoc: { valor: '', numero: '', usado: false },
      parcelado: { descricao: '', usado: false },
      outros: { descricao: '', usado: false }
    }
  });

  const [totalCalculado, setTotalCalculado] = useState(0);
  const [diferenca, setDiferenca] = useState(0);
  const [declaracao, setDeclaracao] = useState('');

  const [formularioApostilamento, setFormularioApostilamento] = useState<FormularioApostilamento>({
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
  });

  const [formularioCertidao, setFormularioCertidao] = useState<FormularioCertidao>({
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
  });

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
        valorFormatado = aplicarMascaraDocumento(valor, pessoa.tipoDocumento);
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

  const togglePoder = (poder: string) => {
    setFormulario(prev => {
      const novosPoderes = prev.poderesOutorgados.includes(poder)
        ? prev.poderesOutorgados.filter(p => p !== poder)
        : [...prev.poderesOutorgados, poder];
  
      let novoFormulario = { ...prev, poderesOutorgados: novosPoderes };
  
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
    setFormulario(prev => ({
      ...prev,
      dadosImovel: prev.dadosImovel.map(dado =>
        dado.id === id ? { ...dado, [campo]: valor } : dado
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

  const atualizarDadosVeiculo = (id: string, campo: keyof DadosVeiculo, valor: string) => {
    setFormulario(prev => ({
      ...prev,
      dadosVeiculo: prev.dadosVeiculo.map(dado =>
        dado.id === id ? { ...dado, [campo]: valor } : dado
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

  const formatarCPF = (valor: string) => {
    const numbers = valor.replace(/\D/g, '').substring(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return numbers.replace(/(\d{3})(\d+)/, '$1.$2');
    if (numbers.length <= 9) return numbers.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
  };
  
  const formatarCNPJ = (valor: string) => {
    const numbers = valor.replace(/\D/g, '').substring(0, 14);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return numbers.replace(/(\d{2})(\d+)/, '$1.$2');
    if (numbers.length <= 8) return numbers.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    if (numbers.length <= 12) return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
  };
  
  const formatarTelefone = (valor: string) => {
    const numbers = valor.replace(/\D/g, '').substring(0, 11);
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 3) return `(${numbers.substring(0, 2)})${numbers.substring(2)}`;
    if (numbers.length <= 7) return `(${numbers.substring(0, 2)})${numbers.substring(2, 3)}.${numbers.substring(3)}`;
    return `(${numbers.substring(0, 2)})${numbers.substring(2, 3)}.${numbers.substring(3, 6)}-${numbers.substring(6)}`;
  };
  
  const aplicarMascaraDocumento = (valor: string, tipo: 'CPF' | 'CNPJ') => {
    return tipo === 'CPF' ? formatarCPF(valor) : formatarCNPJ(valor);
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
        valorFormatado = aplicarMascaraDocumento(valor, testemunha.tipoDocumento);
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

  const renderizarCamposPessoa = (pessoa: Pessoa, tipo: 'outorgantes' | 'outorgados', index: number) => (
    <div key={pessoa.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:border print:border-gray-400 print:bg-white">
      <div className="flex items-center justify-between mb-4 print:mb-2">
      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600 print:hidden" />
          {tipo === 'outorgantes' ? 'Outorgante' : 'Outorgado'} {index + 1}
        </h4>
        {(tipo === 'outorgantes' ? formulario.outorgantes.length > 1 : formulario.outorgados.length > 1) && (
          <button
            onClick={() => removerPessoa(tipo, pessoa.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors print:hidden"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-3 print:gap-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nome Completo</label>
          <input
            type="text"
            value={pessoa.nome}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'nome', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="Digite o nome completo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Tipo de Documento</label>
          <select
            value={pessoa.tipoDocumento}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'tipoDocumento', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          >
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">
            {pessoa.tipoDocumento === 'CPF' ? 'CPF' : 'CNPJ'}
          </label>
          <input
            type="text"
            value={pessoa.documento}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'documento', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder={pessoa.tipoDocumento === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">RG</label>
          <input
            type="text"
            value={pessoa.rg}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'rg', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="00.000.000-0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Expedição RG</label>
          <input
            type="date"
            value={pessoa.dataExpedicaoRg}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'dataExpedicaoRg', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Órgão Expedidor</label>
          <input
            type="text"
            value={pessoa.orgaoExpedidor}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'orgaoExpedidor', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="Ex: SSP/RJ, DETRAN/RJ"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Profissão</label>
          <input
            type="text"
            value={pessoa.profissao}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'profissao', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="Digite a profissão"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nacionalidade</label>
          <input
            type="text"
            value={pessoa.nacionalidade}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'nacionalidade', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
            placeholder="Ex: Brasileira"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Estado Civil</label>
          <select
            value={pessoa.estadoCivil}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'estadoCivil', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          >
            <option value="">Selecione o estado civil</option>
            {ESTADOS_CIVIS.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>

        {tipo === 'outorgantes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4 print:hidden" />
              Telefone
            </label>
            <input
              type="tel"
              value={pessoa.telefone || ''}
              onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'telefone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
              placeholder="(00) 00000-0000"
            />
          </div>
        )}

        <div className="md:col-span-2 print:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 print:hidden" />
            Endereço Completo
          </label>
          <textarea
            value={pessoa.endereco}
            onChange={(e) => atualizarPessoa(tipo, pessoa.id, 'endereco', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm print:rows-2"
            placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
          />
        </div>
      </div>
    </div>
  );

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
        <input
          type="text"
          value={requerente.cpf}
          onChange={(e) => atualizarRequerente(requerente.id, 'cpf', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="000.000.000-00"
          maxLength={14}
        />
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
          <input
            type="date"
            value={requerente.dataExpedicaoRg}
            onChange={(e) => atualizarRequerente(requerente.id, 'dataExpedicaoRg', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Estado Civil</label>
        <select
          value={requerente.estadoCivil}
          onChange={(e) => atualizarRequerente(requerente.id, 'estadoCivil', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
        >
          <option value="">Selecione o estado civil</option>
          {ESTADOS_CIVIS.map((estado) => (
            <option key={estado} value={estado}>{estado}</option>
          ))}
        </select>
      </div>

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
          placeholder="(00)0.000-0000"
          maxLength={14}
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
        <input
          type="date"
          value={requerente.dataNascimento}
          onChange={(e) => atualizarRequerente(requerente.id, 'dataNascimento', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
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
        <input
          type="text"
          value={requerente.cpf}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'cpf', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="000.000.000-00"
          maxLength={14}
        />
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
        <input
          type="date"
          value={requerente.dataExpedicaoRg}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'dataExpedicaoRg', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Estado Civil</label>
        <select
          value={requerente.estadoCivil}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'estadoCivil', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
        >
          <option value="">Selecione o estado civil</option>
          {ESTADOS_CIVIS.map((estado) => (
            <option key={estado} value={estado}>{estado}</option>
          ))}
        </select>
      </div>

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
          placeholder="(00)0.000-0000"
          maxLength={14}
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
        <input
          type="date"
          value={requerente.dataNascimento}
          onChange={(e) => atualizarRequerenteCertidao(requerente.id, 'dataNascimento', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
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

const renderizarCamposTestemunha = (testemunha: Testemunha, index: number) => (
  <div key={testemunha.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:border print:border-gray-400 print:bg-white">
    <div className="flex items-center justify-between mb-4 print:mb-2">
      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <User className="w-5 h-5 text-purple-600 print:hidden" />
        Testemunha {index + 1}
      </h4>
      <button
        onClick={() => removerTestemunha(testemunha.id)}
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
          onChange={(e) => atualizarTestemunha(testemunha.id, 'nome', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Digite o nome completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">CPF</label>
        <input
          type="text"
          value={testemunha.documento}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'documento', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="000.000.000-00"
          maxLength={14}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">RG</label>
        <input
          type="text"
          value={testemunha.rg}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'rg', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="00.000.000-0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Data de Expedição RG</label>
        <input
          type="date"
          value={testemunha.dataExpedicaoRg}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'dataExpedicaoRg', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Órgão Expedidor</label>
        <input
          type="text"
          value={testemunha.orgaoExpedidor}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'orgaoExpedidor', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Ex: SSP/RJ, DETRAN/RJ"
        />
      </div>
 
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Profissão</label>
        <input
          type="text"
          value={testemunha.profissao}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'profissao', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Digite a profissão"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nacionalidade</label>
        <input
          type="text"
          value={testemunha.nacionalidade}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'nacionalidade', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="Ex: Brasileira"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Estado Civil</label>
        <select
          value={testemunha.estadoCivil}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'estadoCivil', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
        >
          <option value="">Selecione o estado civil</option>
          {ESTADOS_CIVIS.map((estado) => (
            <option key={estado} value={estado}>{estado}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4 print:hidden" />
          Telefone
        </label>
        <input
          type="text"
          value={testemunha.telefone}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'telefone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
          placeholder="(00)0.000-0000"
          maxLength={14}
        />
      </div>
  
      <div className="md:col-span-2 print:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 print:hidden" />
          Endereço Completo
        </label>
        <textarea
          value={testemunha.endereco}
          onChange={(e) => atualizarTestemunha(testemunha.id, 'endereco', e.target.value)}
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
        onVoltar={() => setMinutaAberta(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 print:bg-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl print:px-2 print:py-4">
        <header className="text-center mb-8 print:mb-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3 print:text-2xl print:mb-1">
  <FileText className="w-10 h-10 text-blue-600 print:hidden" />
  Formulários  - Cartório 1º Ofício de Volta Redonda/RJ
</h1>
<p className="text-gray-600 text-lg print:text-sm print:mb-2">Sistema de Geração de Formulários</p>
        </header>

        {/* Sistema de Abas */}
        <div className="bg-white rounded-lg shadow-lg mb-8 print:shadow-none print:mb-4">
        <div className="border-b border-gray-200 print:hidden">
        <nav className="flex space-x-8 px-6">
  <button
    onClick={() => setAbaAtiva('procuracao')}
    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
      abaAtiva === 'procuracao'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    Procuração
  </button>
  <button
    onClick={() => setAbaAtiva('apostilamento')}
    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
      abaAtiva === 'apostilamento'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    Apostilamento
  </button>
  <button
    onClick={() => setAbaAtiva('certidoes')}
    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
      abaAtiva === 'certidoes'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    Certidões
  </button>
  <button
    onClick={() => setAbaAtiva('outros')}
    className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
      abaAtiva === 'outros'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    Outros Formulários
  </button>
</nav>
          </div>

          <div className="p-6 print:p-2">
            {abaAtiva === 'procuracao' && (
              <div className="space-y-8 print:space-y-4">
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
                      renderizarCamposPessoa(outorgante, 'outorgantes', index)
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
                      renderizarCamposPessoa(outorgado, 'outorgados', index)
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
      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 print:hidden"
    >
      <Plus className="w-4 h-4" />
      Adicionar Testemunha
    </button>
  </div>
  <div className="space-y-4 print:space-y-2">
    {formulario.testemunhas.length > 0 ? (
      formulario.testemunhas.map((testemunha, index) =>
        renderizarCamposTestemunha(testemunha, index)
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
                                    placeholder="ABC-1234"
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
                    onClick={() => setMinutaAberta('procuracao')}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Gerar Minuta
                  </button>
                  <button 
                    onClick={imprimirFormulario}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>
            )}

            {abaAtiva === 'apostilamento' && (
              <div className="space-y-8 print:space-y-4">
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
                        <input
                          type="date"
                          value={formularioApostilamento.dataEntrega}
                          onChange={(e) => atualizarCampoApostilamento('dataEntrega', e.target.value)}
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
                          type="number"
                          value={formularioApostilamento.quantidadeDocumentos}
                          onChange={(e) => atualizarCampoApostilamento('quantidadeDocumentos', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors print:border-gray-400 print:text-sm"
                          placeholder="Número de documentos"
                          min="1"
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
                    onClick={() => setMinutaAberta('apostilamento')}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Gerar Minuta
                  </button>
                  <button 
                    onClick={imprimirFormulario}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>
            )}
{abaAtiva === 'certidoes' && (
  <div className="space-y-8 print:space-y-4">
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
            <input
              type="date"
              value={formularioCertidao.dataEntrega}
              onChange={(e) => atualizarCampoCertidao('dataEntrega', e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nome do(s) Outorgante(s)</label>
            <textarea
              value={formularioCertidao.nomeOutorgantes}
              onChange={(e) => atualizarCampoCertidao('nomeOutorgantes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
              placeholder="Digite o nome completo do(s) outorgante(s)"
            />
          </div>

          <div className="md:col-span-2 print:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 print:mb-1">Nome do(s) Outorgado(s)</label>
            <textarea
              value={formularioCertidao.nomeOutorgados}
              onChange={(e) => atualizarCampoCertidao('nomeOutorgados', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none print:border-gray-400 print:text-sm"
              placeholder="Digite o nome completo do(s) outorgado(s)"
            />
          </div>

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
            <input
              type="date"
              value={formularioCertidao.data}
              onChange={(e) => atualizarCampoCertidao('data', e.target.value)}
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
    <section>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 print:text-lg print:mb-3">Termos e Condições</h2>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:compact">
        <div className="text-sm text-gray-700 leading-relaxed print:text-xs print:leading-tight">
          <p className="mb-4">
            Nos termos dos artigos 29 e seguintes da Consolidação Normativa da Corregedoria de Justiça deste Estado. 
            O requerente fica advertido da possibilidade de haver diferença no valor dos emolumentos, em função do número 
            de páginas da certidão (art 411 e seus parágrafos da Consolidação Normativa da Corregedoria Geral da Justiça 
            deste Estado). Tendo o mesmo requerente lido e conferido o requerimento.
          </p>
          <p>
            As exigências acima são em cumprimento ao artigo 2º e seus incisos do Provimento nº 61/2017 de 17/10/2017 
            da Corregedoria Nacional de Justiça.
          </p>
        </div>
      </div>
    </section>

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
        onClick={() => setMinutaAberta('certidoes')}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        Gerar Minuta
      </button>
      <button 
        onClick={imprimirFormulario}
        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
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