# Auditoria final do candidato a beta — Portal Virtus

Data de corte: 27 de agosto de 2026.

## Parecer executivo

O Portal Virtus está **apto para um beta controlado**, com público limitado,
acompanhamento próximo e revisão humana do conteúdo editorial. Ainda não deve
ser tratado como produto financeiro maduro nem aberto amplamente sem concluir
os gates humanos e operacionais listados abaixo.

## Evidências técnicas aprovadas

- Saúde pública e prontidão do banco respondem com HTTP 200 em produção.
- Dois monitores externos verificam saúde e banco a cada 60 segundos.
- Duas políticas ativas notificam o e-mail operacional quando saúde pública ou
  prontidão do banco falham por dois minutos.
- Gate autenticado A/B aprovado em produção com contas descartáveis:
  isolamento de leitura, transações, alertas, preferências e exportações; token
  de conta excluída rejeitado.
- 119 testes automatizados aprovados; 1 teste de e-mail corretamente ignorado
  por depender de credencial externa.
- 27 cenários públicos de produção aprovados; 1 cenário móvel ignorado no
  projeto desktop por desenho.
- Fontes oficiais B3, CVM e IBGE responderam e entregaram dados válidos.
- Teste leve de carga: 60/60 respostas HTTP 200, zero erro 5xx, p95 de 769 ms.
- Lighthouse: desempenho 94, acessibilidade 100, boas práticas 100 e SEO 100;
  LCP de 2,0 s e CLS zero.
- Dependências de produção sem vulnerabilidades conhecidas na auditoria atual.
- Área editorial com fila persistente, idempotência, quatro-olhos e publicação
  exclusivamente manual. Um rascunho real foi gerado e ficou em revisão.
- Agenda editorial ativa para manhã, meio do pregão, fechamento e nova tentativa
  de fechamento, sempre sem publicação automática.
- Restauração real aprovada em instância temporária: volume recuperado, dados
  essenciais lidos, migrações aplicadas e recurso temporário descartado.

## Limites conhecidos do beta

- Cobertura e atualidade variam conforme a disponibilidade das fontes oficiais;
  o portal deve continuar exibindo fonte, horário e estado de indisponibilidade.
- O produto informa e educa; não substitui recomendação individualizada nem
  assessoria profissional.
- A automação editorial prepara rascunhos, mas não reage automaticamente a
  notícias extraordinárias e não publica em redes sociais.
- Métricas reais de retenção e compreensão ainda dependem do uso do beta.

## Gates obrigatórios antes de abertura ampla

1. Confirmar por teste controlado que o canal operacional recebe o alerta.
2. Nomear titular e substituto para suporte, privacidade e incidentes.
3. Obter revisão profissional de CVM, LGPD, contratos, licenças e conflitos.
4. Aprovar e publicar manualmente o primeiro piloto editorial, preservando o
   histórico de revisão.
5. Conduzir entrevistas com iniciantes e experientes e acompanhar D1/D7/D30.
6. Manter ao menos duas semanas de SLO dentro dos limites antes de ampliar o
   público.
7. Repetir o gate autenticado A/B e a restauração na periodicidade definida.

## Decisão recomendada

**GO para beta controlado; NO-GO para abertura pública ampla neste momento.**

O próximo ciclo deve priorizar operação e aprendizado, não aumento indiscriminado
de funcionalidades: alertas com responsáveis, restauração real, validação
jurídica, entrevistas e acompanhamento do comportamento dos primeiros usuários.
