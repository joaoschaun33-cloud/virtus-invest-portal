# SLO e recuperação operacional do beta

## Objetivos mensais

| Indicador | Objetivo | Alerta |
|---|---:|---:|
| Disponibilidade de `/api/health` | 99,9% | duas falhas consecutivas em 5 min |
| Readiness de `/api/ready` | 99,5% | qualquer falha por 5 min |
| Latência pública p95 | até 1.500 ms | acima de 2.500 ms por 10 min |
| Erros HTTP 5xx | abaixo de 1% | acima de 2% por 5 min |
| Frescor do fechamento B3 | até o próximo dia útil | job atrasado por 24 h |
| Cobertura do catálogo | pelo menos 90% | abaixo de 85% |

O endpoint de vida não consulta dependências. O readiness executa uma consulta
real ao banco. Monitoramento externo deve usar ambos e nunca interpretar a SPA
como resposta de saúde.

## Teste leve de carga

Executar antes de uma abertura de lote do beta:

```powershell
$env:VIRTUS_LOAD_URL="https://www.virtusinvestimentos.com.br"
pnpm test:load
```

O teste mistura saúde, readiness, catálogo e pesquisa, limita concorrência e
falha com respostas 5xx ou p95 acima de três segundos. Respostas 429 indicam que
a proteção de abuso está funcionando e devem ser avaliadas separadamente.

## RTO, RPO e restauração

- RPO inicial: 24 horas.
- RTO inicial: 4 horas.
- Uma restauração deve ocorrer em instância temporária, nunca sobre produção.
- Validar contagem de usuários, ativos, transações, alertas e último fechamento.
- Registrar backup usado, horários, responsável, resultado e descarte da instância.
- O teste é trimestral e também após mudança material de banco ou migração.

## Incidente

1. interromper jobs ou distribuição que possam ampliar o impacto;
2. preservar logs, IDs de requisição e versões publicadas;
3. classificar impacto em disponibilidade, integridade, confidencialidade e dados;
4. comunicar produto, engenharia, dados e privacidade;
5. corrigir, validar e registrar a decisão de retorno;
6. avaliar comunicação a titulares e ANPD com assessoria jurídica;
7. realizar retrospectiva e acompanhar as ações corretivas.
