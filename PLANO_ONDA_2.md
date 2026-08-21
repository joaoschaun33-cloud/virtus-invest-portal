# Plano Executivo — Onda 2: Dados do Portal Virtus

**Projeto:** `C:\dev\virtus portal manus`  
**Documento base:** `C:\dev\virtus portal manus\AUDITORIA_CONSELHO_ESTRATEGICO_VIRTUS.md`  
**Pré-requisito:** Onda 1 concluída (snapshot canônico, TypeScript 0 erros, Firebase sem chave hardcoded, ComponentShowcase removido, validação de e-mail).

> **Nota de conformidade:** este plano trata exclusivamente de dados, infraestrutura e transparência. Não inclui recomendação de compra, venda ou alocação de ativos.

---

## 1. Visão geral da Onda 2

| # | Entrega | Complexidade | Ordem |
|---|---|---------|--------------|-------|
| 1 | Proveniência de dados (badge fonte/timestamp) | Baixa | 1ª |
| 2 | Integração Tesouro Transparente API | Média | 2ª |
| 3 | Expansão do catálogo B3/CVM (Ibovespa + IFIX) | Média/Alta | 3ª |

**Racional da sequência:** a proveniência é habilitadora para as demais entregas, pois já existe snapshot canônico (`server/assetSnapshot.ts`) e componente base (`client/src/components/DataProvenance.tsx`). O Tesouro Direto é a fonte oficial mais madura e tem maior impacto regulatório/reputacional. A expansão do catálogo depende dele para exibir cards/tabelas com metadados corretos.

---

## 2. Entrega 1 — Proveniência de dados

### 2.1 Objetivo e escopo

Exibir, de forma discreta e padronizada, a fonte e o timestamp de cada dado de mercado exibido no portal. Reutilizar os campos `source` e `fetchedAt` do snapshot canônico já existente, estendendo o padrão para dados macro, Tesouro Direto e catálogo expandido.

### 2.2 Arquivos/componentes afetados

- `client/src/components/DataProvenance.tsx` — estender labels e freshness para fontes oficiais.
- `shared/marketData.ts` / `shared/dataSources.ts` — adicionar `tesouro-direto`, `b3`, `cvm`, `bcb`, `ibge` como `MarketDataSource` ou equivalente para proveniência.
- `server/assetSnapshot.ts` — já emite `source`/`fetchedAt`; validar consistência.
- `server/treasuryData.ts` — garantir que retorne `source` e `asOf` oficiais.
- `server/macroData.ts` — garantir metadados de fonte/timestamp nos indicadores.
- `client/src/pages/Home.tsx` — adicionar proveniência nos cards de índice e macro.
- `client/src/pages/Markets.tsx` — já usa `DataProvenance`; revisar labels para novas fontes.
- `client/src/pages/AssetDetail.tsx` — já usa `DataProvenance`; revisar labels.

### 2.3 Decisões de arquitetura a serem tomadas

1. **Vocabulário único de fontes:** usar `shared/dataSources.ts` como catálogo canônico. Adicionar `MarketDataSource` ou criar tipo separado `ProvenanceSource` que inclua fontes oficiais.
2. **Nível de granularidade:** proveniência por *snapshot* (preço/fechamento) e por *contexto* (macro, Tesouro). Não rastrear campo a campo nesta onda.
3. **Freshness:** manter `live | delayed | close | demo` e adicionar `official` para dados públicos com data de referência explícita (ex.: Tesouro "atualizado em 20/08/2026").
4. **UX do badge:** manter discreto (texto `text-[10px]/text-xs`), com tooltip/label indicando a URL oficial quando hover.

### 2.4 Dependências externas

- Nenhuma API paga ou token.
- Depende apenas dos metadados já produzidos pelos provedores internos.

### 2.5 Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Fonte `catalog` aparecer em muitos ativos, transmitindo impressão de pouca cobertura | Badge diferenciado para "demonstração" (ambar) e tooltip explicando fallback |
| Inconsistência de labels entre páginas | Centralizar no `DataProvenance` e no `DATA_SOURCES` |
| Datas inválidas ou `1970-01-01` | Validar `asOf` no componente; exibir "data de referência indisponível" |

