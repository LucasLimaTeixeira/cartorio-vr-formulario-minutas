# Operação SaaS

## Aplicação inicial

1. Crie projetos separados no Supabase para desenvolvimento, homologação e produção.
2. Em cada projeto, aplique as migrations em ordem cronológica, inclusive as de agenda e governança SaaS.
3. Configure no ambiente de deploy somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nunca inclua a chave `service_role` no frontend.
4. Configure URLs de redirecionamento de autenticação para os domínios publicados e desative URLs de desenvolvimento em produção.

## Cobrança

As tabelas de assinatura são a fonte de autorização do produto. Um webhook executado em backend confiável (Edge Function ou API própria) deve:

- validar a assinatura do provedor de pagamento;
- localizar o workspace pelo identificador do cliente;
- atualizar `workspace_subscriptions.plan`, `status` e `current_period_end` com service role;
- registrar tentativas e erros fora do navegador.

Não atualize assinatura, plano ou status a partir do React. Workspaces `past_due`, `cancelled` ou `suspended` permanecem legíveis, mas não podem ser alterados.

## Segurança e operação

- Rotacione imediatamente qualquer credencial que tenha sido adicionada a arquivo versionado e remova-a do histórico antes de publicar o repositório.
- Ative MFA para administradores do Supabase e mantenha a `service_role` exclusivamente em secrets do backend.
- Revise mensalmente membros, convites ativos, eventos de auditoria e acesso administrativo.
- Execute backup testado e documente o procedimento de restauração.
- Monitore falhas de autenticação, erros de RPC, webhooks de cobrança e latência do banco.
- Rode `npm run check` e `npm audit` no CI antes de cada deploy.
