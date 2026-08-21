# ADR-002: Ingestão de dados oficiais com cache e identidade explícita

## Status

Aceito em 19/08/2026.

## Contexto

As APIs operacionais oferecem conveniência, mas não são a autoridade para
inflação nem para o cadastro regulatório de companhias. O IBGE disponibiliza o
IPCA por API; a CVM publica o cadastro diário em CSV com aproximadamente 1 MB.
Baixar e processar esse arquivo em cada tela aumentaria latência e carga. Tentar
associar ticker e companhia por semelhança de nome criaria risco de atribuição
incorreta.

## Decisão

1. Consultar o IPCA de 12 meses diretamente na API de agregados do IBGE.
2. Manter a série equivalente do BCB apenas como contingência explícita.
3. Baixar o cadastro CVM somente no servidor, com limite de tamanho, timeout e
   cache de 24 horas.
4. Associar companhia somente por CNPJ previamente identificado; não usar
   correspondência aproximada de nomes.
5. Expor CNPJ, código CVM, situação cadastral, horário da coleta e link oficial
   junto ao ativo.
6. Manter a ingestão no monólito modular. Um job dedicado somente será criado
   quando DFP/ITR forem persistidos em volume.

## Consequências

- Positivas: fonte original, menor custo, rastreabilidade e ausência de falsos
  vínculos entre ticker e companhia.
- Negativas: apenas ativos com identidade explícita recebem cadastro CVM neste
  primeiro ciclo.
- Mitigação: o futuro adaptador de instrumentos B3 preencherá CNPJ e código CVM
  no catálogo canônico, sem alterar o adaptador CVM nem as páginas.

## Gatilho para revisão

- ingestão recorrente de DFP e ITR;
- catálogo B3 automatizado;
- arquivo oficial ultrapassar o limite operacional atual;
- necessidade de histórico cadastral persistido.
