param([string]$PrUrl)
if([string]::IsNullOrWhiteSpace($PrUrl)){exit 1}
try{
 $c=gh pr view $PrUrl --json comments --jq ".comments|sort_by(.createdAt)|reverse|.[0].body"
 if($c -match "Verdict:\s*.*PASS"){exit 0}
 write-host "FAIL: No PASS verdict"; exit 1
}catch{exit 1}
