# ADR-003: Identidade de emissores pela base oficial da B3

## Status

Aceito em 19/08/2026.

## Contexto

A CVM organiza companhias por CNPJ e código CVM, enquanto o produto começa a
consulta pelo ticker. Um mapa manual limita cobertura e tende a ficar
desatualizado. Correspondência por semelhança de nomes é insegura. A B3 publica
uma base geral de ISIN e emissores em arquivo compactado, acessível pela página
oficial de pesquisa.

O arquivo completo contém dezenas de megabytes quando descompactado. A consulta
não pode bloquear cotações, gráficos ou comparações.

## Decisão

1. Consultar o índice de downloads e o arquivo geral da página oficial de ISIN
   da B3 somente no servidor.
2. Aplicar timeout, limite de 12 MB ao ZIP e 15 MB ao cadastro de emissores.
3. Descompactar apenas `EMISSOR.TXT`, ignorando a base completa de numerações.
4. Manter o cadastro em memória por 24 horas.
5. Para ações, extrair o código do emissor do prefixo de quatro letras do
   ticker e obter o CNPJ na base B3; não aplicar essa regra a ETFs, FIIs,
   índices ou outros instrumentos.
6. Consultar a CVM pelo CNPJ retornado pela B3.
7. Expor a consulta regulatória em uma rota separada da cotação, carregada de
   forma independente na página do ativo.

## Consequências

- Positivas: elimina o mapa manual de companhias, amplia cobertura de ações,
  preserva identidade exata e não degrada os fluxos de mercado.
- Negativas: a base de emissores não fornece sozinha todos os detalhes do
  instrumento e depende do serviço público da página de ISIN.
- Mitigação: falhas retornam ausência de cadastro sem substituir por inferência;
  ISIN e características completas serão adicionados quando houver canal
  operacional oficial estável para o BVBG.028 ou dataset equivalente.

## Gatilhos para revisão

- mudança no canal oficial de downloads da B3;
- disponibilidade de API/documentação pública para instrumentos;
- necessidade de persistência histórica ou processamento em lote.
