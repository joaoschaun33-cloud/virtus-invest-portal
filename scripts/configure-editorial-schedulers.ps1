param(
  [string]$ProjectId = "portal-virtus",
  [string]$Region = "southamerica-east1",
  [string]$BaseUri = "https://virtus-web-ysuazn5yga-rj.a.run.app"
)

$ErrorActionPreference = "Stop"
$gcloud = (Get-Command gcloud.cmd -ErrorAction Stop).Source
$cronSecret = & $gcloud secrets versions access latest --secret=virtus-cron-secret --project=$ProjectId
if (-not $cronSecret) { throw "Não foi possível acessar virtus-cron-secret." }
$headers = "Authorization=Bearer $($cronSecret.Trim()),Content-Type=application/json"

$jobs = @(
  @{ Name = "virtus-editorial-morning"; Slot = "morning"; Schedule = "15 7 * * 1-5" },
  @{ Name = "virtus-editorial-intraday"; Slot = "intraday"; Schedule = "30 13 * * 1-5" },
  @{ Name = "virtus-editorial-close"; Slot = "close"; Schedule = "0 22 * * 1-5" },
  @{ Name = "virtus-editorial-close-retry"; Slot = "close"; Schedule = "15 23 * * 1-5" }
)

foreach ($job in $jobs) {
  $uri = "$BaseUri/internal/jobs/editorial-drafts/$($job.Slot)"
  $exists = $null -ne (& $gcloud scheduler jobs describe $job.Name --location=$Region --project=$ProjectId 2>$null)
  if ($exists) {
    & $gcloud scheduler jobs update http $job.Name `
      --location=$Region --project=$ProjectId --schedule="$($job.Schedule)" `
      --time-zone="America/Bahia" --uri=$uri --http-method=POST `
      --update-headers=$headers --message-body="{}" --attempt-deadline=300s `
      --quiet --format=none
  } else {
    & $gcloud scheduler jobs create http $job.Name `
      --location=$Region --project=$ProjectId --schedule="$($job.Schedule)" `
      --time-zone="America/Bahia" --uri=$uri --http-method=POST `
      --headers=$headers --message-body="{}" --attempt-deadline=300s `
      --quiet --format=none
  }
  if ($LASTEXITCODE -ne 0) { throw "Falha ao configurar o agendamento $($job.Name)." }
}
