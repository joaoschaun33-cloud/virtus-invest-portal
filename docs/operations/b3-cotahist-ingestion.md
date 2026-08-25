# Operação da ingestão B3 COTAHIST D-1

## Finalidade

O job importa preços oficiais de fechamento (OHLC) e quantidade negociada do
arquivo diário COTAHIST da B3. Ele atualiza somente ativos já cadastrados no
Virtus; o arquivo não é usado para criar automaticamente todo o universo B3.

## Agenda

- Endpoint: `POST /internal/jobs/b3-cotahist`.
- Autenticação: `Authorization: Bearer <CRON_SECRET>`.
- Frequência recomendada: terça a sábado, 00:30 UTC (21:30 em Brasília no dia
  anterior), cobrindo os pregões de segunda a sexta.
- O job procura o arquivo mais recente em até oito dias, ignorando fins de
  semana, e pode ser reexecutado sem duplicar a cotação.

## Contrato dos dados

- Fonte persistida: `b3`.
- Intervalo: `1D`.
- Preços: campos oficiais PREABE, PREMAX, PREMIN e PREULT, com duas casas
  decimais implícitas no arquivo.
- Volume: QUATOT, isto é, quantidade total de títulos/contratos negociados.
- Variação: calculada somente quando existe fechamento oficial anterior; sem
  base anterior, permanece `null`.
- Ausências nunca são substituídas por zero.

## Segurança e limites

- ZIP limitado a 8 MB e conteúdo descompactado a 80 MB.
- Download com timeout de 30 segundos.
- Apenas registros tipo 01, mercado à vista 010 e códigos BDI 02, 12 e 14 são
  aceitos.
- Lock distribuído impede duas execuções concorrentes.
- Cada execução é registrada em `jobRuns`.

## Primeira publicação

1. Confirmar backup recente e bem-sucedido do Cloud SQL.
2. Publicar a revisão contendo o job.
3. Executar a ingestão B3 uma vez e conferir `parsed`, `matched` e `saved`.
4. Executar a limpeza protegida em
   `POST /internal/jobs/demo-data-cleanup`, enviando o corpo
   `{ "confirm": "REMOVE_DEMO_DATA" }`.
5. Conferir que não restaram cotações, notícias, eventos ou dividendos com
   fonte `catalog`, e que ativos ainda sem cobertura exibem indisponibilidade.
6. Criar/atualizar o Cloud Scheduler somente depois da execução manual válida.

## Incidentes

- HTTP 404: o arquivo pode ainda não ter sido publicado; reexecutar depois.
- HTTP 406: confirmar que nenhum cabeçalho `Accept` incompatível foi adicionado.
- `matched = 0`: verificar se os tickers B3 já existem no catálogo interno.
- `saved < matched`: verificar logs estruturados e o estado do Cloud SQL.
- Arquivo sem registros válidos: não limpar dados anteriores; investigar mudança
  de layout antes de alterar o parser.

## Licença e procedência

Manter no dossiê jurídico a confirmação escrita do enquadramento do Virtus para
redistribuição de dados B3 D-1. A rotina técnica não autoriza por si só a
redistribuição; qualquer mudança para dados atrasados intraday ou tempo real
exige contrato específico.
