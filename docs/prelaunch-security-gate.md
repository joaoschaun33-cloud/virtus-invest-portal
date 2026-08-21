# Gate de segurança pré-publicação

Atualizado em 19 de agosto de 2026.

## Critérios obrigatórios

1. Verificação de tipos e suíte unitária aprovadas durante a construção da imagem.
2. Nenhuma rota privada acessível sem token Firebase válido.
3. Duas contas descartáveis enxergam somente os próprios dados.
4. IDs de transação e alerta de outra conta não permitem alteração ou exclusão.
5. Exportações contêm somente a identidade e os registros da conta autenticada.
6. Exclusão remove dados do aplicativo e a identidade Firebase.
7. Token da identidade excluída recebe `401` nas rotas protegidas.
8. Nenhuma conta descartável permanece no Firebase após o teste.

## Teste real controlado

O teste usa duas contas descartáveis no ambiente informado, grava dados mínimos e executa a limpeza no bloco `finally`. Ele exige confirmação explícita para evitar execução acidental.

```powershell
$env:VIRTUS_TEST_URL="https://www.virtusinvestimentos.com.br"
$env:FIREBASE_WEB_API_KEY="<chave-web-pública-do-projeto>"
$env:CONFIRM_PRODUCTION_ISOLATION_TEST="yes"
pnpm test:isolation:production
```

Em 19 de agosto de 2026, o teste foi aprovado para leitura, exclusão cruzada de transação, exclusão cruzada de alerta, preferências, exportação e revogação após exclusão. A consulta administrativa final confirmou zero contas descartáveis remanescentes.

## Observação operacional

A conta de serviço `virtus-runtime@portal-virtus.iam.gserviceaccount.com` precisa manter a função mínima `roles/firebaseauth.admin` para que o fluxo de exclusão possa remover a identidade Firebase. Alterações de IAM devem disparar novamente este gate.
