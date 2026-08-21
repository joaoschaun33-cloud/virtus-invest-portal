# Auditoria Conselho Estratégico - Portal Virtus

**Projeto:** `C:\dev\virtus portal manus`
**Site:** virtusinvestimentos.com.br
**Data da síntese:** 19 de agosto de 2026
**Objetivo do portal:** portal informativo e educativo sobre mercados financeiros, com análises e dados, **sem recomendação de compra, venda ou alocação de investimentos**.

---

## 1. Resumo Executivo

O portal Virtus apresenta uma base técnica madura e uma identidade visual alinhada ao padrão Apple. A **Onda 1 — Fundação** foi concluída em 20 de agosto de 2026, eliminando os três vetores de risco críticos identificados anteriormente: (i) a chave de API Firebase foi removida do código-fonte do cliente e movida para variável de ambiente; (ii) os erros de tipagem do TypeScript foram corrigidos e `tsc --noEmit` passa com 0 erros; (iii) o snapshot canônico por ativo foi criado e integrado às páginas Mercados, Detalhe e Comparar, garantindo consistência de preços cross-page. Além disso, o `ComponentShowcase.tsx` foi removido de produção e a validação de e-mail foi aplicada no `DashboardLayout`.

Do ponto de vista positivo, as integrações oficiais brasileiras (BCB, IBGE, CVM cadastral, CVM demonstrações financeiras, B3 ISIN, RSS) já estão operacionais com cache, e as correções recentes em `server/db.ts` e no marquee de tickers da home demonstram capacidade de iteração rápida. A arquitetura de provedores de mercado (brapi, Twelve Data, Finnhub) está bem desenhada, embora sua cobertura real dependa de tokens de API e de licenças ainda não confirmadas.

A recomendação estratégica agora é avançar para a **Onda 2 — Dados**: dinamizar o Tesouro Direto e o calendário Copom, expandir o catálogo B3/CVM, implementar proveniência de dados e confirmar licenças de provedores pagos. O portal já possui a base segura necessária para essa evolução.

---

## 2. Status Atual do Portal

### 2.1 O que está funcionando agora

| Capacidade | Status | Evidência / Arquivo |
|------------|--------|---------------------|
| Integração BCB (Selic, IPCA, dólar) | Funcionando com cache | Provedores de dados oficiais |
| Integração IBGE (inflação) | Funcionando com cache | Camada 1 de dados |
| CVM cadastral | Ativa | Endpoint de dados CVM |
| CVM demonstrações financeiras (DFP/ITR via ZIP) | Ativa | Download e parsing ZIP |
| B3 ISIN | Ativa | Provedor B3 |
| RSS Agência Brasil e CVM | Ativos | Fontes de notícias |
| Firebase Auth | Funcionando | `client/src/lib/firebaseAuth.ts` |
| Layout visual padrão Apple | Próximo do alvo | `ApexPrimitives`, glassmorphism, tipografia editorial |
| Marquee de tickers na home | Implementado e validado | `@keyframes tickerSlide`, hover pause, `prefers-reduced-motion` |
| Normalização de tipo de ativo | Corrigida | `server/db.ts` (`normalizeAssetType`) |
| WebSocket realtime customizado | Existe, mas com handshake 400 | `/api/realtime` |

### 2.2 Condições gerais de saúde do projeto

- **Backend:** arquitetura modular com múltiplos provedores, mas com gaps de atualização e dependência de tokens.
- **Frontend:** visualmente sofisticado, porém com dívidas técnicas de tipagem, segurança e acessibilidade.
- **Dados:** fontes brasileiras estáveis, mas ausência de snapshot canônico por ativo gera inconsistência cross-page.
- **Segurança:** chave Firebase exposta em produção é o risco mais crítico.
- **Conformidade:** nenhuma recomendação de investimento foi identificada, mantendo o portal dentro do perfil informativo/educativo.

---

## 3. Auditoria Backend

### 3.1 Fontes de dados mapeadas

