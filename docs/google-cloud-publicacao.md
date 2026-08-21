# Publicação do Virtus na plataforma Google

Projeto: `portal-virtus` (`983572616449`).

Firebase Web App: `Virtus Web`
(`1:983572616449:web:608217af877f66941a3700`). Site padrão:
`https://portal-virtus.web.app`.

Ambiente provisionado em 16 de agosto de 2026:

- Cloud Run: `https://virtus-web-ysuazn5yga-rj.a.run.app`
- Preview Firebase: `https://portal-virtus--prelaunch-ayh4h2fp.web.app`
- Cloud SQL: `portal-virtus:southamerica-east1:virtus-mysql`
- Scheduler: `virtus-alert-monitor` (a cada cinco minutos)

## Arquitetura selecionada

- Firebase Hosting: portal estático, CDN, SSL e domínio público.
- Cloud Run (`virtus-web`): API tRPC, OAuth temporário e WebSocket.
- Cloud SQL for MySQL: banco compatível com o esquema Drizzle atual.
- Secret Manager: credenciais do banco, sessão, agendamento e provedores.
- Cloud Scheduler: execução periódica e única do monitor de alertas.
- Artifact Registry e Cloud Build: imagens e implantação contínua.
- Cloud Logging e Monitoring: logs, erros, disponibilidade e alertas.

Região padrão: `southamerica-east1` (São Paulo).

## Decisões importantes

O WebSocket deve usar diretamente o endereço HTTPS do Cloud Run convertido para
`wss://.../api/realtime`. O Firebase Hosting limita a duração dos rewrites
dinâmicos; por isso, defina `VITE_REALTIME_URL` durante a compilação do frontend.

O monitor interno é desativado no Cloud Run. O Scheduler chama
`POST /internal/jobs/alerts` diretamente, enviando
`Authorization: Bearer <CRON_SECRET>`. O segredo vem do Secret Manager.

O login atual depende do provedor Manus. A publicação pode ser validada
anonimamente, mas o lançamento comercial requer migração para Firebase
Authentication ou configuração formal do provedor OAuth atual.

## Recursos a criar

1. Projeto Google Cloud com faturamento habilitado.
2. Artifact Registry chamado `virtus`.
3. Cloud SQL MySQL com backups, recuperação pontual e exclusão protegida.
4. Banco e usuário exclusivos do Virtus.
5. Segredos listados em `cloudbuild.yaml`.
6. Serviço Cloud Run e conta de serviço exclusiva.
7. Site Firebase Hosting ligado ao mesmo projeto.
8. Job Cloud Scheduler para alertas.
9. Uptime check em `/api/health` e alertas de erro/latência.

## Variáveis não secretas

- `NODE_ENV=production`
- `ALERT_MONITOR_MODE=scheduler`
- `PUBLIC_SITE_URL=https://www.virtusinvestimentos.com.br`
- `VITE_REALTIME_URL=wss://ENDERECO_CLOUD_RUN/api/realtime` (em build)
- `VITE_ANALYTICS_ID` (somente após aprovação)

## Segredos mínimos

- `virtus-database-url`
- `virtus-jwt-secret`
- `virtus-cron-secret`

Adicionar conforme contratação: BRAPI, Twelve Data, Finnhub, Resend e autenticação.

## Ordem segura de lançamento

1. Implantar e testar pelo endereço temporário do Cloud Run.
2. Executar migrações no Cloud SQL.
3. Publicar em um canal de preview do Firebase.
4. Validar login, dados, alertas, SEO, acessibilidade e desempenho.
5. Adicionar `www.virtusinvestimentos.com.br` ao Firebase.
6. Copiar para a Cloudflare somente os registros apresentados pelo Firebase.
7. Manter e-mails da KingHost e registros MX intactos.
8. Redirecionar o domínio sem `www` para o domínio principal.
9. Acompanhar erros e disponibilidade antes da divulgação.