### 2.6 Critérios de aceite

- [ ] Todo card/tabela de ativo exibe fonte e timestamp (ou badge de demonstração quando for `catalog`).
- [ ] Cards macro exibem fonte (BCB/IBGE) e data de referência.
- [ ] Cards de Tesouro exibem "Tesouro Nacional — atualizado em DD/MM/YYYY".
- [ ] `tsc --noEmit` passa com 0 erros.
- [ ] Testes existentes (`market.provenance.test.ts`) continuam passando.

### 2.7 Estimativa de complexidade

**Baixa.** Reaproveitamento alto de snapshot canônico e componente existente.

---

## 3. Entrega 2 — Integração Tesouro Transparente API

### 3.1 Objetivo e escopo

Substituir os dados hardcoded de `server/treasuryData.ts` por cotações oficiais do Tesouro Direto, ingeridas do CSV público do Tesouro Transparente. Alimentar a futura aba "Renda Fixa & Tesouro" e manter o endpoint `trpc.market.treasury` funcional com dados reais.

### 3.2 Arquivos/componentes afetados

- `server/treasuryData.ts` — reescrever `fetchTreasuryOverview` para buscar e parsear CSV oficial.
- `server/treasuryData.test.ts` — ajustar expectativas para dados reais (ainda verificar Selic/IPCA/Prefixado).
- `server/routers/market.ts` — manter rota `treasury`; eventualmente adicionar cache TTL.
- `shared/dataSources.ts` — `tesouro-direto` já catalogado como oficial.
- `server/dataSourcePolicy.ts` — atualizar `tesouro-direto` de `planned` para `active`.
- `client/src/pages/Home.tsx` / nova página `Markets` — criar aba "Renda Fixa & Tesouro" e consumir `trpc.market.treasury`.
- `client/src/components/DataProvenance.tsx` — adicionar label "Tesouro Nacional".

### 3.3 Decisões de arquitetura a serem tomadas

1. **Endpoint oficial:** usar o CSV estável `https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv`.
2. **Estratégia de fetch:** download com `AbortSignal.timeout`, limitação de tamanho (13,7 MiB atuais; configurar `MAX_CSV_BYTES` generoso, ex.: 25 MiB), cache em memória por 30 minutos.
3. **Parsing:** reutilizar `server/delimitedText.ts` para CSV com separador `;` e encoding `windows-1252` ou `utf-8-sig`.
4. **Seleção dos títulos:** filtrar pela maior `Data Base` disponível no arquivo; mapear `Tipo Titulo` para categorias:
   - `Tesouro Selic` → `SELIC`
   - `Tesouro IPCA+` e `Tesouro IPCA+ com Juros Semestrais` → `IPCA`
   - `Tesouro Prefixado` e `Tesouro Prefixado com Juros Semestrais` → `PREFIXADO`
   - Ignorar `Tesouro IGPM+` nesta onda (pouco líquido/relevante).
5. **Campos exibidos:**
   - `name`: `Tipo Titulo` + `Data Vencimento`
   - `maturityDate`: `Data Vencimento`
   - `annualRate`: `Taxa Venda Manha` com formatação (% ou "IPCA + X%")
   - `unitPrice`: `PU Venda Manha`
   - `minInvestment`: calcular a partir do menor lote do Tesouro Direto (R$ 30,00 de PU × fração mínima) ou usar fração mínima de 0,01 título; exibir valor aproximado.
   - `asOf`: maior `Data Base` do arquivo.
6. **Selic/CDI/IPCA12m:** manter consulta ao BCB (`server/macroData.ts`) para Selic e IPCA; o CDI pode ser derivado da Selic ou obtido de série BCB (CDI diário). Não hardcodar.
7. **Fallback:** se a fonte falhar, retornar dados hardcoded *anteriores* do cache ou, em último caso, os dados estáticos atuais, sempre marcando `source` como `catalog`/`tesouro-direto` conforme disponibilidade.

### 3.4 Dependências externas

| Fonte | URL / Detalhe | Tipo |
|-------|---------------|------|
| CSV Tesouro Transparente | `https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv` | CSV oficial, atualizado diariamente, ODbL |
| Selic / IPCA | BCB (já integrado via `server/macroData.ts`) | Oficial |
| CDI | Série BCB 1178 (opcional; pode usar Selic como proxy inicial) | Oficial |

