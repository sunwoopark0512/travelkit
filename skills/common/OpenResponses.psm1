Set-StrictMode -Version Latest
function Invoke-OpenResponses {
  [CmdletBinding()]
  param([string]$Task, [hashtable]$Input, [string]$Provider = $env:OPENRESPONSES_PROVIDER)
  if ([string]::IsNullOrWhiteSpace($Provider)) { $Provider = "mock" }
  if ($Provider -eq "mock") {
      $ts = (Get-Date).ToString("s")
      if ($Task -eq "generate") {
          $cnt = if ($Input.count) { [int]$Input.count } else { 3 }
          $items = 1..$cnt | ForEach-Object { @{
             id=$_; topic=$Input.topic; question="Mock Q$_"; answer="Mock A$_"; rubric=@{accuracy="bool"}
          }}
          return @{ provider="mock"; output=$items; ts=$ts }
      }
      return @{ provider="mock"; output=@{verdict="PASS"}; ts=$ts }
  }
  throw "Unknown Provider: $Provider"
}
Export-ModuleMember -Function Invoke-OpenResponses
