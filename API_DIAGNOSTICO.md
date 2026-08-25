# Diagnóstico de APIs de Cotação e Notícias — Portal Virtus

> Data do diagnóstico: 2026-08-21  
> Projeto: `C:\dev\virtus portal manus`  
> As chaves de API são exibidas de forma mascarada (`XXXX***`).

---

## 1. Status de carregamento das variáveis de ambiente

| Variável | Status | Valor mascarado | Observação |
|----------|--------|-----------------|------------|
| `BRAPI_API_KEY` | Configurada | `se6g***` | Carregada corretamente por `process.env` |
| `TWELVE_DATA_API_KEY` | Configurada | `82f3***` | Carregada corretamente por `process.env` |
| `FINNHUB_API_KEY` | Configurada | `d4vl***` | Carregada corretamente por `process.env` |
| `TWELVE_DATA_PUBLIC_DISPLAY` | **AUSENTE** | — | Não definida no `.env` |
| `FINNHUB_PUBLIC_DISPLAY` | **AUSENTE** | — | Não definida no `.env` |

**Arquivos que consomem as chaves:**

- `server/marketProviders.ts:238,266,285,401,424,515,541,579,580,679-681`
- `server/dataSourcePolicy.ts:19-29`

Todas as leituras usam `process.env.<NOME>` diretamente. Não há validação de formato de chave, apenas presença (`Boolean(...)`).

---

## 2. Teste de cada API

Todas as chamadas foram executadas com as chaves presentes no `.env` e retornaram **HTTP 200 com dados válidos**.

| Provedor | Endpoint testado | Status | Dados? | Observação |
|----------|------------------|--------|--------|------------|
| **brapi** | `GET /api/quote/PETR4` | OK 200 | Sim | Retornou cotação de PETR4 (preço, variação, volume, etc.) |
| **Twelve Data** | `GET /quote?symbol=AAPL` | OK 200 | Sim | Retornou cotação de AAPL |
| **Finnhub** | `GET /api/v1/quote?symbol=AAPL` | OK 200 | Sim | Retornou cotação de AAPL |
| **Finnhub News** | `GET /api/v1/company-news?symbol=AAPL` | OK 200 | Sim | Retornou array de notícias recentes |

**Conclusão das chaves:** nenhuma chave está inválida, expirada ou bloqueada. O problema **não é autenticação**.

---

## 3. Status de cada provedor

| Provedor | Chave válida? | Retorna dados? | Erro de autenticação? | Rate limiting? | Exibição pública aprovada? |
|----------|---------------|----------------|------------------------|----------------|----------------------------|
| brapi | Sim | Sim | Não | Não detectado | **Sim** (`displayPolicy: allowed`) |
| Twelve Data | Sim | Sim | Não | Não detectado | **Não** — `TWELVE_DATA_PUBLIC_DISPLAY` ausente |
| Finnhub | Sim | Sim | Não | Não detectado | **Não** — `FINNHUB_PUBLIC_DISPLAY` ausente |

---

## 4. Flags de exibição pública

As flags **não estão configuradas** no `.env`:

```text
TWELVE_DATA_PUBLIC_DISPLAY=(ausente)
FINNHUB_PUBLIC_DISPLAY=(ausente)
```

O `.env.production.example` as inclui como `false`, indicando que o projeto foi projetado para exigir aprovação explícita de exibição pública para provedores com política de licenciamento.

A lógica em `server/dataSourcePolicy.ts` exige:

```typescript
if (source === "twelve-data")
  return process.env.TWELVE_DATA_PUBLIC_DISPLAY === "true";
return process.env.FINNHUB_PUBLIC_DISPLAY === "true";
```

Portanto, enquanto as flags não forem definidas como `"true"`, **Twelve Data e Finnhub são considerados inelegíveis** para qualquer uso.

---

## 5. Logs/erros de chamadas no código

**Problema identificado:** a função `fetchJson` em `server/marketProviders.ts:167-194` possui um bloco `catch` vazio que retorna `null` silenciosamente:

```typescript
catch {
  return null;
}
```

