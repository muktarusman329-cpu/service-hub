$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$local = Join-Path $repo ".local-services"
$envPath = Join-Path $repo ".env"
if (-not (Test-Path $envPath)) { throw "Missing .env at $envPath" }

function Read-Env([string]$Name) {
  $line = Get-Content $envPath | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($Name.Length + 1).Trim().Trim('"').Trim("'")
}
function Read-Url([string]$Name) {
  $raw = Read-Env $Name
  if (-not $raw) { throw "Missing $Name in .env" }
  if ($Name -eq "DATABASE_URL") { $raw = $raw -replace '^postgres(ql)?://', 'tcp://' }
  elseif ($Name -eq "REDIS_URL") { $raw = $raw -replace '^redis://', 'tcp://' }
  return [uri]$raw
}
function Wait-Port([string]$HostName, [int]$Port, [string]$Label) {
  $until = (Get-Date).AddSeconds(20)
  while ((Get-Date) -lt $until) {
    if (Test-NetConnection -ComputerName $HostName -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue) { return }
    Start-Sleep -Milliseconds 300
  }
  throw "$Label did not listen at ${HostName}:$Port"
}
function Start-Hidden([string]$File, [string[]]$Args, [string]$Working, [string]$Out, [string]$Err) {
  if (-not (Test-Path $File)) { throw "Missing service binary: $File" }
  Start-Process -FilePath $File -ArgumentList $Args -WorkingDirectory $Working -RedirectStandardOutput $Out -RedirectStandardError $Err -WindowStyle Hidden | Out-Null
}

$db = Read-Url "DATABASE_URL"
$redis = Read-Url "REDIS_URL"
$smtp = Read-Url "SMTP_URL"
$mailpit = Read-Url "MAILPIT_API_URL"
$s3 = Read-Url "S3_ENDPOINT"
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$pgReady = Join-Path $pgBin "pg_isready.exe"
$pgData = Join-Path $local "postgres-data"
$pgLog = Join-Path $local "postgres.log"
if (-not (Test-Path $pgData)) { throw "Missing PostgreSQL data directory: $pgData" }
if (-not (Test-Path $pgCtl)) { throw "Missing PostgreSQL binary: $pgCtl" }
if (-not (Test-NetConnection $db.Host -Port $db.Port -InformationLevel Quiet -WarningAction SilentlyContinue)) {
  & $pgCtl start -D $pgData -o "-h $($db.Host) -p $($db.Port)" -l $pgLog
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL failed to start; see $pgLog" }
}
Wait-Port $db.Host $db.Port "PostgreSQL"
& $pgReady -h $db.Host -p $db.Port | Out-Null
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL did not accept a connection at $($db.Host):$($db.Port)" }
"PostgreSQL healthy host=$($db.Host) port=$($db.Port)"

$redisExe = Join-Path $local "bin\redis-cygwin\Redis-8.10.3-Windows-x64-cygwin\redis-server.exe"
$redisCli = Join-Path $local "bin\redis-cygwin\Redis-8.10.3-Windows-x64-cygwin\redis-cli.exe"
if (-not (Test-Path $redisExe)) { throw "Missing Redis binary: $redisExe" }
if (-not (Test-NetConnection $redis.Host -Port $redis.Port -InformationLevel Quiet -WarningAction SilentlyContinue)) {
  Start-Hidden $redisExe @("--port", "$($redis.Port)", "--bind", $redis.Host, "--dir", $local.Replace('\','/'), "--logfile", (Join-Path $local "redis.log")) (Split-Path $redisExe) (Join-Path $local "redis.stdout.log") (Join-Path $local "redis.error.log")
}
Wait-Port $redis.Host $redis.Port "Redis"
$redisPing = & $redisCli -h $redis.Host -p $redis.Port ping
if ($redisPing -ne "PONG") { throw "Redis health check failed at $($redis.Host):$($redis.Port)" }
"Redis healthy host=$($redis.Host) port=$($redis.Port)"

$mailpitExe = Join-Path $local "bin\mailpit\mailpit.exe"
if (-not (Test-Path $mailpitExe)) { throw "Missing Mailpit binary: $mailpitExe" }
if (-not (Test-NetConnection $smtp.Host -Port $smtp.Port -InformationLevel Quiet -WarningAction SilentlyContinue)) {
  Start-Hidden $mailpitExe @("--smtp", "$($smtp.Host):$($smtp.Port)", "--listen", "$($mailpit.Host):$($mailpit.Port)") (Split-Path $mailpitExe) (Join-Path $local "mailpit.log") (Join-Path $local "mailpit.error.log")
}
Wait-Port $smtp.Host $smtp.Port "Mailpit SMTP"
$mailpitStatus = Invoke-WebRequest -Uri "$($mailpit.Scheme)://$($mailpit.Host):$($mailpit.Port)/api/v1/messages?limit=1" -UseBasicParsing -TimeoutSec 5
if ($mailpitStatus.StatusCode -ne 200) { throw "Mailpit API health check failed at $($mailpit.Host):$($mailpit.Port)" }
"Mailpit healthy host=$($mailpit.Host) port=$($mailpit.Port)"

$minioExe = Join-Path $local "bin\minio-build\minio.exe"
$minioData = Join-Path $local "minio-data"
if (-not (Test-Path $minioExe)) { throw "Missing MinIO binary: $minioExe" }
if (-not (Test-Path $minioData)) { throw "Missing MinIO data directory: $minioData" }
if (-not (Test-NetConnection $s3.Host -Port $s3.Port -InformationLevel Quiet -WarningAction SilentlyContinue)) {
  $env:MINIO_ROOT_USER = Read-Env "S3_ACCESS_KEY_ID"
  $env:MINIO_ROOT_PASSWORD = Read-Env "S3_SECRET_ACCESS_KEY"
  $consolePort = $s3.Port + 1
  Start-Hidden $minioExe @("server", $minioData, "--address", "$($s3.Host):$($s3.Port)", "--console-address", "$($s3.Host):$consolePort") (Split-Path $minioExe) (Join-Path $local "minio.log") (Join-Path $local "minio.error.log")
}
Wait-Port $s3.Host $s3.Port "MinIO"
$minioStatus = Invoke-WebRequest -Uri "$($s3.Scheme)://$($s3.Host):$($s3.Port)/minio/health/live" -UseBasicParsing -TimeoutSec 5
if ($minioStatus.StatusCode -ne 200) { throw "MinIO health check failed at $($s3.Host):$($s3.Port)" }
"MinIO healthy host=$($s3.Host) port=$($s3.Port)"
