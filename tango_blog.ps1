Write-Host "📝 Tango Blog System Starting..."

if (-not $env:SHEET_KEY) { 
    Write-Host "⚠️  env:SHEET_KEY not found. Defaulting to 'dummy-sheet-key' (Mock Mode)." 
    $env:SHEET_KEY = "dummy-sheet-key"
}
if (-not $env:OPENAI_API_KEY) {
    Write-Host "⚠️  env:OPENAI_API_KEY not found. Defaulting to 'dummy-api-key' (Mock Mode)."
    $env:OPENAI_API_KEY = "dummy-api-key"
}

if (-not (Test-Path ".\credentials.json") -and $env:SHEET_KEY -ne "dummy-sheet-key") { Write-Host "WARN: credentials.json not found at project root (Google Sheets auth may fail)." }

# Blog generation: BLOG_QUEUE(READY) -> BLOG_POSTS
Write-Host "[1/1] Generating blog posts + image prompts..."
python tools/blog_gen.py --sheet-key $env:SHEET_KEY --queue-tab BLOG_QUEUE --out-tab BLOG_POSTS --status READY --limit 3 --prompt-ver v2_blog_golden --verify

Write-Host "✨ Done! Check BLOG_POSTS tab."
