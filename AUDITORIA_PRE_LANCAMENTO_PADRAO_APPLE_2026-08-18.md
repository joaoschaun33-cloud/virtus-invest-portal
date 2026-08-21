# Auditoria de pré-lançamento — Portal Virtus

**Data:** 18 de agosto de 2026  
**Ambiente:** `virtus-web-00011-g4w` — Cloud Run  
**Escopo:** produto, UX/UI, marca, conteúdo, finanças, acessibilidade, responsividade, desempenho, segurança, privacidade, dados, operação, SEO e lançamento.  
**Referência de qualidade:** padrão Apple entendido como simplicidade, consistência, precisão, acabamento, confiança e ausência de estados quebrados — não como imitação visual.

## Parecer executivo

**Decisão: NO-GO para lançamento público amplo.**  
**Aprovação recomendada:** apenas beta privado controlado, depois de corrigidos os P0 de segurança e com aviso explícito de demonstração.

O Virtus já possui uma base visual coerente, boa organização de navegação, linguagem mais responsável que a média de portais financeiros e funcionamento público consistente nas rotas verificadas. Porém, ainda existe uma distância material entre “produto funcional” e “produto confiável para lançamento”. O principal risco não é design: é a combinação de domínio indisponível, dependências vulneráveis, documentos legais incompletos, ausência de exclusão de conta, dados predominantemente demonstrativos e falta de validação E2E autenticada contínua.

**Prontidão geral estimada: 54/100.**  
**Aderência atual ao padrão Apple: 57/100.** A interface tem boa direção estética, mas o acabamento sistêmico ainda não acompanha a promessa.

## Evidências verificadas

