# Auditoria empresarial pré-beta — Portal Virtus

**Data-base:** 25 de agosto de 2026  
**Escopo:** produto, projeto, engenharia, dados, conteúdo, design, acessibilidade, segurança, privacidade, jurídico-regulatório, operação, crescimento e automação editorial.  
**Natureza:** parecer interno de prontidão; a seção jurídica orienta riscos e deve ser validada por advogado especializado antes da abertura ampla ou monetização.

## 1. Parecer executivo

O Virtus **não deve ser declarado “pronto e encerrado”**, mas já alcançou maturidade suficiente para um **beta fechado e controlado**, após uma correção técnica curta. Ainda não recomendo beta público irrestrito.

O produto passou da fase de protótipo: tem dados reais com proveniência, fontes oficiais, guia educacional, análise fundamentalista, carteira, alertas, documentos de privacidade, exportação e exclusão de conta, isolamento real entre usuários, automações operacionais e suíte consistente de testes. A base é boa e a evolução recente aumentou a qualidade.

Os bloqueadores atuais não exigem reescrever o portal. São problemas delimitados de entrega e governança:

1. corrigir o canal WebSocket ou remover temporariamente a promessa de tempo real;
2. eliminar a grande mudança de layout na abertura da página inicial;
3. colocar limitação de uso nas APIs públicas para proteger disponibilidade e cotas de dados;
4. criar monitoramento que teste dependências reais, sem respostas positivas falsas;
5. concluir a matriz de licenças e regras editoriais antes de ampliar dados globais, cripto e redes sociais;
6. formalizar critérios de correção, incidentes, conteúdo e aprovação humana.

**Decisão recomendada:** `BETA FECHADO CONDICIONADO`.

## 2. Placar de prontidão

| Área | Situação | Nota executiva | Decisão |
|---|---|---:|---|
| Proposta de valor | Boa | 8/10 | Pronta para validação com usuários |
| Guia para iniciantes | Boa | 8/10 | Pronto para beta; medir conclusão e aprendizagem |
| Análise fundamentalista | Boa, dependente de cobertura | 7/10 | Beta com rótulos claros de fonte, período e ausência |
| Dados e proveniência | Boa para B3/oficiais | 7/10 | Aceitável com limitações explícitas |
| Engenharia e testes | Boa | 8/10 | Base confiável; faltam E2E visual e carga |
| Segurança de conta | Boa | 8/10 | Isolamento aprovado; endurecer abuso de API |
| Confiabilidade operacional | Intermediária | 6/10 | Corrigir locks, health checks e alertas externos |
| Desempenho móvel | Insuficiente | 5/10 | Bloqueia abertura pública ampla |
| Acessibilidade | Muito boa na home | 9/10 | Manter testes por rota e teclado |
| SEO técnico | Muito bom | 9/10 | Expandir conteúdo indexável e dados estruturados |
| Privacidade/LGPD | Boa base | 7/10 | Melhorar revogação de consentimento e inventário |
| Jurídico financeiro | Controlado, não concluído | 6/10 | Revisão profissional antes de monetizar/automatizar recomendações |
| Operação editorial | Ainda manual | 5/10 | Implantar fluxo assistido, não autopublicação irrestrita |
| Analytics de produto | Inicial | 5/10 | Definir funil e métricas do beta |

## 3. Evidências verificadas

### Código e qualidade

- TypeScript sem erros (`pnpm run check`).
- 33 arquivos de teste aprovados e 1 ignorado; 91 testes aprovados e 1 ignorado.
- Auditoria de dependências de produção: nenhuma vulnerabilidade conhecida.
- Build de produção executa tipos, testes e compilação antes de criar a imagem.
- Runtime usa usuário sem privilégios no contêiner.
- Segredos ficam no Secret Manager, não no repositório.
- Branch principal estava sincronizada com as últimas entregas do guia e análise.

### Produção

- Revisão ativa observada: `virtus-web-00038-tlv`.
- Banco Cloud SQL ligado ao serviço.
- Agendamentos ativos: alertas a cada 5 minutos, ingestão CVM diária e fechamento B3 em dias úteis.
- Saúde real disponível em `/api/health`.
- O domínio possui HSTS, CSP, proteção contra iframe, `nosniff` e política de referência.
- A separação entre duas contas descartáveis, exportação e exclusão já foi validada em produção em teste controlado.

