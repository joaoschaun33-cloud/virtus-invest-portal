# Progresso — Onda 3: fundação operacional

## Entregas

A primeira onda do plano de evolução adicionou uma camada inicial de observabilidade ao servidor.

- `server/_core/logger.ts`: logger estruturado em JSON com nível, timestamp, serviço, ambiente, mensagem e contexto.
- `server/_core/index.ts`: geração/preservação de `X-Request-Id`, log de duração/status de cada requisição, endpoint `/livez`, endpoint `/readyz` com status da dependência de banco, endpoint `/api/metrics` e logs estruturados de inicialização/falhas de jobs.
- `server/_core/metrics.ts`: métricas em memória de contagem, erros HTTP 5xx e duração média por rota.
- `server/logger.test.ts`: teste do contrato mínimo de logging estruturado.

## Validação

- `corepack pnpm check`: aprovado.
- `corepack pnpm test`: 26 arquivos aprovados, 69 testes aprovados e 1 teste ignorado.
- `corepack pnpm build`: aprovado.

## Limitações conhecidas

As métricas atuais são locais à instância e reiniciam com o processo. Para produção horizontal, a próxima evolução deve exportá-las para um backend persistente ou para Prometheus/OpenTelemetry. O `/readyz` verifica a disponibilidade do objeto de conexão; a próxima etapa deve incluir uma consulta leve e controlada ao banco quando o ambiente exigir garantia de leitura.

O próximo bloco recomendado é endurecer os jobs: lock distribuído/idempotência, timeout e retry controlado de integrações, status de execução e auditoria de efeitos.
