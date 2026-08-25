# ADR-008: Integração CoinGecko e EODHD

## Status

Proposto em 23/08/2026. A ativação pública depende da confirmação do plano e
dos direitos de redistribuição contratados em cada provedor.

O sequenciamento de fontes oficiais, remoção de demonstrações e futuras
contratações está definido em `market-data-roadmap-2026.md`.

## Objetivo

Usar a CoinGecko como fonte especializada em criptoativos e a EODHD como fonte
de mercado internacional e complemento de dados brasileiros, sem acoplar as
rotas do produto aos formatos externos, desperdiçar cota ou apresentar dados
antigos como atuais.

## Diagnóstico do projeto

- `marketProviders.ts` concentra transporte, normalização, seleção e cache em
  memória para brapi, Twelve Data e Finnhub.
- `dataSourcePolicy.ts` só conhece esses três provedores. CoinGecko e EODHD não
  participam da seleção, cobertura, status ou catálogo de procedência.
- O cache genérico dura 60 segundos e o cache de cotação/snapshot, 20 segundos.
  Isso é adequado para preço CoinGecko Pro, mas inadequado para fundamentos,
  catálogos, séries históricas e indisponibilidades.
- O cache é local a cada processo, não é compartilhado e desaparece em um novo
  deploy. Chamadas concorrentes iguais não são agrupadas (cache stampede).
- O screener pode fazer uma chamada de fundamentos por ativo, o que aumenta
  muito o consumo em um provedor que cobra 10 unidades por fundamentos.
- Existem `COINGECKO_API` e `EODHD_API` no ambiente local. Os nomes atuais são
  aceitos como compatibilidade, mas não seguem a nomenclatura proposta abaixo.
- Validação em 23/08/2026: a chave CoinGecko é Demo e respondeu a preços de
  Bitcoin, Ethereum e Solana em BRL/USD. A EODHD respondeu a cotação e histórico
  OHLC de `PETR4.SA`; fundamentos v1.1 retornaram HTTP 403, portanto o módulo
  não está habilitado no plano atual.

## Divisão de responsabilidades

| Domínio                        | Fonte primária         | Fonte secundária                | Observação                                                |
| ------------------------------ | ---------------------- | ------------------------------- | --------------------------------------------------------- |
| Cripto: preço e mercado        | CoinGecko              | EODHD CC                        | CoinGecko usa ID canônico, não símbolo, evitando colisões |
| Cripto: histórico              | CoinGecko market chart | EODHD CC                        | Preservar a granularidade real retornada                  |
| Ações B3: cotação              | brapi                  | EODHD `.SA`                     | EODHD global é normalmente atrasada; rotular atraso       |
| Ações B3: fundamentos oficiais | CVM/B3                 | EODHD                           | EODHD complementa; não substitui fatos regulatórios       |
| Mercados internacionais        | EODHD                  | fornecedor licenciado existente | Símbolo interno deve mapear para `CODE.EXCHANGE`          |
| Notícias/calendário            | fontes atuais          | EODHD, após licença             | Não faz parte do primeiro incremento                      |

CoinGecko não deve ser fallback genérico para ações, forex ou índices. EODHD
não deve substituir CoinGecko no ranking e metadados de cripto, onde CoinGecko
tem um modelo de domínio mais rico.

## Endpoints recomendados

### CoinGecko

1. `/simple/price`: cotação agrupada de todos os criptoativos visíveis; incluir
   market cap, volume, variação de 24 h e `last_updated_at`.
2. `/coins/markets`: lista/ranking e screener de cripto, com paginação.
3. `/coins/{id}/market_chart/range`: histórico por janela; não fabricar OHLC a
   partir desses pontos.
4. `/coins/{id}/ohlc`: usar apenas quando o gráfico exigir candles OHLC e aceitar
   a granularidade automática do endpoint.
5. `/coins/list`: catálogo para job de sincronização, nunca no caminho de uma
   requisição de usuário.

