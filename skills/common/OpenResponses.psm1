# OpenResponses.psm1 - Standard LLM Interface

function Invoke-OpenResponse {
    param(
        [string]$Provider = "Mock",
        [string]$SystemPrompt,
        [string]$UserPrompt,
        [string]$OutputSchema = "text" # text or json
    )

    $ts = (Get-Date).ToString("s")
    
    if ($Provider -eq "Mock") {
        # Deterministic Mock
        Write-Host "[OpenResponses] Using Mock Provider" -ForegroundColor Cyan
        
        $content = ""
        if ($OutputSchema -eq "json") {
             # Return a dummy JSON based on prompt hash or keyword
             if ($UserPrompt -match "physics") {
                $content = '[
                    {"id":1, "question":"(Mock) Define Force.", "answer":"F=ma", "explanation":"Newton 2nd Law"},
                    {"id":2, "question":"(Mock) Define Energy.", "answer":"Capacity to do work", "explanation":"Scalar quantity"}
                ]'
             } else {
                $content = '{"mock":"result"}'
             }
        } else {
             $content = "(Mock Response) for inputs"
        }

        return [PSCustomObject]@{
            Content = $content
            Usage = @{ PromptTokens=0; CompletionTokens=0 }
            Provider = "Mock"
            Timestamp = $ts
        }
    }
    elseif ($Provider -eq "Gemini") {
        # Placeholder for Gemini CLI
        # gemini prompt "..."
        Throw "Gemini Provider not yet implemented in MVP"
    }
    else {
        Throw "Unknown Provider: $Provider"
    }
}

Export-ModuleMember -Function Invoke-OpenResponse
