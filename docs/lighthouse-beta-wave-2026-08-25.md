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

## Validação após o refinamento

| Execução | Performance | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 88 | 100 | 100 | 100 | 2,0 s | 2,5 s | 300 ms | 0 |
| 2 | 82 | 100 | 100 | 100 | 1,9 s | 3,4 s | 360 ms | 0 |
| 3 | 69 | 100 | 100 | 100 | 4,6 s | 5,2 s | 40 ms | 0 |

A mediana de performance subiu de 74 para 82 e a mediana de LCP caiu de 3,5 s
para 3,4 s. A melhor execução atingiu a meta de LCP de 2,5 s. A dispersão ainda
indica influência de rede/servidor frio; o próximo refinamento deve priorizar
cache e tempo de resposta do documento em vez de ampliar o JavaScript inicial.
