# Auditoria funcional dos controles do front-end — Virtus

**Data:** 18/08/2026  
**Escopo:** páginas públicas do portal, estados deslogado e autenticado inferido por código/API, botões, links, formulários e feedback de ações.  
**Método:** inventário estático dos handlers, teste automatizado deslogado nas 10 rotas principais e cruzamento com os procedimentos tRPC do servidor.

## Resumo executivo

O portal não possui uma quebra geral de eventos: navegação, busca, filtros, tema, favoritos locais e login respondem no estado público. O problema dominante é **contrato visual e feedback de estado**. Há controles exibidos antes de poderem ser usados, ações que falham silenciosamente e botões que executam algo sem confirmar sucesso ou explicar por que estão desabilitados.

### Prioridade imediata

| ID | Achado | Severidade | Impacto | Esforço | Confiança |
|---|---|---:|---:|---:|---:|
| F-01 | `Imprimir / PDF` usa uma janela com `noopener` e depois tenta escrever nela; em navegadores modernos a referência pode ser `null`, tornando a ação inoperante | Alta | Alto | Baixo | Alta |
| F-02 | `CSV da carteira` e `Imprimir / PDF` aparecem desabilitados para deslogados e também para contas sem posições, sem explicar o pré-requisito | Média | Alto | Baixo | Alta |
| F-03 | Formulários de carteira retornam silenciosamente quando ticker, quantidade ou preço são inválidos; o usuário interpreta como botão congelado | Alta | Alto | Baixo | Alta |
| F-04 | `Consultar` em histórico de dividendos não controla a consulta: o campo já altera a query em cada tecla e o clique apenas grava o mesmo valor | Média | Médio | Baixo | Alta |
| F-05 | Ações autenticadas importantes não apresentam confirmação de sucesso e várias não mostram erro de rede | Média | Alto | Médio | Alta |
| F-06 | Fluxos de login são inconsistentes: carteira/alertas oferecem Google + e-mail; Confiança e menu da conta oferecem somente Google | Média | Médio | Baixo | Alta |

## Achados detalhados

### F-01 — Impressão/PDF provavelmente inoperante

`printReport()` abre a janela com `noopener,noreferrer` e depende do objeto retornado para executar `document.write`. Com `noopener`, navegadores podem devolver `null`; a função então retorna `false` sem informar o usuário. A tela ignora esse retorno. Isso explica um botão que continua parecendo congelado mesmo após existir posição na carteira.

**Recomendação:** abrir a janela de forma compatível, escrever o relatório com segurança e exibir erro quando popup estiver bloqueado. Testar download/impressão em Chrome, Edge, Safari e celular.

### F-02 — Exportações visíveis antes de estarem disponíveis

O cabeçalho da carteira é renderizado para todos. Os dois botões usam `disabled={!positions.length}`. Assim:

- deslogado: aparecem desabilitados;
- logado com carteira vazia: continuam desabilitados;
- durante carregamento: parecem desabilitados sem indicar carregamento;
- somente depois de uma posição válida tornam-se ativos.

O teste publicado confirmou ambos desabilitados no estado público.

**Recomendação:** ocultar exportações para deslogados; para conta vazia, mostrar texto “Disponível após o primeiro lançamento”; durante carregamento, usar estado de carregamento. O selo “Entrada manual” deve permanecer visualmente distinto de um botão.

### F-03 — Salvar operação falha silenciosamente na validação local

`submit()` executa `return` quando ticker, quantidade ou preço não passam na validação básica. Nenhuma mensagem é exibida e o botão continua igual. Outros problemas:

- não há indicação de sucesso após salvar;
- quantidade/preço zero ou texto inválido não explicam o erro;
- data vazia chega ao servidor ou pode produzir erro pouco contextualizado;
- exclusão não pede confirmação e não mostra estado pendente/erro.

**Recomendação:** validação por campo, resumo de erro, toast de sucesso, bloqueio coerente do botão e confirmação antes de excluir.

### F-04 — Botão “Consultar” não representa uma ação

A consulta de dividendos usa diretamente `dividendTicker` como parâmetro da API. O campo altera esse mesmo estado a cada tecla. O botão chama `setDividendTicker(dividendTicker.trim().toUpperCase())`; quando o valor já está normalizado, nenhuma mudança ocorre. Portanto, o clique não dispara nova consulta nem oferece feedback.

**Recomendação:** separar `draftTicker` de `submittedTicker`, consultar apenas no submit e permitir Enter. Adicionar carregamento, estado vazio e “ticker não encontrado”.

### F-05 — Ações sem feedback ou tratamento completo

Casos confirmados por inspeção:

- `Atualizar` cotação: mostra spinner durante a mutation, mas não informa sucesso, indisponibilidade, catálogo ou rate limit;
- criar alerta: mostra apenas erro lógico retornado pelo servidor, não `mutation.error`;
- pausar/reativar alerta: sem pending, erro ou confirmação;
- preferência de e-mail: sem feedback de sucesso/erro e permite cliques repetidos;
- marcar notificação como lida: sem estado pendente e permanece clicável após lida;
- adicionar ticker ao comparador: duplicado, inválido ou vazio falham silenciosamente;
- remover operação: sem confirmação e sem erro visível;
- downloads ignoram o booleano de sucesso retornado pelos helpers.

