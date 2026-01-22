param(
    [string]$TicketId,
    [int]$RunIndex
)

$targetDir = "outputs\night_shift\$TicketId\run_$RunIndex"
New-Item -ItemType Directory -Force $targetDir | Out-Null

Write-Host "Packing evidence to $targetDir..."

$evidenceSources = @(
    "outputs/evidence/hardlock_stdout.txt",
    "outputs/evidence/hardlock_snapshot.txt",
    "web/dashboard/cards.json"
)

foreach ($src in $evidenceSources) {
    if (Test-Path $src) {
        Copy-Item $src $targetDir -Force
    }
}

git status > "$targetDir\git_status.txt"
