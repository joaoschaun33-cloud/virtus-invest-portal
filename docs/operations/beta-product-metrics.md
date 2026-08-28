# Métricas de produto do beta

## Princípio de privacidade

As métricas são opcionais e só são emitidas após consentimento explícito. O
Virtus não envia quantidade, preço, valor da carteira, texto livre, e-mail ou
identificador interno. Cada evento possui uma lista fechada de parâmetros; todo
campo não autorizado é descartado no cliente.

## Funil mínimo

| Etapa | Evidência | Evento |
|---|---|---|
| Chegada consentida | sessão analítica iniciada | `beta_session` |
| Educação | objetivo ou módulo do guia | `guide_goal_selected`, `guide_module_opened` |
| Aprendizado | verificação ou trilha concluída | `guide_quiz_completed`, `guide_completed` |
| Exploração | ativo carregado com fonte | `asset_detail_loaded` |
| Análise | screener, comparação ou análise fundamentalista | `screener_result_opened`, `comparison_completed`, `analysis_loaded` |
| Ativação pessoal | operação manual, importação ou alerta | `portfolio_transaction_added`, `portfolio_import_completed`, `alert_created` |
| Valor recorrente | exportação e retorno consentido | `portfolio_exported`, `beta_session` |

## Retenção

O primeiro acesso com métricas aceitas é guardado apenas no navegador. Uma vez
por sessão, `beta_session` informa uma faixa anônima: `D0`, `D1`, `D2-D6`,
`D7-D29` ou `D30+`. Isso permite acompanhar D1, D7 e D30 sem criar perfil novo
no banco do Virtus. A análise deve sempre mostrar também a taxa de consentimento
para evitar interpretar a amostra como toda a base.

## Critérios para o piloto

- Ativação inicial: realizou ao menos um evento de educação, exploração ou análise.
- Ativação de alto valor: criou carteira/alerta ou concluiu uma comparação.
- Compreensão: concluiu ao menos uma verificação do guia.
- Retenção: nova `beta_session` nas faixas D1, D7-D29 e D30+.
- Qualidade: acompanhar `analysis_failed` e erros bloqueantes separadamente.

Não definir meta percentual antes do primeiro lote: as duas primeiras semanas
formam a linha de base do beta controlado.
