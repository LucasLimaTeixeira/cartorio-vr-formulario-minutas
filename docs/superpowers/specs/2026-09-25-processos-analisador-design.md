# Processos, perfil Analisador e painel inicial — Design

**Data:** 2026-09-25
**Status:** primeira versão. Os campos de cada tipo de ato (compra e venda, inventário etc.) serão
detalhados depois, com base no que for levantado presencialmente no cartório.

## Objetivo

1. **Painel inicial por usuário:** a tela inicial mostra os agendamentos de quem está logado, no dia
   e em qualquer data escolhida. Proprietário e administrador podem ver o painel de um colega.
2. **Processos:** controle do que entrou no cartório para lavratura — qualquer ato (escritura,
   procuração, união estável, pacto etc.) —, com gaveta, data prevista, etapa, certidões e exigências.
3. **Perfil Analisador:** faz tudo que o atendente faz e, além disso, completa e acompanha processos.

## Decisões

- O processo é **separado do atendimento** (`form_drafts`). O atendimento é apagado ao encerrar por
  conter dados pessoais; o processo precisa durar até a lavratura. O formulário tem o botão
  "Abrir processo", que leva o tipo de ato e os nomes das partes.
- **Tabelas próprias** (`processos`, `processo_certidoes`, `processo_exigencias`) para permitir buscas
  entre processos (vencimentos da semana, gaveta, etapa) com RLS por cartório.
- "Processos" é um **recurso por cartório** (`features.processos`), ligado pelo Super Admin.

## Perfis

| Ação | Proprietário / Admin | Analisador | Atendente | Consulta |
| --- | --- | --- | --- | --- |
| Formulários e agenda | edita | edita | edita | lê |
| Criar processo | sim | sim | sim | não |
| Editar processo, certidões, exigências | sim | sim | não | não |
| Ver processos | sim | sim | sim | sim |

`can_edit_workspace` passa a incluir `analyst`. Nova função `can_manage_processos`
(owner, admin, analyst + assinatura ativa + recurso ligado).

## Dados

- **processos:** tipo de ato, partes (lista de nome + CPF/CNPJ), imóvel/objeto, gaveta, data de entrada,
  data prevista, etapa, responsável, observações, autoria e datas.
- **Etapas:** recebido → em análise → em exigência → pronto para lavratura → lavrado; ou cancelado.
- **processo_certidoes:** tipo, a quem se refere (imóvel ou parte), emissão, vencimento, observação.
- **processo_exigencias:** texto, cumprida (sim/não), quem cumpriu e quando.
- **Prazos de validade por tipo de certidão:** padrão no código (30 dias), sobrescrito por cartório em
  `workspace_settings.prazos_certidoes`, editável pelo proprietário/administrador.

### Tipos de certidão

Ônus Reais (Registro de Imóveis competente); Interdição e Tutela; Distribuição de Ações Cíveis —
Justiça Estadual; Distribuição de Ações Fiscais — Justiça Estadual; Distribuição de Ações Cíveis e
Fiscais — Justiça Federal; Distribuição de Ações — Justiça do Trabalho; Outra (validade digitada).

### Alertas

- **Vencida:** vencimento anterior a hoje.
- **Vencendo:** vence em até 5 dias ou antes da data prevista do processo.
- Processos lavrados ou cancelados não geram alerta.

## Telas

- **Tela inicial (painel):** agendamentos do dia do usuário com seletor de data; seus processos com
  data prevista próxima; certidões vencendo/vencidas (quem gerencia processos).
- **Processos:** lista com busca (parte, gaveta), filtro por etapa e "só com alerta"; botão novo
  processo; processo aberto com dados, certidões e exigências. Exigências podem ser copiadas ou
  impressas como nota de exigência.

## Fora desta versão

Campos específicos por tipo de ato, anexos/digitalização, histórico detalhado de mudanças de etapa,
notificações por e-mail.
