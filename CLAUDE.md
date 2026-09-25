# CLAUDE.md — Cartório OS

Memória do projeto para o Claude Code. Leia antes de qualquer tarefa.

## O que é

**Cartório OS** (repo `cartorio-vr-formulario-minutas`) é um SaaS multi-cartório para o balcão de
tabelionato de notas. O atendente preenche formulários estruturados (procuração, apostilamento,
certidões, união estável, pacto antenupcial), agenda o ato numa agenda compartilhada por
sala/atendente e gera **minutas de apoio** a partir de modelos com variáveis.

- Dono: Lucas Lima (escrevente de cartório, desenvolve o produto sozinho com o Claude).
- Idioma: **tudo em português do Brasil**: UI, nomes de funções/variáveis de domínio, comentários,
  mensagens de commit.
- O sistema **não usa IA generativa**. A minuta sai da substituição determinística dos dados num
  modelo, e um profissional sempre confere. Não trate "não é IA" como diferencial de venda, porque os
  sistemas de cartório concorrentes também funcionam assim.

## Stack

- React 18 + TypeScript + Vite 8 + Tailwind 3 + lucide-react. Sem roteador e sem gerenciador de estado.
- Supabase: Auth (e-mail/senha), Postgres com RLS, Realtime e Edge Functions (Deno).
- Windows 11 + PowerShell 5.1. O repo está dentro do OneDrive.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Vite em http://localhost:5173 |
| `npm run check` | lint + typecheck + build. **Rode antes de commitar.** |
| `npm run typecheck` / `npm run lint` | Separados |
| `npm run setup:windows` | Prepara um notebook novo (npm install + cria `.env.local`) |
| `npm run backup:banco` | pg_dump do Supabase (precisa de pg_dump 17 e `.env.backup.local`) |

Não há testes automatizados. Valide com `npm run check` e, em mudança de UI, abrindo o app.

Env do frontend (`.env.local`, fora do Git): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
**Nunca** use a `service_role` no frontend. Ela só existe nas Edge Functions.
Sem as variáveis, o app roda em modo demo local (`workspaceId = 'workspace-local-demo'`, agenda com
dados fictícios e nada gravado no banco).

## Mapa do código

```
src/
  main.tsx                      entrada → <AuthGate/>
  components/AuthGate.tsx       login/cadastro, onboarding (criar cartório ou entrar por código de convite),
                                carrega workspace + assinatura e aplica em workspaceProfile; Realtime de
                                plano/recursos/papel (perde acesso na hora se for removido)
  App.tsx (~3100 linhas)        TUDO do app: sidebar, abas, todos os formulários, agenda
                                (AgendaAtendimentos, PainelAtendente), máscaras CPF/CNPJ/telefone/moeda
  components/
    TelaInicial.tsx             aba 'inicio'
    BarraAtendimento.tsx        barra de atendimentos (abrir/novo/encerrar, status de gravação)
    MinutaModal.tsx             visualizar, copiar e imprimir a minuta (A4)
    TeamManager.tsx             equipe do cartório (proprietário)
    SuperAdminClients.tsx       painel do Super Admin: cartórios, contrato, plano, recursos, usuários
    ModelosMinutaAdmin.tsx      Super Admin edita os modelos de minuta
  utils/
    workspaceStorage.ts         workspaceProfile global + useWorkspaceProfile(); helpers de permissão
                                (canEditWorkspace, isWorkspaceOwner, hasWorkspaceFeature, isSystemAdmin);
                                sessionStorage por workspace (prefixo 'cartorio-saas:')
    atendimentos.ts             useAtendimento(): cada formulário preenchido é um "atendimento" (linha em
                                form_drafts); autosave 1s após a última alteração, fila serial de gravação
    agendaService.ts            agenda_items (kind 'pending' | 'appointment') via RPCs + Realtime
    equipe.ts                   membros reais do workspace para a agenda
    gerarMinuta.ts              monta o texto de cada minuta a partir do formulário
    modelosMinuta.ts            modelos padrão, variáveis {{NOME}}, blocos condicionais {{#X}}...{{/X}},
                                sobrescritos pela tabela minuta_templates
  lib/supabase.ts               cliente (null se não configurado → supabaseConfigured)
  types.ts                      tipos dos formulários e listas (PODERES_OPCOES, REGIMES_BENS, ESTADOS_CIVIS)
  index.css                     tema claro/escuro, dashboard, responsivo, @media print
supabase/
  migrations/                   aplicar EM ORDEM DE NOME (prefixo AAAAMMDDNNNN)
  functions/super-admin-create-user, super-admin-reset-user-password
site/                           landing page estática (HTML/CSS/JS puro, sem build), separada do app
docs/                           OPERACAO-SAAS.md, PLANO-INTEGRACAO-BANCO.md, portfólio, specs
scripts/                        preparar-notebook.ps1, backup-banco.ps1
```