### 3.5 Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| CSV grande (13,7 MiB) e crescendo | Limitar tamanho máximo; usar range/bytes parcial se possível; cache agressivo |
| Encoding inconsistente | Testar `windows-1252` e `utf-8-sig`; usar `TextDecoder` com fallback |
| Estrutura de colunas muda | Validar header; logar aviso e usar fallback hardcoded |
| Título sem oferta no dia (`Taxa Venda Manha = 0`) | Filtrar títulos com PU > 0 e taxa definida |
| Indisponibilidade do portal governamental | Cache TTL + fallback hardcoded com badge "dados de referência" |
| Formato de data `DD/MM/YYYY` | Parser explícito para ISO 8601 no `asOf` |

### 3.6 Critérios de aceite

- [ ] `fetchTreasuryOverview` retorna pelo menos 5 títulos reais do CSV oficial.
- [ ] Pelo menos um título de cada categoria (`SELIC`, `IPCA`, `PREFIXADO`) está presente.
- [ ] `asOf` reflete a maior `Data Base` do CSV.
- [ ] Selic, CDI e IPCA12m são obtidos de fontes oficiais (BCB) ou cache; nenhum valor hardcoded.
- [ ] Aba "Renda Fixa & Tesouro" renderiza tabela/cards com proveniência.
- [ ] `tsc --noEmit` passa com 0 erros.
- [ ] Testes `treasuryData.test.ts` passam.

### 3.7 Estimativa de complexidade

**Média.** Parse de CSV oficial, mapeamento de categorias e integração com UI. Não envolve autenticação.

---

## 4. Entrega 3 — Expansão do catálogo B3/CVM

### 4.1 Objetivo e escopo

Popular o catálogo do banco de dados com as 86 ações teóricas do Ibovespa e 100 FIIs do IFIX, usando a base cadastral já disponível da B3/CVM. Permitir que esses ativos apareçam no feed de mercado, screener e comparação com snapshot canônico.

### 4.2 Arquivos/componentes afetados

- `server/db.ts` — expandir `catalog` com tickers do Ibovespa e IFIX; ou criar script de seed separado.
- `server/b3ReferenceData.ts` — já resolve emissor para `STOCK`; verificar se cobre todos os tickers do Ibovespa.
- `server/cvmData.ts` — usado para enriquecer nome/segmento a partir do CNPJ da B3.
- `drizzle/schema.ts` — tabela `assets` já suporta os campos necessários; nenhuma migração obrigatória.
- `scripts/seed-b3-indexes.ts` (novo) — script idempotente de seed/upset dos ativos.
- `server/routers/market.ts` — `listAssetsWithLiveQuotes` já serve os novos ativos.
- `client/src/pages/Markets.tsx` — já filtra por `STOCK`/`REIT`; ajustar contadores.
- `client/src/pages/Home.tsx` — garantir que Ibovespa continue como card principal.

### 4.3 Decisões de arquitetura a serem tomadas

1. **Fonte da lista de tickers:**
   - **Opção A (preferida):** parsear as páginas de índice da B3:
     - Ibovespa: `https://sistemaswebb3-listados.b3.com.br/indexPage/day/IBOV?language=pt-br`
     - IFIX: `https://sistemaswebb3-listados.b3.com.br/indexPage/day/IFIX?language=pt-br`
   - **Opção B:** manter listas estáticas atualizadas trimestralmente (mais frágil).
   - Decisão: usar **Opção A** com cache de 24h e fallback para lista estática no código.
2. **Enriquecimento cadastral:** para cada ticker:
   - Obter CNPJ/razão social via `fetchB3IssuerIdentity` (arquivo ZIP ISIN da B3).
   - Obter nome comercial/setor via `fetchCvmIssuer` (CSV cadastral da CVM) usando o CNPJ.
   - Ticker sem CNPJ válido entra como `name = ticker` com `source = b3`.
