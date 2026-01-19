# OpenResponses.psm1 - Standard LLM Interface
function Invoke-OpenResponse {
    param([string]$Provider="Mock", [string]$SystemPrompt, [string]$UserPrompt, [string]$OutputSchema="text")
    $ts=(Get-Date).ToString("s")
    if ($Provider -eq "Mock") {
        Write-Host "[OpenResponses] Mock Provider" -ForegroundColor Cyan
        $content = if ($OutputSchema -eq "json") { '[{"id":1,"question":"(Mock) Q","answer":"A","explanation":"Exp","rubric":{}}]' } else { "(Mock) Text" }
        return [PSCustomObject]@{ Content=$content; Usage=@{T=0}; Provider="Mock"; Timestamp=$ts }
    }
    Throw "Provider invalid: $Provider"
}
Export-ModuleMember -Function Invoke-OpenResponse
