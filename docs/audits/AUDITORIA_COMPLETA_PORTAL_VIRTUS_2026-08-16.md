# Auditoria completa do Portal Virtus

**Data:** 16 de agosto de 2026  
**Escopo:** 11 rotas em desktop (1440×900) e mobile (375×812), navegação anônima, conteúdo financeiro, acessibilidade, responsividade, confiança, conversão, performance, segurança básica e qualidade técnica.  
**Método:** inspeção no navegador, leitura semântica do DOM, console e rede, validação de responsividade, revisão de código e execução da suíte local.

## Parecer executivo

O Virtus já comunica uma proposta diferenciada — workspace financeiro independente, sem corretagem e sem recomendação automática — com boa identidade, tom editorial responsável e arquitetura de navegação abrangente. A experiência é coerente para exploração e demonstração.

Entretanto, **a versão auditada ainda não deve ser tratada como pronta para lançamento comercial ou para sustentar decisões financeiras**. A principal razão não é estética: é confiança nos dados. O mesmo ativo aparece com preços e múltiplos diferentes entre páginas, uma série de 2021 é apresentada ao lado de uma referência de 2026 e o estado “WebSocket conectado” aparece apesar do erro de handshake no console. Em produto financeiro, essas inconsistências são bloqueadores.

### Scorecard

| Dimensão | Nota | Leitura |
|---|---:|---|
| Produto e proposta de valor | 7,5/10 | Clara e diferenciada, mas sem onboarding, segmentação ou monetização explícita |
| Design e consistência visual | 8,0/10 | Identidade forte, boa hierarquia e componentes consistentes |
| UX e navegação | 7,0/10 | Boa arquitetura; faltam orientação, continuidade e estados acionáveis |
| Conteúdo e pedagogia financeira | 7,0/10 | Disclaimers e tooltips são bons; contexto temporal e premissas ainda são frágeis |
| Integridade e confiança dos dados | 4,0/10 | Inconsistências entre telas e sinalização enganosa de conectividade |
| Acessibilidade (estimativa WCAG 2.2 AA) | 5,5/10 | Base semântica parcial; falhas em labels, landmarks, zoom e foco |
| Responsividade | 6,5/10 | Maioria das rotas adapta bem; Notícias e algumas tabelas transbordam |
| Engenharia e qualidade | 6,5/10 | Tipagem e 29 testes verdes; erro gráfico, runtime inflado e cobertura sobretudo de backend |
| Performance | 5,5/10 | Rotas respondem, mas HTML inicial tem 368 KB e runtime é duplicado/embutido |
| Segurança e privacidade | 7,0/10 | Headers básicos presentes; falta CSP/HSTS e há debug collector em produção |
| Conversão e prontidão comercial | 5,0/10 | CTAs de exploração existem; proposta de plano, valor recorrente e prova social não |

## Achados priorizados

Escalas: severidade **S0 bloqueador**, **S1 alta**, **S2 média**, **S3 baixa**; esforço **P/M/G**.

