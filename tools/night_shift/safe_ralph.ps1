param([string]$TicketPath)
$t=Get-Content $TicketPath|ConvertFrom-Json
$cmd=$t.verify_commands[0] # Simple MVP
for($i=1; $i -le $t.max_iters; $i++){
 invoke-expression $cmd
 if($LASTEXITCODE -eq 0){ exit 0 }
}
exit 1