### Dados

- B3, CVM, demonstrações financeiras, histórico trimestral e métricas derivadas passaram na checagem atual.
- A consulta corrente de qualidade retornou fonte `brapi`, sem modo demonstração.
- A fonte IBGE não respondeu conforme o contrato esperado na checagem desta madrugada; deve ser tratada como indisponibilidade observada, não como dado válido.
- Twelve Data, Finnhub, CoinGecko e EODHD estão configurados, mas corretamente impedidos de exibição pública enquanto a licença não estiver aprovada.

### Experiência medida

Nova medição Lighthouse móvel da home em produção:

| Indicador | Resultado |
|---|---:|
| Performance | 57/100 |
| Acessibilidade | 100/100 |
| Boas práticas | 96/100 |
| SEO | 100/100 |
| FCP | 2,0 s |
| LCP | 3,5 s |
| TBT | 390 ms |
| CLS | 0,539 |

O resultado mostra boa estrutura, mas desempenho e estabilidade visual ainda incompatíveis com a ambição de uma grande marca. A medição anterior tinha performance 60 e CLS zero; portanto existe regressão visual recente na home.

## 4. Auditoria de produto

### O que está forte

- A proposta “clareza, fonte e contexto” é diferenciada e coerente com a interface.
- O caminho **Guia → análise → acompanhamento** cria uma jornada lógica para iniciantes.
- O portal não precisa fingir cobertura universal: comunicar ausência com honestidade fortalece a marca.
- Guia, análise, mercados, notícias, calculadoras, carteira e alertas formam um conjunto útil para validar retenção.
- O centro “Confiança & dados” transforma governança em atributo visível do produto.

### Risco de dispersão

O portal tem amplitude maior que a capacidade operacional atual. Para o beta, a promessa principal deve ser:

> Entender o mercado e uma empresa brasileira com dados identificados, aprender os fundamentos e acompanhar uma carteira manual sem receber recomendação personalizada.

Recursos globais, cripto, automações sociais, comunidade, Open Finance e recomendação não devem disputar prioridade até o funil principal provar valor.

### Métricas mínimas do beta

1. ativação: usuário conclui objetivo inicial e abre ao menos um ativo;
2. aprendizagem: início, conclusão e acerto nos testes do guia;
3. valor analítico: pesquisa de ticker → análise carregada → segunda visita;
4. confiança: percentual de telas com fonte e horário válidos;
5. retenção D1, D7 e D30;
6. carteira criada e segundo lançamento;
7. falha por consulta, fonte e ativo;
8. solicitações de suporte e correções editoriais;
9. exclusão de conta e motivo opcional, sem criar atrito ao direito;
10. satisfação curta por jornada, não uma nota genérica do portal.

### Critério de sucesso do beta fechado

- 50 a 150 usuários convidados;
- pelo menos 60% completam a ação inicial escolhida;
- pelo menos 35% retornam em 7 dias;
- mais de 90% das consultas B3 prioritárias exibem dado ou ausência corretamente explicada;
- zero incidente de separação entre contas;
- nenhuma publicação social factual sem fonte arquivada;
- menos de 2% de sessões com erro bloqueante nas jornadas principais.

## 5. Guia para iniciantes

### Avaliação

O guia está bom para beta. As últimas evoluções resolveram a principal deficiência da primeira integração: agora existe escolha de objetivo, trilha, continuidade e verificação de aprendizagem. Ele deixou de ser apenas uma página de leitura e passou a funcionar como jornada.

### Próximas melhorias

- Salvar progresso por conta; armazenamento somente local deve ser apoio, não fonte definitiva.
- Definir resultado educacional de cada módulo.
- Incluir exemplos reais com data e fonte, sem sugerir decisão individual.
- Criar glossário contextual acessível dentro das telas de análise.
- Medir abandono por etapa e respostas erradas recorrentes.
- Conectar cada conceito a uma ação segura: “ver exemplo”, “comparar períodos”, “ver a fonte”.
- Fazer revisão pedagógica e editorial trimestral.

