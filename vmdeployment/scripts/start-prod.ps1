[CmdletBinding()]
param(
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$EnvFile = ".env",
    [string]$AppVersion = "latest",
    [bool]$EnableImageSeed = $true,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ComposeFile)) {
    throw "Compose file not found: $ComposeFile"
}

if (-not (Test-Path $EnvFile)) {
    throw "Env file not found: $EnvFile"
}

$env:APP_VERSION = $AppVersion
$env:ENABLE_IMAGE_SEED = if ($EnableImageSeed) { "true" } else { "false" }

Write-Host "Using APP_VERSION=$($env:APP_VERSION), ENABLE_IMAGE_SEED=$($env:ENABLE_IMAGE_SEED)"

if ($Clean) {
    Write-Host "Running clean shutdown (down -v)..."
    docker compose -f $ComposeFile --env-file $EnvFile down -v
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose down -v failed with exit code $LASTEXITCODE"
    }
}

Write-Host "Starting services..."
docker compose -f $ComposeFile --env-file $EnvFile up -d
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up -d failed with exit code $LASTEXITCODE"
}

Write-Host "Current service status:"
docker compose -f $ComposeFile --env-file $EnvFile ps -a
if ($LASTEXITCODE -ne 0) {
    throw "docker compose ps -a failed with exit code $LASTEXITCODE"
}
