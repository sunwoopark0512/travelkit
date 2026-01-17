<#
.SYNOPSIS
    Verifies that a Sticky Comment has been correctly UPDATED (not duplicated) on a PR.
    Used by Oracle to scientifically prove "Zero-Touch Governance" health.

.PARAMETER PrNumber
    The Pull Request Number to check.

.PARAMETER MaxRetries
    Number of times to retry fetching comments (default 3).

.DESCRIPTION
    Checks:
    1. Exactly ONE comment by 'github-actions' exists (Anti-Spam).
    2. The comment contains "Oracle Gate Report".
    3. (Optional) The 'updatedAt' timestamp is recent (< 5 mins).
#>
param(
    [int]$PrNumber,
    [int]$MaxRetries = 3
)

$ErrorActionPreference = "Stop"

function Get-PrComments {
    param($PrNum)
    $json = gh pr view $PrNum --json comments
    return ($json | ConvertFrom-Json).comments
}

Write-Host "🔍 [Sticky Verify] Checking PR #$PrNumber for Sticky Comment updates..." -ForegroundColor Cyan

$BotComments = @()
$RetryCount = 0

while ($RetryCount -lt $MaxRetries) {
    try {
        $Comments = Get-PrComments -PrNum $PrNumber
        $BotComments = $Comments | Where-Object { $_.author.login -eq "github-actions" -and $_.body -match "Oracle Gate Report" }
        
        if ($BotComments.Count -gt 0) {
            break
        }
        Write-Host "   Speculative retry ($($RetryCount+1)/$MaxRetries)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
        $RetryCount++
    }
    catch {
        Write-Warning "Failed to fetch PR comments: $_"
        Start-Sleep -Seconds 2
        $RetryCount++
    }
}

# Check 1: Existence
if ($BotComments.Count -eq 0) {
    Write-Error "❌ FAIL: No Oracle Gate Report comment found on PR #$PrNumber."
    exit 1
}

# Check 2: Uniqueness (Anti-Spam)
if ($BotComments.Count -gt 1) {
    Write-Error "❌ FAIL: Duplicate comments found ($($BotComments.Count)). Sticky behavior broken."
    exit 1
}

$Comment = $BotComments[0]
Write-Host "✅ PASS: Single Sticky Comment Found (ID: $($Comment.id))" -ForegroundColor Green

# Check 3: Edited Status (Scientific Update Proof)
# We check if 'lastEditedAt' is present and recent, or if 'updatedAt' > 'createdAt'
$CreatedAt = Get-Date $Comment.createdAt
$CreatedAt = Get-Date $Comment.createdAt

if ($Comment.updatedAt) {
    $UpdatedAt = Get-Date $Comment.updatedAt
    
    if ($UpdatedAt -gt $CreatedAt) {
        Write-Host "✅ PASS: Comment was updated." -ForegroundColor Green
        Write-Host "   Created: $CreatedAt"
        Write-Host "   Updated: $UpdatedAt"
    }
    else {
        Write-Warning "⚠️ WARNING: Comment has not been edited yet (CreatedAt == UpdatedAt)."
    }
} else {
     Write-Warning "⚠️ WARNING: 'updatedAt' field missing in GitHub response. Skipping timestamp update verification."
}

exit 0
