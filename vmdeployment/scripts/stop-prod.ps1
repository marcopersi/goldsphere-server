[CmdletBinding()]
param(
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$EnvFile = ".env",
    [switch]$RemoveVolumes
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ComposeFile)) {
    throw "Compose file not found: $ComposeFile"
}

if (-not (Test-Path $EnvFile)) {
    throw "Env file not found: $EnvFile"
}

$args = @("-f", $ComposeFile, "--env-file", $EnvFile, "down")
if ($RemoveVolumes) {
    $args += "-v"
}

Write-Host "Stopping services..."
docker compose @args
if ($LASTEXITCODE -ne 0) {
    throw "docker compose down failed with exit code $LASTEXITCODE"
}

Write-Host "Service status after shutdown:"
docker compose -f $ComposeFile --env-file $EnvFile ps -a
if ($LASTEXITCODE -ne 0) {
    throw "docker compose ps -a failed with exit code $LASTEXITCODE"
}