## 6. Análise fundamentalista

### Avaliação

A análise é um dos ativos mais promissores do portal. O uso de B3/CVM e métricas derivadas identificadas é superior a exibir números sem procedência. A cobertura incompleta é aceitável no beta se o portal nunca preencher lacunas com estimativas silenciosas.

### Regras de qualidade obrigatórias

- Mostrar período de referência, consolidado/individual, moeda, escala e fonte.
- Diferenciar valor reportado de cálculo Virtus.
- Exibir fórmula e insumos das métricas derivadas.
- Não comparar empresas de setores incompatíveis sem aviso.
- Tratar bancos, seguradoras, fundos e empresas pré-operacionais com modelos próprios.
- Sinalizar reapresentações, eventos societários e dados antigos.
- Não transformar score ou indicador isolado em “comprar”, “vender”, “barata” ou “cara”.
- Manter testes por CNPJ/ticker, mudanças de código de negociação e units.

## 7. Engenharia, arquitetura e segurança

### Pontos fortes

- Rotas carregadas sob demanda.
- Autenticação Firebase validada no servidor.
- Procedimentos protegidos e testes de isolamento.
- Limite pequeno de corpo de requisição.
- Logs estruturados com identificador de requisição.
- Cache, tentativas, circuit breaker, idempotência de e-mail e histórico de jobs.
- Política de fontes impede exibição de provedores sem aprovação.

### P0 — antes do beta público

1. **WebSocket quebrado no domínio principal.** A conexão para `wss://www.virtusinvestimentos.com.br/api/realtime` recebeu HTTP 200 com HTML. O Firebase Hosting encaminha HTTP, mas essa arquitetura não está entregando o upgrade WebSocket. Soluções: usar URL direta segura do Cloud Run configurada no build e permitida pela CSP, adotar outro proxy compatível, ou remover o canal até existir garantia. A interface só pode dizer “conectado” após receber a mensagem `ready` do servidor, não apenas no `onopen`.
2. **Rate limit inexistente nas APIs públicas.** Aplicar limite por IP/rota, limite específico para pesquisa e ativos, cache e proteção de cotas. Autenticação não substitui limitação de abuso nas rotas anônimas.
3. **Regressão de CLS.** Reservar altura do hero e dos blocos assíncronos, impedir troca tardia de estrutura e investigar autenticação/dados que alteram o primeiro viewport.
4. **Health check público coerente.** O domínio responde a `/healthz` e `/readyz` com a SPA por causa das regras de hosting. Padronizar `/api/health`, `/api/ready` e configurar monitoramento nesses caminhos.

### P1 — durante o beta fechado

1. O readiness atual confirma que o objeto de banco existe, não executa uma consulta real; realizar `SELECT 1` com timeout.
2. `GET_LOCK`/`RELEASE_LOCK` precisa usar a mesma conexão dedicada. Com pool, adquirir e liberar em chamadas separadas não garante a mesma sessão MySQL.
3. `/api/metrics` está público e armazena métricas apenas na memória de cada instância. Restringir acesso e exportar métricas agregadas para Cloud Monitoring.
4. Criar testes E2E em desktop e celular para home, guia, análise, login, carteira, exportação e exclusão.
5. Criar teste de carga leve e teste de esgotamento de cotas dos provedores.
6. Exercitar restauração de backup do banco, não apenas verificar que backup existe.
7. Adicionar SLO: disponibilidade, latência p95, erro, frescor e cobertura.
8. Evitar segredo estático de scheduler sem política de rotação; preferir autenticação OIDC do Cloud Scheduler para endpoint interno quando possível.

### P2 — depois de estabilizar o beta

- Source maps privados para diagnóstico.
- Testes automatizados de acessibilidade por rota.
- CSP com nonce/hash para reduzir `unsafe-inline` de estilos quando viável.
- Análise estática e verificação de dependências no pipeline com alertas contínuos.
- Plano de continuidade com RTO/RPO documentados.

## 8. Design, UX e acessibilidade

### Diagnóstico

A linguagem visual é consistente, sóbria e adequada a finanças. Acessibilidade sintética da home atingiu 100, um avanço relevante. O maior problema atual não é estética: é estabilidade e velocidade percebida.

