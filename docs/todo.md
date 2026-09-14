# Project TODO

- [x] Modelar tabelas de ativos, cotações, watchlists, transações, alertas e notícias
- [x] Gerar e aplicar a migração inicial do banco de dados
- [x] Criar camada de dados com catálogo inicial de ativos e cotações demonstrativas claramente identificadas
- [x] Implementar procedimentos tRPC para ativos, cotações, notícias e calendário
- [x] Implementar procedimentos tRPC para watchlist e carteira manual
- [x] Implementar procedimentos tRPC para alertas de preço e preferências do usuário
- [x] Implementar integração de dados com brapi.dev, Twelve Data e Finnhub com adaptadores e fallback controlado
- [x] Implementar Dashboard com ticker tape, maiores altas, baixas, volumes e widgets modulares
- [x] Implementar página de detalhe do ativo com gráfico, períodos, indicadores técnicos e fundamentalistas
- [x] Implementar feed de notícias e calendário econômico interativo
- [x] Implementar Screener com P/L, P/VP, DY, ROE e Margem Líquida
- [x] Implementar comparador de até quatro ativos
- [x] Implementar calculadora de juros compostos e histórico de dividendos
- [x] Implementar carteira manual com compras, vendas, rentabilidade e alocação
- [x] Implementar alertas acima/abaixo com notificação in-app e e-mail
- [x] Implementar watchlist por usuário
- [x] Implementar tema dark/light, design system Apple-inspired, microanimações e responsividade mobile-first
- [x] Atualizar rotas, navegação e estados de loading/empty/error
- [x] Escrever e atualizar testes Vitest para regras e procedures
- [x] Executar typecheck, testes e verificação visual responsiva
- [x] Salvar checkpoint final do portal
- [x] Registrar melhorias futuras pesquisadas: PWA, acessibilidade avançada, privacidade, observabilidade e governança de dados

## Histórico

- Projeto inicializado com template fullstack web-db-user.
- Requisitos consolidados a partir da especificação do produto.

## Restrições de produto

- Plataforma estritamente informativa e analítica, sem recomendações automatizadas.
- Carteira somente por lançamento manual, sem Open Finance.
- Indicadores fundamentalistas exibidos: P/L, P/VP, DY, ROE e Margem Líquida.
- Comparador limitado a quatro ativos simultâneos.
- Fontes obrigatórias: brapi.dev, Twelve Data e Finnhub.
- Dados demonstrativos devem ser identificados como demonstração quando não houver credenciais ou resposta das fontes.
- Não fabricar avaliações, depoimentos ou reviews de usuários.

## Decisões de design

- Linguagem visual Apple-inspired: tipografia limpa, hierarquia generosa, superfícies translúcidas discretas, alto contraste e microinterações rápidas.
- Navegação principal persistente no desktop e barra inferior no mobile.
- Dark mode e light mode com tokens semânticos, incluindo suporte a prefers-reduced-motion.
- Acessibilidade: foco visível, navegação por teclado, labels semânticos e contraste adequado.

## Escopo futuro, não bloqueante para o MVP

- Streaming de cotações com credenciais comerciais em produção.
- Envio real de e-mail via provedor transacional configurado.
- Calendário econômico e notícias com licenças comerciais confirmadas.
- PWA com instalação offline e push notifications nativas.
- Alertas recorrentes executados por Heartbeat após definição de provedor e política de custos.
- Backfill histórico e jobs de ingestão resilientes.

## Critérios de aceite

- [x] O usuário consegue navegar pelo dashboard e abrir detalhes de ativos sem estados quebrados.
- [x] O usuário consegue alternar dark/light e usar o portal em viewport móvel.
- [x] O usuário consegue favoritar ativos, cadastrar operações e visualizar consolidação calculada.
- [x] O usuário consegue comparar no máximo quatro ativos e recebe validação ao exceder o limite.
- [x] O usuário consegue simular juros compostos e consultar dividendos passados.
- [x] O usuário consegue criar alertas acima/abaixo e visualizar o status in-app.
- [x] O projeto passa no typecheck e nos testes Vitest existentes e novos.
- [x] O build de produção termina sem erros.
- [x] O checkpoint final é salvo antes da entrega.

