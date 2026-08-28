# Passagem dos gates humanos do beta

Este documento concentra somente decisões e evidências que não podem ser
produzidas pelo software. Preencher nomes, datas e links reais; não aceitar
aprovação genérica ou presumida.

## 1. Responsáveis operacionais

| Função | Titular | Substituto | Canal | Aceite em |
| --- | --- | --- | --- | --- |
| Incidentes e disponibilidade | A definir | A definir | A definir | A definir |
| Privacidade e titulares | A definir | A definir | A definir | A definir |
| Suporte ao usuário | A definir | A definir | `suporte@virtusinvestimentos.com.br` | A definir |
| Curadoria editorial | A definir | A definir | A definir | A definir |
| Dados e fontes | A definir | A definir | A definir | A definir |

Critério de aceite: cada pessoa confirma que recebeu o runbook, consegue acessar
os sistemas necessários e conhece o caminho de escalonamento.

## 2. Exercício do canal de alerta

Configuração existente:

- canal: `Virtus operational support`;
- destino: `suporte@virtusinvestimentos.com.br`;
- política: `Virtus public health unavailable`;
- política: `Virtus database readiness unavailable`;
- disparo: falha por dois minutos;
- recuperação: notificação de abertura e fechamento do incidente.

O responsável deve conduzir um teste controlado, sem derrubar produção:

1. agendar uma janela e avisar os participantes;
2. criar um monitor descartável para um endereço propositalmente inexistente;
3. vinculá-lo temporariamente ao mesmo canal operacional;
4. registrar horário do disparo, chegada do e-mail e ciência do responsável;
5. restaurar o estado normal e confirmar a notificação de encerramento;
6. excluir o monitor e a política descartáveis;
7. anexar capturas ou IDs do incidente ao registro abaixo.

| Evidência | Valor |
| --- | --- |
| Responsável pelo exercício | A definir |
| Início da falha simulada | A definir |
| Incidente aberto em | A definir |
| E-mail recebido em | A definir |
| Responsável confirmou em | A definir |
| Incidente encerrado em | A definir |
| ID/link da evidência | A definir |
| Resultado | Pendente |

## 3. Parecer jurídico e de privacidade

O profissional responsável deve registrar parecer sobre:

- enquadramento informativo/educacional e limites perante a CVM;
- ausência de recomendação individual, promessa, rating e preço-alvo;
- termos de uso, avisos de risco e linguagem editorial;
- controlador, operadores, bases legais, retenção e direitos dos titulares;
- encarregado/canal de privacidade e fluxo de atendimento;
- consentimento de analytics e tecnologias de armazenamento;
- exportação, exclusão, logs e resposta a incidentes;
- contratos e subprocessadores de nuvem, e-mail, autenticação e dados;
- licenças e autorização de exibição de cada fonte de dados;
- conflitos de interesse, publicidade e conteúdo patrocinado.

| Campo | Valor |
| --- | --- |
| Profissional/escritório | A definir |
| Registro profissional | A definir |
| Escopo contratado | A definir |
| Data do parecer | A definir |
| Restrições ou correções exigidas | A definir |
| Link do parecer assinado | A definir |
| Decisão | Pendente |

## 4. Primeiro piloto editorial

Usar um rascunho real gerado pela fila administrativa. Autor e aprovador devem
ser pessoas diferentes.

| Campo | Valor |
| --- | --- |
| ID do rascunho | A definir |
| Janela editorial | A definir |
| Autor | A definir |
| Aprovador | A definir |
| Fontes verificadas | A definir |
| Correções solicitadas | A definir |
| Canal de publicação | A definir |
| URL da publicação | A definir |
| Horário publicado | A definir |
| Resultado | Pendente |

Após publicar, confirmar que a URL e o horário foram registrados na própria
área administrativa e que nenhuma linguagem de recomendação foi introduzida na
edição manual.

## 5. Pesquisa e métricas do beta

Definir um lote pequeno de participantes com iniciantes e experientes. Observar,
no mínimo, conclusão do guia, busca de ativo, leitura de análise, uso do screener,
comparação, criação de carteira e retorno ao portal.

| Gate | Responsável | Evidência | Situação |
| --- | --- | --- | --- |
| Roteiro e consentimento da pesquisa | A definir | A definir | Pendente |
| Entrevistas com iniciantes | A definir | A definir | Pendente |
| Entrevistas com experientes | A definir | A definir | Pendente |
| Linha de base D1 | A definir | A definir | Pendente |
| Retenção D7 | A definir | A definir | Pendente |
| Retenção D30 | A definir | A definir | Pendente |
| Duas semanas dentro do SLO | A definir | A definir | Pendente |

## Decisão de ampliação

O beta controlado pode operar enquanto estes gates são coletados. A ampliação
de público exige: canal testado, responsáveis nomeados, parecer jurídico aceito,
piloto editorial auditável e duas semanas de operação dentro do SLO.

| Decisão | Nome | Data | Justificativa |
| --- | --- | --- | --- |
| Produto | A definir | A definir | A definir |
| Engenharia/operações | A definir | A definir | A definir |
| Jurídico/privacidade | A definir | A definir | A definir |
