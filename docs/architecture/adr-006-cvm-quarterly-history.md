# ADR-006 — Histórico trimestral a partir do arquivo CVM corrente

## Status

Aceita em 19 de agosto de 2026.

## Contexto

Arquivos ITR incluem valores acumulados no ano e valores exclusivos do trimestre.
Somar ou plotar ambos como equivalentes provocaria dupla contagem. Baixar vários
arquivos anuais em cada visita também elevaria latência e memória sem necessidade
no estágio atual do produto.

## Decisão

- Extrair o histórico do mesmo arquivo consolidado já usado na leitura financeira.
- Descompactar um demonstrativo por vez e reter somente as linhas do CNPJ alvo,
  limitando o pico de memória apesar do tamanho agregado dos arquivos ITR.
- Para cada data e versão, selecionar a linha de DRE com início mais recente e
  duração máxima de 120 dias, representando o trimestre explícito.
- Incorporar o comparativo publicado no próprio documento e deduplicar pela data
  final do período.
- Exibir receita e lucro em reais e calcular margem líquida como Cálculo Virtus.
- Não converter valores acumulados em trimestres por subtração nesta etapa.
- Limitar a oito pontos; série longa dependerá de ingestão agendada persistente.

## Consequências

O gráfico inicial é auditável, rápido e não exige nova transferência da CVM. A
série poderá ter menos pontos em começo de exercício ou para companhias sem ITR;
o produto prefere omitir o gráfico a fabricar continuidade.