## Pendências identificadas na revisão do backend

- [x] Sinalizar explicitamente dados de demonstração de notícias e calendário, mantendo atualização e fallback controlado.
- [x] Adicionar validações de carteira manual: impedir venda acima da posição, validar existência do ativo e retornar erros tipados.
- [x] Expandir/adaptar a camada de provedores para documentar e cobrir cotações, histórico, fundamentos, notícias e calendário com brapi.dev, Twelve Data e Finnhub.
- [x] Corrigir os itens marcados como concluídos de forma ampla quando a implementação ainda depender de catálogo demonstrativo, documentando origem, matriz de cobertura e flag de demonstração.

- [x] Avaliar alertas no fluxo de atualização de cotações, criar notificações in-app e enviar e-mail via Resend quando configurado.

## Verificações finais adicionadas após revisão

- [x] Inspecionar e/ou testar Home e AssetDetail com loading, empty e error states explícitos.
- [x] Validar no código e nos testes o fluxo completo de watchlist, carteira e consolidação.
- [x] Validar as procedures e a UI das calculadoras de juros compostos e dividendos, incluindo estados de entrada inválida.
- [x] Validar no código de News e nas procedures de market/news/calendar o aviso de demonstração e o fallback controlado.
- [x] Validar no router/db de portfolio as regras de venda acima da posição, existência do ativo e erros tipados com testes dedicados.

## Gaps de cobertura identificados antes do checkpoint

- [x] Adicionar testes dedicados para watchlist e consolidação da carteira, cobrindo sucesso, estado vazio e cálculo do resumo/posição.
- [x] Fortalecer os testes de carteira para verificar explicitamente `TRPCError` e os códigos `NOT_FOUND` e `BAD_REQUEST`, além das mensagens.

## Cobertura de integração final

- [x] Adicionar testes para os helpers reais `addWatchlist`, `removeWatchlist` e `getWatchlist`, cobrindo adicionar, remover, idempotência e estado vazio.
- [x] Cobrir diretamente `getPortfolioSummary` com um mock determinístico de `listTransactions`, além do teste da função pura.

## Comunicação de origem de dados

- [x] Conectar `dataSource`, `fundamentalsSource` e flags explícitas de demonstração nas telas Home, AssetDetail e News, sem depender apenas da existência de chave de API.
- [x] Adicionar testes determinísticos para preservar origem e modo demonstração em snapshots e editoriais.

## Correções finais de contrato

- [x] Atualizar News.tsx para consumir `editorialStatus` e comunicar origem real ou demonstração sem depender exclusivamente de `providerStatus`.
- [x] Criar teste determinístico de `market.asset` validando `dataSource`, `fundamentalsSource` e `isDemo` com fallback de catálogo.
- [x] Criar testes determinísticos de `market.news`, `market.calendar` e `editorialStatus` com origem e demonstração sem chamadas externas.
- [x] Executar `pnpm test` e `pnpm check` após as últimas mudanças.

- [x] Salvar novo checkpoint final após a integração das flags de origem e dos testes de proveniência.

## Integração da marca Virtus

- [x] Copiar as variações SVG recebidas para o diretório externo de assets estáticos do projeto.
- [x] Selecionar assinatura clara/escura, símbolo compacto e variação horizontal para cada contexto da interface.
- [x] Publicar os assets pelo fluxo de armazenamento do WebDev e usar as URLs persistentes no código.
- [x] Atualizar cabeçalho, navegação, login/estado vazio, favicon e metadados para a marca Virtus.
- [x] Validar contraste, dimensionamento, alinhamento e responsividade da marca em light/dark e mobile/desktop.
- [x] Executar typecheck, testes, build e revisão visual após a integração da marca.
- [x] Salvar checkpoint final com a identidade Virtus aplicada.

## Refinamento de hierarquia da marca Virtus

- [x] Remover o símbolo Virtus duplicado no AppTopBar, conforme indicação visual do usuário.
- [x] Promover a assinatura Virtus inferior para a posição superior do contexto principal, sem duplicação.
- [x] Validar espaçamento, alinhamento e responsividade da nova hierarquia em desktop e mobile.
- [x] Executar typecheck, testes, build e salvar checkpoint da correção visual.

