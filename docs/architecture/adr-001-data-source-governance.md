# ADR-001: Governança central de fontes de dados

## Status

Aceito em 19/08/2026.

## Contexto

O Virtus combina dados oficiais brasileiros, provedores de mercado e conteúdo
editorial. A seleção de fontes estava incorporada nos adaptadores e dependia em
parte da simples presença de credenciais. Isso permitia que uma fonte comercial
substituísse silenciosamente uma fonte oficial e repetia decisões entre casos de
uso.

Restrições atuais: produto informativo gratuito, orçamento mensal baixo, equipe
pequena, publicação pública e necessidade de rastrear origem e licenciamento.

## Opções consideradas

| Opção                                | Benefícios                                    | Custos e riscos                                    |
| ------------------------------------ | --------------------------------------------- | -------------------------------------------------- |
| Escolha em cada página               | Implementação inicial rápida                  | Duplicação, divergência e exposição de credenciais |
| Microserviço por fonte               | Isolamento e escala independente              | Operação e custo desproporcionais ao estágio atual |
| Política central em monólito modular | Regra única, testes simples e extração futura | Exige contratos internos consistentes              |

## Decisão

Adotar monólito modular com:

1. catálogo público e único de fontes;
2. política central de prioridade, elegibilidade e exibição;
3. adaptadores concretos por provedor;
4. rotas e páginas desacopladas da ordem dos provedores;
5. fontes oficiais como autoridade para fatos;
6. brapi como fonte operacional prioritária para o mercado brasileiro;
7. Twelve Data e Finnhub bloqueadas na exibição pública até aprovação explícita
   da licença por variável de ambiente;
8. catálogo local somente como fallback identificado.

## Consequências

- Positivas: reduz duplicação, impede seleção acidental por token, melhora
  procedência e permite trocar provedores sem alterar as páginas.
- Negativas: ativos globais podem ficar sem dados públicos enquanto a licença
  não for confirmada.
- Mitigação: manter fallback claramente identificado e integrar uma fonte com
  direito de exibição antes de ativar o mercado global.

## Próximas integrações oficiais

- B3: instrumentos, índices, calendário e arquivos de fechamento;
- CVM: demonstrações e documentos estruturados (notícias já ativas);
- IBGE: inflação, atividade e calendário;
- Tesouro Direto: preços, taxas e histórico de títulos.

## Gatilhos para revisão

- contratação de feed de mercado com licença pública;
- lançamento de recursos pagos;
- necessidade comprovada de tempo real;
- volume ou equipe que exija escala independente por domínio.
