# ADR-007 — Ingestão CVM programada e persistente

## Status

Aceita em 19 de agosto de 2026.

## Contexto

A consulta direta atende o início do produto, mas transfere e descompacta arquivos
grandes durante a navegação. Uma série longa também precisa sobreviver a reinícios
do Cloud Run. O projeto já possui MySQL, Cloud Scheduler e um serviço modular.

## Decisão

- Permanecer no monólito modular; não criar microsserviço ou fila nesta fase.
- Persistir snapshots e trimestres em tabelas separadas com chaves únicas.
- Baixar cada arquivo oficial uma vez por lote e filtrar vários CNPJs na mesma
  passagem.
- Executar diariamente por endpoint interno protegido pelo segredo já usado nos
  jobs operacionais.
- Ler primeiro o banco e manter a consulta direta como contingência inicial.
- Acumular no máximo 100 ativos por execução; o padrão inicial é 25.

## Consequências

A navegação fica independente da disponibilidade imediata da CVM e o histórico
cresce naturalmente. O primeiro preenchimento depende da migração e do Scheduler.
Se o catálogo ultrapassar o lote seguro ou o tempo de cinco minutos, o gatilho de
revisão será mover a execução para Cloud Run Job com paginação e checkpoint.
