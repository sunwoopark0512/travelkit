<#
.SYNOPSIS
    Safe Ralph: The Night Shift Runner (Isolated Worktree)
#>
param(
    [Parameter(Mandatory = $true)][string]$TicketPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# 1. Load Ticket
if (-not (Test-Path $TicketPath)) { Write-Error "Ticket missing: $TicketPath"; exit 1 }
$ticket = Get-Content -Raw $TicketPath | ConvertFrom-Json

$targetBranch = $ticket.branch
$verifyCmds = $ticket.verify_commands
$maxIters = if ($ticket.max_iters) { $ticket.max_iters } else { 5 }
$ticketId = [System.IO.Path]::GetFileNameWithoutExtension($TicketPath)

Write-Host ">>> [Safe Ralph] Starting Night Shift for $ticketId"
Write-Host ">>> Target Branch: $targetBranch"

# 2. Setup Isolation (Temp clone/worktree)
$tempRunDir = Join-Path $PSScriptRoot "..\..\temp_runner_$ticketId"
if (Test-Path $tempRunDir) { Remove-Item -Recurse -Force $tempRunDir }
New-Item -ItemType Directory -Force $tempRunDir | Out-Null

Write-Host ">>> Preparing workspace in: $tempRunDir"

# Copy EVERYTHING to simulate worktree (since we are in a potentially detached/weird state)
# We exclude .git to avoid locking issues, but we might need it for git commands.
# Strategy: Use 'git archive' if possible, or just copy key folders. 
# We need 'tools' and 'tickets' from HERE (Ops branch) and CODE from TARGET branch.
# This is tricky. 
# SIMPLIFIED STRATEGY: 
# 1. Copy .git to temp. 
# 2. Checkout target branch in temp. 
# 3. Copy tools/tickets from CURRENT location to temp (overwriting/adding).

Copy-Item ".git" -Destination $tempRunDir -Recurse
Copy-Item "tools" -Destination $tempRunDir -Recurse
Copy-Item "tickets" -Destination $tempRunDir -Recurse

Push-Location $tempRunDir
try {
    # 3. Checkout Target Branch in Temp
    # This brings in the scripts/ and docs/ from hardlock branch
    git checkout -f $targetBranch 2>&1 | Out-Null
    Write-Host ">>> Checked out $targetBranch"

    # 4. Re-inject Ops Tools (ensure we utilize the Latest runner, not whatever is in hardlock)
    # The Copy-Item above did it initially, but checkout might have overwritten if hardlock has tools/ (it shouldn't).
    # But to be safe, we use the tools we brought with us.
    # (Since we copied .git, we are effectively just working on a clone)
    
    # 5. Loop
    $iter = 1
    while ($iter -le $maxIters) {
        Write-Host "--- Iteration $iter / $maxIters ---"
        
        $allCmdsPassed = $true
        foreach ($cmd in $verifyCmds) {
            Write-Host "Running: $cmd"
            Invoke-Expression $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Command Failed: $cmd"
                $allCmdsPassed = $false
                break
            }
        }

        # Pack Evidence
        $packScript = "tools\night_shift\pack_evidence.ps1"
        if (Test-Path $packScript) {
            powershell -ExecutionPolicy Bypass -File $packScript -TicketId $ticketId -RunIndex $iter
        }

        # Oracle Gate
        $gateScript = "tools\night_shift\oracle_gate_check.ps1"
        if (Test-Path $gateScript) {
            # Verify commands usually produce outputs/evidence/hardlock_*.txt
            # We check against standard locs.
            powershell -ExecutionPolicy Bypass -File $gateScript -TicketPath "tickets\$ticketId.json"
            if ($LASTEXITCODE -eq 0) {
                Write-Host ">>> [PASS] Oracle Verdict: PASS. Job Complete."
                return
            }
        }

        $iter++
    }
}
finally {
    Pop-Location
    # Remove-Item -Recurse -Force $tempRunDir  <-- Keep for debugging if needed
}

Write-Error ">>> Safe Ralph Loop Failed."
exit 1
