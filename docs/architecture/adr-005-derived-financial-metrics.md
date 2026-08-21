# ADR-005 — Indicadores financeiros derivados e auditáveis

## Status

Aceita em 19 de agosto de 2026.

## Contexto

O portal recebe indicadores prontos de provedores de mercado e valores contábeis
oficiais da CVM. Misturá-los sem distinção dificultaria auditoria e poderia fazer
um cálculo da Virtus parecer um dado oficialmente publicado pela companhia.

## Decisão

- Calcular indicadores em um único módulo de domínio no servidor.
- Usar somente valores normalizados do mesmo documento CVM e conservar período.
- Identificar cada resultado como `Cálculo Virtus`, com fórmula e interpretação.
- Omitir qualquer indicador sem denominador válido; não estimar valores ausentes.
- Calcular crescimento apenas contra o comparativo apresentado no mesmo arquivo.
- Calcular ROE usando patrimônio médio e anualização pelos dias do período,
  exibindo limitação explícita sobre sazonalidade e ausência de projeção.
- Entregar valores oficiais e derivados juntos na resposta regulatória, mas manter
  essa resposta separada da cotação e dos fundamentos de provedores comerciais.

## Consequências

Os indicadores ficam reproduzíveis e suas limitações visíveis. O ROE anualizado
pode diferir de metodologias adotadas por outros portais; essa diferença é aceita
em favor de uma fórmula estável, documentada e calculada apenas com dados CVM.