| ID | Achado | Sev. | Impacto | Esforço | Recomendação prática |
|---|---|---:|---|---:|---|
| V-01 | **Dados financeiros inconsistentes entre rotas.** PETR4 aparece a R$ 42,09 em Mercados, R$ 38,42 em Comparar e R$ 27,03 no detalhe; P/L aparece como 5,84 no Screener e 4,07 em Comparar/detalhe. | S0 | Decisão errada, perda de confiança, risco reputacional/regulatório | M | Criar uma única camada de snapshot por ativo, com `asOf`, provedor, latência e status; proibir mistura silenciosa de catálogo e live; testes de consistência cross-page. |
| V-02 | **Temporalidade enganosa no detalhe.** A cotação PETR4 informa “último fechamento · 17/08/2021”, mas a página também mostra referência fundamentalista de 16/08/2026 e “Atualização preparada”. | S0 | O usuário pode interpretar dado histórico como atual | P | Destacar “DADO HISTÓRICO/DEMONSTRAÇÃO” junto ao preço, nunca apenas no rodapé; separar data de mercado, data fundamentalista e data de consulta. |
| V-03 | **Status de tempo real contradiz a infraestrutura.** Mercados mostra “WebSocket conectado”, enquanto todas as rotas registram handshake 400 no console. | S1 | Falsa percepção de atualização em tempo real | P/M | Estado de conexão deve vir do socket real (`open/closed/retrying`), mostrar último evento recebido e degradar para polling/catalog de forma explícita. |
| V-04 | **Gráfico da calculadora gera SVG inválido.** Console: `Expected moveto path command`, causado por série vazia que produz caminho iniciado em `L`. | S1 | Visual quebrado, ruído de console e perda de confiança na simulação | P | Não renderizar `<path>` até haver ao menos um ponto válido; validar `maxBalance > 0`; cobrir com teste para entradas vazias, zero e inválidas. |
| V-05 | **Build de produção carrega runtime/debug da plataforma.** O HTML inicial tem ~368 KB, inclui `manus-runtime` embutido e distribui `__manus__/debug-collector.js` (~25 KB); elementos expõem `data-loc`. | S1 | Peso, exposição de estrutura interna e superfície de ataque | M | Condicionar plugins Manus ao modo desenvolvimento; remover debug collector, `data-loc` e runtime inline do build público; adicionar budget de build. |
| V-06 | **Overflow horizontal real em Notícias no mobile.** A página chega a ~462 px dentro de viewport de 375 px. | S1 | Conteúdo cortado, gesto lateral involuntário, falha WCAG 1.4.10 | P | Aplicar `min-w-0`, `max-w-full`, `overflow-x-hidden` no shell correto e garantir que filtros/inputs possam encolher; testar em 320/375/390 px. |
| V-07 | **Campos sem associação programática de rótulo.** Quatro campos da calculadora não têm nome acessível; selects do Screener e buscas usam label visual/placeholder sem `for/id`. | S1 | Leitor de tela não identifica o propósito do campo; WCAG 1.3.1, 3.3.2 e 4.1.2 | P | Gerar `id`, usar `<Label htmlFor>`, `name`, `autocomplete` quando aplicável e descrição por `aria-describedby`. Placeholder não substitui label. |
| V-08 | **Estrutura semântica duplicada.** Há dois `<main>` por rota (shell + conteúdo interno), nenhum `<nav>` no menu lateral e o diálogo de busca injeta um `h2` antes do `h1`. | S2 | Navegação confusa por regiões/cabeçalhos em leitor de tela | P | Manter um único `<main>`, marcar sidebar como `<nav aria-label="Principal">` e garantir que conteúdo oculto de dialog não participe da hierarquia fechada. |
| V-09 | **Zoom bloqueado no mobile.** Viewport usa `maximum-scale=1`. | S1 | Prejudica baixa visão; contraria expectativa de WCAG 1.4.4 | P | Remover `maximum-scale=1` e validar zoom a 200%. |
| V-10 | **Controles e mensagens misturam português e inglês.** “Toggle navigation”, “Toggle Sidebar”, tipos `STOCK/INDEX/REIT` aparecem na UI/leitor de tela. | S2 | Menor compreensão, sobretudo para iniciante | P | Localizar nomes acessíveis e taxonomia; usar “Ação”, “Índice”, “FII”, mantendo códigos técnicos apenas como detalhe. |
| V-11 | **Ações indisponíveis parecem ativas no modo anônimo.** CSV/PDF aparecem antes do login, embora não haja carteira persistida; watchlist é local sem explicação imediata. | S2 | Expectativa quebrada e baixa conversão | P | Desabilitar com explicação ou oferecer exportação de exemplo claramente marcada; explicar “salvo neste navegador” no primeiro uso. |
| V-12 | **Screener mistura universos não comparáveis.** Índices, cripto, forex e commodities aparecem em tabela de P/L, P/VP, DY e ROE, gerando muitos “—”. | S1 | Modelo mental errado para iniciantes e baixa utilidade para avançados | M | Definir métricas por classe; não incluir ativo incompatível por padrão; adicionar data/período/unidade e cobertura do provedor. |
| V-13 | **Calculadora de juros é nominal e simplificada demais.** Não explicita periodicidade de aporte, convenção de taxa, inflação, impostos ou aportes no início/fim do mês. | S1 | Cenário pode ser interpretado como comparável a retorno real | M | Mostrar fórmula e premissas; permitir taxa nominal/real, inflação, imposto opcional e timing do aporte; incluir tabela anual e exportação. |
| V-14 | **Notícias vazias enfraquecem a promessa central.** O feed declara fontes licenciadas/parceiras, mas retorna catálogo sem notícias/eventos. | S2 | Reduz percepção de produto vivo e confiança editorial | M/G | Só afirmar licenciamento comprovado; mostrar status da fonte, última sincronização e fallback editorial útil com documentos oficiais. |
| V-15 | **SEO e compartilhamento são genéricos.** Todas as rotas usam o mesmo título/description; sitemap omite Alertas, Confiança e ativos; 404 retorna HTTP 200. | S2 | Indexação pobre, snippets duplicados e soft-404 | M | Metadados por rota/ativo, canonical/OG, sitemap dinâmico; servir 404 real quando possível ou SSR/prerender para páginas públicas. |
| V-16 | **Headers de segurança incompletos.** Presentes: nosniff, DENY, referrer e permissions; ausentes na resposta auditada: CSP e HSTS. | S2 | Proteção insuficiente contra injeção e downgrade em produção | M | CSP com nonce/hash, HSTS no HTTPS público e revisão de CORS/cookies; remover scripts inline de runtime facilita CSP. |
| V-17 | **Ausência de onboarding e personalização por senioridade.** O iniciante recebe muitos conceitos; o avançado não define universo, moeda, benchmark ou densidade. | S2 | Ativação baixa e produto “um tamanho para todos” | M | Onboarding de 3 passos: objetivo, experiência e ativos; adaptar glossário, densidade, alertas e atalhos sem esconder recursos. |
| V-18 | **Monetização e razão para cadastro não estão explícitas.** Login surge apenas como barreira para carteira/alertas. | S2 | Conversão e tese de negócio frágeis | M | Página de benefícios/planos, comparação Visitante vs Conta vs Pro, prova de valor antes do login e CTA contextual após ações de intenção. |
| V-19 | **Cobertura de testes é desbalanceada.** 29 testes passam e 1 é ignorado, mas os testes observados concentram-se no servidor; falhas visuais/a11y passaram. | S2 | Regressões de UI e dados cruzados chegam à produção | M | Playwright para jornadas, axe WCAG AA, screenshots mobile, contrato de dados cross-page e smoke de console sem erros. |
| V-20 | **Preferência de movimento/contraste não está evidenciada.** Há animações, carrosséis e transições sem validação de `prefers-reduced-motion`; contraste precisa de medição automatizada. | S2 | Desconforto vestibular e barreiras visuais | P/M | Respeitar reduced-motion, pausar autoanimações, adicionar axe/contrast CI e teste manual em alto contraste. |

