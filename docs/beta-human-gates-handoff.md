# Passagem dos gates humanos do beta

Este documento concentra somente decisões e evidências que não podem ser
produzidas pelo software. O Virtus opera inicialmente como projeto de fundador
solo. Essa realidade deve ser explícita, sem simular departamentos ou pessoas
inexistentes.

## 1. Responsáveis operacionais

| Função | Titular | Substituto | Canal | Aceite em |
| --- | --- | --- | --- | --- |
| Incidentes e disponibilidade | Fundador | Não designado | Canal operacional do Google Cloud | 27/08/2026 |
| Privacidade e titulares | Fundador | Não designado | Canal de privacidade publicado no portal | 27/08/2026 |
| Suporte ao usuário | Fundador | Não designado | `suporte@virtusinvestimentos.com.br` | 27/08/2026 |
| Curadoria editorial | Fundador | Não designado | Área administrativa editorial | 27/08/2026 |
| Dados e fontes | Fundador | Não designado | Logs e área de confiança do portal | 27/08/2026 |

O fundador declarou ser o responsável único nesta fase. A ausência de substituto
é um risco aceito apenas para o beta controlado: incidentes podem demorar mais a
ser atendidos durante indisponibilidade pessoal. Antes de ampliar o público,
designar ao menos um contato de contingência com acesso documentado e princípio
do menor privilégio.

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
| Responsável pelo exercício | Fundador |
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

Usar preferencialmente um rascunho gerado pela automação, cujo autor técnico é
`automacao-editorial@virtus`; o fundador pode revisá-lo e aprová-lo sem violar o
controle de identidade diferente. Conteúdo extraordinário criado manualmente
pelo fundador não pode ser autoaprovado: deve aguardar revisão externa ou ser
descartado.

| Campo | Valor |
| --- | --- |
| ID do rascunho | A definir |
| Janela editorial | A definir |
| Autor | `automacao-editorial@virtus` |
| Aprovador | Fundador |
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
| Roteiro e consentimento da pesquisa | Fundador | A definir | Pendente |
| Entrevistas com iniciantes | Fundador | A definir | Pendente |
| Entrevistas com experientes | Fundador | A definir | Pendente |
| Linha de base D1 | Fundador | A definir | Pendente |
| Retenção D7 | Fundador | A definir | Pendente |
| Retenção D30 | Fundador | A definir | Pendente |
| Duas semanas dentro do SLO | Fundador | A definir | Pendente |

## Decisão de ampliação

O beta controlado pode operar enquanto estes gates são coletados. A ampliação
de público exige: canal testado, responsáveis nomeados, parecer jurídico aceito,
piloto editorial auditável e duas semanas de operação dentro do SLO.

| Decisão | Nome | Data | Justificativa |
| --- | --- | --- | --- |
| Produto | Fundador | A definir | A definir |
| Engenharia/operações | Fundador | A definir | A definir |
| Jurídico/privacidade | A definir | A definir | A definir |
