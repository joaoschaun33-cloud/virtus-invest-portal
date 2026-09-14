# Progresso — Onda 7: execução e rastreamento de jobs

## Entregas

Foi adicionada a tabela `jobRuns` ao schema Drizzle e criada a migração `drizzle/0004_job_runs.sql`. Cada execução possui `jobName`, `runId`, `requestId`, status, início, conclusão, duração, itens processados, falhas, erro e detalhes estruturados.

O módulo `server/jobRuns.ts` implementa o ciclo de vida persistido com `startJobRun`, `finishJobRun` e `listRecentJobRuns`. Quando o banco não está configurado, o modo demo mantém um registro local para preservar o comportamento de desenvolvimento.

O monitor de alertas agora registra execuções com status e contagem de falhas. O job de limpeza de entregas idempotentes e o job de ingestão CVM também registram início, conclusão, duração e resultados. Foi adicionado o endpoint protegido `GET /internal/jobs/runs`, autenticado pelo `CRON_SECRET`, para consultar execuções recentes.

## Validação

- `corepack pnpm check`: aprovado.
- `corepack pnpm test`: 29 arquivos aprovados, 77 testes aprovados e 1 teste ignorado.
- `corepack pnpm build`: aprovado.

## Ação necessária

Aplicar `drizzle/0004_job_runs.sql` antes do deploy. O endpoint de consulta deve permanecer protegido e ser usado inicialmente por monitoramento interno. Em seguida, recomenda-se adicionar retenção e paginação ao histórico, além de uma tela operacional com filtros por job, status e período.