Guardar `coinGeckoId` no cadastro do ativo (`bitcoin`, `ethereum`, `solana`). Não
resolver por símbolo em tempo de execução: símbolos não são únicos. Para tokens
on-chain, guardar também `networkId` e endereço do contrato.

Autenticação:

- Demo: host `https://api.coingecko.com/api/v3` e header
  `x-cg-demo-api-key`.
- Pro: host `https://pro-api.coingecko.com/api/v3` e header
  `x-cg-pro-api-key`.
- A chave deve ficar somente no backend. Configuração proposta:
  `COINGECKO_PLAN=demo|pro` e `COINGECKO_API_KEY`.

### EODHD

1. `/api/real-time/{ticker}`: snapshot atual/atrasado, preferencialmente com
   múltiplos símbolos quando o contrato permitir.
2. `/api/eod/{ticker}`: histórico diário/semanal/mensal, solicitando JSON e uma
   janela explícita.
3. `/api/v1.1/fundamentals/{ticker}`: somente seções/campos usados pelo produto,
   evitando a resposta completa.
4. `/api/exchange-symbol-list/{exchange}`: job periódico para cobertura e
   mapeamento; `SA` representa São Paulo e os ativos usam sufixo `.SA`.
5. Bulk EOD/fundamentals: somente em ingestão agendada e depois de comparar o
   custo do plano. Não usar por interação de tela.

Autenticação: `EODHD_API_TOKEN` somente no backend, aceitando `EODHD_API` como
alias temporário. Embora a API aceite token na query string, o cliente interno
deve mascarar query strings em logs e métricas.

## Arquitetura proposta

Criar adaptadores separados (`providers/coingecko.ts` e
`providers/eodhd.ts`) atrás dos contratos internos atuais. Cada adaptador deve
conter apenas transporte, validação do payload e normalização. A política central
continua escolhendo a fonte por capacidade e classe de ativo.

Adicionar um registro de provedores com: capacidades, classes de ativo,
prioridade, estado da credencial, aprovação de exibição pública e nível de
freshness. O retorno interno deve carregar pelo menos `source`, `providerAsOf`,
`fetchedAt`, `freshness`, `isStale`, `isDemo` e, quando conhecido,
`delayMinutes`.

Separar identidade do ativo da apresentação:

```text
assetId -> ticker público -> provider symbols
BTC/USD -> CoinGecko: bitcoin | EODHD: BTC-USD.CC
PETR4   -> brapi: PETR4     | EODHD: PETR4.SA
```

Não adicionar chamadas diretamente nas rotas tRPC ou componentes React. As
rotas consomem apenas os contratos normalizados (`quote`, `history`,
`fundamentals`, `market-list`).

## Plano de cache

Aplicar cache-aside com agrupamento de requisições concorrentes, jitter de até
10% e stale-while-revalidate. A chave deve conter provedor, endpoint, versão do
normalizador e parâmetros normalizados; nunca a credencial.

| Dado                            | TTL fresco |       Servir stale por | Persistência           |
| ------------------------------- | ---------: | ---------------------: | ---------------------- |
| CoinGecko `/simple/price` Pro   |       20 s |                  2 min | Redis/compartilhado    |
| CoinGecko mercados/ranking      |       60 s |                  5 min | Redis/compartilhado    |
| CoinGecko histórico 1 dia       |       30 s |                  5 min | Redis + banco opcional |
| CoinGecko histórico 2–90 dias   |     30 min |                    6 h | Redis + banco          |
| CoinGecko histórico >90 dias    |       12 h |                   48 h | banco/objeto           |
| CoinGecko catálogo de moedas    |       24 h |                 7 dias | banco                  |
| EODHD cotação atrasada          |       60 s |                 15 min | Redis/compartilhado    |
| EODHD histórico do dia corrente |     15 min | até próximo fechamento | Redis                  |
| EODHD histórico fechado         |       24 h |                 7 dias | banco                  |
| EODHD fundamentos               |       24 h |                 7 dias | banco                  |
| EODHD símbolos/exchanges        |       24 h |                 7 dias | banco                  |

