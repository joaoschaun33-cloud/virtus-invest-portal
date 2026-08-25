# Roadmap de dados reais e licenciamento — Virtus 2026

## Status

Aprovado para execução inicial em 24/08/2026. Preços, limites e condições
comerciais devem ser reconfirmados antes de qualquer contratação.

## Objetivo

Remover dados demonstrativos, candles fabricados e zeros que representam
ausência de cobertura, construindo um portal público com dados rastreáveis e
direito de exibição. A arquitetura deve permitir contratar ou trocar provedores
sem alterar as páginas, cálculos, carteira, screener e alertas.

## Regra central

Dados ausentes não são zero. Todo valor de mercado passa a ter:

- valor opcional (`null` quando indisponível);
- fonte e identificador do provedor;
- instante do dado (`providerAsOf`);
- instante da coleta (`fetchedAt`);
- condição: `live`, `delayed`, `close`, `stale`, `unavailable` ou `demo`;
- atraso conhecido e motivo da indisponibilidade;
- licença/aprovação de exibição associada à fonte.

Produção não deve gerar histórico, notícia, dividendo ou evento econômico
sintético. Fixtures permanecem somente em testes e ambientes explicitamente
marcados como demonstração.

## Arquitetura-alvo

```text
Fontes oficiais / feeds contratados / widgets
                 |
        adaptadores por provedor
                 |
 validação + normalização + procedência
                 |
 cache compartilhado + ingestão persistente
                 |
 contratos internos quote/history/fundamentals
                 |
 páginas, screener, carteira, alertas e exportação
```

Widgets TradingView são uma ilha de visualização. Eles nunca alimentam o banco,
as rotas internas ou cálculos automatizados.

## Fase 1 — agora, sem novas contratações

### 1.1 Higiene dos dados

1. Bloquear `ensureCatalogSeed` em produção.
2. Remover a criação automática de 42 candles sintéticos.
3. Migrar campos de apresentação e contratos internos para `number | null`.
4. Substituir coerções `?? 0` por estados explícitos de indisponibilidade.
5. Não mostrar ativos sem a cobertura mínima exigida pela página.
6. Identificar e limpar linhas `source=catalog` já persistidas no banco, após
   backup e relatório de impacto.

### 1.2 Fontes oficiais brasileiras

| Domínio            | Fonte                    | Uso inicial                       | Atualização         |
| ------------------ | ------------------------ | --------------------------------- | ------------------- |
| Cotações B3        | COTAHIST/arquivos EOD B3 | OHLCV diário D-1                  | após fechamento     |
| Empresas e fundos  | CVM                      | cadastro, DFP, ITR e documentos   | conforme publicação |
| Macro              | BCB/SGS                  | Selic, câmbio e séries monetárias | conforme série      |
| Inflação/atividade | IBGE                     | IPCA e indicadores                | calendário oficial  |
| Renda fixa pública | Tesouro Direto           | títulos, preços e taxas           | fonte oficial       |

A FAQ de Market Data da B3 informa que dados históricos e de fim de dia a
partir de D-1, obtidos pelas plataformas da B3, podem ser distribuídos sem custo
por distribuidores/redistribuidores e sem autorização prévia. Antes de publicar,
o Virtus deve obter confirmação escrita da B3 sobre seu enquadramento e manter o
registro dessa resposta no dossiê de licenças.

### 1.3 TradingView

Usar widgets oficiais somente para:

- gráfico avançado na página do ativo;
- painel global de índices, forex e cripto;
- ticker tape ou visão geral de mercado.

Restrições:

- manter a atribuição TradingView original;
- não extrair dados do iframe/script;
- não usar valores do widget em alertas, screener, carteira ou cálculos;
- atualizar CSP, política de privacidade e inventário de terceiros;
- registrar que o widget recebe URL, símbolo exibido e IP para funcionamento.

Lightweight Charts e Advanced Charts não trazem dados. Só devem ser usados com
fontes próprias/licenciadas.

## Fase 2 — contratação CoinGecko

### Produto recomendado inicialmente

Contratar o menor plano que apresente licença **Commercial** na tabela vigente e
atenda ao volume medido em produção. Em 24/08/2026, a página oficial apresenta:

| Plano      | Referência mensal |      Créditos | Freshness        | Licença                        |
| ---------- | ----------------: | ------------: | ---------------- | ------------------------------ |
| Demo       |             US$ 0 |    10 mil/mês | a partir de 60 s | sem licença comercial indicada |
| Basic      |        US$ 35/mês |   100 mil/mês | a partir de 10 s | Commercial                     |
| Analyst    |       US$ 129/mês |   500 mil/mês | real-time        | Commercial                     |
| Lite       |       US$ 499/mês | 2 milhões/mês | real-time        | Commercial                     |
| Enterprise |          proposta |   customizado | real-time/SLA    | Custom                         |

Os valores mensais acima são referências sem impostos e podem mudar. Há preços
anuais distintos.

### Escolha recomendada

- Começar com **Basic Commercial** se o objetivo for BTC, ETH, SOL, ranking,
  preço, volume e histórico com cache de 20–60 segundos.
