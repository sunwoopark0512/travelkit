param([string]$TicketId, [int]$RunIndex)
$d="outputs\night_shift\$TicketId\run_$RunIndex"; New-Item -Force -Type Directory $d
Copy-Item "outputs\evidence\*" $d -Recurse -Force
git status > "$d\git_status.txt"