O TTL da CoinGecko segue o cache documentado pelo provedor. Para EODHD, os
valores acima são uma política conservadora do produto e devem ser ajustados ao
plano e ao horário da bolsa. Dados históricos anteriores ao último pregão podem
ser tratados como imutáveis, salvo correções e ajustes corporativos; executar
reconciliação semanal dos últimos 10 pregões.

Cachear falhas por pouco tempo evita tempestades: 404 válido por 5 minutos; 429
por `Retry-After` ou backoff; 5xx/timeout por no máximo 5–15 segundos. Nunca
substituir um valor bom por resposta vazia ou erro. Em falha, servir stale com a
idade claramente informada.

## Controle de consumo e resiliência

- Agrupar cotações por lote e limitar concorrência por provedor.
- CoinGecko: todos os requests contam no limite por minuto; aplicar backoff com
  jitter em 429 e observar créditos do plano.
- EODHD: distinguir requisições de unidades de consumo. Fundamentos custam 10,
  intraday/news/técnicos 5, e bulk pode custar 100 ou mais.
- Implementar orçamento diário/mensal e circuit breaker independente por
  provedor e capacidade; o fallback não deve multiplicar chamadas sem limite.
- Retry somente para timeout, 429 e 5xx, no máximo duas tentativas. Não repetir
  400/401/403/404.
- Métricas: requests, sucesso, latência, timeout, 429, unidades estimadas,
  cache hit/miss/stale, idade do dado e fallback, por provedor/endpoint.
- Logs estruturados sem tokens, URLs completas ou payloads financeiros grandes.

## Fases de entrega

### Fase 0 — contrato e licença

Confirmar plano Demo/Pro da CoinGecko, plano EODHD, limites, uso comercial,
atribuição, armazenamento e redistribuição pública. Testar cobertura real de
`PETR4.SA`, índices B3 e universo de cripto com as credenciais contratadas.

### Fase 1 — fundação

Adicionar configuração validada, catálogo/proveniência, IDs externos por ativo,
cliente HTTP resiliente, cache compartilhado e testes de contrato com fixtures.
Nenhuma nova fonte é publicada ainda.

### Fase 2 — CoinGecko

Ativar cotação agrupada e histórico para `CRYPTO`; manter Twelve Data/EODHD como
fallback controlado. Validar timestamps, BRL/USD, precisão, ativos duplicados e
estado stale na interface.

### Fase 3 — EODHD

Ativar histórico internacional e, depois, cotação atrasada. Fundamentos ficam
bloqueados até a contratação/habilitação do módulo EODHD; quando disponíveis,
integrá-los por ingestão assíncrona, nunca por ativo durante uma consulta ao
screener. Preservar CVM/B3 como autoridade no Brasil.

### Fase 4 — operação

Adicionar dashboards de consumo/freshness, alarmes em 429 e orçamento, canário
por provedor, reconciliação de dados e runbook de indisponibilidade.

## Critérios de aceite

- Nenhuma chave chega ao navegador ou aparece em logs.
- Um ativo tem identificador inequívoco em cada provedor.
- Requisições concorrentes iguais geram uma única chamada externa.
- A interface diferencia tempo real, atrasado, fechamento, stale e demo.
- Falha de provedor não apaga o último valor válido.
- Testes cobrem 200, payload parcial, vazio, 401, 404, 429, 5xx e timeout.
- Consumo estimado e taxa de cache hit ficam visíveis por endpoint.
- CoinGecko só atende cripto; EODHD não sobrepõe dados oficiais CVM/B3.

## Fontes oficiais consultadas

- CoinGecko: autenticação, visão geral de endpoints, Simple Price, Markets,
  Market Chart Range, OHLC e uso da API.
- EODHD: início rápido, limites, EOD, fundamentos v1.1, exchanges/símbolos,
  cotações atrasadas, WebSocket e bulk.
