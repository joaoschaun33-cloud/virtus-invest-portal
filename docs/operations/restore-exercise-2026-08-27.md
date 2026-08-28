# Evidência de restauração — 27 de agosto de 2026

## Escopo

Exercício executado no projeto `portal-virtus`, sem alterar a instância de
produção `virtus-mysql`. Foi criada a instância temporária mínima
`virtus-restore-audit-20260827`, na região `southamerica-east1`, exclusivamente
para validar recuperação e depois descartá-la.

## Backup e operações

- Backup automático: `1787799600000`.
- Início do backup: `2026-08-27T04:19:37.979Z`.
- Fim do backup: `2026-08-27T04:21:29.549Z`.
- Estado do backup: `SUCCESSFUL`.
- Criação temporária: operação `5b684e89-d41c-4789-8d67-937c00000030`.
- Restauração: operação `5bf9b324-387a-4fbb-9d05-a66b00000030`.
- Resultado da restauração: concluída com sucesso.
- Migrações posteriores ao backup: aplicadas com sucesso na cópia restaurada.
- Descarte: instância temporária excluída com sucesso após a validação.

## Validações na cópia restaurada

| Verificação | Resultado |
| --- | ---: |
| Conexão autenticada ao MySQL restaurado | aprovada |
| Tabelas após migrações | 17 |
| Usuários | 2 |
| Ativos | 194 |
| Cotações | 1.027 |
| Snapshots financeiros CVM | 8 |
| Transações | 0 |
| Alertas de preço | 0 |
| Migração `editorialDrafts` | aplicada; tabela disponível |

O backup antecedia a publicação da área editorial no mesmo dia. A execução
comprovou que o procedimento correto é restaurar o volume e, em seguida,
aplicar todas as migrações pendentes antes de liberar uma aplicação recuperada.

## Resultado operacional

**Aprovado.** O backup pôde reconstruir um banco acessível e coerente, e o
schema atual pôde ser alcançado pelas migrações do repositório. A meta inicial
de RTO de quatro horas foi atendida com ampla margem neste exercício.

No próximo exercício trimestral, repetir o processo, registrar o responsável
nominal e incluir uma verificação funcional da aplicação apontada para a cópia.
