# =============================================================================
# OpenResponses.psm1
# SSoT Rule: Always use '-InputData' parameter.
#            Do NOT use '-Input' (reserved automatic variable).
# =============================================================================
Set-StrictMode -Version Latest
function Invoke-OpenResponses {
  [CmdletBinding()]
  param(
      [string]$Task, 
      [Parameter(ValueFromPipeline=$true)]
      [object]$InputData, 
      [string]$Provider = $env:OPENRESPONSES_PROVIDER
  )

  Process {
      if ([string]::IsNullOrWhiteSpace($Provider)) { $Provider = "mock" }
      
      $d = $InputData
      # PS5.1 Hashtable handling
      if ($d -is [PSCustomObject]) {
          $h = @{}
          $d.PSObject.Properties | ForEach-Object { $h[$_.Name] = $_.Value }
          $d = $h
      }

      if ($Provider -eq "mock") {
          $ts = (Get-Date).ToString("s")
          if ($Task -eq "generate") {
              $cnt = if ($d.Contains('count')) { [int]$d['count'] } else { 3 }
              $topic = if ($d.Contains('topic')) { $d['topic'] } else { "General" }
              
              $items = 1..$cnt | ForEach-Object { @{
                 id=$_; topic=$topic; question="Mock Q$_ ($topic)"; answer="Mock A$_"; rubric=@{accuracy="bool"}
              }}
              return @{ provider="mock"; output=$items; ts=$ts }
          }
          return @{ provider="mock"; output=@{verdict="PASS"}; ts=$ts }
      }
      throw "Unknown Provider: $Provider"
  }
}
Export-ModuleMember -Function Invoke-OpenResponses

