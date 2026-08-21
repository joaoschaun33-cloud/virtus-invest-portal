# Benchmark brasileiro e estratégia de publicação do Virtus

**Pesquisa atualizada em:** 16 de agosto de 2026  
**Objetivo:** identificar os melhores padrões dos portais brasileiros de investimentos e convertê-los em uma estratégia própria, publicável e defensável para o Virtus.

## Resumo executivo

O mercado brasileiro está dividido em quatro modelos:

1. **Mídia + ferramentas**, representado por InfoMoney e Valor Investe.
2. **Dados fundamentalistas + carteira**, liderado por Status Invest e Investidor10.
3. **Terminal/consolidador**, representado pelo TradeMap.
4. **Análise especializada**, com Fundamentus em ações e FIIs e Mais Retorno em fundos, risco e comparação.

O Virtus não deve tentar copiar todos. A melhor oportunidade é ocupar o espaço de **workspace independente de decisão**, combinando:

- a profundidade e a rastreabilidade do Fundamentus;
- a clareza de carteira do Status Invest;
- a experiência guiada do Investidor10;
- a comparação de risco da Mais Retorno;
- o contexto editorial do InfoMoney;
- sem assumir, no lançamento, a complexidade operacional e regulatória de um terminal de negociação como o TradeMap.

### Posicionamento recomendado

> **Virtus é o workspace brasileiro que transforma dados financeiros em contexto verificável — para pesquisar, comparar e acompanhar investimentos sem ruído, conflito comercial ou recomendação automática.**

O diferencial central não deve ser “mais dados”. Deve ser **dados com procedência, data, cobertura e explicação**, apresentados na profundidade adequada a cada nível de investidor.

## Portais de referência

| Portal | Papel no mercado | O que faz melhor | O que o Virtus deve aprender | O que não deve copiar |
|---|---|---|---|---|
| **Status Invest** | Fundamentalista e gestão de carteira | Cobertura ampla, carteira, dividendos, integração B3, planos por profundidade | Dashboard patrimonial, metas, proventos, progressão free→premium | Excesso de módulos e promessas de projeção/recomendação |
| **Investidor10** | Análise rápida, educação e carteira | Navegação simples, rankings, integração B3, conteúdo e benefícios PRO | Descoberta de ativos, agenda, metas, explicações e cross-sell contextual | Misturar ferramenta independente e carteiras recomendadas sem separação muito clara |
| **TradeMap** | Terminal pessoal e consolidador | Cobertura, notícias, carteira, alertas, técnico, mobile e segmentação por plano | Densidade ajustável, alertas de eventos, visão multiativo e plano profissional | Negociação/multibroker na primeira fase; aumenta risco e suporte drasticamente |
| **Mais Retorno** | Fundos, risco e simulação | Comparações por benchmark, volatilidade, Sharpe, correlação e janelas móveis | Comparação metodologicamente correta, risco-retorno e relatórios | Linguagem comercial agressiva e comparações entre classes sem contexto |
| **Fundamentus** | Pesquisa fundamentalista | História longa, demonstrativos, screener e exportação de balanços | Profundidade histórica, setor/subsetor, download e fontes primárias | Interface datada e baixa orientação para iniciantes |
| **InfoMoney** | Mídia financeira com ferramentas | Contexto diário, educação, distribuição e variedade de comparadores | Conectar notícia, evento, ativo e ferramenta sem perder contexto | Modelo dependente de alto volume editorial e publicidade |
| **Valor Investe** | Jornalismo financeiro de autoridade | Confiança editorial e interpretação macro/econômica | Padrão editorial, autoria, revisão e separação entre fato e opinião | Paywall/conteúdo como núcleo antes de o Virtus construir capacidade editorial |
| **Investing.com Brasil** | Cobertura global e calendário | Amplitude internacional, agenda macro e velocidade | Calendário, alertas, normalização de fuso/moeda e cobertura global | Poluição visual, publicidade intensa e excesso de sinais de curto prazo |

## Evidências relevantes

