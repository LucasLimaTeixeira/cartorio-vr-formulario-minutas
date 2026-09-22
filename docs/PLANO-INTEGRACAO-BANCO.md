# Plano de integração com banco de dados
> Segurança: credenciais não devem ser armazenadas nesta documentação nem versionadas.
> Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` somente no arquivo
> `.env.local` (ignorado pelo Git). Caso uma credencial tenha sido incluída aqui,
> revogue-a e gere uma nova no painel do Supabase.
## Estado atual

A aplicação funciona inteiramente no navegador. Os formulários e a agenda são mantidos em estados React (`useState`) e não existe:

- backend ou API;
- autenticação e autorização;
- persistência em banco de dados;
- sincronização entre usuários e dispositivos;
- histórico de alterações ou auditoria.

Como primeira etapa de preparação para SaaS, os cinco formulários agora usam um adaptador de armazenamento com chave por `workspaceId`. Essa camada mantém rascunhos após o recarregamento e deverá ser substituída por chamadas autenticadas à API; `localStorage` não fornece isolamento, autorização ou sincronização suficientes para produção.

Por isso, os dados atuais são demonstrativos e são perdidos ao recarregar a página.

## Arquitetura recomendada

A aplicação não deve acessar o banco diretamente pelo navegador. O fluxo recomendado é:

```text
React/Vite -> API autenticada -> Banco PostgreSQL
                    |
                    +-> validações, permissões e auditoria
```

Uma opção pragmática para a primeira versão é um backend Node.js/TypeScript com API REST e PostgreSQL. O frontend continuará usando os mesmos formulários, mas trocará os estados locais por chamadas a serviços tipados.

Esta implementação escolhe Supabase como infraestrutura PostgreSQL, autenticação e armazenamento inicial. As políticas de acesso (RLS) estão na migration `supabase/migrations/202609170001_saas_foundation.sql` e devem ser aplicadas antes de disponibilizar o sistema.

## Entidades principais

### `usuarios`

- `id`
- `nome`
- `email`
- `perfil` (`admin`, `atendente`, `consulta`)
- `ativo`
- `created_at`
- `updated_at`

### `salas`

- `id`
- `nome`
- `ativo`
- `created_at`

As três salas atualmente usadas pela interface devem ser registros do banco, e não uma regra fixa no frontend.

### `atendentes`

- `id`
- `usuario_id`
- `funcao`
- `foto_url`
- `ativo`
- `created_at`
- `updated_at`

A foto deve ser armazenada em um serviço de arquivos, com apenas a URL e metadados no banco.

### `formularios`

- `id`
- `tipo` (`procuracao`, `apostilamento`, `certidao`, `uniao_estavel`, `pacto_antenupcial`)
- `status` (`rascunho`, `aguardando_agendamento`, `agendado`, `concluido`, `cancelado`)
- `dados_json` ou tabelas normalizadas por tipo
- `criado_por`
- `created_at`
- `updated_at`

Na primeira fase, `dados_json` versionado pode acelerar a migração. Dados usados para busca e relatórios, como cliente, tipo, status e datas, devem ter colunas próprias.

### `agendamentos`

- `id`
- `formulario_id`
- `atendente_id`
- `sala_id` nulo para certidões e apostilamentos
- `cliente_nome`
- `tipo_ato`
- `data`
- `hora_inicio`
- `hora_fim` ou duração padrão
- `status` (`agendado`, `realizado`, `cancelado`)
- `observacao`
- `created_by`
- `created_at`
- `updated_at`

A regra de sala deve ser aplicada no servidor: no máximo um agendamento por sala no mesmo intervalo e no máximo três atos com sala no mesmo horário. Agendamentos sem sala não entram nessa contagem.

### `auditoria`

- `id`
- `usuario_id`
- `entidade`
- `entidade_id`
- `acao`
- `dados_anteriores`
- `dados_novos`
- `created_at`

Deve registrar criação, alteração, remarcação, cancelamento e conclusão de agendamentos.

## Regras que precisam ficar no backend

1. Validar datas no formato recebido e armazená-las como `date`.
2. Validar horários dentro da grade permitida de 08:30 a 17:00, em intervalos de 30 minutos.
3. Impedir agendamento em sala ocupada.
4. Impedir mais de três atos com sala no mesmo horário.
5. Permitir certidão e apostilamento sem `sala_id`.
6. Impedir que um ato cancelado seja marcado como realizado.
7. Exigir confirmação de cancelamento também na API, não apenas na interface.
8. Restringir alterações conforme o perfil do usuário.
9. Não retornar dados pessoais para usuários sem permissão.
10. Registrar operações sensíveis na auditoria.

## Endpoints iniciais

```text
POST   /auth/login
GET    /me
GET    /atendentes
GET    /salas
POST   /formularios
GET    /formularios?status=aguardando_agendamento
GET    /formularios/:id
PATCH  /formularios/:id
POST   /formularios/:id/agendamento
GET    /agendamentos?data=dd/mm/aaaa
PATCH  /agendamentos/:id/remarcar
PATCH  /agendamentos/:id/realizar
POST   /agendamentos/:id/cancelar
GET    /atendentes/:id/relatorio
```

Cancelamento e remarcação devem usar operações explícitas, com usuário autenticado e registro de auditoria.

## Migração do frontend

1. Criar tipos compartilhados para respostas da API e estados de carregamento (`loading`, `error`, `success`).
2. Extrair a agenda para um serviço `agendaService`.
3. Extrair o cadastro de formulários para `formularioService`.
4. Manter os componentes de formulário e trocar apenas os handlers locais por chamadas aos serviços.
5. Carregar a fila “Aguardando agendamento” do backend.
6. Atualizar a grade após cadastro, remarcação, cancelamento e conclusão.
7. Adicionar autenticação e proteção de rotas.
8. Remover os dados demonstrativos somente depois que a API estiver validada.

## Ordem segura de implementação

### Fase 1: contrato e ambiente

- escolher PostgreSQL + API própria ou Supabase;
- definir variáveis de ambiente;
- criar migrations;
- definir contratos TypeScript;
- configurar ambiente de desenvolvimento e testes.

### Fase 2: autenticação e cadastros-base

- login;
- perfis e permissões;
- usuários, atendentes e salas;
- upload seguro das fotos.

### Fase 3: formulários

- persistir rascunhos;
- salvar formulário como `aguardando_agendamento`;
- carregar e editar dados persistidos;
- validar permissões por usuário.

### Fase 4: agenda

- fila de pendências;
- criação, remarcação, cancelamento e conclusão;
- bloqueio transacional de sala e capacidade;
- painel por atendente e relatórios.

### Fase 5: produção

- testes de concorrência para duas pessoas tentando a mesma sala;
- backup e restauração;
- logs e auditoria;
- política de retenção de dados pessoais;
- revisão de segurança e publicação.

## Validações atuais

Antes da integração, o projeto foi validado com:

```bash
npm run lint
npm run build
```

A aplicação está pronta para receber uma camada de serviços, mas ainda não deve ser conectada diretamente a credenciais de banco no frontend.

## Decisão adotada

Para iniciar a próxima etapa, precisamos escolher uma destas opções:

- **API própria + PostgreSQL**: mais controle, melhor para regras cartorárias e crescimento do sistema.
- **Supabase**: implantação inicial mais rápida, com PostgreSQL, autenticação e armazenamento, exigindo configuração cuidadosa de RLS.

A aplicação usa Supabase para a primeira versão SaaS. As regras críticas da agenda ainda precisam ser migradas para funções ou Edge Functions transacionais antes do uso concorrente em produção.
