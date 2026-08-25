# Pesquisa de fontes para notícias cripto — 2026

## Objetivo

Selecionar uma fonte que permita ao Virtus exibir, em produto público, título,
resumo curto, origem, horário e associação a BTC, ETH, SOL e futuras moedas.

## Requisitos eliminatórios

- uso comercial e exibição pública expressamente permitidos;
- link e atribuição preservados;
- cache e retenção documentados;
- português do Brasil ou tradução contratualmente permitida;
- associação estruturada entre notícia e moeda;
- ausência de scraping e de API não oficial.

## Comparação

| Fonte | Cobertura/estrutura | Português | Situação de licença | Avaliação |
| --- | --- | --- | --- | --- |
| CoinGecko `/news` | notícias, guias, fonte e IDs de moedas; até 400 itens | `pt-br` nativo | endpoint a partir do Analyst; uso comercial com atribuição, mas confirmar se títulos agregados podem ser exibidos no portal | melhor encaixe técnico |
| CryptoPanic | agregador especializado, filtros e moedas relacionadas | cobertura variável | anuncia integração em sites/apps; exigir proposta escrita sobre cache, atribuição e exibição pública | melhor alternativa especializada |
| CoinMarketCap Content | conteúdo e ativos relacionados | principalmente inglês | planos indicam uso comercial integrado; confirmar acesso do endpoint e tradução | boa segunda alternativa |
| Alpha Vantage News & Sentiment | notícias e sentimento por `CRYPTO:BTC` etc. | sem garantia de `pt-br` | gratuito é pessoal; comercial exige acordo escrito | útil para sentimento, não primeira escolha editorial |
| EODHD News | notícias financeiras por símbolo/tópico | sem garantia de `pt-br` | conta atual não autoriza display; redistribuição depende de contrato comercial | avaliar junto ao contrato de mercado |
| Finnhub Market News | categoria `crypto`, fonte, resumo e relacionados | inglês | confirmar plano e direito de exibição; documentação pública não resolve redistribuição | tecnicamente viável, menor aderência local |
| Marketaux | notícias globais, snippets e entidades | múltiplos idiomas | termos públicos são ambíguos para exibição comercial | somente após autorização escrita |
| CCData/CryptoCompare | cobertura cripto ampla | inglês | licença padrão é uso interno; redistribuição exige contrato específico | forte, porém provavelmente mais caro |

## Recomendação

1. Solicitar ao CoinGecko confirmação escrita para o caso exato do Virtus e
   proposta do plano Analyst com endpoint `/news`.
2. Solicitar proposta comparável ao CryptoPanic.
3. Usar CoinMarketCap como terceiro orçamento.
4. Negociar idioma, atribuição, cache de 15 minutos, retenção de 30 dias,
   exibição de título/snippet, links externos e volume público.
5. Manter BCB e CVM como fontes de regulação cripto enquanto o contrato não é
   assinado; não preencher o filtro com demonstração.

## Estado atual

A chave CoinGecko configurada é do plano `demo`. O endpoint de notícias não está
incluído e, portanto, não deve ser ativado em produção. O adaptador futuro deve
ser habilitado por uma variável explícita (`COINGECKO_NEWS_PUBLIC_DISPLAY=true`)
somente após registro da autorização comercial.