| Fonte | Tipo | Status | Observação |
|-------|------|--------|------------|
| BCB - Selic | Oficial brasileira | Ativa com cache | Fonte primária da taxa básica de juros |
| BCB - IPCA | Oficial brasileira | Ativa com cache | Índice oficial de inflação |
| BCB - Dólar | Oficial brasileira | Ativa com cache | Câmbio PTAX |
| IBGE | Oficial brasileira | Ativa com cache | Dados de inflação e atividade |
| CVM cadastral | Oficial brasileira | Ativa | Consulta de entidades registradas |
| CVM DFP/ITR | Oficial brasileira | Ativa via ZIP | Demonstrações financeiras de empresas listadas |
| B3 ISIN | Oficial brasileira | Ativa | Identificação internacional de títulos |
| Agência Brasil RSS | Notícias | Ativo | Feed de notícias econômicas |
| CVM RSS | Notícias | Ativo | Feed oficial da CVM |
| brapi | Provedor de mercado | Sandbox limitada | 4 tickers sem token; expandida com token |
| Twelve Data | Provedor de mercado | Token necessário | Dados internacionais e nacionais |
| Finnhub | Provedor de mercado | Token necessário | Fundamentalistas e cotações |
| Tesouro Transparente | Oficial brasileira | Planejada | **Não implementada** - dados hardcoded em `server/treasuryData.ts` |
| Calendário Copom | Oficial brasileira | Hardcoded | Datas fixas no código, sujeitas a erro de manutenção |
| Firebase Auth | Infraestrutura | Funcionando | Chave de API exposta no cliente |
| Resend | Infraestrutura | Configurado | Envio de e-mails |
| Serviços Forge | Infraestrutura | Configurado | Serviços auxiliares |

### 3.2 Gaps críticos do backend

1. **Tesouro Direto hardcoded**: apesar de constar como "planned", os dados estão em `server/treasuryData.ts`, sem integração com a API Tesouro Transparente.
2. **Calendário Copom hardcoded**: datas de reuniões do Copom estão fixas no código, exigindo deploy para atualização.
3. **Dependência de tokens internacionais**: Twelve Data e Finnhub só funcionam com tokens + flag de exibição pública; sem licenças confirmadas, a cobertura é teórica.
4. **Chave Firebase exposta**: `client/src/lib/firebaseAuth.ts` contém API key hardcoded, violando boas práticas de segurança.
5. **Snapshot canônico ausente**: cada página consulta provedores de forma independente, gerando inconsistências (ex.: PETR4 com preços diferentes em Mercados, Detalhe e Comparar).

### 3.3 Endpoints e fluxo de dados

- Dados oficiais brasileiros fluem por provedores dedicados com cache em memória/cache de curto prazo.
- Dados de mercado são roteados entre brapi, Twelve Data e Finnhub conforme disponibilidade de token.
- Notícias são ingeridas por RSS e expostas em área dedicada.
- WebSocket realtime customizado em `/api/realtime` substitui subscriptions tRPC, mas apresenta handshake 400 e necessita de estabilização.

---

## 4. Diagnóstico Frontend

### 4.1 Correções validadas

| Correção | Onde | Descrição |
|----------|------|-----------|
| `normalizeAssetType` | `server/db.ts` | Traduz tipos de ativo entre português e inglês e preenche corretamente os filtros da interface |
| Hero ticker marquee | Home | Implementado com `@keyframes tickerSlide`, pausa no hover e respeito a `prefers-reduced-motion` |

### 4.2 Problemas priorizados

#### Alto impacto

| Problema | Arquivo / Componente | Risco |
|----------|----------------------|-------|
| Chave Firebase API hardcoded | `client/src/lib/firebaseAuth.ts` | Vazamento de credencial, abuso de quota, risco de segurança |
| Props tipadas como `any[]` | `Home.tsx` | Perda de type safety, dificuldade de manutenção |
| `usePersistFn` com `any` | Hook | Dívida técnica, comportamento imprevisível |
| `ComponentShowcase.tsx` exposto em produção | Componente | Rota/página de debug acessível publicamente |
| `tsc --noEmit` falha | `server/marketProviders.ts` | Build bloqueado, código com erro de tipagem |
| `DashboardLayout` permite e-mail inválido | Layout | Validação fraca de formulário |

#### Médio / baixo impacto

| Problema | Observação |
|----------|------------|
| Ticker sem pausa por foco de teclado | Oportunidade de acessibilidade (`:focus-within`) |
| Animação linear | Pode ser substituída por easing suave para fluidez Apple |
| Estados de loading retornando `null` | Falta de feedback ao usuário |
| Tabela mobile frágil | Risco de quebra em telas pequenas |
| Console logs em produção | Poluição e potencial vazamento de informação |
| Placeholder em inglês no chat | Inconsistência de idioma |
| Casts `as any` em UI | Dívida técnica e risco de runtime |

### 4.3 Oportunidades padrão Apple

- **Pausa acessível no ticker**: além do hover, adicionar `:focus-within` para usuários de teclado.
- **Easing suave**: substituir `linear` por curvas de animação mais naturais.
- **`font-display: swap`**: melhorar a percepção de carregamento de fontes.
- **Skeletons e empty states**: eliminar retornos `null` em loading; mostrar estrutura do conteúdo que está chegando.
- **Badge de demonstração / proveniência**: informar a fonte e o timestamp dos dados, reforçando transparência e confiança.
- **Reduced motion**: expandir o respeito a `prefers-reduced-motion` para outros elementos animados.

