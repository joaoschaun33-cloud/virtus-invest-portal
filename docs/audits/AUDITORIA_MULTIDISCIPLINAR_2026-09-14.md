# Auditoria multidisciplinar — Portal Virtus

**Data-base:** 14 de setembro de 2026
**Autor:** Claude (Cowork), a pedido de João Schaun
**Método:** leitura direta do código-fonte (`C:\dev\virtus portal manus`), do schema de banco, dos routers de API, e das 10+ auditorias internas já produzidas em `docs/audits/` e `docs/progress/`. Não houve execução do app nem acesso a produção — as observações de produção citadas vêm dos próprios relatórios do time.

**Como ler este documento:** vocês já têm um histórico de auditorias muito bom (Auditoria Conselho Estratégico, Auditoria Empresarial Pré-Beta, Auditoria Final do Candidato a Beta). Este relatório não repete esse trabalho — ele parte dele, atualiza o que mudou, e monta a visão pedida: produto, engenharia, design, financeiro e usuário final, num único lugar, com uma constatação nova importante logo abaixo.

---

## 0. O fato mais importante que encontrei

**O repositório está parado há 16 dias.** O último commit é de 29/08/2026 (00:04 UTC). Na época, a "Auditoria Final do Candidato a Beta" (27/08) já dizia **GO para beta controlado**, com uma lista curta de pendências — a maioria delas não são de código, são decisões humanas (contato de contingência, revisão jurídica, entrevistas com usuários, confirmação de alerta operacional).

Ou seja: tecnicamente, o produto passou no seu próprio gate de beta fechado há quase três semanas e, pelo que os arquivos mostram, o beta ainda não foi aberto a ninguém. Isso não é um problema de engenharia — é a decisão de negócio mais urgente do projeto agora. Todo o resto deste relatório é secundário a essa pergunta: **por que o beta fechado não começou, e o que falta para começar essa semana?**

---

## 1. Visão geral do produto (o que é, hoje)

O Virtus é um portal informativo/educativo de investimentos para o mercado brasileiro: cotações (B3, câmbio, cripto), indicadores macro (Selic, CDI, IPCA), análise fundamentalista com dados oficiais da CVM, screener, comparador, carteira manual, calculadoras (Graham, Bazin, juros compostos), alertas de preço, guia educacional e uma central de notícias com esteira editorial revisada por humano. Não movimenta dinheiro, não faz Open Finance, não dá recomendação de compra/venda — isso é uma escolha de produto explícita e bem mantida no código (`dataSourcePolicy.ts`, testes de `portfolio.rules`, textos do guia).

É um produto sério, muito mais maduro do que a média de um MVP solo. A pergunta não é "está pronto?" — pelas suas próprias auditorias, está. A pergunta é "está sendo usado por alguém?".

---

## 2. Como diretor de produto

**Pontos fortes:**
- Proposta de valor clara e diferenciada: "clareza, fonte e contexto" em vez de "recomendação". Isso é raro no mercado brasileiro de infoprodutos financeiros, que é dominado por promessas de retorno. É um ativo de marca genuíno.
- A jornada Guia → Análise → Carteira → Alertas é coerente e cobre o ciclo completo de um investidor iniciante/intermediário.
- Vocês já definiram métricas de ativação, aprendizado e retenção (D1/D7/D30) e um funil de eventos de analytics respeitando privacidade (`beta-product-metrics.md`) — a maioria dos produtos só pensa nisso depois de lançar.

**Risco real — dispersão de escopo:** o código cobre B3, renda fixa, câmbio, cripto, notícias, calculadoras, guia educacional, esteira editorial com IA e automação de redes sociais planejada. Isso é uma quantidade de superfície de produto grande para um time pequeno (aparentemente 1 pessoa) sustentar com qualidade — sua própria auditoria empresarial já disse isso ("risco de dispersão") e definiu a promessa mínima do beta. Vale reafirmar: **não adicionar nenhuma função nova até o funil principal (guia → análise → carteira) provar retenção real com usuários reais.**

