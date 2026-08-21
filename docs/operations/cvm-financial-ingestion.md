# Operação — ingestão financeira CVM

## Objetivo

Persistir diariamente os demonstrativos oficiais para que a navegação use o
banco local e a série histórica cresça a cada novo ITR/DFP.

## Fluxo

1. O Scheduler chama `POST /internal/jobs/cvm-financials` diretamente na URL
   estável do Cloud Run às 06:00 de Salvador. O domínio público não é usado,
   porque a hospedagem encaminha somente `/api/*` ao backend.
2. O endpoint exige o `CRON_SECRET` por comparação de tempo constante.
3. Ativos B3 ativos do tipo `STOCK` são identificados pelo cadastro oficial B3.
4. Cada arquivo CVM é baixado uma única vez para o lote.
5. Snapshots e trimestres são gravados por chaves únicas; repetição atualiza,
   mas não duplica dados.
6. A página consulta primeiro o banco e recorre à CVM somente quando ainda não
   existe snapshot persistido.

## Configuração

Após publicar a versão com a migração `0002`, execute uma vez:

```powershell
.\scripts\configure-cvm-scheduler.ps1
```

O script lê `virtus-cron-secret` diretamente do Secret Manager e cria ou atualiza
o job `virtus-cvm-financials`. Não coloque o segredo em arquivo local.

## Verificação

- Executar sob demanda: `gcloud scheduler jobs run virtus-cvm-financials --location=southamerica-east1 --project=portal-virtus`.
- Consultar logs do serviço procurando por `[CVM Ingestion]`.
- Resultado saudável: `saved > 0` e lista `failures` vazia ou explicável por
  ativo sem demonstração consolidada.

## Recuperação

O job é idempotente. Em caso de falha da CVM ou do banco, basta executá-lo
novamente; nenhuma exclusão ou limpeza é necessária.
