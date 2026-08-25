# Progresso — Onda 6: retenção e reconciliação de e-mails

## Entregas

A tabela `emailDeliveries` agora armazena também `resendId`, o identificador devolvido pelo Resend após uma submissão aceita. O fluxo de envio lê a resposta JSON, persiste esse ID e mantém a chave idempotente original para reconciliação posterior.

Foi adicionada a função `cleanupExpiredEmailDeliveries`, que remove registros expirados conforme a política de retenção. O servidor expõe o job protegido `POST /internal/jobs/email-deliveries-cleanup`, autenticado pelo mesmo `CRON_SECRET` dos demais jobs e protegido por lock distribuído.

A migração `drizzle/0003_email_deliveries.sql` foi atualizada para criar a coluna `resendId`. Os testes de idempotência agora cobrem reserva única, retry após falha e limpeza de registros expirados.

## Validação

- `corepack pnpm check`: aprovado.
- `corepack pnpm test`: 28 arquivos aprovados, 75 testes aprovados e 1 teste ignorado.
- `corepack pnpm build`: aprovado.

## Operação

A migração deve ser aplicada antes do deploy. O job de limpeza pode ser agendado diariamente ou semanalmente, conforme a política de retenção. Registros `sent` permanecem por 90 dias e registros `pending`/`failed` podem ser removidos após expiração.

A tabela deve ser usada para reconciliação por `idempotencyKey` e `resendId`. O endpoint do job não deve ser exposto sem o `CRON_SECRET` configurado.