### Prioridades

- Corrigir o deslocamento do hero no celular.
- Reduzir trabalho da thread principal, JavaScript não usado e custo inicial de Firebase/autenticação para visitantes anônimos.
- Dar skeletons com dimensões iguais ao conteúdo final.
- Não usar verde/vermelho como único meio de comunicar variação.
- Validar foco, teclado, leitor de tela, zoom 200% e `prefers-reduced-motion` em todas as rotas.
- Garantir alvos de toque de pelo menos 44×44 px e tabelas móveis legíveis.
- Reduzir densidade da home: uma ação primária, uma secundária e prova de confiança.
- Testar com iniciantes reais; clareza sem teste de compreensão é apenas hipótese de design.

## 9. Conteúdo, curadoria e SEO

### Princípios editoriais

Todo conteúdo deve registrar:

- fonte primária e link;
- hora da ocorrência e hora da coleta;
- autor ou automação responsável;
- nível de confiança;
- separação entre fato, contexto e hipótese;
- conflito de interesse e patrocínio;
- versão e histórico de correção.

### Política de correção

- Correção pequena: atualizar e registrar internamente.
- Correção que muda sentido: aviso visível com horário.
- Informação de mercado errada: retirar do ar, interromper distribuição e publicar correção no mesmo canal.
- Nunca apagar silenciosamente uma publicação material já distribuída.

### SEO

SEO técnico da home está forte. O próximo ganho virá de conteúdo útil e indexável, não de mais metatags:

- páginas educacionais individuais com URL própria;
- glossário interligado;
- páginas de metodologia e fontes;
- dados estruturados adequados para artigo, breadcrumb e organização;
- sitemap atualizado com guia e análise pública;
- conteúdo canônico e datas de revisão verdadeiras.

## 10. Privacidade, LGPD e jurídico

### O que já está correto

- Controlador e canal de contato identificados.
- Finalidades, categorias de dados, fornecedores, transferência, retenção e direitos descritos.
- Exportação e exclusão disponíveis.
- Analytics só é carregado após consentimento.
- Banner oferece aceitar métricas ou manter somente o necessário.
- Carteira é apresentada como ferramenta informativa, sem movimentar recursos.

### Ajustes necessários

1. Disponibilizar permanentemente “Preferências de privacidade” no rodapé ou centro de confiança. Pedir ao usuário que apague o armazenamento do navegador não é uma boa forma de revogar consentimento.
2. Registrar versão, data, finalidade e escolha do consentimento; a prova não deve depender apenas do navegador.
3. Criar inventário de tratamento: dado, finalidade, base, sistema, operador, retenção e descarte.
4. Definir prazo operacional para solicitações de titular e responsável substituto.
5. Formalizar procedimento de incidente e avaliação de comunicação à ANPD/titulares.
6. Revisar contratos e transferências internacionais dos fornecedores.
7. Atualizar controlador quando houver pessoa jurídica.
8. Revisar a alegação “18+”: se for requisito real, precisa de mecanismo e justificativa; se não for, ajustar termos e tratamento de menores.

### Comunicação financeira e CVM

Um aviso “não é recomendação” não neutraliza uma atividade que, na prática, analise valores mobiliários de forma profissional e habitual com conclusões ou direcionamento. O risco aumenta com relatórios, preço-alvo, ranking, carteira recomendada, chamada de compra/venda, remuneração ligada a emissores/intermediários ou personalização.

Para o beta:

- manter educação, fatos, dados, fórmulas e contexto;
- evitar recomendação, preço-alvo e linguagem prescritiva;
- revisar juridicamente o nome e formato “análise fundamentalista” e cada saída automatizada;
- declarar vínculos, posições relevantes, patrocínios e metodologia quando aplicável;
- separar claramente conteúdo editorial de publicidade;
- aprovar política para ativos detidos por autores e administradores;
- não iniciar monetização com afiliados do mercado sem revisão de conflito e transparência.

Referências oficiais usadas nesta avaliação:

