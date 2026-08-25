# ADR-009 — Fontes editoriais oficiais

## Status

Aceito em 24 de agosto de 2026.

## Decisão

O feed público do Virtus usa fontes primárias com canal de distribuição oficial:

| Fonte | Cobertura principal | Integração | Cota no feed |
| --- | --- | --- | ---: |
| Agência Brasil | empresas, mercado e economia | RSS Economia | 10 |
| Banco Central do Brasil | política monetária e sistema financeiro | Atom oficial | 6 |
| Agência de Notícias do IBGE | inflação, atividade, emprego e indústria | RSS oficial | 6 |
| CVM | regulação e mercado de capitais | RSS oficial | 8 |
| CVM — Empresas | anúncios de proventos de companhias | IPE/Dados Abertos | 6 |

O agregador preserva título, resumo, URL, fonte e data. HTML é convertido em
texto simples; URLs só são aceitas em domínios previamente autorizados. Não há
republicação integral nem preenchimento demonstrativo em caso de falha.

## Balanceamento e cache

- As quatro fontes são consultadas em paralelo.
- O cache editorial compartilhado dura cinco minutos.
- Cada requisição tem timeout de seis segundos e limite de dois megabytes.
- Itens são deduplicados pela URL canônica.
- Termos financeiros eliminam notícias institucionais sem utilidade para análise.
- Cotas por fonte impedem que volume regulatório ou institucional domine o feed.
- O feed final contém no máximo 36 itens, ordenados por publicação.
- Eventos IPE entram apenas quando entregues nos últimos 45 dias e associados a
  um ticker inequívoco; indisponibilidade do arquivo corrente não aciona dados
  antigos como substitutos.

## Próximas fontes

Fontes adicionais só entram quando houver feed/API estável e permissão compatível
com exibição pública. Prioridades futuras:

1. comunicados de emissores e fundos estruturados pela CVM;
2. notícias corporativas licenciadas por fornecedor comercial;
3. cobertura internacional licenciada;
4. notícias de cripto com direito explícito de redistribuição.

Não será usada raspagem de páginas como fonte permanente. EODHD, CoinGecko ou
outros fornecedores pagos só serão exibidos publicamente após confirmação
contratual de redistribuição, cache, retenção e atribuição.