## Visão por perfil de investidor

### Iniciante

Pontos positivos: linguagem cautelosa, tooltips em indicadores, disclaimers frequentes e ausência de recomendação automática. Barreiras: excesso de siglas, mistura de classes no Screener, ausência de trilha “comece aqui” e números conflitantes. Prioridade: glossário contextual, exemplos guiados e explicação de risco/tempo/fonte junto ao dado.

### Intermediário

Pontos positivos: comparação, filtros, watchlist, carteira manual e alertas formam um bom núcleo. Barreiras: cobertura rasa, período dos fundamentos indefinido, comparador sem benchmark e séries inconsistentes. Prioridade: filtros por setor/liquidez, benchmark, normalização e exportação auditável.

### Sênior/profissional

Pontos positivos: transparência de provedores e intenção de provenance. Barreiras: ausência de SLA, timestamp por campo, histórico longo confiável, corporate actions, metodologia e API/exportação robusta. Prioridade: lineage completo, qualidade mensurada, ajustes corporativos, latência e contratos de dados.

## Funil de produto e conversão

1. **Aquisição:** mensagem principal é boa, mas metadados e prova social são fracos.
2. **Ativação:** “Explorar mercados” e Screener funcionam, porém não existe “aha moment” guiado.
3. **Engajamento:** watchlist, comparação e alertas têm potencial; dados inconsistentes destroem recorrência.
4. **Conversão:** cadastro é apresentado como requisito, não como benefício; plano pago e proposta econômica não aparecem.
5. **Retenção:** alertas e carteira podem reter, mas precisam de confiabilidade, comunicação de falhas e histórico.

## Roadmap recomendado

### 0–7 dias — bloquear riscos de confiança

- Unificar snapshot de preço/fundamentos e datas em todas as páginas.
- Corrigir WebSocket/status, gráfico SVG e overflow de Notícias.
- Marcar dados de demonstração/históricos junto ao número.
- Corrigir labels, landmarks, idioma e zoom.
- Retirar runtime/debug do build público.

### 2–4 semanas — qualidade comercial mínima

- Implantar testes E2E, axe, console-zero e contratos cross-page.
- Reestruturar Screener por classe e enriquecer premissas da calculadora.
- Metadados por rota, 404 real, CSP/HSTS e observabilidade de provedores.
- Onboarding por experiência e CTAs contextuais de cadastro.

### 1–3 meses — diferenciação e escala

- Provenance por campo, SLA/cobertura, corporate actions e séries ajustadas.
- Benchmark, relatórios e exportações profissionais.
- Planos/monetização, analytics de funil e experimentos de ativação.
- Auditoria externa jurídica de licenças, LGPD e comunicação financeira.

## Critérios de liberação

Não liberar como produto financeiro comercial até que:

1. preço, fundamentos, fonte e timestamp sejam consistentes em 100% das rotas para o mesmo snapshot;
2. nenhuma página pública tenha erro de console, overflow a 320 px ou controle sem nome acessível;
3. o build público não contenha debug collector, `data-loc` ou runtime de preview;
4. demonstração, atraso e indisponibilidade sejam visíveis junto a cada dado material;
5. jornadas críticas passem em desktop/mobile, teclado e axe WCAG 2.2 AA;
6. termos/licenças dos provedores e fontes editoriais sejam documentados.

## Evidências técnicas

- TypeScript: **sem erros** (`tsc --noEmit`).
- Testes: **29 aprovados, 1 ignorado**, em 9 arquivos aprovados e 1 arquivo com teste ignorado.
- Respostas das rotas auditadas: HTTP 200, inclusive `/404` (soft-404).
- HTML inicial de produção: aproximadamente **368 KB** antes dos bundles externos.
- Principais bundles: app ~305 KB, React ~194 KB, CSS ~136 KB, dados ~97 KB e UI ~96 KB (tamanhos em disco, sem aferição de compressão de transporte).
- Headers observados: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; CSP/HSTS não observados no ambiente local.
- Limitação: a auditoria autenticada não foi concluída por falta de credenciais de teste; carteira, criação de alertas, preferências, exportação de dados e logout exigem rodada adicional com conta controlada.