**Lacuna que ninguém documentou ainda — modelo de negócio.** Não há, em nenhum lugar do código ou dos documentos, uma definição de como o Virtus gera receita: não há Stripe, gateway de pagamento, planos, paywall ou anúncios no schema/dependências. Isso é normal e correto para um beta fechado educativo — mas se a ambição é virar negócio, essa é a maior lacuna estratégica do projeto hoje, maior que qualquer bug. Recomendo decidir isso *antes* de escalar tráfego, porque a arquitetura de conteúdo (o que é gratuito, o que exige conta, o que seria premium) muda dependendo da resposta.

**Recomendação de produto:**
1. Retomar a decisão de abertura do beta fechado esta semana — as pendências restantes (contato de contingência, revisão jurídica, confirmação de alerta) são pequenas e não técnicas.
2. Definir modelo de monetização (mesmo que a resposta seja "gratuito por 12 meses para construir audiência") antes de ampliar aquisição.
3. Congelar novas features de amplitude (cripto avançado, automação social ampla, Open Finance) até ter 4–6 semanas de dados reais de retenção do funil principal.

---

## 3. Como chefe de desenvolvimento (arquitetura e engenharia)

**Stack:** React 19 + Vite 7 + TypeScript 5.9 no cliente; Node/Express + tRPC 11 + WebSocket no servidor; Drizzle ORM sobre MySQL (Cloud SQL); Firebase Auth; deploy via Cloud Build → Cloud Run, com Firebase Hosting na frente. É uma escolha de stack moderna, coerente e sem exotismo — boa decisão para manutenibilidade.

**O que está genuinamente bem feito** (verifiquei no código, não só nos relatórios):
- **Governança de fontes de dados centralizada** (`server/dataSourcePolicy.ts`): a decisão de qual provedor usar, e se um dado pode ser exibido publicamente, está numa função pura e testável — nenhuma rota escolhe provedor por conta própria. Isso é exatamente o padrão certo para evitar exibir dado sem licença por engano.
- **Isolamento entre usuários testado de verdade**: existem testes dedicados (`portfolio.isolation.test.ts`) e uma auditoria com contas descartáveis validando isso em produção — não é só teoria.
- **Editorial com controle real**: fila com chave de idempotência por janela/dia, exigência de autor ≠ aprovador, kill switch persistente, e histórico de correções *append-only* que nunca apaga silenciosamente. Isso é um nível de rigor operacional que a maioria dos produtos de conteúdo não tem no dia 1.
- **Rate limiting, locks distribuídos com a mesma conexão, jobs com idempotência e histórico (`jobRuns`)** — tudo isso costuma ser dívida técnica em produtos deste estágio, e aqui já existe.
- Suíte de testes real (119 testes automatizados citados na última auditoria, cobrindo regras de negócio, não só smoke tests) e `tsc --noEmit` limpo.

**Dívidas e riscos que ainda importam:**
- **Licença MIT no `LICENSE`** para um produto que parece ter ambição comercial. MIT permite que qualquer pessoa copie, redistribua e até venda o código, incluindo concorrentes. Se a intenção é manter o Virtus proprietário, isso precisa ser corrigido — hoje o repositório autoriza legalmente o oposto do que provavelmente vocês querem. (Se o repositório for público, o risco é ainda maior.)
- **Dependência de dados hardcoded remanescente**: pelo menos até a auditoria de agosto, Tesouro Direto e calendário Copom estavam com dados fixos no código (`server/treasuryData.ts`), exigindo deploy manual para atualizar taxas de renda fixa. Isso é um risco de dado desatualizado silencioso, sensível justamente na categoria de produto mais "fato, não opinião" do portal.
- **WebSocket como ponto de fragilidade recorrente**: aparece como problema em pelo menos duas rodadas de auditoria (handshake 400, depois corrigido). É uma peça de arquitetura que já causou retrabalho duas vezes — vale considerar se o ganho de "tempo real" justifica a complexidade operacional frente a polling curto, que é o que 90% dos concorrentes de portais financeiros usam.
- **Projeto de uma pessoa só, sem CI de bloqueio visível além do Cloud Build de deploy**: não vi um pipeline de PR/CI que rode testes antes de merge (o repositório nem usa branches, aparentemente — só um commit direto). Isso é aceitável agora, mas é o primeiro ponto que quebra se mais alguém entrar no time.

