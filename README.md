# Gerador de Formulários e Minutas Cartorárias

Aplicação web para preenchimento de formulários cartorários e geração de minutas de apoio ao atendimento, com base preparada para operação por workspace.

O sistema reúne dados de pessoas, documentos, poderes, imóveis, veículos, testemunhas, apostilamentos e solicitações de certidões em uma interface única. Os rascunhos são persistidos localmente por workspace no navegador, mas ainda não são sincronizados entre usuários ou dispositivos.

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
- Texto padrão das minutas editável pelo Super Admin na aba **Modelos de Minutas**, com variáveis como `{{OUTORGANTES}}` e trechos condicionais `{{#FILHOS}}...{{/FILHOS}}`. Vale para todos os cartórios; o que não foi personalizado usa o texto original do código.
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

### Preparação rápida no Windows

Depois de clonar o repositório em um novo notebook, execute um único comando. Ele instala as dependências e solicita as chaves públicas do Supabase apenas se o arquivo `.env.local` ainda não existir:

```bash
npm run setup:windows
```

As chaves ficam somente no notebook, pois `.env.local` não é enviado ao GitHub.

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

Use essa opção somente em uma rede confiável. O servidor de desenvolvimento do Vite não deve ser exposto à internet nem usado como servidor de produção. Para uso local, prefira o comando padrão, que escuta apenas no computador.

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
| `npm run typecheck` | Verifica os tipos TypeScript sem gerar arquivos. |
| `npm run check` | Executa lint, typecheck e build em sequência. |
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
		ModelosMinutaAdmin.tsx   # Edição dos modelos de minuta (Super Admin)
	utils/
		gerarMinuta.ts           # Geração dos textos das minutas
		modelosMinuta.ts         # Modelos padrão, variáveis e preenchimento
```

## Personalização do cartório

Os dados exibidos no cabeçalho das minutas vêm do workspace autenticado (nome, endereço, cidade/UF e tabelião), informados na criação do cartório.

## Privacidade e responsabilidade

O preenchimento é local no navegador e os dados não são persistidos em banco de dados pela aplicação. Ainda assim, evite compartilhar telas, textos copiados ou arquivos impressos que contenham dados pessoais.

As minutas são modelos de apoio ao atendimento e devem ser revisadas por profissional responsável antes de sua utilização oficial. O sistema não substitui conferência jurídica, documental ou cartorária.

## Base SaaS e backend

A autenticação, o workspace e a sincronização usam Supabase. Depois do login, o usuário **cria o cartório** ou **entra com um código de convite**. Nenhum workspace é criado automaticamente.

Papéis: proprietário, administrador, atendente e consulta. A consulta visualiza dados; as demais funções editam rascunhos e agenda, conforme as políticas RLS. A equipe fica com o proprietário. Os modelos de minuta (tabela `minuta_templates`) são lidos por todos os usuários e alterados só pelo Super Admin.

### Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, execute as migrations em `supabase/migrations/` **na ordem dos nomes dos arquivos**.
3. Em **Project Settings > API**, copie a URL do projeto e a chave `anon` pública.
4. Crie `.env.local` na raiz usando [.env.example](.env.example):

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

5. Em **Authentication > URL Configuration**, configure `http://localhost:5173` como Site URL durante o desenvolvimento e adicione o domínio de produção nas Redirect URLs.
6. Em **Authentication > Providers > Email**, mantenha o provedor habilitado. Para exigir confirmação de e-mail, deixe **Confirm email** ativado.
7. Reinicie o Vite com `npm run dev`.

Rascunhos, fila e agenda ficam isolados por workspace. Nunca use a chave `service_role` no frontend.

O plano técnico está em [docs/PLANO-INTEGRACAO-BANCO.md](docs/PLANO-INTEGRACAO-BANCO.md).

## Licença

Este repositório não possui uma licença de uso definida. Consulte o responsável pelo projeto antes de reutilizar ou redistribuir o código.
