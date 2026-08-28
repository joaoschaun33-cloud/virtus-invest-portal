# Situação das correções da auditoria pré-beta

Atualizado em 27 de agosto de 2026 após a revisão `virtus-web-00051-4wr`.

## Fechado tecnicamente

- WebSocket usa o endereço compatível do Cloud Run e só sinaliza conexão após
  a mensagem `ready`; E2E confirma ausência de erro de console.
- Rate limit público, proteção de corpo e cache de provedores ativos.
- `/api/ready` executa consulta real ao banco; `/api/metrics` é protegido.
- Locks MySQL usam a mesma conexão dedicada para adquirir e liberar.
- Uptime externo de health e readiness configurado a cada 60 segundos.
- Preferências de analytics podem ser reabertas dentro do portal.
- Fontes não licenciadas são bloqueadas e ausências não viram dados fictícios.
- E2E público desktop/mobile cobre home, guia, análise, privacidade e layout.
- Teste leve de carga: 60 requisições, concorrência 6, zero 5xx, p95 785 ms.
- Jobs do Scheduler usam OIDC de curta duração; segredo fica como contingência.
- Progresso do guia é salvo por conta, com cópia local para visitantes.
- CLS móvel foi zero em seis medições; acessibilidade, boas práticas e SEO 100.
- Dependências de produção sem vulnerabilidades conhecidas na auditoria atual.
- Gate autenticado A/B aprovado em produção com contas descartáveis e limpeza
  confirmada ao final.
- Duas políticas de indisponibilidade ativas para `/api/health` e `/api/ready`,
  vinculadas ao canal `suporte@virtusinvestimentos.com.br`.
- Backup automático restaurado em instância temporária, dados essenciais
  validados, migrações aplicadas e instância descartada com sucesso.

## Refinamentos entregues

- Catálogo oficial ampliado para 194 ativos e cobertura de preço de 96%.
- Listas mostram preço e variação juntos; cartões indisponíveis não reservam
  espaços vazios.
- Redimensionador do menu lateral operável por teclado.
- Divisão de JavaScript inicial refinada; mediana Lighthouse subiu de 74 para
  82 e a melhor execução alcançou 88/LCP 2,5 s.
- SLO, RTO, RPO, carga, restauração e resposta a incidente documentados.

## Pendências que exigem execução ou decisão humana

1. confirmar recebimento real de um alerta no canal operacional configurado;
2. repetir restauração e teste autenticado A/B no gate periódico definido;
3. revisão profissional de CVM, LGPD, contratos, licenças e conflitos;
4. responsável titular e substituto para suporte, privacidade e incidentes;
5. entrevistas com iniciantes/experientes e métricas D1/D7/D30 do beta;
6. piloto editorial/social com aprovação humana e arquivo de evidências;
7. manter duas semanas de SLO e critérios do beta antes de abertura pública.

Essas pendências não devem ser marcadas como concluídas por implementação de
código, pois dependem de exercício real, validação profissional ou escolha de
responsáveis.
