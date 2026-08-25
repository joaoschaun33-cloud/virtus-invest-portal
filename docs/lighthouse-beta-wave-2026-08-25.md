# Medição Lighthouse móvel — onda de correções do beta

Data: 25 de agosto de 2026. URL: `https://www.virtusinvestimentos.com.br`.

| Execução | Performance | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 63 | 100 | 100 | 100 | 4,9 s | 6,3 s | 10 ms | 0 |
| 2 | 75 | 100 | 100 | 100 | 2,1 s | 3,2 s | 630 ms | 0 |
| 3 | 74 | 100 | 100 | 100 | 2,1 s | 3,5 s | 580 ms | 0 |

## Leitura

- O gate de estabilidade visual foi aprovado: CLS abaixo de 0,10 nas três
  execuções, com resultado zero.
- Acessibilidade, boas práticas e SEO alcançaram 100 nas três execuções.
- Performance e LCP ainda não atingem a meta premium. A inspeção apontou um
  pacote genérico pré-carregado na home com aproximadamente metade do código
  sem uso inicial.
- A configuração de chunks foi refinada depois desta medição para manter
  dependências secundárias junto das rotas carregadas sob demanda. Uma nova
  medição deve comparar a mediana após a publicação.