**Recomendação:** padrão único para mutations: `idle → pending → success/error`, mensagem clara, prevenção de duplo clique e rollback/refetch previsível.

### F-06 — Autenticação inconsistente

Carteira e alertas oferecem Google e link por e-mail. Já os botões de Confiança & dados e o menu da conta chamam diretamente `startLogin()`, abrindo somente Google. Uma pessoa cuja conta é apenas `adm@...` pode concluir que não consegue acessar por esses pontos.

**Recomendação:** um único modal/componente de acesso reutilizado em todos os pontos, com Google e link seguro por e-mail.

## Outros achados

### Média prioridade

1. **Favoritos locais e conta:** deslogados usam armazenamento local; logados usam o servidor. Não há migração explícita dos favoritos locais ao entrar, e a página inicial autenticada prioriza somente a watchlist do servidor. Um favorito pode parecer perdido após login.
2. **Ordem dos cartões:** as setas da visão geral funcionam apenas na memória da página. A ordem volta ao padrão ao recarregar, apesar de existir preferência `dashboardLayout` no backend.
3. **Comparador:** aceita um ticker inexistente como chip, mas não explica por que ele não aparece nos resultados.
4. **Alertas:** existe pausar/reativar, mas não há ação de exclusão, embora o ícone `Trash2` esteja importado. A ausência deve ser decidida como regra de produto ou implementada.
5. **Conta autenticada sem nome:** corrigida na prévia para “Administrador Virtus”/“Conta Virtus”; o estado anterior “Visitante” gerava falsa impressão de login incompleto.
6. **Aviso de cookies:** pode cobrir os controles de autenticação e exportação em telas menores, fazendo ações parecerem ausentes.

### Baixa prioridade / comportamento esperado que precisa de clareza

1. Setas de reordenação do primeiro e último cartão ficam desabilitadas por limite; é esperado, mas tooltip ajudaria.
2. “Limpar filtros” parece não fazer nada quando o screener já está no estado inicial.
3. Filtros de mercados e screener atualizam imediatamente; não há botão “Aplicar”. Isso funciona, mas o carregamento deveria ser perceptível.
4. `Entrada manual`, `In-app + e-mail` e badges semelhantes não são botões, embora alguns tenham aparência próxima de controle.

## Matriz por área

| Área | Funciona | Parcial/enganoso | Quebrado/ausente |
|---|---|---|---|
| Navegação lateral | Rotas principais | conta sem nome (corrigida na prévia) | — |
| Busca global | abre paleta e navega | sem feedback de carregamento | — |
| Mercados | busca, filtros, favorito local/servidor | migração local → conta | — |
| Screener | filtros e limpeza | limpeza sem efeito perceptível no padrão | — |
| Comparador | adicionar/remover válidos | inválido/duplicado silencioso | validação explícita ausente |
| Carteira | APIs e formulário possuem handlers | validação/feedback/exportações | impressão/PDF |
| Calculadoras | juros compostos reativo | consulta automática pouco clara | botão Consultar sem ação real |
| Alertas | criar, pausar e preferências possuem APIs | feedback de mutation | exclusão ausente |
| Confiança & dados | exportação e preferências possuem APIs | login só Google | — |
| Ativo | períodos, gráfico, favoritos | atualização sem resultado visível | — |

## Causa-raiz

**Primária: REPO_FRAGILITY / arquitetura de interação inconsistente — confiança alta.** Cada página implementa seus próprios estados, mensagens e autenticação. Não existe uma camada única para `ActionButton`, feedback de mutation, pré-requisitos e login.

**Secundária: VERIFICATION_CHURN — confiança alta.** Os testes existentes cobrem regras do servidor, mas não cobrem jornadas de interface autenticadas, downloads, popups, estados vazios ou feedback ao usuário. Por isso handlers presentes foram interpretados como funcionalidade concluída sem validação ponta a ponta.

## Ordem recomendada de correção

1. Corrigir impressão/PDF e mensagens de validação da carteira.
2. Ajustar visibilidade/explicação dos botões de exportação.
3. Criar padrão reutilizável de feedback para mutations.
4. Unificar o componente de login em todos os pontos.
5. Corrigir “Consultar dividendos” e validação do comparador.
6. Persistir ordem do dashboard e migrar favoritos locais após login.
7. Criar testes E2E com dois estados: visitante e conta autenticada.

## Limitações

O teste automatizado navegou deslogado pelas 10 rotas principais e não encontrou exceções JavaScript. O estado autenticado foi analisado pelo código, pelas APIs protegidas e pela evidência visual da sessão administrativa fornecida pelo usuário; a sessão pessoal aberta no navegador do usuário não foi reutilizada pelo executor de testes.
