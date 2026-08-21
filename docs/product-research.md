# Pesquisa de evolução do Apex Financial

## Síntese executiva

O MVP já cobre consulta de mercado, análise individual, carteira manual e alertas sem introduzir Open Finance, recomendações automatizadas ou recursos sociais. A próxima evolução deve aprofundar **confiança nos dados**, **velocidade de leitura** e **acessibilidade**, mantendo a plataforma estritamente informativa.

A documentação oficial dos provedores confirma que o desenho mais resiliente é um modelo de adaptadores com fallback: a brapi.dev é a fonte natural para B3, histórico, fundamentos e dividendos; a Twelve Data oferece REST e WebSocket para mercados globais, séries históricas e fundamentos; e a Finnhub oferece cotações, WebSocket, notícias, fundamentos e calendário econômico, embora alguns recursos tenham restrições de plano. As capacidades devem ser tratadas como uma matriz de cobertura, nunca como uma promessa uniforme de disponibilidade.

## Melhorias de produto priorizadas

| Prioridade | Melhoria | Valor para o usuário | Complexidade | Decisão |
|---|---|---|---|---|
| P0 | Proveniência da cotação | Exibe fonte, horário, idade e estado ao vivo/demonstração | Baixa | Implementar no MVP estendido |
| P0 | Estado de dados stale | Evita que o usuário confunda último valor conhecido com tempo real | Baixa | Implementar junto ao cache |
| P0 | Observabilidade de provedores | Mostra latência, erros 401/403/429 e cobertura por ativo | Média | Implementar no backend |
| P1 | Command palette e atalhos | Acelera busca de ativos e navegação por teclado | Média | Adicionar ao shell |
| P1 | PWA com último snapshot offline | Permite leitura rápida em conexão instável sem inventar novas cotações | Média | Após estabilizar o cache |
| P1 | Exportação CSV da carteira | Melhora portabilidade dos lançamentos manuais | Baixa | Adicionar sem Open Finance |
| P1 | Preferências de alerta | Horário silencioso, agrupamento e canal preferido | Média | Expandir schema de preferências |
| P1 | Acessibilidade aprofundada | Eleva navegação por teclado, leitores de tela e contraste | Média | Auditoria WCAG e testes automatizados |
| P2 | Centro de privacidade | Exportar e apagar dados manuais e preferências | Média | Implementar antes de escala |
| P2 | Digest editorial | Resumo opt-in de notícias e eventos, sem recomendação | Média | Depende de licenças e consentimento |
| P2 | Tax lots e eventos corporativos | Melhora rentabilidade manual sem importar corretora | Alta | Fase posterior |

## Diretrizes de design Apple-inspired

A interface deve privilegiar uma hierarquia curta: **o que aconteceu**, **quando aconteceu**, **qual é a fonte** e **qual ação de leitura está disponível**. O glassmorphism deve ser usado apenas em superfícies contextuais, nunca sobrepor números críticos, e todas as animações não essenciais devem respeitar `prefers-reduced-motion`.

A barra superior deve manter busca global, estado de atualização e tema. O dashboard deve oferecer módulos reorganizáveis, mas cada widget precisa manter o mesmo contrato visual: título curto, valor principal, variação, timestamp, origem e estado de erro. O indicador “ao vivo” deve ser reservado para dados atualizados dentro de uma janela definida pelo ativo; caso contrário, usar “último valor conhecido” ou “demonstração”.

## Arquitetura de dados e cobertura

| Fonte | Cotações | Histórico | Fundamentos | Notícias | Calendário | Observação operacional |
|---|---:|---:|---:|---:|---:|---|
| brapi.dev | Sim | Sim | Sim | Não assumido | Não assumido | Prioritária para B3; confirmar termos e limites antes da operação comercial |
| Twelve Data | Sim | Sim | Sim | Dependente do plano/endpoint | Não assumido | REST e WebSocket; tratar `null`, 401, 403, 429 e custo por crédito |
| Finnhub | Sim | Sim | Sim | Sim | Sim | WebSocket e endpoints editoriais; candles, notícias e calendário podem variar por plano |
| Catálogo Apex | Demonstração | Demonstração | Demonstração | Demonstração | Demonstração | Fallback explicitamente rotulado; nunca deve ser apresentado como dado ao vivo |

A aplicação deve persistir o **timestamp de coleta**, a **fonte**, a **idade do dado** e um identificador de falha quando houver fallback. O frontend não deve inferir “tempo real” apenas porque uma chave de API está configurada.

## Governança e segurança

As chaves permanecem exclusivamente no servidor. O cliente recebe apenas flags booleanas de disponibilidade, origem e timestamps. Erros de provedores devem ser normalizados para não vazar tokens ou URLs com credenciais. Limites de requisição devem ser tratados com cache curto, backoff e circuit breaker por fonte.

Notícias são exibidas como links e metadados, sem republicação integral. Antes da operação em produção, a equipe deve verificar licenças, limites de redistribuição, atribuição de fonte, cobertura geográfica e uso comercial de cada endpoint. O calendário também precisa registrar a origem e a hora oficial do evento.

## Desempenho e experiência

O build atual alerta que o bundle principal ultrapassa 500 kB. A próxima otimização é dividir por rota com `import()` para que usuários do dashboard não carreguem calculadoras, comparador e gráficos avançados antes de solicitá-los. O cache deve ser segmentado: ticker curto, snapshot de ativo médio, histórico e editorial com TTL próprio.

O streaming deve ser aplicado apenas a ativos líquidos e apenas quando o provedor e o plano suportarem a conexão. Para os demais, polling com jitter reduz chamadas sincronizadas. O servidor deve manter o runtime sem workers persistentes incompatíveis com autoscale; alertas recorrentes devem usar o mecanismo de execução agendada da plataforma quando o produto for ativado para produção.

## Fontes consultadas

1. [Documentação oficial da brapi.dev][brapi] — endpoints de cotações, histórico, fundamentos e dividendos para o mercado brasileiro.
2. [Documentação oficial da Twelve Data][twelve] — REST, WebSocket, séries históricas, fundamentos, tratamento de `null`, limites e erros de API.
3. [Documentação oficial da Finnhub][finnhub] — autenticação, limites, WebSocket, notícias, candles, fundamentos e calendário econômico.

[brapi]: https://brapi.dev/docs
[twelve]: https://twelvedata.com/docs
[finnhub]: https://finnhub.io/docs/api