**Recomendação de engenharia:**
1. Trocar a licença para algo proprietário (ou pelo menos "All rights reserved", sem license file público) — 10 minutos de trabalho, risco jurídico real evitado.
2. Fechar a lacuna do Tesouro Direto/Copom dinâmico antes de qualquer campanha de aquisição — é exatamente o tipo de coisa que um usuário técnico nota e usa para desconfiar do resto dos dados.
3. Documentar (mesmo que informalmente) o processo de release, já que hoje parece depender inteiramente de uma pessoa lembrar dos passos.

---

## 4. Como designer (UX, UI e acessibilidade)

**O que está forte, e é incomum estar forte num MVP solo:**
- Acessibilidade sintética da home em 100/100 no Lighthouse, com testes automatizados de acessibilidade no Playwright (`@axe-core/playwright`) rodando de verdade, não só prometidos.
- Sistema de UI consistente: Radix UI + Tailwind 4 com um conjunto de primitivos próprios (`ApexPrimitives`) reaproveitados nas páginas — não é um mosaico de estilos diferentes por tela.
- Identidade visual "Apple-inspired" documentada como decisão de design (tipografia limpa, glassmorphism contido, dark/light com tokens semânticos, `prefers-reduced-motion` respeitado) e aplicada de forma consistente no código, não só na intenção.
- Proveniência de dados como elemento de UI de primeira classe (`DataProvenance.tsx`, badges "ao vivo" vs. "demonstração") — isso é, ao mesmo tempo, decisão de design e de confiança regulatória. Poucos portais financeiros fazem isso tão explicitamente.

**O que ainda pesa contra a experiência:**
- **Performance mobile foi o item mais mal avaliado em toda a auditoria empresarial (5/10, Lighthouse de performance em 57)**, com CLS (estabilidade visual) em 0,539 — muito acima do aceitável (a meta correta é abaixo de 0,10). Depois disso houve uma correção que levou o CLS a zero e a performance para a faixa de 82–94, o que é uma evolução real. Mas como o projeto está parado desde 29/08, não há confirmação recente de que essa melhoria se sustenta em produção hoje.
- Antes das correções, havia uma "mudança grande de layout na abertura da home" — para um produto financeiro, isso é particularmente ruim: números que pulam na tela destroem confiança mais rápido do que em qualquer outra categoria de produto.
- Os próprios relatórios de design recomendam reduzir a densidade da home para "uma ação primária, uma secundária e uma prova de confiança" — pelo tamanho do arquivo `Home.tsx` (32 KB, dezenas de widgets: ticker, notícias, calendário, macro brief, qualidade de dados, status editorial, watchlist reordenável), a home ainda parece estar do lado "denso" dessa recomendação.

**Recomendação de design:**
1. Rodar o Lighthouse mobile de novo agora, em produção — os números de agosto podem já estar desatualizados (para melhor ou para pior) depois de três semanas sem deploy.
2. Testar a home com 5 usuários reais (não apenas com ferramentas automáticas) pedindo para eles dizerem, em 5 segundos, "o que este produto faz e por que eu confiaria nele". Isso valida a promessa "clareza, fonte e contexto" na prática, não só na intenção.
3. Considerar dividir a home em "o essencial" (o que já está lá) + um link para "ver tudo", em vez de mostrar todos os widgets de uma vez para todo usuário.

---

## 5. Como analista financeiro