- [Resolução CVM 20 — atividade de analista de valores mobiliários](https://conteudo.cvm.gov.br/legislacao/resolucoes/resol020.html)
- [Esclarecimento da CVM sobre influenciadores que recomendam investimentos](https://www.gov.br/cvm/pt-br/assuntos/noticias/2020/area-tecnica-da-cvm-esclarece-duvidas-sobre-atuacao-de-influenciadores-que-recomendam-investimentos-dddc1973876d4cc78c734b8ceeaaa740)
- [Estudo da CVM sobre influenciadores e mercado de capitais](https://www.gov.br/cvm/pt-br/centrais-de-conteudo/publicacoes/estudos/20230418-air-influenciadores.pdf)
- [Guia da ANPD sobre cookies e proteção de dados](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais)
- [Guia CONAR de marketing e publicidade por influenciadores](https://www.conar.org.br/noticias/guia-de-marketing-e-publicidade-por-influenciadores-digitais)

## 11. Automação para redes sociais

### Opinião executiva

A ideia de manhã, tarde, fechamento e notícias extraordinárias é boa. Ela cria hábito e posiciona o Virtus como fonte de contexto. O erro seria automatizar diretamente da fonte para a rede. No beta, a operação deve ser **assistida por automação e aprovada por pessoa**.

### Grade recomendada

| Janela | Produto editorial | Objetivo | Regra |
|---|---|---|---|
| 07:00–08:00 | Briefing da manhã | Exterior, agenda brasileira, fatos esperados | Não prever direção como fato |
| 12:30–14:00 | Mercado em andamento | O que mudou desde a abertura | Só atribuir causa com fonte confiável |
| 18:15–19:00 | Fechamento | Números confirmados, destaques e agenda seguinte | Aguardar fechamento/fonte, indicar horário |
| Evento | Plantão | Fato material de alta relevância | Fonte oficial ou dupla confirmação + aprovação |

Não é obrigatório postar três vezes todos os dias. Se não houver informação relevante, qualidade e confiança valem mais que preencher horário.

### Fluxo operacional

```text
Fontes permitidas
      ↓
Coleta + normalização + horário
      ↓
Validação factual e de frescor
      ↓
Rascunho por canal
      ↓
Filtro jurídico/editorial
      ↓
Aprovação humana
      ↓
Publicação + arquivo de evidências
      ↓
Monitoramento, métricas e correções
```

### Regras de publicação

- Fonte oficial única pode sustentar fato oficial; rumores exigem no mínimo duas fontes jornalísticas independentes e devem ser rotulados.
- “A ação subiu porque...” só deve ser usado se houver evidência; caso contrário, usar “em sessão marcada por...”.
- Preço, índice e câmbio sempre com fonte e horário.
- Não publicar imagem de gráfico sem escala, período e origem.
- Conteúdo patrocinado deve ser identificado de forma imediata e inequívoca.
- IA não decide relevância regulatória nem autoriza postagem crítica.
- Assuntos críticos: oferta pública, fraude, intervenção, falência, resultado, M&A, decisão judicial e fala de autoridade exigem revisão humana.
- Ter botão de pausa geral, lista de termos bloqueados, limite por canal e plano de correção.

### Níveis de automação

1. **Fase A — beta:** automação coleta, propõe e valida; humano aprova tudo.
2. **Fase B:** autopublicar apenas agenda oficial e indicadores padronizados de baixo risco, com regras determinísticas.
3. **Fase C:** ampliar somente após medir taxa de correção, falsos positivos, atrasos e incidentes.

### Arquitetura mínima

- registro de fontes aprovadas e licenças;
- filas separadas por manhã, intraday, fechamento e breaking news;
- snapshot imutável do material que sustentou o post;
- motor de templates por rede;
- validador de números, horário, ticker e linguagem proibida;
- painel simples de aprovação;
- conectores oficiais das redes, sem automação por navegador;
- arquivo de publicação, versão, aprovador e métricas;
- fila de correção e kill switch.

### Métricas editoriais

- tempo entre fato confirmado e rascunho;
- tempo entre rascunho e aprovação;
- percentual de posts corrigidos;
- cobertura de fonte e timestamp;
- salvamentos, compartilhamentos e cliques qualificados;
- retorno ao guia/análise;
- denúncias, ocultações e descadastros;
- zero como meta para recomendação indevida e dado inventado.

## 12. Equipe e governança proporcionais

Mesmo sem uma equipe grande, os papéis precisam existir. Uma pessoa pode acumular funções, mas não deve aprovar sozinha conteúdo crítico que ela mesma produziu.

| Papel | Responsabilidade no beta |
|---|---|
| Product owner | foco, métricas, prioridades e decisão de release |
| Engenharia | entrega, segurança, desempenho e incidentes |
| Data owner | fontes, contratos, cobertura, frescor e reconciliação |
| Curadoria/editorial | pauta, fontes, linguagem e correções |
| Design/research | jornada, acessibilidade e testes com usuários |
| Jurídico/privacidade | CVM, LGPD, contratos, publicidade e conflitos |
| Operações | schedulers, dashboards, backups, suporte e plantão |
| Growth | distribuição e experimentos sem comprometer confiança |

Criar uma reunião semanal curta de qualidade com: incidentes, fontes degradadas, feedback, métricas do funil, correções editoriais e decisão de release.

## 13. Roadmap recomendado

### Onda 0 — correção para abrir beta fechado (3–7 dias)

- corrigir/desligar WebSocket e rótulos de tempo real;
- corrigir CLS da home e repetir Lighthouse em três execuções;
- implementar rate limit e proteção de cotas;
- criar `/api/ready` com consulta real ao banco;
- configurar uptime externo no endpoint correto;
- permitir revogação simples de analytics;
- revisar relatório jurídico-editorial e licenças prioritárias;
- publicar política de correção e canal de feedback beta.

### Onda 1 — beta fechado (2–4 semanas)

- E2E mobile/desktop e acessibilidade por rota;
- telemetria do funil com consentimento;
- progresso do guia por conta;
- painel de cobertura/frescor por fonte;
- teste de carga, restore e simulação de incidente;
- piloto de redes sociais com aprovação humana;
- entrevistas com 10–15 iniciantes e 5 usuários experientes.

### Onda 2 — decisão de beta público

Abrir somente se os critérios abaixo estiverem aprovados por duas semanas consecutivas.

### Onda 3 — outros projetos

Depois que o portal tiver pipeline, observabilidade, termos, consentimento, suporte e release gate reutilizáveis, transformar essa base em plataforma comum para publicar os demais projetos. Não duplicar autenticação, privacidade, logs, deploy e monitoramento em cada produto.

## 14. Gate objetivo de saída

### Obrigatório para beta fechado

- [ ] WebSocket funcional ou removido da promessa pública.
- [ ] CLS móvel abaixo de 0,10 em três medições representativas.
- [ ] Rate limit e cache de proteção ativos.
- [ ] Monitor externo usando health/readiness reais.
- [ ] Fontes indisponíveis nunca aparecem como atuais.
- [ ] Preferência de analytics pode ser revista dentro do portal.
- [ ] Política editorial e de correção publicada internamente.
- [ ] Responsável de suporte e incidente definido.

### Obrigatório para beta público

- [ ] Todos os itens do beta fechado sustentados por duas semanas.
- [ ] E2E das jornadas críticas no pipeline.
- [ ] Restauração de backup testada.
- [ ] SLO e alertas de erro, latência, frescor e jobs.
- [ ] Licenças documentadas para cada dado exibido.
- [ ] Revisão jurídica profissional concluída.
- [ ] Automação social ainda com revisão humana nos conteúdos de risco.
- [ ] Métricas do beta comprovam ativação e retenção mínimas.

## 15. Conclusão

O Virtus já tem qualidade suficiente para ser levado a usuários reais selecionados. O projeto não está “pronto para sempre”, e nenhum produto sério estará; está próximo de ficar **operacionalmente pronto para aprender com um beta**.

A decisão correta é corrigir os quatro pontos técnicos imediatos, formalizar governança editorial/jurídica e iniciar um beta fechado mensurável. As limitações de dados não impedem esse beta desde que sejam visíveis, rastreáveis e nunca substituídas por aparência de certeza. A automação social pode se tornar um forte motor de aquisição, começando como redação assistida e não como piloto automático.