## Implantação integral do backlog da auditoria

- [x] Implementar Command Palette global com Ctrl+K/Cmd+K para busca de ativos e navegação.
- [x] Implementar code-splitting das rotas e reduzir o bundle inicial do frontend.
- [x] Implementar watchlist local e preferências anônimas com sincronização segura após login.
- [x] Implementar exportação CSV da carteira, histórico e dividendos.
- [x] Preparar exportação PDF da carteira com origem, data e disclaimers.
- [x] Ampliar fundamentos e screener somente com campos reais e proveniência verificável dos provedores.
- [x] Fortalecer acessibilidade, onboarding educacional, tooltips, estados de erro e loading.
- [x] Implementar transparência operacional para credenciais, licenciamento e modo demonstração sem afirmar autorização não comprovada.
- [x] Executar testes, typecheck, build, revisão visual e salvar checkpoint final.

## Criação de repositório GitHub privado

- [x] Validar autenticação com a CLI do GitHub.
- [x] Criar repositório privado `virtus-invest-portal` (github.com/joaoschaun33-cloud/virtus-invest-portal).
- [x] Enviar o código atual do projeto para o GitHub (2026-09-14).

## Exportação para GitHub

- [x] Conectar conta GitHub do usuário para habilitar exportação de repositório privado.
- [x] Criar o repositório `virtus-invest-portal` via interface de gerenciamento.

## Correções da auditoria multidisciplinar (2026-09-14)

Ver `docs/audits/AUDITORIA_MULTIDISCIPLINAR_2026-09-14.md` para o relatório completo.

- [x] Trocar licença MIT por licença proprietária (LICENSE, package.json, README.md).
- [x] Criar repositório GitHub privado e migrar o histórico completo (ver seções acima).
- [x] Adicionar alerta automático de proximidade do fim da cobertura manual do calendário Copom/BCB (`assertOfficialBcbScheduleFreshness`), com teste dedicado.
- [x] Substituir todos os `console.log/warn/error` de produção no servidor pelo logger estruturado (`server/_core/logger.ts`).
- [x] Remover tipagem `any[]` de `Home.tsx` usando `RouterOutputs` inferido do `AppRouter`; corrigir inconsistência real de tipos entre `portfolio.watchlist` (linha bruta da tabela `assets`) e `market.assets` (snapshot canônico) — `portfolio.watchlist` agora normaliza cada ativo via `getStoredAssetSnapshot`, igual ao restante do produto.
- [x] Rodar Lighthouse mobile em produção (www.virtusinvestimentos.com.br): Performance 94, Acessibilidade 100, Boas Práticas 96, SEO 100 — resultado salvo em `docs/lighthouse-2026-09-14-home.json`.
- [x] Corrigir estados de loading que retornavam `null` sem feedback visual (`PortfolioInsight.tsx`, `PortfolioIncome.tsx`) — agora mostram skeleton enquanto carregam.
- [x] Re-verificar itens médio/baixo impacto de auditorias anteriores: placeholder em inglês (ausente), tabela mobile frágil (já responsiva com grid colapsável), pausa do ticker por foco de teclado (`:focus-within` já presente) — todos já resolvidos por trabalho anterior.
- [ ] Casts `as any` em primitivos shadcn/ui vendorizados (`textarea.tsx`, `input.tsx`, `dialog.tsx`) — avaliados e deixados como estão de propósito: são workarounds pragmáticos de composição de IME/teclado com risco de regressão maior que o benefício de remover o cast.

### Pendências que não são de código (decisão humana/negócio)

- [ ] Decidir e agendar a abertura do beta fechado — produto já passou no próprio gate técnico.
- [ ] Revisão jurídica profissional CVM/LGPD do conteúdo de "análise fundamentalista".
- [ ] Simular custo variável por usuário ativo dos provedores de dados pagos (Twelve Data, Finnhub, CoinGecko, EODHD) antes de qualquer campanha de aquisição.
- [ ] Testar a home com 5 usuários reais.
- [ ] Definir modelo de monetização (mesmo que a resposta seja "nenhum por 12 meses").
