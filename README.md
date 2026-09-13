# Gerador de Formulários e Minutas Cartorárias

Aplicação web para preenchimento de formulários cartorários e geração de minutas de apoio ao atendimento do **1º Ofício de Notas de Volta Redonda/RJ**.

O sistema reúne dados de pessoas, documentos, poderes, imóveis, veículos, testemunhas, apostilamentos e solicitações de certidões em uma interface única. O preenchimento é feito localmente no navegador, sem backend ou banco de dados da aplicação.

## Funcionalidades

### Navegação e aparência

- Dashboard com sidebar fixa no desktop.
- Menu vertical com ícone, nome e indicação visual do formulário ativo.
- Menu hambúrguer com navegação off-canvas em telas pequenas.
- Tema claro e tema escuro.
- Layout responsivo para uso em computadores, tablets e celulares.
- Sidebar e controles de navegação ocultos na impressão.

### Formulários

- **Procuração**: cadastro de outorgantes, outorgados e testemunhas.
- Seleção de poderes para operações bancárias, INSS, farmácias, órgãos públicos, prefeituras, compra ou venda de imóvel, administração de imóvel, veículos, seguradora e outros poderes específicos.
- Inclusão de dados bancários, imóveis, administração de imóveis, veículos e informações complementares conforme o poder selecionado.
- **Apostilamento**: dados de entrega, requerentes, país de destino, documentos e assinatura apostilada.
- **Certidões**: solicitações de certidão de procuração, escritura ou testamento, dados do ato, finalidade, termos e condições e assinaturas.
- **União Estável**: cadastro dos companheiros, regime de bens, testemunhas e informações do ato.
- **Pacto Antenupcial**: cadastro das partes, regime de bens, testemunhas e informações do ato.
- **Outros Formulários**: área reservada para os demais modelos cadastrados no sistema.
- Máscaras e formatação para CPF, CNPJ, telefone e valores monetários.

### Minutas e impressão

- Geração de minuta para os formulários que possuem esse fluxo.
- Texto formatado em página A4 para revisão.
- Cópia do texto completo da minuta para a área de transferência.
- Impressão direta pelo navegador.
- Botão de impressão disponível nos formulários de apostilamento e certidões.
- Controles de interface e avisos informativos não aparecem no documento impresso.

## Tecnologias

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

## Requisitos

- Node.js 18 ou superior
- npm 9 ou superior

Verifique as versões instaladas:

```bash
node --version
npm --version
```

## Instalação

Clone o repositório e entre na pasta do projeto:

```bash
git clone https://github.com/LucasLimaTeixeira/cartorio-vr-formulario-minutas.git
cd cartorio-vr-formulario-minutas
```

Instale as dependências:

```bash
npm install
```

## Desenvolvimento

Inicie o servidor local:

```bash
npm run dev
```

Abra no navegador o endereço exibido pelo Vite, normalmente:

```text
http://localhost:5173
```

Para permitir acesso por outros dispositivos na mesma rede:

```bash
npm run dev -- --host 0.0.0.0
```

## Fluxo de uso

1. Abra o formulário desejado pela sidebar.
2. Preencha os dados solicitados.
3. Na Procuração, selecione os poderes necessários e complete os campos adicionais exibidos.
4. Revise os dados informados e as assinaturas.
5. Use **Gerar Minuta** quando essa opção estiver disponível.
6. Na tela da minuta, use **Copiar Texto** ou **Imprimir Minuta**.
7. Use **Imprimir** nos formulários que disponibilizam impressão direta.

Os campos podem ser preenchidos parcialmente para gerar um rascunho. Antes de utilizar qualquer documento oficialmente, revise cuidadosamente os dados e a redação.

## Scripts disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento com Vite. |
| `npm run build` | Gera a versão otimizada em `dist/`. |
| `npm run preview` | Serve localmente a versão gerada em `dist/`. |
| `npm run lint` | Executa a verificação do ESLint. |

Para validar a versão de produção:

```bash
npm run build
npm run preview
```

## Estrutura principal

```text
src/
	App.tsx                    # Navegação, estado e formulários
	index.css                  # Tema, dashboard, responsividade e impressão
	main.tsx                   # Ponto de entrada da aplicação
	types.ts                   # Tipos e opções dos formulários
	components/
		MinutaModal.tsx          # Visualização, cópia e impressão de minutas
	utils/
		gerarMinuta.ts           # Geração dos textos das minutas
```

## Personalização do cartório

Os dados exibidos no cabeçalho das minutas ficam em `src/utils/gerarMinuta.ts`, nas constantes do cartório:

```ts
const CARTORIO_NOME = '1º Ofício de Notas de Volta Redonda/RJ';
const CARTORIO_ENDERECO = '';
const CARTORIO_TABELIAO = '';
```

Atualize endereço e tabelião conforme necessário. Depois, execute novamente:

```bash
npm run lint
npm run build
```

## Privacidade e responsabilidade

O preenchimento é local no navegador e os dados não são persistidos em banco de dados pela aplicação. Ainda assim, evite compartilhar telas, textos copiados ou arquivos impressos que contenham dados pessoais.

As minutas são modelos de apoio ao atendimento e devem ser revisadas por profissional responsável antes de sua utilização oficial. O sistema não substitui conferência jurídica, documental ou cartorária.

## Backend e autenticação

O projeto atualmente não possui backend, autenticação ou persistência de dados. A sidebar não exibe perfil de usuário porque login e banco de dados ainda não fazem parte da aplicação.

Quando esses recursos forem implementados, a estrutura da sidebar poderá receber o usuário autenticado sem alterar a navegação dos formulários.

O plano técnico para essa evolução está em [docs/PLANO-INTEGRACAO-BANCO.md](docs/PLANO-INTEGRACAO-BANCO.md), incluindo entidades, regras de agenda, endpoints, segurança e fases de migração.

## Licença

Este repositório não possui uma licença de uso definida. Consulte o responsável pelo projeto antes de reutilizar ou redistribuir o código.
