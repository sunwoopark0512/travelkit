# TravelKit Makefile
# Gemini CLI + OpenCode Governance Automation

.PHONY: help gemini-docs gemini-guardrail-check gemini-experiment evidence

# Default target
help:
	@echo "=== TravelKit Makefile ==="
	@echo ""
	@echo "Gemini CLI Targets:"
	@echo "  make gemini-docs            - Show Gemini CLI guide sections"
	@echo "  make gemini-guardrail-check - Run guardrail validation"
	@echo "  make gemini-experiment      - Show 48h experiment checklist"
	@echo ""
	@echo "Evidence Targets:"
	@echo "  make evidence PR=N          - Generate Strict Evidence for PR N"
	@echo ""

# Gemini CLI: Show documentation sections
gemini-docs:
	@echo "=== Gemini CLI Guide Sections ==="
	@grep -E "^## " docs/gemini-cli.md 2>/dev/null || powershell -Command "Select-String -Path 'docs/gemini-cli.md' -Pattern '^## ' | ForEach-Object { $$_.Line }"

# Gemini CLI: Run guardrail validation
gemini-guardrail-check:
	@echo "=== Gemini CLI Guardrail Check ==="
	@powershell -NoProfile -ExecutionPolicy Bypass -File tools/gemini/validate_guardrails.ps1

# Gemini CLI: Show 48h experiment checklist
gemini-experiment:
	@echo "=== Gemini CLI 48h Experiment Checklist ==="
	@echo ""
	@echo "[Success Indicators]"
	@echo "- [ ] outputs/oracle_excerpt_prN.md has exactly 10 headers"
	@echo "- [ ] validate_guardrails.ps1 exits 0"
	@echo "- [ ] Headless mode produces valid JSON"
	@echo "- [ ] No forbidden shell commands in audit log"
	@echo "- [ ] FINAL_VERDICT contains 'Verdict: ✅ PASS'"
	@echo ""
	@echo "[Failure Patterns]"
	@echo "- [ ] Evidence bundle has >10 or <10 headers"
	@echo "- [ ] Command not in allowlist executed"
	@echo "- [ ] Files modified outside docs/, tools/, outputs/"
	@echo "- [ ] MCP server not in allowed list used"
	@echo "- [ ] validate_guardrails.ps1 exits 1"

# Evidence generation (requires PR number)
evidence:
ifndef PR
	@echo "Usage: make evidence PR=N"
	@echo "Example: make evidence PR=9"
else
	@echo "=== Generating Strict Evidence for PR $(PR) ==="
	@powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate_evidence_strict.ps1 -PrNumber $(PR) -OutputFile "outputs/evidence_bundle_pr$(PR).txt" -OracleExcerpt "outputs/oracle_excerpt_pr$(PR).md"
endif