Isso significa que erros de rede, timeouts, autenticação ou respostas malformadas **não geram logs**. No momento, isso não está causando falhas visíveis porque as APIs respondem, mas dificulta futuros diagnósticos.

---

## 6. Diagnóstico: por que os dados/notícias ainda parecem pobres

Apesar de todas as chaves existirem e das APIs funcionarem, **o portal está usando apenas o provedor brapi** para a maioria dos ativos. A causa raiz é a ausência das flags `*_PUBLIC_DISPLAY`.

Efeitos concretos no roteamento (`server/dataSourcePolicy.ts`):

1. **Cotações de ações B3 (STOCK/REIT/ETF/INDEX):**
   - `marketSourceOrder("quote", { assetType: "STOCK" })` retorna apenas `["brapi"]`.
   - Twelve Data e Finnhub são filtrados por `publicDisplayApproved(source) === false`.
   - Resultado: cotações brasileiras funcionam, mas sem redundância internacional.

2. **Cotações de FOREX/CRYPTO:**
   - `marketSourceOrder("quote", { assetType: "FOREX" })` retorna `[]`.
   - brapi não cobre esses tipos; Twelve Data/Finnhub estão bloqueados.
   - Resultado: ativos como `EUR/USD` e `BTC/USD` não têm cotação ao vivo.

3. **Notícias de empresa (`company-news`):**
   - `marketSourceOrder("company-news")` retorna `[]`.
   - Tanto Finnhub quanto Twelve Data exigem aprovação de exibição pública.
   - Resultado: `fetchProviderNews` sempre retorna array vazio.

4. **Fundamentos e histórico:**
   - Mesmo padrão: apenas brapi é elegível para ativos B3; ativos internacionais ficam sem dados.

Em resumo: **as chaves estão corretas, mas o governo de fontes está bloqueando os provedores internacionais por falta de aprovação explícita de exibição pública.**

---

## 7. Recomendações de correção

### 7.1 Habilitar exibição pública (se a licença permitir)

Adicionar ao `.env`:

```text
TWELVE_DATA_PUBLIC_DISPLAY=true
FINNHUB_PUBLIC_DISPLAY=true
```

> Atenção: isso só deve ser feito se os contratos/planos das APIs Twelve Data e Finnhub permitirem exibição pública/redistribuição de dados. Verifique os termos de uso de cada provedor.

### 7.2 Se a licença NÃO permitir exibição pública

- Manter as flags como `false` ou ausentes.
- Ajustar a expectativa do produto: dados limitados a ativos brasileiros (brapi) e notícias de fontes oficiais (Agência Brasil).
- Considerar exibir uma mensagem de transparência ao usuário indicando a fonte dos dados e por que alguns ativos não têm cobertura.

### 7.3 Melhorar observabilidade

Substituir o `catch` silencioso de `fetchJson` por logging estruturado, por exemplo:

```typescript
catch (err) {
  console.error(`[marketProviders] fetch failed: ${url}`, err);
  return null;
}
```

Isso permitirá detectar rapidamente quando uma API começar a falhar ou retornar erros.

### 7.4 Fallback para dados demo/catalog

Quando `marketSourceOrder` retornar array vazio, o sistema poderia usar o catálogo de demonstração (`catalog`) para manter a UI funcional, desde que sinalizado como `isDemo: true`.

### 7.5 Distinguir uso interno de uso público

Se houver casos de uso interno (alertas, relatórios, admin) que não exibem dados publicamente, as rotas podem chamar `marketSourceOrder(..., { publicDisplay: false })` para contornar a restrição de licenciamento sem alterar o `.env`.

---

## Resumo executivo

- As três chaves de API estão presentes e válidas.
- Todas as APIs testadas (brapi, Twelve Data, Finnhub quote, Finnhub news) respondem com dados.
- O problema de dados/notícias pobres é causado pela **ausência das flags `TWELVE_DATA_PUBLIC_DISPLAY=true` e `FINNHUB_PUBLIC_DISPLAY=true`**, que fazem o governo de fontes bloquear esses provedores.
- Ação recomendada: adicionar as flags ao `.env` se a licença permitir, ou ajustar a cobertura do produto e melhorar logs/fallbacks.
