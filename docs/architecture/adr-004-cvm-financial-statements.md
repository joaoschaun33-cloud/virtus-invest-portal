# ADR-004 — Demonstrações financeiras oficiais da CVM

## Status

Aceita em 19 de agosto de 2026.

## Contexto

Indicadores de provedores de mercado são úteis para descoberta, mas não devem
ser confundidos com os valores contábeis entregues pela companhia ao regulador.
Os arquivos anuais DFP/ITR da CVM são compactados e agregam todas as companhias;
descompactá-los junto da cotação aumentaria latência, memória e acoplamento.

## Decisão

- Obter a identidade e o CNPJ pela referência oficial B3.
- Consultar primeiro o ITR consolidado mais recente e usar DFP como fallback.
- Selecionar a maior data de referência, a maior versão e `ORDEM_EXERC=ÚLTIMO`.
- Para DRE, escolher o intervalo acumulado desde o início do exercício.
- Converter `ESCALA_MOEDA` para BRL absoluto e preservar período, versão e fonte.
- Executar a consulta em rota separada, com deduplicação concorrente e cache de
  12 horas, sem bloquear cotação, gráfico ou cadastro do emissor.
- Não preencher ausências com estimativas ou dados do catálogo.

## Consequências

O usuário distingue indicadores operacionais de números regulatórios e consegue
auditar a origem. A primeira leitura de uma companhia pode ser mais lenta; uma
ingestão agendada persistente poderá substituir o cache em memória quando o
catálogo e o tráfego crescerem.