---

## 5. Arquitetura de Dados por Camadas

### 5.1 Camada 1 - Macro e Renda Fixa

| Fonte | Implementação | Status | Gap |
|-------|---------------|--------|-----|
| BACEN / IBGE | Cache + endpoints | Funcionando | Nenhum crítico |
| Tesouro Direto | `server/treasuryData.ts` hardcoded | **Crítico** | Integrar Tesouro Transparente API |
| Calendário Copom | Hardcoded no código | **Crítico** | Migrar para fonte oficial dinâmica |

### 5.2 Camada 2 - Renda Variável e Fundamentos

| Fonte | Implementação | Status | Gap |
|-------|---------------|--------|-----|
| brapi | Sandbox + token | Funcionando com limitações | Necessita token para expansão |
| Twelve Data | Token + flag pública | Teórico sem token | Licença a confirmar |
| Finnhub | Token + flag pública | Teórico sem token | Licença a confirmar |
| CVM cadastral | Ativo | Funcionando | Nenhum crítico |
| CVM DFP/ITR | Ativo via ZIP | Funcionando | Nenhum crítico |
| B3 ISIN | Ativo | Funcionando | Expandir para índices (Ibovespa, IFIX) |
| Snapshot canônico por ativo | **Ausente** | **Crítico** | Criar cache normalizado cross-page |

**Problema exemplar:** a ação PETR4 pode apresentar preços distintos nas páginas Mercados, Detalhe e Comparar, porque cada uma consulta provedores de forma independente, sem um snapshot único e atualizado.

### 5.3 Camada 3 - Experiência

| Aspecto | Status | Oportunidade |
|---------|--------|--------------|
| Visual (glassmorphism, tipografia, ApexPrimitives) | Próximo do padrão Apple | Refinamento de micro-interações |
| Feedback de estado (loading, erro, vazio) | Fraco | Skeletons, empty states, toasts |
| Proveniência de dados | Ausente | Badge de fonte + timestamp |
| Realtime | WebSocket customizado em `/api/realtime` | Handshake 400; avaliar subscriptions tRPC ou consolidar WebSocket |

### 5.4 Fluxo backend → tRPC → frontend

1. Provedores de dados consultam fontes oficiais e de mercado.
2. Resultados são retornados via rotas tRPC para o frontend.
3. Componentes React consomem esses dados e renderizam visualizações.
4. **Gap:** não existe uma camada intermediária de normalização/cache canônico que garanta consistência entre diferentes telas e sessões.

---

## 6. Roadmap de Evolução

### 6.1 Onda 1 — Fundação (0-30 dias) ✅ Concluída em 20/08/2026

| Item | Descrição | Status | Complexidade | Dependências | Critério de aceite |
|------|-----------|--------|--------------|--------------|--------------------|
| Remover chave Firebase hardcoded | Mover API key para variável de ambiente / configuração segura | ✅ Concluído | Baixa | Acesso ao Firebase Console | Nenhuma chave sensível no bundle do cliente; build funciona |
| Corrigir `tsc --noEmit` | Resolver erro em `server/marketProviders.ts` | ✅ Concluído | Baixa | - | `pnpm run typecheck` passa com 0 erros |
| Criar snapshot canônico por ativo | Cache normalizado com preço, variação, fundamentos e timestamp | ✅ Concluído | Média | Definição de TTL e schema | PETR4 exibe o mesmo preço em Mercados, Detalhe e Comparar |
| Remover `ComponentShowcase.tsx` de produção | Garantir que rotas/componentes de debug não sejam públicos | ✅ Concluído | Baixa | - | URL de showcase retorna 404 em produção |
| Validar e-mail em `DashboardLayout` | Aplicar validação de formato no formulário | ✅ Concluído | Baixa | - | E-mail inválido é rejeitado com mensagem clara |

### 6.2 Onda 2 — Dados (30-90 dias)

| Item | Descrição | Complexidade | Dependências | Critério de aceite |
|------|-----------|--------------|--------------|--------------------|
| Integrar Tesouro Transparente API | Substituir `server/treasuryData.ts` hardcoded | Média | Documentação da API | Títulos do Tesouro exibem taxas atualizadas sem deploy manual |
| Tornar Copom dinâmico | Buscar datas oficiais do calendário Copom | Média | Fonte oficial do BCB | Próximas reuniões atualizam automaticamente |
| Expandir catálogo B3/CVM | Incluir Ibovespa, IFIX e demais índices | Média | Endpoints B3 | Índices aparecem no feed de mercado |
| Implementar proveniência de dados | Badge com fonte e timestamp de cada dado | Baixa | Snapshot canônico | Usuário vê "Fonte: BCB · atualizado há 5 min" |
| Confirmar licenças Twelve Data / Finnhub | Definir se há budget para tokens pagos | Baixa | Decisão comercial | Provedores ativos apenas quando token existir |