- Migrar para **Analyst** quando houver necessidade comprovada de freshness
  real-time, mais endpoints ou mais de 100 mil chamadas mensais.
- Solicitar **Enterprise/Data Redistribution** somente se o produto passar a
  redistribuir datasets, oferecer API aos clientes, exigir white label ou SLA.

### Obrigações de implantação

- exibir “Data provided by CoinGecko” com link para a página da API;
- usar host/header Pro e chave somente no backend;
- guardar o contrato e snapshot da tabela do plano;
- configurar orçamento, alerta em 80% e cache por endpoint;
- confirmar por escrito que cards, gráficos, screener e carteira do Virtus estão
  cobertos pela licença padrão Commercial.

### Critério de compra

Comprar quando a Fase 1 estiver sem dados sintéticos e a medição projetar pelo
menos 30 dias de uso. A estimativa deve considerar usuários ativos, número de
ativos por lote, polling, cache hit e jobs.

## Fase 3 — contratação de ações/mercados globais

### EODHD

Os planos self-service da página de preços são declarados para uso pessoal. Uso
comercial requer proposta e análise específica. Portanto, não basta fazer
upgrade do token atual.

Solicitar proposta comercial contendo expressamente:

- display público no site e aplicativo;
- ativos B3, EUA, índices, forex e commodities desejados;
- cotação atrasada e/ou tempo real, histórico EOD e intraday;
- armazenamento em banco, cache, retenção e uso após término;
- uso em screener, cálculos, carteira, alertas e exportação;
- número de usuários, domínio, ambientes e volume de chamadas;
- atribuição, sublicenciamento proibido e direito de auditoria;
- SLA, suporte, limites, overage e procedimento de encerramento;
- fundamentos, pois o token atual retornou HTTP 403 nesse módulo.

EODHD só será ativada com `EODHD_PUBLIC_DISPLAY=true` após aceite jurídico e
registro do contrato.

### Alternativa B3/fornecedor local

Solicitar proposta comparativa para um feed comercial brasileiro (B3 direta,
UP2DATA, Cedro ou distribuidor autorizado), discriminando:

- D-1/EOD versus atraso de 15 minutos versus tempo real;
- ações, FIIs, ETFs, índices e derivativos;
- display público, não-display e usuários simultâneos;
- taxa fixa, variável, por dispositivo e por bolsa;
- direito de armazenamento e histórico;
- ambiente de homologação e documentação técnica.

A decisão não será apenas por preço: cobertura B3, clareza da licença e custo de
redistribuição têm peso superior à quantidade de endpoints.

## Fase 4 — consolidação

Depois das contratações:

1. CoinGecko torna-se primária para cripto estruturada.
2. Feed comercial torna-se primário para preço recente de ações/mercados.
3. B3 D-1 permanece como histórico oficial/reconciliação.
4. CVM permanece autoridade para fatos e demonstrações brasileiras.
5. Widgets TradingView ficam como experiência visual complementar.
6. Catálogo demonstrativo é removido integralmente de produção.

## Matriz de cobertura planejada

| Recurso                   | Fase 1                             | Após contratação               |
| ------------------------- | ---------------------------------- | ------------------------------ |
| Ações/FIIs B3 histórico   | B3 D-1                             | B3 D-1 + feed comercial        |
| Ações/FIIs preço recente  | indisponível/widget                | feed B3 licenciado             |
| Fundamentos brasileiros   | CVM                                | CVM + complemento contratado   |
| Cripto gráfico visual     | TradingView                        | TradingView ou gráfico próprio |
| Cripto estruturada        | indisponível limitada              | CoinGecko Commercial           |
| Forex/global visual       | TradingView                        | TradingView                    |
| Forex/global estruturado  | indisponível                       | feed comercial                 |
| Screener/carteira/alertas | somente fontes próprias permitidas | fontes licenciadas             |

## Checklist contratual obrigatório

Nenhuma variável `*_PUBLIC_DISPLAY` será habilitada sem resposta “sim” para:

- Pode exibir os valores em portal público gratuito e/ou monetizado?
- Pode armazenar e por quanto tempo?
- Pode calcular indicadores derivados?
- Pode usar em screener, carteira e alertas?
- Pode exportar CSV/PDF para o usuário?
- Pode manter dados após encerramento?
- Atribuição é obrigatória? Em qual formato?
- Há custos da bolsa ou por usuário/dispositivo além do plano?
- A licença cobre todos os domínios e aplicativos do Virtus?
- Há restrições específicas para índices e marcas da B3?

## Métricas para dimensionar os planos

Registrar por 30 dias antes da compra:

- ativos distintos consultados/dia;
- requests por endpoint/provedor;
- unidades/créditos consumidos;
- usuários ativos e sessões;
- cache hit, miss e stale;
- latência, 429, timeout e 5xx;
- freshness efetiva;
- consultas de screener, carteira e alertas;
- projeção mensal com margem de 50%.

## Fontes oficiais de referência

- B3: FAQ de distribuidores, Política Comercial de Market Data e COTAHIST.
- CoinGecko: Pricing, API Terms e Crypto Data License.
- EODHD: Commercial vs Personal License, Terms and API Limits.
- TradingView: Widget Docs, Charting Libraries e Terms of Use.