- O [Fundamentus](https://fundamentus.com.br/) oferece screener, comparação setorial, planilhas de balanços, gráficos históricos de contas e cotações ajustadas desde 1998.
- O [InfoMoney](https://www.infomoney.com.br/ferramentas/) reúne ativos, altas e baixas, carteira e comparadores de investimentos, renda fixa, fundos e FIIs.
- O [Status Invest](https://lp.statusinvest.com.br/ao/planos-status-invest-d/) monetiza profundidade de carteira, integração B3, projeções e módulos fiscais.
- O [Investidor10 PRO](https://investidor10.com.br/assine9-v3-b3/) oferece integração B3, múltiplas carteiras, patrimônio, metas, proventos e auxílio ao IRPF; recomendações são atribuídas a uma empresa parceira identificada.
- O [TradeMap](https://trademap.com.br/planos) segmenta Free, Explorer e Pro, indo de carteira/notícias e fundamentos a opções, fluxo, risco e calendário global.
- A [Mais Retorno](https://lp.maisretorno.com/retorno-prime-rep) enfatiza risco-retorno, Sharpe, correlação, janelas móveis, benchmarks e exportação.

## Padrões vencedores do mercado

### 1. O ativo é a unidade central

Os melhores portais conectam em uma página: preço, data, variação, histórico, fundamentos, proventos, fatos relevantes, documentos, pares e ações do usuário. O Virtus deve adotar uma página canônica por ativo e fazer todas as outras telas consumirem o mesmo snapshot.

### 2. Ferramentas criam recorrência; conteúdo cria aquisição

Notícias atraem busca e visita inicial. Carteira, watchlist, alertas, comparações e agenda trazem o usuário de volta. Portanto, o Virtus deve usar conteúdo explicativo e páginas indexáveis para aquisição, mas concentrar produto em acompanhamento e diligência.

### 3. O premium vende economia de tempo

Status Invest, Investidor10, TradeMap e Mais Retorno não vendem apenas dados: vendem consolidação, automação, relatórios, projeções e redução de trabalho manual. O Virtus deve preservar uma camada gratuita generosa e cobrar por automação, profundidade, histórico, alertas e exportações.

### 4. Iniciantes precisam de contexto; avançados precisam de controle

- Iniciante: glossário, exemplos, risco, orientação e defaults seguros.
- Intermediário: filtros, comparações, carteira, proventos e benchmark.
- Avançado: metodologia, fontes, séries longas, exportação e densidade.

Uma mesma tela pode atender aos três com revelação progressiva, não com três produtos separados.

### 5. Confiança é uma funcionalidade

No Virtus, cada dado material deve ter:

- valor e unidade;
- data/hora de referência;
- fonte e tipo de fonte;
- estado live, atrasado, fechamento ou demonstração;
- período da métrica;
- nível de cobertura/indisponibilidade;
- metodologia acessível.

Esse padrão é mais defensável do que tentar competir apenas por quantidade de indicadores.

## Arquitetura de produto recomendada

### Navegação pública

1. Visão geral
2. Mercados
3. Ativos
4. Screener
5. Comparar
6. Calendário e documentos
7. Calculadoras
8. Aprender
9. Metodologia e fontes

### Navegação autenticada

1. Meu painel
2. Watchlists
3. Carteira
4. Alertas
5. Relatórios e exportações
6. Preferências e privacidade

### Página canônica do ativo

1. Cabeçalho: ticker, nome, bolsa, classe, moeda e status do dado.
2. Preço: último valor, referência, atualização e fonte.
3. Histórico: períodos coerentes, ajustes e comparação com benchmark.
4. Fundamentos: período, unidade, histórico e definição.
5. Proventos e eventos corporativos.
6. Documentos primários e fatos relevantes.
7. Pares setoriais comparáveis.
8. Alertas, watchlist e adicionar à comparação.
9. Metodologia e limitações.

## Proposta de planos

### Virtus Aberto — gratuito

- Mercado com dados de fechamento ou delay licenciado.
- Página de ativo, fundamentos essenciais e documentos oficiais.
- Screener básico, comparação de até 3 ativos e calculadoras.
- Uma watchlist local ou em conta.

### Virtus Plus — faixa inicial sugerida de R$ 19–29/mês

- Múltiplas watchlists e carteiras.
- Alertas avançados e agenda personalizada.
- Histórico completo e comparação com benchmarks.
- Exportação CSV/PDF e relatórios recorrentes.
- Mais filtros e explicações avançadas.

### Virtus Pro — validar depois, não lançar imediatamente

- API/exportações em lote.
- Métricas avançadas de risco e janelas móveis.
- Portfólios simulados, cenários e relatórios profissionais.
- Maior frequência de dados conforme licenciamento.

Preços são hipóteses para pesquisa com usuários, não decisão final.

## Barreiras regulatórias e operacionais

### Market data

A B3 informa que distribuição de dados brutos em tempo real ou com atraso de até 15 minutos exige contrato, enquanto dados de fim de dia e históricos a partir de D-1 podem ter tratamento distinto. Antes de publicar cotações, o Virtus precisa definir formalmente o produto de dados, fornecedor, direito de exibição, armazenamento, redistribuição e atribuição. Fontes: [FAQ de Market Data B3](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/distribuidores/perguntas-frequentes/) e [política comercial 2026](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/distribuidores/politica-comercial-e-contratos/).

### Análise e recomendação

A [Resolução CVM 20](https://conteudo.cvm.gov.br/legislacao/resolucoes/resol020.html) regula a atividade de analista de valores mobiliários. Consultoria individualizada é atividade autorizada pela CVM, conforme a [orientação oficial sobre consultores](https://www.gov.br/cvm/pt-br/assuntos/regulados/consultas-por-participante/consultores-de-valores-mobiliarios/consultores-de-valores-mobiliarios). O Virtus deve manter ferramentas informativas e critérios controlados pelo usuário; qualquer rating, preço-alvo, carteira recomendada ou orientação personalizada exige revisão jurídica e estrutura regulatória adequada.

### Educação financeira

A referência editorial deve ser imparcialidade, proteção e decisão informada, alinhada aos princípios educacionais descritos pela [CVM](https://www.gov.br/cvm/pt-br/assuntos/educacao/).

### Privacidade

Carteira, alertas, preferências e comportamento são dados pessoais. O Virtus precisa mapear controlador, operadores, bases legais, retenção, exportação, exclusão, incidentes e encarregado conforme a [ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado).

## Roadmap para publicação

### Fase 0 — fundação de confiança (2 semanas)

- Corrigir todos os bloqueadores da auditoria anterior.
- Criar contrato canônico de dados com `value`, `currency`, `asOf`, `source`, `freshness`, `isDemo` e `coverage`.
- Remover dados contraditórios, runtime de debug e erros de console.
- Definir política editorial, privacidade, termos e inventário de fornecedores.

### Fase 1 — MVP público confiável (3–5 semanas)

- Home orientada a descoberta.
- Mercados e página canônica de ativo.
- Screener por classe, comparação e calculadora com premissas.
- Documentos oficiais, metodologia e status das fontes.
- SEO, acessibilidade WCAG 2.2 AA, performance e observabilidade.

### Fase 2 — ativação e retenção (3–4 semanas)

- Cadastro próprio/SSO publicável.
- Onboarding por objetivo e experiência.
- Watchlists, alertas e agenda personalizada.
- Analytics de ativação com consentimento e eventos mínimos.

### Fase 3 — carteira e monetização (4–6 semanas)

- Carteira manual consistente, proventos e benchmark.
- Exportação e relatórios.
- Página de planos, checkout e controles de assinatura.
- Piloto fechado do Virtus Plus.

### Fase 4 — escala

- Integração B3 apenas após contrato, segurança e suporte definidos.
- Fundos/renda fixa, séries globais e risco avançado.
- Aplicativo/PWA e plano profissional, se métricas justificarem.

## Métricas de sucesso

### Confiança

- 100% dos dados materiais com fonte e timestamp.
- Zero divergência cross-page no mesmo snapshot.
- Zero erro de console nas jornadas públicas.
- Disponibilidade e latência por provedor monitoradas.

### Produto

- Busca→página de ativo.
- Página de ativo→watchlist/comparação.
- Cadastro concluído.
- Usuário que retorna em 7 e 30 dias.
- Alertas criados e efetivamente entregues.

### Negócio

- Conversão visitante→conta.
- Conversão conta→trial→pago.
- Retenção e churn por plano.
- Custo de dados por usuário ativo/pagante.

## Decisões recomendadas agora

1. **Não oferecer recomendação automática no lançamento.**
2. **Começar com dados de fechamento/D-1 ou fonte claramente licenciada**, em vez de prometer tempo real sem contrato.
3. **Eleger a página de ativo e a procedência do dado como núcleo do produto.**
4. **Lançar primeiro para investidor iniciante/intermediário diligente**, não para trader profissional.
5. **Monetizar automação e profundidade**, preservando descoberta e educação gratuitas.
6. **Tratar acessibilidade, privacidade, metodologia e status de dados como produto**, não como rodapé jurídico.

## Próximo ciclo de desenvolvimento sugerido

O primeiro ciclo deve implementar, nesta ordem:

1. camada canônica e consistente de dados;
2. página de ativo redesenhada;
3. selo de atualização/fonte em todas as superfícies;
4. correções de acessibilidade e mobile;
5. remoção do runtime de desenvolvimento da produção;
6. testes E2E de confiança;
7. home e onboarding orientados ao posicionamento novo.