3. **Tipos de ativo:** ações → `STOCK`; FIIs → `REIT`.
4. **Seed vs. atualização:** criar função `ensureIndexCatalogSeed()` similar a `ensureCatalogSeed()`, mas acionada em deploy ou via script `npm run seed:b3-indexes`.
5. **Cotações:** usar o snapshot canônico (`getAssetSnapshot`) com brapi/twelve-data/finnhub; sem token, exibe valores do catálogo com badge de demonstração.

### 4.4 Dependências externas

| Fonte | URL / Detalhe | Tipo |
|-------|---------------|------|
| Composição Ibovespa | `https://sistemaswebb3-listados.b3.com.br/indexPage/day/IBOV?language=pt-br` | HTML oficial B3 |
| Composição IFIX | `https://sistemaswebb3-listados.b3.com.br/indexPage/day/IFIX?language=pt-br` | HTML oficial B3 |
| Cadastro B3 ISIN | já implementado em `server/b3ReferenceData.ts` | ZIP oficial B3 |
| Cadastro CVM | já implementado em `server/cvmData.ts` | CSV oficial CVM |
| Cotações | brapi / Twelve Data / Finnhub (já existentes) | Provedores de mercado |

### 4.5 Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Layout HTML da B3 muda e quebra o parser | Fallback para lista estática; testes de snapshot na página |
| Ticker não encontrado no cadastro B3/CVM | Inserir com `name = ticker` e `source = b3`; não bloquear o seed |
| Performance do seed (86 + 100 requisições) | Executar seed em background; cachear CNPJs; usar batch inserts |
| Banco de dados não conectado | Seed só roda quando `DATABASE_URL` existe; demo continua funcionando |
| Cotações de FIIs sem cobertura gratuita | Badge de demonstração + fallback do catálogo |
| Duplicidade de tickers (ex.: B3SA3 já no catálogo) | `INSERT ... ON DUPLICATE KEY UPDATE` ou `upsert` por `ticker` |

### 4.6 Critérios de aceite

- [ ] Banco de dados contém pelo menos 86 ações do Ibovespa e 100 FIIs do IFIX.
- [ ] Ativos aparecem em `/markets` com filtro por tipo (`Ação`/`FII`).
- [ ] Nomes oficiais (B3/CVM) são exibidos quando disponíveis.
- [ ] Tickers duplicados não criam registros duplos.
- [ ] Script de seed é idempotente e pode ser reexecutado.
- [ ] `tsc --noEmit` passa com 0 erros.
- [ ] Testes de B3/CVM existentes continuam passando.

### 4.7 Estimativa de complexidade

**Média/Alta.** A complexidade está na ingestão massiva, parse de HTML da B3 e enriquecimento cruzado B3→CVM. A parte de exibição é baixa porque o snapshot canônico já abstrai isso.

---

## 5. Análise preliminar do endpoint Tesouro Transparente

### 5.1 Endpoint identificado

```text
https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv
```

- **Formato:** CSV, separador `;`, encoding `windows-1252`/`utf-8-sig`.
- **Tamanho atual:** 13,7 MiB.
- **Frequência:** diária.
- **Licença:** ODbL (Open Data Commons).
- **Acessibilidade:** verificada via `curl`; retorna dados históricos desde 2009 até a data mais recente.

### 5.2 Estrutura das colunas (amostra)

```text
Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha
Tesouro Selic;07/03/2012;13/08/2009;0,00;0,03;3970,07;3967,02;3965,70
Tesouro IPCA+;15/08/2024;13/08/2009;6,42;6,50;726,39;718,27;718,04
Tesouro Prefixado;01/07/2010;13/08/2009;9,06;9,10;927,08;926,78;926,46
```

### 5.3 Lógica de extração proposta

1. Fazer download do CSV (com timeout e limite de tamanho).
2. Identificar a maior `Data Base` no arquivo.
3. Filtrar apenas as linhas dessa data.
4. Agrupar por `Tipo Titulo` + `Data Vencimento`.
5. Mapear para `TreasuryBond` usando `PU Venda Manha` como `unitPrice` e `Taxa Venda Manha` como `annualRate`.
6. Ordenar por categoria (Selic, IPCA, Prefixado) e por vencimento.

---

## 6. Mapeamento de onde obter lista de tickers Ibovespa/IFIX