## Modelo de domínio

- **Workspace = um cartório.** Tem nome, endereço, cidade/UF e tabelião, que entram no cabeçalho das minutas.
  Nenhum workspace é criado automaticamente: depois do login o usuário cria um ou entra com convite.
- **Papéis** (`workspace_members.role`): `owner`, `admin`, `attendant` (Operador), `viewer` (Consulta).
  Os três primeiros editam e `viewer` só lê. Quem gerencia a equipe é o `owner`.
- **Super Admin** (tabela `system_admins`, função `is_system_admin()`) é o operador do SaaS (Lucas). Vê as
  abas `super-admin` e `modelos-minuta`, cria usuários pelas Edge Functions e edita contrato e recursos.
- **Assinatura** (`workspace_subscriptions`): `plan` (`trial` | `professional`), `status`
  (`trialing` | `active` | `past_due` | `cancelled` | `suspended`), `features` (jsonb), `max_users`,
  `current_period_end`. Com `past_due`, `cancelled` ou `suspended` o workspace fica **somente leitura**.
  O React nunca altera a assinatura, só o Super Admin via RPC ou um webhook de backend.
- **Recursos (features)**: `agenda`, `procuracao`, `apostilamento`, `certidoes`, `uniao_estavel`,
  `pacto_antenupcial`, `outros`. Recurso desligado some do menu na hora (Realtime) e o RLS bloqueia no
  banco (`workspace_has_feature`, `form_type_feature`).
- **Atendimento** = uma linha em `form_drafts` (`form_type`, `title`, `data` jsonb). Vários atendentes
  preenchem o mesmo tipo ao mesmo tempo. Qualquer um reabre um atendimento em aberto. **Encerrar apaga
  a linha**, e com ela os dados pessoais. A aba do navegador lembra qual atendimento está aberto.
- **Agenda** (`agenda_items`): cadastros aguardando (`pending`) viram agendamentos (`appointment`) pela
  RPC `schedule_agenda_appointment`, que é transacional e impede conflito de sala/horário. Também há
  `cancel_agenda_appointment` e `set_agenda_appointment_realized`. As mudanças geram registro em `audit_events`.
- **Modelos de minuta** (`minuta_templates`): globais, valem para todos os cartórios. Todo usuário lê e
  só o Super Admin altera. O que não foi personalizado usa o texto padrão de `modelosMinuta.ts`.

## Regras e convenções

- **Segurança fica no banco.** Toda regra de permissão precisa existir no RLS ou dentro de uma RPC
  `security definer`. A checagem no React é só UX. Mudança de schema entra como **nova migration** em
  `supabase/migrations/` com prefixo de data/hora maior que o último. Não edite migrations já aplicadas.
- Funções internas do banco têm `execute` revogado de `public`/`anon` (ver migration `revoke_internal_function_execute`).
- Canais Realtime usam nome único (`...-${crypto.randomUUID()}`) por causa do StrictMode.
- Estado global do perfil: leia `workspaceProfile` fora de componentes e use `useWorkspaceProfile()`
  dentro deles, para re-renderizar quando plano ou papel mudarem.
- Estilo de código: funções curtas, comentários curtos em português que explicam o *porquê*, sem
  bibliotecas novas sem necessidade.
- Commits em português no imperativo/3ª pessoa ("Adiciona…", "Corrige…", "Separa…").
- As minutas são texto de apoio. Mantenha nas telas o aviso de que um profissional precisa revisar.
- Dados pessoais (CPF, RG, endereço) são sensíveis (LGPD). O CPF de usuários do sistema é guardado
  como hash (`profiles.cpf_hash`). Não logue dados pessoais.

## Pontos de atenção conhecidos

- O `README.md`, na seção "Privacidade", ainda diz que os dados não são persistidos. **Isso está
  desatualizado**: os atendimentos ficam em `form_drafts` até alguém encerrar.
- `App.tsx` é monolítico. Prefira extrair componentes novos para `src/components/` a aumentar o arquivo.
- Não existe cobrança automática (webhook de pagamento). O contrato é lançado à mão pelo Super Admin.
- Redundância pendente: ainda não houve nenhum backup real do banco (`npm run backup:banco` nunca rodou),
  falta proteger a `main` no GitHub (o `gh` CLI não está instalado) e falta tirar o repo do OneDrive.

## Como trabalhar com o Lucas

- Ele autoriza rodar o que for preciso (migrations, deploy, commit, push) sem pedir confirmação a cada
  passo. Mesmo assim, avise antes de ações destrutivas no banco de produção.
- Respostas em português, diretas. Em textos de venda, seja honesto e parta da dor real do balcão, sem
  exagerar.