Aqui eu separo dois papéis diferentes que "financeiro" pode significar: (a) a qualidade e o risco regulatório do conteúdo financeiro que o produto entrega, e (b) a saúde financeira/comercial do projeto como negócio.

### 5.a. Qualidade e risco do conteúdo financeiro

- As fórmulas que verifiquei no código (`valuation.ts`) são as clássicas e corretas: **Graham** (`√(22,5 × VPA × LPA)`) e **Bazin** (dividendo por ação ÷ 6%). Isso é apropriado para um produto educativo — são métodos públicos, atribuíveis e não são "segredo proprietário de algoritmo", o que reduz risco de alegação de recomendação disfarçada de fórmula secreta.
- O uso de dados oficiais da CVM (DFP/ITR) para fundamentos, em vez de estimativas de terceiros, é a decisão certa para um produto que se posiciona como "fonte, não opinião" — e o schema já guarda período de referência, se é consolidado/individual, moeda e a URL/timestamp da fonte (`cvmFinancialSnapshots`). Isso é exatamente o rigor que a resolução CVM 20 e a própria auditoria jurídica interna pedem.
- **O maior risco regulatório real não é técnico, é de rotulagem**: sua própria auditoria já identificou que o nome "análise fundamentalista" e qualquer saída que pareça uma conclusão ("a ação está cara/barata") pode ser lido como atividade de analista de valores mobiliários (Resolução CVM 20), mesmo com aviso de "não é recomendação". O código atual (por ex. `screenerMetrics.ts`, os critérios de "passa/não passa" no `valuation.ts`) já é cuidadoso em mostrar critério e não veredito — mas isso precisa de revisão jurídica formal antes de qualquer monetização ou automação maior, como o próprio time já recomendou. Não vi evidência nos arquivos de que essa revisão profissional tenha acontecido ainda.

### 5.b. Saúde financeira/comercial do projeto

- **Custo operacional variável e crescente com dados pagos não confirmados**: Twelve Data, Finnhub, CoinGecko (paid tier) e EODHD estão integrados no código mas com exibição pública bloqueada até haver licença — ou seja, o custo real de operar em escala ainda não foi contratado nem orçado. Antes de qualquer campanha de aquisição, vale simular: com X usuários ativos, qual o custo mensal esperado desses provedores, e isso cabe em qual receita?
- **Zero infraestrutura de receita hoje.** Não há monetização no código (nem anúncios, nem paywall, nem afiliados) — o que é saudável para um beta educativo, mas significa que hoje o projeto é 100% custo (Cloud SQL, Cloud Run, provedores de dados, domínio, Firebase) sem contrapartida de receita. Isso não é um problema agora; é um problema se o beta crescer sem que essa conversa tenha acontecido.
- **Risco de concentração num único operador**: pela estrutura do projeto (commits, "o fundador responde sozinho" citado nas próprias auditorias), qualquer indisponibilidade da pessoa é indisponibilidade do produto (suporte, incidentes, editorial, jurídico). Do ponto de vista financeiro/de risco, isso é um "single point of failure" tão real quanto um servidor sem backup.

**Recomendação financeira:**
1. Não escalar aquisição de usuários antes de ter clareza de custo variável por usuário ativo (provedores de dados) e de modelo de receita, mesmo que a decisão seja "não monetizar ainda".
2. Priorizar a revisão jurídica profissional (CVM/LGPD) já apontada nas suas próprias auditorias como pendência — é a única pendência do beta que, se ignorada, tem custo potencialmente alto (autuação, obrigação de descontinuar "análise fundamentalista" do jeito atual).
3. Buscar, mesmo que informalmente, uma segunda pessoa (ou processo documentado) para suporte/incidente — reduz o risco de concentração antes que vire um problema real com usuários pagantes ou mesmo só usuários do beta.

---

## 6. Como usuário final

Coloquei-me na posição de alguém abrindo o Virtus pela primeira vez, guiado pelo que o código realmente renderiza (Home, Guide, AssetDetail, Portfolio, Trust/Legal):

