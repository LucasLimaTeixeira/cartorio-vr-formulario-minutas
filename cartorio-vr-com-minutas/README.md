# Gerador de Formulários e Minutas Cartorárias

Aplicação web para preenchimento de formulários cartorários e geração de minutas prontas para revisão, cópia e impressão.

O sistema foi desenvolvido para agilizar o atendimento do **1º Ofício de Notas de Volta Redonda/RJ**, reunindo em uma única interface dados de pessoas, documentos, poderes, imóveis, veículos e solicitações de certidões.

## Funcionalidades

- **Procuração**: cadastro de outorgantes, outorgados e testemunhas.
- Seleção de poderes para operações bancárias, INSS, farmácias, órgãos públicos, prefeituras, compra ou venda de imóvel, administração de imóvel, veículos, seguradora e outros poderes específicos.
- Inclusão de dados bancários, imóveis, veículos e informações complementares conforme o poder selecionado.
- **Apostilamento**: dados de entrega, requerentes, país de destino, documentos e assinatura apostilada.
- **Certidões**: solicitações de certidão de procuração, escritura ou testamento, com dados do ato e finalidade.
- Máscaras e formatação para CPF, CNPJ, telefone e valores monetários.
- Geração de minuta com texto formatado em página A4.
- Cópia do texto completo da minuta para a área de transferência.
- Impressão direta da minuta pelo navegador.

## Tecnologias

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

Todos os dados são processados no navegador. A aplicação não possui backend nem envia os formulários para um servidor.

## Requisitos

- Node.js 18 ou superior
- npm 9 ou superior

Confira as versões instaladas com:

```bash
node --version
npm --version
```

## Instalação

Clone o repositório e entre na pasta do projeto:

```bash
git clone https://github.com/LucasLimaTeixeira/cartorio-vr-formulario-minutas.git
cd cartorio-vr-formulario-minutas/cartorio-vr-com-minutas
```

Instale as dependências:

```bash
npm install
```

## Executar em desenvolvimento

Inicie o servidor local:

```bash
npm run dev
```

Abra no navegador o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

Para permitir acesso a outros dispositivos da mesma rede, use:

```bash
npm run dev -- --host 0.0.0.0
```

## Fluxo de uso

1. Abra uma das abas: **Procuração**, **Apostilamento**, **Certidões** ou **Outros**.
2. Preencha os dados solicitados.
3. Na procuração, selecione os poderes necessários e complete os campos adicionais exibidos.
4. Clique em **Gerar Minuta** para revisar o documento.
5. Na tela da minuta, use **Copiar Texto** ou **Imprimir Minuta**.

Os campos podem ser preenchidos parcialmente para gerar um rascunho. Antes de utilizar qualquer documento, revise cuidadosamente os dados e a redação.

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

## Personalização do cartório

Os dados exibidos no cabeçalho das minutas ficam no arquivo `src/utils/gerarMinuta.ts`, nas constantes:

```ts
const CARTORIO_NOME = '1º Ofício de Notas de Volta Redonda/RJ';
const CARTORIO_ENDERECO = '';
const CARTORIO_TABELIAO = '';
```

Atualize endereço e tabelião conforme necessário. Depois, execute novamente `npm run build` para validar a alteração.

## Privacidade e responsabilidade

O preenchimento é local no navegador e os dados não são persistidos em banco de dados pela aplicação. Ainda assim, evite compartilhar telas, textos copiados ou arquivos impressos que contenham dados pessoais.

As minutas são modelos de apoio ao atendimento e devem ser revisadas por profissional responsável antes de sua utilização oficial. O sistema não substitui conferência jurídica, documental ou cartorária.

## Licença

Este repositório não possui uma licença de uso definida. Consulte o responsável pelo projeto antes de reutilizar ou redistribuir o código.
