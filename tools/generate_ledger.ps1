param(
    [string]$OutputFile = "outputs/project_ledger.md"
)

$ErrorActionPreference = "Stop"

# Ensure outputs directory exists
if (!(Test-Path "outputs")) {
    mkdir "outputs" | Out-Null
}

# Gather Data
$Branch = git branch --show-current
$CommitHash = git rev-parse --short HEAD
$CommitMsg = git log -1 --pretty=%s
$Examples = git log -n 3 --pretty=format:"- %h %s (%cr)"

# Read Governance Health if exists
$GovHealth = "N/A"
if (Test-Path "outputs/governance_health.txt") {
    $GovHealth = Get-Content "outputs/governance_health.txt" -Raw
}

# 1. Generate Project Overview (Snapshot)
$OverviewSource = "docs/project_overview.md"
$OverviewDest = "outputs/project_overview.md"

if (Test-Path $OverviewSource) {
    $RawOverview = Get-Content $OverviewSource -Raw
    $SnapshotHeader = @"
# 📸 Project Snapshot
**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Branch:** $Branch
**Commit:** $CommitHash

---
"@
    $FinalOverview = $SnapshotHeader + "`n" + $RawOverview
    $FinalOverview | Out-File $OverviewDest -Encoding utf8
    Write-Host "✅ Generated $OverviewDest" -ForegroundColor Green
} else {
    Write-Warning "⚠️ $OverviewSource not found. Skipping Overview snapshot."
}

# 2. Generate Project Ledger (Experiment Log)
$Markdown = @"
# 📒 Project Ledger (Experiment Log)
**Last Updated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## 1. Context
- **Repo:** sunwoopark0512/travelkit
- **Current Branch:** $Branch
- **Head Commit:** \`$CommitHash\` - $CommitMsg

## 2. Recent Experiments (Commits)
$Examples

## 3. Governance Health Status
\`\`\`text
$GovHealth
\`\`\`

## 4. Active Experiment (Revenue Loop)
$(Get-ChildItem -Path docs/experiments/*.md | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Raw)

## 5. Next Actions (Revenue Loop)
- [ ] Merge current PR if Oracle PASS
- [ ] Verify Airtable Upsert
- [ ] Verify Airtable Upsert
- [ ] Begin Revenue Feature: [Insert Feature Name]

## 5. Decision Evidence
- [GitHub Actions](https://github.com/sunwoopark0512/travelkit/actions)
- [Role Contract](docs/governance/ROLE_CONTRACT.md)
"@

$Markdown | Out-File $OutputFile -Encoding utf8
Write-Host "✅ Ledger generated at $OutputFile" -ForegroundColor Green