**O que provavelmente gera confiança rápido:**
- Ver a fonte e o horário de cada número (proveniência) é diferente da maioria dos apps de investimento brasileiros, que escondem isso. Um usuário mais cético — que é exatamente o público que confia menos em "dica de investimento" — tende a notar e valorizar isso.
- O guia com objetivo, trilha e verificação de aprendizado (não é só um texto passivo) dá uma sensação de progresso real, não de "conteúdo genérico".
- A carteira manual, sem exigir conectar banco/corretora, é uma barreira de entrada mais baixa e mais segura de se experimentar — o usuário não precisa confiar dados sensíveis num produto novo/beta.

**O que provavelmente gera atrito ou desconfiança:**
- Se a home ainda estiver com todos os widgets simultâneos (ticker, notícias, calendário, macro, qualidade de dados, status editorial, watchlist), a primeira impressão pode ser "muita informação, não sei por onde começar" — o oposto da promessa de clareza.
- Qualquer resquício de instabilidade visual (o CLS mencionado) é o tipo de coisa que um usuário não sabe nomear, mas sente como "esse site parece meio quebrado" — extremamente prejudicial num produto que vende confiança como diferencial.
- Cobertura parcial de dados internacionais/cripto (por falta de licença, corretamente escondida) pode gerar a sensação de "faltou isso" para quem chega comparando com apps mais amplos (mesmo sabendo que isso é intencional e correto do ponto de vista de honestidade de dados).

**Recomendação como usuário:**
1. A primeira tela para um usuário novo (não logado) deveria deixar óbvio em poucos segundos: "o que isto é", "por que confiar" e "por onde começo" — hoje isso parece competir com módulos de mercado ao vivo.
2. Vale ter um modo "primeira visita" simplificado, escondendo widgets avançados (comparador, screener) até o usuário terminar o objetivo inicial do guia.

---

## 7. Síntese e prioridades (as próximas duas semanas)

| Prioridade | Ação | Por quê | Dono natural |
|---|---|---|---|
| P0 | Decidir e agendar a abertura do beta fechado | O produto já passou no próprio gate há ~3 semanas; a inação é o maior risco agora | Produto/fundador |
| P0 | Trocar a licença do repositório de MIT para proprietária | Risco jurídico real e desnecessário para um produto com ambição comercial | Engenharia |
| P0 | Rodar Lighthouse mobile de novo em produção | Última medição é de 25/08; decisões de UX não podem se basear em dado de 3 semanas atrás | Design/Engenharia |
| P1 | Fechar revisão jurídica CVM/LGPD | Única pendência do beta com custo potencial alto se ignorada | Jurídico/fundador |
| P1 | Dinamizar Tesouro Direto e calendário Copom (se ainda hardcoded) | Risco de dado desatualizado na categoria mais sensível a isso | Engenharia/Dados |
| P1 | Simular custo variável por usuário ativo (provedores pagos) | Necessário antes de qualquer campanha de aquisição | Financeiro/Produto |
| P2 | Testar a home com 5 usuários reais | Validar a promessa de clareza na prática, não só na intenção | Design |
| P2 | Definir modelo de monetização (mesmo que "nenhum por 12 meses") | Hoje é 100% custo sem contrapartida definida | Produto/Financeiro |

**Conclusão em uma frase:** o Virtus é um produto tecnicamente maduro e eticamente bem construído para a categoria mais arriscada de se fazer mal (conteúdo financeiro) — o gargalo não é mais construir, é decidir e operar: abrir o beta que vocês mesmos já aprovaram, fechar a revisão jurídica pendente, e parar de adicionar amplitude até o funil principal provar retenção com pessoas de verdade.

---

*Este documento é uma análise de produto/engenharia/design/negócio e não constitui parecer jurídico. A revisão jurídica de CVM e LGPD mencionada nas seções 5 e 7 deve ser feita por advogado especializado, conforme já recomendado nas auditorias internas do próprio projeto.*
