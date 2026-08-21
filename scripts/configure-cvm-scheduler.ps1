param(
  [string]$ProjectId = "portal-virtus",
  [string]$Region = "southamerica-east1",
  [string]$JobName = "virtus-cvm-financials",
  [string]$Uri = "https://virtus-web-ysuazn5yga-rj.a.run.app/internal/jobs/cvm-financials"
)

$ErrorActionPreference = "Stop"
$gcloud = (Get-Command gcloud.cmd -ErrorAction Stop).Source
$cronSecret = & $gcloud secrets versions access latest --secret=virtus-cron-secret --project=$ProjectId
if (-not $cronSecret) { throw "Não foi possível acessar virtus-cron-secret." }
$headers = "Authorization=Bearer $($cronSecret.Trim()),Content-Type=application/json"
$exists = $null -ne (& $gcloud scheduler jobs describe $JobName --location=$Region --project=$ProjectId 2>$null)

if ($exists) {
  & $gcloud scheduler jobs update http $JobName `
    --location=$Region `
    --project=$ProjectId `
    --schedule="0 6 * * *" `
    --time-zone="America/Bahia" `
    --uri=$Uri `
    --http-method=POST `
    --update-headers=$headers `
    --message-body="{}" `
    --attempt-deadline=300s `
    --quiet `
    --format=none
} else {
  & $gcloud scheduler jobs create http $JobName `
    --location=$Region `
    --project=$ProjectId `
    --schedule="0 6 * * *" `
    --time-zone="America/Bahia" `
    --uri=$Uri `
    --http-method=POST `
    --headers=$headers `
    --message-body="{}" `
    --attempt-deadline=300s `
    --quiet `
    --format=none
}