### 6.3 Onda 3 — Experiência (90-180 dias)

| Item | Descrição | Complexidade | Dependências | Critério de aceite |
|------|-----------|--------------|--------------|--------------------|
| Refinamento Apple | Skeletons, empty states, pausa ticker, easing suave, `font-display: swap` | Média | - | Lighthouse UX e acessibilidade melhoram |
| Mini sparklines de 7 dias | Gráficos de tendência curta nos cards de ativo | Média | Snapshot canônico + dados históricos | Cada card exibe sparkline com dados dos últimos 7 pregões |
| Terminal de comparação lado a lado | Página comparativa com múltiplos ativos | Média | Snapshot canônico | Comparação de 2+ ativos em layout sincronizado |
| Subscriptions tRPC ou consolidar WebSocket | Substituir ou estabilizar realtime | Alta | Decisão arquitetural | Handshake 400 resolvido; dados atualizam sem F5 |
| Alertas / watchlist pessoal | Lista de acompanhamento com notificações | Média | Firebase Auth estável | Usuário logado salva watchlist |

---

## 7. Riscos e Recomendações Imediatas

### Top 5 ações prioritárias

1. **Remover a chave Firebase API do cliente** (`client/src/lib/firebaseAuth.ts`)
   - **Risco:** vazamento de credencial, uso indevido de quota, possível acesso não autorizado.
   - **Ação:** migrar para variável de ambiente e restringir domínios no Firebase Console.

2. **Corrigir `tsc --noEmit` no backend** (`server/marketProviders.ts`)
   - **Risco:** build quebrado, deploy inconsistente, erros de tipagem em produção.
   - **Ação:** resolver tipos e adicionar checagem automática no CI.

3. **Criar snapshot canônico por ativo**
   - **Risco:** inconsistência de preços cross-page, perda de confiança do usuário.
   - **Ação:** implementar cache normalizado com TTL e invalidação clara.

4. **Integrar Tesouro Transparente e dinamizar calendário Copom**
   - **Risco:** dados desatualizados, necessidade de deploy para atualização, risco reputacional e regulatório.
   - **Ação:** substituir hardcoded `server/treasuryData.ts` por fontes oficiais dinâmicas.

5. **Remover `ComponentShowcase.tsx` de produção e reforçar validações**
   - **Risco:** exposição de componentes internos, validação fraca de e-mail.
   - **Ação:** desabilitar rotas de debug em build de produção e aplicar validação de e-mail.

### Riscos transversais

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Dependência de tokens pagos (Twelve Data, Finnhub) | Cobertura internacional pode não funcionar | Definir budget, fallback para brapi/fontes oficiais |
| WebSocket instável | Realtime não confiável | Consolidar subscriptions tRPC ou corrigir handshake |
| Dívida técnica de tipagem `any` | Manutenção custosa e bugs silenciosos | Refatorar gradualmente, priorizando alto impacto |
| Ausência de proveniência de dados | Menor confiança e transparência | Adicionar badge de fonte/timestamp na Onda 2 |
| Manutenção manual de dados fixos | Risco de desatualização | Automatizar todas as fontes possíveis |

---

## 8. Conclusão

O portal Virtus possui fundamentos sólidos: integrações oficiais brasileiras funcionando, uma arquitetura de provedores extensível e uma identidade visual sofisticada. Com a **Onda 1 — Fundação** concluída em 20 de agosto de 2026, os pré-requisitos de segurança (chave Firebase removida do cliente), qualidade de build (`tsc --noEmit` com 0 erros) e consistência de dados (snapshot canônico integrado) estão garantidos.

A sequência recomendada agora é: (i) dinamizar dados de renda fixa (Tesouro Transparente) e expandir o catálogo B3/CVM; (ii) adicionar proveniência e transparência aos dados; e (iii) refinar a experiência com skeletons, sparklines e realtime estável. O roadmap está calibrado para entregar valor incremental sem comprometer a estabilidade do que já funciona.

**Próximo passo recomendado:** iniciar a **Onda 2 — Dados**, priorizando a integração com o Tesouro Transparente e a dinamização do calendário Copom. Com a base segura estabelecida, o portal está pronto para avançar com segurança.

---

*Documento gerado para fins de análise estratégica. Não contém recomendação de compra, venda ou alocação de investimentos.*