- 13 rotas públicas testadas em desktop (1440×900) e mobile (390×844): todas responderam 200, sem erros de console, exceções de página, requisições falhas ou transbordamento horizontal.
- Nenhum controle visível sem nome acessível, link vazio ou imagem sem `alt` foi detectado na varredura estrutural.
- Lighthouse mobile da página inicial: **Performance 60**, **Acessibilidade 96**, **Boas práticas 100**, **SEO 100**.
- Métricas: FCP 4,9 s; LCP 6,2 s; TBT 260 ms; CLS 0; Speed Index 4,9 s.
- Segurança HTTP: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` presentes.
- Banco Cloud SQL: backup habilitado, retenção de 7 backups e proteção contra exclusão habilitada; instância é zonal.
- Cloud Run atende 100% pela revisão mais recente, usa conta de serviço dedicada e limita escala a quatro instâncias.
- Auditoria de dependências de produção: 1 vulnerabilidade crítica, 23 altas, 50 moderadas e 10 baixas.
- `www.virtusinvestimentos.com.br` respondeu **HTTP 522** durante a auditoria.
- Limitação: fluxos autenticados foram revisados em código e por testes existentes, mas não foram repetidos integralmente com uma credencial reutilizável durante esta varredura.

## Scorecard de prontidão

| Dimensão | Nota | Estado | Leitura |
|---|---:|---|---|
| Estratégia e proposta de valor | 68 | Atenção | Direção clara, mas diferenciação ainda pouco demonstrada |
| Arquitetura da informação | 76 | Boa | Navegação consistente e compreensível |
| UX dos fluxos principais | 62 | Atenção | Boa estrutura; onboarding, recuperação e estados extremos incompletos |
| UI e identidade | 72 | Boa | Coerente, porém densa e excessivamente “dashboard” |
| Acessibilidade | 82 | Boa com ressalvas | Estrutura forte; contraste reprova WCAG AA em elementos recorrentes |
| Responsividade | 86 | Boa | Sem overflow nas 13 rotas testadas |
| Desempenho | 60 | Insuficiente | LCP 6,2 s é incompatível com experiência premium |
| Clareza financeira e dados | 48 | Insuficiente | Catálogo demonstrativo ainda sustenta boa parte da experiência |
| Privacidade e jurídico | 38 | Bloqueador | Textos preparatórios e direitos sem execução integral |
| Segurança da aplicação | 28 | Bloqueador | Vulnerabilidades críticas/altas na cadeia de produção |
| Operação e observabilidade | 46 | Insuficiente | Backups existem; monitoramento e incident response não estão evidenciados |
| SEO e descoberta | 84 | Boa | Metadados e sitemap estruturados; domínio impede usufruir o resultado |

## Bloqueadores P0 — corrigir antes de qualquer lançamento

| ID | Achado | Impacto | Esforço | Recomendação prática |
|---|---|---|---|---|
| P0-01 | Domínio oficial retorna 522 e não resolve para a experiência publicada. | Marca inacessível; perda total de confiança e conversão. | M | Finalizar Firebase Hosting/domínio, SSL e DNS sem alterar os registros MX da KingHost; validar `www` e domínio raiz em redes distintas. |
| P0-02 | Dependências de produção possuem 1 vulnerabilidade crítica e 23 altas. `xlsx@0.18.5`, que lê arquivos do usuário, tem prototype pollution e ReDoS conhecidos. | Arquivo malicioso pode travar ou comprometer o contexto do navegador; risco de supply chain. | M/AL | Remover `xlsx` npm vulnerável ou substituir por biblioteca mantida/versão corrigida; atualizar tRPC, Drizzle, Axios, NanoID, XML parser e dependências transitivas; repetir auditoria até zero crítica/alta explorável. |
| P0-03 | Política de privacidade declara que o canal do encarregado “deverá ser publicado”; cookies dizem que a central “será adicionada”; todos os textos são “versão preparatória”. | Evidência explícita de produto juridicamente incompleto; exposição LGPD e reputacional. | M | Publicar controlador, CPF/CNPJ conforme fase, endereço/canal, base legal, operador/fornecedores, retenção por categoria, transferência internacional, versão efetiva e procedimento de incidente; revisão jurídica brasileira. |
| P0-04 | Usuário consegue exportar dados, mas não excluir a conta e os dados dentro do portal. | Direito prometido sem mecanismo operacional; aumento do passivo de dados. | M | Criar “Excluir minha conta” com reautenticação, confirmação, prazo, exclusão/anominização de carteira, alertas, preferências e identidade; registrar solicitação e conclusão. |
| P0-05 | Grande parte das cotações, fundamentos, notícias e calendário ainda pode vir do catálogo de demonstração. | Um portal financeiro não pode parecer atual quando entrega referência estática; risco de decisão equivocada. | AL | Manter beta explicitamente demonstrativo ou contratar fontes com licença/cobertura; mostrar timestamp, atraso, origem e disponibilidade em cada dado; impedir linguagem “ao vivo” sem SLA objetivo. |
| P0-06 | Não há suíte contínua completa para login, persistência, importação, duplicidade, exclusão e isolamento entre usuários. | Regressões podem misturar ou perder dados financeiros pessoais. | M | Criar E2E autenticado com contas descartáveis, isolamento A/B, CSV/XLSX malicioso, rollback e jornada mobile; bloquear deploy quando falhar. |

## Achados P1 — necessários para padrão premium

| Área | Achado | Impacto | Esforço | Recomendação |
|---|---|---|---|---|
| Performance | LCP 6,2 s e FCP 4,9 s; bundle principal ~638 KB, 41% estimado como JS não usado; CSS bloqueia ~700 ms. | Primeira impressão lenta e sensação de produto pesado. | M/AL | Carregar Firebase Auth apenas ao abrir login/estado autenticado, dividir dependências, remover pacotes não usados, CSS crítico, compressão e cache imutável no Cloud Run. Meta: LCP ≤2,5 s e INP ≤200 ms no p75. |
| Acessibilidade | Cor primária vermelha sobre branco mede ~3,68:1; verde de variação chega a ~3,10:1. | Reprovação WCAG 2.2 AA em CTAs, links, rótulos e números financeiros. | P | Escurecer tokens de vermelho/verde para texto e manter tons atuais apenas em fundos/ornamentos; teste automatizado de contraste por tema. |
| Hierarquia | A busca cria um `h2` antes do `h1` em todas as páginas. | Outline menos lógico para leitor de tela e navegação por títulos. | P | Tornar o título da busca elemento não-heading ou posicioná-la depois do `h1` na ordem do DOM. |
| Loading | Captura fria exibiu ampla tela branca com apenas “Carregando workspace…”. | Sensação de falha e ausência de acabamento premium. | M | Shell instantâneo com marca, navegação skeleton e conteúdo prioritário; evitar bloquear a interface pública enquanto o Auth inicializa. |
| Densidade | Muitos cards, bordas, badges, textos de 11 px e micro-rótulos competem entre si. | A interface parece painel técnico, não produto sereno e inevitável. | M | Reduzir 25–35% dos elementos simultâneos, aumentar tipografia mínima, consolidar avisos e criar um foco principal por tela. |
| Onboarding | Não existe uma jornada guiada que explique valor, dados demonstrativos e primeira ação. | Usuário chega a várias ferramentas sem compreender por onde começar. | M | Onboarding em três decisões: objetivo, nível de experiência e primeira lista/carteira; permitir pular e retomar. |
| Importação | O fluxo aceita até 500 linhas, mas não informa claramente limites de tamanho, privacidade do arquivo, corretoras suportadas ou como desfazer todo o lote. | Medo de erro e retrabalho em dados pessoais. | M | Identificador de lote, desfazer importação, relatório baixável, tamanho máximo, política de arquivo e mapeamentos por corretora. |
| Carteira | Rentabilidade não incorpora impostos, proventos e eventos corporativos; isso aparece em aviso, mas o resultado mantém alta proeminência. | Usuário pode interpretar uma aproximação como apuração real. | M/AL | Nomear “estimativa”, exibir confiança/limitações ao lado do valor e criar reconciliação; não sugerir resultado fiscal. |
| Conteúdo | Notícias de referência e agenda podem parecer editoriais atuais apesar de origem demonstrativa. | Confusão entre conteúdo real, exemplo e material editorial. | M | Estados visuais mutuamente exclusivos: atual, atrasado, indisponível e demonstração; esconder datas relativas artificiais. |
| Confiança | “Fonte configurada” não significa cobertura ou dado disponível, mas o selo pode ser lido como garantia. | Confiança excessiva no provedor. | P | Trocar por status operacional mensurável: cobertura, última resposta, atraso e ativos cobertos. |
| Recuperação | Erros usam principalmente toasts e não há centro de atividade/importações. | Mensagens desaparecem e operações financeiras ficam sem trilha. | M | Erros inline, histórico de lotes, retry seguro e IDs de suporte. |

## Achados P2 — maturidade de escala

- Criar design system documentado com tokens semânticos, contrastes aprovados, estados de foco, loading, vazio, erro, indisponível e demonstração.
- Testar zoom 200%, contraste elevado, `prefers-reduced-motion`, teclado completo e leitores NVDA/VoiceOver; a auditoria automática não substitui esses testes.
- Remover o redimensionador lateral por mouse ou torná-lo acessível por teclado e toque; no mobile ele não deve participar da experiência.
- Definir linguagem única para “Virtus” versus “Portal Virtus”, “Carteira manual” versus “Carteira”, “dados de referência” versus “demonstração”.
- Adicionar página pública de status, política de incidentes, canal de segurança e processo de comunicação ao usuário.
- Configurar uptime checks, alertas de erro/latência, dashboards e SLOs. Nenhuma configuração de uptime/política apareceu nas listagens consultadas durante a auditoria.
- Definir RPO/RTO e executar restauração real do Cloud SQL; backup existente não prova recuperação.
- Avaliar alta disponibilidade do banco antes de usuários em escala; a instância atual é zonal.
- Instrumentar funil consentido: visita → busca → ativo → cadastro → primeira carteira → retorno D7/D30, sem coletar carteira ou ticker como dado analítico desnecessário.
- Criar suporte operacional com SLA, templates de incidente, triagem e registro de solicitações LGPD.
- Validar licenças de cotações, notícias, nomes, logos, redistribuição e armazenamento histórico.

## O que significa “padrão Apple” para o Virtus

1. **Uma promessa por tela.** A página inicial deve conduzir a uma ação principal; não exibir todas as capacidades com o mesmo peso.
2. **Dados antes de decoração.** Cada número financeiro precisa de fonte, horário, estado e explicação sem exigir interpretação.
3. **Progressive disclosure.** O iniciante vê clareza; o avançado abre detalhes. Hoje, ambos recebem quase a mesma densidade.
4. **Movimento com propósito.** Transições devem explicar continuidade, nunca mascarar carregamento.
5. **Zero estados ambíguos.** Demonstração, indisponibilidade, atraso, vazio e erro não podem parecer o mesmo estado.
6. **Privacidade como funcionalidade.** Exportar, corrigir e excluir dados devem estar no produto, não apenas em texto legal.
7. **Acabamento sistêmico.** O padrão premium é medido no login que volta ao lugar certo, no arquivo inválido, na rede lenta, no teclado, no e-mail e no suporte — não apenas no hero.

## Plano recomendado de liberação

### Ciclo 0 — contenção (1–3 dias)

- Suspender anúncio público e manter beta controlado.
- Corrigir/substituir dependências críticas, começando por XLSX.
- Configurar o domínio e validar e-mail/DNS sem afetar KingHost.
- Tornar “Ambiente de demonstração” explícito globalmente.

### Ciclo 1 — confiança mínima (3–7 dias)

- Finalizar documentos legais e central de preferências.
- Implementar exclusão de conta e dados.
- Criar testes E2E autenticados e de isolamento.
- Corrigir contrastes e hierarquia de títulos.

### Ciclo 2 — qualidade premium (1–2 semanas)

- Reduzir LCP para ≤2,5 s e eliminar tela branca de inicialização.
- Simplificar home e reduzir densidade visual.
- Completar onboarding, importação reversível e estados de erro.
- Estabelecer monitoramento, SLOs, alertas e runbooks.

### Ciclo 3 — lançamento gradual

- Piloto com 20–50 usuários, suporte próximo e métricas consentidas.
- Revisão de incidentes, erros de importação, compreensão dos dados e retenção.
- Go/no-go final com todos os P0 zerados, P1 críticos concluídos e rollback testado.

## Critérios objetivos para autorizar o lançamento

- Domínio principal e `www` com SSL válido, status 200 e monitoramento externo.
- Zero vulnerabilidade crítica/alta explorável em produção.
- Política de privacidade efetiva e mecanismo de exclusão testado.
- Todo dado marcado com origem, timestamp e estado de frescor; nenhuma demonstração parecendo dado atual.
- Jornadas autenticadas críticas aprovadas em desktop/mobile e entre dois usuários isolados.
- Lighthouse mobile: Performance ≥85, Acessibilidade ≥95, LCP ≤2,5 s, CLS ≤0,1.
- WCAG 2.2 AA sem contraste reprovado nos componentes recorrentes.
- Backup restaurado com sucesso e incidente simulado.
- Suporte, contato e procedimento LGPD publicados.

## Conclusão

O Virtus já tem direção de produto e identidade suficientes para justificar continuidade. Ainda não tem, porém, a confiabilidade operacional, jurídica, de dados e de segurança necessária para receber tráfego público como produto financeiro. A prioridade correta é **confiança antes de expansão**. Se os bloqueadores forem tratados na ordem proposta, o portal pode evoluir de um MVP visualmente competente para um produto realmente premium e publicável.