### 6.1 Ibovespa

- **Página HTML:** `https://sistemaswebb3-listados.b3.com.br/indexPage/day/IBOV?language=pt-br`
- **Conteúdo:** tabela "Carteira Teórica do IBovespa" com código, ação, tipo, quantidade teórica e participação (%).
- **Parser:** extrair colunas `Código` e `Ação`; ignorar linhas de total/redutor.
- **Quantidade esperada:** ~86 ações.

### 6.2 IFIX

- **Página HTML:** `https://sistemaswebb3-listados.b3.com.br/indexPage/day/IFIX?language=pt-br`
- **Conteúdo:** tabela de FIIs com código, nome, tipo, quantidade teórica e participação (%).
- **Parser:** extrair coluna `Código` (ticker) e nome do FII.
- **Quantidade esperada:** ~100 FIIs.

### 6.3 No projeto atual

- Não existe arquivo de composição de índices.
- A função `fetchB3IssuerIdentity` (`server/b3ReferenceData.ts`) resolve CNPJ/razão social para ações, mas não fornece a lista de tickers.
- A função `fetchCvmIssuer` (`server/cvmData.ts`) enriquece a partir do CNPJ.
- A tabela `assets` (`drizzle/schema.ts`) aceita inserção em massa.

---

## 7. Definição preliminar do componente de proveniência

### 7.1 Comportamento

- **Localização:** canto inferior dos cards de ativo e abaixo do título em painéis macro/Tesouro.
- **Elementos visuais:**
  - Badge de freshness (`Tempo real`, `Com atraso`, `Fechamento`, `Demonstração`, `Oficial`).
  - Texto `Fonte: <nome amigável>`.
  - Timestamp `· referência: DD/MMM/YYYY HH:mm` quando disponível.
- **Interação:** hover opcional mostra URL oficial e descrição da fonte.

### 7.2 Tipos de fonte a suportar

| ID interno | Label amigável | Freshness |
|------------|----------------|-----------|
| `brapi` | brapi | delayed |
| `twelve-data` | Twelve Data | delayed |
| `finnhub` | Finnhub | delayed |
| `catalog` | Catálogo de referência | demo |
| `tesouro-direto` | Tesouro Nacional | official |
| `b3` | B3 | official |
| `cvm` | CVM | official |
| `bcb` | Banco Central do Brasil | official |
| `ibge` | IBGE | official |

### 7.3 Extensão do componente existente

O `DataProvenance.tsx` atual já suporta `source`, `asOf` e `freshness`. Será necessário:

1. Expandir `sourceLabels` para incluir fontes oficiais.
2. Expandir `freshnessLabels` para `official`.
3. Garantir que datas inválidas não quebrem a renderização.

---

## 8. Verificação e rastreabilidade

| Passo | Arquivo/Comando-alvo | Verificação |
|-------|----------------------|-------------|
| TypeScript | `npx tsc --noEmit` | 0 erros |
| Testes | `npm test` | Todos passam (exceto `email.test.ts` skipped, se ainda for o caso) |
| Proveniência | `client/src/components/DataProvenance.tsx` + páginas | Badge visível em cards e tabelas |
| Tesouro | `server/treasuryData.test.ts` | Retorna SELIC/IPCA/PREFIXADO reais |
| Catálogo | Query `SELECT COUNT(*) FROM assets WHERE assetType IN ('STOCK','REIT')` | ≥ 186 registros |
| Build | `npm run build` | Concluído com sucesso |

---

## 9. Decisões pendentes para aprovação

1. **Tesouro:** manter PU mínimo de investimento calculado ou usar valor simbólico (ex.: R$ 30,00) na coluna `minInvestment`?
2. **Catálogo:** executar seed de Ibovespa/IFIX automaticamente no startup ou apenas via script manual/CI?
3. **Proveniência:** adicionar tooltip com URL oficial ou manter apenas texto estático?
4. **Escopo da aba "Renda Fixa & Tesouro":** criar nova página `/fixed-income` ou adicionar aba dentro de `/markets`?

---

*Plano gerado para aprovação. Não contém recomendação de compra, venda ou alocação de investimentos.*
