# Operação editorial assistida — beta

## Regra de lançamento

Nesta fase, o Virtus **não publica automaticamente em redes sociais**. A automação pode coletar fontes permitidas e criar rascunhos, mas toda publicação exige aprovação humana registrada.

## Janelas

- Manhã, 07:15 em dias úteis: agenda oficial e indicadores já confirmados.
- Intraday, 13:30 em dias úteis: mudanças observadas, sem inventar causalidade.
- Fechamento, 22:00 em dias úteis: números consolidados e fonte B3. Uma segunda tentativa idempotente ocorre às 23:15 se o fechamento oficial ainda não estava disponível.
- Plantão: somente fonte oficial ou duas fontes independentes.

## Fluxo

1. Coletar apenas fontes cadastradas e permitidas.
2. Arquivar URL, horário observado e fatos extraídos.
3. Criar rascunho sem linguagem de compra, venda, promessa ou preço-alvo.
4. Executar validação editorial determinística.
5. Submeter a uma pessoa diferente do autor.
6. Publicar manualmente pelo canal oficial.
7. Arquivar conteúdo final, aprovador e horário.
8. Corrigir no mesmo canal se o sentido material mudar.

## Controles implementados

- Os jobs usam autenticação interna e lock distribuído.
- Cada janela possui uma única chave por data no fuso `America/Bahia`; repetições não duplicam rascunhos.
- O fechamento é recusado quando a referência do Ibovespa ainda não pertence ao dia corrente.
- Rascunhos ficam persistidos no Cloud SQL e aparecem apenas na área administrativa **Operação editorial**.
- Autor e aprovador precisam ser identidades diferentes.
- Aprovação não publica nas redes. A postagem continua manual e o canal/URL são registrados depois para auditoria.
- Plantões não são gerados automaticamente e exigem fonte oficial ou duas fontes independentes.
- O painel administrativo possui uma pausa geral persistente. Quando acionada
  com justificativa, ela bloqueia novos rascunhos automáticos e o registro de
  publicações até a retomada pelo administrador; a fila existente é preservada.
- Publicações já distribuídas possuem histórico de correção append-only. Uma
  correção pequena preserva a operação; correção material ou retirada pausa
  automaticamente a geração e a distribuição até revisão e retomada manual.
- O registro guarda o post original, motivo, texto comunicado, responsável,
  horário e URL pública da correção quando existente. Correções não podem ser
  usadas para apagar silenciosamente o histórico.

Para criar ou atualizar os agendamentos, execute `scripts/configure-editorial-schedulers.ps1` após a publicação do backend.

## Critérios para futura autopublicação

- quatro semanas sem erro factual material;
- fontes e licenças revisadas;
- fila, kill switch e alerta de falha ativos;
- taxa de correção medida;
- revisão jurídica do formato;
- autopublicação limitada a agenda e indicadores oficiais padronizados.
